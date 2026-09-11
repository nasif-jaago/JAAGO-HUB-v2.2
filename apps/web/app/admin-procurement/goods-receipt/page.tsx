'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  getGoodsReceipts,
  saveGoodsReceipt,
  GoodsReceipt,
} from '@/lib/supabase-procurement';

export default function GoodsReceiptPage() {
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [poNumber, setPoNumber] = useState('PO-2026-0142');
  const [vendorName, setVendorName] = useState('Rangs Technologies');
  const [warehouse, setWarehouse] = useState('Banani Central Depot');
  const [condition, setCondition] = useState<GoodsReceipt['conditionStatus']>('Inspected & Passed');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadGRNs = async () => {
    try {
      const data = await getGoodsReceipts();
      setGrns(data);
    } catch (err) {
      console.warn('Error loading GRNs:', err);
    }
  };

  useEffect(() => {
    loadGRNs();
  }, []);

  const handleRecordGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveGoodsReceipt({
        poNumber,
        vendorName,
        receivedByName: 'Nasif Kamal',
        warehouse,
        conditionStatus: condition,
        remarks,
      });

      await loadGRNs();
      setIsModalOpen(false);
      setRemarks('');
      showToast(`Goods Receipt Note issued for ${poNumber}.`);
    } catch {
      showToast('Error recording GRN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F5C200] text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Goods Receipt (GRN)
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Warehouse physical receiving logs, quality inspection, and PO delivery signoffs
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>RECORD GOODS RECEIPT</span>
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">GRN Logs</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">GRN NO.</th>
                <th className="py-3.5 px-4">PO REF</th>
                <th className="py-3.5 px-4">SUPPLIER</th>
                <th className="py-3.5 px-4">DATE RECEIVED</th>
                <th className="py-3.5 px-4">RECEIVED BY</th>
                <th className="py-3.5 px-4">WAREHOUSE</th>
                <th className="py-3.5 px-4 text-center">QC STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {grns.map((grn) => (
                <tr key={grn.id} className="hover:bg-primary/5 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-extrabold text-foreground">{grn.grnNumber}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">{grn.poNumber}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{grn.vendorName}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{grn.receivedDate}</td>
                  <td className="py-3.5 px-4 font-semibold text-foreground">{grn.receivedByName}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{grn.warehouse}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      • {grn.conditionStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <h2 className="text-base font-black text-foreground">Record Goods Receipt Note</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordGRN} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">PO Reference *</label>
                <input
                  type="text"
                  required
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Warehouse Location</label>
                <select
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                >
                  <option value="Banani Central Depot">Banani Central Depot</option>
                  <option value="Chittagong Hub Store">Chittagong Hub Store</option>
                  <option value="Rangunia School Depot">Rangunia School Depot</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Quality Inspection Status</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                >
                  <option value="Inspected & Passed">Inspected &amp; Passed</option>
                  <option value="Partial Delivery">Partial Delivery</option>
                  <option value="Damaged / Rejected">Damaged / Rejected</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Receiving Remarks / Notes</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md"
                >
                  {isSubmitting ? 'Recording...' : 'Record GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
