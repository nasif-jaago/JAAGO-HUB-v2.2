// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface ShiftItem {
  id: string;
  name: string;
  officeStart: string; // e.g. '09:00 AM'
  startBufferMin: number; // e.g. 15
  officeEnd: string; // e.g. '05:00 PM'
  endBufferMin: number; // e.g. 15
  checkInStart: string; // e.g. '05:00 AM'
  checkInEnd: string; // e.g. '05:00 PM'
  checkOutStart: string; // e.g. '09:30 AM'
  checkOutEnd: string; // e.g. '11:30 PM'
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceLogItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
  branch: string;
  avatarUrl?: string;
  status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'On Duty' | 'Leave' | 'N/A';
  device: 'Device Login' | 'RFID Scanner' | 'Web Portal' | 'Mobile App' | 'Manual In/Out';
  timestamp: string; // e.g. '26 Aug 2026 8:53 pm'
  date: string; // YYYY-MM-DD
  checkInTime?: string;
  checkOutTime?: string;
  lateByMin?: number;
  earlyOutByMin?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface OnDutyLogItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
  branch: string;
  avatarUrl?: string;
  purpose: string;
  destination: string;
  dutyDate: string; // YYYY-MM-DD
  startTime: string; // e.g. '09:00 AM'
  endTime: string; // e.g. '05:00 PM'
  transportType: 'Office Vehicle' | 'Public Transport' | 'Personal Vehicle' | 'Rideshare';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  approverName: string;
  appliedDate: string;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. SEED / INITIAL PRODUCTION DATA
// ═══════════════════════════════════════════════════════════════════════════

export const INITIAL_SHIFTS: ShiftItem[] = [
  {
    id: 'shift-1',
    name: 'Full Time Shift 1',
    officeStart: '09:00 AM',
    startBufferMin: 15,
    officeEnd: '05:00 PM',
    endBufferMin: 15,
    checkInStart: '05:00 AM',
    checkInEnd: '05:00 PM',
    checkOutStart: '09:30 AM',
    checkOutEnd: '11:30 PM',
    isDefault: true,
  },
  {
    id: 'shift-2',
    name: 'Full Time Shift 2',
    officeStart: '10:00 AM',
    startBufferMin: 15,
    officeEnd: '06:00 PM',
    endBufferMin: 15,
    checkInStart: '05:00 AM',
    checkInEnd: '06:00 PM',
    checkOutStart: '10:30 AM',
    checkOutEnd: '11:30 PM',
  },
  {
    id: 'shift-3',
    name: 'Full Time Shift 3',
    officeStart: '07:30 AM',
    startBufferMin: 15,
    officeEnd: '04:30 PM',
    endBufferMin: 15,
    checkInStart: '05:00 AM',
    checkInEnd: '04:30 PM',
    checkOutStart: '08:00 AM',
    checkOutEnd: '11:30 PM',
  },
  {
    id: 'shift-4',
    name: 'Full Time Shift 4',
    officeStart: '08:00 AM',
    startBufferMin: 15,
    officeEnd: '05:00 PM',
    endBufferMin: 15,
    checkInStart: '05:00 AM',
    checkInEnd: '05:00 PM',
    checkOutStart: '08:30 AM',
    checkOutEnd: '11:30 PM',
  },
];

export const INITIAL_ATTENDANCE_LOGS: AttendanceLogItem[] = [
  {
    id: 'att-1',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    designation: 'Coordinator, Tech 4 Development',
    department: "Founder's Office (JFT)",
    branch: 'Head Office (Banani)',
    avatarUrl: '',
    status: 'Present',
    device: 'Device Login',
    timestamp: '26 Aug 2026 8:53 pm',
    date: '2026-08-26',
    checkInTime: '09:58 AM',
    checkOutTime: '06:15 PM',
    lateByMin: 0,
    earlyOutByMin: 0,
    createdBy: 'Nasif Kamal - (FO032507061190)',
    createdAt: '26 Aug 2026 8:54 pm',
    updatedAt: '26 Aug 2026 8:54 pm',
    notes: 'On time Banani office sign in',
  },
  {
    id: 'att-2',
    employeeId: 'emp-nayeem',
    employeeCode: 'FO072408231002',
    employeeName: 'S M Nayeem Rahman',
    designation: 'Program Officer',
    department: "Founder's Office (JFT)",
    branch: 'Head Office (Banani)',
    avatarUrl: '',
    status: 'Present',
    device: 'Device Login',
    timestamp: '26 Aug 2026 8:53 pm',
    date: '2026-08-26',
    checkInTime: '10:02 AM',
    checkOutTime: '06:05 PM',
    lateByMin: 2,
    earlyOutByMin: 0,
    createdBy: 'S M Nayeem Rahman - (FO072408231002)',
    createdAt: '26 Aug 2026 8:54 pm',
    updatedAt: '26 Aug 2026 8:54 pm',
  },
  {
    id: 'att-3',
    employeeId: 'emp-nurul',
    employeeCode: 'MAD06220101579',
    employeeName: 'Md. Nurul Islam',
    designation: 'Support Staff',
    department: 'Digital School Program',
    branch: 'Madaripur School',
    status: 'Present',
    device: 'Device Login',
    timestamp: '26 Aug 2026 8:53 pm',
    date: '2026-08-26',
    checkInTime: '08:50 AM',
    checkOutTime: '05:05 PM',
    lateByMin: 0,
    earlyOutByMin: 0,
    createdBy: 'Md. Nurul Islam - (MAD06220101579)',
    createdAt: '26 Aug 2026 8:54 pm',
    updatedAt: '26 Aug 2026 8:54 pm',
  },
  {
    id: 'att-4',
    employeeId: 'emp-rishan',
    employeeCode: 'HOB062616061625',
    employeeName: 'Md. Rishan Mia',
    designation: 'Support Staff',
    department: 'Digital School Program',
    branch: 'Habiganj School',
    status: 'Present',
    device: 'Device Login',
    timestamp: '26 Aug 2026 6:53 pm',
    date: '2026-08-26',
    checkInTime: '08:55 AM',
    checkOutTime: '05:00 PM',
    lateByMin: 0,
    earlyOutByMin: 0,
    createdBy: 'Md. Rishan Mia - (HOB062616061625)',
    createdAt: '26 Aug 2026 6:54 pm',
    updatedAt: '26 Aug 2026 6:54 pm',
  },
  {
    id: 'att-5',
    employeeId: 'emp-akkas',
    employeeCode: 'BN10171503549',
    employeeName: 'Md. Akkas Ali',
    designation: 'Support Staff',
    department: 'Program Implementation',
    branch: 'Banani School',
    status: 'Present',
    device: 'Device Login',
    timestamp: '26 Aug 2026 6:47 pm',
    date: '2026-08-26',
    checkInTime: '07:25 AM',
    checkOutTime: '04:35 PM',
    lateByMin: 0,
    earlyOutByMin: 0,
    createdBy: 'Md. Akkas Ali - (BN10171503549)',
    createdAt: '26 Aug 2026 6:48 pm',
    updatedAt: '26 Aug 2026 6:48 pm',
  },
];

