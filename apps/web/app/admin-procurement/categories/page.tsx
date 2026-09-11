'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  getProcurementCategories,
  saveProcurementCategory,
  ProcurementCategory,
} from '@/lib/supabase-procurement';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProcurementCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'Goods' | 'Services' | 'Works'>('Goods');
  const [description, setDescription] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadCategories = async () => {
    try {
      const data = await getProcurementCategories();
      setCategories(data);
    } catch (err) {
      console.warn('Error loading categories:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    try {
      await saveProcurementCategory({
        name: name.trim(),
        code: code.trim(),
        type,
        description,
        itemsCount: 0,
        status: 'Active',
      });
      await loadCategories();
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      showToast(`Category "${name}" created.`);
    } catch {
      showToast('Error saving category.');
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
            Procurement Categories
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Hierarchical classification for items, services, works, and spend accounting
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>ADD CATEGORY</span>
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60">
          <h2 className="text-base font-black text-foreground">Active Categories</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">CODE</th>
                <th className="py-3.5 px-4">CATEGORY NAME</th>
                <th className="py-3.5 px-4">TYPE</th>
                <th className="py-3.5 px-4 text-center">ITEMS COUNT</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-primary/5 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-extrabold text-foreground">{c.code}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">{c.name}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{c.type}</td>
                  <td className="py-3.5 px-4 text-center font-black text-foreground">{c.itemsCount}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      • {c.status}
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
              <h2 className="text-base font-black text-foreground">Add Procurement Category</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Category Code *</label>
                <input type="text" required placeholder="e.g. IT-HW" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground uppercase" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Category Name *</label>
                <input type="text" required placeholder="e.g. IT Hardware & Terminals" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground">
                  <option value="Goods">Goods</option>
                  <option value="Services">Services</option>
                  <option value="Works">Works</option>
                </select>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md">Create Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
