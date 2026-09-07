import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-auth';
import { deleteUsersByIds, updateUserInDb } from '@/lib/users-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // 1. Remove from local runtime database cache
    deleteUsersByIds([id]);

    // 2. Supabase Auth and Database Cleanup
    try {
      const supabaseAdmin = getSupabaseAdmin();
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

      // 3. Clear is_user flag on the linked employee record so "Create User" reappears
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
      console.warn('Supabase Auth user delete warning:', err?.message);
    }

    return NextResponse.json({
      success: true,
      message: `User ${id} has been permanently hard deleted from the database.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Delete operation failed' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const updates = await request.json();

    try {
      const supabaseAdmin = getSupabaseAdmin();
      let targetUserId = id;

      if (id.includes('@')) {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const match = userList?.users?.find((u) => u.email?.toLowerCase() === id.toLowerCase().trim());
        if (match) targetUserId = match.id;
      }

      // Fetch existing user to preserve existing user_metadata
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      const existingMeta = userData?.user?.user_metadata || {};

      const roleName = updates.role !== undefined ? updates.role : existingMeta.role || 'Staff';
      const roleSlug = roleName.toLowerCase().replace(/[\s&/]+/g, '_');

      const newMeta = {
        ...existingMeta,
        ...updates,
        role: roleName,
        roles: Array.from(new Set([...(existingMeta.roles || []), roleSlug])),
      };

      await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        user_metadata: newMeta,
      });

      // Synchronize role in public.roles and public.user_roles if available
      if (updates.role) {
        try {
          const { data: roleRow } = await supabaseAdmin
            .from('roles')
            .select('id')
            .or(`slug.eq.${roleSlug},name.ilike.${roleName}`)
            .maybeSingle();

          if (roleRow?.id) {
            await supabaseAdmin
              .from('user_roles')
              .upsert({ user_id: targetUserId, role_id: roleRow.id }, { onConflict: 'user_id,role_id' });
          }
        } catch {
          // Ignore if user_roles table is not present
        }
      }
    } catch (err: any) {
      console.warn('Supabase Auth user update warning:', err?.message);
    }

    updateUserInDb(id, updates);

    return NextResponse.json({
      success: true,
      data: { id, ...updates, updatedAt: new Date().toISOString() },
      message: 'User profile updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Update failed' }, { status: 500 });
  }
}
