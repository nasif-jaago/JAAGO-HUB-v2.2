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
      isMockLocation,
      allowOverride,
    } = body;

    if (!employeeId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing employeeId or GPS coordinates' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const canonicalEmpId = await resolveCanonicalEmployeeId(employeeId);

    // Fetch settings for cutoff time & thresholds
    const { data: settings } = await supabase
      .from('attendance_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    const cutoffLocal = settings?.daily_cutoff_local || '23:30';
    const accuracyThreshold = Number(settings?.gps_accuracy_threshold_m || 350);
    const calcMethod = (settings?.working_hours_calc_method as 'span' | 'sessions') || 'span';

    const businessDate = getCurrentBusinessDate('Asia/Dhaka', cutoffLocal);
    const nowUtc = new Date().toISOString();

    // 1. Fetch existing record for this attendance day
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', canonicalEmpId)
      .eq('business_date', businessDate)
      .maybeSingle();

    // 2. State Machine Check: If already CHECKED_IN (i.e. check_in_at exists and check_out_at is null), return idempotent response
    const isCurrentlyCheckedIn = Boolean(existingRecord?.check_in_at && !existingRecord?.check_out_at);
    if (isCurrentlyCheckedIn && !body.forceNew) {
      return NextResponse.json({
        success: true,
        code: 'ALREADY_CHECKED_IN',
        message: 'Employee is already checked in.',
        state: 'CHECKED_IN',
        buttons: {
          check_in_enabled: false,
          check_out_enabled: true,
        },
        data: existingRecord,
      });
    }

    // 3. Server-side Geofence & Accuracy Verification (Invariant I6)
    const geoPayload: GPSPayload = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: Number(accuracy !== undefined ? accuracy : 10),
      capturedAt,
      idempotencyKey,
      deviceInfo,
      isMockLocation: Boolean(isMockLocation),
    };

    const geoResult = await verifyGeofenceServerSide(geoPayload, {
      accuracyThresholdM: accuracyThreshold,
    });

    // 4. Log attempt in append-only physical audit trail (attendance_events)
    await supabase.from('attendance_events').insert({
      employee_id: canonicalEmpId,
      event_type: 'check_in',
      punch_type: 'check_in',
      source: 'gps',
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
      is_within_geofence: geoResult.accepted,
      is_mock_location: Boolean(isMockLocation),
    });

    const isBypassAllowed =
      allowOverride === true && process.env.NODE_ENV !== 'production';

    // If geofence verification failed: BLOCK PUNCH. No punch and no attendance day created.
    if (!geoResult.accepted && !isBypassAllowed) {
      const locName = geoResult.matchedLocationName || 'Designated Store/Office';
      const dist = geoResult.distanceMeters ?? 0;
      const radius = geoResult.allowedRadiusMeters || 100;

      if (geoResult.rejectionReason === 'poor_accuracy') {
        return NextResponse.json(
          {
            success: false,
            code: 'LOW_GPS_ACCURACY',
            error: `GPS accuracy (±${accuracy}m) is too low to verify store presence. Please move to an open area and try again.`,
            allowedAccuracyM: accuracyThreshold,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: 'OUT_OF_GEOFENCE',
          error: `You are ~${dist}m from "${locName}"; you must be within ${radius}m to check in.`,
          distance_m: dist,
          allowed_radius_m: radius,
          nearest_site: locName,
        },
        { status: 403 }
      );
    }

    // 5. Shift Snapshot Resolution (Invariant I7)
    const shiftSnapshot = await resolveEmployeeShiftSnapshot(canonicalEmpId, businessDate);

    // 6. Anchor First Check-In (Set ONCE on first check-in of the day, never mutated afterward)
    const firstCheckInAt = existingRecord?.first_check_in_at || existingRecord?.check_in_at || nowUtc;
    const currentCheckInAt = nowUtc;
    const firstCheckInLocationId = existingRecord?.check_in_location_id || geoResult.matchedLocationId;

    const facts = {
      employeeId: canonicalEmpId,
      businessDate,
      firstCheckInAt,
      checkInAt: currentCheckInAt,
      checkInSource: 'gps' as const,
      calcMethod,
      nowServer: nowUtc,
    };

    const derived = await recomputeAttendanceRecordPure(facts, shiftSnapshot);

    // 7. Atomic Write to canonical attendance_records
    const recordPayload = {
      id: existingRecord?.id || `att-${canonicalEmpId}-${businessDate}`,
      employee_id: canonicalEmpId,
      business_date: businessDate,
      check_in_at: firstCheckInAt,
      check_out_at: null, // open session
      check_in_source: 'gps',
      check_out_source: null,
      check_in_location_id: firstCheckInLocationId,
      check_out_location_id: null,
      check_in_lat: latitude,
      check_in_lng: longitude,
      check_in_accuracy_m: accuracy,
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

    const enhancedRecord = {
      ...savedRecord,
      first_check_in_at: firstCheckInAt,
      last_check_out_at: savedRecord.check_out_at || null,
      worked_seconds: derived.workedSeconds,
      worked_display: derived.workedDisplay,
      calc_method: calcMethod,
      needs_review: false,
    };

    return NextResponse.json({
      success: true,
      state: 'CHECKED_IN',
      data: enhancedRecord,
      derived,
      buttons: {
        check_in_enabled: false,
        check_out_enabled: true,
      },
      message: derived.isLate
        ? `Checked in at ${geoResult.matchedLocationName || 'Store'} (Late by ${derived.lateByMinutes} min)`
        : `Checked in at ${geoResult.matchedLocationName || 'Store'} on time!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal check-in error' },
      { status: 500 }
    );
  }
}
