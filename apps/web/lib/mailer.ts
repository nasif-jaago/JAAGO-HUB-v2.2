import nodemailer from 'nodemailer';
import { logger } from '@jaago/logger';

export interface SendMailOptions {
  to: string | string[];
  cc?: string | string[] | undefined;
  bcc?: string | string[] | undefined;
  subject: string;
  html: string;
  text?: string | undefined;
  from?: string | undefined;
}

let transporter: nodemailer.Transporter | null = null;

export function getMailTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

/**
 * Sends an email using SMTP transporter, Brevo/Resend API, or logs if no SMTP configured.
 */
export async function sendDirectEmail(options: SendMailOptions): Promise<{
  success: boolean;
  messageId: string;
  deliveredVia: 'smtp' | 'brevo_api' | 'resend_api' | 'logged_preview';
  notice?: string;
}> {
  const from = options.from || process.env.SMTP_FROM || '"JAAGO HUB" <noreply@jaago.com.bd>';
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // 1. Try Brevo HTTP API if API key is provided
  if (process.env.BREVO_API_KEY) {
    try {
      const recipients = (Array.isArray(options.to) ? options.to : [options.to]).map((e) => ({ email: e }));
      const ccRecipients = options.cc
        ? (Array.isArray(options.cc) ? options.cc : [options.cc]).map((e) => ({ email: e }))
        : undefined;

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: 'JAAGO Foundation Trust', email: 'noreply@jaago.com.bd' },
          to: recipients,
          cc: ccRecipients,
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        logger.info('SYSTEM', 'email.sent_brevo_api', {
          metadata: { to: options.to, subject: options.subject, messageId: data.messageId || messageId },
        });
        return { success: true, messageId: data.messageId || messageId, deliveredVia: 'brevo_api' };
      }
    } catch (err: any) {
      logger.warn('SYSTEM', 'email.brevo_api_failed', { metadata: { error: err?.message } });
    }
  }

  // 2. Try Resend HTTP API if API key is provided
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from,
          to: options.to,
          cc: options.cc,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        logger.info('SYSTEM', 'email.sent_resend_api', {
          metadata: { to: options.to, subject: options.subject, messageId: data.id || messageId },
        });
        return { success: true, messageId: data.id || messageId, deliveredVia: 'resend_api' };
      }
    } catch (err: any) {
      logger.warn('SYSTEM', 'email.resend_api_failed', { metadata: { error: err?.message } });
    }
  }

  // 3. Try Direct SMTP with Nodemailer
  const smtp = getMailTransporter();
  if (smtp) {
    try {
      const info = await smtp.sendMail({
        from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info('SYSTEM', 'email.sent_smtp', {
        metadata: { to: options.to, subject: options.subject, messageId: info.messageId },
      });

      return { success: true, messageId: info.messageId || messageId, deliveredVia: 'smtp' };
    } catch (err: any) {
      logger.error('SYSTEM', 'email.smtp_error', { metadata: { error: err?.message } });
      throw new Error(`SMTP dispatch error: ${err?.message}`);
    }
  }

  // 4. Fallback: Logged Preview / Development Mode
  logger.info('SYSTEM', 'email.preview_mode', {
    metadata: {
      to: options.to,
      cc: options.cc || null,
      subject: options.subject,
      messageId,
      notice: 'Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env for direct server dispatch.',
    },
  });

  return {
    success: true,
    messageId,
    deliveredVia: 'logged_preview',
    notice: 'Email generated and queued. To dispatch real emails directly from server, provide SMTP credentials in .env.',
  };
}
