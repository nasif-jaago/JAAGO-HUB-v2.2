async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/v1/emails/leave-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'supervisor_submit',
        supervisorName: 'Nasif Kamal',
        supervisorEmail: 'nasif.kamal@jaago.com.bd',
        employeeName: 'S M Nayeem Rahman',
        employeeCode: 'FO072408021002',
        designation: 'Team Lead',
        department: "Founder's Office (JF)",
        leaveType: 'Medical Leave',
        fromDate: '2026-09-06',
        toDate: '2026-09-06',
        totalDays: 1,
        reason: 'Test Medical Leave',
        attachmentName: 'prescription.pdf',
        requestId: 'req-1788502483807'
      })
    });
    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response data:', data);
  } catch (err) {
    console.error('Error calling endpoint:', err);
  }
}

test();
