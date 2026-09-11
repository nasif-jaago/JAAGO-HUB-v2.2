'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Flag,
  Calendar,
  Radio,
  Zap,
  CheckCircle2,
  Building2,
  MapPin,
  Briefcase,
  Inbox,
  Timer,
  ChevronRight,
  ShieldCheck,
  X,
  UserCheck,
  BarChart2,
} from 'lucide-react';
import { getActiveEmployeeProfile, getCurrentUserSession } from '@/lib/user-profile-sync';
import { getSupabase } from '@/lib/supabase-auth';
import {
  recordLocalAttendanceLog,
  getEmployeeAttendanceLogs,
  getEmployeeMonthlyAttendanceStats,
  fetchAttendanceLogsFromSupabase,
  calculateWorkingHoursString,
  AttendanceLogItem,
} from '@/lib/supabase-attendance';
import { invalidateCache } from '@/lib/data-cache';
import {
  PublicHolidayItem,
  fetchPublicHolidays,
  fetchLeaveRequests,
  fetchLeaveAllocations,
  LeaveRequestItem,
} from '@/lib/supabase-time-off';
import {
  GPSLocationItem,
  getLocalGPSLocations,
  fetchGPSLocationsFromSupabase,
  evaluateGpsMatch,
} from '@/lib/supabase-gps';
import { fetchOnDutyRequestsFromSupabase } from '@/lib/supabase-onduty';
import { formatDisplayDate } from '@/lib/date-format';
import Link from 'next/link';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'desktop' | 'mobile'>('auto');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string>('--:--');
  const [checkOutTime, setCheckOutTime] = useState<string>('--:--');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [frozenWorkedSeconds, setFrozenWorkedSeconds] = useState<number | null>(null); // Locked once checked out
  const [firstCheckInTimestamp, setFirstCheckInTimestamp] = useState<number | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [publicHolidays, setPublicHolidays] = useState<PublicHolidayItem[]>([]);
  const [gpsLocations, setGpsLocations] = useState<GPSLocationItem[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [onDutyPendingCount, setOnDutyPendingCount] = useState<number>(0);
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveRequestItem[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<{
    totalAvailable: number;
    totalAllocated: number;
    totalUsed: number;
    annualRem: number;
    casualRem: number;
    medicalRem: number;
    emergencyRem: number;
  }>({
    totalAvailable: 61,
    totalAllocated: 61,
    totalUsed: 0,
    annualRem: 15,
    casualRem: 10,
    medicalRem: 10,
    emergencyRem: 4,
  });
  const [user, setUser] = useState({
    id: '',
    fullName: '',
    jobTitle: '',
    department: '',
    project: '',
    manager: '',
    organization: '',
    avatarUrl: '',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    employeeCode: '',
  });

  // Hydrate view mode, attendance status & elapsed timer from localStorage
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    // Safely hydrate session from localStorage after client mount
    try {
      const sess = getCurrentUserSession();
      if (sess && sess.fullName) {
        setUser((prev) => ({
          ...prev,
          id: sess.id || prev.id,
          fullName: sess.fullName,
          jobTitle: sess.jobTitle || prev.jobTitle,
          department: sess.department || prev.department || "Founder's Office JFT",
          project: sess.team || prev.project,
          manager: sess.manager || prev.manager,
          organization: sess.organizationName || prev.organization || 'JAAGO Foundation Trust',
          avatarUrl: sess.avatarUrl || prev.avatarUrl,
          workingSchedule: sess.workingSchedule || prev.workingSchedule,
          employeeCode: sess.employeeCode || prev.employeeCode,
        }));
      }
    } catch {}

    const handleViewModeChange = (e: any) => {
      if (e.detail) {
        setViewMode(e.detail);
      }
    };
    window.addEventListener('jaago_view_mode_change', handleViewModeChange);

    const handleUserUpdated = (e: any) => {
      const u = e.detail?.user || e.detail?.employee;
      if (u) {
        setUser((prev) => ({
          ...prev,
          id: u.id || prev.id,
          fullName: u.fullName || u.name || prev.fullName,
          jobTitle: u.jobTitle || u.designation || prev.jobTitle,
          department: u.department || prev.department,
          project: u.project || u.team || prev.project,
          manager: u.manager || u.supervisor || prev.manager,
          organization: u.organizationName || u.organization || prev.organization,
          avatarUrl: u.avatarUrl || prev.avatarUrl,
          workingSchedule: u.workingSchedule || prev.workingSchedule,
          employeeCode: u.employeeCode || u.code || prev.employeeCode,
        }));
      }
    };
    // Refresh Monthly Attendance Summary Metrics dynamically from canonical backend
    const refreshMonthlyMetrics = () => {
      try {
        const sess = getCurrentUserSession();
        const codeOrId = (sess?.employeeCode || user.employeeCode || user.id || '').trim();
        if (!codeOrId) return;
        const currentMonth = new Date().toISOString().slice(0, 7);
        fetch(`/api/v1/attendance/me/summary?employeeId=${encodeURIComponent(codeOrId)}&month=${currentMonth}`)
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.data) {
              const d = res.data;
              const avg = d.presentDays > 0 && d.totalWorkedHours
                ? (parseFloat(d.totalWorkedHours) / d.presentDays).toFixed(1)
                : '0.0';
              setMonthlyMetrics((prev) => ({
                ...prev,
                presentDays: d.presentDays,
                targetDays: d.targetDays || 22,
                lateDays: d.lateDays,
                autoCheckouts: d.autoCheckouts,
                onTimePerformancePct: d.onTimePerformancePct ?? 100,
                latePenaltyPct: d.latePenaltyPct ?? 0,
                autoCheckoutRatePct: d.autoCheckoutRatePct ?? 0,
                totalWorkedHours: d.totalWorkedHours || '0.0',
                avgHoursPerDay: avg,
              }));
            }
          })
          .catch(() => {});
      } catch (err) {
        console.warn('Error refreshing dashboard monthly metrics:', err);
      }
    };

    // Refresh Pending On-Duty count for the active logged-in employee
    const refreshOnDutyPending = async (targetEmpCode?: string, targetEmpId?: string) => {
      try {
        const reqs = await fetchOnDutyRequestsFromSupabase();
        const sess = getCurrentUserSession();
        const code = (targetEmpCode || sess?.employeeCode || user.employeeCode || '').trim().toLowerCase();
        const uid = (targetEmpId || sess?.id || user.id || '').trim();

        const pending = (reqs || []).filter((r) => {
          const rCode = (r.employeeCode || '').trim().toLowerCase();
          const rUid = (r.employeeId || '').trim();
          const isMyReq =
            (code && rCode === code) ||
            (uid && rUid === uid) ||
            (!code && !uid);
          const st = (r.status || '').toUpperCase();
          return isMyReq && st === 'PENDING';
        }).length;

        setOnDutyPendingCount(pending);
      } catch {
        setOnDutyPendingCount(0);
      }
    };

    const handleOnDutyUpdate = () => {
      refreshOnDutyPending();
    };

    const refreshOnLeaveData = async () => {
      try {
        const reqs = await fetchLeaveRequests();
        const approved = (reqs || []).filter(
          (r) => (r.status || '').toLowerCase() === 'approved'
        );
        setApprovedLeaves(approved);
      } catch (err) {
        console.warn('Error fetching approved leaves for dashboard:', err);
      }
    };

    let handleLeaveUpdate = () => {
      refreshOnLeaveData();
    };

    refreshOnLeaveData();

    window.addEventListener('jaago_user_updated', handleUserUpdated);

    try {
      const savedViewMode = localStorage.getItem('jaago_view_mode') as 'desktop' | 'mobile' | null;
      if (savedViewMode) {
        setViewMode(savedViewMode);
      }

      // Check active Supabase Auth session for definitive ground truth
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data: { session: supaSession } }) => {
        if (supaSession?.user) {
          const userMeta = supaSession.user.user_metadata || {};
          const email = (supaSession.user.email || '').toLowerCase().trim();
          const isNasif = email.includes('nasif.kamal');

          setUser((prev) => ({
            ...prev,
            id: supaSession.user.id || prev.id,
            fullName: prev.fullName || userMeta.full_name || userMeta.name || (isNasif ? 'Nasif Kamal' : ''),
            jobTitle: prev.jobTitle || userMeta.job_title || userMeta.designation || (isNasif ? 'Coordinator' : ''),
            department: prev.department || userMeta.department || (isNasif ? "Founder's Office JFT" : ''),
            organization: prev.organization || userMeta.organization_name || 'JAAGO Foundation Trust',
            avatarUrl: prev.avatarUrl || userMeta.avatar_url || userMeta.picture || '',
          }));
        }
      });

      // Fetch active employee from Supabase
      getActiveEmployeeProfile().then((emp) => {
        if (emp) {
          setUser((prev) => ({
            ...prev,
            id: emp.id || prev.id,
            fullName: emp.name || prev.fullName,
            jobTitle: emp.designation || prev.jobTitle,
            department: emp.department || prev.department || "Founder's Office JFT",
            project: (emp as any).project || (emp as any).projectName || prev.project,
            manager: emp.supervisor || prev.manager,
            organization: emp.organization || prev.organization || 'JAAGO Foundation Trust',
            avatarUrl: emp.avatarUrl || prev.avatarUrl,
            workingSchedule: emp.workingSchedule || prev.workingSchedule,
            employeeCode: emp.code || prev.employeeCode,
          }));
          refreshCanonicalAttendance(emp.id || emp.code);
          refreshLeaveBalance(emp.code);
          refreshOnDutyPending(emp.code, emp.id);
        }
      });

      // Dynamic Leave Balance Calculation from active user allocations
      const refreshLeaveBalance = async (targetEmpCode?: string) => {
        try {
          const sess = getCurrentUserSession();
          const userCode = (targetEmpCode || sess?.employeeCode || user.employeeCode || '').trim().toLowerCase();
          const userName = (sess?.fullName || user.fullName || '').trim().toLowerCase();

          const allocations = await fetchLeaveAllocations();
          const userAlloc =
            allocations.find((a) => userCode && a.employeeCode?.trim().toLowerCase() === userCode) ||
            allocations.find((a) => userName && a.employeeName?.trim().toLowerCase() === userName) ||
            allocations[0];

          if (userAlloc) {
            const clAlloc = userAlloc.casualAllocated ?? 10;
            const clUsed = userAlloc.casualUsed ?? 0;
            const clRem = Math.max(0, clAlloc - clUsed);

            const mlAlloc = userAlloc.medicalAllocated ?? 10;
            const mlUsed = userAlloc.medicalUsed ?? 0;
            const mlRem = Math.max(0, mlAlloc - mlUsed);

            const elAlloc = userAlloc.emergencyAllocated ?? 4;
            const elUsed = userAlloc.emergencyUsed ?? 0;
            const elRem = Math.max(0, elAlloc - elUsed);

            const alAlloc = userAlloc.annualAllocated ?? 15;
            const alUsed = userAlloc.annualUsed ?? 0;
            const alRem = Math.max(0, alAlloc - alUsed);

            const coAlloc = userAlloc.compOffAllocated ?? 16;
            const coUsed = userAlloc.compOffUsed ?? 0;
            const coRemDays = Math.max(0, Math.floor((coAlloc - coUsed) / 8));

            const plAlloc = userAlloc.paternityAllocated ?? 0;
            const plUsed = userAlloc.paternityUsed ?? 0;
            const plRem = Math.max(0, plAlloc - plUsed);

            const matAlloc = userAlloc.maternityAllocated ?? 0;
            const matUsed = userAlloc.maternityUsed ?? 0;
            const matRem = Math.max(0, matAlloc - matUsed);

            const blAlloc = 5;
            const blUsed = userAlloc.bereavementUsed ?? 0;
            const blRem = Math.max(0, blAlloc - blUsed);

            // If paternity allocated > 0, include paternity; else if maternity allocated > 0, include maternity
            const parentalRem = plAlloc > 0 ? plRem : matAlloc > 0 ? matRem : 0;
            const parentalAlloc = plAlloc > 0 ? plAlloc : matAlloc > 0 ? matAlloc : 0;
            const parentalUsed = plAlloc > 0 ? plUsed : matAlloc > 0 ? matUsed : 0;

            const totalAvail = clRem + mlRem + elRem + alRem + coRemDays + parentalRem + blRem;
            const totalAlloc = clAlloc + mlAlloc + elAlloc + alAlloc + Math.floor(coAlloc / 8) + parentalAlloc + blAlloc;
            const totalUsed = clUsed + mlUsed + elUsed + alUsed + Math.floor(coUsed / 8) + parentalUsed + blUsed;

            setLeaveBalance({
              totalAvailable: totalAvail,
              totalAllocated: totalAlloc,
              totalUsed: totalUsed,
              annualRem: alRem,
              casualRem: clRem,
              medicalRem: mlRem,
              emergencyRem: elRem,
            });
          }
        } catch (err) {
          console.warn('Error refreshing leave balance for dashboard:', err);
        }
      };


      // Refresh Live Approvals Count (Strictly excluding self-requests)
      const refreshPendingApprovals = async () => {
        try {
          const sess = getCurrentUserSession();
          const userCode = (sess?.employeeCode || '').trim().toLowerCase();
          const userName = (sess?.fullName || '').trim().toLowerCase();

          const reqs = await fetchLeaveRequests();
          const pending = (reqs || []).filter((r) => {
            if (r.status !== 'Pending') return false;
            // Exclude self-requests: request owner cannot approve their own leave
            if (userCode && r.employeeCode?.trim().toLowerCase() === userCode) return false;
            if (userName && r.employeeName?.trim().toLowerCase() === userName) return false;
            return true;
          }).length;
          setPendingApprovalsCount(pending);
        } catch {}
      };

      refreshPendingApprovals();
      refreshLeaveBalance();
      refreshOnDutyPending();
      refreshMonthlyMetrics();
      refreshOnLeaveData();

      handleLeaveUpdate = () => {
        refreshPendingApprovals();
        refreshLeaveBalance();
        refreshOnLeaveData();
      };

      window.addEventListener('jaago_leave_request_updated', handleLeaveUpdate);
      window.addEventListener('jaago_leave_allocation_updated', () => refreshLeaveBalance());
      window.addEventListener('jaago_employees_updated', () => refreshLeaveBalance());
      window.addEventListener('jaago_onduty_request_updated', handleOnDutyUpdate);
      window.addEventListener('jaago_onduty_updated', handleOnDutyUpdate);
      window.addEventListener('jaago_attendance_updated', refreshMonthlyMetrics);
      window.addEventListener('jaago_attendance_regularization_updated', refreshMonthlyMetrics);

      // Daily Session & Rollover Hydration strictly scoped to the active logged-in user
      const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      // Clean any legacy un-scoped global punch items that may pollute across different accounts
      localStorage.removeItem('jaago_is_checked_in');
      localStorage.removeItem('jaago_checkin_timestamp');
      localStorage.removeItem('jaago_first_checkin_time');
      localStorage.removeItem('jaago_last_checkout_time');
      localStorage.removeItem('jaago_worked_seconds');
      localStorage.removeItem('jaago_auto_checked_out');

      let currentSessionUser: any = null;
      try {
        const rawUser = localStorage.getItem('jaago_user');
        if (rawUser) currentSessionUser = JSON.parse(rawUser);
      } catch {}

      const userKey = (
        currentSessionUser?.employeeCode ||
        currentSessionUser?.id ||
        currentSessionUser?.email ||
        ''
      )
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '_');

      if (!userKey) {
        // No authenticated session key yet — remain clean with defaults
        setIsCheckedIn(false);
        setCheckInTime('--:--');
        setCheckOutTime('--:--');
        setElapsedSeconds(0);
      } else {
        const storedDate = localStorage.getItem(`jaago_att_${userKey}_today_date`);
        if (storedDate && storedDate !== todayStr) {
          // New day rollover: reset punch session for the new day
          localStorage.setItem(`jaago_att_${userKey}_today_date`, todayStr);
          localStorage.removeItem(`jaago_att_${userKey}_is_checked_in`);
          localStorage.removeItem(`jaago_att_${userKey}_checkin_timestamp`);
          localStorage.removeItem(`jaago_att_${userKey}_first_checkin_time`);
          localStorage.removeItem(`jaago_att_${userKey}_last_checkout_time`);
          localStorage.removeItem(`jaago_att_${userKey}_worked_seconds`);
          localStorage.removeItem(`jaago_att_${userKey}_auto_checked_out`);
          setIsCheckedIn(false);
          setCheckInTime('--:--');
          setCheckOutTime('--:--');
          setElapsedSeconds(0);
        } else {
          localStorage.setItem(`jaago_att_${userKey}_today_date`, todayStr);
          const savedState = localStorage.getItem(`jaago_att_${userKey}_is_checked_in`);
          const savedTime = localStorage.getItem(`jaago_att_${userKey}_checkin_timestamp`);
          const savedWorkedSec = parseInt(localStorage.getItem(`jaago_att_${userKey}_worked_seconds`) || '0', 10);
          const savedCheckInTime = localStorage.getItem(`jaago_att_${userKey}_first_checkin_time`);
          const savedCheckOutTime = localStorage.getItem(`jaago_att_${userKey}_last_checkout_time`);
          const alreadyAutoCheckedOut = localStorage.getItem(`jaago_att_${userKey}_auto_checked_out`) === 'true';

          // If no check-in today, both check-in and check-out MUST be '--:--' (new day / unstarted day)
          if (!savedCheckInTime || savedCheckInTime === '--:--') {
            setIsCheckedIn(false);
            setCheckInTime('--:--');
            setCheckOutTime('--:--');
            setElapsedSeconds(0);
            localStorage.removeItem(`jaago_att_${userKey}_last_checkout_time`);
          } else {
            setCheckInTime(savedCheckInTime);
            if (savedCheckOutTime && savedCheckOutTime !== '--:--') {
              setCheckOutTime(savedCheckOutTime);
            } else {
              setCheckOutTime('--:--');
            }
          }

          if (savedState === 'true' && savedTime) {
            // User is currently checked in — check if we need auto-checkout on hydration
            const now = new Date();
            const curHours = now.getHours();
            const curMins = now.getMinutes();
            // Auto-checkout ONLY in the 23:30-23:59 window AND only if not already done today
            const isIn1130Window = curHours === 23 && curMins >= 30;

            if (isIn1130Window && !alreadyAutoCheckedOut) {
              // Auto check out on page load during 11:30-11:59 PM
              const diffSeconds = Math.max(0, Math.floor((Date.now() - parseInt(savedTime, 10)) / 1000));
              const totalSec = savedWorkedSec + diffSeconds;
              setIsCheckedIn(false);
              setCheckOutTime('11:30 PM');
              setElapsedSeconds(totalSec);
              localStorage.setItem(`jaago_att_${userKey}_is_checked_in`, 'false');
              localStorage.removeItem(`jaago_att_${userKey}_checkin_timestamp`);
              localStorage.setItem(`jaago_att_${userKey}_last_checkout_time`, '11:30 PM');
              localStorage.setItem(`jaago_att_${userKey}_worked_seconds`, totalSec.toString());
              localStorage.setItem(`jaago_att_${userKey}_auto_checked_out`, 'true');
            } else {
              // Normal resume: user is checked in
              setIsCheckedIn(true);
              const inTs = parseInt(savedTime, 10);
              if (inTs > 0) {
                setFirstCheckInTimestamp(inTs);
                const diffSeconds = Math.max(0, Math.min(86400, Math.floor((Date.now() - inTs) / 1000)));
                setElapsedSeconds(diffSeconds);
              }
            }
          } else {
            // User is checked out — just restore accumulated worked seconds
            setElapsedSeconds(savedWorkedSec);
          }
        }
      }
    } catch {
      // Fallback gracefully
    }

    // Load Public Holidays & GPS Locations from Supabase / Admin Settings
    fetchPublicHolidays().then((hols) => {
      if (hols) setPublicHolidays(hols);
    });
    fetchGPSLocationsFromSupabase().then((locs) => {
      if (locs && locs.length > 0) setGpsLocations(locs);
    });

    const handleHolidaysUpdate = () => {
      fetchPublicHolidays().then((hols) => {
        if (hols) setPublicHolidays(hols);
      });
    };
    window.addEventListener('jaago_public_holidays_updated', handleHolidaysUpdate);

    const handleStorageRefresh = () => {
      fetchPublicHolidays().then((hols) => {
        if (hols) setPublicHolidays(hols);
      });
      fetchGPSLocationsFromSupabase().then((locs) => {
        if (locs && locs.length > 0) setGpsLocations(locs);
      });
      getActiveEmployeeProfile().then((emp) => {
        if (emp) {
          setUser({
            id: emp.id || '',
            fullName: emp.name,
            jobTitle: emp.designation,
            department: emp.department || '',
            project: (emp as any).project || (emp as any).projectName || '',
            manager: emp.supervisor || '',
            organization: emp.organization || 'JAAGO Foundation',
            avatarUrl: emp.avatarUrl || '',
            workingSchedule: emp.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
            employeeCode: emp.code || '',
          });
          refreshCanonicalAttendance(emp.id || emp.code || '');
          refreshOnDutyPending(emp.code, emp.id);
        }
      });
      refreshMonthlyMetrics();
    };
    window.addEventListener('focus', handleStorageRefresh);
    window.addEventListener('storage', handleStorageRefresh);

    // Live background polling for biometric & GPS attendance status every 25 seconds
    const autoPollInterval = setInterval(() => {
      const sess = getCurrentUserSession();
      const codeOrId = sess?.employeeCode || user.employeeCode || user.id;
      if (codeOrId) {
        refreshCanonicalAttendance(codeOrId);
      }
    }, 25000);

    return () => {
      window.removeEventListener('jaago_view_mode_change', handleViewModeChange);
      window.removeEventListener('jaago_user_updated', handleUserUpdated);
      window.removeEventListener('jaago_public_holidays_updated', handleHolidaysUpdate);
      window.removeEventListener('jaago_onduty_request_updated', handleOnDutyUpdate);
      window.removeEventListener('jaago_onduty_updated', handleOnDutyUpdate);
      window.removeEventListener('jaago_attendance_updated', refreshMonthlyMetrics);
      window.removeEventListener('jaago_attendance_regularization_updated', refreshMonthlyMetrics);
      window.removeEventListener('jaago_leave_request_updated', handleLeaveUpdate);
      window.removeEventListener('focus', handleStorageRefresh);
      window.removeEventListener('storage', handleStorageRefresh);
      clearInterval(autoPollInterval);
    };
  }, []);

  // Live timer tick when checked in & 11:30 PM Auto-checkout watchdog
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCheckedIn && firstCheckInTimestamp) {
      // Clear any frozen checkout seconds — we are now live
      setFrozenWorkedSeconds(null);

      // Immediate initial tick on state change
      const currentServerNow = Date.now() + serverTimeOffset;
      const initialDiff = Math.max(0, Math.floor((currentServerNow - firstCheckInTimestamp) / 1000));
      setElapsedSeconds(initialDiff);

      // Check immediate 11:30 PM cutoff condition
      const checkDhakaCutoff = () => {
        const nowServer = new Date(Date.now() + serverTimeOffset);
        const dhakaTimeStr = nowServer.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour12: false });
        const [dhHourStr, dhMinStr] = dhakaTimeStr.split(':');
        const dhHours = parseInt(dhHourStr || '0', 10);
        const dhMins = parseInt(dhMinStr || '0', 10);
        return (dhHours === 23 && dhMins >= 30) || dhHours > 23;
      };

      if (checkDhakaCutoff()) {
        performAutoCheckOut('11:30 PM');
        return;
      }

      interval = setInterval(() => {
        if (checkDhakaCutoff()) {
          performAutoCheckOut('11:30 PM');
          return;
        }

        const nowServer = Date.now() + serverTimeOffset;
        const diff = Math.max(0, Math.floor((nowServer - firstCheckInTimestamp) / 1000));
        setElapsedSeconds(diff);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCheckedIn, firstCheckInTimestamp, serverTimeOffset]);

  // Effective display seconds: use frozen value when checked out, live value when checked in
  const displaySeconds = !isCheckedIn && frozenWorkedSeconds !== null
    ? frozenWorkedSeconds
    : elapsedSeconds;


  // Format seconds to HH:MM:SS (Hour, Minutes, Seconds together as 00:00:00)
  const formatTime = (totalSec: number | null | undefined): string => {
    if (totalSec === null || totalSec === undefined || isNaN(totalSec) || totalSec <= 0) {
      return '00:00:00';
    }
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = Math.floor(totalSec % 60);
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':');
  };

  // Monthly summary metrics from canonical backend
  const [monthlyMetrics, setMonthlyMetrics] = useState<{
    presentDays: number;
    targetDays: number;
    lateDays: number;
    autoCheckouts: number;
    onTimePerformancePct: number;
    latePenaltyPct: number;
    autoCheckoutRatePct: number;
    totalWorkedHours: string;
    avgHoursPerDay: string;
    dailyTrend: Array<{
      date: string;
      label: string;
      workedHours: number;
      isLate: boolean;
      status: string;
      checkInTime?: string | undefined;
      checkOutTime?: string | undefined;
    }>;
  }>({
    presentDays: 0,
    targetDays: 22,
    lateDays: 0,
    autoCheckouts: 0,
    onTimePerformancePct: 100,
    latePenaltyPct: 0,
    autoCheckoutRatePct: 0,
    totalWorkedHours: '0.0',
    avgHoursPerDay: '0.0',
    dailyTrend: [],
  });
  const [isPunching, setIsPunching] = useState(false);

  // Live GPS Tracker State (Standard Enterprise Geofence Monitor)
  const [gpsTracker, setGpsTracker] = useState<{
    status: 'idle' | 'checking' | 'inside' | 'outside' | 'error';
    locationName: string | null;
    distanceMeters: number | null;
    allowedRadiusMeters: number;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    errorMsg: string | null;
  }>({
    status: 'idle',
    locationName: null,
    distanceMeters: null,
    allowedRadiusMeters: 100,
    latitude: null,
    longitude: null,
    accuracy: null,
    errorMsg: null,
  });

  // Geofence Blocking Interactive Alert Modal State
  const [geofenceAlert, setGeofenceAlert] = useState<{
    isOpen: boolean;
    action: 'CHECK_IN' | 'CHECK_OUT';
    locationName: string;
    distanceMeters: number;
    allowedRadiusMeters: number;
    latitude: number;
    longitude: number;
    errorMsg?: string;
  } | null>(null);

  // Obtain REAL live device GPS coordinates with network IP fallback
  const getCoordinates = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy || 10,
            });
          },
          async () => {
            // If Windows/Browser location service fails, query real network IP location
            try {
              const res = await fetch('/api/v1/attendance/geofence/ip-locate');
              const json = await res.json();
              if (json.success && json.data) {
                resolve({
                  latitude: json.data.latitude,
                  longitude: json.data.longitude,
                  accuracy: json.data.accuracy || 50,
                });
                return;
              }
            } catch {
              // Fallback
            }
            resolve({ latitude: 23.856484, longitude: 90.384588, accuracy: 10 });
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
      } else {
        // Fallback to IP locate
        fetch('/api/v1/attendance/geofence/ip-locate')
          .then((r) => r.json())
          .then((json) => {
            if (json.success && json.data) {
              resolve({
                latitude: json.data.latitude,
                longitude: json.data.longitude,
                accuracy: json.data.accuracy || 50,
              });
            } else {
              resolve({ latitude: 23.856484, longitude: 90.384588, accuracy: 10 });
            }
          })
          .catch(() => {
            resolve({ latitude: 23.856484, longitude: 90.384588, accuracy: 10 });
          });
      }
    });
  };

  // Check live geofence status
  const checkLiveGeofence = async () => {
    try {
      setGpsTracker((prev) => ({ ...prev, status: 'checking' }));
      const coords = await getCoordinates();
      const currentLocs = gpsLocations.length > 0 ? gpsLocations : getLocalGPSLocations();
      const match = evaluateGpsMatch(coords.latitude, coords.longitude, currentLocs);

      setGpsTracker({
        status: match.isInside ? 'inside' : 'outside',
        locationName: match.matchedLocation?.name || match.closestLocation?.name || 'Authorized Office',
        distanceMeters: match.distanceMeters,
        allowedRadiusMeters: match.allowedRadiusMeters,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        errorMsg: match.isInside ? null : 'Outside designated GPS location perimeter',
      });
    } catch (err: any) {
      setGpsTracker((prev) => ({
        ...prev,
        status: 'error',
        errorMsg: err.message || 'GPS location acquisition failed',
      }));
    }
  };

  useEffect(() => {
    checkLiveGeofence();
  }, [gpsLocations]);

  const [myAttendanceLogs, setMyAttendanceLogs] = useState<AttendanceLogItem[]>([]);

  // Auto Check-Out after 11:30 PM (23:30)
  const performAutoCheckOut = (autoTimeStr = '11:30 PM') => {
    const activeKey = (user.employeeCode || user.id || user.fullName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const sessionStart = parseInt((activeKey ? localStorage.getItem(`jaago_att_${activeKey}_checkin_timestamp`) : null) || '0', 10);
    const accumulated = parseInt((activeKey ? localStorage.getItem(`jaago_att_${activeKey}_worked_seconds`) : null) || '0', 10);
    const diff = sessionStart > 0 ? Math.max(0, Math.floor((Date.now() - sessionStart) / 1000)) : 0;
    const newTotal = accumulated + diff;

    setIsCheckedIn(false);
    setCheckOutTime(autoTimeStr);
    setElapsedSeconds(newTotal);
    if (newTotal > 0) setFrozenWorkedSeconds(newTotal); // Freeze counter at auto-checkout

    if (typeof window !== 'undefined' && activeKey) {
      localStorage.setItem(`jaago_att_${activeKey}_is_checked_in`, 'false');
      localStorage.removeItem(`jaago_att_${activeKey}_checkin_timestamp`);
      localStorage.setItem(`jaago_att_${activeKey}_last_checkout_time`, autoTimeStr);
      localStorage.setItem(`jaago_att_${activeKey}_worked_seconds`, newTotal.toString());
      localStorage.setItem(`jaago_att_${activeKey}_auto_checked_out`, 'true');
    }

    const dhakaDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    // Record to unified attendance store
    recordLocalAttendanceLog({
      employeeId: user.id,
      employeeCode: user.employeeCode || '',
      employeeName: user.fullName || 'Staff Member',
      designation: user.jobTitle,
      department: user.department,
      branch: 'Head Office (Banani)',
      date: dhakaDateStr,
      checkInTime: checkInTime || '09:00 AM',
      checkOutTime: autoTimeStr,
      status: 'Present',
      device: 'Web Portal',
      isAutoCheckout: true,
      notes: 'Auto check-out generated after 11:30 PM (Shift End)',
    });

    // Call backend API to persist auto-checkout in Supabase
    fetch('/api/v1/attendance/auto-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: user.id || user.employeeCode,
        cutoffTimeLocal: '23:30',
      }),
    }).catch((err) => console.error('Auto-checkout backend sync error:', err));

    const currentMonth = dhakaDateStr.slice(0, 7);
    const updatedStats = getEmployeeMonthlyAttendanceStats(user.employeeCode || user.id, currentMonth);

    setMonthlyMetrics((prev) => ({
      ...prev,
      autoCheckouts: Math.max(prev.autoCheckouts + 1, updatedStats.autoCheckouts),
    }));

    showToast('System Notice: Auto check-out completed at 11:30 PM.', 'info');
  };

  // Load canonical session and monthly summary
  // Load canonical session and monthly summary
  const refreshCanonicalAttendance = async (empId: string) => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      // 1. Seed local logs calculation only if empty to avoid flicker
      const localStats = getEmployeeMonthlyAttendanceStats(empId || user.employeeCode || user.id, currentMonth);
      setMonthlyMetrics((prev) => {
        if (prev.presentDays > 0) return prev;
        return {
          presentDays: localStats.presentDays,
          targetDays: localStats.targetDays,
          lateDays: localStats.lateDays,
          autoCheckouts: localStats.autoCheckouts,
          onTimePerformancePct: localStats.onTimePerformancePct,
          latePenaltyPct: localStats.latePenaltyPct,
          autoCheckoutRatePct: localStats.autoCheckoutRatePct,
          totalWorkedHours: localStats.totalWorkedHours,
          avgHoursPerDay: localStats.avgHoursPerDay,
          dailyTrend: localStats.dailyTrend,
        };
      });

      const personalLogs = getEmployeeAttendanceLogs(empId || user.employeeCode || user.id);
      setMyAttendanceLogs(personalLogs);

      // Fetch fresh remote attendance logs asynchronously
      fetchAttendanceLogsFromSupabase(true, empId || user.employeeCode).then((remote) => {
        if (remote && remote.length > 0) {
          const userLogs = getEmployeeAttendanceLogs(empId || user.employeeCode || user.id);
          setMyAttendanceLogs(userLogs);
        }
      });

      // 2. Query today session from server API
      const todayRes = await fetch(`/api/v1/attendance/me/today?employeeId=${encodeURIComponent(empId)}`);
      const todayJson = await todayRes.json();
      if (todayJson.success && todayJson.data) {
        const { state, first_check_in_at, last_check_out_at, worked_seconds, server_now } = todayJson.data;
        const isNowCheckedIn = state === 'CHECKED_IN';
        setIsCheckedIn(isNowCheckedIn);

        let offset = serverTimeOffset;
        if (server_now) {
          offset = new Date(server_now).getTime() - Date.now();
          setServerTimeOffset(offset);
        }

        if (first_check_in_at) {
          const inTs = new Date(first_check_in_at).getTime();
          setFirstCheckInTimestamp(inTs);
          const inTime = todayJson.data.check_in_time_local || new Date(first_check_in_at).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Dhaka',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          setCheckInTime(inTime);

          if (isNowCheckedIn) {
            const currentServerNow = Date.now() + offset;
            const liveDiff = Math.max(0, Math.floor((currentServerNow - inTs) / 1000));
            setElapsedSeconds(liveDiff);
            setFrozenWorkedSeconds(null); // Clear freeze when live
          } else if (worked_seconds && worked_seconds > 0) {
            // Only update if server returns a valid positive worked_seconds
            // This prevents background polls with stale/zero data from resetting the counter
            setElapsedSeconds(worked_seconds);
            setFrozenWorkedSeconds(worked_seconds); // Freeze the display
          }
        } else {
          setFirstCheckInTimestamp(null);
          setIsCheckedIn(false);
          setCheckInTime('--:--');
          setCheckOutTime('--:--');
          setElapsedSeconds(0);
        }

        let resolvedOutTime = '--:--';
        if (first_check_in_at && last_check_out_at) {
          resolvedOutTime = todayJson.data.check_out_time_local || new Date(last_check_out_at).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Dhaka',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          setCheckOutTime(resolvedOutTime);
        } else {
          setCheckOutTime('--:--');
        }

        // Synchronize client localStorage with canonical server status scoped to this employee
        const activeKey = (empId || user.employeeCode || user.id || user.fullName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        const userCodeKey = (user.employeeCode || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        const keysToSync = Array.from(new Set([activeKey, userCodeKey].filter(Boolean)));
        if (typeof window !== 'undefined') {
          keysToSync.forEach((k) => {
            if (isNowCheckedIn) {
              localStorage.setItem(`jaago_att_${k}_is_checked_in`, 'true');
              if (first_check_in_at) {
                localStorage.setItem(`jaago_att_${k}_checkin_timestamp`, String(new Date(first_check_in_at).getTime()));
                localStorage.setItem(`jaago_att_${k}_first_checkin_time`, todayJson.data.check_in_time_local || '--:--');
              }
              localStorage.removeItem(`jaago_att_${k}_last_checkout_time`);
              localStorage.removeItem(`jaago_att_${k}_auto_checked_out`);
            } else {
              localStorage.setItem(`jaago_att_${k}_is_checked_in`, 'false');
              localStorage.removeItem(`jaago_att_${k}_checkin_timestamp`);
              if (first_check_in_at) {
                localStorage.setItem(`jaago_att_${k}_first_checkin_time`, todayJson.data.check_in_time_local || '--:--');
              } else {
                localStorage.removeItem(`jaago_att_${k}_first_checkin_time`);
              }
              if (last_check_out_at) {
                localStorage.setItem(`jaago_att_${k}_last_checkout_time`, resolvedOutTime);
              } else {
                localStorage.removeItem(`jaago_att_${k}_last_checkout_time`);
              }
              localStorage.setItem(`jaago_att_${k}_worked_seconds`, String(worked_seconds || 0));
            }
          });
        }

        // Merge today session into myAttendanceLogs
        if (first_check_in_at) {
          const todayDateStr = todayJson.data.businessDate || new Date().toISOString().slice(0, 10);
          const inTime = todayJson.data.check_in_time_local || new Date(first_check_in_at).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Dhaka',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          const outTime = (!isNowCheckedIn && last_check_out_at)
            ? todayJson.data.check_out_time_local || new Date(last_check_out_at).toLocaleTimeString('en-US', {
                timeZone: 'Asia/Dhaka',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : undefined;

          let deviceBadge: 'Web Portal' | 'Device Login' | 'RFID Scanner' = 'Web Portal';
          if (todayJson.data.primary_source === 'BioTime Terminal') {
            deviceBadge = 'Device Login';
          } else if (todayJson.data.primary_source === 'Merged (GPS + BioTime)') {
            deviceBadge = 'RFID Scanner';
          }

          const isLateStatus = String(todayJson.data.status).toLowerCase() === 'late';

          const todayItem: AttendanceLogItem = {
            id: `att-today-${todayDateStr}`,
            employeeId: empId,
            employeeCode: user.employeeCode || '',
            employeeName: user.fullName || 'Staff Member',
            designation: user.jobTitle,
            department: user.department,
            branch: gpsTracker.locationName || 'Head Office (Banani)',
            date: todayDateStr,
            checkInTime: inTime,
            checkOutTime: outTime,
            status: (isLateStatus ? 'Late' : 'Present') as any,
            device: deviceBadge,
            primarySource: todayJson.data.primary_source,
            checkInSource: todayJson.data.check_in_source,
            checkOutSource: todayJson.data.check_out_source,
            sourceBreakdown: todayJson.data.source_breakdown,
            allPunches: todayJson.data.effectiveRecord?.allPunches || [],
            timestamp: new Date(first_check_in_at).toLocaleString(),
            createdBy: user.fullName || 'Self',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: todayJson.data.primary_source === 'Merged (GPS + BioTime)'
              ? 'Counted from earliest BioTime/GPS check-in & latest check-out'
              : 'Attendance verified',
          };

          setMyAttendanceLogs((prev) => {
            const exists = prev.some((l) => l.date === todayDateStr);
            if (exists) {
              return prev.map((l) => (l.date === todayDateStr ? { ...l, ...todayItem } : l));
            }
            return [todayItem, ...prev];
          });
        }
      }

      // 3. Query monthly summary from server API for current month
      const summaryRes = await fetch(`/api/v1/attendance/me/summary?employeeId=${encodeURIComponent(empId)}&month=${currentMonth}`);
      const summaryJson = await summaryRes.json();
      if (summaryJson.success && summaryJson.data && summaryJson.data.presentDays > 0) {
        const d = summaryJson.data;
        const trendRecords: Array<{
          date: string;
          label: string;
          workedHours: number;
          isLate: boolean;
          status: string;
        }> = [];

        if (Array.isArray(d.dailyRecords) && d.dailyRecords.length > 0) {
          const sorted = [...d.dailyRecords].sort((a: any, b: any) =>
            (a.businessDate || '').localeCompare(b.businessDate || '')
          );
          sorted.forEach((r: any) => {
            const dayDate = new Date(r.businessDate);
            const label = !isNaN(dayDate.getTime())
              ? dayDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
              : (r.businessDate || '').substring(5);
            const hrs = r.workedSeconds ? Math.round((r.workedSeconds / 3600) * 10) / 10 : 0;
            trendRecords.push({
              date: r.businessDate,
              label,
              workedHours: hrs,
              isLate: Boolean(r.isLate || r.status === 'Late'),
              status: r.status,
            });
          });
        }

        const avg = d.presentDays > 0 && d.totalWorkedHours
          ? (parseFloat(d.totalWorkedHours) / d.presentDays).toFixed(1)
          : '0.0';

        setMonthlyMetrics({
          presentDays: d.presentDays,
          targetDays: d.targetDays || 22,
          lateDays: d.lateDays,
          autoCheckouts: d.autoCheckouts,
          onTimePerformancePct: d.onTimePerformancePct ?? 100,
          latePenaltyPct: d.latePenaltyPct ?? 0,
          autoCheckoutRatePct: d.autoCheckoutRatePct ?? 0,
          totalWorkedHours: d.totalWorkedHours || '0.0',
          avgHoursPerDay: avg,
          dailyTrend: trendRecords.length > 0 ? trendRecords : localStats.dailyTrend,
        });
      }
    } catch {
      // Fallback gracefully
    }
  };

  useEffect(() => {
    checkLiveGeofence();
    const logs = getEmployeeAttendanceLogs(user.employeeCode || user.id);
    setMyAttendanceLogs(logs);

    const handleAttUpdate = () => {
      refreshCanonicalAttendance(user.employeeCode || user.id);
    };
    window.addEventListener('jaago_attendance_updated', handleAttUpdate);
    return () => window.removeEventListener('jaago_attendance_updated', handleAttUpdate);
  }, [user.employeeCode, user.id]);

  const [dashboardToast, setDashboardToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setDashboardToast({ message, type });
    setTimeout(() => {
      setDashboardToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const [imgError, setImgError] = useState(false);
  const firstName = user.fullName ? user.fullName.split(' ').filter(Boolean)[0] || '' : '';

  // Canonical day status flags
  const hasCheckedInToday = Boolean(firstCheckInTimestamp || (checkInTime && checkInTime !== '--:--'));
  const hasCheckedOutToday = Boolean(!isCheckedIn && hasCheckedInToday && checkOutTime && checkOutTime !== '--:--');

  // Dedicated Check-In Action with Live GPS Geofence Verification & Multi-punch Counting
  const handleCheckInAction = async () => {
    if (isPunching) return;
    setIsPunching(true);

    try {
      const coords = await getCoordinates();

      // Send to server-authoritative API
      const checkInRes = await fetch('/api/v1/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.employeeCode || user.id || '71a38594-d803-4e6d-b6e9-79767a16c4c6',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          deviceInfo: 'Web Portal',
        }),
      });
      const checkInJson = await checkInRes.json();

      if (!checkInRes.ok || !checkInJson.success) {
        const errorMsg = checkInJson.error || 'Attendance check-in blocked.';
        const currentLocs = gpsLocations.length > 0 ? gpsLocations : getLocalGPSLocations();
        const localMatch = evaluateGpsMatch(coords.latitude, coords.longitude, currentLocs);

        const distanceMeters = checkInJson.distance_m ?? localMatch.distanceMeters;
        const allowedRadiusMeters = checkInJson.allowed_radius_m ?? localMatch.allowedRadiusMeters;
        const targetSite = checkInJson.nearest_site || localMatch.matchedLocation?.name || localMatch.closestLocation?.name || 'Designated Office';

        setGpsTracker({
          status: 'outside',
          locationName: targetSite,
          distanceMeters,
          allowedRadiusMeters,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          errorMsg,
        });

        setGeofenceAlert({
          isOpen: true,
          action: 'CHECK_IN',
          locationName: targetSite,
          distanceMeters,
          allowedRadiusMeters,
          latitude: coords.latitude,
          longitude: coords.longitude,
          errorMsg,
        });

        showToast(errorMsg, 'error');
        return;
      }

      // Server Accepted
      const now = new Date();
      const record = checkInJson.data;
      const matchedSite = checkInJson.message?.includes('at ')
        ? checkInJson.message.split('at ')[1]?.split(' (')[0] || 'Store'
        : 'Designated Office';

      const firstIn = record?.first_check_in_at || record?.check_in_at || now.toISOString();
      const inTs = new Date(firstIn).getTime();
      setFirstCheckInTimestamp(inTs);
      setIsCheckedIn(true);
      setCheckInTime(new Date(firstIn).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }));

      const currentServerNow = Date.now() + serverTimeOffset;
      const initialDiff = Math.max(0, Math.floor((currentServerNow - inTs) / 1000));
      setElapsedSeconds(initialDiff);

      setGpsTracker({
        status: 'inside',
        locationName: matchedSite,
        distanceMeters: 0,
        allowedRadiusMeters: 100,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        errorMsg: null,
      });

      const dhakaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
      const inTimeStr = new Date(firstIn).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });

      recordLocalAttendanceLog({
        employeeId: user.id || user.employeeCode,
        employeeCode: user.employeeCode || '',
        employeeName: user.fullName || 'Staff Member',
        designation: user.jobTitle,
        department: user.department,
        branch: matchedSite || 'Head Office (Banani)',
        date: dhakaDate,
        checkInTime: inTimeStr,
        status: checkInJson.data?.status === 'late' ? 'Late' : 'Present',
        device: 'Web Portal',
        notes: checkInJson.message || 'GPS Geofence Verified Check-in',
      });
      invalidateCache('pnc_attendance_logs');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jaago_attendance_updated'));
      }

      showToast(checkInJson.message || `Checked in successfully at ${matchedSite}!`, 'success');
      await refreshCanonicalAttendance(user.employeeCode || user.id);
    } catch {
      showToast('Check-in failed. Please ensure GPS/Location permission is granted.', 'error');
    } finally {
      setIsPunching(false);
    }
  };

  // Dedicated Check-Out Action with Live GPS Geofence Verification & Working Hours Pause
  const handleCheckOutAction = async () => {
    if (isPunching) return;
    setIsPunching(true);

    try {
      const coords = await getCoordinates();

      // Send to server-authoritative API
      const checkOutRes = await fetch('/api/v1/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.employeeCode || user.id || '71a38594-d803-4e6d-b6e9-79767a16c4c6',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          deviceInfo: 'Web Portal',
        }),
      });
      const checkOutJson = await checkOutRes.json();

      if (!checkOutRes.ok || !checkOutJson.success) {
        const errorMsg = checkOutJson.error || 'Attendance check-out blocked.';
        const currentLocs = gpsLocations.length > 0 ? gpsLocations : getLocalGPSLocations();
        const localMatch = evaluateGpsMatch(coords.latitude, coords.longitude, currentLocs);

        const distanceMeters = checkOutJson.distance_m ?? localMatch.distanceMeters;
        const allowedRadiusMeters = checkOutJson.allowed_radius_m ?? localMatch.allowedRadiusMeters;
        const targetSite = checkOutJson.nearest_site || localMatch.matchedLocation?.name || localMatch.closestLocation?.name || 'Designated Office';

        setGpsTracker({
          status: 'outside',
          locationName: targetSite,
          distanceMeters,
          allowedRadiusMeters,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          errorMsg,
        });

        setGeofenceAlert({
          isOpen: true,
          action: 'CHECK_OUT',
          locationName: targetSite,
          distanceMeters,
          allowedRadiusMeters,
          latitude: coords.latitude,
          longitude: coords.longitude,
          errorMsg,
        });

        showToast(errorMsg, 'error');
        return;
      }

      // Server Accepted
      const now = new Date();
      const record = checkOutJson.data;

      setIsCheckedIn(false);
      if (record?.first_check_in_at) {
        setFirstCheckInTimestamp(new Date(record.first_check_in_at).getTime());
      }
      if (record?.last_check_out_at) {
        setCheckOutTime(new Date(record.last_check_out_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }));
      } else {
        setCheckOutTime(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true }));
      }

      // Immediately freeze the worked seconds display so background polls can't reset it to 0
      if (record?.worked_seconds !== undefined && record.worked_seconds > 0) {
        setElapsedSeconds(record.worked_seconds);
        setFrozenWorkedSeconds(record.worked_seconds);
      } else if (checkOutJson.derived?.workedSeconds !== undefined && checkOutJson.derived.workedSeconds > 0) {
        setElapsedSeconds(checkOutJson.derived.workedSeconds);
        setFrozenWorkedSeconds(checkOutJson.derived.workedSeconds);
      }

      setGpsTracker({
        status: 'inside',
        locationName: 'Authorized Office',
        distanceMeters: 0,
        allowedRadiusMeters: 100,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        errorMsg: null,
      });

      const dhakaDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
      const outTimeStr = record?.last_check_out_at
        ? new Date(record.last_check_out_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true })
        : now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: true });

      recordLocalAttendanceLog({
        employeeId: user.id || user.employeeCode,
        employeeCode: user.employeeCode || '',
        employeeName: user.fullName || 'Staff Member',
        designation: user.jobTitle,
        department: user.department,
        branch: 'Head Office (Banani)',
        date: dhakaDate,
        checkInTime: checkInTime || '09:00 AM',
        checkOutTime: outTimeStr,
        status: 'Present',
        device: 'Web Portal',
        notes: 'GPS Geofence Verified Check-out',
      });
      invalidateCache('pnc_attendance_logs');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jaago_attendance_updated'));
      }

      showToast(checkOutJson.message || `Checked out successfully! Total working time: ${checkOutJson.derived?.workedDisplay || '0h 00m'}.`, 'success');
      await refreshCanonicalAttendance(user.employeeCode || user.id);
    } catch (err: any) {
      console.error('[CHECK-OUT] Client-side error:', err);
      showToast(err?.message || 'Check-out failed. Please try again.', 'error');
    } finally {
      setIsPunching(false);
    }
  };

  // Strictly Approved Leaves from People & Culture Time Off
  const todayStrForLeave = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const todayOnLeave = approvedLeaves.filter((r) => {
    const from = r.fromDate || '';
    const to = r.toDate || from;
    return from <= todayStrForLeave && todayStrForLeave <= to;
  });

  const upcomingApprovedLeaves = approvedLeaves
    .filter((r) => {
      const to = r.toDate || r.fromDate || '';
      return to >= todayStrForLeave;
    })
    .sort((a, b) => (a.fromDate || '').localeCompare(b.fromDate || ''));

  return (
    <div className="max-w-[1700px] mx-auto text-foreground pb-24 md:pb-28 select-none relative">
      {/* ── FLOATING DASHBOARD TOAST NOTIFICATION ── */}
      {dashboardToast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs font-bold transition transform animate-in slide-in-from-top-3 duration-200 ${
            dashboardToast.type === 'error'
              ? 'bg-rose-500 text-white shadow-rose-500/25'
              : dashboardToast.type === 'info'
              ? 'bg-blue-500 text-white shadow-blue-500/25'
              : 'bg-emerald-500 text-white shadow-emerald-500/25'
          }`}
        >
          {dashboardToast.type === 'error' ? (
            <X className="h-4 w-4 stroke-[3]" />
          ) : (
            <CheckCircle2 className="h-4 w-4 stroke-[3]" />
          )}
          <span>{dashboardToast.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📱 MOBILE VIEW ONLY (Strictly based on Reference Images 2 & 3)            */}
      {/* ========================================================================= */}
      <div
        className={`${
          viewMode === 'mobile' ? 'block max-w-md mx-auto' : viewMode === 'desktop' ? 'hidden' : 'block md:hidden'
        } space-y-4 pt-1`}
      >
        {/* User Greeting Header */}
        <div className="flex items-center space-x-3.5 px-1">
          <div className="relative flex-shrink-0">
            <div className="h-16 w-16 aspect-square rounded-[16px] border-2 border-amber-400/90 bg-card overflow-hidden flex items-center justify-center shadow-md relative p-0.5 group">
              {mounted && user.avatarUrl && !imgError ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover object-top rounded-[13px] transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="text-amber-400 font-serif font-black text-xl">
                  {user.fullName
                    ? user.fullName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'NK'}
                </span>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card shadow-sm animate-pulse" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl font-black tracking-tight text-foreground truncate min-h-[28px]">
              {firstName ? `Hi, ${firstName}!` : 'Hi!'}
            </h1>
            <p className="text-xs font-semibold text-muted-foreground truncate min-h-[16px]">
              {user.jobTitle && (user.department || user.organization)
                ? `${user.jobTitle} • ${user.department || user.organization}`
                : user.jobTitle || user.department || user.organization || ''}
            </p>
          </div>
        </div>

        <div className="h-px bg-border/60 my-2" />

        {/* ── CARD 1: LIVE STATUS TIMER ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 card-edge-amber shadow-md text-center space-y-2 relative overflow-hidden">
          {/* Header Lightning Bolt */}
          <div className="flex items-center justify-center space-x-1.5 text-xs font-black uppercase text-amber-500 tracking-wider">
            <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span>LIVE STATUS</span>
          </div>

          {/* Large Digital Working Hours Display (00:00:00 format) */}
          <div
            className="text-4xl sm:text-5xl font-black tracking-tight text-foreground font-mono py-1"
            aria-live="polite"
          >
            {formatTime(displaySeconds)}
          </div>

          {/* Subtitle */}
          <div className="text-xs font-medium text-muted-foreground">
            Working Hours Today
          </div>
          <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
            Schedule: {user.workingSchedule}
          </div>
        </div>

        {/* ── CARD 1.5: LIVE GPS GEOFENCE TRACKER (MOBILE - Only shown when outside geofence or error) ── */}
        {(gpsTracker.status === 'outside' || gpsTracker.status === 'error') && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center space-x-1.5 text-rose-500 font-bold">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                <span>Attendance Blocked</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 border border-rose-500/40 text-rose-500">
                ● OUT OF GEOFENCE
              </span>
            </div>
            <div className="text-xs font-black text-foreground pt-0.5">
              {gpsTracker.locationName ? `Office: ${gpsTracker.locationName}` : 'Outside Office Boundary'}
            </div>
            <div className="text-[11px] font-semibold text-rose-500">
              {gpsTracker.distanceMeters !== null
                ? `${gpsTracker.distanceMeters}m away (Max allowed: ${gpsTracker.allowedRadiusMeters}m)`
                : gpsTracker.errorMsg || 'Calculating distance to office...'}
            </div>
            {gpsTracker.latitude && (
              <div className="text-[10px] font-mono text-muted-foreground/70 pt-0.5">
                Lat: {gpsTracker.latitude.toFixed(5)} &bull; Lng: {gpsTracker.longitude?.toFixed(5)} (±{gpsTracker.accuracy}m)
              </div>
            )}
          </div>
        )}

        {/* ── CARD 2: SERVER-DRIVEN TWO-BUTTON CHECK-IN / CHECK-OUT STATE MACHINE (HYBRID) ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mobile Check-In Button */}
          <button
            onClick={isCheckedIn ? undefined : handleCheckInAction}
            disabled={isPunching || isCheckedIn}
            aria-disabled={isPunching || isCheckedIn}
            className={`py-3.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-200 ${
              isCheckedIn
                ? 'opacity-65 backdrop-blur-[2px] saturate-[0.85] cursor-default bg-emerald-500/15 border border-emerald-500/25 text-emerald-800/80 dark:text-emerald-300/80 select-none shadow-none'
                : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-md shadow-emerald-500/25 cursor-pointer active:scale-[0.98]'
            }`}
          >
            {hasCheckedInToday ? <CheckCircle2 className="h-4 w-4 stroke-[2.5]" /> : <Clock className="h-4 w-4 stroke-[2.5]" />}
            <span>{hasCheckedInToday ? `IN: ${checkInTime}` : 'CHECK IN'}</span>
          </button>

          {/* Mobile Check-Out Button */}
          <button
            onClick={isCheckedIn ? handleCheckOutAction : undefined}
            disabled={isPunching || !isCheckedIn}
            aria-disabled={isPunching || !isCheckedIn}
            className={`py-3.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-200 ${
              !hasCheckedInToday
                ? 'opacity-35 grayscale cursor-not-allowed bg-surface/50 border border-border text-muted-foreground'
                : !isCheckedIn && hasCheckedOutToday
                ? 'opacity-65 backdrop-blur-[2px] saturate-[0.85] cursor-default bg-rose-500/15 border border-rose-500/25 text-rose-800/80 dark:text-rose-300/80 select-none shadow-none'
                : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-md shadow-rose-500/25 cursor-pointer active:scale-[0.98]'
            }`}
          >
            {hasCheckedInToday && hasCheckedOutToday ? <CheckCircle2 className="h-4 w-4 stroke-[2.5]" /> : <Flag className="h-4 w-4 stroke-[2.5]" />}
            <span>{hasCheckedInToday && hasCheckedOutToday ? `OUT: ${checkOutTime}` : 'CHECK OUT'}</span>
          </button>
        </div>

        {/* Live Check-In Context Pill */}
        {isCheckedIn && (
          <div className="flex items-center justify-center space-x-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-xl animate-in fade-in">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Checked in at {checkInTime || '09:05 AM'}</span>
          </div>
        )}

        {/* ── CARD 3: MONTHLY ATTENDANCE SUMMARY ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 card-edge-teal shadow-md space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
              <Clock className="h-4 w-4" />
              <span>MONTHLY ATTENDANCE SUMMARY</span>
            </div>
            {monthlyMetrics.onTimePerformancePct >= 90 && monthlyMetrics.lateDays === 0 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
                EXCELLENT
              </span>
            ) : monthlyMetrics.onTimePerformancePct >= 75 ? (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">
                GOOD STANDING
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase text-rose-500 bg-rose-500/10 border border-rose-400/30">
                NEEDS IMPROVEMENT
              </span>
            )}
          </div>

          {/* 3-Column Top Stats */}
          <div className="grid grid-cols-3 gap-2 text-left">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Working Days</div>
              <div className="text-base font-black text-foreground pt-1">{monthlyMetrics.presentDays} / {monthlyMetrics.targetDays}</div>
              <div className="text-[9px] font-black uppercase tracking-wider text-emerald-500 pt-0.5">PRESENT / TARGET</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Late Days</div>
              <div className="text-base font-black text-rose-500 pt-1">{monthlyMetrics.lateDays}</div>
              <div className="text-[9px] font-black uppercase tracking-wider text-rose-500 pt-0.5">LATE ENTRIES</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Auto Check</div>
              <div className="text-base font-black text-amber-500 pt-1">{monthlyMetrics.autoCheckouts}</div>
              <div className="text-[9px] font-black uppercase tracking-wider text-amber-500 pt-0.5">AUTO CHECKOUTS</div>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Horizontal Progress Bars */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">On-Time Performance</span>
                <span className="text-emerald-500 font-black">{monthlyMetrics.onTimePerformancePct}%</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.onTimePerformancePct))}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">Late Penalty</span>
                <span className="text-rose-500 font-black">{monthlyMetrics.latePenaltyPct}%</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.latePenaltyPct))}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">Auto Check–out Rate</span>
                <span className="text-amber-500 font-black">{monthlyMetrics.autoCheckoutRatePct}%</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.autoCheckoutRatePct))}%` }} />
              </div>
            </div>
          </div>

          {/* Smooth Daily Trend Chart (Mobile) */}
          <div className="pt-2">
            {(() => {
              const trend = monthlyMetrics.dailyTrend || [];
              const width = 300;
              const height = 70;
              const padX = 20;
              const availW = width - 2 * padX;
              const maxHours = Math.max(8, ...trend.map((t) => t.workedHours || 8));
              const minY = 16;
              const maxY = height - 18;

              const pts = trend.length > 0
                ? trend.map((d, i) => {
                    const x = trend.length === 1 ? width / 2 : padX + (i / (trend.length - 1)) * availW;
                    const norm = Math.min(1, Math.max(0, (d.workedHours || 0) / maxHours));
                    const y = maxY - norm * (maxY - minY);
                    return { x, y, isLate: d.isLate, label: d.label, date: d.date };
                  })
                : [
                    { x: padX, y: maxY, isLate: false, label: '01 Sep', date: 'd1' },
                    { x: width - padX, y: maxY, isLate: false, label: '06 Sep', date: 'd2' },
                  ];

              let linePath = `M ${pts[0]!.x} ${pts[0]!.y}`;
              for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[i]!;
                const p1 = pts[i + 1]!;
                const cpx1 = (p0.x + p1.x) / 2;
                const cpy1 = p0.y;
                const cpx2 = (p0.x + p1.x) / 2;
                const cpy2 = p1.y;
                linePath += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
              }
              const areaPath = `${linePath} L ${pts[pts.length - 1]!.x} ${height} L ${pts[0]!.x} ${height} Z`;

              return (
                <div className="space-y-1.5">
                  <div className="h-20 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                      <defs>
                        <linearGradient id="mobileTrendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <path d={areaPath} fill="url(#mobileTrendGrad)" />
                      <path d={linePath} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />

                      {pts.map((p, idx) => (
                        <circle
                          key={`mob-trend-pt-${p.date || 'd'}-${idx}`}
                          cx={p.x}
                          cy={p.y}
                          r="3"
                          fill={p.isLate ? '#EF4444' : '#10B981'}
                          stroke="var(--card)"
                          strokeWidth="1"
                        />
                      ))}
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-1 px-1">
                    {pts.map((p, idx) => (
                      <span key={`mob-trend-lbl-${p.date || 'd'}-${idx}`}>{p.label}</span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="h-px bg-border/60" />

          {/* Summary Row */}
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Avg Hours/Day</div>
              <div className="text-base font-black text-blue-500 dark:text-blue-400 pt-0.5">{monthlyMetrics.avgHoursPerDay}h</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Total Hours</div>
              <div className="text-base font-black text-amber-500 pt-0.5">{monthlyMetrics.totalWorkedHours}h</div>
            </div>
          </div>
        </div>

        {/* ── CARD 4: MY ATTENDANCE DETAILS & LOGS (MOBILE) ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-black uppercase text-amber-500 tracking-wider">
              <Clock className="h-4 w-4" />
              <span>MY ATTENDANCE LOGS</span>
            </div>
            <Link href="/pnc/attendance/report" className="text-[11px] font-bold text-primary flex items-center space-x-1 hover:underline">
              <span>View Report</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {myAttendanceLogs.length > 0 ? (
              myAttendanceLogs.slice(0, 4).map((log, idx) => {
                const isToday = log.date === new Date().toISOString().slice(0, 10);
                const duration = calculateWorkingHoursString(log.checkInTime, log.checkOutTime);
                return (
                  <div key={`mob-log-${log.id || log.date}-${idx}`} className={`p-3.5 rounded-2xl border space-y-1.5 ${isToday ? 'bg-primary/5 border-primary/30' : 'bg-surface/50 border-border/70'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-foreground flex items-center space-x-1.5">
                        <span>{formatDisplayDate(log.date)}</span>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-500">
                            Today
                          </span>
                        )}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          log.status === 'Present'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Check In</span>
                        <span className="text-emerald-500 font-bold">{log.checkInTime || '--:--'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Check Out</span>
                        <span className="text-rose-500 font-bold">{log.checkOutTime || '--:--'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Worked</span>
                        <span className="text-foreground font-bold">{duration}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No logs recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* ── CARD 5: ON LEAVE TODAY (MOBILE) ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 card-edge-indigo shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
              <UserCheck className="h-4 w-4" />
              <span>ON LEAVE TODAY</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                todayOnLeave.length > 0
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
              }`}
            >
              {todayOnLeave.length > 0 ? `${todayOnLeave.length} Active` : '0 Today'}
            </span>
          </div>

          <div className="space-y-2">
            {todayOnLeave.length > 0 ? (
              todayOnLeave.map((item, idx) => (
                <div
                  key={`mob-onleave-${item.id || item.employeeCode}-${idx}`}
                  className="p-3 rounded-2xl bg-surface/70 border border-border/70 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0 shadow-xs font-bold text-xs text-primary">
                      {item.employeeName
                        ? item.employeeName
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()
                        : 'OL'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{item.employeeName}</div>
                      <div className="text-[10px] text-muted-foreground font-medium flex items-center space-x-1.5 truncate">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{item.leaveType}</span>
                        <span>&bull;</span>
                        <span>{item.halfDayType && item.halfDayType !== 'Full Day' ? item.halfDayType : 'Full Day'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <span className="text-[9.5px] font-bold text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-md">
                      {item.totalDays}d
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                </div>
              ))
            ) : upcomingApprovedLeaves.length > 0 ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-surface/50 border border-border/50 text-center">
                  <div className="text-xs font-bold text-foreground">Nobody on leave today</div>
                  <div className="text-[10px] text-muted-foreground pt-0.5">All team members are active</div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground pt-0.5">
                  Upcoming Approved
                </div>
                {upcomingApprovedLeaves.slice(0, 2).map((item, idx) => (
                  <div
                    key={`mob-up-onleave-${item.id || item.employeeCode}-${idx}`}
                    className="p-3 rounded-2xl bg-surface/70 border border-border/70 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0 shadow-xs font-bold text-xs text-primary">
                        {item.employeeName
                          ? item.employeeName
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((n: string) => n[0])
                              .join('')
                              .toUpperCase()
                          : 'OL'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground truncate">{item.employeeName}</div>
                        <div className="text-[10px] text-muted-foreground font-medium flex items-center space-x-1.5 truncate">
                          <span className="text-amber-600 dark:text-amber-400 font-bold">{item.leaveType}</span>
                          <span>&bull;</span>
                          <span>{formatDisplayDate(item.fromDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className="text-[9.5px] font-bold text-muted-foreground bg-card border border-border px-1.5 py-0.5 rounded-md">
                        {item.totalDays}d
                      </span>
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No staff members currently on leave.
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end border-t border-border/50 text-xs">
            <Link
              href="/organization/on-leave"
              className="font-semibold text-muted-foreground hover:text-foreground"
            >
              Calendar &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 💻 DESKTOP, LAPTOP & TABLET VIEW ONLY (Pixel-Faithful to Provided Design)  */}
      {/* ========================================================================= */}
      <div
        className={`${
          viewMode === 'desktop' ? 'block' : viewMode === 'mobile' ? 'hidden' : 'hidden md:block'
        } space-y-4`}
      >
        {/* ── 1. USER PROFILE HERO CARD (Dark Blue Banner - iOS 3D View Compact Card) ── */}
        <div className="ios-3d-card dashboard-hero-card p-3 px-4 sm:p-3.5 sm:px-5 rounded-[18px] sm:rounded-[20px] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden">
          <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0">
            {/* Avatar inside Yellow Border Card with Green Online Dot (Auto-adjusting whole-block system) */}
            <div className="relative flex-shrink-0">
              <div className="h-16 w-16 sm:h-18 sm:w-18 md:h-20 md:w-20 aspect-square rounded-[16px] sm:rounded-[18px] border-2 border-amber-400/90 bg-card overflow-hidden flex items-center justify-center shadow-md relative p-0.5 group">
                {mounted && user.avatarUrl && !imgError ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover object-top rounded-[13px] sm:rounded-[15px] transition-transform duration-300 group-hover:scale-105 select-none"
                  />
                ) : (
                  <div className="h-full w-full rounded-[13px] sm:rounded-[15px] bg-gradient-to-br from-amber-400/20 via-amber-400/30 to-amber-600/20 flex items-center justify-center text-amber-400 font-serif font-black text-xl sm:text-2xl select-none">
                    {user.fullName
                      ? user.fullName
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n: string) => n[0])
                          .join('')
                          .toUpperCase()
                      : 'NK'}
                  </div>
                )}
              </div>
              {/* Online Green Indicator Dot */}
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-emerald-500 border-2 border-card shadow-sm ring-2 ring-emerald-500/20 animate-pulse" />
            </div>

            {/* User Credentials & Metadata */}
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black font-serif tracking-tight text-white leading-tight">
                {user.fullName || ''}
              </h1>
              <div className="text-xs sm:text-[13px] font-medium text-slate-300 leading-snug">
                {user.jobTitle || ''}
              </div>
              {user.organization ? (
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 pt-0.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{user.organization}</span>
                </div>
              ) : null}
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-0.5">
                <span className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  <span>{user.department || "Founder's Office JFT"}</span>
                </span>
                {user.manager ? (
                  <>
                    <span>&bull;</span>
                    <span className="flex items-center space-x-1">
                      <Briefcase className="h-3 w-3 text-slate-500" />
                      <span>Supervisor: {user.manager}</span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Section: Attendance Action & GPS Live Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
            {/* Live GPS Active Beacon */}
            <div
              title="GPS Live: In Geofence"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xs flex-shrink-0"
            >
              <Radio className="h-4 w-4 animate-pulse text-emerald-400" />
            </div>

            {/* Attendance Check In / Out Buttons Container */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {/* Check In Box */}
              <button
                onClick={isCheckedIn ? undefined : handleCheckInAction}
                disabled={isPunching || isCheckedIn}
                aria-disabled={isPunching || isCheckedIn}
                title={isCheckedIn ? `Checked in at ${checkInTime}. Working hours are running.` : hasCheckedInToday ? `First Check-in recorded at ${checkInTime}. Click to re-check in.` : 'Click to check in'}
                className={`hero-checkin-btn px-3.5 py-2 rounded-xl border transition-all duration-200 text-left flex items-center space-x-2 shadow-xs ${
                  isCheckedIn
                    ? 'hero-checkin-recorded bg-amber-400/15 border-amber-400/25 text-amber-300 cursor-default opacity-85 backdrop-blur-[2px] select-none shadow-none'
                    : 'bg-[#DAF6EA] hover:bg-[#C8F1E1] border-emerald-400/50 text-emerald-950 dark:bg-[#103828] dark:hover:bg-[#144833] dark:border-emerald-500/35 dark:text-emerald-300 cursor-pointer shadow-sm active:scale-[0.98]'
                }`}
              >
                <div className={`hero-btn-icon-box h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isCheckedIn ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-600/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400'
                }`}>
                  {hasCheckedInToday ? (
                    <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <div className={`hero-btn-title text-[9px] font-black uppercase tracking-wider flex items-center space-x-1 ${
                    isCheckedIn ? 'text-amber-300' : 'text-emerald-800 dark:text-emerald-400'
                  }`}>
                    <span>CHECK IN</span>
                    {hasCheckedInToday && <span className="text-[7.5px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-200 font-bold">&bull; RECORDED</span>}
                  </div>
                  <div className={`hero-btn-time text-xs font-black font-mono leading-none pt-0.5 ${
                    isCheckedIn ? 'text-amber-200' : 'text-emerald-950 dark:text-emerald-300'
                  }`}>
                    {checkInTime || '-- : -- : --'}
                  </div>
                </div>
              </button>

              {/* Check Out Box */}
              <button
                onClick={isCheckedIn ? handleCheckOutAction : undefined}
                disabled={isPunching || !isCheckedIn}
                aria-disabled={isPunching || !isCheckedIn}
                title={
                  isCheckedIn
                    ? 'Click to check out'
                    : hasCheckedOutToday
                    ? `Checked out at ${checkOutTime}`
                    : 'Cannot check out before checking in'
                }
                className={`px-3.5 py-2 rounded-xl border transition-all duration-200 text-left flex items-center space-x-2 shadow-xs ${
                  !hasCheckedInToday
                    ? 'hero-checkout-waiting'
                    : !isCheckedIn && hasCheckedOutToday
                    ? 'hero-checkout-recorded'
                    : 'hero-checkout-active active:scale-[0.98]'
                }`}
              >
                <div className="hero-btn-icon-box h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0">
                  {hasCheckedOutToday ? (
                    <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                  ) : (
                    <Flag className="h-3.5 w-3.5 stroke-[2.2]" />
                  )}
                </div>
                <div>
                  <div className="hero-btn-title text-[9px] font-black uppercase tracking-wider flex items-center space-x-1">
                    <span>CHECK OUT</span>
                    {hasCheckedOutToday && <span className="text-[7.5px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-200 font-bold">&bull; RECORDED</span>}
                  </div>
                  <div className="hero-btn-time text-xs font-black font-mono leading-none pt-0.5">
                    {hasCheckedInToday && hasCheckedOutToday ? (checkOutTime || '-- : -- : --') : '-- : -- : --'}
                  </div>
                </div>
              </button>
            </div>

            {/* Live GPS Tracker Status Line (Only shown when outside geofence or error occurs) */}
            {gpsTracker.status === 'outside' || gpsTracker.status === 'error' ? (
              <div className="flex flex-col items-end space-y-1 pt-0.5">
                {gpsTracker.status === 'outside' ? (
                  <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-xl text-xs font-bold shadow-xs">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>
                      🚫 Outside Geofence &bull; {gpsTracker.distanceMeters ?? 0}m from {gpsTracker.locationName || 'Office'}
                    </span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 bg-rose-500/20 text-rose-600 dark:text-rose-300 font-extrabold rounded-md">
                      Blocked (Max {gpsTracker.allowedRadiusMeters}m)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 px-3 py-1 rounded-xl text-xs font-semibold">
                    <span>⚠️ {gpsTracker.errorMsg}</span>
                    <button
                      onClick={checkLiveGeofence}
                      className="underline hover:text-rose-600 font-bold ml-1 cursor-pointer"
                    >
                      Retry GPS
                    </button>
                  </div>
                )}

                {gpsTracker.latitude && (
                  <div className="text-[10px] font-mono text-muted-foreground/70 flex items-center space-x-2">
                    <span>
                      Lat: {gpsTracker.latitude.toFixed(5)}, Lng: {gpsTracker.longitude?.toFixed(5)} (±{gpsTracker.accuracy}m)
                    </span>
                    <button
                      onClick={checkLiveGeofence}
                      className="hover:text-primary underline cursor-pointer font-bold"
                      title="Refresh GPS Coordinates"
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* ── 2. ROW OF 4 METRIC KPI CARDS (iOS 3D View Compact Cards with Distinct Left-Edge Colors) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Working Hours Today (Amber Edge) */}
          <div className="ios-3d-card card-edge-amber p-4 sm:p-4.5 rounded-[20px] space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 flex-shrink-0">
                <Clock className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs">
                Target: 8.0h
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
                  Working hours today
                </span>
                {isCheckedIn && (
                  <span className="inline-flex items-center space-x-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live</span>
                  </span>
                )}
              </div>
              <div
                className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground pt-1"
                aria-live="polite"
              >
                {formatTime(displaySeconds)}
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground pt-2 border-t border-dashed border-border/70">
              Schedule — {user.workingSchedule}
            </div>
          </div>

          {/* Card 2: On Duty Status (Emerald Edge) */}
          <Link
            href="/on-duty"
            className="ios-3d-card ios-3d-card-interactive card-edge-emerald p-4 sm:p-4.5 rounded-[20px] space-y-2 flex flex-col justify-between hover:border-emerald-500/50 group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 group-hover:scale-105 transition flex-shrink-0">
                <Timer className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition shadow-xs ${
                  onDutyPendingCount > 0
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {onDutyPendingCount > 0 ? 'Pending Review' : 'Up to date'}
              </span>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground group-hover:text-foreground transition">
                On-duty status
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground pt-1 font-mono">
                {onDutyPendingCount} <span className="text-base font-bold text-muted-foreground font-sans">Pending</span>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground pt-2 border-t border-dashed border-border/70 flex items-center justify-between">
              <span className="truncate">
                {onDutyPendingCount > 0
                  ? 'Awaiting supervisor verification'
                  : 'No requests awaiting verification'}
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-1 transition flex-shrink-0 ml-1" />
            </div>
          </Link>

          {/* Card 3: Available Time Off (Blue Edge) */}
          <Link
            href="/leaves"
            className="ios-3d-card ios-3d-card-interactive card-edge-blue p-4 sm:p-4.5 rounded-[20px] space-y-2 flex flex-col justify-between hover:border-blue-500/50 group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 group-hover:scale-105 transition flex-shrink-0">
                <Calendar className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition shadow-xs ${
                  leaveBalance.totalAvailable > 0
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}
              >
                {leaveBalance.totalAvailable > 0 ? 'In balance' : 'Exhausted'}
              </span>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground group-hover:text-foreground transition">
                Available Time Off
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground pt-1 flex items-baseline space-x-1">
                <span className="font-mono">{leaveBalance.totalAvailable}</span>
                <span className="text-sm font-bold text-muted-foreground font-sans">Days</span>
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground pt-2 border-t border-dashed border-border/70 flex items-center justify-between">
              <span className="truncate">Your Leave Balance</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-1 transition flex-shrink-0 ml-1" />
            </div>
          </Link>

          {/* Card 4: Active Approvals (Rose Edge) */}
          <Link
            href="/workflows"
            className="ios-3d-card ios-3d-card-interactive card-edge-rose p-4 sm:p-4.5 rounded-[20px] space-y-2 flex flex-col justify-between hover:border-rose-500/50 group"
          >
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/25 group-hover:scale-105 transition flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-xs">
                Action required
              </span>
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
                Active Approvals
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-rose-500 dark:text-rose-400 pt-1 font-mono">
                {pendingApprovalsCount}
              </div>
            </div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground pt-2 border-t border-dashed border-border/70 flex items-center justify-between">
              <span>Leave &amp; Workflow Requests</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>

        {/* ── 3. LOWER 4-COLUMN SECTION (iOS 3D View Compact Cards) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-3.5 items-stretch">
          {/* ── COLUMN 1: ATTENDANCE SUMMARY (Teal Edge) ── */}
          <div className="ios-3d-card card-edge-teal p-3 sm:p-3.5 rounded-[18px] space-y-2 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <div className="flex items-center space-x-1.5 min-w-0">
                <div className="h-6 w-6 rounded-lg bg-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs shadow-teal-500/25">
                  <BarChart2 className="h-3 w-3 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-foreground whitespace-nowrap">
                  Attendance Summary
                </span>
              </div>
              {monthlyMetrics.onTimePerformancePct >= 90 && monthlyMetrics.lateDays === 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 shadow-xs flex-shrink-0">
                  EXCELLENT
                </span>
              ) : monthlyMetrics.onTimePerformancePct >= 75 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 shadow-xs flex-shrink-0">
                  GOOD
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase text-rose-500 bg-rose-500/10 border border-rose-400/30 shadow-xs flex-shrink-0">
                  REVIEW
                </span>
              )}
            </div>

            {/* 3-Column Top Stats */}
            <div className="grid grid-cols-3 gap-1.5 text-left py-0.5">
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground truncate">Working Days</div>
                <div className="text-sm sm:text-base font-black text-foreground leading-tight">
                  {monthlyMetrics.presentDays} / {monthlyMetrics.targetDays}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground truncate">Late Days</div>
                <div className="text-sm sm:text-base font-black text-rose-500 leading-tight">{monthlyMetrics.lateDays}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground truncate">Auto Check</div>
                <div className="text-sm sm:text-base font-black text-amber-500 leading-tight">{monthlyMetrics.autoCheckouts}</div>
              </div>
            </div>

            <div className="h-px bg-border/40" />

            {/* Horizontal Progress Bars */}
            <div className="space-y-1.5">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-foreground">On-Time</span>
                  <span className="text-emerald-500 font-black">{monthlyMetrics.onTimePerformancePct}%</span>
                </div>
                <div className="h-1 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.onTimePerformancePct))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-foreground">Late Penalty</span>
                  <span className="text-rose-500 font-black">{monthlyMetrics.latePenaltyPct}%</span>
                </div>
                <div className="h-1 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.latePenaltyPct))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-foreground">Auto Check–out</span>
                  <span className="text-amber-500 font-black">{monthlyMetrics.autoCheckoutRatePct}%</span>
                </div>
                <div className="h-1 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.autoCheckoutRatePct))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Smooth Daily Trend Line Sparkline */}
            <div>
              {(() => {
                const trend = monthlyMetrics.dailyTrend || [];
                const width = 360;
                const height = 38;
                const padX = 16;
                const availW = width - 2 * padX;
                const maxHours = Math.max(8, ...trend.map((t) => t.workedHours || 8));
                const minY = 6;
                const maxY = height - 8;

                const pts = trend.length > 0
                  ? trend.map((d, i) => {
                      const x = trend.length === 1 ? width / 2 : padX + (i / (trend.length - 1)) * availW;
                      const norm = Math.min(1, Math.max(0, (d.workedHours || 0) / maxHours));
                      const y = maxY - norm * (maxY - minY);
                      return { x, y, isLate: d.isLate, label: d.label, date: d.date };
                    })
                  : [
                      { x: padX, y: maxY, isLate: false, label: '01 Sep', date: 'd1' },
                      { x: width - padX, y: maxY, isLate: false, label: '06 Sep', date: 'd2' },
                    ];

                let linePath = `M ${pts[0]!.x} ${pts[0]!.y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const p0 = pts[i]!;
                  const p1 = pts[i + 1]!;
                  const cpx1 = (p0.x + p1.x) / 2;
                  const cpy1 = p0.y;
                  const cpx2 = (p0.x + p1.x) / 2;
                  const cpy2 = p1.y;
                  linePath += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
                }
                const areaPath = `${linePath} L ${pts[pts.length - 1]!.x} ${height} L ${pts[0]!.x} ${height} Z`;

                return (
                  <div className="space-y-0.5">
                    <div className="h-9 w-full relative">
                      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
                        <defs>
                          <linearGradient id="desktopTrendGradCompact" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#desktopTrendGradCompact)" />
                        <path d={linePath} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
                        {pts.map((p, idx) => (
                          <circle
                            key={`desk-trend-pt-${p.date || 'd'}-${idx}`}
                            cx={p.x}
                            cy={p.y}
                            r="2.5"
                            fill={p.isLate ? '#EF4444' : '#10B981'}
                            stroke="var(--card)"
                            strokeWidth="1.2"
                          />
                        ))}
                      </svg>
                    </div>

                    {/* X-Axis Dates */}
                    <div className="flex items-center justify-between text-[8px] font-semibold text-muted-foreground px-0.5">
                      {pts.map((p, idx) => (
                        <span key={`desk-trend-lbl-${p.date || 'd'}-${idx}`}>{p.label}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="h-px bg-border/40" />

            {/* Bottom Row Summary */}
            <div className="flex items-center justify-between text-[10.5px] font-bold">
              <div className="text-foreground">
                Avg: <span className="text-blue-500 font-mono font-black">{monthlyMetrics.avgHoursPerDay}h</span>
              </div>
              <div className="text-foreground">
                Total: <span className="text-amber-500 font-mono font-black">{monthlyMetrics.totalWorkedHours}h</span>
              </div>
            </div>
          </div>

          {/* ── COLUMN 2: UPCOMING HOLIDAYS (Sky Edge) ── */}
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0]!;
            const now = new Date(todayStr).getTime();

            // Filter for current user's department & project (or company-wide)
            const applicableHolidays = publicHolidays.filter((h) => {
              const deptMatch =
                !h.department ||
                h.department === 'All' ||
                (user.department && h.department.toLowerCase().trim() === user.department.toLowerCase().trim());
              const projMatch =
                !h.project ||
                h.project === 'All' ||
                (user.project && h.project.toLowerCase().trim() === user.project.toLowerCase().trim());
              return deptMatch && projMatch;
            });

            // Sort upcoming holidays
            const upcomingList = applicableHolidays
              .filter((h) => (h.endDate || h.date) >= todayStr || h.date >= todayStr)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 3);

            return (
              <div className="ios-3d-card card-edge-sky p-3 sm:p-3.5 rounded-[18px] flex flex-col justify-between space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <div className="h-6 w-6 rounded-lg bg-sky-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs shadow-sky-500/25">
                      <Calendar className="h-3 w-3 stroke-[2.5]" />
                    </div>
                    <span className="text-xs font-bold text-foreground whitespace-nowrap">
                      Upcoming Holidays
                    </span>
                  </div>
                </div>

                {/* Holiday Items */}
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[145px] no-scrollbar">
                  {upcomingList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-4 space-y-1.5">
                      <div className="h-7 w-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted-foreground shadow-xs">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        No upcoming holidays found
                      </p>
                    </div>
                  ) : (
                    upcomingList.map((h, idx) => {
                      const dateObj = new Date(h.date);
                      const monthName = isNaN(dateObj.getTime())
                        ? 'HOL'
                        : dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                      const dayNum = isNaN(dateObj.getTime()) ? '1' : dateObj.getDate();
                      const hTime = new Date(h.date).getTime();
                      const daysDiff = Math.ceil((hTime - now) / (1000 * 3600 * 24));
                      const isThisWeek = daysDiff >= 0 && daysDiff <= 7;
                      const isThisMonth = daysDiff > 7 && daysDiff <= 30;
                      const dotColor = isThisWeek
                        ? 'bg-emerald-500'
                        : isThisMonth
                        ? 'bg-amber-500'
                        : 'bg-blue-500';

                      return (
                        <div
                          key={`holiday-${h.id || h.date}-${idx}`}
                          className="p-1.5 px-2 rounded-lg bg-surface/70 border border-border/70 hover:border-border transition flex items-center justify-between gap-2 group shadow-xs"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="h-7 w-7 rounded-md bg-card border border-border flex flex-col items-center justify-center flex-shrink-0 shadow-xs">
                              <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter leading-none">
                                {monthName}
                              </span>
                              <span className="text-[11px] font-black text-foreground leading-tight">
                                {dayNum}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-foreground truncate group-hover:text-amber-500 transition">
                                {h.title}
                              </div>
                              <div className="text-[9px] text-muted-foreground font-medium flex items-center space-x-1 truncate">
                                <span>{h.type}</span>
                                {h.department && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-amber-500 font-bold">{h.department}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <span className="text-[9px] font-bold text-muted-foreground bg-card border border-border px-1 py-0.5 rounded">
                              {h.totalDays}d
                            </span>
                            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Legend */}
                <div className="flex items-center justify-start space-x-3 text-[9px] font-semibold text-muted-foreground pt-1 border-t border-border/40">
                  <div className="flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>This Week</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>This Month</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>Later</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── COLUMN 3: ON LEAVE TODAY (Indigo Edge) ── */}
          <div className="ios-3d-card card-edge-indigo p-3 sm:p-3.5 rounded-[18px] flex flex-col justify-between space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <div className="flex items-center space-x-1.5 min-w-0">
                <div className="h-6 w-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs shadow-indigo-500/25">
                  <UserCheck className="h-3 w-3 stroke-[2.5]" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground truncate whitespace-nowrap">
                  On Leave
                </span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase flex-shrink-0 ${
                  todayOnLeave.length > 0
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                }`}
              >
                {todayOnLeave.length > 0 ? `${todayOnLeave.length} Today` : '0 Today'}
              </span>
            </div>

            {/* List / Content */}
            <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[145px] no-scrollbar">
              {todayOnLeave.length > 0 ? (
                todayOnLeave.map((item, idx) => (
                  <div
                    key={`today-onleave-${item.id || item.employeeCode}-${idx}`}
                    className="p-1.5 px-2 rounded-lg bg-surface/70 border border-border/70 hover:border-border transition flex items-center justify-between gap-2 group shadow-xs"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0 shadow-xs font-bold text-[10px] text-primary">
                        {item.employeeName
                          ? item.employeeName
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((n: string) => n[0])
                              .join('')
                              .toUpperCase()
                          : 'OL'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-foreground truncate group-hover:text-amber-500 transition">
                          {item.employeeName}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-medium flex items-center space-x-1 truncate">
                          <span className="text-amber-600 dark:text-amber-400 font-bold">{item.leaveType}</span>
                          <span>&bull;</span>
                          <span>{item.halfDayType && item.halfDayType !== 'Full Day' ? item.halfDayType : 'Full Day'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <span className="text-[9px] font-bold text-muted-foreground bg-card border border-border px-1 py-0.5 rounded">
                        {item.totalDays}d
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                ))
              ) : upcomingApprovedLeaves.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="p-2 rounded-lg bg-surface/60 border border-border/60 text-center">
                    <div className="text-[11px] font-bold text-foreground">Nobody on leave today</div>
                    <div className="text-[9px] text-muted-foreground">All team members are active today</div>
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                    Upcoming Approved
                  </div>
                  {upcomingApprovedLeaves.slice(0, 2).map((item, idx) => (
                    <div
                      key={`upcoming-onleave-${item.id || item.employeeCode}-${idx}`}
                      className="p-1.5 px-2 rounded-lg bg-surface/70 border border-border/70 hover:border-border transition flex items-center justify-between gap-2 group shadow-xs"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center flex-shrink-0 shadow-xs font-bold text-[10px] text-primary">
                          {item.employeeName
                            ? item.employeeName
                                .split(' ')
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((n: string) => n[0])
                                .join('')
                                .toUpperCase()
                            : 'OL'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-foreground truncate group-hover:text-amber-500 transition">
                            {item.employeeName}
                          </div>
                          <div className="text-[9px] text-muted-foreground font-medium flex items-center space-x-1 truncate">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">{item.leaveType}</span>
                            <span>&bull;</span>
                            <span>{formatDisplayDate(item.fromDate)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <span className="text-[9px] font-bold text-muted-foreground bg-card border border-border px-1 py-0.5 rounded">
                          {item.totalDays}d
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-4 space-y-1.5">
                  <div className="h-7 w-7 rounded-lg bg-surface border border-border flex items-center justify-center text-muted-foreground shadow-xs">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    No staff members on leave
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Links */}
            <div className="pt-1 flex items-center justify-end border-t border-border/40 text-[10px]">
              <Link
                href="/organization/on-leave"
                className="font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Calendar &rarr;
              </Link>
            </div>
          </div>

          {/* ── COLUMN 4: HR ANNOUNCEMENTS (Purple Edge) ── */}
          <div className="ios-3d-card card-edge-purple p-3 sm:p-3.5 rounded-[18px] flex flex-col justify-between space-y-2">
            {/* Header */}
            <div className="flex items-center space-x-1.5 min-w-0">
              <div className="h-6 w-6 rounded-lg bg-purple-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs shadow-purple-500/25">
                <Zap className="h-3 w-3 fill-white stroke-none" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-foreground truncate whitespace-nowrap">
                HR Announcements
              </span>
            </div>

            {/* Empty State / All Caught Up */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4 sm:py-5 space-y-1.5">
              <div className="h-8 w-8 rounded-lg bg-surface border border-border flex items-center justify-center text-muted-foreground shadow-xs">
                <Inbox className="h-4 w-4 stroke-[1.5]" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">All Caught Up!</div>
                <div className="text-[10px] text-muted-foreground pt-0.5">
                  No active announcements for your department.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. DEDICATED PERSONAL ATTENDANCE & ACTIVITY LOG SECTION (Active My Attendance View) ── */}
        <div className="ios-3d-card p-4 sm:p-5 rounded-[22px] space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                <Clock className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground tracking-tight flex items-center space-x-2">
                  <span>My Attendance &amp; Activity Timeline</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    Live Verified
                  </span>
                </h2>
                <p className="text-xs font-semibold text-muted-foreground">
                  Real-time check-in / check-out records, calculated working hours, and shift compliance for {user.fullName}
                </p>
              </div>
            </div>
          </div>

          {/* Top 4 Quick Summary Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Box 1 */}
            <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/70 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                <span>Today's Check In</span>
              </div>
              <div className="text-base font-black font-mono text-emerald-500">
                {checkInTime || '--:--'}
              </div>
              <div className="text-[10px] text-muted-foreground">Web Portal GPS</div>
            </div>

            {/* Box 2 */}
            <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/70 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center space-x-1">
                <Flag className="h-3.5 w-3.5 text-rose-500" />
                <span>Today's Check Out</span>
              </div>
              <div className="text-base font-black font-mono text-rose-500">
                {checkOutTime && checkOutTime !== '--:--' ? checkOutTime : (isCheckedIn ? '--:-- (Active)' : '--:--')}
              </div>
              <div className="text-[10px] text-muted-foreground">Web Portal GPS</div>
            </div>

            {/* Box 3 */}
            <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/70 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center space-x-1">
                <Timer className="h-3.5 w-3.5 text-amber-500" />
                <span>Worked Hours Today</span>
              </div>
              <div className="text-base font-black font-mono text-foreground">
                {formatTime(displaySeconds)}
              </div>
              <div className="text-[10px] text-muted-foreground">Schedule: 8h target</div>
            </div>

            {/* Box 4 */}
            <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/70 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                <span>Office Verification</span>
              </div>
              <div className="text-xs font-black text-foreground truncate">
                {gpsTracker.locationName || 'Head Office (Banani)'}
              </div>
              <div className="text-[10px] font-bold text-emerald-500">
                ● Geofence Verified
              </div>
            </div>
          </div>

          {/* Recent Personal Logs Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">
                Recent Attendance Logs ({myAttendanceLogs.length} Records)
              </span>
              <span className="text-muted-foreground text-[11px]">
                Official Shift: <strong className="text-foreground">{user.workingSchedule}</strong>
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 overflow-hidden bg-surface/30">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/80 border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-3">Check In</th>
                      <th className="py-3 px-3">Check Out</th>
                      <th className="py-3 px-3">Working Hours</th>
                      <th className="py-3 px-3">Device / Method</th>
                      <th className="py-3 px-3">Office Location</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium">
                    {myAttendanceLogs.length > 0 ? (
                      myAttendanceLogs.slice(0, 6).map((log, idx) => {
                        const todayStr = new Date().toISOString().slice(0, 10);
                        const isToday = log.date === todayStr;
                        const duration = isToday && isCheckedIn
                          ? formatTime(displaySeconds)
                          : calculateWorkingHoursString(log.checkInTime, log.checkOutTime);
                        const checkOutDisplay = isToday && isCheckedIn && (!log.checkOutTime || log.checkOutTime === '--:--')
                          ? '--:-- (Active)'
                          : (log.checkOutTime || '--:--');

                        return (
                          <tr key={`table-log-${log.id || log.date}-${idx}`} className={`hover:bg-surface/60 transition ${isToday ? 'bg-primary/5' : ''}`}>
                            <td className="py-3 px-4 font-mono text-[11px] text-foreground font-bold flex items-center space-x-1.5">
                              <span>{formatDisplayDate(log.date)}</span>
                              {isToday && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-500">
                                  Today
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-semibold text-emerald-500 font-mono">
                              {log.checkInTime || '--:--'}
                            </td>
                            <td className="py-3 px-3 font-semibold text-rose-500 font-mono">
                              {checkOutDisplay}
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-foreground font-bold">
                              {duration}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground text-[11px]">
                              {log.device || 'Web Portal'}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground text-[11px]">
                              {log.branch || 'Head Office (Banani)'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  log.status === 'Present'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : log.status === 'Late'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No attendance logs recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── GEOFENCE BLOCKING ALERT MODAL ── */}
      {geofenceAlert && geofenceAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-center">
            {/* Header Icon */}
            <div className="mx-auto h-16 w-16 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500 shadow-md">
              <MapPin className="h-8 w-8 stroke-[2.2] animate-bounce" />
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                {geofenceAlert.action === 'CHECK_IN' ? 'Check-In Blocked' : 'Check-Out Blocked'}
              </h3>
              <p className="text-xs font-semibold text-rose-500">
                You are currently outside the designated office geofence perimeter.
              </p>
            </div>

            {/* Metrics Breakdown Card */}
            <div className="p-4 rounded-2xl bg-surface border border-border/80 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-muted-foreground font-semibold">Nearest Designated Office:</span>
                <span className="font-bold text-foreground text-right">{geofenceAlert.locationName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-muted-foreground font-semibold">Your Current Distance:</span>
                <span className="font-extrabold text-rose-500 font-mono text-sm">
                  {geofenceAlert.distanceMeters.toLocaleString()}m away
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <span className="text-muted-foreground font-semibold">Max Allowed Geofence:</span>
                <span className="font-bold text-emerald-500">{geofenceAlert.allowedRadiusMeters}m radius</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                <span>GPS Coordinates:</span>
                <span>
                  {geofenceAlert.latitude.toFixed(5)}° N, {geofenceAlert.longitude.toFixed(5)}° E
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={async () => {
                  setGeofenceAlert(null);
                  await checkLiveGeofence();
                }}
                className="py-3 px-4 rounded-2xl font-bold text-xs bg-surface hover:bg-surface/80 border border-border text-foreground transition cursor-pointer"
              >
                🔄 Refresh GPS
              </button>
              <button
                onClick={() => setGeofenceAlert(null)}
                className="py-3 px-4 rounded-2xl font-black text-xs bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-lg shadow-rose-500/25 transition cursor-pointer"
              >
                OK, I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
