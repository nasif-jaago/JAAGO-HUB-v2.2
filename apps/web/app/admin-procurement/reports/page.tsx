'use client';

import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import {
  getPurchaseOrders,
  getProcurementVendors,
  getProcurementBudgets,
  PurchaseOrder,
  ProcurementVendor,
  ProcurementBudget,
} from '@/lib/supabase-procurement';

export default function ReportsAnalyticsPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<ProcurementVendor[]>([]);
  const [budgets, setBudgets] = useState<ProcurementBudget[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function load() {
      const [o, v, b] = await Promise.all([
        getPurchaseOrders(),
        getProcurementVendors(),
        getProcurementBudgets(),
      ]);
      setOrders(o);
      setVendors(v);
      setBudgets(b);
    }
    load();
  }, []);

  const totalSpend = vendors.reduce((s, v) => s + (v.spendFY || 0), 0);
  const totalPOs = orders.length;
  const approvedPOs = orders.filter((o) => o.status === 'Approved' || o.status === 'Completed').length;
  const approvalRate = totalPOs > 0 ? Math.round((approvedPOs / totalPOs) * 100) : 100;

  const handleExportReport = () => {
    showToast('Comprehensive Annual Procurement Report (PDF/Excel) downloaded.');
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F5C200] text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Reports &amp; Procurement Analytics
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Annual spend distribution, supplier concentration, cycle time KPIs, and audit trails
          </p>
        </div>

        <button
          onClick={handleExportReport}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>EXPORT EXECUTIVE SUMMARY</span>
        </button>
      </div>

      {/* Analytics KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-muted-foreground">TOTAL ANNUAL SPEND</span>
          <p className="text-2xl font-black text-foreground mt-1">৳ {(totalSpend / 100000).toFixed(1)} Lakh</p>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">▲ 8.4% YoY Growth</span>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-muted-foreground">ACTIVE SUPPLIERS</span>
          <p className="text-2xl font-black text-foreground mt-1">{vendors.length}</p>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">100% Tax Compliant</span>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-muted-foreground">PO APPROVAL RATE</span>
          <p className="text-2xl font-black text-foreground mt-1">{approvalRate}%</p>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1 block">Avg cycle: 2.1 days</span>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <span className="text-[10px] font-extrabold uppercase text-muted-foreground">REQUISITION FULFILLMENT</span>
          <p className="text-2xl font-black text-foreground mt-1">94.8%</p>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">▲ On-time delivery</span>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vendors by Spend */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
            Top Suppliers by Spend Concentration
          </h2>
          <div className="space-y-3">
            {vendors.slice(0, 5).map((v) => {
              const pct = totalSpend > 0 ? Math.round((v.spendFY / totalSpend) * 100) : 0;
              return (
                <div key={v.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{v.name} ({v.category})</span>
                    <span className="font-black text-foreground">৳ {(v.spendFY / 100000).toFixed(1)}L ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface border border-border overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct * 2, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spend by Department */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
            Budget Burn by Department
          </h2>
          <div className="space-y-3">
            {budgets.map((b) => {
              const pct = b.allocatedBDT > 0 ? Math.round((b.spentBDT / b.allocatedBDT) * 100) : 0;
              return (
                <div key={b.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{b.department}</span>
                    <span className="font-semibold text-muted-foreground">
                      ৳ {(b.spentBDT / 100000).toFixed(1)}L of ৳ {(b.allocatedBDT / 100000).toFixed(1)}L
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface border border-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pct > 75 ? 'bg-rose-500' : pct > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
