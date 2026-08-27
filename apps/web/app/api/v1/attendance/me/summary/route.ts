import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { getCurrentBusinessDate, resolveCanonicalEmployeeId } from '@/lib/server-attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month') || getCurrentBusinessDate('Asia/Dhaka').substring(0, 7); // 'YYYY-MM'

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Missing employeeId parameter' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const canonicalEmpId = await resolveCanonicalEmployeeId(employeeId);
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', canonicalEmpId)
      .gte('business_date', startDate)
      .lte('business_date', endDate)
      .order('business_date', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const items = records || [];
    let presentCount = 0;
    let lateCount = 0;
    let autoCheckoutCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;
    let totalWorkedMinutes = 0;

    for (const r of items) {
      if (r.status === 'present' || r.status === 'late') {
        presentCount++;
      }
      if (r.is_late || r.status === 'late') {
        lateCount++;
      }
      if (r.is_auto_checkout) {
        autoCheckoutCount++;
      }
      if (r.status === 'absent') {
        absentCount++;
      }
      if (r.status === 'on_leave') {
        onLeaveCount++;
      }
      if (r.worked_minutes) {
        totalWorkedMinutes += r.worked_minutes;
      }
    }

    const targetWorkingDays = 22; // Standard monthly target
    const onTimeCount = Math.max(0, presentCount - lateCount);
    const onTimeRate = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 100) : 100;
    const lateRate = presentCount > 0 ? Math.round((lateCount / presentCount) * 100) : 0;
    const autoCheckoutRate = presentCount > 0 ? Math.round((autoCheckoutCount / presentCount) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        month,
        employeeId,
        presentDays: presentCount,
        targetDays: targetWorkingDays,
        lateDays: lateCount,
        autoCheckouts: autoCheckoutCount,
        absentDays: absentCount,
        onLeaveDays: onLeaveCount,
        totalWorkedHours: (totalWorkedMinutes / 60).toFixed(1),
        onTimePerformancePct: onTimeRate,
        latePenaltyPct: lateRate,
        autoCheckoutRatePct: autoCheckoutRate,
        dailyRecords: items,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch monthly summary' },
      { status: 500 }
    );
  }
}
