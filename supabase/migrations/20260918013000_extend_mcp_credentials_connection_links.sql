-- ==============================================================================
-- Migration: 20260918013000_extend_mcp_credentials_connection_links.sql
-- Description: Extends mcp_agent_credentials with kind, client_type, label, and ip_allowlist
--              to support Shareable Connection Links alongside API tokens.
-- Security: Inherits existing RLS policies on mcp_agent_credentials (service_role + authenticated).
-- ==============================================================================

ALTER TABLE public.mcp_agent_credentials
  ADD COLUMN IF NOT EXISTS kind VARCHAR(20) DEFAULT 'api_token' NOT NULL,
  ADD COLUMN IF NOT EXISTS client_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ip_allowlist JSONB;

CREATE INDEX IF NOT EXISTS idx_mcp_cred_kind ON public.mcp_agent_credentials(kind);
