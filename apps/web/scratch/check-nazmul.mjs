async function run() {
  const usersRes = await fetch('http://localhost:3000/api/v1/users');
  const usersJson = await usersRes.json();
  const nazmul = (usersJson.data || usersJson.users || []).find(e =>
    (e.name || e.fullName || '').toLowerCase().includes('nazmul') ||
    (e.email || '').toLowerCase().includes('nazmul')
  );
  console.log('User Nazmul:', nazmul);

  const logsRes = await fetch('http://localhost:3000/api/v1/attendance/logs?limit=500');
  const logsJson = await logsRes.json();
  console.log('Total attendance records in DB:', logsJson.data?.length);
  const nazmulLogs = logsJson.data?.filter(l =>
    (l.employeeName || '').toLowerCase().includes('nazmul') ||
    (nazmul && l.employeeId === nazmul.id) ||
    (nazmul && l.employeeCode === nazmul.employeeCode) ||
    (nazmul && l.employeeCode === nazmul.code)
  );
  console.log('Nazmul Logs count:', nazmulLogs?.length, nazmulLogs);
}
run().catch(console.error);
