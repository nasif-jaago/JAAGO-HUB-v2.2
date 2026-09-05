-- ============================================================================
-- Migration: 20260906100000_create_biotime_effective_attendance_schema.sql
-- Description: BioTime Normalization, Identity Mapping, and att_effective_daily View
-- Standard: DATABASE-STANDARD.md v1.0
-- Invariants: I1 (Unique employee, date), I2 (Derived state), I3 (Audit), I7 (Snapshot)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. BIOTIME EMPLOYEE IDENTITY MAPPING TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.att_biotime_employee_map (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    biotime_emp_code        TEXT NOT NULL,
    biotime_name            TEXT,
    biotime_department      TEXT,
    hub_employee_id         TEXT,
    hub_employee_code       TEXT,
    unmatched               BOOLEAN NOT NULL DEFAULT TRUE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_att_biotime_emp_code UNIQUE (biotime_emp_code)
);

CREATE INDEX IF NOT EXISTS idx_att_biotime_map_code ON public.att_biotime_employee_map(biotime_emp_code);
CREATE INDEX IF NOT EXISTS idx_att_biotime_map_hub_id ON public.att_biotime_employee_map(hub_employee_id);
CREATE INDEX IF NOT EXISTS idx_att_biotime_map_unmatched ON public.att_biotime_employee_map(unmatched);

ALTER TABLE public.att_biotime_employee_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on att_biotime_employee_map" ON public.att_biotime_employee_map;
DROP POLICY IF EXISTS "Allow full access on att_biotime_employee_map" ON public.att_biotime_employee_map;
CREATE POLICY "Allow public read on att_biotime_employee_map" ON public.att_biotime_employee_map FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on att_biotime_employee_map" ON public.att_biotime_employee_map FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. NORMALIZED BIOTIME EVENTS TABLE (IDEMPOTENT READ-MODEL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.att_biotime_events (
    id                      TEXT PRIMARY KEY,
    biotime_emp_code        TEXT NOT NULL,
    hub_employee_id         TEXT,
    punch_time              TIMESTAMPTZ NOT NULL,
    punch_state             VARCHAR(50) DEFAULT 'CHECK_IN', -- 'CHECK_IN' | 'CHECK_OUT' | 'UNKNOWN'
    verify_type             VARCHAR(50) DEFAULT 'Face',
    terminal_sn             VARCHAR(100),
    terminal_alias          TEXT,
    area_alias              TEXT,
    source                  VARCHAR(50) DEFAULT 'biotime',
    raw_payload             JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_att_biotime_punch UNIQUE (biotime_emp_code, punch_time, terminal_sn)
);

CREATE INDEX IF NOT EXISTS idx_att_biotime_events_hub_time ON public.att_biotime_events(hub_employee_id, punch_time);
CREATE INDEX IF NOT EXISTS idx_att_biotime_events_code_time ON public.att_biotime_events(biotime_emp_code, punch_time);

