async function test() {
  const res = await fetch('http://localhost:3000/api/v1/attendance/me/today?employeeId=FO032507061190');
  const json = await res.json();
  console.log('CURRENT TODAY RESPONSE:', JSON.stringify(json, null, 2));
}

test().catch(console.error);
