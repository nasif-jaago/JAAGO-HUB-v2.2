import { NextResponse } from 'next/server';
import { emailStore, EmailServerItem } from '@/lib/email-service';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskServer(server: EmailServerItem) {
  const { passwordCiphertext, passwordIv, passwordTag, ...safe } = server;
  return {
    ...safe,
    hasPassword: Boolean(passwordCiphertext && passwordIv && passwordTag),
  };
}

// GET /api/v1/admin/email/servers — List configured SMTP servers
export async function GET() {
  try {
    const serverList = await emailStore.getServers();
    const servers = serverList.map(maskServer);
    return NextResponse.json({ success: true, data: servers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/v1/admin/email/servers — Create a new SMTP server
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, senderEmail, senderName, host, port, encryption, username, password, minIntervalSeconds, maxPerHour, maxPerDay, replyTo, isEnabled, priority } = body;

    if (!name || !host || !username) {
      return NextResponse.json({ success: false, error: 'Name, Host, and Username are required' }, { status: 400 });
    }

    const created = await emailStore.createServer({
      name,
      senderEmail: senderEmail || 'noreply@jaago.com.bd',
      senderName: senderName || 'JAAGO HUB',
      host,
      port: port ? parseInt(port, 10) : 587,
      encryption: encryption || 'starttls',
      username,
      passwordPlain: password,
      minIntervalSeconds: minIntervalSeconds ? parseInt(minIntervalSeconds, 10) : 0,
      maxPerHour: maxPerHour ? parseInt(maxPerHour, 10) : 0,
      maxPerDay: maxPerDay ? parseInt(maxPerDay, 10) : 0,
      replyTo: replyTo || undefined,
      isEnabled: isEnabled ?? true,
      priority: priority ? parseInt(priority, 10) : undefined,
    });

    logger.info('AUDIT', 'admin.email_server_created', { metadata: { serverId: created.id, name } });

    return NextResponse.json({ success: true, data: maskServer(created), message: 'SMTP server configured successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
