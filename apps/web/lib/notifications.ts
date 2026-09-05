import { getCurrentUserSession, UserSessionData } from './user-profile-sync';
import { fetchLeaveRequests, LeaveRequestItem } from './supabase-time-off';
import { getLocalRegularizations, AttendanceRegularizationItem } from './supabase-regularization';

export interface AppNotification {
  id: string;
  userId?: string | undefined;
  targetEmployeeCode?: string | undefined;
  targetEmail?: string | undefined;
  targetSupervisorName?: string | undefined;
  title: string;
  message: string;
  category: 'approvals' | 'time_off' | 'circulars' | 'system';
  channel?: 'in_app' | 'email' | undefined;
  isRead: boolean;
  actionUrl: string;
  createdAt: string;
  relatedEntity?: {
    type: string;
    id: string;
  } | undefined;
}

const STORAGE_KEY_NOTIFICATIONS = 'jaago_user_notifications_v2';
const STORAGE_KEY_READ_IDS = 'jaago_read_notification_ids_v1';

/**
 * Fetch list of IDs marked as read by the user
 */
export function getReadNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READ_IDS);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      return new Set(parsed);
    }
  } catch {}
  return new Set();
}

/**
 * Save read notification IDs to localStorage
 */
function saveReadNotificationIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_READ_IDS, JSON.stringify(Array.from(ids)));
  } catch {}
}

/**
 * Fetch all manually created stored notifications from localStorage
 */
export function getAllStoredNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (raw) {
      const parsed: AppNotification[] = JSON.parse(raw);
      // Clean any legacy mock entries
      return parsed.filter((n) => !['notif-001', 'notif-002', 'notif-003'].includes(n.id));
    }
  } catch {}
  return [];
}

/**
 * Helper to generate dynamic notifications from leave requests for the given user session
 */
function generateDynamicLeaveNotifications(
  leaveRequests: LeaveRequestItem[],
  session: UserSessionData | null,
  readIds: Set<string>
): AppNotification[] {
  if (!session) return [];

  const dynamicNotifs: AppNotification[] = [];
  const userCode = session.employeeCode?.trim().toLowerCase();
  const userName = session.fullName?.trim() || 'Supervisor';
  const userEmail = (session.email || '').trim().toLowerCase();
  const isSuperAdmin =
    (session.roles || []).includes('super_admin') ||
    userEmail.includes('nasif.kamal') ||
    userName.toLowerCase().includes('nasif kamal');

  for (const req of leaveRequests) {
    const isSelfRequest = Boolean(userCode && req.employeeCode?.trim().toLowerCase() === userCode);

    // 1. Pending Approvals for Supervisors / Managers / Super Admin (EXCLUDING self-requests!)
    if (req.status === 'Pending' && !isSelfRequest) {
      const notifId = `notif-leave-pending-${req.id}`;
      const isRead = readIds.has(notifId);

      dynamicNotifs.push({
        id: notifId,
        title: `Approval Required: ${req.leaveType} (${req.employeeName})`,
        message: `${req.employeeName} (${req.employeeCode}) requested ${req.totalDays} Day(s) of ${req.leaveType} from ${req.fromDate} to ${req.toDate}.${req.reason ? ` Reason: "${req.reason}"` : ''}`,
        category: 'approvals',
        channel: 'in_app',
        isRead,
        actionUrl: `/workflows?requestId=${encodeURIComponent(req.id)}`,
        createdAt: req.appliedAt || new Date().toISOString(),
        targetSupervisorName: userName,
        targetEmployeeCode: userCode || undefined,
        relatedEntity: { type: 'leave_request', id: req.id },
      });
    }

    // 2. Decision Status Notifications for the Requester and Super Admin
    if ((isSelfRequest || isSuperAdmin) && (req.status === 'Approved' || req.status === 'Rejected' || (req.status as string) === 'Refused')) {
      const isApproved = req.status === 'Approved';
      const notifId = `notif-leave-decision-${req.id}-${req.status}`;
      const isRead = readIds.has(notifId);

      dynamicNotifs.push({
        id: notifId,
        title: `Leave Request ${isApproved ? 'Approved' : 'Refused'}: ${req.employeeName} - ${req.leaveType}`,
        message: isApproved
          ? `Leave request for ${req.employeeName} (${req.totalDays} Day(s) of ${req.leaveType}, ${req.fromDate} to ${req.toDate}) has been approved by ${req.approvedBy || 'Supervisor'}.`
          : `Leave request for ${req.employeeName} (${req.totalDays} Day(s) of ${req.leaveType}) was refused by ${req.approvedBy || 'Supervisor'}.${req.rejectionReason ? ` Note: "${req.rejectionReason}"` : ''}`,
        category: 'time_off',
        channel: 'in_app',
        isRead,
        actionUrl: `/leaves`,
        createdAt: req.approvedAt || req.appliedAt || new Date().toISOString(),
        targetEmployeeCode: isSelfRequest ? userCode : req.employeeCode,
        relatedEntity: { type: 'leave_request', id: req.id },
      });
    }
  }

  return dynamicNotifs;
}

