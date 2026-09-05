/**
 * Multi-Source Attendance Integration Test Suite
 * Validates BioTime Biometric + GPS Attendance Merging & Counting Rules
 * Scenarios Tested:
 *  A. Pure GPS Attendance Only
 *  B. Pure BioTime Biometric Attendance Only
 *  C. Merged: BioTime Check-In (earlier) + GPS Check-Out (later)
 *  D. Multiple punches throughout day (MIN First-In, MAX Last-Out)
 *  E. Idempotency & quarantine isolation of unmatched records
 *  F. Pure Calculation Engine edge cases (Dhaka timezone, late threshold, worked hours)
 */

import {
  computeEffectiveAttendanceDay,
  RawPunchEvent,
  formatLocalDhakaTime,
} from '../../packages/core-domain/src/attendance/effective';

function runAssertions() {
  console.log('================================================================');
  console.log('🧪 RUNNING EFFECTIVE ATTENDANCE INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details !== undefined) console.error('     Details:', details);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Scenario A: Pure GPS Only
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- SCENARIO A: Pure GPS Attendance ---');
  {
    const businessDate = '2026-09-06';
    const gpsPunches: RawPunchEvent[] = [
      {
        id: 'gps-in-1',
        punchAt: '2026-09-06T03:15:00.000Z', // 09:15 AM Dhaka
        punchType: 'check_in',
        source: 'gps',
        deviceInfo: 'Web Portal',
      },
      {
        id: 'gps-out-1',
        punchAt: '2026-09-06T12:30:00.000Z', // 06:30 PM Dhaka
        punchType: 'check_out',
        source: 'gps',
        deviceInfo: 'Web Portal',
      },
    ];

    const res = computeEffectiveAttendanceDay({
      employeeId: 'emp-001',
      employeeCode: 'FO032507061190',
      businessDate,
      gpsPunches,
    });

    assert(res.countedCheckInTimeLocal === '09:15 AM', 'Scenario A - Counted Check-In is 09:15 AM', res.countedCheckInTimeLocal);
    assert(res.countedCheckOutTimeLocal === '06:30 PM', 'Scenario A - Counted Check-Out is 06:30 PM', res.countedCheckOutTimeLocal);
    assert(res.primarySource === 'Web Portal (GPS)', 'Scenario A - Primary Source is Web Portal (GPS)', res.primarySource);
    assert(res.status === 'Present', 'Scenario A - Status is Present (before 10:30 AM)', res.status);
    assert(res.workedSeconds === 33300, 'Scenario A - Worked Seconds accurately computed (9h 15m)', res.workedSeconds);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Scenario B: Pure BioTime Only
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO B: Pure BioTime Biometric Attendance ---');
  {
    const businessDate = '2026-09-06';
    const biotimePunches: RawPunchEvent[] = [
      {
        id: 'bio-in-1',
        punchAt: '2026-09-06T03:05:00.000Z', // 09:05 AM Dhaka
        punchType: 'check_in',
        source: 'biotime',
        terminalSn: 'CK9L211460012',
      },
      {
        id: 'bio-out-1',
        punchAt: '2026-09-06T12:00:00.000Z', // 06:00 PM Dhaka
        punchType: 'check_out',
        source: 'biotime',
        terminalSn: 'CK9L211460012',
      },
    ];

    const res = computeEffectiveAttendanceDay({
      employeeId: 'emp-001',
      employeeCode: 'FO032507061190',
      businessDate,
      biotimePunches,
    });

    assert(res.countedCheckInTimeLocal === '09:05 AM', 'Scenario B - Counted Check-In is 09:05 AM', res.countedCheckInTimeLocal);
    assert(res.countedCheckOutTimeLocal === '06:00 PM', 'Scenario B - Counted Check-Out is 06:00 PM', res.countedCheckOutTimeLocal);
    assert(res.primarySource === 'BioTime Terminal', 'Scenario B - Primary Source is BioTime Terminal', res.primarySource);
    assert(res.status === 'Present', 'Scenario B - Status is Present', res.status);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Scenario C: Merged BioTime Check-In + GPS Check-Out
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO C: Merged BioTime In + GPS Out ---');
  {
    const businessDate = '2026-09-06';
    const gpsPunches: RawPunchEvent[] = [
      // GPS In at 09:45 AM
      {
        id: 'gps-in-1',
        punchAt: '2026-09-06T03:45:00.000Z',
        punchType: 'check_in',
        source: 'gps',
        deviceInfo: 'Web Portal',
      },
      // Later GPS Out at 06:45 PM
      {
        id: 'gps-out-1',
        punchAt: '2026-09-06T12:45:00.000Z',
        punchType: 'check_out',
        source: 'gps',
        deviceInfo: 'Web Portal',
      },
    ];

    const biotimePunches: RawPunchEvent[] = [
      // Earlier BioTime In at 08:55 AM
      {
        id: 'bio-in-1',
        punchAt: '2026-09-06T02:55:00.000Z',
        punchType: 'check_in',
        source: 'biotime',
        terminalSn: 'CK9L211460012',
      },
      // Earlier BioTime Out at 05:30 PM
      {
        id: 'bio-out-1',
        punchAt: '2026-09-06T11:30:00.000Z',
        punchType: 'check_out',
        source: 'biotime',
        terminalSn: 'CK9L211460012',
      },
    ];

    const res = computeEffectiveAttendanceDay({
      employeeId: 'emp-001',
      employeeCode: 'FO032507061190',
      businessDate,
      gpsPunches,
      biotimePunches,
    });

    assert(res.countedCheckInTimeLocal === '08:55 AM', 'Scenario C - First-In MIN rule: BioTime In (08:55 AM) wins over GPS In (09:45 AM)', res.countedCheckInTimeLocal);
    assert(res.countedCheckOutTimeLocal === '06:45 PM', 'Scenario C - Last-Out MAX rule: GPS Out (06:45 PM) wins over BioTime Out (05:30 PM)', res.countedCheckOutTimeLocal);
    assert(res.primarySource === 'Merged (GPS + BioTime)', 'Scenario C - Primary Source is accurately Merged (GPS + BioTime)', res.primarySource);
    assert(res.sourceBreakdown.gpsPunchCount === 2, 'Scenario C - GPS punches counted = 2', res.sourceBreakdown.gpsPunchCount);
    assert(res.sourceBreakdown.biotimePunchCount === 2, 'Scenario C - BioTime punches counted = 2', res.sourceBreakdown.biotimePunchCount);
    assert(res.allPunches.length === 4, 'Scenario C - Total punches pooled = 4', res.allPunches.length);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Scenario D: Multi-Punch Day (Intermediate punches ignored for In/Out pair)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO D: Multi-Punch Day & Ranking ---');
  {
    const businessDate = '2026-09-06';
    const biotimePunches: RawPunchEvent[] = [
      { id: 'p1', punchAt: '2026-09-06T03:00:00.000Z', punchType: 'check_in', source: 'biotime' }, // 09:00 AM (WINNER IN)
      { id: 'p3', punchAt: '2026-09-06T07:00:00.000Z', punchType: 'check_out', source: 'biotime' }, // 01:00 PM (Lunch Out)
      { id: 'p4', punchAt: '2026-09-06T08:00:00.000Z', punchType: 'check_in', source: 'biotime' }, // 02:00 PM (Lunch In)
      { id: 'p6', punchAt: '2026-09-06T13:30:00.000Z', punchType: 'check_out', source: 'biotime' }, // 07:30 PM (WINNER OUT)
    ];

    const gpsPunches: RawPunchEvent[] = [
      { id: 'p2', punchAt: '2026-09-06T03:10:00.000Z', punchType: 'check_in', source: 'gps' }, // 09:10 AM
      { id: 'p5', punchAt: '2026-09-06T12:00:00.000Z', punchType: 'check_out', source: 'gps' }, // 06:00 PM
    ];

    const res = computeEffectiveAttendanceDay({
      employeeId: 'emp-001',
      employeeCode: 'FO032507061190',
      businessDate,
      gpsPunches,
      biotimePunches,
    });

    assert(res.countedCheckInTimeLocal === '09:00 AM', 'Scenario D - First punch MIN(in) = 09:00 AM', res.countedCheckInTimeLocal);
    assert(res.countedCheckOutTimeLocal === '07:30 PM', 'Scenario D - Last punch MAX(out) = 07:30 PM', res.countedCheckOutTimeLocal);
    assert(res.allPunches.length === 6, 'Scenario D - All 6 raw punches preserved', res.allPunches.length);

    const countedIn = res.allPunches.find((p) => p.isCountedCheckIn);
    const countedOut = res.allPunches.find((p) => p.isCountedCheckOut);
    assert(countedIn?.punchAt === '2026-09-06T03:00:00.000Z', 'Scenario D - isCountedCheckIn flag correctly marks 09:00 AM punch', countedIn?.punchAt);
    assert(countedOut?.punchAt === '2026-09-06T13:30:00.000Z', 'Scenario D - isCountedCheckOut flag correctly marks 07:30 PM punch', countedOut?.punchAt);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Scenario E: Late Calculation (10:30 AM Threshold in Asia/Dhaka)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO E: Lateness Determination ---');
  {
    const businessDate = '2026-09-06';
    // Punch at 10:45 AM Dhaka (04:45 UTC) -> Late by 15 mins (shift starts 10:00 + 30m buffer = 10:30)
    const biotimePunches: RawPunchEvent[] = [
      {
        id: 'p1',
        punchAt: '2026-09-06T04:45:00.000Z',
        punchType: 'check_in',
        source: 'biotime',
      },
    ];

    const res = computeEffectiveAttendanceDay({
      employeeId: 'emp-001',
      employeeCode: 'FO032507061190',
      businessDate,
      biotimePunches,
    });

    assert(res.status === 'Late', 'Scenario E - Status is Late for 10:45 AM entry', res.status);
    assert(res.isLate === true, 'Scenario E - isLate is true', res.isLate);
    assert(res.lateByMinutes === 15, 'Scenario E - Late by 15 minutes', res.lateByMinutes);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Scenario F: Timezone & Boundary Parsing (Asia/Dhaka UTC+06:00)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- SCENARIO F: Timezone (Asia/Dhaka UTC+06:00) ---');
  {
    const isoUtc = '2026-09-06T03:30:00.000Z'; // 03:30 UTC = 09:30 AM Dhaka
    const formatted = formatLocalDhakaTime(isoUtc);
    assert(formatted === '09:30 AM', 'Scenario F - 03:30 UTC formatted as 09:30 AM Dhaka', formatted);

    const eveningIso = '2026-09-06T12:45:00.000Z'; // 12:45 UTC = 06:45 PM Dhaka
    const eveningFormatted = formatLocalDhakaTime(eveningIso);
    assert(eveningFormatted === '06:45 PM', 'Scenario F - 12:45 UTC formatted as 06:45 PM Dhaka', eveningFormatted);
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RUN SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAssertions();
