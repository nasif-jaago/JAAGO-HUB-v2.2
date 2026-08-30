import { getSupabase } from './supabase-auth';
import { recordLocalAttendanceLog } from './supabase-attendance';

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & DOMAIN INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export type OnDutyStatus = 'PENDING' | 'APPROVED' | 'REFUSED' | 'CANCELLED' | 'DRAFT';

export interface OnDutyAttendanceDayItem {
  id: string;
  onDutyRequestId: string;
  employeeId: string;
  attendanceDate: string; // YYYY-MM-DD
  rawHours: number;
  creditedHours: number;
  creditedDays: number;
  classification: 'REGULAR' | 'EXTRA_HOURS';
  isWorkingDay: boolean;
  createdAt: string;
}

export interface OnDutyRequestItem {
  id: string;
  tenantId?: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  designation?: string;
  avatarUrl?: string;
  supervisorId?: string;
  supervisorName?: string;
  supervisorEmail?: string;
  startAt: string; // ISO timestamptz
  endAt: string; // ISO timestamptz
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // e.g. '10:00 AM' or '10:00'
  endTime: string; // e.g. '06:00 PM' or '18:00'
  reason: string;
  status: OnDutyStatus;
  refusalNote?: string;
  totalHours: number;
  creditedDays: number;
  decidedBy?: string;
  decidedAt?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  daysBreakdown?: OnDutyAttendanceDayItem[];
}

export interface OnDutyDurationPreview {
  rawTotalHours: number;
  creditedTotalHours: number;
  creditedDays: number;
  daysBreakdown: Array<{
    date: string;
    rawHours: number;
    creditedHours: number;
    creditedDays: number;
    classification: 'REGULAR' | 'EXTRA_HOURS';
    isWorkingDay: boolean;
  }>;
  isValid: boolean;
  validationError?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CANONICAL SECTION 5 ATTENDANCE CREDITING ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════

export const DAILY_CAP_HOURS = 8.0;

/**
 * Standard utility to parse date and time into a unified Date instance.
 * Accepts formats:
 * - date: 'YYYY-MM-DD' or 'DD/MM/YYYY'
 * - time: 'HH:mm', 'HH:mm:ss', 'hh:mm A', 'hh:mm PM'
 */
const MONTH_NAMES: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 600; // default 10:00 AM
  const clean = timeStr.trim().toUpperCase();
  let hours = 0;
  let minutes = 0;

  if (clean.includes('AM') || clean.includes('PM')) {
    const isPM = clean.includes('PM');
    const timePart = clean.replace('AM', '').replace('PM', '').trim();
    const [hStr, mStr] = timePart.split(':');
    let rawH = Number(hStr) || 0;
    minutes = Number(mStr) || 0;
    if (isPM && rawH < 12) rawH += 12;
    if (!isPM && rawH === 12) rawH = 0;
    hours = rawH;
  } else {
    const [hStr, mStr] = clean.split(':');
    hours = Number(hStr) || 0;
    minutes = Number(mStr) || 0;
  }
  return hours * 60 + minutes;
}

/**
 * Standard utility to parse date and time into a unified Date instance.
 * Accepts formats:
 * - date: 'YYYY-MM-DD', 'DD-MM-YYYY', 'DD-MMM-YYYY' (e.g. '01-Sep-2026')
 * - time: 'HH:mm', 'HH:mm:ss', 'hh:mm A', 'hh:mm PM', 'h:mm PM'
 */
export function parseDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  try {
    let y = 0;
    let m = 0;
    let d = 0;

    const normalized = dateStr.trim();

    if (normalized.includes('-')) {
      const parts = normalized.split('-');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        const monthKey = parts[1].toLowerCase().slice(0, 3);
        if (MONTH_NAMES[monthKey] !== undefined) {
          // Format: DD-MMM-YYYY e.g. 01-Sep-2026
          m = MONTH_NAMES[monthKey];
          if (Number(parts[0]) > 1000) {
            y = Number(parts[0]);
            d = Number(parts[2]);
          } else {
            d = Number(parts[0]);
            y = Number(parts[2]);
          }
        } else if (Number(parts[0]) > 1000) {
          // YYYY-MM-DD
          y = Number(parts[0]);
          m = Number(parts[1]) - 1;
          d = Number(parts[2]);
        } else {
          // DD-MM-YYYY
          d = Number(parts[0]);
          m = Number(parts[1]) - 1;
          y = Number(parts[2]);
        }
      }
    } else if (normalized.includes('/')) {
      const parts = normalized.split('/');
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        d = Number(parts[0]);
        m = Number(parts[1]) - 1;
        y = Number(parts[2]);
      }
    }

    if (!y || isNaN(y) || isNaN(m) || isNaN(d)) return null;

    const totalMinutes = parseTimeToMinutes(timeStr);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return new Date(y, m, d, hours, minutes, 0, 0);
  } catch {
    return null;
  }
}

