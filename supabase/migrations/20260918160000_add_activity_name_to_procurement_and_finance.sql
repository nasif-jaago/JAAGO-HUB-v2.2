-- =============================================================================
-- Migration: 20260918160000_add_activity_name_to_procurement_and_finance.sql
-- Module: Procurement & Finance Workflows
-- Standard: JAAGO-HUB v2.2 Zero-Anomaly Standard & DATABASE-STANDARD.md
-- =============================================================================

-- Add activity_name and activity_code to public.procurement_requests if not already present
ALTER TABLE IF EXISTS public.procurement_requests 
ADD COLUMN IF NOT EXISTS activity_name TEXT,
ADD COLUMN IF NOT EXISTS activity_code TEXT;

-- Comment on columns for schema documentation
COMMENT ON COLUMN public.procurement_requests.activity_name IS 'Descriptive title or name of the organizational activity';
COMMENT ON COLUMN public.procurement_requests.activity_code IS 'Activity budget line or project activity code (e.g. PRJ-GEN, ACT-2026-CSB-01)';
