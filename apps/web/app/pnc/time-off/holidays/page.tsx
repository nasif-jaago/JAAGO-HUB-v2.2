'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  RotateCw,
  X,
  Sparkles,
} from 'lucide-react';
import {
  PublicHolidayItem,
  fetchPublicHolidays,
  savePublicHoliday,
  deletePublicHoliday,
} from '@/lib/supabase-time-off';

const HOLIDAY_TYPES = ['National', 'Religious', 'Executive Order', 'Institutional'] as const;

export default function PublicHolidaysPage() {
  const [holidays, setHolidays] = useState<PublicHolidayItem[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PublicHolidayItem | null>(null);
  const [formData, setFormData] = useState<PublicHolidayItem>({
    id: '',
    title: '',
    date: new Date().toISOString().split('T')[0]!,
    endDate: '',
    totalDays: 1,
    type: 'National',
    description: '',
    year: 2026,
  });

  const loadData = async () => {
    const data = await fetchPublicHolidays();
    if (data) setHolidays(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      id: `hol-${Date.now()}`,
      title: '',
      date: new Date().toISOString().split('T')[0]!,
      endDate: '',
      totalDays: 1,
      type: 'National',
      description: '',
      year: selectedYear,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: PublicHolidayItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      showToastMsg('Please provide holiday title and start date', 'error');
      return;
    }

    const year = new Date(formData.date).getFullYear() || 2026;
    const itemToSave: PublicHolidayItem = {
      ...formData,
      year,
    };

    const idx = holidays.findIndex((h) => h.id === itemToSave.id);
    let updated: PublicHolidayItem[];
    if (idx >= 0) {
      updated = [...holidays];
      updated[idx] = itemToSave;
    } else {
      updated = [itemToSave, ...holidays];
    }
    setHolidays(updated);
    setShowModal(false);
    await savePublicHoliday(itemToSave);
    showToastMsg('Holiday saved successfully');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this public holiday?')) return;
    setHolidays(holidays.filter((h) => h.id !== id));
    setShowModal(false);
    await deletePublicHoliday(id);
    showToastMsg('Holiday deleted');
  };

  // Metrics
  const yearHolidays = holidays.filter((h) => h.year === selectedYear);
  const nationalCount = yearHolidays.filter((h) => h.type === 'National').length;
  const religiousCount = yearHolidays.filter((h) => h.type === 'Religious').length;
  const totalDaysCount = yearHolidays.reduce((sum, h) => sum + (h.totalDays || 1), 0);

  // Filtered
  const filtered = yearHolidays.filter((h) => {
    if (selectedTypeFilter && h.type !== selectedTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        h.title.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q) ||
        h.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Toast */}
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
            <span>Time Off</span>
            <span>/</span>
            <span className="text-foreground font-bold">Public Holidays</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Public Holidays
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground transition shadow-sm cursor-pointer"
            title="Refresh Holidays"
          >
            <RotateCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>NEW HOLIDAY</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-foreground">{yearHolidays.length}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Holidays in {selectedYear}</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-surface border border-border flex items-center justify-center text-foreground font-bold">
            <CalendarIcon className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-amber-500">{totalDaysCount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Off Days</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-blue-500">{nationalCount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">National Observances</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 font-bold">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-emerald-500">{religiousCount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Religious Festivals</div>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 font-bold">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Year Tabs */}
      <div className="flex items-center space-x-4 border-b border-border/60 text-xs font-extrabold tracking-wider text-muted-foreground">
        {[2026, 2027].map((yr) => (
          <button
            key={yr}
            type="button"
            onClick={() => setSelectedYear(yr)}
            className={`pb-3 transition relative cursor-pointer ${
              selectedYear === yr ? 'text-amber-500 font-black' : 'hover:text-foreground'
            }`}
          >
            CALENDAR YEAR {yr}
            {selectedYear === yr && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search holiday name, description, or festival..."
            className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <select
          value={selectedTypeFilter}
          onChange={(e) => setSelectedTypeFilter(e.target.value)}
          className="w-full sm:w-64 h-10 px-3.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
        >
          <option value="">Holiday Category (All)</option>
          {HOLIDAY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-surface/50">
                <th className="py-3.5 px-4">Holiday Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Observed Date(s)</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Description / Significance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground text-xs font-semibold">
                    No public holidays configured for {selectedYear}.
                  </td>
                </tr>
              ) : (
                filtered.map((h) => {
                  return (
                    <tr
                      key={h.id}
                      onClick={() => handleOpenEdit(h)}
                      className="hover:bg-surface/60 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                            🎉
                          </div>
                          <div className="font-extrabold text-foreground group-hover:text-amber-500 transition text-xs sm:text-[13px]">
                            {h.title}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-bold text-foreground">
                          {h.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-foreground font-semibold">
                        {h.date} {h.endDate ? `→ ${h.endDate}` : ''}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {h.totalDays} {h.totalDays === 1 ? 'day' : 'days'}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                        {h.description || 'Institutional public holiday observance.'}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(h)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                            title="Edit Holiday"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(h.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                            title="Delete Holiday"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: ADD / EDIT HOLIDAY ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-serif font-black text-foreground">
                {editingItem ? 'Edit Public Holiday' : 'Add Public Holiday'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Holiday Title <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Independence Day of Bangladesh"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Category
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    {HOLIDAY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Total Days Off
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.totalDays}
                    onChange={(e) => setFormData({ ...formData, totalDays: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Start Date <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description / Significance
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details regarding nationwide gazetted holiday or operational shutdown..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/70">
                {editingItem ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingItem.id)}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>DELETE</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
                  >
                    {editingItem ? 'UPDATE HOLIDAY' : 'CREATE HOLIDAY'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
