'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  FileCheck,
  Plus,
  Search,
  RotateCw,
  Receipt,
  CheckCircle2,
  Clock,
  TrendingUp,
  Copy,
  Check,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  FinanceLiquidationForm,
  getFinanceLiquidations,
} from '@/lib/supabase-finance';
import { LiquidationFormWindow } from '@/components/finance/liquidation-form-window';

function LiquidationLogsContent() {
  const [liquidations, setLiquidations] = useState<FinanceLiquidationForm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLiquidation, setSelectedLiquidation] = useState<FinanceLiquidationForm | null>(null);

  const loadData = async () => {
    try {
      const list = await getFinanceLiquidations();
      setLiquidations(list);
    } catch (err) {
      console.warn('Failed to load liquidations:', err);
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

  // Filtered liquidations
  const filtered = useMemo(() => {
    return liquidations.filter((l) => {
      const matchSearch =
        l.liquidationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.linkedAdvanceCode && l.linkedAdvanceCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        l.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.project && l.project.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' || l.status.toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [liquidations, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = liquidations.length;
    const settled = liquidations.filter((l) => l.status === 'Settled' || l.status === 'Approved').length;
    const pendingAudit = liquidations.filter((l) => l.status === 'Submitted' || l.status === 'Reviewed').length;
    const totalActualSpent = liquidations.reduce((acc, l) => acc + (l.totalActualExpenses || 0), 0);
    return { total, settled, pendingAudit, totalActualSpent };
  }, [liquidations]);

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
      {/* Liquidation Form Window */}
      <LiquidationFormWindow
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLiquidation(null);
        }}
        onSaved={() => loadData()}
        initialData={selectedLiquidation}
      />

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-foreground">
              Liquidation Form Logs
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Audit &amp; Settlement
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground pt-1.5">
            Reconcile actual travel expenditures against issued advances and settle reimbursements or surplus refunds.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedLiquidation(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black transition flex items-center space-x-2 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>NEW LIQUIDATION FORM</span>
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground transition cursor-pointer hover:border-emerald-500/50 hover:text-emerald-500 shadow-sm"
            title="Refresh logs from Supabase"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── COMPACT AUTO-ADJUSTED METRICS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-emerald-500/40 transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Total Liquidations
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-foreground">
                  {metrics.total}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">forms</span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
            All
          </span>
        </div>

        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-emerald-500/40 transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Audited &amp; Settled
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                  {metrics.settled}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">settled</span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
            Cleared
          </span>
        </div>

        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-amber-500/40 transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Pending Audit
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                  {metrics.pendingAudit}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">pending</span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
            Review
          </span>
        </div>

        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-border transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-muted text-muted-foreground border border-border flex-shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Verified Spent
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-xs font-bold text-muted-foreground">৳</span>
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-foreground truncate">
                  {metrics.totalActualSpent.toLocaleString()}
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
            placeholder="Search code, linked advance, employee, subject..."
            className="w-full pl-10 pr-8 py-2 rounded-2xl bg-surface/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
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

        <div className="flex items-center space-x-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-2xl bg-surface/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs cursor-pointer"
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
                <th className="py-4 px-5 w-44">LIQUIDATION CODE</th>
                <th className="py-4 px-5 w-40">LINKED ADVANCE</th>
                <th className="py-4 px-5">EMPLOYEE</th>
                <th className="py-4 px-5">SUBJECT</th>
                <th className="py-4 px-5 text-right w-32">ADVANCE TAKEN</th>
                <th className="py-4 px-5 text-right w-32">ACTUAL SPENT</th>
                <th className="py-4 px-5 text-right w-44">SETTLEMENT BALANCE</th>
                <th className="py-4 px-5 text-center w-36">STATUS</th>
                <th className="py-4 px-5 text-right w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.map((liq) => (
                <tr
                  key={liq.id}
                  onClick={() => {
                    setSelectedLiquidation(liq);
                    setIsModalOpen(true);
                  }}
                  className="hover:bg-surface/60 transition cursor-pointer group"
                >
                  <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center space-x-1.5">
                      <span className="font-mono font-black text-xs text-foreground px-2 py-0.5 rounded-md bg-muted/60 border border-border">
                        {liq.liquidationCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(liq.liquidationCode);
                          setCopiedCode(liq.liquidationCode);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-emerald-500 transition cursor-pointer"
                        title="Copy Liquidation Code"
                      >
                        {copiedCode === liq.liquidationCode ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                    {liq.linkedAdvanceCode ? (
                      <div className="inline-flex items-center space-x-1">
                        <span className="font-mono text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                          {liq.linkedAdvanceCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (liq.linkedAdvanceCode) {
                              navigator.clipboard.writeText(liq.linkedAdvanceCode);
                              setCopiedCode(liq.linkedAdvanceCode);
                              setTimeout(() => setCopiedCode(null), 2000);
                            }
                          }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition cursor-pointer"
                          title="Copy Advance Code"
                        >
                          {copiedCode === liq.linkedAdvanceCode ? (
                            <Check className="h-3 w-3 text-emerald-500 stroke-[3]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Direct Claim</span>
                    )}
                  </td>

                  <td className="py-4 px-5">
                    <p className="font-bold text-foreground">{liq.employeeName}</p>
                    <p className="text-[10px] text-muted-foreground">{liq.department}</p>
                  </td>

                  <td className="py-4 px-5 max-w-xs truncate text-foreground font-medium">
                    {liq.subject}
                  </td>

                  <td className="py-4 px-5 text-right font-mono text-muted-foreground">
                    ৳ {liq.advanceAmountTaken.toLocaleString()}
                  </td>

                  <td className="py-4 px-5 text-right font-mono font-black text-foreground">
                    ৳ {liq.totalActualExpenses.toLocaleString()}
                  </td>

                  <td className="py-4 px-5 text-right font-mono font-black">
                    {liq.variance > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        +৳ {Math.abs(liq.variance).toLocaleString()} (Due)
                      </span>
                    ) : liq.variance < 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                        -৳ {Math.abs(liq.variance).toLocaleString()} (Refund)
                      </span>
                    ) : (
                      <span className="text-muted-foreground">৳ 0.00</span>
                    )}
                  </td>

                  <td className="py-4 px-5 text-center">{getStatusBadge(liq.status)}</td>

                  <td className="py-4 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLiquidation(liq);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-surface hover:bg-emerald-600 hover:text-white border border-border/70 hover:border-emerald-600 text-xs font-black transition-all duration-150 inline-flex items-center space-x-1 shadow-xs cursor-pointer active:scale-95"
                    >
                      <span>Audit</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 rounded-3xl bg-muted/50 border border-border">
                        <FileCheck className="h-8 w-8 text-muted-foreground/60" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">No liquidation records found</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Click &ldquo;New Liquidation Form&rdquo; to reconcile travel expenses.
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
              <strong className="text-foreground">{liquidations.length}</strong> liquidations
            </span>
            <div className="flex items-center space-x-2">
              <span>Total Actual Spent:</span>
              <span className="font-mono font-black text-foreground text-sm">
                ৳ {filtered.reduce((acc, c) => acc + c.totalActualExpenses, 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiquidationLogsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading liquidation logs...</div>}>
      <LiquidationLogsContent />
    </Suspense>
  );
}
