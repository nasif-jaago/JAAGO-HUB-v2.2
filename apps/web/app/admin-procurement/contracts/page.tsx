'use client';

import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, X } from 'lucide-react';
import { getProcurementContracts, saveProcurementContract, ProcurementContract } from '@/lib/supabase-procurement';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ProcurementContract[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [valueBDT, setValueBDT] = useState('500000');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadContracts = async () => {
    try {
      const data = await getProcurementContracts();
      setContracts(data);
    } catch (err) {
      console.warn('Error loading contracts:', err);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !vendorName.trim()) return;

    try {
      await saveProcurementContract({
        title: title.trim(),
        vendorName: vendorName.trim(),
        valueBDT: Number(valueBDT) || 0,
        startDate: startDate || new Date().toISOString().split('T')[0]!,
        endDate: endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]!,
        renewalNoticeDays: 30,
        status: 'Active',
      });
      await loadContracts();
      setIsModalOpen(false);
      setTitle('');
      setVendorName('');
      showToast(`Supplier contract "${title}" registered.`);
    } catch {
      showToast('Error saving contract.');
    }
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
            Supplier &amp; Service Contracts
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Annual Maintenance Contracts (AMC), service agreements, SLAs, and renewal notifications
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>NEW CONTRACT</span>
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60">
          <h2 className="text-base font-black text-foreground">Contracts Register</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">CONTRACT NO.</th>
                <th className="py-3.5 px-4">AGREEMENT TITLE</th>
                <th className="py-3.5 px-4">SUPPLIER / VENDOR</th>
                <th className="py-3.5 px-4 text-right">VALUE (BDT)</th>
                <th className="py-3.5 px-4">START DATE</th>
                <th className="py-3.5 px-4">EXPIRY DATE</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {contracts.map((cnt) => (
                <tr key={cnt.id} className="hover:bg-primary/5 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-extrabold text-foreground">{cnt.contractNumber}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">{cnt.title}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{cnt.vendorName}</td>
                  <td className="py-3.5 px-4 text-right font-black text-foreground">
                    ৳ {cnt.valueBDT.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">{cnt.startDate}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{cnt.endDate}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      • {cnt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <h2 className="text-base font-black text-foreground">Record Supplier Contract</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateContract} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Contract Title *</label>
                <input type="text" required placeholder="e.g. Nationwide Biometrics AMC" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Vendor / Contractor *</label>
                <input type="text" required placeholder="e.g. ZKTeco BD Ltd." value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Total Contract Value (BDT)</label>
                <input type="number" value={valueBDT} onChange={(e) => setValueBDT(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Expiry Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md">Register Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
