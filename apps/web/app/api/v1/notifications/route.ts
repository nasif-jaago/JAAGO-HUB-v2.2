import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-auth';
import { getServerRegularizations } from '@/lib/server-regularization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ServerNotification {
  id: string;
  userId?: string;
  targetEmployeeCode?: string;
  targetEmail?: string;
  targetSupervisorName?: string;
  title: string;
  message: string;
  category: 'approvals' | 'time_off' | 'circulars' | 'system';
  channel?: 'in_app' | 'email';
  isRead: boolean;
  actionUrl: string;
  createdAt: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
}

const liveNotifications: ServerNotification[] = [];
const readNotificationIds = new Set<string>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = (searchParams.get('userEmail') || '').toLowerCase().trim();
    const userCode = (searchParams.get('userCode') || '').toLowerCase().trim();
    const userName = (searchParams.get('userName') || '').toLowerCase().trim();
    const role = (searchParams.get('role') || 'staff').toLowerCase().trim();
    const isSuperAdmin =
      role === 'super_admin' ||
      role === 'pnc_manager' ||
      userEmail.includes('nasif.kamal') ||
      userName.includes('nasif kamal');

    // 1. Synthesize real-time notifications from Supabase leave requests
    const dynamicNotifs: ServerNotification[] = [];
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data: leaveRows } = await supabase
          .from('leave_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (Array.isArray(leaveRows)) {
          for (const req of leaveRows) {
            const reqCode = (req.employee_code || '').toLowerCase().trim();
            const reqName = (req.employee_name || '').toLowerCase().trim();
            const isSelfRequest = Boolean(
              (userCode && reqCode === userCode) ||
              (userName && reqName && (reqName === userName || reqName.includes(userName) || userName.includes(reqName)))
            );

            // Clean reason
            const rawReason = req.reason || '';
            const cleanReason = rawReason
              .replace(/\[Attachment:\s*.*?\]/g, '')
              .replace(/\[Refusal Note:\s*.*?\]/g, '')
              .trim();

            // Refusal note
            let refusalReason = req.rejection_reason || '';
            if (!refusalReason && rawReason.includes('[Refusal Note:')) {
              const match = rawReason.match(/\[Refusal Note:\s*(.*?)\]/);
              if (match) refusalReason = match[1].trim();
            }

            // A. Pending Approvals for Supervisors / Super Admin (EXCLUDING self-requests!)
            if (req.status === 'Pending' && !isSelfRequest) {
              const notifId = `notif-leave-pending-${req.id}`;
              if (readNotificationIds.has(notifId)) continue;

              dynamicNotifs.push({
                id: notifId,
                title: `Approval Required: ${req.leave_type || 'Leave'} (${req.employee_name})`,
                message: `${req.employee_name} (${req.employee_code}) requested ${req.total_days || 1} Day(s) of ${req.leave_type || 'Leave'} from ${req.from_date} to ${req.to_date}.${cleanReason ? ` Reason: "${cleanReason}"` : ''}`,
                category: 'approvals',
                channel: 'in_app',
                isRead: false,
                actionUrl: `/workflows?requestId=${encodeURIComponent(req.id)}`,
                createdAt: req.applied_at || req.created_at || new Date().toISOString(),
                targetSupervisorName: userName || 'Supervisor',
                targetEmployeeCode: userCode,
                relatedEntity: { type: 'leave_request', id: req.id },
              });
            }

            // B. Decision Status Notifications ONLY for the Requester (NOT for Super Admin)
            if (isSelfRequest && (req.status === 'Approved' || req.status === 'Rejected' || req.status === 'Refused')) {
              const isApproved = req.status === 'Approved';
              const notifId = `notif-leave-decision-${req.id}-${req.status}`;
              if (readNotificationIds.has(notifId)) continue;

              dynamicNotifs.push({
                id: notifId,
                title: `Leave Request ${isApproved ? 'Approved' : 'Refused'}: ${req.leave_type || 'Leave'}`,
                message: isApproved
                  ? `Your leave request for ${req.total_days || 1} Day(s) of ${req.leave_type} (${req.from_date} to ${req.to_date}) has been approved by ${req.approved_by || 'Supervisor'}.`
                  : `Your leave request for ${req.total_days || 1} Day(s) of ${req.leave_type} was refused by ${req.approved_by || 'Supervisor'}.${refusalReason ? ` Note: "${refusalReason}"` : ''}`,
                category: 'time_off',
                channel: 'in_app',
                isRead: false,
                actionUrl: `/leaves`,
                createdAt: req.approved_at || req.updated_at || req.applied_at || new Date().toISOString(),
                targetEmployeeCode: userCode,
                relatedEntity: { type: 'leave_request', id: req.id },
              });
            }
          }
        }
      }
    } catch (leaveErr) {
      console.warn('Notifications route Leave sync error:', leaveErr);
    }

    // 1.5 Synthesize real-time notifications from Attendance Regularizations
    try {
      const regRows = await getServerRegularizations();
      if (Array.isArray(regRows)) {
        for (const reg of regRows) {
          const reqCode = (reg.employeeCode || '').toLowerCase().trim();
          const reqName = (reg.employeeName || '').toLowerCase().trim();
          const supName = (reg.supervisorName || '').toLowerCase().trim();
          const supEmail = (reg.supervisorEmail || '').toLowerCase().trim();

          const isSelfRequest = Boolean(
            (userCode && reqCode === userCode) ||
            (userName && reqName && (reqName === userName || reqName.includes(userName) || userName.includes(reqName)))
          );

          const isSupervisorOrAdmin =
            isSuperAdmin ||
            (userName && (supName.includes(userName) || userName.includes(supName))) ||
            (userEmail && supEmail === userEmail);

          // A. Pending Regularization for Supervisor / Super Admin (EXCLUDING self-requests!)
          if (reg.status === 'Pending' && !isSelfRequest && isSupervisorOrAdmin) {
            const notifId = `notif-reg-pending-${reg.id}`;
            if (readNotificationIds.has(notifId)) continue;

            dynamicNotifs.push({
              id: notifId,
              title: `Regularization Required: ${reg.employeeName} (${reg.date})`,
              message: `${reg.employeeName} (${reg.employeeCode}) requested attendance correction for ${reg.date} (${reg.adjustedCheckIn} - ${reg.adjustedCheckOut}). Reason: "${reg.reason}"`,
              category: 'approvals',
              channel: 'in_app',
              isRead: false,
              actionUrl: `/workflows?requestId=${encodeURIComponent(reg.id)}`,
              createdAt: reg.appliedAt || reg.createdAt || new Date().toISOString(),
              targetSupervisorName: reg.supervisorName || userName || 'Supervisor',
              targetEmployeeCode: userCode,
              relatedEntity: { type: 'attendance_regularization', id: reg.id },
            });
          }

          // B. Decision Status Notifications ONLY for the Requester (NOT broadcasted to Super Admin)
          if (isSelfRequest && (reg.status === 'Approved' || reg.status === 'Refused' || reg.status === 'Rejected')) {
            const isApproved = reg.status === 'Approved';
            const notifId = `notif-reg-decision-${reg.id}-${reg.status}`;
            if (readNotificationIds.has(notifId)) continue;

            dynamicNotifs.push({
              id: notifId,
              title: `Regularization ${isApproved ? 'Approved' : 'Refused'}: ${reg.employeeName} (${reg.date})`,
              message: isApproved
                ? `Your attendance regularization for ${reg.date} (${reg.adjustedCheckIn} - ${reg.adjustedCheckOut}) has been approved by ${reg.approvedBy || 'Supervisor'}.`
                : `Your attendance regularization for ${reg.date} was refused by ${reg.approvedBy || 'Supervisor'}.${reg.refusalNote ? ` Note: "${reg.refusalNote}"` : ''}`,
              category: 'time_off',
              channel: 'in_app',
              isRead: false,
              actionUrl: `/attendance`,
              createdAt: reg.approvedAt || reg.updatedAt || reg.appliedAt || new Date().toISOString(),
              targetEmployeeCode: userCode,
              relatedEntity: { type: 'attendance_regularization', id: reg.id },
            });
          }
        }
      }
    } catch (regErr) {
      console.warn('Notifications route Regularization sync error:', regErr);
    }

    // 2. Filter live manual notifications
    const filteredLive = liveNotifications.filter((n) => {
      if (readNotificationIds.has(n.id)) return false;
      if (n.targetEmail && userEmail && n.targetEmail.toLowerCase() === userEmail) return true;
      if (n.targetEmployeeCode && userCode && n.targetEmployeeCode.toLowerCase() === userCode) return true;
      if (n.targetSupervisorName && userName && n.targetSupervisorName.toLowerCase() === userName) return true;
      if (isSuperAdmin && n.category === 'approvals') return true;
      if (n.targetEmployeeCode === '*' || (!n.targetEmployeeCode && !n.targetEmail && !n.targetSupervisorName)) return true;
      return false;
    });

    // 3. Merge and deduplicate by id
    const notifMap = new Map<string, ServerNotification>();
    dynamicNotifs.forEach((n) => notifMap.set(n.id, n));
    filteredLive.forEach((n) => {
      if (!notifMap.has(n.id)) {
        notifMap.set(n.id, n);
      }
    });

    const finalNotifications = Array.from(notifMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const unreadCount = finalNotifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      data: finalNotifications,
      meta: {
        total: finalNotifications.length,
        unreadCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, notificationId, entityId, notification, userEmail } = body;

    if (action === 'create' && notification) {
      const newItem: ServerNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        ...notification,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      liveNotifications.unshift(newItem);
      return NextResponse.json({ success: true, data: newItem });
    }

    if (action === 'mark_all_read') {
      const email = (userEmail || '').toLowerCase().trim();
      liveNotifications.forEach((n) => {
        if (!n.targetEmail || (email && n.targetEmail.toLowerCase() === email)) {
          n.isRead = true;
          readNotificationIds.add(n.id);
        }
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'mark_read' && notificationId) {
      readNotificationIds.add(notificationId);
      const item = liveNotifications.find((n) => n.id === notificationId);
      if (item) item.isRead = true;
      return NextResponse.json({ success: true });
    }

    if (action === 'dismiss_entity' && entityId) {
      readNotificationIds.add(`notif-leave-pending-${entityId}`);
      readNotificationIds.add(`notif-reg-pending-${entityId}`);
      readNotificationIds.add(`notif-leave-decision-${entityId}-Approved`);
      readNotificationIds.add(`notif-leave-decision-${entityId}-Rejected`);
      readNotificationIds.add(`notif-leave-decision-${entityId}-Refused`);
      readNotificationIds.add(`notif-reg-decision-${entityId}-Approved`);
      readNotificationIds.add(`notif-reg-decision-${entityId}-Refused`);
      readNotificationIds.add(`notif-reg-decision-${entityId}-Rejected`);

      // Remove matching items from live array
      for (let i = liveNotifications.length - 1; i >= 0; i--) {
        const item = liveNotifications[i];
        if (
          item?.relatedEntity?.id === entityId ||
          item?.id.includes(entityId) ||
          item?.actionUrl.includes(entityId)
        ) {
          liveNotifications.splice(i, 1);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
