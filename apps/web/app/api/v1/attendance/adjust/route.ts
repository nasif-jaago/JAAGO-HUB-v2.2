import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { recomputeAttendanceRecordPure } from '@jaago/core-domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      recordId,
      checkInTime, // 'HH:mm' or full ISO
      checkOutTime, // 'HH:mm' or full ISO
      reason,
      changedBy,
    } = body;

    if (!recordId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing recordId or adjustment reason (reason is required by policy)' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const nowUtc = new Date().toISOString();

    // 1. Fetch target record
    const { data: record, error: fetchErr } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', recordId)
      .single();

    if (fetchErr || !record) {
      return NextResponse.json({ success: false, error: 'Attendance record not found' }, { status: 404 });
    }

    // 2. Resolve adjusted timestamps
    const bDate = record.business_date;
    let newCheckInAt = record.check_in_at;
    let newCheckOutAt = record.check_out_at;
    let checkInChanged = false;
    let checkOutChanged = false;

    if (checkInTime !== undefined) {
      if (!checkInTime) {
        newCheckInAt = null;
      } else if (checkInTime.includes('T')) {
        newCheckInAt = new Date(checkInTime).toISOString();
      } else {
        newCheckInAt = new Date(`${bDate}T${checkInTime}:00+06:00`).toISOString();
      }
      checkInChanged = true;
    }

    if (checkOutTime !== undefined) {
      if (!checkOutTime) {
        newCheckOutAt = null;
      } else if (checkOutTime.includes('T')) {
        newCheckOutAt = new Date(checkOutTime).toISOString();
      } else {
        newCheckOutAt = new Date(`${bDate}T${checkOutTime}:00+06:00`).toISOString();
      }
      checkOutChanged = true;
    }

    // 3. Reconstruct Shift Snapshot (Invariant I7)
    const shiftSnapshot = {
      shiftId: record.shift_id || 'shift-standard',
      shiftName: record.shift_name || 'Standard Shift',
      shiftTimezone: record.shift_timezone || 'Asia/Dhaka',
      shiftStartLocal: record.shift_start_local || '10:00',
      shiftEndLocal: record.shift_end_local || '18:00',
      shiftBufferMinutes: record.shift_buffer_minutes ?? 30,
      shiftAutoCheckoutLocal: record.shift_auto_checkout_local || '23:30',
      shiftCrossesMidnight: Boolean(record.shift_crosses_midnight),
      isScheduledWorkingDay: Boolean(record.is_scheduled_working_day),
    };

    // 4. Recompute derived state (Invariant I2)
    const firstCheckInAt = checkInChanged ? newCheckInAt : (record.first_check_in_at || newCheckInAt);
    const lastCheckOutAt = checkOutChanged ? newCheckOutAt : (record.last_check_out_at || newCheckOutAt);

    const facts = {
      employeeId: record.employee_id,
      businessDate: record.business_date,
      firstCheckInAt,
      lastCheckOutAt,
      checkInAt: newCheckInAt,
      checkOutAt: newCheckOutAt,
      checkInSource: checkInChanged ? ('admin' as const) : record.check_in_source,
      checkOutSource: checkOutChanged ? ('admin' as const) : record.check_out_source,
      calcMethod: record.calc_method || 'span',
    };

    const derived = await recomputeAttendanceRecordPure(facts, shiftSnapshot);

    // 5. Audit Logging (Invariant I3)
    const auditLogs: any[] = [];
    if (checkInChanged) {
      auditLogs.push({
        attendance_record_id: record.id,
        field_changed: 'check_in_at',
        old_value: record.check_in_at,
        new_value: newCheckInAt,
        changed_by: changedBy || 'HR Admin',
        changed_at: nowUtc,
        reason,
      });
    }
    if (checkOutChanged) {
      auditLogs.push({
        attendance_record_id: record.id,
        field_changed: 'check_out_at',
        old_value: record.check_out_at,
        new_value: newCheckOutAt,
        changed_by: changedBy || 'HR Admin',
        changed_at: nowUtc,
        reason,
      });
    }

    if (auditLogs.length > 0) {
      await supabase.from('attendance_adjustments').insert(auditLogs);
    }

    // 6. Update canonical attendance_records
    const updatePayload = {
      first_check_in_at: firstCheckInAt,
      last_check_out_at: lastCheckOutAt,
      check_in_at: newCheckInAt,
      check_out_at: newCheckOutAt,
      check_in_source: checkInChanged ? 'admin' : record.check_in_source,
      check_out_source: checkOutChanged ? 'admin' : record.check_out_source,
      status: derived.status,
      is_late: derived.isLate,
      late_by_minutes: derived.lateByMinutes,
      is_auto_checkout: derived.isAutoCheckout,
      needs_review: derived.needsReview,
      worked_minutes: derived.workedMinutes,
      worked_seconds: derived.workedSeconds,
      worked_display: derived.workedDisplay,
      updated_at: nowUtc,
    };

    const { data: updatedRecord, error: updateErr } = await supabase
      .from('attendance_records')
      .update(updatePayload)
      .eq('id', record.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      derived,
      message: 'Attendance record adjusted and recomputed successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to adjust attendance record' },
      { status: 500 }
    );
  }
}
