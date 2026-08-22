import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const applicationLogs = pgTable(
  'application_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    level: varchar('level', { length: 20 }).default('info').notNull(),
    eventType: varchar('event_type', { length: 50 }).default('SYSTEM').notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    environment: varchar('environment', { length: 50 }).default('production').notNull(),
    service: varchar('service', { length: 50 }).default('web').notNull(),
    traceId: varchar('trace_id', { length: 100 }).notNull(),
    requestId: varchar('request_id', { length: 100 }),
    userId: uuid('user_id'),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    route: varchar('route', { length: 255 }),
    httpMethod: varchar('http_method', { length: 10 }),
    statusCode: integer('status_code'),
    durationMs: integer('duration_ms'),
    errorCode: varchar('error_code', { length: 100 }),
    errorMessage: text('error_message'),
    errorStack: text('error_stack'),
    metadata: jsonb('metadata').default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
  },
  (table) => [
    index('idx_app_logs_timestamp').on(table.timestamp),
    index('idx_app_logs_trace_id').on(table.traceId),
    index('idx_app_logs_org_id').on(table.organizationId),
    index('idx_app_logs_level').on(table.level),
    index('idx_app_logs_event_type').on(table.eventType),
    index('idx_app_logs_action').on(table.action),
  ],
);

export type ApplicationLog = typeof applicationLogs.$inferSelect;
export type NewApplicationLog = typeof applicationLogs.$inferInsert;
