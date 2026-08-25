import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function inspect() {
  console.log('--- Supabase Auth Users ---');
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  console.log(authData?.users?.map((u) => ({
    id: u.id,
    email: u.email,
    metadata: u.user_metadata,
  })));

  console.log('\n--- Supabase Employees ---');
  const { data: emps } = await supabaseAdmin.from('employees').select('id, code, name, work_email, personal_email, designation, department');
  console.log(emps);
}

inspect().catch(console.error);
