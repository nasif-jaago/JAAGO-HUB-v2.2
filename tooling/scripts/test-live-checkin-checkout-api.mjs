import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function testLiveFlow() {
  console.log('===============================================================');
  console.log('TESTING GPS CHECK-IN & CHECK-OUT API ENDPOINTS FOR NASIF KAMAL');
  console.log('===============================================================\n');

  // Employee ID for Nasif Kamal
  const empId = '71a38594-d803-4e6d-b6e9-79767a16c4c6';
  const empCode = 'FO032507061190';
  const today = new Date().toISOString().slice(0, 10);

  // 1. Reset today's record for fresh test
  await supabase.from('attendance_records').delete().eq('employee_id', empId).eq('business_date', today);
  await new Promise((r) => setTimeout(r, 600));

  console.log('1. Testing GPS Check-In with Nasif Kamal code (FO032507061190)...');
  const checkInRes = await fetch('http://localhost:3000/api/v1/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.789555,
      longitude: 90.408706,
      accuracy: 10,
      deviceInfo: 'Test Runner Web Portal',
    }),
  });

  const checkInJson = await checkInRes.json();
  console.log('Check-In Response:', checkInJson);

  if (!checkInJson.success) {
    console.error('❌ Check-in failed!');
    return;
  }
  console.log(`✅ Check-in Succeeded -> Status: ${checkInJson.data.status}, Message: ${checkInJson.message}`);

  // 2. Fetch today's session state
  console.log('\n2. Testing /api/v1/attendance/me/today...');
  const todayRes = await fetch(`http://localhost:3000/api/v1/attendance/me/today?employeeId=${empCode}`);
  const todayJson = await todayRes.json();
  console.log('Session State:', todayJson.data?.sessionState, '| Shift:', todayJson.data?.shift?.shiftName);

  await new Promise((r) => setTimeout(r, 1000));

  // 3. Testing GPS Check-Out
  console.log('\n3. Testing GPS Check-Out with Nasif Kamal code...');
  const checkOutRes = await fetch('http://localhost:3000/api/v1/attendance/check-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: empCode,
      latitude: 23.789555,
      longitude: 90.408706,
      accuracy: 10,
      deviceInfo: 'Test Runner Web Portal',
    }),
  });

  const checkOutJson = await checkOutRes.json();
  console.log('Check-Out Response:', checkOutJson);

  if (!checkOutJson.success) {
    console.error('❌ Check-out failed!');
    return;
  }
  console.log(`✅ Check-out Succeeded -> Worked Minutes: ${checkOutJson.data.worked_minutes}m, Message: ${checkOutJson.message}`);

  // 4. Fetch Monthly Summary
  console.log('\n4. Testing /api/v1/attendance/me/summary...');
  const summaryRes = await fetch(`http://localhost:3000/api/v1/attendance/me/summary?employeeId=${empCode}`);
  const summaryJson = await summaryRes.json();
  console.log('Monthly Summary:', {
    presentDays: summaryJson.data?.presentDays,
    lateDays: summaryJson.data?.lateDays,
    onTimePerformancePct: summaryJson.data?.onTimePerformancePct,
  });

  console.log('\n===============================================================');
  console.log('🎉 GPS CHECK-IN & CHECK-OUT TEST COMPLETED SUCCESSFULLY!');
  console.log('===============================================================');
}

testLiveFlow();
