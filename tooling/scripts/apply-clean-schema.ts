import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function cleanAndApply() {
  console.log('1. Cleaning all dummy employees from Supabase...');
  const { data: deleted, error: delErr } = await supabaseAdmin
    .from('employees')
    .delete()
    .neq('code', 'FO032507061190')
    .select('name, code');

  if (delErr) {
    console.error('Delete error:', delErr);
  } else {
    console.log('✓ Purged dummy employees:', deleted);
  }

  console.log('\n2. Upserting Nasif Kamal (FO032507061190)...');
  const nasifRecord = {
    id: '71a38594-d803-4e6d-b6e9-79767a16c4c6',
    code: 'FO032507061190',
    name: 'Nasif Kamal',
    designation: 'Coordinator, Tech 4 Development',
    work_email: 'nasif.kamal@jaago.com.bd',
    work_mobile: '+880 1711 000001',
    working_schedule: 'General Schedule (10:00 AM - 6:00 PM)',
    status: 'Active',
    organization: 'JAAGO Foundation Trust',
    branch: 'Head Office (Banani)',
    department: "Founder's Office / FC",
    project: 'Tech 4 Development',
    supervisor: 'Founder & Executive Director',
    secondary_supervisor: 'Habibur Rahman',
    work_location: 'Banani, Dhaka',
    remark: 'Lead Developer & System Administrator',
    personal_email: 'nasif.personal@gmail.com',
    personal_phone: '+880 1811 000001',
    bank_name: 'Eastern Bank Ltd',
    bank_account_number: '1041234567800',
    nick_name: 'Nasif',
    nid: '1996269123456789',
    blood_group: 'B+',
    birthday: '1996-05-15',
    gender: 'MALE',
    religion: 'Islam',
    marital_status: 'Single',
    emergency_contact_name: 'Kamal Hossain (Father)',
    emergency_phone: '+880 1811 999000',
    nationality: 'Bangladeshi',
    passport_no: 'A09876543',
    home_address: 'Road 11, Banani, Dhaka-1213',
    dependent_children: 0,
    joining_date: '2026-08-24',
    contract_end_date: '2028-12-31',
    wage_type: 'Fixed',
    wage: 150000.00,
    salary_jul_dec: 150000.00,
    salary_jan_jun: 150000.00,
    monthly_total_allowance: 'Yes',
    six_months_completion_status: 'Yes',
    probationary_status: 'Confirmed',
    contract_type: 'Full Time',
    no_tax_deduction: false,
    bonus_eligibility: 'Yes',
    pf_applies: 'Yes',
    pf_rate: 10.00,
    regular_salary: 150000.00,
    total_current_salary: 150000.00,
    currency: 'BDT',
    office_days: 'Sunday to Thursday',
    office_hours: '10:00 AM - 06:00 PM',
    rfid: 'RFID-100290',
    leave_group: 'Standard Full-time',
    employee_type: 'Permanent',
    is_user: true,
  };

  const { data: upsertData, error: upErr } = await supabaseAdmin
    .from('employees')
    .upsert(nasifRecord, { onConflict: 'code' })
    .select();

  if (upErr) console.error('Upsert error:', upErr);
  else console.log('✓ Verified Nasif Kamal in Supabase:', upsertData);

  console.log('\n3. Verifying all rows currently in Supabase employees table:');
  const { data: allEmps } = await supabaseAdmin.from('employees').select('id, name, code, work_email, avatar_url');
  console.log(allEmps);
}

cleanAndApply().catch(console.error);
