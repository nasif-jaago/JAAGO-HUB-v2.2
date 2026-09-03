import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getSupabaseAdminClient } from '@jaago/auth';
import { addUserFromEmployee } from '@/lib/users-db';
import { renderEmployeeWelcomeEmail } from '@/lib/email-templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, department, designation, employeeCode, personalEmail, branch } = body;

    if (!name) {
      return NextResponse.json({ error: 'Employee name is required' }, { status: 400 });
    }

    // ── 1. Robust Email Normalization & Validation ──
    let rawEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    // If empty or invalid (e.g. no '@' or just domain name 'hub.jaago.com.bd'), auto-generate valid work email
    if (!rawEmail || !rawEmail.includes('@')) {
      const sanitizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');
      rawEmail = `${sanitizedName || 'employee'}@jaago.com.bd`;
    }

    const cleanEmail = rawEmail;
    const cleanPersonalEmail = typeof personalEmail === 'string' && personalEmail.includes('@')
      ? personalEmail.trim().toLowerCase()
      : undefined;

    // ── 2. Auto-generate Strong Temporary Password (Upper, Lower, Number, Symbol) ──
    const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randNum = Math.floor(100 + Math.random() * 900);
    const tempPassword = `Jaago@2026!${randPart}${randNum}`;

    // ── 3. Resolve Dynamic App Origin & Portal Login Link ──
    const originHeader = request.headers.get('origin');
    const hostHeader = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protoHeader = request.headers.get('x-forwarded-proto') || 'https';
    let baseOrigin = 'https://hub.jaago.com.bd';

    if (originHeader && !originHeader.includes('undefined')) {
      baseOrigin = originHeader;
    } else if (hostHeader) {
      baseOrigin = `${protoHeader}://${hostHeader}`;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      baseOrigin = process.env.NEXT_PUBLIC_APP_URL;
    }

    const loginUrl = `${baseOrigin.replace(/\/$/, '')}/login?email=${encodeURIComponent(cleanEmail)}`;

    let supabaseUserId = '';
    let autoEmailSent = false;
    const supabaseAdmin = getSupabaseAdminClient();

    // ── 4. Invite & Synchronize User Account with Supabase Auth (Triggers Supabase Invite Email) ──
    try {
      if (supabaseAdmin) {
        // Attempt official invitation via Supabase Auth (dispatches "Invite user" email template)
        const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
          redirectTo: loginUrl,
          data: {
            full_name: name,
            department: department || 'General',
            job_title: designation || 'Staff Member',
            role: 'Officer',
            employee_code: employeeCode,
            branch: branch || 'Head Office (Banani)',
            organization_id: 'org-jaago-dhaka',
          },
        });

        if (inviteData?.user) {
          supabaseUserId = inviteData.user.id;
          autoEmailSent = true;
          logger.info('AUTH', 'create_user_from_employee.supabase_invite_dispatched', {
            metadata: { userId: supabaseUserId, email: cleanEmail },
          });

          // Also set temporary password so user can sign in via either invite link or credentials
          await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
            password: tempPassword,
          });
        } else if (inviteErr) {
          // If user already exists in Supabase, update password & metadata without sending reset email
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (existing) {
            supabaseUserId = existing.id;
            await supabaseAdmin.auth.admin.updateUserById(existing.id, {
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                ...existing.user_metadata,
                full_name: name,
                department: department || existing.user_metadata?.department || 'General',
                job_title: designation || existing.user_metadata?.job_title || 'Staff Member',
                employee_code: employeeCode,
                branch: branch || existing.user_metadata?.branch || 'Head Office (Banani)',
              },
            });
            logger.info('AUTH', 'create_user_from_employee.existing_user_updated', {
              metadata: { userId: existing.id, email: cleanEmail },
            });
          } else {
            // Fallback: create user directly
            const { data: supaUser } = await supabaseAdmin.auth.admin.createUser({
              email: cleanEmail,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                full_name: name,
                department: department || 'General',
                job_title: designation || 'Staff Member',
                role: 'Officer',
                employee_code: employeeCode,
                branch: branch || 'Head Office (Banani)',
                organization_id: 'org-jaago-dhaka',
              },
            });
            if (supaUser?.user) {
              supabaseUserId = supaUser.user.id;
            }
          }
        }
      }
    } catch (err: any) {
      logger.warn('AUTH', 'create_user_from_employee.supabase_sync_error', {
        metadata: { email: cleanEmail, error: err?.message },
      });
    }

    // ── 5. Add to Local Runtime Database ──
    const user = addUserFromEmployee({
      fullName: name,
      email: cleanEmail,
      department: department || 'General',
      jobTitle: designation || 'Staff Member',
      employeeId: employeeCode,
      branch: branch || 'Head Office (Banani)',
    });

    if (supabaseUserId) {
      user.id = supabaseUserId;
    }

    // ── 6. Generate Standard Formal Email Template (HTML & Plain Text) ──
    const emailTemplate = renderEmployeeWelcomeEmail({
      employeeName: name,
      employeeCode,
      designation: designation || 'Staff Member',
      department: department || 'General',
      branch: branch || 'Head Office (Banani)',
      workEmail: cleanEmail,
      personalEmail: cleanPersonalEmail,
      tempPassword,
      loginUrl,
      organizationName: 'JAAGO Foundation Trust',
      supportEmail: 'pnc@jaago.com.bd',
      itHelpdeskEmail: 'it-support@jaago.com.bd',
    });

    logger.info('AUDIT', 'user.created_from_employee', {
      metadata: {
        userId: user.id,
        email: cleanEmail,
        employeeCode,
        tempPasswordGenerated: true,
      },
    });

    // ── 7. Centralized Outbound Mailer Subsystem Dispatch ──
    try {
      const { sendEmail } = await import('@/lib/email-service');
      await sendEmail({
        templateKey: 'pnc.employee_welcome',
        to: cleanEmail,
        cc: cleanPersonalEmail,
        variables: {
          employeeName: name,
          employeeCode: employeeCode || 'N/A',
          designation: designation || 'Staff Member',
          department: department || 'General',
          workEmail: cleanEmail,
          tempPassword,
          loginUrl,
        },
        module: 'pnc',
        relatedEntity: { type: 'employee', id: employeeCode || user.id },
      });
    } catch {}

    // Comprehensive Email Payload for the UI modal & manual dispatch
    const emailPayload = {
      to: cleanEmail,
      personalEmail: cleanPersonalEmail,
      recipientName: name,
      employeeCode: employeeCode || '',
      designation: designation || 'Staff Member',
      department: department || 'General',
      branch: branch || 'Head Office (Banani)',
      subject: emailTemplate.subject,
      userId: cleanEmail,
      tempPassword,
      loginUrl,
      securityNote: 'Please update your password upon initial sign-in under Profile Settings > Security.',
      htmlEmail: emailTemplate.html,
      fullEmailText: emailTemplate.text,
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
        ? `Official account created & formal welcome email dispatched to ${cleanEmail}!`
        : `Official account provisioned for ${name}. Review formal invitation below.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to create user account from employee record' },
      { status: 500 }
    );
  }
}
