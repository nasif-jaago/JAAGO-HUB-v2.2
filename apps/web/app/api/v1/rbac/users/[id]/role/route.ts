import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';
import { updateUserInDb } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json({ success: false, error: 'Role is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (supabaseAdmin) {
      try {
        const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(id);
        if (userRecord?.user) {
          await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: {
              ...userRecord.user.user_metadata,
              role,
            },
          });
        }
      } catch (err: any) {
        logger.warn('SYSTEM', 'rbac.update_user_role_supabase_notice', { metadata: { userId: id, error: err.message } });
      }
    }

    updateUserInDb(id, { role });

    logger.info('AUDIT', 'rbac.user_role_assigned', { metadata: { userId: id, role } });

    return NextResponse.json({
      success: true,
      message: `User role updated to '${role}' successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to update user role' }, { status: 500 });
  }
}
