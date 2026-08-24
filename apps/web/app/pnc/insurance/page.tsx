'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Archive,
  RotateCw,
  Check,
} from 'lucide-react';
import {
  InsuranceCategoryItem,
  INITIAL_INSURANCE_CATEGORIES,
  fetchInsuranceCategoriesFromSupabase,
  saveInsuranceCategoryToSupabase,
  deleteInsuranceCategoryFromSupabase,
} from '@/lib/supabase-organization';

export default function InsurancePage() {
  const [categories, setCategories] = useState<InsuranceCategoryItem[]>(INITIAL_INSURANCE_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InsuranceCategoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InsuranceCategoryItem>>({
    name: '',
    monthlyPremium: 0,
    description: '',
    coverageDetails: '',
    isActive: true,
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchInsuranceCategoriesFromSupabase().then((data) => {
      if (data && data.length > 0) setCategories(data);
    });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      monthlyPremium: 1250,
      description: '',
      coverageDetails: 'IPD ৳ 250,000 / OPD ৳ 20,000 / Life ৳ 500,000',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (cat: InsuranceCategoryItem) => {
    setEditingItem(cat);
    setFormData({ ...cat });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      showToast('Category Name is mandatory *', 'error');
      return;
    }
    if (formData.monthlyPremium === undefined || formData.monthlyPremium < 0) {
      showToast('Total Monthly Premium (BDT) is mandatory *', 'error');
      return;
    }

    const payload: InsuranceCategoryItem = {
      id: editingItem?.id || `ins-${Date.now()}`,
      name: formData.name.trim(),
      monthlyPremium: Number(formData.monthlyPremium || 0),
      description: formData.description || '',
      coverageDetails: formData.coverageDetails || '',
      isActive: formData.isActive ?? true,
      isArchived: editingItem ? editingItem.isArchived : false,
    };

    await saveInsuranceCategoryToSupabase(payload);

    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === payload.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [payload, ...prev];
    });

    setShowModal(false);
    showToast(editingItem ? 'Insurance category updated!' : 'Insurance category created!');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this insurance category?')) return;
    await deleteInsuranceCategoryFromSupabase(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    showToast('Insurance category deleted');
  };

  // Bulk actions
  const handleArchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    const updated = categories.map((c) =>
      selectedIds.includes(c.id) ? { ...c, isArchived: true } : c
    );
    setCategories(updated);
    for (const id of selectedIds) {
      const target = updated.find((c) => c.id === id);
      if (target) await saveInsuranceCategoryToSupabase(target);
    }
    showToast(`${selectedIds.length} category/categories archived`);
    setSelectedIds([]);
  };

  const handleUnarchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    const updated = categories.map((c) =>
      selectedIds.includes(c.id) ? { ...c, isArchived: false } : c
    );
    setCategories(updated);
    for (const id of selectedIds) {
      const target = updated.find((c) => c.id === id);
      if (target) await saveInsuranceCategoryToSupabase(target);
    }
    showToast(`${selectedIds.length} category/categories restored`);
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected category/categories?`)) return;
    for (const id of selectedIds) {
      await deleteInsuranceCategoryFromSupabase(id);
    }
    setCategories((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
    showToast(`${selectedIds.length} category/categories deleted`);
    setSelectedIds([]);
  };

  // Filtered List
  const filtered = categories.filter((cat) => {
    const isArchived = Boolean(cat.isArchived);
    if (viewMode === 'ARCHIVED') {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        cat.name.toLowerCase().includes(q) ||
        cat.description?.toLowerCase().includes(q) ||
        cat.coverageDetails?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-2xl animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <span>People and Culture</span>
            <span>/</span>
            <span className="text-foreground font-bold">Insurance Info</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Insurance Info &amp; Coverage Categories
          </h1>
          <p className="text-xs text-muted-foreground pt-0.5">
            Configure employee medical insurance plans, hospitalization benefit caps, and monthly premium rates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>NEW CATEGORY</span>
        </button>
      </div>

      {/* Active vs Archived Filter Tabs */}
      <div className="flex items-center space-x-4 border-b border-border/60 text-xs font-extrabold tracking-wider text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            setViewMode('ACTIVE');
            setSelectedIds([]);
          }}
          className={`pb-3 transition relative cursor-pointer ${
            viewMode === 'ACTIVE' ? 'text-amber-500 font-black' : 'hover:text-foreground'
          }`}
        >
          ACTIVE ({categories.filter((c) => !c.isArchived).length})
          {viewMode === 'ACTIVE' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode('ARCHIVED');
            setSelectedIds([]);
          }}
          className={`pb-3 transition relative cursor-pointer ${
            viewMode === 'ARCHIVED' ? 'text-amber-500 font-black' : 'hover:text-foreground'
          }`}
        >
          ARCHIVED ({categories.filter((c) => Boolean(c.isArchived)).length})
          {viewMode === 'ARCHIVED' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search insurance category name, coverage details, or notes..."
            className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-xs font-black text-amber-500">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{selectedIds.length} category/categories selected</span>
          </div>

          <div className="flex items-center space-x-2">
            {viewMode === 'ARCHIVED' ? (
              <button
                type="button"
                onClick={handleUnarchiveSelected}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Restore / Unarchive</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleArchiveSelected}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive Selected</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDeleteSelected}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-semibold transition cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Insurance Categories Table */}
      <div className="rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-surface/50">
                <th className="py-3.5 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((cat) => selectedIds.includes(cat.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(Array.from(new Set([...selectedIds, ...filtered.map((c) => c.id)])));
                      } else {
                        const filteredIds = new Set(filtered.map((c) => c.id));
                        setSelectedIds(selectedIds.filter((id) => !filteredIds.has(id)));
                      }
                    }}
                    className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="py-3.5 px-4">Category Name</th>
                <th className="py-3.5 px-4">Total Monthly Premium (BDT)</th>
                <th className="py-3.5 px-4">Coverage Details</th>
                <th className="py-3.5 px-4">Description / Notes</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.map((cat) => {
                const isSelected = selectedIds.includes(cat.id);

                return (
                  <tr
                    key={cat.id}
                    onClick={() => handleOpenEditModal(cat)}
                    className={`transition cursor-pointer group ${
                      isSelected ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-surface/60'
                    }`}
                  >
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            setSelectedIds(selectedIds.filter((id) => id !== cat.id));
                          } else {
                            setSelectedIds([...selectedIds, cat.id]);
                          }
                        }}
                        className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="font-extrabold text-foreground group-hover:text-amber-500 transition text-xs sm:text-[13px]">
                          {cat.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-emerald-500 text-xs sm:text-[13px]">
                      ৳ {cat.monthlyPremium?.toLocaleString()} / month
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">
                      <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-bold text-foreground">
                        {cat.coverageDetails || 'Full hospitalization & term cover'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                      {cat.description || 'Institutional group health and disability plan.'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cat)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT INSURANCE CATEGORY
          ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-serif font-black text-foreground">
                {editingItem ? 'Edit Insurance Category' : 'Create New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Category Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Category Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Category A (Executive)"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              {/* Monthly Premium */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Total Monthly Premium (BDT) <span className="text-amber-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.monthlyPremium}
                  onChange={(e) => setFormData({ ...formData, monthlyPremium: Number(e.target.value) })}
                  placeholder="e.g. 1250"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              {/* Coverage Details */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Coverage Details
                </label>
                <input
                  type="text"
                  value={formData.coverageDetails}
                  onChange={(e) => setFormData({ ...formData, coverageDetails: e.target.value })}
                  placeholder="e.g. IPD ৳ 250,000 / OPD ৳ 20,000 / Life ৳ 500,000"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summarize claims procedure, eligible grade levels, and policy inclusions..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
              >
                {editingItem ? 'UPDATE CATEGORY' : 'CREATE CATEGORY'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
