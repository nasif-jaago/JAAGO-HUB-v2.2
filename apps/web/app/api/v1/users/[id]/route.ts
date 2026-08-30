import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getSupabaseAdminClient } from '@jaago/auth';
import { deleteUsersByIds } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    deleteUsersByIds([id]);

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      let deletedUserId = id;
      let targetEmail: string | null = null;

      if (id.includes('@')) {
        targetEmail = id.toLowerCase().trim();
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const match = userList?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
        if (match) {
          deletedUserId = match.id;
          await supabaseAdmin.auth.admin.deleteUser(match.id);
        }
      } else {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(id);
        if (userData?.user?.email) {
          targetEmail = userData.user.email.toLowerCase().trim();
        }
        await supabaseAdmin.auth.admin.deleteUser(id);
      }

      // Clear is_user flag on the linked employee record so "Create User" reappears
      await supabaseAdmin
        .from('employees')
        .update({ is_user: false, user_id: null, updated_at: new Date().toISOString() })
        .eq('user_id', deletedUserId);

      if (targetEmail) {
        await supabaseAdmin
          .from('employees')
          .update({ is_user: false, user_id: null, updated_at: new Date().toISOString() })
          .or(`work_email.ilike.${targetEmail},personal_email.ilike.${targetEmail}`);
      }

    } catch (err: any) {
      logger.warn('SYSTEM', 'user.delete_supabase_notice', { metadata: { userId: id, error: err?.message } });
    }

    logger.info('AUDIT', 'user.hard_deleted', {
      metadata: { userId: id },
    });

    return NextResponse.json({
      success: true,
      message: `User ${id} has been permanently deleted from Supabase Auth.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Delete operation failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const updates = await request.json();

    try {
      const supabaseAdmin = getSupabaseAdminClient();
      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: updates,
      });
    } catch (err: any) {
      logger.warn('SYSTEM', 'user.update_supabase_notice', { metadata: { userId: id, error: err?.message } });
    }

    logger.info('AUDIT', 'user.updated', {
      metadata: { userId: id, fields: Object.keys(updates) },
    });

    return NextResponse.json({
      success: true,
      data: { id, ...updates, updatedAt: new Date().toISOString() },
      message: 'User profile updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 });
  }
}
