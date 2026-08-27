import {
  AttendanceDerivedState,
  AttendanceFacts,
  AttendanceStatus,
  HolidayContextPort,
  LeaveContextPort,
  ShiftSnapshot,
} from './types';

/**
 * Extracts the local time (HH:mm) of an instant in the specified IANA timezone.
 * Returns local hour (0-23) and local minute (0-59).
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
      if (hour === 24) hour = 0; // Handle midnight formatting quirks in some runtimes
    } else if (part.type === 'minute') {
      minute = parseInt(part.value, 10);
    }
  }

  return { hour, minute };
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
 * Pure, deterministic attendance state derivation function conforming to §7, §8, §13 of the spec.
 * Invariant I2: Derived columns are written ONLY by this calculation logic.
 */
export async function recomputeAttendanceRecordPure(
  facts: AttendanceFacts,
  shift: ShiftSnapshot,
  leavePort?: LeaveContextPort,
  holidayPort?: HolidayContextPort
): Promise<AttendanceDerivedState> {
  const { checkInAt, checkOutAt, checkOutSource, employeeId, businessDate } = facts;

  // 1. Status when neither check-in nor check-out was recorded (Empty / Closed Day)
  if (!checkInAt && !checkOutAt) {
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
      workedMinutes: null,
    };
  }

  // 2. Lateness calculation (minute precision, threshold inclusive per §7 and §8)
  let isLate = false;
  let lateByMinutes = 0;
  let status: AttendanceStatus = 'present';

  if (checkInAt) {
    const tz = shift.shiftTimezone || 'Asia/Dhaka';
    const { hour: checkInHour, minute: checkInMinute } = getLocalHourAndMinute(checkInAt, tz);
    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;

    const startMinutes = parseTimeToMinutes(shift.shiftStartLocal);
    const buffer = shift.shiftBufferMinutes ?? 0;
    const thresholdMinutes = startMinutes + buffer;

    // Threshold is INCLUSIVE: 10:30 (with 10:00 + 30m) is on time; 10:31 is late.
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

  // 4. Worked minutes calculation
  let workedMinutes: number | null = null;
  if (checkInAt && checkOutAt) {
    const inMs = new Date(checkInAt).getTime();
    const outMs = new Date(checkOutAt).getTime();
    workedMinutes = Math.max(0, Math.floor((outMs - inMs) / 60000));
  }

  return {
    status,
    isLate,
    lateByMinutes,
    isAutoCheckout,
    workedMinutes,
  };
}
