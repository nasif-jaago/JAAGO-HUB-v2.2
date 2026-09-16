-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB — MIGRATION SCRIPT
-- Migration: Add Confirmation Date to Employees Table
-- Module   : People & Culture (HR) — Payroll & Contract Governance
-- Author   : Antigravity AI Pair Programmer
-- Date     : 2026-09-16
-- ==============================================================================

-- 1. Add confirmation_date column to public.employees
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS confirmation_date DATE;

-- 2. Column Documentation & Governance Comment
COMMENT ON COLUMN public.employees.confirmation_date IS 
    'The effective date on which the employee completed probation and was formally confirmed';

-- 3. Notify PostgREST schema cache to reload immediately
NOTIFY pgrst, 'reload schema';
