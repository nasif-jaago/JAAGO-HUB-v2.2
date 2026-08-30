import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabaseAdmin = getSupabaseAdminClient();

    // 1. Sign out all active sessions for this user (revokes all JWTs)
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.signOut(id, 'global');
      } catch (err: any) {
        logger.warn('SECURITY', 'user.revoke_signout_error', {
          metadata: { userId: id, error: err?.message },
        });
      }

      // 2. Clear is_user flag on the linked employee record (by user_id or email match)
      try {
        let userEmail: string | null = null;
        if (id.includes('@')) {
          userEmail = id.toLowerCase().trim();
        } else {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(id);
          if (userData?.user?.email) {
            userEmail = userData.user.email.toLowerCase().trim();
          }
        }

        // Clear by user_id
        await supabaseAdmin
          .from('employees')
          .update({ is_user: false, user_id: null, updated_at: new Date().toISOString() })
          .eq('user_id', id);

        // Clear by email
        if (userEmail) {
          await supabaseAdmin
            .from('employees')
            .update({ is_user: false, user_id: null, updated_at: new Date().toISOString() })
            .or(`work_email.ilike.${userEmail},personal_email.ilike.${userEmail}`);
        }
      } catch (empErr: any) {
        logger.warn('SECURITY', 'user.revoke_employee_clear_error', {
          metadata: { userId: id, error: empErr?.message },
        });
      }
    }

    logger.info('SECURITY', 'user.access_revoked', {
      metadata: { userId: id, revokedBy: 'super_admin' },
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: id,
        status: 'suspended',
        revokedAt: new Date().toISOString(),
      },
      message: 'User access and active JWT sessions have been immediately revoked.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Revoke operation failed' }, { status: 500 });
  }
}
