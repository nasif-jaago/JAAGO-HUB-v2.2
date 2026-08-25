import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const DUMMY_CODES_TO_DELETE = [
  'GLSP08241107940',
  'ADM011420100045',
  'DC082224020391',
  'EMK2025154',
];

async function cleanup() {
  console.log('Cleaning up dummy employees from Supabase...');
  const { data, error } = await supabaseAdmin
    .from('employees')
    .delete()
    .in('code', DUMMY_CODES_TO_DELETE)
    .select();

  if (error) {
    console.error('Cleanup error:', error.message);
  } else {
    console.log('✓ Successfully deleted dummy records from Supabase:', data?.map((d) => d.name));
  }

  const { data: remaining } = await supabaseAdmin.from('employees').select('id, name, code, work_email');
  console.log('\nRemaining real employees in Supabase:');
  console.log(remaining);
}

cleanup().catch(console.error);
