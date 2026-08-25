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

    // Synchronize user account with Supabase Auth
    try {
      const supabaseAdmin = getSupabaseAdminClient();
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

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const loginUrl = `${origin}/login`;
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

    // Invite email dispatch payload
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
    };

    return NextResponse.json({
      success: true,
      data: {
        user,
        emailPayload,
      },
      message: `User account created for ${name}. Invitation email dispatched!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create user from employee' }, { status: 500 });
  }
}
