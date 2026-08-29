import { describe, it, expect } from 'vitest';
import {
  recomputeAttendanceRecordPure,
  formatWorkingHours,
  getAttendanceDate,
  calculateWorkedSeconds,
} from '../recompute';
import { ShiftSnapshot, AttendanceFacts } from '../types';

describe('Attendance Rebuild Derivation Core Tests', () => {
  const standardDhakaShift: ShiftSnapshot = {
    shiftId: 'shift-standard',
    shiftName: 'Standard HQ Shift',
    shiftTimezone: 'Asia/Dhaka', // UTC+6
    shiftStartLocal: '10:00',
    shiftEndLocal: '18:00',
    shiftBufferMinutes: 30, // threshold: 10:30
    shiftAutoCheckoutLocal: '23:30',
    isScheduledWorkingDay: true,
  };

  describe('formatWorkingHours (Canonical {H}h {MM}m Format)', () => {
    it('renders 0h 00m for 0, negative, null, or undefined seconds (never blank/null/NaN/00)', () => {
      expect(formatWorkingHours(0)).toBe('0h 00m');
      expect(formatWorkingHours(-50)).toBe('0h 00m');
      expect(formatWorkingHours(null)).toBe('0h 00m');
      expect(formatWorkingHours(undefined)).toBe('0h 00m');
      expect(formatWorkingHours(NaN)).toBe('0h 00m');
    });

    it('renders single digit minutes with zero-padding (e.g. 8h 05m)', () => {
      expect(formatWorkingHours(5 * 60)).toBe('0h 05m');
      expect(formatWorkingHours(8 * 3600 + 5 * 60)).toBe('8h 05m');
      expect(formatWorkingHours(14 * 3600)).toBe('14h 00m');
    });
  });

  describe('getAttendanceDate (§3.1 Cutoff & Boundary Rule)', () => {
    it('maps 00:30 local time to the same calendar date', () => {
      // 2026-08-29 00:30 Dhaka is 2026-08-28 18:30 UTC
      const date = getAttendanceDate('2026-08-28T18:30:00.000Z', '23:30', 'Asia/Dhaka');
      expect(date).toBe('2026-08-29');
    });

    it('maps 09:00 and 23:00 to the same attendance day (before 23:30 cutoff)', () => {
      const inDate = getAttendanceDate('2026-08-29T03:00:00.000Z', '23:30', 'Asia/Dhaka'); // 09:00 Dhaka
      const outDate = getAttendanceDate('2026-08-29T17:00:00.000Z', '23:30', 'Asia/Dhaka'); // 23:00 Dhaka
      expect(inDate).toBe('2026-08-29');
      expect(outDate).toBe('2026-08-29');
    });

    it('rolls punches at or after 23:30 (e.g. 23:45) into the next attendance day', () => {
      // 2026-08-29 23:45 Dhaka is 2026-08-29 17:45 UTC
      const date = getAttendanceDate('2026-08-29T17:45:00.000Z', '23:30', 'Asia/Dhaka');
      expect(date).toBe('2026-08-30');
    });
  });

  describe('Scenario A1: In 09:00 / Out 23:00 same day -> 14h 00m, Present', () => {
    it('satisfies Scenario A1 exactly', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-NASIF',
        businessDate: '2026-08-29',
        checkInAt: '2026-08-29T03:00:00.000Z', // 09:00 Dhaka
        checkOutAt: '2026-08-29T17:00:00.000Z', // 23:00 Dhaka
        firstCheckInAt: '2026-08-29T03:00:00.000Z',
        lastCheckOutAt: '2026-08-29T17:00:00.000Z',
        checkInSource: 'gps',
        checkOutSource: 'gps',
        calcMethod: 'span',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('present');
      expect(res.workedSeconds).toBe(14 * 3600);
      expect(res.workedDisplay).toBe('14h 00m');
      expect(res.isAutoCheckout).toBe(false);
    });
  });

  describe('Scenario A2: In 09:00 / No checkout / Cutoff 23:30 -> Auto-checkout 23:30 -> 14h 30m, Present (auto-closed, needs_review)', () => {
    it('satisfies Scenario A2 exactly', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-NASIF',
        businessDate: '2026-08-29',
        checkInAt: '2026-08-29T03:00:00.000Z', // 09:00 Dhaka
        checkOutAt: '2026-08-29T17:30:00.000Z', // 23:30 Dhaka
        firstCheckInAt: '2026-08-29T03:00:00.000Z',
        lastCheckOutAt: '2026-08-29T17:30:00.000Z',
        checkInSource: 'gps',
        checkOutSource: 'auto',
        calcMethod: 'span',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('present');
      expect(res.isAutoCheckout).toBe(true);
      expect(res.needsReview).toBe(true);
      expect(res.workedSeconds).toBe(14 * 3600 + 30 * 60);
      expect(res.workedDisplay).toBe('14h 30m');
    });
  });

  describe('Scenario A3: Multiple sessions (In 09:00, Out 11:00, In 14:00, Out 17:00)', () => {
    const punches = [
      { punchType: 'check_in' as const, punchAt: '2026-08-29T03:00:00.000Z' }, // 09:00 Dhaka
      { punchType: 'check_out' as const, punchAt: '2026-08-29T05:00:00.000Z' }, // 11:00 Dhaka
      { punchType: 'check_in' as const, punchAt: '2026-08-29T08:00:00.000Z' }, // 14:00 Dhaka
      { punchType: 'check_out' as const, punchAt: '2026-08-29T11:00:00.000Z' }, // 17:00 Dhaka
    ];

    it('calculates span method as 8h 00m (last out - first in)', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-NASIF',
        businessDate: '2026-08-29',
        firstCheckInAt: '2026-08-29T03:00:00.000Z',
        lastCheckOutAt: '2026-08-29T11:00:00.000Z',
        punches,
        calcMethod: 'span',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.workedSeconds).toBe(8 * 3600);
      expect(res.workedDisplay).toBe('8h 00m');
    });

    it('calculates sessions method as 5h 00m (sum of work intervals)', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-NASIF',
        businessDate: '2026-08-29',
        firstCheckInAt: '2026-08-29T03:00:00.000Z',
        lastCheckOutAt: '2026-08-29T11:00:00.000Z',
        punches,
        calcMethod: 'sessions',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.workedSeconds).toBe(5 * 3600);
      expect(res.workedDisplay).toBe('5h 00m');
    });
  });

  describe('Scenario A5 & A8: Working day with no check-in -> Absent, 0h 00m', () => {
    it('satisfies Scenario A5 and A8', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-NASIF',
        businessDate: '2026-08-29',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('absent');
      expect(res.workedSeconds).toBe(0);
      expect(res.workedDisplay).toBe('0h 00m');
    });
  });

  describe('Late Arrival Calculation', () => {
    it('marks check-in at 10:30 as on-time (buffer 30 min inclusive)', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T04:30:00.000Z', // 10:30 Dhaka
        checkInSource: 'gps',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('present');
      expect(res.isLate).toBe(false);
      expect(res.lateByMinutes).toBe(0);
    });

    it('marks check-in at 10:31 as late by 1 minute', async () => {
      const facts: AttendanceFacts = {
        employeeId: 'EMP-001',
        businessDate: '2026-08-27',
        checkInAt: '2026-08-27T04:31:00.000Z', // 10:31 Dhaka
        checkInSource: 'gps',
      };
      const res = await recomputeAttendanceRecordPure(facts, standardDhakaShift);
      expect(res.status).toBe('late');
      expect(res.isLate).toBe(true);
      expect(res.lateByMinutes).toBe(1);
    });
  });
});
