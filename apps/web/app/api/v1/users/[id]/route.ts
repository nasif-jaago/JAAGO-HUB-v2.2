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
      if (id.includes('-') && id.length > 20) {
        await supabaseAdmin.auth.admin.deleteUser(id);
      }
    } catch (err: any) {
      logger.warn('AUTH', 'user.delete_supabase_notice', { metadata: { userId: id, error: err?.message } });
    }

    logger.info('AUDIT', 'user.hard_deleted', {
      metadata: { userId: id },
    });

    return NextResponse.json({
      success: true,
      message: `User ${id} has been permanently deleted.`,
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
      if (id.includes('-') && id.length > 20) {
        await supabaseAdmin.auth.admin.updateUserById(id, {
          user_metadata: updates,
        });
      }
    } catch (err: any) {
      logger.warn('AUTH', 'user.update_supabase_notice', { metadata: { userId: id, error: err?.message } });
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
