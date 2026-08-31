import { NextResponse } from 'next/server';
import { emailStore } from '@/lib/email-service';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/v1/admin/email/templates — List all email templates
export async function GET() {
  try {
    const templates = await emailStore.getTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/v1/admin/email/templates — Create a new email template
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateKey, name, module, subject, bodyHtml, bodyText, variablesSchema, isActive } = body;

    if (!templateKey || !name || !subject || !bodyHtml) {
      return NextResponse.json({ success: false, error: 'Template key, name, subject, and bodyHtml are required.' }, { status: 400 });
    }

    const created = await emailStore.createTemplate({
      templateKey,
      name,
      module: module || 'general',
      subject,
      bodyHtml,
      bodyText: bodyText || '',
      variablesSchema: variablesSchema || [],
      isActive: isActive ?? true,
    });

    logger.info('AUDIT', 'admin.email_template_created', { metadata: { templateKey, id: created.id } });

    return NextResponse.json({ success: true, data: created, message: 'Template created successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
