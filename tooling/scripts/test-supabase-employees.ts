import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('URL:', supabaseUrl);
console.log('Anon key present:', Boolean(anonKey));
console.log('Service role key present:', Boolean(serviceRoleKey));

async function main() {
  const anonClient = createClient(supabaseUrl, anonKey);
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  console.log('\n--- 1. Testing Admin Client on "employees" ---');
  const { data: adminData, error: adminError } = await adminClient.from('employees').select('*');
  if (adminError) {
    console.error('Admin query error:', adminError);
  } else {
    console.log('Admin query success! Row count:', adminData?.length);
    console.log('Rows:', adminData);
  }

  console.log('\n--- 2. Testing Anon Client on "employees" ---');
  const { data: anonData, error: anonError } = await anonClient.from('employees').select('*');
  if (anonError) {
    console.error('Anon query error:', anonError);
  } else {
    console.log('Anon query success! Row count:', anonData?.length);
  }
}

main().catch(console.error);
