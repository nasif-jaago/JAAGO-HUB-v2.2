-- ============================================================================
-- JAAGO HUB v2.2 — Canonical Email & SMTP Subsystem Schema
-- Migration: 20260831230000_create_email_subsystem_schema.sql
-- ============================================================================

-- 1. Create email_servers table
CREATE TABLE IF NOT EXISTS public.email_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 1,
    sender_email VARCHAR(255) NOT NULL,
    sender_name VARCHAR(150) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 587 CHECK (port BETWEEN 1 AND 65535 AND port <> 25),
    encryption VARCHAR(20) NOT NULL DEFAULT 'starttls' CHECK (encryption IN ('starttls', 'ssl_tls', 'none')),
    username VARCHAR(255) NOT NULL,
    password_ciphertext TEXT NOT NULL,
    password_iv VARCHAR(64) NOT NULL,
    password_tag VARCHAR(64) NOT NULL,
    password_key_id VARCHAR(50) NOT NULL DEFAULT 'v1',
    min_interval_seconds INTEGER NOT NULL DEFAULT 0,
    max_per_hour INTEGER NOT NULL DEFAULT 0,
    max_per_day INTEGER NOT NULL DEFAULT 0,
    reply_to VARCHAR(255),
    health_state VARCHAR(20) NOT NULL DEFAULT 'healthy' CHECK (health_state IN ('healthy', 'degraded', 'down')),
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_verified_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    last_error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID,
    updated_by UUID
);

-- 2. Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    module VARCHAR(50) NOT NULL DEFAULT 'general',
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    variables_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_by UUID,
    updated_by UUID
);

-- 3. Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_key VARCHAR(100),
    server_id UUID REFERENCES public.email_servers(id) ON DELETE SET NULL,
    to_address TEXT NOT NULL,
    cc_address TEXT,
    bcc_address TEXT,
    from_address VARCHAR(255) NOT NULL,
    reply_to VARCHAR(255),
    subject_rendered TEXT NOT NULL,
    body_rendered TEXT,
    variables_used JSONB DEFAULT '{}'::jsonb,
    module VARCHAR(50) NOT NULL DEFAULT 'general',
    related_entity_type VARCHAR(50),
    related_entity_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'deferred', 'bounced')),
    error_reason TEXT,
    error_detail JSONB DEFAULT '{}'::jsonb,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    provider_message_id VARCHAR(255),
    trace_id VARCHAR(100),
    queued_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    processing_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. Indexes for Performance & Queries
CREATE INDEX IF NOT EXISTS idx_email_servers_priority ON public.email_servers(priority, is_enabled);
CREATE INDEX IF NOT EXISTS idx_email_servers_org ON public.email_servers(organization_id);

CREATE INDEX IF NOT EXISTS idx_email_templates_key ON public.email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_module ON public.email_templates(module, is_active);
CREATE INDEX IF NOT EXISTS idx_email_templates_org ON public.email_templates(organization_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_status_queued ON public.email_logs(status, queued_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_module ON public.email_logs(module);
CREATE INDEX IF NOT EXISTS idx_email_logs_to ON public.email_logs(to_address);
CREATE INDEX IF NOT EXISTS idx_email_logs_trace ON public.email_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_entity ON public.email_logs(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON public.email_logs(organization_id);

-- 5. Row-Level Security (RLS) Enablement
ALTER TABLE public.email_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Tenant isolation & Authenticated access)
DROP POLICY IF EXISTS email_servers_tenant_isolation ON public.email_servers;
CREATE POLICY email_servers_tenant_isolation ON public.email_servers
    FOR ALL
    TO authenticated, service_role
    USING (
        organization_id IS NULL OR
        organization_id = NULLIF(current_setting('app.current_organization_id', true), '')
    )
    WITH CHECK (
        organization_id IS NULL OR
        organization_id = NULLIF(current_setting('app.current_organization_id', true), '')
    );

DROP POLICY IF EXISTS email_templates_tenant_isolation ON public.email_templates;
CREATE POLICY email_templates_tenant_isolation ON public.email_templates
    FOR ALL
    TO authenticated, service_role
    USING (
        organization_id IS NULL OR
        organization_id = NULLIF(current_setting('app.current_organization_id', true), '')
    )
    WITH CHECK (
        organization_id IS NULL OR
        organization_id = NULLIF(current_setting('app.current_organization_id', true), '')
    );

DROP POLICY IF EXISTS email_logs_tenant_isolation ON public.email_logs;
CREATE POLICY email_logs_tenant_isolation ON public.email_logs
    FOR ALL
    TO authenticated, service_role
    USING (
        organization_id IS NULL OR
        organization_id = NULLIF(current_setting('app.current_organization_id', true), '')
    )
    WITH CHECK (
        organization_id IS NULL OR
        organization_id = NULLIF(current_setting('app.current_organization_id', true), '')
    );

-- 7. Grant access to application role
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'jaago_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_servers TO jaago_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO jaago_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO jaago_app;
    END IF;
END $$;
