import { NextResponse } from 'next/server';
import { emailStore, createTransporterForServer, validateEmailAddress } from '@/lib/email-service';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/admin/email/servers/[id]/test-send — Sends an actual test email through a specific server
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { to } = body;

    if (!to || !validateEmailAddress(to)) {
      return NextResponse.json({ success: false, error: 'A valid recipient email address is required.' }, { status: 400 });
    }

    const server = await emailStore.getServerById(id);
    if (!server) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }

    const transporter = createTransporterForServer(server);
    const sentAt = new Date().toISOString();

    const info = await transporter.sendMail({
      from: `"${server.senderName}" <${server.senderEmail}>`,
      to,
      subject: `JAAGO HUB — Test Email via ${server.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
          <div style="background:#0f172a;padding:16px 20px;border-radius:8px 8px 0 0;color:#ffffff;text-align:center;">
            <h2 style="margin:0;font-size:18px;color:#f59e0b;">JAAGO HUB SMTP Test Successful</h2>
          </div>
          <div style="padding:20px;color:#334155;font-size:14px;line-height:1.6;">
            <p>This is a live test email confirming that SMTP server <strong>${server.name}</strong> (${server.host}:${server.port}) is operating properly.</p>
            <ul>
              <li><strong>Server:</strong> ${server.name}</li>
              <li><strong>Host:</strong> ${server.host}:${server.port} (${server.encryption})</li>
              <li><strong>Sender:</strong> ${server.senderEmail}</li>
              <li><strong>Recipient:</strong> ${to}</li>
              <li><strong>Timestamp:</strong> ${sentAt}</li>
            </ul>
            <p style="font-size:12px;color:#64748b;">JAAGO Foundation Trust &bull; Enterprise Operations Subsystem</p>
          </div>
        </div>
      `,
      text: `JAAGO HUB SMTP Test Successful via ${server.name} (${server.host}:${server.port}) at ${sentAt}.`,
    });

    const providerMessageId = info.messageId || `msg_test_${Date.now()}`;

    // Add log to Supabase & Memory
    await emailStore.addLog({
      id: crypto.randomUUID(),
      templateKey: 'system.test_email',
      serverId: server.id,
      serverName: server.name,
      toAddress: to,
      fromAddress: `"${server.senderName}" <${server.senderEmail}>`,
      subjectRendered: `JAAGO HUB — Test Email via ${server.name}`,
      module: 'admin.settings',
      status: 'sent',
      attemptCount: 1,
      providerMessageId,
      queuedAt: sentAt,
      completedAt: sentAt,
      createdAt: sentAt,
      updatedAt: sentAt,
    });

    logger.info('AUDIT', 'admin.test_email_sent', { metadata: { serverId: id, to, providerMessageId } });

    return NextResponse.json({
      success: true,
      message: `Test email successfully dispatched to ${to}! Message ID: ${providerMessageId}`,
      messageId: providerMessageId,
    });
  } catch (err: any) {
    logger.error('SYSTEM', 'admin.test_email_failed', { metadata: { error: err.message } });
    return NextResponse.json({ success: false, error: err.message || 'Failed to send test email.' }, { status: 500 });
  }
}
