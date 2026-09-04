'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Trash2,
  AlertCircle,
  RotateCw,
  AlertTriangle,
  Upload,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  FileText,
  X,
  Sparkles,
  Paperclip,
} from 'lucide-react';
import {
  LeaveRequestItem,
  LeaveType,
  HalfDayType,
  BEREAVEMENT_RELATIONSHIPS,
  BereavementRelationship,
  QUICK_LEAVE_POLICIES,
  fetchLeaveRequests,
  saveLeaveRequest,
  deleteLeaveRequest,
  fetchLeaveAllocations,
  LeaveAllocationItem,
} from '@/lib/supabase-time-off';
import { fetchEmployeesFromSupabase } from '@/lib/supabase-employees';
import {
  getActiveEmployeeProfile,
  getCurrentUserSession,
} from '@/lib/user-profile-sync';
import { useAbility } from '@/lib/casl-ability';
import { createNotification } from '@/lib/notifications';

// ── MODERN CIRCULAR PROGRESS DONUT RING ──
function CircularProgress({
  percentage,
  strokeColor,
  size = 64,
  strokeWidth = 6,
}: {
  percentage: number;
  strokeColor: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-foreground/10 opacity-40"
        />
        {/* Progress Value Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-foreground tracking-tight">
        {Math.round(clamped)}%
      </div>
    </div>
  );
}

export default function MyLeavePage() {
  const ability = useAbility();
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocationItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [leaveCategory, setLeaveCategory] = useState<LeaveType>('Casual Leave');
  const [leaveDurationMode, setLeaveDurationMode] = useState<'FULL' | 'HALF'>('FULL');
  const [halfPeriod, setHalfPeriod] = useState<'First Half' | 'Second Half'>('First Half');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]!);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]!);
  const [reason, setReason] = useState<string>('');
  const [bereavementRelation, setBereavementRelation] = useState<BereavementRelationship | ''>('');
  const [pregnancyDate, setPregnancyDate] = useState<string>('');
  const [eddDate, setEddDate] = useState<string>('');
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comp Off Ledger toggle
  const [showCompLedger, setShowCompLedger] = useState<boolean>(false);

  // Detail Modal
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);

  const loadData = async () => {
    const [reqs, allocs, emps] = await Promise.all([
      fetchLeaveRequests(),
      fetchLeaveAllocations(),
      fetchEmployeesFromSupabase(),
    ]);
    if (reqs) setRequests(reqs);
    if (allocs) setAllocations(allocs);
    if (emps && emps.length > 0) {
      setEmployees(emps);
      setSelectedEmpCode((prev) => {
        if (prev && emps.some((e) => e.code === prev)) return prev;
        const currentSession = getCurrentUserSession();
        const match = emps.find(
          (e) =>
            (currentSession?.employeeCode && e.code === currentSession.employeeCode) ||
            (currentSession?.email && (e.workEmail?.toLowerCase() === currentSession.email.toLowerCase() || e.personalEmail?.toLowerCase() === currentSession.email.toLowerCase()))
        );
        return match?.code || emps[0]?.code || '';
      });
    }
  };

  useEffect(() => {
    // Initial sync with active user session
    const sessionUser = getCurrentUserSession();
    if (sessionUser?.employeeCode) {
      setSelectedEmpCode(sessionUser.employeeCode);
    }
    getActiveEmployeeProfile().then((p) => {
      if (p?.code) {
        setSelectedEmpCode((prev) => prev || p.code);
      }
    });

    loadData();

    const handleAllocUpdate = () => {
      loadData();
    };
    const handleReqUpdate = () => {
      loadData();
    };
    const handleUserUpdate = (e: any) => {
      const user = e.detail?.user;
      if (user?.employeeCode) {
        setSelectedEmpCode(user.employeeCode);
      }
      loadData();
    };

    window.addEventListener('jaago_leave_allocation_updated', handleAllocUpdate);
    window.addEventListener('jaago_leave_request_updated', handleReqUpdate);
    window.addEventListener('jaago_user_updated', handleUserUpdate);
    window.addEventListener('jaago_employees_updated', handleAllocUpdate);

    return () => {
      window.removeEventListener('jaago_leave_allocation_updated', handleAllocUpdate);
      window.removeEventListener('jaago_leave_request_updated', handleReqUpdate);
      window.removeEventListener('jaago_user_updated', handleUserUpdate);
      window.removeEventListener('jaago_employees_updated', handleAllocUpdate);
    };
  }, []);

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Active Employee resolution
  const session = getCurrentUserSession();
  const currentEmp =
    employees.find((e) => e.code === selectedEmpCode) ||
    employees.find((e) => session?.employeeCode && e.code === session.employeeCode) ||
    employees.find((e) => session?.email && (e.workEmail?.toLowerCase() === session.email.toLowerCase() || e.personalEmail?.toLowerCase() === session.email.toLowerCase())) ||
    employees[0] || {
      name: session?.fullName || 'Staff Member',
      code: session?.employeeCode || 'EMP-001',
      department: session?.department || "Founder's Office",
      designation: session?.jobTitle || 'Staff',
    };

  // Current Employee Allocation
  const hasAllocation = Boolean(allocations.find((a) => a.employeeCode === currentEmp.code));
  const currentAlloc = allocations.find((a) => a.employeeCode === currentEmp.code) || {
    casualAllocated: 0,
    casualUsed: 0,
    medicalAllocated: 0,
    medicalUsed: 0,
    emergencyAllocated: 0,
    emergencyUsed: 0,
    annualAllocated: 0,
    annualUsed: 0,
    maternityAllocated: 0,
    maternityUsed: 0,
    paternityAllocated: 0,
    paternityUsed: 0,
    compOffAllocated: 0,
    compOffUsed: 0,
    bereavementUsed: 0,
  };

  const isHalfDayAllowed = (type: LeaveType): boolean => {
    return (
      type === 'Casual Leave' ||
      type === 'Medical Leave' ||
      type === 'Emergency Leave' ||
      type === 'Compensatory Leave'
    );
  };

  // Calculate duration days
  const calculateTotalDays = (): number => {
    if (leaveCategory === 'Maternity Leave') return 120;
    if (leaveCategory === 'Paternity Leave') return 15;
    if (isHalfDayAllowed(leaveCategory) && leaveDurationMode === 'HALF') {
      return 0.5;
    }
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
      return Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
    }
    return 1;
  };

  const totalCalculatedDays = calculateTotalDays();

  // Validate policy rules
  useEffect(() => {
    setValidationError(null);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startObj = new Date(startDate);
    startObj.setHours(0, 0, 0, 0);

    if (leaveCategory === 'Casual Leave') {
      if (totalCalculatedDays > 3 && leaveDurationMode === 'FULL') {
        setValidationError(
          'Policy Warning: Maximum 3 consecutive days can be applied for Casual Leave. For longer leaves, please apply for Annual Leave.'
        );
        return;
      }
      if (startObj <= today) {
        setValidationError(
          'Policy Requirement: Casual Leave application must be submitted at least 1 day before the leave start date.'
        );
        return;
      }
    }

    if (leaveCategory === 'Annual Leave') {
      if (totalCalculatedDays < 5) {
        setValidationError(
          'Policy Requirement: Annual Leave requires a minimum of 5 consecutive working days per application.'
        );
        return;
      }
      const daysUntilLeave = Math.round((startObj.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (daysUntilLeave < 10) {
        setValidationError(
          'Policy Requirement: Annual Leave application must be submitted at least 10 days in advance.'
        );
        return;
      }
    }

    if (leaveCategory === 'Paternity Leave') {
      const daysUntilLeave = Math.round((startObj.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (daysUntilLeave < 7) {
        setValidationError(
          'Policy Requirement: Paternity Leave application must be submitted at least 7 days before start date.'
        );
        return;
      }
    }
  }, [leaveCategory, leaveDurationMode, startDate, endDate, totalCalculatedDays]);

  const getAvailableBalance = (type: LeaveType): number => {
    switch (type) {
      case 'Casual Leave':
        return currentAlloc.casualAllocated - currentAlloc.casualUsed;
      case 'Medical Leave':
        return currentAlloc.medicalAllocated - currentAlloc.medicalUsed;
      case 'Emergency Leave':
        return currentAlloc.emergencyAllocated - currentAlloc.emergencyUsed;
      case 'Annual Leave':
        return currentAlloc.annualAllocated - currentAlloc.annualUsed;
      case 'Maternity Leave':
        return currentAlloc.maternityAllocated - (currentAlloc.maternityUsed || 0);
      case 'Paternity Leave':
        return currentAlloc.paternityAllocated - (currentAlloc.paternityUsed || 0);
      case 'Compensatory Leave':
        return currentAlloc.compOffAllocated - (currentAlloc.compOffUsed || 0);
      case 'Bereavement Leave':
        return hasAllocation ? Math.max(0, 5 - (currentAlloc.bereavementUsed || 0)) : 0;
      default:
        return 0;
    }
  };

  const availableBalance = getAvailableBalance(leaveCategory);
  const remainingBalanceAfter = availableBalance - totalCalculatedDays;

  const handleCategoryChange = (newCat: LeaveType) => {
    setLeaveCategory(newCat);
    if (!isHalfDayAllowed(newCat)) {
      setLeaveDurationMode('FULL');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToastMsg('Document size exceeds 5 MB. Please choose a file up to 5 MB.', 'error');
        return;
      }
      setAttachedFileName(file.name);
      showToastMsg(`Attached document: ${file.name}`);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;

    const halfType: HalfDayType =
      leaveDurationMode === 'HALF'
        ? halfPeriod === 'First Half'
          ? 'First Half'
          : 'Second Half'
    const rawReason = reason.trim() || 'General leave application';
    const baseReason = rawReason.replace(/\[Attachment:\s*[\s\S]*?\]/gi, '').replace(/\[Refusal Note:\s*[\s\S]*?\]/gi, '').trim();
    const persistedReason = attachedFileName
      ? `${baseReason || 'Leave application'} [Attachment: ${attachedFileName.trim()}]`
      : (baseReason || 'General leave application');

    const newReq: LeaveRequestItem = {
      id: `req-${Date.now()}`,
      employeeId: currentEmp.id || `emp-${currentEmp.code}`,
      employeeCode: currentEmp.code,
      employeeName: currentEmp.name,
      department: currentEmp.department,
      designation: currentEmp.designation,
      avatarUrl: currentEmp.avatarUrl,
      leaveType: leaveCategory,
      fromDate: startDate,
      toDate: isHalfDayAllowed(leaveCategory) && leaveDurationMode === 'HALF' ? startDate : endDate,
      totalDays: totalCalculatedDays,
      halfDayType: halfType,
      reason: persistedReason,
      pregnancyConfirmationDate: pregnancyDate,
      expectedDeliveryDate: eddDate,
      intendedMaternityStartDate: startDate,
      bereavementRelationship: bereavementRelation as BereavementRelationship,
      attachmentName: attachedFileName || '',
      status: 'Pending',
      appliedAt: new Date().toISOString(),
    };

    setRequests([newReq, ...requests]);
    await saveLeaveRequest(newReq);

    // Resolve supervisor information
    const supervisorName = currentEmp.supervisor || currentEmp.manager || "Nasif Kamal";
    const supervisorEmp = employees.find(
      (e) =>
        (e.name && e.name.toLowerCase().trim() === supervisorName.toLowerCase().trim()) ||
        (e.code && e.code === currentEmp.supervisorCode)
    );
    const supervisorEmail = supervisorEmp?.workEmail || supervisorEmp?.personalEmail || 'nasif.kamal@jaago.com.bd';
    const supervisorCode = supervisorEmp?.code || 'FO032507061190';

    // 1. Dispatch Email to Supervisor
    try {
      fetch('/api/v1/emails/leave-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'supervisor_submit',
          supervisorName,
          supervisorEmail,
          employeeName: currentEmp.name,
          employeeCode: currentEmp.code,
          designation: currentEmp.designation,
          department: currentEmp.department,
          leaveType: leaveCategory,
          fromDate: startDate,
          toDate: newReq.toDate,
          totalDays: totalCalculatedDays,
          reason: reason.trim() || 'General leave application',
          attachmentName: attachedFileName || 'None Attached',
          requestId: newReq.id,
        }),
      }).catch((err) => console.warn('Email trigger error:', err));
    } catch {}

    // 2. Dispatch In-App Notification to Supervisor
    createNotification({
      targetSupervisorName: supervisorName,
      targetEmail: supervisorEmail,
      targetEmployeeCode: supervisorCode,
      title: `Approval Required: ${leaveCategory} (${currentEmp.name})`,
      message: `${currentEmp.name} (${currentEmp.code}) applied for ${totalCalculatedDays} Day(s) of ${leaveCategory} from ${startDate} to ${newReq.toDate}. Reason: ${reason.trim() || 'General leave'}`,
      category: 'approvals',
      actionUrl: `/workflows?requestId=${newReq.id}`,
      relatedEntity: { type: 'leave_request', id: newReq.id },
    });

    setReason('');
    setAttachedFileName('');
    showToastMsg('Your leave request has been submitted successfully, supervisor notified, and synced to attendance logs!');
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel and delete this leave request?')) return;
    setRequests(requests.filter((r) => r.id !== id));
    if (selectedRequest?.id === id) setShowDetailModal(false);
    await deleteLeaveRequest(id);
    showToastMsg('Leave request deleted');
  };

  const myRequests = requests.filter((r) => r.employeeCode === currentEmp.code);
  const filtered = myRequests.filter((req) => {
    if (selectedTab === 'PENDING' && req.status !== 'Pending') return false;
    if (selectedTab === 'APPROVED' && req.status !== 'Approved') return false;
    if (selectedTab === 'REJECTED' && req.status !== 'Rejected') return false;
    return true;
  });

  // Calculate remaining balances & percentages for all 8 categories
  const clAlloc = currentAlloc.casualAllocated ?? 0;
  const clUsed = currentAlloc.casualUsed ?? 0;
  const clRem = Math.max(0, clAlloc - clUsed);
  const clPct = clAlloc > 0 ? (clRem / clAlloc) * 100 : 0;

  const mlAlloc = currentAlloc.medicalAllocated ?? 0;
  const mlUsed = currentAlloc.medicalUsed ?? 0;
  const mlRem = Math.max(0, mlAlloc - mlUsed);
  const mlPct = mlAlloc > 0 ? (mlRem / mlAlloc) * 100 : 0;

  const elAlloc = currentAlloc.emergencyAllocated ?? 0;
  const elUsed = currentAlloc.emergencyUsed ?? 0;
  const elRem = Math.max(0, elAlloc - elUsed);
  const elPct = elAlloc > 0 ? (elRem / elAlloc) * 100 : 0;

  const alAlloc = currentAlloc.annualAllocated ?? 0;
  const alUsed = currentAlloc.annualUsed ?? 0;
  const alRem = Math.max(0, alAlloc - alUsed);
  const alPct = alAlloc > 0 ? (alRem / alAlloc) * 100 : 0;

  const coAlloc = currentAlloc.compOffAllocated ?? 0;
  const coUsed = currentAlloc.compOffUsed ?? 0;
  const coRem = Math.max(0, coAlloc - coUsed);
  const coPct = coAlloc > 0 ? (coRem / coAlloc) * 100 : 0;

  const plAlloc = currentAlloc.paternityAllocated ?? 0;
  const plUsed = currentAlloc.paternityUsed ?? 0;
  const plRem = Math.max(0, plAlloc - plUsed);
  const plPct = plAlloc > 0 ? (plRem / plAlloc) * 100 : 0;

  const matAlloc = currentAlloc.maternityAllocated ?? 0;
  const matUsed = currentAlloc.maternityUsed ?? 0;
  const matRem = Math.max(0, matAlloc - matUsed);
  const matPct = matAlloc > 0 ? (matRem / matAlloc) * 100 : 0;

  const blAlloc = hasAllocation ? 5 : 0;
  const blUsed = currentAlloc.bereavementUsed ?? 0;
  const blRem = Math.max(0, blAlloc - blUsed);
  const blPct = blAlloc > 0 ? (blRem / blAlloc) * 100 : 0;

  const currentPolicy = QUICK_LEAVE_POLICIES[leaveCategory] || QUICK_LEAVE_POLICIES['Casual Leave'];

  // Needs document upload check (Medical Leave, Maternity, Paternity, or when total duration >= 3 days)
  const isDocUploadRelevant =
    leaveCategory === 'Medical Leave' ||
    leaveCategory === 'Maternity Leave' ||
    leaveCategory === 'Paternity Leave' ||
    totalCalculatedDays >= 3;

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-2xl animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Unallocated Warning Alert */}
      {!hasAllocation && (
        <div className="flex items-center justify-between p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-semibold animate-in fade-in shadow-sm">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>You currently have 0 allocated leave quota. Please contact People &amp; Culture to allocate your annual leave package.</span>
          </div>
          <a
            href="/pnc/time-off/allocations"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-sm flex-shrink-0"
          >
            Go to Allocations
          </a>
        </div>
      )}

      {/* ── 1. ALL 8 LEAVE ENTITLEMENT STAT CARDS WITH CIRCULAR RADIAL PROGRESS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Casual Leave */}
        <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 rounded-l-2xl" />
          <div className="flex items-center justify-between pl-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-foreground">Casual</span>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">CL</span>
          </div>
          <div className="flex items-center space-x-4 pl-2 pt-1">
            <CircularProgress percentage={clPct} strokeColor="#10b981" size={62} strokeWidth={6} />
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-foreground tracking-tight">
                {clRem}
                <span className="text-sm font-semibold text-muted-foreground">/{clAlloc}d</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Used <strong className="text-foreground font-bold">{clUsed}</strong> &bull; {clAlloc} total
              </div>
            </div>
          </div>
        </div>

        {/* 2. Medical Leave */}
        <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-l-2xl" />
          <div className="flex items-center justify-between pl-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-sm font-bold text-foreground">Medical</span>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">ML</span>
          </div>
          <div className="flex items-center space-x-4 pl-2 pt-1">
            <CircularProgress percentage={mlPct} strokeColor="#3b82f6" size={62} strokeWidth={6} />
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-foreground tracking-tight">
                {mlRem}
                <span className="text-sm font-semibold text-muted-foreground">/{mlAlloc}d</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Used <strong className="text-foreground font-bold">{mlUsed}</strong> &bull; {mlAlloc} total
              </div>
            </div>
          </div>
        </div>

        {/* 3. Emergency Leave */}
        <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-600 rounded-l-2xl" />
          <div className="flex items-center justify-between pl-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              <span className="text-sm font-bold text-foreground">Emergency</span>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">EL</span>
          </div>
          <div className="flex items-center space-x-4 pl-2 pt-1">
            <CircularProgress percentage={elPct} strokeColor="#d97706" size={62} strokeWidth={6} />
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-foreground tracking-tight">
                {elRem}
                <span className="text-sm font-semibold text-muted-foreground">/{elAlloc}d</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Used <strong className="text-foreground font-bold">{elUsed}</strong> &bull; {elAlloc} total
              </div>
            </div>
          </div>
        </div>

        {/* 4. Annual Leave */}
        <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500 rounded-l-2xl" />
          <div className="flex items-center justify-between pl-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-sm font-bold text-foreground">Annual</span>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">AL</span>
          </div>
          <div className="flex items-center space-x-4 pl-2 pt-1">
            <CircularProgress percentage={alPct} strokeColor="#8b5cf6" size={62} strokeWidth={6} />
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-foreground tracking-tight">
                {alRem}
                <span className="text-sm font-semibold text-muted-foreground">/{alAlloc}d</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Used <strong className="text-foreground font-bold">{alUsed}</strong> &bull; {alAlloc} total
              </div>
            </div>
          </div>
        </div>

        {/* 5. Compensatory Leave */}
        <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500 rounded-l-2xl" />
          <div className="flex items-center justify-between pl-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              <span className="text-sm font-bold text-foreground">Compensatory</span>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">CO</span>
          </div>
          <div className="flex items-center space-x-4 pl-2 pt-1">
            <CircularProgress percentage={coPct} strokeColor="#06b6d4" size={62} strokeWidth={6} />
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-foreground tracking-tight">
                {coRem}
                <span className="text-sm font-semibold text-muted-foreground">/{coAlloc}h</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Used <strong className="text-foreground font-bold">{coUsed}h</strong> &bull; {coAlloc}h total
              </div>
            </div>
          </div>
        </div>

        {/* 6. Paternity Leave */}
        <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 rounded-l-2xl" />
          <div className="flex items-center justify-between pl-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-sm font-bold text-foreground">Paternity</span>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">PL</span>
          </div>
          <div className="flex items-center space-x-4 pl-2 pt-1">
            <CircularProgress percentage={plPct} strokeColor="#6366f1" size={62} strokeWidth={6} />
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-foreground tracking-tight">
                {plRem}
                <span className="text-sm font-semibold text-muted-foreground">/{plAlloc}d</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Used <strong className="text-foreground font-bold">{plUsed}</strong> &bull; {plAlloc} total
              </div>
            </div>
          </div>
        </div>

        {/* 7. Maternity Leave */}
        <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 rounded-l-2xl" />
          <div className="flex items-center justify-between pl-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-sm font-bold text-foreground">Maternity</span>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">MAT</span>
          </div>
          <div className="flex items-center space-x-4 pl-2 pt-1">
            <CircularProgress percentage={matPct} strokeColor="#f43f5e" size={62} strokeWidth={6} />
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-foreground tracking-tight">
                {matRem}
                <span className="text-sm font-semibold text-muted-foreground">/{matAlloc}d</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Used <strong className="text-foreground font-bold">{matUsed}</strong> &bull; {matAlloc} total
              </div>
            </div>
          </div>
        </div>

        {/* 8. Bereavement Leave */}
        <div className="rounded-2xl bg-card border border-border/80 p-5 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between space-y-3">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-slate-500 rounded-l-2xl" />
          <div className="flex items-center justify-between pl-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="text-sm font-bold text-foreground">Bereavement</span>
            </div>
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase">BL</span>
          </div>
          <div className="flex items-center space-x-4 pl-2 pt-1">
            <CircularProgress percentage={blPct} strokeColor="#64748b" size={62} strokeWidth={6} />
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-foreground tracking-tight">
                {blRem}
                <span className="text-sm font-semibold text-muted-foreground">/5d</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Used <strong className="text-foreground font-bold">{blUsed}</strong> &bull; 5d / incident
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. CLEAN "APPLY FOR LEAVE" CONTAINER (WITH INTELLIGENT FIELD VISIBILITY) ── */}
      <div className="rounded-3xl bg-card border border-border/80 shadow-xl p-6 sm:p-7 space-y-5 relative">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-foreground tracking-tight">Apply for leave</h2>
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="flex items-center space-x-3">
            {ability.can('manage', 'all') && employees.length > 1 ? (
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase hidden sm:inline">Applicant:</span>
                <select
                  value={selectedEmpCode || currentEmp.code}
                  onChange={(e) => setSelectedEmpCode(e.target.value)}
                  className="h-8 px-2.5 rounded-xl bg-surface border border-border text-[11px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                >
                  {employees.map((emp) => (
                    <option key={emp.code} value={emp.code}>
                      {emp.name} ({emp.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-surface/80 border border-border/80 text-[11px] font-bold text-foreground">
                <span className="text-foreground">{currentEmp.name}</span>
                <span className="text-[10px] font-mono text-amber-500">({currentEmp.code})</span>
              </div>
            )}
            <span className="text-[11px] font-mono font-bold text-muted-foreground tracking-widest uppercase">
              NEW REQUEST
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
          {/* Dynamic Row: Only show applicable fields! */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
            {/* Category: 4 columns */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Select Allocated Leave
              </label>
              <select
                value={leaveCategory}
                onChange={(e) => handleCategoryChange(e.target.value as LeaveType)}
                className="w-full h-11 px-3.5 rounded-2xl bg-surface/70 border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm transition"
              >
                <option value="Casual Leave">Casual Leave (CL)</option>
                <option value="Medical Leave">Medical Leave (ML)</option>
                <option value="Emergency Leave">Emergency Leave (EL)</option>
                <option value="Annual Leave">Annual Leave (AL)</option>
                <option value="Compensatory Leave">Compensatory Leave</option>
                <option value="Paternity Leave">Paternity Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Bereavement Leave">Bereavement Leave</option>
              </select>
            </div>

            {/* Duration Mode: ONLY IF HALF-DAY IS ALLOWED FOR THIS CATEGORY */}
            {isHalfDayAllowed(leaveCategory) && (
              <div className="lg:col-span-2 space-y-1.5 animate-in fade-in duration-150">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Duration
                </label>
                {leaveCategory === 'Compensatory Leave' ? (
                  <select
                    value={leaveDurationMode === 'HALF' ? '4h (Half)' : '8h (Full)'}
                    onChange={(e) =>
                      setLeaveDurationMode(e.target.value.includes('Half') ? 'HALF' : 'FULL')
                    }
                    className="w-full h-11 px-3 rounded-2xl bg-surface/70 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="8h (Full)">8h = Full-Day</option>
                    <option value="4h (Half)">4h = Half-Day</option>
                  </select>
                ) : (
                  <select
                    value={leaveDurationMode}
                    onChange={(e) => setLeaveDurationMode(e.target.value as 'FULL' | 'HALF')}
                    className="w-full h-11 px-3 rounded-2xl bg-surface/70 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="FULL">FULL DAY</option>
                    <option value="HALF">HALF DAY</option>
                  </select>
                )}
              </div>
            )}

            {/* Period: ONLY SHOWN IF HALF DAY IS ACTIVE */}
            {isHalfDayAllowed(leaveCategory) && leaveDurationMode === 'HALF' && (
              <div className="lg:col-span-2 space-y-1.5 animate-in fade-in duration-150">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Half-Day Shift
                </label>
                <select
                  value={halfPeriod}
                  onChange={(e) => setHalfPeriod(e.target.value as 'First Half' | 'Second Half')}
                  className="w-full h-11 px-3 rounded-2xl bg-surface/70 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="First Half">First Half</option>
                  <option value="Second Half">Second Half</option>
                </select>
              </div>
            )}

            {/* Start Date */}
            <div
              className={`${
                isHalfDayAllowed(leaveCategory)
                  ? leaveDurationMode === 'HALF'
                    ? 'lg:col-span-4'
                    : 'lg:col-span-3'
                  : 'lg:col-span-4'
              } space-y-1.5`}
            >
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                {isHalfDayAllowed(leaveCategory) && leaveDurationMode === 'HALF' ? 'Leave Date' : 'Starting Date'}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (isHalfDayAllowed(leaveCategory) && leaveDurationMode === 'HALF') {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full h-11 px-3.5 rounded-2xl bg-surface/70 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
            </div>

            {/* Ending Date: ONLY SHOWN FOR MULTI-DAY / FULL-DAY REQUESTS */}
            {(!isHalfDayAllowed(leaveCategory) || leaveDurationMode === 'FULL') && (
              <div
                className={`${
                  isHalfDayAllowed(leaveCategory) ? 'lg:col-span-3' : 'lg:col-span-4'
                } space-y-1.5 animate-in fade-in duration-150`}
              >
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Ending Date
                </label>
                <input
                  type="date"
                  required
                  disabled={leaveCategory === 'Maternity Leave'}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-surface/70 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm disabled:opacity-60"
                />
              </div>
            )}
          </div>

          {/* Conditional Special Fields */}
          {leaveCategory === 'Bereavement Leave' && (
            <div className="space-y-1.5 max-w-md animate-in fade-in">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Immediate Family Relationship <span className="text-amber-500">*</span>
              </label>
              <select
                required
                value={bereavementRelation}
                onChange={(e) => setBereavementRelation(e.target.value as BereavementRelationship)}
                className="w-full h-11 px-3.5 rounded-2xl bg-surface/70 border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
              >
                <option value="">Select Immediate Family Relationship</option>
                {BEREAVEMENT_RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {leaveCategory === 'Maternity Leave' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl animate-in fade-in">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Pregnancy Confirmation Date
                </label>
                <input
                  type="date"
                  value={pregnancyDate}
                  onChange={(e) => setPregnancyDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-surface/70 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Expected Delivery Date (EDD) <span className="text-amber-500">*</span>
                </label>
                <input
                  type="date"
                  value={eddDate}
                  onChange={(e) => setEddDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl bg-surface/70 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Row 2: Reason & Clean Inline Document Upload & Submit */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-end pt-1">
            <div className={isDocUploadRelevant ? 'lg:col-span-6' : 'lg:col-span-9'}>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Reason for Leave <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Detail the purpose of leave and handover arrangements..."
                className="w-full h-11 px-3.5 rounded-2xl bg-surface/70 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
            </div>

            {isDocUploadRelevant && (
              <div className="lg:col-span-3 space-y-1.5 animate-in fade-in">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
                  Supporting Document {totalCalculatedDays >= 3 ? '(Required)' : '(Optional)'}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-11 px-3.5 rounded-2xl bg-surface/70 border border-border hover:border-amber-500 text-xs font-semibold text-foreground transition shadow-sm cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Paperclip className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span className="truncate text-muted-foreground">
                        {attachedFileName || 'Attach file...'}
                      </span>
                    </div>
                    <Upload className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                </div>
              </div>
            )}

            <div className={isDocUploadRelevant ? 'lg:col-span-3' : 'lg:col-span-3'}>
              <button
                type="submit"
                disabled={Boolean(validationError)}
                className="w-full h-11 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
              >
                <Send className="h-4 w-4" />
                <span>SUBMIT REQUEST</span>
              </button>
            </div>
          </div>

          {/* Real-Time Calculation Feedback Bar */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground pt-1">
            <span className="px-3 py-1 rounded-xl bg-surface border border-border/70">
              Requested:{' '}
              <strong className="text-amber-500 font-mono font-black">
                {totalCalculatedDays} {totalCalculatedDays === 1 ? 'Day' : 'Days'}
              </strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-surface border border-border/70">
              Available Quota: <strong className="text-foreground font-mono">{availableBalance} Days</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-surface border border-border/70">
              Balance After:{' '}
              <strong
                className={`font-mono font-black ${
                  remainingBalanceAfter < 0 ? 'text-rose-500' : 'text-emerald-500'
                }`}
              >
                {remainingBalanceAfter} Days
              </strong>
            </span>
          </div>

          {/* Validation Warning Alert */}
          {validationError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-500 text-xs font-semibold flex items-start space-x-2.5 animate-in shake">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{validationError}</div>
            </div>
          )}

          {/* ── QUICK LEAVE POLICY BANNER ── */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-amber-500 font-bold uppercase text-[11px] tracking-wide">
              <div className="h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">
                i
              </div>
              <span>{currentPolicy.title}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-muted-foreground font-medium text-[11px] pl-1">
              {currentPolicy.points.map((pt, idx) => (
                <div key={idx} className="flex items-start space-x-1.5">
                  <span className="text-amber-500 font-bold">&bull;</span>
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compensatory Leave Ledger collapsible */}
          {leaveCategory === 'Compensatory Leave' && (
            <div className="rounded-2xl border border-amber-500/30 bg-card overflow-hidden shadow-sm animate-in fade-in">
              <button
                type="button"
                onClick={() => setShowCompLedger(!showCompLedger)}
                className="w-full p-3 flex items-center justify-between hover:bg-surface/50 transition cursor-pointer text-amber-500 font-bold text-xs tracking-wider uppercase"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>COMPENSATORY LEAVE LEDGER</span>
                </div>
                {showCompLedger ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>

              {showCompLedger && (
                <div className="p-4 border-t border-border/70 bg-surface/30 space-y-2.5">
                  <div className="text-xs text-muted-foreground">
                    Available Comp Off Earned Balance:{' '}
                    <strong className="text-foreground font-mono font-bold">
                      {currentAlloc.compOffAllocated - (currentAlloc.compOffUsed || 0)} Hours
                    </strong>{' '}
                    (Valid within 60 days of weekend/holiday duty)
                  </div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface text-[10px] uppercase font-bold text-muted-foreground">
                        <tr>
                          <th className="p-2.5">Date Worked</th>
                          <th className="p-2.5">Duty Purpose</th>
                          <th className="p-2.5">Hours Earned</th>
                          <th className="p-2.5">Expiry Date</th>
                          <th className="p-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-medium">
                        <tr>
                          <td className="p-2.5 font-mono">2026-08-21 (Fri)</td>
                          <td className="p-2.5">Server maintenance over weekend</td>
                          <td className="p-2.5 font-bold text-amber-500">8.0 hrs</td>
                          <td className="p-2.5 font-mono text-muted-foreground">2026-10-21</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 font-bold text-[10px]">
                              Available
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono">2026-08-14 (Fri)</td>
                          <td className="p-2.5">Independence Day prep support</td>
                          <td className="p-2.5 font-bold text-amber-500">8.0 hrs</td>
                          <td className="p-2.5 font-mono text-muted-foreground">2026-10-14</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 font-bold text-[10px]">
                              Available
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* ── 3. MY LEAVE APPLICATIONS TABLE ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center space-x-4 text-xs font-extrabold tracking-wider text-muted-foreground">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedTab(tab)}
                className={`pb-2 transition relative cursor-pointer ${
                  selectedTab === tab ? 'text-amber-500 font-black' : 'hover:text-foreground'
                }`}
              >
                {tab} (
                {tab === 'ALL'
                  ? myRequests.length
                  : myRequests.filter((r) => r.status.toUpperCase() === tab).length}
                )
                {selectedTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={loadData}
            className="p-1.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Refresh Table"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="rounded-3xl bg-card border border-border/80 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-surface/50">
                  <th className="py-3.5 px-4">Leave Category</th>
                  <th className="py-3.5 px-4">Duration &amp; Shift</th>
                  <th className="py-3.5 px-4">Total Days</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-4">Document</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground text-xs font-semibold">
                      No leave requests found in this view.
                    </td>
                  </tr>
                ) : (
                  filtered.map((req) => (
                    <tr
                      key={req.id}
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowDetailModal(true);
                      }}
                      className="hover:bg-surface/60 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-bold text-foreground">
                          {req.leaveType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-foreground">
                        <div>
                          {req.fromDate} &rarr; {req.toDate}
                        </div>
                        {req.halfDayType && req.halfDayType !== 'Full Day' && (
                          <span className="text-[10px] font-bold text-amber-500 font-sans">
                            ({req.halfDayType})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {req.totalDays} {req.totalDays === 1 ? 'day' : 'days'}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                        {req.bereavementRelationship ? `[${req.bereavementRelationship}] ` : ''}
                        {req.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        {req.attachmentName ? (
                          <span className="inline-flex items-center space-x-1 text-[11px] text-amber-500 font-semibold">
                            <FileText className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{req.attachmentName}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            req.status === 'Approved'
                              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                              : req.status === 'Pending'
                              ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {req.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(req.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                            title="Cancel Request"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── MODAL: REQUEST DETAILS ── */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-serif font-black text-foreground">
                Leave Request Details
              </h3>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border">
                <div>
                  <div className="text-sm font-extrabold text-foreground">{selectedRequest.employeeName}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {selectedRequest.employeeCode} &bull; {selectedRequest.department}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30">
                  {selectedRequest.leaveType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface/50 border border-border">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Dates &amp; Shift</div>
                  <div className="font-mono font-bold text-foreground pt-0.5">
                    {selectedRequest.fromDate} &rarr; {selectedRequest.toDate}
                  </div>
                  {selectedRequest.halfDayType && selectedRequest.halfDayType !== 'Full Day' && (
                    <div className="text-[10px] text-amber-500 font-bold">Shift: {selectedRequest.halfDayType}</div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-surface/50 border border-border">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Total Duration</div>
                  <div className="font-bold text-foreground pt-0.5">
                    {selectedRequest.totalDays} {selectedRequest.totalDays === 1 ? 'day' : 'days'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface/50 border border-border space-y-1">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Reason</div>
                <p className="text-foreground font-medium leading-relaxed">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.attachmentName && (
                <div className="p-3 rounded-xl bg-surface/50 border border-border space-y-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Attached Document</div>
                  <div className="flex items-center space-x-2 text-amber-500 font-bold">
                    <FileText className="h-4 w-4" />
                    <span>{selectedRequest.attachmentName}</span>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Current Status:</span>
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                    selectedRequest.status === 'Approved'
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                      : selectedRequest.status === 'Pending'
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                  }`}
                >
                  {selectedRequest.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
