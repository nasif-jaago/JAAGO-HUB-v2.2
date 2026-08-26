'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  LogIn,
  LogOut,
  Sliders,
} from 'lucide-react';
import {
  ShiftItem,
  getLocalShifts,
  saveLocalShifts,
} from '@/lib/supabase-attendance';

export default function WorkingHoursSchedulesPage() {
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<ShiftItem, 'id'>>({
    name: '',
    officeStart: '09:00 AM',
    startBufferMin: 15,
    officeEnd: '05:00 PM',
    endBufferMin: 15,
    checkInStart: '05:00 AM',
    checkInEnd: '05:00 PM',
    checkOutStart: '09:30 AM',
    checkOutEnd: '11:30 PM',
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const loaded = getLocalShifts();
    setShifts(loaded);
  }, []);

  const handleOpenAddModal = () => {
    setEditingShift(null);
    setFormData({
      name: '',
      officeStart: '09:00 AM',
      startBufferMin: 15,
      officeEnd: '05:00 PM',
      endBufferMin: 15,
      checkInStart: '05:00 AM',
      checkInEnd: '05:00 PM',
      checkOutStart: '09:30 AM',
      checkOutEnd: '11:30 PM',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (shift: ShiftItem) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      officeStart: shift.officeStart,
      startBufferMin: shift.startBufferMin,
      officeEnd: shift.officeEnd,
      endBufferMin: shift.endBufferMin,
      checkInStart: shift.checkInStart,
      checkInEnd: shift.checkInEnd,
      checkOutStart: shift.checkOutStart,
      checkOutEnd: shift.checkOutEnd,
    });
    setShowModal(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Shift name is required', 'error');
      return;
    }

    let updated: ShiftItem[];
    if (editingShift) {
      updated = shifts.map((s) =>
        s.id === editingShift.id
          ? {
              ...s,
              ...formData,
              updatedAt: new Date().toISOString(),
            }
          : s
      );
      showToast(`Shift "${formData.name}" updated successfully!`);
    } else {
      const newShift: ShiftItem = {
        id: `shift-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
      };
      updated = [newShift, ...shifts];
      showToast(`New Shift "${formData.name}" created successfully!`);
    }

    setShifts(updated);
    saveLocalShifts(updated);
    setShowModal(false);
  };

  const handleDeleteShift = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete shift "${name}"?`)) {
      const updated = shifts.filter((s) => s.id !== id);
      setShifts(updated);
      saveLocalShifts(updated);
      showToast(`Shift "${name}" removed successfully.`);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredShifts.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredShifts = shifts.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold transition transform animate-in slide-in-from-top ${
            toast.type === 'error'
              ? 'bg-rose-500 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Shift Management
          </h1>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground mt-1">
            <span>Dashboard</span>
            <span>&bull;</span>
            <span>Settings</span>
            <span>&bull;</span>
            <span className="text-primary font-bold">Shift</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Shift</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-card border border-border/70 rounded-2xl p-2.5 shadow-sm">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shift..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-surface/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredShifts.length > 0 &&
                      selectedIds.length === filteredShifts.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Shift Name</th>
                <th className="py-3.5 px-3">Office Start</th>
                <th className="py-3.5 px-3">Start Buffer (min)</th>
                <th className="py-3.5 px-3">Office End</th>
                <th className="py-3.5 px-3">End Buffer (min)</th>
                <th className="py-3.5 px-3">Check-in Start</th>
                <th className="py-3.5 px-3">Check-in End</th>
                <th className="py-3.5 px-3">Check-out Start</th>
                <th className="py-3.5 px-3">Check-out End</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-medium">
              {filteredShifts.length > 0 ? (
                filteredShifts.map((shift) => (
                  <tr
                    key={shift.id}
                    className="hover:bg-surface/50 transition duration-150 group"
                  >
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(shift.id)}
                        onChange={() => handleToggleSelect(shift.id)}
                        className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4 font-bold text-foreground">
                      <div className="flex items-center space-x-2">
                        <span>{shift.name}</span>
                        {shift.isDefault && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center space-x-1.5 text-foreground font-semibold">
                        <Clock className="h-3.5 w-3.5 text-emerald-500" />
                        <span>{shift.officeStart}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-sky-500 font-semibold text-[11px] bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                        &plusmn;{shift.startBufferMin} min
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center space-x-1.5 text-foreground font-semibold">
                        <Clock className="h-3.5 w-3.5 text-rose-500" />
                        <span>{shift.officeEnd}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <span className="text-sky-500 font-semibold text-[11px] bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                        &plusmn;{shift.endBufferMin} min
                      </span>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center space-x-1 text-amber-500 font-mono font-bold text-[11px]">
                        <LogIn className="h-3 w-3" />
                        <span>{shift.checkInStart}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center space-x-1 text-amber-500 font-mono font-bold text-[11px]">
                        <LogIn className="h-3 w-3" />
                        <span>{shift.checkInEnd}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center space-x-1 text-amber-500 font-mono font-bold text-[11px]">
                        <LogOut className="h-3 w-3" />
                        <span>{shift.checkOutStart}</span>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex items-center space-x-1 text-amber-500 font-mono font-bold text-[11px]">
                        <LogOut className="h-3 w-3" />
                        <span>{shift.checkOutEnd}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(shift)}
                          className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Edit Shift"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(shift.id, shift.name)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                          title="Delete Shift"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">
                    <Sliders className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-semibold text-sm">No shifts found</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Create your first shift schedule using &quot;New Shift&quot;.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── CREATE / EDIT SHIFT MODAL ───────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/70">
              <h2 className="text-lg font-black text-foreground tracking-tight">
                {editingShift ? 'Edit Shift' : 'New Shift'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveShift} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Shift Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Shift Name <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Full Time Shift 1"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>

                {/* Office Start */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Office Start
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.officeStart}
                      onChange={(e) => setFormData({ ...formData, officeStart: e.target.value })}
                      placeholder="09:00 AM"
                      className="w-full h-11 px-3.5 pr-9 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Start Buffer (min) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Start Buffer (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.startBufferMin}
                    onChange={(e) => setFormData({ ...formData, startBufferMin: Number(e.target.value) })}
                    placeholder="15"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>

                {/* Office End */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Office End
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.officeEnd}
                      onChange={(e) => setFormData({ ...formData, officeEnd: e.target.value })}
                      placeholder="05:00 PM"
                      className="w-full h-11 px-3.5 pr-9 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* End Buffer (min) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    End Buffer (min)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.endBufferMin}
                    onChange={(e) => setFormData({ ...formData, endBufferMin: Number(e.target.value) })}
                    placeholder="15"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>

                {/* Check-in Start */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-in Start
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.checkInStart}
                      onChange={(e) => setFormData({ ...formData, checkInStart: e.target.value })}
                      placeholder="05:00 AM"
                      className="w-full h-11 px-3.5 pr-9 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Check-in End */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-in End
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.checkInEnd}
                      onChange={(e) => setFormData({ ...formData, checkInEnd: e.target.value })}
                      placeholder="05:00 PM"
                      className="w-full h-11 px-3.5 pr-9 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Check-out Start */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-out Start
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.checkOutStart}
                      onChange={(e) => setFormData({ ...formData, checkOutStart: e.target.value })}
                      placeholder="09:30 AM"
                      className="w-full h-11 px-3.5 pr-9 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Check-out End */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-out End
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.checkOutEnd}
                      onChange={(e) => setFormData({ ...formData, checkOutEnd: e.target.value })}
                      placeholder="11:30 PM"
                      className="w-full h-11 px-3.5 pr-9 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  {editingShift ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
