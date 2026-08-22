import { createApiHandler } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sampleNotifications = [
  {
    id: 'notif-001',
    userId: 'aaaa1111-aaaa-4aaa-aaaa-111111111111',
    title: 'Tier 2 Approval Required',
    message: 'Annual Leave Request for Habibur Rahman is awaiting your review.',
    category: 'approvals',
    channel: 'in_app',
    isRead: false,
    actionUrl: '/workflows',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'notif-002',
    userId: 'aaaa1111-aaaa-4aaa-aaaa-111111111111',
    title: 'New Circular Published',
    message: 'JAAGO Foundation: Independence Day Holiday Notice has been posted.',
    category: 'circulars',
    channel: 'in_app',
    isRead: false,
    actionUrl: '/admin/modules',
    createdAt: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
  },
  {
    id: 'notif-003',
    userId: 'aaaa1111-aaaa-4aaa-aaaa-111111111111',
    title: 'Security Alert: Password Verified',
    message: 'MFA session established from IP 192.168.10.69.',
    category: 'security',
    channel: 'in_app',
    isRead: true,
    actionUrl: '/admin/logs',
    createdAt: new Date(Date.now() - 1000 * 3600 * 5).toISOString(),
  },
];

export const GET = createApiHandler({
  requireAuth: true,
  async handler(_request, context) {
    const unreadCount = sampleNotifications.filter((n) => !n.isRead).length;

    return Response.json({
      data: sampleNotifications,
      meta: {
        total: sampleNotifications.length,
        unreadCount,
        organizationId: context.organizationId,
      },
    });
  },
});

export const POST = createApiHandler({
  requireAuth: true,
  async handler(request, _context) {
    const body = await request.json();
    const { action, notificationId } = body;

    if (action === 'mark_all_read') {
      sampleNotifications.forEach((n) => (n.isRead = true));
    } else if (action === 'mark_read' && notificationId) {
      const item = sampleNotifications.find((n) => n.id === notificationId);
      if (item) item.isRead = true;
    }

    return Response.json({ success: true });
  },
});
