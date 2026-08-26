-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB (v2.2) — MIGRATION: ADD LEAVE & ATTENDANCE FIELDS
-- Domain  : People & Culture (HR) — Employee Profile Extensions
-- Engine  : PostgreSQL 15+ (Supabase Native)
-- ==============================================================================

-- 1. ADD LEAVE & ATTENDANCE COLUMNS (Idempotent safe)
ALTER TABLE public.employees 
    ADD COLUMN IF NOT EXISTS leave_policy VARCHAR(150) NOT NULL DEFAULT 'Standard Full-time Employee Policy',
    ADD COLUMN IF NOT EXISTS casual_leave_allocated NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
    ADD COLUMN IF NOT EXISTS casual_leave_used NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
    ADD COLUMN IF NOT EXISTS sick_leave_allocated NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    ADD COLUMN IF NOT EXISTS sick_leave_used NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    ADD COLUMN IF NOT EXISTS earned_leave_allocated NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    ADD COLUMN IF NOT EXISTS earned_leave_used NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS special_leave_allocated NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    ADD COLUMN IF NOT EXISTS special_leave_used NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS weekend_days VARCHAR(100) NOT NULL DEFAULT 'Friday & Saturday',
    ADD COLUMN IF NOT EXISTS overtime_eligible VARCHAR(50) NOT NULL DEFAULT 'No',
    ADD COLUMN IF NOT EXISTS attendance_grace_period_min INTEGER NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS late_penalty_rule VARCHAR(100) NOT NULL DEFAULT '3_LATES_HALF_DAY',
    ADD COLUMN IF NOT EXISTS attendance_verification_method VARCHAR(100) NOT NULL DEFAULT 'HYBRID';

-- 2. CREATE INDEX FOR WORKING SCHEDULE (If not exists)
CREATE INDEX IF NOT EXISTS idx_employees_working_schedule ON public.employees(working_schedule);

-- 3. SYNC NASIF KAMAL MASTER RECORD LEAVE & ATTENDANCE DATA
UPDATE public.employees
SET 
    working_schedule = 'JAAGO HQ (10:00 AM - 06:00 PM)',
    rfid = 'RFID-165951',
    leave_policy = 'Standard Full-time Employee Policy',
    casual_leave_allocated = 14.00,
    casual_leave_used = 3.00,
    sick_leave_allocated = 10.00,
    sick_leave_used = 1.00,
    earned_leave_allocated = 15.00,
    earned_leave_used = 0.00,
    special_leave_allocated = 5.00,
    special_leave_used = 0.00,
    weekend_days = 'Friday & Saturday',
    overtime_eligible = 'No',
    attendance_grace_period_min = 15,
    late_penalty_rule = '3_LATES_HALF_DAY',
    attendance_verification_method = 'HYBRID',
    updated_at = NOW()
WHERE code = 'FO032507061190' OR work_email = 'nasif.kamal@jaago.com.bd';
