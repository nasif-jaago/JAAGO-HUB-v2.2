-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB — MIGRATION SCRIPT
-- Migration: Add Bank Branch, Routing Number, and SWIFT Code to Employees Table
-- Module   : People & Culture (HR) — Personal Information & Bank Governance
-- Author   : Antigravity AI Pair Programmer
-- Date     : 2026-09-16
-- ==============================================================================

-- 1. Add bank_branch, bank_routing_number, and bank_swift_code columns to public.employees
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(150),
    ADD COLUMN IF NOT EXISTS bank_routing_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS bank_swift_code VARCHAR(50);

-- 2. Column Documentation & Governance Comments
COMMENT ON COLUMN public.employees.bank_branch IS 
    'The specific bank branch name where the employee payroll account is held';

COMMENT ON COLUMN public.employees.bank_routing_number IS 
    'The 9-digit electronic fund transfer routing transit number for the branch';

COMMENT ON COLUMN public.employees.bank_swift_code IS 
    'The 8 or 11-character SWIFT / BIC code for international wire and EFT transfers';

-- 3. Notify PostgREST schema cache to reload immediately
NOTIFY pgrst, 'reload schema';
