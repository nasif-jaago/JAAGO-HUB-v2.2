import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    action: varchar('action', { length: 100 }).notNull(), // e.g. "user.role.updated", "invoice.approved"
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: varchar('entity_id', { length: 255 }).notNull(),
    previousState: jsonb('previous_state'),
    newState: jsonb('new_state'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    traceId: varchar('trace_id', { length: 100 }).notNull(),
    previousHash: varchar('previous_hash', { length: 64 }).notNull(), // SHA256 of prior record
    currentHash: varchar('current_hash', { length: 64 }).notNull(),  // SHA256(prevHash + timestamp + orgId + action + entityId + newState)
  },
  (table) => [
    index('idx_audit_org_id').on(table.organizationId),
    index('idx_audit_action').on(table.action),
    index('idx_audit_entity').on(table.entityType, table.entityId),
    index('idx_audit_timestamp').on(table.timestamp),
    index('idx_audit_trace_id').on(table.traceId),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
