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

    // Fetch settings
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
    const { data: record } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', canonicalEmpId)
      .eq('business_date', businessDate)
      .maybeSingle();

    // 2. State Guard: Check-out requires an open check-in session
    const isOpenSession = Boolean(record && record.check_in_at && !record.check_out_at);
    if (!isOpenSession) {
      await supabase.from('attendance_events').insert({
        employee_id: canonicalEmpId,
        event_type: 'check_out',
        punch_type: 'check_out',
        source: 'gps',
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
          code: 'NOT_CHECKED_IN',
          error: 'You cannot check out without checking in first.',
          state: 'NOT_CHECKED_IN',
          buttons: {
            check_in_enabled: true,
            check_out_enabled: false,
          },
        },
        { status: 400 }
      );
    }

    // 3. Server-side Geofence Verification (Invariant I6)
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
      event_type: 'check_out',
      punch_type: 'check_out',
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

    if (!geoResult.accepted && !isBypassAllowed) {
      const locName = geoResult.matchedLocationName || 'Designated Store/Office';
      const dist = geoResult.distanceMeters ?? 0;
      const radius = geoResult.allowedRadiusMeters || 100;

      if (geoResult.rejectionReason === 'poor_accuracy') {
        return NextResponse.json(
          {
            success: false,
            code: 'LOW_GPS_ACCURACY',
            error: `GPS accuracy (±${accuracy}m) is too low to verify store presence. Please move closer to an open area.`,
            allowedAccuracyM: accuracyThreshold,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: 'OUT_OF_GEOFENCE',
          error: `You are ~${dist}m from "${locName}"; you must be within ${radius}m to check out.`,
          distance_m: dist,
          allowed_radius_m: radius,
          nearest_site: locName,
        },
        { status: 403 }
      );
    }

    // 5. Shift Snapshot Reconstruction from frozen record (Invariant I7)
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

    // 6. Anchor first_check_in and update last_check_out_at
    const firstCheckInAt = record.first_check_in_at || record.check_in_at;
    const lastCheckOutAt = nowUtc;

    // Fetch all punches today if sessions method is active
    let punchesList = undefined;
    if (calcMethod === 'sessions') {
      const { data: rawEvents } = await supabase
        .from('attendance_events')
        .select('*')
        .eq('employee_id', canonicalEmpId)
        .eq('result', 'accepted')
        .gte('attempted_at', `${businessDate}T00:00:00.000Z`)
        .order('attempted_at', { ascending: true });

      if (rawEvents) {
        punchesList = rawEvents.map((e) => ({
          punchType: (e.punch_type || e.event_type) as 'check_in' | 'check_out',
          punchAt: e.attempted_at,
          source: e.source,
        }));
      }
    }

    const facts = {
      employeeId: canonicalEmpId,
      businessDate,
      firstCheckInAt,
      lastCheckOutAt,
      checkInAt: record.check_in_at,
      checkOutAt: nowUtc,
      checkInSource: record.check_in_source,
      checkOutSource: 'gps' as const,
      calcMethod,
      punches: punchesList || [],
    };

    const derived = await recomputeAttendanceRecordPure(facts, shiftSnapshot);

    // 7. Atomic Write to canonical attendance_records (Closing current session, state -> NOT_CHECKED_IN)
    const updatePayload = {
      check_out_at: nowUtc,
      check_out_source: 'gps',
      check_out_location_id: geoResult.matchedLocationId,
      check_out_lat: latitude,
      check_out_lng: longitude,
      check_out_accuracy_m: accuracy,
      is_auto_checkout: false,
      worked_minutes: derived.workedMinutes,
      status: derived.status,
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

    const enhancedRecord = {
      ...updatedRecord,
      first_check_in_at: firstCheckInAt,
      last_check_out_at: lastCheckOutAt,
      worked_seconds: derived.workedSeconds,
      worked_display: derived.workedDisplay,
      calc_method: calcMethod,
      needs_review: false,
    };

    return NextResponse.json({
      success: true,
      state: 'NOT_CHECKED_IN',
      data: enhancedRecord,
      derived,
      buttons: {
        check_in_enabled: true,
        check_out_enabled: false,
      },
      message: `Checked out successfully at ${geoResult.matchedLocationName || 'Store'}! Total working time: ${derived.workedDisplay}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal check-out error' },
      { status: 500 }
    );
  }
}
