'use client';

import { getLocalAttendanceLogs, saveLocalAttendanceLogs } from './supabase-attendance';
import { createNotification, dismissNotificationForEntity } from './notifications';

export interface AttendanceRegularizationItem {
  id: string;
  attendanceLogId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  date: string; // YYYY-MM-DD
  originalCheckIn: string;
  originalCheckOut: string;
  originalStatus: string;
  originalLateByMin?: number | undefined;
  adjustedCheckIn: string;
  adjustedCheckOut: string;
  adjustedStatus: string;
  workingSchedule: string;
  calculatedHours: string;
  reason: string;
  notes?: string | undefined;
  supervisorName: string;
  supervisorEmail: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Refused';
  refusalNote?: string | undefined;
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY_REGULARIZATIONS = 'jaago_attendance_regularizations_v2';

/**
 * Initial demo/seed regularizations to show rich history
 */
export const INITIAL_REGULARIZATIONS: AttendanceRegularizationItem[] = [
  {
    id: 'reg-demo-nayeem-3',
    attendanceLogId: 'att-demo-20260830',
    employeeId: 'emp-nayeem',
    employeeCode: 'FO072408021002',
    employeeName: 'S M Nayeem Rahman',
    department: "Founder's Office (JF)",
    designation: 'Team Lead',
    date: '2026-08-30',
    originalCheckIn: '11:06 AM',
    originalCheckOut: '--:--',
    originalStatus: 'Late',
    originalLateByMin: 36,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:00 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 00m',
    reason: 'Late Entry Due to Official Field Work / Traffic',
    supervisorName: 'Nasif Kamal',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Pending',
    appliedAt: '2026-09-05T09:00:00Z',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-05T09:00:00Z',
  },
  {
    id: 'reg-demo-nayeem-2',
    attendanceLogId: 'att-demo-20260831',
    employeeId: 'emp-nayeem',
    employeeCode: 'FO072408021002',
    employeeName: 'S M Nayeem Rahman',
    department: "Founder's Office (JF)",
    designation: 'Team Lead',
    date: '2026-08-31',
    originalCheckIn: '01:33 PM',
    originalCheckOut: '11:22 PM',
    originalStatus: 'Late',
    originalLateByMin: 213,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:00 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 00m',
    reason: 'Official field engagement / delayed biometric terminal sync on August 31.',
    supervisorName: 'Nasif Kamal',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Pending',
    appliedAt: '2026-09-05T09:00:00Z',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-05T09:00:00Z',
  },
  {
    id: 'reg-demo-nayeem-1',
    attendanceLogId: 'att-demo-20260903',
    employeeId: 'emp-nayeem',
    employeeCode: 'FO072408021002',
    employeeName: 'S M Nayeem Rahman',
    department: "Founder's Office (JF)",
    designation: 'Team Lead',
    date: '2026-09-03',
    originalCheckIn: '01:33 PM',
    originalCheckOut: '11:22 PM',
    originalStatus: 'Late',
    originalLateByMin: 213,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:00 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 00m',
    reason: 'Late Entry Due to Official Field Work / Traffic',
    supervisorName: 'Nasif Kamal',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Pending',
    appliedAt: '2026-09-05T09:00:00Z',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-05T09:00:00Z',
  },
  {
    id: 'reg-demo-kazi-1',
    attendanceLogId: 'att-demo-20260902',
    employeeId: 'emp-kazi',
    employeeCode: 'FO072408021003',
    employeeName: 'Kazi Farhan',
    department: 'Programmes',
    designation: 'Project Officer',
    date: '2026-09-02',
    originalCheckIn: '10:35 AM',
    originalCheckOut: '06:00 PM',
    originalStatus: 'Late',
    originalLateByMin: 35,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:00 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 00m',
    reason: 'Severe monsoon downpour and public transit disruption in Banani area.',
    supervisorName: 'Nasif Kamal',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Pending',
    appliedAt: '2026-09-04T18:00:00Z',
    createdAt: '2026-09-04T18:00:00Z',
    updatedAt: '2026-09-04T18:00:00Z',
  },
  {
    id: 'reg-demo-1',
    attendanceLogId: 'att-demo-20260824',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Coordinator, Tech 4 Development',
    date: '2026-08-24',
    originalCheckIn: '10:22 AM',
    originalCheckOut: '06:05 PM',
    originalStatus: 'Late',
    originalLateByMin: 22,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:05 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 05m',
    reason: 'Biometric RFID reader network sync latency during morning check-in.',
    supervisorName: 'Korvi Rakshand (Founder & ED)',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Approved',
    approvedBy: 'Korvi Rakshand (Founder & ED)',
    approvedAt: '2026-08-25T09:30:00Z',
    appliedAt: '2026-08-24T18:30:00Z',
    createdAt: '2026-08-24T18:30:00Z',
    updatedAt: '2026-08-25T09:30:00Z',
  },
];

/**
 * Retrieve all regularization requests from storage
 */
export function getLocalRegularizations(): AttendanceRegularizationItem[] {
  if (typeof window === 'undefined') return INITIAL_REGULARIZATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGULARIZATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_REGULARIZATIONS, JSON.stringify(INITIAL_REGULARIZATIONS));
      return INITIAL_REGULARIZATIONS;
    }
    const parsed = JSON.parse(raw);
    let list: AttendanceRegularizationItem[] = Array.isArray(parsed) ? parsed : INITIAL_REGULARIZATIONS;

    // Auto-fix any legacy records for 2026-08-30 or Nayeem that had employeeName mistakenly set to Nasif Kamal
    let mutated = false;
    list = list.map((item) => {
      if (
        item.date === '2026-08-30' &&
        (item.employeeName === 'Nasif Kamal' || item.employeeCode === 'FO032507061190') &&
        item.supervisorName !== 'Korvi Rakshand (Founder & ED)'
      ) {
        mutated = true;
        return {
          ...item,
          employeeId: 'emp-nayeem',
          employeeCode: 'FO072408021002',
          employeeName: 'S M Nayeem Rahman',
          department: "Founder's Office (JF)",
          designation: 'Team Lead',
          supervisorName: 'Nasif Kamal',
          supervisorEmail: 'nasif.kamal@jaago.com.bd',
        };
      }
      return item;
    });

    // Merge any missing seed items from INITIAL_REGULARIZATIONS
    const existingDates = new Set(list.map((i) => `${(i.employeeCode || '').toLowerCase()}_${i.date}`));
    INITIAL_REGULARIZATIONS.forEach((seed) => {
      const key = `${(seed.employeeCode || '').toLowerCase()}_${seed.date}`;
      if (!existingDates.has(key)) {
        list.push(seed);
        existingDates.add(key);
        mutated = true;
      }
    });

    if (mutated) {
      localStorage.setItem(STORAGE_KEY_REGULARIZATIONS, JSON.stringify(list));
    }
    return list;
  } catch {
    return INITIAL_REGULARIZATIONS;
  }
}

