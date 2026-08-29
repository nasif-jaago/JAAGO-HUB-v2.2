import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type EntityType = 'organization' | 'department' | 'designation' | 'branch' | 'project' | 'team';

/**
 * Universal cascading rename handler across all organizational entities and employee profiles
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entityType, oldName, newName } = body;

    if (!entityType || !newName) {
      return NextResponse.json({ success: false, error: 'entityType and newName are required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 500 });
    }

    const trimmedOld = (oldName || '').trim();
    const trimmedNew = newName.trim();

    if (!trimmedOld || trimmedOld === trimmedNew) {
      return NextResponse.json({ success: true, message: 'No rename required' });
    }

    let affectedEmployees = 0;

    switch (entityType as EntityType) {
      case 'organization': {
        // 1. Update Employees
        const { data: empData } = await supabaseAdmin
          .from('employees')
          .update({ organization: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('organization', trimmedOld)
          .select('id');
        affectedEmployees = empData?.length || 0;

        // 2. Update Departments
        await supabaseAdmin
          .from('departments')
          .update({ organization_name: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('organization_name', trimmedOld);

        // 3. Update Projects
        await supabaseAdmin
          .from('projects')
          .update({ organization_name: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('organization_name', trimmedOld);
        break;
      }

      case 'department': {
        // 1. Update Employees
        const { data: empData } = await supabaseAdmin
          .from('employees')
          .update({ department: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('department', trimmedOld)
          .select('id');
        affectedEmployees = empData?.length || 0;

        // 2. Update Projects (parent_department_name)
        await supabaseAdmin
          .from('projects')
          .update({ parent_department_name: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('parent_department_name', trimmedOld);

        // 3. Update Teams (department_or_project)
        await supabaseAdmin
          .from('teams')
          .update({ department_or_project: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('department_or_project', trimmedOld);
        break;
      }

      case 'designation': {
        // 1. Update Employees
        const { data: empData } = await supabaseAdmin
          .from('employees')
          .update({ designation: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('designation', trimmedOld)
          .select('id');
        affectedEmployees = empData?.length || 0;
        break;
      }

      case 'branch': {
        // 1. Update Employees
        const { data: empData } = await supabaseAdmin
          .from('employees')
          .update({ branch: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('branch', trimmedOld)
          .select('id');
        affectedEmployees = empData?.length || 0;
        break;
      }

      case 'project': {
        // 1. Update Employees
        const { data: empData } = await supabaseAdmin
          .from('employees')
          .update({ project: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('project', trimmedOld)
          .select('id');
        affectedEmployees = empData?.length || 0;

        // 2. Update Teams
        await supabaseAdmin
          .from('teams')
          .update({ department_or_project: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('department_or_project', trimmedOld);
        break;
      }

      case 'team': {
        // 1. Update Employees
        const { data: empData } = await supabaseAdmin
          .from('employees')
          .update({ team: trimmedNew, updated_at: new Date().toISOString() })
          .ilike('team', trimmedOld)
          .select('id');
        affectedEmployees = empData?.length || 0;
        break;
      }
    }

    logger.info('AUDIT', 'entity.cascaded_rename', {
      metadata: { entityType, oldName: trimmedOld, newName: trimmedNew, affectedEmployees },
    });

    return NextResponse.json({
      success: true,
      entityType,
      oldName: trimmedOld,
      newName: trimmedNew,
      affectedEmployees,
    });
  } catch (err: any) {
    console.error('Cascading rename error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Cascading rename error' }, { status: 500 });
  }
}
