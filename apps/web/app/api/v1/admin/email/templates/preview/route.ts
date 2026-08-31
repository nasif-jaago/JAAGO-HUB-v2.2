import { NextResponse } from 'next/server';
import { emailStore, substituteVariables } from '@/lib/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/admin/email/templates/preview — Render template preview without sending
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateKey, subject, bodyHtml, bodyText, variables } = body;

    let targetSubject = subject;
    let targetHtml = bodyHtml;
    let targetText = bodyText;
    const vars = variables || {};

    if (templateKey && (!targetSubject || !targetHtml)) {
      const tmpl = await emailStore.getTemplateByKey(templateKey);
      if (tmpl) {
        targetSubject = targetSubject || tmpl.subject;
        targetHtml = targetHtml || tmpl.bodyHtml;
        targetText = targetText || tmpl.bodyText;
        // Merge default sample values if variables not supplied
        if (Object.keys(vars).length === 0) {
          tmpl.variablesSchema.forEach((v) => {
            vars[v.key] = v.sample || `[${v.name}]`;
          });
        }
      }
    }

    if (!targetSubject || !targetHtml) {
      return NextResponse.json({ success: false, error: 'Subject and bodyHtml are required for preview.' }, { status: 400 });
    }

    const renderedSubject = substituteVariables(targetSubject, vars, false);
    const renderedHtml = substituteVariables(targetHtml, vars, false);
    const renderedText = substituteVariables(targetText || '', vars, false);

    return NextResponse.json({
      success: true,
      data: {
        renderedSubject,
        renderedHtml,
        renderedText,
        variablesUsed: vars,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
