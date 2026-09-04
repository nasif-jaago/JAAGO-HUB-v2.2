import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-auth';

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
            const isSelfRequest = Boolean(userCode && reqCode === userCode);

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
              const isRead = readNotificationIds.has(notifId);

              dynamicNotifs.push({
                id: notifId,
                title: `Approval Required: ${req.leave_type || 'Leave'} (${req.employee_name})`,
                message: `${req.employee_name} (${req.employee_code}) requested ${req.total_days || 1} Day(s) of ${req.leave_type || 'Leave'} from ${req.from_date} to ${req.to_date}.${cleanReason ? ` Reason: "${cleanReason}"` : ''}`,
                category: 'approvals',
                channel: 'in_app',
                isRead,
                actionUrl: `/workflows?requestId=${encodeURIComponent(req.id)}`,
                createdAt: req.applied_at || req.created_at || new Date().toISOString(),
                targetSupervisorName: userName,
                targetEmployeeCode: userCode,
                relatedEntity: { type: 'leave_request', id: req.id },
              });
            }

            // B. Decision Status Notifications for the Requester
            if (isSelfRequest && (req.status === 'Approved' || req.status === 'Rejected' || req.status === 'Refused')) {
              const isApproved = req.status === 'Approved';
              const notifId = `notif-leave-decision-${req.id}-${req.status}`;
              const isRead = readNotificationIds.has(notifId);

              dynamicNotifs.push({
                id: notifId,
                title: `Leave Request ${isApproved ? 'Approved' : 'Refused'}: ${req.leave_type || 'Leave'}`,
                message: isApproved
                  ? `Your leave request for ${req.total_days || 1} Day(s) of ${req.leave_type} (${req.from_date} to ${req.to_date}) has been approved by ${req.approved_by || 'Supervisor'}.`
                  : `Your leave request for ${req.total_days || 1} Day(s) of ${req.leave_type} was refused by ${req.approved_by || 'Supervisor'}.${refusalReason ? ` Note: "${refusalReason}"` : ''}`,
                category: 'time_off',
                channel: 'in_app',
                isRead,
                actionUrl: `/leaves`,
                createdAt: req.approved_at || req.updated_at || req.applied_at || new Date().toISOString(),
                targetEmployeeCode: userCode,
                relatedEntity: { type: 'leave_request', id: req.id },
              });
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('Notifications route Supabase sync error:', dbErr);
    }

    // 2. Filter live manual notifications
    const filteredLive = liveNotifications.filter((n) => {
      if (readNotificationIds.has(n.id)) n.isRead = true;
      if (n.targetEmail && userEmail && n.targetEmail.toLowerCase() === userEmail) return true;
      if (n.targetEmployeeCode && userCode && n.targetEmployeeCode.toLowerCase() === userCode) return true;
      if (n.targetSupervisorName && userName && n.targetSupervisorName.toLowerCase() === userName) return true;
      if (isSuperAdmin && n.category === 'approvals') return true;
      if (n.targetEmployeeCode === '*') return true;
      return false;
    });

    // 3. Merge and deduplicate by id
    const notifMap = new Map<string, ServerNotification>();
    dynamicNotifs.forEach((n) => notifMap.set(n.id, n));
    filteredLive.forEach((n) => notifMap.set(n.id, n));

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
    const { action, notificationId, notification, userEmail } = body;

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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
