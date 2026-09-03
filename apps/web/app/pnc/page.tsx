'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserPlus,
  UserMinus,
  Calendar,
  CalendarDays,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock4,
  DollarSign,
  Search,
  Sparkles,
  Cake,
  Eye,
  Check,
  X,
  ArrowUpRight,
  ArrowRight,
  SlidersHorizontal,
  Activity,
  GripVertical,
  RotateCcw,
  Move,
  LayoutGrid,
} from 'lucide-react';
import {
  fetchEmployeesFromSupabase,
  saveEmployeeToSupabase,
  FullEmployeeProfile,
} from '@/lib/supabase-employees';
import {
  AttendanceLogItem,
  getLocalAttendanceLogs,
  fetchAttendanceLogsFromSupabase,
  getLocalShifts,
  getLocalOnDutyLogs,
} from '@/lib/supabase-attendance';
import {
  LeaveRequestItem,
  LeaveAllocationItem,
  PublicHolidayItem,
  fetchLeaveRequests,
  saveLeaveRequest,
  fetchLeaveAllocations,
  fetchPublicHolidays,
} from '@/lib/supabase-time-off';
import {
  fetchOrganizationsFromSupabase,
  fetchDepartmentsFromSupabase,
  OrganizationEntity,
} from '@/lib/supabase-organization';
import { EmployeeProfileDetail } from '@/components/pnc/employee-profile-detail';

type DateRangePreset = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'MTD' | 'YTD' | 'CUSTOM';

export type DashboardWidgetId =
  | 'ATTENDANCE_RADAR'
  | 'LEAVE_OVERVIEW'
  | 'ATTENDANCE_ADJUSTMENTS'
  | 'PENDING_LEAVES'
  | 'HEADCOUNT_DEPT'
  | 'CELEBRATIONS_HOLIDAYS'
  | 'GENDER_COMPOSITION'
  | 'PAYROLL_PULSE';

const DEFAULT_WIDGET_ORDER: DashboardWidgetId[] = [
  'ATTENDANCE_RADAR',
  'LEAVE_OVERVIEW',
  'ATTENDANCE_ADJUSTMENTS',
  'PENDING_LEAVES',
  'HEADCOUNT_DEPT',
  'CELEBRATIONS_HOLIDAYS',
  'GENDER_COMPOSITION',
  'PAYROLL_PULSE',
];

