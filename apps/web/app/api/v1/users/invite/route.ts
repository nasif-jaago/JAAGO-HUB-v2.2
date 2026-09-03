import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getSupabaseAdminClient } from '@jaago/auth';
import { sendEmail } from '@/lib/email-service';
import { addUserToDb } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emails, email, fullName, role = 'Officer', department = 'General', branch = 'Head Office (Banani)' } = body;

    const emailList: string[] = emails && Array.isArray(emails)
      ? emails
      : email
      ? [email]
      : [];

    if (emailList.length === 0) {
      return NextResponse.json({ error: 'At least one valid email is required' }, { status: 400 });
    }

    // Resolve base origin for login URL
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

    const invitedUsers = [];
    const supabaseAdmin = getSupabaseAdminClient();

    for (const em of emailList) {
      const cleanEmail = em.trim().toLowerCase();
      const userFullName = fullName || cleanEmail.split('@')[0];
      let userId = `inv-${Date.now()}`;

      // Generate random temporary password
      const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      const randNum = Math.floor(100 + Math.random() * 900);
      const tempPassword = `Jaago@2026!${randPart}${randNum}`;
      const loginUrl = `${baseOrigin.replace(/\/$/, '')}/login?email=${encodeURIComponent(cleanEmail)}`;

      try {
        if (supabaseAdmin) {
          const { data: supaUser, error: supaErr } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: userFullName,
              name: userFullName,
              role,
              department,
              branch,
              organization_id: 'org-jaago-dhaka',
            },
          });

          if (supaUser?.user) {
            userId = supaUser.user.id;
          } else if (supaErr) {
            if (supaErr.message.includes('already registered') || supaErr.message.includes('already exists')) {
              const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
              const match = userList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
              if (match) {
                userId = match.id;
                await supabaseAdmin.auth.admin.updateUserById(match.id, {
                  password: tempPassword,
                  user_metadata: {
                    full_name: userFullName,
                    role,
                    department,
                    branch,
                  },
                });
              }
            } else {
              logger.warn('AUTH', 'invite.supabase_notice', { metadata: { email: cleanEmail, error: supaErr.message } });
            }
          }
        }
      } catch (err: any) {
        logger.warn('AUTH', 'invite.supabase_error', { metadata: { email: cleanEmail, error: err?.message } });
      }

      // Add to runtime cache
      addUserToDb({
        id: userId,
        fullName: userFullName,
        email: cleanEmail,
        role: role.toUpperCase() === 'OFFICER' ? 'USER' : role,
        department,
        branch,
        jobTitle: role,
        phone: '',
        status: 'active',
        employeeId: null,
        isEmployeeLinked: false,
        avatarUrl: '',
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      });

      // Dispatch welcome invite email via Central Outbound Mail Pipeline
      let emailStatus = 'pending';
      try {
        const mailResult = await sendEmail({
          templateKey: 'pnc.employee_welcome',
          to: cleanEmail,
          variables: {
            employeeName: userFullName,
            employeeCode: 'N/A',
            designation: role,
            department,
            workEmail: cleanEmail,
            tempPassword,
            loginUrl,
          },
          module: 'admin.users',
          relatedEntity: { type: 'user', id: userId },
        });
        emailStatus = mailResult.status;
      } catch (err: any) {
        logger.warn('SYSTEM', 'invite.email_send_warning', { metadata: { email: cleanEmail, error: err?.message } });
      }

      invitedUsers.push({
        id: userId,
        email: cleanEmail,
        fullName: userFullName,
        role,
        department,
        branch,
        temporaryPassword: tempPassword,
        status: 'active',
        emailStatus,
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    logger.info('AUDIT', 'user.invitations_dispatched', {
      metadata: { count: emailList.length, role, department },
    });

    return NextResponse.json({
      success: true,
      count: invitedUsers.length,
      data: invitedUsers,
      message: `Successfully provisioned credentials & dispatched invitation(s) to ${invitedUsers.length} user(s).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invitation failed' }, { status: 500 });
  }
}

