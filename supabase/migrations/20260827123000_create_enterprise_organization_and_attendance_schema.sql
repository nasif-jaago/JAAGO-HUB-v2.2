-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB (v2.2) — ENTERPRISE DATA PERSISTENCE MIGRATION
-- Domain  : People & Culture (HR), Organization Metadata & Attendance Logging
-- Engine  : PostgreSQL 15+ (Supabase Native)
-- Standard: DATABASE-STANDARD.md v1.0
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. REUSABLE UPDATED_AT TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. CLEAN SETUP (DROP LEGACY MISCONFIGURED / EMPTY TABLES)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.insurance_categories CASCADE;
DROP TABLE IF EXISTS public.organization_policies CASCADE;
DROP TABLE IF EXISTS public.organization_branches CASCADE;
DROP TABLE IF EXISTS public.designations CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.attendance_logs CASCADE;

-- ------------------------------------------------------------------------------
-- 4. ORGANIZATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.organizations (
    id                          TEXT PRIMARY KEY DEFAULT ('org-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    code                        VARCHAR(100),
    logo_url                    TEXT,
    address                     TEXT,
    city                        VARCHAR(100) DEFAULT 'Dhaka',
    division                    VARCHAR(100) DEFAULT 'Dhaka',
    postal_code                 VARCHAR(50),
    country                     VARCHAR(100) DEFAULT 'Bangladesh',
    partner_country             VARCHAR(100),
    phone                       VARCHAR(50),
    email                       VARCHAR(255),
    website                     VARCHAR(255),
    email_domain                VARCHAR(150),
    brand_color                 VARCHAR(50) DEFAULT '#F59E0B',
    tax_id                      VARCHAR(100),
    company_id                  VARCHAR(100),
    currency                    VARCHAR(20) DEFAULT 'BDT',
    is_archived                 BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_code ON public.organizations(code);
CREATE INDEX idx_organizations_name ON public.organizations(name);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on organizations" ON public.organizations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on organizations" ON public.organizations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. ORGANIZATION BRANCHES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.organization_branches (
    id                          TEXT PRIMARY KEY DEFAULT ('br-' || gen_random_uuid()::text),
    organization_id             TEXT NOT NULL,
    name                        VARCHAR(255) NOT NULL,
    code                        VARCHAR(100),
    phone                       VARCHAR(50),
    email                       VARCHAR(255),
    address                     TEXT,
    city                        VARCHAR(100) DEFAULT 'Dhaka',
    country                     VARCHAR(100) DEFAULT 'Bangladesh',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_branches_org_id ON public.organization_branches(organization_id);
CREATE INDEX idx_org_branches_name ON public.organization_branches(name);

ALTER TABLE public.organization_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on organization_branches" ON public.organization_branches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on organization_branches" ON public.organization_branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. ORGANIZATION POLICIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.organization_policies (
    id                          TEXT PRIMARY KEY DEFAULT ('pol-' || gen_random_uuid()::text),
    organization_id             TEXT NOT NULL,
    title                       VARCHAR(255) NOT NULL,
    category                    VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
    description                 TEXT,
    attachment_name             VARCHAR(255),
    attachment_size             VARCHAR(50),
    attachment_url              TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_policies_org_id ON public.organization_policies(organization_id);
CREATE INDEX idx_org_policies_category ON public.organization_policies(category);

ALTER TABLE public.organization_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on organization_policies" ON public.organization_policies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on organization_policies" ON public.organization_policies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. DESIGNATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.designations (
    id                          TEXT PRIMARY KEY DEFAULT ('desig-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    code                        VARCHAR(100),
    grade                       VARCHAR(50),
    department_or_project       VARCHAR(255),
    description                 TEXT,
    is_archived                 BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_designations_name ON public.designations(name);
CREATE INDEX idx_designations_code ON public.designations(code);

ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on designations" ON public.designations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on designations" ON public.designations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. DEPARTMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.departments (
    id                          TEXT PRIMARY KEY DEFAULT ('dept-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    code                        VARCHAR(100),
    organization_id             TEXT,
    organization_name           VARCHAR(255) DEFAULT 'JAAGO Foundation',
    parent_department_id        TEXT,
    parent_department_name      VARCHAR(255),
    manager_name                VARCHAR(255),
    manager_id                  TEXT,
    description                 TEXT,
    is_archived                 BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_departments_name ON public.departments(name);
CREATE INDEX idx_departments_code ON public.departments(code);
CREATE INDEX idx_departments_org_id ON public.departments(organization_id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on departments" ON public.departments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on departments" ON public.departments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 9. PROJECTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.projects (
    id                          TEXT PRIMARY KEY DEFAULT ('prj-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    code                        VARCHAR(100),
    organization_id             TEXT,
    organization_name           VARCHAR(255) DEFAULT 'JAAGO Foundation',
    parent_department_id        TEXT,
    parent_department_name      VARCHAR(255),
    project_manager_name        VARCHAR(255),
    project_manager_id          TEXT,
    finance_lead_name           VARCHAR(255),
    finance_lead_id             TEXT,
    description                 TEXT,
    status                      VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    budget                      NUMERIC(20, 2) DEFAULT 0,
    is_archived                 BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_name ON public.projects(name);
CREATE INDEX idx_projects_code ON public.projects(code);
CREATE INDEX idx_projects_status ON public.projects(status);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on projects" ON public.projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on projects" ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 10. TEAMS & TEAM MEMBERS TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE public.teams (
    id                          TEXT PRIMARY KEY DEFAULT ('tm-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    code                        VARCHAR(100),
    department_or_project       VARCHAR(255),
    team_lead_name              VARCHAR(255),
    team_lead_id                TEXT,
    description                 TEXT,
    is_archived                 BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_name ON public.teams(name);
CREATE INDEX idx_teams_code ON public.teams(code);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on teams" ON public.teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on teams" ON public.teams FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.team_members (
    id                          TEXT PRIMARY KEY DEFAULT ('mem-' || gen_random_uuid()::text),
    team_id                     TEXT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    employee_id                 TEXT,
    employee_name               VARCHAR(255) NOT NULL,
    employee_code               VARCHAR(100),
    role                        VARCHAR(100) DEFAULT 'Member',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_emp_code ON public.team_members(employee_code);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on team_members" ON public.team_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on team_members" ON public.team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 11. INSURANCE CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.insurance_categories (
    id                          TEXT PRIMARY KEY DEFAULT ('ins-' || gen_random_uuid()::text),
    name                        VARCHAR(255) NOT NULL,
    monthly_premium             NUMERIC(15, 2) NOT NULL DEFAULT 1500.00,
    description                 TEXT,
    coverage_details            TEXT,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insurance_cat_name ON public.insurance_categories(name);

ALTER TABLE public.insurance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on insurance_categories" ON public.insurance_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on insurance_categories" ON public.insurance_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 12. ATTENDANCE LOGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.attendance_logs (
    id                          TEXT PRIMARY KEY DEFAULT ('att-' || gen_random_uuid()::text),
    employee_id                 TEXT,
    employee_code               VARCHAR(100) NOT NULL,
    employee_name               VARCHAR(255) NOT NULL,
    designation                 VARCHAR(150),
    department                  VARCHAR(150),
    branch                      VARCHAR(150),
    avatar_url                  TEXT,
    status                      VARCHAR(50) NOT NULL DEFAULT 'Present',
    device                      VARCHAR(100) DEFAULT 'Web Portal',
    timestamp                   VARCHAR(100),
    date                        DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time               VARCHAR(50),
    check_out_time              VARCHAR(50),
    late_by_min                 INTEGER DEFAULT 0,
    early_out_by_min            INTEGER DEFAULT 0,
    notes                       TEXT,
    created_by                  VARCHAR(255) DEFAULT 'System',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_logs_emp_code ON public.attendance_logs(employee_code);
CREATE INDEX idx_attendance_logs_date ON public.attendance_logs(date);
CREATE INDEX idx_attendance_logs_status ON public.attendance_logs(status);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on attendance_logs" ON public.attendance_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow full access on attendance_logs" ON public.attendance_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 13. SEED CANONICAL METADATA RECORDS
-- ------------------------------------------------------------------------------
-- Organizations
INSERT INTO public.organizations (id, name, code, city, country, brand_color, currency)
VALUES ('org-1', 'JAAGO Foundation', 'JF-HQ', 'Dhaka', 'Bangladesh', '#F59E0B', 'BDT')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand_color = EXCLUDED.brand_color, updated_at = NOW();

-- Organization Branches
INSERT INTO public.organization_branches (id, organization_id, name, code, city, country, address)
VALUES
('br-1', 'org-1', 'Head Office (Banani)', 'HQ-BNN', 'Dhaka', 'Bangladesh', 'Road 11, Banani, Dhaka-1213'),
('br-2', 'org-1', 'Rayer Bazar School & Campus', 'SCH-RYB', 'Dhaka', 'Bangladesh', '91 Sher-E-Bangla Rd, Dhaka 1207'),
('br-3', 'org-1', 'Chattogram Regional Hub', 'HUB-CTG', 'Chattogram', 'Bangladesh', 'Agrabad, Chattogram'),
('br-4', 'org-1', 'Rajshahi Regional Office', 'HUB-RAJ', 'Rajshahi', 'Bangladesh', 'Sipaipara, Rajpara, Rajshahi'),
('br-5', 'org-1', 'Khulna Regional Office', 'HUB-KHL', 'Khulna', 'Bangladesh', 'Khulna Sadar, Khulna'),
('br-6', 'org-1', 'Sylhet Regional Hub', 'HUB-SYL', 'Sylhet', 'Bangladesh', 'Airport Road, Mojumdari, Sylhet'),
('br-7', 'org-1', 'UK Global Office', 'INT-UK', 'London', 'United Kingdom', 'Wembley, London HA9 8BE'),
('br-8', 'org-1', 'USA Global Office', 'INT-USA', 'Washington DC', 'United States', 'Washington, DC')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, updated_at = NOW();

-- Designations
INSERT INTO public.designations (id, name, code, grade, department_or_project, description)
VALUES
('des-1', 'Founder & Executive Director', 'ED-01', 'Executive', 'Executive Management', 'Chief Executive Officer'),
('des-2', 'Director, Program Implementation', 'DIR-PI', 'Director', 'Program Implementation', 'Head of Program Operations'),
('des-3', 'Head of People & Culture (HR)', 'HOD-HR', 'Management', 'People & Culture', 'Human Resource Leadership'),
('des-4', 'Coordinator, Tech 4 Development', 'COORD-T4D', 'Lead', 'Founder''s Office / FC', 'Full-stack software and cloud infrastructure lead'),
('des-5', 'Program Officer', 'PO-01', 'Officer', 'Program Implementation', 'Field operations officer'),
('des-6', 'Senior Finance & Grants Lead', 'FIN-SR', 'Management', 'Finance & Procurement', 'Financial oversight and budgeting'),
('des-7', 'Digital School Educator / Teacher', 'EDU-DSP', 'Staff', 'Digital School Program', 'Online interactive teacher')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, grade = EXCLUDED.grade, updated_at = NOW();

-- Departments
INSERT INTO public.departments (id, name, code, organization_id, organization_name, manager_name, description)
VALUES
('dept-1', 'Founder''s Office / FC', 'FC-01', 'org-1', 'JAAGO Foundation', 'Korvi Rakshand', 'Executive operations and strategic programs'),
('dept-2', 'Program Implementation', 'PI-02', 'org-1', 'JAAGO Foundation', 'Abdul Mazid', 'Core field education and community schools'),
('dept-3', 'Digital School Program', 'DSP-03', 'org-1', 'JAAGO Foundation', 'Nasif Kamal', 'Remote learning and digital education hub'),
('dept-4', 'People & Culture (HR)', 'PNC-04', 'org-1', 'JAAGO Foundation', 'S M Nayeem Rahman', 'Human capital and staff development'),
('dept-5', 'Finance & Procurement', 'FIN-05', 'org-1', 'JAAGO Foundation', 'Habibur Rahman', 'Accounting and vendor procurement'),
('dept-6', 'Youth Development (VBD)', 'YDF-06', 'org-1', 'JAAGO Foundation', 'Korvi Rakshand', 'Volunteer for Bangladesh nationwide network')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, manager_name = EXCLUDED.manager_name, updated_at = NOW();

-- Projects
INSERT INTO public.projects (id, name, code, organization_id, organization_name, parent_department_id, parent_department_name, project_manager_name, finance_lead_name, status, budget)
VALUES
('prj-1', 'Digital School Program Phase II', 'PRJ-DSP-01', 'org-1', 'JAAGO Foundation', 'dept-3', 'Digital School Program', 'Nasif Kamal', 'Habibur Rahman', 'ACTIVE', 12500000.00),
('prj-2', 'Free School Education for Underprivileged', 'PRJ-FSE-02', 'org-1', 'JAAGO Foundation', 'dept-2', 'Program Implementation', 'Abdul Mazid', 'Habibur Rahman', 'ACTIVE', 35000000.00),
('prj-3', 'Universal Youth Development & Volunteer Voice', 'PRJ-UVD-03', 'org-1', 'JAAGO Foundation', 'dept-2', 'Program Implementation', 'Korvi Rakshand', 'Habibur Rahman', 'ACTIVE', 8000000.00)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, project_manager_name = EXCLUDED.project_manager_name, status = EXCLUDED.status, budget = EXCLUDED.budget, updated_at = NOW();

-- Teams
INSERT INTO public.teams (id, name, code, department_or_project, team_lead_name, description)
VALUES
('tm-1', 'Tech 4 Development Engineering Core', 'TM-T4D-01', 'Digital School Program', 'Nasif Kamal', 'Core full-stack software and cloud infrastructure team'),
('tm-2', 'Curriculum & Pedagogy Team', 'TM-CUR-02', 'Program Implementation', 'Abdul Mazid', 'Lesson design and multimedia learning modules'),
('tm-3', 'Banani Campus Security Squad', 'TM-SEC-03', 'Program Implementation', 'Abdul Aziz', '24/7 security watch and visitor management')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, team_lead_name = EXCLUDED.team_lead_name, updated_at = NOW();

-- Team Members
INSERT INTO public.team_members (id, team_id, employee_name, employee_code, role)
VALUES
('mem-1', 'tm-1', 'Nasif Kamal', 'FO032507061190', 'Team Lead'),
('mem-2', 'tm-1', 'Abdul Mazid', 'ADM811428100845', 'Product Specialist'),
('mem-3', 'tm-2', 'Abdul Mazid', 'ADM811428100845', 'Team Lead'),
('mem-4', 'tm-3', 'Abdul Aziz', 'GLSP08241107940', 'Squad Lead')
ON CONFLICT (id) DO UPDATE SET employee_name = EXCLUDED.employee_name, role = EXCLUDED.role;

-- Insurance Categories
INSERT INTO public.insurance_categories (id, name, monthly_premium, description, coverage_details, is_active)
VALUES
('ins-1', 'Executive Health & Life Coverage (Plan A)', 2500.00, 'Comprehensive executive health, critical illness, accidental disability, and term life insurance.', 'IPD ৳ 500,000 / OPD ৳ 50,000 / Life ৳ 1,000,000', true),
('ins-2', 'Standard Staff Hospitalization & Surgery (Plan B)', 1250.00, 'Staff inpatient medical, diagnostic coverage, emergency surgery, and accidental death.', 'IPD ৳ 250,000 / OPD ৳ 20,000 / Life ৳ 500,000', true),
('ins-3', 'Support Staff & Field Care Coverage (Plan C)', 650.00, 'Basic hospitalization, accidental injury care, and term disability cover for field operators.', 'IPD ৳ 100,000 / OPD ৳ 10,000 / Life ৳ 250,000', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, monthly_premium = EXCLUDED.monthly_premium, updated_at = NOW();
