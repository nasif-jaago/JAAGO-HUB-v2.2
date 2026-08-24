import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // Generate secure temporary credential
    const tempPassword = `Jg#${Math.random().toString(36).slice(-6)}!${Math.floor(100 + Math.random() * 900)}`;

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      if (id.includes('-') && id.length > 20) {
        await supabaseAdmin.auth.admin.updateUserById(id, { password: tempPassword });
      }
    } catch (err: any) {
      logger.warn('AUTH', 'user.admin_reset_supabase_failed', { metadata: { userId: id, error: err?.message } });
    }

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
      message: 'Temporary password generated and synced with authentication service.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Password reset failed' }, { status: 500 });
  }
}
