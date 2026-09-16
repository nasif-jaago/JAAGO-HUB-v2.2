-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB — MIGRATION SCRIPT
-- Migration: Add Resignation Date, Notice Period Start & End Dates to Employees Table
-- Module   : People & Culture (HR) — Contracts, Resignation & Separation Governance
-- Author   : Antigravity AI Pair Programmer
-- Date     : 2026-09-16
-- ==============================================================================

-- 1. Add resignation_date, notice_period_start_date, and notice_period_end_date columns to public.employees
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS resignation_date DATE,
    ADD COLUMN IF NOT EXISTS notice_period_start_date DATE,
    ADD COLUMN IF NOT EXISTS notice_period_end_date DATE;

-- 2. Backfill existing notice_period_date to notice_period_end_date if not already set
UPDATE public.employees
SET notice_period_end_date = notice_period_date
WHERE notice_period_date IS NOT NULL AND notice_period_end_date IS NULL;

-- 3. Column Documentation & Governance Comments
COMMENT ON COLUMN public.employees.resignation_date IS 
    'The official date the employee formally submitted/tendered their letter of resignation';

COMMENT ON COLUMN public.employees.notice_period_start_date IS 
    'The formal commencement date of the contractual notice period';

COMMENT ON COLUMN public.employees.notice_period_end_date IS 
    'The conclusion date of notice period and official last operational working day';

-- 4. Optimized Indexes for Notice Period & Resignation Tracking
CREATE INDEX IF NOT EXISTS idx_employees_resignation_date
    ON public.employees(resignation_date)
    WHERE resignation_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_notice_dates 
    ON public.employees(is_notice_period, notice_period_start_date, notice_period_end_date) 
    WHERE is_notice_period = TRUE;

-- 5. Notify PostgREST schema cache to reload immediately
NOTIFY pgrst, 'reload schema';