export const INITIAL_ON_DUTY_LOGS: OnDutyLogItem[] = [
  {
    id: 'onduty-1',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    designation: 'Coordinator, Tech 4 Development',
    department: "Founder's Office (JFT)",
    branch: 'Head Office (Banani)',
    purpose: 'Digital School Telecommunication Server Inspection & Network Upgrade',
    destination: 'Cox’s Bazar Branch School & Campus',
    dutyDate: '2026-08-27',
    startTime: '08:30 AM',
    endTime: '06:00 PM',
    transportType: 'Office Vehicle',
    status: 'Approved',
    approverName: 'Korvi Rakshand (Founder & ED)',
    appliedDate: '2026-08-25',
    notes: 'All server equipment transport verified',
  },
  {
    id: 'onduty-2',
    employeeId: 'emp-nayeem',
    employeeCode: 'FO072408231002',
    employeeName: 'S M Nayeem Rahman',
    designation: 'Program Officer',
    department: 'Program Implementation',
    branch: 'Head Office (Banani)',
    purpose: 'Education Stakeholder Coordination & Donor Field Meeting',
    destination: 'Rayer Bazar Free School',
    dutyDate: '2026-08-28',
    startTime: '10:00 AM',
    endTime: '04:30 PM',
    transportType: 'Rideshare',
    status: 'Approved',
    approverName: 'Nasif Kamal (Coordinator)',
    appliedDate: '2026-08-26',
  },
  {
    id: 'onduty-3',
    employeeId: 'emp-nurul',
    employeeCode: 'MAD06220101579',
    employeeName: 'Md. Nurul Islam',
    designation: 'Support Staff',
    department: 'Digital School Program',
    branch: 'Madaripur School',
    purpose: 'Emergency Solar Backup Battery Maintenance',
    destination: 'Madaripur District Substation',
    dutyDate: '2026-08-29',
    startTime: '09:00 AM',
    endTime: '02:00 PM',
    transportType: 'Public Transport',
    status: 'Pending',
    approverName: 'DSP Regional Lead',
    appliedDate: '2026-08-26',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. PERSISTENCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY_SHIFTS = 'jaago_pnc_shifts_v2';
const STORAGE_KEY_ATTENDANCE = 'jaago_pnc_attendance_logs_v2';
const STORAGE_KEY_ONDUTY = 'jaago_pnc_onduty_logs_v2';

export function getLocalShifts(): ShiftItem[] {
  if (typeof window === 'undefined') return INITIAL_SHIFTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHIFTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(INITIAL_SHIFTS));
      return INITIAL_SHIFTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SHIFTS;
  }
}

export function saveLocalShifts(shifts: ShiftItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
  } catch (err) {
    console.error('Error saving shifts to localStorage', err);
  }
}

export function getLocalAttendanceLogs(): AttendanceLogItem[] {
  if (typeof window === 'undefined') return INITIAL_ATTENDANCE_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE_LOGS));
      return INITIAL_ATTENDANCE_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ATTENDANCE_LOGS;
  }
}

export function saveLocalAttendanceLogs(logs: AttendanceLogItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(logs));
  } catch (err) {
    console.error('Error saving attendance logs to localStorage', err);
  }
}

export function getLocalOnDutyLogs(): OnDutyLogItem[] {
  if (typeof window === 'undefined') return INITIAL_ON_DUTY_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ONDUTY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ONDUTY, JSON.stringify(INITIAL_ON_DUTY_LOGS));
      return INITIAL_ON_DUTY_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_ON_DUTY_LOGS;
  }
}

export function saveLocalOnDutyLogs(logs: OnDutyLogItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ONDUTY, JSON.stringify(logs));
  } catch (err) {
    console.error('Error saving on duty logs to localStorage', err);
  }
}
