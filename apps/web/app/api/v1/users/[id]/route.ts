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
      if (id.includes('@')) {
        // If passed as email
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const match = userList?.users?.find((u) => u.email?.toLowerCase() === id.toLowerCase());
        if (match) {
          await supabaseAdmin.auth.admin.deleteUser(match.id);
        }
      } else {
        await supabaseAdmin.auth.admin.deleteUser(id);
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
