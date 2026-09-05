import { formatWorkingHours, getLocalHourAndMinute, parseTimeToMinutes } from './recompute';

export interface RawPunchEvent {
  id: string;
  punchAt: string; // ISO UTC string
  time?: string | undefined;
  punchType: 'check_in' | 'check_out' | 'unknown' | string;
  source: 'gps' | 'biotime' | 'manual' | 'admin' | 'auto' | string;
  deviceInfo?: string | undefined;
  verifyType?: string | undefined;
  terminalSn?: string | undefined;
  terminalName?: string | undefined;
  locationName?: string | undefined;
  isCountedCheckIn?: boolean | undefined;
  isCountedCheckOut?: boolean | undefined;
}

export interface EffectiveAttendanceDay {
  employeeId: string;
  employeeCode?: string | undefined;
  employeeName?: string | undefined;
  department?: string | undefined;
  designation?: string | undefined;
  branch?: string | undefined;
  avatarUrl?: string | undefined;
  businessDate: string; // YYYY-MM-DD
  countedCheckInAt: string | null;
  countedCheckOutAt: string | null;
  countedCheckInTimeLocal: string; // e.g. "08:58 AM"
  countedCheckOutTimeLocal: string; // e.g. "06:10 PM" or "--:--"
  checkInSource: 'gps' | 'biotime' | 'manual' | 'none';
  checkOutSource: 'gps' | 'biotime' | 'manual' | 'none';
  primarySource: 'Web Portal (GPS)' | 'BioTime Terminal' | 'Merged (GPS + BioTime)' | 'Manual' | 'None';
  workedSeconds: number;
  workedDisplay: string;
  status: 'Present' | 'Late' | 'Absent' | 'Leave' | 'Half Day' | 'On Duty' | 'Auto Check Out';
  isLate: boolean;
  lateByMinutes: number;
  isAutoCheckout: boolean;
  allPunches: RawPunchEvent[];
  sourceBreakdown: {
    gpsCheckIn?: string | null | undefined;
    gpsCheckOut?: string | null | undefined;
    biotimeCheckIn?: string | null | undefined;
    biotimeCheckOut?: string | null | undefined;
    biotimePunchCount: number;
    gpsPunchCount: number;
    countedCheckInSource: 'gps' | 'biotime' | 'none';
    countedCheckOutSource: 'gps' | 'biotime' | 'none';
  };
  notes?: string | undefined;
}

/**
 * Format a Date or ISO string into local 12-hour time in Asia/Dhaka ("hh:mm A")
 */
