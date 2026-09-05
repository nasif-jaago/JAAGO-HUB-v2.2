import { NextResponse } from 'next/server';
import { getCurrentBusinessDate, resolveCanonicalEmployeeId } from '@/lib/server-attendance';
import { getEffectiveDailyAttendance } from '@/lib/server-effective-attendance';

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

    const canonicalEmpId = await resolveCanonicalEmployeeId(employeeId);

    // 1. Fetch effective daily attendance records for the month
    const effectiveRecords = await getEffectiveDailyAttendance({
      employeeId: canonicalEmpId,
      month,
      limit: 100,
    });

    let presentCount = 0;
    let lateCount = 0;
    let autoCheckoutCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;
    let totalWorkedMinutes = 0;

    for (const r of effectiveRecords) {
      if (r.status === 'Present' || r.status === 'Late' || r.status === 'Auto Check Out') {
        presentCount++;
      }
      if (r.isLate || r.status === 'Late') {
        lateCount++;
      }
      if (r.isAutoCheckout || r.status === 'Auto Check Out') {
        autoCheckoutCount++;
      }
      if (r.status === 'Absent') {
        absentCount++;
      }
      if (r.status === 'Leave' || r.status === 'Half Day' || r.status === 'On Duty') {
        onLeaveCount++;
      }
      if (r.workedSeconds) {
        totalWorkedMinutes += Math.floor(r.workedSeconds / 60);
      }
    }

    const targetWorkingDays = 22; // Standard monthly target
    const onTimeCount = Math.max(0, presentCount - lateCount);
    const onTimeRate = presentCount > 0 ? Math.round((onTimeCount / presentCount) * 1000) / 10 : 100.0;
    const lateRate = presentCount > 0 ? Math.round((lateCount / presentCount) * 1000) / 10 : 0.0;
    const autoCheckoutRate = presentCount > 0 ? Math.round((autoCheckoutCount / presentCount) * 1000) / 10 : 0.0;

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
        dailyRecords: effectiveRecords,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch monthly summary' },
      { status: 500 }
    );
  }
}
