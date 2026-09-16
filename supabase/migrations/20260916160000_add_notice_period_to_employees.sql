-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB — MIGRATION SCRIPT
-- Migration: Add Notice Period Fields to Employees Table
-- Module   : People & Culture (HR) — Contracts & Separation Management
-- Author   : Antigravity AI Pair Programmer
-- Date     : 2026-09-16
-- ==============================================================================

-- 1. Add Notice Period toggle flag and Notice Period Date columns to public.employees
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS is_notice_period BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notice_period_date DATE;

-- 2. Column Documentation & Governance Comments
COMMENT ON COLUMN public.employees.is_notice_period IS 
    'Boolean flag indicating if the employee is actively serving their contractual notice period (TRUE = On, FALSE = Off)';

COMMENT ON COLUMN public.employees.notice_period_date IS 
    'The effective last operational working day / conclusion date of the notice period';

-- 3. Optimized Partial Index for Performance
-- Allows instantaneous filtering of employees currently in separation / notice period pipeline
CREATE INDEX IF NOT EXISTS idx_employees_notice_period 
    ON public.employees(is_notice_period, notice_period_date) 
    WHERE is_notice_period = TRUE;

-- 4. Notify PostgREST schema cache to reload immediately
NOTIFY pgrst, 'reload schema';
