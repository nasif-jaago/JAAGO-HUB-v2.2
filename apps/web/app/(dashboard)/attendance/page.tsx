'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Radio,
  CheckCircle2,
  XCircle,
  MapPin,
  Search,
  Trash2,
  Pencil,
  X,
  Globe,
  Send,
  Fingerprint,
  Layers,
  Smartphone,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { getActiveEmployeeProfile, getCurrentUserSession } from '@/lib/user-profile-sync';
import {
  AttendanceLogItem,
  getLocalAttendanceLogs,
  recordLocalAttendanceLog,
  fetchAttendanceLogsFromSupabase,
  calculateWorkingHoursString,
  deleteLocalAttendanceLog,
  deleteMultipleLocalAttendanceLogs,
} from '@/lib/supabase-attendance';
import {
  GPSLocationItem,
  fetchGPSLocationsFromSupabase,
} from '@/lib/supabase-gps';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';
import {
  OnDutyRequestItem,
  getLocalOnDutyRequests,
  fetchOnDutyRequestsFromSupabase,
} from '@/lib/supabase-onduty';
import {
  AttendanceRegularizationItem,
  getLocalRegularizations,
  submitAttendanceRegularization,
  calculateShiftStandardTimes,
} from '@/lib/supabase-regularization';
import { formatDisplayDate, getWeekdayShort } from '@/lib/date-format';