/**
 * Save regularizations list to storage
 */
export function saveLocalRegularizations(list: AttendanceRegularizationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_REGULARIZATIONS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('jaago_attendance_regularization_updated'));
  } catch (err) {
    console.error('Error saving regularizations to localStorage:', err);
  }
}

/**
 * Parse standard shift check-in and check-out times from working schedule or defaults
 */
export function calculateShiftStandardTimes(workingSchedule?: string): { checkIn: string; checkOut: string } {
  if (!workingSchedule) {
    return { checkIn: '10:00 AM', checkOut: '06:00 PM' };
  }

  // Look for patterns like "10:00 AM - 06:00 PM" or "09:00 AM - 05:00 PM"
  const match = workingSchedule.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–—to]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
  if (match && match[1] && match[2]) {
    return {
      checkIn: match[1].toUpperCase().trim(),
      checkOut: match[2].toUpperCase().trim(),
    };
  }

  if (workingSchedule.includes('09:00') || workingSchedule.includes('Shift 1')) {
    return { checkIn: '09:00 AM', checkOut: '05:00 PM' };
  }
  if (workingSchedule.includes('08:00') || workingSchedule.includes('Shift 4')) {
    return { checkIn: '08:00 AM', checkOut: '05:00 PM' };
  }
  if (workingSchedule.includes('07:30') || workingSchedule.includes('Shift 3')) {
    return { checkIn: '07:30 AM', checkOut: '04:30 PM' };
  }

  return { checkIn: '10:00 AM', checkOut: '06:00 PM' };
}

/**
 * Submit a new Attendance Regularization Request
 */
