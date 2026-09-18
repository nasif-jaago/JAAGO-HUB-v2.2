-- Migration: Fix Security Definer View on public.att_effective_daily
-- Description: Sets security_invoker = true so the view honors the querying user's RLS policies
--              and resolves Supabase Database Linter critical warning without changing existing logic.

ALTER VIEW IF EXISTS public.att_effective_daily SET (security_invoker = true);

-- Ensure authenticated and anon roles retain SELECT permissions
GRANT SELECT ON public.att_effective_daily TO authenticated, anon;
