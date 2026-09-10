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
  checkOutSource: 'gps' | 'biotime' | 'manual' | 'auto' | 'none';
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
    countedCheckOutSource: 'gps' | 'biotime' | 'auto' | 'none';
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
  nowUtc?: string;
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
    nowUtc,
  } = params;

  const nowMs = nowUtc ? new Date(nowUtc).getTime() : Date.now();

  // 1. Gather all check-in candidates across sources
  const checkInCandidates: { time: Date; iso: string; source: 'gps' | 'biotime' | 'manual'; punchId?: string }[] = [];
  const checkOutCandidates: { time: Date; iso: string; source: 'gps' | 'biotime' | 'auto'; punchId?: string; isSyntheticAuto?: boolean }[] = [];

  // GPS raw punches list if available
  for (const p of gpsPunches) {
    const d = new Date(p.punchAt);
    if (!isNaN(d.getTime())) {
      const isSyntheticAuto = p.source === 'auto' || Boolean(p.deviceInfo && p.deviceInfo.toLowerCase().includes('auto-checkout'));
      // Invariant: Synthetic auto-checkout punches with future timestamps (> current time) must never be counted
      if (isSyntheticAuto && d.getTime() > nowMs) {
        continue;
      }
      if (p.punchType === 'check_in') {
        checkInCandidates.push({ time: d, iso: p.punchAt, source: p.source === 'biotime' ? 'biotime' : 'gps', punchId: p.id });
      } else if (p.punchType === 'check_out') {
        checkOutCandidates.push({ time: d, iso: p.punchAt, source: isSyntheticAuto ? 'auto' : 'gps', punchId: p.id, isSyntheticAuto });
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

    // Earliest punch is always check-in candidate
    if (firstBio) {
      const d = new Date(firstBio.punchAt);
      if (!isNaN(d.getTime())) {
        checkInCandidates.push({ time: d, iso: firstBio.punchAt, source: 'biotime', punchId: firstBio.id });
      }
    }

    // Check-out candidates from BioTime:
    // 1. Explicit CHECK_OUT punches
    for (const bp of sortedBio) {
      if (bp.punchType === 'check_out' || String((bp as any).punch_state).toUpperCase() === 'CHECK_OUT') {
        const d = new Date(bp.punchAt);
        if (!isNaN(d.getTime())) {
          checkOutCandidates.push({ time: d, iso: bp.punchAt, source: 'biotime', punchId: bp.id, isSyntheticAuto: false });
        }
      }
    }

    // 2. Generic punches: on a past day, the last punch represents departure.
    // On the current active business day, door/terminal punches during shift hours (e.g. 10:18 AM) must NOT prematurely close the day!
    // They are only checkout candidates if occurring in the late afternoon / departure window (>= 16:00 Dhaka time) or after shift end.
    if (lastBio && sortedBio.length > 1 && firstBio && firstBio.punchAt !== lastBio.punchAt) {
      const firstTime = new Date(firstBio.punchAt).getTime();
      const lastTime = new Date(lastBio.punchAt).getTime();
      const diffMinutes = (lastTime - firstTime) / (1000 * 60);

      const todayDhaka = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date(nowMs));
      const isPastDay = businessDate < todayDhaka;
      const { hour: lastHour } = getLocalHourAndMinute(lastBio.punchAt, 'Asia/Dhaka');
      const isDepartureWindow = lastHour >= 16 || lastBio.punchType === 'check_out';

      if (!isNaN(lastTime) && diffMinutes >= 5 && (isPastDay || isDepartureWindow)) {
        checkOutCandidates.push({ time: new Date(lastBio.punchAt), iso: lastBio.punchAt, source: 'biotime', punchId: lastBio.id, isSyntheticAuto: false });
      }
    }
  }

  // Also include GPS record check-in / check-out if not already in candidates
  if (gpsCheckInAt) {
    const d = new Date(gpsCheckInAt);
    if (!isNaN(d.getTime()) && !checkInCandidates.some((c) => c.iso === gpsCheckInAt)) {
      checkInCandidates.push({ time: d, iso: gpsCheckInAt, source: 'gps' });
    }
  }
  if (gpsCheckOutAt) {
    const d = new Date(gpsCheckOutAt);
    const isAutoOut = Boolean(isAutoCheckout);
    // Ignore synthetic auto-checkout if stamped in the future
    if (!isNaN(d.getTime()) && !(isAutoOut && d.getTime() > nowMs) && !checkOutCandidates.some((c) => c.iso === gpsCheckOutAt)) {
      checkOutCandidates.push({ time: d, iso: gpsCheckOutAt, source: isAutoOut ? 'auto' : 'gps', isSyntheticAuto: isAutoOut });
    }
  }

  // 2. Compute Counted Check-In = MIN(all check-ins across GPS and BioTime) -> First Check-In
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

  // 3. Compute Counted Check-Out = MAX(all valid check-outs occurring after Check-In) -> Last Check-Out
  let countedCheckOutIso: string | null = null;
  let checkOutSource: 'gps' | 'biotime' | 'manual' | 'auto' | 'none' = 'none';
  let winningOutPunchId: string | undefined;
  let effectiveIsAuto = false;

  const validCheckOutCandidates = checkOutCandidates.filter((c) => {
    if (!countedCheckInIso) return true;
    return c.time.getTime() > new Date(countedCheckInIso).getTime() + 60_000;
  });

  // Separate physical check-out candidates (BioTime, user GPS) from synthetic auto-checkout events
  const physicalCheckOutCandidates = validCheckOutCandidates.filter(
    (c) => !c.isSyntheticAuto && c.source !== 'auto'
  );
  // Auto-checkout candidates cannot be in the future
  const autoCheckOutCandidates = validCheckOutCandidates.filter(
    (c) => (c.isSyntheticAuto || c.source === 'auto') && c.time.getTime() <= nowMs
  );

  if (physicalCheckOutCandidates.length > 0) {
    // Physical punches always take precedence over synthetic auto-checkout!
    physicalCheckOutCandidates.sort((a, b) => b.time.getTime() - a.time.getTime());
    const winnerOut = physicalCheckOutCandidates[0]!;

    // Check if there was an explicit GPS re-check-in AFTER winnerOut
    const hasCanonicalClosedCheckout = Boolean(
      gpsCheckOutAt &&
      !isAutoCheckout &&
      new Date(gpsCheckOutAt).getTime() >= new Date(gpsCheckInAt || 0).getTime()
    );

    const hasLaterGpsCheckIn = !hasCanonicalClosedCheckout && (
      gpsPunches.some(
        (gp) => gp.punchType === 'check_in' && new Date(gp.punchAt).getTime() > winnerOut.time.getTime() + 60_000
      ) || Boolean(gpsCheckInAt && new Date(gpsCheckInAt).getTime() > winnerOut.time.getTime() + 60_000 && !gpsCheckOutAt)
    );

    if (!hasLaterGpsCheckIn) {
      countedCheckOutIso = winnerOut.iso;
      checkOutSource = winnerOut.source;
      winningOutPunchId = winnerOut.punchId;
      effectiveIsAuto = false;
    } else if (hasCanonicalClosedCheckout && gpsCheckOutAt) {
      countedCheckOutIso = gpsCheckOutAt;
      checkOutSource = 'gps';
      effectiveIsAuto = false;
    }
  } else if (autoCheckOutCandidates.length > 0) {
    autoCheckOutCandidates.sort((a, b) => b.time.getTime() - a.time.getTime());
    const winnerOut = autoCheckOutCandidates[0]!;
    countedCheckOutIso = winnerOut.iso;
    checkOutSource = 'auto';
    winningOutPunchId = winnerOut.punchId;
    effectiveIsAuto = true;
  }

  // 3.1 Auto Check-out Safety Net: ONLY if no valid check-out was found anywhere AND real time is past cutoff
  const cutoffIso = new Date(`${businessDate}T23:30:00+06:00`).toISOString();
  const isPastCutoff = nowMs >= new Date(cutoffIso).getTime();

  if (countedCheckInIso && !countedCheckOutIso && isPastCutoff) {
    countedCheckOutIso = cutoffIso;
    checkOutSource = 'auto';
    effectiveIsAuto = true;
  } else if (checkOutSource === 'auto' && countedCheckOutIso && new Date(countedCheckOutIso).getTime() <= nowMs) {
    effectiveIsAuto = true;
  } else {
    effectiveIsAuto = false;
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

  // 6. Compute Worked Seconds & Formatted Display (Capped at 23:30 cutoff)
  let workedSeconds = 0;
  if (countedCheckInIso && countedCheckOutIso) {
    const inMs = new Date(countedCheckInIso).getTime();
    const outMs = new Date(countedCheckOutIso).getTime();
    workedSeconds = Math.max(0, Math.floor((outMs - inMs) / 1000));
  } else if (countedCheckInIso && nowUtc) {
    const cutoffMs = new Date(`${businessDate}T23:30:00+06:00`).getTime();
    const inMs = new Date(countedCheckInIso).getTime();
    const nowMs = Math.min(new Date(nowUtc).getTime(), cutoffMs);
    workedSeconds = Math.max(0, Math.floor((nowMs - inMs) / 1000));
  }
  const workedDisplay = formatWorkingHours(workedSeconds);

  // 6. Lateness & Status derivation based on First Check-In
  let isLate = false;
  let lateByMinutes = 0;
  let derivedStatus: 'Present' | 'Late' | 'Absent' | 'Leave' | 'Half Day' | 'On Duty' | 'Auto Check Out' = 'Absent';

  if (leaveStatus) {
    derivedStatus = leaveStatus;
    isLate = false;
    lateByMinutes = 0;
    effectiveIsAuto = false;
  } else if (effectiveIsAuto) {
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

  const sortedAllPunches = Array.from(allPunchesMap.values())
    .filter((p) => {
      const isAuto = p.source === 'auto' || Boolean(p.deviceInfo && p.deviceInfo.toLowerCase().includes('auto-checkout'));
      // Never expose synthetic future auto-checkout events
      if (isAuto && new Date(p.punchAt).getTime() > nowMs) {
        return false;
      }
      return true;
    })
    .sort((a, b) => new Date(a.punchAt).getTime() - new Date(b.punchAt).getTime());

  // If employee closed their day with a physical check-out or is actively open, omit synthetic auto-checkout events from the punch audit trail
  const punchesToAudit = !effectiveIsAuto
    ? sortedAllPunches.filter((p) => !(p.source === 'auto' || Boolean(p.deviceInfo && p.deviceInfo.toLowerCase().includes('auto-checkout'))))
    : sortedAllPunches;

  // Mark the counted punches
  punchesToAudit.forEach((p) => {
    p.isCountedCheckIn = Boolean(countedCheckInIso && (p.id === winningInPunchId || p.punchAt === countedCheckInIso));
    p.isCountedCheckOut = Boolean(countedCheckOutIso && (p.id === winningOutPunchId || p.punchAt === countedCheckOutIso));
    if (p.isCountedCheckOut) {
      p.punchType = 'check_out';
    } else if (p.isCountedCheckIn) {
      p.punchType = 'check_in';
    }
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
    isAutoCheckout: effectiveIsAuto,
    allPunches: punchesToAudit,
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
