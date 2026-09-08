import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await supabase.from('attendance_records').select('*').limit(1);
  if (error) {
    console.error('SELECT error:', error);
  } else {
    console.log('Columns in attendance_records row:', data && data[0] ? Object.keys(data[0]) : 'empty table');
  }

  const { error: insErr } = await supabase.from('attendance_records').insert({
    employee_id: 'test-inspect',
    business_date: '2099-01-01',
    calc_method: 'span',
  });
  console.log('Insert with calc_method test result:', insErr?.message || 'SUCCESS');
  await supabase.from('attendance_records').delete().eq('employee_id', 'test-inspect');
}

main().catch(console.error);
