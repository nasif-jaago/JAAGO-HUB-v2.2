-- ==============================================================================
-- JAAGO FOUNDATION ERP — LEAVE REQUESTS & ON-DUTY MOVEMENT LOGS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id                          TEXT PRIMARY KEY DEFAULT ('lv-' || gen_random_uuid()::text),
    employee_id                 TEXT,
    employee_code               VARCHAR(100) NOT NULL,
    employee_name               VARCHAR(255) NOT NULL,
    leave_type                  VARCHAR(100) NOT NULL,
    from_date                   DATE NOT NULL,
    to_date                     DATE NOT NULL,
    total_days                  NUMERIC(5, 1) NOT NULL DEFAULT 1.0,
    reason                      TEXT,
    status                      VARCHAR(50) NOT NULL DEFAULT 'Pending',
    applied_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by                 VARCHAR(255),
    approved_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow full access on leave_requests" ON public.leave_requests;
CREATE POLICY "Allow public read on leave_requests" ON public.leave_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on leave_requests" ON public.leave_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. ON DUTY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.on_duty_logs (
    id                          TEXT PRIMARY KEY DEFAULT ('od-' || gen_random_uuid()::text),
    employee_id                 TEXT,
    employee_code               VARCHAR(100) NOT NULL,
    employee_name               VARCHAR(255) NOT NULL,
    designation                 VARCHAR(150),
    department                  VARCHAR(150),
    purpose                     TEXT,
    location                    TEXT,
    from_date                   DATE NOT NULL,
    to_date                     DATE NOT NULL,
    total_days                  INTEGER DEFAULT 1,
    status                      VARCHAR(50) NOT NULL DEFAULT 'Approved',
    approved_by                 VARCHAR(255),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.on_duty_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on on_duty_logs" ON public.on_duty_logs;
DROP POLICY IF EXISTS "Allow full access on on_duty_logs" ON public.on_duty_logs;
CREATE POLICY "Allow public read on on_duty_logs" ON public.on_duty_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on on_duty_logs" ON public.on_duty_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
