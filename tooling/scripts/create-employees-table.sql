-- ==============================================================================
-- JAAGO FOUNDATION ERP / HUB — SUPABASE POSTGRESQL DATABASE SCHEMA
-- Module: People & Culture (HR) — Employee Directory & Profile Management
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop Old Conflicting Tables (if any exist)
DROP TABLE IF EXISTS public.employee_activity_logs CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;

-- 3. CREATE EMPLOYEES TABLE (All 5 Tabs Data)
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    designation VARCHAR(150) NOT NULL DEFAULT 'Program Officer',
    work_email VARCHAR(255),
    work_mobile VARCHAR(50),
    working_schedule VARCHAR(150) DEFAULT 'General Schedule (10:00 AM - 6:00 PM)',
    status VARCHAR(50) NOT NULL DEFAULT 'Active',

    -- ── TAB 1: WORK ──
    organization VARCHAR(150) NOT NULL DEFAULT 'JAAGO Foundation',
    branch VARCHAR(150) NOT NULL DEFAULT 'Head Office (Banani)',
    department VARCHAR(150) NOT NULL DEFAULT 'Program Implementation',
    project VARCHAR(255) DEFAULT 'General Operations',
    supervisor VARCHAR(255),
    secondary_supervisor VARCHAR(255),
    work_location VARCHAR(255) DEFAULT 'Banani, Dhaka',
    remark TEXT,

    -- ── TAB 2: PERSONAL ──
    personal_email VARCHAR(255),
    personal_phone VARCHAR(50),
    bank_name VARCHAR(150),
    bank_account_number VARCHAR(100),
    nick_name VARCHAR(100),
    nid VARCHAR(100),
    blood_group VARCHAR(10),
    birthday DATE,
    gender VARCHAR(20),
    religion VARCHAR(50) DEFAULT 'Islam',
    marital_status VARCHAR(50) DEFAULT 'Single',
    emergency_contact_name VARCHAR(255),
    emergency_phone VARCHAR(50),
    nationality VARCHAR(100) DEFAULT 'Bangladeshi',
    passport_no VARCHAR(100),
    home_address TEXT,
    dependent_children INT DEFAULT 0,

    -- ── TAB 3: PAYROLL ──
    joining_date DATE,
    contract_end_date DATE,
    wage_type VARCHAR(20) DEFAULT 'Fixed',
    wage NUMERIC(15, 2) DEFAULT 0.00,
    salary_jul_dec NUMERIC(15, 2) DEFAULT 0.00,
    salary_jan_jun NUMERIC(15, 2) DEFAULT 0.00,
    monthly_total_allowance VARCHAR(10) DEFAULT 'Yes',
    six_months_completion_status VARCHAR(10) DEFAULT 'Yes',
    probationary_status VARCHAR(50) DEFAULT 'Confirmed',
    contract_type VARCHAR(50) DEFAULT 'Full Time',
    no_tax_deduction BOOLEAN DEFAULT FALSE,
    bonus_eligibility VARCHAR(10) DEFAULT 'Yes',
    pf_applies VARCHAR(10) DEFAULT 'Yes',
    pf_rate NUMERIC(5, 2) DEFAULT 10.00,
    regular_salary NUMERIC(15, 2) DEFAULT 0.00,
    extra_hours NUMERIC(8, 2) DEFAULT 0.00,
    extra_payment NUMERIC(15, 2) DEFAULT 0.00,
    calculation_value VARCHAR(50) DEFAULT '1.0x',
    temporary_salary NUMERIC(15, 2) DEFAULT 0.00,
    total_current_salary NUMERIC(15, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'BDT',
    adjustment_start_date DATE,
    adjustment_end_date DATE,
    assigned_teacher_staff VARCHAR(255),
    payroll_remark TEXT,

    -- ── TAB 4: DSP (DIGITAL SCHOOL PROGRAM) ──
    office_days VARCHAR(100) DEFAULT 'Sunday to Thursday',
    custom_office_days_from VARCHAR(50),
    custom_office_days_to VARCHAR(50),
    office_hours VARCHAR(100) DEFAULT '10:00 AM - 06:00 PM',
    rfid VARCHAR(100),
    leave_group VARCHAR(100) DEFAULT 'Standard Full-time',
    employee_type VARCHAR(50) DEFAULT 'Permanent',

    -- System & Auth Links
    is_user BOOLEAN DEFAULT FALSE,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE EMPLOYEE ACTIVITY LOGS TABLE (Odoo-Style Audit Trail)
CREATE TABLE public.employee_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_code VARCHAR(50),
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(100) DEFAULT 'Staff',
    field_name VARCHAR(150) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    action_type VARCHAR(50) DEFAULT 'update',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE INDEXES FOR FAST SEARCH & FILTERING
CREATE INDEX idx_employees_code ON public.employees(code);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_employees_dept ON public.employees(department);
CREATE INDEX idx_employees_org ON public.employees(organization);
CREATE INDEX idx_employees_branch ON public.employees(branch);
CREATE INDEX idx_activity_logs_emp_id ON public.employee_activity_logs(employee_id);

-- 6. AUTOMATIC updated_at TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- 7. ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to employees for anon/authenticated" ON public.employees;
CREATE POLICY "Allow full access to employees for anon/authenticated"
ON public.employees FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to logs for anon/authenticated" ON public.employee_activity_logs;
CREATE POLICY "Allow full access to logs for anon/authenticated"
ON public.employee_activity_logs FOR ALL
USING (true)
WITH CHECK (true);

-- 8. SUPABASE STORAGE BUCKET INITIALIZATION
INSERT INTO storage.buckets (id, name, public)
VALUES ('employees', 'employees', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop Existing Storage Policies if any exist to avoid conflict
DROP POLICY IF EXISTS "Public Read Access on Employees Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow Employee Photo Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Employee Photo Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Employee Photo Deletions" ON storage.objects;

-- Create Storage Policies
CREATE POLICY "Public Read Access on Employees Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'employees');

CREATE POLICY "Allow Employee Photo Uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'employees');

CREATE POLICY "Allow Employee Photo Updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'employees');

CREATE POLICY "Allow Employee Photo Deletions"
ON storage.objects FOR DELETE
USING (bucket_id = 'employees');

-- 9. SEED INITIAL JAAGO EMPLOYEES DATA
INSERT INTO public.employees (
    id, code, name, designation, work_email, work_mobile, working_schedule, status,
    organization, branch, department, project, supervisor, secondary_supervisor, work_location, remark,
    personal_email, personal_phone, bank_name, bank_account_number, nick_name, nid, blood_group,
    birthday, gender, religion, marital_status, emergency_contact_name, emergency_phone, nationality, passport_no, home_address,
    joining_date, contract_end_date, wage_type, wage, salary_jul_dec, salary_jan_jun, monthly_total_allowance, six_months_completion_status, probationary_status, contract_type, bonus_eligibility, pf_applies, pf_rate, regular_salary, total_current_salary, currency,
    office_days, office_hours, rfid, leave_group, employee_type
) VALUES 
(
    'a1111111-1111-1111-1111-111111111111',
    'GLSP08241107940',
    'Abdul Aziz',
    'Security Guard',
    'abdul.aziz@jaago.com.bd',
    '+880 1711 000001',
    'General 9 AM to 5 PM',
    'Active',
    'JAAGO Foundation Trust',
    'Head Office (Banani)',
    'Program Implementation',
    'Campus Security',
    'Nasif Kamal',
    'Habibur Rahman',
    'Banani, Dhaka',
    'Night shift rotation assigned',
    'aziz.private@gmail.com',
    '+880 1811 000001',
    'Eastern Bank Ltd',
    '1041234567801',
    'Aziz',
    '1988269123450001',
    'B+',
    '1988-04-12',
    'MALE',
    'Islam',
    'Married',
    'Fatema Begum (Spouse)',
    '+880 1811 999001',
    'Bangladeshi',
    'A01928371',
    'Mohakhali TB Gate, Dhaka-1212',
    '2024-05-12',
    '2027-05-11',
    'Fixed',
    25000.00,
    25000.00,
    25000.00,
    'Yes',
    'Yes',
    'Confirmed',
    'Full Time',
    'Yes',
    'Yes',
    10.00,
    25000.00,
    27000.00,
    'BDT',
    'Sunday to Thursday',
    '09:00 AM - 05:00 PM',
    'RFID-100291',
    'Standard Full-time',
    'Permanent'
),
(
    'a2222222-2222-2222-2222-222222222222',
    'ADM011420100045',
    'Abdul Mazid',
    'Manager',
    'abdul.mazid@jaago.com.bd',
    '+880 1711 000002',
    'General 9 AM to 5 PM',
    'Active',
    'JAAGO Foundation',
    'Head Office (Banani)',
    'Digital School Program',
    'Telco Digital School',
    'Nasif Kamal',
    'Farhana Ahmed',
    'Banani, Dhaka',
    'Leads DSP Operations across 12 branch schools',
    'mazid.p@gmail.com',
    '+880 1811 000002',
    'BRAC Bank Ltd',
    '1501234567802',
    'Mazid',
    '1985269123450002',
    'O+',
    '1985-08-20',
    'MALE',
    'Islam',
    'Married',
    'Nasrin Akhter (Spouse)',
    '+880 1811 999002',
    'Bangladeshi',
    'B02938472',
    'Gulshan 2, Dhaka',
    '2021-03-01',
    '2026-03-01',
    'Fixed',
    95000.00,
    95000.00,
    95000.00,
    'Yes',
    'Yes',
    'Confirmed',
    'Full Time',
    'Yes',
    'Yes',
    10.00,
    95000.00,
    95000.00,
    'BDT',
    'Sunday to Thursday',
    '09:00 AM - 05:00 PM',
    'RFID-100292',
    'Standard Full-time',
    'Permanent'
),
(
    'a3333333-3333-3333-3333-333333333333',
    'DC082224020391',
    'Abdullah Al Imran',
    'Assistant Manager',
    'abdullah.imran@jaago.com.bd',
    '+880 1711 000003',
    'General Schedule (10:00 AM - 6:00 PM)',
    'Active',
    'JAAGO Foundation',
    'Head Office (Banani)',
    'Communications',
    'Digital Media & Storytelling',
    'Farhana Ahmed',
    'Nasif Kamal',
    'Banani, Dhaka',
    'Key contact for external campaigns',
    'imran.comm@gmail.com',
    '+880 1811 000003',
    'City Bank Ltd',
    '2201234567803',
    'Imran',
    '1992269123450003',
    'A+',
    '1992-11-14',
    'MALE',
    'Islam',
    'Single',
    'Rashidul Hasan (Brother)',
    '+880 1811 999003',
    'Bangladeshi',
    'C03948573',
    'Mirpur DOHS, Dhaka',
    '2022-08-16',
    '2027-08-15',
    'Fixed',
    75000.00,
    75000.00,
    75000.00,
    'Yes',
    'Yes',
    'Confirmed',
    'Full Time',
    'Yes',
    'Yes',
    10.00,
    75000.00,
    75000.00,
    'BDT',
    'Sunday to Thursday',
    '10:00 AM - 06:00 PM',
    'RFID-100293',
    'Standard Full-time',
    'Permanent'
),
(
    'a4444444-4444-4444-4444-444444444444',
    'EMK2025154',
    'Abdullah Al Yousuf',
    'Program Officer',
    'abdullah.yousuf@emkcenter.org',
    '+880 1711 000004',
    'General Schedule (10:00 AM - 6:00 PM)',
    'Active',
    'JAAGO Foundation',
    'Head Office (Banani)',
    'EMK Center',
    'EMK Youth Innovation Labs',
    'Farhana Ahmed',
    'Nasif Kamal',
    'Dhanmondi, Dhaka',
    'Coordinator for US Embassy partnership programs',
    'yousuf.emk@gmail.com',
    '+880 1811 000004',
    'Eastern Bank Ltd',
    '1041234567804',
    'Yousuf',
    '1995269123450004',
    'AB+',
    '1995-02-18',
    'MALE',
    'Islam',
    'Single',
    'Kazi Farhan (Father)',
    '+880 1811 999004',
    'Bangladeshi',
    'D04958674',
    'Dhanmondi 27, Dhaka',
    '2025-02-24',
    '2028-02-23',
    'Fixed',
    45000.00,
    45000.00,
    45000.00,
    'Yes',
    'Yes',
    'Confirmed',
    'Full Time',
    'Yes',
    'Yes',
    10.00,
    45000.00,
    45000.00,
    'BDT',
    'Sunday to Thursday',
    '10:00 AM - 06:00 PM',
    'RFID-100294',
    'Standard Full-time',
    'Permanent'
)
ON CONFLICT (code) DO NOTHING;
