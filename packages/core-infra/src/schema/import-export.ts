import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const importJobs = pgTable(
  'import_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: varchar('entity_type', { length: 100 }).notNull(), // 'employees', 'contacts', 'students', 'inventory'
    status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending' | 'validating' | 'processing' | 'completed' | 'failed'
    totalRows: integer('total_rows').default(0).notNull(),
    processedRows: integer('processed_rows').default(0).notNull(),
    errorCount: integer('error_count').default(0).notNull(),
    errorLog: jsonb('error_log').default([]),
    storageKey: varchar('storage_key', { length: 500 }),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_imports_org').on(table.organizationId),
    index('idx_imports_status').on(table.status),
  ],
);

export const exportJobs = pgTable(
  'export_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    format: varchar('format', { length: 20 }).default('csv').notNull(), // 'csv' | 'xlsx' | 'pdf'
    status: varchar('status', { length: 50 }).default('pending').notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
    downloadUrl: text('download_url'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    requestedBy: uuid('requested_by').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_exports_org').on(table.organizationId),
    index('idx_exports_status').on(table.status),
  ],
);

export type ImportJob = typeof importJobs.$inferSelect;
export type ExportJob = typeof exportJobs.$inferSelect;
