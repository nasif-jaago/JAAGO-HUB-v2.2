import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getEmailAdapter } from '@jaago/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, bodyText, html } = body;

    if (!to || !subject) {
      return NextResponse.json({ error: 'Recipient and subject are required' }, { status: 400 });
    }

    const adapter = getEmailAdapter();
    const result = await adapter.send({
      to,
      subject,
      text: bodyText,
      html: html || `<div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
        <h2 style="color: #f59e0b;">Welcome to JAAGO HUB</h2>
        <p>Dear Colleague,</p>
        <p>Your official employee account has been created with secure access to JAAGO HUB.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>User ID (Work Email):</strong> ${to}</p>
          <p><strong>Portal Link:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login">JAAGO HUB Login</a></p>
        </div>
        <p style="color: #d97706;"><strong>Security Note:</strong> Please update your password as soon as possible after your initial login.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">JAAGO Foundation ERP Platform</p>
      </div>`,
    });

    logger.info('SYSTEM', 'notification.email_dispatched', {
      metadata: { to, subject, messageId: result.messageId },
    });

    return NextResponse.json({
      success: true,
      message: `Email dispatched successfully to ${to}`,
      messageId: result.messageId,
    });
  } catch (err: any) {
    logger.error('SYSTEM', 'notification.email_failed', { metadata: { error: err.message } });
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 });
  }
}
