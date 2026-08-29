import { pgTable, uuid, varchar, text, timestamp, integer, boolean, numeric, index, unique } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { hrEmployees } from './hr';

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: text('id').primaryKey(),
    employeeId: text('employee_id').notNull(),
    businessDate: varchar('business_date', { length: 10 }).notNull(), // 'YYYY-MM-DD'
    checkInAt: timestamp('check_in_at', { withTimezone: true }),
    checkOutAt: timestamp('check_out_at', { withTimezone: true }),
    firstCheckInAt: timestamp('first_check_in_at', { withTimezone: true }),
    lastCheckOutAt: timestamp('last_check_out_at', { withTimezone: true }),
    checkInSource: varchar('check_in_source', { length: 50 }),
    checkOutSource: varchar('check_out_source', { length: 50 }),
    checkInLocationId: text('check_in_location_id'),
    checkOutLocationId: text('check_out_location_id'),
    checkInLat: numeric('check_in_lat', { precision: 10, scale: 7 }),
    checkInLng: numeric('check_in_lng', { precision: 10, scale: 7 }),
    checkInAccuracyM: numeric('check_in_accuracy_m', { precision: 8, scale: 2 }),
    checkOutLat: numeric('check_out_lat', { precision: 10, scale: 7 }),
    checkOutLng: numeric('check_out_lng', { precision: 10, scale: 7 }),
    checkOutAccuracyM: numeric('check_out_accuracy_m', { precision: 8, scale: 2 }),
    shiftId: text('shift_id'),
    shiftName: varchar('shift_name', { length: 255 }),
    shiftTimezone: varchar('shift_timezone', { length: 100 }).default('Asia/Dhaka'),
    shiftStartLocal: varchar('shift_start_local', { length: 10 }).default('10:00'),
    shiftEndLocal: varchar('shift_end_local', { length: 10 }).default('18:00'),
    shiftBufferMinutes: integer('shift_buffer_minutes').default(30),
    shiftAutoCheckoutLocal: varchar('shift_auto_checkout_local', { length: 10 }).default('23:30'),
    shiftCrossesMidnight: boolean('shift_crosses_midnight').default(false),
    isScheduledWorkingDay: boolean('is_scheduled_working_day').default(true),
    status: varchar('status', { length: 50 }).default('present').notNull(),
    isLate: boolean('is_late').default(false).notNull(),
    lateByMinutes: integer('late_by_minutes').default(0).notNull(),
    isAutoCheckout: boolean('is_auto_checkout').default(false).notNull(),
    needsReview: boolean('needs_review').default(false).notNull(),
    workedMinutes: integer('worked_minutes'),
    workedSeconds: integer('worked_seconds').default(0).notNull(),
    workedDisplay: varchar('worked_display', { length: 30 }).default('0h 00m').notNull(),
    calcMethod: varchar('calc_method', { length: 20 }).default('span').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_attendance_employee_date').on(table.employeeId, table.businessDate),
    index('idx_att_emp_date').on(table.employeeId, table.businessDate),
    index('idx_att_date_status').on(table.businessDate, table.status),
  ]
);

export const attendanceEvents = pgTable(
  'attendance_events',
  {
    id: text('id').primaryKey(),
    employeeId: text('employee_id').notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    punchType: varchar('punch_type', { length: 50 }),
    source: varchar('source', { length: 50 }).default('gps').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    accuracyM: numeric('accuracy_m', { precision: 8, scale: 2 }),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    deviceInfo: text('device_info'),
    result: varchar('result', { length: 50 }).notNull(),
    rejectionReason: varchar('rejection_reason', { length: 100 }),
    matchedLocationId: text('matched_location_id'),
    distanceM: numeric('distance_m', { precision: 10, scale: 2 }),
    isWithinGeofence: boolean('is_within_geofence').default(true).notNull(),
    isMockLocation: boolean('is_mock_location').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_att_events_emp_time').on(table.employeeId, table.attemptedAt),
  ]
);

export const attendanceAdjustments = pgTable(
  'attendance_adjustments',
  {
    id: text('id').primaryKey(),
    attendanceRecordId: text('attendance_record_id').notNull(),
    fieldChanged: varchar('field_changed', { length: 100 }).notNull(),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    changedBy: text('changed_by').notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
    reason: text('reason').notNull(),
  },
  (table) => [
    index('idx_att_adj_record').on(table.attendanceRecordId),
  ]
);

export const attendanceSettings = pgTable(
  'attendance_settings',
  {
    id: text('id').primaryKey().default('global'),
    orgTimezone: varchar('org_timezone', { length: 100 }).default('Asia/Dhaka').notNull(),
    defaultAutoCheckoutLocal: varchar('default_auto_checkout_local', { length: 10 }).default('23:30').notNull(),
    dailyCutoffLocal: varchar('daily_cutoff_local', { length: 10 }).default('23:30').notNull(),
    gpsAccuracyThresholdM: numeric('gps_accuracy_threshold_m', { precision: 8, scale: 2 }).default('100.0').notNull(),
    gpsFreshnessSeconds: integer('gps_freshness_seconds').default(120).notNull(),
    defaultGeofenceRadiusM: integer('default_geofence_radius_m').default(100).notNull(),
    workingHoursCalcMethod: varchar('working_hours_calc_method', { length: 20 }).default('span').notNull(),
    absentOnMissingCheckout: boolean('absent_on_missing_checkout').default(false).notNull(),
    autoCheckoutCapShiftEnd: boolean('auto_checkout_cap_shift_end').default(false).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

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
    index('idx_hr_att_emp_date').on(table.employeeId, table.date),
    index('idx_hr_att_org').on(table.organizationId),
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

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type AttendanceEvent = typeof attendanceEvents.$inferSelect;
export type AttendanceAdjustment = typeof attendanceAdjustments.$inferSelect;
export type AttendanceSetting = typeof attendanceSettings.$inferSelect;
export type HrAttendanceLog = typeof hrAttendanceLogs.$inferSelect;
export type HrLeaveRequest = typeof hrLeaveRequests.$inferSelect;
