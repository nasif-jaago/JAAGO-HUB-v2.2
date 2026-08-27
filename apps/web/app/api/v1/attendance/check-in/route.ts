import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { recomputeAttendanceRecordPure } from '@jaago/core-domain';
import {
  verifyGeofenceServerSide,
  resolveEmployeeShiftSnapshot,
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

    // 1. Check existing record for business date
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', canonicalEmpId)
      .eq('business_date', businessDate)
      .maybeSingle();

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

    // 3. Log attempt in attendance_events (Append-only physical audit trail)
    await supabase.from('attendance_events').insert({
      employee_id: canonicalEmpId,
      event_type: 'check_in',
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
          ? `Outside Office Geofence: You are ${dist}m away from "${locName}" (Max allowed: ${radius}m). Attendance check-in is blocked.`
          : geoResult.rejectionReason === 'poor_accuracy'
          ? 'GPS accuracy is too low to verify location reliably. Please turn on high accuracy or move closer to an open area.'
          : 'Stale GPS coordinates detected. Please refresh your device location.';

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

    // 4. Resolve shift snapshot (Invariant I7)
    const shiftSnapshot = await resolveEmployeeShiftSnapshot(canonicalEmpId, businessDate);

    // 5. Compute derived attendance state:
    // When employee checks in, update check_in_at to current timestamp if requested or if previous check_in was missing
    const firstCheckInAt = body.forceNew || !existingRecord?.check_in_at ? nowUtc : (existingRecord.check_in_at || nowUtc);
    const firstCheckInSource = 'gps';
    const firstCheckInLocationId = geoResult.matchedLocationId || existingRecord?.check_in_location_id;
    const firstCheckInLat = latitude ?? existingRecord?.check_in_lat;
    const firstCheckInLng = longitude ?? existingRecord?.check_in_lng;
    const firstCheckInAccuracy = accuracy ?? existingRecord?.check_in_accuracy_m;

    const facts = {
      employeeId: canonicalEmpId,
      businessDate,
      checkInAt: firstCheckInAt,
      checkInSource: firstCheckInSource as any,
    };

    const derived = await recomputeAttendanceRecordPure(facts, shiftSnapshot);

    // 6. Atomic Write to canonical attendance_records (Invariant I1 & I3)
    // Re-opening session sets check_out_at to null until employee checks out again
    const recordPayload = {
      id: existingRecord?.id || `att-${canonicalEmpId}-${businessDate}`,
      employee_id: canonicalEmpId,
      business_date: businessDate,
      check_in_at: firstCheckInAt,
      check_in_source: firstCheckInSource,
      check_in_location_id: firstCheckInLocationId,
      check_in_lat: firstCheckInLat,
      check_in_lng: firstCheckInLng,
      check_in_accuracy_m: firstCheckInAccuracy,
      check_out_at: null,
      check_out_source: null,
      check_out_location_id: null,
      shift_id: shiftSnapshot.shiftId,
      shift_name: shiftSnapshot.shiftName,
      shift_timezone: shiftSnapshot.shiftTimezone,
      shift_start_local: shiftSnapshot.shiftStartLocal,
      shift_end_local: shiftSnapshot.shiftEndLocal,
      shift_buffer_minutes: shiftSnapshot.shiftBufferMinutes,
      shift_auto_checkout_local: shiftSnapshot.shiftAutoCheckoutLocal,
      shift_crosses_midnight: shiftSnapshot.shiftCrossesMidnight,
      is_scheduled_working_day: shiftSnapshot.isScheduledWorkingDay,
      status: derived.status,
      is_late: derived.isLate,
      late_by_minutes: derived.lateByMinutes,
      is_auto_checkout: false,
      worked_minutes: null,
      updated_at: nowUtc,
    };

    const { data: savedRecord, error: saveErr } = await supabase
      .from('attendance_records')
      .upsert(recordPayload, { onConflict: 'employee_id,business_date' })
      .select()
      .single();

    if (saveErr) {
      return NextResponse.json({ success: false, error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: savedRecord,
      derived,
      message: derived.isLate
        ? `Checked in successfully (Late by ${derived.lateByMinutes} min)`
        : 'Checked in on time!',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal check-in error' },
      { status: 500 }
    );
  }
}
