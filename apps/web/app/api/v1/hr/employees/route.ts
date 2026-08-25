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
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { logs, ...employeePayload } = body;
    const supabaseAdmin = getSupabaseAdminClient();

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
