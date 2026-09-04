import { getCurrentUserSession, UserSessionData } from './user-profile-sync';
import { fetchLeaveRequests, LeaveRequestItem } from './supabase-time-off';

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

    // 2. Decision Status Notifications for the Requester
    if (isSelfRequest && (req.status === 'Approved' || req.status === 'Rejected' || (req.status as string) === 'Refused')) {
      const isApproved = req.status === 'Approved';
      const notifId = `notif-leave-decision-${req.id}-${req.status}`;
      const isRead = readIds.has(notifId);

      dynamicNotifs.push({
        id: notifId,
        title: `Leave Request ${isApproved ? 'Approved' : 'Refused'}: ${req.leaveType}`,
        message: isApproved
          ? `Your leave request for ${req.totalDays} Day(s) of ${req.leaveType} (${req.fromDate} to ${req.toDate}) has been approved by ${req.approvedBy || 'Supervisor'}.`
          : `Your leave request for ${req.totalDays} Day(s) of ${req.leaveType} was refused by ${req.approvedBy || 'Supervisor'}.${req.rejectionReason ? ` Note: "${req.rejectionReason}"` : ''}`,
        category: 'time_off',
        channel: 'in_app',
        isRead,
        actionUrl: `/leaves`,
        createdAt: req.approvedAt || req.appliedAt || new Date().toISOString(),
        targetEmployeeCode: userCode || undefined,
        relatedEntity: { type: 'leave_request', id: req.id },
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
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('jaago_pnc_leave_requests_v3');
      if (cached) cachedRequests = JSON.parse(cached);
    } catch {}
  }

  const dynamic = generateDynamicLeaveNotifications(cachedRequests, session, readIds);

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
    if (n.targetSupervisorName && userName && n.targetSupervisorName.toLowerCase() === userName) return true;
    if (n.userId && session?.id && n.userId === session.id) return true;
    if (n.targetEmployeeCode === '*' || (!n.targetEmployeeCode && !n.targetEmail && !n.targetSupervisorName)) {
      return true;
    }
    if (isSuperAdmin && n.category === 'approvals') {
      return true;
    }
    return false;
  });

  // Combine and deduplicate by id
  const map = new Map<string, AppNotification>();
  dynamic.forEach((n) => map.set(n.id, n));
  filteredStored.forEach((n) => map.set(n.id, n));

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
  try {
    liveRequests = await fetchLeaveRequests();
  } catch {}

  const dynamic = generateDynamicLeaveNotifications(liveRequests, session, readIds);

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
    if (n.targetSupervisorName && userName && n.targetSupervisorName.toLowerCase() === userName) return true;
    if (n.userId && session?.id && n.userId === session.id) return true;
    if (n.targetEmployeeCode === '*' || (!n.targetEmployeeCode && !n.targetEmail && !n.targetSupervisorName)) {
      return true;
    }
    if (isSuperAdmin && n.category === 'approvals') {
      return true;
    }
    return false;
  });

  const map = new Map<string, AppNotification>();
  dynamic.forEach((n) => map.set(n.id, n));
  filteredStored.forEach((n) => map.set(n.id, n));

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Create and broadcast a new real-time notification
 */
export function createNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>
): AppNotification {
  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...notification,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getAllStoredNotifications();
      const updated = [newNotif, ...current].slice(0, 100);
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
