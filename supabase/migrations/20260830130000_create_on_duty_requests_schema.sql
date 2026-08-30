-- ==============================================================================
-- JAAGO FOUNDATION ERP — ON-DUTY FIELD WORK SUBSYSTEM SCHEMA
-- Domain   : On-Duty Requests, Supervisor Approvals, Attendance Day Crediting
-- Standard : DATABASE-STANDARD.md v1.0
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CANONICAL ON-DUTY REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.on_duty_requests (
    id                          TEXT PRIMARY KEY DEFAULT ('od-' || gen_random_uuid()::text),
    tenant_id                   TEXT NOT NULL DEFAULT 'jaago-main',
    employee_id                 TEXT NOT NULL,
    employee_code               VARCHAR(100) NOT NULL,
    employee_name               VARCHAR(255) NOT NULL,
    department                  VARCHAR(150),
    designation                 VARCHAR(150),
    avatar_url                  TEXT,
    supervisor_id               TEXT,
    supervisor_name             VARCHAR(255),
    supervisor_email            VARCHAR(255),
    start_at                    TIMESTAMPTZ NOT NULL,
    end_at                      TIMESTAMPTZ NOT NULL,
    start_date                  DATE NOT NULL,
    end_date                    DATE NOT NULL,
    start_time                  VARCHAR(50) NOT NULL,
    end_time                    VARCHAR(50) NOT NULL,
    reason                      TEXT NOT NULL,
    status                      VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    refusal_note                TEXT,
    total_hours                 NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    credited_days               NUMERIC(5, 3) NOT NULL DEFAULT 0.0,
    decided_by                  TEXT,
    decided_at                  TIMESTAMPTZ,
    submitted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ON-DUTY ATTENDANCE DAY ROLLUP (Deterministic Credited Days)
CREATE TABLE IF NOT EXISTS public.on_duty_attendance_day (
    id                          TEXT PRIMARY KEY DEFAULT ('oda-' || gen_random_uuid()::text),
    tenant_id                   TEXT NOT NULL DEFAULT 'jaago-main',
    on_duty_request_id          TEXT NOT NULL REFERENCES public.on_duty_requests(id) ON DELETE CASCADE,
    employee_id                 TEXT NOT NULL,
    attendance_date             DATE NOT NULL,
    raw_hours                   NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    credited_hours              NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    credited_days               NUMERIC(5, 3) NOT NULL DEFAULT 0.0,
    classification              VARCHAR(50) NOT NULL DEFAULT 'REGULAR', -- 'REGULAR' | 'EXTRA_HOURS'
    is_working_day              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_onduty_emp_date UNIQUE (employee_id, attendance_date, on_duty_request_id)
);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.on_duty_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.on_duty_attendance_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on on_duty_requests" ON public.on_duty_requests;
DROP POLICY IF EXISTS "Allow full access on on_duty_requests" ON public.on_duty_requests;
CREATE POLICY "Allow public read on on_duty_requests" ON public.on_duty_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on on_duty_requests" ON public.on_duty_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on on_duty_attendance_day" ON public.on_duty_attendance_day;
DROP POLICY IF EXISTS "Allow full access on on_duty_attendance_day" ON public.on_duty_attendance_day;
CREATE POLICY "Allow public read on on_duty_attendance_day" ON public.on_duty_attendance_day FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on on_duty_attendance_day" ON public.on_duty_attendance_day FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_onduty_requests_emp ON public.on_duty_requests(employee_id, start_date);
CREATE INDEX IF NOT EXISTS idx_onduty_requests_supervisor ON public.on_duty_requests(supervisor_id, status);
CREATE INDEX IF NOT EXISTS idx_onduty_requests_status ON public.on_duty_requests(status, start_date);
CREATE INDEX IF NOT EXISTS idx_onduty_att_day_emp_date ON public.on_duty_attendance_day(employee_id, attendance_date);
