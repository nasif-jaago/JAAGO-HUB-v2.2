async function run() {
  const res = await fetch('http://localhost:3000/api/v1/emails/regularization-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'supervisor_submit',
      supervisorName: 'S M Nayeem Rahman',
      supervisorEmail: 'nayeem.rahman@jaago.com.bd',
      employeeName: 'Nasif Kamal',
      employeeCode: 'FO032507061190',
      department: "Founder's Office JFT",
      designation: 'Coordinator, Tech 4 Development',
      date: '2026-09-09',
      originalCheckIn: '10:48 AM',
      originalCheckOut: '11:51 AM',
      originalStatus: 'Late',
      adjustedCheckIn: '10:00 AM',
      adjustedCheckOut: '06:00 PM',
      workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
      calculatedHours: '8.0h',
      reason: 'Late Entry Due to Official Field Work / Traffic',
      requestId: 'reg-verify-nayeem-fix',
    }),
  });
  const data = await res.json();
  console.log('Response from API:', data);
}

run().catch(console.error);
