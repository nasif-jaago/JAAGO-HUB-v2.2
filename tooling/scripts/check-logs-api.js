async function checkLogsApi() {
  console.log('1. Querying /api/v1/attendance/logs?employeeId=FO032507061190 ...');
  const res1 = await fetch('http://localhost:3000/api/v1/attendance/logs?employeeId=FO032507061190');
  const json1 = await res1.json();
  console.log(`Returned ${json1.data?.length} records for Nasif.`);
  json1.data?.slice(0, 5).forEach(r => {
    console.log(`  Date: ${r.date} | Emp: ${r.employeeName} (${r.employeeCode}) | In: ${r.checkInTime} | Out: ${r.checkOutTime || '--'} | Status: ${r.status}`);
  });

  console.log('\n2. Querying /api/v1/attendance/logs (no params)...');
  const res2 = await fetch('http://localhost:3000/api/v1/attendance/logs?limit=30');
  const json2 = await res2.json();
  console.log(`Returned ${json2.data?.length} records in total.`);
  json2.data?.slice(0, 10).forEach(r => {
    console.log(`  Date: ${r.date} | Emp: ${r.employeeName} (${r.employeeCode}) | In: ${r.checkInTime} | Out: ${r.checkOutTime || '--'} | Status: ${r.status}`);
  });
}

checkLogsApi().catch(console.error);
