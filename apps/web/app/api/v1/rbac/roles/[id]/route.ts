import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getRoles, deleteCustomRole, updateRolePermissions } from '@/lib/rbac-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const role = getRoles().find((r) => r.id === id || r.key === id);

    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ success: false, error: 'System predefined roles cannot be deleted' }, { status: 403 });
    }

    const deleted = deleteCustomRole(role.key);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Failed to delete role' }, { status: 500 });
    }

    logger.info('AUDIT', 'rbac.custom_role_deleted', { metadata: { roleKey: role.key } });
    return NextResponse.json({ success: true, message: `Role '${role.name}' deleted successfully.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete role' }, { status: 500 });
  }
}

import { getSupabaseAdminClient } from '@jaago/auth';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, description, color, permissions } = body;

    const role = getRoles().find((r) => r.id === id || r.key === id);
    if (!role) {
      return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
    }

    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (color) role.color = color;
    if (Array.isArray(permissions)) {
      updateRolePermissions(role.key, permissions);
    }

    // Persist to Supabase Database
    const supabaseAdmin = getSupabaseAdminClient();
    if (supabaseAdmin) {
      try {
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (name) updatePayload.name = name;
        if (description !== undefined) updatePayload.description = description;
        if (color) updatePayload.color = color;

        // Try updating by UUID id first, then fallback to slug
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(role.id);
        if (isUuid) {
          await supabaseAdmin.from('roles').update(updatePayload).eq('id', role.id);
        } else {
          await supabaseAdmin.from('roles').update(updatePayload).eq('slug', role.key);
        }
      } catch (dbErr: any) {
        logger.warn('SYSTEM', 'rbac.role_update_db_notice', { metadata: { error: dbErr?.message } });
      }
    }

    logger.info('AUDIT', 'rbac.role_updated', { metadata: { roleKey: role.key, newName: role.name } });
    return NextResponse.json({ success: true, data: role, message: `Role '${role.name}' updated successfully.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to update role' }, { status: 500 });
  }
}
