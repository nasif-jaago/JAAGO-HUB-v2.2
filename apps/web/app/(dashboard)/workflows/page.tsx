'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Check,
  Ban,
  Building,
  User,
  History,
  Search,
  Paperclip,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { EnterpriseTable, ColumnDef } from '@jaago/ui';
import { getCurrentUserSession, UserSessionData } from '@/lib/user-profile-sync';
import { downloadAttachment } from '@/lib/attachment-helper';

interface WorkflowInstance {
  id: string;
  definitionKey: string;
  title: string;
  entityType: string;
  entityId: string;
  requesterId: string;
  requesterEmail?: string;
  currentState: 'pending_approval' | 'approved' | 'rejected';
  currentTier: number;
  totalTiers: number;
  metadata: {
    requesterName?: string;
    employeeCode?: string;
    department?: string;
    designation?: string;
    supervisorName?: string;
    supervisorEmail?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    totalDays?: number | string;
    reason?: string;
    rejectionReason?: string;
    attachmentName?: string;
    approvedBy?: string;
    approvedAt?: string;
    amount?: string;
    vendor?: string;
    location?: string;
  };
  createdAt: string;
  updatedAt: string;
  history: Array<{
    fromState: string;
    toState: string;
    actorId: string;
    tier?: number;
    action: string;
    comment?: string;
    timestamp: string;
  }>;
}

