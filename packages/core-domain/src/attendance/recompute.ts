import {
  AttendanceDerivedState,
  AttendanceFacts,
  AttendanceStatus,
  HolidayContextPort,
  LeaveContextPort,
  ShiftSnapshot,
  WorkingHoursMethod,
} from './types';

/**
 * Canonical working-hours formatter.
 * Formats elapsed seconds into strict '{H}h {MM}m' representation.
 * Invariant: Never renders blank, null, NaN, or bare '00'. Zero is always '0h 00m'.
 */
export function formatWorkingHours(workedSeconds: number | null | undefined): string {
  if (workedSeconds === null || workedSeconds === undefined || isNaN(workedSeconds) || workedSeconds <= 0) {
    return '0h 00m';
  }
  const totalMinutes = Math.floor(workedSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

/**
 * Extracts the local time (hour and minute) of an instant in the specified IANA timezone.
 */
export function getLocalHourAndMinute(
  instant: Date | string,
  timeZone: string = 'Asia/Dhaka'
): { hour: number; minute: number } {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date passed to getLocalHourAndMinute: ${instant}`);
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  let hour = 0;
  let minute = 0;

  for (const part of parts) {
    if (part.type === 'hour') {
      hour = parseInt(part.value, 10);
      if (hour === 24) hour = 0;
    } else if (part.type === 'minute') {
      minute = parseInt(part.value, 10);
    }
  }

  return { hour, minute };
}

/**
 * Extracts the local calendar date string (YYYY-MM-DD) of an instant in the specified IANA timezone.
 */
export function getLocalDateString(
  instant: Date | string,
  timeZone: string = 'Asia/Dhaka'
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date passed to getLocalDateString: ${instant}`);
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Computes attendance date per §3.1 specification:
 * For any timestamp t:
 * attendance_date(t) = local_date(t) if local_time(t) < Cutoff, else local_date(t) + 1 day.
 */
export function getAttendanceDate(
  instant: Date | string,
  cutoffLocal: string = '23:30',
  timeZone: string = 'Asia/Dhaka'
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date passed to getAttendanceDate: ${instant}`);
  }

  const { hour, minute } = getLocalHourAndMinute(date, timeZone);
  const totalLocalMinutes = hour * 60 + minute;
  const cutoffMinutes = parseTimeToMinutes(cutoffLocal);
  const localDateStr = getLocalDateString(date, timeZone);

  if (totalLocalMinutes < cutoffMinutes) {
    return localDateStr;
  }

  // Roll into next calendar date
  const [y, m, d] = localDateStr.split('-').map(Number);
  const nextDate = new Date(Date.UTC(y!, m! - 1, d! + 1));
  const ny = nextDate.getUTCFullYear();
  const nm = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(nextDate.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/**
 * Parses 'HH:mm' string into total minutes from start of day (0..1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  return h * 60 + m;
}

/**
 * Computes total worked seconds based on the chosen method ('span' vs 'sessions').
 */
export function calculateWorkedSeconds(
  facts: AttendanceFacts,
  method: WorkingHoursMethod = 'span',
  nowServerInput?: Date | string
): number {
  const firstIn = facts.firstCheckInAt || facts.checkInAt;
  const lastOut = facts.lastCheckOutAt || facts.checkOutAt;

  if (!firstIn) {
    return 0;
  }

  const firstInMs = new Date(firstIn).getTime();
  if (isNaN(firstInMs)) return 0;

  const nowServerMs = nowServerInput
    ? new Date(nowServerInput).getTime()
    : facts.nowServer
    ? new Date(facts.nowServer).getTime()
    : Date.now();

  if (method === 'span') {
    if (lastOut) {
      const lastOutMs = new Date(lastOut).getTime();
      return Math.max(0, Math.floor((lastOutMs - firstInMs) / 1000));
    }
    // Still checked in
    return Math.max(0, Math.floor((nowServerMs - firstInMs) / 1000));
  }

  // Sessions method: sum of completed check_in -> check_out intervals
  if (facts.punches && facts.punches.length > 0) {
    const sorted = [...facts.punches].sort(
      (a, b) => new Date(a.punchAt).getTime() - new Date(b.punchAt).getTime()
    );

    let totalSeconds = 0;
    let currentInMs: number | null = null;

    for (const p of sorted) {
      const pMs = new Date(p.punchAt).getTime();
      if (p.punchType === 'check_in') {
        currentInMs = pMs;
      } else if (p.punchType === 'check_out' && currentInMs !== null) {
        totalSeconds += Math.max(0, Math.floor((pMs - currentInMs) / 1000));
        currentInMs = null;
      }
    }

    if (currentInMs !== null) {
      totalSeconds += Math.max(0, Math.floor((nowServerMs - currentInMs) / 1000));
    }

    return totalSeconds;
  }

  // Fallback if punch list not supplied
  if (lastOut) {
    const lastOutMs = new Date(lastOut).getTime();
    return Math.max(0, Math.floor((lastOutMs - firstInMs) / 1000));
  }
  return Math.max(0, Math.floor((nowServerMs - firstInMs) / 1000));
}

/**
 * Pure, deterministic attendance state derivation function conforming to §3, §7, §8 of the spec.
 * Invariant I2: Derived columns are written ONLY by this calculation logic.
 */
export async function recomputeAttendanceRecordPure(
  facts: AttendanceFacts,
  shift: ShiftSnapshot,
  leavePort?: LeaveContextPort,
  holidayPort?: HolidayContextPort
): Promise<AttendanceDerivedState> {
  const firstIn = facts.firstCheckInAt || facts.checkInAt;
  const lastOut = facts.lastCheckOutAt || facts.checkOutAt;
  const { checkOutSource, employeeId, businessDate } = facts;
  const calcMethod = facts.calcMethod || 'span';

  // 1. Status when neither check-in nor check-out was recorded (Empty / Closed Day)
  if (!firstIn && !lastOut) {
    let status: AttendanceStatus = 'absent';

    if (!shift.isScheduledWorkingDay) {
      status = 'weekly_off';
    } else if (holidayPort && (await holidayPort.isHoliday(businessDate))) {
      status = 'holiday';
    } else if (leavePort && (await leavePort.hasApprovedLeave(employeeId, businessDate))) {
      status = 'on_leave';
    } else {
      status = 'absent';
    }

    return {
      status,
      isLate: false,
      lateByMinutes: 0,
      isAutoCheckout: false,
      needsReview: false,
      workedMinutes: null,
      workedSeconds: 0,
      workedDisplay: '0h 00m',
    };
  }

  // 2. Lateness calculation (minute precision, threshold inclusive per §7 and §8)
  let isLate = false;
  let lateByMinutes = 0;
  let status: AttendanceStatus = 'present';

  if (firstIn) {
    const tz = shift.shiftTimezone || 'Asia/Dhaka';
    const { hour: checkInHour, minute: checkInMinute } = getLocalHourAndMinute(firstIn, tz);
    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;

    const startMinutes = parseTimeToMinutes(shift.shiftStartLocal);
    const buffer = shift.shiftBufferMinutes ?? 0;
    const thresholdMinutes = startMinutes + buffer;

    // Threshold is INCLUSIVE: e.g. 10:30 (with 10:00 + 30m) is on time; 10:31 is late.
    if (checkInTotalMinutes > thresholdMinutes) {
      isLate = true;
      lateByMinutes = checkInTotalMinutes - thresholdMinutes;
      status = 'late';
    } else {
      isLate = false;
      lateByMinutes = 0;
      status = 'present';
    }
  }

  // 3. Auto checkout flag (Fact of how checkout was recorded)
  const isAutoCheckout = checkOutSource === 'auto';
  const needsReview = isAutoCheckout;

  // 4. Worked seconds & formatted display calculation
  const workedSeconds = calculateWorkedSeconds(facts, calcMethod);
  const workedMinutes = firstIn && lastOut ? Math.floor(workedSeconds / 60) : null;
  const workedDisplay = formatWorkingHours(workedSeconds);

  return {
    status,
    isLate,
    lateByMinutes,
    isAutoCheckout,
    needsReview,
    workedMinutes,
    workedSeconds,
    workedDisplay,
  };
}
