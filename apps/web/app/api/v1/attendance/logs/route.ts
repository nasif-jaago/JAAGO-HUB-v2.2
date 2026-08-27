import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from('attendance_records')
      .select('*, employees(name, code, designation, department, branch, avatar_url)')
      .order('business_date', { ascending: false })
      .order('check_in_at', { ascending: false })
      .limit(limit);

    if (date) {
      query = query.eq('business_date', date);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (status && status !== 'ALL') {
      query = query.eq('status', status.toLowerCase());
    }

    const { data: records, error } = await query;

    if (error) {
      // Fallback query without relational join if foreign key not resolved
      const { data: rawRecords, error: rawErr } = await supabase
        .from('attendance_records')
        .select('*')
        .order('business_date', { ascending: false })
        .limit(limit);

      if (rawErr) {
        return NextResponse.json({ success: false, error: rawErr.message }, { status: 500 });
      }

      // Fetch employees to enrich
      const { data: emps } = await supabase.from('employees').select('id, name, code, designation, department, branch, avatar_url');
      const empMap = new Map((emps || []).map((e) => [e.id, e]));

      const enriched = (rawRecords || []).map((r) => {
        const emp = empMap.get(r.employee_id);
        return {
          ...r,
          employeeName: emp?.name || r.employee_id,
          employeeCode: emp?.code || '',
          designation: emp?.designation || '',
          department: emp?.department || '',
          branch: emp?.branch || '',
          avatarUrl: emp?.avatar_url || '',
        };
      });

      return NextResponse.json({ success: true, data: enriched });
    }

    const formatted = (records || []).map((r: any) => {
      const emp = r.employees;
      return {
        ...r,
        employeeName: emp?.name || r.employee_id,
        employeeCode: emp?.code || '',
        designation: emp?.designation || '',
        department: emp?.department || '',
        branch: emp?.branch || '',
        avatarUrl: emp?.avatar_url || '',
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch attendance logs' },
      { status: 500 }
    );
  }
}
