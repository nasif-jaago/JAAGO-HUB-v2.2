-- ============================================================================
-- Migration: 20260830180000_create_canonical_rbac_schema.sql
-- Description: Canonical Role-Based Access Control (RBAC) & CASL Permission Engine Schema
-- Governing Standard: DATABASE-STANDARD.md
-- ============================================================================

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID,
    slug VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#10B981',
    is_system BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure color column exists if table was created in an earlier migration
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#10B981';

-- Ensure unique index/constraint exists on roles(slug) for ON CONFLICT resolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_slug_unique ON public.roles(slug);

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.roles'::regclass 
        AND contype = 'u' 
        AND conname = 'roles_slug_unique_constraint'
    ) THEN
        ALTER TABLE public.roles ADD CONSTRAINT roles_slug_unique_constraint UNIQUE USING INDEX idx_roles_slug_unique;
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. PERMISSIONS CATALOG TABLE
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL,
    module VARCHAR(50) DEFAULT 'core' NOT NULL,
    action VARCHAR(50) DEFAULT 'view' NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure unique index/constraint exists on permissions(slug) for ON CONFLICT resolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_slug_unique ON public.permissions(slug);

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.permissions'::regclass 
        AND contype = 'u' 
        AND conname = 'permissions_slug_unique_constraint'
    ) THEN
        ALTER TABLE public.permissions ADD CONSTRAINT permissions_slug_unique_constraint UNIQUE USING INDEX idx_permissions_slug_unique;
    END IF;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. ROLE-PERMISSION MAPPINGS TABLE
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. USER ROLES ASSIGNMENT TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

-- High-speed indexes
CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if they exist to avoid duplicate errors on re-run
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read roles" ON public.roles;
    DROP POLICY IF EXISTS "Allow authenticated read permissions" ON public.permissions;
    DROP POLICY IF EXISTS "Allow authenticated read role_permissions" ON public.role_permissions;
    DROP POLICY IF EXISTS "Allow authenticated read user_roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Allow service_role full roles" ON public.roles;
    DROP POLICY IF EXISTS "Allow service_role full permissions" ON public.permissions;
    DROP POLICY IF EXISTS "Allow service_role full role_permissions" ON public.role_permissions;
    DROP POLICY IF EXISTS "Allow service_role full user_roles" ON public.user_roles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- RLS Policies: Allow authenticated users to view active roles and permissions
CREATE POLICY "Allow authenticated read roles" ON public.roles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read permissions" ON public.permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read role_permissions" ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read user_roles" ON public.user_roles
    FOR SELECT TO authenticated USING (true);

-- Service role full access policies
CREATE POLICY "Allow service_role full roles" ON public.roles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full permissions" ON public.permissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full role_permissions" ON public.role_permissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service_role full user_roles" ON public.user_roles
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- SEED CANONICAL PERMISSIONS CATALOG (46 Capabilities across 8 Modules)
-- ============================================================================
INSERT INTO public.permissions (slug, module, action, description) VALUES
-- System & Admin
('system.users.view', 'system_admin', 'view', 'View user directory and account details'),
('system.users.create', 'system_admin', 'create', 'Create user accounts and send email invitations'),
('system.users.update', 'system_admin', 'update', 'Edit user accounts, profiles, and departments'),
('system.users.delete', 'system_admin', 'delete', 'Hard delete user accounts or revoke sessions'),
('system.users.manage_roles', 'system_admin', 'manage', 'Assign roles and modify RBAC permission matrix'),
('system.api_keys.manage', 'system_admin', 'manage', 'Generate and revoke system API credentials'),
('system.settings.manage', 'system_admin', 'manage', 'Modify global platform settings & integrations'),

-- Organization & Hierarchy
('org.view', 'organization', 'view', 'View organization profiles, branches, and departments'),
('org.manage', 'organization', 'manage', 'Create and update organization legal entities'),
('org.branches.manage', 'organization', 'manage', 'Create, update, and archive branch locations'),
('org.departments.manage', 'organization', 'manage', 'Create, rename, and manage department hierarchies'),
('org.designations.manage', 'organization', 'manage', 'Create and configure organizational job titles'),
('org.policies.manage', 'organization', 'manage', 'Upload and publish official NGO compliance policies'),

-- People & Culture (HR Employees)
('hr.employees.view_all', 'hr_employees', 'view', 'Access directory of all 746+ employee records'),
('hr.employees.view_dept', 'hr_employees', 'view', 'Access employee records only within assigned department'),
('hr.employees.create', 'hr_employees', 'create', 'Add new staff profiles across all 7 tabs'),
('hr.employees.edit', 'hr_employees', 'update', 'Modify employee personal, payroll, and work info'),
('hr.employees.mass_update', 'hr_employees', 'manage', 'Perform bulk Odoo-style batch edits on employee fields'),
('hr.employees.delete', 'hr_employees', 'delete', 'Hard delete or archive employee records'),
('hr.employees.export', 'hr_employees', 'export', 'Export full comprehensive employee database'),
('hr.employees.import', 'hr_employees', 'import', 'Bulk Import Employee CSV'),

