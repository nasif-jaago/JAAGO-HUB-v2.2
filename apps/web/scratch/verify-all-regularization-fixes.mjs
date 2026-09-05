// Comprehensive verification script for Attendance Regularization fixes
const BASE_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('--- 1. Testing GET /api/v1/attendance/regularization ---');
  const regRes = await fetch(`${BASE_URL}/api/v1/attendance/regularization`);
  const regData = await regRes.json();
  console.log(`Retrieved ${regData.data?.length || 0} regularizations from server.`);

  // Find 2026-08-31 and 2026-08-30 items
  const aug31 = regData.data?.find((r) => r.date === '2026-08-31');
  const aug30 = regData.data?.find((r) => r.date === '2026-08-30');
  console.log(`2026-08-31 status: ${aug31?.status}, employee: ${aug31?.employeeName}`);
  console.log(`2026-08-30 status: ${aug30?.status}, employee: ${aug30?.employeeName}`);

  console.log('\n--- 2. Approving 2026-08-30 if pending ---');
  if (aug30 && aug30.status !== 'Approved') {
    const appRes = await fetch(`${BASE_URL}/api/v1/attendance/regularization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve',
        instanceId: aug30.id,
        reviewerName: 'Nasif Kamal',
        reviewerCode: 'FO032507061190',
      }),
    });
    const appData = await appRes.json();
    console.log(`Approved 2026-08-30 result:`, appData.success, appData.data?.status);
  }

  console.log('\n--- 3. Testing GET /api/v1/attendance/logs after approvals ---');
  const logsRes = await fetch(`${BASE_URL}/api/v1/attendance/logs`);
  const logsData = await logsRes.json();
  const nayeemLogs = logsData.data?.filter((l) => l.employeeCode === 'FO072408021002');
  console.log(`Found ${nayeemLogs?.length} logs for S M Nayeem Rahman:`);
  nayeemLogs.forEach((l) => {
    console.log({
      date: l.date,
      employeeName: l.employeeName,
      employeeCode: l.employeeCode,
      checkInTime: l.checkInTime,
      checkOutTime: l.checkOutTime,
      status: l.status,
      lateByMin: l.lateByMin,
      notes: l.notes,
    });
  });

  console.log('\n--- 4. Checking Notifications for Requester & Super Admin ---');
  const notifsRes = await fetch(`${BASE_URL}/api/v1/notifications`);
  const notifsData = await notifsRes.json();
  console.log(`Found ${notifsData.data?.length || 0} notifications:`);
  (notifsData.data || []).slice(0, 5).forEach((n) => {
    console.log(`[${n.category}] ${n.title} -> ${n.message?.slice(0, 70)}...`);
  });
}

runVerification().catch(console.error);
