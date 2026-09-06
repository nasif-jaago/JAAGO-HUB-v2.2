async function testSyncViaHttp() {
  console.log('Posting to /api/v1/biotime/sync...');
  const syncRes = await fetch('http://localhost:3000/api/v1/biotime/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forceAll: true })
  });
  console.log('Sync HTTP status:', syncRes.status);
  const syncJson = await syncRes.json();
  console.log('Sync response:', syncJson);

  console.log('\nFetching /api/v1/attendance/me/today?employeeId=FO032507061190...');
  const todayRes = await fetch('http://localhost:3000/api/v1/attendance/me/today?employeeId=FO032507061190');
  const todayJson = await todayRes.json();
  console.log('Today response:', JSON.stringify(todayJson, null, 2));

  console.log('\nFetching /api/v1/attendance/logs?employeeId=FO032507061190...');
  const logsRes = await fetch('http://localhost:3000/api/v1/attendance/logs?employeeId=FO032507061190');
  const logsJson = await logsRes.json();
  console.log('Logs response:', JSON.stringify(logsJson, null, 2));
}

testSyncViaHttp().catch(console.error);
