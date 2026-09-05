import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { getEffectiveDailyAttendance } from '@/lib/server-effective-attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const month = searchParams.get('month') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    // Call unified single source of truth layer
    const effectiveDays = await getEffectiveDailyAttendance({
      employeeId,
      date,
      month,
      startDate,
      endDate,
      status,
      limit,
    });

    const mapped = effectiveDays.map((d) => {
      let deviceBadge: 'Web Portal' | 'Device Login' | 'RFID Scanner' | 'Manual In/Out' = 'Web Portal';
      if (d.primarySource === 'BioTime Terminal') {
        deviceBadge = 'Device Login';
      } else if (d.primarySource === 'Merged (GPS + BioTime)') {
        deviceBadge = 'RFID Scanner';
      } else if (d.primarySource === 'Manual') {
        deviceBadge = 'Manual In/Out';
      }

      return {
        id: `att-${d.employeeId}-${d.businessDate}`,
        employeeId: d.employeeId,
        employeeCode: d.employeeCode || d.employeeId,
        employeeName: d.employeeName || 'Staff Member',
        designation: d.designation || 'Staff',
        department: d.department || "Founder's Office",
        branch: d.branch || 'Head Office (Banani)',
        avatarUrl: d.avatarUrl || '',
        status: d.status,
        device: deviceBadge,
        date: d.businessDate,
        checkInTime: d.countedCheckInTimeLocal,
        checkOutTime: d.countedCheckOutTimeLocal !== '--:--' ? d.countedCheckOutTimeLocal : undefined,
        lateByMin: d.lateByMinutes,
        earlyOutByMin: 0,
        locationName: d.branch || 'JAAGO HQ (Banani)',
        checkInLat: 23.7937,
        checkInLng: 90.4066,
        checkOutLat: 23.7937,
        checkOutLng: 90.4066,
        isAutoCheckout: d.isAutoCheckout,
        workedMinutes: d.workedSeconds ? Math.floor(d.workedSeconds / 60) : undefined,
        workedSeconds: d.workedSeconds,
        workedDisplay: d.workedDisplay,
        createdBy: d.employeeName ? `${d.employeeName} - (${d.employeeCode})` : d.employeeId,
        createdAt: d.countedCheckInAt ? new Date(d.countedCheckInAt).toLocaleString() : new Date().toLocaleString(),
        updatedAt: d.countedCheckOutAt ? new Date(d.countedCheckOutAt).toLocaleString() : new Date().toLocaleString(),
        timestamp: d.countedCheckInAt ? new Date(d.countedCheckInAt).toLocaleString() : `${d.businessDate} 09:00 AM`,
        primarySource: d.primarySource,
        checkInSource: d.checkInSource,
        checkOutSource: d.checkOutSource,
        sourceBreakdown: d.sourceBreakdown,
        allPunches: d.allPunches,
        notes: d.notes || (d.primarySource === 'Merged (GPS + BioTime)' ? 'Counted from earliest BioTime/GPS check-in & latest check-out' : d.isAutoCheckout ? 'Auto check-out generated after 11:30 PM' : 'Attendance verified'),
      };
    });

    return NextResponse.json({ success: true, data: mapped });
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
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 });
    }

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
      first_check_in_at: checkInAt,
      last_check_out_at: checkOutAt,
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
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase client unavailable' }, { status: 500 });
    }

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
