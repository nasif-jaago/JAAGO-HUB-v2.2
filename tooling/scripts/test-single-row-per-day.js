const assert = (condition, msg, actual, expected) => {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    if (actual !== undefined) console.error(`   Actual:   ${JSON.stringify(actual)}`);
    if (expected !== undefined) console.error(`   Expected: ${JSON.stringify(expected)}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
};

async function testSingleRowPerDay() {
  console.log('=== 1. Testing Employee Attendance Logs (1 Row Per Date) ===');
  const res = await fetch('http://localhost:3000/api/v1/attendance/logs?employeeId=FO032507061190');
  assert(res.ok, 'Attendance logs API returned 200 OK');
  const json = await res.json();
  assert(json.success, 'Success is true');
  assert(Array.isArray(json.data), 'Data is array');

  const logs = json.data;
  console.log(`Total logs returned for Nasif: ${logs.length}`);

  // Check unique dates
  const dateCounts = new Map();
  logs.forEach(l => {
    dateCounts.set(l.date, (dateCounts.get(l.date) || 0) + 1);
  });

  console.log('Date breakdown:');
  dateCounts.forEach((count, date) => {
    console.log(`  Date ${date}: ${count} record(s)`);
    assert(count === 1, `Date ${date} has strictly 1 record (found ${count})`, count, 1);
  });

  const todayLog = logs.find(l => l.date === '2026-09-06');
  assert(Boolean(todayLog), 'Found 2026-09-06 today record');
  console.log('\nToday Record Summary:');
  console.log('  Date:', todayLog.date);
  console.log('  Check In:', todayLog.checkInTime);
  console.log('  Check Out:', todayLog.checkOutTime || 'In Progress --:--');
  console.log('  Status:', todayLog.status);
  console.log('  Device Badge:', todayLog.device);
  console.log('  Primary Source:', todayLog.primarySource);
  console.log('  Punches in Audit:', todayLog.allPunches?.length);

  assert(todayLog.checkInTime === '10:14 AM', 'Today Check-In is 10:14 AM (BioTime First In)', todayLog.checkInTime);
  assert(todayLog.status === 'Present', 'Today status is Present', todayLog.status);

  console.log('\n🎉 ALL ONE-ROW-PER-DAY ATTENDANCE CHECKS PASSED!');
}

testSingleRowPerDay().catch(e => {
  console.error(e);
  process.exit(1);
});
