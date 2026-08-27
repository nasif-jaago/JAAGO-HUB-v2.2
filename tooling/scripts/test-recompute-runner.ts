import assert from 'node:assert/strict';
import { recomputeAttendanceRecordPure } from '../../packages/core-domain/src/attendance/recompute';
import { ShiftSnapshot, AttendanceFacts } from '../../packages/core-domain/src/attendance/types';

async function runTests() {
  console.log('===========================================================');
  console.log('RUNNING ATTENDANCE DERIVATION CORE UNIT TESTS (§8 & §16)');
  console.log('===========================================================\n');

  const standardDhakaShift: ShiftSnapshot = {
    shiftId: 'shift-standard',
    shiftName: 'Standard HQ Shift',
    shiftTimezone: 'Asia/Dhaka', // UTC+6
    shiftStartLocal: '10:00',
    shiftEndLocal: '18:00',
    shiftBufferMinutes: 30, // threshold: 10:30
    isScheduledWorkingDay: true,
  };

  // Test 1: 10:29 -> present, 0 late
  {
    const facts: AttendanceFacts = {
      employeeId: 'EMP-001',
      businessDate: '2026-08-27',
      checkInAt: '2026-08-27T04:29:00.000Z', // 10:29 Dhaka
      checkInSource: 'gps',
    };
    const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
    assert.equal(res.status, 'present');
    assert.equal(res.isLate, false);
    assert.equal(res.lateByMinutes, 0);
    console.log('✅ Test 1 Passed: 10:29 -> Present (0m late)');
  }

  // Test 2: 10:30 exact threshold -> present, 0 late
  {
    const facts: AttendanceFacts = {
      employeeId: 'EMP-001',
      businessDate: '2026-08-27',
      checkInAt: '2026-08-27T04:30:00.000Z', // 10:30 Dhaka
      checkInSource: 'gps',
    };
    const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
    assert.equal(res.status, 'present');
    assert.equal(res.isLate, false);
    assert.equal(res.lateByMinutes, 0);
    console.log('✅ Test 2 Passed: 10:30 (exact threshold) -> Present (0m late)');
  }

  // Test 3: 10:30:20 -> present, 0 late (truncated to minute)
  {
    const facts: AttendanceFacts = {
      employeeId: 'EMP-001',
      businessDate: '2026-08-27',
      checkInAt: '2026-08-27T04:30:20.000Z', // 10:30:20 Dhaka
      checkInSource: 'gps',
    };
    const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
    assert.equal(res.status, 'present');
    assert.equal(res.isLate, false);
    assert.equal(res.lateByMinutes, 0);
    console.log('✅ Test 3 Passed: 10:30:20 -> Present (0m late)');
  }

  // Test 4: 10:31 -> late by 1 min
  {
    const facts: AttendanceFacts = {
      employeeId: 'EMP-001',
      businessDate: '2026-08-27',
      checkInAt: '2026-08-27T04:31:00.000Z', // 10:31 Dhaka
      checkInSource: 'gps',
    };
    const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
    assert.equal(res.status, 'late');
    assert.equal(res.isLate, true);
    assert.equal(res.lateByMinutes, 1);
    console.log('✅ Test 4 Passed: 10:31 -> Late by 1m');
  }

  // Test 5: 11:10 -> late by 40 min
  {
    const facts: AttendanceFacts = {
      employeeId: 'EMP-001',
      businessDate: '2026-08-27',
      checkInAt: '2026-08-27T05:10:00.000Z', // 11:10 Dhaka
      checkInSource: 'gps',
    };
    const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
    assert.equal(res.status, 'late');
    assert.equal(res.isLate, true);
    assert.equal(res.lateByMinutes, 40);
    console.log('✅ Test 5 Passed: 11:10 -> Late by 40m');
  }

  // Test 6: Timezone independence (Europe/London)
  {
    const londonShift: ShiftSnapshot = {
      shiftId: 'shift-uk',
      shiftName: 'UK Office Shift',
      shiftTimezone: 'Europe/London',
      shiftStartLocal: '09:00',
      shiftEndLocal: '17:00',
      shiftBufferMinutes: 15, // threshold: 09:15
      isScheduledWorkingDay: true,
    };
    // 09:15 local is 08:15 UTC in BST -> on-time
    const resOnTime = await recomputeAttendanceRecordPure(
      { employeeId: 'EMP-UK', businessDate: '2026-08-27', checkInAt: '2026-08-27T08:15:00.000Z' },
      londonShift
    );
    assert.equal(resOnTime.status, 'present');
    assert.equal(resOnTime.isLate, false);

    // 09:16 local is 08:16 UTC -> late 1m
    const resLate = await recomputeAttendanceRecordPure(
      { employeeId: 'EMP-UK', businessDate: '2026-08-27', checkInAt: '2026-08-27T08:16:00.000Z' },
      londonShift
    );
    assert.equal(resLate.status, 'late');
    assert.equal(resLate.isLate, true);
    assert.equal(resLate.lateByMinutes, 1);
    console.log('✅ Test 6 Passed: Non-Dhaka Timezone (Europe/London) evaluated cleanly');
  }

  // Test 7: Auto-checkout & worked minutes
  {
    const facts: AttendanceFacts = {
      employeeId: 'EMP-001',
      businessDate: '2026-08-27',
      checkInAt: '2026-08-27T04:00:00.000Z',
      checkOutAt: '2026-08-27T17:30:00.000Z',
      checkInSource: 'gps',
      checkOutSource: 'auto',
    };
    const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
    assert.equal(res.isAutoCheckout, true);
    assert.equal(res.workedMinutes, 810);
    console.log('✅ Test 7 Passed: Auto-checkout flag and worked minutes');
  }

  // Test 8: Empty / Closed Day Precedence (I9)
  {
    // Weekly Off
    const offRes = await recomputeAttendanceRecordPure(
      { employeeId: 'EMP-001', businessDate: '2026-08-28' },
      { ...standardDhakaShift, isScheduledWorkingDay: false }
    );
    assert.equal(offRes.status, 'weekly_off');

    // Holiday
    const holRes = await recomputeAttendanceRecordPure(
      { employeeId: 'EMP-001', businessDate: '2026-12-16' },
      standardDhakaShift,
      undefined,
      { isHoliday: () => true }
    );
    assert.equal(holRes.status, 'holiday');

    // Leave
    const leaveRes = await recomputeAttendanceRecordPure(
      { employeeId: 'EMP-001', businessDate: '2026-08-27' },
      standardDhakaShift,
      { hasApprovedLeave: () => true }
    );
    assert.equal(leaveRes.status, 'on_leave');

    // Absent
    const absentRes = await recomputeAttendanceRecordPure(
      { employeeId: 'EMP-001', businessDate: '2026-08-27' },
      standardDhakaShift
    );
    assert.equal(absentRes.status, 'absent');
    assert.equal(absentRes.workedMinutes, null);
    console.log('✅ Test 8 Passed: Weekly-Off / Holiday / On-Leave / Absent precedence (I9)');
  }

  console.log('\n===========================================================');
  console.log('🎉 ALL 8 DERIVATION CORE TESTS PASSED WITH 100% ACCURACY!');
  console.log('===========================================================');
}

runTests();
