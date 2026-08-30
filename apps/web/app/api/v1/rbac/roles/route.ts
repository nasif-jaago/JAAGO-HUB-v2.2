import { NextResponse } from 'next/server';
import { logger } from '@jaago/logger';
import { getRoles, addCustomRole, RoleItem } from '@/lib/rbac-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const roles = getRoles();
  return NextResponse.json({ success: true, data: roles });
}

import { getSupabaseAdminClient } from '@jaago/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, key, description, color, permissions = [] } = body;

    if (!name || !key) {
      return NextResponse.json({ success: false, error: 'Name and unique key are required' }, { status: 400 });
    }

    const cleanKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const existing = getRoles().find((r) => r.key === cleanKey);
    if (existing) {
      return NextResponse.json({ success: false, error: `Role with key '${cleanKey}' already exists` }, { status: 409 });
    }

    let generatedId = `role-${Date.now()}`;
    const supabaseAdmin = getSupabaseAdminClient();

    if (supabaseAdmin) {
      try {
        const { data: insertedRole } = await supabaseAdmin
          .from('roles')
          .insert({
            slug: cleanKey,
            name,
            description: description || `Custom role: ${name}`,
            is_system: false,
          })
          .select()
          .single();

        if (insertedRole?.id) {
          generatedId = insertedRole.id;

          if (Array.isArray(permissions) && permissions.length > 0) {
            const { data: dbPerms } = await supabaseAdmin.from('permissions').select('id, slug');
            if (dbPerms) {
              const permSlugToId = new Map<string, string>(dbPerms.map((p: any) => [p.slug, p.id]));
              const mappings = permissions
                .map((ps) => permSlugToId.get(ps))
                .filter(Boolean)
                .map((permId) => ({ role_id: generatedId, permission_id: permId }));

              if (mappings.length > 0) {
                await supabaseAdmin.from('role_permissions').insert(mappings);
              }
            }
          }
        }
      } catch (dbErr) {
        logger.warn('SYSTEM', 'rbac.custom_role_db_insert_notice', { metadata: { error: (dbErr as any)?.message } });
      }
    }

    const newRole: RoleItem = {
      id: generatedId,
      key: cleanKey,
      name,
      description: description || `Custom role: ${name}`,
      color: color || '#10B981',
      isSystem: false,
      userCount: 0,
      permissions: Array.isArray(permissions) ? permissions : [],
    };

    addCustomRole(newRole);

    logger.info('AUDIT', 'rbac.custom_role_created', { metadata: { roleKey: cleanKey, name, id: generatedId } });

    return NextResponse.json({ success: true, data: newRole, message: `Role '${name}' created successfully.` }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to create role' }, { status: 500 });
  }
}
