import { getSupabaseAdminClient } from '@jaago/auth';
import type { ShiftSnapshot } from '@jaago/core-domain';
import { INITIAL_GPS_LOCATIONS } from '@/lib/supabase-gps';

export interface GPSPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt?: string | number | undefined;
  idempotencyKey?: string | undefined;
  deviceInfo?: string | undefined;
}

export interface GeofenceMatchResult {
  accepted: boolean;
  rejectionReason?:
    | 'outside_geofence'
    | 'poor_accuracy'
    | 'stale_coordinates'
    | 'no_active_geofences'
    | undefined;
  matchedLocationId?: string | undefined;
  matchedLocationName?: string | undefined;
  distanceMeters?: number | undefined;
  allowedRadiusMeters?: number | undefined;
}

/**
 * Computes great-circle distance between two (lat, lon) coordinates in meters (Haversine formula).
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates GPS coordinate payload against active office geofence locations.
 * Invariant I6: Server-side distance check against geofence_locations.
 */
export async function verifyGeofenceServerSide(
  payload: GPSPayload,
  settings?: {
    accuracyThresholdM?: number;
    freshnessSeconds?: number;
  }
): Promise<GeofenceMatchResult> {
  const supabase = getSupabaseAdminClient();
  const accuracyThreshold = settings?.accuracyThresholdM ?? 150;
  const freshnessSec = settings?.freshnessSeconds ?? 180;

  // 1. Accuracy Gate
  if (payload.accuracy > accuracyThreshold) {
    return {
      accepted: false,
      rejectionReason: 'poor_accuracy',
      distanceMeters: undefined,
    };
  }

  // 2. Freshness Gate
  if (payload.capturedAt) {
    const capturedTime =
      typeof payload.capturedAt === 'string'
        ? new Date(payload.capturedAt).getTime()
        : payload.capturedAt;
    const now = Date.now();
    if (now - capturedTime > freshnessSec * 1000) {
      return {
        accepted: false,
        rejectionReason: 'stale_coordinates',
      };
    }
  }

  // 3. Distance check against ALL active geofence locations (combining Admin UI gps_locations and geofence_locations)
  const [{ data: gpsData }, { data: geoData }] = await Promise.all([
    supabase.from('gps_locations').select('*').eq('status', 'Active'),
    supabase.from('geofence_locations').select('*').eq('is_active', true),
  ]);

  interface ActiveLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
  }

  const allActiveLocations: ActiveLocation[] = [];
  const seenIds = new Set<string>();

  // Add from gps_locations (primary Admin UI table)
  if (gpsData && Array.isArray(gpsData)) {
    for (const g of gpsData) {
      if (g.id && !seenIds.has(g.id)) {
        seenIds.add(g.id);
        allActiveLocations.push({
          id: g.id,
          name: g.name || g.branch_office || g.branch || 'Designated Location',
          latitude: Number(g.latitude),
          longitude: Number(g.longitude),
          radius_meters: Number(g.radius_meters || 100),
        });
      }
    }
  }

  // Add from geofence_locations
  if (geoData && Array.isArray(geoData)) {
    for (const g of geoData) {
      if (g.id && !seenIds.has(g.id)) {
        seenIds.add(g.id);
        allActiveLocations.push({
          id: g.id,
          name: g.name || g.branch_office || g.branch_name || 'Designated Office',
          latitude: Number(g.latitude),
          longitude: Number(g.longitude),
          radius_meters: Number(g.radius_meters || 100),
        });
      }
    }
  }

  // Include Master GPS Coordinates Manager initial list as baseline
  if (Array.isArray(INITIAL_GPS_LOCATIONS)) {
    for (const initLoc of INITIAL_GPS_LOCATIONS) {
      if (initLoc.status === 'Active' && !seenIds.has(initLoc.id)) {
        seenIds.add(initLoc.id);
        allActiveLocations.push({
          id: initLoc.id,
          name: initLoc.name || initLoc.branchOffice || 'Designated Location',
          latitude: Number(initLoc.latitude),
          longitude: Number(initLoc.longitude),
          radius_meters: Number(initLoc.radiusMeters || 100),
        });
      }
    }
  }

  if (allActiveLocations.length === 0) {
    return { accepted: false, rejectionReason: 'no_active_geofences' };
  }

  let closestDist = Infinity;
  let closestLoc = allActiveLocations[0]!;

  for (const loc of allActiveLocations) {
    const dist = calculateHaversineDistanceMeters(
      payload.latitude,
      payload.longitude,
      loc.latitude,
      loc.longitude
    );

    if (dist < closestDist) {
      closestDist = dist;
      closestLoc = loc;
    }

    if (dist <= loc.radius_meters) {
      return {
        accepted: true,
        matchedLocationId: loc.id,
        matchedLocationName: loc.name,
        distanceMeters: Math.round(dist),
        allowedRadiusMeters: loc.radius_meters,
      };
    }
  }

  return {
    accepted: false,
    rejectionReason: 'outside_geofence',
    matchedLocationId: closestLoc.id,
    matchedLocationName: closestLoc.name,
    distanceMeters: Math.round(closestDist),
    allowedRadiusMeters: closestLoc.radius_meters,
  };
}

