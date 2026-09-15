'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  FileText,
  Plus,
  Search,
  RotateCw,
  Wallet,
  Clock,
  CheckCircle2,
  TrendingUp,
  Copy,
  Check,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  FinanceAdvanceRequest,
  getFinanceAdvanceRequests,
} from '@/lib/supabase-finance';
import { AdvanceRequestFormWindow } from '@/components/finance/advance-request-form-window';

function AdvanceRequestsLogsContent() {
  const [advances, setAdvances] = useState<FinanceAdvanceRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FinanceAdvanceRequest | null>(null);

  const loadData = async () => {
    try {
      const list = await getFinanceAdvanceRequests();
      setAdvances(list);
    } catch (err) {
      console.warn('Failed to load advance requests:', err);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('jaago_finance_updated', handleUpdate);
    return () => {
      window.removeEventListener('jaago_finance_updated', handleUpdate);
    };
  }, []);

  // Department list
  const departments = useMemo(() => {
    const set = new Set<string>();
    advances.forEach((a) => {
      if (a.department) set.add(a.department);
    });
    return Array.from(set);
  }, [advances]);

  // Filtered requests
  const filtered = useMemo(() => {
    return advances.filter((r) => {
      const matchSearch =
        r.expenseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.visitingPlace.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.project && r.project.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' || r.status.toLowerCase() === statusFilter.toLowerCase();
      const matchDept = deptFilter === 'ALL' || r.department === deptFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [advances, searchQuery, statusFilter, deptFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = advances.length;
    const submitted = advances.filter((r) => r.status === 'Submitted' || r.status === 'Reviewed').length;
    const approved = advances.filter((r) => r.status === 'Approved').length;
    const totalAmount = advances.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
    return { total, submitted, approved, totalAmount };
  }, [advances]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Settled':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{status}</span>
          </span>
        );
      case 'Submitted':
      case 'Reviewed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>{status}</span>
          </span>
        );
      case 'Draft':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted/80 text-muted-foreground border border-border shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            <span>{status || 'Draft'}</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200 text-foreground">
      {/* Advance Request Form Window */}
      <AdvanceRequestFormWindow
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
        onSaved={() => loadData()}
        initialData={selectedRequest}
      />

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-foreground">
              Advance Request Form Logs
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Institutional Ledger
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground pt-1.5">
            Organization-wide ledger of employee travel authorizations, program budget lines, and advance requisitions.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedRequest(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black transition flex items-center space-x-2 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>NEW ADVANCE REQUEST</span>
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground transition cursor-pointer hover:border-amber-500/50 hover:text-amber-500 shadow-sm"
            title="Refresh logs from Supabase"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── COMPACT AUTO-ADJUSTED METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-amber-500/40 transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Total Requisitions
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-foreground">
                  {metrics.total}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">total</span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
            All
          </span>
        </div>

        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-amber-500/40 transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Awaiting Review
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                  {metrics.submitted}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">pending</span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
            Action
          </span>
        </div>

        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-emerald-500/40 transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Approved
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                  {metrics.approved}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">approved</span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
            Cleared
          </span>
        </div>

        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-border transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-muted text-muted-foreground border border-border flex-shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Requisition Value
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-xs font-bold text-muted-foreground">৳</span>
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-foreground truncate">
                  {metrics.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-border flex-shrink-0">
            BDT
          </span>
        </div>
      </div>

      {/* ── TOOLBAR / FILTERS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-3 rounded-3xl border border-border/80 shadow-sm">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, employee, project, purpose..."
            className="w-full pl-10 pr-8 py-2 rounded-2xl bg-surface/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-surface/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-surface/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Approved">Approved</option>
            <option value="Settled">Settled</option>
          </select>
        </div>
      </div>

      {/* ── TABLE OF LOGS ── */}
      <div className="rounded-3xl bg-card border border-border/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-surface/60">
                <th className="py-4 px-5 w-44">EXPENSE CODE</th>
                <th className="py-4 px-5">EMPLOYEE</th>
                <th className="py-4 px-5">DEPARTMENT &amp; PROJECT</th>
                <th className="py-4 px-5">SUBJECT / PURPOSE</th>
                <th className="py-4 px-5 w-32">REQUIRED DATE</th>
                <th className="py-4 px-5 text-right w-36">AMOUNT (BDT)</th>
                <th className="py-4 px-5 text-center w-36">STATUS</th>
                <th className="py-4 px-5 text-right w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => {
                    setSelectedRequest(req);
                    setIsModalOpen(true);
                  }}
                  className="hover:bg-surface/60 transition cursor-pointer group"
                >
                  <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center space-x-1.5">
                      <span className="font-mono font-black text-xs text-foreground px-2 py-0.5 rounded-md bg-muted/60 border border-border">
                        {req.expenseCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(req.expenseCode);
                          setCopiedCode(req.expenseCode);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition cursor-pointer"
                        title="Copy Expense Code"
                      >
                        {copiedCode === req.expenseCode ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <p className="font-bold text-foreground">{req.employeeName}</p>
                    <p className="text-[10px] text-muted-foreground">{req.employeeDesignation}</p>
                  </td>
                  <td className="py-4 px-5">
                    <p className="font-bold text-foreground">{req.department}</p>
                    <p className="text-[10px] text-muted-foreground">{req.project}</p>
                  </td>
                  <td className="py-4 px-5 max-w-xs truncate text-foreground font-medium">
                    {req.title}
                  </td>
                  <td className="py-4 px-5 text-muted-foreground font-medium">
                    {req.cashRequiredDate || req.requestDate}
                  </td>
                  <td className="py-4 px-5 text-right font-mono font-black text-xs sm:text-sm text-foreground">
                    <span className="text-[11px] text-muted-foreground font-bold mr-0.5">৳</span>
                    {req.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-4 px-5 text-center">{getStatusBadge(req.status)}</td>
                  <td className="py-4 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(req);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-surface hover:bg-amber-500 hover:text-white border border-border/70 hover:border-amber-500 text-xs font-black transition-all duration-150 inline-flex items-center space-x-1 shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>Review</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 rounded-3xl bg-muted/50 border border-border">
                        <FileText className="h-8 w-8 text-muted-foreground/60" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">No advance requests found</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Try clearing search filters or click &ldquo;New Advance Request&rdquo;.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filtered.length > 0 && (
          <div className="p-4 px-5 bg-surface/40 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-semibold text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{filtered.length}</strong> of{' '}
              <strong className="text-foreground">{advances.length}</strong> advance requisitions
            </span>
            <div className="flex items-center space-x-2">
              <span>Total Filtered Amount:</span>
              <span className="font-mono font-black text-foreground text-sm">
                ৳ {filtered.reduce((acc, c) => acc + c.totalAmount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdvanceRequestsLogsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading advance request logs...</div>}>
      <AdvanceRequestsLogsContent />
    </Suspense>
  );
}

