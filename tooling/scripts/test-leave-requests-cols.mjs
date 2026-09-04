import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function testCols() {
  const testId = `lv-test-cols-${Date.now()}`;
  const testRow = {
    id: testId,
    employee_code: 'TEST-002',
    employee_name: 'Test Staff',
    leave_type: 'Casual Leave',
    from_date: '2026-09-15',
    to_date: '2026-09-16',
    total_days: 2,
    reason: 'Family event',
    status: 'Pending',
    rejection_reason: 'Test Refusal Note',
    attachment_name: 'medical_report.pdf',
    department: 'Digital School Program',
    designation: 'Officer',
    applied_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('leave_requests').insert(testRow).select();
  console.log('Insert with extra columns:', { error });
  if (!error) {
    console.log('Success! Data:', data);
    await supabase.from('leave_requests').delete().eq('id', testId);
  }
}

testCols();
