import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function checkLeaveTable() {
  const { data, error } = await supabase.from('leave_requests').select('*').limit(1);
  console.log('leave_requests query error:', error);
  if (data) {
    console.log('leave_requests columns:', data.length > 0 ? Object.keys(data[0]) : 'Empty table, trying dummy insert');
  }

  // Insert a test row to see exact schema columns
  const testId = `lv-test-${Date.now()}`;
  const testRow = {
    id: testId,
    employee_code: 'TEST-001',
    employee_name: 'Test Staff',
    leave_type: 'Casual Leave',
    from_date: '2026-09-15',
    to_date: '2026-09-16',
    total_days: 2,
    reason: 'Medical checkup',
    status: 'Pending',
    applied_at: new Date().toISOString(),
  };

  const { data: insData, error: insErr } = await supabase.from('leave_requests').insert(testRow).select();
  if (insErr) {
    console.error('Insert error:', insErr);
  } else {
    console.log('Inserted test row with columns:', Object.keys(insData[0]));
    await supabase.from('leave_requests').delete().eq('id', testId);
  }
}

checkLeaveTable();