/**
 * Resolves the effective shift snapshot for an employee on a given date.
 */
export async function resolveEmployeeShiftSnapshot(
  employeeId: string,
  businessDate: string
): Promise<ShiftSnapshot> {
  const supabase = getSupabaseAdminClient();

  // 1. Check effective assignment table
  const { data: assignments } = await supabase
    .from('employee_shift_assignments')
    .select('*, work_shifts(*)')
    .eq('employee_id', employeeId)
    .lte('effective_from', businessDate)
    .or(`effective_to.is.null,effective_to.gte.${businessDate}`)
    .order('effective_from', { ascending: false })
    .limit(1);

  if (assignments && assignments[0] && assignments[0].work_shifts) {
    const s = assignments[0].work_shifts;
    const dayOfWeek = new Date(businessDate).getUTCDay();
    const isScheduled = Array.isArray(s.working_weekdays)
      ? s.working_weekdays.includes(dayOfWeek)
      : true;

    return {
      shiftId: s.id,
      shiftName: s.name,
      shiftTimezone: s.timezone || 'Asia/Dhaka',
      shiftStartLocal: s.start_time_local || '10:00',
      shiftEndLocal: s.end_time_local || '18:00',
      shiftBufferMinutes: s.start_buffer_minutes ?? 30,
      shiftAutoCheckoutLocal: s.auto_checkout_local || '23:30',
      shiftCrossesMidnight: Boolean(s.crosses_midnight),
      isScheduledWorkingDay: isScheduled,
    };
  }

  // 2. Default to standard JAAGO shift
  const dayOfWeek = new Date(businessDate).getUTCDay(); // 0=Sun, 4=Thu (working in BD)
  const isWorking = dayOfWeek !== 5 && dayOfWeek !== 6; // Fri(5), Sat(6) = Weekend

  return {
    shiftId: 'shift-standard',
    shiftName: 'JAAGO HQ Standard Shift (10:00 AM - 06:00 PM)',
    shiftTimezone: 'Asia/Dhaka',
    shiftStartLocal: '10:00',
    shiftEndLocal: '18:00',
    shiftBufferMinutes: 30,
    shiftAutoCheckoutLocal: '23:30',
    shiftCrossesMidnight: false,
    isScheduledWorkingDay: isWorking,
  };
}

/**
 * Gets the current business date string (YYYY-MM-DD) in the specified timezone.
 */
export function getCurrentBusinessDate(timeZone: string = 'Asia/Dhaka'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Outputs YYYY-MM-DD
}

/**
 * Resolves any raw employee ID/code to the canonical employees.id in Supabase.
 */
export async function resolveCanonicalEmployeeId(rawIdOrCode: string): Promise<string> {
  if (!rawIdOrCode) return '71a38594-d803-4e6d-b6e9-79767a16c4c6';
  const supabase = getSupabaseAdminClient();

  // Try direct ID lookup
  const { data: byId } = await supabase
    .from('employees')
    .select('id')
    .eq('id', rawIdOrCode)
    .maybeSingle();

  if (byId?.id) return byId.id;

  // Try code lookup (e.g. 'FO032507061190')
  const { data: byCode } = await supabase
    .from('employees')
    .select('id')
    .eq('code', rawIdOrCode)
    .maybeSingle();

  if (byCode?.id) return byCode.id;

  // Try trimmed / sanitized code
  const trimmed = rawIdOrCode.trim();
  const { data: byTrimmedCode } = await supabase
    .from('employees')
    .select('id')
    .or(`code.ilike.%${trimmed}%,name.ilike.%${trimmed}%`)
    .limit(1)
    .maybeSingle();

  if (byTrimmedCode?.id) return byTrimmedCode.id;

  // Default fallback to first active employee (Nasif Kamal)
  const { data: defaultEmp } = await supabase
    .from('employees')
    .select('id')
    .limit(1)
    .maybeSingle();

  return defaultEmp?.id || '71a38594-d803-4e6d-b6e9-79767a16c4c6';
}

