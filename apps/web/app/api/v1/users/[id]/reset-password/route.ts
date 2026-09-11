import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Generate secure temporary password cryptographically
    const randomChars = crypto.randomBytes(6).toString('base64url');
    const randomNum = Math.floor(100 + Math.random() * 900);
    const tempPassword = `Jg#${randomChars}${randomNum}!`;

    let targetUserId = id;
    let targetEmail = '';

    // Check if ID is email or UUID
    if (id.includes('@')) {
      targetEmail = id.toLowerCase().trim();
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const match = userList?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
      if (match) {
        targetUserId = match.id;
      }
    } else {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(id);
      if (userData?.user?.email) {
        targetEmail = userData.user.email.toLowerCase().trim();
      }
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: tempPassword,
    });

    if (updateError) {
      logger.error('SECURITY', 'user.admin_password_reset_failed', {
        metadata: { userId: targetUserId, email: targetEmail, error: updateError.message },
      });
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    logger.info('SECURITY', 'user.admin_password_reset_success', {
      metadata: { userId: targetUserId, email: targetEmail },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: targetUserId,
        temporaryPassword: tempPassword,
        expiresInHours: 24,
      },
      message: 'Temporary password generated and set successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Password reset failed' }, { status: 500 });
  }
}
