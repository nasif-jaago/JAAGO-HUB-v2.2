'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { EnterpriseTable, ColumnDef } from '@jaago/ui';

interface WorkflowInstance {
  id: string;
  definitionKey: string;
  title: string;
  entityType: string;
  entityId: string;
  requesterId: string;
  currentState: string;
  currentTier: number;
  totalTiers: number;
  metadata: {
    requesterName?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    amount?: string;
    vendor?: string;
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

export default function WorkflowsPage() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/workflows', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.data) {
        setInstances(data.data);
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
    }
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedInstance) return;
    setIsSubmitting(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action,
          instanceId: selectedInstance.id,
          comment: approvalComment,
        }),
      });

      const updated = await res.json();
      if (updated.data) {
        setSelectedInstance(updated.data);
        await loadWorkflows();
        setApprovalComment('');
      }
    } catch (err) {
      console.error('Failed to execute workflow action:', err);
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
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-destructive/15 text-destructive border border-destructive/30">
            Rejected
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

  const columns: ColumnDef<WorkflowInstance>[] = [
    {
      key: 'title',
      header: 'Workflow Request',
      accessor: (row) => (
        <div>
          <div className="font-bold text-foreground hover:text-primary transition">{row.title}</div>
          <div className="text-[10px] text-muted-foreground flex items-center space-x-2">
            <span>ID: {row.entityId}</span>
            <span>&bull;</span>
            <span className="capitalize">{row.definitionKey.replace(/_/g, ' ')}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'requesterName',
      header: 'Requester / Dept',
      accessor: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.metadata.requesterName || 'N/A'}</div>
          <div className="text-[10px] text-muted-foreground">{row.metadata.department || 'Head Office'}</div>
        </div>
      ),
    },
    {
      key: 'currentTier',
      header: 'Tier Progress',
      accessor: (row) => (
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {Array.from({ length: row.totalTiers }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-5 rounded-full ${
                  idx + 1 < row.currentTier || row.currentState === 'approved'
                    ? 'bg-primary'
                    : idx + 1 === row.currentTier && row.currentState === 'pending_approval'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-surface border border-border'
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            Tier {row.currentTier}/{row.totalTiers}
          </span>
        </div>
      ),
    },
    {
      key: 'currentState',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.currentState),
    },
    {
      key: 'createdAt',
      header: 'Submitted',
      accessor: (row) => (
        <span className="font-mono text-muted-foreground text-[11px]">
          {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground">
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
              Multi-Tier Approval Chains &bull; State-Machine Engine &bull; Tamper-Evident Hash Audit
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>PENDING APPROVALS</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-amber-400 font-mono">
            {instances.filter((i) => i.currentState === 'pending_approval').length}
          </div>
          <div className="text-[11px] text-muted-foreground">Action required by your role</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>APPROVED THIS MONTH</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
            18
          </div>
          <div className="text-[11px] text-muted-foreground">100% SLA Compliance</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>AVG TURNAROUND TIME</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            1.4 <span className="text-sm font-semibold text-muted-foreground">Days</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Across all 3 approval tiers</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>ACTIVE WORKFLOWS</span>
            <GitPullRequest className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            {instances.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Leave, requisitions &amp; grants</div>
        </div>
      </div>

      {/* ── ENTERPRISE TABLE ── */}
      <EnterpriseTable
        columns={columns}
        data={instances}
        keyField="id"
        title="Pending &amp; Completed Approvals"
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

      {/* ── APPROVAL DETAILS DRAWER / MODAL ── */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
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
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition"
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
                  <div className="font-bold text-foreground">{selectedInstance.metadata.requesterName || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <div className="font-bold text-foreground">{selectedInstance.metadata.department || 'N/A'}</div>
                </div>
                {selectedInstance.metadata.startDate && (
                  <div>
                    <span className="text-muted-foreground">Dates:</span>
                    <div className="font-bold text-foreground">
                      {selectedInstance.metadata.startDate} &rarr; {selectedInstance.metadata.endDate}
                    </div>
                  </div>
                )}
                {selectedInstance.metadata.amount && (
                  <div>
                    <span className="text-muted-foreground">Requisition Amount:</span>
                    <div className="font-bold text-primary font-mono">{selectedInstance.metadata.amount}</div>
                  </div>
                )}
                {selectedInstance.metadata.reason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Purpose / Reason:</span>
                    <div className="text-foreground mt-0.5">{selectedInstance.metadata.reason}</div>
                  </div>
                )}
              </div>

              {/* Multi-Tier Approval Timeline */}
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-muted-foreground">
                  Multi-Tier Approval Timeline
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
                            {hist.action === 'submit' ? 'Submitted for Approval' : `Tier ${hist.tier} ${hist.action}`}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">by {hist.actorId}</span>
                        </div>
                        {hist.comment && <p className="text-muted-foreground italic">&ldquo;{hist.comment}&rdquo;</p>}
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(hist.timestamp).toLocaleTimeString('en-US', { hour12: false })}
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
                    <span>Authorize Tier {selectedInstance.currentTier} of {selectedInstance.totalTiers}</span>
                  </h4>

                  <input
                    type="text"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Add approval comment or recommendation note..."
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleAction('approve')}
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs flex items-center space-x-1.5 hover:bg-primary/90 shadow-lg transition disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Authorize &amp; Advance</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
