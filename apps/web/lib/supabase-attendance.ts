import { getSupabase } from './supabase-auth';

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

// ═══════════════════════════════════════════════════════════════════════════
// 3. SHIFTS SUPABASE & LOCAL PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY_SHIFTS = 'jaago_pnc_shifts_v2';
const STORAGE_KEY_ATTENDANCE = 'jaago_pnc_attendance_logs_v2';
const STORAGE_KEY_ONDUTY = 'jaago_pnc_onduty_logs_v2';

export function mapRowToShift(row: any): ShiftItem {
  return {
    id: String(row.id || `shift-${Date.now()}`),
    name: row.name || 'General Shift',
    officeStart: row.office_start || '09:00 AM',
    startBufferMin: Number(row.start_buffer_min ?? 15),
    officeEnd: row.office_end || '05:00 PM',
    endBufferMin: Number(row.end_buffer_min ?? 15),
    checkInStart: row.check_in_start || '05:00 AM',
    checkInEnd: row.check_in_end || '05:00 PM',
    checkOutStart: row.check_out_start || '09:30 AM',
    checkOutEnd: row.check_out_end || '11:30 PM',
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapShiftToRow(shift: ShiftItem): any {
  return {
    id: shift.id,
    name: shift.name,
    office_start: shift.officeStart,
    start_buffer_min: shift.startBufferMin,
    office_end: shift.officeEnd,
    end_buffer_min: shift.endBufferMin,
    check_in_start: shift.checkInStart,
    check_in_end: shift.checkInEnd,
    check_out_start: shift.checkOutStart,
    check_out_end: shift.checkOutEnd,
    is_default: Boolean(shift.isDefault),
  };
}

/**
 * Fetch shifts from Supabase PostgreSQL, caching and merging with local data
 */
export async function fetchShiftsFromSupabase(): Promise<ShiftItem[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase shifts fetch warning:', error.message);
      return getLocalShifts();
    }

    if (data && data.length > 0) {
      const mapped = data.map(mapRowToShift);
      saveLocalShifts(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn('Error connecting to Supabase for shifts:', err);
  }

  return getLocalShifts();
}

/**
 * Save / Upsert a shift in Supabase and local storage
 */
export async function saveShiftToSupabase(shift: ShiftItem): Promise<boolean> {
  // Always update local storage first for snappy UI
  const current = getLocalShifts();
  const existingIdx = current.findIndex((s) => s.id === shift.id || s.name.toLowerCase() === shift.name.toLowerCase());
  let updatedList: ShiftItem[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = shift;
  } else {
    updatedList = [shift, ...current];
  }
  saveLocalShifts(updatedList);

  try {
    const supabase = getSupabase();
    const payload = mapShiftToRow(shift);
    const { error } = await supabase.from('shifts').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase shift upsert warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error saving shift to Supabase:', err);
    return false;
  }
}

/**
 * Bulk save / upsert multiple shifts in Supabase and local storage
 */
export async function bulkSaveShiftsToSupabase(newShifts: ShiftItem[]): Promise<boolean> {
  const current = getLocalShifts();
  const shiftMap = new Map<string, ShiftItem>();
  current.forEach((s) => shiftMap.set(s.id, s));
  newShifts.forEach((s) => shiftMap.set(s.id, s));
  const combined = Array.from(shiftMap.values());
  saveLocalShifts(combined);

  try {
    const supabase = getSupabase();
    const payloads = newShifts.map(mapShiftToRow);
    const { error } = await supabase.from('shifts').upsert(payloads, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase bulk shifts upsert warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error bulk saving shifts to Supabase:', err);
    return false;
  }
}

/**
 * Delete a shift from Supabase and local storage
 */
export async function deleteShiftFromSupabase(id: string): Promise<boolean> {
  const current = getLocalShifts();
  const filtered = current.filter((s) => s.id !== id);
  saveLocalShifts(filtered);

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) {
      console.warn('Supabase shift delete warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting shift from Supabase:', err);
    return false;
  }
}

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

// ═══════════════════════════════════════════════════════════════════════════
// 6. CANONICAL ATTENDANCE API INTEGRATIONS (ONE SOURCE OF TRUTH)
// ═══════════════════════════════════════════════════════════════════════════

export async function performGpsCheckIn(payload: {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceInfo?: string;
}) {
  const res = await fetch('/api/v1/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      capturedAt: new Date().toISOString(),
    }),
  });
  return res.json();
}

export async function performGpsCheckOut(payload: {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceInfo?: string;
}) {
  const res = await fetch('/api/v1/attendance/check-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      capturedAt: new Date().toISOString(),
    }),
  });
  return res.json();
}

export async function fetchTodayAttendanceSession(employeeId: string) {
  const res = await fetch(`/api/v1/attendance/me/today?employeeId=${encodeURIComponent(employeeId)}`);
  return res.json();
}

export async function fetchMonthlyAttendanceSummary(employeeId: string, month?: string) {
  const url = month
    ? `/api/v1/attendance/me/summary?employeeId=${encodeURIComponent(employeeId)}&month=${month}`
    : `/api/v1/attendance/me/summary?employeeId=${encodeURIComponent(employeeId)}`;
  const res = await fetch(url);
  return res.json();
}

export async function adjustAttendanceLog(payload: {
  recordId: string;
  checkInTime?: string;
  checkOutTime?: string;
  reason: string;
  changedBy?: string;
}) {
  const res = await fetch('/api/v1/attendance/adjust', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}
