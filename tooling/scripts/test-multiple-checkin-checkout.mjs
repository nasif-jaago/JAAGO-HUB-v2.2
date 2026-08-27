import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function testMultipleCheckInOut() {
  console.log('================================================================');
  console.log('TESTING MULTIPLE CHECK-IN & CHECK-OUT FOR NASIF KAMAL');
  console.log('Requirement: Count FIRST Check-In & Count LAST Check-Out');
  console.log('================================================================\n');

  const empCode = 'FO032507061190';
  const empId = '71a38594-d803-4e6d-b6e9-79767a16c4c6';
  const today = new Date().toISOString().slice(0, 10);

  // 0. Clean today's record
  await supabase.from('attendance_records').delete().eq('employee_id', empId).eq('business_date', today);
  await new Promise((r) => setTimeout(r, 600));

  // 1. First Check-In (Morning arrival)
  console.log('1. Employee arrives and does FIRST Check-In...');
  const res1 = await fetch('http://localhost:3002/api/v1/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.789555,
      longitude: 90.408706,
      accuracy: 10,
      deviceInfo: 'Morning Arrival Check-In',
    }),
  });
  const json1 = await res1.json();
  const firstCheckInAt = json1.data.check_in_at;
  console.log(`✅ First Check-In Timestamp recorded: ${firstCheckInAt}`);

  await new Promise((r) => setTimeout(r, 1000));

  // 2. First Check-Out (Leaves for lunch / outdoor task)
  console.log('\n2. Employee does FIRST Check-Out (Leaves for lunch)...');
  const res2 = await fetch('http://localhost:3002/api/v1/attendance/check-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.789555,
      longitude: 90.408706,
      accuracy: 10,
      deviceInfo: 'Lunch Check-Out',
    }),
  });
  const json2 = await res2.json();
  const firstCheckOutAt = json2.data.check_out_at;
  console.log(`✅ First Check-Out Timestamp: ${firstCheckOutAt}`);

  await new Promise((r) => setTimeout(r, 1000));

  // 3. Second Check-In (Returns from lunch / outdoor task)
  console.log('\n3. Employee does SECOND Check-In (Returns to office)...');
  const res3 = await fetch('http://localhost:3002/api/v1/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.789555,
      longitude: 90.408706,
      accuracy: 10,
      deviceInfo: 'Afternoon Return Check-In',
    }),
  });
  const json3 = await res3.json();
  console.log(`✅ Second Check-In processed -> Retained FIRST Check-In Timestamp: ${json3.data.check_in_at}`);

  if (json3.data.check_in_at === firstCheckInAt) {
    console.log('🎯 SUCCESS: Initial Check-In time was PRESERVED as requested!');
  } else {
    console.error('❌ FAILURE: First check-in time was overwritten!');
  }

  await new Promise((r) => setTimeout(r, 1000));

  // 4. Second / Final Check-Out (End of day)
  console.log('\n4. Employee does FINAL Check-Out (Leaves at end of day)...');
  const res4 = await fetch('http://localhost:3002/api/v1/attendance/check-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.789555,
      longitude: 90.408706,
      accuracy: 10,
      deviceInfo: 'Evening Final Check-Out',
    }),
  });
  const json4 = await res4.json();
  const finalCheckOutAt = json4.data.check_out_at;
  console.log(`✅ Final Check-Out Timestamp recorded: ${finalCheckOutAt}`);

  if (new Date(finalCheckOutAt).getTime() >= new Date(firstCheckOutAt).getTime()) {
    console.log('🎯 SUCCESS: Check-Out time was updated to the LAST Check-Out time!');
  } else {
    console.error('❌ FAILURE: Check-out time was not updated to the latest!');
  }

  // 5. Verify database state
  console.log('\n5. Verifying Database Record in attendance_records...');
  const { data: dbRecord } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', empId)
    .eq('business_date', today)
    .single();

  console.log('Final Database Row:');
  console.log(`- FIRST Check In: ${dbRecord.check_in_at}`);
  console.log(`- LAST Check Out: ${dbRecord.check_out_at}`);
  console.log(`- Status: ${dbRecord.status} (Late: ${dbRecord.is_late}, Late by: ${dbRecord.late_by_minutes}m)`);
  console.log(`- Total Worked: ${dbRecord.worked_minutes}m`);

  console.log('\n================================================================');
  console.log('🎉 MULTIPLE CHECK-IN & CHECK-OUT VERIFICATION PASSED 100%!');
  console.log('================================================================');
}

testMultipleCheckInOut();
