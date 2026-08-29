import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { formatWorkingHours, calculateWorkedSeconds } from '@jaago/core-domain';
import {
  getCurrentBusinessDate,
  resolveEmployeeShiftSnapshot,
  resolveCanonicalEmployeeId,
} from '@/lib/server-attendance';

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

    // 1. Fetch today's canonical record
    const { data: record } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', canonicalEmpId)
      .eq('business_date', businessDate)
      .maybeSingle();

    // 2. Resolve shift snapshot
    const shift = await resolveEmployeeShiftSnapshot(canonicalEmpId, businessDate);

    // 3. Derive state machine status and button enablement
    const isCheckedIn = Boolean(record && record.check_in_at && !record.check_out_at);
    const state: 'NOT_CHECKED_IN' | 'CHECKED_IN' = isCheckedIn ? 'CHECKED_IN' : 'NOT_CHECKED_IN';

    // 4. Compute live worked seconds & canonical display
    const firstCheckIn = record?.first_check_in_at || record?.check_in_at || null;
    const lastCheckOut = record?.last_check_out_at || record?.check_out_at || null;

    let workedSeconds = record?.worked_seconds ?? (record?.worked_minutes ? record.worked_minutes * 60 : 0);
    let workedDisplay = record?.worked_display || formatWorkingHours(workedSeconds);

    if (isCheckedIn && firstCheckIn) {
      const facts = {
        employeeId: canonicalEmpId,
        businessDate,
        firstCheckInAt: firstCheckIn,
        checkInAt: record.check_in_at,
        lastCheckOutAt: lastCheckOut,
        calcMethod,
        nowServer: nowUtc,
      };
      workedSeconds = calculateWorkedSeconds(facts, calcMethod, nowUtc);
      workedDisplay = formatWorkingHours(workedSeconds);
    } else if (record && record.check_in_at && record.check_out_at) {
      const facts = {
        employeeId: canonicalEmpId,
        businessDate,
        firstCheckInAt: firstCheckIn,
        lastCheckOutAt: lastCheckOut,
        checkInAt: record.check_in_at,
        checkOutAt: record.check_out_at,
        calcMethod,
      };
      workedSeconds = calculateWorkedSeconds(facts, calcMethod);
      workedDisplay = formatWorkingHours(workedSeconds);
    } else if (!record) {
      workedSeconds = 0;
      workedDisplay = '0h 00m';
    }

    return NextResponse.json({
      success: true,
      data: {
        state,
        first_check_in_at: record?.first_check_in_at || record?.check_in_at || null,
        last_check_out_at: record?.last_check_out_at || record?.check_out_at || null,
        worked_seconds: workedSeconds,
        worked_display: workedDisplay,
        status: record?.status || (shift.isScheduledWorkingDay ? 'absent' : 'weekly_off'),
        needs_review: Boolean(record?.needs_review || record?.is_auto_checkout),
        is_auto_checkout: Boolean(record?.is_auto_checkout),
        buttons: {
          check_in_enabled: state === 'NOT_CHECKED_IN',
          check_out_enabled: state === 'CHECKED_IN',
        },
        server_now: nowUtc,
        businessDate,
        record: record || null,
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
