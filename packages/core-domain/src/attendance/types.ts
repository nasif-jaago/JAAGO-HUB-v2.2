export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'on_leave'
  | 'weekly_off'
  | 'holiday';

export type CheckInSource = 'gps' | 'manual' | 'admin' | 'auto';
export type CheckOutSource = 'gps' | 'manual' | 'admin' | 'auto';

export interface ShiftSnapshot {
  shiftId: string;
  shiftName: string;
  shiftTimezone: string; // e.g. 'Asia/Dhaka'
  shiftStartLocal: string; // '10:00' (HH:mm)
  shiftEndLocal: string; // '18:00' (HH:mm)
  shiftBufferMinutes: number; // 30
  shiftAutoCheckoutLocal?: string; // '23:30'
  shiftCrossesMidnight?: boolean;
  isScheduledWorkingDay: boolean; // whether business_date is a working day for this shift
}

export interface AttendanceFacts {
  employeeId: string;
  businessDate: string; // 'YYYY-MM-DD'
  checkInAt?: string | Date | null; // ISO UTC string or Date
  checkOutAt?: string | Date | null;
  checkInSource?: CheckInSource | null;
  checkOutSource?: CheckOutSource | null;
}

export interface AttendanceDerivedState {
  status: AttendanceStatus;
  isLate: boolean;
  lateByMinutes: number;
  isAutoCheckout: boolean;
  workedMinutes: number | null;
}

export interface LeaveContextPort {
  hasApprovedLeave(employeeId: string, businessDate: string): boolean | Promise<boolean>;
}

export interface HolidayContextPort {
  isHoliday(businessDate: string): boolean | Promise<boolean>;
}
