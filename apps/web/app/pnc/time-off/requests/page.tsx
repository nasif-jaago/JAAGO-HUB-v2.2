'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Check,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  History,
  CalendarDays,
  MessageSquareQuote,
  Paperclip,
  Download,
} from 'lucide-react';
import { downloadAttachment } from '@/lib/attachment-helper';
import {
  LeaveRequestItem,
  LeaveType,
  HalfDayType,
  fetchLeaveRequests,
  saveLeaveRequest,
  deleteLeaveRequest,
  fetchLeaveAllocations,
  LeaveAllocationItem,
} from '@/lib/supabase-time-off';
import { fetchEmployeesFromSupabase } from '@/lib/supabase-employees';
import {
  useOrganizationScope,
  matchesSelectedOrg,
  matchesSelectedDept,
  isDspDepartment,
  isDspOnlyScoped,
} from '@/lib/use-organization-scope';
import { createNotification } from '@/lib/notifications';
import { getCurrentUserSession } from '@/lib/user-profile-sync';

const LEAVE_TYPES: LeaveType[] = [
  'Casual Leave',
  'Medical Leave',
  'Emergency Leave',
  'Annual Leave',
  'Maternity Leave',
  'Paternity Leave',
  'Compensatory Leave',
  'Bereavement Leave',
];