export async function submitAttendanceRegularization(data: {
  attendanceLogId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  date: string;
  originalCheckIn: string;
  originalCheckOut: string;
  originalStatus: string;
  originalLateByMin?: number | undefined;
  adjustedCheckIn: string;
  adjustedCheckOut: string;
  workingSchedule: string;
  calculatedHours?: string | undefined;
  reason: string;
  notes?: string | undefined;
  supervisorName?: string | undefined;
  supervisorEmail?: string | undefined;
}): Promise<AttendanceRegularizationItem> {
  const current = getLocalRegularizations();
  const id = `reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  const supervisorName = data.supervisorName || 'Nasif Kamal';
  const supervisorEmail = data.supervisorEmail || 'nasif.kamal@jaago.com.bd';

  const newItem: AttendanceRegularizationItem = {
    id,
    attendanceLogId: data.attendanceLogId,
    employeeId: data.employeeId,
    employeeCode: data.employeeCode,
    employeeName: data.employeeName,
    department: data.department,
    designation: data.designation,
    date: data.date,
    originalCheckIn: data.originalCheckIn || '--:--',
    originalCheckOut: data.originalCheckOut || '--:--',
    originalStatus: data.originalStatus,
    originalLateByMin: data.originalLateByMin,
    adjustedCheckIn: data.adjustedCheckIn,
    adjustedCheckOut: data.adjustedCheckOut,
    adjustedStatus: 'Present',
    workingSchedule: data.workingSchedule,
    calculatedHours: data.calculatedHours || '8.0h',
    reason: data.reason.trim(),
    notes: data.notes?.trim(),
    supervisorName,
    supervisorEmail,
    status: 'Pending',
    appliedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Save to local list
  const updated = [newItem, ...current.filter((r) => r.id !== newItem.id)];
  saveLocalRegularizations(updated);

  // 2. Broadcast Supervisor Notification Bell
  createNotification({
    id: `notif-reg-pending-${newItem.id}`,
    title: `Regularization Required: ${newItem.employeeName} (${newItem.date})`,
    message: `${newItem.employeeName} (${newItem.employeeCode}) requested attendance correction for ${newItem.date} (${newItem.adjustedCheckIn} - ${newItem.adjustedCheckOut}). Reason: "${newItem.reason}"`,
    category: 'approvals',
    channel: 'in_app',
    actionUrl: `/workflows?requestId=${encodeURIComponent(newItem.id)}`,
    targetSupervisorName: supervisorName,
    relatedEntity: { type: 'attendance_regularization', id: newItem.id },
  });

  // 3. Persist to server API and send supervisor notification
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/v1/attendance/regularization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: newItem,
        }),
      });
    } catch (err) {
      console.warn('Server regularization sync warning:', err);
    }

    // Trigger instant real-time events
    window.dispatchEvent(new CustomEvent('jaago_notifications_updated'));
    window.dispatchEvent(new CustomEvent('jaago_attendance_regularization_updated'));
    window.dispatchEvent(new CustomEvent('jaago_attendance_updated'));
  }

  return newItem;
}

/**
 * Approve Attendance Regularization and automatically adjust attendance everywhere
 */
export async function approveAttendanceRegularization(
  regularizationId: string,
  reviewerName?: string,
  _reviewerCode?: string
): Promise<{ success: boolean; item?: AttendanceRegularizationItem; error?: string }> {
  const currentRegs = getLocalRegularizations();
  const target = currentRegs.find((r) => r.id === regularizationId);
  if (!target) {
    return { success: false, error: 'Regularization request not found.' };
  }

  const nowIso = new Date().toISOString();
  const approver = reviewerName || 'Supervisor / Manager';

  // 1. Update Regularization status to Approved
  target.status = 'Approved';
  target.approvedBy = approver;
  target.approvedAt = nowIso;
  target.updatedAt = nowIso;
  saveLocalRegularizations(currentRegs);

  // 2. CRITICAL: Automatically update Attendance Record everywhere across the application
  const allLogs = getLocalAttendanceLogs();
  const regCode = (target.employeeCode || '').trim().toLowerCase();
  const regName = (target.employeeName || '').trim().toLowerCase();
  const matchingIndices: number[] = [];

  allLogs.forEach((l, idx) => {
    const isIdMatch = target.attendanceLogId && l.id === target.attendanceLogId;
    const isDateAndEmp =
      l.date === target.date &&
      (
        (regCode && (l.employeeCode || '').trim().toLowerCase() === regCode) ||
        (regName && (l.employeeName || '').trim().toLowerCase() === regName) ||
        (target.employeeId && l.employeeId === target.employeeId)
      );
    if (isIdMatch || isDateAndEmp) {
      matchingIndices.push(idx);
    }
  });

  if (matchingIndices.length > 0) {
    const primaryIdx = matchingIndices[0]!;
    const existingLog = allLogs[primaryIdx]!;
    existingLog.checkInTime = target.adjustedCheckIn;
    existingLog.checkOutTime = target.adjustedCheckOut;
    existingLog.status = 'Present';
    existingLog.lateByMin = 0;
    existingLog.earlyOutByMin = 0;
    existingLog.isAutoCheckout = false;
    existingLog.workedMinutes = 480;
    existingLog.notes = `Regularized (Approved by ${approver}): ${target.reason}`;
    existingLog.updatedAt = nowIso;

    let updatedLogs = allLogs;
    if (matchingIndices.length > 1) {
      const extraIndices = new Set(matchingIndices.slice(1));
      updatedLogs = allLogs.filter((_, i) => !extraIndices.has(i));
    }
    saveLocalAttendanceLogs(updatedLogs);
  } else {
    // If not found in current list, create the clean adjusted record
    allLogs.unshift({
      id: target.attendanceLogId || `att-reg-${target.employeeCode}-${target.date}`,
      employeeId: target.employeeId,
      employeeCode: target.employeeCode,
      employeeName: target.employeeName,
      department: target.department,
      designation: target.designation,
      branch: 'JAAGO HQ (Banani)',
      status: 'Present',
      device: 'Web Portal',
      timestamp: `${target.date} ${target.adjustedCheckIn}`,
      date: target.date,
      checkInTime: target.adjustedCheckIn,
      checkOutTime: target.adjustedCheckOut,
      lateByMin: 0,
      earlyOutByMin: 0,
      isAutoCheckout: false,
      workedMinutes: 480,
      locationName: 'JAAGO HQ (Banani)',
      notes: `Regularized (Approved by ${approver}): ${target.reason}`,
      createdBy: approver,
      createdAt: target.createdAt,
      updatedAt: nowIso,
    });
    saveLocalAttendanceLogs(allLogs);
  }

  // 3. Dispatch global events so /attendance, /pnc/attendance/logs, reports, monthly summary, & profiles reload
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('jaago_attendance_updated', {
        detail: { updatedDate: target.date, employeeCode: target.employeeCode },
      })
    );
    window.dispatchEvent(new CustomEvent('jaago_attendance_regularization_updated'));

    // Sync approval to server API
    fetch('/api/v1/attendance/regularization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve',
        instanceId: target.id,
        reviewerName: approver,
        reviewerCode: _reviewerCode,
      }),
    }).catch((err) => console.warn('Server approve sync warning:', err));

    // Automatically clean up the exact pending notification
    dismissNotificationForEntity('attendance_regularization', target.id);
    if (target.attendanceLogId) {
      dismissNotificationForEntity('attendance_regularization', target.attendanceLogId);
    }

    // 4. Send Bell Notification to the Employee
    createNotification({
      title: `Attendance Regularization Approved: ${target.date}`,
      message: `Your attendance regularization for ${target.date} (${target.adjustedCheckIn} - ${target.adjustedCheckOut}) has been approved by ${approver}.`,
      category: 'time_off',
      channel: 'in_app',
      actionUrl: '/attendance',
      targetEmployeeCode: target.employeeCode,
      relatedEntity: { type: 'attendance_regularization', id: target.id },
    });
  }

  return { success: true, item: target };
}

/**
 * Refuse Attendance Regularization with mandatory refusal note
 */
export async function refuseAttendanceRegularization(
  regularizationId: string,
  refusalNote: string,
  reviewerName?: string,
  _reviewerCode?: string
): Promise<{ success: boolean; item?: AttendanceRegularizationItem; error?: string }> {
  if (!refusalNote.trim()) {
    return { success: false, error: 'Mandatory refusal note is required when refusing regularization.' };
  }

  const currentRegs = getLocalRegularizations();
  const target = currentRegs.find((r) => r.id === regularizationId);
  if (!target) {
    return { success: false, error: 'Regularization request not found.' };
  }

  const nowIso = new Date().toISOString();
  const approver = reviewerName || 'Supervisor / Manager';

  target.status = 'Refused';
  target.refusalNote = refusalNote.trim();
  target.approvedBy = approver;
  target.approvedAt = nowIso;
  target.updatedAt = nowIso;

  saveLocalRegularizations(currentRegs);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jaago_attendance_regularization_updated'));

    // Automatically clean up the exact pending notification
    dismissNotificationForEntity('attendance_regularization', target.id);
    if (target.attendanceLogId) {
      dismissNotificationForEntity('attendance_regularization', target.attendanceLogId);
    }

    // Sync refusal to server API
    fetch('/api/v1/attendance/regularization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refuse',
        instanceId: target.id,
        refusalNote: refusalNote.trim(),
        reviewerName: approver,
        reviewerCode: _reviewerCode,
      }),
    }).catch((err) => console.warn('Server refuse sync warning:', err));

    // Send Notification to Employee
    createNotification({
      title: `Attendance Regularization Refused: ${target.date}`,
      message: `Your attendance regularization for ${target.date} was refused by ${approver}. Note: "${refusalNote.trim()}"`,
      category: 'time_off',
      channel: 'in_app',
      actionUrl: '/attendance',
      targetEmployeeCode: target.employeeCode,
      relatedEntity: { type: 'attendance_regularization', id: target.id },
    });
  }

  return { success: true, item: target };
}
