import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getSupabaseAdminClient } from '@jaago/auth';
import { addUserFromEmployee } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, department, designation, employeeCode } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Auto-generate secure temporary password meeting strong password policy (Upper, Lower, Number, Symbol)
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randNum = Math.floor(100 + Math.random() * 900);
    const tempPassword = `Jaago@2026!${randPart}${randNum}`;

    let supabaseUserId = '';
    const supabaseAdmin = getSupabaseAdminClient();

    // Synchronize user account with Supabase Auth
    try {
      const { data: supaUser, error: supaErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          department: department || 'General',
          job_title: designation || 'Staff Member',
          role: 'Officer',
          employee_code: employeeCode,
          organization_id: 'org-jaago-dhaka',
        },
      });

      if (supaUser?.user) {
        supabaseUserId = supaUser.user.id;
      } else if (supaErr) {
        // If user already exists, update their password in Supabase Auth
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          supabaseUserId = existing.id;
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: tempPassword,
            user_metadata: {
              ...existing.user_metadata,
              full_name: name,
              employee_code: employeeCode,
            },
          });
        }
      }
    } catch (err: any) {
      logger.warn('AUTH', 'create_user_from_employee.supabase_sync_error', {
        metadata: { email: cleanEmail, error: err?.message },
      });
    }

    const user = addUserFromEmployee({
      fullName: name,
      email: cleanEmail,
      department: department || 'General',
      jobTitle: designation || 'Staff Member',
      employeeId: employeeCode,
    });

    if (supabaseUserId) {
      user.id = supabaseUserId;
    }

    const loginUrl = 'https://hub.jaago.com.bd/login';
    const emailSubject = 'Welcome to JAAGO HUB — Your Login Access & Credentials';
    const shortSecurityNote = 'Please update your password as soon as possible after your initial login.';

    const emailBodyText = `Subject: ${emailSubject}
To: ${cleanEmail}

Dear ${name},

Welcome to JAAGO HUB! Your official employee account has been created with secure access to the organizational portal.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User ID (Work Email) : ${cleanEmail}
Temporary Password    : ${tempPassword}
Portal Login Link     : ${loginUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Important Note:
${shortSecurityNote}

Best regards,
People & Culture Team
JAAGO Foundation Trust`;

    logger.info('AUDIT', 'user.created_from_employee', {
      metadata: {
        userId: user.id,
        email: cleanEmail,
        employeeCode,
        tempPasswordGenerated: true,
      },
    });

    // ── Auto-dispatch welcome/password-setup email via Supabase Auth & SMTP ────────
    let autoEmailSent = false;
    try {
      if (supabaseAdmin && cleanEmail) {
        // Triggers Supabase Auth to dispatch the reset/welcome email via Brevo SMTP
        const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: loginUrl,
        });

        if (!resetErr) {
          autoEmailSent = true;
          logger.info('SYSTEM', 'notification.auto_welcome_email_sent', {
            metadata: { to: cleanEmail, method: 'supabase_reset_password_email' },
          });
        } else {
          logger.warn('SYSTEM', 'notification.auto_email_error', {
            metadata: { email: cleanEmail, error: resetErr.message },
          });
        }
      }
    } catch (emailErr: any) {
      logger.warn('SYSTEM', 'notification.auto_email_failed', {
        metadata: { email: cleanEmail, error: emailErr?.message },
      });
    }

    // Invite email dispatch payload (shown in the UI modal)
    const emailPayload = {
      to: cleanEmail,
      recipientName: name,
      subject: emailSubject,
      userId: cleanEmail,
      tempPassword,
      loginUrl,
      securityNote: shortSecurityNote,
      fullEmailText: emailBodyText,
      sentAt: new Date().toISOString(),
      autoSent: autoEmailSent,
    };

    return NextResponse.json({
      success: true,
      data: {
        user,
        emailPayload,
      },
      message: autoEmailSent
        ? `User account created & welcome email sent to ${cleanEmail}!`
        : `User account created for ${name}. Click "Send Email" to dispatch credentials.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create user from employee' }, { status: 500 });
  }
}