-- Attendance & Shifts
('attendance.view_all', 'attendance', 'view', 'View organization-wide daily check-in/out records'),
('attendance.view_own', 'attendance', 'view', 'View personal check-in/out history and timesheets'),
('attendance.manage_shifts', 'attendance', 'manage', 'Create and assign work shifts (HQ, School, Custom)'),
('attendance.manual_entry', 'attendance', 'create', 'Add or adjust attendance punches on behalf of staff'),
('attendance.export', 'attendance', 'export', 'Download monthly biometric attendance spreadsheets'),

-- Leave & Time-Off
('leave.apply_own', 'leave_timeoff', 'create', 'Submit self-service casual, sick, or earned leave'),
('leave.view_all', 'leave_timeoff', 'view', 'Access organization-wide leave calendar and balances'),
('leave.approve_dept', 'leave_timeoff', 'approve', 'Approve/Reject leaves for direct team/department members'),
('leave.approve_all', 'leave_timeoff', 'approve', 'Give final People & Culture authorization on any leave'),
('leave.manage_holidays', 'leave_timeoff', 'manage', 'Configure national holidays and organizational off-days'),
('leave.balance_adjust', 'leave_timeoff', 'adjust', 'Manually credit/debit annual leave allocation balances'),

-- On-Duty & Field Movement
('onduty.apply_own', 'on_duty', 'create', 'Submit personal fieldwork / travel duty records'),
('onduty.view_all', 'on_duty', 'view', 'View organization-wide field travel and on-duty logs'),
('onduty.approve_dept', 'on_duty', 'approve', 'Line manager approval for team field movements'),
('onduty.approve_all', 'on_duty', 'approve', 'Authorize and mark attendance as Official On-Duty'),
('onduty.export', 'on_duty', 'export', 'Download monthly field travel and on-duty audit reports'),

-- Payroll, Finance & Accounting
('finance.journals.view', 'payroll_finance', 'view', 'Access chart of accounts, ledgers, and general journals'),
('finance.journals.post', 'payroll_finance', 'create', 'Create and post balanced debit/credit transactions'),
('finance.budget.manage', 'payroll_finance', 'manage', 'Allocate, adjust, and track project expenditure budgets'),
('payroll.view_all', 'payroll_finance', 'view', 'Access confidential salary and wage data for all staff'),
('payroll.manage_structures', 'payroll_finance', 'manage', 'Set wage rates, bonus rules, and PF percentages'),
('payroll.export', 'payroll_finance', 'export', 'Generate bank-ready salary disbursement CSV files'),

-- Audit Trail & Compliance
('system.audit.view', 'audit_security', 'view', 'Review system events and user activity histories'),
('system.audit.verify', 'audit_security', 'manage', 'Execute SHA-256 integrity checks against audit blocks'),
('system.audit.export', 'audit_security', 'export', 'Download compliance audit logs for external regulators')
ON CONFLICT (slug) DO UPDATE SET
    module = EXCLUDED.module,
    action = EXCLUDED.action,
    description = EXCLUDED.description;

-- ============================================================================
-- SEED CANONICAL SYSTEM ROLES
-- ============================================================================
INSERT INTO public.roles (slug, name, description, color, is_system) VALUES
('super_admin', 'Super Administrator', 'Unrestricted master access to all platform modules, configuration, security, and databases.', '#F59E0B', true),
('executive_director', 'Executive Director / Management', 'Strategic leadership with full organizational visibility, audit access, and top-level approvals.', '#8B5CF6', true),
('pnc_lead', 'People & Culture (HR) Lead', 'Full administrative control over HR, employee lifecycle, leaves, on-duty, attendance, and policies.', '#EC4899', true),
('pnc_officer', 'People & Culture Officer', 'Operational HR staff managing employee records, attendance logs, and leave requests.', '#3B82F6', true),
('dept_manager', 'Department Manager / Line Lead', 'Line managers responsible for team shift oversight, leave approvals, and field movement sign-off.', '#10B981', true),
('finance_lead', 'Finance & Accounts Lead', 'Full accounting control, financial journal posting, salary disbursement, and budget tracking.', '#F97316', true),
('general_staff', 'General Staff / Teacher', 'Standard employee self-service access for applying for leaves, on-duty travel, and profile view.', '#64748B', true),
('auditor', 'Compliance & External Auditor', 'Read-only access to audit logs, cryptographic ledger verification, and compliance exports.', '#06B6D4', true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    is_system = EXCLUDED.is_system;
