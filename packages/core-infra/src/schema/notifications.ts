import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    category: varchar('category', { length: 50 }).default('system').notNull(), // 'approvals', 'security', 'circulars', 'system'
    channel: varchar('channel', { length: 50 }).default('in_app').notNull(), // 'in_app', 'email', 'webhook'
    isRead: boolean('is_read').default(false).notNull(),
    actionUrl: varchar('action_url', { length: 255 }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user').on(table.userId),
    index('idx_notifications_unread').on(table.userId, table.isRead),
    index('idx_notifications_org').on(table.organizationId),
  ],
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    category: varchar('category', { length: 50 }).notNull(),
    emailEnabled: boolean('email_enabled').default(true).notNull(),
    inAppEnabled: boolean('in_app_enabled').default(true).notNull(),
    pushEnabled: boolean('push_enabled').default(false).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notif_pref_user_cat').on(table.userId, table.category),
  ],
);

export type NotificationRecord = typeof notifications.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
