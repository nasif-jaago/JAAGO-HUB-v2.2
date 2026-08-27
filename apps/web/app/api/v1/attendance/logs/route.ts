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
      .select('*')
      .order('business_date', { ascending: false })
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

    const [{ data: rawRecords, error: rawErr }, { data: emps }] = await Promise.all([
      query,
      supabase.from('employees').select('id, name, code, designation, department, branch, avatar_url'),
    ]);

    if (rawErr) {
      return NextResponse.json({ success: false, error: rawErr.message }, { status: 500 });
    }

    const empMap = new Map((emps || []).map((e) => [e.id, e]));
    // Also index by code for flexibility
    (emps || []).forEach((e) => {
      if (e.code) empMap.set(e.code, e);
    });

    const enriched = (rawRecords || []).map((r) => {
      const emp = empMap.get(r.employee_id);
      const inFormatted = r.check_in_at
        ? new Date(r.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '09:00 AM';
      const outFormatted = r.check_out_at
        ? new Date(r.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : undefined;

      let derivedStatus = 'Present';
      if (r.status === 'late' || r.is_late) derivedStatus = 'Late';
      else if (r.status === 'absent') derivedStatus = 'Absent';
      else if (r.status === 'half_day') derivedStatus = 'Half Day';
      else if (r.status === 'on_leave') derivedStatus = 'Leave';

      return {
        id: String(r.id),
        employeeId: r.employee_id,
        employeeCode: emp?.code || r.employee_id,
        employeeName: emp?.name || 'Staff Member',
        designation: emp?.designation || 'Staff',
        department: emp?.department || "Founder's Office",
        branch: emp?.branch || 'Head Office (Banani)',
        avatarUrl: emp?.avatar_url || '',
        status: derivedStatus,
        device: r.check_in_source === 'gps' ? 'Web Portal' : 'Device Login',
        date: r.business_date,
        checkInTime: inFormatted,
        checkOutTime: outFormatted,
        lateByMin: r.late_by_minutes || 0,
        earlyOutByMin: 0,
        createdBy: emp?.name ? `${emp.name} - (${emp.code})` : r.employee_id,
        createdAt: r.created_at ? new Date(r.created_at).toLocaleString() : new Date().toLocaleString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toLocaleString() : new Date().toLocaleString(),
        timestamp: r.check_in_at ? new Date(r.check_in_at).toLocaleString() : new Date().toLocaleString(),
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch attendance logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      employeeCode,
      date,
      checkInTime,
      checkOutTime,
      status = 'present',
      device = 'Web Portal',
    } = body;

    const supabase = getSupabaseAdminClient();

    // Resolve employee id
    let resolvedEmployeeId = employeeId;
    if (!resolvedEmployeeId || resolvedEmployeeId.startsWith('emp-')) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .or(`code.eq.${employeeCode},name.ilike.%${body.employeeName || ''}%`)
        .limit(1)
        .maybeSingle();

      if (emp?.id) {
        resolvedEmployeeId = emp.id;
      } else {
        resolvedEmployeeId = '71a38594-d803-4e6d-b6e9-79767a16c4c6'; // default
      }
    }

    // Parse checkInTime / checkOutTime to ISO string
    let checkInAt: string | null = null;
    let checkOutAt: string | null = null;
    const businessDate = date || new Date().toISOString().slice(0, 10);

    if (checkInTime && checkInTime !== '--:--' && checkInTime !== 'N/A') {
      try {
        const timePart = checkInTime.replace(/\s+/g, ' ').trim();
        const dateObj = new Date(`${businessDate} ${timePart}`);
        if (!isNaN(dateObj.getTime())) {
          checkInAt = dateObj.toISOString();
        }
      } catch {}
    }

    if (checkOutTime && checkOutTime !== '--:--' && checkOutTime !== 'N/A') {
      try {
        const timePart = checkOutTime.replace(/\s+/g, ' ').trim();
        const dateObj = new Date(`${businessDate} ${timePart}`);
        if (!isNaN(dateObj.getTime())) {
          checkOutAt = dateObj.toISOString();
        }
      } catch {}
    }

    const isLate = String(status).toLowerCase() === 'late';
    const canonicalStatus = String(status).toLowerCase();

    const recordPayload = {
      id: `att-${resolvedEmployeeId}-${businessDate}`,
      employee_id: resolvedEmployeeId,
      business_date: businessDate,
      check_in_at: checkInAt,
      check_out_at: checkOutAt,
      check_in_source: device === 'Web Portal' ? 'gps' : 'manual',
      check_out_source: checkOutAt ? (device === 'Web Portal' ? 'gps' : 'manual') : null,
      status: canonicalStatus,
      is_late: isLate,
      late_by_minutes: isLate ? 30 : 0,
      worked_minutes:
        checkInAt && checkOutAt
          ? Math.max(0, Math.round((new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()) / 60000))
          : 480,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from('attendance_records')
      .upsert(recordPayload, { onConflict: 'employee_id,business_date' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save attendance record' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id, ids, employeeCode, date } = body;
    const supabase = getSupabaseAdminClient();

    const targetIds: string[] = [];
    if (id) targetIds.push(String(id));
    if (Array.isArray(ids)) ids.forEach((i) => targetIds.push(String(i)));

    if (targetIds.length > 0) {
      await supabase.from('attendance_records').delete().in('id', targetIds);
    }

    if (date && employeeCode) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('code', employeeCode)
        .maybeSingle();

      if (emp?.id) {
        await supabase
          .from('attendance_records')
          .delete()
          .eq('employee_id', emp.id)
          .eq('business_date', date);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete attendance records' },
      { status: 500 }
    );
  }
}
