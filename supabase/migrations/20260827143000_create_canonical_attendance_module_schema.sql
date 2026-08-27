-- ==============================================================================
-- JAAGO HUB — CANONICAL ATTENDANCE MODULE SCHEMA MIGRATION (PHASE 1)
-- Specification: attendance-module-antigravity-prompt.md (§3, §4, §5)
-- Standard     : DATABASE-STANDARD.md v1.0
-- Invariants   : I1 (Unique employee_id, business_date), I3 (Audit), I7 (Snapshot)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. WORK SHIFTS (WORKING SCHEDULES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_shifts (
    id                          TEXT PRIMARY KEY DEFAULT ('shift-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    timezone                    VARCHAR(100) NOT NULL DEFAULT 'Asia/Dhaka',
    start_time_local            VARCHAR(10) NOT NULL DEFAULT '10:00',
    end_time_local              VARCHAR(10) NOT NULL DEFAULT '18:00',
    start_buffer_minutes        INTEGER NOT NULL DEFAULT 30,
    crosses_midnight            BOOLEAN NOT NULL DEFAULT FALSE,
    auto_checkout_local         VARCHAR(10) DEFAULT '23:30',
    working_weekdays            INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4}', -- Sun(0) to Thu(4)
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on work_shifts" ON public.work_shifts;
DROP POLICY IF EXISTS "Allow full access on work_shifts" ON public.work_shifts;
CREATE POLICY "Allow public read on work_shifts" ON public.work_shifts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on work_shifts" ON public.work_shifts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. EMPLOYEE SHIFT ASSIGNMENTS (EFFECTIVE-DATED)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_shift_assignments (
    id                          TEXT PRIMARY KEY DEFAULT ('esa-' || gen_random_uuid()::text),
    employee_id                 TEXT NOT NULL,
    shift_id                    TEXT NOT NULL REFERENCES public.work_shifts(id) ON DELETE RESTRICT,
    effective_from              DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to                DATE, -- Nullable = open-ended
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esa_emp_dates ON public.employee_shift_assignments(employee_id, effective_from, effective_to);

ALTER TABLE public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on employee_shift_assignments" ON public.employee_shift_assignments;
DROP POLICY IF EXISTS "Allow full access on employee_shift_assignments" ON public.employee_shift_assignments;
CREATE POLICY "Allow public read on employee_shift_assignments" ON public.employee_shift_assignments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on employee_shift_assignments" ON public.employee_shift_assignments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. GEOFENCE LOCATIONS (GPS SOURCE OF TRUTH)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.geofence_locations (
    id                          TEXT PRIMARY KEY DEFAULT ('geo-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    branch_office               TEXT,
    latitude                    NUMERIC(10, 7) NOT NULL,
    longitude                   NUMERIC(10, 7) NOT NULL,
    radius_meters               INTEGER NOT NULL DEFAULT 100,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geofence_active ON public.geofence_locations(is_active);

ALTER TABLE public.geofence_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on geofence_locations" ON public.geofence_locations;
DROP POLICY IF EXISTS "Allow full access on geofence_locations" ON public.geofence_locations;
CREATE POLICY "Allow public read on geofence_locations" ON public.geofence_locations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on geofence_locations" ON public.geofence_locations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. ATTENDANCE RECORDS (THE ONE CANONICAL ROW PER EMPLOYEE PER DAY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id                          TEXT PRIMARY KEY DEFAULT ('att-' || gen_random_uuid()::text),
    employee_id                 TEXT NOT NULL,
    business_date               DATE NOT NULL,
    
    -- Facts
    check_in_at                 TIMESTAMPTZ,
    check_out_at                TIMESTAMPTZ,
    check_in_source             VARCHAR(50), -- 'gps' | 'manual' | 'admin' | 'auto'
    check_out_source            VARCHAR(50),
    check_in_location_id        TEXT REFERENCES public.geofence_locations(id) ON DELETE SET NULL,
    check_out_location_id       TEXT REFERENCES public.geofence_locations(id) ON DELETE SET NULL,
    check_in_lat                NUMERIC(10, 7),
    check_in_lng                NUMERIC(10, 7),
    check_in_accuracy_m         NUMERIC(8, 2),
    check_out_lat               NUMERIC(10, 7),
    check_out_lng               NUMERIC(10, 7),
    check_out_accuracy_m        NUMERIC(8, 2),
    
    -- Shift Snapshot (I7 - frozen at record creation)
    shift_id                    TEXT,
    shift_name                  VARCHAR(255),
    shift_timezone              VARCHAR(100) DEFAULT 'Asia/Dhaka',
    shift_start_local           VARCHAR(10) DEFAULT '10:00',
    shift_end_local             VARCHAR(10) DEFAULT '18:00',
    shift_buffer_minutes        INTEGER DEFAULT 30,
    shift_auto_checkout_local   VARCHAR(10) DEFAULT '23:30',
    shift_crosses_midnight      BOOLEAN DEFAULT FALSE,
    is_scheduled_working_day    BOOLEAN DEFAULT TRUE,
    
    -- Derived (I2 - written ONLY by recomputeAttendanceRecord)
    status                      VARCHAR(50) NOT NULL DEFAULT 'present',
    is_late                     BOOLEAN NOT NULL DEFAULT FALSE,
    late_by_minutes             INTEGER NOT NULL DEFAULT 0,
    is_auto_checkout            BOOLEAN NOT NULL DEFAULT FALSE,
    worked_minutes              INTEGER,
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, business_date),
    CONSTRAINT chk_worked_minutes_positive CHECK (worked_minutes IS NULL OR worked_minutes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_att_emp_date ON public.attendance_records(employee_id, business_date);
CREATE INDEX IF NOT EXISTS idx_att_date_status ON public.attendance_records(business_date, status);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on attendance_records" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow full access on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow public read on attendance_records" ON public.attendance_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on attendance_records" ON public.attendance_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. ATTENDANCE EVENTS (APPEND-ONLY PHYSICAL AUDIT FOR EVERY ATTEMPT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_events (
    id                          TEXT PRIMARY KEY DEFAULT ('evt-' || gen_random_uuid()::text),
    employee_id                 TEXT NOT NULL,
    event_type                  VARCHAR(50) NOT NULL, -- 'check_in' | 'check_out'
    attempted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude                    NUMERIC(10, 7),
    longitude                   NUMERIC(10, 7),
    accuracy_m                  NUMERIC(8, 2),
    captured_at                 TIMESTAMPTZ,
    device_info                 TEXT,
    result                      VARCHAR(50) NOT NULL, -- 'accepted' | 'rejected'
    rejection_reason            VARCHAR(100), -- 'outside_geofence', 'poor_accuracy', 'stale_coordinates', etc.
    matched_location_id         TEXT REFERENCES public.geofence_locations(id) ON DELETE SET NULL,
    distance_m                  NUMERIC(10, 2),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_att_events_emp_time ON public.attendance_events(employee_id, attempted_at);

ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on attendance_events" ON public.attendance_events;
DROP POLICY IF EXISTS "Allow full access on attendance_events" ON public.attendance_events;
CREATE POLICY "Allow public read on attendance_events" ON public.attendance_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on attendance_events" ON public.attendance_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. ATTENDANCE ADJUSTMENTS (APPEND-ONLY EDIT AUDIT PER I3)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_adjustments (
    id                          TEXT PRIMARY KEY DEFAULT ('adj-' || gen_random_uuid()::text),
    attendance_record_id        TEXT NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    field_changed               VARCHAR(100) NOT NULL, -- 'check_in_at', 'check_out_at', 'status'
    old_value                   TEXT,
    new_value                   TEXT,
    changed_by                  TEXT NOT NULL,
    changed_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason                      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_att_adj_record ON public.attendance_adjustments(attendance_record_id);

ALTER TABLE public.attendance_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on attendance_adjustments" ON public.attendance_adjustments;
DROP POLICY IF EXISTS "Allow full access on attendance_adjustments" ON public.attendance_adjustments;
CREATE POLICY "Allow public read on attendance_adjustments" ON public.attendance_adjustments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on attendance_adjustments" ON public.attendance_adjustments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. ATTENDANCE SETTINGS (GLOBAL ADMIN SETTINGS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id                          TEXT PRIMARY KEY DEFAULT 'global',
    org_timezone                VARCHAR(100) NOT NULL DEFAULT 'Asia/Dhaka',
    default_auto_checkout_local VARCHAR(10) NOT NULL DEFAULT '23:30',
    gps_accuracy_threshold_m    NUMERIC(8, 2) NOT NULL DEFAULT 100.0,
    gps_freshness_seconds       INTEGER NOT NULL DEFAULT 120,
    default_geofence_radius_m   INTEGER NOT NULL DEFAULT 100,
    auto_checkout_cap_shift_end BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on attendance_settings" ON public.attendance_settings;
DROP POLICY IF EXISTS "Allow full access on attendance_settings" ON public.attendance_settings;
CREATE POLICY "Allow public read on attendance_settings" ON public.attendance_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on attendance_settings" ON public.attendance_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Seed global settings default if not present
INSERT INTO public.attendance_settings (id, org_timezone, default_auto_checkout_local, gps_accuracy_threshold_m, gps_freshness_seconds, default_geofence_radius_m)
VALUES ('global', 'Asia/Dhaka', '23:30', 100.0, 120, 100)
ON CONFLICT (id) DO NOTHING;

-- Seed standard work shift
INSERT INTO public.work_shifts (id, name, timezone, start_time_local, end_time_local, start_buffer_minutes, auto_checkout_local, working_weekdays)
VALUES
('shift-standard', 'JAAGO HQ Standard Shift (10:00 AM - 06:00 PM)', 'Asia/Dhaka', '10:00', '18:00', 30, '23:30', '{0,1,2,3,4}'),
('shift-morning', 'School Morning Shift (08:00 AM - 02:00 PM)', 'Asia/Dhaka', '08:00', '14:00', 15, '23:30', '{0,1,2,3,4}'),
('shift-afternoon', 'Digital Teacher Shift (01:00 PM - 07:00 PM)', 'Asia/Dhaka', '13:00', '19:00', 20, '23:30', '{0,1,2,3,4}')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    start_buffer_minutes = EXCLUDED.start_buffer_minutes,
    updated_at = NOW();
