-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB (v2.2) — MIGRATION: COMPENSATORY LEAVE LEDGER
-- Domain  : People & Culture (HR) — Time-Off & Attendance Engine
-- Engine  : PostgreSQL 15+ (Supabase Native)
-- ==============================================================================

-- 1. CREATE COMPENSATORY LEAVE LEDGER TABLE (Idempotent safe)
CREATE TABLE IF NOT EXISTS public.compensatory_leave_ledger (
    id VARCHAR(100) PRIMARY KEY,
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'jaago-main',
    employee_id VARCHAR(100) NOT NULL,
    employee_code VARCHAR(100) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    on_duty_request_id VARCHAR(100),
    duty_date DATE NOT NULL,
    duty_reason TEXT,
    duty_type VARCHAR(50) NOT NULL DEFAULT 'WEEKEND', -- 'WEEKEND', 'PUBLIC_HOLIDAY', 'BOTH'
    holiday_name VARCHAR(255),
    hours_earned NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    hours_utilized NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    expiry_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'FULLY_UTILIZED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CREATE INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_comp_ledger_emp_code ON public.compensatory_leave_ledger(employee_code);
CREATE INDEX IF NOT EXISTS idx_comp_ledger_duty_date ON public.compensatory_leave_ledger(duty_date);
CREATE INDEX IF NOT EXISTS idx_comp_ledger_status_expiry ON public.compensatory_leave_ledger(status, expiry_date);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.compensatory_leave_ledger ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and service role full read/write access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'compensatory_leave_ledger' AND policyname = 'Allow public read access for compensatory ledger'
    ) THEN
        CREATE POLICY "Allow public read access for compensatory ledger" 
        ON public.compensatory_leave_ledger FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'compensatory_leave_ledger' AND policyname = 'Allow public insert access for compensatory ledger'
    ) THEN
        CREATE POLICY "Allow public insert access for compensatory ledger" 
        ON public.compensatory_leave_ledger FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'compensatory_leave_ledger' AND policyname = 'Allow public update access for compensatory ledger'
    ) THEN
        CREATE POLICY "Allow public update access for compensatory ledger" 
        ON public.compensatory_leave_ledger FOR UPDATE USING (true);
    END IF;
END $$;

-- 4. SEED SAMPLE TEST DATA FOR NASIF KAMAL (FO032507061190)
-- 8 hours earned on 2026-08-21 (Friday weekend work - Active, expires 2026-10-20)
-- 4 hours earned on 2026-08-28 (Friday weekend work - Active, expires 2026-10-27)
-- 3 hours earned on 2026-09-04 (Friday weekend work - Active accumulated <4h balance, expires 2026-11-03)
INSERT INTO public.compensatory_leave_ledger (
    id, tenant_id, employee_id, employee_code, employee_name, 
    on_duty_request_id, duty_date, duty_reason, duty_type, holiday_name,
    hours_earned, hours_utilized, remaining_balance, expiry_date, status, created_at, updated_at
) VALUES 
(
    'cpl-seed-001', 'jaago-main', 'emp-FO032507061190', 'FO032507061190', 'Nasif Kamal',
    'od-seed-wknd1', '2026-08-21', 'Critical cloud infrastructure server migration over weekend', 'WEEKEND', NULL,
    8.00, 0.00, 8.00, '2026-10-20', 'ACTIVE', NOW() - INTERVAL '23 days', NOW()
),
(
    'cpl-seed-002', 'jaago-main', 'emp-FO032507061190', 'FO032507061190', 'Nasif Kamal',
    'od-seed-wknd2', '2026-08-28', 'Emergency network failover drill on weekend', 'WEEKEND', NULL,
    4.00, 0.00, 4.00, '2026-10-27', 'ACTIVE', NOW() - INTERVAL '16 days', NOW()
),
(
    'cpl-seed-003', 'jaago-main', 'emp-FO032507061190', 'FO032507061190', 'Nasif Kamal',
    'od-seed-wknd3', '2026-09-04', 'Field backup testing (3 hours partial weekend duty)', 'WEEKEND', NULL,
    3.00, 0.00, 3.00, '2026-11-03', 'ACTIVE', NOW() - INTERVAL '9 days', NOW()
)
ON CONFLICT (id) DO UPDATE SET 
    hours_earned = EXCLUDED.hours_earned,
    remaining_balance = EXCLUDED.remaining_balance,
    status = EXCLUDED.status,
    updated_at = NOW();
