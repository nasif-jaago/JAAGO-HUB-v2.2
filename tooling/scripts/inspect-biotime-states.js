async function inspectAllBioTimePunches() {
  const res = await fetch('http://localhost:3000/api/v1/biotime/logs?view=raw&pageSize=30');
  const json = await res.json();
  console.log('Total transactions:', json.total);
  const sample = (json.data || []).slice(0, 25);
  console.log('Sample transactions:');
  sample.forEach(l => {
    console.log(`${l.punchTime} | ${l.employeeName} (${l.employeeCode}) | State: ${l.punchState} | Type: ${l.verifyType} | Dev: ${l.deviceName}`);
  });
}

inspectAllBioTimePunches();
