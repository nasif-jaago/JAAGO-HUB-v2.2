import { NextRequest, NextResponse } from 'next/server';
import { refuseOnDutyRequest } from '@/lib/supabase-onduty';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const {
      refusalNote,
      approverId = 'emp-korvi',
      approverName = 'Korvi Rakshand',
    } = body;

    if (!refusalNote || refusalNote.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'A Refusal Note is mandatory when refusing an On-Duty request.' },
        { status: 400 }
      );
    }

    const res = await refuseOnDutyRequest(id, refusalNote, approverId, approverName);

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: res.data,
      message: 'On-Duty request refused.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to refuse on-duty request' },
      { status: 500 }
    );
  }
}
