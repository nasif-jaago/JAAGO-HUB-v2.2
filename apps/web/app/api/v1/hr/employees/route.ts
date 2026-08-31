import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface EmployeeDirectoryItem {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  branch: string;
  department: string;
  designation: string;
  supervisorName: string;
  dateOfJoining: string;
  employmentStatus: 'active' | 'probation' | 'resigned';
  salaryBdt: number;
  todayAttendanceStatus: 'present' | 'late' | 'absent' | 'on_duty' | 'leave';
  checkInTime?: string;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    
    // Fetch both employees and live Supabase Auth users in parallel
    const [{ data: empData, error: empError }, { data: authData, error: authError }] = await Promise.all([
      supabaseAdmin
        .from('employees')
        .select('*')
        .range(0, 5000)
        .order('name', { ascending: true }),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (empError) {
      return NextResponse.json({ success: false, error: empError.message }, { status: 500 });
    }

    const employees = empData || [];
    const authUsers = (!authError && authData?.users) ? authData.users : [];

    // Map active Auth users by ID and by Email for instantaneous lookups
    const authUserIds = new Set<string>(authUsers.map((u) => u.id));
    const emailToAuthUser = new Map<string, any>();
    authUsers.forEach((u) => {
      if (u.email) {
        emailToAuthUser.set(u.email.toLowerCase().trim(), u);
      }
    });

    const staleEmpIdsToDeactivate: string[] = [];
    const staleEmpUpdatesToActivate: { id: string; user_id: string }[] = [];

    const reconciledEmployees = employees.map((emp: any) => {
      const workEmail = emp.work_email?.toLowerCase().trim();
      const personalEmail = emp.personal_email?.toLowerCase().trim();

      // Check if user exists by user_id OR by email
      let matchedAuthUser = null;
      if (emp.user_id && authUserIds.has(emp.user_id)) {
        matchedAuthUser = authUsers.find((u) => u.id === emp.user_id);
      } else if (workEmail && emailToAuthUser.has(workEmail)) {
        matchedAuthUser = emailToAuthUser.get(workEmail);
      } else if (personalEmail && emailToAuthUser.has(personalEmail)) {
        matchedAuthUser = emailToAuthUser.get(personalEmail);
      }

      const hasActiveUser = Boolean(matchedAuthUser);
      const activeUserId = matchedAuthUser ? matchedAuthUser.id : null;

      // Track discrepancies to heal in database in background
      if (emp.is_user && !hasActiveUser) {
        staleEmpIdsToDeactivate.push(emp.id);
      } else if (!emp.is_user && hasActiveUser && activeUserId) {
        staleEmpUpdatesToActivate.push({ id: emp.id, user_id: activeUserId });
      }

      return {
        ...emp,
        is_user: hasActiveUser,
        user_id: activeUserId,
      };
    });

    // Background self-healing of Supabase database table
    if (staleEmpIdsToDeactivate.length > 0) {
      supabaseAdmin
        .from('employees')
        .update({ is_user: false, user_id: null, updated_at: new Date().toISOString() })
        .in('id', staleEmpIdsToDeactivate)
        .then(() => {
          logger.info('SYSTEM', 'employees.healed_deactivated_users', {
            metadata: { count: staleEmpIdsToDeactivate.length },
          });
        });
    }

    if (staleEmpUpdatesToActivate.length > 0) {
      Promise.all(
        staleEmpUpdatesToActivate.map((u) =>
          supabaseAdmin
            .from('employees')
            .update({ is_user: true, user_id: u.user_id, updated_at: new Date().toISOString() })
            .eq('id', u.id)
        )
      ).then(() => {
        logger.info('SYSTEM', 'employees.healed_activated_users', {
          metadata: { count: staleEmpUpdatesToActivate.length },
        });
      });
    }

    return NextResponse.json({ success: true, data: reconciledEmployees });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch employees' }, { status: 500 });
  }
}

function sanitizeDate(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'N/A' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '-' || trimmed === '0000-00-00' || trimmed.toLowerCase() === 'none') {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const d = dmyMatch[1];
    const m = dmyMatch[2];
    const y = dmyMatch[3];
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function sanitizeUuid(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'N/A') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { logs, ...employeePayload } = body;
    const supabaseAdmin = getSupabaseAdminClient();

    // Sanitize dates and UUID
    if ('birthday' in employeePayload) employeePayload.birthday = sanitizeDate(employeePayload.birthday);
    if ('joining_date' in employeePayload) employeePayload.joining_date = sanitizeDate(employeePayload.joining_date);
    if ('contract_end_date' in employeePayload) employeePayload.contract_end_date = sanitizeDate(employeePayload.contract_end_date);
    if ('adjustment_start_date' in employeePayload) employeePayload.adjustment_start_date = sanitizeDate(employeePayload.adjustment_start_date);
    if ('adjustment_end_date' in employeePayload) employeePayload.adjustment_end_date = sanitizeDate(employeePayload.adjustment_end_date);
    if ('custom_office_days_from' in employeePayload) employeePayload.custom_office_days_from = sanitizeDate(employeePayload.custom_office_days_from);
    if ('custom_office_days_to' in employeePayload) employeePayload.custom_office_days_to = sanitizeDate(employeePayload.custom_office_days_to);
    if ('user_id' in employeePayload) employeePayload.user_id = sanitizeUuid(employeePayload.user_id);

    let { data, error } = await supabaseAdmin
      .from('employees')
      .upsert(employeePayload, { onConflict: 'code' })
      .select()
      .single();

    if (error && error.message?.includes('is_archived')) {
      const { is_archived, ...fallbackPayload } = employeePayload;
      const retry = await supabaseAdmin
        .from('employees')
        .upsert(fallbackPayload, { onConflict: 'code' })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Insert audit logs if present
    if (logs && Array.isArray(logs) && logs.length > 0 && data?.id) {
      const logRows = logs.map((log: any) => ({
        employee_id: data.id,
        employee_code: data.code,
        user_name: log.userName || 'Admin',
        user_role: log.userRole || 'Coordinator',
        field_name: log.field || 'Profile',
        old_value: log.oldValue || 'None',
        new_value: log.newValue || 'Updated',
        action_type: log.actionType || 'update',
      }));

      await supabaseAdmin.from('employee_activity_logs').insert(logRows);
    }

    logger.info('AUDIT', 'employee.saved', {
      metadata: { code: employeePayload.code, name: employeePayload.name },
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to save employee' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { codes } = body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ success: false, error: 'Array of employee codes required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('employees')
      .delete()
      .in('code', codes)
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    logger.info('AUDIT', 'employees.deleted_permanent', {
      metadata: { codes, count: data?.length || 0 },
    });

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${data?.length || codes.length} employee(s) from Supabase.`,
      deletedCount: data?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete employees' }, { status: 500 });
  }
}
