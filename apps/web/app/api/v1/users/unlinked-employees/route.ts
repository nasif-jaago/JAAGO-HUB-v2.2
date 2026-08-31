import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/users/unlinked-employees
 * Fetches all employees from People & Culture (public.employees) who are NOT yet active in Supabase Auth (auth.users).
 * Returns only non-user employees sorted A to Z by Name.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').toLowerCase().trim();
    const org = (searchParams.get('org') || '').toLowerCase().trim();
    const dept = (searchParams.get('dept') || '').toLowerCase().trim();

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 500 });
    }

    // 1. Fetch live Supabase Auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      logger.warn('SYSTEM', 'unlinked_employees.auth_fetch_error', { metadata: { error: authError.message } });
    }

    const authUsers = authData?.users || [];
    const authUserIds = new Set<string>(authUsers.map((u) => u.id));
    const authUserEmails = new Set<string>(
      authUsers
        .map((u) => u.email?.toLowerCase().trim())
        .filter((e): e is string => Boolean(e))
    );

    // 2. Fetch all active employees from People & Culture database table
    const { data: empData, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, code, name, work_email, personal_email, designation, department, organization, branch, avatar_url, status, is_user, user_id')
      .order('name', { ascending: true })
      .range(0, 5000);

    if (empError) {
      return NextResponse.json({ success: false, error: empError.message }, { status: 500 });
    }

    const employees = empData || [];

    // 3. Filter strictly for non-user employees (not in auth.users and not already is_user)
    const unlinkedEmployees = employees.filter((emp: any) => {
      // Exclude archived/terminated if needed, or allow any employee lacking a user account
      if (emp.status === 'Archived') return false;

      const workEmail = (emp.work_email || '').toLowerCase().trim();
      const personalEmail = (emp.personal_email || '').toLowerCase().trim();

      // Check if user already exists in Auth
      if (emp.user_id && authUserIds.has(emp.user_id)) return false;
      if (workEmail && authUserEmails.has(workEmail)) return false;
      if (personalEmail && authUserEmails.has(personalEmail)) return false;
      if (emp.is_user && emp.user_id) return false;

      return true;
    });

    // 4. Extract unique Organizations and Departments for dropdown filtering
    const organizationsSet = new Set<string>();
    const departmentsSet = new Set<string>();

    unlinkedEmployees.forEach((emp: any) => {
      if (emp.organization) organizationsSet.add(emp.organization.trim());
      if (emp.department) departmentsSet.add(emp.department.trim());
    });

    // 5. Apply query filters
    let filtered = unlinkedEmployees;

    if (org && org !== 'all') {
      filtered = filtered.filter((e: any) => (e.organization || '').toLowerCase().trim() === org);
    }

    if (dept && dept !== 'all') {
      filtered = filtered.filter((e: any) => (e.department || '').toLowerCase().trim() === dept);
    }

    if (q) {
      filtered = filtered.filter((e: any) => {
        const nameMatch = (e.name || '').toLowerCase().includes(q);
        const codeMatch = (e.code || '').toLowerCase().includes(q);
        const emailMatch = (e.work_email || '').toLowerCase().includes(q);
        const desigMatch = (e.designation || '').toLowerCase().includes(q);
        return nameMatch || codeMatch || emailMatch || desigMatch;
      });
    }

    // Ensure strict A-Z sort by employee name
    filtered.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    return NextResponse.json({
      success: true,
      data: filtered,
      totalCount: unlinkedEmployees.length,
      filteredCount: filtered.length,
      organizations: Array.from(organizationsSet).sort(),
      departments: Array.from(departmentsSet).sort(),
    });
  } catch (err: any) {
    logger.error('SYSTEM', 'unlinked_employees.fetch_failed', { metadata: { error: err?.message } });
    return NextResponse.json({ success: false, error: err?.message || 'Failed to fetch unlinked employees' }, { status: 500 });
  }
}
