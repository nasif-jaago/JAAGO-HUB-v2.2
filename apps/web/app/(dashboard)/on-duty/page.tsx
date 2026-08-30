'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Shield,
  Search,
  X,
  Info,
  ChevronLeft,
  Clock,
} from 'lucide-react';

import {
  OnDutyRequestItem,
  computeOnDutyDurationPreview,
  getLocalOnDutyRequests,
  createOnDutyRequest,
  approveOnDutyRequest,
  refuseOnDutyRequest,
  cancelOnDutyRequest,
  fetchOnDutyRequestsFromSupabase,
} from '@/lib/supabase-onduty';

import { getActiveEmployeeProfile } from '@/lib/user-profile-sync';

const HOURS_LIST = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES_LIST = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function parseTimeParts(timeStr: string) {
  let h = '10';
  let m = '00';
  let p = 'AM';

  if (!timeStr) return { h, m, p };
  const clean = timeStr.trim().toUpperCase();
  if (clean.includes('PM')) {
    p = 'PM';
  } else if (clean.includes('AM')) {
    p = 'AM';
  }

  const timeOnly = clean.replace('AM', '').replace('PM', '').trim();
  const [hPart, mPart] = timeOnly.split(':');
  if (hPart) {
    const rawH = parseInt(hPart, 10);
    if (!isNaN(rawH)) {
      if (rawH === 0) h = '12';
      else if (rawH > 12) {
        h = String(rawH - 12).padStart(2, '0');
        p = 'PM';
      } else {
        h = String(rawH).padStart(2, '0');
      }
    }
  }
  if (mPart) {
    const rawM = parseInt(mPart, 10);
    if (!isNaN(rawM)) {
      m = String(rawM).padStart(2, '0');
    }
  }
  return { h, m, p };
}

interface StandardClockTimeInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

