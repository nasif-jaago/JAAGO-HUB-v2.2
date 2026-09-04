import { NextResponse } from 'next/server';
import { verifyServerConnection } from '@/lib/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/admin/email/servers/[id]/verify — Test SMTP connection (verify handshake without sending)
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await verifyServerConnection(id);
    return NextResponse.json({
      success: result.success,
      message: result.message,
    }, { status: result.success ? 200 : 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
