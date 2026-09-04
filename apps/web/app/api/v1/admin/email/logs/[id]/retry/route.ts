import { NextResponse } from 'next/server';
import { retryEmailLog } from '@/lib/email-service';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/admin/email/logs/[id]/retry — Manual re-queue of failed email
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const result = await retryEmailLog(id);
    logger.info('AUDIT', 'admin.email_log_retried', { metadata: { logId: id, success: result.success } });

    return NextResponse.json({
      success: result.success,
      data: result.log,
      message: result.message,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
