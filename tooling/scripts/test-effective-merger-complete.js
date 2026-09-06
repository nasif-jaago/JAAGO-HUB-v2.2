const assert = (condition, msg, actual, expected) => {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    if (actual !== undefined) console.error(`   Actual:   ${JSON.stringify(actual)}`);
    if (expected !== undefined) console.error(`   Expected: ${JSON.stringify(expected)}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
};

async function testMergedAttendance() {
  console.log('=== 1. Testing Live /api/v1/attendance/me/today for Nasif Kamal ===');
  const todayRes = await fetch('http://localhost:3000/api/v1/attendance/me/today?employeeId=FO032507061190');
  assert(todayRes.ok, '/api/v1/attendance/me/today returned 200 OK', todayRes.status, 200);
  const todayJson = await todayRes.json();
  assert(todayJson.success, 'today API success is true');
  
  const d = todayJson.data;
  console.log('Today Payload Data:', {
    state: d.state,
    first_check_in_at: d.first_check_in_at,
    last_check_out_at: d.last_check_out_at,
    check_in_time_local: d.check_in_time_local,
    check_out_time_local: d.check_out_time_local,
    primary_source: d.primary_source,
    worked_seconds: d.worked_seconds,
    worked_display: d.worked_display,
    status: d.status,
    buttons: d.buttons
  });

  // Verify Nasif's First Check-In is BioTime 10:14 AM (or earlier) instead of GPS 11:05 AM
  assert(
    d.check_in_time_local === '10:14 AM' || d.first_check_in_at?.includes('04:14:39'),
    'First Check-In counted BioTime In (10:14 AM) over GPS In (11:05 AM)',
    d.check_in_time_local
  );
  assert(
    d.status === 'Present',
    'Status is Present (on-time because 10:14 AM <= 10:30 AM threshold)',
    d.status
  );
  assert(
    d.worked_seconds > 0,
    'Working hours counted seconds > 0',
    d.worked_seconds
  );

  console.log('\n=== 2. Testing Live /api/v1/attendance/logs for Nasif Kamal ===');
  const logsRes = await fetch('http://localhost:3000/api/v1/attendance/logs?employeeId=FO032507061190');
  assert(logsRes.ok, '/api/v1/attendance/logs returned 200 OK');
  const logsJson = await logsRes.json();
  assert(logsJson.success, 'logs API success is true');
  assert(Array.isArray(logsJson.data) && logsJson.data.length > 0, 'Returned attendance logs array');

  const todayLog = logsJson.data.find(l => l.date === '2026-09-06');
  assert(Boolean(todayLog), 'Found today (2026-09-06) record in attendance logs');
  console.log('Today Log Record:', {
    date: todayLog.date,
    checkInTime: todayLog.checkInTime,
    checkOutTime: todayLog.checkOutTime,
    status: todayLog.status,
    device: todayLog.device,
    primarySource: todayLog.primarySource,
    allPunchesCount: todayLog.allPunches?.length
  });

  assert(
    todayLog.checkInTime === '10:14 AM',
    'Attendance table log checkInTime is 10:14 AM',
    todayLog.checkInTime
  );
  assert(
    todayLog.status === 'Present',
    'Attendance table log status is Present',
    todayLog.status
  );
  assert(
    Array.isArray(todayLog.allPunches) && todayLog.allPunches.length > 0,
    'Multi-Source Punch Audit allPunches array is populated',
    todayLog.allPunches?.length
  );

  const winningInPunch = todayLog.allPunches.find(p => p.isCountedCheckIn);
  assert(
    Boolean(winningInPunch),
    'Found winning punch flagged with isCountedCheckIn = true in allPunches',
    winningInPunch?.punchAt
  );

  console.log('\n🎉 ALL MERGED ATTENDANCE ASSERTIONS PASSED SUCCESSFULLY!');
}

testMergedAttendance().catch(e => {
  console.error(e);
  process.exit(1);
});
