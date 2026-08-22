export type NotificationChannel = 'in_app' | 'email' | 'webhook' | 'push';
export type NotificationCategory = 'approvals' | 'security' | 'circulars' | 'system';

export interface NotificationPayload {
  id?: string | undefined;
  userId: string;
  organizationId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  channels?: NotificationChannel[] | undefined;
  actionUrl?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  emailTo?: string | undefined;
}

export interface NotificationItem {
  id: string;
  userId: string;
  organizationId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  isRead: boolean;
  actionUrl?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
}
