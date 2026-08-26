-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB (v2.2) — ATTENDANCE & SHIFT MANAGEMENT SCHEMA
-- Domain  : People & Culture (HR) — Working Hours, Schedules & Shift Management
-- Engine  : PostgreSQL 15+ (Supabase Native)
-- Author  : Database Engineering Team
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. CORE SCHEMA: CREATE SHIFTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
    id                          TEXT PRIMARY KEY DEFAULT ('shift-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    office_start                VARCHAR(50) NOT NULL DEFAULT '09:00 AM',
    start_buffer_min            INTEGER NOT NULL DEFAULT 15,
    office_end                  VARCHAR(50) NOT NULL DEFAULT '05:00 PM',
    end_buffer_min              INTEGER NOT NULL DEFAULT 15,
    check_in_start              VARCHAR(50) NOT NULL DEFAULT '05:00 AM',
    check_in_end                VARCHAR(50) NOT NULL DEFAULT '05:00 PM',
    check_out_start             VARCHAR(50) NOT NULL DEFAULT '09:30 AM',
    check_out_end               VARCHAR(50) NOT NULL DEFAULT '11:30 PM',
    is_default                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_shifts_name ON public.shifts(name);
CREATE INDEX IF NOT EXISTS idx_shifts_is_default ON public.shifts(is_default);
CREATE INDEX IF NOT EXISTS idx_shifts_created_at ON public.shifts(created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. AUTOMATIC TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shifts_updated_at ON public.shifts;
CREATE TRIGGER trg_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.set_shifts_updated_at();

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on shifts" ON public.shifts;
CREATE POLICY "Allow public select on shifts"
    ON public.shifts FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow all on shifts for authenticated" ON public.shifts;
CREATE POLICY "Allow all on shifts for authenticated"
    ON public.shifts FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. SEED DATA (Standard JAAGO Foundation Working Shifts)
-- ------------------------------------------------------------------------------
INSERT INTO public.shifts (
    id, name, office_start, start_buffer_min, office_end, end_buffer_min,
    check_in_start, check_in_end, check_out_start, check_out_end, is_default
) VALUES
(
    'shift-jaago-hq',
    'JAAGO HQ',
    '10:00 AM',
    30,
    '06:00 PM',
    0,
    '08:00 AM',
    '05:00 PM',
    '11:30 PM',
    '11:30 PM',
    false
),
(
    'shift-1',
    'Full Time Shift 1',
    '09:00 AM',
    15,
    '05:00 PM',
    15,
    '05:00 AM',
    '05:00 PM',
    '09:30 AM',
    '11:30 PM',
    true
),
(
    'shift-2',
    'Full Time Shift 2',
    '10:00 AM',
    15,
    '06:00 PM',
    15,
    '05:00 AM',
    '06:00 PM',
    '10:30 AM',
    '11:30 PM',
    false
),
(
    'shift-3',
    'Full Time Shift 3',
    '07:30 AM',
    15,
    '04:30 PM',
    15,
    '05:00 AM',
    '04:30 PM',
    '08:00 AM',
    '11:30 PM',
    false
),
(
    'shift-4',
    'Full Time Shift 4',
    '08:00 AM',
    15,
    '05:00 PM',
    15,
    '05:00 AM',
    '05:00 PM',
    '08:30 AM',
    '11:30 PM',
    false
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    office_start = EXCLUDED.office_start,
    start_buffer_min = EXCLUDED.start_buffer_min,
    office_end = EXCLUDED.office_end,
    end_buffer_min = EXCLUDED.end_buffer_min,
    check_in_start = EXCLUDED.check_in_start,
    check_in_end = EXCLUDED.check_in_end,
    check_out_start = EXCLUDED.check_out_start,
    check_out_end = EXCLUDED.check_out_end,
    is_default = EXCLUDED.is_default,
    updated_at = NOW();