/**
 * Helper to generate dynamic notifications from attendance regularization requests for the given user session
 */
function generateDynamicRegularizationNotifications(
  regList: AttendanceRegularizationItem[],
  session: UserSessionData | null,
  readIds: Set<string>
): AppNotification[] {
  if (!session) return [];

  const dynamicNotifs: AppNotification[] = [];
  const userCode = session.employeeCode?.trim().toLowerCase();
  const userName = (session.fullName || '').trim().toLowerCase();
  const userEmail = (session.email || '').trim().toLowerCase();
  const isSuperAdmin =
    (session.roles || []).includes('super_admin') ||
    userEmail.includes('nasif.kamal') ||
    userName.includes('nasif kamal');

  for (const reg of regList) {
    const itemRequesterCode = (reg.employeeCode || '').trim().toLowerCase();
    const itemRequesterName = (reg.employeeName || '').trim().toLowerCase();
    const itemSupervisorName = (reg.supervisorName || '').trim().toLowerCase();
    const itemSupervisorEmail = (reg.supervisorEmail || '').trim().toLowerCase();

    const isSelfRequest = Boolean(
      (userCode && itemRequesterCode === userCode) ||
      (userName && itemRequesterName && (itemRequesterName === userName || itemRequesterName.includes(userName) || userName.includes(itemRequesterName)))
    );

    const isSupervisorOrAdmin =
      isSuperAdmin ||
      (userName && (itemSupervisorName.includes(userName) || userName.includes(itemSupervisorName))) ||
      (userEmail && itemSupervisorEmail === userEmail);

    // 1. Pending Approvals for Supervisors & Super Admin (EXCLUDING self-requests!)
    if (reg.status === 'Pending' && !isSelfRequest && isSupervisorOrAdmin) {
      const notifId = `notif-reg-pending-${reg.id}`;
      const isRead = readIds.has(notifId);

      dynamicNotifs.push({
        id: notifId,
        title: `Regularization Required: ${reg.employeeName} (${reg.date})`,
        message: `${reg.employeeName} (${reg.employeeCode}) requested attendance correction for ${reg.date} (${reg.adjustedCheckIn} - ${reg.adjustedCheckOut}). Reason: "${reg.reason}"`,
        category: 'approvals',
        channel: 'in_app',
        isRead,
        actionUrl: `/workflows?requestId=${encodeURIComponent(reg.id)}`,
        createdAt: reg.appliedAt || reg.createdAt || new Date().toISOString(),
        targetSupervisorName: reg.supervisorName || session.fullName || 'Supervisor',
        targetEmployeeCode: userCode || undefined,
        relatedEntity: { type: 'attendance_regularization', id: reg.id },
      });
    }

    // 2. Decision Status Notifications for the Requester & Super Admin
    if ((isSelfRequest || isSuperAdmin) && (reg.status === 'Approved' || reg.status === 'Refused' || reg.status === 'Rejected')) {
      const isApproved = reg.status === 'Approved';
      const notifId = `notif-reg-decision-${reg.id}-${reg.status}`;
      const isRead = readIds.has(notifId);

      dynamicNotifs.push({
        id: notifId,
        title: `Regularization ${isApproved ? 'Approved' : 'Refused'}: ${reg.employeeName} (${reg.date})`,
        message: isApproved
          ? `Attendance regularization for ${reg.employeeName} on ${reg.date} (${reg.adjustedCheckIn} - ${reg.adjustedCheckOut}) has been approved by ${reg.approvedBy || 'Supervisor'}.`
          : `Attendance regularization for ${reg.employeeName} on ${reg.date} was refused by ${reg.approvedBy || 'Supervisor'}.${reg.refusalNote ? ` Note: "${reg.refusalNote}"` : ''}`,
        category: 'time_off',
        channel: 'in_app',
        isRead,
        actionUrl: `/attendance`,
        createdAt: reg.approvedAt || reg.updatedAt || reg.appliedAt || new Date().toISOString(),
        targetEmployeeCode: isSelfRequest ? userCode : reg.employeeCode,
        relatedEntity: { type: 'attendance_regularization', id: reg.id },
      });
    }
  }

  return dynamicNotifs;
}

