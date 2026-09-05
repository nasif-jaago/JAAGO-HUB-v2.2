import { NextResponse } from 'next/server';
import { getEffectiveDailyAttendance } from '@/lib/server-effective-attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || undefined;
    const employeeCode = searchParams.get('employeeCode') || undefined;
    const date = searchParams.get('date') || undefined;
    const month = searchParams.get('month') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const records = await getEffectiveDailyAttendance({
      employeeId,
      employeeCode,
      date,
      month,
      startDate,
      endDate,
      status,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: records,
      total: records.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch effective attendance' },
      { status: 500 }
    );
  }
}