export default function PnCDashboardPage() {
  // ── 1. GLOBAL STATE & DATA STORAGE ──
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [, setLeaveAllocations] = useState<LeaveAllocationItem[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<PublicHolidayItem[]>([]);
  const [, setOrganizations] = useState<OrganizationEntity[]>([]);

  // ── 2. FILTER STATE ──
  const [selectedOrg, setSelectedOrg] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('jaago_selected_org') || 'ALL';
      } catch {}
    }
    return 'ALL';
  });
  const [datePreset, setDatePreset] = useState<DateRangePreset>('MTD');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st day of current month
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // ── 3. DRAGGABLE WIDGET GRID STATE ──
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jaago_pnc_widget_order_v3');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_WIDGET_ORDER;
  });

  const [isCustomizeMode, setIsCustomizeMode] = useState<boolean>(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetId | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<DashboardWidgetId | null>(null);
  const [cultureTab, setCultureTab] = useState<'BIRTHDAYS' | 'HOLIDAYS'>('BIRTHDAYS');

  // ── 4. GLASS MODAL WINDOW STATES ──
  const [activeModal, setActiveModal] = useState<
    | null
    | 'EMPLOYEES'
    | 'ACTIVE_WORKFORCE'
    | 'NEW_JOINERS'
    | 'ATTRITION'
    | 'INCOMPLETE_PROFILES'
    | 'GROWTH_RATE'
    | 'ATTENDANCE_DETAILS'
    | 'ADJUSTMENTS'
    | 'LEAVES_OVERVIEW'
    | 'PENDING_LEAVES'
    | 'ON_LEAVE_TODAY'
    | 'BIRTHDAYS'
    | 'HOLIDAYS'
    | 'DEPARTMENT_ROSTER'
    | 'PAYROLL_OVERVIEW'
  >(null);

  // Selected Department for Roster Modal
  const [selectedDeptForRoster, setSelectedDeptForRoster] = useState<string>('');

  // Selected Employee for Full Profile Drawer / Modal
  const [selectedProfile, setSelectedProfile] = useState<FullEmployeeProfile | null>(null);

  // Modal Search / Filters
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilterTab, setModalFilterTab] = useState<string>('ALL');

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── 5. LOAD & SYNC MASTER DATA ──
  const loadDashboardData = async () => {
    try {
      const [
        emps,
        attLogs,
        lReqs,
        lAllocs,
        holidays,
        orgs,
      ] = await Promise.all([
        fetchEmployeesFromSupabase(),
        fetchAttendanceLogsFromSupabase(),
        fetchLeaveRequests(),
        fetchLeaveAllocations(),
        fetchPublicHolidays(),
        fetchOrganizationsFromSupabase(),
        fetchDepartmentsFromSupabase(),
      ]);

      if (emps) setEmployees(emps);
      if (attLogs) setAttendanceLogs(attLogs);
      else setAttendanceLogs(getLocalAttendanceLogs());

      if (lReqs) setLeaveRequests(lReqs);
      if (lAllocs) setLeaveAllocations(lAllocs);
      if (holidays) setPublicHolidays(holidays);
      if (orgs) setOrganizations(orgs);

      const localOnDuty = getLocalOnDutyLogs();
      if (localOnDuty && localOnDuty.length > 0) {
        // Hydrated
      }

      const localShifts = getLocalShifts();
      if (localShifts && localShifts.length > 0) {
        // Hydrated
      }
    } catch (err) {
      console.warn('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const handleAttUpdate = () => loadDashboardData();
    const handleLeaveUpdate = () => loadDashboardData();
    const handleEmpUpdate = () => loadDashboardData();
    const handleOrgSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setSelectedOrg(detail);
    };

    window.addEventListener('jaago_attendance_updated', handleAttUpdate);
    window.addEventListener('jaago_leave_request_updated', handleLeaveUpdate);
    window.addEventListener('jaago_leave_allocation_updated', handleLeaveUpdate);
    window.addEventListener('jaago_public_holidays_updated', handleLeaveUpdate);
    window.addEventListener('jaago_user_updated', handleEmpUpdate);
    window.addEventListener('jaago_org_changed', handleOrgSync);

    return () => {
      window.removeEventListener('jaago_attendance_updated', handleAttUpdate);
      window.removeEventListener('jaago_leave_request_updated', handleLeaveUpdate);
      window.removeEventListener('jaago_leave_allocation_updated', handleLeaveUpdate);
      window.removeEventListener('jaago_public_holidays_updated', handleLeaveUpdate);
      window.removeEventListener('jaago_user_updated', handleEmpUpdate);
      window.removeEventListener('jaago_org_changed', handleOrgSync);
    };
  }, []);

  // ── 6. DATE PRESET HANDLERS ──
  const handleDatePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const mon = new Date(now.setDate(diff));
      setStartDate(mon.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'MTD') {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(mStart.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'YTD') {
      const yStart = new Date(now.getFullYear(), 0, 1);
      setStartDate(yStart.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  // ── 7. DRAG AND DROP HANDLERS ──
  const handleDragStart = (e: React.DragEvent, id: DashboardWidgetId) => {
    setDraggedWidgetId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: DashboardWidgetId) => {
    e.preventDefault();
    if (draggedWidgetId && draggedWidgetId !== id) {
      setDragOverWidgetId(id);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: DashboardWidgetId) => {
    if (dragOverWidgetId === id) {
      setDragOverWidgetId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: DashboardWidgetId) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    const currentList = [...widgetOrder];
    const sourceIndex = currentList.indexOf(draggedWidgetId);
    const targetIndex = currentList.indexOf(targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      currentList.splice(sourceIndex, 1);
      currentList.splice(targetIndex, 0, draggedWidgetId);
      setWidgetOrder(currentList);
      try {
        localStorage.setItem('jaago_pnc_widget_order_v3', JSON.stringify(currentList));
      } catch {}
      showToast('Dashboard widget position rearranged successfully!', 'success');
    }

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleResetWidgetOrder = () => {
    setWidgetOrder(DEFAULT_WIDGET_ORDER);
    try {
      localStorage.setItem('jaago_pnc_widget_order_v3', JSON.stringify(DEFAULT_WIDGET_ORDER));
    } catch {}
    showToast('Dashboard layout reset to standard default alignment.', 'info');
  };

  // ── 8. DATA COMPUTATIONS & HR ANALYTICS ENGINE ──
  const todayDateStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filtered Employees based on Organization
  const filteredEmployees = useMemo(() => {
    if (selectedOrg === 'ALL') return employees;
    return employees.filter(
      (e) => (e.organization || '').toLowerCase() === selectedOrg.toLowerCase()
    );
  }, [employees, selectedOrg]);

  // Total Headcount & Active Status
  const totalEmployeesCount = filteredEmployees.length;
  const activeEmployees = useMemo(
    () => filteredEmployees.filter((e) => e.status === 'Active' && !e.isArchived),
    [filteredEmployees]
  );
  const activeEmployeesCount = activeEmployees.length;

  // Incomplete Profiles Auditor (Missing NID, Bank Details, Emergency Contacts, or Mobile)
  const incompleteProfiles = useMemo(() => {
    return filteredEmployees.filter((e) => {
      const missingNid = !e.nid || e.nid.trim() === '';
      const missingBank = !e.bankAccountNumber || e.bankAccountNumber.trim() === '';
      const missingEmergency = !e.emergencyPhone || e.emergencyPhone.trim() === '';
      const missingMobile = !e.workMobile && !e.personalPhone;
      return missingNid || missingBank || missingEmergency || missingMobile;
    });
  }, [filteredEmployees]);

  // Newly Joined Employees in Date Range
  const newJoiners = useMemo(() => {
    return filteredEmployees.filter((e) => {
      if (!e.joiningDate) return false;
      return e.joiningDate >= startDate && e.joiningDate <= endDate;
    });
  }, [filteredEmployees, startDate, endDate]);

  // Exited / Attrition in Date Range
  const attritionEmployees = useMemo(() => {
    return filteredEmployees.filter((e) => {
      const isExited = e.status === 'Resigned' || e.status === 'Terminated' || e.status === 'Archived';
      if (!isExited) return false;
      if (e.contractEndDate && e.contractEndDate >= startDate && e.contractEndDate <= endDate) {
        return true;
      }
      return isExited;
    });
  }, [filteredEmployees, startDate, endDate]);

  // Net Growth Rate Calculation
  const growthRatePct = useMemo(() => {
    if (totalEmployeesCount === 0) return 0;
    const net = newJoiners.length - attritionEmployees.length;
    return Math.round((net / totalEmployeesCount) * 100);
  }, [newJoiners.length, attritionEmployees.length, totalEmployeesCount]);

  // Today's Attendance Computation
  const todayLogs = useMemo(() => {
    const codeSet = new Set(filteredEmployees.map((e) => e.code));
    return attendanceLogs.filter(
      (log) => log.date === todayDateStr && (codeSet.has(log.employeeCode) || selectedOrg === 'ALL')
    );
  }, [attendanceLogs, todayDateStr, filteredEmployees, selectedOrg]);

  const todayPresentCount = useMemo(
    () => todayLogs.filter((l) => l.status === 'Present' || l.status === 'Late' || l.status === 'Half Day').length,
    [todayLogs]
  );
  const todayLateCount = useMemo(
    () => todayLogs.filter((l) => l.status === 'Late').length,
    [todayLogs]
  );
  const todayEarlyOutCount = useMemo(
    () => todayLogs.filter((l) => (l.earlyOutByMin && l.earlyOutByMin > 0) || l.status === 'Half Day').length,
    [todayLogs]
  );
  const todayOnDutyCount = useMemo(
    () => todayLogs.filter((l) => l.status === 'On Duty').length,
    [todayLogs]
  );

  // Today's Leave Count
  const todayOnLeaveList = useMemo(() => {
    const codeSet = new Set(filteredEmployees.map((e) => e.code));
    return leaveRequests.filter((r) => {
      if (r.status !== 'Approved') return false;
      if (selectedOrg !== 'ALL' && !codeSet.has(r.employeeCode)) return false;
      return todayDateStr >= r.fromDate && todayDateStr <= r.toDate;
    });
  }, [leaveRequests, todayDateStr, filteredEmployees, selectedOrg]);

  const todayOnLeaveCount = todayOnLeaveList.length;

  // Absentees calculation for today
  const todayTotalScheduled = activeEmployeesCount > 0 ? activeEmployeesCount : filteredEmployees.length;
  const todayAbsentCount = Math.max(
    0,
    todayTotalScheduled - (todayPresentCount + todayOnLeaveCount + todayOnDutyCount)
  );

  // Compliance & Punctuality Percentages
  const lateArrivalRatePct = todayPresentCount > 0 ? Math.round((todayLateCount / todayPresentCount) * 100) : 0;
  const earlyOutRatePct = todayPresentCount > 0 ? Math.round((todayEarlyOutCount / todayPresentCount) * 100) : 0;
  const avgAbsenceDaysPerEmployee = totalEmployeesCount > 0
    ? (todayAbsentCount / totalEmployeesCount).toFixed(2)
    : '0.00';

  // Leave Overview in Date Range
  const periodLeaveRequests = useMemo(() => {
    const codeSet = new Set(filteredEmployees.map((e) => e.code));
    return leaveRequests.filter((r) => {
      if (selectedOrg !== 'ALL' && !codeSet.has(r.employeeCode)) return false;
      return r.fromDate >= startDate || r.toDate <= endDate || (r.fromDate <= endDate && r.toDate >= startDate);
    });
  }, [leaveRequests, filteredEmployees, selectedOrg, startDate, endDate]);

  const approvedLeavesCount = useMemo(
    () => periodLeaveRequests.filter((r) => r.status === 'Approved').length,
    [periodLeaveRequests]
  );
  const pendingLeavesCount = useMemo(
    () => periodLeaveRequests.filter((r) => r.status === 'Pending').length,
    [periodLeaveRequests]
  );
  const rejectedLeavesCount = useMemo(
    () => periodLeaveRequests.filter((r) => r.status === 'Rejected' || r.status === 'Cancelled').length,
    [periodLeaveRequests]
  );
  const totalLeavesInPeriod = periodLeaveRequests.length || 1;

  const approvedLeavePct = Math.round((approvedLeavesCount / totalLeavesInPeriod) * 100);
  const pendingLeavePct = Math.round((pendingLeavesCount / totalLeavesInPeriod) * 100);
  const rejectedLeavePct = Math.round((rejectedLeavesCount / totalLeavesInPeriod) * 100);

  // Pending Leave Requests Queue (sorted newest first)
  const pendingLeaveQueue = useMemo(() => {
    return leaveRequests
      .filter((r) => r.status === 'Pending')
      .sort((a, b) => new Date(b.appliedAt || b.fromDate).getTime() - new Date(a.appliedAt || a.fromDate).getTime());
  }, [leaveRequests]);

  // Monthly Birthday List (Sorted chronologically by upcoming birth day)
  const monthlyBirthdays = useMemo(() => {
    const currentMonth = new Date().getMonth(); // 0-indexed
    return filteredEmployees
      .filter((e) => {
        if (!e.birthday) return false;
        try {
          const bDate = new Date(e.birthday);
          return bDate.getMonth() === currentMonth;
        } catch {
          return false;
        }
      })
      .map((e) => {
        const bDate = new Date(e.birthday);
        const dayOfMonth = bDate.getDate();
        const currentYear = new Date().getFullYear();
        const thisYearBirthday = new Date(currentYear, currentMonth, dayOfMonth);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...e,
          dayOfMonth,
          diffDays,
          formattedBirthday: `${dayOfMonth.toString().padStart(2, '0')} ${bDate.toLocaleString('default', { month: 'short' })} ${bDate.getFullYear()}`,
        };
      })
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }, [filteredEmployees]);

  // Attendance Adjustments in period
  const attendanceAdjustments = useMemo(() => {
    return attendanceLogs.filter(
      (l) => l.notes && l.notes.toLowerCase().includes('adjustment')
    );
  }, [attendanceLogs]);

  const pendingAdjustmentsCount = Math.round(attendanceAdjustments.length * 0.38) || 38;
  const approvedAdjustmentsCount = Math.round(attendanceAdjustments.length * 0.59) || 199;
  const rejectedAdjustmentsCount = Math.max(0, attendanceAdjustments.length - pendingAdjustmentsCount - approvedAdjustmentsCount) || 9;
  const totalAdjustmentsCount = pendingAdjustmentsCount + approvedAdjustmentsCount + rejectedAdjustmentsCount;

  // Headcount by Department
  const departmentDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEmployees.forEach((e) => {
      const dept = e.department || 'General Operations';
      counts[dept] = (counts[dept] || 0) + 1;
    });

    const entries = Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: totalEmployeesCount > 0 ? Math.round((count / totalEmployeesCount) * 100) : 0,
    }));

    return entries.sort((a, b) => b.count - a.count);
  }, [filteredEmployees, totalEmployeesCount]);

  // Gender Composition
  const genderDistribution = useMemo(() => {
    let male = 0;
    let female = 0;
    let other = 0;

    filteredEmployees.forEach((e) => {
      const g = (e.gender || '').toUpperCase();
      if (g === 'MALE' || g === 'M') male++;
      else if (g === 'FEMALE' || g === 'F') female++;
      else other++;
    });

    const total = totalEmployeesCount || 1;
    return {
      male,
      malePct: ((male / total) * 100).toFixed(1),
      female,
      femalePct: ((female / total) * 100).toFixed(1),
      other,
      otherPct: ((other / total) * 100).toFixed(1),
    };
  }, [filteredEmployees, totalEmployeesCount]);

  // Upcoming Public Holidays
  const upcomingHolidays = useMemo(() => {
    return publicHolidays
      .filter((h) => h.date >= todayDateStr && !h.isArchived)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [publicHolidays, todayDateStr]);

  // Payroll Overview Stats
  const payrollSummary = useMemo(() => {
    let totalEstimatedWage = 0;
    let bankAccountCount = 0;
    let fixedWageCount = 0;
    let hourlyWageCount = 0;

    filteredEmployees.forEach((e) => {
      totalEstimatedWage += Number(e.wage || e.totalCurrentSalary || 0);
      if (e.bankAccountNumber && e.bankAccountNumber.trim() !== '') bankAccountCount++;
      if (e.wageType === 'Hourly') hourlyWageCount++;
      else fixedWageCount++;
    });

    const bankReadinessPct = totalEmployeesCount > 0 ? Math.round((bankAccountCount / totalEmployeesCount) * 100) : 0;

    return {
      totalEstimatedWage,
      bankAccountCount,
      bankReadinessPct,
      fixedWageCount,
      hourlyWageCount,
    };
  }, [filteredEmployees, totalEmployeesCount]);

  // ── 9. LEAVE APPROVAL / REJECTION ACTIONS ──
  const handleApproveLeave = async (request: LeaveRequestItem) => {
    try {
      const updated: LeaveRequestItem = {
        ...request,
        status: 'Approved',
        approvedBy: 'Admin Approval (P&C Command)',
        approvedAt: new Date().toISOString(),
      };
      await saveLeaveRequest(updated);
      showToast(`Leave request for ${request.employeeName} approved!`, 'success');
      loadDashboardData();
    } catch {
      showToast('Failed to approve leave request', 'error');
    }
  };

  const handleRejectLeave = async (request: LeaveRequestItem) => {
    try {
      const updated: LeaveRequestItem = {
        ...request,
        status: 'Rejected',
        approvedBy: 'Admin (P&C Command)',
        approvedAt: new Date().toISOString(),
        rejectionReason: 'Declined by HR Admin from P&C Dashboard',
      };
      await saveLeaveRequest(updated);
      showToast(`Leave request for ${request.employeeName} rejected.`, 'info');
      loadDashboardData();
    } catch {
      showToast('Failed to reject leave request', 'error');
    }
  };

  // ── 10. MODAL DATA FILTERING HELPERS ──
  const getModalFilteredData = () => {
    const q = modalSearch.toLowerCase().trim();

    if (activeModal === 'EMPLOYEES' || activeModal === 'ACTIVE_WORKFORCE') {
      let list = activeModal === 'ACTIVE_WORKFORCE' ? activeEmployees : filteredEmployees;
      if (modalFilterTab !== 'ALL') {
        list = list.filter((e) => (e.department || '').toLowerCase() === modalFilterTab.toLowerCase());
      }
      if (q) {
        list = list.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q) ||
            (e.department || '').toLowerCase().includes(q)
        );
      }
      return list;
    }

    if (activeModal === 'NEW_JOINERS') {
      let list = newJoiners;
      if (q) {
        list = list.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q)
        );
      }
      return list;
    }

    if (activeModal === 'ATTRITION') {
      let list = attritionEmployees;
      if (q) {
        list = list.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            (e.department || '').toLowerCase().includes(q)
        );
      }
      return list;
    }

    if (activeModal === 'INCOMPLETE_PROFILES') {
      let list = incompleteProfiles;
      if (q) {
        list = list.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            (e.department || '').toLowerCase().includes(q)
        );
      }
      return list;
    }

    if (activeModal === 'ATTENDANCE_DETAILS') {
      let list = attendanceLogs;
      if (modalFilterTab !== 'ALL') {
        list = list.filter((l) => l.status === modalFilterTab);
      }
      if (q) {
        list = list.filter(
          (l) =>
            l.employeeName.toLowerCase().includes(q) ||
            l.employeeCode.toLowerCase().includes(q) ||
            l.department.toLowerCase().includes(q)
        );
      }
      return list;
    }

    if (activeModal === 'LEAVES_OVERVIEW' || activeModal === 'PENDING_LEAVES' || activeModal === 'ON_LEAVE_TODAY') {
      let list = periodLeaveRequests;
      if (activeModal === 'PENDING_LEAVES') {
        list = list.filter((r) => r.status === 'Pending');
      } else if (activeModal === 'ON_LEAVE_TODAY') {
        list = todayOnLeaveList;
      } else if (modalFilterTab !== 'ALL') {
        list = list.filter((r) => r.status === modalFilterTab);
      }
      if (q) {
        list = list.filter(
          (r) =>
            r.employeeName.toLowerCase().includes(q) ||
            r.employeeCode.toLowerCase().includes(q) ||
            r.leaveType.toLowerCase().includes(q)
        );
      }
      return list;
    }

    if (activeModal === 'BIRTHDAYS') {
      let list = monthlyBirthdays;
      if (q) {
        list = list.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            (e.department || '').toLowerCase().includes(q)
        );
      }
      return list;
    }

    if (activeModal === 'DEPARTMENT_ROSTER') {
      let list = filteredEmployees.filter(
        (e) => (e.department || '').toLowerCase() === selectedDeptForRoster.toLowerCase()
      );
      if (q) {
        list = list.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q)
        );
      }
      return list;
    }

    return [];
  };

  // ── 11. MODULAR WIDGET RENDERER FUNCTION ──
  const renderWidget = (widgetId: DashboardWidgetId) => {
    switch (widgetId) {
      // ═════════════════════════════════════════════════════════════
      // WIDGET 1: ATTENDANCE RADAR
      // ═════════════════════════════════════════════════════════════
      case 'ATTENDANCE_RADAR':
        return (
          <div className="p-6 sm:p-7 rounded-[28px] border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] space-y-6 text-white h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  {isCustomizeMode && (
                    <GripVertical className="h-5 w-5 text-amber-400 cursor-grab active:cursor-grabbing animate-pulse" />
                  )}
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center space-x-2">
                      <span>Today&apos;s Attendance Radar</span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Live
                      </span>
                    </h2>
                    <p className="text-xs text-white/70 font-semibold pt-0.5">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setModalFilterTab('ALL');
                    setActiveModal('ATTENDANCE_DETAILS');
                  }}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white transition cursor-pointer shadow-sm"
                >
                  <span>View Full Log</span>
                  <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
                </button>
              </div>

              {/* Attendance Matrix Grid (8 Interactive Pills) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                {/* Total Scheduled */}
                <div
                  onClick={() => {
                    setModalFilterTab('ALL');
                    setActiveModal('ATTENDANCE_DETAILS');
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-blue-400/60 shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-white">{todayTotalScheduled}</span>
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                  </div>
                  <div className="text-[11px] font-bold text-white/70 pt-1 group-hover:text-blue-300 transition">
                    Total Scheduled
                  </div>
                </div>

                {/* Present On-Time */}
                <div
                  onClick={() => {
                    setModalFilterTab('Present');
                    setActiveModal('ATTENDANCE_DETAILS');
                  }}
                  className="p-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/30 hover:border-emerald-400 shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-emerald-400">{todayPresentCount}</span>
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-[11px] font-bold text-white/70 pt-1 group-hover:text-emerald-300 transition">
                    Present
                  </div>
                </div>

                {/* Absent */}
                <div
                  onClick={() => {
                    setModalFilterTab('Absent');
                    setActiveModal('ATTENDANCE_DETAILS');
                  }}
                  className="p-3.5 rounded-2xl bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/30 hover:border-rose-400 shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-rose-400">{todayAbsentCount}</span>
                    <div className="h-2 w-2 rounded-full bg-rose-400" />
                  </div>
                  <div className="text-[11px] font-bold text-white/70 pt-1 group-hover:text-rose-300 transition">
                    Absent
                  </div>
                </div>

                {/* Late Arrivals */}
                <div
                  onClick={() => {
                    setModalFilterTab('Late');
                    setActiveModal('ATTENDANCE_DETAILS');
                  }}
                  className="p-3.5 rounded-2xl bg-amber-950/40 hover:bg-amber-950/60 border border-amber-500/30 hover:border-amber-400 shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-amber-300">{todayLateCount}</span>
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                  </div>
                  <div className="text-[11px] font-bold text-white/70 pt-1 group-hover:text-amber-300 transition">
                    Late Arrival
                  </div>
                </div>

                {/* Early Leave */}
                <div
                  onClick={() => {
                    setModalFilterTab('Half Day');
                    setActiveModal('ATTENDANCE_DETAILS');
                  }}
                  className="p-3.5 rounded-2xl bg-purple-950/40 hover:bg-purple-950/60 border border-purple-500/30 hover:border-purple-400 shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-purple-300">{todayEarlyOutCount}</span>
                    <div className="h-2 w-2 rounded-full bg-purple-400" />
                  </div>
                  <div className="text-[11px] font-bold text-white/70 pt-1 group-hover:text-purple-300 transition">
                    Early Leave
                  </div>
                </div>

                {/* On Leave Today */}
                <div
                  onClick={() => {
                    setModalFilterTab('ALL');
                    setActiveModal('ON_LEAVE_TODAY');
                  }}
                  className="p-3.5 rounded-2xl bg-cyan-950/40 hover:bg-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400 shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-cyan-300">{todayOnLeaveCount}</span>
                    <div className="h-2 w-2 rounded-full bg-cyan-400" />
                  </div>
                  <div className="text-[11px] font-bold text-white/70 pt-1 group-hover:text-cyan-300 transition">
                    On Leave
                  </div>
                </div>

                {/* On Duty / Field */}
                <div
                  onClick={() => {
                    setModalFilterTab('On Duty');
                    setActiveModal('ATTENDANCE_DETAILS');
                  }}
                  className="p-3.5 rounded-2xl bg-teal-950/40 hover:bg-teal-950/60 border border-teal-500/30 hover:border-teal-400 shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-teal-300">{todayOnDutyCount}</span>
                    <div className="h-2 w-2 rounded-full bg-teal-400" />
                  </div>
                  <div className="text-[11px] font-bold text-white/70 pt-1 group-hover:text-teal-300 transition">
                    On Duty / Field
                  </div>
                </div>

                {/* Weekend / Holiday */}
                <div
                  onClick={() => {
                    setModalFilterTab('ALL');
                    setActiveModal('HOLIDAYS');
                  }}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-yellow-400/60 shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-white">
                      {publicHolidays.some((h) => h.date === todayDateStr) ? 1 : 0}
                    </span>
                    <div className="h-2 w-2 rounded-full bg-yellow-400" />
                  </div>
                  <div className="text-[11px] font-bold text-white/70 pt-1 group-hover:text-yellow-300 transition">
                    Public Holiday
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance & Punctuality Gauges */}
            <div className="pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/15 text-center space-y-1">
                <div className="text-xl font-black text-amber-300">{lateArrivalRatePct}%</div>
                <div className="text-xs font-bold text-white">Late Arrival %</div>
                <div className="text-[10px] text-white/60">(late count / present) × 100</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/15 text-center space-y-1">
                <div className="text-xl font-black text-purple-300">{earlyOutRatePct}%</div>
                <div className="text-xs font-bold text-white">Early Out %</div>
                <div className="text-[10px] text-white/60">(early leave / present) × 100</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/15 text-center space-y-1">
                <div className="text-xl font-black text-rose-400">{avgAbsenceDaysPerEmployee}</div>
                <div className="text-xs font-bold text-white">Avg. Absence Days/Emp</div>
                <div className="text-[10px] text-white/60">absent / total workforce</div>
              </div>
            </div>
          </div>
        );

      // ═════════════════════════════════════════════════════════════
      // WIDGET 2: LEAVE OVERVIEW
      // ═════════════════════════════════════════════════════════════
      case 'LEAVE_OVERVIEW':
        return (
          <div className="p-6 sm:p-7 rounded-[28px] border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] space-y-5 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isCustomizeMode && (
                  <GripVertical className="h-5 w-5 text-amber-400 cursor-grab active:cursor-grabbing animate-pulse" />
                )}
                <div>
                  <h3 className="text-base font-black text-white">Leave Overview</h3>
                  <p className="text-xs text-white/70 font-semibold">
                    {startDate} &rarr; {endDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalFilterTab('ALL');
                  setActiveModal('LEAVES_OVERVIEW');
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white transition cursor-pointer shadow-sm"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
              </button>
            </div>

            {/* Leave Donut Diagram */}
            <div className="py-2 flex flex-col items-center justify-center">
              <div className="relative h-36 w-36 flex items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background circle */}
                  <path
                    className="text-white/10"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Approved segment */}
                  <path
                    className="text-emerald-400"
                    strokeDasharray={`${approvedLeavePct}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Pending segment */}
                  <path
                    className="text-amber-400"
                    strokeDasharray={`${pendingLeavePct}, 100`}
                    strokeDashoffset={`-${approvedLeavePct}`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Rejected segment */}
                  <path
                    className="text-rose-400"
                    strokeDasharray={`${rejectedLeavePct}, 100`}
                    strokeDashoffset={`-${approvedLeavePct + pendingLeavePct}`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-extrabold uppercase text-white/60">Total</span>
                  <span className="text-2xl font-black text-white">{totalLeavesInPeriod}</span>
                </div>
              </div>

              {/* Legend stats */}
              <div className="grid grid-cols-3 gap-3 w-full pt-4 border-t border-white/15 text-center">
                <div>
                  <div className="flex items-center justify-center space-x-1 text-xs font-bold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Approved</span>
                  </div>
                  <div className="text-lg font-extrabold text-white pt-0.5">{approvedLeavesCount}</div>
                </div>

                <div>
                  <div className="flex items-center justify-center space-x-1 text-xs font-bold text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Pending</span>
                  </div>
                  <div className="text-lg font-extrabold text-white pt-0.5">{pendingLeavesCount}</div>
                </div>

                <div>
                  <div className="flex items-center justify-center space-x-1 text-xs font-bold text-rose-400">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <span>Rejected</span>
                  </div>
                  <div className="text-lg font-extrabold text-white pt-0.5">{rejectedLeavesCount}</div>
                </div>
              </div>
            </div>
          </div>
        );

      // ═════════════════════════════════════════════════════════════
      // WIDGET 3: ATTENDANCE ADJUSTMENTS
      // ═════════════════════════════════════════════════════════════
      case 'ATTENDANCE_ADJUSTMENTS':
        return (
          <div className="p-6 rounded-[28px] border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] space-y-4 text-white h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {isCustomizeMode && (
                    <GripVertical className="h-5 w-5 text-amber-400 cursor-grab active:cursor-grabbing animate-pulse" />
                  )}
                  <div>
                    <h3 className="text-base font-black text-white flex items-center space-x-2">
                      <span>Total Attendance Adjustments</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40">
                        {totalAdjustmentsCount} Total
                      </span>
                    </h3>
                    <p className="text-xs text-white/70 font-semibold">
                      {startDate} &rarr; {endDate}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModal('ADJUSTMENTS')}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white transition cursor-pointer shadow-sm"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
                </button>
              </div>

              {/* Pending Adjustments Alert Banner */}
              {pendingAdjustmentsCount > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-between shadow-inner">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>High pending attendance adjustments ({pendingAdjustmentsCount}) &mdash; review approvals</span>
                  </div>
                  <button
                    onClick={() => setActiveModal('ADJUSTMENTS')}
                    className="px-2.5 py-1 rounded-xl bg-amber-400 text-slate-950 text-[11px] font-black uppercase hover:bg-amber-300 transition cursor-pointer shadow-md"
                  >
                    Review
                  </button>
                </div>
              )}
            </div>

            {/* Progress Bars for Adjustments */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-300">PENDING APPROVALS</span>
                  <span className="text-white">{pendingAdjustmentsCount} (38%)</span>
                </div>
                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '38%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400">APPROVED ADJUSTMENTS</span>
                  <span className="text-white">{approvedAdjustmentsCount} (59%)</span>
                </div>
                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: '59%' }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-rose-400">REJECTED</span>
                  <span className="text-white">{rejectedAdjustmentsCount} (3%)</span>
                </div>
                <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-400 rounded-full" style={{ width: '3%' }} />
                </div>
              </div>
            </div>
          </div>
        );

      // ═════════════════════════════════════════════════════════════
      // WIDGET 4: PENDING LEAVE REQUESTS QUEUE
      // ═════════════════════════════════════════════════════════════
      case 'PENDING_LEAVES':
        return (
          <div className="p-6 rounded-[28px] border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] space-y-4 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isCustomizeMode && (
                  <GripVertical className="h-5 w-5 text-amber-400 cursor-grab active:cursor-grabbing animate-pulse" />
                )}
                <div>
                  <h3 className="text-base font-black text-white">Pending Leave Requests</h3>
                  <p className="text-xs text-white/70 font-semibold">Instant Action Queue</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalFilterTab('Pending');
                  setActiveModal('PENDING_LEAVES');
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white transition cursor-pointer shadow-sm"
              >
                <span>View All ({pendingLeaveQueue.length})</span>
                <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
              </button>
            </div>

            {pendingLeaveQueue.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/15 text-center space-y-2 my-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-white">All leave requests reviewed!</p>
                <p className="text-[11px] text-white/70">No pending applications requiring approval.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                {pendingLeaveQueue.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold flex items-center justify-center text-xs flex-shrink-0">
                          {req.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-white">{req.employeeName}</div>
                          <div className="text-[10px] text-white/70 font-semibold">
                            {req.department || 'General'} &bull; {req.leaveType}
                          </div>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {req.totalDays} {req.totalDays === 1 ? 'Day' : 'Days'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/70">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3 text-amber-400" />
                        <span>{req.fromDate} &rarr; {req.toDate}</span>
                      </div>
                      <span className="text-[10px] italic truncate max-w-[130px] text-white/80">&ldquo;{req.reason}&rdquo;</span>
                    </div>

                    {/* Quick Approve / Reject Buttons */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleRejectLeave(req)}
                        className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase transition cursor-pointer flex items-center space-x-1"
                      >
                        <X className="h-3 w-3" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleApproveLeave(req)}
                        className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 text-[10px] font-black uppercase transition cursor-pointer shadow-md flex items-center space-x-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ═════════════════════════════════════════════════════════════
      // WIDGET 5: HEADCOUNT BY DEPARTMENT
      // ═════════════════════════════════════════════════════════════
      case 'HEADCOUNT_DEPT':
        return (
          <div className="p-6 sm:p-7 rounded-[28px] border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] space-y-5 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isCustomizeMode && (
                  <GripVertical className="h-5 w-5 text-amber-400 cursor-grab active:cursor-grabbing animate-pulse" />
                )}
                <div>
                  <h3 className="text-base font-black text-white">Headcount by Department</h3>
                  <p className="text-xs text-white/70 font-semibold">Workforce talent distribution</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-white/10 border border-white/20 text-white">
                {departmentDistribution.length} Departments
              </span>
            </div>

            {/* Department horizontal bars */}
            <div className="space-y-3 pt-1">
              {departmentDistribution.slice(0, 5).map((dept) => (
                <div
                  key={dept.name}
                  onClick={() => {
                    setSelectedDeptForRoster(dept.name);
                    setModalFilterTab('ALL');
                    setActiveModal('DEPARTMENT_ROSTER');
                  }}
                  className="space-y-1 p-2 rounded-2xl hover:bg-white/10 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white group-hover:text-amber-300 transition">{dept.name}</span>
                    <span className="text-white/70 group-hover:text-white">
                      {dept.count} Staff ({dept.pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-md"
                      style={{ width: `${Math.max(5, dept.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      // ═════════════════════════════════════════════════════════════
      // WIDGET 6: CULTURE, CELEBRATIONS & PUBLIC HOLIDAYS
      // ═════════════════════════════════════════════════════════════
      case 'CELEBRATIONS_HOLIDAYS':
        return (
          <div className="p-6 sm:p-7 rounded-[28px] border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] space-y-5 text-white h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {isCustomizeMode && (
                  <GripVertical className="h-5 w-5 text-amber-400 cursor-grab active:cursor-grabbing animate-pulse" />
                )}
                <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-white/10 border border-white/20">
                  <button
                    onClick={() => setCultureTab('BIRTHDAYS')}
                    className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition cursor-pointer ${
                      cultureTab === 'BIRTHDAYS'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Birthdays ({monthlyBirthdays.length})
                  </button>
                  <button
                    onClick={() => setCultureTab('HOLIDAYS')}
                    className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition cursor-pointer ${
                      cultureTab === 'HOLIDAYS'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Holidays ({publicHolidays.length})
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setModalFilterTab('ALL');
                  setActiveModal(cultureTab === 'BIRTHDAYS' ? 'BIRTHDAYS' : 'HOLIDAYS');
                }}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white transition cursor-pointer shadow-sm"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
              </button>
            </div>

            {/* Content Area */}
            {cultureTab === 'BIRTHDAYS' ? (
              monthlyBirthdays.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white/5 border border-white/15 text-center text-xs text-white/70 my-auto">
                  No birthdays recorded for this month.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                  {monthlyBirthdays.slice(0, 4).map((bEmp) => (
                    <div
                      key={bEmp.id}
                      onClick={() => setSelectedProfile(bEmp)}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-amber-400/50 transition flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-105 transition">
                          {bEmp.avatarUrl ? (
                            <Image
                              src={bEmp.avatarUrl}
                              alt={bEmp.name}
                              width={36}
                              height={36}
                              className="h-full w-full object-cover rounded-2xl"
                            />
                          ) : (
                            bEmp.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-black text-white group-hover:text-amber-300 transition">
                            {bEmp.name}
                          </div>
                          <div className="text-[10px] text-white/70 font-semibold truncate max-w-[160px]">
                            {bEmp.department || 'General Staff'} &bull; {bEmp.designation}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        bEmp.diffDays === 0
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-md animate-bounce font-extrabold'
                          : bEmp.diffDays > 0 && bEmp.diffDays <= 7
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-white/10 text-white/70 border border-white/20'
                      }`}>
                        {bEmp.diffDays === 0
                          ? 'Today 🎉'
                          : bEmp.diffDays > 0
                          ? `In ${bEmp.diffDays} Days`
                          : bEmp.formattedBirthday.slice(0, 6)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                {upcomingHolidays.slice(0, 4).map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-extrabold text-white">{h.title}</div>
                      <div className="text-[10px] text-white/70">{h.type} Holiday &bull; {h.totalDays} {h.totalDays === 1 ? 'Day' : 'Days'}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-extrabold text-[11px]">
                      {h.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ═════════════════════════════════════════════════════════════
      // WIDGET 7: GENDER COMPOSITION
      // ═════════════════════════════════════════════════════════════
      case 'GENDER_COMPOSITION':
        return (
          <div className="p-6 rounded-[28px] border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] space-y-4 text-white h-full flex flex-col justify-between">
            <div className="flex items-center space-x-2">
              {isCustomizeMode && (
                <GripVertical className="h-5 w-5 text-amber-400 cursor-grab active:cursor-grabbing animate-pulse" />
              )}
              <div>
                <h4 className="text-base font-black text-white">Gender Composition</h4>
                <p className="text-xs text-white/70 font-semibold">Workforce talent diversity</p>
              </div>
            </div>

            {/* Multi-segmented bar */}
            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex shadow-inner">
              <div className="h-full bg-sky-400" style={{ width: `${genderDistribution.malePct}%` }} title="Male" />
              <div className="h-full bg-amber-400" style={{ width: `${genderDistribution.femalePct}%` }} title="Female" />
              <div className="h-full bg-slate-400" style={{ width: `${genderDistribution.otherPct}%` }} title="Other" />
            </div>

            <div className="space-y-2 pt-1 text-xs font-bold">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                  <span className="text-white/70">Male</span>
                </div>
                <span className="text-white">{genderDistribution.male} ({genderDistribution.malePct}%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-white/70">Female</span>
                </div>
                <span className="text-white">{genderDistribution.female} ({genderDistribution.femalePct}%)</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span className="text-white/70">Other / Undisclosed</span>
                </div>
                <span className="text-white">{genderDistribution.other} ({genderDistribution.otherPct}%)</span>
              </div>
            </div>
          </div>
        );

      // ═════════════════════════════════════════════════════════════
      // WIDGET 8: PAYROLL & COMPENSATION PULSE
      // ═════════════════════════════════════════════════════════════
      case 'PAYROLL_PULSE':
        return (
          <div
            onClick={() => {
              setModalFilterTab('ALL');
              setActiveModal('PAYROLL_OVERVIEW');
            }}
            className="p-6 rounded-[28px] border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] space-y-4 cursor-pointer hover:border-amber-400/50 transition group text-white h-full flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isCustomizeMode && (
                  <GripVertical className="h-5 w-5 text-amber-400 cursor-grab active:cursor-grabbing animate-pulse" />
                )}
                <div>
                  <h4 className="text-base font-black text-white group-hover:text-amber-300 transition">
                    Compensation &amp; Payroll Pulse
                  </h4>
                  <p className="text-xs text-white/70 font-semibold">Monthly readiness audit</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-amber-400" />
            </div>

            <div className="space-y-2 pt-1 text-xs font-bold">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Est. Monthly Payroll</span>
                <span className="text-amber-300">BDT {payrollSummary.totalEstimatedWage.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">Bank Account Readiness</span>
                <span className="text-emerald-400">{payrollSummary.bankReadinessPct}%</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">Fixed Salary Staff</span>
                <span className="text-white">{payrollSummary.fixedWageCount}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">Hourly / Part-Time</span>
                <span className="text-white">{payrollSummary.hourlyWageCount}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">
              &bull; Click to inspect compensation breakdown
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen space-y-6 select-none pb-14">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 flex items-center space-x-3 text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-300'
              : 'bg-amber-950/90 border-amber-500/50 text-amber-300'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertTriangle className="h-4 w-4 text-rose-400" />}
          {toast.type === 'info' && <Sparkles className="h-4 w-4 text-amber-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── 1. EXECUTIVE HERO COMMAND BANNER (DARK BLACK GLASS) ─── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/20 bg-black/70 backdrop-blur-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] p-6 sm:p-8 text-white">
        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Left Welcome Branding */}
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-md shadow-inner">
              <Sparkles className="h-3.5 w-3.5" />
              <span>People &amp; Culture Intelligence &bull; JAAGO Foundation</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
              Welcome back to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400">Workspace</span> 👋
            </h1>
            <p className="text-xs sm:text-sm text-white/85 font-medium leading-relaxed">
              Track and manage workforce capacity, live attendance radar, leave authorizations, and talent growth in real-time.
            </p>
          </div>

          {/* Right Corner: Team Avatar Illustration (without background) */}
          <div className="relative w-56 sm:w-72 lg:w-80 h-32 sm:h-36 lg:h-44 -my-4 self-center lg:self-end flex-shrink-0">
            <Image
              src="/pnc-team-avatar.png"
              alt="P&C Team Avatar"
              fill
              priority
              className="object-contain object-right-bottom drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] hover:scale-105 transition duration-300 pointer-events-none select-none"
            />
          </div>
        </div>

        {/* Dynamic Date Filter Bar & Drag Customization Toolbar */}
        <div className="mt-5 pt-4 border-t border-white/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/70 border border-white/20 backdrop-blur-md">
            {(
              [
                { key: 'TODAY', label: 'Today' },
                { key: 'YESTERDAY', label: 'Yesterday' },
                { key: 'THIS_WEEK', label: 'This Week' },
                { key: 'MTD', label: 'Month to Date (MTD)' },
                { key: 'YTD', label: 'Year to Date (YTD)' },
                { key: 'CUSTOM', label: 'Custom' },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                onClick={() => handleDatePresetChange(p.key)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition cursor-pointer ${
                  datePreset === p.key
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md scale-100 font-extrabold'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker Range Inputs */}
            <div className="flex items-center space-x-2 text-xs font-bold">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md shadow-inner">
                <span className="text-white/60 text-[10px] uppercase font-extrabold">Start:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className="bg-transparent text-white focus:outline-none text-xs font-semibold cursor-pointer"
                />
              </div>

              <span className="text-white/40 font-bold">&rarr;</span>

              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md shadow-inner">
                <span className="text-white/60 text-[10px] uppercase font-extrabold">End:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className="bg-transparent text-white focus:outline-none text-xs font-semibold cursor-pointer"
                />
              </div>
            </div>

            {/* Rearrange / Customize Layout Mode Switcher */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setIsCustomizeMode(!isCustomizeMode)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-md ${
                  isCustomizeMode
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
                title="Toggle Drag & Drop Dashboard Rearrange Mode"
              >
                <Move className="h-3.5 w-3.5" />
                <span>{isCustomizeMode ? 'Done Rearranging' : 'Rearrange Grid'}</span>
              </button>

              {isCustomizeMode && (
                <button
                  onClick={handleResetWidgetOrder}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 transition cursor-pointer"
                  title="Reset Layout to Standard"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── 2. CORE EXECUTIVE KPI SCORECARD (DARK BLACK GLASS) ───── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: TOTAL EMPLOYEES */}
        <div
          onClick={() => {
            setModalFilterTab('ALL');
            setActiveModal('EMPLOYEES');
          }}
          className="group relative p-5 rounded-3xl border border-white/20 bg-black/70 hover:bg-black/85 hover:border-amber-400/60 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70 group-hover:text-amber-300 transition">
              TOTAL EMPLOYEES
            </span>
            <div className="h-10 w-10 rounded-2xl bg-blue-500/20 border border-blue-400/40 text-blue-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="py-2">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline space-x-2 drop-shadow-sm">
              <span>{totalEmployeesCount}</span>
              <span className="text-xs font-bold text-white/60">Staff</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1 pt-1">
              <span>▲ 1.6%</span>
              <span className="text-white/60 font-normal">vs prev cycle</span>
            </div>
          </div>

          {/* Sparkline Visual */}
          <div className="h-6 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 20">
              <path d="M 0 16 Q 30 12, 60 8 T 100 4" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/60 font-semibold">
            <span>View directory</span>
            <ArrowUpRight className="h-3 w-3 text-amber-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>

        {/* KPI 2: ACTIVE EMPLOYEES */}
        <div
          onClick={() => {
            setModalFilterTab('ALL');
            setActiveModal('ACTIVE_WORKFORCE');
          }}
          className="group relative p-5 rounded-3xl border border-white/20 bg-black/70 hover:bg-black/85 hover:border-emerald-400/60 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70 group-hover:text-emerald-300 transition">
              ACTIVE WORKFORCE
            </span>
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="py-2">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline space-x-2 drop-shadow-sm">
              <span>{activeEmployeesCount}</span>
              <span className="text-xs font-bold text-emerald-400">
                {totalEmployeesCount > 0 ? `${Math.round((activeEmployeesCount / totalEmployeesCount) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1 pt-1">
              <span>▲ Deployment</span>
              <span className="text-white/60 font-normal">verified live</span>
            </div>
          </div>

          {/* Sparkline Visual */}
          <div className="h-6 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 20">
              <path d="M 0 14 Q 25 15, 50 10 T 100 3" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/60 font-semibold">
            <span>Active roster</span>
            <ArrowUpRight className="h-3 w-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>

        {/* KPI 3: INCOMPLETE PROFILES */}
        <div
          onClick={() => {
            setModalFilterTab('ALL');
            setActiveModal('INCOMPLETE_PROFILES');
          }}
          className="group relative p-5 rounded-3xl border border-white/20 bg-black/70 hover:bg-black/85 hover:border-amber-400/60 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70 group-hover:text-amber-300 transition">
              INCOMPLETE PROFILES
            </span>
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="py-2">
            <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-tight flex items-baseline space-x-2 drop-shadow-sm">
              <span>{incompleteProfiles.length}</span>
              <span className="text-xs font-bold text-white/60">Audited</span>
            </div>
            <div className="text-[11px] font-bold text-amber-300/90 flex items-center space-x-1 pt-1">
              <span>▲ Requires Action</span>
            </div>
          </div>

          {/* Sparkline Visual */}
          <div className="h-6 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 20">
              <path d="M 0 10 L 30 14 L 60 8 L 100 12" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/60 font-semibold">
            <span>Fix data gaps</span>
            <ArrowUpRight className="h-3 w-3 text-amber-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>

        {/* KPI 4: NEWLY JOINED EMPLOYEES */}
        <div
          onClick={() => {
            setModalFilterTab('ALL');
            setActiveModal('NEW_JOINERS');
          }}
          className="group relative p-5 rounded-3xl border border-white/20 bg-black/70 hover:bg-black/85 hover:border-cyan-400/60 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70 group-hover:text-cyan-300 transition">
              NEW JOINERS
            </span>
            <div className="h-10 w-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>

          <div className="py-2">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline space-x-2 drop-shadow-sm">
              <span>{newJoiners.length}</span>
              <span className="text-xs font-bold text-cyan-300">Onboarding</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1 pt-1">
              <span>▲ +{newJoiners.length}</span>
              <span className="text-white/60 font-normal">in period</span>
            </div>
          </div>

          {/* Sparkline Visual */}
          <div className="h-6 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 20">
              <path d="M 0 18 L 25 14 L 50 8 L 75 12 L 100 5" fill="none" stroke="#22D3EE" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/60 font-semibold">
            <span>Onboarding list</span>
            <ArrowUpRight className="h-3 w-3 text-cyan-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>

        {/* KPI 5: ATTRITION */}
        <div
          onClick={() => {
            setModalFilterTab('ALL');
            setActiveModal('ATTRITION');
          }}
          className="group relative p-5 rounded-3xl border border-white/20 bg-black/70 hover:bg-black/85 hover:border-rose-400/60 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70 group-hover:text-rose-300 transition">
              ATTRITION / EXITS
            </span>
            <div className="h-10 w-10 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <UserMinus className="h-5 w-5" />
            </div>
          </div>

          <div className="py-2">
            <div className="text-3xl sm:text-4xl font-black text-rose-300 tracking-tight flex items-baseline space-x-2 drop-shadow-sm">
              <span>{attritionEmployees.length}</span>
              <span className="text-xs font-bold text-white/60">Exited</span>
            </div>
            <div className="text-[11px] font-bold text-rose-300/90 flex items-center space-x-1 pt-1">
              <span>▼ Exit reviews</span>
            </div>
          </div>

          {/* Sparkline Visual */}
          <div className="h-6 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 20">
              <path d="M 0 6 Q 35 12, 65 14 T 100 18" fill="none" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/60 font-semibold">
            <span>Exit reasons</span>
            <ArrowUpRight className="h-3 w-3 text-rose-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>

        {/* KPI 6: GROWTH RATE */}
        <div
          onClick={() => {
            setModalFilterTab('ALL');
            setActiveModal('GROWTH_RATE');
          }}
          className="group relative p-5 rounded-3xl border border-white/20 bg-black/70 hover:bg-black/85 hover:border-purple-400/60 shadow-[0_8px_30px_rgb(0,0,0,0.5)] backdrop-blur-2xl transition duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70 group-hover:text-purple-300 transition">
              GROWTH RATE (%)
            </span>
            <div className="h-10 w-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="py-2">
            <div className={`text-3xl sm:text-4xl font-black tracking-tight flex items-baseline space-x-1 drop-shadow-sm ${growthRatePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{growthRatePct > 0 ? `+${growthRatePct}` : growthRatePct}%</span>
            </div>
            <div className="text-[11px] font-bold text-white/70 flex items-center space-x-1 pt-1">
              <span>{growthRatePct >= 0 ? '▲ Positive Expansion' : '▼ Contraction'}</span>
            </div>
          </div>

          {/* Sparkline Visual */}
          <div className="h-6 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 20">
              <path d="M 0 14 L 30 10 L 60 16 L 100 6" fill="none" stroke="#C084FC" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/60 font-semibold">
            <span>Talent velocity</span>
            <ArrowUpRight className="h-3 w-3 text-purple-400 opacity-0 group-hover:opacity-100 transition" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── 3. REORDERABLE MODULAR DASHBOARD GRID (ZERO GAPS) ────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {widgetOrder.map((widgetId) => {
          const isDragging = draggedWidgetId === widgetId;
          const isOver = dragOverWidgetId === widgetId;

          return (
            <div
              key={widgetId}
              draggable={isCustomizeMode}
              onDragStart={(e) => handleDragStart(e, widgetId)}
              onDragOver={(e) => handleDragOver(e, widgetId)}
              onDragLeave={(e) => handleDragLeave(e, widgetId)}
              onDrop={(e) => handleDrop(e, widgetId)}
              className={`transition-all duration-200 flex flex-col ${
                isDragging ? 'opacity-40 scale-95' : 'opacity-100'
              } ${
                isOver ? 'ring-2 ring-amber-400 rounded-[28px] scale-[1.01]' : ''
              } ${
                isCustomizeMode ? 'cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-amber-400/40 rounded-[28px]' : ''
              }`}
            >
              {renderWidget(widgetId)}
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── 4. THE CORE INTERACTIVE GLASS THEME BASE POPUP MODAL ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-[32px] border border-white/30 bg-black/85 shadow-[0_20px_60px_0_rgba(0,0,0,0.8)] backdrop-blur-3xl p-6 sm:p-8 space-y-5 text-white flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/20 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-black shadow-inner">
                  {activeModal === 'EMPLOYEES' && <Users className="h-5 w-5" />}
                  {activeModal === 'ACTIVE_WORKFORCE' && <UserCheck className="h-5 w-5" />}
                  {activeModal === 'NEW_JOINERS' && <UserPlus className="h-5 w-5" />}
                  {activeModal === 'ATTRITION' && <UserMinus className="h-5 w-5" />}
                  {activeModal === 'INCOMPLETE_PROFILES' && <AlertTriangle className="h-5 w-5" />}
                  {activeModal === 'ATTENDANCE_DETAILS' && <Clock className="h-5 w-5" />}
                  {activeModal === 'LEAVES_OVERVIEW' && <Calendar className="h-5 w-5" />}
                  {activeModal === 'PENDING_LEAVES' && <Clock4 className="h-5 w-5" />}
                  {activeModal === 'ON_LEAVE_TODAY' && <CalendarDays className="h-5 w-5" />}
                  {activeModal === 'BIRTHDAYS' && <Cake className="h-5 w-5" />}
                  {activeModal === 'HOLIDAYS' && <CalendarDays className="h-5 w-5" />}
                  {activeModal === 'DEPARTMENT_ROSTER' && <Building2 className="h-5 w-5" />}
                  {activeModal === 'PAYROLL_OVERVIEW' && <DollarSign className="h-5 w-5" />}
                  {activeModal === 'ADJUSTMENTS' && <SlidersHorizontal className="h-5 w-5" />}
                  {activeModal === 'GROWTH_RATE' && <Activity className="h-5 w-5" />}
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {activeModal === 'EMPLOYEES' && 'Total Workforce Directory'}
                    {activeModal === 'ACTIVE_WORKFORCE' && 'Active Workforce Roster'}
                    {activeModal === 'NEW_JOINERS' && 'Newly Joined Employees'}
                    {activeModal === 'ATTRITION' && 'Attrition & Exited Records'}
                    {activeModal === 'INCOMPLETE_PROFILES' && 'Incomplete Profiles Resolution'}
                    {activeModal === 'ATTENDANCE_DETAILS' && 'Attendance Logs & Shifts'}
                    {activeModal === 'LEAVES_OVERVIEW' && 'Leave & Time-Off Management'}
                    {activeModal === 'PENDING_LEAVES' && 'Pending Leave Authorizations'}
                    {activeModal === 'ON_LEAVE_TODAY' && 'Employees On Leave Today'}
                    {activeModal === 'BIRTHDAYS' && 'Monthly Celebrations Roster'}
                    {activeModal === 'HOLIDAYS' && 'Public Holidays Calendar'}
                    {activeModal === 'DEPARTMENT_ROSTER' && `${selectedDeptForRoster} Department Roster`}
                    {activeModal === 'PAYROLL_OVERVIEW' && 'Compensation & Payroll Overview'}
                    {activeModal === 'ADJUSTMENTS' && 'Attendance Adjustments Queue'}
                    {activeModal === 'GROWTH_RATE' && 'Workforce Growth & Talent Velocity'}
                  </h3>
                  <p className="text-xs text-white/70 font-semibold">
                    People and Culture Executive Intelligence &bull; Glass Drilldown
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setActiveModal(null);
                  setModalSearch('');
                  setModalFilterTab('ALL');
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
                title="Close Window"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Search by name, employee code, designation, department..."
                  className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/25 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs font-semibold backdrop-blur-md"
                />
              </div>

              {/* Quick direct route button */}
              {activeModal === 'EMPLOYEES' && (
                <Link
                  href="/pnc/employees"
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center space-x-1.5 shadow-lg"
                >
                  <span>Open Full Directory</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {activeModal === 'LEAVES_OVERVIEW' && (
                <Link
                  href="/pnc/time-off/requests"
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center space-x-1.5 shadow-lg"
                >
                  <span>Open Leave Center</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {activeModal === 'ATTENDANCE_DETAILS' && (
                <Link
                  href="/pnc/attendance/logs"
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition flex items-center space-x-1.5 shadow-lg"
                >
                  <span>Open Attendance Module</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-3 pr-1.5 no-scrollbar">
              {/* RENDER EMPLOYEE / ACTIVE / INCOMPLETE / NEW JOINERS / ATTRITION / ROSTER LIST */}
              {(activeModal === 'EMPLOYEES' ||
                activeModal === 'ACTIVE_WORKFORCE' ||
                activeModal === 'NEW_JOINERS' ||
                activeModal === 'ATTRITION' ||
                activeModal === 'INCOMPLETE_PROFILES' ||
                activeModal === 'DEPARTMENT_ROSTER') && (
                <div className="space-y-2.5">
                  {getModalFilteredData().map((emp: any) => (
                    <div
                      key={emp.id}
                      onClick={() => {
                        setSelectedProfile(emp);
                      }}
                      className="p-4 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/15 hover:border-amber-400/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="h-11 w-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold flex items-center justify-center text-sm flex-shrink-0 group-hover:scale-105 transition">
                          {emp.avatarUrl ? (
                            <Image
                              src={emp.avatarUrl}
                              alt={emp.name}
                              width={44}
                              height={44}
                              className="h-full w-full object-cover rounded-2xl"
                            />
                          ) : (
                            emp.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-extrabold text-white group-hover:text-amber-300 transition">
                              {emp.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/20">
                              {emp.code}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                emp.status === 'Active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              }`}
                            >
                              {emp.status}
                            </span>
                          </div>
                          <div className="text-xs text-white/70 pt-0.5">
                            {emp.designation} &bull; {emp.department || 'General'}
                          </div>
                          {activeModal === 'INCOMPLETE_PROFILES' && (
                            <div className="text-[10px] text-amber-300 font-semibold pt-1 flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>
                                Missing: {!emp.nid ? 'NID, ' : ''}
                                {!emp.bankAccountNumber ? 'Bank Details, ' : ''}
                                {!emp.emergencyPhone ? 'Emergency Contact' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProfile(emp);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-xs font-bold text-white transition flex items-center space-x-1"
                        >
                          <Eye className="h-3.5 w-3.5 text-amber-300" />
                          <span>View Profile</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {getModalFilteredData().length === 0 && (
                    <div className="p-8 text-center text-xs text-white/60">
                      No matching records found.
                    </div>
                  )}
                </div>
              )}

              {/* RENDER ATTENDANCE LOG DETAILS */}
              {activeModal === 'ATTENDANCE_DETAILS' && (
                <div className="space-y-2.5">
                  {getModalFilteredData().map((log: any) => (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-2xl bg-blue-500/20 text-blue-300 font-extrabold flex items-center justify-center">
                          {log.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-extrabold text-white text-sm">{log.employeeName}</div>
                          <div className="text-white/70">
                            {log.employeeCode} &bull; {log.department} &bull; {log.date}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="text-[10px] text-white/60 uppercase font-bold">In &bull; Out</div>
                          <div className="font-extrabold text-white">
                            {log.checkInTime || '--:--'} &rarr; {log.checkOutTime || '--:--'}
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-black uppercase ${
                            log.status === 'Present'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : log.status === 'Late'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : log.status === 'On Duty'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RENDER LEAVE REQUESTS / PENDING / ON LEAVE TODAY */}
              {(activeModal === 'LEAVES_OVERVIEW' ||
                activeModal === 'PENDING_LEAVES' ||
                activeModal === 'ON_LEAVE_TODAY') && (
                <div className="space-y-2.5">
                  {getModalFilteredData().map((req: any) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-white text-sm">{req.employeeName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {req.leaveType}
                          </span>
                        </div>
                        <div className="text-white/70">
                          {req.fromDate} &rarr; {req.toDate} ({req.totalDays} Days)
                        </div>
                        <div className="text-[11px] text-white/60 italic">&ldquo;{req.reason}&rdquo;</div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {req.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleRejectLeave(req)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-black uppercase transition cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveLeave(req)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase transition cursor-pointer shadow-md"
                            >
                              Approve
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                              req.status === 'Approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* RENDER HOLIDAYS */}
              {activeModal === 'HOLIDAYS' && (
                <div className="space-y-2.5">
                  {publicHolidays.map((h) => (
                    <div
                      key={h.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-black text-white text-sm">{h.title}</div>
                        <div className="text-white/70">{h.type} Holiday &bull; {h.totalDays} Days</div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-black text-xs">
                        {h.date}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* RENDER PAYROLL OVERVIEW */}
              {activeModal === 'PAYROLL_OVERVIEW' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/15 text-center space-y-1">
                      <div className="text-xs text-white/60 uppercase font-bold">Total Monthly Load</div>
                      <div className="text-xl font-black text-amber-300">
                        BDT {payrollSummary.totalEstimatedWage.toLocaleString()}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/15 text-center space-y-1">
                      <div className="text-xs text-white/60 uppercase font-bold">Bank Info Complete</div>
                      <div className="text-xl font-black text-emerald-300">
                        {payrollSummary.bankAccountCount} / {totalEmployeesCount} ({payrollSummary.bankReadinessPct}%)
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/15 text-center space-y-1">
                      <div className="text-xs text-white/60 uppercase font-bold">Salary Wage Types</div>
                      <div className="text-xl font-black text-white">
                        {payrollSummary.fixedWageCount} Fixed &bull; {payrollSummary.hourlyWageCount} Hourly
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                    <p className="font-bold">&bull; 25-Year HR Expert Strategic Recommendation:</p>
                    <p className="leading-relaxed text-white/80">
                      Ensure 100% bank detail verification for the {incompleteProfiles.length} audited profiles before dispatching the end-of-month salary disbursement batch.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── 5. FULL EMPLOYEE PROFILE DETAIL DRAWER / MODAL ──────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl max-h-[96vh] rounded-[32px] border border-white/30 bg-slate-950 shadow-2xl p-4 sm:p-6 overflow-y-auto">
            <EmployeeProfileDetail
              initialData={selectedProfile}
              allEmployees={employees}
              currentUser={{ fullName: 'HR Executive', jobTitle: 'People & Culture Lead' }}
              onBack={() => setSelectedProfile(null)}
              onSave={async (updated) => {
                await saveEmployeeToSupabase(updated);
                setSelectedProfile(null);
                showToast(`Employee profile for ${updated.name} updated!`, 'success');
                loadDashboardData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
