async function testNasifAug30() {
  console.log('--- TESTING REGULARIZATION FOR NASIF KAMAL (2026-08-30) ---');

  // 1. Submit regularization for Nasif Kamal on 2026-08-30
  await fetch('http://localhost:3000/api/v1/attendance/regularization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      data: {
        id: 'reg-test-nasif-20260830',
        attendanceLogId: 'att-40c48b6e-9e63-420c-a960-919f13589c9a-2026-08-30',
        employeeId: '40c48b6e-9e63-420c-a960-919f13589c9a',
        employeeCode: 'FO032507061190',
        employeeName: 'Nasif Kamal',
        department: "Founder's Office / FC",
        designation: 'Coordinator, Tech 4 Development',
        date: '2026-08-30',
        originalCheckIn: '11:06 AM',
        originalCheckOut: '--:--',
        originalStatus: 'Late',
        originalLateByMin: 36,
        adjustedCheckIn: '10:00 AM',
        adjustedCheckOut: '06:00 PM',
        adjustedStatus: 'Present',
        workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
        calculatedHours: '8.0h',
        reason: 'Late Entry Due to Official Field Work / Traffic',
        supervisorName: 'Korvi Rakshand (Founder & ED)',
        supervisorEmail: 'korvi@jaago.com.bd',
        status: 'Pending',
      },
    }),
  });

  // 2. Approve regularization
  await fetch('http://localhost:3000/api/v1/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approve',
      instanceId: 'reg-test-nasif-20260830',
      reviewerName: 'Korvi Rakshand (Founder & ED)',
      reviewerCode: 'ED0001',
    }),
  });

  // 3. Query GET /api/v1/attendance/logs for Nasif Kamal on 2026-08-30
  const logsRes = await fetch('http://localhost:3000/api/v1/attendance/logs?date=2026-08-30&employeeId=40c48b6e-9e63-420c-a960-919f13589c9a');
  const logsJson = await logsRes.json();
  console.log('\nNasif Kamal logs on 2026-08-30 count:', logsJson.data?.length);
  console.log(logsJson.data);
}

testNasifAug30().catch(console.error);
