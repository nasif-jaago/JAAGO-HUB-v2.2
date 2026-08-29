async function testApi() {
  const res = await fetch('http://localhost:3000/api/v1/attendance/check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeId: 'FO032507061190',
      latitude: 23.85687,
      longitude: 90.38453,
      accuracy: 151,
      deviceInfo: 'Web Portal (Nasif Home)',
    }),
  });
  const json = await res.json();
  console.log('CHECK-IN API RESULT:', JSON.stringify(json, null, 2));
}

testApi().catch(console.error);
