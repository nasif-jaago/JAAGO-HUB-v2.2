import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const apiClients = pgTable(
  'api_clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: varchar('client_id', { length: 100 }).notNull().unique(), // e.g. jg_live_xxxx or jg_test_xxxx
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    hashedSecret: varchar('hashed_secret', { length: 255 }).notNull(),
    scopes: jsonb('scopes').$type<string[]>().default([]).notNull(),
    rateLimitTier: varchar('rate_limit_tier', { length: 50 }).default('API').notNull(), // 'API' | 'REPORTS' | 'INTEGRATION'
    isActive: boolean('is_active').default(true).notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_api_clients_org').on(table.organizationId),
    index('idx_api_clients_cid').on(table.clientId),
  ],
);

export const apiUsageMetrics = pgTable(
  'api_usage_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id').references(() => apiClients.id, { onDelete: 'cascade' }),
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    statusCode: integer('status_code').notNull(),
    durationMs: integer('duration_ms').notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_api_usage_client').on(table.clientId),
    index('idx_api_usage_timestamp').on(table.timestamp),
  ],
);

export type ApiClient = typeof apiClients.$inferSelect;
export type ApiUsageMetric = typeof apiUsageMetrics.$inferSelect;