function StandardClockTimeInput({
  label,
  value,
  onChange,
}: StandardClockTimeInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { h, m, p } = useMemo(() => parseTimeParts(value), [value]);

  const updateTime = (newH: string, newM: string, newP: string) => {
    onChange(`${newH}:${newM} ${newP}`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="space-y-1.5 relative" ref={popoverRef}>
      <label className="text-xs font-bold text-foreground">{label}</label>

      {/* Main Input Control Box */}
      <div className="flex items-center justify-between w-full bg-surface/60 border border-border/80 focus-within:border-amber-500 rounded-xl px-2.5 py-2 transition shadow-xs space-x-1.5">
        {/* Hours : Minutes Inline Selection */}
        <div className="flex items-center space-x-1 font-mono font-black text-xs text-foreground">
          <select
            value={h}
            onChange={(e) => updateTime(e.target.value, m, p)}
            className="bg-transparent text-foreground font-black focus:outline-none cursor-pointer text-xs"
            aria-label={`${label} Hour`}
          >
            {HOURS_LIST.map((hour) => (
              <option key={hour} value={hour} className="bg-card text-foreground font-bold">
                {hour}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground font-bold">:</span>
          <select
            value={m}
            onChange={(e) => updateTime(h, e.target.value, p)}
            className="bg-transparent text-foreground font-black focus:outline-none cursor-pointer text-xs"
            aria-label={`${label} Minute`}
          >
            {MINUTES_LIST.map((min) => (
              <option key={min} value={min} className="bg-card text-foreground font-bold">
                {min}
              </option>
            ))}
          </select>
        </div>

        {/* AM / PM Dropdown */}
        <div className="flex items-center space-x-1.5">
          <select
            value={p}
            onChange={(e) => updateTime(h, m, e.target.value)}
            className="bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/25 font-black text-xs px-2 py-0.5 rounded-lg focus:outline-none cursor-pointer transition shadow-xs"
            aria-label={`${label} AM/PM Period`}
          >
            <option value="AM" className="bg-card text-foreground font-bold">
              AM
            </option>
            <option value="PM" className="bg-card text-foreground font-bold">
              PM
            </option>
          </select>

          {/* Clock Icon Trigger */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`p-1 rounded-lg transition cursor-pointer ${
              isOpen ? 'bg-amber-500 text-slate-950' : 'text-muted-foreground hover:text-amber-500'
            }`}
            title={`Select ${label} from Clock`}
          >
            <Clock className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Standard Clock Time Picker Popover */}
      {isOpen && (
        <div className="absolute z-40 top-full mt-1.5 right-0 w-64 bg-card border border-border/90 rounded-2xl shadow-2xl p-3 space-y-3 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-border/70">
            <div className="flex items-center space-x-1.5 text-amber-500">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-black text-foreground uppercase tracking-wider">
                {label} Clock
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition p-0.5 rounded-lg hover:bg-surface"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Current Selection Display */}
          <div className="bg-surface/70 border border-border/60 rounded-xl p-2 text-center">
            <span className="text-lg font-black font-mono text-amber-500">
              {h}:{m} {p}
            </span>
          </div>

          {/* 3-Column Standard Clock Grid: Hour | Minute | Period */}
          <div className="grid grid-cols-3 gap-2">
            {/* Hours Column */}
            <div className="space-y-1">
              <div className="text-[10px] font-black text-muted-foreground uppercase text-center">
                Hour
              </div>
              <div className="h-36 overflow-y-auto space-y-1 pr-1 border border-border/50 rounded-xl p-1 bg-surface/30">
                {HOURS_LIST.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => updateTime(hour, m, p)}
                    className={`w-full py-1 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
                      h === hour
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'hover:bg-surface text-foreground'
                    }`}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="space-y-1">
              <div className="text-[10px] font-black text-muted-foreground uppercase text-center">
                Min
              </div>
              <div className="h-36 overflow-y-auto space-y-1 pr-1 border border-border/50 rounded-xl p-1 bg-surface/30">
                {MINUTES_LIST.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => updateTime(h, min, p)}
                    className={`w-full py-1 text-xs font-bold rounded-lg transition text-center cursor-pointer ${
                      m === min
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'hover:bg-surface text-foreground'
                    }`}
                  >
                    {min}
                  </button>
                ))}
              </div>
            </div>

            {/* AM / PM Column */}
            <div className="space-y-1">
              <div className="text-[10px] font-black text-muted-foreground uppercase text-center">
                Period
              </div>
              <div className="h-36 space-y-2 border border-border/50 rounded-xl p-1 bg-surface/30 flex flex-col justify-center">
                <button
                  type="button"
                  onClick={() => updateTime(h, m, 'AM')}
                  className={`w-full py-2.5 text-xs font-black rounded-xl transition text-center cursor-pointer ${
                    p === 'AM'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'hover:bg-surface text-foreground font-bold border border-border/50'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => updateTime(h, m, 'PM')}
                  className={`w-full py-2.5 text-xs font-black rounded-xl transition text-center cursor-pointer ${
                    p === 'PM'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'hover:bg-surface text-foreground font-bold border border-border/50'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-1 border-t border-border/60">
            <div className="text-[10px] font-bold text-muted-foreground mb-1">
              Quick Presets:
            </div>
            <div className="flex flex-wrap gap-1">
              {['09:00 AM', '10:00 AM', '01:00 PM', '02:00 PM', '06:00 PM'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const parsed = parseTimeParts(preset);
                    updateTime(parsed.h, parsed.m, parsed.p);
                  }}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg border border-border/70 bg-surface/60 hover:bg-amber-500/20 text-foreground transition cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Set Time Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition cursor-pointer shadow-xs"
          >
            SET TIME
          </button>
        </div>
      )}
    </div>
  );
}

export default function OnDutyPage() {
  const router = useRouter();

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'apply' | 'approvals'>('apply');
  const [mounted, setMounted] = useState(false);

  // Current User Context
  const [currentUser, setCurrentUser] = useState({
    id: 'emp-nasif',
    code: 'FO032507061190',
    name: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Lead Architect & Systems Engineer',
    avatarUrl: '',
    supervisorId: 'emp-korvi',
    supervisorName: 'Korvi Rakshand',
    supervisorEmail: 'korvi@jaago.com.bd',
  });

  // Requests Data
  const [requests, setRequests] = useState<OnDutyRequestItem[]>([]);

  // Form State
  const [startDate, setStartDate] = useState('2026-08-30');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endDate, setEndDate] = useState('2026-08-30');
  const [endTime, setEndTime] = useState('06:00 PM');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Approvals Filter State
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REFUSED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Supervisor Review Modal State
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    request: OnDutyRequestItem | null;
    isRefusing: boolean;
    refusalNote: string;
    actionLoading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    request: null,
    isRefusing: false,
    refusalNote: '',
    actionLoading: false,
    error: null,
  });

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast((curr) => (curr?.message === message ? null : curr)), 4000);
  };

  // 1. Initial Load & Listeners
  useEffect(() => {
    setMounted(true);

    // Load active profile
    getActiveEmployeeProfile().then((emp: any) => {
      if (emp) {
        setCurrentUser({
          id: emp.id || 'emp-nasif',
          code: emp.code || 'FO032507061190',
          name: emp.name || 'Nasif Kamal',
          department: emp.department || "Founder's Office / FC",
          designation: emp.designation || 'Lead Architect & Systems Engineer',
          avatarUrl: emp.avatarUrl || '',
          supervisorId: emp.supervisorId || 'emp-korvi',
          supervisorName: emp.supervisor || 'Korvi Rakshand',
          supervisorEmail: 'korvi@jaago.com.bd',
        });
      }
    });

    // Load requests from local cache & Supabase
    const localData = getLocalOnDutyRequests();
    setRequests(localData);

    fetchOnDutyRequestsFromSupabase().then((remoteData) => {
      if (remoteData && remoteData.length > 0) {
        setRequests(remoteData);
      }
    });

    const handleSync = () => {
      setRequests(getLocalOnDutyRequests());
    };

    window.addEventListener('jaago_onduty_updated', handleSync);
    return () => window.removeEventListener('jaago_onduty_updated', handleSync);
  }, []);

  // 2. Real-time Computed Duration Preview (Section 5 Canonical Algorithm)
  const durationPreview = useMemo(() => {
    return computeOnDutyDurationPreview(startDate, startTime, endDate, endTime);
  }, [startDate, startTime, endDate, endTime]);

  // 3. Form Submission
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason || reason.trim().length === 0) {
      showToast('Please enter Duty Description / Reason', 'error');
      return;
    }

    if (!durationPreview.isValid) {
      showToast(durationPreview.validationError || 'Invalid start or end dates', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createOnDutyRequest({
        employeeId: currentUser.id,
        employeeCode: currentUser.code,
        employeeName: currentUser.name,
        department: currentUser.department,
        designation: currentUser.designation,
        avatarUrl: currentUser.avatarUrl,
        supervisorId: currentUser.supervisorId,
        supervisorName: currentUser.supervisorName,
        supervisorEmail: currentUser.supervisorEmail,
        startDate,
        startTime,
        endDate,
        endTime,
        reason: reason.trim(),
      });

      if (res.success && res.data) {
        showToast('On-Duty application submitted successfully! Routed to supervisor.');
        setReason('');
        setRequests(getLocalOnDutyRequests());
      } else {
        showToast(res.error || 'Failed to submit application', 'error');
      }
    } catch {
      showToast('Network error while submitting application', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Supervisor Review Actions
  const handleApprove = async (reqItem: OnDutyRequestItem) => {
    setReviewModal((prev) => ({ ...prev, actionLoading: true, error: null }));
    try {
      const res = await approveOnDutyRequest(reqItem.id, currentUser.id, currentUser.name);
      if (res.success) {
        showToast(`On-Duty request for ${reqItem.employeeName} approved! Attendance day records credited.`);
        setReviewModal({
          isOpen: false,
          request: null,
          isRefusing: false,
          refusalNote: '',
          actionLoading: false,
          error: null,
        });
        setRequests(getLocalOnDutyRequests());
      } else {
        setReviewModal((prev) => ({ ...prev, actionLoading: false, error: res.error || 'Approval failed' }));
      }
    } catch {
      setReviewModal((prev) => ({
        ...prev,
        actionLoading: false,
        error: 'Network error while approving request',
      }));
    }
  };

  const handleRefuse = async (reqItem: OnDutyRequestItem) => {
    if (!reviewModal.refusalNote || reviewModal.refusalNote.trim().length === 0) {
      setReviewModal((prev) => ({
        ...prev,
        error: 'A Refusal Note is mandatory when refusing an On-Duty request.',
      }));
      return;
    }

    setReviewModal((prev) => ({ ...prev, actionLoading: true, error: null }));
    try {
      const res = await refuseOnDutyRequest(
        reqItem.id,
        reviewModal.refusalNote.trim(),
        currentUser.id,
        currentUser.name
      );
      if (res.success) {
        showToast(`On-Duty request for ${reqItem.employeeName} refused.`);
        setReviewModal({
          isOpen: false,
          request: null,
          isRefusing: false,
          refusalNote: '',
          actionLoading: false,
          error: null,
        });
        setRequests(getLocalOnDutyRequests());
      } else {
        setReviewModal((prev) => ({ ...prev, actionLoading: false, error: res.error || 'Refusal failed' }));
      }
    } catch {
      setReviewModal((prev) => ({
        ...prev,
        actionLoading: false,
        error: 'Network error while refusing request',
      }));
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this pending On-Duty request?')) return;
    try {
      const res = await cancelOnDutyRequest(id, currentUser.id);
      if (res.success) {
        showToast('On-Duty request cancelled successfully.');
        setRequests(getLocalOnDutyRequests());
      } else {
        showToast(res.error || 'Failed to cancel request', 'error');
      }
    } catch {
      showToast('Error cancelling request', 'error');
    }
  };

  // Pending Count for Approvals Badge
  const pendingApprovalsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'PENDING').length;
  }, [requests]);

  // Filtered requests for approvals tab
  const approvalsList = useMemo(() => {
    return requests.filter((r) => {
      if (approvalFilter !== 'ALL' && r.status !== approvalFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.employeeName.toLowerCase().includes(q);
        const matchReason = r.reason.toLowerCase().includes(q);
        const matchDept = (r.department || '').toLowerCase().includes(q);
        return matchName || matchReason || matchDept;
      }
      return true;
    });
  }, [requests, approvalFilter, searchQuery]);

  // Helper date formatter
  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-semibold">Loading On-Duty Subsystem...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 1. TOAST NOTIFICATION ──────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2.5 text-xs font-bold border animate-in slide-in-from-top duration-200 ${
            toast.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 backdrop-blur-md'
              : toast.type === 'info'
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400 backdrop-blur-md'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 backdrop-blur-md'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="h-4 w-4 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 2. TOP HEADER: TITLE & ACTION BUTTONS ─────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Back button + Title */}
        <div className="flex items-center space-x-3.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-surface text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer shadow-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>BACK</span>
          </button>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              On-Duty Management
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Field Work Application
            </p>
          </div>
        </div>

        {/* Right Side: Apply / Approvals Tabs */}
        <div className="flex items-center space-x-2">
          {/* APPLY Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('apply')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black flex items-center space-x-2 transition cursor-pointer shadow-xs ${
              activeTab === 'apply'
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md'
                : 'bg-card hover:bg-surface border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>APPLY</span>
          </button>

          {/* APPROVALS Tab with Badge */}
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition cursor-pointer shadow-xs border ${
              activeTab === 'approvals'
                ? 'bg-primary text-primary-foreground border-primary font-black shadow-md'
                : 'bg-card hover:bg-surface border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>APPROVALS</span>
            {pendingApprovalsCount > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 3. MAIN CONTENT: APPLY VIEW (MATCHING DESIGN SCREENSHOT) ──────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'apply' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── LEFT PANEL: NEW ON-DUTY REQUEST FORM ────────────────────────── */}
          <div className="lg:col-span-5 bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-amber-500">
                <Radio className="h-4 w-4" />
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  New On-Duty Request
                </h2>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                Apply for field work or official out-of-office duty
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitApplication} className="space-y-4">
              {/* Date & Time Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full bg-surface/60 border border-border/80 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none transition shadow-xs cursor-pointer"
                  />
                </div>

                {/* Start Time */}
                <StandardClockTimeInput
                  label="Start Time"
                  value={startTime}
                  onChange={setStartTime}
                />

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full bg-surface/60 border border-border/80 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none transition shadow-xs cursor-pointer"
                  />
                </div>

                {/* End Time */}
                <StandardClockTimeInput
                  label="End Time"
                  value={endTime}
                  onChange={setEndTime}
                />
              </div>

              {/* Duty Description / Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Duty Description / Reason
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Where are you going? What is the purpose?"
                  rows={3}
                  required
                  className="w-full bg-surface/60 border border-border/80 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none transition shadow-xs resize-none"
                />
              </div>

              {/* Live Duration Calculation Banner (Section 5 Canonical Engine) */}
              <div className="bg-surface/50 border border-border/70 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Estimated Credited Duration
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-sm font-black text-amber-500 font-mono">
                      {durationPreview.creditedTotalHours.toFixed(1)}h
                    </span>
                    <span className="text-xs font-bold text-muted-foreground font-mono">
                      ({durationPreview.creditedDays.toFixed(1)} DAYS)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    8h/Day Cap Applied
                  </span>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Supervisor: <strong className="text-foreground">{currentUser.supervisorName}</strong>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !durationPreview.isValid}
                className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-slate-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer shadow-md"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}</span>
              </button>
            </form>
          </div>

          {/* ── RIGHT PANEL: RECENT HISTORY TABLE ───────────────────────────── */}
          <div className="lg:col-span-7 bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center space-x-2 text-amber-500">
                <History className="h-4 w-4" />
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  Recent History
                </h2>
              </div>
              <span className="text-xs text-muted-foreground font-semibold">
                {requests.length} Record{requests.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/70 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-3">START DATE</th>
                    <th className="py-3 px-3">END DATE</th>
                    <th className="py-3 px-2">START</th>
                    <th className="py-3 px-2">END</th>
                    <th className="py-3 px-3">DURATION</th>
                    <th className="py-3 px-3">REASON</th>
                    <th className="py-3 px-3 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-medium">
                  {requests.length > 0 ? (
                    requests.map((item) => (
                      <tr key={item.id} className="hover:bg-surface/50 transition group">
                        {/* Start Date */}
                        <td className="py-3.5 px-3 font-bold text-foreground">
                          {formatDateDisplay(item.startDate)}
                        </td>

                        {/* End Date */}
                        <td className="py-3.5 px-3 font-bold text-foreground">
                          {formatDateDisplay(item.endDate)}
                        </td>

                        {/* Start Time */}
                        <td className="py-3.5 px-2 text-muted-foreground font-mono text-[11px]">
                          {item.startTime}
                        </td>

                        {/* End Time */}
                        <td className="py-3.5 px-2 text-muted-foreground font-mono text-[11px]">
                          {item.endTime}
                        </td>

                        {/* Duration (e.g. 8.0h / 1.0 DAYS) */}
                        <td className="py-3.5 px-3">
                          <div className="font-mono font-black text-amber-500 text-xs">
                            {item.totalHours.toFixed(1)}h
                          </div>
                          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                            {item.creditedDays.toFixed(1)} DAYS
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-3 text-foreground max-w-[140px] truncate" title={item.reason}>
                          {item.reason}
                          {item.refusalNote && (
                            <div className="text-[10px] text-rose-500 italic mt-0.5 truncate" title={item.refusalNote}>
                              Note: {item.refusalNote}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {item.status === 'PENDING' ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-black uppercase">
                                PENDING
                              </span>
                            ) : item.status === 'APPROVED' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-black uppercase">
                                APPROVED
                              </span>
                            ) : item.status === 'REFUSED' ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-black uppercase">
                                REFUSED
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-surface text-muted-foreground border border-border text-[10px] font-bold uppercase">
                                {item.status}
                              </span>
                            )}

                            {/* Owner cancel if pending */}
                            {item.status === 'PENDING' && item.employeeId === currentUser.id && (
                              <button
                                type="button"
                                onClick={() => handleCancel(item.id)}
                                className="p-1 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Cancel Application"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground space-y-2">
                        <Radio className="h-8 w-8 mx-auto text-muted-foreground/40" />
                        <p className="font-bold text-sm">No On-Duty records found</p>
                        <p className="text-xs text-muted-foreground/70">
                          Submit your first field work application on the left form.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════════ */
        /* ── 4. SUPERVISOR APPROVALS INBOX TAB ─────────────────────────────── */
        /* ═════════════════════════════════════════════════════════════════════ */
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
          {/* Header & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-border/70">
            <div className="flex items-center space-x-2.5">
              <div className="h-9 w-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  Supervisor Approvals Inbox
                </h2>
                <p className="text-xs text-muted-foreground">
                  Review and authorize field work applications from team members
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'PENDING', 'APPROVED', 'REFUSED'] as const).map((filterVal) => (
                <button
                  key={filterVal}
                  type="button"
                  onClick={() => setApprovalFilter(filterVal)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    approvalFilter === filterVal
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'bg-surface/60 hover:bg-surface border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filterVal}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee name, purpose, or department..."
              className="w-full bg-surface/50 border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Approvals Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-surface/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-3">Date Range</th>
                  <th className="py-3.5 px-3">Times</th>
                  <th className="py-3.5 px-3">Duration</th>
                  <th className="py-3.5 px-4">Reason / Field Purpose</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {approvalsList.length > 0 ? (
                  approvalsList.map((req) => (
                    <tr key={req.id} className="hover:bg-surface/50 transition group">
                      {/* Employee info */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-foreground text-xs sm:text-sm">
                          {req.employeeName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {req.employeeCode} • {req.department}
                        </div>
                      </td>

                      {/* Date Range */}
                      <td className="py-4 px-3">
                        <div className="font-bold text-foreground">
                          {formatDateDisplay(req.startDate)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          to {formatDateDisplay(req.endDate)}
                        </div>
                      </td>

                      {/* Times */}
                      <td className="py-4 px-3 font-mono text-[11px] text-muted-foreground">
                        <div>{req.startTime}</div>
                        <div>{req.endTime}</div>
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-3">
                        <div className="font-mono font-black text-amber-500 text-xs">
                          {req.totalHours.toFixed(1)}h
                        </div>
                        <div className="text-[9px] font-black uppercase text-muted-foreground">
                          {req.creditedDays.toFixed(1)} DAYS
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-4 text-foreground max-w-xs truncate" title={req.reason}>
                        {req.reason}
                        {req.refusalNote && (
                          <div className="text-[10px] text-rose-500 italic mt-0.5 truncate" title={req.refusalNote}>
                            Refusal Note: {req.refusalNote}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-3">
                        {req.status === 'PENDING' ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-black uppercase">
                            PENDING
                          </span>
                        ) : req.status === 'APPROVED' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[10px] font-black uppercase">
                            APPROVED
                          </span>
                        ) : req.status === 'REFUSED' ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-black uppercase">
                            REFUSED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-surface text-muted-foreground border border-border text-[10px] font-bold uppercase">
                            {req.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setReviewModal({
                              isOpen: true,
                              request: req,
                              isRefusing: false,
                              refusalNote: '',
                              actionLoading: false,
                              error: null,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500 text-amber-950 dark:text-amber-300 hover:text-slate-950 font-black text-xs transition cursor-pointer shadow-xs"
                        >
                          Review &amp; Decide
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="font-bold text-sm">No applications matching filter</p>
                      <p className="text-xs text-muted-foreground/70">
                        Try selecting &quot;ALL&quot; or changing your search terms.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── 5. SUPERVISOR REVIEW & DECISION MODAL ─────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {reviewModal.isOpen && reviewModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    Review On-Duty Application
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Supervisor Authorization &amp; Attendance Crediting
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModal({ isOpen: false, request: null, isRefusing: false, refusalNote: '', actionLoading: false, error: null })}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error banner if any */}
            {reviewModal.error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{reviewModal.error}</span>
              </div>
            )}

            {/* Details Matrix */}
            <div className="bg-surface/50 border border-border/70 rounded-2xl p-4 space-y-3 text-xs">
              {/* Employee */}
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Requester:</span>
                <div className="text-right">
                  <span className="font-black text-foreground">{reviewModal.request.employeeName}</span>
                  <span className="text-[11px] text-muted-foreground block font-mono">{reviewModal.request.employeeCode}</span>
                </div>
              </div>

              {/* Department */}
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Department / Role:</span>
                <span className="font-bold text-foreground text-right">{reviewModal.request.department}</span>
              </div>

              {/* Dates & Times */}
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Covered Period:</span>
                <span className="font-bold text-foreground text-right font-mono">
                  {formatDateDisplay(reviewModal.request.startDate)} ({reviewModal.request.startTime}) → {formatDateDisplay(reviewModal.request.endDate)} ({reviewModal.request.endTime})
                </span>
              </div>

              {/* Computed Crediting */}
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground font-semibold">Credited Attendance:</span>
                <span className="font-black text-amber-500 font-mono text-sm">
                  {reviewModal.request.totalHours.toFixed(1)}h ({reviewModal.request.creditedDays.toFixed(1)} DAYS)
                </span>
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <span className="text-muted-foreground font-semibold">Purpose &amp; Description:</span>
                <p className="bg-card p-2.5 rounded-xl border border-border/70 text-foreground font-medium">
                  {reviewModal.request.reason}
                </p>
              </div>
            </div>

            {/* If Refusing Mode: Reveal Mandatory Refusal Note */}
            {reviewModal.isRefusing && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="text-xs font-bold text-rose-500 flex items-center space-x-1">
                  <span>Mandatory Refusal Note *</span>
                </label>
                <textarea
                  value={reviewModal.refusalNote}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, refusalNote: e.target.value }))}
                  placeholder="Explain reason for refusal (required)..."
                  rows={3}
                  className="w-full bg-surface/70 border border-rose-500/50 focus:border-rose-500 rounded-xl p-2.5 text-xs text-foreground focus:outline-none transition resize-none"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReviewModal({ isOpen: false, request: null, isRefusing: false, refusalNote: '', actionLoading: false, error: null })}
                className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface/80 text-xs font-bold text-muted-foreground transition cursor-pointer"
              >
                Cancel
              </button>

              {/* If already decided */}
              {reviewModal.request.status !== 'PENDING' ? (
                <span className="text-xs font-bold text-muted-foreground px-3">
                  Application is already {reviewModal.request.status}
                </span>
              ) : reviewModal.isRefusing ? (
                /* Confirm Refusal Button */
                <button
                  type="button"
                  disabled={reviewModal.actionLoading || !reviewModal.refusalNote.trim()}
                  onClick={() => handleRefuse(reviewModal.request!)}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 disabled:opacity-50 text-white font-black text-xs transition cursor-pointer shadow-md"
                >
                  {reviewModal.actionLoading ? 'Refusing...' : 'Confirm Refusal'}
                </button>
              ) : (
                <>
                  {/* Refuse Button */}
                  <button
                    type="button"
                    onClick={() => setReviewModal((prev) => ({ ...prev, isRefusing: true }))}
                    className="px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 font-black text-xs transition cursor-pointer shadow-xs"
                  >
                    REFUSE
                  </button>

                  {/* Approve Button */}
                  <button
                    type="button"
                    disabled={reviewModal.actionLoading}
                    onClick={() => handleApprove(reviewModal.request!)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 text-slate-950 font-black text-xs transition cursor-pointer shadow-md"
                  >
                    {reviewModal.actionLoading ? 'Approving...' : 'APPROVE'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