/**
 * Fetch notifications synchronously from local cache and stored entries
 */
export function fetchUserNotifications(sessionUser?: UserSessionData | null): AppNotification[] {
  const session = sessionUser || getCurrentUserSession();
  const stored = getAllStoredNotifications();
  const readIds = getReadNotificationIds();

  // Read cached leave requests if available
  let cachedRequests: LeaveRequestItem[] = [];
  let cachedRegs: AttendanceRegularizationItem[] = [];
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('jaago_pnc_leave_requests_v3');
      if (cached) cachedRequests = JSON.parse(cached);
    } catch {}
    try {
      cachedRegs = getLocalRegularizations();
    } catch {}
  }

  const dynamicLeaves = generateDynamicLeaveNotifications(cachedRequests, session, readIds);
  const dynamicRegs = generateDynamicRegularizationNotifications(cachedRegs, session, readIds);

  const userCode = session?.employeeCode?.trim().toLowerCase();
  const userEmail = session?.email?.trim().toLowerCase();
  const userName = session?.fullName?.trim().toLowerCase();
  const isSuperAdmin =
    (session?.roles || []).includes('super_admin') ||
    (userEmail || '').includes('nasif.kamal');

  const filteredStored = stored.filter((n) => {
    if (readIds.has(n.id)) n.isRead = true;
    if (n.targetEmployeeCode && userCode && n.targetEmployeeCode.toLowerCase() === userCode) return true;
    if (n.targetEmail && userEmail && n.targetEmail.toLowerCase() === userEmail) return true;
    if (n.targetSupervisorName && userName && (n.targetSupervisorName.toLowerCase() === userName || n.targetSupervisorName.toLowerCase().includes(userName) || userName.includes(n.targetSupervisorName.toLowerCase()))) return true;
    if (n.userId && session?.id && n.userId === session.id) return true;
    if (n.targetEmployeeCode === '*' || (!n.targetEmployeeCode && !n.targetEmail && !n.targetSupervisorName)) {
      return true;
    }
    if (isSuperAdmin && (n.category === 'approvals' || n.category === 'time_off')) {
      return true;
    }
    return false;
  });

  // Combine and deduplicate by id
  const map = new Map<string, AppNotification>();
  dynamicLeaves.forEach((n) => map.set(n.id, n));
  dynamicRegs.forEach((n) => map.set(n.id, n));
  filteredStored.forEach((n) => {
    if (map.has(n.id)) {
      const existing = map.get(n.id)!;
      existing.isRead = existing.isRead || n.isRead;
    } else {
      map.set(n.id, n);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Fetch live notifications asynchronously from Supabase & API
 */
export async function fetchUserNotificationsAsync(
  sessionUser?: UserSessionData | null
): Promise<AppNotification[]> {
  const session = sessionUser || getCurrentUserSession();
  const stored = getAllStoredNotifications();
  const readIds = getReadNotificationIds();

  let liveRequests: LeaveRequestItem[] = [];
  let liveRegs: AttendanceRegularizationItem[] = [];
  try {
    liveRequests = await fetchLeaveRequests();
  } catch {}

  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
    const regRes = await fetch('/api/v1/attendance/regularization', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const regData = await regRes.json();
    if (regData.success && Array.isArray(regData.data)) {
      liveRegs = regData.data;
    } else {
      liveRegs = getLocalRegularizations();
    }
  } catch {
    liveRegs = getLocalRegularizations();
  }

  const dynamicLeaves = generateDynamicLeaveNotifications(liveRequests, session, readIds);
  const dynamicRegs = generateDynamicRegularizationNotifications(liveRegs, session, readIds);

  const userCode = session?.employeeCode?.trim().toLowerCase();
  const userEmail = session?.email?.trim().toLowerCase();
  const userName = session?.fullName?.trim().toLowerCase();
  const isSuperAdmin =
    (session?.roles || []).includes('super_admin') ||
    (userEmail || '').includes('nasif.kamal');

  const filteredStored = stored.filter((n) => {
    if (readIds.has(n.id)) n.isRead = true;
    if (n.targetEmployeeCode && userCode && n.targetEmployeeCode.toLowerCase() === userCode) return true;
    if (n.targetEmail && userEmail && n.targetEmail.toLowerCase() === userEmail) return true;
    if (n.targetSupervisorName && userName && (n.targetSupervisorName.toLowerCase() === userName || n.targetSupervisorName.toLowerCase().includes(userName) || userName.includes(n.targetSupervisorName.toLowerCase()))) return true;
    if (n.userId && session?.id && n.userId === session.id) return true;
    if (n.targetEmployeeCode === '*' || (!n.targetEmployeeCode && !n.targetEmail && !n.targetSupervisorName)) {
      return true;
    }
    if (isSuperAdmin && (n.category === 'approvals' || n.category === 'time_off')) {
      return true;
    }
    return false;
  });

  const map = new Map<string, AppNotification>();
  dynamicLeaves.forEach((n) => map.set(n.id, n));
  dynamicRegs.forEach((n) => map.set(n.id, n));
  filteredStored.forEach((n) => {
    if (map.has(n.id)) {
      const existing = map.get(n.id)!;
      existing.isRead = existing.isRead || n.isRead;
    } else {
      map.set(n.id, n);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Create and broadcast a new real-time notification
 */
export function createNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string }
): AppNotification {
  const newNotif: AppNotification = {
    ...notification,
    id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getAllStoredNotifications();
      const updated = [newNotif, ...current.filter((n) => n.id !== newNotif.id)].slice(0, 100);
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));

      window.dispatchEvent(
        new CustomEvent('jaago_notifications_updated', {
          detail: { notification: newNotif, all: updated },
        })
      );
    } catch {}
  }

  return newNotif;
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const readIds = getReadNotificationIds();
    readIds.add(id);
    saveReadNotificationIds(readIds);

    const all = getAllStoredNotifications();
    const updated = all.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent('jaago_notifications_updated', {
        detail: { readId: id, all: updated },
      })
    );
  } catch {}
}

/**
 * Mark all notifications for the active user as read
 */
export function markAllNotificationsAsRead(sessionUser?: UserSessionData | null): void {
  if (typeof window === 'undefined') return;
  try {
    const userNotifs = fetchUserNotifications(sessionUser);
    const readIds = getReadNotificationIds();
    userNotifs.forEach((n) => readIds.add(n.id));
    saveReadNotificationIds(readIds);

    const all = getAllStoredNotifications();
    const updated = all.map((n) => (readIds.has(n.id) ? { ...n, isRead: true } : n));
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent('jaago_notifications_updated', {
        detail: { all: updated },
      })
    );
  } catch {}
}

/**
 * Get unread notifications count for active user
 */
export function getUnreadNotificationCount(sessionUser?: UserSessionData | null): number {
  const notifs = fetchUserNotifications(sessionUser);
  return notifs.filter((n) => !n.isRead).length;
}
