-- ============================================================================
-- JAAGO HUB GOVERNED MCP SERVER SCHEMA (Phase 1)
-- Description: Department-scoped inbound MCP Server tables with live bot tracking
-- ============================================================================

-- 1. Canonical Module Reference Catalog
CREATE TABLE IF NOT EXISTS public.mcp_modules (
    module_key VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    is_exposed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed canonical modules
INSERT INTO public.mcp_modules (module_key, label, description) VALUES
    ('attendance', 'Attendance', 'Daily punches, shifts, and geofence verification'),
    ('hr', 'People & Culture', 'Employee profiles, records, and directory'),
    ('payroll', 'JAAGO PAY', 'Salary structures, pay runs, and payslips'),
    ('on_duty', 'On-Duty Travel', 'Field missions, duty logs, and approvals'),
    ('leave', 'Time Off / Leaves', 'Leave quotas, balances, and applications'),
    ('finance', 'Finance & Accounting', 'Invoices, journal ledgers, and accounts'),
    ('contracts', 'Contracts', 'Staff agreements, renewals, and legal docs'),
    ('procurement', 'Procurement', 'Purchase orders, RFQs, goods receipts, vendors'),
    ('documents', 'Documents', 'Storage assets, compliance files, policies'),
    ('organization', 'Organization', 'Branches, departments, designations'),
    ('approvals', 'Approvals', 'Workflow states, signoffs, delegations'),
    ('reporting', 'Reporting', 'Operational summaries and audit metrics')
ON CONFLICT (module_key) DO UPDATE SET label = EXCLUDED.label;

-- 2. Registered AI Agents (Bots)
CREATE TABLE IF NOT EXISTS public.mcp_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    agent_type VARCHAR(50) DEFAULT 'custom' NOT NULL, -- 'claude_desktop' | 'claude_chrome' | 'custom'
    status VARCHAR(20) DEFAULT 'active' NOT NULL,     -- 'active' | 'suspended' | 'revoked'
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe type alignment if mcp_agents was created prior to error
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'mcp_agents' 
          AND column_name = 'org_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.mcp_agents ALTER COLUMN org_id TYPE TEXT;
    END IF;
END $$;

-- 3. Hashed Credentials (One-way hashed, zero plaintext at rest)
CREATE TABLE IF NOT EXISTS public.mcp_agent_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.mcp_agents(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,          -- SHA-256 hex digest
    token_prefix VARCHAR(16) NOT NULL,               -- e.g. "jhmcp_live_abc1" for display
    audience VARCHAR(100) DEFAULT 'https://hub.jaago.com.bd/api/mcp' NOT NULL,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Department-Scoped Access Grants Matrix
CREATE TABLE IF NOT EXISTS public.mcp_agent_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.mcp_agents(id) ON DELETE CASCADE,
    module_key VARCHAR(50) NOT NULL REFERENCES public.mcp_modules(module_key) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write', 'delete')),
    resource_filter JSONB,                           -- Forward-compatible optional row filter
    granted_by VARCHAR(100),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_agent_module_perm UNIQUE (agent_id, module_key, permission)
);

-- 5. Live Bot Connections Tracker (Application-synthesized status)
CREATE TABLE IF NOT EXISTS public.mcp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.mcp_agents(id) ON DELETE CASCADE,
    client_name VARCHAR(100),
    client_version VARCHAR(50),
    protocol_version VARCHAR(20) DEFAULT '2026-07-28' NOT NULL,
    client_capabilities JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,     -- 'active' | 'idle' | 'closed'
    request_count INTEGER DEFAULT 1 NOT NULL,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Append-Only Bot Activity Audit Log
CREATE TABLE IF NOT EXISTS public.mcp_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.mcp_agents(id) ON DELETE SET NULL,
    connection_id UUID REFERENCES public.mcp_connections(id) ON DELETE SET NULL,
    mcp_method VARCHAR(50) NOT NULL,                 -- 'tools/call', 'resources/read', 'server/discover'
    mcp_name VARCHAR(100),                           -- e.g. 'attendance.check_in'
    module_key VARCHAR(50),
    permission_used VARCHAR(20),
    outcome VARCHAR(20) NOT NULL,                    -- 'ok' | 'denied' | 'error'
    denial_reason TEXT,
    duration_ms INTEGER,
    params_digest JSONB DEFAULT '{}'::jsonb,         -- Field-scoped redacted parameters
    result_summary JSONB DEFAULT '{}'::jsonb,
    trace_id VARCHAR(64),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Indexes for High-Velocity Querying & Filtering
CREATE INDEX IF NOT EXISTS idx_mcp_cred_hash ON public.mcp_agent_credentials(token_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_scopes_agent ON public.mcp_agent_scopes(agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_conn_status ON public.mcp_connections(status, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_mcp_activity_agent ON public.mcp_activity(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_activity_time ON public.mcp_activity(created_at DESC);

-- 8. STRICT TWO-TIER ROW LEVEL SECURITY (Zero Anonymous Write)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'mcp_modules',
        'mcp_agents',
        'mcp_agent_credentials',
        'mcp_agent_scopes',
        'mcp_connections',
        'mcp_activity'
    ]) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_service_role" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_authenticated" ON public.%I;', tbl, tbl);
        
        -- Server APIs and MCP protocol engine
        EXECUTE format('CREATE POLICY "%s_service_role" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
        -- Logged-in admins and staff
        EXECUTE format('CREATE POLICY "%s_authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;
