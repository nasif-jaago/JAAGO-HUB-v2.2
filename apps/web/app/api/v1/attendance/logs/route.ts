import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month'); // e.g. '2026-08'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
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
    } else if (startDate && endDate) {
      query = query.gte('business_date', startDate).lte('business_date', endDate);
    } else if (month) {
      query = query.gte('business_date', `${month}-01`).lte('business_date', `${month}-31`);
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (status && status !== 'ALL' && status !== 'All Status') {
      if (status.toLowerCase() === 'auto check out' || status.toLowerCase() === 'auto_check_out') {
        query = query.eq('is_auto_checkout', true);
      } else {
        query = query.eq('status', status.toLowerCase());
      }
    }

    const [
      { data: rawRecords, error: rawErr },
      { data: emps },
      { data: gpsLocs },
      { data: geoLocs },
      { data: approvedLeaves },
    ] = await Promise.all([
      query,
      supabase.from('employees').select('id, name, code, designation, department, branch, avatar_url'),
      supabase.from('gps_locations').select('id, name, branch_office, latitude, longitude'),
      supabase.from('geofence_locations').select('id, name, branch_office, latitude, longitude'),
      supabase.from('leave_requests').select('*').eq('status', 'Approved'),
    ]);

    if (rawErr) {
      return NextResponse.json({ success: false, error: rawErr.message }, { status: 500 });
    }

    const empMap = new Map((emps || []).map((e) => [e.id, e]));
    (emps || []).forEach((e) => {
      if (e.code) empMap.set(e.code, e);
    });

    const locMap = new Map<string, string>();
    (gpsLocs || []).forEach((g) => {
      if (g.id) locMap.set(g.id, g.name || g.branch_office || 'Designated Office');
    });
    (geoLocs || []).forEach((g) => {
      if (g.id && !locMap.has(g.id)) locMap.set(g.id, g.name || g.branch_office || 'Designated Office');
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
      if (r.is_auto_checkout) derivedStatus = 'Auto Check Out';
      else if (r.status === 'late' || r.is_late) derivedStatus = 'Late';
      else if (r.status === 'absent') derivedStatus = 'Absent';
      else if (r.status === 'half_day') derivedStatus = 'Half Day';
      else if (r.status === 'on_leave') derivedStatus = 'Leave';

      const resolvedLocName =
        (r.check_in_location_id && locMap.get(r.check_in_location_id)) ||
        (r.check_out_location_id && locMap.get(r.check_out_location_id)) ||
        'JAAGO HQ (Banani)';

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
        locationName: resolvedLocName,
        checkInLat: r.check_in_lat !== null ? Number(r.check_in_lat) : 23.7937,
        checkInLng: r.check_in_lng !== null ? Number(r.check_in_lng) : 90.4066,
        checkOutLat: r.check_out_lat !== null ? Number(r.check_out_lat) : 23.7937,
        checkOutLng: r.check_out_lng !== null ? Number(r.check_out_lng) : 90.4066,
        isAutoCheckout: Boolean(r.is_auto_checkout),
        workedMinutes: r.worked_minutes,
        createdBy: emp?.name ? `${emp.name} - (${emp.code})` : r.employee_id,
        createdAt: r.created_at ? new Date(r.created_at).toLocaleString() : new Date().toLocaleString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toLocaleString() : new Date().toLocaleString(),
        timestamp: r.check_in_at ? new Date(r.check_in_at).toLocaleString() : new Date().toLocaleString(),
        notes: r.notes || (r.status === 'On Duty' ? 'On Duty' : r.is_auto_checkout ? 'Auto check-out generated after 11:30 PM' : 'GPS Geofence Verified'),
      };
    });

    // Expand and merge approved leave requests into attendance logs
    const existingKeys = new Set(enriched.map((e) => `${(e.employeeCode || '').toLowerCase().trim()}_${e.date}`));

    if (Array.isArray(approvedLeaves)) {
      for (const lv of approvedLeaves) {
        const lvCode = (lv.employee_code || '').trim();
        const lvId = (lv.employee_id || '').trim();
        const emp = empMap.get(lvId) || empMap.get(lvCode);

        // Check if employeeId filter matches
        if (employeeId && lvId !== employeeId && lvCode !== employeeId && emp?.code !== employeeId && emp?.id !== employeeId) {
          continue;
        }

        // Check if status filter excludes Leave
        if (status && status !== 'ALL' && status !== 'All Status' && status.toLowerCase() !== 'leave' && status.toLowerCase() !== 'half day') {
          continue;
        }

        const start = new Date(lv.from_date);
        const end = new Date(lv.to_date);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

        const current = new Date(start);
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0]!;
          current.setDate(current.getDate() + 1);

          // Apply date filters
          if (date && dateStr !== date) continue;
          if (startDate && endDate && (dateStr < startDate || dateStr > endDate)) continue;
          if (month && !dateStr.startsWith(month)) continue;

          const matchKey = `${(lvCode || emp?.code || '').toLowerCase().trim()}_${dateStr}`;
          if (existingKeys.has(matchKey)) continue;

          const rawReason = lv.reason || '';
          const cleanReason = rawReason
            .replace(/\[Attachment:\s*[\s\S]*?\]/gi, '')
            .replace(/\[Refusal Note:\s*[\s\S]*?\]/gi, '')
            .trim();

          enriched.push({
            id: `att-leave-${lvCode || lvId}-${dateStr}`,
            employeeId: lvId || emp?.id || `emp-${lvCode}`,
            employeeCode: lvCode || emp?.code || 'EMP',
            employeeName: emp?.name || lv.employee_name || 'Staff Member',
            designation: emp?.designation || 'Staff',
            department: emp?.department || "Founder's Office",
            branch: emp?.branch || 'Head Office (Banani)',
            avatarUrl: emp?.avatar_url || '',
            status: 'Leave',
            device: 'Web Portal',
            date: dateStr,
            checkInTime: 'N/A',
            checkOutTime: 'N/A',
            lateByMin: 0,
            earlyOutByMin: 0,
            locationName: 'On Leave',
            checkInLat: 23.7937,
            checkInLng: 90.4066,
            checkOutLat: 23.7937,
            checkOutLng: 90.4066,
            isAutoCheckout: false,
            workedMinutes: 0,
            createdBy: lv.approved_by || `${lv.employee_name} (${lvCode})`,
            createdAt: lv.created_at ? new Date(lv.created_at).toLocaleString() : new Date().toLocaleString(),
            updatedAt: lv.updated_at ? new Date(lv.updated_at).toLocaleString() : new Date().toLocaleString(),
            timestamp: `${dateStr} 09:00 AM`,
            notes: `Approved Leave: ${lv.leave_type}${cleanReason ? ` - ${cleanReason}` : ''}`,
          });
          existingKeys.add(matchKey);
        }
      }
    }

    enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
      checkInLat,
      checkInLng,
      checkOutLat,
      checkOutLng,
      isAutoCheckout,
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
    const isAuto = Boolean(isAutoCheckout || String(status).toLowerCase().includes('auto'));
    const canonicalStatus = isAuto ? 'present' : String(status).toLowerCase();

    const recordPayload = {
      id: `att-${resolvedEmployeeId}-${businessDate}`,
      employee_id: resolvedEmployeeId,
      business_date: businessDate,
      check_in_at: checkInAt,
      check_out_at: checkOutAt,
      check_in_source: device === 'Web Portal' ? 'gps' : 'manual',
      check_out_source: checkOutAt ? (device === 'Web Portal' ? 'gps' : 'manual') : null,
      check_in_lat: checkInLat !== undefined ? checkInLat : 23.7937,
      check_in_lng: checkInLng !== undefined ? checkInLng : 90.4066,
      check_out_lat: checkOutLat !== undefined ? checkOutLat : 23.7937,
      check_out_lng: checkOutLng !== undefined ? checkOutLng : 90.4066,
      status: canonicalStatus,
      is_late: isLate,
      late_by_minutes: isLate ? 30 : 0,
      is_auto_checkout: isAuto,
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
