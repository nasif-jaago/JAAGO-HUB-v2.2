import { NextRequest, NextResponse } from 'next/server';
import { approveOnDutyRequest } from '@/lib/supabase-onduty';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { approverId = 'emp-korvi', approverName = 'Korvi Rakshand' } = body;

    const res = await approveOnDutyRequest(id, approverId, approverName);

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: res.data,
      message: 'On-Duty request approved and attendance day records credited successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to approve on-duty request' },
      { status: 500 }
    );
  }
}
