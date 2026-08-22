import { pgTable, uuid, varchar, timestamp, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => departments.id, { onDelete: 'set null' }),
    managerUserId: uuid('manager_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_departments_org_id').on(table.organizationId),
    index('idx_departments_code').on(table.code),
    index('idx_departments_parent_id').on(table.parentId),
  ],
);

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
