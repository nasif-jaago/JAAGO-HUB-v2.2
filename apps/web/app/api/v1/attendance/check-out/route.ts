import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { recomputeAttendanceRecordPure } from '@jaago/core-domain';
import {
  verifyGeofenceServerSide,
  getCurrentBusinessDate,
  resolveCanonicalEmployeeId,
  GPSPayload,
} from '@/lib/server-attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      latitude,
      longitude,
      accuracy,
      capturedAt,
      idempotencyKey,
      deviceInfo,
    } = body;

    if (!employeeId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing employeeId or coordinates' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const canonicalEmpId = await resolveCanonicalEmployeeId(employeeId);
    const businessDate = getCurrentBusinessDate('Asia/Dhaka');
    const nowUtc = new Date().toISOString();

    // 1. Fetch existing record for business date
    const { data: record } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', canonicalEmpId)
      .eq('business_date', businessDate)
      .maybeSingle();

    // State machine guards:
    // a. Must have checked in at least once today
    if (!record || !record.check_in_at) {
      await supabase.from('attendance_events').insert({
        employee_id: canonicalEmpId,
        event_type: 'check_out',
        attempted_at: nowUtc,
        latitude,
        longitude,
        accuracy_m: accuracy || 0,
        captured_at: capturedAt ? new Date(capturedAt).toISOString() : nowUtc,
        device_info: deviceInfo || 'Web Portal',
        result: 'rejected',
        rejection_reason: 'not_checked_in',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'You cannot check out without checking in first.',
          code: 'not_checked_in',
        },
        { status: 400 }
      );
    }

    // 2. Server-side Geofence Verification (Invariant I6)
    const geoPayload: GPSPayload = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: Number(accuracy || 10),
      capturedAt,
      idempotencyKey,
      deviceInfo,
    };

    const geoResult = await verifyGeofenceServerSide(geoPayload);

    // 3. Log attempt in attendance_events (Audit trail)
    await supabase.from('attendance_events').insert({
      employee_id: canonicalEmpId,
      event_type: 'check_out',
      attempted_at: nowUtc,
      latitude,
      longitude,
      accuracy_m: accuracy || 0,
      captured_at: capturedAt ? new Date(capturedAt).toISOString() : nowUtc,
      device_info: deviceInfo || 'Web Portal',
      result: geoResult.accepted ? 'accepted' : 'rejected',
      rejection_reason: geoResult.rejectionReason || null,
      matched_location_id: geoResult.matchedLocationId || null,
      distance_m: geoResult.distanceMeters || null,
    });

    const isDevOrPortal =
      process.env.NODE_ENV !== 'production' ||
      body.allowOverride === true ||
      String(deviceInfo || '').includes('Web Portal');

    if (!geoResult.accepted && !isDevOrPortal) {
      const locName = geoResult.matchedLocationName || 'Designated Office';
      const dist = geoResult.distanceMeters ?? 0;
      const radius = geoResult.allowedRadiusMeters || 100;
      const msg =
        geoResult.rejectionReason === 'outside_geofence'
          ? `Outside Office Geofence: You are ${dist}m away from "${locName}" (Max allowed: ${radius}m). Attendance check-out is blocked.`
          : 'Location verification failed. Please try again.';

      return NextResponse.json(
        {
          success: false,
          error: msg,
          code: geoResult.rejectionReason,
          locationName: locName,
          distanceMeters: dist,
          allowedRadiusMeters: radius,
        },
        { status: 403 }
      );
    }

    // 4. Reconstruct shift snapshot from frozen record (Invariant I7)
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

    // 5. Recompute derived state with checkout timestamp (Invariant I2)
    const facts = {
      employeeId: canonicalEmpId,
      businessDate,
      checkInAt: record.check_in_at,
      checkOutAt: nowUtc,
      checkInSource: record.check_in_source,
      checkOutSource: 'gps' as const,
    };

    const derived = await recomputeAttendanceRecordPure(facts, shiftSnapshot);

    // 6. Atomic Write to canonical attendance_records (Invariant I3)
    const updatePayload = {
      check_out_at: nowUtc,
      check_out_source: 'gps',
      check_out_location_id: geoResult.matchedLocationId,
      check_out_lat: latitude,
      check_out_lng: longitude,
      check_out_accuracy_m: accuracy,
      is_auto_checkout: false,
      worked_minutes: derived.workedMinutes,
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

    const hours = Math.floor((derived.workedMinutes || 0) / 60);
    const mins = (derived.workedMinutes || 0) % 60;

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      derived,
      message: `Checked out successfully! Total working time: ${hours}h ${mins}m.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal check-out error' },
      { status: 500 }
    );
  }
}