export default function AttendancePage() {
  const [, setMounted] = useState(false);
  const [user, setUser] = useState({
    id: '',
    fullName: '',
    jobTitle: '',
    department: '',
    manager: '',
    organization: 'JAAGO Foundation',
    avatarUrl: '',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    employeeCode: '',
    allowRegularization: true as boolean | undefined,
  });

  // Punch session state
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [firstCheckInTimestamp, setFirstCheckInTimestamp] = useState<number | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  // GPS state
  const [, setGpsLocations] = useState<GPSLocationItem[]>([]);

  // Attendance Logs & Employees & Regularizations
  const [allLogs, setAllLogs] = useState<AttendanceLogItem[]>([]);
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [onDutyRequests, setOnDutyRequests] = useState<OnDutyRequestItem[]>([]);
  const [regularizations, setRegularizations] = useState<AttendanceRegularizationItem[]>([]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [startDate, setStartDate] = useState(() => {
    const ym = new Date().toISOString().substring(0, 7);
    return `${ym}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const ym = new Date().toISOString().substring(0, 7);
    const [y, m] = ym.split('-').map(Number);
    const lastDay = new Date(y!, m!, 0).getDate();
    return `${ym}-${String(lastDay).padStart(2, '0')}`;
  });
  const [datePreset, setDatePreset] = useState<'today' | 'this-week' | 'this-month' | 'last-month' | 'all'>('this-month');
  const [viewGrouping, setViewGrouping] = useState<'flat' | 'month-grouped' | 'cards'>('flat');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals State
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<AttendanceLogItem | null>(null);
  const [gpsDetailModal, setGpsDetailModal] = useState<{
    isOpen: boolean;
    log: AttendanceLogItem | null;
  }>({
    isOpen: false,
    log: null,
  });
  const [punchAuditModal, setPunchAuditModal] = useState<{
    isOpen: boolean;
    log: AttendanceLogItem | null;
  }>({
    isOpen: false,
    log: null,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    ids: string[];
    names: string;
  }>({
    isOpen: false,
    ids: [],
    names: '',
  });

  // Regularization Modal State
  const [regModal, setRegModal] = useState<{
    isOpen: boolean;
    log: AttendanceLogItem | null;
    adjustedCheckIn: string;
    adjustedCheckOut: string;
    reason: string;
    notes: string;
    isSubmitting: boolean;
  } | null>(null);

  // Log Form State
  const [formData, setFormData] = useState<{
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    designation: string;
    department: string;
    branch: string;
    status: AttendanceLogItem['status'];
    device: AttendanceLogItem['device'];
    date: string;
    checkInTime: string;
    checkOutTime: string;
    locationName: string;
    notes: string;
  }>({
    employeeId: '',
    employeeCode: '',
    employeeName: '',
    designation: '',
    department: '',
    branch: '',
    status: 'Present',
    device: 'Web Portal',
    date: new Date().toISOString().slice(0, 10),
    checkInTime: '09:00 AM',
    checkOutTime: '06:00 PM',
    locationName: 'JAAGO HQ (Banani)',
    notes: '',
  });

  // Helper: Detect if an attendance record corresponds to an approved On-Duty request
  const isOnDutyRecord = (log: AttendanceLogItem): boolean => {
    if (!log) return false;
    if (log.status === 'On Duty') return true;
    const notesLower = (log.notes || '').toLowerCase();
    if (
      notesLower.includes('on-duty') ||
      notesLower.includes('on duty') ||
      notesLower.includes('field duty') ||
      notesLower.includes('out-of-office')
    ) {
      return true;
    }
    const locLower = (log.locationName || '').toLowerCase();
    if (locLower.includes('field duty') || locLower.includes('on-duty') || locLower.includes('on duty')) {
      return true;
    }
    // Match against approved On-Duty requests
    const isApproved = onDutyRequests.some(
      (r) =>
        r.status === 'APPROVED' &&
        log.date >= r.startDate &&
        log.date <= r.endDate &&
        (log.employeeCode === r.employeeCode || log.employeeId === r.employeeId || !r.employeeCode)
    );
    if (isApproved) return true;

    try {
      const localOD = getLocalOnDutyRequests();
      if (
        localOD.some(
          (r) =>
            r.status === 'APPROVED' &&
            log.date >= r.startDate &&
            log.date <= r.endDate &&
            (log.employeeCode === r.employeeCode || log.employeeId === r.employeeId || !r.employeeCode)
        )
      ) {
        return true;
      }
    } catch {}

    return false;
  };

  // Super Admin privilege state
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast((curr) => (curr?.message === message ? null : curr)), 3500);
  };

  const evaluateSuperAdminRole = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('jaago_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        const roles: string[] = Array.isArray(parsed.roles) ? parsed.roles : [];
        const hasAdminRole = roles.some((r) => {
          const lower = String(r).toLowerCase().trim();
          return lower === 'super_admin' || lower === 'superadmin' || lower === 'super admin' || lower === 'admin';
        });
        const isAdminFlag = parsed.isSuperAdmin === true || (parsed.role && String(parsed.role).toLowerCase().includes('admin'));
        const isNasif = parsed.email?.toLowerCase().includes('nasif.kamal@jaago.com.bd') || parsed.employeeCode === 'FO032507061190';
        setIsSuperAdmin(Boolean(hasAdminRole || isAdminFlag || isNasif));
        return;
      }
    } catch {}
    setIsSuperAdmin(false);
  };

  // 1. Initial Hydration & Listeners
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    // Safely hydrate session from localStorage after client mount
    try {
      const raw = localStorage.getItem('jaago_user');
      if (raw) {
        const u = JSON.parse(raw);
        setUser((prev) => ({
          ...prev,
          id: u.id || u.employeeId || prev.id,
          fullName: u.fullName || u.name || prev.fullName,
          jobTitle: u.jobTitle || u.designation || prev.jobTitle,
          department: u.department || prev.department,
          manager: u.manager || u.supervisor || prev.manager,
          organization: u.organizationName || u.organization || prev.organization,
          avatarUrl: u.avatarUrl || prev.avatarUrl,
          workingSchedule: u.workingSchedule || prev.workingSchedule,
          employeeCode: u.employeeCode || u.employeeId || prev.employeeCode,
          allowRegularization: u.allowRegularization !== undefined ? u.allowRegularization !== false : prev.allowRegularization,
        }));
      }
    } catch {}

    // Immediately hydrate employees from localStorage before async fetch completes
    try {
      const rawEmps = localStorage.getItem('jaago_pnc_employees_v2');
      if (rawEmps) {
        const parsed = JSON.parse(rawEmps);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEmployees(parsed);
        }
      }
    } catch {}

    evaluateSuperAdminRole();

    // Load active employee profile
    getActiveEmployeeProfile().then((emp) => {
      if (emp) {
        setUser((prev) => ({
          ...prev,
          id: emp.id || prev.id,
          fullName: emp.name || prev.fullName,
          jobTitle: emp.designation || prev.jobTitle,
          department: emp.department || prev.department,
          manager: emp.supervisor || prev.manager,
          organization: emp.organization || prev.organization,
          avatarUrl: emp.avatarUrl || prev.avatarUrl,
          workingSchedule: emp.workingSchedule || prev.workingSchedule,
          employeeCode: emp.code || prev.employeeCode,
          allowRegularization: emp.allowRegularization !== false,
        }));
        evaluateSuperAdminRole();
        loadUserLogs(emp.code || emp.id);
        refreshTodaySession(emp.code || emp.id);
      }
    });

    // Load employees
    fetchEmployeesFromSupabase().then((emps) => {
      if (emps && emps.length > 0) setEmployees(emps);
    });

    // Load GPS locations
    fetchGPSLocationsFromSupabase().then((locs) => {
      if (locs && locs.length > 0) setGpsLocations(locs);
    });

    // Load on-duty requests
    const initialOD = getLocalOnDutyRequests();
    setOnDutyRequests(initialOD);
    fetchOnDutyRequestsFromSupabase().then((data) => {
      if (data && data.length > 0) setOnDutyRequests(data);
    });

    // Load regularizations and sync from live server API
    const syncLiveRegularizations = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
        const res = await fetch('/api/v1/attendance/regularization', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Merge server data with local cache without recursive event ping-pong
          const currentLocal = getLocalRegularizations();
          const combinedMap = new Map<string, AttendanceRegularizationItem>();
          currentLocal.forEach((r) => combinedMap.set(r.id, r));
          json.data.forEach((r: AttendanceRegularizationItem) => combinedMap.set(r.id, r));
          const merged = Array.from(combinedMap.values());
          if (typeof window !== 'undefined') {
            localStorage.setItem('jaago_attendance_regularizations_v2', JSON.stringify(merged));
          }
          setRegularizations(merged);
        }
      } catch {}
    };

    setRegularizations(getLocalRegularizations());
    syncLiveRegularizations();

    // Initial logs load for current user
    const sess = getCurrentUserSession();
    const initialCode = sess?.employeeCode || user.employeeCode || user.id;
    loadUserLogs(initialCode);

    // Load today session
    refreshTodaySession(initialCode);

    // Event listeners
    const handleAttUpdated = () => {
      loadUserLogs();
      setRegularizations(getLocalRegularizations());
    };

    const handleUserUpdated = (e: any) => {
      evaluateSuperAdminRole();
      if (e?.detail?.user) {
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
          allowRegularization: u.allowRegularization !== false,
        }));
        loadUserLogs(u.employeeCode || u.id);
        refreshTodaySession(u.employeeCode || u.id);
      } else if (e?.detail?.allowRegularization !== undefined) {
        setUser((prev) => ({
          ...prev,
          allowRegularization: e.detail.allowRegularization !== false,
        }));
      }
    };

    const handleODUpdated = () => {
      setOnDutyRequests(getLocalOnDutyRequests());
    };

    const handleRegUpdated = () => {
      setRegularizations(getLocalRegularizations());
      loadUserLogs();
    };

    const handleEmpsUpdated = () => {
      try {
        const raw = localStorage.getItem('jaago_pnc_employees_v2');
        if (raw) {
          const emps = JSON.parse(raw);
          if (Array.isArray(emps) && emps.length > 0) {
            setEmployees(emps);
          }
        }
      } catch {}
      fetchEmployeesFromSupabase().then((emps) => {
        if (emps && emps.length > 0) setEmployees(emps);
      });
    };

    window.addEventListener('jaago_attendance_updated', handleAttUpdated);
    window.addEventListener('jaago_attendance_regularization_updated', handleRegUpdated);
    window.addEventListener('jaago_leave_request_updated', handleAttUpdated);
    window.addEventListener('jaago_leave_allocation_updated', handleAttUpdated);
    window.addEventListener('jaago_user_updated', handleUserUpdated);
    window.addEventListener('jaago_employees_updated', handleEmpsUpdated);
    window.addEventListener('jaago_pnc_employees_changed', handleEmpsUpdated);
    window.addEventListener('jaago_onduty_updated', handleODUpdated);
    window.addEventListener('storage', handleAttUpdated);
    window.addEventListener('storage', handleUserUpdated);
    window.addEventListener('storage', handleEmpsUpdated);

    // Live background polling for regularizations every 8 seconds
    const regInterval = setInterval(syncLiveRegularizations, 8000);

    // Live background polling for biometric & GPS attendance status every 25 seconds
    const autoPollInterval = setInterval(() => {
      const sess = getCurrentUserSession();
      const codeOrId = sess?.employeeCode || user.employeeCode || user.id;
      if (codeOrId) {
        loadUserLogs(codeOrId);
        refreshTodaySession(codeOrId);
      }
    }, 25000);

    return () => {
      window.removeEventListener('jaago_attendance_updated', handleAttUpdated);
      window.removeEventListener('jaago_attendance_regularization_updated', handleRegUpdated);
      window.removeEventListener('jaago_leave_request_updated', handleAttUpdated);
      window.removeEventListener('jaago_leave_allocation_updated', handleAttUpdated);
      window.removeEventListener('jaago_user_updated', handleUserUpdated);
      window.removeEventListener('jaago_employees_updated', handleEmpsUpdated);
      window.removeEventListener('jaago_pnc_employees_changed', handleEmpsUpdated);
      window.removeEventListener('jaago_onduty_updated', handleODUpdated);
      window.removeEventListener('storage', handleAttUpdated);
      window.removeEventListener('storage', handleUserUpdated);
      window.removeEventListener('storage', handleEmpsUpdated);
      clearInterval(regInterval);
      clearInterval(autoPollInterval);
    };
  }, []);

  // Fetch logs whenever user employee code changes
  useEffect(() => {
    if (user.employeeCode || user.id) {
      loadUserLogs(user.employeeCode || user.id);
      refreshTodaySession(user.employeeCode || user.id);
    }
  }, [user.employeeCode, user.id]);

  // Load user logs implementation
  const loadUserLogs = async (targetCodeOrId?: string) => {
    try {
      const sess = getCurrentUserSession();
      const codeOrId = (targetCodeOrId || sess?.employeeCode || user.employeeCode || user.id || '').trim();
      const supaLogs = await fetchAttendanceLogsFromSupabase(true, codeOrId || undefined);
      const localLogs = getLocalAttendanceLogs();
      const combinedMap = new Map<string, AttendanceLogItem>();
      localLogs.forEach((l) => {
        const key = `${(l.employeeCode || '').toLowerCase().trim()}_${l.date}`;
        combinedMap.set(key, l);
      });
      (supaLogs || []).forEach((l) => {
        const key = `${(l.employeeCode || '').toLowerCase().trim()}_${l.date}`;
        const existing = combinedMap.get(key);
        if (existing) {
          combinedMap.set(key, {
            ...existing,
            ...l,
            locationName: l.locationName || existing.locationName,
            branch: l.branch || existing.branch,
            allPunches: (l.allPunches && l.allPunches.length > 0) ? l.allPunches : existing.allPunches,
            primarySource: l.primarySource || existing.primarySource,
            checkInSource: l.checkInSource || existing.checkInSource,
            checkOutSource: l.checkOutSource || existing.checkOutSource,
            sourceBreakdown: l.sourceBreakdown || existing.sourceBreakdown,
          });
        } else {
          combinedMap.set(key, l);
        }
      });
      setAllLogs(Array.from(combinedMap.values()));
    } catch (err) {
      console.warn('Error loading logs for user:', err);
      setAllLogs(getLocalAttendanceLogs());
    }
  };

  // Live timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCheckedIn && firstCheckInTimestamp) {
      const currentServerNow = Date.now() + serverTimeOffset;
      const initialDiff = Math.max(0, Math.floor((currentServerNow - firstCheckInTimestamp) / 1000));
      setElapsedSeconds(initialDiff);

      interval = setInterval(() => {
        const nowServer = Date.now() + serverTimeOffset;
        const diff = Math.max(0, Math.floor((nowServer - firstCheckInTimestamp) / 1000));
        setElapsedSeconds(diff);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCheckedIn, firstCheckInTimestamp, serverTimeOffset]);

  // Query today session from backend
  const refreshTodaySession = async (targetCodeOrId?: string) => {
    try {
      const sess = getCurrentUserSession();
      const empCodeOrId = (targetCodeOrId || sess?.employeeCode || user.employeeCode || user.id || '').trim();
      if (!empCodeOrId) return;
      const res = await fetch(`/api/v1/attendance/me/today?employeeId=${encodeURIComponent(empCodeOrId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        const { state, first_check_in_at, last_check_out_at, worked_seconds, server_now } = json.data;
        const checkedIn = state === 'CHECKED_IN';
        setIsCheckedIn(checkedIn);

        let offset = 0;
        if (server_now) {
          offset = new Date(server_now).getTime() - Date.now();
          setServerTimeOffset(offset);
        }

        if (first_check_in_at) {
          const inTs = new Date(first_check_in_at).getTime();
          setFirstCheckInTimestamp(inTs);

          if (checkedIn) {
            const nowServer = Date.now() + offset;
            setElapsedSeconds(Math.max(0, Math.floor((nowServer - inTs) / 1000)));
          } else {
            setElapsedSeconds(worked_seconds || 0);
          }

          const todayDateStr = json.data.businessDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
          const inTime = json.data.check_in_time_local || new Date(first_check_in_at).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Dhaka',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          const outTime = (!checkedIn && last_check_out_at)
            ? json.data.check_out_time_local || new Date(last_check_out_at).toLocaleTimeString('en-US', {
                timeZone: 'Asia/Dhaka',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : undefined;

          let deviceBadge: AttendanceLogItem['device'] = 'Web Portal';
          if (json.data.primary_source === 'BioTime Terminal') {
            deviceBadge = 'Device Login';
          } else if (json.data.primary_source === 'Merged (GPS + BioTime)') {
            deviceBadge = 'RFID Scanner';
          }

          const resolvedLocationName =
            json.data.effectiveRecord?.locationName ||
            json.data.effectiveRecord?.branch ||
            json.data.locationName ||
            user.organization ||
            'JAAGO Foundation';

          const todayLogItem: AttendanceLogItem = {
            id: `att-today-${todayDateStr}`,
            employeeId: user.id || empCodeOrId,
            employeeCode: user.employeeCode || empCodeOrId,
            employeeName: user.fullName || 'Staff Member',
            designation: user.jobTitle,
            department: user.department,
            branch: user.organization || 'JAAGO Foundation',
            locationName: resolvedLocationName,
            date: todayDateStr,
            checkInTime: inTime,
            checkOutTime: outTime,
            status: json.data.status === 'Late' || json.data.status === 'late' ? 'Late' : 'Present',
            device: deviceBadge,
            primarySource: json.data.primary_source,
            checkInSource: json.data.check_in_source,
            checkOutSource: json.data.check_out_source,
            sourceBreakdown: json.data.source_breakdown,
            allPunches: json.data.effectiveRecord?.allPunches || [],
            timestamp: new Date(first_check_in_at).toLocaleString(),
            createdBy: user.fullName || 'Self',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notes: json.data.primary_source === 'Merged (GPS + BioTime)'
              ? 'Counted from earliest BioTime/GPS check-in & latest check-out'
              : 'Attendance verified',
          };

          setAllLogs((prev) => {
            const exists = prev.some((l) => l.date === todayDateStr && (l.employeeCode === todayLogItem.employeeCode || l.employeeId === todayLogItem.employeeId));
            if (exists) {
              return prev.map((l) => (l.date === todayDateStr ? { ...l, ...todayLogItem } : l));
            }
            return [todayLogItem, ...prev];
          });
        } else {
          setFirstCheckInTimestamp(null);
          setElapsedSeconds(worked_seconds || 0);
        }

        const activeKey = (empCodeOrId || user.employeeCode || user.id || user.fullName || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        if (typeof window !== 'undefined' && activeKey) {
          if (checkedIn) {
            localStorage.setItem(`jaago_att_${activeKey}_is_checked_in`, 'true');
            if (first_check_in_at) {
              localStorage.setItem(`jaago_att_${activeKey}_checkin_timestamp`, String(new Date(first_check_in_at).getTime()));
              localStorage.setItem(`jaago_att_${activeKey}_first_checkin_time`, json.data.check_in_time_local || '--:--');
            }
            localStorage.removeItem(`jaago_att_${activeKey}_last_checkout_time`);
          } else {
            localStorage.setItem(`jaago_att_${activeKey}_is_checked_in`, 'false');
            localStorage.removeItem(`jaago_att_${activeKey}_checkin_timestamp`);
            if (first_check_in_at) {
              localStorage.setItem(`jaago_att_${activeKey}_first_checkin_time`, json.data.check_in_time_local || '--:--');
            } else {
              localStorage.removeItem(`jaago_att_${activeKey}_first_checkin_time`);
            }
            if (last_check_out_at) {
              localStorage.setItem(`jaago_att_${activeKey}_last_checkout_time`, json.data.check_out_time_local || '--:--');
            } else {
              localStorage.removeItem(`jaago_att_${activeKey}_last_checkout_time`);
            }
            localStorage.setItem(`jaago_att_${activeKey}_worked_seconds`, String(worked_seconds || 0));
          }
        }
      }
    } catch {
      // Fallback
    }
  };

  // Format seconds to HH:MM:SS
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



  // ═════════════════════════════════════════════════════════════════════════
  // ── REGULARIZATION HELPERS ───────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════

  const isEmployeeRegularizationAllowed = (log?: AttendanceLogItem): boolean => {
    const reqEmpCode = (log?.employeeCode || user.employeeCode || '').toLowerCase().trim();
    const reqEmpId = (log?.employeeId || user.id || '').trim();
    const reqEmpName = (log?.employeeName || user.fullName || '').toLowerCase().trim();

    let empList = employees;
    if ((!empList || empList.length === 0) && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('jaago_pnc_employees_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) empList = parsed;
        }
      } catch {}
    }

    const matchedEmp = empList.find(
      (e) =>
        (reqEmpCode && (e.code || '').toLowerCase().trim() === reqEmpCode) ||
        (reqEmpId && (e.id === reqEmpId || (e.userId && e.userId === reqEmpId))) ||
        (reqEmpName && (
          (e.name || '').toLowerCase().trim() === reqEmpName ||
          (e.name || '').toLowerCase().trim().includes(reqEmpName) ||
          reqEmpName.includes((e.name || '').toLowerCase().trim())
        )) ||
        (reqEmpName.includes('nasif') && (e.name || '').toLowerCase().includes('nasif'))
    );
    if (matchedEmp) {
      if (matchedEmp.allowRegularization !== undefined) {
        return matchedEmp.allowRegularization !== false;
      }
      if ((matchedEmp as any).allow_regularization !== undefined) {
        return Boolean((matchedEmp as any).allow_regularization);
      }
      if ((matchedEmp as any).regularization_allowed !== undefined) {
        return Boolean((matchedEmp as any).regularization_allowed);
      }
    }
    if (user.allowRegularization !== undefined) {
      return user.allowRegularization !== false;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('jaago_user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u.allowRegularization !== undefined) {
            return u.allowRegularization !== false;
          }
        }
      } catch {}
    }
    return true;
  };

  const isRowEligibleForRegularization = (log: AttendanceLogItem): boolean => {
    if (!log) return false;

    const statusLower = (log.status || '').toLowerCase().trim();
    const locLower = (log.locationName || '').toLowerCase().trim();
    const notesLower = (log.notes || '').toLowerCase().trim();

    // 0. If already approved, definitely not eligible to apply again!
    const existing = getExistingRegularization(log);
    if (existing?.status === 'Approved') return false;

    // 1. Strict Exclusions: Leave, On Leave, Holiday, Weekend
    if (
      statusLower === 'leave' ||
      statusLower === 'on leave' ||
      statusLower === 'holiday' ||
      statusLower === 'weekend' ||
      locLower === 'on leave' ||
      notesLower.includes('approved leave') ||
      notesLower.includes('leave request') ||
      notesLower.includes('on leave')
    ) {
      return false;
    }

    // 2. Eligible statuses that require correction
    if (log.status === 'Late' || log.status === 'Absent' || log.status === 'Auto Check Out') return true;
    if (log.isAutoCheckout) return true;
    if (log.lateByMin !== undefined && log.lateByMin > 0) return true;

    // 3. Unresolved punches (only if NOT on leave, NOT present/normal)
    if (log.status !== 'Present' && (!log.checkOutTime || log.checkOutTime === '--:--' || log.checkOutTime === 'N/A')) {
      return true;
    }

    return false;
  };

  const getExistingRegularization = (log: AttendanceLogItem): AttendanceRegularizationItem | undefined => {
    if (!log) return undefined;
    const logId = (log.id || '').trim();
    const logDate = (log.date || '').trim();
    const logCode = (log.employeeCode || '').trim().toLowerCase();
    const logName = (log.employeeName || '').trim().toLowerCase();
    const logEmpId = (log.employeeId || '').trim().toLowerCase();

    const userCode = (user.employeeCode || '').trim().toLowerCase();
    const userName = (user.fullName || '').trim().toLowerCase();
    const userId = (user.id || '').trim().toLowerCase();

    return regularizations.find((r) => {
      // 1. Direct ID match
      if (logId && r.attendanceLogId && r.attendanceLogId === logId) return true;
      if (logId && r.id === logId) return true;
      if (r.attendanceLogId && (r.attendanceLogId.includes(logDate) || r.id.includes(logDate))) {
        if (logCode && (r.attendanceLogId.includes(logCode) || r.employeeCode?.toLowerCase() === logCode)) return true;
        if (userCode && (r.attendanceLogId.includes(userCode) || r.employeeCode?.toLowerCase() === userCode)) return true;
      }

      // 2. Match by date + employee (resilient across code, name, id)
      if (r.date === logDate) {
        const rCode = (r.employeeCode || '').trim().toLowerCase();
        const rName = (r.employeeName || '').trim().toLowerCase();
        const rEmpId = (r.employeeId || '').trim().toLowerCase();

        // 2a. Employee code match
        if (logCode && rCode && logCode === rCode) return true;
        if (userCode && rCode && userCode === rCode) return true;

        // 2b. Employee ID match
        if (logEmpId && rEmpId && logEmpId === rEmpId) return true;
        if (userId && rEmpId && userId === rEmpId) return true;

        // 2c. Employee Name match (support exact & substring e.g. "Nasif Kamal" vs "Nasif Kamal - (FO...)")
        if (logName && rName && (logName === rName || logName.includes(rName) || rName.includes(logName))) return true;
        if (userName && rName && (userName === rName || userName.includes(rName) || rName.includes(userName))) return true;
      }

      return false;
    });
  };

  const handleOpenRegularizationModal = (log: AttendanceLogItem) => {
    if (!isEmployeeRegularizationAllowed(log)) {
      alert('Attendance regularization requests are disabled for this employee in profile settings.');
      return;
    }
    const standard = calculateShiftStandardTimes(user.workingSchedule);
    setRegModal({
      isOpen: true,
      log,
      adjustedCheckIn: standard.checkIn,
      adjustedCheckOut: standard.checkOut,
      reason: 'Late Entry Due to Official Field Work / Traffic',
      notes: '',
      isSubmitting: false,
    });
  };

  const handleSubmitRegularization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regModal || !regModal.log) return;
    if (!isEmployeeRegularizationAllowed(regModal.log)) {
      alert('Attendance regularization requests are disabled for this employee in profile settings.');
      return;
    }

    setRegModal((prev) => (prev ? { ...prev, isSubmitting: true } : null));
    try {
      const log = regModal.log;
      // Extract employee details from the log record first
      const reqEmpCode = log.employeeCode || user.employeeCode || '';
      const reqEmpName = log.employeeName || user.fullName || 'User';
      const reqEmpId = log.employeeId || user.id || '';
      const reqDept = log.department || user.department || '';
      const reqDesig = log.designation || user.jobTitle || '';

      // Determine Supervisor dynamically for ALL users across the organization:
      const matchedEmp = employees.find(
        (e) =>
          (reqEmpCode && e.code?.toLowerCase() === reqEmpCode.toLowerCase()) ||
          (reqEmpId && e.id === reqEmpId) ||
          (reqEmpName && e.name?.toLowerCase() === reqEmpName.toLowerCase())
      );

      const targetSupervisorName = matchedEmp?.supervisor || user.manager || 'S M Nayeem Rahman';
      let supervisorName = targetSupervisorName;
      let supervisorEmail = 'nayeem.rahman@jaago.com.bd';

      const supProfile = employees.find(
        (e) =>
          (e.name && e.name.toLowerCase().trim() === targetSupervisorName.toLowerCase().trim()) ||
          (e.code && e.code.toLowerCase().trim() === targetSupervisorName.toLowerCase().trim()) ||
          (targetSupervisorName && e.name && (
            targetSupervisorName.toLowerCase().includes(e.name.toLowerCase().trim()) ||
            e.name.toLowerCase().includes(targetSupervisorName.toLowerCase().trim())
          ))
      );

      if (supProfile?.workEmail && supProfile.workEmail.includes('@') && !supProfile.workEmail.includes('hub.jaago')) {
        supervisorEmail = supProfile.workEmail;
      } else if (supProfile?.personalEmail && supProfile.personalEmail.includes('@')) {
        supervisorEmail = supProfile.personalEmail;
      }

      // Explicit fail-safes for known organizational supervisors
      const supLower = targetSupervisorName.toLowerCase();
      if (supLower.includes('nayeem')) {
        supervisorEmail = 'nayeem.rahman@jaago.com.bd';
      } else if (supLower.includes('korvi')) {
        supervisorEmail = 'korvi@jaago.com.bd';
      } else if (supLower.includes('nasif')) {
        supervisorEmail = 'nasif.kamal@jaago.com.bd';
      }

      await submitAttendanceRegularization({
        attendanceLogId: log.id,
        employeeId: reqEmpId,
        employeeCode: reqEmpCode,
        employeeName: reqEmpName,
        department: reqDept,
        designation: reqDesig,
        date: log.date,
        originalCheckIn: log.checkInTime || '--:--',
        originalCheckOut: log.checkOutTime || '--:--',
        originalStatus: log.status || 'Late',
        originalLateByMin: log.lateByMin,
        adjustedCheckIn: regModal.adjustedCheckIn,
        adjustedCheckOut: regModal.adjustedCheckOut,
        workingSchedule: user.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
        calculatedHours: '8.0h',
        reason: regModal.reason,
        notes: regModal.notes,
        supervisorName,
        supervisorEmail,
      });

      setRegularizations(getLocalRegularizations());
      showToast(`Attendance regularization for ${formatDisplayDate(log.date)} submitted to supervisor!`, 'success');
      setRegModal(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit regularization request', 'error');
      setRegModal((prev) => (prev ? { ...prev, isSubmitting: false } : null));
    }
  };



  // ═════════════════════════════════════════════════════════════════════════
  // ── FILTERED ATTENDANCE LOGS COMPUTATION ─────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════

  const handleDatePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this-week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      setStartDate(monday.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'this-month') {
      const ym = todayStr.substring(0, 7);
      const [y, m] = ym.split('-').map(Number);
      const lastDay = new Date(y!, m!, 0).getDate();
      setStartDate(`${ym}-01`);
      setEndDate(`${ym}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last-month') {
      const prev = new Date();
      prev.setDate(1);
      prev.setMonth(prev.getMonth() - 1);
      const ym = prev.toISOString().substring(0, 7);
      const [y, m] = ym.split('-').map(Number);
      const lastDay = new Date(y!, m!, 0).getDate();
      setStartDate(`${ym}-01`);
      setEndDate(`${ym}-${String(lastDay).padStart(2, '0')}`);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const filteredLogs = useMemo(() => {
    const normUserCode = (user.employeeCode || '').toLowerCase().trim();
    const normUserId = (user.id || '').toLowerCase().trim();
    const normUserName = (user.fullName || '').toLowerCase().trim();

    // 1. Isolate user's personal attendance records
    const userRecords = allLogs.filter((log) => {
      const code = (log.employeeCode || '').toLowerCase().trim();
      const id = (log.employeeId || '').toLowerCase().trim();
      const name = (log.employeeName || '').toLowerCase().trim();
      if (normUserCode && (code === normUserCode || id === normUserCode)) return true;
      if (normUserId && (id === normUserId || code === normUserId)) return true;
      if (normUserName && (name === normUserName || name.includes(normUserName) || normUserName.includes(name))) return true;
      return false;
    });

    // 2. Strict One-Row-Per-Date Deduplication and Merging
    const dailyMap = new Map<string, AttendanceLogItem>();
    userRecords.forEach((log) => {
      const d = log.date;
      if (!d) return;
      if (!dailyMap.has(d)) {
        dailyMap.set(d, log);
      } else {
        const existing = dailyMap.get(d)!;
        const preferNew =
          log.primarySource === 'Merged (GPS + BioTime)' ||
          (log.allPunches && log.allPunches.length > (existing.allPunches?.length || 0)) ||
          (!existing.checkOutTime && log.checkOutTime);

        const primary = preferNew ? log : existing;
        const secondary = preferNew ? existing : log;

        const resolvedLocation =
          (primary.locationName && primary.locationName !== 'JAAGO HQ (Banani)'
            ? primary.locationName
            : secondary.locationName) ||
          primary.locationName ||
          secondary.locationName ||
          'JAAGO Foundation';

        const resolvedPunches =
          primary.allPunches && primary.allPunches.length > 0
            ? primary.allPunches
            : secondary.allPunches || [];

        const merged: AttendanceLogItem = {
          ...secondary,
          ...primary,
          locationName: resolvedLocation,
          allPunches: resolvedPunches,
          primarySource: primary.primarySource || secondary.primarySource,
          checkInSource: primary.checkInSource || secondary.checkInSource,
          checkOutSource: primary.checkOutSource || secondary.checkOutSource,
          sourceBreakdown: primary.sourceBreakdown || secondary.sourceBreakdown,
          notes: primary.notes || secondary.notes,
        };

        dailyMap.set(d, merged);
      }
    });

    const uniqueDailyLogs = Array.from(dailyMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // 3. Apply search, status, and date filters
    return uniqueDailyLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.employeeName?.toLowerCase().includes(q) ||
        log.employeeCode?.toLowerCase().includes(q) ||
        log.locationName?.toLowerCase().includes(q) ||
        log.branch?.toLowerCase().includes(q) ||
        log.date?.includes(q) ||
        log.notes?.toLowerCase().includes(q) ||
        log.device?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'All Status' ||
        (statusFilter === 'Auto Check Out' && (log.status === 'Auto Check Out' || log.isAutoCheckout)) ||
        log.status === statusFilter;

      const matchesDateRange =
        (!startDate || log.date >= startDate) &&
        (!endDate || log.date <= endDate);

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [allLogs, user.employeeCode, user.id, user.fullName, searchQuery, statusFilter, startDate, endDate]);

  // Grouped by Month for Month-wise logs table
  const monthGroupedLogs = useMemo(() => {
    const groups = new Map<string, AttendanceLogItem[]>();
    filteredLogs.forEach((log) => {
      const ym = log.date ? log.date.substring(0, 7) : new Date().toISOString().substring(0, 7);
      if (!groups.has(ym)) groups.set(ym, []);
      groups.get(ym)!.push(log);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredLogs]);

  // Regularization Column Visibility: Checked against user profile & employee records
  const showRegularizationColumn = useMemo(() => {
    if (user.allowRegularization !== undefined && user.allowRegularization === false) {
      return false;
    }
    if (!isEmployeeRegularizationAllowed()) {
      return false;
    }
    if (filteredLogs && filteredLogs.length > 0) {
      const firstLog = filteredLogs[0];
      if (!isEmployeeRegularizationAllowed(firstLog)) {
        return false;
      }
    }
    return true;
  }, [user, employees, filteredLogs]);
  const formatMonthTitle = (ym: string) => {
    try {
      const [y, m] = ym.split('-');
      const d = new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return ym;
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // ── RECORD ACTIONS (EDIT / DELETE) ───────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════

  const handleOpenEditModal = (log: AttendanceLogItem) => {
    setEditingLog(log);
    setFormData({
      employeeId: log.employeeId,
      employeeCode: log.employeeCode,
      employeeName: log.employeeName,
      designation: log.designation,
      department: log.department,
      branch: log.branch,
      status: log.status,
      device: log.device,
      date: log.date || new Date().toISOString().slice(0, 10),
      checkInTime: log.checkInTime || '09:00 AM',
      checkOutTime: log.checkOutTime || '06:00 PM',
      locationName: log.locationName || 'JAAGO HQ (Banani)',
      notes: log.notes || '',
    });
    setShowLogModal(true);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName) {
      showToast('Please select an employee', 'error');
      return;
    }

    recordLocalAttendanceLog({
      employeeId: formData.employeeId,
      employeeCode: formData.employeeCode,
      employeeName: formData.employeeName,
      designation: formData.designation,
      department: formData.department,
      branch: formData.branch,
      date: formData.date,
      checkInTime: formData.checkInTime,
      checkOutTime: formData.checkOutTime,
      status: formData.status,
      device: formData.device,
      locationName: formData.locationName,
      isAutoCheckout: formData.status === 'Auto Check Out',
      notes: formData.notes,
    });

    setAllLogs(getLocalAttendanceLogs());
    showToast(`Attendance record for ${formData.employeeName} saved successfully!`);
    setShowLogModal(false);
  };

  const handleDeleteRecord = (id: string, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      ids: [id],
      names: name,
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirm({
      isOpen: true,
      ids: [...selectedIds],
      names: `${selectedIds.length} selected record(s)`,
    });
  };

  const executeDelete = () => {
    if (!isSuperAdmin) {
      showToast('Action forbidden: Only Super Admins are authorized to delete attendance records.', 'error');
      setDeleteConfirm({ isOpen: false, ids: [], names: '' });
      return;
    }

    if (deleteConfirm.ids.length === 1 && deleteConfirm.ids[0]) {
      const updated = deleteLocalAttendanceLog(deleteConfirm.ids[0]);
      setAllLogs(updated);
      showToast('Attendance record deleted successfully!');
    } else if (deleteConfirm.ids.length > 1) {
      const updated = deleteMultipleLocalAttendanceLogs(deleteConfirm.ids);
      setAllLogs(updated);
      showToast(`${deleteConfirm.ids.length} attendance records deleted successfully!`);
    }
    const deletedIdSet = new Set(deleteConfirm.ids);
    setSelectedIds((prev) => prev.filter((id) => !deletedIdSet.has(id)));
    setDeleteConfirm({ isOpen: false, ids: [], names: '' });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredLogs.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('No attendance records to export.', 'info');
      return;
    }

    const headers = [
      'Date',
      'Day',
      'Check In',
      'Check In Source',
      'Check Out',
      'Check Out Source',
      'Location',
      'Latitude',
      'Longitude',
      'Working Hours',
      'Status',
      'Notes / Verification',
      'Regularization Status',
    ];

    const rows = filteredLogs.map((log) => {
      const duration = calculateWorkingHoursString(log.checkInTime, log.checkOutTime);
      const locName = log.locationName || log.branch || 'JAAGO HQ (Banani)';
      const lat = log.checkInLat ?? 23.7937;
      const lng = log.checkInLng ?? 90.4066;
      const reg = getExistingRegularization(log);
      const regStatus = reg?.status || (isRowEligibleForRegularization(log) ? 'Eligible' : '--');
      const note = log.notes || (log.status === 'Auto Check Out' ? 'Auto check-out generated after 11:30 PM' : 'GPS Geofence Verified');

      return [
        `"${formatDisplayDate(log.date)}"`,
        `"${getWeekdayShort(log.date)}"`,
        `"${log.checkInTime || '--:--'}"`,
        `"${log.checkInSource || log.device || 'GPS'}"`,
        `"${log.checkOutTime || '--:--'}"`,
        `"${log.status === 'Auto Check Out' ? 'Auto (11:30 PM)' : (log.checkOutSource || log.device || '--')}"`,
        `"${locName.replace(/"/g, '""')}"`,
        `"${lat.toFixed(4)}"`,
        `"${lng.toFixed(4)}"`,
        `"${duration}"`,
        `"${log.status}"`,
        `"${note.replace(/"/g, '""')}"`,
        `"${regStatus}"`,
      ].join(',');
    });

    // Use UTF-8 BOM (\uFEFF) for optimal Excel compatibility on Windows
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JAAGO_Attendance_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredLogs.length} attendance records to CSV successfully!`);
  };

  return (
    <div className="max-w-[1700px] mx-auto text-foreground pb-24 md:pb-28 space-y-6 select-none relative">
      {/* ── FLOATING TOAST NOTIFICATION ── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs font-bold transition transform animate-in slide-in-from-top-3 duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-500 text-white shadow-rose-500/25'
              : toast.type === 'info'
              ? 'bg-blue-500 text-white shadow-blue-500/25'
              : 'bg-emerald-500 text-white shadow-emerald-500/25'
          }`}
        >
          {toast.type === 'error' ? (
            <X className="h-4 w-4 stroke-[3]" />
          ) : (
            <CheckCircle2 className="h-4 w-4 stroke-[3]" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 1. HEADER & BREADCRUMB ────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center space-x-2.5">
            <Clock className="h-7 w-7 text-amber-500" />
            <span>Attendance &amp; Live Logs</span>
          </h1>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground mt-1">
            <span>JAAGO HUB</span>
            <span>&bull;</span>
            <span>Attendance &amp; Leave</span>
            <span>&bull;</span>
            <span className="text-primary font-bold">Attendance</span>
          </div>
        </div>

        {/* ── Active View Pill ── */}
        <div className="flex items-center">
          <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm select-none">
            My Attendance &amp; Punch
          </span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 2. FILTER TOOLBAR (DATE RANGE, STATUS, MONTH-WISE) ─────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Top Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search by Employee, Location or Notes */}
          <div className="relative lg:col-span-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by location, date, status, notes..."
              className="w-full h-11 pl-9 pr-4 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            >
              <option value="All Status">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late (+Minutes)</option>
              <option value="Auto Check Out">Auto Check Out (11:30 PM)</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
              <option value="On Duty">On Duty</option>
              <option value="Leave">Leave</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full h-11 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('all');
              }}
              className="w-full h-11 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            />
          </div>
        </div>

        {/* Quick Date Presets & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1">Quick Range:</span>
            {[
              { id: 'this-month', label: 'This Month' },
              { id: 'today', label: 'Today' },
              { id: 'this-week', label: 'This Week' },
              { id: 'last-month', label: 'Last Month' },
              { id: 'all', label: 'All Records' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleDatePresetChange(preset.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-surface hover:bg-surface/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* View Grouping (Flat vs Month-grouped) */}
          <div className="flex items-center space-x-1.5 bg-surface p-1 rounded-xl border border-border text-xs">
            <button
              onClick={() => setViewGrouping('flat')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewGrouping === 'flat' ? 'bg-primary/20 text-foreground font-black' : 'text-muted-foreground'
              }`}
            >
              Continuous Table
            </button>
            <button
              onClick={() => setViewGrouping('month-grouped')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                viewGrouping === 'month-grouped' ? 'bg-primary/20 text-foreground font-black' : 'text-muted-foreground'
              }`}
            >
              Month-wise Grouped
            </button>
          </div>
        </div>
      </div>

      {/* ── BULK SELECTION ACTION BAR ── */}
      {isSuperAdmin && selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs shadow-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3 text-rose-500 font-bold">
            <div className="h-8 w-8 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-rose-500" />
            </div>
            <div>
              <span className="text-sm font-black text-foreground">
                {selectedIds.length} Record{selectedIds.length > 1 ? 's' : ''} Selected
              </span>
              <p className="text-[11px] text-muted-foreground font-normal">
                Perform bulk operations on selected attendance entries
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface/80 border border-border text-foreground font-bold text-xs transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition cursor-pointer flex items-center space-x-1.5 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 5. ATTENDANCE LOGS TABLE (EXCEL SPREADSHEET VIEW) ──────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        {/* ── EXCEL SPREADSHEET TOOLBAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-surface/70 border-b border-border/80 text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold text-[11px] select-none">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
              <span>Spreadsheet View</span>
            </div>
            <span className="text-muted-foreground font-medium text-xs">
              Showing <strong className="text-foreground font-bold">{filteredLogs.length}</strong> record{filteredLogs.length !== 1 ? 's' : ''}
              {selectedIds.length > 0 && (
                <span className="ml-1.5 text-amber-500 font-bold">({selectedIds.length} selected)</span>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface/80 border border-border text-foreground font-bold text-xs shadow-2xs transition cursor-pointer active:scale-95"
              title="Download attendance records as Excel-compatible CSV file"
            >
              <Download className="h-3.5 w-3.5 text-emerald-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {viewGrouping === 'month-grouped' ? (
          // Month-wise Grouped View
          <div className="divide-y divide-border/60">
            {monthGroupedLogs.length > 0 ? (
              monthGroupedLogs.map(([monthKey, logsInMonth]) => (
                <div key={monthKey} className="p-4 space-y-2.5">
                  {/* Month Header Banner */}
                  <div className="flex items-center justify-between bg-surface/50 border border-border px-3.5 py-2 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      <span className="font-extrabold text-sm text-foreground">
                        {formatMonthTitle(monthKey)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-foreground font-mono text-xs font-bold">
                        {logsInMonth.length} Log{logsInMonth.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground font-medium flex items-center space-x-3">
                      <span>Present: <strong className="text-emerald-500">{logsInMonth.filter((l) => l.status === 'Present' || l.status === 'Late' || l.status === 'Auto Check Out').length}</strong></span>
                      <span>Late: <strong className="text-rose-500">{logsInMonth.filter((l) => l.status === 'Late').length}</strong></span>
                      <span>Auto Out: <strong className="text-amber-500">{logsInMonth.filter((l) => l.status === 'Auto Check Out' || l.isAutoCheckout).length}</strong></span>
                    </div>
                  </div>

                  {/* Month Subtable */}
                  <div className="overflow-x-auto rounded-xl border border-border/70">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/80 bg-surface/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                          <th className="py-2 px-2.5 w-[120px] whitespace-nowrap border-r border-border/50">Date &amp; Day</th>
                          <th className="py-2 px-2.5 w-[100px] whitespace-nowrap border-r border-border/50">Check In</th>
                          <th className="py-2 px-2.5 w-[100px] whitespace-nowrap border-r border-border/50">Check Out</th>
                          <th className="py-2 px-2.5 min-w-[160px] border-r border-border/50">GPS Location &amp; Coordinates</th>
                          <th className="py-2 px-2.5 w-[90px] whitespace-nowrap border-r border-border/50">Working Hours</th>
                          <th className="py-2 px-2.5 w-[95px] whitespace-nowrap border-r border-border/50">Status</th>
                          <th className="py-2 px-2.5 w-[150px] max-w-[160px] whitespace-nowrap border-r border-border/50">Notes / Verification</th>
                          {showRegularizationColumn && (
                            <th className="py-2 px-2.5 w-[110px] whitespace-nowrap text-center border-r border-border/50">Regularization</th>
                          )}
                          <th className="py-2 px-2.5 w-[85px] whitespace-nowrap text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-medium">
                        {logsInMonth.map((log) => (
                          <AttendanceLogRow
                            key={log.id}
                            log={log}
                            isSuperAdmin={isSuperAdmin}
                            isOnDuty={isOnDutyRecord(log)}
                            isEligibleForReg={isRowEligibleForRegularization(log)}
                            isRegAllowed={isEmployeeRegularizationAllowed(log)}
                            showRegularizationColumn={showRegularizationColumn}
                            existingReg={getExistingRegularization(log)}
                            onRegularize={handleOpenRegularizationModal}
                            onEdit={handleOpenEditModal}
                            onDelete={handleDeleteRecord}
                            onViewGps={(l) => setGpsDetailModal({ isOpen: true, log: l })}
                            onViewPunches={(l) => setPunchAuditModal({ isOpen: true, log: l })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="font-bold text-sm">No attendance records found</p>
                <p className="text-xs text-muted-foreground/70">
                  Try adjusting the date range or status filters.
                </p>
              </div>
            )}
          </div>
        ) : (
          // Continuous Table View
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-surface/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
                  {isSuperAdmin && (
                    <th className="py-2 px-2.5 w-9 text-center border-r border-border/50">
                      <input
                        type="checkbox"
                        checked={
                          filteredLogs.length > 0 &&
                          selectedIds.length === filteredLogs.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="py-2 px-2.5 w-[120px] whitespace-nowrap border-r border-border/50">Date &amp; Day</th>
                  <th className="py-2 px-2.5 w-[100px] whitespace-nowrap border-r border-border/50">Check In</th>
                  <th className="py-2 px-2.5 w-[100px] whitespace-nowrap border-r border-border/50">Check Out</th>
                  <th className="py-2 px-2.5 min-w-[160px] border-r border-border/50">GPS Location &amp; Coordinates</th>
                  <th className="py-2 px-2.5 w-[90px] whitespace-nowrap border-r border-border/50">Working Hours</th>
                  <th className="py-2 px-2.5 w-[95px] whitespace-nowrap border-r border-border/50">Status</th>
                  <th className="py-2 px-2.5 w-[150px] max-w-[160px] whitespace-nowrap border-r border-border/50">Notes / Verification</th>
                  {showRegularizationColumn && (
                    <th className="py-2 px-2.5 w-[110px] whitespace-nowrap text-center border-r border-border/50">Regularization</th>
                  )}
                  <th className="py-2 px-2.5 w-[85px] whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const duration = calculateWorkingHoursString(log.checkInTime, log.checkOutTime);
                    const todayDhakaStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
                    const isToday = log.date === todayDhakaStr;
                    const locName = log.locationName || log.branch || 'JAAGO HQ (Banani)';
                    const lat = log.checkInLat ?? 23.7937;
                    const lng = log.checkInLng ?? 90.4066;
                    const eligibleForReg = isRowEligibleForRegularization(log);
                    const existingReg = getExistingRegularization(log);

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.06] transition-colors duration-100 border-b border-border/40 group ${isToday ? 'bg-primary/5' : 'odd:bg-background even:bg-surface/20'}`}
                      >
                        {/* Checkbox (Super Admin only) */}
                        {isSuperAdmin && (
                          <td className="py-1.5 px-2.5 text-center border-r border-border/30">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(log.id)}
                              onChange={() => handleToggleSelect(log.id)}
                              className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* Date & Day */}
                        <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono tabular-nums font-bold text-foreground text-xs">
                              {formatDisplayDate(log.date)}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                Today
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium">
                            {getWeekdayShort(log.date)}
                          </div>
                        </td>

                        {/* Check In Time & Source */}
                        <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
                          <div className="font-mono tabular-nums font-bold text-emerald-500 text-xs">
                            {log.checkInTime || '--:--'}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {log.checkInSource === 'BIOTIME' || log.device === 'BioTime Terminal' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                <Fingerprint className="w-2.5 h-2.5" />
                                BioTime
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-muted text-muted-foreground border border-border">
                                <Smartphone className="w-2.5 h-2.5" />
                                {log.device || 'GPS'}
                              </span>
                            )}
                            {log.allPunches && log.allPunches.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setPunchAuditModal({ isOpen: true, log })}
                                className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8.5px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 cursor-pointer"
                                title={`View all ${log.allPunches.length} punches`}
                              >
                                <Layers className="w-2.5 h-2.5" />
                                {log.allPunches.length}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Check Out Time & Source */}
                        <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
                          <div className="font-mono tabular-nums font-bold text-rose-500 text-xs">
                            {isToday && isCheckedIn ? '--:--' : (log.checkOutTime && log.checkOutTime !== '--:--' ? log.checkOutTime : '--:--')}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {isToday && isCheckedIn ? (
                              <span className="text-[10px] text-muted-foreground">--</span>
                            ) : log.status === 'Auto Check Out' || log.isAutoCheckout ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                Auto (11:30 PM)
                              </span>
                            ) : log.checkOutSource?.toUpperCase() === 'BIOTIME' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                <Fingerprint className="w-2.5 h-2.5" />
                                BioTime
                              </span>
                            ) : log.checkOutTime && log.checkOutTime !== '--:--' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-muted text-muted-foreground border border-border">
                                <Smartphone className="w-2.5 h-2.5" />
                                {log.device || 'GPS'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">--</span>
                            )}
                          </div>
                        </td>

                        {/* GPS Coordinate Location Name */}
                        <td className="py-1.5 px-2.5 border-r border-border/30">
                          <div className="flex items-start space-x-1.5 min-w-0">
                            <MapPin className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-bold text-foreground text-xs truncate max-w-[170px]" title={locName}>
                                {locName}
                              </div>
                              <div className="font-mono tabular-nums text-[10px] text-muted-foreground flex items-center space-x-1 whitespace-nowrap">
                                <span>Lat: {lat.toFixed(3)}, Lng: {lng.toFixed(3)}</span>
                                <button
                                  type="button"
                                  onClick={() => setGpsDetailModal({ isOpen: true, log })}
                                  className="text-primary hover:underline font-bold text-[10px] ml-1 cursor-pointer"
                                  title="View GPS Map Audit"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Working Hours Duration */}
                        <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
                          <div className="font-mono tabular-nums font-extrabold text-foreground text-xs">
                            {isToday && isCheckedIn ? (
                              <span className="inline-flex items-center space-x-1.5" title={`Live elapsed: ${formatTime(elapsedSeconds)}`}>
                                <span>{`${Math.floor(elapsedSeconds / 3600)}h ${String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}m`}</span>
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                              </span>
                            ) : (
                              log.workedDisplay || duration
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Target: 8.0h
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
                          {log.status === 'Present' ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-black">
                              Present
                            </span>
                          ) : log.status === 'Late' ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-black">
                              Late {log.lateByMin ? `+${log.lateByMin}m` : ''}
                            </span>
                          ) : log.status === 'Auto Check Out' || log.isAutoCheckout ? (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-black">
                              Auto Check Out
                            </span>
                          ) : log.status === 'Absent' ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-black">
                              Absent
                            </span>
                          ) : log.status === 'Leave' ? (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-black">
                              Leave
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-surface text-muted-foreground border border-border text-[10px] font-bold">
                              {log.status}
                            </span>
                          )}
                        </td>

                        {/* Notes / Verification (Auto-adjusted & reduced width) */}
                        <td className="py-1.5 px-2.5 w-[150px] max-w-[160px] border-r border-border/30">
                          {isOnDutyRecord(log) ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold tracking-wide whitespace-nowrap shadow-2xs">
                              <Radio className="h-2.5 w-2.5 text-amber-500 animate-pulse" />
                              <span>On Duty</span>
                            </span>
                          ) : (() => {
                            const noteText = log.notes || (log.status === 'Auto Check Out' ? 'Auto check-out generated after 11:30 PM' : 'GPS Geofence Verified');
                            return (
                              <div
                                className="text-[11px] text-muted-foreground truncate max-w-[145px] cursor-help"
                                title={noteText}
                              >
                                {noteText}
                              </div>
                            );
                          })()}
                        </td>

                        {/* ── REGULARIZATION COLUMN ── */}
                        {showRegularizationColumn && (
                          <td className="py-1.5 px-2.5 text-center whitespace-nowrap border-r border-border/30">
                            {(() => {
                              if (existingReg?.status === 'Approved') {
                                return (
                                  <span
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-black tracking-wide shadow-2xs"
                                    title={`Regularized (Approved by ${existingReg.approvedBy || 'Supervisor'}): ${existingReg.reason}`}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-0.5 text-emerald-500" />
                                    <span>R.Approved</span>
                                  </span>
                                );
                              }

                              if (existingReg?.status === 'Pending') {
                                return (
                                  <span
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-black tracking-wide shadow-2xs"
                                    title="Regularization request submitted and pending supervisor review"
                                  >
                                    <Clock className="h-3 w-3 mr-0.5 animate-spin text-amber-500" />
                                    <span>Pending</span>
                                  </span>
                                );
                              }

                              if (existingReg?.status === 'Refused' || existingReg?.status === 'Rejected') {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRegularizationModal(log)}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 text-[9.5px] font-black transition cursor-pointer active:scale-95 shadow-2xs"
                                    title={`Refused by ${existingReg.approvedBy || 'Supervisor'}${existingReg.refusalNote ? `: "${existingReg.refusalNote}"` : ''} - Click to re-apply`}
                                  >
                                    <XCircle className="h-3 w-3 mr-0.5 text-rose-500 group-hover:text-white" />
                                    <span>R.Refused</span>
                                  </button>
                                );
                              }

                              if (!eligibleForReg) {
                                return <span className="text-muted-foreground/30 font-bold text-xs">--</span>;
                              }

                              if (!isEmployeeRegularizationAllowed(log)) {
                                return (
                                  <span
                                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground border border-border/40 text-[10px] font-bold tracking-wide cursor-not-allowed"
                                    title="Regularization requests are disabled for this employee in profile"
                                  >
                                    Disabled
                                  </span>
                                );
                              }

                              // If eligible and not regularized yet: Show Regularize button
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRegularizationModal(log)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/30 hover:border-amber-500 text-[10.5px] font-black tracking-wide shadow-2xs transition duration-150 cursor-pointer inline-flex items-center space-x-1 active:scale-95"
                                  title="Click to regularize check-in/out times based on shift"
                                >
                                  <span>Regularize</span>
                                </button>
                              );
                            })()}
                          </td>
                        )}

                        {/* Actions Column */}
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-0.5">
                            {/* View Punch Breakdown / Audit */}
                            <button
                              type="button"
                              onClick={() => setPunchAuditModal({ isOpen: true, log })}
                              className="p-1 rounded-md hover:bg-cyan-500/10 text-muted-foreground hover:text-cyan-600 transition cursor-pointer"
                              title="View Multi-Source Punch Audit (BioTime + GPS)"
                            >
                              <Fingerprint className="h-3.5 w-3.5" />
                            </button>

                            {/* View GPS Details - Available to all */}
                            <button
                              type="button"
                              onClick={() => setGpsDetailModal({ isOpen: true, log })}
                              className="p-1 rounded-md hover:bg-surface text-muted-foreground hover:text-primary transition cursor-pointer"
                              title="View GPS details"
                            >
                              <Globe className="h-3.5 w-3.5" />
                            </button>

                            {/* Edit & Delete - Restricted to Super Admin */}
                            {isSuperAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(log)}
                                  className="p-1 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
                                  title="Edit Record (Super Admin)"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(log.id, `${log.employeeName} (${formatDisplayDate(log.date)})`)}
                                  className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                                  title="Delete Record (Super Admin Only)"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isSuperAdmin ? (showRegularizationColumn ? 10 : 9) : (showRegularizationColumn ? 9 : 8)} className="py-14 text-center text-muted-foreground">
                      <Clock className="h-9 w-9 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="font-bold text-sm">No attendance records found</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        Log your attendance entry using &quot;Manual Entry&quot; or check in via GPS.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 0: COMPACT ATTENDANCE REGULARIZATION MODAL ──────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {regModal && regModal.isOpen && regModal.log && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-amber-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 space-y-4 p-5 sm:p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-xs">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Attendance Regularization</h3>
                  <p className="text-[11px] text-muted-foreground">Shift-based auto correction &amp; supervisor approval</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegModal(null)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Date & Shift Info Badge */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-surface/70 border border-border text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Date</span>
                <span className="font-mono font-bold text-foreground">{formatDisplayDate(regModal.log.date)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assigned Shift</span>
                <span className="font-bold text-amber-500">{user.workingSchedule}</span>
              </div>
            </div>

            {/* 2-Column Comparison Table */}
            <div className="rounded-2xl border border-border/80 overflow-hidden bg-card/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface/80 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Original Record</th>
                    <th className="py-2.5 px-3 text-amber-500">Adjusted (Editable)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {/* Row 1: Check In */}
                  <tr>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans font-bold">Check In</td>
                    <td className="py-2.5 px-3 text-rose-500 font-bold">
                      {regModal.log.checkInTime || '--:--'}
                      {regModal.log.lateByMin ? ` (+${regModal.log.lateByMin}m)` : ''}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={regModal.adjustedCheckIn}
                        onChange={(e) =>
                          setRegModal((prev) => (prev ? { ...prev, adjustedCheckIn: e.target.value } : null))
                        }
                        className="w-28 px-2.5 py-1 rounded-lg bg-surface border border-amber-500/40 text-xs font-bold text-emerald-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="10:00 AM"
                      />
                    </td>
                  </tr>

                  {/* Row 2: Check Out */}
                  <tr>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans font-bold">Check Out</td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {regModal.log.checkOutTime || (regModal.log.status === 'Auto Check Out' ? 'Auto 11:30 PM' : '--:--')}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={regModal.adjustedCheckOut}
                        onChange={(e) =>
                          setRegModal((prev) => (prev ? { ...prev, adjustedCheckOut: e.target.value } : null))
                        }
                        className="w-28 px-2.5 py-1 rounded-lg bg-surface border border-amber-500/40 text-xs font-bold text-emerald-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="06:00 PM"
                      />
                    </td>
                  </tr>

                  {/* Row 3: Status */}
                  <tr>
                    <td className="py-2.5 px-3 text-muted-foreground font-sans font-bold">Status</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-black bg-rose-500/15 text-rose-500">
                        {regModal.log.status || 'Late'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-black bg-emerald-500/15 text-emerald-500">
                        Present (On Time)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Form Inputs: Reason & Justification */}
            <form onSubmit={handleSubmitRegularization} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Regularization Reason <span className="text-amber-500">*</span>
                </label>
                <select
                  value={regModal.reason}
                  onChange={(e) =>
                    setRegModal((prev) => (prev ? { ...prev, reason: e.target.value } : null))
                  }
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-xs"
                >
                  <option value="Late Entry Due to Official Field Work / Traffic">
                    Late Entry Due to Official Field Work / Traffic
                  </option>
                  <option value="Biometric Device / Scanner Sync Delay">
                    Biometric Device / Scanner Sync Delay
                  </option>
                  <option value="System Auto Check-Out Override (Work from Home / Field)">
                    System Auto Check-Out Override (Work from Home / Field)
                  </option>
                  <option value="Forgot to Check In / Out">
                    Forgot to Check In / Out
                  </option>
                  <option value="Duty Reschedule / Off-Site Meeting">
                    Duty Reschedule / Off-Site Meeting
                  </option>
                  <option value="Other / Manual Justification">
                    Other / Manual Justification
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Detailed Explanation / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={regModal.notes}
                  onChange={(e) =>
                    setRegModal((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                  placeholder="Provide context for your supervisor..."
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Assigned Supervisor Info */}
              <div className="p-2.5 rounded-xl bg-surface/50 border border-border/80 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Direct Supervisor:</span>
                <strong className="text-foreground">
                  {(() => {
                    const log = regModal?.log;
                    const emp = log
                      ? employees.find(
                          (e) =>
                            (log.employeeCode && e.code?.toLowerCase() === log.employeeCode.toLowerCase()) ||
                            (log.employeeId && e.id === log.employeeId) ||
                            (log.employeeName && e.name?.toLowerCase() === log.employeeName.toLowerCase())
                        )
                      : null;
                    return emp?.supervisor || user.manager || 'S M Nayeem Rahman';
                  })()}
                </strong>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setRegModal(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-surface hover:text-foreground transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regModal.isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{regModal.isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: GPS MAP & LOCATION AUDIT MODAL ───────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {gpsDetailModal.isOpen && gpsDetailModal.log && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">GPS Location Audit</h3>
                  <p className="text-xs text-muted-foreground">Geofence &amp; Coordinate Verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGpsDetailModal({ isOpen: false, log: null })}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Map Visual Representation Box */}
            <div className="h-44 w-full rounded-2xl bg-gradient-to-br from-slate-900 via-zinc-900 to-neutral-900 border border-border/70 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              <div className="h-28 w-28 rounded-full border border-emerald-500/40 flex items-center justify-center relative animate-pulse">
                <div className="h-16 w-16 rounded-full border border-emerald-500/60" />
                <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_15px_#10B981]" />
              </div>
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-bold">
                ✓ Geofence Verified: {gpsDetailModal.log.locationName || 'JAAGO HQ (Banani)'}
              </div>
            </div>

            {/* Details Matrix */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface/60 border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Designated Office</div>
                <div className="font-bold text-foreground pt-0.5">{gpsDetailModal.log.locationName || gpsDetailModal.log.branch || 'JAAGO HQ (Banani)'}</div>
              </div>
              <div className="p-3 rounded-xl bg-surface/60 border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Business Date</div>
                <div className="font-bold font-mono text-foreground pt-0.5">{formatDisplayDate(gpsDetailModal.log.date)}</div>
              </div>
              <div className="p-3 rounded-xl bg-surface/60 border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Latitude Coordinate</div>
                <div className="font-bold font-mono text-emerald-500 pt-0.5">{gpsDetailModal.log.checkInLat ?? 23.7937}° N</div>
              </div>
              <div className="p-3 rounded-xl bg-surface/60 border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Longitude Coordinate</div>
                <div className="font-bold font-mono text-emerald-500 pt-0.5">{gpsDetailModal.log.checkInLng ?? 90.4066}° E</div>
              </div>
              <div className="p-3 rounded-xl bg-surface/60 border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Check-In / Out Time</div>
                <div className="font-bold font-mono text-foreground pt-0.5">{gpsDetailModal.log.checkInTime || '--:--'} &bull; {gpsDetailModal.log.checkOutTime || '--:--'}</div>
              </div>
              <div className="p-3 rounded-xl bg-surface/60 border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Punch Method</div>
                <div className="font-bold text-foreground pt-0.5">{gpsDetailModal.log.device}</div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setGpsDetailModal({ isOpen: false, log: null })}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: MULTI-SOURCE PUNCH AUDIT & MERGED BREAKDOWN MODAL ─────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {punchAuditModal.isOpen && punchAuditModal.log && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-4 p-6 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Multi-Source Punch Audit</h3>
                  <p className="text-xs text-muted-foreground">
                    Chronological physical punches &amp; First-In / Last-Out resolution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPunchAuditModal({ isOpen: false, log: null })}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-surface/60 border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Employee</div>
                <div className="font-bold text-foreground pt-0.5 truncate">{punchAuditModal.log.employeeName}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{punchAuditModal.log.employeeCode}</div>
              </div>

              <div className="p-3 rounded-xl bg-surface/60 border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Effective Check-In</div>
                <div className="font-mono font-bold text-emerald-500 pt-0.5 text-xs sm:text-sm">
                  {punchAuditModal.log.checkInTime || '--:--'}
                </div>
                <div className="text-[10px] text-muted-foreground font-sans">
                  First Punch (MIN rule)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface/60 border border-border">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Effective Check-Out</div>
                <div className="font-mono font-bold text-rose-500 pt-0.5 text-xs sm:text-sm">
                  {punchAuditModal.log.checkOutTime || '--:--'}
                </div>
                <div className="text-[10px] text-muted-foreground font-sans">
                  Last Punch (MAX rule)
                </div>
              </div>
            </div>

            {/* Raw Punch Table */}
            <div className="flex-1 overflow-y-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 sticky top-0 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Punch Source</th>
                    <th className="p-2.5">Device / Terminal</th>
                    <th className="p-2.5">Direction</th>
                    <th className="p-2.5 text-right">Counted Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                  {punchAuditModal.log.allPunches && punchAuditModal.log.allPunches.length > 0 ? (
                    punchAuditModal.log.allPunches.map((p, idx) => {
                      const displayTime =
                        p.time ||
                        (p.punchAt
                          ? new Date(p.punchAt).toLocaleTimeString('en-US', {
                              timeZone: 'Asia/Dhaka',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : '--:--');
                      const isCountedIn = p.isCountedCheckIn || displayTime === punchAuditModal.log?.checkInTime;
                      const isCountedOut = p.isCountedCheckOut || (punchAuditModal.log?.checkOutTime && displayTime === punchAuditModal.log.checkOutTime);
                      const isBio = String(p.source).toLowerCase() === 'biotime';

                      return (
                        <tr
                          key={idx}
                          className={
                            isCountedIn
                              ? 'bg-emerald-500/10'
                              : isCountedOut
                              ? 'bg-cyan-500/10'
                              : 'hover:bg-surface/50'
                          }
                        >
                          <td className="p-2.5 font-bold text-foreground">
                            {displayTime}
                          </td>
                          <td className="p-2.5">
                            {isBio ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-sans">
                                <Fingerprint className="w-3 h-3" />
                                BioTime Biometric
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-sans">
                                <Smartphone className="w-3 h-3" />
                                GPS Geofence
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-muted-foreground font-sans text-xs">
                            {p.terminalName || p.terminalSn || (isBio ? 'Banani HQ Terminal' : punchAuditModal.log?.locationName || 'GPS Location')}
                          </td>
                          <td className="p-2.5 font-sans">
                            {String(p.punchType).toLowerCase() === 'check_in' ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Check-In</span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">Check-Out</span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-sans">
                            {isCountedIn ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                                ✓ Counted In (MIN)
                              </span>
                            ) : isCountedOut ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-600 text-white">
                                ✓ Counted Out (MAX)
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">
                                Intermediate Punch
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground font-sans">
                        Single recorded punch pair for this business date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/70 text-xs">
              <span className="text-[11px] text-muted-foreground font-sans">
                Rule: Pool(GPS + BioTime) &rarr; Counted In = MIN(In), Counted Out = MAX(Out)
              </span>
              <button
                type="button"
                onClick={() => setPunchAuditModal({ isOpen: false, log: null })}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: MANUAL ENTRY / EDIT ATTENDANCE RECORD MODAL ──────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/70">
              <h2 className="text-lg font-black text-foreground tracking-tight">
                {editingLog ? 'Edit Attendance Log' : 'Log New Attendance Entry'}
              </h2>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Employee */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Employee <span className="text-amber-500">*</span>
                  </label>
                  <select
                    value={formData.employeeCode}
                    onChange={(e) => {
                      const emp = employees.find((emp) => emp.code === e.target.value);
                      if (emp) {
                        setFormData((prev) => ({
                          ...prev,
                          employeeId: emp.id,
                          employeeCode: emp.code,
                          employeeName: emp.name,
                          designation: emp.designation,
                          department: emp.department,
                          branch: emp.branch,
                        }));
                      }
                    }}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    {employees.map((emp) => (
                      <option key={emp.code} value={emp.code}>
                        {emp.name} ({emp.code}) &bull; {emp.designation}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Auto Check Out">Auto Check Out</option>
                    <option value="Absent">Absent</option>
                    <option value="Half Day">Half Day</option>
                    <option value="On Duty">On Duty</option>
                    <option value="Leave">Leave</option>
                  </select>
                </div>

                {/* Check In Time */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-in Time
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.checkInTime}
                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    placeholder="09:00 AM"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>

                {/* Check Out Time */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-out Time
                  </label>
                  <input
                    type="text"
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    placeholder="06:00 PM"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>

                {/* Location Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Designated GPS Location
                  </label>
                  <select
                    value={formData.locationName}
                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="JAAGO HQ (Banani)">JAAGO HQ (Banani)</option>
                    <option value="Nasif Home (Workstation)">Nasif Home (Workstation)</option>
                    <option value="EMK Center Gulshan">EMK Center Gulshan</option>
                    <option value="Khulna Office">Khulna Office</option>
                    <option value="Barishal Hub">Barishal Hub</option>
                    <option value="Cox's Bazar Branch">Cox&apos;s Bazar Branch</option>
                    <option value="Rangpur School">Rangpur School</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Approved adjustment, GPS verified..."
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  {editingLog ? 'Save Changes' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: DELETE CONFIRMATION MODAL ────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <div className="flex items-center space-x-3 text-rose-500">
                <div className="h-10 w-10 rounded-2xl bg-rose-500/15 flex items-center justify-center">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Confirm Deletion</h3>
                  <p className="text-xs text-muted-foreground">Permanent attendance log removal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, ids: [], names: '' })}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">
              Are you sure you want to delete attendance record(s) for <strong className="text-foreground font-bold">{deleteConfirm.names}</strong>? This action will permanently remove the entries from database and monthly summary.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, ids: [], names: '' })}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 border border-border text-xs font-bold text-foreground transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SUBCOMPONENT FOR MONTH-GROUPED TABLE ROWS ──
function AttendanceLogRow({
  log,
  isSuperAdmin = false,
  isOnDuty = false,
  isEligibleForReg = false,
  isRegAllowed = true,
  showRegularizationColumn = true,
  existingReg,
  onRegularize,
  onEdit,
  onDelete,
  onViewGps,
  onViewPunches,
}: {
  log: AttendanceLogItem;
  isSuperAdmin?: boolean | undefined;
  isOnDuty?: boolean | undefined;
  isEligibleForReg?: boolean | undefined;
  isRegAllowed?: boolean | undefined;
  showRegularizationColumn?: boolean | undefined;
  existingReg?: AttendanceRegularizationItem | undefined;
  onRegularize: (log: AttendanceLogItem) => void;
  onEdit: (log: AttendanceLogItem) => void;
  onDelete: (id: string, name: string) => void;
  onViewGps: (log: AttendanceLogItem) => void;
  onViewPunches?: (log: AttendanceLogItem) => void;
}) {
  const duration = calculateWorkingHoursString(log.checkInTime, log.checkOutTime);
  const locName = log.locationName || log.branch || 'JAAGO HQ (Banani)';
  const lat = log.checkInLat ?? 23.7937;
  const lng = log.checkInLng ?? 90.4066;

  return (
    <tr className="hover:bg-amber-500/[0.04] dark:hover:bg-amber-500/[0.06] transition-colors duration-100 border-b border-border/40 odd:bg-background even:bg-surface/20">
      <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
        <span className="font-mono tabular-nums font-bold text-foreground text-xs">{formatDisplayDate(log.date)}</span>
        <div className="text-[10px] text-muted-foreground font-medium">
          {getWeekdayShort(log.date)}
        </div>
      </td>
      <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
        <div className="font-mono tabular-nums font-bold text-emerald-500 text-xs">{log.checkInTime || '--:--'}</div>
        <div className="flex items-center gap-1 mt-0.5">
          {log.checkInSource === 'BIOTIME' || log.device === 'BioTime Terminal' ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Fingerprint className="w-2.5 h-2.5" />
              BioTime
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-muted text-muted-foreground border border-border">
              <Smartphone className="w-2.5 h-2.5" />
              {log.device || 'GPS'}
            </span>
          )}
        </div>
      </td>
      <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
        <div className="font-mono tabular-nums font-bold text-rose-500 text-xs">{log.checkOutTime || '--:--'}</div>
        <div className="flex items-center gap-1 mt-0.5">
          {log.status === 'Auto Check Out' || log.isAutoCheckout ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Auto (11:30 PM)
            </span>
          ) : log.checkOutSource?.toUpperCase() === 'BIOTIME' ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Fingerprint className="w-2.5 h-2.5" />
              BioTime
            </span>
          ) : log.checkOutTime ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-muted text-muted-foreground border border-border">
              <Smartphone className="w-2.5 h-2.5" />
              {log.device || 'GPS'}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">--</span>
          )}
        </div>
      </td>
      <td className="py-1.5 px-2.5 border-r border-border/30">
        <div className="flex items-start space-x-1.5 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-foreground text-xs truncate max-w-[170px]" title={locName}>
              {locName}
            </div>
            <div className="font-mono tabular-nums text-[10px] text-muted-foreground flex items-center space-x-1 whitespace-nowrap">
              <span>Lat: {lat.toFixed(3)}, Lng: {lng.toFixed(3)}</span>
              <button
                type="button"
                onClick={() => onViewGps(log)}
                className="text-primary hover:underline font-bold text-[10px] ml-1 cursor-pointer"
                title="View GPS Map Audit"
              >
                View
              </button>
            </div>
          </div>
        </div>
      </td>
      <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
        <div className="font-mono tabular-nums font-extrabold text-foreground text-xs">
          {duration}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Target: 8.0h
        </div>
      </td>
      <td className="py-1.5 px-2.5 whitespace-nowrap border-r border-border/30">
        {log.status === 'Present' ? (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-black">
            Present
          </span>
        ) : log.status === 'Late' ? (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-black">
            Late {log.lateByMin ? `+${log.lateByMin}m` : ''}
          </span>
        ) : log.status === 'Auto Check Out' || log.isAutoCheckout ? (
          <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-black">
            Auto Check Out
          </span>
        ) : log.status === 'Absent' ? (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-black">
            Absent
          </span>
        ) : log.status === 'Leave' ? (
          <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-black">
            Leave
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-surface text-muted-foreground border border-border text-[10px] font-bold">
            {log.status}
          </span>
        )}
      </td>
      {/* Notes / Verification */}
      <td className="py-1.5 px-2.5 w-[150px] max-w-[160px] border-r border-border/30">
        {isOnDuty ? (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold tracking-wide whitespace-nowrap shadow-2xs">
            <Radio className="h-2.5 w-2.5 text-amber-500 animate-pulse" />
            <span>On Duty</span>
          </span>
        ) : (() => {
          const noteText = log.notes || (log.status === 'Auto Check Out' ? 'Auto check-out generated after 11:30 PM' : 'GPS Geofence Verified');
          return (
            <div
              className="text-[11px] text-muted-foreground truncate max-w-[145px] cursor-help"
              title={noteText}
            >
              {noteText}
            </div>
          );
        })()}
      </td>

      {/* Regularization Column */}
      {showRegularizationColumn && (
        <td className="py-1.5 px-2.5 text-center whitespace-nowrap border-r border-border/30">
          {(() => {
            if (existingReg?.status === 'Approved') {
              return (
                <span
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-black tracking-wide shadow-2xs"
                  title={`Regularized (Approved by ${existingReg.approvedBy || 'Supervisor'}): ${existingReg.reason}`}
                >
                  <CheckCircle2 className="h-3 w-3 mr-0.5 text-emerald-500" />
                  <span>R.Approved</span>
                </span>
              );
            }

            if (existingReg?.status === 'Pending') {
              return (
                <span
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-black tracking-wide shadow-2xs"
                  title="Regularization request submitted and pending supervisor review"
                >
                  <Clock className="h-3 w-3 mr-0.5 animate-spin text-amber-500" />
                  <span>Pending</span>
                </span>
              );
            }

            if (existingReg?.status === 'Refused' || existingReg?.status === 'Rejected') {
              return (
                <button
                  type="button"
                  onClick={() => onRegularize(log)}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 text-[9.5px] font-black transition cursor-pointer active:scale-95 shadow-2xs"
                  title={`Refused by ${existingReg.approvedBy || 'Supervisor'}${existingReg.refusalNote ? `: "${existingReg.refusalNote}"` : ''} - Click to re-apply`}
                >
                  <XCircle className="h-3 w-3 mr-0.5 text-rose-500 group-hover:text-white" />
                  <span>R.Refused</span>
                </button>
              );
            }

            if (!isEligibleForReg) {
              return <span className="text-muted-foreground/30 font-bold text-xs">--</span>;
            }

            if (!isRegAllowed) {
              return (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/30 text-muted-foreground border border-border/40 text-[10px] font-bold tracking-wide cursor-not-allowed"
                  title="Regularization requests are disabled for this employee in profile"
                >
                  Disabled
                </span>
              );
            }

            return (
              <button
                type="button"
                onClick={() => onRegularize(log)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/30 hover:border-amber-500 text-[10.5px] font-black tracking-wide shadow-2xs transition duration-150 cursor-pointer inline-flex items-center space-x-1 active:scale-95"
                title="Click to regularize check-in/out times based on shift"
              >
                <span>Regularize</span>
              </button>
            );
          })()}
        </td>
      )}

      {/* Actions */}
      <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end space-x-0.5">
          {/* View Punch Breakdown / Audit */}
          {onViewPunches && (
            <button
              type="button"
              onClick={() => onViewPunches(log)}
              className="p-1 rounded-md hover:bg-cyan-500/10 text-muted-foreground hover:text-cyan-600 transition cursor-pointer"
              title="View Multi-Source Punch Audit (BioTime + GPS)"
            >
              <Fingerprint className="h-3.5 w-3.5" />
            </button>
          )}

          {/* View GPS Details - Available to all */}
          <button
            type="button"
            onClick={() => onViewGps(log)}
            className="p-1 rounded-md hover:bg-surface text-muted-foreground hover:text-primary transition cursor-pointer"
            title="View GPS details"
          >
            <Globe className="h-3.5 w-3.5" />
          </button>

          {/* Edit & Delete - Restricted to Super Admin */}
          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => onEdit(log)}
                className="p-1 rounded-md hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Edit Record (Super Admin)"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(log.id, `${log.employeeName} (${formatDisplayDate(log.date)})`)}
                className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                title="Delete Record (Super Admin Only)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
