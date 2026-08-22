import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';

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

    const invitedUsers = emailList.map((em, idx) => ({
      id: `inv-${Date.now()}-${idx}`,
      email: em.trim(),
      fullName: fullName || em.split('@')[0],
      role,
      department,
      branch,
      status: 'invited',
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    logger.info('AUDIT', 'user.invitations_dispatched', {
      metadata: { count: emailList.length, role, department },
    });

    return NextResponse.json({
      success: true,
      count: invitedUsers.length,
      data: invitedUsers,
      message: `Successfully dispatched ${invitedUsers.length} invitation(s).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invitation failed' }, { status: 500 });
  }
}
