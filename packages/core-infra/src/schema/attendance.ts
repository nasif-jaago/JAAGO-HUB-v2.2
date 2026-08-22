import { pgTable, uuid, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { hrEmployees } from './hr';

export const hrAttendanceLogs = pgTable(
  'hr_attendance_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id').references(() => hrEmployees.id, { onDelete: 'cascade' }).notNull(),
    date: varchar('date', { length: 10 }).notNull(), // 'YYYY-MM-DD'
    checkIn: timestamp('check_in', { withTimezone: true }),
    checkOut: timestamp('check_out', { withTimezone: true }),
    workingHours: varchar('working_hours', { length: 20 }).default('0h 0m').notNull(),
    lateMinutes: integer('late_minutes').default(0).notNull(),
    status: varchar('status', { length: 50 }).default('present').notNull(), // 'present' | 'late' | 'absent' | 'on_duty' | 'leave'
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_att_emp_date').on(table.employeeId, table.date),
    index('idx_att_org').on(table.organizationId),
  ],
);

export const hrLeaveRequests = pgTable(
  'hr_leave_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employee_id').references(() => hrEmployees.id, { onDelete: 'cascade' }).notNull(),
    leaveType: varchar('leave_type', { length: 50 }).notNull(), // 'annual' | 'sick' | 'casual' | 'maternity' | 'unpaid'
    startDate: varchar('start_date', { length: 10 }).notNull(),
    endDate: varchar('end_date', { length: 10 }).notNull(),
    totalDays: integer('total_days').notNull(),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 50 }).default('draft').notNull(), // 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled'
    workflowInstanceId: varchar('workflow_instance_id', { length: 100 }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_leave_emp').on(table.employeeId),
    index('idx_leave_status').on(table.status),
    index('idx_leave_org').on(table.organizationId),
  ],
);

export type HrAttendanceLog = typeof hrAttendanceLogs.$inferSelect;
export type HrLeaveRequest = typeof hrLeaveRequests.$inferSelect;
