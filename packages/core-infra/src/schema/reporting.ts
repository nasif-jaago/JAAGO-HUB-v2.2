import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const reportDefinitions = pgTable(
  'report_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }).notNull(), // 'hr', 'finance', 'education', 'impact'
    parameters: jsonb('parameters').default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_report_defs_key').on(table.key),
    index('idx_report_defs_cat').on(table.category),
  ],
);

export const savedReports = pgTable(
  'saved_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    definitionKey: varchar('definition_key', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    filters: jsonb('filters').default({}),
    scheduleCron: varchar('schedule_cron', { length: 100 }),
    isScheduled: boolean('is_scheduled').default(false).notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_saved_reports_org').on(table.organizationId),
  ],
);

export const reportRuns = pgTable(
  'report_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    savedReportId: uuid('saved_report_id').references(() => savedReports.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).default('completed').notNull(),
    outputFormat: varchar('output_format', { length: 20 }).default('json').notNull(), // 'json' | 'csv' | 'pdf'
    outputUrl: text('output_url'),
    durationMs: varchar('duration_ms', { length: 50 }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    runBy: uuid('run_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_report_runs_saved').on(table.savedReportId),
    index('idx_report_runs_org').on(table.organizationId),
  ],
);

export type ReportDefinition = typeof reportDefinitions.$inferSelect;
export type SavedReport = typeof savedReports.$inferSelect;
export type ReportRun = typeof reportRuns.$inferSelect;
