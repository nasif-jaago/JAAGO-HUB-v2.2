import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

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
