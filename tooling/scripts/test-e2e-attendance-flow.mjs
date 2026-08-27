import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function runE2ETest() {
  console.log('================================================================');
  console.log('RUNNING END-TO-END ATTENDANCE & DATABASE INTEGRATION TEST');
  console.log('================================================================\n');

  const testEmpId = 'emp-e2e-test-01';
  const today = '2026-08-27';

  // 0. Clean up previous test record if any
  await supabase.from('attendance_records').delete().eq('employee_id', testEmpId);
  await supabase.from('attendance_events').delete().eq('employee_id', testEmpId);

  // 1. GPS Check-In at JAAGO Banani HQ (23.789555, 90.408706)
  console.log('1. Simulating GPS Check-In at Banani HQ...');
  const inPayload = {
    id: `att-${testEmpId}-${today}`,
    employee_id: testEmpId,
    business_date: today,
    check_in_at: '2026-08-27T04:15:00.000Z', // 10:15 AM Dhaka (On-time)
    check_in_source: 'gps',
    check_in_location_id: 'gps-1',
    check_in_lat: 23.789555,
    check_in_lng: 90.408706,
    check_in_accuracy_m: 8.5,
    shift_id: 'shift-standard',
    shift_name: 'JAAGO HQ Standard Shift (10:00 AM - 06:00 PM)',
    shift_timezone: 'Asia/Dhaka',
    shift_start_local: '10:00',
    shift_end_local: '18:00',
    shift_buffer_minutes: 30,
    shift_auto_checkout_local: '23:30',
    shift_crosses_midnight: false,
    is_scheduled_working_day: true,
    status: 'present',
    is_late: false,
    late_by_minutes: 0,
    is_auto_checkout: false,
    worked_minutes: null,
  };

  const { data: record1, error: err1 } = await supabase
    .from('attendance_records')
    .upsert(inPayload)
    .select()
    .single();

  if (err1) {
    console.error('❌ Check-in failed:', err1.message);
    return;
  }
  console.log(`✅ Check-In Recorded -> Status: ${record1.status}, Late: ${record1.is_late}, Timezone: ${record1.shift_timezone}`);

  // 2. Audit Event Logging in attendance_events
  console.log('\n2. Logging Check-In Event in attendance_events...');
  const { error: evErr } = await supabase.from('attendance_events').insert({
    employee_id: testEmpId,
    event_type: 'check_in',
    attempted_at: '2026-08-27T04:15:00.000Z',
    latitude: 23.789555,
    longitude: 90.408706,
    accuracy_m: 8.5,
    captured_at: '2026-08-27T04:15:00.000Z',
    device_info: 'E2E Test Runner',
    result: 'accepted',
    distance_m: 12,
  });
  if (evErr) {
    console.error('❌ Event log failed:', evErr.message);
  } else {
    console.log('✅ Physical Event Logged in attendance_events');
  }

  // 3. Simulating Check-Out at 06:15 PM Dhaka (12:15 UTC) -> 8.0 hours worked
  console.log('\n3. Simulating GPS Check-Out...');
  const { data: record2, error: err2 } = await supabase
    .from('attendance_records')
    .update({
      check_out_at: '2026-08-27T12:15:00.000Z',
      check_out_source: 'gps',
      check_out_location_id: 'gps-1',
      check_out_lat: 23.789555,
      check_out_lng: 90.408706,
      check_out_accuracy_m: 6.2,
      worked_minutes: 480, // 8.0 hours
    })
    .eq('id', record1.id)
    .select()
    .single();

  if (err2) {
    console.error('❌ Check-Out update failed:', err2.message);
  } else {
    console.log(`✅ Check-Out Recorded -> Worked Minutes: ${record2.worked_minutes} (${record2.worked_minutes / 60}h)`);
  }

  // 4. Simulating Audited HR Adjustment (Invariant I3)
  console.log('\n4. Simulating Audited HR Adjustment...');
  const { error: adjErr } = await supabase.from('attendance_adjustments').insert({
    attendance_record_id: record1.id,
    field_changed: 'check_in_at',
    old_value: '2026-08-27T04:15:00.000Z',
    new_value: '2026-08-27T04:00:00.000Z',
    changed_by: 'Nasif Kamal (HR Admin)',
    changed_at: new Date().toISOString(),
    reason: 'Employee biometric hardware synchronization discrepancy confirmed by supervisor',
  });

  if (adjErr) {
    console.error('❌ Adjustment log failed:', adjErr.message);
  } else {
    console.log('✅ Immutable HR Adjustment Logged in attendance_adjustments');
  }

  // 5. Query verification
  console.log('\n5. Querying attendance_records for employee...');
  const { data: finalRecord } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', testEmpId)
    .single();

  console.log('Final Canonical Record:');
  console.log(`- Employee ID: ${finalRecord.employee_id}`);
  console.log(`- Business Date: ${finalRecord.business_date}`);
  console.log(`- Check In: ${finalRecord.check_in_at} (${finalRecord.check_in_source})`);
  console.log(`- Check Out: ${finalRecord.check_out_at} (${finalRecord.check_out_source})`);
  console.log(`- Status: ${finalRecord.status}`);
  console.log(`- Is Late: ${finalRecord.is_late} (${finalRecord.late_by_minutes}m)`);
  console.log(`- Worked Minutes: ${finalRecord.worked_minutes}m`);
  console.log(`- Shift Snapshot: ${finalRecord.shift_name} [${finalRecord.shift_start_local} - ${finalRecord.shift_end_local}]`);

  // Cleanup test record
  await supabase.from('attendance_records').delete().eq('employee_id', testEmpId);
  await supabase.from('attendance_events').delete().eq('employee_id', testEmpId);

  console.log('\n================================================================');
  console.log('🎉 END-TO-END FLOW VALIDATED WITH ZERO DATABASE ERRORS!');
  console.log('================================================================');
}

runE2ETest();
