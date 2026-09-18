-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB — MIGRATION SCRIPT
-- Migration: Add Cross Departments Column to Employees Table
-- Module   : People & Culture (HR) — Operational Hierarchy & Cross-Department Scope
-- Author   : Antigravity AI Pair Programmer
-- Date     : 2026-09-18
-- ==============================================================================

-- 1. Add cross_departments column to public.employees
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS cross_departments JSONB DEFAULT '[]'::jsonb;

-- 2. Column Documentation & Governance Comments
COMMENT ON COLUMN public.employees.cross_departments IS 
    'JSONB array of department names for cross-department collaboration scope in My Dashboard';

-- 3. Notify PostgREST schema cache to reload immediately
NOTIFY pgrst, 'reload schema';
