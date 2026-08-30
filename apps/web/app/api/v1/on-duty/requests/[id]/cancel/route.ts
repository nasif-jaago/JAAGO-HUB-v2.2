import { NextRequest, NextResponse } from 'next/server';
import { cancelOnDutyRequest } from '@/lib/supabase-onduty';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { requesterId = 'emp-nasif' } = body;

    const res = await cancelOnDutyRequest(id, requesterId);

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: res.data,
      message: 'On-Duty request cancelled successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel on-duty request' },
      { status: 500 }
    );
  }
}
