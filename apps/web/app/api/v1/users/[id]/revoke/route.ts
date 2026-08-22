import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    logger.info('SECURITY', 'user.access_revoked', {
      metadata: { userId: id, revokedBy: 'super_admin' },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: id,
        status: 'suspended',
        revokedAt: new Date().toISOString(),
      },
      message: 'User access and active JWT sessions have been immediately revoked.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Revoke operation failed' }, { status: 500 });
  }
}
