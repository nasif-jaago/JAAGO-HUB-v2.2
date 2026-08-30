import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';
import {
  getRoles,
  PERMISSION_MODULES,
  updateRolePermissions,
} from '@/lib/rbac-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/rbac/matrix
 * Returns all roles (with active user counts), permission modules, and full permission matrix.
 */
export async function GET() {
  try {
    const roles = getRoles();
    const supabaseAdmin = getSupabaseAdminClient();

    if (supabaseAdmin) {
      try {
        // Fetch database roles (including any custom roles created by Super Admin)
        const [{ data: dbRoles }, { data: dbRolePerms }, { data: dbPerms }, { data: authData }] = await Promise.all([
          supabaseAdmin.from('roles').select('*'),
          supabaseAdmin.from('role_permissions').select('*'),
          supabaseAdmin.from('permissions').select('*'),
          supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } })),
        ]);

        const permIdToSlug = new Map<string, string>();
        (dbPerms || []).forEach((p: any) => {
          permIdToSlug.set(p.id, p.slug || p.key);
        });

        const rolePermMap = new Map<string, string[]>();
        (dbRolePerms || []).forEach((rp: any) => {
          const permSlug = permIdToSlug.get(rp.permission_id);
          if (permSlug) {
            const list = rolePermMap.get(rp.role_id) || [];
            list.push(permSlug);
            rolePermMap.set(rp.role_id, list);
          }
        });

        // Hydrate DB custom roles into runtime roles list
        if (dbRoles && Array.isArray(dbRoles)) {
          dbRoles.forEach((dr: any) => {
            const roleKey = dr.slug || dr.key;
            const existing = roles.find((r) => r.key === roleKey || r.id === dr.id);
            const dbAssignedPerms = rolePermMap.get(dr.id);

            if (existing) {
              if (dbAssignedPerms && dbAssignedPerms.length > 0) {
                existing.permissions = dbAssignedPerms;
              }
            } else {
              roles.push({
                id: dr.id,
                key: roleKey,
                name: dr.name,
                description: dr.description || `Custom role: ${dr.name}`,
                color: dr.color || '#10B981',
                isSystem: Boolean(dr.is_system),
                userCount: 0,
                permissions: dbAssignedPerms || [],
              });
            }
          });
        }

        // Calculate active user counts per role
        if (authData?.users) {
          const roleCounts = new Map<string, number>();
          authData.users.forEach((u) => {
            const role = (u.user_metadata?.role || 'general_staff').toLowerCase().replace(/\s+/g, '_');
            roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
          });

          roles.forEach((r) => {
            const count = roleCounts.get(r.key.toLowerCase()) || (r.key === 'super_admin' ? (roleCounts.get('super_admin') || 1) : 0);
            r.userCount = count;
          });
        }
      } catch (err) {
        logger.warn('SYSTEM', 'rbac.db_sync_notice', { metadata: { error: (err as any)?.message } });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        roles,
        modules: PERMISSION_MODULES,
        totalPermissions: PERMISSION_MODULES.reduce((acc, m) => acc + m.permissions.length, 0),
        totalRoles: roles.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch RBAC matrix' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/rbac/matrix
 * Updates permissions for one or multiple roles.
 * Body: { roleKey: string, permissions: string[] } or { matrix: { [roleKey: string]: string[] } }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { roleKey, permissions, matrix } = body;
    const supabaseAdmin = getSupabaseAdminClient();

    if (matrix && typeof matrix === 'object') {
      Object.entries(matrix).forEach(([key, perms]) => {
        if (Array.isArray(perms)) {
          updateRolePermissions(key, perms);
        }
      });

      // Background sync to database
      if (supabaseAdmin) {
        (async () => {
          try {
            const { data: dbRoles } = await supabaseAdmin.from('roles').select('id, slug');
            const { data: dbPerms } = await supabaseAdmin.from('permissions').select('id, slug');

            if (dbRoles && dbPerms) {
              const permSlugToId = new Map<string, string>(dbPerms.map((p: any) => [p.slug, p.id]));
              const roleSlugToId = new Map<string, string>(dbRoles.map((r: any) => [r.slug, r.id]));

              for (const [key, perms] of Object.entries(matrix)) {
                const roleId = roleSlugToId.get(key);
                if (roleId && Array.isArray(perms)) {
                  // Delete existing mappings
                  await supabaseAdmin.from('role_permissions').delete().eq('role_id', roleId);

                  const mappingsToInsert = perms
                    .map((permSlug) => permSlugToId.get(permSlug))
                    .filter(Boolean)
                    .map((permId) => ({ role_id: roleId, permission_id: permId }));

                  if (mappingsToInsert.length > 0) {
                    await supabaseAdmin.from('role_permissions').insert(mappingsToInsert);
                  }
                }
              }
            }
          } catch (syncErr) {
            logger.warn('SYSTEM', 'rbac.matrix_db_sync_error', { metadata: { error: (syncErr as any)?.message } });
          }
        })();
      }

      logger.info('AUDIT', 'rbac.matrix_bulk_updated', { metadata: { updatedRoles: Object.keys(matrix) } });
      return NextResponse.json({ success: true, message: 'RBAC permission matrix saved successfully.' });
    }

    if (!roleKey || !Array.isArray(permissions)) {
      return NextResponse.json({ success: false, error: 'roleKey and permissions array are required' }, { status: 400 });
    }

    const updated = updateRolePermissions(roleKey, permissions);
    if (!updated) {
      return NextResponse.json({ success: false, error: `Role '${roleKey}' not found` }, { status: 404 });
    }

    logger.info('AUDIT', 'rbac.role_permissions_updated', { metadata: { roleKey, permissionCount: permissions.length } });
    return NextResponse.json({ success: true, message: `Permissions for ${roleKey} updated successfully.` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to update RBAC matrix' }, { status: 500 });
  }
}
