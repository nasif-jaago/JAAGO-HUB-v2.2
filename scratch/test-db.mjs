import { createClient } from '@supabase/supabase-js';

const url = 'https://fnemsvwejymnqpufumhj.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';
const supabase = createClient(url, key);

async function run() {
  const { data: emps, error: empErr } = await supabase.from('employees').select('id, code, name, designation, department');
  console.log('Employees:', emps);

  const { data: records, error: recErr } = await supabase.from('attendance_records').select('*').order('business_date', { ascending: false }).limit(20);
  console.log('Attendance Records:', records);
}

run();
