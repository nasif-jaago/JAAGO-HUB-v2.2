'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  FileUp,
  RotateCw,
} from 'lucide-react';
import {
  ShiftItem,
  getLocalShifts,
  fetchShiftsFromSupabase,
  saveShiftToSupabase,
  deleteShiftFromSupabase,
  bulkSaveShiftsToSupabase,
} from '@/lib/supabase-attendance';
import { TimePickerInput } from '@/components/ui/time-picker-input';

export default function WorkingHoursSchedulesPage() {
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [parsedPreviewShifts, setParsedPreviewShifts] = useState<ShiftItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load from Supabase PostgreSQL & fallback to local cache
  const loadShiftsData = async () => {
    setIsLoading(true);
    try {
      const remote = await fetchShiftsFromSupabase();
      if (remote && remote.length > 0) {
        setShifts(remote);
      } else {
        const local = getLocalShifts();
        setShifts(local);
      }
    } catch {
      setShifts(getLocalShifts());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShiftsData();
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

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Shift name is required', 'error');
      return;
    }

    let targetShift: ShiftItem;
    if (editingShift) {
      targetShift = {
        ...editingShift,
        ...formData,
        updatedAt: new Date().toISOString(),
      };
      showToast(`Shift "${formData.name}" updated successfully!`);
    } else {
      targetShift = {
        id: `shift-${Date.now()}`,
        ...formData,
        createdAt: new Date().toISOString(),
      };
      showToast(`New Shift "${formData.name}" created successfully!`);
    }

    // Update state & Supabase
    await saveShiftToSupabase(targetShift);
    await loadShiftsData();
    setShowModal(false);
  };

  const handleDeleteShift = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete shift "${name}"?`)) {
      await deleteShiftFromSupabase(id);
      await loadShiftsData();
      showToast(`Shift "${name}" removed successfully.`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} selected shift(s)?`)) {
      for (const id of selectedIds) {
        await deleteShiftFromSupabase(id);
      }
      setSelectedIds([]);
      await loadShiftsData();
      showToast(`Deleted ${selectedIds.length} shifts.`);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // ── CSV EXPORT & DOWNLOAD SAMPLE TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════════

  const handleDownloadTemplate = () => {
    const headers = [
      'Shift Name',
      'Office Start',
      'Start Buffer (min)',
      'Office End',
      'End Buffer (min)',
      'Check-in Start',
      'Check-in End',
      'Check-out Start',
      'Check-out End',
      'Is Default',
    ];

    const sampleRows = [
      [
        'JAAGO HQ',
        '10:00 AM',
        '30',
        '06:00 PM',
        '0',
        '08:00 AM',
        '05:00 PM',
        '11:30 PM',
        '11:30 PM',
        'No',
      ],
      [
        'Full Time Shift 1',
        '09:00 AM',
        '15',
        '05:00 PM',
        '15',
        '05:00 AM',
        '05:00 PM',
        '09:30 AM',
        '11:30 PM',
        'Yes',
      ],
      [
        'Full Time Shift 2',
        '10:00 AM',
        '15',
        '06:00 PM',
        '15',
        '05:00 AM',
        '06:00 PM',
        '10:30 AM',
        '11:30 PM',
        'No',
      ],
      [
        'Full Time Shift 3',
        '07:30 AM',
        '15',
        '04:30 PM',
        '15',
        '05:00 AM',
        '04:30 PM',
        '08:00 AM',
        '11:30 PM',
        'No',
      ],
      [
        'Full Time Shift 4',
        '08:00 AM',
        '15',
        '05:00 PM',
        '15',
        '05:00 AM',
        '05:00 PM',
        '08:30 AM',
        '11:30 PM',
        'No',
      ],
    ];

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...sampleRows.map((row) =>
          row.map((val) => (val.includes(',') ? `"${val}"` : val)).join(',')
        ),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'jaago_shift_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Sample template downloaded successfully!');
  };

  const handleExportCSV = () => {
    const listToExport =
      selectedIds.length > 0
        ? shifts.filter((s) => selectedIds.includes(s.id))
        : shifts;

    if (listToExport.length === 0) {
      showToast('No shifts available to export', 'error');
      return;
    }

    const headers = [
      'Shift Name',
      'Office Start',
      'Start Buffer (min)',
      'Office End',
      'End Buffer (min)',
      'Check-in Start',
      'Check-in End',
      'Check-out Start',
      'Check-out End',
      'Is Default',
    ];

    const rows = listToExport.map((s) => [
      s.name,
      s.officeStart,
      s.startBufferMin.toString(),
      s.officeEnd,
      s.endBufferMin.toString(),
      s.checkInStart,
      s.checkInEnd,
      s.checkOutStart,
      s.checkOutEnd,
      s.isDefault ? 'Yes' : 'No',
    ]);

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) =>
          row.map((val) => (val.includes(',') ? `"${val}"` : val)).join(',')
        ),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `jaago_shifts_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${listToExport.length} shift(s) to CSV!`);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ── CSV IMPORT PARSER & VALIDATOR
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          setImportError('Uploaded file is empty.');
          return;
        }

        const lines = text
          .split(/\r\n|\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) {
          setImportError('CSV must contain a header row and at least one shift data row.');
          return;
        }

        const headers = (lines[0] || '')
          .split(',')
          .map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

        const getColIdx = (names: string[]) => {
          return headers.findIndex((h) => names.some((n) => h.includes(n.toLowerCase())));
        };

        const nameIdx = getColIdx(['shift name', 'name', 'shift']);
        const startIdx = getColIdx(['office start', 'start time', 'start']);
        const startBufIdx = getColIdx(['start buffer', 'buffer start']);
        const endIdx = getColIdx(['office end', 'end time', 'end']);
        const endBufIdx = getColIdx(['end buffer', 'buffer end']);
        const inStartIdx = getColIdx(['check-in start', 'in start']);
        const inEndIdx = getColIdx(['check-in end', 'in end']);
        const outStartIdx = getColIdx(['check-out start', 'out start']);
        const outEndIdx = getColIdx(['check-out end', 'out end']);
        const defaultIdx = getColIdx(['is default', 'default']);

        if (nameIdx === -1) {
          setImportError(
            'Missing required column "Shift Name". Please use the standard sample template.'
          );
          return;
        }

        const parsedList: ShiftItem[] = [];

        for (let i = 1; i < lines.length; i++) {
          const rawLine = lines[i];
          if (!rawLine) continue;

          // Split line handling quotes
          const cols: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let c = 0; c < rawLine.length; c++) {
            const char = rawLine[c];
            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              cols.push(current.trim().replace(/^["']|["']$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          cols.push(current.trim().replace(/^["']|["']$/g, ''));

          const name = cols[nameIdx]?.trim();
          if (!name) continue;

          const officeStart = (startIdx >= 0 ? cols[startIdx] : '') || '09:00 AM';
          const startBufferMin = startBufIdx >= 0 ? Number(cols[startBufIdx]) || 15 : 15;
          const officeEnd = (endIdx >= 0 ? cols[endIdx] : '') || '05:00 PM';
          const endBufferMin = endBufIdx >= 0 ? Number(cols[endBufIdx]) || 15 : 15;
          const checkInStart = (inStartIdx >= 0 ? cols[inStartIdx] : '') || '05:00 AM';
          const checkInEnd = (inEndIdx >= 0 ? cols[inEndIdx] : '') || '05:00 PM';
          const checkOutStart = (outStartIdx >= 0 ? cols[outStartIdx] : '') || '09:30 AM';
          const checkOutEnd = (outEndIdx >= 0 ? cols[outEndIdx] : '') || '11:30 PM';
          const isDefaultRaw = defaultIdx >= 0 ? cols[defaultIdx]?.toLowerCase() : '';
          const isDefault = isDefaultRaw === 'true' || isDefaultRaw === 'yes' || isDefaultRaw === '1';

          parsedList.push({
            id: `shift-imp-${Date.now()}-${i}`,
            name,
            officeStart,
            startBufferMin,
            officeEnd,
            endBufferMin,
            checkInStart,
            checkInEnd,
            checkOutStart,
            checkOutEnd,
            isDefault,
            createdAt: new Date().toISOString(),
          });
        }

        if (parsedList.length === 0) {
          setImportError('No valid shift records could be parsed from the file.');
          return;
        }

        setParsedPreviewShifts(parsedList);
      } catch (err: any) {
        setImportError(err?.message || 'Failed to parse CSV file. Please check file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedPreviewShifts.length === 0) return;
    setIsImporting(true);
    try {
      await bulkSaveShiftsToSupabase(parsedPreviewShifts);
      await loadShiftsData();
      showToast(`Successfully imported and saved ${parsedPreviewShifts.length} shift(s) to Supabase!`);
      setShowImportModal(false);
      setParsedPreviewShifts([]);
      setImportedFileName(null);
    } catch (err: any) {
      showToast('Error importing shifts to Supabase', 'error');
    } finally {
      setIsImporting(false);
    }
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
            {isLoading && (
              <>
                <span>&bull;</span>
                <span className="text-amber-500 flex items-center space-x-1 animate-pulse font-mono">
                  <RotateCw className="h-3 w-3 animate-spin" />
                  <span>Syncing Supabase...</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Download Sample Template */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-surface/70 hover:bg-surface text-foreground font-bold text-xs transition cursor-pointer shadow-sm hover:border-amber-500/50 active:scale-95"
            title="Download standard CSV template with sample shifts"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
            <span>Sample Template</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-surface/70 hover:bg-surface text-foreground font-bold text-xs transition cursor-pointer shadow-sm hover:border-amber-500/50 active:scale-95"
            title="Export shifts to CSV spreadsheet"
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>

          {/* Import CSV */}
          <button
            type="button"
            onClick={() => {
              setImportError(null);
              setParsedPreviewShifts([]);
              setImportedFileName(null);
              setShowImportModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-surface/70 hover:bg-surface text-foreground font-bold text-xs transition cursor-pointer shadow-sm hover:border-amber-500/50 active:scale-95"
            title="Import shifts from CSV file"
          >
            <Upload className="h-3.5 w-3.5 text-sky-500" />
            <span>Import CSV</span>
          </button>

          {/* New Shift Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>New Shift</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions Floating Bar (When 1+ selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-xs font-black text-amber-500">
            <span>{selectedIds.length} shift(s) selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Selected</span>
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-semibold transition cursor-pointer"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-card border border-border/70 rounded-2xl p-2.5 shadow-sm">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shift by name..."
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
                    className="rounded accent-amber-500 cursor-pointer"
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
                        className="rounded accent-amber-500 cursor-pointer"
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
                      Create your first shift schedule or import from CSV.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── IMPORT CSV MODAL ────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-3xl shadow-2xl relative my-auto animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/70">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight">
                    Import Shifts from CSV
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Upload your CSV file to batch create or update shifts in Supabase.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-amber-500/60 rounded-2xl p-8 text-center bg-surface/30 hover:bg-surface/60 transition cursor-pointer space-y-2 group"
              >
                <FileUp className="h-10 w-10 mx-auto text-muted-foreground group-hover:text-amber-500 transition" />
                <div className="text-xs font-bold text-foreground">
                  {importedFileName ? (
                    <span className="text-amber-500">{importedFileName}</span>
                  ) : (
                    <span>Click to browse or drag and drop your .csv file here</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Standard CSV format containing Shift Name, Office Start, Office End, etc.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Template download prompt */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-foreground">
                    Need the pre-formatted CSV template?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-amber-500 hover:text-amber-400 font-bold underline transition cursor-pointer"
                >
                  Download Sample Template
                </button>
              </div>

              {/* Error Box */}
              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center space-x-2 font-semibold">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview Table */}
              {parsedPreviewShifts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span>Parsed Shifts Preview ({parsedPreviewShifts.length} rows detected)</span>
                    <span className="text-emerald-500 text-[11px] font-mono">Ready to import</span>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-border/80 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-surface/70 sticky top-0 border-b border-border/60 font-bold uppercase text-muted-foreground">
                        <tr>
                          <th className="py-2 px-3">Shift Name</th>
                          <th className="py-2 px-2">Office Hours</th>
                          <th className="py-2 px-2">Buffer</th>
                          <th className="py-2 px-2">Check-in</th>
                          <th className="py-2 px-2">Check-out</th>
                          <th className="py-2 px-2 text-center">Default</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {parsedPreviewShifts.map((s, idx) => (
                          <tr key={idx} className="hover:bg-surface/30">
                            <td className="py-2 px-3 font-bold text-foreground">{s.name}</td>
                            <td className="py-2 px-2">
                              {s.officeStart} - {s.officeEnd}
                            </td>
                            <td className="py-2 px-2 text-sky-500">&plusmn;{s.startBufferMin}m</td>
                            <td className="py-2 px-2 font-mono text-[10px]">
                              {s.checkInStart} - {s.checkInEnd}
                            </td>
                            <td className="py-2 px-2 font-mono text-[10px]">
                              {s.checkOutStart} - {s.checkOutEnd}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {s.isDefault ? (
                                <span className="text-emerald-500 font-bold">Yes</span>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-5 sm:p-6 border-t border-border/70">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedPreviewShifts.length === 0 || isImporting}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center space-x-1.5"
              >
                {isImporting && <RotateCw className="h-3.5 w-3.5 animate-spin" />}
                <span>Import & Save to Supabase</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── CREATE / EDIT SHIFT MODAL ───────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-2xl shadow-2xl relative my-auto animate-in zoom-in-95">
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
                  <TimePickerInput
                    value={formData.officeStart}
                    onChange={(val) => setFormData({ ...formData, officeStart: val })}
                    placeholder="09:00 AM"
                  />
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
                  <TimePickerInput
                    value={formData.officeEnd}
                    onChange={(val) => setFormData({ ...formData, officeEnd: val })}
                    placeholder="05:00 PM"
                  />
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
                  <TimePickerInput
                    value={formData.checkInStart}
                    onChange={(val) => setFormData({ ...formData, checkInStart: val })}
                    placeholder="05:00 AM"
                  />
                </div>

                {/* Check-in End */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-in End
                  </label>
                  <TimePickerInput
                    value={formData.checkInEnd}
                    onChange={(val) => setFormData({ ...formData, checkInEnd: val })}
                    placeholder="05:00 PM"
                    position="top"
                  />
                </div>

                {/* Check-out Start */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-out Start
                  </label>
                  <TimePickerInput
                    value={formData.checkOutStart}
                    onChange={(val) => setFormData({ ...formData, checkOutStart: val })}
                    placeholder="09:30 AM"
                    position="top"
                  />
                </div>

                {/* Check-out End */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-out End
                  </label>
                  <TimePickerInput
                    value={formData.checkOutEnd}
                    onChange={(val) => setFormData({ ...formData, checkOutEnd: val })}
                    placeholder="11:30 PM"
                    position="top"
                  />
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
