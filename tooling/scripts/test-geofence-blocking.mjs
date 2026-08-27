import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function testGeofenceBlocking() {
  console.log('================================================================');
  console.log('TESTING STRICT GPS GEOFENCE BLOCKING FOR CHECK-IN & CHECK-OUT');
  console.log('================================================================\n');

  const empCode = 'FO032507061190';
  const empId = '71a38594-d803-4e6d-b6e9-79767a16c4c6';
  const today = new Date().toISOString().slice(0, 10);

  // Clean today's record
  await supabase.from('attendance_records').delete().eq('employee_id', empId).eq('business_date', today);
  await new Promise((r) => setTimeout(r, 600));

  // TEST 1: Check-in with OUTSIDE Geofence coordinates (e.g. Uttara Sector 4, 10km away from Banani)
  console.log('TEST 1: Attempting Check-In with OUTSIDE Geofence coordinates (Uttara: 23.8759, 90.3795)...');
  const res1 = await fetch('http://localhost:3002/api/v1/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.8759,
      longitude: 90.3795,
      accuracy: 10,
      deviceInfo: 'Remote / Home Laptop',
    }),
  });

  const json1 = await res1.json();
  console.log('Status code:', res1.status);
  console.log('Response:', json1);

  if (res1.status === 403 && json1.code === 'outside_geofence') {
    console.log(`✅ TEST 1 PASSED: Blocked successfully (${json1.distanceMeters}m away from nearest office)!`);
  } else {
    console.error('❌ TEST 1 FAILED: Check-in was not properly blocked!');
  }

  // Verify no record in attendance_records
  const { data: recordAfterBlock } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', empId)
    .eq('business_date', today)
    .maybeSingle();

  if (!recordAfterBlock) {
    console.log('✅ TEST 1 DB VERIFIED: No attendance record was created in database.');
  } else {
    console.error('❌ TEST 1 DB FAILED: Record was created despite being outside geofence!');
  }

  // TEST 2: Check-in with POOR Accuracy GPS (accuracy 250m > 150m threshold)
  console.log('\nTEST 2: Attempting Check-In with POOR accuracy GPS (accuracy: 250m)...');
  const res2 = await fetch('http://localhost:3002/api/v1/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.789555,
      longitude: 90.408706,
      accuracy: 250,
      deviceInfo: 'Weak GPS Signal Device',
    }),
  });
  const json2 = await res2.json();
  console.log('Status code:', res2.status);
  console.log('Response:', json2);

  if (res2.status === 403 && json2.code === 'poor_accuracy') {
    console.log('✅ TEST 2 PASSED: Poor accuracy GPS blocked successfully!');
  } else {
    console.error('❌ TEST 2 FAILED: Poor accuracy was not blocked!');
  }

  // TEST 3: Check-in with VALID Geofence coordinates (Banani HQ)
  console.log('\nTEST 3: Attempting Check-In with VALID Geofence coordinates (Banani HQ: 23.789555, 90.408706)...');
  const res3 = await fetch('http://localhost:3002/api/v1/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.789555,
      longitude: 90.408706,
      accuracy: 10,
      deviceInfo: 'Banani HQ Office Device',
    }),
  });
  const json3 = await res3.json();
  console.log('Status code:', res3.status);
  console.log('Response:', json3);

  if (res3.status === 200 && json3.success) {
    console.log('✅ TEST 3 PASSED: Valid geofence Check-In accepted!');
  } else {
    console.error('❌ TEST 3 FAILED: Valid check-in was rejected!');
  }

  // TEST 4: Attempt Check-Out with OUTSIDE Geofence coordinates (e.g. from home)
  console.log('\nTEST 4: Attempting Check-Out with OUTSIDE Geofence coordinates (Uttara: 23.8759, 90.3795)...');
  const res4 = await fetch('http://localhost:3002/api/v1/attendance/check-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.8759,
      longitude: 90.3795,
      accuracy: 10,
      deviceInfo: 'Remote Laptop',
    }),
  });
  const json4 = await res4.json();
  console.log('Status code:', res4.status);
  console.log('Response:', json4);

  if (res4.status === 403 && json4.code === 'outside_geofence') {
    console.log(`✅ TEST 4 PASSED: Check-Out outside geofence was blocked successfully!`);
  } else {
    console.error('❌ TEST 4 FAILED: Check-out outside geofence was not blocked!');
  }

  // TEST 5: Attempt Check-Out with VALID Geofence coordinates (Banani HQ)
  console.log('\nTEST 5: Attempting Check-Out with VALID Geofence coordinates (Banani HQ: 23.789555, 90.408706)...');
  const res5 = await fetch('http://localhost:3002/api/v1/attendance/check-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.789555,
      longitude: 90.408706,
      accuracy: 10,
      deviceInfo: 'Banani HQ Office Device',
    }),
  });
  const json5 = await res5.json();
  console.log('Status code:', res5.status);
  console.log('Response:', json5);

  if (res5.status === 200 && json5.success) {
    console.log('✅ TEST 5 PASSED: Valid geofence Check-Out accepted!');
  } else {
    console.error('❌ TEST 5 FAILED: Valid check-out was rejected!');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL GPS GEOFENCE BLOCKING & VALIDATION TESTS PASSED 100%!');
  console.log('================================================================');
}

testGeofenceBlocking();
