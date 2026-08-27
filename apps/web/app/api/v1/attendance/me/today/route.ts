import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
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
    const businessDate = getCurrentBusinessDate('Asia/Dhaka');

    // 1. Fetch today's canonical record
    const { data: record } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', canonicalEmpId)
      .eq('business_date', businessDate)
      .maybeSingle();

    // 2. Resolve shift
    const shift = await resolveEmployeeShiftSnapshot(canonicalEmpId, businessDate);

    // 3. Derive state machine status
    let sessionState: 'NONE' | 'CHECKED_IN' | 'CHECKED_OUT' | 'AUTO_CHECKED_OUT' = 'NONE';
    if (record) {
      if (record.check_in_at && !record.check_out_at) {
        sessionState = 'CHECKED_IN';
      } else if (record.check_out_at) {
        sessionState = record.is_auto_checkout ? 'AUTO_CHECKED_OUT' : 'CHECKED_OUT';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionState,
        businessDate,
        record: record || null,
        shift,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch session' },
      { status: 500 }
    );
  }
}