export default function LeaveRequestsPage() {
  const { selectedOrg, selectedDept, isDspScoped } = useOrganizationScope();
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocationItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [refusalModalReq, setRefusalModalReq] = useState<LeaveRequestItem | null>(null);
  const [refusalNoteText, setRefusalNoteText] = useState<string>('');

  // Create & Direct Approve Form State
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>('');
  const [empSearchInput, setEmpSearchInput] = useState<string>('');
  const [isEmpDropdownOpen, setIsEmpDropdownOpen] = useState<boolean>(false);
  const [createLeaveType, setCreateLeaveType] = useState<LeaveType>('Casual Leave');
  const [createMode, setCreateMode] = useState<'FULL' | 'HALF'>('FULL');
  const [createHalfPeriod, setCreateHalfPeriod] = useState<'First Half' | 'Second Half'>('First Half');
  const [createStartDate, setCreateStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]!
  );
  const [createEndDate, setCreateEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]!
  );
  const [createReason, setCreateReason] = useState<string>(
    'Admin Approved Leave / Attendance Adjustment'
  );

  const loadData = async () => {
    try {
      const [reqs, allocs, emps] = await Promise.all([
        fetchLeaveRequests(),
        fetchLeaveAllocations(),
        fetchEmployeesFromSupabase(),
      ]);
      if (reqs) setRequests(reqs);
      if (allocs) setAllocations(allocs);
      if (emps) setEmployees(emps);
    } catch {}
  };

  useEffect(() => {
    loadData();

    const handleReqUpdate = () => {
      loadData();
    };
    window.addEventListener('jaago_leave_request_updated', handleReqUpdate);
    window.addEventListener('jaago_leave_allocation_updated', handleReqUpdate);

    return () => {
      window.removeEventListener('jaago_leave_request_updated', handleReqUpdate);
      window.removeEventListener('jaago_leave_allocation_updated', handleReqUpdate);
    };
  }, []);

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Selected Employee for Create Modal
  const selectedEmp = useMemo(() => {
    return employees.find((e) => e.code === selectedEmpCode) || null;
  }, [employees, selectedEmpCode]);

  const selectedEmpAllocation = useMemo(() => {
    if (!selectedEmpCode) return null;
    return allocations.find((a) => a.employeeCode === selectedEmpCode) || null;
  }, [allocations, selectedEmpCode]);

  // Helper for available balance in modal
  const getEmpAvailableBalance = (type: LeaveType): number => {
    if (!selectedEmpAllocation) return 0;
    switch (type) {
      case 'Casual Leave':
        return Math.max(0, (selectedEmpAllocation.casualAllocated || 0) - (selectedEmpAllocation.casualUsed || 0));
      case 'Medical Leave':
        return Math.max(0, (selectedEmpAllocation.medicalAllocated || 0) - (selectedEmpAllocation.medicalUsed || 0));
      case 'Emergency Leave':
        return Math.max(0, (selectedEmpAllocation.emergencyAllocated || 0) - (selectedEmpAllocation.emergencyUsed || 0));
      case 'Annual Leave':
        return Math.max(0, (selectedEmpAllocation.annualAllocated || 0) - (selectedEmpAllocation.annualUsed || 0));
      case 'Compensatory Leave':
        return Math.max(0, Math.floor(((selectedEmpAllocation.compOffAllocated || 0) - (selectedEmpAllocation.compOffUsed || 0)) / 8));
      case 'Paternity Leave':
        return Math.max(0, (selectedEmpAllocation.paternityAllocated || 0) - (selectedEmpAllocation.paternityUsed || 0));
      case 'Maternity Leave':
        return Math.max(0, (selectedEmpAllocation.maternityAllocated || 0) - (selectedEmpAllocation.maternityUsed || 0));
      case 'Bereavement Leave':
        return Math.max(0, 5 - (selectedEmpAllocation.bereavementUsed || 0));
      default:
        return 0;
    }
  };

  // Calculate duration in Create Modal
  const calculatedDays = useMemo(() => {
    if (createMode === 'HALF') return 0.5;
    if (createLeaveType === 'Maternity Leave') return 120;
    if (createLeaveType === 'Paternity Leave') return 15;

    const d1 = new Date(createStartDate);
    const d2 = new Date(createEndDate);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
      return Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
    }
    return 1;
  }, [createStartDate, createEndDate, createMode, createLeaveType]);

  // Handle Approve / Re-Approve
  const handleApprove = async (req: LeaveRequestItem) => {
    const session = getCurrentUserSession();
    const userCode = session?.employeeCode?.trim().toLowerCase();
    const userName = session?.fullName?.trim().toLowerCase();
    const isSuperAdmin = (session?.roles || []).includes('super_admin') || (session?.email || '').includes('nasif.kamal');

    if (!isSuperAdmin && ((userCode && req.employeeCode?.trim().toLowerCase() === userCode) || (userName && req.employeeName?.trim().toLowerCase() === userName))) {
      showToastMsg('Self-approval is forbidden: You cannot approve your own leave request.', 'error');
      return;
    }

    const approverName = session?.fullName || 'Supervisor / PNC Manager';
    const updated: LeaveRequestItem = {
      ...req,
      status: 'Approved',
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
    };
    setRequests((prev) => prev.map((r) => (r.id === req.id ? updated : r)));
    await saveLeaveRequest(updated);

    // Look up employee email
    const emp = employees.find((e) => e.code === req.employeeCode || e.id === req.employeeId);
    const empEmail = emp?.workEmail || emp?.personalEmail;

    // Send decision email
    if (empEmail) {
      try {
        fetch('/api/v1/emails/leave-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'employee_decision',
            employeeName: req.employeeName,
            employeeEmail: empEmail,
            leaveType: req.leaveType,
            fromDate: req.fromDate,
            toDate: req.toDate,
            totalDays: req.totalDays,
            decisionStatus: 'Approved',
            reviewedBy: approverName,
            refusalReason: 'Approved by Supervisor / PNC Manager',
            requestId: req.id,
          }),
        }).catch((e) => console.warn('Decision email warning:', e));
      } catch {}
    }

    // In-app notification
    createNotification({
      targetEmployeeCode: req.employeeCode,
      targetEmail: empEmail,
      title: `Leave Request Approved (${req.leaveType})`,
      message: `Your leave application for ${req.leaveType} (${req.totalDays} Days) from ${req.fromDate} to ${req.toDate} has been approved by ${approverName}.`,
      category: 'time_off',
      actionUrl: '/leaves',
      relatedEntity: { type: 'leave_request', id: req.id },
    });

    showToastMsg(`Leave application approved for ${req.employeeName}`);
  };

  // Trigger Refusal Modal
  const handleRejectClick = (req: LeaveRequestItem) => {
    const session = getCurrentUserSession();
    const userCode = session?.employeeCode?.trim().toLowerCase();
    const userName = session?.fullName?.trim().toLowerCase();
    const isSuperAdmin = (session?.roles || []).includes('super_admin') || (session?.email || '').includes('nasif.kamal');

    if (!isSuperAdmin && ((userCode && req.employeeCode?.trim().toLowerCase() === userCode) || (userName && req.employeeName?.trim().toLowerCase() === userName))) {
      showToastMsg('Self-refusal is forbidden: You cannot refuse your own leave request.', 'error');
      return;
    }

    setRefusalModalReq(req);
    setRefusalNoteText('');
  };

  // Submit Refusal with Mandatory Note
  const handleSubmitRefusal = async () => {
    if (!refusalModalReq) return;
    if (!refusalNoteText.trim()) {
      showToastMsg('Mandatory refusal note is required before refusing a leave request.', 'error');
      return;
    }

    const session = getCurrentUserSession();
    const reviewerName = session?.fullName || 'Supervisor / PNC Manager';
    const updated: LeaveRequestItem = {
      ...refusalModalReq,
      status: 'Rejected',
      approvedBy: reviewerName,
      approvedAt: new Date().toISOString(),
      reason: `${refusalModalReq.reason || ''} [Refusal Note: ${refusalNoteText.trim()}]`.trim(),
    };

    setRequests((prev) => prev.map((r) => (r.id === refusalModalReq.id ? updated : r)));
    await saveLeaveRequest(updated);

    // Look up employee email
    const emp = employees.find((e) => e.code === refusalModalReq.employeeCode || e.id === refusalModalReq.employeeId);
    const empEmail = emp?.workEmail || emp?.personalEmail;

    // Send decision email with refusal note
    if (empEmail) {
      try {
        fetch('/api/v1/emails/leave-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'employee_decision',
            employeeName: refusalModalReq.employeeName,
            employeeEmail: empEmail,
            leaveType: refusalModalReq.leaveType,
            fromDate: refusalModalReq.fromDate,
            toDate: refusalModalReq.toDate,
            totalDays: refusalModalReq.totalDays,
            decisionStatus: 'Refused',
            reviewedBy: reviewerName,
            refusalReason: refusalNoteText.trim(),
            requestId: refusalModalReq.id,
          }),
        }).catch((e) => console.warn('Decision email warning:', e));
      } catch {}
    }

    // In-app notification
    createNotification({
      targetEmployeeCode: refusalModalReq.employeeCode,
      targetEmail: empEmail,
      title: `Leave Request Refused (${refusalModalReq.leaveType})`,
      message: `Your leave application for ${refusalModalReq.leaveType} was refused by ${reviewerName}. Note: ${refusalNoteText.trim()}`,
      category: 'time_off',
      actionUrl: '/leaves',
      relatedEntity: { type: 'leave_request', id: refusalModalReq.id },
    });

    showToastMsg(`Leave request marked as Refused with note for ${refusalModalReq.employeeName}`, 'error');
    setRefusalModalReq(null);
    setRefusalNoteText('');
  };

  // Handle Delete Request
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this leave request?')) return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
    await deleteLeaveRequest(id);
    showToastMsg('Leave request deleted successfully');
  };

  // Submit Create & Direct Approve Form
  const handleSaveCreatedLeave = async (directApprove: boolean = true) => {
    if (!selectedEmp) {
      showToastMsg('Please select an employee first', 'error');
      return;
    }
    if (!createReason.trim()) {
      showToastMsg('Please enter a reason or remarks for this leave', 'error');
      return;
    }

    const halfType: HalfDayType =
      createMode === 'HALF' ? (createHalfPeriod === 'First Half' ? 'First Half' : 'Second Half') : 'Full Day';

    const newReq: LeaveRequestItem = {
      id: `req-${Date.now()}`,
      employeeId: selectedEmp.id || `emp-${selectedEmp.code}`,
      employeeCode: selectedEmp.code,
      employeeName: selectedEmp.name,
      department: selectedEmp.department || 'General',
      designation: selectedEmp.designation || 'Staff',
      leaveType: createLeaveType,
      fromDate: createStartDate,
      toDate: createMode === 'HALF' ? createStartDate : createEndDate,
      totalDays: calculatedDays,
      halfDayType: halfType,
      reason: createReason.trim(),
      status: directApprove ? 'Approved' : 'Pending',
      appliedAt: new Date().toISOString(),
      ...(directApprove
        ? {
            approvedBy: 'Admin / HR Manager',
            approvedAt: new Date().toISOString(),
          }
        : {}),
    };

    setRequests((prev) => [newReq, ...prev]);
    setShowCreateModal(false);
    await saveLeaveRequest(newReq);

    showToastMsg(
      directApprove
        ? `Leave created & directly approved for ${selectedEmp.name}`
        : `Leave request submitted for ${selectedEmp.name}`
    );

    // Reset Form
    setSelectedEmpCode('');
    setEmpSearchInput('');
    setCreateReason('Admin Approved Leave / Attendance Adjustment');
  };

  // Filtered Employee List for Search in Modal
  const empCodeToProfile = useMemo(() => {
    const map = new Map<string, any>();
    employees.forEach((e) => {
      if (e.code) map.set(e.code, e);
    });
    return map;
  }, [employees]);

  const scopedRequests = useMemo(() => {
    return requests.filter((r) => {
      const emp = empCodeToProfile.get(r.employeeCode);
      const org = emp?.organization || '';
      const dept = emp?.department || r.department || '';
      if ((isDspScoped || isDspOnlyScoped()) && !isDspDepartment(dept)) {
        return false;
      }
      return matchesSelectedOrg(org, selectedOrg) && matchesSelectedDept(dept, selectedDept);
    });
  }, [requests, empCodeToProfile, selectedOrg, selectedDept, isDspScoped]);

  const modalFilteredEmployees = useMemo(() => {
    const orgScoped = employees.filter((e) => {
      if ((isDspScoped || isDspOnlyScoped()) && !isDspDepartment(e.department, e.leaveGroup)) {
        return false;
      }
      return matchesSelectedOrg(e.organization, selectedOrg) && matchesSelectedDept(e.department, selectedDept);
    });
    if (!empSearchInput.trim()) return orgScoped.slice(0, 15);
    const q = empSearchInput.toLowerCase();
    return orgScoped.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.code?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
    );
  }, [employees, empSearchInput, selectedOrg, selectedDept, isDspScoped]);

  // Counts
  const totalCount = scopedRequests.length;
  const pendingCount = scopedRequests.filter((r) => r.status === 'Pending').length;
  const approvedCount = scopedRequests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = scopedRequests.filter((r) => r.status === 'Rejected').length;

  // Filtered Requests for List View
  const filteredRequests = useMemo(() => {
    return scopedRequests.filter((req) => {
      if (selectedTab === 'PENDING' && req.status !== 'Pending') return false;
      if (selectedTab === 'APPROVED' && req.status !== 'Approved') return false;
      if (selectedTab === 'REJECTED' && req.status !== 'Rejected') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          req.employeeName.toLowerCase().includes(q) ||
          req.employeeCode.toLowerCase().includes(q) ||
          req.department?.toLowerCase().includes(q) ||
          req.reason.toLowerCase().includes(q) ||
          req.leaveType.toLowerCase().includes(q) ||
          req.approvedBy?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scopedRequests, selectedTab, searchQuery]);

  // Badge Color Helper for Leave Categories
  const getCategoryBadge = (type: LeaveType) => {
    switch (type) {
      case 'Casual Leave':
        return {
          textColor: 'text-emerald-500',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          dot: 'bg-emerald-500',
        };
      case 'Medical Leave':
        return {
          textColor: 'text-rose-500',
          bg: 'bg-rose-500/10 border-rose-500/20',
          dot: 'bg-rose-500',
        };
      case 'Emergency Leave':
        return {
          textColor: 'text-amber-500',
          bg: 'bg-amber-500/10 border-amber-500/20',
          dot: 'bg-amber-500',
        };
      case 'Annual Leave':
        return {
          textColor: 'text-purple-500',
          bg: 'bg-purple-500/10 border-purple-500/20',
          dot: 'bg-purple-500',
        };
      case 'Compensatory Leave':
        return {
          textColor: 'text-cyan-500',
          bg: 'bg-cyan-500/10 border-cyan-500/20',
          dot: 'bg-cyan-500',
        };
      case 'Paternity Leave':
        return {
          textColor: 'text-blue-500',
          bg: 'bg-blue-500/10 border-blue-500/20',
          dot: 'bg-blue-500',
        };
      case 'Maternity Leave':
        return {
          textColor: 'text-pink-500',
          bg: 'bg-pink-500/10 border-pink-500/20',
          dot: 'bg-pink-500',
        };
      case 'Bereavement Leave':
      default:
        return {
          textColor: 'text-slate-400',
          bg: 'bg-slate-500/10 border-slate-500/20',
          dot: 'bg-slate-400',
        };
    }
  };

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

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-foreground">
            Leave Requests
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
            Review, approve, or reject employee leave requests.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            if (employees.length > 0 && !selectedEmpCode) {
              setSelectedEmpCode(employees[0].code);
              setEmpSearchInput(employees[0].name);
            }
          }}
          className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/25 transition active:scale-95 cursor-pointer flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>+ CREATE LEAVE REQUEST</span>
        </button>
      </div>

      {/* ── SEARCH & FILTER TABS BAR (MATCHING PRODUCTION UI) ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Search Left */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee or ID..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-card border border-border/80 text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs Right */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              selectedTab === 'ALL'
                ? 'bg-foreground/10 text-foreground font-extrabold'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            ALL ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 shadow-sm ${
              selectedTab === 'PENDING'
                ? 'bg-amber-500 text-white font-black shadow-md shadow-amber-500/25'
                : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
            }`}
          >
            <span>PENDING</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                selectedTab === 'PENDING' ? 'bg-white/25 text-white' : 'bg-surface text-muted-foreground'
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('APPROVED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 ${
              selectedTab === 'APPROVED'
                ? 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/25'
                : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'
            }`}
          >
            <span>APPROVED</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                selectedTab === 'APPROVED' ? 'bg-white/25 text-white' : 'bg-surface text-muted-foreground'
              }`}
            >
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('REJECTED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 ${
              selectedTab === 'REJECTED'
                ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/25'
                : 'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10'
            }`}
          >
            <span>REJECTED</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                selectedTab === 'REJECTED' ? 'bg-white/25 text-white' : 'bg-surface text-muted-foreground'
              }`}
            >
              {rejectedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-3.5 py-2 rounded-xl bg-card border border-border text-foreground hover:border-amber-500/50 text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center space-x-1.5 ml-1"
            title="View Audit & History Logs"
          >
            <History className="h-3.5 w-3.5 text-amber-500" />
            <span>HISTORY LOG</span>
          </button>
        </div>
      </div>

      {/* ── LEAVE REQUESTS LIST (MATCHING PRODUCTION SCREENSHOTS 2, 4, 5) ── */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border p-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-surface mx-auto flex items-center justify-center text-muted-foreground">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div className="text-sm font-bold text-foreground">No leave requests found in this view.</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Employees can submit leave requests from their dashboard, or you can click{' '}
              <strong className="text-amber-500 font-bold">+ CREATE LEAVE REQUEST</strong> above to record and directly approve leaves.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const badgeStyle = getCategoryBadge(req.leaveType);
            const isPending = req.status === 'Pending';
            const isApproved = req.status === 'Approved';
            const isRejected = req.status === 'Rejected';

            return (
              <div
                key={req.id}
                className="rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-sm hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 group hover:border-border"
              >
                {/* 1. Employee Info Left */}
                <div className="flex items-center space-x-3.5 min-w-[220px]">
                  <div className="h-11 w-11 rounded-full bg-surface border border-border flex items-center justify-center text-foreground font-black text-sm flex-shrink-0 shadow-sm">
                    {req.employeeName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-black text-foreground text-sm group-hover:text-amber-500 transition">
                      {req.employeeName}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      ID: {req.employeeCode}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-medium">
                      Dept: {req.department || 'General'}
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 font-medium">
                      Org: JAAGO Foundation Trust
                    </div>
                  </div>
                </div>

                {/* 2. Leave Type, Duration, Date & Reason Middle-Left */}
                <div className="flex-1 space-y-1.5 lg:px-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold ${badgeStyle.bg} ${badgeStyle.textColor}`}>
                      {req.leaveType}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {req.totalDays} day{req.totalDays > 1 ? 's' : ''}
                    </span>
                    {req.halfDayType && req.halfDayType !== 'Full Day' && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-[10px] font-extrabold uppercase">
                        {req.halfDayType}
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-mono text-muted-foreground flex items-center space-x-2">
                    <span>
                      {req.fromDate}
                      {req.toDate && req.toDate !== req.fromDate ? ` to ${req.toDate}` : ''}
                    </span>
                  </div>

                  <div className="text-xs text-foreground/80 font-medium flex items-center space-x-1.5 italic bg-surface/50 p-1.5 px-2.5 rounded-xl max-w-xl">
                    <MessageSquareQuote className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">&ldquo;{req.reason}&rdquo;</span>
                    {req.attachmentName && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAttachment(req.attachmentName!, {
                            requesterName: req.employeeName,
                            employeeCode: req.employeeCode,
                            department: req.department,
                            leaveType: req.leaveType,
                            startDate: req.fromDate,
                            endDate: req.toDate,
                            reason: req.reason,
                            requestId: req.id,
                            attachmentUrl: req.attachmentUrl,
                          });
                        }}
                        className="ml-auto flex items-center space-x-1 text-[10px] font-sans not-italic text-emerald-500 hover:text-emerald-400 font-bold bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 px-2 py-0.5 rounded-md border border-emerald-500/20 hover:border-emerald-500 transition cursor-pointer shrink-0 group"
                        title={`Click to download "${req.attachmentName}"`}
                      >
                        <Paperclip className="h-3 w-3 group-hover:scale-110 transition" />
                        <span className="truncate max-w-[120px] underline decoration-emerald-500/30 underline-offset-2">
                          {req.attachmentName}
                        </span>
                        <Download className="h-2.5 w-2.5 opacity-70 group-hover:opacity-100 transition" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Leave Approver Info Middle-Right */}
                <div className="min-w-[180px] bg-surface/40 p-2.5 px-3 rounded-xl border border-border/40 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">
                    LEAVE APPROVER
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-500 font-black text-[10px] flex items-center justify-center flex-shrink-0">
                      {req.approvedBy ? req.approvedBy.slice(0, 1).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground leading-tight">
                        {req.approvedBy || 'S M Nayeem Rahman'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium leading-tight">
                        Supervisor
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Action Buttons Right (Direct Approve, Refuse, Toggle) */}
                <div className="flex items-center space-x-2 justify-end flex-shrink-0">
                  {/* PENDING VIEW: Shows Approve + Reject */}
                  {isPending && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-500/30 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center space-x-1 active:scale-95 shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>APPROVE</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectClick(req)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/30 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center space-x-1 active:scale-95 shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>REJECT</span>
                      </button>

                      <span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-500 text-xs font-black">
                        Pending
                      </span>
                    </>
                  )}

                  {/* APPROVED VIEW: Shows Reject button to allow switching Approved -> Refused */}
                  {isApproved && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRejectClick(req)}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/30 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center space-x-1 active:scale-95 shadow-sm"
                        title="Refuse / Reject this approved leave"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>REJECT</span>
                      </button>

                      <span className="px-3.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-black flex items-center space-x-1">
                        <Check className="h-3.5 w-3.5" />
                        <span>Approved</span>
                      </span>
                    </>
                  )}

                  {/* REJECTED VIEW: Shows Approve button to allow switching Refused -> Approved */}
                  {isRejected && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(req)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white border border-emerald-500/30 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center space-x-1 active:scale-95 shadow-sm"
                        title="Re-approve this refused leave"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>APPROVE</span>
                      </button>

                      <span className="px-3.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-black flex items-center space-x-1">
                        <X className="h-3.5 w-3.5" />
                        <span>Rejected</span>
                      </span>
                    </>
                  )}

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(req.id)}
                    className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: CREATE & DIRECT APPROVE LEAVE (MATCHING SCREENSHOT 3 EXACTLY)
          ═══════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto no-scrollbar">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border/70 pb-3">
              <div>
                <h3 className="text-xl font-serif font-black text-foreground">
                  Create &amp; Direct Approve Leave
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Submit and auto-approve leave for any employee to adjust attendance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveCreatedLeave(true);
              }}
              className="space-y-4 text-xs font-medium"
            >
              {/* 1. EMPLOYEE SEARCH & SELECT */}
              <div className="space-y-1 relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  EMPLOYEE NAME <span className="text-amber-500">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={empSearchInput}
                    onFocus={() => setIsEmpDropdownOpen(true)}
                    onChange={(e) => {
                      setEmpSearchInput(e.target.value);
                      setIsEmpDropdownOpen(true);
                    }}
                    placeholder="Type at least 3 letters to search employee..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>

                {/* Dropdown Options */}
                {isEmpDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1 divide-y divide-border/40 no-scrollbar">
                    {modalFilteredEmployees.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No employees found matching &quot;{empSearchInput}&quot;
                      </div>
                    ) : (
                      modalFilteredEmployees.map((emp) => (
                        <div
                          key={emp.code || emp.id}
                          onClick={() => {
                            setSelectedEmpCode(emp.code);
                            setEmpSearchInput(`${emp.name} (${emp.code})`);
                            setIsEmpDropdownOpen(false);
                          }}
                          className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between ${
                            selectedEmpCode === emp.code ? 'bg-amber-500/15 text-amber-500' : 'hover:bg-surface'
                          }`}
                        >
                          <div>
                            <div className="font-extrabold text-foreground text-xs">{emp.name}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {emp.code} &bull; {emp.department || 'General'}
                            </div>
                          </div>
                          {selectedEmpCode === emp.code && <Check className="h-4 w-4 text-amber-500" />}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 2. LEAVE TYPE & AVAILABLE BALANCE */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  LEAVE TYPE &amp; AVAILABLE BALANCE <span className="text-amber-500">*</span>
                </label>
                <select
                  value={createLeaveType}
                  onChange={(e) => setCreateLeaveType(e.target.value as LeaveType)}
                  disabled={!selectedEmpCode}
                  className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {!selectedEmpCode ? (
                    <option value="">Select an employee first to see leave balances</option>
                  ) : (
                    LEAVE_TYPES.map((type) => {
                      const bal = getEmpAvailableBalance(type);
                      const unit = type === 'Compensatory Leave' ? 'h' : 'd';
                      return (
                        <option key={type} value={type}>
                          {type} (Available: {bal}
                          {unit})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* 3. LEAVE MODE TOGGLE (FULL DAY / HALF DAY) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  LEAVE MODE
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface border border-border">
                  <button
                    type="button"
                    onClick={() => setCreateMode('FULL')}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                      createMode === 'FULL'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    FULL DAY
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('HALF')}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                      createMode === 'HALF'
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    HALF DAY (0.5 DAY)
                  </button>
                </div>

                {createMode === 'HALF' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCreateHalfPeriod('First Half')}
                      className={`py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        createHalfPeriod === 'First Half'
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                          : 'bg-surface border-border text-muted-foreground'
                      }`}
                    >
                      First Half (AM)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateHalfPeriod('Second Half')}
                      className={`py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        createHalfPeriod === 'Second Half'
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                          : 'bg-surface border-border text-muted-foreground'
                      }`}
                    >
                      Second Half (PM)
                    </button>
                  </div>
                )}
              </div>

              {/* 4. DATE RANGE */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    DATE RANGE <span className="text-amber-500">*</span>
                  </label>
                  <span className="text-[11px] font-black text-amber-500">
                    Total: {calculatedDays} Day{calculatedDays > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">Start Date</span>
                    <input
                      type="date"
                      value={createStartDate}
                      onChange={(e) => {
                        setCreateStartDate(e.target.value);
                        if (createMode === 'HALF' || e.target.value > createEndDate) {
                          setCreateEndDate(e.target.value);
                        }
                      }}
                      className="w-full h-11 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block">End Date</span>
                    <input
                      type="date"
                      value={createMode === 'HALF' ? createStartDate : createEndDate}
                      disabled={createMode === 'HALF'}
                      onChange={(e) => setCreateEndDate(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* 5. REASON / REMARKS */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  REASON / REMARKS <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  value={createReason}
                  onChange={(e) => setCreateReason(e.target.value)}
                  placeholder="Admin Approved Leave / Attendance Adjustment"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              {/* 6. MODAL ACTIONS (CANCEL + APPROVE & SAVE LEAVE) */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
                >
                  CANCEL
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveCreatedLeave(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface border border-border hover:bg-surface/80 text-foreground text-xs font-bold transition cursor-pointer"
                  title="Submit as standard pending request"
                >
                  SAVE AS PENDING
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center space-x-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  <span>APPROVE &amp; SAVE LEAVE</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: HISTORY & AUDIT LOGS
          ═══════════════════════════════════════════════════════════════════ */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-black text-foreground">
                    Leave Decisions History Log
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Chronological audit trail of all leave approvals and refusals
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              {requests.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No historical activity logs recorded.
                </div>
              ) : (
                requests.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl bg-surface/50 border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-extrabold text-foreground">
                        {r.employeeName} &bull; <span className="font-mono text-muted-foreground">{r.employeeCode}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.leaveType} ({r.totalDays}d) &bull; {r.fromDate} &bull; <em>&ldquo;{r.reason}&rdquo;</em>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          r.status === 'Approved'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : r.status === 'Rejected'
                            ? 'bg-rose-500/15 text-rose-500'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}
                      >
                        {r.status}
                      </span>
                      <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
                        {r.approvedBy ? `By: ${r.approvedBy}` : 'Pending review'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: MANDATORY REFUSAL NOTE
          ═══════════════════════════════════════════════════════════════════ */}
      {refusalModalReq && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-destructive/40 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center">
                  <X className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Refuse Leave Request
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Mandatory refusal note required for employee decision email
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefusalModalReq(null)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border text-xs space-y-1">
              <div className="font-extrabold text-foreground">
                {refusalModalReq.employeeName} ({refusalModalReq.employeeCode})
              </div>
              <div className="text-muted-foreground">
                {refusalModalReq.leaveType} &bull; {refusalModalReq.totalDays} Days ({refusalModalReq.fromDate} to {refusalModalReq.toDate})
              </div>
              <div className="text-muted-foreground italic">
                Reason: &ldquo;{refusalModalReq.reason}&rdquo;
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-destructive flex items-center space-x-1">
                <span>Mandatory Refusal Note / Justification *</span>
              </label>
              <textarea
                rows={3}
                value={refusalNoteText}
                onChange={(e) => setRefusalNoteText(e.target.value)}
                placeholder="Explain the reason for refusing this leave request (this will be sent to the employee via email)..."
                className="w-full p-3 rounded-2xl bg-surface border border-destructive/30 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-destructive shadow-sm placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setRefusalModalReq(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-surface transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRefusal}
                disabled={!refusalNoteText.trim()}
                className="px-5 py-2 rounded-xl bg-destructive text-white text-xs font-black uppercase tracking-wider hover:bg-destructive/90 transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm &amp; Refuse Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
