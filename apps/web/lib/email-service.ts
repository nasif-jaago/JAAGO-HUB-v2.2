import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { logger } from '@jaago/logger';
import { getSupabaseAdminClient } from '@jaago/auth';
import { encryptCredential, decryptCredential } from './crypto';

export { encryptCredential, decryptCredential };

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface EmailServerItem {
  id: string;
  name: string;
  isEnabled: boolean;
  priority: number;
  senderEmail: string;
  senderName: string;
  host: string;
  port: number;
  encryption: 'starttls' | 'ssl_tls' | 'none';
  username: string;
  hasPassword?: boolean | undefined;
  passwordCiphertext?: string | undefined;
  passwordIv?: string | undefined;
  passwordTag?: string | undefined;
  passwordKeyId?: string | undefined;
  minIntervalSeconds: number;
  maxPerHour: number;
  maxPerDay: number;
  replyTo?: string | undefined;
  healthState: 'healthy' | 'degraded' | 'down';
  consecutiveFailures: number;
  lastVerifiedAt?: string | undefined;
  lastUsedAt?: string | undefined;
  lastErrorMessage?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateVariable {
  key: string;
  name: string;
  description: string;
  required: boolean;
  sample: string;
}

export interface EmailTemplateItem {
  id: string;
  templateKey: string;
  name: string;
  module: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variablesSchema: EmailTemplateVariable[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type EmailLogStatus = 'queued' | 'processing' | 'sent' | 'failed' | 'deferred' | 'bounced';

export interface EmailLogItem {
  id: string;
  templateKey?: string | undefined;
  serverId?: string | undefined;
  serverName?: string | undefined;
  toAddress: string;
  ccAddress?: string | undefined;
  bccAddress?: string | undefined;
  fromAddress: string;
  replyTo?: string | undefined;
  subjectRendered: string;
  bodyRendered?: string | undefined;
  variablesUsed?: Record<string, unknown> | undefined;
  module: string;
  relatedEntityType?: string | undefined;
  relatedEntityId?: string | undefined;
  status: EmailLogStatus;
  errorReason?: string | undefined;
  errorDetail?: unknown | undefined;
  attemptCount: number;
  providerMessageId?: string | undefined;
  traceId?: string | undefined;
  queuedAt: string;
  processingAt?: string | undefined;
  completedAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface SendMailParams {
  templateKey: string;
  to: string | string[];
  variables: Record<string, unknown>;
  module?: string | undefined;
  cc?: string | string[] | undefined;
  bcc?: string | string[] | undefined;
  replyTo?: string | undefined;
  relatedEntity?: { type: string; id: string } | undefined;
  organizationId?: string | undefined;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. STARTER SEED TEMPLATES & SERVERS
// ═══════════════════════════════════════════════════════════════════════════

export const INITIAL_EMAIL_TEMPLATES: EmailTemplateItem[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    templateKey: 'pnc.employee_welcome',
    name: 'Employee Account Welcome & Invite',
    module: 'pnc',
    subject: 'Welcome to JAAGO HUB — Account Invitation & Credentials for {{employeeName}}',
    bodyHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Invitation — JAAGO HUB</title>
</head>
<body style="margin:0;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0c0f17;color:#1e293b;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.35);border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);padding:36px 32px 28px;text-align:center;border-bottom:4px solid #f59e0b;">
      <span style="display:inline-block;background:#f59e0b;color:#0f172a;font-size:11px;font-weight:900;letter-spacing:1.5px;padding:5px 14px;border-radius:20px;text-transform:uppercase;margin-bottom:12px;">JAAGO FOUNDATION TRUST</span>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">JAAGO HUB &bull; Account Invitation</h1>
      <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px;font-weight:500;">Institutional Operations &amp; Enterprise Resource Planning Portal</p>
    </div>

    <!-- Content -->
    <div style="padding:32px 32px 28px;color:#334155;font-size:14px;line-height:1.65;">
      <h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:0 0 16px 0;">Welcome to JAAGO Foundation!</h2>

      <!-- Intro Callout Box -->
      <div style="background:#f8fafc;border-left:4px solid #0284c7;padding:14px 18px;border-radius:0 12px 12px 0;margin-bottom:24px;font-size:13.5px;color:#1e293b;">
        Your official enterprise account on <strong>JAAGO HUB</strong> has been provisioned for <a href="mailto:{{workEmail}}" style="color:#0284c7;font-weight:700;text-decoration:none;">{{workEmail}}</a>. You are invited to access the organizational portal.
      </div>

      <!-- Employee Profile Summary -->
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:24px;font-size:13px;">
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;width:38%;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Employee Name:</td><td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{employeeName}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Employee ID:</td><td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{employeeCode}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Designation:</td><td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{designation}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Department:</td><td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{department}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;">Work Email:</td><td style="padding:10px 14px;font-weight:700;color:#0284c7;">{{workEmail}}</td></tr>
      </table>

      <!-- Auto-Generated Temporary Password Card -->
      <div style="background:linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%);border:2px dashed #f59e0b;border-radius:14px;padding:20px 16px;margin:24px 0;text-align:center;">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#b45309;margin-bottom:8px;">
          Initial Auto-Generated Temporary Password
        </div>
        <div style="display:inline-block;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:900;color:#92400e;background:#ffffff;padding:8px 24px;border-radius:10px;border:1px solid #fde68a;letter-spacing:1.5px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.06);">
          {{tempPassword}}
        </div>
        <div style="font-size:11.5px;color:#78350f;margin-top:10px;font-weight:500;">
          * Please copy this temporary password to log in. You can change it after signing in.
        </div>
      </div>

      <!-- Call to Action Button -->
      <div style="text-align:center;margin:28px 0 16px 0;">
        <a href="{{loginUrl}}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#ffffff !important;font-size:15px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:12px;box-shadow:0 10px 20px rgba(245,158,11,0.35);letter-spacing:0.5px;text-transform:uppercase;">
          Accept Invitation &amp; Set Password &rarr;
        </a>
      </div>

      <!-- Direct Access Link -->
      <div style="text-align:center;font-size:12px;color:#64748b;margin-bottom:24px;">
        Direct Access Link:<br>
        <a href="{{loginUrl}}" target="_blank" rel="noopener noreferrer" style="color:#0284c7;word-break:break-all;text-decoration:underline;">{{loginUrl}}</a>
      </div>

      <!-- Getting Started Instructions -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;margin-bottom:24px;font-size:13px;">
        <strong style="color:#0f172a;display:block;margin-bottom:10px;font-size:13.5px;">Getting Started:</strong>
        <ol style="margin:0;padding-left:20px;color:#334155;line-height:1.7;">
          <li style="margin-bottom:6px;">Click the button above to activate your organizational account.</li>
          <li style="margin-bottom:6px;">Enter your official Work Email (<code>{{workEmail}}</code>) and the auto-generated Temporary Password.</li>
          <li style="margin-bottom:6px;">Log in to access your attendance, leaves, and institutional modules.</li>
          <li style="margin-bottom:6px;">(Alternative) You may also use <strong>"Sign In with Google"</strong> on the portal using your official organization email.</li>
          <li>For security, update your temporary password upon initial sign-in under <strong>My Profile &gt; Security</strong>.</li>
        </ol>
      </div>

      <!-- Security Notice -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;color:#991b1b;font-size:12px;line-height:1.5;margin-bottom:24px;">
        <strong>🔒 Security Notice:</strong> This invitation link and credentials are intended exclusively for <a href="mailto:{{workEmail}}" style="color:#991b1b;font-weight:700;">{{workEmail}}</a>. Never forward this email to anyone.
      </div>

      <!-- Sign-off -->
      <div style="border-top:1px solid #e2e8f0;padding-top:20px;font-size:13px;color:#475569;line-height:1.6;">
        Warm regards,<br><br>
        <strong style="color:#0f172a;">People &amp; Culture Department</strong><br>
        <strong style="color:#0f172a;">JAAGO Foundation</strong><br>
        <span style="font-size:12px;color:#64748b;">
          Head Office: Banani, Dhaka - 1213, Bangladesh<br>
          HR Inquiries: <a href="mailto:pnc@jaago.com.bd" style="color:#0284c7;">pnc@jaago.com.bd</a> &bull; IT Helpdesk: <a href="mailto:it-support@jaago.com.bd" style="color:#0284c7;">it-support@jaago.com.bd</a>
        </span>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:11px;color:#94a3b8;line-height:1.6;">
      This is an automated formal notification from JAAGO HUB ERP.<br>
      &copy; JAAGO Foundation Trust. All rights reserved.
    </div>
  </div>
</body>
</html>`,
    bodyText: `================================================================================
JAAGO HUB — ACCOUNT INVITATION & LOGIN CREDENTIALS
JAAGO Foundation Trust | Enterprise Operations & Resource Planning Portal
================================================================================

Dear {{employeeName}},

Welcome to JAAGO Foundation!
Your official enterprise account on JAAGO HUB has been provisioned for {{workEmail}}.
You are invited to access the organizational portal.

--------------------------------------------------------------------------------
EMPLOYEE & ACCOUNT DETAILS
--------------------------------------------------------------------------------
• Employee Name    : {{employeeName}}
• Employee ID      : {{employeeCode}}
• Designation      : {{designation}}
• Department       : {{department}}
• Work Email       : {{workEmail}}
• Temporary Password: {{tempPassword}}
• Portal Access URL: {{loginUrl}}
--------------------------------------------------------------------------------

GETTING STARTED:
1. Click the access link or navigate to: {{loginUrl}}
2. Enter your Work Email ({{workEmail}}) and Temporary Password: {{tempPassword}}
3. Log in to access your attendance, leaves, and institutional modules.
4. (Alternative) You may also use "Sign In with Google" using your official organization email.
5. For security, update your temporary password upon initial sign-in under My Profile > Security.

SECURITY NOTICE:
🔒 This invitation link and credentials are intended exclusively for {{workEmail}}. Never forward this email to anyone.

--------------------------------------------------------------------------------
Warm regards,

People & Culture Department
JAAGO Foundation
Head Office: Banani, Dhaka - 1213, Bangladesh
Support: pnc@jaago.com.bd | IT Helpdesk: it-support@jaago.com.bd
================================================================================`,
    variablesSchema: [
      { key: 'employeeName', name: 'Employee Name', description: 'Full name of employee', required: true, sample: 'S M Nayeem Rahman' },
      { key: 'employeeCode', name: 'Employee Code', description: 'Official Staff ID', required: true, sample: 'FO072408021002' },
      { key: 'designation', name: 'Designation', description: 'Job Title / Role', required: true, sample: 'Team Lead' },
      { key: 'department', name: 'Department', description: 'Department Name', required: true, sample: "Founder's Office (JF)" },
      { key: 'workEmail', name: 'Work Email', description: 'Institutional email address', required: true, sample: 'hub.jaago@jaago.com.bd' },
      { key: 'tempPassword', name: 'Temporary Password', description: 'Auto-generated temporary password for initial login', required: true, sample: 'Jaago@2026!k9Q2' },
      { key: 'loginUrl', name: 'Login URL', description: 'Direct portal authentication link', required: true, sample: 'https://hub.jaago.com.bd/login' },
    ],
    isActive: true,
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    templateKey: 'approvals.pending_request',
    name: 'Approval Request Pending',
    module: 'approvals',
    subject: 'Action Required: Pending Approval Request for {{requestTitle}}',
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Pending Approval</title></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0c0f17;color:#1e293b;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="background:#0f172a;padding:24px 28px;border-bottom:4px solid #f59e0b;">
      <h2 style="color:#ffffff;font-size:18px;margin:0;">Pending Approval Notification</h2>
    </div>
    <div style="padding:24px;font-size:14px;color:#334155;">
      <p>Hello <strong>{{approverName}}</strong>,</p>
      <p>A new request requires your formal review and decision:</p>
      <div style="background:#f8fafc;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;">
        <strong>{{requestTitle}}</strong><br>
        <span style="font-size:12px;color:#64748b;">Submitted by: {{requesterName}} &bull; Department: {{department}}</span>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{actionUrl}}" style="background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 28px;border-radius:8px;display:inline-block;">Review & Approve in JAAGO HUB &rarr;</a>
      </div>
    </div>
  </div>
</body>
</html>`,
    bodyText: `Action Required: Pending Approval for {{requestTitle}}
Submitted by: {{requesterName}} ({{department}})
Review URL: {{actionUrl}}`,
    variablesSchema: [
      { key: 'approverName', name: 'Approver Name', description: 'Name of the reviewer', required: true, sample: 'S M Nayeem Rahman' },
      { key: 'requestTitle', name: 'Request Title', description: 'Summary of the request', required: true, sample: 'On-Duty Travel Approval (Khulna Branch)' },
      { key: 'requesterName', name: 'Requester Name', description: 'Staff member submitting', required: true, sample: 'Kazi Farhan' },
      { key: 'department', name: 'Department', description: 'Originating department', required: true, sample: 'Programmes' },
      { key: 'actionUrl', name: 'Action URL', description: 'Direct approval workflow link', required: true, sample: 'https://hub.jaago.com.bd/workflows' },
    ],
    isActive: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    templateKey: 'auth.password_reset',
    name: 'Secure Password Reset Request',
    module: 'auth',
    subject: 'JAAGO HUB — Secure Password Reset Request',
    bodyHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset Password</title></head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0c0f17;color:#1e293b;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="background:#0f172a;padding:24px;border-bottom:4px solid #f59e0b;text-align:center;">
      <h2 style="color:#ffffff;font-size:20px;margin:0;">Password Reset Request</h2>
    </div>
    <div style="padding:24px;font-size:14px;color:#334155;">
      <p>Hello,</p>
      <p>We received a password reset request for your account <strong>{{email}}</strong>.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{{resetUrl}}" style="background:#f59e0b;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;display:inline-block;">Reset My Password &rarr;</a>
      </div>
      <p style="font-size:12px;color:#64748b;">If you did not request this, please ignore this email.</p>
    </div>
  </div>
</body>
</html>`,
    bodyText: `Password Reset Request for {{email}}
Reset URL: {{resetUrl}}`,
    variablesSchema: [
      { key: 'email', name: 'User Email', description: 'Account email address', required: true, sample: 'user@jaago.com.bd' },
      { key: 'resetUrl', name: 'Reset URL', description: 'Single-use reset link', required: true, sample: 'https://hub.jaago.com.bd/reset-password' },
    ],
    isActive: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    templateKey: 'time_off.leave_submitted_supervisor',
    name: 'Leave Application Supervisor Notification',
    module: 'time_off',
    subject: 'Action Required: Leave Application from {{employeeName}} ({{employeeCode}}) — {{leaveType}}',
    bodyHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave Application — JAAGO HUB</title>
</head>
<body style="margin:0;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#0c0f17;color:#1e293b;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.35);border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);padding:32px 28px 24px;text-align:center;border-bottom:4px solid #f59e0b;">
      <span style="display:inline-block;background:#f59e0b;color:#0f172a;font-size:11px;font-weight:900;letter-spacing:1.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;margin-bottom:10px;">JAAGO FOUNDATION TRUST</span>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Leave Application Pending Review</h1>
      <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px;font-weight:500;">Supervisor Action Required &bull; Time Off Authorization</p>
    </div>

    <!-- Content -->
    <div style="padding:28px 28px 24px;color:#334155;font-size:14px;line-height:1.6;">
      <p style="margin-top:0;font-size:15px;">Hello <strong>{{supervisorName}}</strong>,</p>
      <p>A team member under your direct supervision has submitted a leave application awaiting your review and authorization:</p>

      <!-- Requester & Leave Details Table -->
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin:20px 0;font-size:13px;">
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;width:36%;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Applicant Name:</td><td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{employeeName}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Employee ID:</td><td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;"><span style="font-family:monospace;background:#e2e8f0;padding:2px 6px;border-radius:4px;">{{employeeCode}}</span></td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Designation / Dept:</td><td style="padding:10px 14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{designation}} &bull; {{department}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Leave Category:</td><td style="padding:10px 14px;font-weight:800;color:#d97706;border-bottom:1px solid #e2e8f0;">{{leaveType}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Duration &amp; Dates:</td><td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{fromDate}} to {{toDate}} (<strong>{{totalDays}} Day(s)</strong>)</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Purpose / Reason:</td><td style="padding:10px 14px;color:#1e293b;border-bottom:1px solid #e2e8f0;">{{reason}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;">Attachment / Doc:</td><td style="padding:10px 14px;color:#0284c7;font-weight:600;">{{attachmentName}}</td></tr>
      </table>

      <!-- Action Callout -->
      <div style="text-align:center;margin:28px 0 16px;">
        <a href="{{actionUrl}}" style="background:#f59e0b;color:#0f172a;text-decoration:none;font-weight:900;font-size:14px;letter-spacing:0.3px;padding:14px 32px;border-radius:12px;display:inline-block;box-shadow:0 6px 16px rgba(245,158,11,0.35);text-transform:uppercase;">
          Review &bull; Approve or Refuse in JAAGO HUB &rarr;
        </a>
      </div>
      <p style="text-align:center;font-size:11.5px;color:#64748b;margin-bottom:0;">
        Clicking the button will open the request directly in your Approvals &amp; Workflows management console.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:18px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
      JAAGO Foundation &bull; People &amp; Culture Automated Workflow Notification System
    </div>
  </div>
</body>
</html>`,
    bodyText: `Action Required: Leave Application from {{employeeName}} ({{employeeCode}})
Category: {{leaveType}}
Duration: {{fromDate}} to {{toDate}} ({{totalDays}} Days)
Reason: {{reason}}
Attachment: {{attachmentName}}
Review & Authorize URL: {{actionUrl}}`,
    variablesSchema: [
      { key: 'supervisorName', name: 'Supervisor Name', description: 'Name of the supervisor', required: true, sample: 'Nasif Kamal' },
      { key: 'employeeName', name: 'Employee Name', description: 'Staff member applying', required: true, sample: 'S M Nayeem Rahman' },
      { key: 'employeeCode', name: 'Employee Code', description: 'Staff ID', required: true, sample: 'FO072408021002' },
      { key: 'designation', name: 'Designation', description: 'Staff Role', required: true, sample: 'Team Lead' },
      { key: 'department', name: 'Department', description: 'Department Name', required: true, sample: "Founder's Office (JF)" },
      { key: 'leaveType', name: 'Leave Type', description: 'Leave Category', required: true, sample: 'Annual Leave' },
      { key: 'fromDate', name: 'Start Date', description: 'Leave Start Date', required: true, sample: '2026-09-25' },
      { key: 'toDate', name: 'End Date', description: 'Leave End Date', required: true, sample: '2026-09-30' },
      { key: 'totalDays', name: 'Total Days', description: 'Number of days requested', required: true, sample: '6' },
      { key: 'reason', name: 'Reason', description: 'Reason for leave application', required: true, sample: 'Family vacation' },
      { key: 'attachmentName', name: 'Attachment Name', description: 'Attached document name', required: false, sample: 'flight_tickets.pdf' },
      { key: 'actionUrl', name: 'Action URL', description: 'Direct link to approve or refuse', required: true, sample: 'https://hub.jaago.com.bd/workflows' },
    ],
    isActive: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    templateKey: 'time_off.leave_decision_employee',
    name: 'Leave Decision Status Employee Notification',
    module: 'time_off',
    subject: 'Leave Request {{decisionStatus}}: {{leaveType}} ({{fromDate}} to {{toDate}})',
    bodyHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave Decision — JAAGO HUB</title>
</head>
<body style="margin:0;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#0c0f17;color:#1e293b;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.35);border:1px solid #e2e8f0;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);padding:32px 28px 24px;text-align:center;border-bottom:4px solid #f59e0b;">
      <span style="display:inline-block;background:#f59e0b;color:#0f172a;font-size:11px;font-weight:900;letter-spacing:1.5px;padding:4px 12px;border-radius:20px;text-transform:uppercase;margin-bottom:10px;">JAAGO FOUNDATION TRUST</span>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Leave Application Status Update</h1>
      <p style="margin:6px 0 0;color:#cbd5e1;font-size:13px;font-weight:500;">Official Decision Notice</p>
    </div>

    <!-- Content -->
    <div style="padding:28px 28px 24px;color:#334155;font-size:14px;line-height:1.6;">
      <p style="margin-top:0;font-size:15px;">Hello <strong>{{employeeName}}</strong>,</p>
      <p>Your leave request has been reviewed by your supervisor/administration. The official status is outlined below:</p>

      <!-- Decision Status Banner -->
      <div style="background:#f8fafc;border-left:5px solid #f59e0b;padding:16px;border-radius:8px;margin:18px 0;">
        <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#64748b;">Decision Status</div>
        <div style="font-size:18px;font-weight:900;color:#0f172a;margin-top:2px;">
          {{decisionStatus}}
        </div>
      </div>

      <!-- Details Table -->
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin:20px 0;font-size:13px;">
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;width:36%;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Leave Category:</td><td style="padding:10px 14px;font-weight:800;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{leaveType}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Requested Period:</td><td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{fromDate}} to {{toDate}} ({{totalDays}} Days)</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Reviewed By:</td><td style="padding:10px 14px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">{{reviewedBy}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;border-bottom:1px solid #e2e8f0;">Review Timestamp:</td><td style="padding:10px 14px;color:#64748b;border-bottom:1px solid #e2e8f0;">{{reviewedAt}}</td></tr>
        <tr><td style="padding:10px 14px;color:#64748b;font-weight:600;background:#f1f5f9;">Supervisor Remarks / Note:</td><td style="padding:10px 14px;color:#1e293b;font-weight:600;">{{refusalReason}}</td></tr>
      </table>

      <!-- Action Button -->
      <div style="text-align:center;margin:28px 0 16px;">
        <a href="{{portalUrl}}" style="background:#0f172a;color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:12px 28px;border-radius:10px;display:inline-block;">
          View Updated Leave Balance in JAAGO HUB &rarr;
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:18px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;text-align:center;">
      JAAGO Foundation &bull; People &amp; Culture Automated Workflow Notification System
    </div>
  </div>
</body>
</html>`,
    bodyText: `Your Leave Request has been {{decisionStatus}} for {{leaveType}} ({{fromDate}} to {{toDate}} - {{totalDays}} Days).
Reviewed by: {{reviewedBy}} at {{reviewedAt}}
Remarks: {{refusalReason}}
Portal: {{portalUrl}}`,
    variablesSchema: [
      { key: 'employeeName', name: 'Employee Name', description: 'Staff member name', required: true, sample: 'S M Nayeem Rahman' },
      { key: 'leaveType', name: 'Leave Type', description: 'Leave Category', required: true, sample: 'Annual Leave' },
      { key: 'fromDate', name: 'Start Date', description: 'Leave Start Date', required: true, sample: '2026-09-25' },
      { key: 'toDate', name: 'End Date', description: 'Leave End Date', required: true, sample: '2026-09-30' },
      { key: 'totalDays', name: 'Total Days', description: 'Duration in days', required: true, sample: '6' },
      { key: 'decisionStatus', name: 'Decision Status', description: 'Approved or Refused', required: true, sample: 'Approved' },
      { key: 'reviewedBy', name: 'Reviewed By', description: 'Reviewer name', required: true, sample: 'Nasif Kamal (Supervisor)' },
      { key: 'reviewedAt', name: 'Reviewed At', description: 'Decision timestamp', required: true, sample: '04-Sep-2026 11:45 AM' },
      { key: 'refusalReason', name: 'Refusal Reason / Remarks', description: 'Supervisor notes or refusal reason', required: true, sample: 'Approved as requested' },
      { key: 'portalUrl', name: 'Portal URL', description: 'Leave dashboard URL', required: true, sample: 'https://hub.jaago.com.bd/leaves' },
    ],
    isActive: true,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const defaultEncrypted = encryptCredential(process.env.SMTP_PASSWORD || 'default_smtp_password_key_2026');

export const INITIAL_EMAIL_SERVERS: EmailServerItem[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Brevo SMTP (Primary)',
    isEnabled: true,
    priority: 1,
    senderEmail: process.env.SMTP_FROM_EMAIL || 'noreply@jaago.com.bd',
    senderName: 'JAAGO HUB v2.0',
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    encryption: 'starttls',
    username: process.env.SMTP_USER || 'hub.jaago@jaago.com.bd',
    hasPassword: true,
    passwordCiphertext: defaultEncrypted.ciphertext,
    passwordIv: defaultEncrypted.iv,
    passwordTag: defaultEncrypted.tag,
    passwordKeyId: defaultEncrypted.keyId,
    minIntervalSeconds: 10,
    maxPerHour: 500,
    maxPerDay: 5000,
    replyTo: 'pnc@jaago.com.bd',
    healthState: 'healthy',
    consecutiveFailures: 0,
    lastVerifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. DATABASE-BACKED STORE (SUPABASE PERSISTENCE WITH IN-MEMORY CACHE)
// ═══════════════════════════════════════════════════════════════════════════

class EmailSubsystemStore {
  private servers: EmailServerItem[] = [...INITIAL_EMAIL_SERVERS];
  private templates: EmailTemplateItem[] = [...INITIAL_EMAIL_TEMPLATES];
  private logs: EmailLogItem[] = [];
  private recipientLastSend = new Map<string, number>();
  private initialized = false;

  private async ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const supabase = getSupabaseAdminClient();
      if (!supabase) return;

      // 1. Sync servers
      const { data: srvRows } = await supabase.from('email_servers').select('*').order('priority', { ascending: true });
      if (srvRows && srvRows.length > 0) {
        this.servers = srvRows.map((r: any) => ({
          id: r.id,
          name: r.name,
          isEnabled: r.is_enabled ?? true,
          priority: r.priority ?? 1,
          senderEmail: r.sender_email,
          senderName: r.sender_name,
          host: r.host,
          port: r.port,
          encryption: r.encryption || 'starttls',
          username: r.username,
          hasPassword: Boolean(r.password_ciphertext),
          passwordCiphertext: r.password_ciphertext,
          passwordIv: r.password_iv,
          passwordTag: r.password_tag,
          passwordKeyId: r.password_key_id,
          minIntervalSeconds: r.min_interval_seconds ?? 0,
          maxPerHour: r.max_per_hour ?? 0,
          maxPerDay: r.max_per_day ?? 0,
          replyTo: r.reply_to || undefined,
          healthState: r.health_state || 'healthy',
          consecutiveFailures: r.consecutive_failures ?? 0,
          lastVerifiedAt: r.last_verified_at || undefined,
          lastUsedAt: r.last_used_at || undefined,
          lastErrorMessage: r.last_error_message || undefined,
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      } else {
        // Seed initial server to Supabase
        const initial = this.servers[0];
        if (initial) {
          await supabase.from('email_servers').insert({
            id: initial.id,
            name: initial.name,
            is_enabled: initial.isEnabled,
            priority: initial.priority,
            sender_email: initial.senderEmail,
            sender_name: initial.senderName,
            host: initial.host,
            port: initial.port,
            encryption: initial.encryption,
            username: initial.username,
            password_ciphertext: initial.passwordCiphertext,
            password_iv: initial.passwordIv,
            password_tag: initial.passwordTag,
            password_key_id: initial.passwordKeyId,
            min_interval_seconds: initial.minIntervalSeconds,
            max_per_hour: initial.maxPerHour,
            max_per_day: initial.maxPerDay,
            reply_to: initial.replyTo,
            health_state: initial.healthState,
          });
        }
      }

      // 2. Sync templates
      const { data: tmplRows } = await supabase.from('email_templates').select('*');
      const dbTemplates = (tmplRows || []).map((r: any) => ({
        id: r.id,
        templateKey: r.template_key,
        name: r.name,
        module: r.module,
        subject: r.subject,
        bodyHtml: r.body_html,
        bodyText: r.body_text || '',
        variablesSchema: r.variables_schema || [],
        isActive: r.is_active ?? true,
        version: r.version ?? 1,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString(),
      }));

      // Merge INITIAL_EMAIL_TEMPLATES with dbTemplates so all built-in templates are always available
      const templateMap = new Map<string, EmailTemplateItem>();
      INITIAL_EMAIL_TEMPLATES.forEach((t) => templateMap.set(t.templateKey, t));
      dbTemplates.forEach((t) => templateMap.set(t.templateKey, t));
      this.templates = Array.from(templateMap.values());

      // Upsert any missing initial templates to Supabase
      for (const t of INITIAL_EMAIL_TEMPLATES) {
        if (!dbTemplates.some((d) => d.templateKey === t.templateKey)) {
          await supabase.from('email_templates').upsert({
            id: t.id,
            template_key: t.templateKey,
            name: t.name,
            module: t.module,
            subject: t.subject,
            body_html: t.bodyHtml,
            body_text: t.bodyText,
            variables_schema: t.variablesSchema,
            is_active: t.isActive,
            version: t.version,
          }, { onConflict: 'template_key' });
        }
      }

      // 3. Pre-fetch recent logs from Supabase
      const { data: logRows } = await supabase.from('email_logs').select('*').order('queued_at', { ascending: false }).limit(100);
      if (logRows && logRows.length > 0) {
        this.logs = logRows.map((r: any) => this.mapSupabaseRowToLog(r));
      }
    } catch (err: any) {
      logger.warn('SYSTEM', 'email.supabase_sync_warning', { metadata: { error: err?.message } });
    }
  }

  private mapSupabaseRowToLog(r: any): EmailLogItem {
    return {
      id: r.id,
      templateKey: r.template_key || undefined,
      serverId: r.server_id || undefined,
      toAddress: r.to_address,
      ccAddress: r.cc_address || undefined,
      bccAddress: r.bcc_address || undefined,
      fromAddress: r.from_address,
      replyTo: r.reply_to || undefined,
      subjectRendered: r.subject_rendered,
      bodyRendered: r.body_rendered || undefined,
      variablesUsed: r.variables_used || {},
      module: r.module || 'general',
      relatedEntityType: r.related_entity_type || undefined,
      relatedEntityId: r.related_entity_id || undefined,
      status: r.status || 'queued',
      errorReason: r.error_reason || undefined,
      errorDetail: r.error_detail || undefined,
      attemptCount: r.attempt_count ?? 1,
      providerMessageId: r.provider_message_id || undefined,
      traceId: r.trace_id || undefined,
      queuedAt: r.queued_at || r.created_at || new Date().toISOString(),
      processingAt: r.processing_at || undefined,
      completedAt: r.completed_at || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    };
  }

  public mapSupabaseRowToServer(r: any): EmailServerItem {
    return {
      id: r.id,
      name: r.name,
      isEnabled: r.is_enabled ?? true,
      priority: r.priority ?? 1,
      senderEmail: r.sender_email,
      senderName: r.sender_name,
      host: r.host,
      port: r.port,
      encryption: r.encryption || 'starttls',
      username: r.username,
      hasPassword: Boolean(r.password_ciphertext),
      passwordCiphertext: r.password_ciphertext || undefined,
      passwordIv: r.password_iv || undefined,
      passwordTag: r.password_tag || undefined,
      passwordKeyId: r.password_key_id || 'v1',
      minIntervalSeconds: r.min_interval_seconds ?? 0,
      maxPerHour: r.max_per_hour ?? 0,
      maxPerDay: r.max_per_day ?? 0,
      replyTo: r.reply_to || undefined,
      healthState: r.health_state || 'healthy',
      consecutiveFailures: r.consecutive_failures ?? 0,
      lastVerifiedAt: r.last_verified_at || undefined,
      lastUsedAt: r.last_used_at || undefined,
      lastErrorMessage: r.last_error_message || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
    };
  }

  // ── Server CRUD ──
  public async getServers(): Promise<EmailServerItem[]> {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data: srvRows } = await supabase.from('email_servers').select('*').order('priority', { ascending: true });
        if (srvRows && srvRows.length > 0) {
          this.servers = srvRows.map((r: any) => this.mapSupabaseRowToServer(r));
          return [...this.servers];
        }
      }
    } catch {}
    await this.ensureInitialized();
    return [...this.servers].sort((a, b) => a.priority - b.priority);
  }

  public async getServerById(id: string): Promise<EmailServerItem | undefined> {
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data: r } = await supabase.from('email_servers').select('*').eq('id', id).maybeSingle();
        if (r) {
          const mapped = this.mapSupabaseRowToServer(r);
          const idx = this.servers.findIndex((s) => s.id === id);
          if (idx >= 0) this.servers[idx] = mapped;
          else this.servers.push(mapped);
          return mapped;
        }
      }
    } catch {}
    await this.ensureInitialized();
    return this.servers.find((s) => s.id === id);
  }

  public async createServer(data: {
    name?: string | undefined;
    isEnabled?: boolean | undefined;
    priority?: number | undefined;
    senderEmail?: string | undefined;
    senderName?: string | undefined;
    host?: string | undefined;
    port?: number | undefined;
    encryption?: 'starttls' | 'ssl_tls' | 'none' | undefined;
    username?: string | undefined;
    passwordPlain?: string | undefined;
    minIntervalSeconds?: number | undefined;
    maxPerHour?: number | undefined;
    maxPerDay?: number | undefined;
    replyTo?: string | undefined;
  }): Promise<EmailServerItem> {
    await this.ensureInitialized();

    let enc: any = {};
    if (data.passwordPlain) {
      const encrypted = encryptCredential(data.passwordPlain);
      enc = {
        passwordCiphertext: encrypted.ciphertext,
        passwordIv: encrypted.iv,
        passwordTag: encrypted.tag,
        passwordKeyId: encrypted.keyId,
        hasPassword: true,
      };
    }

    const newId = crypto.randomUUID();
    const newServer: EmailServerItem = {
      id: newId,
      name: data.name || 'SMTP Server',
      isEnabled: data.isEnabled ?? true,
      priority: data.priority || this.servers.length + 1,
      senderEmail: data.senderEmail || 'noreply@jaago.com.bd',
      senderName: data.senderName || 'JAAGO HUB',
      host: data.host || 'smtp-relay.brevo.com',
      port: data.port || 587,
      encryption: data.encryption || 'starttls',
      username: data.username || '',
      minIntervalSeconds: data.minIntervalSeconds || 0,
      maxPerHour: data.maxPerHour || 0,
      maxPerDay: data.maxPerDay || 0,
      replyTo: data.replyTo || undefined,
      healthState: 'healthy',
      consecutiveFailures: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...enc,
    };

    this.servers.push(newServer);

    // Save to Supabase
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        await supabase.from('email_servers').insert({
          id: newServer.id,
          name: newServer.name,
          is_enabled: newServer.isEnabled,
          priority: newServer.priority,
          sender_email: newServer.senderEmail,
          sender_name: newServer.senderName,
          host: newServer.host,
          port: newServer.port,
          encryption: newServer.encryption,
          username: newServer.username,
          password_ciphertext: newServer.passwordCiphertext || '',
          password_iv: newServer.passwordIv || '',
          password_tag: newServer.passwordTag || '',
          password_key_id: newServer.passwordKeyId || 'v1',
          min_interval_seconds: newServer.minIntervalSeconds,
          max_per_hour: newServer.maxPerHour,
          max_per_day: newServer.maxPerDay,
          reply_to: newServer.replyTo,
          health_state: newServer.healthState,
        });
      }
    } catch {}

    return newServer;
  }

  public async updateServer(id: string, data: Partial<EmailServerItem> & { passwordPlain?: string }): Promise<EmailServerItem> {
    const existing = await this.getServerById(id);
    if (!existing) {
      throw new Error(`Server with id ${id} not found`);
    }

    let encUpdates: any = {};

    if (data.passwordPlain && data.passwordPlain.trim() !== '') {
      const encrypted = encryptCredential(data.passwordPlain);
      encUpdates = {
        passwordCiphertext: encrypted.ciphertext,
        passwordIv: encrypted.iv,
        passwordTag: encrypted.tag,
        passwordKeyId: encrypted.keyId,
        hasPassword: true,
      };
    }

    const updated: EmailServerItem = {
      ...existing,
      ...data,
      ...encUpdates,
      updatedAt: new Date().toISOString(),
    };

    const idx = this.servers.findIndex((s) => s.id === id);
    if (idx >= 0) this.servers[idx] = updated;

    // Persist to Supabase
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const updatePayload: any = {
          name: updated.name,
          is_enabled: updated.isEnabled ?? true,
          priority: updated.priority ?? 1,
          sender_email: updated.senderEmail,
          sender_name: updated.senderName,
          host: updated.host,
          port: updated.port,
          encryption: updated.encryption,
          username: updated.username,
          min_interval_seconds: updated.minIntervalSeconds ?? 0,
          max_per_hour: updated.maxPerHour ?? 0,
          max_per_day: updated.maxPerDay ?? 0,
          reply_to: updated.replyTo || null,
          health_state: updated.healthState || 'healthy',
          consecutive_failures: updated.consecutiveFailures ?? 0,
          last_verified_at: updated.lastVerifiedAt || null,
          last_used_at: updated.lastUsedAt || null,
          last_error_message: updated.lastErrorMessage || null,
          updated_at: updated.updatedAt,
        };
        if (encUpdates.passwordCiphertext) {
          updatePayload.password_ciphertext = encUpdates.passwordCiphertext;
          updatePayload.password_iv = encUpdates.passwordIv;
          updatePayload.password_tag = encUpdates.passwordTag;
          updatePayload.password_key_id = encUpdates.passwordKeyId;
        }
        await supabase.from('email_servers').update(updatePayload).eq('id', id);
      }
    } catch (err: any) {
      logger.error('SYSTEM', 'email.update_server_error', { metadata: { error: err?.message } });
    }

    return updated;
  }

  public async deleteServer(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const initialLen = this.servers.length;
    this.servers = this.servers.filter((s) => s.id !== id);

    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        await supabase.from('email_servers').delete().eq('id', id);
      }
    } catch {}

    return this.servers.length < initialLen;
  }

  public async reorderPriority(orderedIds: string[]): Promise<EmailServerItem[]> {
    await this.ensureInitialized();
    for (let index = 0; index < orderedIds.length; index++) {
      const id = orderedIds[index]!;
      const server = this.servers.find((s) => s.id === id);
      if (server) {
        server.priority = index + 1;
        server.updatedAt = new Date().toISOString();
        try {
          const supabase = getSupabaseAdminClient();
          if (supabase) {
            await supabase.from('email_servers').update({ priority: index + 1, updated_at: server.updatedAt }).eq('id', id);
          }
        } catch {}
      }
    }
    return this.getServers();
  }

  // ── Template CRUD ──
  public async getTemplates(): Promise<EmailTemplateItem[]> {
    await this.ensureInitialized();
    return [...this.templates];
  }

  public async getTemplateByKey(key: string): Promise<EmailTemplateItem | undefined> {
    try {
      await this.ensureInitialized();
    } catch {}
    const found = this.templates.find((t) => t.templateKey === key && (t.isActive ?? true));
    if (found) return found;
    return INITIAL_EMAIL_TEMPLATES.find((t) => t.templateKey === key);
  }

  public async createTemplate(data: Partial<EmailTemplateItem>): Promise<EmailTemplateItem> {
    await this.ensureInitialized();
    const newId = crypto.randomUUID();
    const newTemplate: EmailTemplateItem = {
      id: newId,
      templateKey: data.templateKey || `custom.${Date.now()}`,
      name: data.name || 'Custom Email Template',
      module: data.module || 'general',
      subject: data.subject || 'JAAGO HUB Notification',
      bodyHtml: data.bodyHtml || '<p>Hello {{name}},</p>',
      bodyText: data.bodyText || 'Hello {{name}},',
      variablesSchema: data.variablesSchema || [],
      isActive: data.isActive ?? true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.templates.push(newTemplate);

    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        await supabase.from('email_templates').insert({
          id: newTemplate.id,
          template_key: newTemplate.templateKey,
          name: newTemplate.name,
          module: newTemplate.module,
          subject: newTemplate.subject,
          body_html: newTemplate.bodyHtml,
          body_text: newTemplate.bodyText,
          variables_schema: newTemplate.variablesSchema,
          is_active: newTemplate.isActive,
          version: 1,
        });
      }
    } catch {}

    return newTemplate;
  }

  public async updateTemplate(id: string, data: Partial<EmailTemplateItem>): Promise<EmailTemplateItem> {
    await this.ensureInitialized();
    const idx = this.templates.findIndex((t) => t.id === id);
    if (idx === -1) {
      throw new Error(`Template with id ${id} not found`);
    }
    const existing = this.templates[idx]!;
    const updated: EmailTemplateItem = {
      ...existing,
      ...data,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.templates[idx] = updated;

    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        await supabase.from('email_templates').update({
          name: updated.name,
          template_key: updated.templateKey,
          module: updated.module,
          subject: updated.subject,
          body_html: updated.bodyHtml,
          body_text: updated.bodyText,
          variables_schema: updated.variablesSchema,
          is_active: updated.isActive,
          version: updated.version,
          updated_at: updated.updatedAt,
        }).eq('id', id);
      }
    } catch {}

    return updated;
  }

  public async deleteTemplate(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const initialLen = this.templates.length;
    this.templates = this.templates.filter((t) => t.id !== id);

    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        await supabase.from('email_templates').delete().eq('id', id);
      }
    } catch {}

    return this.templates.length < initialLen;
  }

  // ── Logs CRUD & Tracking (SUPABASE PERSISTENCE) ──
  public async getLogs(filters?: {
    status?: string | undefined;
    module?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<{ logs: EmailLogItem[]; total: number; sentCount: number; failedCount: number }> {
    await this.ensureInitialized();

    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        let query = supabase.from('email_logs').select('*', { count: 'exact' });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.module && filters.module !== 'all') {
          query = query.eq('module', filters.module);
        }
        if (filters?.search) {
          const q = `%${filters.search}%`;
          query = query.or(`to_address.ilike.${q},subject_rendered.ilike.${q},template_key.ilike.${q},error_reason.ilike.${q}`);
        }

        const limit = filters?.limit || 50;
        const offset = filters?.offset || 0;

        query = query.order('queued_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data: rows, count } = await query;

        // Fetch counts for sent and failed
        const { count: sentCount } = await supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('status', 'sent');
        const { count: failedCount } = await supabase.from('email_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed');

        if (rows) {
          const logs = rows.map((r: any) => this.mapSupabaseRowToLog(r));
          return {
            logs,
            total: count || logs.length,
            sentCount: sentCount || 0,
            failedCount: failedCount || 0,
          };
        }
      }
    } catch (err: any) {
      logger.warn('SYSTEM', 'email.logs_query_warning', { metadata: { error: err?.message } });
    }

    // Fallback to in-memory logs
    let list = [...this.logs];
    const sentCount = list.filter((l) => l.status === 'sent').length;
    const failedCount = list.filter((l) => l.status === 'failed').length;

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((l) => l.status === filters.status);
    }
    if (filters?.module && filters.module !== 'all') {
      list = list.filter((l) => l.module === filters.module);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (l) =>
          l.toAddress.toLowerCase().includes(q) ||
          l.subjectRendered.toLowerCase().includes(q) ||
          (l.templateKey && l.templateKey.toLowerCase().includes(q)) ||
          (l.errorReason && l.errorReason.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime());
    const total = list.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;

    return { logs: list.slice(offset, offset + limit), total, sentCount, failedCount };
  }

  public async getLogById(id: string): Promise<EmailLogItem | undefined> {
    await this.ensureInitialized();
    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const { data: row } = await supabase.from('email_logs').select('*').eq('id', id).maybeSingle();
        if (row) return this.mapSupabaseRowToLog(row);
      }
    } catch {}
    return this.logs.find((l) => l.id === id);
  }

  public async addLog(log: EmailLogItem): Promise<void> {
    this.logs.unshift(log);
    if (this.logs.length > 1000) this.logs.pop();

    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        await supabase.from('email_logs').insert({
          id: log.id,
          template_key: log.templateKey,
          server_id: log.serverId && log.serverId.length === 36 ? log.serverId : undefined,
          to_address: log.toAddress,
          cc_address: log.ccAddress,
          bcc_address: log.bccAddress,
          from_address: log.fromAddress,
          reply_to: log.replyTo,
          subject_rendered: log.subjectRendered,
          body_rendered: log.bodyRendered,
          variables_used: log.variablesUsed || {},
          module: log.module || 'general',
          related_entity_type: log.relatedEntityType,
          related_entity_id: log.relatedEntityId,
          status: log.status,
          error_reason: log.errorReason,
          attempt_count: log.attemptCount,
          provider_message_id: log.providerMessageId,
          trace_id: log.traceId,
          queued_at: log.queuedAt,
          processing_at: log.processingAt,
          completed_at: log.completedAt,
        });
      }
    } catch (err: any) {
      logger.warn('SYSTEM', 'email.log_insert_failed', { metadata: { error: err?.message, logId: log.id } });
    }
  }

  public async updateLog(id: string, updates: Partial<EmailLogItem>): Promise<EmailLogItem | undefined> {
    const log = this.logs.find((l) => l.id === id);
    if (log) {
      Object.assign(log, updates, { updatedAt: new Date().toISOString() });
    }

    try {
      const supabase = getSupabaseAdminClient();
      if (supabase) {
        const updatePayload: any = {
          updated_at: new Date().toISOString(),
        };
        if (updates.status !== undefined) updatePayload.status = updates.status;
        if (updates.errorReason !== undefined) updatePayload.error_reason = updates.errorReason;
        if (updates.providerMessageId !== undefined) updatePayload.provider_message_id = updates.providerMessageId;
        if (updates.processingAt !== undefined) updatePayload.processing_at = updates.processingAt;
        if (updates.completedAt !== undefined) updatePayload.completed_at = updates.completedAt;
        if (updates.attemptCount !== undefined) updatePayload.attempt_count = updates.attemptCount;
        if (updates.serverId !== undefined && updates.serverId.length === 36) updatePayload.server_id = updates.serverId;

        await supabase.from('email_logs').update(updatePayload).eq('id', id);
      }
    } catch (err: any) {
      logger.warn('SYSTEM', 'email.log_update_failed', { metadata: { error: err?.message, logId: id } });
    }

    return log;
  }

  public checkRateLimit(recipient: string, minIntervalSeconds: number): { allowed: boolean; retryAfterMs: number } {
    if (!minIntervalSeconds || minIntervalSeconds <= 0) return { allowed: true, retryAfterMs: 0 };
    const now = Date.now();
    const last = this.recipientLastSend.get(recipient.toLowerCase()) || 0;
    const diff = (now - last) / 1000;
    if (diff < minIntervalSeconds) {
      return { allowed: false, retryAfterMs: Math.ceil((minIntervalSeconds - diff) * 1000) };
    }
    return { allowed: true, retryAfterMs: 0 };
  }

  public recordSend(recipient: string): void {
    this.recipientLastSend.set(recipient.toLowerCase(), Date.now());
  }
}

export const emailStore = new EmailSubsystemStore();

// ═══════════════════════════════════════════════════════════════════════════
// 4. CORE MAILER CAPABILITY PIPELINE (@/core/mailer)
// ═══════════════════════════════════════════════════════════════════════════

function sanitizeVariable(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function substituteVariables(templateStr: string, variables: Record<string, unknown>, escapeHtml = false): string {
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const rawVal = variables[key];
    if (rawVal === undefined || rawVal === null) return '';
    return escapeHtml ? sanitizeVariable(rawVal) : String(rawVal);
  });
}

export function validateEmailAddress(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (/[\r\n]/.test(email)) return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email.trim());
}

export function createTransporterForServer(server: EmailServerItem): nodemailer.Transporter {
  let password = '';
  if (server.passwordCiphertext && server.passwordIv && server.passwordTag) {
    try {
      password = decryptCredential({
        ciphertext: server.passwordCiphertext,
        iv: server.passwordIv,
        tag: server.passwordTag,
        keyId: server.passwordKeyId,
      });
    } catch (err: any) {
      logger.error('SYSTEM', 'email.decrypt_password_failed', { metadata: { serverId: server.id, error: err?.message } });
    }
  }

  const secure = server.encryption === 'ssl_tls' || server.port === 465;

  return nodemailer.createTransport({
    host: server.host,
    port: server.port,
    secure,
    auth: {
      user: server.username,
      pass: password,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
}

export async function verifyServerConnection(serverId: string): Promise<{ success: boolean; message: string }> {
  const server = await emailStore.getServerById(serverId);
  if (!server) {
    throw new Error(`Server with id ${serverId} not found`);
  }

  try {
    const transporter = createTransporterForServer(server);
    await transporter.verify();

    await emailStore.updateServer(serverId, {
      healthState: 'healthy',
      consecutiveFailures: 0,
      lastVerifiedAt: new Date().toISOString(),
      lastErrorMessage: undefined,
    });

    return { success: true, message: `SMTP connection to ${server.host}:${server.port} verified successfully.` };
  } catch (err: any) {
    const errMsg = err?.message || 'Failed to verify SMTP connection';
    await emailStore.updateServer(serverId, {
      healthState: 'degraded',
      consecutiveFailures: (server.consecutiveFailures || 0) + 1,
      lastErrorMessage: errMsg,
    });

    return { success: false, message: `SMTP Verification Failed: ${errMsg}` };
  }
}

/**
 * Central Outbound Mailer Service (Persists Logs directly to Supabase)
 */
export async function sendEmail(params: SendMailParams): Promise<{
  success: boolean;
  logId: string;
  status: EmailLogStatus;
  providerMessageId?: string;
  errorReason?: string;
}> {
  const traceId = `trace_em_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const logId = crypto.randomUUID();
  const now = new Date().toISOString();

  // 1. Validate Recipients
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const invalidRecipients = recipients.filter((r) => !validateEmailAddress(r));
  if (invalidRecipients.length > 0) {
    const errorReason = `Invalid recipient email address(es): ${invalidRecipients.join(', ')}`;
    await emailStore.addLog({
      id: logId,
      templateKey: params.templateKey,
      toAddress: recipients.join(', '),
      fromAddress: 'system@jaago.com.bd',
      subjectRendered: 'Validation Error',
      module: params.module || 'general',
      status: 'failed',
      errorReason,
      attemptCount: 1,
      traceId,
      queuedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { success: false, logId, status: 'failed', errorReason };
  }

  // 2. Resolve Template
  const template = await emailStore.getTemplateByKey(params.templateKey);
  if (!template) {
    const errorReason = `Email template '${params.templateKey}' not found or inactive`;
    await emailStore.addLog({
      id: logId,
      templateKey: params.templateKey,
      toAddress: recipients.join(', '),
      fromAddress: 'system@jaago.com.bd',
      subjectRendered: 'Template Error',
      module: params.module || 'general',
      status: 'failed',
      errorReason,
      attemptCount: 1,
      traceId,
      queuedAt: now,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { success: false, logId, status: 'failed', errorReason };
  }

  // 3. Render Subject, HTML Body, and Plaintext fallback
  const subjectRendered = substituteVariables(template.subject, params.variables, false).replace(/[\r\n]/g, ' ');
  const bodyHtmlRendered = substituteVariables(template.bodyHtml, params.variables, false);
  const bodyTextRendered = substituteVariables(template.bodyText, params.variables, false);

  // 4. Resolve Eligible Servers Ordered by Priority
  const allServers = await emailStore.getServers();
  const servers = allServers.filter((s) => s.isEnabled && s.healthState !== 'down');
  const eligibleServers = servers.length > 0 ? servers : allServers.filter((s) => s.isEnabled);

  const primaryServer = eligibleServers[0];
  const fromAddress = primaryServer
    ? `"${primaryServer.senderName}" <${primaryServer.senderEmail}>`
    : '"JAAGO HUB" <noreply@jaago.com.bd>';

  // Create initial log entry in Supabase & Memory
  const logEntry: EmailLogItem = {
    id: logId,
    templateKey: params.templateKey,
    serverId: primaryServer?.id,
    serverName: primaryServer?.name,
    toAddress: recipients.join(', '),
    ccAddress: params.cc ? (Array.isArray(params.cc) ? params.cc.join(', ') : params.cc) : undefined,
    bccAddress: params.bcc ? (Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc) : undefined,
    fromAddress,
    replyTo: params.replyTo || primaryServer?.replyTo,
    subjectRendered,
    bodyRendered: bodyHtmlRendered,
    variablesUsed: params.variables,
    module: params.module || template.module || 'general',
    relatedEntityType: params.relatedEntity?.type,
    relatedEntityId: params.relatedEntity?.id,
    status: 'queued',
    attemptCount: 1,
    traceId,
    queuedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await emailStore.addLog(logEntry);

  if (eligibleServers.length === 0) {
    const errorReason = 'No active SMTP servers configured or all servers are down.';
    await emailStore.updateLog(logId, { status: 'failed', errorReason, completedAt: new Date().toISOString() });
    return { success: false, logId, status: 'failed', errorReason };
  }

  // 5. Rate Limit Check
  const rateLimitCheck = emailStore.checkRateLimit(recipients[0] || '', primaryServer?.minIntervalSeconds || 0);
  if (!rateLimitCheck.allowed) {
    const errorReason = `Rate limit throttled: recipient received email within minimum interval of ${primaryServer?.minIntervalSeconds}s`;
    await emailStore.updateLog(logId, { status: 'deferred', errorReason, completedAt: new Date().toISOString() });
    return { success: false, logId, status: 'deferred', errorReason };
  }

  // 6. Execute Priority-Based Delivery with Transparent Failover
  let lastError = '';
  await emailStore.updateLog(logId, { status: 'processing', processingAt: new Date().toISOString() });

  for (let i = 0; i < eligibleServers.length; i++) {
    const currentServer = eligibleServers[i]!;
    try {
      const transporter = createTransporterForServer(currentServer);
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${currentServer.senderName}" <${currentServer.senderEmail}>`,
        to: recipients,
        cc: params.cc,
        bcc: params.bcc,
        replyTo: params.replyTo || currentServer.replyTo,
        subject: subjectRendered,
        html: bodyHtmlRendered,
        text: bodyTextRendered,
      };

      const sendResult = await transporter.sendMail(mailOptions);
      const providerMessageId = sendResult.messageId || `msg_${Date.now()}`;

      // Mark success in Supabase & Memory
      await emailStore.updateLog(logId, {
        status: 'sent',
        serverId: currentServer.id,
        serverName: currentServer.name,
        providerMessageId,
        completedAt: new Date().toISOString(),
        errorReason: undefined,
      });

      emailStore.recordSend(recipients[0] || '');

      await emailStore.updateServer(currentServer.id, {
        healthState: 'healthy',
        consecutiveFailures: 0,
        lastUsedAt: new Date().toISOString(),
      });

      logger.info('SYSTEM', 'email.delivered_success', {
        metadata: { logId, serverId: currentServer.id, to: recipients, traceId },
      });

      return {
        success: true,
        logId,
        status: 'sent',
        providerMessageId,
      };
    } catch (sendErr: any) {
      lastError = sendErr?.message || 'SMTP transmission error';
      logger.warn('SYSTEM', 'email.server_attempt_failed', {
        metadata: {
          serverId: currentServer.id,
          priority: currentServer.priority,
          error: lastError,
          failoverAttempt: i + 1 < eligibleServers.length,
        },
      });

      const failures = (currentServer.consecutiveFailures || 0) + 1;
      await emailStore.updateServer(currentServer.id, {
        consecutiveFailures: failures,
        healthState: failures >= 3 ? 'down' : 'degraded',
        lastErrorMessage: lastError,
      });

      if (sendErr?.responseCode && sendErr.responseCode >= 500 && sendErr.responseCode < 600) {
        break;
      }
    }
  }

  // 7. All servers exhausted — mark terminal failure in Supabase & Memory
  await emailStore.updateLog(logId, {
    status: 'failed',
    errorReason: `All SMTP servers failed. Last error: ${lastError}`,
    completedAt: new Date().toISOString(),
  });

  logger.error('SYSTEM', 'email.all_servers_exhausted', {
    metadata: { logId, to: recipients, traceId, lastError },
  });

  return {
    success: false,
    logId,
    status: 'failed',
    errorReason: `All SMTP servers failed. ${lastError}`,
  };
}

export async function retryEmailLog(logId: string): Promise<{ success: boolean; log: EmailLogItem; message: string }> {
  const log = await emailStore.getLogById(logId);
  if (!log) {
    throw new Error(`Email log with id ${logId} not found`);
  }

  log.attemptCount += 1;
  log.status = 'queued';
  log.queuedAt = new Date().toISOString();

  if (log.templateKey) {
    const result = await sendEmail({
      templateKey: log.templateKey,
      to: log.toAddress.split(',').map((e) => e.trim()),
      variables: log.variablesUsed || {},
      module: log.module,
      cc: log.ccAddress ? log.ccAddress.split(',').map((e) => e.trim()) : undefined,
      bcc: log.bccAddress ? log.bccAddress.split(',').map((e) => e.trim()) : undefined,
      replyTo: log.replyTo,
      relatedEntity: log.relatedEntityType && log.relatedEntityId ? { type: log.relatedEntityType, id: log.relatedEntityId } : undefined,
    });

    const updatedLog = (await emailStore.getLogById(logId)) || log;
    return {
      success: result.success,
      log: updatedLog,
      message: result.success ? 'Email retry succeeded.' : `Email retry failed: ${result.errorReason}`,
    };
  }

  return { success: false, log, message: 'Template key missing from log record' };
}

/**
 * Dispatches an automated email to the assigned supervisor upon leave submission
 */
export async function notifySupervisorOnLeaveSubmit(params: {
  supervisorName: string;
  supervisorEmail: string;
  employeeName: string;
  employeeCode: string;
  designation?: string;
  department?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number | string;
  reason: string;
  attachmentName?: string;
  requestId: string;
}): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hub.jaago.com.bd';
    const actionUrl = `${origin}/workflows?requestId=${encodeURIComponent(params.requestId)}`;

    const res = await sendEmail({
      templateKey: 'time_off.leave_submitted_supervisor',
      to: params.supervisorEmail,
      variables: {
        supervisorName: params.supervisorName,
        employeeName: params.employeeName,
        employeeCode: params.employeeCode,
        designation: params.designation || 'Staff',
        department: params.department || "Founder's Office",
        leaveType: params.leaveType,
        fromDate: params.fromDate,
        toDate: params.toDate,
        totalDays: String(params.totalDays),
        reason: params.reason || 'General leave application',
        attachmentName: params.attachmentName || 'None Attached',
        actionUrl,
      },
      module: 'time_off',
      relatedEntity: { type: 'leave_request', id: params.requestId },
    });
    const returnObj: { success: boolean; logId?: string; error?: string } = {
      success: res.success,
    };
    if (res.logId) returnObj.logId = res.logId;
    if (res.errorReason) returnObj.error = res.errorReason;
    return returnObj;
  } catch (err: any) {
    console.warn('Failed to dispatch supervisor leave notification email:', err);
    return { success: false, ...(err?.message ? { error: err.message } : {}) };
  }
}

/**
 * Dispatches an automated email to the employee when their leave request is Approved or Refused
 */
export async function notifyEmployeeOnLeaveDecision(params: {
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number | string;
  decisionStatus: 'Approved' | 'Refused' | 'Rejected';
  reviewedBy: string;
  refusalReason?: string;
  requestId: string;
}): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hub.jaago.com.bd';
    const portalUrl = `${origin}/leaves`;
    const nowStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const isRefused = params.decisionStatus === 'Refused' || params.decisionStatus === 'Rejected';

    const res = await sendEmail({
      templateKey: 'time_off.leave_decision_employee',
      to: params.employeeEmail,
      variables: {
        employeeName: params.employeeName,
        leaveType: params.leaveType,
        fromDate: params.fromDate,
        toDate: params.toDate,
        totalDays: String(params.totalDays),
        decisionStatus: isRefused ? 'REFUSED' : 'APPROVED',
        reviewedBy: params.reviewedBy,
        reviewedAt: nowStr,
        refusalReason: isRefused ? (params.refusalReason || 'Request refused by supervisor.') : (params.refusalReason || 'Approved as requested.'),
        portalUrl,
      },
      module: 'time_off',
      relatedEntity: { type: 'leave_request', id: params.requestId },
    });
    const returnObj: { success: boolean; logId?: string; error?: string } = {
      success: res.success,
    };
    if (res.logId) returnObj.logId = res.logId;
    if (res.errorReason) returnObj.error = res.errorReason;
    return returnObj;
  } catch (err: any) {
    console.warn('Failed to dispatch employee leave decision email:', err);
    return { success: false, ...(err?.message ? { error: err.message } : {}) };
  }
}

