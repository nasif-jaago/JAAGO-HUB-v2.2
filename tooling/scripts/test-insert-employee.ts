import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testInsert() {
  const anonClient = createClient(supabaseUrl, anonKey);
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  console.log('\n--- 1. Testing Anon Insert on "employees" ---');
  const sample = {
    code: 'EMP-NASIF-001',
    name: 'Nasif Kamal',
    designation: 'Coordinator, Tech 4 Development',
    work_email: 'nasif.kamal@jaago.com.bd',
    department: "Founder's Office / FC",
    organization: 'JAAGO Foundation Trust',
    branch: 'Head Office (Banani)',
    status: 'Active',
    working_schedule: 'General Schedule (10:00 AM - 6:00 PM)',
    joining_date: '2026-08-24',
    wage_type: 'Fixed',
    wage: 150000,
    salary_jul_dec: 150000,
    salary_jan_jun: 150000,
    total_current_salary: 150000,
    currency: 'BDT',
    is_user: true,
  };

  const { data: anonData, error: anonErr } = await anonClient
    .from('employees')
    .upsert(sample, { onConflict: 'code' })
    .select();

  if (anonErr) {
    console.error('Anon insert error:', anonErr);
  } else {
    console.log('Anon insert success!', anonData);
  }

  console.log('\n--- 2. Testing Admin Insert on "employees" ---');
  const { data: adminData, error: adminErr } = await adminClient
    .from('employees')
    .upsert(sample, { onConflict: 'code' })
    .select();

  if (adminErr) {
    console.error('Admin insert error:', adminErr);
  } else {
    console.log('Admin insert success!', adminData);
  }
}

testInsert().catch(console.error);
