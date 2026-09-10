import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { formatWorkingHours, calculateWorkedSeconds } from '@jaago/core-domain';
import {
  getCurrentBusinessDate,
  resolveEmployeeShiftSnapshot,
  resolveCanonicalEmployeeId,
} from '@/lib/server-attendance';
import { getEffectiveDailyAttendance } from '@/lib/server-effective-attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Missing employeeId parameter' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const canonicalEmpId = await resolveCanonicalEmployeeId(employeeId);

    // Fetch settings
    const { data: settings } = await supabase
      .from('attendance_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    const cutoffLocal = settings?.daily_cutoff_local || '23:30';
    const calcMethod = (settings?.working_hours_calc_method as 'span' | 'sessions') || 'span';

    const businessDate = getCurrentBusinessDate('Asia/Dhaka', cutoffLocal);
    const nowUtc = new Date().toISOString();

    // 1. Fetch today's effective merged record
    const effectiveList = await getEffectiveDailyAttendance({
      employeeId: canonicalEmpId,
      date: businessDate,
      limit: 1,
    });
    const effectiveToday = effectiveList[0] || null;

    // 2. Fetch raw GPS record for button state machine
    const { data: record } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', canonicalEmpId)
      .eq('business_date', businessDate)
      .maybeSingle();

    // 3. Resolve shift snapshot
    const shift = await resolveEmployeeShiftSnapshot(canonicalEmpId, businessDate);

    // 4. Compute cutoff & time threshold
    const cutoffIso = new Date(`${businessDate}T${cutoffLocal || '23:30'}:00+06:00`).toISOString();
    const isPastCutoff = Date.now() >= new Date(cutoffIso).getTime();

    // Compute counted First-In and Last-Out across 2-Way Sources (BioTime & GPS)
    const firstCheckIn = effectiveToday?.countedCheckInAt || record?.first_check_in_at || record?.check_in_at || null;
    let countedCheckOut = effectiveToday?.countedCheckOutAt || record?.last_check_out_at || record?.check_out_at || null;

    // Discard any synthetic auto-checkout or future checkout if current time is not past cutoff
    const isAutoRecord = Boolean(
      record?.is_auto_checkout ||
      effectiveToday?.isAutoCheckout ||
      record?.check_out_source === 'auto' ||
      effectiveToday?.checkOutSource === 'auto'
    );
    const isFutureCheckOut = Boolean(countedCheckOut && new Date(countedCheckOut).getTime() > Date.now());

    if (!isPastCutoff && (isAutoRecord || isFutureCheckOut)) {
      countedCheckOut = null;
    }

    // 5. Derive state machine status based on valid historical punches only
    const hasCheckedInToday = Boolean(firstCheckIn);
    const allPunches = (effectiveToday?.allPunches || []).filter((p) => {
      const isAuto = p.source === 'auto' || Boolean(p.deviceInfo && p.deviceInfo.toLowerCase().includes('auto-checkout'));
      // Omit synthetic auto-checkout events dated in the future
      if (isAuto && new Date(p.punchAt).getTime() > Date.now()) {
        return false;
      }
      return true;
    });

    let isCheckedIn = false;
    if (!isPastCutoff && hasCheckedInToday && !record?.check_out_at) {
      isCheckedIn = true;
    } else if (allPunches.length > 0) {
      const sorted = [...allPunches].sort((a, b) => new Date(a.punchAt).getTime() - new Date(b.punchAt).getTime());
      const latest = sorted[sorted.length - 1]!;
      isCheckedIn = latest.punchType === 'check_in';
    } else {
      isCheckedIn = Boolean(firstCheckIn) && !countedCheckOut;
    }

    // 5.1 Auto Check-Out Safety Net: Force close ONLY after time has passed 11:30 PM (23:30 Asia/Dhaka)
    let isAutoCheckout = isAutoRecord && isPastCutoff;

    if (hasCheckedInToday && (!countedCheckOut || isCheckedIn) && isPastCutoff) {
      countedCheckOut = cutoffIso;
      isCheckedIn = false;
      isAutoCheckout = true;

      // Persist auto-checkout to Supabase if not yet recorded
      if (record && !record.check_out_at) {
        const facts = {
          employeeId: canonicalEmpId,
          businessDate,
          firstCheckInAt: firstCheckIn,
          lastCheckOutAt: cutoffIso,
          checkInAt: record.check_in_at || firstCheckIn,
          checkOutAt: cutoffIso,
          calcMethod,
        };
        const closedSeconds = calculateWorkedSeconds(facts, calcMethod, cutoffIso);
        const closedMinutes = Math.floor(closedSeconds / 60);
        const closedDisplay = formatWorkingHours(closedSeconds);

        (async () => {
          try {
            await supabase
              .from('attendance_records')
              .update({
                check_out_at: cutoffIso,
                last_check_out_at: cutoffIso,
                check_out_source: 'auto',
                is_auto_checkout: true,
                needs_review: true,
                worked_seconds: closedSeconds,
                worked_minutes: closedMinutes,
                worked_display: closedDisplay,
                status: record.status === 'absent' ? 'present' : (record.status || 'present'),
                updated_at: new Date().toISOString(),
              })
              .eq('id', record.id);

            await supabase.from('attendance_events').insert({
              employee_id: canonicalEmpId,
              event_type: 'check_out',
              punch_type: 'check_out',
              source: 'auto',
              attempted_at: cutoffIso,
              captured_at: cutoffIso,
              device_info: 'System Auto-Checkout Worker (11:30 PM)',
              result: 'accepted',
              is_within_geofence: true,
            });
          } catch (err: unknown) {
            console.error('Error auto-updating attendance record:', err);
          }
        })();
      }
    }

    const lastCheckOut = isCheckedIn ? null : countedCheckOut;

    const state: 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'CHECKED_OUT' = !hasCheckedInToday
      ? 'NOT_CHECKED_IN'
      : isCheckedIn
      ? 'CHECKED_IN'
      : 'CHECKED_OUT';

    // 6. Compute Working Hours Today (Live vs Final capped at cutoff)
    let workedSeconds = 0;
    let workedDisplay = '0h 00m';

    if (isCheckedIn && firstCheckIn) {
      const facts = {
        employeeId: canonicalEmpId,
        businessDate,
        firstCheckInAt: firstCheckIn,
        checkInAt: firstCheckIn,
        lastCheckOutAt: null,
        calcMethod,
        nowServer: nowUtc,
      };
      workedSeconds = calculateWorkedSeconds(facts, calcMethod, nowUtc);
      workedDisplay = formatWorkingHours(workedSeconds);
    } else if (firstCheckIn && lastCheckOut) {
      const inMs = new Date(firstCheckIn).getTime();
      const outMs = new Date(lastCheckOut).getTime();
      workedSeconds = Math.max(0, Math.floor((outMs - inMs) / 1000));
      workedDisplay = formatWorkingHours(workedSeconds);
    } else {
      workedSeconds = effectiveToday?.workedSeconds || 0;
      workedDisplay = effectiveToday?.workedDisplay || '0h 00m';
    }

    return NextResponse.json({
      success: true,
      data: {
        state,
        first_check_in_at: firstCheckIn,
        last_check_out_at: lastCheckOut,
        check_in_time_local: effectiveToday?.countedCheckInTimeLocal || (firstCheckIn ? new Date(firstCheckIn).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'),
        check_out_time_local: isAutoCheckout ? '11:30 PM' : (lastCheckOut ? new Date(lastCheckOut).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'),
        check_in_source: effectiveToday?.checkInSource || record?.check_in_source || 'gps',
        check_out_source: isAutoCheckout ? 'auto' : (lastCheckOut ? (effectiveToday?.checkOutSource || record?.check_out_source || 'gps') : 'none'),
        primary_source: effectiveToday?.primarySource || (record?.check_in_source === 'gps' ? 'Web Portal (GPS)' : 'BioTime Terminal'),
        source_breakdown: effectiveToday?.sourceBreakdown || null,
        worked_seconds: workedSeconds,
        worked_display: workedDisplay,
        status: isAutoCheckout ? 'Present' : (effectiveToday?.status === 'Auto Check Out' && !isPastCutoff ? (firstCheckIn ? 'Present' : 'absent') : (effectiveToday?.status || record?.status || (shift.isScheduledWorkingDay ? (firstCheckIn ? 'Present' : 'absent') : 'weekly_off'))),
        needs_review: Boolean(record?.needs_review && isPastCutoff),
        is_auto_checkout: isAutoCheckout,
        buttons: {
          check_in_enabled: true,
          check_out_enabled: true,
        },
        server_now: nowUtc,
        businessDate,
        record: record || null,
        effectiveRecord: effectiveToday || null,
        shift,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch today session' },
      { status: 500 }
    );
  }
}
