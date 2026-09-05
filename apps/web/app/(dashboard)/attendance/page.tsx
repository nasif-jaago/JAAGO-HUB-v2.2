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
} from 'lucide-react';
import { getActiveEmployeeProfile } from '@/lib/user-profile-sync';
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
  saveLocalRegularizations,
  submitAttendanceRegularization,
  calculateShiftStandardTimes,
} from '@/lib/supabase-regularization';

export default function AttendancePage() {
  const [, setMounted] = useState(false);
  const [user, setUser] = useState({
    id: 'emp-nasif',
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator, Tech 4 Development',
    department: "Founder's Office / FC",
    manager: 'Founder & Executive Director',
    organization: 'JAAGO Foundation Trust',
    avatarUrl: '',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    employeeCode: 'FO032507061190',
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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

    evaluateSuperAdminRole();

    // Load active employee profile
    getActiveEmployeeProfile().then((emp) => {
      if (emp) {
        setUser({
          id: emp.id || 'emp-nasif',
          fullName: emp.name,
          jobTitle: emp.designation,
          department: emp.department || "Founder's Office / FC",
          manager: emp.supervisor || 'Founder & Executive Director',
          organization: emp.organization || 'JAAGO Foundation Trust',
          avatarUrl: emp.avatarUrl || '',
          workingSchedule: emp.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
          employeeCode: emp.code || 'FO032507061190',
        });
        evaluateSuperAdminRole();
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
          saveLocalRegularizations(json.data);
          setRegularizations(json.data);
          setAllLogs(getLocalAttendanceLogs());
        }
      } catch {}
    };

    setRegularizations(getLocalRegularizations());
    syncLiveRegularizations();

    // Initial logs load
    const localLogs = getLocalAttendanceLogs();
    setAllLogs(localLogs);

    fetchAttendanceLogsFromSupabase().then((supaLogs) => {
      if (supaLogs && supaLogs.length > 0) {
        setAllLogs(getLocalAttendanceLogs());
      }
    });

    // Load today session
    refreshTodaySession();

    // Event listeners
    const handleAttUpdated = () => {
      setAllLogs(getLocalAttendanceLogs());
      setRegularizations(getLocalRegularizations());
      syncLiveRegularizations();
      refreshTodaySession();
    };

    const handleUserUpdated = () => {
      evaluateSuperAdminRole();
    };

    const handleODUpdated = () => {
      setOnDutyRequests(getLocalOnDutyRequests());
    };

    const handleRegUpdated = () => {
      setRegularizations(getLocalRegularizations());
      setAllLogs(getLocalAttendanceLogs());
      syncLiveRegularizations();
    };

    window.addEventListener('jaago_attendance_updated', handleAttUpdated);
    window.addEventListener('jaago_attendance_regularization_updated', handleRegUpdated);
    window.addEventListener('jaago_leave_request_updated', handleAttUpdated);
    window.addEventListener('jaago_leave_allocation_updated', handleAttUpdated);
    window.addEventListener('jaago_user_updated', handleUserUpdated);
    window.addEventListener('jaago_onduty_updated', handleODUpdated);
    window.addEventListener('storage', handleAttUpdated);
    window.addEventListener('storage', handleUserUpdated);

    // Live background polling for regularizations every 8 seconds
    const regInterval = setInterval(syncLiveRegularizations, 8000);

    return () => {
      window.removeEventListener('jaago_attendance_updated', handleAttUpdated);
      window.removeEventListener('jaago_attendance_regularization_updated', handleRegUpdated);
      window.removeEventListener('jaago_leave_request_updated', handleAttUpdated);
      window.removeEventListener('jaago_leave_allocation_updated', handleAttUpdated);
      window.removeEventListener('jaago_user_updated', handleUserUpdated);
      window.removeEventListener('jaago_onduty_updated', handleODUpdated);
      window.removeEventListener('storage', handleAttUpdated);
      window.removeEventListener('storage', handleUserUpdated);
      clearInterval(regInterval);
    };
  }, []);

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
  const refreshTodaySession = async () => {
    try {
      const empCodeOrId = user.employeeCode || user.id || 'emp-nasif';
      const res = await fetch(`/api/v1/attendance/me/today?employeeId=${encodeURIComponent(empCodeOrId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        const { state, first_check_in_at, worked_seconds, server_now } = json.data;
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
        } else {
          setFirstCheckInTimestamp(null);
          setElapsedSeconds(worked_seconds || 0);
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
    const logId = (log.id || '').trim();
    const logDate = (log.date || '').trim();
    const logCode = (log.employeeCode || '').trim().toLowerCase();
    const logName = (log.employeeName || '').trim().toLowerCase();
    const logEmpId = (log.employeeId || '').trim().toLowerCase();

    return regularizations.find((r) => {
      // Direct ID match
      if (logId && r.attendanceLogId && r.attendanceLogId === logId) return true;
      if (logId && r.id === logId) return true;

      // Match by date + employee
      if (r.date === logDate) {
        const rCode = (r.employeeCode || '').trim().toLowerCase();
        const rName = (r.employeeName || '').trim().toLowerCase();
        const rEmpId = (r.employeeId || '').trim().toLowerCase();
        if (logCode && rCode && logCode === rCode) return true;
        if (logName && rName && logName === rName) return true;
        if (logEmpId && rEmpId && logEmpId === rEmpId) return true;
      }

      return false;
    });
  };

  const handleOpenRegularizationModal = (log: AttendanceLogItem) => {
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

    setRegModal((prev) => (prev ? { ...prev, isSubmitting: true } : null));
    try {
      const log = regModal.log;
      // Extract employee details from the log record first
      const reqEmpCode = log.employeeCode || user.employeeCode || 'FO072408021002';
      const reqEmpName = log.employeeName || user.fullName || 'S M Nayeem Rahman';
      const reqEmpId = log.employeeId || user.id || 'emp-nayeem';
      const reqDept = log.department || user.department || "Founder's Office (JF)";
      const reqDesig = log.designation || user.jobTitle || 'Team Lead';

      // Determine Supervisor dynamically for ALL users across the organization:
      const matchedEmp = employees.find(
        (e) =>
          (reqEmpCode && e.code?.toLowerCase() === reqEmpCode.toLowerCase()) ||
          (reqEmpId && e.id === reqEmpId) ||
          (reqEmpName && e.name?.toLowerCase() === reqEmpName.toLowerCase())
      );

      const isNasif =
        reqEmpCode.toUpperCase() === 'FO032507061190' ||
        reqEmpName.toLowerCase().includes('nasif');

      let supervisorName = isNasif
        ? 'Korvi Rakshand (Founder & ED)'
        : (matchedEmp?.supervisor || user.manager || 'Nasif Kamal');
      let supervisorEmail = isNasif
        ? 'korvi@jaago.com.bd'
        : 'nasif.kamal@jaago.com.bd';

      if (!isNasif && matchedEmp?.supervisor) {
        const supProfile = employees.find(
          (e) =>
            e.name?.toLowerCase() === matchedEmp.supervisor?.toLowerCase() ||
            e.code?.toLowerCase() === matchedEmp.supervisor?.toLowerCase()
        );
        if (supProfile?.workEmail || supProfile?.personalEmail) {
          supervisorEmail = supProfile.workEmail || supProfile.personalEmail || supervisorEmail;
        }
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
      showToast(`Attendance regularization for ${log.date} submitted to supervisor!`, 'success');
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
      setStartDate(`${ym}-01`);
      setEndDate(`${ym}-31`);
    } else if (preset === 'last-month') {
      const prev = new Date();
      prev.setMonth(prev.getMonth() - 1);
      const ym = prev.toISOString().substring(0, 7);
      setStartDate(`${ym}-01`);
      setEndDate(`${ym}-31`);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
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
  }, [allLogs, searchQuery, statusFilter, startDate, endDate]);

  // Grouped by Month for Month-wise logs table
  const monthGroupedLogs = useMemo(() => {
    const groups = new Map<string, AttendanceLogItem[]>();
    filteredLogs.forEach((log) => {
      const ym = log.date ? log.date.substring(0, 7) : '2026-08';
      if (!groups.has(ym)) groups.set(ym, []);
      groups.get(ym)!.push(log);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredLogs]);



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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      {/* ── 5. ATTENDANCE LOGS TABLE (WITH GPS COORDINATES & REGULARIZATION) ─ */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-md">
        {viewGrouping === 'month-grouped' ? (
          // Month-wise Grouped View
          <div className="divide-y divide-border/60">
            {monthGroupedLogs.length > 0 ? (
              monthGroupedLogs.map(([monthKey, logsInMonth]) => (
                <div key={monthKey} className="p-5 space-y-3">
                  {/* Month Header Banner */}
                  <div className="flex items-center justify-between bg-surface/50 border border-border px-4 py-2.5 rounded-2xl">
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
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Check In</th>
                          <th className="py-3 px-3">Check Out</th>
                          <th className="py-3 px-3">GPS Location &amp; Coordinates</th>
                          <th className="py-3 px-3">Working Hours</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Notes / Verification</th>
                          <th className="py-3 px-3 text-center">Regularization</th>
                          <th className="py-3 px-3 text-right">Actions</th>
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
                            existingReg={getExistingRegularization(log)}
                            onRegularize={handleOpenRegularizationModal}
                            onEdit={handleOpenEditModal}
                            onDelete={handleDeleteRecord}
                            onViewGps={(l) => setGpsDetailModal({ isOpen: true, log: l })}
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
                <tr className="border-b border-border/70 bg-surface/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isSuperAdmin && (
                    <th className="py-4 px-4 w-10 text-center">
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
                  <th className="py-4 px-4">Date &amp; Day</th>
                  <th className="py-4 px-3">Check In</th>
                  <th className="py-4 px-3">Check Out</th>
                  <th className="py-4 px-4">GPS Location &amp; Coordinates</th>
                  <th className="py-4 px-3">Working Hours</th>
                  <th className="py-4 px-3">Status</th>
                  <th className="py-4 px-4">Notes / Verification</th>
                  <th className="py-4 px-4 text-center">Regularization</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => {
                    const duration = calculateWorkingHoursString(log.checkInTime, log.checkOutTime);
                    const isToday = log.date === new Date().toISOString().slice(0, 10);
                    const locName = log.locationName || log.branch || 'JAAGO HQ (Banani)';
                    const lat = log.checkInLat ?? 23.7937;
                    const lng = log.checkInLng ?? 90.4066;
                    const eligibleForReg = isRowEligibleForRegularization(log);
                    const existingReg = getExistingRegularization(log);

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-surface/50 transition duration-150 group"
                      >
                        {/* Checkbox (Super Admin only) */}
                        {isSuperAdmin && (
                          <td className="py-4 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(log.id)}
                              onChange={() => handleToggleSelect(log.id)}
                              className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* Date & Day */}
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-foreground text-xs sm:text-[13px]">
                              {log.date}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                Today
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {(() => {
                              try {
                                return new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' });
                              } catch {
                                return '';
                              }
                            })()}
                          </div>
                        </td>

                        {/* Check In Time & Source */}
                        <td className="py-4 px-3">
                          <div className="font-mono font-bold text-emerald-500 text-xs sm:text-[13px]">
                            {log.checkInTime || '--:--'}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {log.device || 'Web Portal'}
                          </div>
                        </td>

                        {/* Check Out Time & Source */}
                        <td className="py-4 px-3">
                          <div className="font-mono font-bold text-rose-500 text-xs sm:text-[13px]">
                            {log.checkOutTime || (isToday && isCheckedIn ? 'In Progress' : '--:--')}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {log.status === 'Auto Check Out' || log.isAutoCheckout
                              ? 'Auto (11:30 PM)'
                              : log.checkOutTime
                              ? log.device
                              : '--'}
                          </div>
                        </td>

                        {/* GPS Coordinate Location Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div className="space-y-0.5">
                              <div className="font-bold text-foreground text-xs sm:text-[13px]">
                                {locName}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground flex items-center space-x-1.5">
                                <span>Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</span>
                                <button
                                  type="button"
                                  onClick={() => setGpsDetailModal({ isOpen: true, log })}
                                  className="text-primary hover:underline font-bold ml-1 cursor-pointer"
                                  title="View GPS Map Audit"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Working Hours Duration */}
                        <td className="py-4 px-3">
                          <div className="font-mono font-extrabold text-foreground text-xs">
                            {isToday && isCheckedIn ? formatTime(elapsedSeconds) : duration}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Target: 8.0h
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-3">
                          {log.status === 'Present' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[11px] font-black">
                              Present
                            </span>
                          ) : log.status === 'Late' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-black">
                              Late {log.lateByMin ? `+${log.lateByMin}m` : ''}
                            </span>
                          ) : log.status === 'Auto Check Out' || log.isAutoCheckout ? (
                            <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[11px] font-black">
                              Auto Check Out
                            </span>
                          ) : log.status === 'Absent' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[11px] font-black">
                              Absent
                            </span>
                          ) : log.status === 'Leave' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[11px] font-black">
                              Leave
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-surface text-muted-foreground border border-border text-[11px] font-bold">
                              {log.status}
                            </span>
                          )}
                        </td>

                        {/* Notes / Verification */}
                        <td className="py-4 px-4">
                          {isOnDutyRecord(log) ? (
                            <div className="flex items-center space-x-1.5">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-black tracking-wide shadow-xs">
                                <Radio className="h-3 w-3 text-amber-500 animate-pulse" />
                                <span>On Duty</span>
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground max-w-xs truncate">
                              {log.notes || (log.status === 'Auto Check Out' ? 'Auto check-out generated after 11:30 PM' : 'GPS Geofence Verified')}
                            </div>
                          )}
                        </td>

                        {/* ── REGULARIZATION COLUMN ── */}
                        <td className="py-4 px-4 text-center">
                          {(() => {
                            if (existingReg?.status === 'Approved') {
                              return (
                                <span
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[11px] font-black tracking-wide shadow-xs"
                                  title={`Regularized (Approved by ${existingReg.approvedBy || 'Supervisor'}): ${existingReg.reason}`}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-0.5 text-emerald-500" />
                                  <span>R.Approved</span>
                                </span>
                              );
                            }

                            if (existingReg?.status === 'Pending') {
                              return (
                                <span
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-black tracking-wide shadow-xs"
                                  title="Regularization request submitted and pending supervisor review"
                                >
                                  <Clock className="h-3.5 w-3.5 mr-0.5 animate-spin text-amber-500" />
                                  <span>Pending</span>
                                </span>
                              );
                            }

                            if (existingReg?.status === 'Refused' || existingReg?.status === 'Rejected') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRegularizationModal(log)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 text-[10px] font-black transition cursor-pointer active:scale-95 shadow-xs"
                                  title={`Refused by ${existingReg.approvedBy || 'Supervisor'}${existingReg.refusalNote ? `: "${existingReg.refusalNote}"` : ''} - Click to re-apply`}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-0.5 text-rose-500 group-hover:text-white" />
                                  <span>R.Refused</span>
                                </button>
                              );
                            }

                            if (!eligibleForReg) {
                              return <span className="text-muted-foreground/30 font-bold">--</span>;
                            }

                            // If eligible and not regularized yet: Show Regularize button
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenRegularizationModal(log)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/30 hover:border-amber-500 text-[11px] font-black tracking-wide shadow-xs transition duration-150 cursor-pointer inline-flex items-center space-x-1.5 active:scale-95"
                                title="Click to regularize check-in/out times based on shift"
                              >
                                <span>Regularize</span>
                              </button>
                            );
                          })()}
                        </td>

                        {/* Actions Column */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {/* View GPS Details - Available to all */}
                            <button
                              type="button"
                              onClick={() => setGpsDetailModal({ isOpen: true, log })}
                              className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-primary transition cursor-pointer"
                              title="View GPS details"
                            >
                              <Globe className="h-4 w-4" />
                            </button>

                            {/* Edit & Delete - Restricted to Super Admin */}
                            {isSuperAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(log)}
                                  className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
                                  title="Edit Record (Super Admin)"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(log.id, `${log.employeeName} (${log.date})`)}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
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
                    <td colSpan={isSuperAdmin ? 10 : 9} className="py-14 text-center text-muted-foreground">
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
                <span className="font-mono font-bold text-foreground">{regModal.log.date}</span>
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
                <strong className="text-foreground">{user.manager || 'Founder & Executive Director'}</strong>
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
                <div className="font-bold font-mono text-foreground pt-0.5">{gpsDetailModal.log.date}</div>
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
  existingReg,
  onRegularize,
  onEdit,
  onDelete,
  onViewGps,
}: {
  log: AttendanceLogItem;
  isSuperAdmin?: boolean | undefined;
  isOnDuty?: boolean | undefined;
  isEligibleForReg?: boolean | undefined;
  existingReg?: AttendanceRegularizationItem | undefined;
  onRegularize: (log: AttendanceLogItem) => void;
  onEdit: (log: AttendanceLogItem) => void;
  onDelete: (id: string, name: string) => void;
  onViewGps: (log: AttendanceLogItem) => void;
}) {
  const duration = calculateWorkingHoursString(log.checkInTime, log.checkOutTime);
  const locName = log.locationName || log.branch || 'JAAGO HQ (Banani)';
  const lat = log.checkInLat ?? 23.7937;
  const lng = log.checkInLng ?? 90.4066;

  return (
    <tr className="hover:bg-surface/50 transition duration-150">
      <td className="py-3.5 px-3">
        <span className="font-mono font-bold text-foreground">{log.date}</span>
      </td>
      <td className="py-3.5 px-3">
        <span className="font-mono font-bold text-emerald-500">{log.checkInTime || '--:--'}</span>
      </td>
      <td className="py-3.5 px-3">
        <span className="font-mono font-bold text-rose-500">{log.checkOutTime || '--:--'}</span>
      </td>
      <td className="py-3.5 px-3">
        <div className="flex items-center space-x-1.5">
          <MapPin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <span className="font-bold text-foreground">{locName}</span>
          <span className="font-mono text-[10px] text-muted-foreground">({lat.toFixed(3)}, {lng.toFixed(3)})</span>
        </div>
      </td>
      <td className="py-3.5 px-3 font-mono font-bold text-foreground">
        {duration}
      </td>
      <td className="py-3.5 px-3">
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
      <td className="py-3.5 px-3">
        {isOnDuty ? (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black tracking-wide shadow-xs">
            <Radio className="h-2.5 w-2.5 text-amber-500 animate-pulse" />
            <span>On Duty</span>
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground truncate block max-w-[140px]">
            {log.notes || (log.status === 'Auto Check Out' ? 'Auto check-out' : 'GPS Geofence Verified')}
          </span>
        )}
      </td>

      {/* Regularization Column */}
      <td className="py-3.5 px-3 text-center">
        {(() => {
          if (existingReg?.status === 'Approved') {
            return (
              <span
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-black"
                title={`Regularized (Approved by ${existingReg.approvedBy || 'Supervisor'}): ${existingReg.reason}`}
              >
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>R.Approved</span>
              </span>
            );
          }

          if (existingReg?.status === 'Pending') {
            return (
              <span
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-black"
                title="Regularization request submitted and pending supervisor review"
              >
                <Clock className="h-2.5 w-2.5 animate-spin" />
                <span>Pending</span>
              </span>
            );
          }

          if (existingReg?.status === 'Refused' || existingReg?.status === 'Rejected') {
            return (
              <button
                type="button"
                onClick={() => onRegularize(log)}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-rose-500/15 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 text-[9px] font-black transition cursor-pointer"
                title={`Refused by ${existingReg.approvedBy || 'Supervisor'}${existingReg.refusalNote ? `: "${existingReg.refusalNote}"` : ''} - Click to re-apply`}
              >
                <XCircle className="h-2.5 w-2.5 mr-0.5 text-rose-500" />
                <span>R.Refused</span>
              </button>
            );
          }

          if (!isEligibleForReg) {
            return <span className="text-muted-foreground/30 font-bold">--</span>;
          }

          return (
            <button
              type="button"
              onClick={() => onRegularize(log)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-500 hover:text-slate-950 border border-amber-500/30 text-[10px] font-black tracking-wide shadow-xs transition cursor-pointer inline-flex items-center space-x-1 active:scale-95"
            >
              <span>Regularize</span>
            </button>
          );
        })()}
      </td>

      {/* Actions */}
      <td className="py-3.5 px-3 text-right">
        <div className="flex items-center justify-end space-x-1">
          {/* View GPS Details - Available to all */}
          <button
            type="button"
            onClick={() => onViewGps(log)}
            className="p-1 rounded-md hover:bg-surface text-muted-foreground hover:text-primary transition cursor-pointer"
            title="View GPS Coordinates"
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
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(log.id, `${log.employeeName} (${log.date})`)}
                className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                title="Delete Record (Super Admin Only)"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
