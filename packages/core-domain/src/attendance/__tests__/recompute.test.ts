import { describe, it, expect } from 'vitest';
import { recomputeAttendanceRecordPure } from '../recompute';
import { ShiftSnapshot, AttendanceFacts } from '../types';

describe('recomputeAttendanceRecordPure (Derivation Core)', () => {
  const standardDhakaShift: ShiftSnapshot = {
    shiftId: 'shift-standard',
    shiftName: 'Standard HQ Shift',
    shiftTimezone: 'Asia/Dhaka', // UTC+6
    shiftStartLocal: '10:00',
    shiftEndLocal: '18:00',
    shiftBufferMinutes: 30, // threshold: 10:30
    isScheduledWorkingDay: true,
  };

  describe('§8 Late Boundary Unit Tests', () => {
    it('10:29 (UTC 04:29) -> present, late_by_minutes = 0', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T04:29:00.000Z', // 10:29:00 Dhaka
        checkInSource: 'gps',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('present');
      expect(res.isLate).toBe(false);
      expect(res.lateByMinutes).toBe(0);
    });

    it('10:30 (UTC 04:30) exact threshold -> present, late_by_minutes = 0', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T04:30:00.000Z', // 10:30:00 Dhaka
        checkInSource: 'gps',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('present');
      expect(res.isLate).toBe(false);
      expect(res.lateByMinutes).toBe(0);
    });

    it('10:30:20 (UTC 04:30:20) seconds within 10:30 minute -> present, late_by_minutes = 0', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T04:30:20.000Z', // 10:30:20 Dhaka
        checkInSource: 'gps',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('present');
      expect(res.isLate).toBe(false);
      expect(res.lateByMinutes).toBe(0);
    });

    it('10:31 (UTC 04:31) -> late, late_by_minutes = 1', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T04:31:00.000Z', // 10:31:00 Dhaka
        checkInSource: 'gps',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('late');
      expect(res.isLate).toBe(true);
      expect(res.lateByMinutes).toBe(1);
    });

    it('11:10 (UTC 05:10) -> late, late_by_minutes = 40', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T05:10:00.000Z', // 11:10:00 Dhaka
        checkInSource: 'gps',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('late');
      expect(res.isLate).toBe(true);
      expect(res.lateByMinutes).toBe(40);
    });
  });

  describe('Timezone Isolation & Non-Dhaka Shift Test', () => {
    it('evaluates London shift (Europe/London) accurately without hardcoded offsets', async () => {
      const londonShift: ShiftSnapshot = {
        shiftId: 'shift-uk',
        shiftName: 'UK Office Shift',
        shiftTimezone: 'Europe/London',
        shiftStartLocal: '09:00',
        shiftEndLocal: '17:00',
        shiftBufferMinutes: 15, // threshold: 09:15
        isScheduledWorkingDay: true,
      };

      // London on Aug 27 is BST (UTC+1).
      // 09:15 local is 08:15 UTC -> on-time
      const onTimeFacts: AttendanceFacts = {
        employeeId: 'EMP-UK-1',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T08:15:00.000Z',
        checkInSource: 'gps',
      };
      const onTimeRes = await recomputeAttendanceRecordPure(onTimeFacts, londonShift);
      expect(onTimeRes.status).toBe('present');
      expect(onTimeRes.isLate).toBe(false);

      // 09:16 local is 08:16 UTC -> late by 1 min
      const lateFacts: AttendanceFacts = {
        employeeId: 'EMP-UK-1',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T08:16:00.000Z',
        checkInSource: 'gps',
      };
      const lateRes = await recomputeAttendanceRecordPure(lateFacts, londonShift);
      expect(lateRes.status).toBe('late');
      expect(lateRes.isLate).toBe(true);
      expect(lateRes.lateByMinutes).toBe(1);
    });
  });

  describe('Auto-Checkout & Worked Minutes', () => {
    it('flags isAutoCheckout=true when checkOutSource is auto', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T04:00:00.000Z',
        checkOutAt: '2026-08-27T17:30:00.000Z', // 23:30 Dhaka
        checkInSource: 'gps',
        checkOutSource: 'auto',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.isAutoCheckout).toBe(true);
      expect(res.workedMinutes).toBe(13 * 60 + 30); // 810 minutes
    });

    it('clears isAutoCheckout when HR adjusts checkout source to admin/manual', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T04:00:00.000Z',
        checkOutAt: '2026-08-27T12:00:00.000Z', // 18:00 Dhaka
        checkInSource: 'gps',
        checkOutSource: 'admin',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.isAutoCheckout).toBe(false);
      expect(res.workedMinutes).toBe(8 * 60); // 480 minutes
    });
  });

  describe('Empty / Closed Day Precedence (I9)', () => {
    it('sets weekly_off if not a scheduled working day for the shift', async () => {
      const offShift: ShiftSnapshot = {
        ...standardDhakaShift,
        isScheduledWorkingDay: false,
      };
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-28', // Friday
      };
      const res = await recomputeAttendanceRecordPure(facts, offShift);
      expect(res.status).toBe('weekly_off');
    });

    it('sets holiday when date is matched by holiday port', async () => {
      const holidayPort = { isHoliday: async () => true };
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-12-16', // Victory Day
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift, undefined, holidayPort);
      expect(res.status).toBe('holiday');
    });

    it('sets on_leave when employee has approved leave', async () => {
      const leavePort = { hasApprovedLeave: async () => true };
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift, leavePort, undefined);
      expect(res.status).toBe('on_leave');
    });

    it('sets absent only if scheduled working day, not holiday, and not on leave', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('absent');
      expect(res.workedMinutes).toBeNull();
    });
  });
});
