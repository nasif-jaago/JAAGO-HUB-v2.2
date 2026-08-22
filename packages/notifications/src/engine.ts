import { NotificationPayload, NotificationItem } from './types';
import { globalFloodControl } from './flood-control';
import { getEmailAdapter } from './email-adapter';
import { renderWorkflowApprovalEmail } from './templates';
import { logger } from '@jaago/logger';

export class NotificationEngine {
  private inAppNotifications: NotificationItem[] = [];

  public async dispatch(payload: NotificationPayload): Promise<{
    deliveredInApp: boolean;
    deliveredEmail: boolean;
    floodSuppressed?: boolean;
  }> {
    // Check flood control
    if (!globalFloodControl.shouldAllow(payload.userId)) {
      logger.warn('SYSTEM', 'notification.flood_throttled', {
        organizationId: payload.organizationId,
        metadata: { userId: payload.userId, category: payload.category },
      });
      return { deliveredInApp: false, deliveredEmail: false, floodSuppressed: true };
    }

    const channels = payload.channels || ['in_app', 'email'];
    let deliveredInApp = false;
    let deliveredEmail = false;

    // 1. In-App Notification Delivery
    if (channels.includes('in_app')) {
      const item: NotificationItem = {
        id: payload.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: payload.userId,
        organizationId: payload.organizationId,
        title: payload.title,
        message: payload.message,
        category: payload.category,
        channel: 'in_app',
        isRead: false,
        actionUrl: payload.actionUrl,
        metadata: payload.metadata,
        createdAt: new Date().toISOString(),
      };
      this.inAppNotifications.unshift(item);
      deliveredInApp = true;
    }

    // 2. Email Delivery
    if (channels.includes('email') && payload.emailTo) {
      const adapter = getEmailAdapter();
      const rendered = renderWorkflowApprovalEmail({
        requesterName: 'Staff Member',
        workflowTitle: payload.title,
        tierNumber: 1,
        actionUrl: payload.actionUrl || 'http://localhost:3000/workflows',
      });

      await adapter.send({
        to: payload.emailTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      deliveredEmail = true;
    }

    return { deliveredInApp, deliveredEmail };
  }

  public getNotificationsForUser(userId: string): NotificationItem[] {
    return this.inAppNotifications.filter((n) => n.userId === userId);
  }

  public markAsRead(id: string, userId: string): boolean {
    const item = this.inAppNotifications.find((n) => n.id === id && n.userId === userId);
    if (item) {
      item.isRead = true;
      return true;
    }
    return false;
  }

  public markAllAsRead(userId: string): number {
    let count = 0;
    for (const item of this.inAppNotifications) {
      if (item.userId === userId && !item.isRead) {
        item.isRead = true;
        count++;
      }
    }
    return count;
  }
}

export const globalNotificationEngine = new NotificationEngine();
