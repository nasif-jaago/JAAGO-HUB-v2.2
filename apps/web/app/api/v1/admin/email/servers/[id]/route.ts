import { NextResponse } from 'next/server';
import { emailStore, EmailServerItem, decryptCredential } from '@/lib/email-service';
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

// GET /api/v1/admin/email/servers/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const shouldReveal = url.searchParams.get('reveal') === 'true';

  const server = await emailStore.getServerById(id);
  if (!server) {
    return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
  }

  const masked = maskServer(server);

  if (shouldReveal && server.passwordCiphertext && server.passwordIv && server.passwordTag) {
    try {
      const decrypted = decryptCredential({
        ciphertext: server.passwordCiphertext,
        iv: server.passwordIv,
        tag: server.passwordTag,
        keyId: server.passwordKeyId,
      });
      return NextResponse.json({ success: true, data: { ...masked, passwordPlain: decrypted } });
    } catch {
      return NextResponse.json({ success: true, data: masked });
    }
  }

  return NextResponse.json({ success: true, data: masked });
}

// PATCH /api/v1/admin/email/servers/[id] — Update server (empty password keeps existing)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { password, ...fields } = body;

    const updated = await emailStore.updateServer(id, {
      ...fields,
      passwordPlain: password && password.trim() !== '' ? password : undefined,
    });

    logger.info('AUDIT', 'admin.email_server_updated', { metadata: { serverId: id } });

    return NextResponse.json({ success: true, data: maskServer(updated), message: 'Server configuration updated.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/v1/admin/email/servers/[id]
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = await emailStore.deleteServer(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Server not found' }, { status: 404 });
    }
    logger.info('AUDIT', 'admin.email_server_deleted', { metadata: { serverId: id } });
    return NextResponse.json({ success: true, message: 'Server deleted.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
