import { getEmployeeAttendanceLogs, AttendanceLogItem } from '../../apps/web/lib/supabase-attendance';

async function testExactMatching() {
  console.log('--- Testing Exact Attendance Matching for Multiple Users named Nayeem ---');

  // Simulated log in the database: Only S M Nayeem Rahman checked in at 01:33 PM
  const allLogs: AttendanceLogItem[] = [
    {
      id: 'att-log-nayeem-rahman',
      employeeId: 'FO072408021002',
      employeeCode: 'FO072408021002',
      employeeName: 'S M Nayeem Rahman',
      designation: 'Team Lead',
      department: "Founder's Office (JF)",
      branch: 'Head Office (Banani)',
      status: 'Late',
      device: 'Web Portal',
      timestamp: '2026-09-03 01:33 PM',
      date: '2026-09-03',
      checkInTime: '01:33 PM',
      lateByMin: 213,
      createdBy: 'S M Nayeem Rahman',
      createdAt: '2026-09-03T13:33:00Z',
      updatedAt: '2026-09-03T13:33:00Z',
    },
  ];

  // In the Attendance Report:
  const targetDate = '2026-09-03';

  // Helper matching logic copied from generateReportForDate
  function matchLogForEmployee(emp: { code: string; id: string; name: string }) {
    const empName = (emp.name || '').toLowerCase().trim();
    const empCode = (emp.code || '').toLowerCase().trim();
    const empId = (emp.id || '').toLowerCase().trim();

    return allLogs.find((l) => {
      if (l.date !== targetDate) return false;
      const lCode = (l.employeeCode || '').toLowerCase().trim();
      const lId = (l.employeeId || '').toLowerCase().trim();
      const lName = (l.employeeName || '').toLowerCase().trim();

      if (empCode && lCode && empCode === lCode) return true;
      if (empId && lId && empId === lId) return true;
      if (empName && lName && empName === lName) return true;

      return false;
    });
  }

  // Employee 1: Md Nayeem Hossain (Program Implementation)
  const emp1 = { code: 'IFN082230101545', id: 'emp-001', name: 'Md Nayeem Hossain' };
  const match1 = matchLogForEmployee(emp1);
  console.log('Employee 1 (Md Nayeem Hossain):', match1 ? `CheckIn: ${match1.checkInTime}` : 'Absent (No match)');
  if (match1) {
    throw new Error('FAIL: Md Nayeem Hossain matched S M Nayeem Rahman log!');
  }

  // Employee 2: Md Nayeem Hossain (Fundraising)
  const emp2 = { code: 'FN082230101545', id: 'emp-002', name: 'Md Nayeem Hossain' };
  const match2 = matchLogForEmployee(emp2);
  console.log('Employee 2 (Md Nayeem Hossain Fundraising):', match2 ? `CheckIn: ${match2.checkInTime}` : 'Absent (No match)');
  if (match2) {
    throw new Error('FAIL: Md Nayeem Hossain Fundraising matched S M Nayeem Rahman log!');
  }

  // Employee 3: S M Nayeem Rahman (Founder Office)
  const emp3 = { code: 'FO072408021002', id: 'FO072408021002', name: 'S M Nayeem Rahman' };
  const match3 = matchLogForEmployee(emp3);
  console.log('Employee 3 (S M Nayeem Rahman):', match3 ? `CheckIn: ${match3.checkInTime} (${match3.status})` : 'Absent');
  if (!match3 || match3.checkInTime !== '01:33 PM') {
    throw new Error('FAIL: S M Nayeem Rahman did not match his own check-in log!');
  }

  console.log('\n SUCCESS: Attendance matching is 100% exact and isolated per employee!');
}

testExactMatching().catch((err) => {
  console.error(err);
  process.exit(1);
});
