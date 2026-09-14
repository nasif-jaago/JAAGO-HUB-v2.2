import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type EntityType = 'organization' | 'department' | 'designation' | 'branch' | 'project' | 'team' | 'insurance' | 'insurance_category';

/**
 * POST /api/v1/hr/entities/cascade-delete
 *
 * Hard deletes one or more organizational entities from Supabase master tables
 * and clears assigned references across employees (setting them blank) and child entities.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, id, name, ids: rawIds, names: rawNames, items: rawItems } = body;

    if (!entityType) {
      return NextResponse.json({ success: false, error: 'entityType is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 500 });
    }

    // Collect all IDs and Names into normalized lists
    const targetIds = new Set<string>();
    const targetNames = new Set<string>();

    if (id && typeof id === 'string' && id.trim()) targetIds.add(id.trim());
    if (name && typeof name === 'string' && name.trim()) targetNames.add(name.trim());

    if (Array.isArray(rawIds)) {
      rawIds.forEach((i) => {
        if (i && typeof i === 'string' && i.trim()) targetIds.add(i.trim());
      });
    }

    if (Array.isArray(rawNames)) {
      rawNames.forEach((n) => {
        if (n && typeof n === 'string' && n.trim()) targetNames.add(n.trim());
      });
    }

    if (Array.isArray(rawItems)) {
      rawItems.forEach((item) => {
        if (item?.id && typeof item.id === 'string' && item.id.trim()) targetIds.add(item.id.trim());
        if (item?.name && typeof item.name === 'string' && item.name.trim()) targetNames.add(item.name.trim());
      });
    }

    const idList = Array.from(targetIds);
    const nameList = Array.from(targetNames);

    if (idList.length === 0 && nameList.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one id or name is required for deletion' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let affectedEmployees = 0;

    switch (entityType as EntityType) {
      case 'department': {
        // 1. Hard delete from departments table by ID
        if (idList.length > 0) {
          await supabaseAdmin.from('departments').delete().in('id', idList);
        }

        // 2. Hard delete from departments table by Name (case-insensitive)
        for (const deptName of nameList) {
          await supabaseAdmin.from('departments').delete().ilike('name', deptName);
        }

        // 3. Clear assigned department on employees in Supabase (make it blank)
        for (const deptName of nameList) {
          const { data: empData } = await supabaseAdmin
            .from('employees')
            .update({ department: '', updated_at: now })
            .ilike('department', deptName)
            .select('id');
          affectedEmployees += empData?.length || 0;
        }

        // 4. Clear parent department references on child departments
        for (const deptName of nameList) {
          await supabaseAdmin
            .from('departments')
            .update({ parent_department_name: '', updated_at: now })
            .ilike('parent_department_name', deptName);
        }
        if (idList.length > 0) {
          await supabaseAdmin
            .from('departments')
            .update({ parent_department_id: '', parent_department_name: '', updated_at: now })
            .in('parent_department_id', idList);
        }

        // 5. Clear parent department references on projects
        for (const deptName of nameList) {
          await supabaseAdmin
            .from('projects')
            .update({ parent_department_name: '', updated_at: now })
            .ilike('parent_department_name', deptName);
        }
        if (idList.length > 0) {
          await supabaseAdmin
            .from('projects')
            .update({ parent_department_id: '', parent_department_name: '', updated_at: now })
            .in('parent_department_id', idList);
        }

        // 6. Clear department_or_project references on teams
        for (const deptName of nameList) {
          await supabaseAdmin
            .from('teams')
            .update({ department_or_project: '', updated_at: now })
            .ilike('department_or_project', deptName);
        }
        break;
      }

      case 'designation': {
        if (idList.length > 0) {
          await supabaseAdmin.from('designations').delete().in('id', idList);
        }
        for (const desName of nameList) {
          await supabaseAdmin.from('designations').delete().ilike('name', desName);
          const { data: empData } = await supabaseAdmin
            .from('employees')
            .update({ designation: '', updated_at: now })
            .ilike('designation', desName)
            .select('id');
          affectedEmployees += empData?.length || 0;
        }
        break;
      }

      case 'project': {
        if (idList.length > 0) {
          await supabaseAdmin.from('projects').delete().in('id', idList);
        }
        for (const projName of nameList) {
          await supabaseAdmin.from('projects').delete().ilike('name', projName);
          const { data: empData } = await supabaseAdmin
            .from('employees')
            .update({ project: '', updated_at: now })
            .ilike('project', projName)
            .select('id');
          affectedEmployees += empData?.length || 0;
          await supabaseAdmin
            .from('teams')
            .update({ department_or_project: '', updated_at: now })
            .ilike('department_or_project', projName);
        }
        break;
      }

      case 'team': {
        if (idList.length > 0) {
          await supabaseAdmin.from('teams').delete().in('id', idList);
        }
        for (const teamName of nameList) {
          await supabaseAdmin.from('teams').delete().ilike('name', teamName);
          const { data: empData } = await supabaseAdmin
            .from('employees')
            .update({ team: '', updated_at: now })
            .ilike('team', teamName)
            .select('id');
          affectedEmployees += empData?.length || 0;
        }
        break;
      }

      case 'branch': {
        if (idList.length > 0) {
          await supabaseAdmin.from('organization_branches').delete().in('id', idList);
        }
        for (const branchName of nameList) {
          await supabaseAdmin.from('organization_branches').delete().ilike('name', branchName);
          const { data: empData } = await supabaseAdmin
            .from('employees')
            .update({ branch: '', updated_at: now })
            .ilike('branch', branchName)
            .select('id');
          affectedEmployees += empData?.length || 0;
        }
        break;
      }

      case 'organization': {
        if (idList.length > 0) {
          await supabaseAdmin.from('organizations').delete().in('id', idList);
        }
        for (const orgName of nameList) {
          await supabaseAdmin.from('organizations').delete().ilike('name', orgName);
          const { data: empData } = await supabaseAdmin
            .from('employees')
            .update({ organization: '', updated_at: now })
            .ilike('organization', orgName)
            .select('id');
          affectedEmployees += empData?.length || 0;
          await supabaseAdmin
            .from('departments')
            .update({ organization_name: '', updated_at: now })
            .ilike('organization_name', orgName);
          await supabaseAdmin
            .from('projects')
            .update({ organization_name: '', updated_at: now })
            .ilike('organization_name', orgName);
        }
        break;
      }

      case 'insurance':
      case 'insurance_category': {
        if (idList.length > 0) {
          await supabaseAdmin.from('insurance_categories').delete().in('id', idList);
        }
        for (const catName of nameList) {
          await supabaseAdmin.from('insurance_categories').delete().ilike('name', catName);
          const { data: empData } = await supabaseAdmin
            .from('employees')
            .update({ insurance_coverage_category: '', updated_at: now })
            .ilike('insurance_coverage_category', catName)
            .select('id');
          affectedEmployees += empData?.length || 0;
        }
        break;
      }
    }

    logger.info('AUDIT', 'entity.cascaded_delete', {
      metadata: { entityType, ids: idList, names: nameList, affectedEmployees },
    });

    return NextResponse.json({
      success: true,
      entityType,
      deletedIds: idList,
      deletedNames: nameList,
      affectedEmployees,
    });
  } catch (err: any) {
    console.error('Cascading delete error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Cascading delete error' }, { status: 500 });
  }
}
