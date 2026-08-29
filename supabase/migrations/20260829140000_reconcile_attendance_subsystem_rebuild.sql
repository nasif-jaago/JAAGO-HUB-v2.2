-- ==============================================================================
-- JAAGO HUB — ATTENDANCE SUBSYSTEM REBUILD SCHEMA MIGRATION
-- Domain   : Attendance, GPS Geofencing, Working Hours, Auto-Checkout & Absence
-- Standard : DATABASE-STANDARD.md v1.0
-- Invariants: I1 (Unique employee_id, business_date), I2 (Derived State), I3 (Audit)
-- ==============================================================================

-- 1. ADD / RECONCILE COLUMNS IN attendance_records (Rollup Table)
ALTER TABLE public.attendance_records
    ADD COLUMN IF NOT EXISTS first_check_in_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_check_out_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS worked_seconds INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS worked_display VARCHAR(30) DEFAULT '0h 00m',
    ADD COLUMN IF NOT EXISTS calc_method VARCHAR(20) DEFAULT 'span',
    ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE;

-- Backfill first_check_in_at and last_check_out_at for existing rows
UPDATE public.attendance_records
SET
    first_check_in_at = COALESCE(first_check_in_at, check_in_at),
    last_check_out_at = COALESCE(last_check_out_at, check_out_at),
    worked_seconds = COALESCE(worked_seconds, CASE WHEN worked_minutes IS NOT NULL THEN worked_minutes * 60 ELSE 0 END),
    worked_display = COALESCE(worked_display, 
        CASE 
            WHEN worked_minutes IS NOT NULL AND worked_minutes > 0 THEN 
                (worked_minutes / 60)::text || 'h ' || LPAD((worked_minutes % 60)::text, 2, '0') || 'm'
            ELSE '0h 00m' 
        END
    ),
    calc_method = COALESCE(calc_method, 'span'),
    needs_review = COALESCE(needs_review, is_auto_checkout);

-- 2. RECONCILE attendance_events (Append-only physical punch log)
ALTER TABLE public.attendance_events
    ADD COLUMN IF NOT EXISTS punch_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'gps',
    ADD COLUMN IF NOT EXISTS is_within_geofence BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS is_mock_location BOOLEAN DEFAULT FALSE;

-- Backfill punch_type from event_type if event_type exists
UPDATE public.attendance_events
SET 
    punch_type = COALESCE(punch_type, event_type),
    is_within_geofence = COALESCE(is_within_geofence, CASE WHEN result = 'accepted' THEN true ELSE false END);

-- 3. RECONCILE attendance_settings
ALTER TABLE public.attendance_settings
    ADD COLUMN IF NOT EXISTS working_hours_calc_method VARCHAR(20) DEFAULT 'span',
    ADD COLUMN IF NOT EXISTS absent_on_missing_checkout BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS daily_cutoff_local VARCHAR(10) DEFAULT '23:30';

UPDATE public.attendance_settings
SET 
    working_hours_calc_method = COALESCE(working_hours_calc_method, 'span'),
    absent_on_missing_checkout = COALESCE(absent_on_missing_checkout, false),
    daily_cutoff_local = COALESCE(daily_cutoff_local, '23:30')
WHERE id = 'global';

-- 4. ENSURE INDEXES FOR ATTENDANCE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_att_records_emp_date ON public.attendance_records(employee_id, business_date);
CREATE INDEX IF NOT EXISTS idx_att_records_date_status ON public.attendance_records(business_date, status);
CREATE INDEX IF NOT EXISTS idx_att_events_emp_time ON public.attendance_events(employee_id, attempted_at);
