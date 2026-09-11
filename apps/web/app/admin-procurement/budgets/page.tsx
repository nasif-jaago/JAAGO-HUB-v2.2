'use client';

import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, X } from 'lucide-react';
import { getProcurementBudgets, saveProcurementBudget, ProcurementBudget } from '@/lib/supabase-procurement';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<ProcurementBudget[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dept, setDept] = useState('Digital School Project');
  const [allocated, setAllocated] = useState('2000000');
  const [notes, setNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadBudgets = async () => {
    try {
      const data = await getProcurementBudgets();
      setBudgets(data);
    } catch (err) {
      console.warn('Error loading budgets:', err);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveProcurementBudget({
        fiscalYear: '2025-26',
        department: dept,
        allocatedBDT: Number(allocated) || 0,
        spentBDT: 0,
        committedBDT: 0,
        notes,
      });
      await loadBudgets();
      setIsModalOpen(false);
      showToast(`Budget allocated for ${dept}.`);
    } catch {
      showToast('Error allocating budget.');
    }
  };

  const totalAllocated = budgets.reduce((s, b) => s + (b.allocatedBDT || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spentBDT || 0), 0);

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
            Budget &amp; Approvals
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Fiscal Year 2025-26 departmental spending caps, committed funds, and variance tracking
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>ALLOCATE BUDGET</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">TOTAL ALLOCATED CAPEX</span>
          <p className="text-2xl font-black text-foreground mt-1">৳ {(totalAllocated / 100000).toFixed(1)}L</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">EXPENDITURE COMMITTED</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">৳ {(totalSpent / 100000).toFixed(1)}L</p>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">REMAINING UNCOMMITTED</span>
          <p className="text-2xl font-black text-foreground mt-1">৳ {((totalAllocated - totalSpent) / 100000).toFixed(1)}L</p>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60">
          <h2 className="text-base font-black text-foreground">Departmental Allocation Matrix</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">DEPARTMENT</th>
                <th className="py-3.5 px-4 text-right">ALLOCATED (BDT)</th>
                <th className="py-3.5 px-4 text-right">SPENT (BDT)</th>
                <th className="py-3.5 px-4 text-right">COMMITTED (BDT)</th>
                <th className="py-3.5 px-4 text-right">AVAILABLE (BDT)</th>
                <th className="py-3.5 px-4">UTILIZATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {budgets.map((b) => {
                const pct = b.allocatedBDT > 0 ? Math.round(((b.spentBDT + b.committedBDT) / b.allocatedBDT) * 100) : 0;
                return (
                  <tr key={b.id} className="hover:bg-primary/5 transition">
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-foreground">{b.department}</td>
                    <td className="py-3.5 px-4 text-right text-muted-foreground">৳ {b.allocatedBDT.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-foreground">৳ {b.spentBDT.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right text-muted-foreground">৳ {b.committedBDT.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-black text-foreground">৳ {b.remainingBDT.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 rounded-full bg-surface border border-border overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct > 80 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <h2 className="text-base font-black text-foreground">Allocate Department Budget</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAllocate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Department *</label>
                <input type="text" required value={dept} onChange={(e) => setDept(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Annual Allocated Amount (BDT) *</label>
                <input type="number" required value={allocated} onChange={(e) => setAllocated(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Grant / Donor Reference Notes</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none resize-none" />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md">Confirm Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
