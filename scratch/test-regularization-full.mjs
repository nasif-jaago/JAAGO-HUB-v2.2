async function runTests() {
  console.log('--- STARTING E2E ATTENDANCE & REGULARIZATION TESTS ---');

  // 1. Fetch live regularizations
  const regsRes = await fetch('http://localhost:3000/api/v1/attendance/regularization');
  const regsJson = await regsRes.json();
  console.log('1. Regularizations count:', regsJson.data?.length);

  // 2. Approve all pending regularizations to test complete workflow
  for (const reg of regsJson.data || []) {
    if (reg.status === 'Pending') {
      console.log(`Approving regularization: ${reg.id} (${reg.employeeName} - ${reg.date})`);
      const approveRes = await fetch('http://localhost:3000/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          instanceId: reg.id,
          reviewerName: 'Nasif Kamal',
          reviewerCode: 'FO032507061190',
        }),
      });
      const approveJson = await approveRes.json();
      console.log(`Approval result for ${reg.id}:`, approveJson.success, approveJson.message);
    }
  }

  // 3. Check GET /api/v1/attendance/logs
  const logsRes = await fetch('http://localhost:3000/api/v1/attendance/logs');
  const logsJson = await logsRes.json();
  console.log('\n2. Total attendance logs returned:', logsJson.data?.length);

  // Verify dates 2026-08-30, 2026-08-31, 2026-09-03
  const testDates = ['2026-08-30', '2026-08-31', '2026-09-03'];
  for (const td of testDates) {
    const logsForDate = (logsJson.data || []).filter((l) => l.date === td);
    console.log(`\n=== LOGS FOR ${td} (Count: ${logsForDate.length}) ===`);
    logsForDate.forEach((l) => {
      console.log({
        id: l.id,
        employeeName: l.employeeName,
        employeeCode: l.employeeCode,
        date: l.date,
        checkInTime: l.checkInTime,
        checkOutTime: l.checkOutTime,
        status: l.status,
        lateByMin: l.lateByMin,
        notes: l.notes,
      });
    });
  }

  // 4. Test Requester Notifications for S M Nayeem Rahman
  const nayeemNotifsRes = await fetch('http://localhost:3000/api/v1/notifications?userCode=FO072408021002&userName=S%20M%20Nayeem%20Rahman');
  const nayeemNotifsJson = await nayeemNotifsRes.json();
  console.log('\n3. Nayeem Rahman Notifications count:', nayeemNotifsJson.data?.length);
  (nayeemNotifsJson.data || []).slice(0, 5).forEach((n) => {
    console.log(`- [${n.category}] ${n.title}: ${n.message}`);
  });

  // 5. Test Supervisor Notifications for Nasif Kamal
  const nasifNotifsRes = await fetch('http://localhost:3000/api/v1/notifications?userCode=FO032507061190&userName=Nasif%20Kamal&role=super_admin');
  const nasifNotifsJson = await nasifNotifsRes.json();
  console.log('\n4. Nasif Kamal Notifications count:', nasifNotifsJson.data?.length);
  (nasifNotifsJson.data || []).slice(0, 5).forEach((n) => {
    console.log(`- [${n.category}] ${n.title}: ${n.message}`);
  });

  console.log('\n--- E2E TESTS FINISHED ---');
}

runTests().catch(console.error);
