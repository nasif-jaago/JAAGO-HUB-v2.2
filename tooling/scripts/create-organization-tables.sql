-- ==============================================================================
-- JAAGO FOUNDATION ERP — ORGANIZATION & PEOPLE/CULTURE MODULE SCHEMA
-- Run this script in the Supabase SQL Editor: https://supabase.com/dashboard/project/fnemsvwejymnqpufumhj/sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT DEFAULT '',
    address TEXT DEFAULT '',
    banani TEXT DEFAULT '',
    city TEXT DEFAULT 'Dhaka',
    division TEXT DEFAULT 'Dhaka Division',
    postal_code TEXT DEFAULT '1213',
    country TEXT DEFAULT 'Bangladesh',
    partner_country TEXT DEFAULT 'Bangladesh',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    website TEXT DEFAULT 'https://jaago.com.bd',
    email_domain TEXT DEFAULT 'jaago.com.bd',
    brand_color TEXT DEFAULT '#FED900',
    tax_id TEXT DEFAULT '',
    company_id TEXT DEFAULT '',
    currency TEXT DEFAULT 'BDT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_branches (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT DEFAULT 'Dhaka',
    country TEXT DEFAULT 'Bangladesh',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_policies (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL',
    description TEXT DEFAULT '',
    attachment_name TEXT DEFAULT '',
    attachment_size TEXT DEFAULT '',
    attachment_url TEXT DEFAULT '',
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.designations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    grade TEXT DEFAULT '',
    department_or_project TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    organization_id TEXT DEFAULT '',
    organization_name TEXT DEFAULT '',
    parent_department_id TEXT DEFAULT '',
    parent_department_name TEXT DEFAULT '',
    manager_name TEXT DEFAULT '',
    manager_id TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    organization_id TEXT DEFAULT '',
    organization_name TEXT DEFAULT '',
    parent_department_id TEXT DEFAULT '',
    parent_department_name TEXT DEFAULT '',
    project_manager_name TEXT DEFAULT '',
    project_manager_id TEXT DEFAULT '',
    finance_lead_name TEXT DEFAULT '',
    finance_lead_id TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'ACTIVE',
    budget NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    department_or_project TEXT DEFAULT '',
    team_lead_name TEXT DEFAULT '',
    team_lead_id TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT REFERENCES public.teams(id) ON DELETE CASCADE,
    employee_id TEXT DEFAULT '',
    employee_name TEXT NOT NULL,
    employee_code TEXT DEFAULT '',
    role TEXT DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insurance_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    monthly_premium NUMERIC NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    coverage_details TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_branches_org_id ON public.organization_branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_policies_org_id ON public.organization_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_designations_name ON public.designations(name);
CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments(name);
CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects(name);
CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(name);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_insurance_categories_name ON public.insurance_categories(name);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_categories ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow all for organizations" ON public.organizations;
    CREATE POLICY "Allow all for organizations" ON public.organizations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for branches" ON public.organization_branches;
    CREATE POLICY "Allow all for branches" ON public.organization_branches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for policies" ON public.organization_policies;
    CREATE POLICY "Allow all for policies" ON public.organization_policies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for designations" ON public.designations;
    CREATE POLICY "Allow all for designations" ON public.designations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for departments" ON public.departments;
    CREATE POLICY "Allow all for departments" ON public.departments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for projects" ON public.projects;
    CREATE POLICY "Allow all for projects" ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for teams" ON public.teams;
    CREATE POLICY "Allow all for teams" ON public.teams FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for team_members" ON public.team_members;
    CREATE POLICY "Allow all for team_members" ON public.team_members FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for insurance" ON public.insurance_categories;
    CREATE POLICY "Allow all for insurance" ON public.insurance_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
END $$;

-- Seed Data
INSERT INTO public.organizations (id, name, partner_country, website, address, banani, city, division, postal_code, country, phone, email, email_domain, brand_color, tax_id, company_id, currency)
VALUES
  ('org-1', 'JAAGO Foundation', 'Bangladesh', 'https://jaago.com.bd', 'HQ-House#57, Road#7B', 'Banani', 'Dhaka', 'Dhaka Division', '1213', 'Bangladesh', '8801766666654', 'info@jaago.com.bd', 'jaago.com.bd', '#FED900', '444095931072', 'S- 8027(48)', 'BDT'),
  ('org-2', 'JAAGO Foundation Trust', 'Bangladesh', 'http://www.jaago.com.bd', 'House#57, Road#7B, Block H, Banani', 'Banani', 'Dhaka', 'Dhaka Division', '1213', 'Bangladesh', '8801766666655', 'trust@jaago.com.bd', 'jaago.com.bd', '#F97316', '555095931099', 'TR- 9012(11)', 'BDT'),
  ('org-3', 'JAAGO Foundation INC', 'United States', 'http://www.jaago.com.bd', '500 7th Ave, 8th Floor', 'Manhattan', 'New York', 'NY', '10018', 'United States', '+1 212 555 0192', 'usa@jaago.com.bd', 'jaago.com.bd', '#3B82F6', 'US-EIN-992019', 'INC- 8820', 'USD'),
  ('org-4', 'JAAGO Foundation UK', 'United Kingdom', 'http://www.jaago.com.bd', '30 St Mary Axe', 'City of London', 'London', 'Greater London', 'EC3A 8EP', 'United Kingdom', '+44 20 7946 0912', 'uk@jaago.com.bd', 'jaago.com.bd', '#10B981', 'UK-CHARITY-1029', 'UK- 10492', 'GBP')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_branches (id, organization_id, name, code, phone, email, address, city, country)
VALUES
  ('br-1', 'org-1', 'Banani Head Office', 'DHK-01', '+88029881234', 'banani@jaago.com.bd', 'HQ-House#57, Road#7B, Block H, Banani', 'Dhaka', 'Bangladesh'),
  ('br-2', 'org-1', 'Rayer Bazar Branch', 'DHK-02', '+88029881235', 'rayerbazar@jaago.com.bd', 'Sultanganj, Rayer Bazar', 'Dhaka', 'Bangladesh'),
  ('br-3', 'org-1', 'Chittagong Campus', 'CTG-01', '+88031671234', 'chittagong@jaago.com.bd', 'Nasirabad H/S, Chittagong', 'Chittagong', 'Bangladesh'),
  ('br-4', 'org-1', 'Cox''s Bazar Branch', 'CXB-01', '+88034162001', 'coxsbazar@jaago.com.bd', 'Kolatoli Road, Cox''s Bazar', 'Cox''s Bazar', 'Bangladesh')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organization_policies (id, organization_id, title, category, description, attachment_name, attachment_size, attachment_url)
VALUES
  ('pol-1', 'org-1', 'JAAGO Theory of Change', 'GENERAL', 'Strategic framework and social impact theory of change roadmap.', 'JAAGO_Theory_of_Change.pdf', '813.0 KB', 'https://hub.jaago.com.bd/policies/theory_of_change.pdf'),
  ('pol-2', 'org-1', 'JAAGO Risk Matrix - Brief & Detailed', 'GENERAL', 'Institutional risk matrix and risk response guidelines.', 'JAAGO_Risk_Matrix_Brief_&_Detailed.pdf', '69.1 KB', 'https://hub.jaago.com.bd/policies/risk_matrix.pdf'),
  ('pol-3', 'org-1', 'JF HR Policy Amendment 2025', 'GENERAL', 'Updated human resources provisions and employee benefits.', 'JF_HR_Policy_Amendment_2025.pdf', '585.6 KB', 'https://hub.jaago.com.bd/policies/hr_policy.pdf'),
  ('pol-4', 'org-1', 'JF Shared Cost Allocation Policy', 'EXPENSES', 'Standard cost allocation methodology across donor-funded projects.', 'JF_Shared_Cost_Allocation_Policy.pdf', '99.1 KB', 'https://hub.jaago.com.bd/policies/shared_cost.pdf'),
  ('pol-5', 'org-1', 'JF Partnership Policy', 'GENERAL', 'Protocol for institutional partnerships and NGO alliances.', 'JF_Partnership_Policy.pdf', '620.1 KB', 'https://hub.jaago.com.bd/policies/partnership.pdf'),
  ('pol-6', 'org-1', 'JF Gender Policy', 'GENERAL', 'Gender equity, inclusion and zero-tolerance harassment standards.', 'JF_Gender_Policy.pdf', '317.2 KB', 'https://hub.jaago.com.bd/policies/gender_policy.pdf'),
  ('pol-7', 'org-1', 'JF Child Protection Policy', 'GENERAL', 'Mandatory safeguarding standards for all child-centric projects.', 'JF_Child_Protection_Policy.pdf', '302.2 KB', 'https://hub.jaago.com.bd/policies/child_protection.pdf'),
  ('pol-8', 'org-1', 'JF Whistleblowing Policy', 'GENERAL', 'Secure anonymous reporting mechanism for fraud, waste, and abuse.', 'JF_Whistleblowing_Policy.pdf', '281.4 KB', 'https://hub.jaago.com.bd/policies/whistleblowing.pdf'),
  ('pol-9', 'org-1', 'JF Training & Staff Development Policy', 'GENERAL', 'Guidelines on capacity building, external training and study leave.', 'JF_Training_Policy.pdf', '251.3 KB', 'https://hub.jaago.com.bd/policies/training.pdf'),
  ('pol-10', 'org-1', 'JF Theft and Misappropriation Policy', 'GENERAL', 'Financial compliance, asset protection and internal control norms.', 'JF_Theft_Policy.pdf', '187.6 KB', 'https://hub.jaago.com.bd/policies/theft_policy.pdf')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.designations (id, name, code, grade, department_or_project, description)
VALUES
  ('des-1', 'Executive Director', 'ED-01', 'Executive', 'Executive Office', 'Overall leadership and strategic direction of JAAGO Foundation.'),
  ('des-2', 'Director, Program Implementation', 'DIR-PI-01', 'Management', 'Program Implementation', 'Directs nationwide educational and development projects.'),
  ('des-3', 'Coordinator, Tech 4 Development', 'COORD-T4D', 'Grade 7', 'Digital School Program', 'Leads software development, digital platforms, and tech operations.'),
  ('des-4', 'Program Officer', 'PO-01', 'Grade 5', 'Program Implementation', 'Executes and monitors regional educational deliverables.'),
  ('des-5', 'Finance & Accounts Officer', 'FAO-01', 'Grade 5', 'Finance & Accounts', 'Manages grant bookkeeping, audits, and voucher verification.'),
  ('des-6', 'Security Guard', 'SEC-01', 'Staff', 'Program Implementation', 'Premises security, physical access verification, and safety patrol.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, name, code, organization_id, organization_name, parent_department_id, parent_department_name, manager_name, description)
VALUES
  ('dept-1', 'Executive Office', 'EX-OFF', 'org-1', 'JAAGO Foundation', '', '', 'Korvi Rakshand', 'Apex governing and strategic executive body.'),
  ('dept-2', 'Program Implementation', 'PI', 'org-1', 'JAAGO Foundation', 'dept-1', 'Executive Office', 'Abdul Mazid', 'Educational operations, school governance, and volunteer programs.'),
  ('dept-3', 'Digital School Program', 'DSP', 'org-1', 'JAAGO Foundation', 'dept-2', 'Program Implementation', 'Nasif Kamal', 'Online distance education, hardware classrooms, and digital syllabus.'),
  ('dept-4', 'Finance & Accounts', 'FIN', 'org-1', 'JAAGO Foundation', 'dept-1', 'Executive Office', 'Habibur Rahman', 'Financial reporting, donor accounting, and statutory audit compliance.'),
  ('dept-5', 'People and Culture', 'PNC', 'org-1', 'JAAGO Foundation', 'dept-1', 'Executive Office', 'Nusrat Jahan', 'Talent acquisition, payroll, employee welfare, and appraisals.'),
  ('dept-6', 'Communications & Fundraising', 'COMM', 'org-1', 'JAAGO Foundation', 'dept-1', 'Executive Office', 'Tanvir Ahmed', 'Public relations, child sponsorship campaigns, and media communications.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, name, code, organization_id, organization_name, parent_department_id, parent_department_name, project_manager_name, finance_lead_name, description, status, budget)
VALUES
  ('prj-1', 'Telco Digital School', 'PRJ-TDS-01', 'org-1', 'JAAGO Foundation', 'dept-3', 'Digital School Program', 'Nasif Kamal', 'Habibur Rahman', 'Telecom-supported digital schooling across remote rural centers.', 'ACTIVE', 12500000),
  ('prj-2', 'Free School Education for Underprivileged', 'PRJ-FSE-02', 'org-1', 'JAAGO Foundation', 'dept-2', 'Program Implementation', 'Abdul Mazid', 'Habibur Rahman', 'Comprehensive primary and secondary education for slum and rural youth.', 'ACTIVE', 35000000),
  ('prj-3', 'Universal Youth Development & Volunteer Voice', 'PRJ-UVD-03', 'org-1', 'JAAGO Foundation', 'dept-2', 'Program Implementation', 'Korvi Rakshand', 'Habibur Rahman', 'Volunteer for Bangladesh (VBD) youth empowerment chapters in 64 districts.', 'ACTIVE', 8000000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.teams (id, name, code, department_or_project, team_lead_name, description)
VALUES
  ('tm-1', 'Tech 4 Development Engineering Core', 'TM-T4D-01', 'Digital School Program', 'Nasif Kamal', 'Core full-stack software and cloud infrastructure team.'),
  ('tm-2', 'Curriculum & Pedagogy Team', 'TM-CUR-02', 'Program Implementation', 'Abdul Mazid', 'Lesson design, teacher training, and multimedia learning modules.'),
  ('tm-3', 'Banani Campus Security Squad', 'TM-SEC-03', 'Program Implementation', 'Abdul Aziz', '24/7 security watch and visitor management team.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.team_members (id, team_id, employee_name, employee_code, role)
VALUES
  ('tm-mem-1', 'tm-1', 'Nasif Kamal', 'EMP-001', 'Team Lead'),
  ('tm-mem-2', 'tm-1', 'Abdul Mazid', 'ADM811428100845', 'Product Specialist'),
  ('tm-mem-3', 'tm-2', 'Abdul Mazid', 'ADM811428100845', 'Team Lead'),
  ('tm-mem-4', 'tm-3', 'Abdul Aziz', 'GLSP08241107940', 'Squad Lead')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.insurance_categories (id, name, monthly_premium, description, coverage_details, is_active)
VALUES
  ('ins-1', 'Executive Health & Life Coverage', 2500, 'Comprehensive executive health, critical illness, accidental disability, and term life insurance.', 'IPD ৳ 500,000 / OPD ৳ 50,000 / Life ৳ 1,000,000', TRUE),
  ('ins-2', 'Standard Staff Hospitalization & Surgery', 1250, 'Staff inpatient medical, diagnostic coverage, emergency surgery, and accidental death.', 'IPD ৳ 250,000 / OPD ৳ 20,000 / Life ৳ 500,000', TRUE),
  ('ins-3', 'Support Staff & Field Care Coverage', 650, 'Basic hospitalization, accidental injury care, and term disability cover for field operators.', 'IPD ৳ 100,000 / OPD ৳ 10,000 / Life ৳ 250,000', TRUE)
ON CONFLICT (id) DO NOTHING;
