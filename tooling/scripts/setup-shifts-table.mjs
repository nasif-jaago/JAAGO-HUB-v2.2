import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function checkShifts() {
  console.log('Checking public.shifts table in Supabase...');
  const { data, error } = await supabaseAdmin.from('shifts').select('*').limit(5);

  if (error) {
    console.log('Error selecting from shifts table:', error.message);
  } else {
    console.log('Shifts table exists! Found rows:', data?.length);
    console.log(data);
  }
}

checkShifts();
