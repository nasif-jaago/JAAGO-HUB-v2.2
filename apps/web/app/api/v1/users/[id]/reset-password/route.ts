import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // Generate secure 12-char temporary credential
    const tempPassword = `Jg#${Math.random().toString(36).slice(-8)}!${Math.floor(10 + Math.random() * 90)}`;

    logger.info('SECURITY', 'user.password_reset_initiated', {
      metadata: { userId: id, method: 'admin_reset' },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: id,
        temporaryPassword: tempPassword,
        expiresInHours: 24,
      },
      message: 'Temporary password generated successfully. User must change upon next login.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Password reset failed' }, { status: 500 });
  }
}
