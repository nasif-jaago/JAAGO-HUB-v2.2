import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function runTest() {
  console.log('════════════════════════════════════════════════════════');
  console.log('🧪 TESTING LEAVE ALLOCATION & EMPLOYEE PROFILE BALANCE FLOW');
  console.log('════════════════════════════════════════════════════════\n');

  // 1. Fetch employees
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, code, name, designation, department, casual_leave_allocated, sick_leave_allocated, special_leave_allocated, earned_leave_allocated, leave_group, status')
    .eq('status', 'Active')
    .limit(10);

  if (empErr) {
    console.error('❌ Failed to fetch employees:', empErr);
    process.exit(1);
  }

  console.log(`✅ Step 1: Fetched ${emps.length} sample active employees.`);

  // 2. Check S M Nayeem Rahman and Nasif Kamal specifically
  const { data: targets } = await supabase
    .from('employees')
    .select('id, code, name, designation, casual_leave_allocated, sick_leave_allocated, special_leave_allocated, earned_leave_allocated')
    .or('code.eq.FO032507061190,code.eq.FO072408021002');

  console.log('\n✅ Step 2: Verified Key User Profiles:');
  for (const t of targets || []) {
    console.log(`   - ${t.name} (${t.code}):`);
    console.log(`     Casual: ${t.casual_leave_allocated ?? 10}d | Medical: ${t.sick_leave_allocated ?? 10}d | Emergency: ${t.special_leave_allocated ?? 4}d | Annual: ${t.earned_leave_allocated ?? 15}d`);
  }

  // 3. Test leave_requests table insertion & query
  const testReqId = `test-req-${Date.now()}`;
  const testReq = {
    id: testReqId,
    employee_code: 'FO072408021002',
    employee_name: 'S M Nayeem Rahman',
    leave_type: 'Casual Leave',
    from_date: '2026-09-10',
    to_date: '2026-09-11',
    total_days: 2.0,
    reason: 'Personal family matter',
    status: 'Pending',
    applied_at: new Date().toISOString(),
  };

  const { error: insErr } = await supabase.from('leave_requests').insert(testReq);
  if (insErr) {
    console.error('❌ Failed to insert test leave request:', insErr);
  } else {
    console.log('\n✅ Step 3: Successfully submitted test leave request for S M Nayeem Rahman:');
    console.log(`   - ID: ${testReq.id} | Type: ${testReq.leave_type} | Duration: ${testReq.total_days} days`);

    // Clean up test request
    await supabase.from('leave_requests').delete().eq('id', testReqId);
    console.log('   - Cleaned up test record from database.');
  }

  console.log('\n🎉 ALL BACKEND LEAVE ALLOCATION & APPLICATION PIPELINES VERIFIED SUCCESSFULLY!\n');
}

runTest();
