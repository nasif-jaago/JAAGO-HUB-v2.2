export interface EmployeeWelcomeEmailParams {
  employeeName: string;
  employeeCode?: string | undefined;
  designation?: string | undefined;
  department?: string | undefined;
  branch?: string | undefined;
  workEmail: string;
  personalEmail?: string | undefined;
  tempPassword: string;
  loginUrl: string;
  organizationName?: string | undefined;
  supportEmail?: string | undefined;
  itHelpdeskEmail?: string | undefined;
  issuedAt?: string | undefined;
}

export function renderEmployeeWelcomeEmail(params: EmployeeWelcomeEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const orgName = params.organizationName || 'JAAGO Foundation Trust';
  const supportEmail = params.supportEmail || 'pnc@jaago.com.bd';
  const itHelpdesk = params.itHelpdeskEmail || 'it-support@jaago.com.bd';
  const subject = `Welcome to JAAGO HUB — Official Account Credentials for ${params.employeeName}`;
  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0c0f17;
      color: #1e293b;
      margin: 0;
      padding: 32px 16px;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 640px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 36px 32px 28px;
      text-align: center;
      border-bottom: 4px solid #f59e0b;
    }
    .logo-badge {
      display: inline-block;
      background: #f59e0b;
      color: #0f172a;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.5px;
      padding: 5px 14px;
      border-radius: 20px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0;
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 500;
    }
    .content {
      padding: 32px 32px 28px;
      color: #334155;
      font-size: 14px;
      line-height: 1.65;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 14px;
    }
    .intro-box {
      background: #f8fafc;
      border-left: 4px solid #0284c7;
      padding: 14px 18px;
      border-radius: 0 12px 12px 0;
      margin-bottom: 24px;
      font-size: 13.5px;
      color: #1e293b;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin: 24px 0 12px;
      display: flex;
      align-items: center;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      background: #f8fafc;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      margin-bottom: 24px;
    }
    .details-table td {
      padding: 11px 16px;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .details-table td.label {
      color: #64748b;
      font-weight: 600;
      width: 38%;
      background: #f1f5f9;
    }
    .details-table td.value {
      color: #0f172a;
      font-weight: 700;
    }
    .credential-card {
      background: linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%);
      border: 2px dashed #f59e0b;
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
      text-align: center;
    }
    .credential-card .card-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #b45309;
      margin-bottom: 8px;
    }
    .credential-card .password-val {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 20px;
      font-weight: 900;
      color: #92400e;
      background: #ffffff;
      padding: 8px 24px;
      border-radius: 10px;
      border: 1px solid #fde68a;
      letter-spacing: 1.5px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
    }
    .btn-container {
      text-align: center;
      margin: 28px 0;
    }
    .btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 12px;
      box-shadow: 0 10px 20px rgba(245, 158, 11, 0.35);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .steps-list {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px 20px 18px 36px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .steps-list li {
      margin-bottom: 8px;
      color: #334155;
    }
    .steps-list li:last-child {
      margin-bottom: 0;
    }
    .security-notice {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 14px 18px;
      color: #991b1b;
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .signature {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      font-size: 13px;
      color: #475569;
    }
    .signature strong {
      color: #0f172a;
    }
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 32px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-badge">JAAGO Foundation Trust</div>
      <h1>JAAGO HUB &bull; Official Account Provisioned</h1>
      <p>Institutional Operations &amp; Enterprise Resource Planning Portal</p>
    </div>

    <div class="content">
      <div class="greeting">Dear ${params.employeeName},</div>

      <div class="intro-box">
        We are pleased to welcome you to <strong>${orgName}</strong>. Your official institutional user account on <strong>JAAGO HUB</strong> has been successfully created and configured for immediate access.
      </div>

      <div class="section-title">Official Employee &amp; Account Details</div>
      <table class="details-table">
        <tr>
          <td class="label">Employee Name</td>
          <td class="value">${params.employeeName}</td>
        </tr>
        <tr>
          <td class="label">Employee ID / Code</td>
          <td class="value">${params.employeeCode || '—'}</td>
        </tr>
        <tr>
          <td class="label">Designation / Role</td>
          <td class="value">${params.designation || 'Staff Member'}</td>
        </tr>
        <tr>
          <td class="label">Department</td>
          <td class="value">${params.department || 'General'}</td>
        </tr>
        <tr>
          <td class="label">Branch Location</td>
          <td class="value">${params.branch || 'Head Office (Banani)'}</td>
        </tr>
        <tr>
          <td class="label">User ID (Work Email)</td>
          <td class="value" style="color: #0284c7;">${params.workEmail}</td>
        </tr>
      </table>

      <div class="credential-card">
        <div class="card-title">Initial Temporary Login Password</div>
        <div class="password-val">${params.tempPassword}</div>
        <div style="font-size: 11px; color: #78350f; margin-top: 8px;">
          * Please copy this temporary password to complete your first sign-in.
        </div>
      </div>

      <div class="btn-container">
        <a href="${params.loginUrl}" class="btn-primary" target="_blank" rel="noopener noreferrer">
          Access JAAGO HUB Portal &rarr;
        </a>
        <div style="font-size: 11px; color: #64748b; margin-top: 10px;">
          Direct Portal URL: <a href="${params.loginUrl}" style="color: #0284c7; text-decoration: underline;">${params.loginUrl}</a>
        </div>
      </div>

      <div class="section-title">Getting Started &bull; Login Instructions</div>
      <ol class="steps-list">
        <li><strong>Open the Portal</strong>: Click the button above or navigate to <a href="${params.loginUrl}" style="color: #0284c7;">${params.loginUrl}</a> in any modern browser.</li>
        <li><strong>Enter Your Credentials</strong>: Use your official Work Email (<code>${params.workEmail}</code>) and the Temporary Password provided above.</li>
        <li><strong>Single Sign-On Option</strong>: If you use official Google Workspace, you may also click <strong>"Sign in with Google"</strong> using your <code>${params.workEmail}</code> account.</li>
        <li><strong>Change Password on First Login</strong>: For account security, navigate to <strong>My Profile &gt; Security</strong> immediately upon sign-in to set your permanent private password.</li>
        <li><strong>Access Institutional Services</strong>: You now have full access to your attendance logs, leave submissions, organizational policies, and workflow approvals.</li>
      </ol>

      <div class="security-notice">
        <strong>🔒 Security Advisory:</strong> This email contains sensitive credentials and is intended exclusively for the named employee. Never share your password with anyone. JAAGO System Administrators and People &amp; Culture officers will never ask for your password.
      </div>

      <div class="signature">
        Warm regards,<br><br>
        <strong>People &amp; Culture Department</strong><br>
        <strong>${orgName}</strong><br>
        Head Office: Banani, Dhaka - 1213, Bangladesh<br>
        <span style="font-size: 12px; color: #64748b;">
          HR Inquiries: <a href="mailto:${supportEmail}" style="color: #0284c7;">${supportEmail}</a> &bull; IT Helpdesk: <a href="mailto:${itHelpdesk}" style="color: #0284c7;">${itHelpdesk}</a>
        </span>
      </div>
    </div>

    <div class="footer">
      This is an automated formal notification from JAAGO HUB Enterprise ERP.<br>
      &copy; ${year} ${orgName}. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
================================================================================
JAAGO HUB — OFFICIAL EMPLOYEE ACCESS & LOGIN INVITATION
${orgName} | Enterprise Operations Portal
================================================================================

Dear ${params.employeeName},

We are pleased to welcome you to ${orgName}. Your official 
institutional user account on JAAGO HUB has been successfully provisioned 
and configured for immediate access.

--------------------------------------------------------------------------------
EMPLOYEE & ACCOUNT DETAILS
--------------------------------------------------------------------------------
• Employee Name    : ${params.employeeName}
• Employee ID      : ${params.employeeCode || 'N/A'}
• Designation      : ${params.designation || 'Staff Member'}
• Department       : ${params.department || 'General'}
• Branch Location  : ${params.branch || 'Head Office (Banani)'}

• User ID (Email)  : ${params.workEmail}
• Temporary Pass   : ${params.tempPassword}
• Portal Access URL: ${params.loginUrl}
--------------------------------------------------------------------------------

GETTING STARTED & LOGIN INSTRUCTIONS:
1. Navigate to the portal: ${params.loginUrl}
2. Enter your Work Email and Temporary Password.
3. (Alternative) You can also use "Sign in with Google" using your 
   official ${params.workEmail} Google Workspace account.
4. For account security, please update your password upon initial sign-in 
   via My Profile > Security.

SECURITY ADVISORY:
Keep these credentials confidential. Do not share your temporary password with 
anyone. JAAGO administrators will never ask for your password.

--------------------------------------------------------------------------------
Warm regards,

People & Culture Department
${orgName}
Head Office: Banani, Dhaka, Bangladesh
Support: ${supportEmail} | IT Helpdesk: ${itHelpdesk}
Website: https://jaago.com.bd
================================================================================
  `.trim();

  return { subject, html, text };
}
