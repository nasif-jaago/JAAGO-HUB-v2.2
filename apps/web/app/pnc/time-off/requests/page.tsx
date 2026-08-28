'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Check,
  X,
  AlertCircle,
  RotateCw,
  Upload,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import {
  LeaveRequestItem,
  LeaveStatus,
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
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocationItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequestItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    employeeCode: string;
    employeeName: string;
    department: string;
    designation: string;
    leaveType: LeaveType;
    fromDate: string;
    toDate: string;
    totalDays: number;
    halfDayType: HalfDayType;
    reason: string;
    pregnancyConfirmationDate: string;
    expectedDeliveryDate: string;
    intendedMaternityStartDate: string;
    bereavementRelationship: BereavementRelationship | '';
    attachmentName: string;
  }>({
    employeeCode: '',
    employeeName: '',
    department: '',
    designation: '',
    leaveType: 'Casual Leave',
    fromDate: new Date().toISOString().split('T')[0]!,
    toDate: new Date().toISOString().split('T')[0]!,
    totalDays: 1,
    halfDayType: 'Full Day',
    reason: '',
    pregnancyConfirmationDate: '',
    expectedDeliveryDate: '',
    intendedMaternityStartDate: '',
    bereavementRelationship: '',
    attachmentName: '',
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const loadData = async () => {
    const [reqs, allocs, emps] = await Promise.all([
      fetchLeaveRequests(),
      fetchLeaveAllocations(),
      fetchEmployeesFromSupabase(),
    ]);
    if (reqs) setRequests(reqs);
    if (allocs) setAllocations(allocs);
    if (emps) {
      setEmployees(emps);
      if (emps.length > 0 && !formData.employeeCode && emps[0]) {
        const first = emps[0];
        setFormData((prev) => ({
          ...prev,
          employeeCode: first.code || '',
          employeeName: first.name || '',
          department: first.department || "Founder's Office",
          designation: first.designation || 'Staff',
        }));
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Recalculate days and validate policy whenever dates or types change
  const handleDateChange = (from: string, to: string, leaveType: LeaveType, halfDay: HalfDayType) => {
    const d1 = new Date(from);
    const d2 = new Date(to);
    let diffDays = 1;

    if (leaveType === 'Maternity Leave') {
      diffDays = 120;
    } else if (halfDay !== 'Full Day' && leaveType === 'Casual Leave') {
      diffDays = 0.5;
    } else if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
      diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
    }

    setFormData((prev) => ({
      ...prev,
      fromDate: from,
      toDate: to,
      leaveType,
      halfDayType: halfDay,
      totalDays: diffDays > 0 ? diffDays : 1,
    }));

    // Perform Policy Validation Checks
    validateLeavePolicy(from, to, leaveType, diffDays, halfDay);
  };

  const validateLeavePolicy = (
    from: string,
    _to: string,
    type: LeaveType,
    days: number,
    halfDay: HalfDayType
  ) => {
    setValidationError(null);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromDateObj = new Date(from);
    fromDateObj.setHours(0, 0, 0, 0);

    // Casual Leave Rules
    if (type === 'Casual Leave') {
      if (days > 3 && halfDay === 'Full Day') {
        setValidationError(
          'Policy Violation: Maximum 3 consecutive days can be applied for Casual Leave at a time. Please adjust dates or apply for Annual Leave.'
        );
        return;
      }
      if (fromDateObj <= today) {
        setValidationError(
          'Policy Requirement: Casual Leave application must be submitted at least 1 day before the leave start date.'
        );
        return;
      }
    }

    // Annual Leave Rules
    if (type === 'Annual Leave') {
      if (days < 5) {
        setValidationError(
          'Policy Violation: Annual Leave requires a minimum of 5 consecutive working days per application.'
        );
        return;
      }
      const daysUntilLeave = Math.round((fromDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (daysUntilLeave < 10) {
        setValidationError(
          'Policy Requirement: Annual Leave application must be submitted at least 10 days before the leave start date.'
        );
        return;
      }
    }

    // Paternity Leave Rules
    if (type === 'Paternity Leave') {
      const daysUntilLeave = Math.round((fromDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (daysUntilLeave < 7) {
        setValidationError(
          'Policy Requirement: Paternity Leave application must be submitted at least 7 days before the leave start date.'
        );
        return;
      }
      if (days > 15) {
        setValidationError('Policy Violation: Paternity Leave entitlement is strictly maximum 15 calendar days.');
        return;
      }
    }

    // Medical Leave Rules (>3 days requires document)
    if (type === 'Medical Leave') {
      if (days > 3 && !formData.attachmentName) {
        setValidationError('Policy Requirement: Medical Leave exceeding 3 consecutive days requires mandatory medical certificate upload.');
        return;
      }
    }
  };

  const handleSelectEmployee = (empCode: string) => {
    const found = employees.find((e) => e.code === empCode);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        employeeCode: found.code,
        employeeName: found.name,
        department: found.department || "Founder's Office",
        designation: found.designation || 'Staff',
      }));
    }
  };

  // Compute Balances for Selected Employee & Leave Type
  const currentAllocation = allocations.find((a) => a.employeeCode === formData.employeeCode);
  const getAvailableBalance = (type: LeaveType): number => {
    if (!currentAllocation) {
      if (type === 'Casual Leave') return 10;
      if (type === 'Medical Leave') return 10;
      if (type === 'Emergency Leave') return 4;
      if (type === 'Annual Leave') return 15;
      if (type === 'Maternity Leave') return 120;
      if (type === 'Paternity Leave') return 15;
      if (type === 'Bereavement Leave') return 5;
      return 10;
    }

    switch (type) {
      case 'Casual Leave':
        return currentAllocation.casualAllocated - currentAllocation.casualUsed;
      case 'Medical Leave':
        return currentAllocation.medicalAllocated - currentAllocation.medicalUsed;
      case 'Emergency Leave':
        return currentAllocation.emergencyAllocated - currentAllocation.emergencyUsed;
      case 'Annual Leave':
        return currentAllocation.annualAllocated - currentAllocation.annualUsed;
      case 'Maternity Leave':
        return 120 - (currentAllocation.maternityUsed || 0);
      case 'Paternity Leave':
        return currentAllocation.paternityAllocated - currentAllocation.paternityUsed;
      case 'Bereavement Leave':
        return 5;
      case 'Compensatory Leave':
        return Math.floor((currentAllocation.compOffAllocated - currentAllocation.compOffUsed) / 8);
      default:
        return 10;
    }
  };

  const availableBalance = getAvailableBalance(formData.leaveType);
  const remainingBalanceAfter = availableBalance - formData.totalDays;

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName || !formData.reason) {
      showToastMsg('Please enter employee name and reason', 'error');
      return;
    }

    // Specific field validations
    if (formData.leaveType === 'Bereavement Leave' && !formData.bereavementRelationship) {
      showToastMsg('Please select immediate family relationship for Bereavement Leave', 'error');
      return;
    }

    if (formData.leaveType === 'Maternity Leave' && !formData.expectedDeliveryDate) {
      showToastMsg('Expected Delivery Date (EDD) is required for Maternity Leave', 'error');
      return;
    }

    if (formData.totalDays > availableBalance && formData.leaveType !== 'Bereavement Leave') {
      showToastMsg(`Leave application exceeds available quota (${availableBalance} days left)`, 'error');
      return;
    }

    const newReq: LeaveRequestItem = {
      id: `lv-${Date.now()}`,
      employeeCode: formData.employeeCode,
      employeeName: formData.employeeName,
      department: formData.department,
      designation: formData.designation,
      leaveType: formData.leaveType,
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      totalDays: formData.totalDays,
      halfDayType: formData.halfDayType,
      reason: formData.reason,
      pregnancyConfirmationDate: formData.pregnancyConfirmationDate,
      expectedDeliveryDate: formData.expectedDeliveryDate,
      intendedMaternityStartDate: formData.intendedMaternityStartDate,
      bereavementRelationship: formData.bereavementRelationship as BereavementRelationship,
      attachmentName: formData.attachmentName,
      status: 'Pending',
      appliedAt: new Date().toISOString(),
    };

    setRequests([newReq, ...requests]);
    setShowApplyModal(false);
    await saveLeaveRequest(newReq);
    showToastMsg('Leave request submitted successfully');
  };

  const handleApprove = async (req: LeaveRequestItem) => {
    const updated: LeaveRequestItem = {
      ...req,
      status: 'Approved',
      approvedBy: 'Admin / HR Manager',
      approvedAt: new Date().toISOString(),
    };
    setRequests(requests.map((r) => (r.id === req.id ? updated : r)));
    if (selectedRequest?.id === req.id) setSelectedRequest(updated);
    await saveLeaveRequest(updated);
    showToastMsg(`Leave application approved for ${req.employeeName}`);
  };

  const handleReject = async (req: LeaveRequestItem) => {
    const updated: LeaveRequestItem = {
      ...req,
      status: 'Rejected',
      approvedBy: 'Admin / HR Manager',
      approvedAt: new Date().toISOString(),
    };
    setRequests(requests.map((r) => (r.id === req.id ? updated : r)));
    if (selectedRequest?.id === req.id) setSelectedRequest(updated);
    await saveLeaveRequest(updated);
    showToastMsg(`Leave request marked as Rejected`, 'error');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave record?')) return;
    setRequests(requests.filter((r) => r.id !== id));
    if (selectedRequest?.id === id) setShowDetailModal(false);
    await deleteLeaveRequest(id);
    showToastMsg('Leave record deleted');
  };

  // Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'Rejected').length;

  // Filtered List
  const filtered = requests.filter((req) => {
    if (selectedTab === 'PENDING' && req.status !== 'Pending') return false;
    if (selectedTab === 'APPROVED' && req.status !== 'Approved') return false;
    if (selectedTab === 'REJECTED' && req.status !== 'Rejected') return false;

    if (selectedTypeFilter && req.leaveType !== selectedTypeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        req.employeeName.toLowerCase().includes(q) ||
        req.employeeCode.toLowerCase().includes(q) ||
        req.department?.toLowerCase().includes(q) ||
        req.reason.toLowerCase().includes(q) ||
        req.leaveType.toLowerCase().includes(q)
      );
    }
    return true;
  });

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <span>People and Culture</span>
            <span>/</span>
            <span>Time Off</span>
            <span>/</span>
            <span className="text-foreground font-bold">Leave Requests</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Leave Requests
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground transition shadow-sm cursor-pointer"
            title="Refresh Requests"
          >
            <RotateCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowApplyModal(true);
              setValidationError(null);
            }}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>APPLY FOR LEAVE</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground">{totalCount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Requests</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground font-bold">
            <Calendar className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-amber-500">{pendingCount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pending Action</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-500">{approvedCount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Approved</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-rose-500">{rejectedCount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rejected</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 font-bold">
            <XCircle className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-4 border-b border-border/60 text-xs font-extrabold tracking-wider text-muted-foreground">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSelectedTab(tab)}
            className={`pb-3 transition relative cursor-pointer ${
              selectedTab === tab ? 'text-amber-500 font-black' : 'hover:text-foreground'
            }`}
          >
            {tab} ({tab === 'ALL' ? totalCount : tab === 'PENDING' ? pendingCount : tab === 'APPROVED' ? approvedCount : rejectedCount})
            {selectedTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Search & Select Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee name, code, department, reason..."
            className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <select
          value={selectedTypeFilter}
          onChange={(e) => setSelectedTypeFilter(e.target.value)}
          className="w-full sm:w-64 h-10 px-3.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
        >
          <option value="">Leave Type (All 8 Categories)</option>
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-surface/50">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Leave Category</th>
                <th className="py-3.5 px-4">Duration &amp; Shift</th>
                <th className="py-3.5 px-4">Total Days</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs font-semibold">
                    No leave requests found in this view.
                  </td>
                </tr>
              ) : (
                filtered.map((req) => {
                  const statusColors: Record<LeaveStatus, string> = {
                    Pending: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
                    Approved: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
                    Rejected: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
                    Cancelled: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
                  };

                  return (
                    <tr
                      key={req.id}
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowDetailModal(true);
                      }}
                      className="hover:bg-surface/60 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                            {req.employeeName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-foreground group-hover:text-amber-500 transition text-xs sm:text-[13px]">
                              {req.employeeName}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {req.employeeCode} &bull; {req.department || 'General'}
                            </div>
                          </div>
                        </div>
                      </td>
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
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            statusColors[req.status] || 'bg-surface text-muted-foreground'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          {req.status === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(req)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 transition cursor-pointer"
                                title="Approve Request"
                              >
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(req)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 transition cursor-pointer"
                                title="Reject Request"
                              >
                                <X className="h-3.5 w-3.5 stroke-[3]" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(req.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: APPLY FOR LEAVE (WITH REAL-TIME VALIDATION & DYNAMIC FIELDS) ── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5 no-scrollbar">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-serif font-black text-foreground">
                Apply for Leave
              </h3>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              {/* Employee Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Employee <span className="text-amber-500">*</span>
                </label>
                <select
                  value={formData.employeeCode}
                  onChange={(e) => handleSelectEmployee(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                >
                  {employees.map((emp) => (
                    <option key={emp.id || emp.code} value={emp.code}>
                      {emp.name} ({emp.code}) — {emp.department || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leave Type Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Leave Category <span className="text-amber-500">*</span>
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => {
                    const newType = e.target.value as LeaveType;
                    handleDateChange(formData.fromDate, formData.toDate, newType, formData.halfDayType);
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Quota Balances Card */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-card border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Requested</span>
                  <span className="font-mono font-black text-amber-500 text-sm">{formData.totalDays} Days</span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Available Quota</span>
                  <span className="font-mono font-black text-foreground text-sm">{availableBalance} Days</span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Balance After</span>
                  <span
                    className={`font-mono font-black text-sm ${
                      remainingBalanceAfter < 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    {remainingBalanceAfter} Days
                  </span>
                </div>
              </div>

              {/* Validation Warning Alert */}
              {validationError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-500 text-xs font-semibold flex items-start space-x-2.5 animate-in shake">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">{validationError}</div>
                </div>
              )}

              {/* Leave Duration & Period Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Leave Duration
                  </label>
                  {formData.leaveType === 'Compensatory Leave' ? (
                    <select
                      value={formData.halfDayType !== 'Full Day' ? '4 hours = Half-Day' : '8 hours = Full-Day'}
                      onChange={(e) => {
                        const isHalf = e.target.value.includes('Half-Day');
                        handleDateChange(
                          formData.fromDate,
                          formData.toDate,
                          formData.leaveType,
                          isHalf ? 'First Half' : 'Full Day'
                        );
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="4 hours = Half-Day">4 hours = Half-Day</option>
                      <option value="8 hours = Full-Day">8 hours = Full-Day</option>
                    </select>
                  ) : (formData.leaveType === 'Casual Leave' ||
                      formData.leaveType === 'Medical Leave' ||
                      formData.leaveType === 'Emergency Leave') ? (
                    <select
                      value={formData.halfDayType === 'Full Day' ? 'FULL' : 'HALF'}
                      onChange={(e) => {
                        const isHalf = e.target.value === 'HALF';
                        handleDateChange(
                          formData.fromDate,
                          formData.toDate,
                          formData.leaveType,
                          isHalf ? 'First Half' : 'Full Day'
                        );
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="HALF">HALF</option>
                      <option value="FULL">FULL</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="FULL"
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs font-semibold text-muted-foreground cursor-not-allowed shadow-sm"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Period (First Half / Second Half)
                  </label>
                  {(formData.leaveType === 'Casual Leave' ||
                    formData.leaveType === 'Medical Leave' ||
                    formData.leaveType === 'Emergency Leave' ||
                    formData.leaveType === 'Compensatory Leave') &&
                  formData.halfDayType !== 'Full Day' ? (
                    <select
                      value={formData.halfDayType}
                      onChange={(e) => {
                        handleDateChange(
                          formData.fromDate,
                          formData.toDate,
                          formData.leaveType,
                          e.target.value as HalfDayType
                        );
                      }}
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="First Half">First Half</option>
                      <option value="Second Half">Second Half</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="Full Day"
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs font-semibold text-muted-foreground cursor-not-allowed shadow-sm"
                    />
                  )}
                </div>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fromDate}
                    onChange={(e) =>
                      handleDateChange(e.target.value, formData.toDate, formData.leaveType, formData.halfDayType)
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    To Date
                  </label>
                  <input
                    type="date"
                    required
                    disabled={formData.leaveType === 'Maternity Leave' || formData.halfDayType !== 'Full Day'}
                    value={
                      formData.halfDayType !== 'Full Day' ? formData.fromDate : formData.toDate
                    }
                    onChange={(e) =>
                      handleDateChange(formData.fromDate, e.target.value, formData.leaveType, formData.halfDayType)
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Bereavement Mandatory Relationship Dropdown */}
              {formData.leaveType === 'Bereavement Leave' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Deceased Immediate Family Relationship <span className="text-amber-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.bereavementRelationship}
                    onChange={(e) =>
                      setFormData({ ...formData, bereavementRelationship: e.target.value as BereavementRelationship })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="">Select Family Relationship</option>
                    {BEREAVEMENT_RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Maternity Leave Specific Fields */}
              {formData.leaveType === 'Maternity Leave' && (
                <div className="space-y-3 p-4 rounded-2xl bg-surface/80 border border-border">
                  <div className="font-extrabold text-xs text-foreground">Maternity Information</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                        Pregnancy Confirmation Date
                      </label>
                      <input
                        type="date"
                        value={formData.pregnancyConfirmationDate}
                        onChange={(e) => setFormData({ ...formData, pregnancyConfirmationDate: e.target.value })}
                        className="w-full h-9 px-2.5 rounded-xl bg-card border border-border text-xs font-semibold text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground block">
                        Expected Delivery Date (EDD) <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.expectedDeliveryDate}
                        onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                        className="w-full h-9 px-2.5 rounded-xl bg-card border border-border text-xs font-semibold text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Document / Medical Certificate Upload */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Upload Documentation{' '}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    (Required if &gt;= 3 days) (File type: PDF, JPG, PNG; max 5 MB)
                  </span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={formData.attachmentName}
                    placeholder="e.g. medical_certificate.pdf"
                    onChange={(e) => setFormData({ ...formData, attachmentName: e.target.value })}
                    className="flex-1 h-10 px-3 rounded-xl bg-surface border border-border text-xs text-foreground font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, attachmentName: 'Doctor_Certificate.pdf' })}
                    className="px-3.5 h-10 rounded-xl bg-card border border-border text-xs font-bold text-muted-foreground hover:text-foreground flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-amber-500" />
                    <span>Choose File</span>
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Reason for Leave <span className="text-amber-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Detail the purpose of leave and handover arrangements..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm resize-none"
                />
              </div>

              {/* ── QUICK LEAVE POLICY BANNER ── */}
              {(() => {
                const pol = QUICK_LEAVE_POLICIES[formData.leaveType] || QUICK_LEAVE_POLICIES['Casual Leave'];
                return (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-amber-500 font-bold uppercase text-[10px]">
                      <div className="h-4 w-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold">
                        i
                      </div>
                      <span>{pol.title}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-muted-foreground font-medium pl-1">
                      {pol.points.map((pt, i) => (
                        <div key={i} className="flex items-start space-x-1.5">
                          <span className="text-amber-500 font-bold">&bull;</span>
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={Boolean(validationError)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
                >
                  SUBMIT REQUEST
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REQUEST DETAIL & APPROVAL ── */}
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

              {selectedRequest.bereavementRelationship && (
                <div className="p-3 rounded-xl bg-surface/50 border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Bereavement Relationship</span>
                  <span className="font-bold text-foreground">{selectedRequest.bereavementRelationship}</span>
                </div>
              )}

              {selectedRequest.expectedDeliveryDate && (
                <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-500">
                  <span className="text-[10px] uppercase font-bold block">Maternity Delivery Info</span>
                  <span className="font-bold">EDD: {selectedRequest.expectedDeliveryDate}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-surface/50 border border-border space-y-1">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">Reason</div>
                <p className="text-foreground font-medium leading-relaxed">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.attachmentName && (
                <div className="p-3 rounded-xl bg-surface/50 border border-border flex items-center space-x-2">
                  <FileCheck className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-foreground">{selectedRequest.attachmentName}</span>
                </div>
              )}

              {selectedRequest.approvedBy && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <div className="font-bold text-[11px]">Action Taken: {selectedRequest.status}</div>
                  <div className="text-[10px] opacity-80">
                    By {selectedRequest.approvedBy} on{' '}
                    {selectedRequest.approvedAt ? new Date(selectedRequest.approvedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => handleDelete(selectedRequest.id)}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>DELETE</span>
              </button>

              <div className="flex items-center space-x-2">
                {selectedRequest.status === 'Pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReject(selectedRequest)}
                      className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer"
                    >
                      REJECT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedRequest)}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition cursor-pointer"
                    >
                      APPROVE
                    </button>
                  </>
                )}
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
        </div>
      )}
    </div>
  );
}
