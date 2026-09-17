-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB — MIGRATION SCRIPT
-- Migration: Add Family Information Columns to Employees Table
-- Module   : People & Culture (HR) — Personal Information & Family Governance
-- Author   : Antigravity AI Pair Programmer
-- Date     : 2026-09-17
-- ==============================================================================

-- 1. Add father_name, mother_name, spouse_name, and children_names columns to public.employees
ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS father_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS children_names JSONB DEFAULT '[]'::jsonb;

-- 2. Column Documentation & Governance Comments
COMMENT ON COLUMN public.employees.father_name IS 
    'Full legal name of the employee father';

COMMENT ON COLUMN public.employees.mother_name IS 
    'Full legal name of the employee mother';

COMMENT ON COLUMN public.employees.spouse_name IS 
    'Full legal name of the employee spouse / wife / husband';

COMMENT ON COLUMN public.employees.children_names IS 
    'JSONB array of child names belonging to the employee';

-- 3. Notify PostgREST schema cache to reload immediately
NOTIFY pgrst, 'reload schema';
