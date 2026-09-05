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

    // 4. Derive state machine status and button enablement
    const isCheckedIn = Boolean(record && record.check_in_at && !record.check_out_at);
    const state: 'NOT_CHECKED_IN' | 'CHECKED_IN' = isCheckedIn ? 'CHECKED_IN' : 'NOT_CHECKED_IN';

    // 5. Compute counted First-In and Last-Out
    const firstCheckIn = effectiveToday?.countedCheckInAt || record?.first_check_in_at || record?.check_in_at || null;
    const lastCheckOut = effectiveToday?.countedCheckOutAt || record?.last_check_out_at || record?.check_out_at || null;

    let workedSeconds = effectiveToday?.workedSeconds ?? (record?.worked_seconds ?? (record?.worked_minutes ? record.worked_minutes * 60 : 0));
    let workedDisplay = effectiveToday?.workedDisplay || record?.worked_display || formatWorkingHours(workedSeconds);

    if (isCheckedIn && firstCheckIn) {
      const facts = {
        employeeId: canonicalEmpId,
        businessDate,
        firstCheckInAt: firstCheckIn,
        checkInAt: record?.check_in_at || firstCheckIn,
        lastCheckOutAt: lastCheckOut,
        calcMethod,
        nowServer: nowUtc,
      };
      workedSeconds = calculateWorkedSeconds(facts, calcMethod, nowUtc);
      workedDisplay = formatWorkingHours(workedSeconds);
    } else if (firstCheckIn && lastCheckOut) {
      const facts = {
        employeeId: canonicalEmpId,
        businessDate,
        firstCheckInAt: firstCheckIn,
        lastCheckOutAt: lastCheckOut,
        checkInAt: record?.check_in_at || firstCheckIn,
        checkOutAt: record?.check_out_at || lastCheckOut,
        calcMethod,
      };
      workedSeconds = calculateWorkedSeconds(facts, calcMethod);
      workedDisplay = formatWorkingHours(workedSeconds);
    } else if (!record && !effectiveToday) {
      workedSeconds = 0;
      workedDisplay = '0h 00m';
    }

    return NextResponse.json({
      success: true,
      data: {
        state,
        first_check_in_at: firstCheckIn,
        last_check_out_at: lastCheckOut,
        check_in_time_local: effectiveToday?.countedCheckInTimeLocal || (firstCheckIn ? new Date(firstCheckIn).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'),
        check_out_time_local: effectiveToday?.countedCheckOutTimeLocal || (lastCheckOut ? new Date(lastCheckOut).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'),
        check_in_source: effectiveToday?.checkInSource || record?.check_in_source || 'gps',
        check_out_source: effectiveToday?.checkOutSource || record?.check_out_source || 'gps',
        primary_source: effectiveToday?.primarySource || (record?.check_in_source === 'gps' ? 'Web Portal (GPS)' : 'BioTime Terminal'),
        source_breakdown: effectiveToday?.sourceBreakdown || null,
        worked_seconds: workedSeconds,
        worked_display: workedDisplay,
        status: effectiveToday?.status || record?.status || (shift.isScheduledWorkingDay ? 'absent' : 'weekly_off'),
        needs_review: Boolean(record?.needs_review || record?.is_auto_checkout),
        is_auto_checkout: Boolean(record?.is_auto_checkout),
        buttons: {
          check_in_enabled: state === 'NOT_CHECKED_IN',
          check_out_enabled: state === 'CHECKED_IN',
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
