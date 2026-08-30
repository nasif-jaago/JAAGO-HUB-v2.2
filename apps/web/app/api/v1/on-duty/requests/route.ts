import { NextRequest, NextResponse } from 'next/server';
import {
  computeOnDutyDurationPreview,
  fetchOnDutyRequestsFromSupabase,
  createOnDutyRequest,
} from '@/lib/supabase-onduty';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const supervisorId = searchParams.get('supervisorId');
    const status = searchParams.get('status');

    const filters: { employeeId?: string; supervisorId?: string; status?: any } = {};
    if (employeeId) filters.employeeId = employeeId;
    if (supervisorId) filters.supervisorId = supervisorId;
    if (status) filters.status = status;

    const data = await fetchOnDutyRequestsFromSupabase(filters);

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch on-duty requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeId,
      employeeCode,
      employeeName,
      department,
      designation,
      avatarUrl,
      supervisorId,
      supervisorName,
      supervisorEmail,
      startDate,
      startTime,
      endDate,
      endTime,
      reason,
    } = body;

    if (!employeeId || !employeeName || !startDate || !startTime || !endDate || !endTime || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing mandatory request fields' },
        { status: 400 }
      );
    }

    const preview = computeOnDutyDurationPreview(startDate, startTime, endDate, endTime);
    if (!preview.isValid) {
      return NextResponse.json(
        { success: false, error: preview.validationError || 'Invalid dates or times' },
        { status: 400 }
      );
    }

    const res = await createOnDutyRequest({
      employeeId,
      employeeCode: employeeCode || 'EMP-001',
      employeeName,
      department,
      designation,
      avatarUrl,
      supervisorId,
      supervisorName,
      supervisorEmail,
      startDate,
      startTime,
      endDate,
      endTime,
      reason,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: res.data,
      preview,
      message: 'On-Duty field work application submitted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit on-duty request' },
      { status: 500 }
    );
  }
}
