import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function alterTable() {
  console.log('Altering employees table to add team and insurance columns...');

  const sqlStatements = [
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS team VARCHAR(255);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS insurance_status VARCHAR(50) DEFAULT 'Active';`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS insurance_coverage_category VARCHAR(150);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS insurance_monthly_premium NUMERIC(15, 2);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_health_insurance_id VARCHAR(100);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS spouse_health_insurance_id VARCHAR(100);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS spouse_name VARCHAR(255);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS child1_health_insurance_id VARCHAR(100);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS child1_name VARCHAR(255);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS child2_health_insurance_id VARCHAR(100);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS child2_name VARCHAR(255);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS child3_health_insurance_id VARCHAR(100);`,
    `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS child3_name VARCHAR(255);`,
  ];

  for (const statement of sqlStatements) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: statement });
      if (error) {
        // Try fallback if exec_sql rpc is not present
        console.log(`RPC exec_sql not present for: ${statement.slice(0, 40)}... (will test column directly)`);
      } else {
        console.log(`Executed: ${statement.slice(0, 50)}...`);
      }
    } catch (err) {
      console.warn(err);
    }
  }

  // Verify by doing a select
  const { data, error } = await supabaseAdmin.from('employees').select('*').limit(1);
  if (error) {
    console.error('Select error:', error);
  } else {
    console.log('Employees table columns sample row keys:', Object.keys(data?.[0] || {}));
  }
}

alterTable().catch(console.error);
