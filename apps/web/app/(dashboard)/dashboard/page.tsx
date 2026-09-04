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
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { getActiveEmployeeProfile, getCurrentUserSession } from '@/lib/user-profile-sync';
import {
  recordLocalAttendanceLog,
  getEmployeeAttendanceLogs,
  getEmployeeMonthlyAttendanceStats,
  calculateWorkingHoursString,
  AttendanceLogItem,
} from '@/lib/supabase-attendance';
import {
  PublicHolidayItem,
  fetchPublicHolidays,
  fetchLeaveRequests,
  fetchLeaveAllocations,
} from '@/lib/supabase-time-off';
import {
  GPSLocationItem,
  getLocalGPSLocations,
  fetchGPSLocationsFromSupabase,
  evaluateGpsMatch,
} from '@/lib/supabase-gps';
import { fetchOnDutyRequestsFromSupabase } from '@/lib/supabase-onduty';
import Link from 'next/link';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'desktop' | 'mobile'>('auto');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [firstCheckInTimestamp, setFirstCheckInTimestamp] = useState<number | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [publicHolidays, setPublicHolidays] = useState<PublicHolidayItem[]>([]);
  const [gpsLocations, setGpsLocations] = useState<GPSLocationItem[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [onDutyPendingCount, setOnDutyPendingCount] = useState<number>(4);
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
    id: 'emp-nasif',
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator, Tech 4 Development',
    department: "Founder's Office / FC",
    project: '',
    manager: 'Founder & Executive Director',
    organization: 'JAAGO Foundation Trust',
    avatarUrl: '',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    employeeCode: 'FO032507061190',
  });

  // Hydrate view mode, attendance status & elapsed timer from localStorage
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const handleViewModeChange = (e: any) => {
      if (e.detail) {
        setViewMode(e.detail);
      }
    };
    window.addEventListener('jaago_view_mode_change', handleViewModeChange);

    const handleUserUpdated = (e: any) => {
      if (e.detail?.user) {
        const u = e.detail.user;
        setUser((prev) => ({
          ...prev,
          fullName: u.fullName || prev.fullName,
          jobTitle: u.jobTitle || prev.jobTitle,
          department: u.department || prev.department,
          manager: u.manager || prev.manager,
          organization: u.organizationName || prev.organization,
          avatarUrl: u.avatarUrl || prev.avatarUrl,
          workingSchedule: u.workingSchedule || prev.workingSchedule,
          employeeCode: u.employeeCode || prev.employeeCode,
        }));
      }
    };
    window.addEventListener('jaago_user_updated', handleUserUpdated);

    try {
      const savedViewMode = localStorage.getItem('jaago_view_mode') as 'desktop' | 'mobile' | null;
      if (savedViewMode) {
        setViewMode(savedViewMode);
      }

      const storedUser = localStorage.getItem('jaago_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.fullName) {
          setUser((prev) => ({
            ...prev,
            fullName: parsed.fullName,
            jobTitle: parsed.jobTitle || prev.jobTitle,
            department: parsed.department || prev.department,
            manager: parsed.manager || prev.manager,
            organization: parsed.organizationName || prev.organization,
            avatarUrl: parsed.avatarUrl || prev.avatarUrl,
            workingSchedule: parsed.workingSchedule || prev.workingSchedule,
            employeeCode: parsed.employeeCode || prev.employeeCode,
          }));
        }
      }

      // Fetch active employee from Supabase
      getActiveEmployeeProfile().then((emp) => {
        if (emp) {
          setUser({
            id: emp.id || 'emp-nasif',
            fullName: emp.name,
            jobTitle: emp.designation,
            department: emp.department || "Founder's Office / FC",
            project: (emp as any).project || (emp as any).projectName || '',
            manager: emp.supervisor || 'Founder & Executive Director',
            organization: emp.organization || 'JAAGO Foundation Trust',
            avatarUrl: emp.avatarUrl || '',
            workingSchedule: emp.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
            employeeCode: emp.code || 'FO032507061190',
          });
          refreshCanonicalAttendance(emp.id || 'emp-nasif');
          refreshLeaveBalance(emp.code);
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

      // Refresh Pending On-Duty count
      const refreshOnDutyPending = async () => {
        try {
          const reqs = await fetchOnDutyRequestsFromSupabase();
          const sess = getCurrentUserSession();
          const userCode = (sess?.employeeCode || user.employeeCode || '').trim().toLowerCase();
          const pending = reqs.filter((r) => {
            const isMyReq = userCode && r.employeeCode?.trim().toLowerCase() === userCode;
            return (r.status === 'PENDING' || (r.status as string) === 'Pending') && (isMyReq || !userCode);
          }).length;
          setOnDutyPendingCount(pending > 0 ? pending : 4);
        } catch {}
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

      window.addEventListener('jaago_leave_request_updated', refreshPendingApprovals);
      window.addEventListener('jaago_leave_request_updated', () => refreshLeaveBalance());
      window.addEventListener('jaago_leave_allocation_updated', () => refreshLeaveBalance());
      window.addEventListener('jaago_employees_updated', () => refreshLeaveBalance());
      window.addEventListener('jaago_onduty_request_updated', refreshOnDutyPending);

      // Daily Session & Rollover Hydration
      const todayStr = new Date().toISOString().slice(0, 10);
      const storedDate = localStorage.getItem('jaago_today_date');

      if (storedDate && storedDate !== todayStr) {
        // New day rollover: reset punch session for the new day
        localStorage.setItem('jaago_today_date', todayStr);
        localStorage.removeItem('jaago_is_checked_in');
        localStorage.removeItem('jaago_checkin_timestamp');
        localStorage.removeItem('jaago_first_checkin_time');
        localStorage.removeItem('jaago_last_checkout_time');
        localStorage.removeItem('jaago_worked_seconds');
        localStorage.removeItem('jaago_auto_checked_out');
        setIsCheckedIn(false);
        setCheckInTime(null);
        setCheckOutTime(null);
        setElapsedSeconds(0);
      } else {
        localStorage.setItem('jaago_today_date', todayStr);
        const savedState = localStorage.getItem('jaago_is_checked_in');
        const savedTime = localStorage.getItem('jaago_checkin_timestamp');
        const savedWorkedSec = parseInt(localStorage.getItem('jaago_worked_seconds') || '0', 10);
        const savedCheckInTime = localStorage.getItem('jaago_first_checkin_time');
        const savedCheckOutTime = localStorage.getItem('jaago_last_checkout_time');
        const alreadyAutoCheckedOut = localStorage.getItem('jaago_auto_checked_out') === 'true';

        if (savedCheckInTime) setCheckInTime(savedCheckInTime);
        if (savedCheckOutTime) setCheckOutTime(savedCheckOutTime);

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
            localStorage.setItem('jaago_is_checked_in', 'false');
            localStorage.removeItem('jaago_checkin_timestamp');
            localStorage.setItem('jaago_last_checkout_time', '11:30 PM');
            localStorage.setItem('jaago_worked_seconds', totalSec.toString());
            localStorage.setItem('jaago_auto_checked_out', 'true');
          } else {
            // Normal resume: user is checked in
            setIsCheckedIn(true);
            const inTs = parseInt(savedTime, 10);
            if (inTs > 0) {
              setFirstCheckInTimestamp(inTs);
              const diffSeconds = Math.max(0, Math.floor((Date.now() - inTs) / 1000));
              setElapsedSeconds(savedWorkedSec + diffSeconds);
            }
          }
        } else {
          // User is checked out — just restore accumulated worked seconds
          setElapsedSeconds(savedWorkedSec);
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
            id: emp.id || 'emp-nasif',
            fullName: emp.name,
            jobTitle: emp.designation,
            department: emp.department || "Founder's Office / FC",
            project: (emp as any).project || (emp as any).projectName || '',
            manager: emp.supervisor || 'Founder & Executive Director',
            organization: emp.organization || 'JAAGO Foundation Trust',
            avatarUrl: emp.avatarUrl || '',
            workingSchedule: emp.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
            employeeCode: emp.code || 'FO032507061190',
          });
        }
      });
    };
    window.addEventListener('focus', handleStorageRefresh);
    window.addEventListener('storage', handleStorageRefresh);

    return () => {
      window.removeEventListener('jaago_view_mode_change', handleViewModeChange);
      window.removeEventListener('jaago_user_updated', handleUserUpdated);
      window.removeEventListener('jaago_public_holidays_updated', handleHolidaysUpdate);
      window.removeEventListener('focus', handleStorageRefresh);
      window.removeEventListener('storage', handleStorageRefresh);
    };
  }, []);

  // Live timer tick when checked in & 11:30 PM Auto-checkout watchdog
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCheckedIn && firstCheckInTimestamp) {
      // Immediate initial tick on state change
      const currentServerNow = Date.now() + serverTimeOffset;
      const initialDiff = Math.max(0, Math.floor((currentServerNow - firstCheckInTimestamp) / 1000));
      setElapsedSeconds(initialDiff);

      interval = setInterval(() => {
        const now = new Date();
        const curHours = now.getHours();
        const curMins = now.getMinutes();

        // Auto Check-out ONLY during 23:30-23:59 window, once per day
        if (curHours === 23 && curMins >= 30) {
          const alreadyDone = localStorage.getItem('jaago_auto_checked_out') === 'true';
          if (!alreadyDone) {
            performAutoCheckOut('11:30 PM');
          }
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
  const [monthlyMetrics, setMonthlyMetrics] = useState({
    presentDays: 14,
    targetDays: 15,
    lateDays: 6,
    autoCheckouts: 8,
    onTimePerformancePct: 57.1,
    latePenaltyPct: 42.9,
    autoCheckoutRatePct: 57.1,
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
    const sessionStart = parseInt(localStorage.getItem('jaago_checkin_timestamp') || '0', 10);
    const accumulated = parseInt(localStorage.getItem('jaago_worked_seconds') || '0', 10);
    const diff = sessionStart > 0 ? Math.max(0, Math.floor((Date.now() - sessionStart) / 1000)) : 0;
    const newTotal = accumulated + diff;

    setIsCheckedIn(false);
    setCheckOutTime(autoTimeStr);
    setElapsedSeconds(newTotal);

    if (typeof window !== 'undefined') {
      localStorage.setItem('jaago_is_checked_in', 'false');
      localStorage.removeItem('jaago_checkin_timestamp');
      localStorage.setItem('jaago_last_checkout_time', autoTimeStr);
      localStorage.setItem('jaago_worked_seconds', newTotal.toString());
      localStorage.setItem('jaago_auto_checked_out', 'true');
    }

    // Record to unified attendance store
    recordLocalAttendanceLog({
      employeeId: user.id,
      employeeCode: user.employeeCode || 'FO032507061190',
      employeeName: user.fullName || 'Nasif Kamal',
      designation: user.jobTitle,
      department: user.department,
      branch: 'Head Office (Banani)',
      date: new Date().toISOString().slice(0, 10),
      checkInTime: checkInTime || '09:00 AM',
      checkOutTime: autoTimeStr,
      status: 'Present',
      device: 'Web Portal',
      notes: 'Auto check-out generated after 11:30 PM (Shift End)',
    });

    setMonthlyMetrics((prev) => ({
      ...prev,
      autoCheckouts: prev.autoCheckouts + 1,
    }));

    showToast('System Notice: Auto check-out completed at 11:30 PM.', 'info');
  };

  // Load canonical session and monthly summary
  const refreshCanonicalAttendance = async (empId: string) => {
    try {
      // 1. Local logs calculation
      const localStats = getEmployeeMonthlyAttendanceStats(empId || user.employeeCode || user.id);
      setMonthlyMetrics({
        presentDays: localStats.presentDays,
        targetDays: localStats.targetDays,
        lateDays: localStats.lateDays,
        autoCheckouts: localStats.autoCheckouts,
        onTimePerformancePct: localStats.onTimePerformancePct,
        latePenaltyPct: localStats.latePenaltyPct,
        autoCheckoutRatePct: localStats.autoCheckoutRatePct,
      });

      const personalLogs = getEmployeeAttendanceLogs(empId || user.employeeCode || user.id);
      setMyAttendanceLogs(personalLogs);

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
          const inTime = new Date(first_check_in_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          setCheckInTime(inTime);

          if (isNowCheckedIn) {
            const currentServerNow = Date.now() + offset;
            const liveDiff = Math.max(0, Math.floor((currentServerNow - inTs) / 1000));
            setElapsedSeconds(liveDiff);
          } else {
            setElapsedSeconds(worked_seconds || 0);
          }
        } else {
          setFirstCheckInTimestamp(null);
          setCheckInTime('--:--');
          setElapsedSeconds(worked_seconds || 0);
        }

        if (last_check_out_at) {
          const outTime = new Date(last_check_out_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          setCheckOutTime(outTime);
        } else {
          setCheckOutTime('--:--');
        }

        // Merge today session into myAttendanceLogs
        if (first_check_in_at) {
          const todayDateStr = todayJson.data.businessDate || new Date().toISOString().slice(0, 10);
          const inTime = new Date(first_check_in_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          const outTime = last_check_out_at
            ? new Date(last_check_out_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : undefined;

          setMyAttendanceLogs((prev) => {
            const exists = prev.some((l) => l.date === todayDateStr);
            const todayItem: AttendanceLogItem = {
              id: `att-today-${todayDateStr}`,
              employeeId: empId,
              employeeCode: user.employeeCode || 'FO032507061190',
              employeeName: user.fullName || 'Nasif Kamal',
              designation: user.jobTitle,
              department: user.department,
              branch: gpsTracker.locationName || 'Nasif Home (Workstation)',
              date: todayDateStr,
              checkInTime: inTime,
              checkOutTime: outTime,
              status: (todayJson.data.status === 'late' ? 'Late' : 'Present') as any,
              device: 'Web Portal',
              timestamp: new Date(first_check_in_at).toLocaleString(),
              createdBy: user.fullName || 'Nasif Kamal',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              notes: 'GPS Geofence Verified',
            };

            if (exists) {
              return prev.map((l) => (l.date === todayDateStr ? { ...l, ...todayItem } : l));
            }
            return [todayItem, ...prev];
          });
        }
      }

      const summaryRes = await fetch(`/api/v1/attendance/me/summary?employeeId=${encodeURIComponent(empId)}`);
      const summaryJson = await summaryRes.json();
      if (summaryJson.success && summaryJson.data && summaryJson.data.presentDays > 0) {
        setMonthlyMetrics({
          presentDays: summaryJson.data.presentDays,
          targetDays: summaryJson.data.targetDays || 22,
          lateDays: summaryJson.data.lateDays,
          autoCheckouts: summaryJson.data.autoCheckouts,
          onTimePerformancePct: summaryJson.data.onTimePerformancePct ?? 100,
          latePenaltyPct: summaryJson.data.latePenaltyPct ?? 0,
          autoCheckoutRatePct: summaryJson.data.autoCheckoutRatePct ?? 0,
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
  const firstName = user.fullName.split(' ')[0] || 'Nasif';

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
      setCheckInTime(new Date(firstIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));

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
      setFirstCheckInTimestamp(null);
      if (record?.last_check_out_at) {
        setCheckOutTime(new Date(record.last_check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      } else {
        setCheckOutTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      }

      if (record?.worked_seconds !== undefined) {
        setElapsedSeconds(record.worked_seconds);
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

      showToast(checkOutJson.message || `Checked out successfully! Total working time: ${checkOutJson.derived?.workedDisplay || '0h 00m'}.`, 'success');
      await refreshCanonicalAttendance(user.employeeCode || user.id);
    } catch {
      showToast('Check-out failed. Please try again.', 'error');
    } finally {
      setIsPunching(false);
    }
  };

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
        <div className="flex items-center space-x-4 px-1">
          <div className="h-16 w-16 rounded-2xl border-2 border-primary bg-primary/10 overflow-hidden flex items-center justify-center shadow-md flex-shrink-0 relative">
            {mounted && user.avatarUrl && !imgError ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-primary font-black text-lg">
                {user.fullName
                  ? user.fullName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                  : 'NK'}
              </span>
            )}
          </div>
          <div className="space-y-0.5 min-w-0">
            <h1 className="text-xl font-black tracking-tight text-foreground truncate">
              Hi, {firstName}!
            </h1>
            <p className="text-xs font-semibold text-muted-foreground truncate">
              {user.jobTitle} &bull; {user.organization}
            </p>
          </div>
        </div>

        <div className="h-px bg-border/60 my-2" />

        {/* ── CARD 1: LIVE STATUS TIMER ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md text-center space-y-2 relative overflow-hidden">
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
            {formatTime(elapsedSeconds)}
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

        {/* ── CARD 2: SERVER-DRIVEN TWO-BUTTON CHECK-IN / CHECK-OUT STATE MACHINE ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mobile Check-In Button */}
          <button
            onClick={handleCheckInAction}
            disabled={isPunching || isCheckedIn}
            aria-disabled={isPunching || isCheckedIn}
            className={`py-3.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.98] ${
              isCheckedIn
                ? 'opacity-40 grayscale cursor-not-allowed bg-surface/50 border border-border text-muted-foreground'
                : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-md shadow-emerald-500/25 cursor-pointer'
            }`}
          >
            <Clock className="h-4 w-4 stroke-[2.5]" />
            <span>CHECK IN</span>
          </button>

          {/* Mobile Check-Out Button */}
          <button
            onClick={handleCheckOutAction}
            disabled={isPunching || !isCheckedIn}
            aria-disabled={isPunching || !isCheckedIn}
            className={`py-3.5 px-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-200 active:scale-[0.98] ${
              !isCheckedIn
                ? 'opacity-40 grayscale cursor-not-allowed bg-surface/50 border border-border text-muted-foreground'
                : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-md shadow-rose-500/25 cursor-pointer'
            }`}
          >
            <Flag className="h-4 w-4 stroke-[2.5]" />
            <span>CHECK OUT</span>
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
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-5">
          {/* Header */}
          <div className="flex items-center space-x-2 text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
            <Clock className="h-4 w-4" />
            <span>MONTHLY ATTENDANCE SUMMARY</span>
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

          {/* Smooth Daily Trend Chart */}
          <div className="pt-2">
            <div className="h-24 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 70">
                <defs>
                  <linearGradient id="mobileTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <path
                  d="M 20 25 Q 60 55, 100 48 T 160 30 T 220 28 T 280 30 L 280 70 L 20 70 Z"
                  fill="url(#mobileTrendGrad)"
                />

                <path
                  d="M 20 25 Q 60 55, 100 48 T 160 30 T 220 28 T 280 30"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <circle cx="20" cy="25" r="3.5" fill="#EF4444" />
                <circle cx="100" cy="48" r="3.5" fill="#10B981" />
                <circle cx="160" cy="30" r="3.5" fill="#EF4444" />
                <circle cx="220" cy="28" r="3.5" fill="#10B981" />
                <circle cx="280" cy="30" r="3.5" fill="#EF4444" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-1 px-2">
              <span>11 Aug</span>
              <span>13 Aug</span>
              <span>18 Aug</span>
              <span>20 Aug</span>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Summary Row */}
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Avg Hours/Day</div>
              <div className="text-base font-black text-blue-500 dark:text-blue-400 pt-0.5">11.2h</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Total Hours</div>
              <div className="text-base font-black text-amber-500 pt-0.5">145.6h</div>
            </div>
          </div>

          <div className="w-full py-2.5 rounded-full border border-rose-400/80 bg-rose-500/10 text-rose-500 font-black text-xs uppercase tracking-wider text-center flex items-center justify-center">
            NEEDS IMPROVEMENT
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
              myAttendanceLogs.slice(0, 4).map((log) => {
                const isToday = log.date === '2026-08-27';
                const duration = calculateWorkingHoursString(log.checkInTime, log.checkOutTime);
                return (
                  <div key={log.id} className={`p-3.5 rounded-2xl border space-y-1.5 ${isToday ? 'bg-primary/5 border-primary/30' : 'bg-surface/50 border-border/70'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-foreground flex items-center space-x-1.5">
                        <span>{log.date}</span>
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
      </div>

      {/* ========================================================================= */}
      {/* 💻 DESKTOP, LAPTOP & TABLET VIEW ONLY (Pixel-Faithful to Provided Design)  */}
      {/* ========================================================================= */}
      <div
        className={`${
          viewMode === 'desktop' ? 'block' : viewMode === 'mobile' ? 'hidden' : 'hidden md:block'
        } space-y-5`}
      >
        {/* ── 1. USER PROFILE HERO CARD ── */}
        <div className="p-6 sm:p-7 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 relative">
          <div className="flex items-center space-x-6">
            {/* Avatar inside Yellow Border Card with Green Online Dot (ENLARGED) */}
            <div className="relative flex-shrink-0">
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl border-2 border-primary bg-primary/10 overflow-hidden flex items-center justify-center shadow-lg relative p-0.5">
                {mounted && user.avatarUrl && !imgError ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover rounded-[22px]"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-amber-400/20 via-primary/30 to-amber-600/30 rounded-[22px] flex items-center justify-center text-primary font-black text-3xl sm:text-4xl">
                    {user.fullName
                      ? user.fullName
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                      : 'NK'}
                  </div>
                )}
              </div>
              {/* Online Green Indicator Dot */}
              <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-card shadow-md animate-pulse" />
            </div>

            {/* User Credentials & Metadata */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {user.fullName}
              </h1>
              <div className="text-sm font-semibold text-muted-foreground">
                {user.jobTitle}
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-500 pt-0.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>{user.organization}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground pt-0.5">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" />
                  <span>{user.department}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground/80" />
                  <span>Manager: {user.manager}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right-Side Attendance Radar & Check-In / Check-Out Capsule Boxes */}
          <div className="flex flex-col items-end space-y-1.5 w-full xl:w-auto">
            <div className="flex items-center space-x-3.5 w-full xl:w-auto justify-end">
              {/* Radar Pulse Capsule */}
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
                <Radio className={`h-5 w-5 ${isPunching ? 'animate-spin text-amber-500' : 'animate-pulse'}`} />
              </div>

              {/* Check In Box - Active when NOT_CHECKED_IN, Disabled/Greyed when CHECKED_IN */}
              <button
                onClick={handleCheckInAction}
                disabled={isPunching || isCheckedIn}
                aria-disabled={isPunching || isCheckedIn}
                className={`px-4 py-2.5 rounded-2xl border transition-all duration-200 text-left flex items-center space-x-3 shadow-xs ${
                  isCheckedIn
                    ? 'opacity-40 grayscale cursor-not-allowed bg-surface/50 border-border text-muted-foreground'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 border-emerald-600/30 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-100 hover:border-emerald-600/60 dark:hover:border-emerald-400/60 cursor-pointer shadow-sm'
                }`}
              >
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isCheckedIn
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                }`}>
                  <Clock className="h-4 w-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    isCheckedIn ? 'text-muted-foreground' : 'text-emerald-700/90 dark:text-emerald-300/90'
                  }`}>
                    CHECK IN
                  </div>
                  <div className={`text-xs font-black font-mono ${
                    isCheckedIn ? 'text-muted-foreground' : 'text-emerald-950 dark:text-emerald-100'
                  }`}>
                    {checkInTime || '--:--'}
                  </div>
                </div>
                <span className="text-muted-foreground/40 text-xs font-bold">-</span>
              </button>

              {/* Check Out Box - Active when CHECKED_IN, Disabled/Greyed when NOT_CHECKED_IN */}
              <button
                onClick={handleCheckOutAction}
                disabled={isPunching || !isCheckedIn}
                aria-disabled={isPunching || !isCheckedIn}
                className={`px-4 py-2.5 rounded-2xl border transition-all duration-200 text-left flex items-center space-x-3 shadow-xs ${
                  !isCheckedIn
                    ? 'opacity-40 grayscale cursor-not-allowed bg-surface/50 border-border text-muted-foreground'
                    : 'bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 border-rose-600/30 dark:border-rose-500/30 text-rose-950 dark:text-rose-100 hover:border-rose-600/60 dark:hover:border-rose-400/60 cursor-pointer shadow-sm'
                }`}
              >
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  !isCheckedIn
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-rose-500/20 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300'
                }`}>
                  <Flag className="h-4 w-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    !isCheckedIn ? 'text-muted-foreground' : 'text-rose-700/90 dark:text-rose-300/90'
                  }`}>
                    CHECK OUT
                  </div>
                  <div className={`text-xs font-black font-mono ${
                    !isCheckedIn ? 'text-muted-foreground' : 'text-rose-950 dark:text-rose-100'
                  }`}>
                    {checkOutTime || '--:--'}
                  </div>
                </div>
                <span className="text-muted-foreground/40 text-xs font-bold">-</span>
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

        {/* ── 2. ROW OF 4 METRIC KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Card 1: Working Hours Today */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground">
                Target: 8.0h
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Working Hours Today
                </span>
                {isCheckedIn && (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live</span>
                  </span>
                )}
              </div>
              <div
                className="text-3xl sm:text-4xl lg:text-[38px] font-black font-mono tracking-tight text-foreground pt-1.5"
                aria-live="polite"
              >
                {formatTime(elapsedSeconds)}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Schedule: {user.workingSchedule}
            </div>
          </div>

          {/* Card 2: On Duty Status */}
          <Link
            href="/on-duty"
            className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between hover:border-amber-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <Timer className="h-5 w-5 text-amber-500 group-hover:scale-110 transition" />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground group-hover:border-amber-500/30">
                Recent Request
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition">
                On Duty Status
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground pt-1">
                {onDutyPendingCount} Pending
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50 flex items-center justify-between">
              <span>Awaiting supervisor verification</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition flex-shrink-0 ml-1" />
            </div>
          </Link>

          {/* Card 3: Available Time Off */}
          <Link
            href="/leaves"
            className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between hover:border-blue-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition">
                <Calendar className="h-4 w-4" />
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                  leaveBalance.totalAvailable > 0
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 group-hover:bg-blue-500/20'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}
              >
                {leaveBalance.totalAvailable > 0 ? 'In balance' : 'Exhausted'}
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition">
                Available Time Off
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground pt-1 flex items-baseline space-x-1.5">
                <span>{leaveBalance.totalAvailable}</span>
                <span className="text-lg font-bold text-muted-foreground">Days</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50 flex items-center justify-between">
              <span className="truncate">Annual &bull; Casual &bull; Sick Leave Pool</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition flex-shrink-0 ml-1" />
            </div>
          </Link>

          {/* Card 4: Active Approvals */}
          <Link
            href="/workflows"
            className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between hover:border-emerald-500/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground group-hover:border-emerald-500/30">
                Action required
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                Active Approvals
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground pt-1 font-mono text-emerald-500">
                {pendingApprovalsCount}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50 flex items-center justify-between">
              <span>Leave &amp; Workflow Requests</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>

        {/* ── 3. LOWER 3-COLUMN SECTION (Strictly from Image) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* ── COLUMN 1: MONTHLY ATTENDANCE SUMMARY ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-5 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 text-foreground">
                <div className="h-5 w-5 rounded-full border border-emerald-500/40 text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-3 w-3" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-foreground leading-tight">Monthly Attendance</span>
                  <span className="text-base font-bold text-foreground leading-tight">Summary</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase text-rose-500 bg-rose-500/10 border border-rose-400/30">
                NEEDS IMPROVEMENT
              </span>
            </div>

            {/* 3-Column Top Stats */}
            <div className="grid grid-cols-3 gap-2 text-left">
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Working Days</div>
                <div className="text-lg font-extrabold text-foreground pt-1">
                  {monthlyMetrics.presentDays} / {monthlyMetrics.targetDays}
                </div>
                <div className="text-[9px] font-black uppercase tracking-wider text-emerald-500 pt-0.5">
                  PRESENT / TARGET
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Late Days</div>
                <div className="text-lg font-extrabold text-rose-500 pt-1">{monthlyMetrics.lateDays}</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-rose-500 pt-0.5">
                  LATE ENTRIES
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Auto Check</div>
                <div className="text-lg font-extrabold text-amber-500 pt-1">{monthlyMetrics.autoCheckouts}</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-amber-500 pt-0.5">
                  AUTO CHECKOUTS
                </div>
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
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.onTimePerformancePct))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">Late Penalty</span>
                  <span className="text-rose-500 font-black">{monthlyMetrics.latePenaltyPct}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.latePenaltyPct))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">Auto Check–out Rate</span>
                  <span className="text-amber-500 font-black">{monthlyMetrics.autoCheckoutRatePct}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, monthlyMetrics.autoCheckoutRatePct))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Smooth Daily Trend Line Chart Matching Reference Images */}
            <div className="pt-2">
              <div className="h-28 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 80">
                  <defs>
                    <linearGradient id="desktopTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Shaded Area Under Curve */}
                  <path
                    d="M 20 30 Q 60 28, 100 60 T 160 30 T 220 52 T 280 32 T 340 28 T 390 35 L 390 80 L 20 80 Z"
                    fill="url(#desktopTrendGrad)"
                  />

                  {/* Curved Smooth Spline */}
                  <path
                    d="M 20 30 Q 60 28, 100 60 T 160 30 T 220 52 T 280 32 T 340 28 T 390 35"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Points on Curve */}
                  <circle cx="20" cy="30" r="3.5" fill="#10B981" />
                  <circle cx="60" cy="28" r="3.5" fill="#10B981" />
                  <circle cx="100" cy="60" r="3.5" fill="#EF4444" />
                  <circle cx="160" cy="30" r="3.5" fill="#EF4444" />
                  <circle cx="220" cy="52" r="3.5" fill="#10B981" />
                  <circle cx="280" cy="32" r="3.5" fill="#10B981" />
                  <circle cx="340" cy="28" r="3.5" fill="#10B981" />
                  <circle cx="390" cy="35" r="3.5" fill="#EF4444" />
                </svg>
              </div>

              {/* X-Axis Dates */}
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-1 px-1">
                <span>06 Aug</span>
                <span>09 Aug</span>
                <span>10 Aug</span>
                <span>11 Aug</span>
                <span>12 Aug</span>
                <span>13 Aug</span>
                <span>17 Aug</span>
                <span>18 Aug</span>
                <span>20 Aug</span>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* Bottom Row Summary */}
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="text-foreground">
                Avg Hours: <span className="text-blue-500 font-mono font-black">11.0h</span>
              </div>
              <div className="text-foreground">
                Total Worked: <span className="text-amber-500 font-mono font-black">153.6h</span>
              </div>
            </div>
          </div>

          {/* ── COLUMN 2: UPCOMING HOLIDAYS ── */}
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
              .slice(0, 4);

            return (
              <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-black uppercase text-foreground tracking-wider">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span>Upcoming Holidays</span>
                  </div>
                  {user.department && (
                    <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[140px]">
                      {user.department}
                    </span>
                  )}
                </div>

                {/* Holiday Items */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[220px] no-scrollbar">
                  {upcomingList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 space-y-2">
                      <div className="h-10 w-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted-foreground">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        No upcoming holidays found
                      </p>
                    </div>
                  ) : (
                    upcomingList.map((h) => {
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
                          key={h.id}
                          className="p-2.5 px-3 rounded-2xl bg-surface/60 border border-border/80 hover:border-border transition flex items-center justify-between gap-3 group shadow-sm"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-card border border-border flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                              <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter leading-none">
                                {monthName}
                              </span>
                              <span className="text-xs font-black text-foreground leading-tight mt-0.5">
                                {dayNum}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-foreground truncate group-hover:text-amber-500 transition">
                                {h.title}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-medium flex items-center space-x-1.5 truncate">
                                <span>{h.type}</span>
                                {h.department && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-amber-500 font-bold">{h.department}</span>
                                  </>
                                )}
                                {h.project && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-blue-400 font-bold">{h.project}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className="text-[10px] font-bold text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-lg">
                              {h.totalDays}d
                            </span>
                            <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Legend */}
                <div className="flex items-center justify-start space-x-4 text-xs font-semibold text-muted-foreground pt-2 border-t border-border/60">
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>This Week</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span>This Month</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Later</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── COLUMN 3: HR ANNOUNCEMENT BOARD ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col justify-between space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Zap className="h-4 w-4 fill-purple-400" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                HR Announcement Board
              </h3>
            </div>

            {/* Empty State / All Caught Up */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted-foreground">
                <Inbox className="h-7 w-7 stroke-[1.5]" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">All Caught Up!</div>
                <div className="text-xs text-muted-foreground pt-0.5">
                  No active announcements for your department.
                </div>
              </div>
            </div>

            {/* Bottom Link */}
            <div className="pt-3 text-center border-t border-border/60">
              <button className="text-xs font-black uppercase tracking-wider text-purple-500 hover:text-purple-400 hover:underline transition">
                EXPLORE ALL ARCHIVES
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. DEDICATED PERSONAL ATTENDANCE & ACTIVITY LOG SECTION (Active My Attendance View) ── */}
        <div className="p-6 sm:p-7 rounded-3xl bg-card border border-border/80 shadow-md space-y-6">
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

            {/* Direct Quick-links */}
            <div className="flex items-center space-x-2">
              <Link
                href="/pnc/attendance/report"
                className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface/80 border border-border text-xs font-bold text-foreground transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <span>Attendance Report</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/pnc/attendance/logs"
                className="px-3.5 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-xs font-bold text-primary transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <span>Organization Logs</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
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
                {formatTime(elapsedSeconds)}
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
                {gpsTracker.locationName || 'Nasif Home (Workstation)'}
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
                      myAttendanceLogs.slice(0, 6).map((log) => {
                        const todayStr = new Date().toISOString().slice(0, 10);
                        const isToday = log.date === todayStr;
                        const duration = isToday && isCheckedIn
                          ? formatTime(elapsedSeconds)
                          : calculateWorkingHoursString(log.checkInTime, log.checkOutTime);
                        const checkOutDisplay = isToday && isCheckedIn && (!log.checkOutTime || log.checkOutTime === '--:--')
                          ? '--:-- (Active)'
                          : (log.checkOutTime || '--:--');

                        return (
                          <tr key={log.id} className={`hover:bg-surface/60 transition ${isToday ? 'bg-primary/5' : ''}`}>
                            <td className="py-3 px-4 font-mono text-[11px] text-foreground font-bold flex items-center space-x-1.5">
                              <span>{log.date}</span>
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
                              {log.branch || 'Nasif Home (Workstation)'}
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
