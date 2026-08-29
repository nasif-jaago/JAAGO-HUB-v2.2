import { createClient } from '@supabase/supabase-js';
import { runAutoCheckoutJob } from '../../apps/worker/src/jobs/auto-checkout';
import { runAbsenceEvaluationJob } from '../../apps/worker/src/jobs/absence-evaluation';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const API_BASE = 'http://localhost:3000/api/v1/attendance';
const TEST_EMP_ID = '71a38594-d803-4e6d-b6e9-79767a16c4c6';
const TEST_EMP_CODE = 'FO032507061190';
const TODAY = '2026-08-29';

// Authorized test location (EMK Center, Gulshan Store: 23.788983, 90.416538)
const VALID_COORDS = { latitude: 23.788983, longitude: 90.416538, accuracy: 10 };
// Far away coordinates (Middle of Atlantic Ocean: 0, 0)
const OUT_OF_BOUNDS_COORDS = { latitude: 0.0, longitude: 0.0, accuracy: 10 };

async function verifyBackendWorkflow() {
  console.log('========================================================================');
  console.log('JAAGO HUB — ATTENDANCE BACKEND & SERVICE PATH VERIFICATION (MANDATORY)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, stepName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${stepName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${stepName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // Step 0: Clean up test record for today
  // --------------------------------------------------------------------------
  console.log('--- Step 0: Resetting Today Attendance for Test Employee ---');
  await supabase.from('attendance_records').delete().eq('employee_id', TEST_EMP_ID).eq('business_date', TODAY);
  console.log('Cleared existing record for test employee.');

  // --------------------------------------------------------------------------
  // Step 1: Geofence Rejection Test (Check-In Outside Geofence)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 1: Testing Geofence Rejection (Outside Geofence) ---');
  const resOut = await fetch(`${API_BASE}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: TEST_EMP_ID,
      ...OUT_OF_BOUNDS_COORDS,
      deviceInfo: 'Backend Verification Runner',
    }),
  });
  const jsonOut = await resOut.json();

  assert(resOut.status === 403, 'Geofence block returns HTTP 403 Forbidden', `got HTTP ${resOut.status}`);
  assert(jsonOut.code === 'OUT_OF_GEOFENCE', 'Error code is OUT_OF_GEOFENCE', `got ${jsonOut.code}`);
  assert(jsonOut.distance_m > 100, `Distance reported correctly (~${jsonOut.distance_m}m)`);

  // Assert NO record was created in attendance_records
  const { data: dbRecOut } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', TEST_EMP_ID)
    .eq('business_date', TODAY)
    .maybeSingle();

  assert(!dbRecOut, 'Invariant Verified: Blocked punch created NO attendance_records row');

  // Assert rejected event logged in attendance_events
  const { data: evtOut } = await supabase
    .from('attendance_events')
    .select('*')
    .eq('employee_id', TEST_EMP_ID)
    .eq('result', 'rejected')
    .order('attempted_at', { ascending: false })
    .limit(1);

  assert(evtOut && evtOut.length > 0, 'Audit Trail Verified: Blocked attempt was persisted in attendance_events');

  // --------------------------------------------------------------------------
  // Step 2: Successful Check-In Inside Geofence
  // --------------------------------------------------------------------------
  console.log('\n--- Step 2: Testing Authorized Check-In Inside Geofence ---');
  const resIn = await fetch(`${API_BASE}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: TEST_EMP_ID,
      ...VALID_COORDS,
      deviceInfo: 'Backend Verification Runner',
    }),
  });
  const jsonIn = await resIn.json();
  console.log('STEP 2 API RESPONSE:', JSON.stringify(jsonIn, null, 2));

  assert(resIn.ok && jsonIn.success === true, 'Check-in inside geofence succeeded', jsonIn.message);
  assert(jsonIn.state === 'CHECKED_IN', 'Session state is CHECKED_IN');
  assert(jsonIn.buttons?.check_in_enabled === false, 'Check-In button disabled ("grey-only")');
  assert(jsonIn.buttons?.check_out_enabled === true, 'Check-Out button active');

  // Verify DB record
  const { data: dbRecIn } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', TEST_EMP_ID)
    .eq('business_date', TODAY)
    .single();

  assert(Boolean(dbRecIn?.first_check_in_at || dbRecIn?.check_in_at), 'DB Verified: first check-in is anchored');
  const originalAnchor = dbRecIn?.first_check_in_at || dbRecIn?.check_in_at;

  // --------------------------------------------------------------------------
  // Step 3: Idempotent Double-Tap Check-In
  // --------------------------------------------------------------------------
  console.log('\n--- Step 3: Testing Idempotent Check-In While CHECKED_IN ---');
  const resDup = await fetch(`${API_BASE}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: TEST_EMP_ID,
      ...VALID_COORDS,
      deviceInfo: 'Backend Verification Runner',
    }),
  });
  const jsonDup = await resDup.json();

  assert(jsonDup.code === 'ALREADY_CHECKED_IN', 'Duplicate check-in returns ALREADY_CHECKED_IN');
  assert(jsonDup.state === 'CHECKED_IN', 'State remains CHECKED_IN');

  const { data: dbRecDup } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', TEST_EMP_ID)
    .eq('business_date', TODAY)
    .single();

  const dupAnchor = dbRecDup?.first_check_in_at || dbRecDup?.check_in_at;
  assert(dupAnchor === originalAnchor, 'Anchor Invariant: first check-in unchanged by duplicate tap');

  // --------------------------------------------------------------------------
  // Step 4: Successful Check-Out Inside Geofence
  // --------------------------------------------------------------------------
  console.log('\n--- Step 4: Testing Check-Out Inside Geofence ---');
  const resOutSuccess = await fetch(`${API_BASE}/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: TEST_EMP_ID,
      ...VALID_COORDS,
      deviceInfo: 'Backend Verification Runner',
    }),
  });
  const jsonOutSuccess = await resOutSuccess.json();

  assert(resOutSuccess.ok && jsonOutSuccess.success === true, 'Check-out succeeded', jsonOutSuccess.message);
  assert(jsonOutSuccess.state === 'NOT_CHECKED_IN', 'State transitions to NOT_CHECKED_IN (enables resume)');
  assert(jsonOutSuccess.buttons.check_in_enabled === true, 'Check-In button re-enabled for resume');
  assert(jsonOutSuccess.buttons.check_out_enabled === false, 'Check-Out button disabled');

  const { data: dbRecOutSuccess } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', TEST_EMP_ID)
    .eq('business_date', TODAY)
    .single();

  assert(Boolean(dbRecOutSuccess?.last_check_out_at || dbRecOutSuccess?.check_out_at), 'DB Verified: check_out_at is recorded');
  assert(jsonOutSuccess.derived?.workedDisplay?.includes('h '), `API Verified: worked_display formatted properly (${jsonOutSuccess.derived?.workedDisplay})`);

  // --------------------------------------------------------------------------
  // Step 5: Resume Check-In (Same Day)
  // --------------------------------------------------------------------------
  console.log('\n--- Step 5: Testing Resume Check-In (Same Day) ---');
  const resResume = await fetch(`${API_BASE}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: TEST_EMP_ID,
      ...VALID_COORDS,
      deviceInfo: 'Backend Verification Runner',
    }),
  });
  const jsonResume = await resResume.json();

  assert(resResume.ok && jsonResume.success === true, 'Resume Check-in succeeded');
  assert(jsonResume.state === 'CHECKED_IN', 'State returned to CHECKED_IN');

  const { data: dbRecResume } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', TEST_EMP_ID)
    .eq('business_date', TODAY)
    .single();

  const resumeAnchor = dbRecResume?.first_check_in_at || dbRecResume?.check_in_at;
  assert(resumeAnchor === originalAnchor, 'Anchor Invariant Verified: first check-in preserved across resume');

  // --------------------------------------------------------------------------
  // Step 6: Scheduled Auto-Checkout Job Execution
  // --------------------------------------------------------------------------
  console.log('\n--- Step 6: Testing Scheduled Auto-Checkout Worker Job ---');
  const autoCheckoutResult = await runAutoCheckoutJob(TODAY);
  assert(autoCheckoutResult.autoClosedCount >= 1, `Auto-checkout closed ${autoCheckoutResult.autoClosedCount} unclosed session(s)`);

  const { data: dbRecAuto } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', TEST_EMP_ID)
    .eq('business_date', TODAY)
    .single();

  assert(dbRecAuto.is_auto_checkout === true, 'DB Verified: is_auto_checkout flag set to true');
  assert(dbRecAuto.status === 'present', 'DB Verified: status is Present (auto-closed, not absent)');

  // --------------------------------------------------------------------------
  // Step 7: Scheduled Absence Evaluation Job Execution
  // --------------------------------------------------------------------------
  console.log('\n--- Step 7: Testing Scheduled Absence Evaluation Worker Job ---');
  const absenceResult = await runAbsenceEvaluationJob(TODAY);
  assert(absenceResult.totalActiveEmployees > 0, `Absence job evaluated ${absenceResult.totalActiveEmployees} active employees`);

  // --------------------------------------------------------------------------
  // Step 8: Query /attendance/me/today Final State
  // --------------------------------------------------------------------------
  console.log('\n--- Step 8: Verifying /attendance/me/today API Payload ---');
  const resToday = await fetch(`${API_BASE}/me/today?employeeId=${TEST_EMP_CODE}`);
  const jsonToday = await resToday.json();

  assert(resToday.ok && jsonToday.success === true, 'GET /attendance/me/today returned 200 OK');
  assert(jsonToday.data.worked_display.includes('h '), `Worked display is canonical ({H}h {MM}m): ${jsonToday.data.worked_display}`);
  assert(jsonToday.data.is_auto_checkout === true, 'is_auto_checkout returned accurately');

  console.log('\n========================================================================');
  console.log(`BACKEND VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyBackendWorkflow().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
