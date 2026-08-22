import { pgTable, uuid, varchar, text, numeric, date, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 50 }).default('active').notNull(),
    startDate: date('start_date'),
    endDate: date('end_date'),
    budget: numeric('budget', { precision: 15, scale: 2 }).default('0.00').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_projects_org_id').on(table.organizationId),
    index('idx_projects_code').on(table.code),
    index('idx_projects_status').on(table.status),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