/**
 * Checks if a date is a standard working day (Sun-Thu in BD, or Mon-Fri general).
 * By default in Bangladesh NGO / JAAGO operations:
 * Friday and Saturday are weekly off days unless customized.
 */
export function isDefaultWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  // In BD, Sunday (0) through Thursday (4) are working days. Friday (5) and Saturday (6) are weekend / off.
  return dayOfWeek !== 5 && dayOfWeek !== 6;
}

/**
 * Deterministic Section 5 Attendance Crediting Algorithm:
 * Capped at 8.0h per calendar day, exact when under 8.0h, with Extra Hours tagging.
 * Correctly accounts for multi-day field work where:
 * - Start Day: duty begins at startTime (capped at 8h).
 * - Intermediate Days: full working days (8h).
 * - Final Day: duty runs from working schedule start (e.g. startTime / 10:00 AM) to endTime (e.g. 01:00 PM = 3h exact).
 */
export function computeOnDutyDurationPreview(
  startDateStr: string,
  startTimeStr: string,
  endDateStr: string,
  endTimeStr: string,
  isWorkingDayFn: (d: Date) => boolean = isDefaultWorkingDay
): OnDutyDurationPreview {
  const start = parseDateTime(startDateStr, startTimeStr);
  const end = parseDateTime(endDateStr, endTimeStr);

  if (!start || !end) {
    return {
      rawTotalHours: 0,
      creditedTotalHours: 0,
      creditedDays: 0,
      daysBreakdown: [],
      isValid: false,
      validationError: 'Please select valid start and end dates/times',
    };
  }

  if (end.getTime() <= start.getTime()) {
    return {
      rawTotalHours: 0,
      creditedTotalHours: 0,
      creditedDays: 0,
      daysBreakdown: [],
      isValid: false,
      validationError: 'End date & time must be strictly after start date & time',
    };
  }

  const daysBreakdown: OnDutyDurationPreview['daysBreakdown'] = [];
  const startDayOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
  const finalDayOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);

  const isSingleDay = startDayOnly.getTime() === finalDayOnly.getTime();

  const startMinutes = parseTimeToMinutes(startTimeStr);
  const endMinutes = parseTimeToMinutes(endTimeStr);

  let creditedTotalHours = 0;
  let rawTotalHours = 0;

  let currentDay = new Date(startDayOnly);

  while (currentDay.getTime() <= finalDayOnly.getTime()) {
    const isStartDay = currentDay.getTime() === startDayOnly.getTime();
    const isEndDay = currentDay.getTime() === finalDayOnly.getTime();

    let rawHours = 0;

    if (isSingleDay) {
      // Single-day On Duty: from startTime to endTime
      const diffMinutes = Math.max(0, endMinutes - startMinutes);
      rawHours = diffMinutes / 60;
    } else if (isStartDay) {
      // First day of multi-day: spans from startTime through the working day (capped at 8.0h)
      const diffToMidnight = (24 * 60 - startMinutes) / 60;
      rawHours = Math.min(8.0, diffToMidnight);
    } else if (isEndDay) {
      // Final day of multi-day:
      // Check if this is an overnight continuation finishing early morning (< 06:00 AM)
      if (endMinutes <= 6 * 60 && startMinutes >= 20 * 60) {
        // Overnight span (e.g. Fri 22:00 -> Sat 02:00): 00:00 to 02:00 = 2 hours
        rawHours = endMinutes / 60;
      } else {
        // Daytime multi-day field work finish (e.g. 01 Sep 10:00 AM -> 02 Sep 01:00 PM)
        // Starts at scheduled morning start (e.g. startTime / 10:00 AM) and ends at endTime (01:00 PM)
        const dailyMorningStartMin = Math.min(startMinutes, 10 * 60); // 10:00 AM or earlier startTime
        const dutyMinutesToday = Math.max(0, endMinutes - dailyMorningStartMin);
        rawHours = dutyMinutesToday / 60;
      }
    } else {
      // Intermediate full working day between start and end date
      rawHours = 8.0;
    }

    const creditedHours = Math.min(rawHours, DAILY_CAP_HOURS);
    const creditedDays = creditedHours / DAILY_CAP_HOURS;
    const isWorking = isWorkingDayFn(currentDay);
    const classification = isWorking ? 'REGULAR' : 'EXTRA_HOURS';

    const dateIso = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;

    daysBreakdown.push({
      date: dateIso,
      rawHours: Math.round(rawHours * 100) / 100,
      creditedHours: Math.round(creditedHours * 100) / 100,
      creditedDays: Math.round(creditedDays * 1000) / 1000,
      classification,
      isWorkingDay: isWorking,
    });

    rawTotalHours += rawHours;
    creditedTotalHours += creditedHours;

    // Advance to next day
    const nextDay = new Date(currentDay);
    nextDay.setDate(nextDay.getDate() + 1);
    currentDay = nextDay;
  }

  const creditedDays = creditedTotalHours / DAILY_CAP_HOURS;

  return {
    rawTotalHours: Math.round(rawTotalHours * 100) / 100,
    creditedTotalHours: Math.round(creditedTotalHours * 100) / 100,
    creditedDays: Math.round(creditedDays * 1000) / 1000,
    daysBreakdown,
    isValid: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. INITIAL SEED DATA (Matching Screenshot & Test Cases)
// ═══════════════════════════════════════════════════════════════════════════

export const INITIAL_ON_DUTY_REQUESTS: OnDutyRequestItem[] = [
  {
    id: 'od-101',
    tenantId: 'jaago-main',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Lead Architect & Systems Engineer',
    supervisorId: 'emp-korvi',
    supervisorName: 'Korvi Rakshand',
    supervisorEmail: 'korvi@jaago.com.bd',
    startAt: '2026-08-27T10:37:00+06:00',
    endAt: '2026-08-27T18:37:00+06:00',
    startDate: '2026-08-27',
    endDate: '2026-08-27',
    startTime: '10:37 AM',
    endTime: '06:37 PM',
    reason: 'test field inspection',
    status: 'PENDING',
    totalHours: 8.0,
    creditedDays: 1.0,
    submittedAt: '2026-08-27T10:35:00+06:00',
    createdAt: '2026-08-27T10:35:00+06:00',
    updatedAt: '2026-08-27T10:35:00+06:00',
  },
  {
    id: 'od-102',
    tenantId: 'jaago-main',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Lead Architect & Systems Engineer',
    supervisorId: 'emp-korvi',
    supervisorName: 'Korvi Rakshand',
    supervisorEmail: 'korvi@jaago.com.bd',
    startAt: '2026-08-29T10:00:00+06:00',
    endAt: '2026-08-29T18:00:00+06:00',
    startDate: '2026-08-29',
    endDate: '2026-08-29',
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    reason: 'test 0101 project visit',
    status: 'PENDING',
    totalHours: 8.0,
    creditedDays: 1.0,
    submittedAt: '2026-08-29T09:45:00+06:00',
    createdAt: '2026-08-29T09:45:00+06:00',
    updatedAt: '2026-08-29T09:45:00+06:00',
  },
  {
    id: 'od-103',
    tenantId: 'jaago-main',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Lead Architect & Systems Engineer',
    supervisorId: 'emp-korvi',
    supervisorName: 'Korvi Rakshand',
    supervisorEmail: 'korvi@jaago.com.bd',
    startAt: '2026-08-30T10:00:00+06:00',
    endAt: '2026-08-30T18:00:00+06:00',
    startDate: '2026-08-30',
    endDate: '2026-08-30',
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    reason: 'EMK Center youth seminar technical setup',
    status: 'PENDING',
    totalHours: 8.0,
    creditedDays: 1.0,
    submittedAt: '2026-08-30T09:30:00+06:00',
    createdAt: '2026-08-30T09:30:00+06:00',
    updatedAt: '2026-08-30T09:30:00+06:00',
  },
  {
    id: 'od-104',
    tenantId: 'jaago-main',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Lead Architect & Systems Engineer',
    supervisorId: 'emp-korvi',
    supervisorName: 'Korvi Rakshand',
    supervisorEmail: 'korvi@jaago.com.bd',
    startAt: '2026-08-31T10:00:00+06:00',
    endAt: '2026-08-31T18:00:00+06:00',
    startDate: '2026-08-31',
    endDate: '2026-08-31',
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    reason: 'Donor briefing and technical demonstration at Banani extension',
    status: 'PENDING',
    totalHours: 8.0,
    creditedDays: 1.0,
    submittedAt: '2026-08-30T11:00:00+06:00',
    createdAt: '2026-08-30T11:00:00+06:00',
    updatedAt: '2026-08-30T11:00:00+06:00',
  },
  {
    id: 'od-105',
    tenantId: 'jaago-main',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Lead Architect & Systems Engineer',
    supervisorId: 'emp-korvi',
    supervisorName: 'Korvi Rakshand',
    supervisorEmail: 'korvi@jaago.com.bd',
    startAt: '2026-07-19T10:00:00+06:00',
    endAt: '2026-07-19T18:00:00+06:00',
    startDate: '2026-07-19',
    endDate: '2026-07-19',
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    reason: 'test remote work session',
    status: 'REFUSED',
    refusalNote: 'Staff already scheduled for HQ sync meeting on this date.',
    totalHours: 8.0,
    creditedDays: 1.0,
    decidedBy: 'emp-korvi',
    decidedAt: '2026-07-19T11:00:00+06:00',
    submittedAt: '2026-07-18T16:00:00+06:00',
    createdAt: '2026-07-18T16:00:00+06:00',
    updatedAt: '2026-07-19T11:00:00+06:00',
  },
  {
    id: 'od-106',
    tenantId: 'jaago-main',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Lead Architect & Systems Engineer',
    supervisorId: 'emp-korvi',
    supervisorName: 'Korvi Rakshand',
    supervisorEmail: 'korvi@jaago.com.bd',
    startAt: '2026-08-08T09:00:00+06:00',
    endAt: '2026-08-08T17:00:00+06:00',
    startDate: '2026-08-08',
    endDate: '2026-08-08',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    reason: 'test weekend branch coordination',
    status: 'REFUSED',
    refusalNote: 'Branch activities postponed by regional coordinator.',
    totalHours: 8.0,
    creditedDays: 1.0,
    decidedBy: 'emp-korvi',
    decidedAt: '2026-08-08T10:00:00+06:00',
    submittedAt: '2026-08-07T14:00:00+06:00',
    createdAt: '2026-08-07T14:00:00+06:00',
    updatedAt: '2026-08-08T10:00:00+06:00',
  },
  {
    id: 'od-107',
    tenantId: 'jaago-main',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Lead Architect & Systems Engineer',
    supervisorId: 'emp-korvi',
    supervisorName: 'Korvi Rakshand',
    supervisorEmail: 'korvi@jaago.com.bd',
    startAt: '2026-07-30T10:00:00+06:00',
    endAt: '2026-08-01T18:00:00+06:00',
    startDate: '2026-07-30',
    endDate: '2026-08-01',
    startTime: '10:00 AM',
    endTime: '06:00 PM',
    reason: 'test 3 days field school tech deployment in Bandarban',
    status: 'APPROVED',
    totalHours: 24.0,
    creditedDays: 3.0,
    decidedBy: 'emp-korvi',
    decidedAt: '2026-07-29T17:00:00+06:00',
    submittedAt: '2026-07-29T12:00:00+06:00',
    createdAt: '2026-07-29T12:00:00+06:00',
    updatedAt: '2026-07-29T17:00:00+06:00',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 4. STORAGE & SUPABASE PERSISTENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY_ONDUTY_V2 = 'jaago_pnc_onduty_requests_v2';

export function getLocalOnDutyRequests(): OnDutyRequestItem[] {
  if (typeof window === 'undefined') return INITIAL_ON_DUTY_REQUESTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ONDUTY_V2);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ONDUTY_V2, JSON.stringify(INITIAL_ON_DUTY_REQUESTS));
      return INITIAL_ON_DUTY_REQUESTS;
    }
    const parsed: OnDutyRequestItem[] = JSON.parse(raw);
    return parsed.length > 0 ? parsed : INITIAL_ON_DUTY_REQUESTS;
  } catch {
    return INITIAL_ON_DUTY_REQUESTS;
  }
}

