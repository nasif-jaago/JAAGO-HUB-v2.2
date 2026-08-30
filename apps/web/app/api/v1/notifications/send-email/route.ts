import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/notifications/send-email
 *
 * Sends a welcome + password reset email using Supabase Auth's built-in mailer.
 *
 * Supabase sends a "Reset Password" email which contains a secure link for the
 * employee to set their own password — this is the safest flow and requires
 * zero extra SMTP configuration.
 *
 * Body: { to, subject, bodyText, recipientName?, loginUrl? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, recipientName, loginUrl } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Recipient email and subject are required' },
        { status: 400 }
      );
    }

    const cleanEmail = to.trim().toLowerCase();
    const supabaseAdmin = getSupabaseAdminClient();

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Database client unavailable' },
        { status: 500 }
      );
    }

    // ── Strategy 1: Generate a password reset link via Supabase Admin ─────────
    // This sends the employee a Supabase-hosted "Set Password" email using
    const redirectUrl = loginUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://hub.jaago.com.bd'}/login`;

    // ── Strategy 1: Dispatch Password Setup / Welcome email via Supabase Auth & Brevo SMTP ──
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    if (resetError) {
      logger.warn('SYSTEM', 'notification.reset_email_failed_attempting_invite', {
        metadata: { email: cleanEmail, error: resetError.message },
      });

      // Strategy 2: If reset failed (e.g. user invited but unconfirmed), dispatch invite email
      const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
        redirectTo: redirectUrl,
        data: {
          full_name: recipientName || cleanEmail,
        },
      });

      if (inviteErr) {
        logger.error('SYSTEM', 'notification.invite_failed', {
          metadata: { email: cleanEmail, error: inviteErr.message },
        });
        return NextResponse.json(
          { success: false, error: `Failed to dispatch email: ${inviteErr.message || resetError.message}` },
          { status: 500 }
        );
      }

      logger.info('SYSTEM', 'notification.invite_dispatched', {
        metadata: { to: cleanEmail, subject, method: 'supabase_invite' },
      });

      return NextResponse.json({
        success: true,
        message: `Welcome invite email dispatched to ${cleanEmail} via Supabase SMTP`,
        method: 'supabase_invite',
        messageId: `inv_${Date.now()}`,
      });
    }

    logger.info('SYSTEM', 'notification.password_reset_email_dispatched', {
      metadata: { to: cleanEmail, subject, method: 'supabase_reset_password' },
    });

    return NextResponse.json({
      success: true,
      message: `Login credentials & password setup email dispatched to ${cleanEmail} via Supabase SMTP`,
      method: 'supabase_reset_password',
      messageId: `rec_${Date.now()}`,
    });
  } catch (err: any) {
    logger.error('SYSTEM', 'notification.email_failed', {
      metadata: { error: err?.message },
    });
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