function WorkflowsContent() {
  const searchParams = useSearchParams();
  const urlRequestId = searchParams.get('requestId');

  const [session, setSession] = useState<UserSessionData | null>(null);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'HISTORY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Refusal Modal State
  const [refusalModalInstance, setRefusalModalInstance] = useState<WorkflowInstance | null>(null);
  const [refusalNote, setRefusalNote] = useState('');

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadWorkflows = async (activeSession?: UserSessionData | null) => {
    try {
      const sess = activeSession || session || getCurrentUserSession();
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;

      const params = new URLSearchParams();
      if (sess) {
        if (sess.roles && sess.roles.length > 0) params.set('role', sess.roles[0] || 'staff');
        if (sess.email) params.set('userEmail', sess.email);
        if (sess.employeeCode) params.set('userCode', sess.employeeCode);
        if (sess.fullName) params.set('userName', sess.fullName);
      }

      const res = await fetch(`/api/v1/workflows?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.data) {
        setInstances(data.data);

        // Auto-select request if requestId param is present
        if (urlRequestId) {
          const match = data.data.find(
            (i: WorkflowInstance) => i.id === urlRequestId || i.entityId === urlRequestId
          );
          if (match) {
            setSelectedInstance(match);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
    }
  };

  useEffect(() => {
    const currentSession = getCurrentUserSession();
    setSession(currentSession);
    loadWorkflows(currentSession);

    const handleReqUpdate = () => loadWorkflows();
    window.addEventListener('jaago_leave_request_updated', handleReqUpdate);
    window.addEventListener('jaago_notifications_updated', handleReqUpdate);

    return () => {
      window.removeEventListener('jaago_leave_request_updated', handleReqUpdate);
      window.removeEventListener('jaago_notifications_updated', handleReqUpdate);
    };
  }, [urlRequestId]);

  const handleApprove = async (instance: WorkflowInstance) => {
    setIsSubmitting(true);
    try {
      const reviewerName = session?.fullName || 'Supervisor';
      const reviewerCode = session?.employeeCode || '';
      const reviewerEmail = session?.email || 'nasif.kamal@jaago.com.bd';

      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'approve',
          instanceId: instance.id,
          reviewerName,
          reviewerCode,
          reviewerEmail,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        showToastMsg(`Leave request for ${instance.metadata.requesterName} has been approved!`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jaago_leave_request_updated'));
        }
        await loadWorkflows();
        setSelectedInstance(null);
      } else {
        showToastMsg(resData.error || 'Failed to approve request', 'error');
      }
    } catch (err: any) {
      showToastMsg(err?.message || 'Approval action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefusalSubmit = async () => {
    if (!refusalModalInstance) return;
    if (!refusalNote.trim()) {
      showToastMsg('Mandatory Refusal Note is required before refusing a leave request.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewerName = session?.fullName || 'Supervisor';
      const reviewerCode = session?.employeeCode || '';
      const reviewerEmail = session?.email || 'nasif.kamal@jaago.com.bd';

      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'reject',
          instanceId: refusalModalInstance.id,
          comment: refusalNote.trim(),
          reviewerName,
          reviewerCode,
          reviewerEmail,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        showToastMsg(`Leave request for ${refusalModalInstance.metadata.requesterName} refused with note.`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('jaago_leave_request_updated'));
        }
        await loadWorkflows();
        setRefusalModalInstance(null);
        setRefusalNote('');
        if (selectedInstance?.id === refusalModalInstance.id) {
          setSelectedInstance(null);
        }
      } else {
        showToastMsg(resData.error || 'Failed to refuse request', 'error');
      }
    } catch (err: any) {
      showToastMsg(err?.message || 'Refusal action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (state: string) => {
    switch (state.toLowerCase()) {
      case 'pending_approval':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Approved
          </span>
        );
      case 'rejected':
      case 'refused':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-destructive/15 text-destructive border border-destructive/30">
            Refused
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface text-muted-foreground border border-border">
            {state}
          </span>
        );
    }
  };

  // Strictly filter out self-requests: employees cannot approve or review their own leave applications
  const scopedInstances = useMemo(() => {
    return instances.filter((item) => {
      const itemRequesterCode = (item.metadata.employeeCode || item.requesterId || '').toLowerCase().trim();
      const userCode = (session?.employeeCode || '').toLowerCase().trim();
      const userName = (session?.fullName || '').toLowerCase().trim();
      const itemRequesterName = (item.metadata.requesterName || '').toLowerCase().trim();

      if (userCode && itemRequesterCode === userCode) return false;
      if (userName && itemRequesterName && (userName === itemRequesterName || itemRequesterName.includes(userName))) return false;
      return true;
    });
  }, [instances, session]);

  const filteredInstances = useMemo(() => {
    return scopedInstances.filter((item) => {
      // Tab Filter
      if (activeTab === 'PENDING' && item.currentState !== 'pending_approval') return false;
      if (activeTab === 'APPROVED' && item.currentState !== 'approved') return false;
      if (activeTab === 'REJECTED' && item.currentState !== 'rejected') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const nameMatch = (item.metadata.requesterName || '').toLowerCase().includes(q);
        const deptMatch = (item.metadata.department || '').toLowerCase().includes(q);
        const idMatch = (item.entityId || '').toLowerCase().includes(q);
        const codeMatch = (item.metadata.employeeCode || '').toLowerCase().includes(q);
        if (!titleMatch && !nameMatch && !deptMatch && !idMatch && !codeMatch) return false;
      }

      return true;
    });
  }, [scopedInstances, activeTab, searchQuery]);

  const pendingCount = scopedInstances.filter((i) => i.currentState === 'pending_approval').length;
  const approvedCount = scopedInstances.filter((i) => i.currentState === 'approved').length;
  const rejectedCount = scopedInstances.filter((i) => i.currentState === 'rejected').length;

  const columns: ColumnDef<WorkflowInstance>[] = [
    {
      key: 'title',
      header: 'Workflow Request',
      accessor: (row) => (
        <div>
          <div className="font-bold text-foreground hover:text-primary transition">{row.title}</div>
          <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="font-mono">ID: {row.entityId}</span>
            <span>&bull;</span>
            <span className="capitalize">{row.metadata.leaveType || row.definitionKey.replace(/_/g, ' ')}</span>
            <span>&bull;</span>
            <span>{row.metadata.totalDays} Day(s)</span>
            {row.metadata.attachmentName && (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-[10px]">
                <Paperclip className="h-3 w-3" />
                <span className="truncate max-w-[140px]">{row.metadata.attachmentName}</span>
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'requesterName',
      header: 'Requester / Dept',
      accessor: (row) => (
        <div>
          <div className="font-medium text-foreground">
            {row.metadata.requesterName || 'N/A'}{' '}
            <span className="text-muted-foreground text-[10px] font-mono">({row.metadata.employeeCode})</span>
          </div>
          <div className="text-[10px] text-muted-foreground">{row.metadata.department || "Founder's Office"}</div>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Leave Duration',
      accessor: (row) => (
        <div className="text-xs font-mono text-muted-foreground">
          {row.metadata.startDate} &rarr; {row.metadata.endDate}
        </div>
      ),
    },
    {
      key: 'attachment',
      header: 'Supporting Document',
      accessor: (row) =>
        row.metadata.attachmentName ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadAttachment(row.metadata.attachmentName!, {
                requesterName: row.metadata.requesterName,
                employeeCode: row.metadata.employeeCode,
                department: row.metadata.department,
                leaveType: row.metadata.leaveType,
                startDate: row.metadata.startDate,
                endDate: row.metadata.endDate,
                reason: row.metadata.reason,
                requestId: row.id,
              });
            }}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition cursor-pointer shadow-sm group"
            title={`Click to download "${row.metadata.attachmentName}"`}
          >
            <Paperclip className="h-3.5 w-3.5 text-emerald-500 shrink-0 group-hover:scale-110 transition" />
            <span className="truncate max-w-[120px] underline decoration-emerald-500/30 underline-offset-2">
              {row.metadata.attachmentName}
            </span>
            <Download className="h-3 w-3 opacity-70 group-hover:opacity-100 transition shrink-0" />
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground/60 italic">No Document</span>
        ),
    },
    {
      key: 'currentState',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.currentState),
    },
    {
      key: 'actions',
      header: 'Quick Action',
      accessor: (row) => (
        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          {row.currentState === 'pending_approval' ? (
            <>
              <button
                onClick={() => handleApprove(row)}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/30 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
              >
                <Check className="h-3 w-3" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => {
                  setRefusalModalInstance(row);
                  setRefusalNote('');
                }}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-lg bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/30 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Refuse</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectedInstance(row)}
              className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface/80 text-muted-foreground text-[11px] font-medium border border-border cursor-pointer"
            >
              View Details
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground animate-in fade-in">
      {/* ── TOAST ALERT ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center space-x-2 animate-in slide-in-from-bottom-3 ${
            toast.type === 'error'
              ? 'bg-destructive text-destructive-foreground border-destructive/30'
              : 'bg-emerald-600 text-white border-emerald-500/30'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg border border-primary/30">
            <GitPullRequest className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Workflows &amp; Approvals Engine
            </h1>
            <p className="text-xs text-muted-foreground">
              Team Leave Approvals &bull; Role-Based Scoping &bull; Mandatory Refusal Audit Trails
            </p>
          </div>
        </div>

        {session && (
          <div className="px-3.5 py-1.5 rounded-2xl bg-surface border border-border/80 flex items-center space-x-2 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">Approver Role:</span>
            <span className="font-bold text-foreground">{session.fullName}</span>
          </div>
        )}
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>PENDING APPROVALS</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-amber-400 font-mono">
            {pendingCount}
          </div>
          <div className="text-[11px] text-muted-foreground">Action required by your role</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>APPROVED REQUESTS</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
            {approvedCount}
          </div>
          <div className="text-[11px] text-muted-foreground">Synced to official attendance</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>REFUSED WITH NOTES</span>
            <Ban className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-3xl font-black tracking-tight text-destructive font-mono">
            {rejectedCount}
          </div>
          <div className="text-[11px] text-muted-foreground">Audit logged &amp; notified to staff</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>TOTAL SCOPED REQUESTS</span>
            <GitPullRequest className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            {instances.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Direct subordinates &amp; team requests</div>
        </div>
      </div>

      {/* ── FILTER & TAB BAR ── */}
      <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search request, requester or ID..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'ALL'
                ? 'bg-foreground/10 text-foreground font-extrabold'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            ALL ({instances.length})
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white font-black shadow-md shadow-amber-500/25'
                : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
            }`}
          >
            <span>PENDING</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/25 text-white">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/25'
                : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'
            }`}
          >
            <span>APPROVED</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/25 text-white">
              {approvedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 ${
              activeTab === 'REJECTED'
                ? 'bg-destructive text-white font-black shadow-md shadow-destructive/25'
                : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
            }`}
          >
            <span>REFUSED</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/25 text-white">
              {rejectedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 ml-2 border ${
              activeTab === 'HISTORY'
                ? 'bg-primary text-primary-foreground border-primary font-black shadow-md'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>AUDIT HISTORY LOGS</span>
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT (TABLE OR HISTORY LOGS) ── */}
      {activeTab === 'HISTORY' ? (
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center space-x-2.5">
              <History className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground">Workflow Decisions &amp; Audit Logs</h3>
                <p className="text-xs text-muted-foreground">
                  Complete chronological history of submissions, supervisor approvals, and refusals with justification notes
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{instances.length} Total Logs</span>
          </div>

          <div className="space-y-3">
            {instances.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No workflow requests or decision history found.
              </div>
            ) : (
              instances.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-surface/60 border border-border/70 hover:border-primary/40 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-foreground">{item.metadata.requesterName}</span>
                      <span className="font-mono text-muted-foreground text-[10px]">({item.metadata.employeeCode})</span>
                      <span className="text-muted-foreground">&bull;</span>
                      <span className="font-medium text-foreground">{item.metadata.leaveType}</span>
                      <span className="text-muted-foreground">&bull;</span>
                      <span className="font-mono text-muted-foreground">{item.metadata.totalDays} Day(s)</span>
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      Duration: {item.metadata.startDate} &rarr; {item.metadata.endDate} &bull; Dept:{' '}
                      {item.metadata.department}
                    </div>
                    {item.metadata.reason && (
                      <div className="text-muted-foreground italic text-[11px]">
                        Requester Reason: &ldquo;{item.metadata.reason}&rdquo;
                      </div>
                    )}
                    {item.metadata.rejectionReason && (
                      <div className="text-destructive font-bold text-[11px] bg-destructive/10 p-2 rounded-xl border border-destructive/20 mt-1">
                        Mandatory Refusal Note: &ldquo;{item.metadata.rejectionReason}&rdquo;
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0 space-y-1">
                    <div>{getStatusBadge(item.currentState)}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {item.metadata.approvedBy ? `Reviewed By: ${item.metadata.approvedBy}` : 'Pending Supervisor Action'}
                    </div>
                    <div className="text-[9px] font-mono text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <EnterpriseTable
          columns={columns}
          data={filteredInstances}
          keyField="id"
          title="Workflow &amp; Leave Requests"
          searchPlaceholder="Search request title, requester, department..."
          onRowClick={(item) => setSelectedInstance(item)}
          renderKanbanCard={(item) => (
            <div className="p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 transition shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{item.entityId}</span>
                {getStatusBadge(item.currentState)}
              </div>
              <h4 className="font-bold text-sm text-foreground line-clamp-2">{item.title}</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center space-x-1.5">
                  <User className="h-3 w-3 text-primary" />
                  <span>{item.metadata.requesterName || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{item.metadata.department || 'General'}</span>
                </div>
              </div>
            </div>
          )}
        />
      )}

      {/* ── APPROVAL DETAILS DRAWER / MODAL ── */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border/90 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs text-primary font-bold">{selectedInstance.entityId}</span>
                  {getStatusBadge(selectedInstance.currentState)}
                </div>
                <h3 className="font-black text-lg text-foreground">{selectedInstance.title}</h3>
              </div>
              <button
                onClick={() => setSelectedInstance(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface border border-border">
                <div>
                  <span className="text-muted-foreground">Requester:</span>
                  <div className="font-bold text-foreground">
                    {selectedInstance.metadata.requesterName || 'N/A'}{' '}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ({selectedInstance.metadata.employeeCode})
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Department / Team:</span>
                  <div className="font-bold text-foreground">
                    {selectedInstance.metadata.department || "Founder's Office"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Leave Dates:</span>
                  <div className="font-bold text-foreground">
                    {selectedInstance.metadata.startDate} &rarr; {selectedInstance.metadata.endDate}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Duration:</span>
                  <div className="font-bold text-primary font-mono">
                    {selectedInstance.metadata.totalDays} Day(s) ({selectedInstance.metadata.leaveType})
                  </div>
                </div>
                {/* 2-Column Grid Row for Applicant Reason (Left) & Attached Document (Right) */}
                <div>
                  <span className="text-muted-foreground">Applicant Reason:</span>
                  <div className="text-foreground mt-1 bg-card/70 p-2.5 rounded-xl border border-border italic text-[11px] min-h-[42px] flex items-center">
                    &ldquo;{selectedInstance.metadata.reason || 'General leave application'}&rdquo;
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Attached Document / Evidence:</span>
                    {selectedInstance.metadata.attachmentName && (
                      <span className="text-[10px] text-emerald-500 font-bold flex items-center space-x-1">
                        <Download className="h-3 w-3" />
                        <span>Click to download</span>
                      </span>
                    )}
                  </div>
                  {selectedInstance.metadata.attachmentName ? (
                    <button
                      type="button"
                      onClick={() =>
                        downloadAttachment(selectedInstance.metadata.attachmentName!, {
                          requesterName: selectedInstance.metadata.requesterName,
                          employeeCode: selectedInstance.metadata.employeeCode,
                          department: selectedInstance.metadata.department,
                          leaveType: selectedInstance.metadata.leaveType,
                          startDate: selectedInstance.metadata.startDate,
                          endDate: selectedInstance.metadata.endDate,
                          reason: selectedInstance.metadata.reason,
                          requestId: selectedInstance.id,
                        })
                      }
                      className="w-full mt-1 flex items-center justify-between space-x-2 p-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium min-h-[42px] transition group cursor-pointer shadow-sm text-left"
                      title={`Click to download "${selectedInstance.metadata.attachmentName}"`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Paperclip className="h-4 w-4 text-emerald-500 shrink-0 group-hover:scale-110 transition" />
                        <span className="font-bold truncate text-[11px] underline decoration-emerald-500/30 underline-offset-2">
                          {selectedInstance.metadata.attachmentName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-[9px] font-black uppercase tracking-wider">
                          Attached
                        </span>
                        <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition">
                          <Download className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="mt-1 flex items-center space-x-2 p-2 rounded-xl bg-card/40 border border-border/60 text-muted-foreground text-[11px] min-h-[42px]">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      <span className="italic">No document attached</span>
                    </div>
                  )}
                </div>

                {selectedInstance.metadata.rejectionReason && (
                  <div className="col-span-2 bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-destructive">
                    <span className="font-black uppercase tracking-wider text-[10px] block">
                      Refusal Reason / Justification:
                    </span>
                    <div className="mt-0.5 font-medium">&ldquo;{selectedInstance.metadata.rejectionReason}&rdquo;</div>
                  </div>
                )}
              </div>

              {/* Multi-Tier Approval Timeline */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                  Approval Timeline &amp; History
                </h4>

                <div className="space-y-2">
                  {selectedInstance.history.map((hist, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-surface/80 border border-border/80 flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-foreground capitalize">
                            {hist.action === 'submit' ? 'Submitted for Approval' : `Supervisor ${hist.action}`}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">by {hist.actorId}</span>
                        </div>
                        {hist.comment && <p className="text-muted-foreground italic">&ldquo;{hist.comment}&rdquo;</p>}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(hist.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Actions Toolbar (if pending) */}
              {selectedInstance.currentState === 'pending_approval' && (
                <div className="p-4 rounded-2xl bg-surface border border-primary/30 space-y-3">
                  <h4 className="font-bold text-xs text-foreground flex items-center space-x-1.5">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <span>Supervisor Decision for {selectedInstance.metadata.requesterName}</span>
                  </h4>

                  <p className="text-muted-foreground text-xs">
                    Approving will immediately grant the leave and update attendance logs. Refusing requires a mandatory
                    justification note sent back to the employee.
                  </p>

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      onClick={() => {
                        setRefusalModalInstance(selectedInstance);
                        setRefusalNote('');
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-xl bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive hover:text-white text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Refuse Leave</span>
                    </button>

                    <button
                      onClick={() => handleApprove(selectedInstance)}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center space-x-1.5 hover:bg-emerald-500 shadow-lg transition cursor-pointer disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Authorize &amp; Approve</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: MANDATORY REFUSAL NOTE ── */}
      {refusalModalInstance && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-destructive/40 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Refuse Leave Request</h3>
                  <p className="text-xs text-muted-foreground">
                    Mandatory refusal note required for employee decision notification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefusalModalInstance(null)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border text-xs space-y-1">
              <div className="font-extrabold text-foreground">
                {refusalModalInstance.metadata.requesterName} ({refusalModalInstance.metadata.employeeCode})
              </div>
              <div className="text-muted-foreground">
                {refusalModalInstance.metadata.leaveType} &bull; {refusalModalInstance.metadata.totalDays} Days (
                {refusalModalInstance.metadata.startDate} to {refusalModalInstance.metadata.endDate})
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-destructive flex items-center space-x-1">
                <span>Mandatory Refusal Note / Justification *</span>
              </label>
              <textarea
                rows={3}
                value={refusalNote}
                onChange={(e) => setRefusalNote(e.target.value)}
                placeholder="Explain the reason for refusing this leave application (this will be sent to the employee via email)..."
                className="w-full p-3 rounded-2xl bg-surface border border-destructive/30 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-destructive shadow-sm placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setRefusalModalInstance(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-surface transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRefusalSubmit}
                disabled={!refusalNote.trim() || isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-destructive text-white text-xs font-black uppercase tracking-wider hover:bg-destructive/90 transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Workflows...</div>}>
      <WorkflowsContent />
    </Suspense>
  );
}