export function saveLocalOnDutyRequests(requests: OnDutyRequestItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ONDUTY_V2, JSON.stringify(requests));
  } catch (err) {
    console.error('Error saving on-duty requests to localStorage', err);
  }
}

export function mapRowToOnDutyRequest(row: any): OnDutyRequestItem {
  return {
    id: String(row.id || `od-${Date.now()}`),
    tenantId: row.tenant_id || 'jaago-main',
    employeeId: row.employee_id || '',
    employeeCode: row.employee_code || '',
    employeeName: row.employee_name || '',
    department: row.department || '',
    designation: row.designation || '',
    avatarUrl: row.avatar_url || '',
    supervisorId: row.supervisor_id || '',
    supervisorName: row.supervisor_name || '',
    supervisorEmail: row.supervisor_email || '',
    startAt: row.start_at || new Date().toISOString(),
    endAt: row.end_at || new Date().toISOString(),
    startDate: row.start_date || (row.start_at ? row.start_at.slice(0, 10) : ''),
    endDate: row.end_date || (row.end_at ? row.end_at.slice(0, 10) : ''),
    startTime: row.start_time || '10:00 AM',
    endTime: row.end_time || '06:00 PM',
    reason: row.reason || '',
    status: (row.status || 'PENDING') as OnDutyStatus,
    refusalNote: row.refusal_note || '',
    totalHours: Number(row.total_hours ?? 0),
    creditedDays: Number(row.credited_days ?? 0),
    decidedBy: row.decided_by || '',
    decidedAt: row.decided_at || '',
    submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export async function fetchOnDutyRequestsFromSupabase(filters?: {
  employeeId?: string;
  supervisorId?: string;
  status?: OnDutyStatus;
}): Promise<OnDutyRequestItem[]> {
  const localList = getLocalOnDutyRequests();
  const supabase = getSupabase();
  if (!supabase) return localList;

  try {
    let query = supabase
      .from('on_duty_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.supervisorId) {
      query = query.eq('supervisor_id', filters.supervisorId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return localList;
    }

    const mapped = data.map(mapRowToOnDutyRequest);
    saveLocalOnDutyRequests(mapped);
    return mapped;
  } catch {
    return localList;
  }
}

export async function createOnDutyRequest(payload: {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  designation?: string;
  avatarUrl?: string;
  supervisorId?: string;
  supervisorName?: string;
  supervisorEmail?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
}): Promise<{ success: boolean; data?: OnDutyRequestItem; error?: string }> {
  const preview = computeOnDutyDurationPreview(
    payload.startDate,
    payload.startTime,
    payload.endDate,
    payload.endTime
  );

  if (!preview.isValid) {
    return { success: false, error: preview.validationError || 'Invalid dates or times' };
  }

  if (!payload.reason || payload.reason.trim().length === 0) {
    return { success: false, error: 'Duty Description / Reason is mandatory' };
  }

  const startParsed = parseDateTime(payload.startDate, payload.startTime);
  const endParsed = parseDateTime(payload.endDate, payload.endTime);

  const newId = `od-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const nowIso = new Date().toISOString();

  const newRequest: OnDutyRequestItem = {
    id: newId,
    tenantId: 'jaago-main',
    employeeId: payload.employeeId,
    employeeCode: payload.employeeCode,
    employeeName: payload.employeeName,
    department: payload.department || "Founder's Office / FC",
    designation: payload.designation || 'Lead Architect & Systems Engineer',
    avatarUrl: payload.avatarUrl || '',
    supervisorId: payload.supervisorId || 'emp-korvi',
    supervisorName: payload.supervisorName || 'Korvi Rakshand',
    supervisorEmail: payload.supervisorEmail || 'korvi@jaago.com.bd',
    startAt: startParsed ? startParsed.toISOString() : nowIso,
    endAt: endParsed ? endParsed.toISOString() : nowIso,
    startDate: payload.startDate,
    endDate: payload.endDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
    reason: payload.reason.trim(),
    status: 'PENDING',
    totalHours: preview.creditedTotalHours,
    creditedDays: preview.creditedDays,
    submittedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Update Local Storage Cache
  const current = getLocalOnDutyRequests();
  const updated = [newRequest, ...current];
  saveLocalOnDutyRequests(updated);

  // 2. Persist to Supabase asynchronously
  const supabase = getSupabase();
  if (supabase) {
    (async () => {
      try {
        const { error } = await supabase.from('on_duty_requests').insert({
          id: newRequest.id,
          tenant_id: newRequest.tenantId,
          employee_id: newRequest.employeeId,
          employee_code: newRequest.employeeCode,
          employee_name: newRequest.employeeName,
          department: newRequest.department,
          designation: newRequest.designation,
          avatar_url: newRequest.avatarUrl,
          supervisor_id: newRequest.supervisorId,
          supervisor_name: newRequest.supervisorName,
          supervisor_email: newRequest.supervisorEmail,
          start_at: newRequest.startAt,
          end_at: newRequest.endAt,
          start_date: newRequest.startDate,
          end_date: newRequest.endDate,
          start_time: newRequest.startTime,
          end_time: newRequest.endTime,
          reason: newRequest.reason,
          status: newRequest.status,
          total_hours: newRequest.totalHours,
          credited_days: newRequest.creditedDays,
          submitted_at: newRequest.submittedAt,
        });
        if (error) console.warn('Supabase on_duty_requests insert error:', error.message);
      } catch (err) {
        console.warn('Supabase on_duty_requests insert network error:', err);
      }
    })();
  }

  // 3. Dispatch global sync event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jaago_onduty_updated', {
        detail: { created: newRequest, all: updated },
      })
    );
  }

  return { success: true, data: newRequest };
}

export async function approveOnDutyRequest(
  id: string,
  approverId: string,
  approverName: string
): Promise<{ success: boolean; data?: OnDutyRequestItem; error?: string }> {
  const current = getLocalOnDutyRequests();
  const item = current.find((r) => r.id === id);
  if (!item) {
    return { success: false, error: 'Request not found' };
  }

  if (item.status !== 'PENDING') {
    return { success: false, error: `Cannot approve request currently in ${item.status} status` };
  }

  const nowIso = new Date().toISOString();
  const preview = computeOnDutyDurationPreview(
    item.startDate,
    item.startTime,
    item.endDate,
    item.endTime
  );

  const updatedItem: OnDutyRequestItem = {
    ...item,
    status: 'APPROVED',
    decidedBy: approverId || 'emp-korvi',
    decidedAt: nowIso,
    updatedAt: nowIso,
  };

  const updatedList = current.map((r) => (r.id === id ? updatedItem : r));
  saveLocalOnDutyRequests(updatedList);

  // ═════════════════════════════════════════════════════════════════════════
  // ATOMIC ATTENDANCE CREDITING (Section 5)
  // Writes an attendance day record for each covered day into attendance system
  // ═════════════════════════════════════════════════════════════════════
  for (const day of preview.daysBreakdown) {
    recordLocalAttendanceLog({
      employeeId: item.employeeId,
      employeeCode: item.employeeCode,
      employeeName: item.employeeName,
      designation: item.designation || 'Lead Architect & Systems Engineer',
      department: item.department || "Founder's Office / FC",
      branch: 'On-Duty Field Location',
      date: day.date,
      checkInTime: item.startTime,
      checkOutTime: item.endTime,
      status: 'On Duty',
      device: 'Manual In/Out',
      locationName: `Field Duty: ${item.reason.slice(0, 40)}`,
      notes: `On-Duty approved by ${approverName || 'Supervisor'} (Credited: ${day.creditedHours}h, ${day.classification})`,
    });
  }

  // Persist to Supabase
  const supabase = getSupabase();
  if (supabase) {
    (async () => {
      try {
        const { error } = await supabase
          .from('on_duty_requests')
          .update({
            status: 'APPROVED',
            decided_by: updatedItem.decidedBy,
            decided_at: updatedItem.decidedAt,
            updated_at: updatedItem.updatedAt,
          })
          .eq('id', id);

        if (error) console.warn('Supabase on_duty_requests approve error:', error.message);

        // Also write day rollup rows
        for (const day of preview.daysBreakdown) {
          await supabase.from('on_duty_attendance_day').upsert({
            on_duty_request_id: id,
            employee_id: item.employeeId,
            attendance_date: day.date,
            raw_hours: day.rawHours,
            credited_hours: day.creditedHours,
            credited_days: day.creditedDays,
            classification: day.classification,
            is_working_day: day.isWorkingDay,
          });
        }
      } catch (err) {
        console.warn('Supabase approve network error:', err);
      }
    })();
  }

  // Global Broadcast
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jaago_onduty_updated', {
        detail: { approved: updatedItem, all: updatedList },
      })
    );
    window.dispatchEvent(new CustomEvent('jaago_attendance_updated', { detail: {} }));
  }

  return { success: true, data: updatedItem };
}

export async function refuseOnDutyRequest(
  id: string,
  refusalNote: string,
  approverId: string,
  _approverName?: string
): Promise<{ success: boolean; data?: OnDutyRequestItem; error?: string }> {
  if (!refusalNote || refusalNote.trim().length === 0) {
    return { success: false, error: 'A Refusal Note is mandatory when refusing an On-Duty request.' };
  }

  const current = getLocalOnDutyRequests();
  const item = current.find((r) => r.id === id);
  if (!item) {
    return { success: false, error: 'Request not found' };
  }

  if (item.status !== 'PENDING') {
    return { success: false, error: `Cannot refuse request currently in ${item.status} status` };
  }

  const nowIso = new Date().toISOString();
  const updatedItem: OnDutyRequestItem = {
    ...item,
    status: 'REFUSED',
    refusalNote: refusalNote.trim(),
    decidedBy: approverId || 'emp-korvi',
    decidedAt: nowIso,
    updatedAt: nowIso,
  };

  const updatedList = current.map((r) => (r.id === id ? updatedItem : r));
  saveLocalOnDutyRequests(updatedList);

  // Persist to Supabase
  const supabase = getSupabase();
  if (supabase) {
    (async () => {
      try {
        const { error } = await supabase
          .from('on_duty_requests')
          .update({
            status: 'REFUSED',
            refusal_note: updatedItem.refusalNote,
            decided_by: updatedItem.decidedBy,
            decided_at: updatedItem.decidedAt,
            updated_at: updatedItem.updatedAt,
          })
          .eq('id', id);

        if (error) console.warn('Supabase on_duty_requests refuse error:', error.message);
      } catch (err) {
        console.warn('Supabase refuse network error:', err);
      }
    })();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jaago_onduty_updated', {
        detail: { refused: updatedItem, all: updatedList },
      })
    );
  }

  return { success: true, data: updatedItem };
}

export async function cancelOnDutyRequest(
  id: string,
  _requesterId?: string
): Promise<{ success: boolean; data?: OnDutyRequestItem; error?: string }> {
  const current = getLocalOnDutyRequests();
  const item = current.find((r) => r.id === id);
  if (!item) {
    return { success: false, error: 'Request not found' };
  }

  if (item.status !== 'PENDING') {
    return { success: false, error: 'Only pending requests can be cancelled' };
  }

  const nowIso = new Date().toISOString();
  const updatedItem: OnDutyRequestItem = {
    ...item,
    status: 'CANCELLED',
    updatedAt: nowIso,
  };

  const updatedList = current.map((r) => (r.id === id ? updatedItem : r));
  saveLocalOnDutyRequests(updatedList);

  const supabase = getSupabase();
  if (supabase) {
    (async () => {
      try {
        const { error } = await supabase
          .from('on_duty_requests')
          .update({
            status: 'CANCELLED',
            updated_at: updatedItem.updatedAt,
          })
          .eq('id', id);

        if (error) console.warn('Supabase on_duty_requests cancel error:', error.message);
      } catch {}
    })();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jaago_onduty_updated', {
        detail: { cancelled: updatedItem, all: updatedList },
      })
    );
  }

  return { success: true, data: updatedItem };
}
