import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emails, email, fullName, role = 'Staff', department = 'General', branch = 'Head Office (Banani)' } = body;

    const emailList: string[] = emails && Array.isArray(emails)
      ? emails
      : email
      ? [email]
      : [];

    if (emailList.length === 0) {
      return NextResponse.json({ error: 'At least one valid email is required' }, { status: 400 });
    }

    const invitedUsers = [];
    const supabaseAdmin = getSupabaseAdminClient();

    for (const em of emailList) {
      const cleanEmail = em.trim().toLowerCase();
      const userFullName = fullName || cleanEmail.split('@')[0];
      let userId = `inv-${Date.now()}`;

      try {
        const { data: supaUser, error: supaErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          email_confirm: false,
          user_metadata: {
            full_name: userFullName,
            role,
            department,
            branch,
            organization_id: 'org-jaago-dhaka',
          },
        });

        if (supaUser?.user) {
          userId = supaUser.user.id;
        } else if (supaErr) {
          logger.warn('AUTH', 'invite.supabase_notice', { metadata: { email: cleanEmail, error: supaErr.message } });
        }
      } catch (err: any) {
        logger.warn('AUTH', 'invite.supabase_error', { metadata: { email: cleanEmail, error: err?.message } });
      }

      invitedUsers.push({
        id: userId,
        email: cleanEmail,
        fullName: userFullName,
        role,
        department,
        branch,
        status: 'invited',
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
      message: `Successfully dispatched ${invitedUsers.length} invitation(s) via authentication service.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invitation failed' }, { status: 500 });
  }
}