export function formatLocalDhakaTime(dateInput?: string | Date | null): string {
  if (!dateInput) return '--:--';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '--:--';

  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Pure counting rule implementation:
 * Given GPS punches + BioTime punches for an employee on a single calendar day,
 * derives:
 * 1. Counted Check-In = MIN(all check-ins across GPS & BioTime) -> First Check-In
 * 2. Counted Check-Out = MAX(all check-outs across GPS & BioTime) -> Last Check-Out
 * 3. Preserves all punches and flags which exact punch was counted for In and Out
 */
export function computeEffectiveAttendanceDay(params: {
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  department?: string;
  designation?: string;
  branch?: string;
  avatarUrl?: string;
  businessDate: string;
  gpsCheckInAt?: string | null;
  gpsCheckOutAt?: string | null;
  gpsPunches?: RawPunchEvent[];
  biotimePunches?: RawPunchEvent[];
  shiftStartLocal?: string; // default '10:00'
  shiftBufferMinutes?: number; // default 30 (so 10:30 is on-time)
  isAutoCheckout?: boolean;
  leaveStatus?: 'Leave' | 'Half Day' | 'On Duty' | null;
  notes?: string;
}): EffectiveAttendanceDay {
  const {
    employeeId,
    employeeCode,
    employeeName,
    department,
    designation,
    branch,
    avatarUrl,
    businessDate,
    gpsCheckInAt,
    gpsCheckOutAt,
    gpsPunches = [],
    biotimePunches = [],
    shiftStartLocal = '10:00',
    shiftBufferMinutes = 30,
    isAutoCheckout = false,
    leaveStatus,
    notes,
  } = params;

  // 1. Gather all check-in candidates across sources
  const checkInCandidates: { time: Date; iso: string; source: 'gps' | 'biotime'; punchId?: string }[] = [];
  const checkOutCandidates: { time: Date; iso: string; source: 'gps' | 'biotime'; punchId?: string }[] = [];

  // GPS record check-in / check-out
  if (gpsCheckInAt) {
    const d = new Date(gpsCheckInAt);
    if (!isNaN(d.getTime())) {
      checkInCandidates.push({ time: d, iso: gpsCheckInAt, source: 'gps' });
    }
  }
  if (gpsCheckOutAt) {
    const d = new Date(gpsCheckOutAt);
    if (!isNaN(d.getTime())) {
      checkOutCandidates.push({ time: d, iso: gpsCheckOutAt, source: 'gps' });
    }
  }

  // GPS raw punches list if available
  for (const p of gpsPunches) {
    const d = new Date(p.punchAt);
    if (!isNaN(d.getTime())) {
      if (p.punchType === 'check_in') {
        checkInCandidates.push({ time: d, iso: p.punchAt, source: 'gps', punchId: p.id });
      } else if (p.punchType === 'check_out') {
        checkOutCandidates.push({ time: d, iso: p.punchAt, source: 'gps', punchId: p.id });
      }
    }
  }

  // BioTime punches
  if (biotimePunches.length > 0) {
    const sortedBio = [...biotimePunches].sort(
      (a, b) => new Date(a.punchAt).getTime() - new Date(b.punchAt).getTime()
    );

    const firstBio = sortedBio[0];
    const lastBio = sortedBio[sortedBio.length - 1];

    // Earliest punch is check-in candidate
    if (firstBio) {
      const d = new Date(firstBio.punchAt);
      if (!isNaN(d.getTime())) {
        checkInCandidates.push({ time: d, iso: firstBio.punchAt, source: 'biotime', punchId: firstBio.id });
      }
    }

    // Latest punch is check-out candidate if distinct from earliest
    if (lastBio && sortedBio.length > 1 && firstBio && firstBio.punchAt !== lastBio.punchAt) {
      const d = new Date(lastBio.punchAt);
      if (!isNaN(d.getTime())) {
        checkOutCandidates.push({ time: d, iso: lastBio.punchAt, source: 'biotime', punchId: lastBio.id });
      }
    } else {
      // Check if explicit CHECK_OUT punch exists
      for (const bp of sortedBio) {
        if (bp.punchType === 'check_out') {
          const d = new Date(bp.punchAt);
          if (!isNaN(d.getTime())) {
            checkOutCandidates.push({ time: d, iso: bp.punchAt, source: 'biotime', punchId: bp.id });
          }
        }
      }
    }
  }

  // 2. Compute Counted Check-In = MIN(all check-ins)
  let countedCheckInIso: string | null = null;
  let checkInSource: 'gps' | 'biotime' | 'manual' | 'none' = 'none';
  let winningInPunchId: string | undefined;

  if (checkInCandidates.length > 0) {
    checkInCandidates.sort((a, b) => a.time.getTime() - b.time.getTime());
    const winnerIn = checkInCandidates[0]!;
    countedCheckInIso = winnerIn.iso;
    checkInSource = winnerIn.source;
    winningInPunchId = winnerIn.punchId;
  }

  // 3. Compute Counted Check-Out = MAX(all check-outs)
  let countedCheckOutIso: string | null = null;
  let checkOutSource: 'gps' | 'biotime' | 'manual' | 'none' = 'none';
  let winningOutPunchId: string | undefined;

  if (checkOutCandidates.length > 0) {
    checkOutCandidates.sort((a, b) => b.time.getTime() - a.time.getTime());
    const winnerOut = checkOutCandidates[0]!;
    countedCheckOutIso = winnerOut.iso;
    checkOutSource = winnerOut.source;
    winningOutPunchId = winnerOut.punchId;
  }

  // 4. Determine Primary Source Badge
  let primarySource: 'Web Portal (GPS)' | 'BioTime Terminal' | 'Merged (GPS + BioTime)' | 'Manual' | 'None' = 'None';
  const hasGps = Boolean(gpsCheckInAt || gpsCheckOutAt || gpsPunches.length > 0);
  const hasBioTime = Boolean(biotimePunches.length > 0);

  if (hasGps && hasBioTime) {
    primarySource = 'Merged (GPS + BioTime)';
  } else if (hasBioTime) {
    primarySource = 'BioTime Terminal';
  } else if (hasGps) {
    primarySource = 'Web Portal (GPS)';
  }

  // 5. Compute Worked Seconds & Formatted Display
  let workedSeconds = 0;
  if (countedCheckInIso && countedCheckOutIso) {
    const inMs = new Date(countedCheckInIso).getTime();
    const outMs = new Date(countedCheckOutIso).getTime();
    workedSeconds = Math.max(0, Math.floor((outMs - inMs) / 1000));
  }
  const workedDisplay = formatWorkingHours(workedSeconds);

  // 6. Lateness & Status derivation
  let isLate = false;
  let lateByMinutes = 0;
  let derivedStatus: 'Present' | 'Late' | 'Absent' | 'Leave' | 'Half Day' | 'On Duty' | 'Auto Check Out' = 'Absent';

  if (leaveStatus) {
    derivedStatus = leaveStatus;
  } else if (isAutoCheckout) {
    derivedStatus = 'Auto Check Out';
  } else if (countedCheckInIso) {
    const { hour, minute } = getLocalHourAndMinute(countedCheckInIso, 'Asia/Dhaka');
    const totalLocalMinutes = hour * 60 + minute;
    const startMinutes = parseTimeToMinutes(shiftStartLocal);
    const threshold = startMinutes + shiftBufferMinutes;

    if (totalLocalMinutes > threshold) {
      isLate = true;
      lateByMinutes = totalLocalMinutes - threshold;
      derivedStatus = 'Late';
    } else {
      isLate = false;
      lateByMinutes = 0;
      derivedStatus = 'Present';
    }
  }

  // 7. Consolidate and mark all raw punches
  const allPunchesMap = new Map<string, RawPunchEvent>();

  // Add GPS punches
  if (gpsCheckInAt && !gpsPunches.some((p) => p.punchAt === gpsCheckInAt)) {
    allPunchesMap.set(`gps-in-${gpsCheckInAt}`, {
      id: `gps-in-${gpsCheckInAt}`,
      punchAt: gpsCheckInAt,
      punchType: 'check_in',
      source: 'gps',
      deviceInfo: 'Web Portal / GPS',
      locationName: branch || 'JAAGO HQ (Banani)',
    });
  }
  if (gpsCheckOutAt && !gpsPunches.some((p) => p.punchAt === gpsCheckOutAt)) {
    allPunchesMap.set(`gps-out-${gpsCheckOutAt}`, {
      id: `gps-out-${gpsCheckOutAt}`,
      punchAt: gpsCheckOutAt,
      punchType: 'check_out',
      source: 'gps',
      deviceInfo: 'Web Portal / GPS',
      locationName: branch || 'JAAGO HQ (Banani)',
    });
  }
  gpsPunches.forEach((p) => allPunchesMap.set(p.id || `gps-${p.punchAt}`, p));
  biotimePunches.forEach((p) => allPunchesMap.set(p.id || `bio-${p.punchAt}`, p));

  const sortedAllPunches = Array.from(allPunchesMap.values()).sort(
    (a, b) => new Date(a.punchAt).getTime() - new Date(b.punchAt).getTime()
  );

  // Mark the counted punches
  sortedAllPunches.forEach((p) => {
    p.isCountedCheckIn = Boolean(countedCheckInIso && (p.id === winningInPunchId || p.punchAt === countedCheckInIso));
    p.isCountedCheckOut = Boolean(countedCheckOutIso && (p.id === winningOutPunchId || p.punchAt === countedCheckOutIso));
  });

  return {
    employeeId,
    employeeCode,
    employeeName,
    department,
    designation,
    branch,
    avatarUrl,
    businessDate,
    countedCheckInAt: countedCheckInIso,
    countedCheckOutAt: countedCheckOutIso,
    countedCheckInTimeLocal: formatLocalDhakaTime(countedCheckInIso),
    countedCheckOutTimeLocal: formatLocalDhakaTime(countedCheckOutIso),
    checkInSource,
    checkOutSource,
    primarySource,
    workedSeconds,
    workedDisplay,
    status: derivedStatus,
    isLate,
    lateByMinutes,
    isAutoCheckout,
    allPunches: sortedAllPunches,
    sourceBreakdown: {
      gpsCheckIn: gpsCheckInAt || null,
      gpsCheckOut: gpsCheckOutAt || null,
      biotimeCheckIn: biotimePunches[0]?.punchAt || null,
      biotimeCheckOut: (biotimePunches.length > 1 ? (biotimePunches[biotimePunches.length - 1]?.punchAt || null) : null),
      biotimePunchCount: biotimePunches.length,
      gpsPunchCount: (gpsCheckInAt ? 1 : 0) + (gpsCheckOutAt ? 1 : 0) + gpsPunches.length,
      countedCheckInSource: (checkInSource as any) || 'none',
      countedCheckOutSource: (checkOutSource as any) || 'none',
    },
    notes,
  };
}