ALTER TABLE public.att_biotime_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on att_biotime_events" ON public.att_biotime_events;
DROP POLICY IF EXISTS "Allow full access on att_biotime_events" ON public.att_biotime_events;
CREATE POLICY "Allow public read on att_biotime_events" ON public.att_biotime_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on att_biotime_events" ON public.att_biotime_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 3. EFFECTIVE DAILY ATTENDANCE COMPUTED VIEW (att_effective_daily)
-- Unions GPS punches (attendance_records / attendance_events) with BioTime punches
-- Counting rule: Counted In = MIN(all ins), Counted Out = MAX(all outs) in Asia/Dhaka
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.att_effective_daily AS
WITH 
-- 1. GPS events normalized to Asia/Dhaka day
gps_punches AS (
    SELECT 
        ar.employee_id,
        ar.business_date,
        COALESCE(ar.first_check_in_at, ar.check_in_at) AS check_in_at,
        COALESCE(ar.last_check_out_at, ar.check_out_at) AS check_out_at,
        ar.status AS gps_status,
        ar.is_late AS gps_is_late,
        ar.late_by_minutes AS gps_late_by_minutes,
        ar.is_auto_checkout AS gps_is_auto_checkout,
        COALESCE(ar.worked_seconds, CASE WHEN ar.worked_minutes IS NOT NULL THEN ar.worked_minutes * 60 ELSE 0 END) AS gps_worked_seconds
    FROM public.attendance_records ar
),
-- 2. BioTime events normalized to Asia/Dhaka day
biotime_punches AS (
    SELECT 
        be.hub_employee_id AS employee_id,
        ((be.punch_time AT TIME ZONE 'Asia/Dhaka')::date) AS business_date,
        MIN(be.punch_time) AS first_punch_at,
        MAX(be.punch_time) AS last_punch_at,
        COUNT(be.id) AS punch_count,
        MIN(CASE WHEN be.punch_state = 'CHECK_IN' OR be.punch_state IS NULL THEN be.punch_time ELSE be.punch_time END) AS biotime_check_in_at,
        MAX(CASE WHEN be.punch_state = 'CHECK_OUT' THEN be.punch_time WHEN be.punch_state != 'CHECK_IN' THEN be.punch_time ELSE NULL END) AS biotime_explicit_out_at
    FROM public.att_biotime_events be
    WHERE be.hub_employee_id IS NOT NULL
    GROUP BY be.hub_employee_id, ((be.punch_time AT TIME ZONE 'Asia/Dhaka')::date)
),
-- 3. Union of all unique (employee_id, business_date) pairs from both sources
all_days AS (
    SELECT employee_id, business_date FROM gps_punches
    UNION
    SELECT employee_id, business_date FROM biotime_punches
),
-- 4. Merged candidate values per employee per day
merged_days AS (
    SELECT 
        ad.employee_id,
        ad.business_date,
        g.check_in_at AS gps_check_in_at,
        g.check_out_at AS gps_check_out_at,
        b.first_punch_at AS biotime_first_punch,
        b.last_punch_at AS biotime_last_punch,
        b.biotime_check_in_at,
        CASE 
            WHEN b.biotime_explicit_out_at IS NOT NULL THEN b.biotime_explicit_out_at
            WHEN b.punch_count > 1 AND b.first_punch_at != b.last_punch_at THEN b.last_punch_at
            ELSE NULL 
        END AS biotime_check_out_at,
        COALESCE(b.punch_count, 0) AS biotime_punch_count,
        g.gps_status,
        g.gps_is_late,
        g.gps_late_by_minutes,
        g.gps_is_auto_checkout,
        g.gps_worked_seconds
    FROM all_days ad
    LEFT JOIN gps_punches g ON g.employee_id = ad.employee_id AND g.business_date = ad.business_date
    LEFT JOIN biotime_punches b ON b.employee_id = ad.employee_id AND b.business_date = ad.business_date
)
SELECT 
    m.employee_id,
    e.code AS employee_code,
    e.name AS employee_name,
    e.designation,
    e.department,
    e.branch,
    e.avatar_url,
    m.business_date,
    -- COUNTED CHECK-IN: MIN(all check-ins across GPS & BioTime)
    LEAST(m.gps_check_in_at, m.biotime_first_punch) AS counted_check_in,
    -- COUNTED CHECK-OUT: MAX(all check-outs across GPS & BioTime)
    GREATEST(m.gps_check_out_at, m.biotime_check_out_at) AS counted_check_out,
    -- CHECK-IN SOURCE
    CASE 
        WHEN m.gps_check_in_at IS NOT NULL AND m.biotime_first_punch IS NOT NULL THEN 
            CASE WHEN m.biotime_first_punch <= m.gps_check_in_at THEN 'biotime' ELSE 'gps' END
        WHEN m.biotime_first_punch IS NOT NULL THEN 'biotime'
        WHEN m.gps_check_in_at IS NOT NULL THEN 'gps'
        ELSE 'none'
    END AS check_in_source,
    -- CHECK-OUT SOURCE
    CASE 
        WHEN m.gps_check_out_at IS NOT NULL AND m.biotime_check_out_at IS NOT NULL THEN 
            CASE WHEN m.gps_check_out_at >= m.biotime_check_out_at THEN 'gps' ELSE 'biotime' END
        WHEN m.gps_check_out_at IS NOT NULL THEN 'gps'
        WHEN m.biotime_check_out_at IS NOT NULL THEN 'biotime'
        ELSE 'none'
    END AS check_out_source,
    -- TOTAL WORKED SECONDS
    CASE 
        WHEN LEAST(m.gps_check_in_at, m.biotime_first_punch) IS NOT NULL AND GREATEST(m.gps_check_out_at, m.biotime_check_out_at) IS NOT NULL THEN
            GREATEST(0, EXTRACT(EPOCH FROM (GREATEST(m.gps_check_out_at, m.biotime_check_out_at) - LEAST(m.gps_check_in_at, m.biotime_first_punch)))::integer)
        ELSE COALESCE(m.gps_worked_seconds, 0)
    END AS worked_seconds,
    -- WORKED DISPLAY
    CASE 
        WHEN LEAST(m.gps_check_in_at, m.biotime_first_punch) IS NOT NULL AND GREATEST(m.gps_check_out_at, m.biotime_check_out_at) IS NOT NULL THEN
            (EXTRACT(EPOCH FROM (GREATEST(m.gps_check_out_at, m.biotime_check_out_at) - LEAST(m.gps_check_in_at, m.biotime_first_punch)))::integer / 3600)::text || 'h ' || 
            LPAD(((EXTRACT(EPOCH FROM (GREATEST(m.gps_check_out_at, m.biotime_check_out_at) - LEAST(m.gps_check_in_at, m.biotime_first_punch)))::integer % 3600) / 60)::text, 2, '0') || 'm'
        WHEN m.gps_worked_seconds IS NOT NULL AND m.gps_worked_seconds > 0 THEN
            (m.gps_worked_seconds / 3600)::text || 'h ' || LPAD(((m.gps_worked_seconds % 3600) / 60)::text, 2, '0') || 'm'
        ELSE '0h 00m'
    END AS worked_display,
    -- DERIVED STATUS
    CASE 
        WHEN m.gps_is_auto_checkout THEN 'Auto Check Out'
        WHEN LEAST(m.gps_check_in_at, m.biotime_first_punch) IS NOT NULL THEN
            CASE 
                -- Lateness check against 10:30 threshold
                WHEN EXTRACT(HOUR FROM (LEAST(m.gps_check_in_at, m.biotime_first_punch) AT TIME ZONE 'Asia/Dhaka')) > 10 OR 
                     (EXTRACT(HOUR FROM (LEAST(m.gps_check_in_at, m.biotime_first_punch) AT TIME ZONE 'Asia/Dhaka')) = 10 AND 
                      EXTRACT(MINUTE FROM (LEAST(m.gps_check_in_at, m.biotime_first_punch) AT TIME ZONE 'Asia/Dhaka')) > 30) THEN 'Late'
                ELSE 'Present'
            END
        ELSE COALESCE(m.gps_status, 'Absent')
    END AS status,
    -- IS LATE
    CASE 
        WHEN LEAST(m.gps_check_in_at, m.biotime_first_punch) IS NOT NULL THEN
            (EXTRACT(HOUR FROM (LEAST(m.gps_check_in_at, m.biotime_first_punch) AT TIME ZONE 'Asia/Dhaka')) > 10 OR 
             (EXTRACT(HOUR FROM (LEAST(m.gps_check_in_at, m.biotime_first_punch) AT TIME ZONE 'Asia/Dhaka')) = 10 AND 
              EXTRACT(MINUTE FROM (LEAST(m.gps_check_in_at, m.biotime_first_punch) AT TIME ZONE 'Asia/Dhaka')) > 30))
        ELSE COALESCE(m.gps_is_late, false)
    END AS is_late,
    -- IS AUTO CHECKOUT
    COALESCE(m.gps_is_auto_checkout, false) AS is_auto_checkout,
    -- SOURCE BREAKDOWN JSON
    jsonb_build_object(
        'gps_check_in', m.gps_check_in_at,
        'gps_check_out', m.gps_check_out_at,
        'biotime_check_in', m.biotime_first_punch,
        'biotime_check_out', m.biotime_check_out_at,
        'biotime_punch_count', COALESCE(m.biotime_punch_count, 0),
        'counted_check_in_source', CASE 
            WHEN m.gps_check_in_at IS NOT NULL AND m.biotime_first_punch IS NOT NULL THEN 
                CASE WHEN m.biotime_first_punch <= m.gps_check_in_at THEN 'biotime' ELSE 'gps' END
            WHEN m.biotime_first_punch IS NOT NULL THEN 'biotime'
            WHEN m.gps_check_in_at IS NOT NULL THEN 'gps'
            ELSE 'none'
        END,
        'counted_check_out_source', CASE 
            WHEN m.gps_check_out_at IS NOT NULL AND m.biotime_check_out_at IS NOT NULL THEN 
                CASE WHEN m.gps_check_out_at >= m.biotime_check_out_at THEN 'gps' ELSE 'biotime' END
            WHEN m.gps_check_out_at IS NOT NULL THEN 'gps'
            WHEN m.biotime_check_out_at IS NOT NULL THEN 'biotime'
            ELSE 'none'
        END
    ) AS source_breakdown
FROM merged_days m
LEFT JOIN public.employees e ON (e.id::text = m.employee_id::text OR e.code = m.employee_id::text);
