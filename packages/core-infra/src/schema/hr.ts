import { pgTable, uuid, varchar, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const hrDepartments = pgTable(
  'hr_departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    headUserId: uuid('head_user_id').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_hr_dept_org').on(table.organizationId),
  ],
);

export const hrDesignations = pgTable(
  'hr_designations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 150 }).notNull(),
    grade: varchar('grade', { length: 20 }).notNull(),
    departmentId: uuid('department_id').references(() => hrDepartments.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_hr_desig_org').on(table.organizationId),
  ],
);

export const hrEmployees = pgTable(
  'hr_employees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeCode: varchar('employee_code', { length: 50 }).notNull().unique(), // e.g. EMP-001
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    branch: varchar('branch', { length: 100 }).notNull(), // 'Head Office (Banani)', 'Rayer Bazar School', 'Chittagong Campus', 'Bandarban Hub'
    departmentId: uuid('department_id').references(() => hrDepartments.id, { onDelete: 'set null' }),
    designationId: uuid('designation_id').references(() => hrDesignations.id, { onDelete: 'set null' }),
    supervisorId: uuid('supervisor_id'), // Self-referencing reporting hierarchy
    dateOfJoining: timestamp('date_of_joining', { withTimezone: true }).notNull(),
    employmentStatus: varchar('employment_status', { length: 50 }).default('active').notNull(), // 'active' | 'probation' | 'resigned' | 'terminated'
    salaryBdt: integer('salary_bdt').default(0).notNull(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_hr_emp_org').on(table.organizationId),
    index('idx_hr_emp_code').on(table.employeeCode),
    index('idx_hr_emp_dept').on(table.departmentId),
  ],
);

export type HrDepartment = typeof hrDepartments.$inferSelect;
export type HrDesignation = typeof hrDesignations.$inferSelect;
export type HrEmployee = typeof hrEmployees.$inferSelect;
