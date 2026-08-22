export function renderWorkflowApprovalEmail(params: {
  requesterName: string;
  workflowTitle: string;
  tierNumber: number;
  actionUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `[JAAGO HUB] Approval Required: ${params.workflowTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080705; color: #F5EBE1; margin: 0; padding: 24px; }
    .card { background-color: #120F0A; border: 1px solid #282015; border-radius: 16px; padding: 28px; max-width: 540px; margin: 0 auto; }
    .logo { color: #F5C518; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 20px; }
    .badge { display: inline-block; background-color: #F5C518; color: #080705; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
    h2 { margin: 0 0 12px 0; color: #FFFFFF; font-size: 18px; }
    p { color: #A69B8D; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; }
    .btn { display: inline-block; background-color: #F5C518; color: #080705; font-weight: 800; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 12px; }
    .footer { margin-top: 24px; font-size: 11px; color: #6E6355; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">JAAGO HUB v2.2</div>
    <div class="badge">Tier ${params.tierNumber} Approval Pending</div>
    <h2>${params.workflowTitle}</h2>
    <p><strong>${params.requesterName}</strong> has submitted a request that requires your review and authorization.</p>
    <a href="${params.actionUrl}" class="btn">Review &amp; Authorize</a>
    <div class="footer">JAAGO Foundation Bangladesh &bull; Confidential &bull; Multi-Tier Workflow Engine</div>
  </div>
</body>
</html>
  `.trim();

  const text = `JAAGO HUB: Approval Required: ${params.workflowTitle}\nRequester: ${params.requesterName}\nLink: ${params.actionUrl}`;

  return { subject, html, text };
}
