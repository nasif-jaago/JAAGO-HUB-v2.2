import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/hr/entities/sync
 *
 * Reads all employees from Supabase and reconciles every unique
 * department / designation / project / team / organization / branch
 * back into the respective master tables so that nothing is lost.
 *
 * Safe to run multiple times (idempotent — inserts only what's missing).
 */
export async function POST() {
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 500 });
    }

    // ─── 1. Load all employees ────────────────────────────────────────────────
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('department, designation, project, team, organization, branch');

    if (empErr || !employees) {
      return NextResponse.json(
        { success: false, error: empErr?.message || 'No employees found' },
        { status: 500 }
      );
    }

    // ─── 2. Load existing master records ─────────────────────────────────────
    const [
      { data: existingDepts },
      { data: existingDesigs },
      { data: existingProjects },
      { data: existingTeams },
      { data: existingOrgs },
    ] = await Promise.all([
      supabase.from('departments').select('name'),
      supabase.from('designations').select('name'),
      supabase.from('projects').select('name'),
      supabase.from('teams').select('name'),
      supabase.from('organizations').select('id, name'),
    ]);

    const existingDeptSet = new Set((existingDepts || []).map((d: any) => d.name.trim().toLowerCase()));
    const existingDesigSet = new Set((existingDesigs || []).map((d: any) => d.name.trim().toLowerCase()));
    const existingProjectSet = new Set((existingProjects || []).map((d: any) => d.name.trim().toLowerCase()));
    const existingTeamSet = new Set((existingTeams || []).map((d: any) => d.name.trim().toLowerCase()));
    const existingOrgSet = new Set((existingOrgs || []).map((d: any) => d.name.trim().toLowerCase()));

    // org name → id map
    const orgNameToId = new Map<string, string>(
      (existingOrgs || []).map((o: any) => [o.name.trim().toLowerCase(), o.id as string])
    );

    // ─── 3. Collect unique values from employees ──────────────────────────────
    type OrgMeta = { original: string; org: string };

    const missingDepts = new Map<string, OrgMeta>();
    const missingDesigs = new Map<string, string>(); // lower → original
    const missingProjects = new Map<string, OrgMeta>();
    const missingTeams = new Map<string, string>();
    const missingOrgs = new Map<string, string>();

    for (const emp of employees as any[]) {
      const dept = emp.department?.trim();
      const desig = emp.designation?.trim();
      const proj = emp.project?.trim();
      const team = emp.team?.trim();
      const org = emp.organization?.trim();

      if (dept && !existingDeptSet.has(dept.toLowerCase()) && !missingDepts.has(dept.toLowerCase())) {
        missingDepts.set(dept.toLowerCase(), { original: dept, org: org || '' });
        existingDeptSet.add(dept.toLowerCase());
      }
      if (desig && !existingDesigSet.has(desig.toLowerCase()) && !missingDesigs.has(desig.toLowerCase())) {
        missingDesigs.set(desig.toLowerCase(), desig);
        existingDesigSet.add(desig.toLowerCase());
      }
      if (proj && !existingProjectSet.has(proj.toLowerCase()) && !missingProjects.has(proj.toLowerCase())) {
        missingProjects.set(proj.toLowerCase(), { original: proj, org: org || '' });
        existingProjectSet.add(proj.toLowerCase());
      }
      if (team && !existingTeamSet.has(team.toLowerCase()) && !missingTeams.has(team.toLowerCase())) {
        missingTeams.set(team.toLowerCase(), team);
        existingTeamSet.add(team.toLowerCase());
      }
      if (org && !existingOrgSet.has(org.toLowerCase()) && !missingOrgs.has(org.toLowerCase())) {
        missingOrgs.set(org.toLowerCase(), org);
        existingOrgSet.add(org.toLowerCase());
      }
    }

    const now = new Date().toISOString();
    const results: Record<string, number | string> = {};

    // ─── 4. Insert missing Organizations ─────────────────────────────────────
    if (missingOrgs.size > 0) {
      const rows = Array.from(missingOrgs.values()).map((name) => ({
        name,
        created_at: now,
        updated_at: now,
      }));
      const { error, data: inserted } = await supabase.from('organizations').insert(rows).select('id, name');
      results.organizations = error ? `0 (error: ${error.message})` : rows.length;
      // Refresh org map with newly inserted IDs
      if (!error && inserted) {
        (inserted as any[]).forEach((o) => orgNameToId.set(o.name.trim().toLowerCase(), o.id));
      }
    } else {
      results.organizations = 0;
    }

    // ─── 5. Insert missing Departments ───────────────────────────────────────
    if (missingDepts.size > 0) {
      const rows = Array.from(missingDepts.values()).map(({ original, org }) => ({
        name: original,
        code: original.slice(0, 4).toUpperCase(),
        organization_name: org,
        organization_id: orgNameToId.get(org.toLowerCase()) || '',
        created_at: now,
        updated_at: now,
      }));
      const { error } = await supabase.from('departments').insert(rows);
      results.departments = error ? `0 (error: ${error.message})` : rows.length;
    } else {
      results.departments = 0;
    }

    // ─── 6. Insert missing Designations ──────────────────────────────────────
    if (missingDesigs.size > 0) {
      const rows = Array.from(missingDesigs.values()).map((name) => ({
        name,
        code: name.slice(0, 4).toUpperCase(),
        grade: 'Staff',
        description: `Standard role: ${name}`,
        created_at: now,
        updated_at: now,
      }));
      const { error } = await supabase.from('designations').insert(rows);
      results.designations = error ? `0 (error: ${error.message})` : rows.length;
    } else {
      results.designations = 0;
    }

    // ─── 7. Insert missing Projects ───────────────────────────────────────────
    if (missingProjects.size > 0) {
      const rows = Array.from(missingProjects.values()).map(({ original, org }) => ({
        name: original,
        code: `PRJ-${original.slice(0, 3).toUpperCase()}`,
        organization_name: org,
        organization_id: orgNameToId.get(org.toLowerCase()) || '',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      }));
      const { error } = await supabase.from('projects').insert(rows);
      results.projects = error ? `0 (error: ${error.message})` : rows.length;
    } else {
      results.projects = 0;
    }

    // ─── 8. Insert missing Teams ──────────────────────────────────────────────
    if (missingTeams.size > 0) {
      const rows = Array.from(missingTeams.values()).map((name) => ({
        name,
        code: name.slice(0, 4).toUpperCase(),
        created_at: now,
        updated_at: now,
      }));
      const { error } = await supabase.from('teams').insert(rows);
      results.teams = error ? `0 (error: ${error.message})` : rows.length;
    } else {
      results.teams = 0;
    }

    return NextResponse.json({
      success: true,
      message: 'Entity sync completed successfully',
      synced: results,
      totalEmployees: employees.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
