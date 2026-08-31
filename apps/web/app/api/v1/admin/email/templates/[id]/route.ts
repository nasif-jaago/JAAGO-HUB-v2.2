import { NextResponse } from 'next/server';
import { emailStore } from '@/lib/email-service';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/v1/admin/email/templates/[id]
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const templateList = await emailStore.getTemplates();
  const template = templateList.find((t) => t.id === id);
  if (!template) {
    return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: template });
}

// PATCH /api/v1/admin/email/templates/[id] — Update template (increments version)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await emailStore.updateTemplate(id, body);

    logger.info('AUDIT', 'admin.email_template_updated', { metadata: { templateId: id, version: updated.version } });

    return NextResponse.json({ success: true, data: updated, message: 'Template updated successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/v1/admin/email/templates/[id]
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = await emailStore.deleteTemplate(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }
    logger.info('AUDIT', 'admin.email_template_deleted', { metadata: { templateId: id } });
    return NextResponse.json({ success: true, message: 'Template deleted.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
