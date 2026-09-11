'use client';

import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, X } from 'lucide-react';
import { getProcurementUnits, saveProcurementUnit, ProcurementUnit } from '@/lib/supabase-procurement';

export default function UnitsPage() {
  const [units, setUnits] = useState<ProcurementUnit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Unit' | 'Weight' | 'Volume' | 'Length'>('Unit');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadUnits = async () => {
    try {
      const data = await getProcurementUnits();
      setUnits(data);
    } catch (err) {
      console.warn('Error loading units:', err);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    try {
      await saveProcurementUnit({
        code: code.trim(),
        name: name.trim(),
        category,
        baseUnit: true,
        status: 'Active',
      });
      await loadUnits();
      setIsModalOpen(false);
      setCode('');
      setName('');
      showToast(`Unit of measure ${code} created.`);
    } catch {
      showToast('Error saving unit.');
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
            Units of Measure (UOM)
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Standardized measurement units for procurement requisitions and inventory counting
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>ADD UNIT OF MEASURE</span>
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60">
          <h2 className="text-base font-black text-foreground">Configured Units</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">UOM CODE</th>
                <th className="py-3.5 px-4">NAME</th>
                <th className="py-3.5 px-4">TYPE</th>
                <th className="py-3.5 px-4 text-center">BASE UNIT</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-primary/5 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-extrabold text-foreground">{u.code}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">{u.name}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{u.category}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                    {u.baseUnit ? 'Yes' : 'No'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      • {u.status}
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
              <h2 className="text-base font-black text-foreground">Add Unit of Measure</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddUnit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Code (Symbol) *</label>
                <input type="text" required placeholder="e.g. PCS, BOX, LTR" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground uppercase" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Unit Name *</label>
                <input type="text" required placeholder="e.g. Pieces, Box, Liters" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Measurement Type</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground">
                  <option value="Unit">Unit (Discrete item count)</option>
                  <option value="Weight">Weight (Mass)</option>
                  <option value="Volume">Volume (Liquid / Gas)</option>
                  <option value="Length">Length (Distance)</option>
                </select>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md">Add Unit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
