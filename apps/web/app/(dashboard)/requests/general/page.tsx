'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ClipboardList,
  Plus,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import {
  ProcurementRequest,
  getProcurementRequests,
} from '@/lib/supabase-procurement';
import { RequisitionFormWindow } from '@/components/requisition-form-window';

function GeneralRequisitionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');
  const targetPr = searchParams.get('pr');
  const queryStep = searchParams.get('step');
  const approverContext = searchParams.get('approver') || undefined;
  const stepNumberContext = queryStep ? parseInt(queryStep, 10) : undefined;

  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal / Window State
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ProcurementRequest | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const all = await getProcurementRequests();
      const filtered = all.filter((r) => r.requisitionType === 'General');
      setRequests(filtered);

      // Auto-open target requisition if redirected from approval notification email
      if (targetId || targetPr) {
        const directMatch = all.find(
          (r) =>
            (targetId && String(r.id) === String(targetId)) ||
            (targetPr && r.prNumber.toLowerCase() === targetPr.toLowerCase())
        );
        if (directMatch) {
          setSelectedRequest(directMatch);
          setIsWindowOpen(true);
        }
      }
    } catch (err) {
      console.warn('Failed to load general requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    const handleUpdate = () => loadRequests();
    window.addEventListener('jaago_procurement_updated', handleUpdate);
    return () => {
      window.removeEventListener('jaago_procurement_updated', handleUpdate);
    };
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        r.prNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.requestOwner.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        r.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = requests.length;
    const submitted = requests.filter(
      (r) => r.status === 'Submitted' || r.status === 'Under Review'
    ).length;
    const approved = requests.filter((r) => r.status === 'Approved').length;
    const totalValue = requests.reduce((acc, r) => acc + (r.estAmount || 0), 0);
    return { total, submitted, approved, totalValue };
  }, [requests]);

  const handleOpenNewRequisition = () => {
    router.push('/requests/general/new');
  };

  const handleOpenExisting = (req: ProcurementRequest) => {
    setSelectedRequest(req);
    setIsWindowOpen(true);
  };

  const getStatusBadge = (status: ProcurementRequest['status']) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Approved
          </span>
        );
      case 'Submitted':
      case 'Under Review':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {status}
          </span>
        );
      case 'Refused':
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {status}
          </span>
        );
      case 'Draft':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground border border-border">
            {status || 'Draft'}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-foreground">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. TOP HEADER & BREADCRUMBS WITH TOP-LEFT NEW REQUISITION BUTTON     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-muted-foreground">
            <Link href="/dashboard" className="hover:text-primary transition">
              Dashboards
            </Link>
            <span>&gt;</span>
            <Link href="/dashboard" className="hover:text-primary transition">
              My Dashboard
            </Link>
            <span>&gt;</span>
            <span className="text-foreground">General Requisitions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground mt-1">
            General Requisition Log
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Internal requisitions, operations equipment, and cross-departmental supply requests. Connected with Admin Procurement.
          </p>
        </div>

        {/* Top-Right action links */}
        <div className="flex items-center space-x-2">
          <Link
            href="/admin-procurement/general-requisitions"
            target="_blank"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition flex items-center space-x-1.5"
            title="Open Admin Procurement module"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Admin Procurement</span>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. TOP ACTION BAR: PROMINENT TOP-LEFT "NEW REQUISITION" BUTTON       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Top-Left: New Requisition Button */}
        <button
          onClick={handleOpenNewRequisition}
          className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition flex items-center space-x-2 cursor-pointer group"
          title="Create New General Requisition"
        >
          <Plus className="h-4 w-4 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
          <span>NEW REQUISITION</span>
        </button>

        {/* Search & Status Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search GR No, title, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-xl text-xs font-medium bg-card border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary w-56 sm:w-64"
            />
          </div>

          <div className="flex items-center space-x-1 bg-card border border-border p-1 rounded-xl text-xs">
            {['ALL', 'SUBMITTED', 'APPROVED', 'REFUSED', 'DRAFT'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10.5px] uppercase transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. METRIC CARDS                                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Total GRs
            </span>
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground mt-2">
            {metrics.total}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Common Requisitions Store
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Pending Approval
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500 mt-2">
            {metrics.submitted}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Awaiting Verification
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Approved
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.approved}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Passed Tier Verification
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-black uppercase tracking-wider">
              Est. Total Value
            </span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground font-mono mt-2 truncate">
            ৳ {metrics.totalValue.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Fiscal Year 2025–26
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. GENERAL REQUISITION REGISTER / LOG TABLE                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-border bg-card/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
              General Requisitions (GR) Log
            </h2>
          </div>
          <span className="text-[10.5px] font-bold text-muted-foreground">
            Showing {filteredRequests.length} of {requests.length} records
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Loading general requisitions from Supabase...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-3">
            <ClipboardList className="h-10 w-10 text-muted-foreground/60" />
            <div className="text-sm font-bold text-foreground">
              No general requisitions found
            </div>
            <p className="text-xs text-muted-foreground max-w-sm">
              Click the &quot;NEW REQUISITION&quot; button above to create and submit your first general requisition.
            </p>
            <button
              onClick={handleOpenNewRequisition}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition cursor-pointer"
            >
              + Create Requisition Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                  <th className="py-3 px-4">GR REFERENCE</th>
                  <th className="py-3 px-4 min-w-[200px]">SUBJECT / TITLE</th>
                  <th className="py-3 px-4">DEPARTMENT</th>
                  <th className="py-3 px-4">REQUEST OWNER</th>
                  <th className="py-3 px-4">REQUIRED DATE</th>
                  <th className="py-3 px-4 text-right">EST. AMOUNT (৳)</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => handleOpenExisting(req)}
                    className="hover:bg-muted/20 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      {req.prNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">
                      {req.title}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground truncate">
                      {req.department}
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-medium truncate">
                      {req.requestOwner}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                      {req.requiredDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                      ৳ {(req.estAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenExisting(req);
                        }}
                        className="p-1.5 rounded-lg bg-background hover:bg-muted border border-border text-foreground transition cursor-pointer"
                        title="View Requisition Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. FULL REQUISITION WINDOW MODAL                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <RequisitionFormWindow
        requisitionType="General"
        initialData={selectedRequest}
        isOpen={isWindowOpen}
        onClose={() => setIsWindowOpen(false)}
        onSaved={() => {
          loadRequests();
        }}
        initialOpenApprovalModal={false}
        approverContext={approverContext}
        stepNumberContext={stepNumberContext}
      />
    </div>
  );
}

export default function GeneralRequisitionLogPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-muted-foreground">
          Loading General Requisitions...
        </div>
      }
    >
      <GeneralRequisitionContent />
    </Suspense>
  );
}
