import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { departments } from './departments';
import { branches } from './branches';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(), // Foreign key to Supabase auth.users.id
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 50 }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    jobTitle: varchar('job_title', { length: 255 }),
    avatarUrl: text('avatar_url'),
    status: varchar('status', { length: 50 }).default('active').notNull(), // active, suspended, invited
    isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_org_id').on(table.organizationId),
    index('idx_users_email').on(table.email),
    index('idx_users_dept_id').on(table.departmentId),
    index('idx_users_status').on(table.status),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
