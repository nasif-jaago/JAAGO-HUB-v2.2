import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function checkAvatar() {
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  console.log('--- Auth Users: ---');
  authUsers?.users?.forEach((u) => {
    console.log(u.email, 'metadata:', u.user_metadata);
  });

  const { data: emps } = await supabaseAdmin.from('employees').select('id, code, name, work_email, avatar_url');
  console.log('\n--- Employees in DB: ---');
  console.log(emps);
}

checkAvatar().catch(console.error);
