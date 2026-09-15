'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  ClipboardList,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import {
  FinanceAdvanceRequest,
  FinanceLiquidationForm,
  FinancePaymentVoucher,
  getFinanceAdvanceRequests,
  getFinanceLiquidations,
  getPaymentVouchers,
} from '@/lib/supabase-finance';
import { AdvanceRequestFormWindow } from '@/components/finance/advance-request-form-window';
import { LiquidationFormWindow } from '@/components/finance/liquidation-form-window';
import { PaymentVoucherModal } from '@/components/finance/payment-voucher-modal';

export default function FinanceOverviewPage() {
  const [advances, setAdvances] = useState<FinanceAdvanceRequest[]>([]);
  const [liquidations, setLiquidations] = useState<FinanceLiquidationForm[]>([]);
  const [vouchers, setVouchers] = useState<FinancePaymentVoucher[]>([]);

  // Modals
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<FinanceAdvanceRequest | null>(null);

  const [isLiquidationModalOpen, setIsLiquidationModalOpen] = useState(false);
  const [selectedLiquidation, setSelectedLiquidation] = useState<FinanceLiquidationForm | null>(null);

  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<FinancePaymentVoucher | null>(null);

  const loadAll = async () => {
    try {
      const [advList, liqList, vList] = await Promise.all([
        getFinanceAdvanceRequests(),
        getFinanceLiquidations(),
        getPaymentVouchers(),
      ]);
      setAdvances(advList);
      setLiquidations(liqList);
      setVouchers(vList);
    } catch (err) {
      console.warn('Failed to load finance overview:', err);
    }
  };

  useEffect(() => {
    loadAll();
    const handleUpdate = () => loadAll();
    window.addEventListener('jaago_finance_updated', handleUpdate);
    return () => {
      window.removeEventListener('jaago_finance_updated', handleUpdate);
    };
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalAdvances = advances.reduce((acc, a) => acc + (a.totalAmount || 0), 0);
    const totalLiquidated = liquidations.reduce((acc, l) => acc + (l.totalActualExpenses || 0), 0);
    const outstanding = Math.max(0, totalAdvances - totalLiquidated);
    const totalVouchersAmount = vouchers.reduce((acc, v) => acc + (v.amount || 0), 0);

    const pendingApprovals =
      advances.filter((a) => a.status === 'Submitted').length +
      liquidations.filter((l) => l.status === 'Submitted').length +
      vouchers.filter((v) => v.status === 'Pending Approval').length;

    return {
      totalAdvances,
      totalLiquidated,
      outstanding,
      totalVouchersAmount,
      pendingApprovals,
    };
  }, [advances, liquidations, vouchers]);

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200 text-foreground">
      {/* Advance Request Window */}
      <AdvanceRequestFormWindow
        isOpen={isAdvanceModalOpen}
        onClose={() => {
          setIsAdvanceModalOpen(false);
          setSelectedAdvance(null);
        }}
        onSaved={() => loadAll()}
        initialData={selectedAdvance}
      />

      {/* Liquidation Form Window */}
      <LiquidationFormWindow
        isOpen={isLiquidationModalOpen}
        onClose={() => {
          setIsLiquidationModalOpen(false);
          setSelectedLiquidation(null);
        }}
        onSaved={() => loadAll()}
        initialData={selectedLiquidation}
      />

      {/* Payment Voucher Modal */}
      <PaymentVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => {
          setIsVoucherModalOpen(false);
          setSelectedVoucher(null);
        }}
        onSaved={() => loadAll()}
        initialData={selectedVoucher}
      />

      {/* ── HEADER & QUICK ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center space-x-3 flex-wrap gap-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-foreground">
              Finance &amp; Accounting Overview
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Department Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground pt-1.5">
            Institutional cash flows, advance disbursements, expense audits, and accounts settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedAdvance(null);
              setIsAdvanceModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black transition flex items-center space-x-2 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>NEW ADVANCE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedLiquidation(null);
              setIsLiquidationModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-card border border-border/80 hover:border-amber-500/50 hover:bg-surface text-foreground text-xs font-black transition flex items-center space-x-2 shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>NEW LIQUIDATION</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedVoucher(null);
              setIsVoucherModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-card border border-border/80 hover:border-amber-500/50 hover:bg-surface text-foreground text-xs font-black transition flex items-center space-x-2 shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>NEW VOUCHER</span>
          </button>
        </div>
      </div>

      {/* ── EXECUTIVE KPI METRICS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4.5 rounded-2xl bg-card border border-border space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">
              Total Advances Disbursed
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ৳ {metrics.totalAdvances.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">{advances.length} requisitions approved</p>
        </div>

        <div className="p-4.5 rounded-2xl bg-card border border-border space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">
              Liquidated &amp; Audited
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ৳ {metrics.totalLiquidated.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">{liquidations.length} liquidations verified</p>
        </div>

        <div className="p-4.5 rounded-2xl bg-card border border-border space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">
              Net Outstanding Advances
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            ৳ {metrics.outstanding.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">Pending adjustment submissions</p>
        </div>

        <div className="p-4.5 rounded-2xl bg-card border border-border space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">
              Payment Vouchers Issued
            </span>
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground font-mono">
            ৳ {metrics.totalVouchersAmount.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">{vouchers.length} vendor &amp; staff vouchers</p>
        </div>
      </div>

      {/* ── TWO-COLUMN LOGS PREVIEWS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Advance Requests */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Recent Advance Requests
                </h2>
              </div>
              <Link
                href="/finance/expenses/advance-requests"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center space-x-1"
              >
                <span>View All Logs</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-border/60">
              {advances.slice(0, 4).map((adv) => (
                <div
                  key={adv.id}
                  onClick={() => {
                    setSelectedAdvance(adv);
                    setIsAdvanceModalOpen(true);
                  }}
                  className="p-3.5 hover:bg-muted/30 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black text-foreground">
                        {adv.expenseCode}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground truncate">
                        &bull; {adv.employeeName}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate max-w-sm mt-0.5">
                      {adv.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {adv.department} &bull; Required: {adv.cashRequiredDate}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black font-mono text-foreground">
                      ৳ {adv.totalAmount.toLocaleString()}
                    </div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        adv.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {adv.status}
                    </span>
                  </div>
                </div>
              ))}
              {advances.length === 0 && (
                <p className="p-6 text-center text-xs text-muted-foreground italic">
                  No advance requests logged yet.
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-muted/10 border-t border-border/60 text-right">
            <Link
              href="/finance/expenses/advance-requests"
              className="text-xs font-bold text-primary hover:underline"
            >
              Open Advance Request Form Logs &rarr;
            </Link>
          </div>
        </div>

        {/* Recent Liquidations */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center space-x-2">
                <ClipboardList className="h-4 w-4 text-emerald-500" />
                <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Recent Liquidations &amp; Settlements
                </h2>
              </div>
              <Link
                href="/finance/expenses/liquidations"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center space-x-1"
              >
                <span>View All Logs</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="divide-y divide-border/60">
              {liquidations.slice(0, 4).map((liq) => (
                <div
                  key={liq.id}
                  onClick={() => {
                    setSelectedLiquidation(liq);
                    setIsLiquidationModalOpen(true);
                  }}
                  className="p-3.5 hover:bg-muted/30 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black text-foreground">
                        {liq.liquidationCode}
                      </span>
                      {liq.linkedAdvanceCode && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          Ref: {liq.linkedAdvanceCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground truncate max-w-sm mt-0.5">
                      {liq.subject}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {liq.employeeName} &bull; Adjusted: {liq.dateOfActualAdjustment || liq.dateOfAdjustment}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black font-mono text-foreground">
                      ৳ {liq.totalActualExpenses.toLocaleString()}
                    </div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        liq.status === 'Settled'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {liq.status}
                    </span>
                  </div>
                </div>
              ))}
              {liquidations.length === 0 && (
                <p className="p-6 text-center text-xs text-muted-foreground italic">
                  No liquidations logged yet.
                </p>
              )}
            </div>
          </div>

          <div className="p-3 bg-muted/10 border-t border-border/60 text-right">
            <Link
              href="/finance/expenses/liquidations"
              className="text-xs font-bold text-primary hover:underline"
            >
              Open Liquidation Form Logs &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
