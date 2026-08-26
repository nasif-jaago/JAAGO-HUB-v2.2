-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB (v2.2) — ENTERPRISE DATABASE SCHEMA DEFINITION
-- Domain  : People & Culture (HR) — Employee Directory & Profile Management
-- Engine  : PostgreSQL 15+ (Supabase Native)
-- Author  : Database Engineering Team
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. DROP EXISTING STRUCTURES (Idempotent Clean Setup)
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
DROP TABLE IF EXISTS public.employee_activity_logs CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;

-- ------------------------------------------------------------------------------
-- 3. CORE SCHEMA: EMPLOYEES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.employees (
    -- Primary & Identity Key
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                        VARCHAR(50) UNIQUE NOT NULL,
    name                        VARCHAR(255) NOT NULL,
    avatar_url                  TEXT,
    designation                 VARCHAR(150) NOT NULL DEFAULT 'Program Officer',
    work_email                  VARCHAR(255),
    work_mobile                 VARCHAR(50),
    working_schedule            VARCHAR(150) NOT NULL DEFAULT 'General Schedule (10:00 AM - 6:00 PM)',
    status                      VARCHAR(50) NOT NULL DEFAULT 'Active',
    is_archived                 BOOLEAN NOT NULL DEFAULT FALSE,

    -- Tab 1: Work & Operational Hierarchy
    organization                VARCHAR(150) NOT NULL DEFAULT 'JAAGO Foundation Trust',
    branch                      VARCHAR(150) NOT NULL DEFAULT 'Head Office (Banani)',
    department                  VARCHAR(150) NOT NULL DEFAULT 'Founder''s Office / FC',
    project                     VARCHAR(255) DEFAULT 'Tech 4 Development',
    team                        VARCHAR(255) DEFAULT 'Core Development Team',
    supervisor                  VARCHAR(255),
    secondary_supervisor        VARCHAR(255),
    work_location               VARCHAR(255) DEFAULT 'Banani, Dhaka',
    remark                      TEXT,

    -- Tab 2: Personal Information & Identification
    personal_email              VARCHAR(255),
    personal_phone              VARCHAR(50),
    bank_name                   VARCHAR(150) DEFAULT 'Eastern Bank Ltd',
    bank_account_number         VARCHAR(100),
    nick_name                   VARCHAR(100),
    nid                         VARCHAR(100),
    blood_group                 VARCHAR(10) DEFAULT 'B+',
    birthday                    DATE,
    gender                      VARCHAR(20) DEFAULT 'MALE',
    religion                    VARCHAR(50) DEFAULT 'Islam',
    marital_status              VARCHAR(50) DEFAULT 'Single',
    emergency_contact_name      VARCHAR(255),
    emergency_phone             VARCHAR(50),
    nationality                 VARCHAR(100) DEFAULT 'Bangladeshi',
    passport_no                 VARCHAR(100),
    home_address                TEXT,
    dependent_children          INT DEFAULT 0,

    -- Tab 3: Payroll, Compensation & Benefits
    joining_date                DATE DEFAULT CURRENT_DATE,
    contract_end_date           DATE,
    wage_type                   VARCHAR(20) NOT NULL DEFAULT 'Fixed',
    wage                        NUMERIC(15, 2) NOT NULL DEFAULT 150000.00,
    salary_jul_dec              NUMERIC(15, 2) NOT NULL DEFAULT 150000.00,
    salary_jan_jun              NUMERIC(15, 2) NOT NULL DEFAULT 150000.00,
    monthly_total_allowance     VARCHAR(10) NOT NULL DEFAULT 'Yes',
    six_months_completion_status VARCHAR(10) NOT NULL DEFAULT 'Yes',
    probationary_status         VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
    contract_type               VARCHAR(50) NOT NULL DEFAULT 'Full Time',
    no_tax_deduction            BOOLEAN NOT NULL DEFAULT FALSE,
    bonus_eligibility           VARCHAR(10) NOT NULL DEFAULT 'Yes',
    pf_applies                  VARCHAR(10) NOT NULL DEFAULT 'Yes',
    pf_rate                     NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    regular_salary              NUMERIC(15, 2) NOT NULL DEFAULT 150000.00,
    extra_hours                 NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    extra_payment               NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    calculation_value           VARCHAR(50) NOT NULL DEFAULT '1.0x',
    temporary_salary            NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_current_salary        NUMERIC(15, 2) NOT NULL DEFAULT 150000.00,
    currency                    VARCHAR(10) NOT NULL DEFAULT 'BDT',
    adjustment_start_date       DATE,
    adjustment_end_date         DATE,
    assigned_teacher_staff      VARCHAR(255) DEFAULT 'Core Management',
    payroll_remark              TEXT,

    -- Tab 4: Health & Life Insurance (Enterprise Covered)
    insurance_status            VARCHAR(50) DEFAULT 'Active',
    insurance_coverage_category VARCHAR(150) DEFAULT 'Executive Coverage (Plan A)',
    insurance_monthly_premium   NUMERIC(15, 2) DEFAULT 2500.00,
    employee_health_insurance_id VARCHAR(100) DEFAULT 'HI-EMP-10029',
    spouse_health_insurance_id  VARCHAR(100),
    spouse_name                 VARCHAR(255),
    child1_health_insurance_id  VARCHAR(100),
    child1_name                 VARCHAR(255),
    child2_health_insurance_id  VARCHAR(100),
    child2_name                 VARCHAR(255),
    child3_health_insurance_id  VARCHAR(100),
    child3_name                 VARCHAR(255),

    -- Tab 5: DSP & Shift Schedule
    office_days                 VARCHAR(100) NOT NULL DEFAULT 'Sunday to Thursday',
    custom_office_days_from     VARCHAR(50),
    custom_office_days_to       VARCHAR(50),
    office_hours                VARCHAR(100) NOT NULL DEFAULT '10:00 AM - 06:00 PM',
    rfid                        VARCHAR(100),
    leave_group                 VARCHAR(100) NOT NULL DEFAULT 'Standard Full-time',
    employee_type               VARCHAR(50) NOT NULL DEFAULT 'Permanent',

    -- System & IAM Authentication Link
    is_user                     BOOLEAN NOT NULL DEFAULT TRUE,
    user_id                     UUID,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. AUDIT LOGGING: ACTIVITY LOGS TABLE (Enterprise History Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE public.employee_activity_logs (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id                 UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_code               VARCHAR(50),
    user_name                   VARCHAR(255) NOT NULL,
    user_role                   VARCHAR(100) DEFAULT 'Staff',
    field_name                  VARCHAR(150) NOT NULL,
    old_value                   TEXT,
    new_value                   TEXT,
    action_type                 VARCHAR(50) NOT NULL DEFAULT 'update',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES (High-Speed Filtering & Search)
-- ------------------------------------------------------------------------------
CREATE INDEX idx_employees_code ON public.employees(code);
CREATE INDEX idx_employees_name ON public.employees(name);
CREATE INDEX idx_employees_work_email ON public.employees(work_email);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_dept ON public.employees(department);
CREATE INDEX idx_employees_org ON public.employees(organization);
CREATE INDEX idx_employees_branch ON public.employees(branch);
CREATE INDEX idx_employees_project ON public.employees(project);
CREATE INDEX idx_employees_team ON public.employees(team);
CREATE INDEX idx_employees_is_archived ON public.employees(is_archived);
CREATE INDEX idx_activity_logs_emp_id ON public.employee_activity_logs(employee_id);
CREATE INDEX idx_activity_logs_created_at ON public.employee_activity_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. AUTOMATED TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. SECURITY: ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access on employees" ON public.employees;
CREATE POLICY "Allow full access on employees"
ON public.employees FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access on employee_activity_logs" ON public.employee_activity_logs;
CREATE POLICY "Allow full access on employee_activity_logs"
ON public.employee_activity_logs FOR ALL
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. SUPABASE STORAGE BUCKETS & MULTI-BUCKET CONFIGURATION
-- ------------------------------------------------------------------------------
-- 8.1 Employee Avatars & Profile Photos Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'employees',
    'employees',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 8.2 Organization & Company Logos Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'organization-logos',
    'organization-logos',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- 8.3 Organization Policy & Attachment Documents Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'policy-documents',
    'policy-documents',
    true,
    20971520, -- 20 MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public View Access on Storage Objects" ON storage.objects;
DROP POLICY IF EXISTS "Full Access on Storage Objects" ON storage.objects;

CREATE POLICY "Public View Access on Storage Objects"
ON storage.objects FOR SELECT
USING (bucket_id IN ('employees', 'organization-logos', 'policy-documents'));

CREATE POLICY "Full Access on Storage Objects"
ON storage.objects FOR ALL
USING (bucket_id IN ('employees', 'organization-logos', 'policy-documents'))
WITH CHECK (bucket_id IN ('employees', 'organization-logos', 'policy-documents'));

-- ------------------------------------------------------------------------------
-- 9. INITIAL PRODUCTION DATA: PRIMARY EMPLOYEE (Nasif Kamal)
-- ------------------------------------------------------------------------------
INSERT INTO public.employees (
    id,
    code,
    name,
    designation,
    work_email,
    work_mobile,
    working_schedule,
    status,
    is_archived,
    organization,
    branch,
    department,
    project,
    team,
    supervisor,
    secondary_supervisor,
    work_location,
    remark,
    personal_email,
    personal_phone,
    bank_name,
    bank_account_number,
    nick_name,
    nid,
    blood_group,
    birthday,
    gender,
    religion,
    marital_status,
    emergency_contact_name,
    emergency_phone,
    nationality,
    passport_no,
    home_address,
    dependent_children,
    joining_date,
    contract_end_date,
    wage_type,
    wage,
    salary_jul_dec,
    salary_jan_jun,
    monthly_total_allowance,
    six_months_completion_status,
    probationary_status,
    contract_type,
    no_tax_deduction,
    bonus_eligibility,
    pf_applies,
    pf_rate,
    regular_salary,
    total_current_salary,
    currency,
    insurance_status,
    insurance_coverage_category,
    insurance_monthly_premium,
    employee_health_insurance_id,
    office_days,
    office_hours,
    rfid,
    leave_group,
    employee_type,
    is_user
) VALUES (
    '71a38594-d803-4e6d-b6e9-79767a16c4c6',
    'FO032507061190',
    'Nasif Kamal',
    'Coordinator, Tech 4 Development',
    'nasif.kamal@jaago.com.bd',
    '+880 1711 000001',
    'General Schedule (10:00 AM - 6:00 PM)',
    'Active',
    FALSE,
    'JAAGO Foundation Trust',
    'Head Office (Banani)',
    'Founder''s Office / FC',
    'Tech 4 Development',
    'Core Development Team',
    'Founder & Executive Director',
    'Habibur Rahman',
    'Banani, Dhaka',
    'Lead Developer & System Administrator',
    'nasif.personal@gmail.com',
    '+880 1811 000001',
    'Eastern Bank Ltd',
    '1041234567800',
    'Nasif',
    '1996269123456789',
    'B+',
    '1996-05-15',
    'MALE',
    'Islam',
    'Single',
    'Kamal Hossain (Father)',
    '+880 1811 999000',
    'Bangladeshi',
    'A09876543',
    'Road 11, Banani, Dhaka-1213',
    0,
    '2026-08-24',
    '2028-12-31',
    'Fixed',
    150000.00,
    150000.00,
    150000.00,
    'Yes',
    'Yes',
    'Confirmed',
    'Full Time',
    FALSE,
    'Yes',
    'Yes',
    10.00,
    150000.00,
    150000.00,
    'BDT',
    'Active',
    'Executive Coverage (Plan A)',
    2500.00,
    'HI-EMP-10029',
    'Sunday to Thursday',
    '10:00 AM - 06:00 PM',
    'RFID-100290',
    'Standard Full-time',
    'Permanent',
    TRUE
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    designation = EXCLUDED.designation,
    work_email = EXCLUDED.work_email,
    status = EXCLUDED.status,
    organization = EXCLUDED.organization,
    department = EXCLUDED.department,
    project = EXCLUDED.project,
    team = EXCLUDED.team,
    insurance_status = EXCLUDED.insurance_status,
    insurance_coverage_category = EXCLUDED.insurance_coverage_category,
    insurance_monthly_premium = EXCLUDED.insurance_monthly_premium,
    employee_health_insurance_id = EXCLUDED.employee_health_insurance_id,
    updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 10. INITIAL AUDIT ACTIVITY LOG
-- ------------------------------------------------------------------------------
INSERT INTO public.employee_activity_logs (
    employee_id,
    employee_code,
    user_name,
    user_role,
    field_name,
    old_value,
    new_value,
    action_type
) VALUES (
    '71a38594-d803-4e6d-b6e9-79767a16c4c6',
    'FO032507061190',
    'System Admin',
    'Super Admin',
    'Profile Provisioning',
    'None',
    'Active Master Record Created',
    'create'
);
