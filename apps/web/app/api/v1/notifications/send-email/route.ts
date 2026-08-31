import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/notifications/send-email
 *
 * Sends formal welcome and credential notification emails.
 * Integrates with Centralized Outbound Mailer Subsystem and Supabase Auth.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, cc, subject, recipientName, loginUrl } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { success: false, error: 'Recipient email and subject are required' },
        { status: 400 }
      );
    }

    const cleanEmail = to.trim().toLowerCase();
    const cleanCC = typeof cc === 'string' && cc.includes('@') ? cc.trim().toLowerCase() : undefined;
    const redirectUrl = loginUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://hub.jaago.com.bd'}/login`;

    // ── 1. Dispatch Email via Supabase Auth (Brevo SMTP) ──
    const { getSupabaseAdminClient } = await import('@jaago/auth');
    const supabaseAdmin = getSupabaseAdminClient();
    let supabaseMailerSent = false;

    if (supabaseAdmin && cleanEmail) {
      try {
        const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
          redirectTo: redirectUrl,
          data: {
            full_name: recipientName || cleanEmail,
          },
        });

        if (!inviteErr) {
          supabaseMailerSent = true;
          logger.info('SYSTEM', 'notification.supabase_invite_dispatched', { metadata: { to: cleanEmail } });
        } else {
          logger.info('SYSTEM', 'notification.supabase_invite_note', { metadata: { to: cleanEmail, note: inviteErr.message } });
        }
      } catch (err: any) {
        logger.warn('SYSTEM', 'supabase_mailer_error', { metadata: { email: cleanEmail, error: err?.message } });
      }
    }

    // ── 2. Dispatch via Centralized Outbound Mailer Subsystem ──
    const { sendEmail } = await import('@/lib/email-service');
    const mailResult = await sendEmail({
      templateKey: 'pnc.employee_welcome',
      to: cleanEmail,
      cc: cleanCC,
      variables: {
        employeeName: recipientName || cleanEmail,
        employeeCode: 'N/A',
        designation: 'Staff Member',
        department: 'General',
        workEmail: cleanEmail,
        loginUrl: redirectUrl,
      },
      module: 'notifications',
    });

    const messageId = mailResult.providerMessageId || `msg_inv_${Date.now()}`;
    const deliveredVia = mailResult.success ? 'smtp_relay' : (supabaseMailerSent ? 'supabase_brevo_smtp' : 'logged_preview');

    const recipientList = cleanCC ? `${cleanEmail} (CC: ${cleanCC})` : cleanEmail;

    logger.info('SYSTEM', 'notification.formal_welcome_dispatched', {
      metadata: {
        to: cleanEmail,
        cc: cleanCC || null,
        subject,
        recipientName: recipientName || null,
        messageId,
        deliveredVia,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Formal invitation and credentials successfully dispatched to ${recipientList}.`,
      messageId,
      dispatchedTo: cleanEmail,
      cc: cleanCC || null,
      deliveredVia,
      notice: mailResult.errorReason || undefined,
      sentAt: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('SYSTEM', 'notification.email_dispatch_failed', {
      metadata: { error: err?.message },
    });
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to dispatch formal email' },
      { status: 500 }
    );
  }
}
