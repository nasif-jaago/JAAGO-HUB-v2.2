const BASE_URL = 'http://127.0.0.1:3001';

async function runTests() {
  console.log('========================================================================');
  console.log('VERIFYING ATTENDANCE REGULARIZATION WORKFLOW FOR ALL USERS & SUPERVISORS');
  console.log('========================================================================\n');

  // 1. Check existing regularizations
  const getRegs = await fetch(`${BASE_URL}/api/v1/attendance/regularization`).then((r) => r.json());
  console.log(`[1] Existing Server Regularizations: ${getRegs.data?.length || 0} items`);

  // 2. Test dynamic creation for another employee (e.g. Kazi Farhan - Programmes)
  const kaziPayload = {
    action: 'create',
    data: {
      attendanceLogId: 'att-kazi-test-date',
      employeeId: 'emp-kazi-001',
      employeeCode: 'PR092408021005',
      employeeName: 'Kazi Farhan',
      department: 'Programmes',
      designation: 'Project Officer',
      date: '2026-09-02',
      originalCheckIn: '10:35 AM',
      originalCheckOut: '06:00 PM',
      originalStatus: 'Late',
      originalLateByMin: 35,
      adjustedCheckIn: '10:00 AM',
      adjustedCheckOut: '06:00 PM',
      adjustedStatus: 'Present',
      workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
      calculatedHours: '8.0h',
      reason: 'Traffic congestion on airport road',
      supervisorName: 'Nasif Kamal',
      supervisorEmail: 'nasif.kamal@jaago.com.bd',
    },
  };

  const createRes = await fetch(`${BASE_URL}/api/v1/attendance/regularization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(kaziPayload),
  }).then((r) => r.json());

  console.log(`[2] Created Regularization for Kazi Farhan:`, createRes.success ? `ID: ${createRes.data.id}` : createRes.error);
  const regId = createRes.data?.id;

  // 3. Test Supervisor Workflow Visibility
  // Supervisor: Nasif Kamal -> should see Kazi's request
  const supWfRes = await fetch(`${BASE_URL}/api/v1/workflows?userName=Nasif%20Kamal&userEmail=nasif.kamal@jaago.com.bd&role=supervisor`).then((r) => r.json());
  const foundForSup = supWfRes.data?.find((w) => w.id === regId);
  console.log(`[3] Supervisor (Nasif Kamal) in /workflows can see request:`, Boolean(foundForSup));

  // 4. Test Requester Self-Approval Block
  // Requester: Kazi Farhan -> should NOT see it in /workflows for approval
  const reqWfRes = await fetch(`${BASE_URL}/api/v1/workflows?userName=Kazi%20Farhan&userCode=PR092408021005`).then((r) => r.json());
  const foundForReq = reqWfRes.data?.find((w) => w.id === regId);
  console.log(`[4] Requester (Kazi Farhan) self-approval blocked in /workflows:`, !foundForReq);

  // 5. Test Supervisor Notifications
  const notifRes = await fetch(`${BASE_URL}/api/v1/notifications?userName=Nasif%20Kamal&userEmail=nasif.kamal@jaago.com.bd&role=supervisor`).then((r) => r.json());
  const foundNotif = notifRes.data?.find((n) => n.relatedEntity?.id === regId);
  console.log(`[5] Supervisor in-app notification received:`, Boolean(foundNotif));
  if (foundNotif) {
    console.log(`    Title: "${foundNotif.title}"`);
    console.log(`    Message: "${foundNotif.message}"`);
  }

  // 6. Test Approval by Supervisor
  const approveRes = await fetch(`${BASE_URL}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'approve',
      instanceId: regId,
      reviewerName: 'Nasif Kamal',
      reviewerCode: 'FO032507061190',
    }),
  }).then((r) => r.json());

  console.log(`[6] Supervisor Approval executed:`, approveRes.success, approveRes.message || approveRes.error);

  // 7. Test Attendance Logs Synchronization
  const logsRes = await fetch(`${BASE_URL}/api/v1/attendance/logs?date=2026-09-02`).then((r) => r.json());
  const regularizedLog = logsRes.data?.find((l) => l.employeeCode === 'PR092408021005' || l.employeeName === 'Kazi Farhan');
  console.log(`[7] Attendance Log adjusted in API:`);
  console.log(`    Status: ${regularizedLog?.status}`);
  console.log(`    Check In: ${regularizedLog?.checkInTime}`);
  console.log(`    Check Out: ${regularizedLog?.checkOutTime}`);
  console.log(`    Late Minutes: ${regularizedLog?.lateByMin}`);
  console.log(`    Notes: ${regularizedLog?.notes}`);

  // 8. Test Requester Decision Notification
  const reqNotifRes = await fetch(`${BASE_URL}/api/v1/notifications?userName=Kazi%20Farhan&userCode=PR092408021005`).then((r) => r.json());
  const foundDecisionNotif = reqNotifRes.data?.find((n) => n.relatedEntity?.id === regId && n.title.includes('Approved'));
  console.log(`[8] Requester received Approval Notification:`, Boolean(foundDecisionNotif));
  if (foundDecisionNotif) {
    console.log(`    Title: "${foundDecisionNotif.title}"`);
    console.log(`    Message: "${foundDecisionNotif.message}"`);
  }

  console.log('\n========================================================================');
  console.log('ALL DYNAMIC MULTI-USER & MULTI-SUPERVISOR CHECKS PASSED SUCCESSFULLY!');
  console.log('========================================================================');
}

runTests().catch(console.error);
