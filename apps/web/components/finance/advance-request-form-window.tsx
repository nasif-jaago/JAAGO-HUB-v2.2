'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  Save,
  Send,
  Plus,
  Trash2,
  CreditCard,
  FileText,
  AlertCircle,
  Plane,
  Hotel,
  Utensils,
  Car,
  PieChart,
  Sparkles,
} from 'lucide-react';
import {
  FinanceAdvanceRequest,
  LongTravelItem,
  AccommodationItem,
  PerDiemItem,
  LocalConveyanceItem,
  ProgramExpenseItem,
  saveFinanceAdvanceRequest,
} from '@/lib/supabase-finance';
import { fetchProjectsFromSupabase, ProjectItem } from '@/lib/supabase-organization';
import { getCurrentUserSession } from '@/lib/user-profile-sync';
import { ApprovalChainModal } from './approval-chain-modal';

interface AdvanceRequestFormWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: ((req: FinanceAdvanceRequest) => void) | undefined;
  initialData?: FinanceAdvanceRequest | null | undefined;
  readOnly?: boolean | undefined;
}

export function AdvanceRequestFormWindow({
  isOpen,
  onClose,
  onSaved,
  initialData,
  readOnly = false,
}: AdvanceRequestFormWindowProps) {
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const subjectRef = useRef<HTMLTextAreaElement | null>(null);

  const todayStr = new Date().toISOString().split('T')[0] || '';

  // Form State
  const [formData, setFormData] = useState<Partial<FinanceAdvanceRequest>>({
    title: '',
    employeeName: '',
    employeeCode: '',
    employeeDesignation: '',
    department: '',
    project: '',
    activityCode: '',
    visitingPlace: '',
    duration: '3 Days',
    requestDate: todayStr,
    cashRequiredDate: '',
    bankName: 'Brac Bank LTD.',
    bankAccountNumber: '1068624040001',
    routingNumber: '60260680',
    bankAddress: 'Banani-11, Dhaka',
    remarks: '',
    longTravelItems: [],
    accommodationItems: [],
    perDiemItems: [],
    localConveyanceItems: [],
    programExpenseItems: [],
    status: 'Draft',
    currency: 'BDT',
  });

  // Load Session and Projects on mount
  useEffect(() => {
    if (!isOpen) return;

    fetchProjectsFromSupabase().then((data) => {
      if (Array.isArray(data)) setProjects(data);
    });

    if (initialData) {
      setFormData(initialData);
    } else {
      const session = getCurrentUserSession();
      if (session) {
        setFormData((prev) => ({
          ...prev,
          employeeName: session.fullName || prev.employeeName || 'Nasif Kamal',
          employeeCode: session.employeeCode || prev.employeeCode || 'FO032507061190',
          employeeDesignation: session.jobTitle || prev.employeeDesignation || 'Coordinator',
          department: session.department || prev.department || "Founder's Office",
        }));
      }
    }
  }, [isOpen, initialData]);

  // Auto-adjust subject textarea height on value change or dialog open
  useEffect(() => {
    if (subjectRef.current) {
      subjectRef.current.style.height = 'auto';
      subjectRef.current.style.height = `${Math.max(38, subjectRef.current.scrollHeight)}px`;
    }
  }, [formData.title, isOpen]);

  // Section Subtotals & Grand Total Calculations
  const longTravelSubtotal = useMemo(() => {
    return (formData.longTravelItems || []).reduce((acc, item) => acc + (Number(item.cost) || 0), 0);
  }, [formData.longTravelItems]);

  const accommodationSubtotal = useMemo(() => {
    return (formData.accommodationItems || []).reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  }, [formData.accommodationItems]);

  const perDiemSubtotal = useMemo(() => {
    return (formData.perDiemItems || []).reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  }, [formData.perDiemItems]);

  const localConveyanceSubtotal = useMemo(() => {
    return (formData.localConveyanceItems || []).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [formData.localConveyanceItems]);

  const programExpensesSubtotal = useMemo(() => {
    return (formData.programExpenseItems || []).reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  }, [formData.programExpenseItems]);

  const totalAmount = useMemo(() => {
    return (
      longTravelSubtotal +
      accommodationSubtotal +
      perDiemSubtotal +
      localConveyanceSubtotal +
      programExpensesSubtotal
    );
  }, [
    longTravelSubtotal,
    accommodationSubtotal,
    perDiemSubtotal,
    localConveyanceSubtotal,
    programExpensesSubtotal,
  ]);

  if (!isOpen) return null;

  // --- Handlers for dynamic tables ---

  // 1. Long Travel
  const addLongTravelRow = () => {
    const newRow: LongTravelItem = {
      id: `lt-${Date.now()}-${Math.random()}`,
      budgetLine: 'BL-501',
      date: formData.requestDate || '',
      from: '',
      to: '',
      departure: '08:00 AM',
      arrival: '10:00 AM',
      mode: 'Flight',
      cost: 0,
    };
    setFormData((prev) => ({
      ...prev,
      longTravelItems: [...(prev.longTravelItems || []), newRow],
    }));
  };

  const updateLongTravelRow = (idx: number, field: keyof LongTravelItem, val: any) => {
    setFormData((prev) => {
      const items = [...(prev.longTravelItems || [])];
      if (items[idx]) {
        items[idx] = { ...items[idx]!, [field]: val };
      }
      return { ...prev, longTravelItems: items };
    });
  };

  const removeLongTravelRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      longTravelItems: (prev.longTravelItems || []).filter((_, i) => i !== idx),
    }));
  };

  // 2. Accommodation
  const addAccommodationRow = () => {
    const newRow: AccommodationItem = {
      id: `acc-${Date.now()}-${Math.random()}`,
      budgetLine: 'BL-502',
      districtCity: '',
      fromDate: formData.requestDate || '',
      toDate: formData.requestDate || '',
      hotelName: '',
      tariffPerDay: 0,
      days: 1,
      total: 0,
    };
    setFormData((prev) => ({
      ...prev,
      accommodationItems: [...(prev.accommodationItems || []), newRow],
    }));
  };

  const updateAccommodationRow = (idx: number, field: keyof AccommodationItem, val: any) => {
    setFormData((prev) => {
      const items = [...(prev.accommodationItems || [])];
      if (items[idx]) {
        const item = { ...items[idx]!, [field]: val };
        if (field === 'tariffPerDay' || field === 'days') {
          item.total = (Number(item.tariffPerDay) || 0) * (Number(item.days) || 0);
        }
        items[idx] = item;
      }
      return { ...prev, accommodationItems: items };
    });
  };

  const removeAccommodationRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      accommodationItems: (prev.accommodationItems || []).filter((_, i) => i !== idx),
    }));
  };

  // 3. Per Diem
  const addPerDiemRow = () => {
    const newRow: PerDiemItem = {
      id: `pd-${Date.now()}-${Math.random()}`,
      budgetLine: 'BL-503',
      date: formData.requestDate || '',
      start: '09:00 AM',
      end: '06:00 PM',
      applicable: true,
      breakfast: 150,
      lunch: 350,
      dinner: 350,
      incidental: 150,
      total: 1000,
    };
    setFormData((prev) => ({
      ...prev,
      perDiemItems: [...(prev.perDiemItems || []), newRow],
    }));
  };

  const updatePerDiemRow = (idx: number, field: keyof PerDiemItem, val: any) => {
    setFormData((prev) => {
      const items = [...(prev.perDiemItems || [])];
      if (items[idx]) {
        const item = { ...items[idx]!, [field]: val };
        if (
          field === 'breakfast' ||
          field === 'lunch' ||
          field === 'dinner' ||
          field === 'incidental'
        ) {
          item.total =
            (Number(item.breakfast) || 0) +
            (Number(item.lunch) || 0) +
            (Number(item.dinner) || 0) +
            (Number(item.incidental) || 0);
        }
        items[idx] = item;
      }
      return { ...prev, perDiemItems: items };
    });
  };

  const removePerDiemRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      perDiemItems: (prev.perDiemItems || []).filter((_, i) => i !== idx),
    }));
  };

  // 4. Local Conveyance
  const addLocalConveyanceRow = () => {
    const newRow: LocalConveyanceItem = {
      id: `lc-${Date.now()}-${Math.random()}`,
      budgetLine: 'BL-504',
      date: formData.requestDate || '',
      start: '10:00 AM',
      end: '01:00 PM',
      from: '',
      to: '',
      mode: 'CNG / Auto',
      amount: 0,
    };
    setFormData((prev) => ({
      ...prev,
      localConveyanceItems: [...(prev.localConveyanceItems || []), newRow],
    }));
  };

  const updateLocalConveyanceRow = (idx: number, field: keyof LocalConveyanceItem, val: any) => {
    setFormData((prev) => {
      const items = [...(prev.localConveyanceItems || [])];
      if (items[idx]) {
        items[idx] = { ...items[idx]!, [field]: val };
      }
      return { ...prev, localConveyanceItems: items };
    });
  };

  const removeLocalConveyanceRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      localConveyanceItems: (prev.localConveyanceItems || []).filter((_, i) => i !== idx),
    }));
  };

  // 5. Program Expenses
  const addProgramExpenseRow = () => {
    const newRow: ProgramExpenseItem = {
      id: `pe-${Date.now()}-${Math.random()}`,
      date: formData.requestDate || '',
      itemDescription: '',
      budgetLine: 'BL-505',
      unit: 1,
      unitCost: 0,
      total: 0,
    };
    setFormData((prev) => ({
      ...prev,
      programExpenseItems: [...(prev.programExpenseItems || []), newRow],
    }));
  };

  const updateProgramExpenseRow = (idx: number, field: keyof ProgramExpenseItem, val: any) => {
    setFormData((prev) => {
      const items = [...(prev.programExpenseItems || [])];
      if (items[idx]) {
        const item = { ...items[idx]!, [field]: val };
        if (field === 'unit' || field === 'unitCost') {
          item.total = (Number(item.unit) || 0) * (Number(item.unitCost) || 0);
        }
        items[idx] = item;
      }
      return { ...prev, programExpenseItems: items };
    });
  };

  const removeProgramExpenseRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      programExpenseItems: (prev.programExpenseItems || []).filter((_, i) => i !== idx),
    }));
  };

  // --- Save / Submit Handlers ---
  const handleSave = async (submitStatus: 'Draft' | 'Submitted') => {
    if (!formData.title || !formData.title.trim()) {
      setErrorMsg('Subject / Purpose of Visit or Expense is required.');
      return;
    }
    setErrorMsg('');
    setSaving(true);

    try {
      const payload: Partial<FinanceAdvanceRequest> & {
        title: string;
        employeeName: string;
        totalAmount: number;
      } = {
        ...formData,
        title: formData.title.trim(),
        employeeName: formData.employeeName || 'Staff Member',
        totalAmount,
        longTravelSubtotal,
        accommodationSubtotal,
        perDiemSubtotal,
        localConveyanceSubtotal,
        programExpensesSubtotal,
        status: submitStatus,
      };

      const saved = await saveFinanceAdvanceRequest(payload);
      if (onSaved) onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save advance request.');
    } finally {
      setSaving(false);
    }
  };

  const currentStatus = formData.status || 'Draft';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-slate-100 flex flex-col print:p-0 print:bg-white antialiased">
      {/* Approval Chain Modal */}
      <ApprovalChainModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        approvalSteps={formData.approvalSteps || []}
        title="Advance Request Approval Chain"
        expenseCode={formData.expenseCode}
      />

      {/* ── TOP STICKY COMMAND BAR (SAPPHIRE / DEEP INDIGO IDENTITY) ── */}
      <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs print:hidden">
        {/* Left branding & meta */}
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition cursor-pointer"
            title="Back to Expenses"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
                ADVANCE
              </span>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Advance Request Form
              </h1>
              {formData.expenseCode && (
                <span className="px-2.5 py-0.5 rounded-lg font-mono text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {formData.expenseCode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Travel &amp; Program Advance Requisition &bull; Official Disbursement Request
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>PRINT</span>
          </button>

          <button
            type="button"
            onClick={() => setIsChainModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>CHAIN</span>
          </button>

          {!readOnly && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave('Draft')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>SAVE DRAFT</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave('Submitted')}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>SUBMIT ADVANCE &rarr;</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── WORKFLOW STEPPER BAR ── */}
      <div className="w-full bg-white dark:bg-zinc-900 border-b border-slate-200/80 dark:border-zinc-800 py-2.5 px-4 sm:px-8 flex items-center justify-center space-x-4 sm:space-x-8 text-xs font-bold shadow-2xs print:hidden">
        {[
          { step: 1, label: 'Draft', active: currentStatus === 'Draft' },
          { step: 2, label: 'Submitted', active: currentStatus === 'Submitted' },
          { step: 3, label: 'Reviewed', active: currentStatus === 'Reviewed' },
          { step: 4, label: 'Approved', active: currentStatus === 'Approved' || currentStatus === 'Settled' },
        ].map((s, idx) => (
          <div key={idx} className="flex items-center space-x-2">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                s.active
                  ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100 dark:ring-blue-950/70'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
              }`}
            >
              {s.step}
            </div>
            <span
              className={
                s.active
                  ? 'text-blue-700 dark:text-blue-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }
            >
              {s.label}
            </span>
            {idx < 3 && <div className="h-0.5 w-6 sm:w-12 bg-slate-200 dark:bg-zinc-800 ml-2" />}
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="max-w-[1560px] mx-auto w-full px-4 sm:px-8 mt-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* ── MAIN SCROLLABLE FULL-WINDOW FORM BODY ── */}
      <main className="flex-1 w-full max-w-[1560px] mx-auto px-4 sm:px-8 py-8 space-y-7">
        {/* ════ SIDE-BY-SIDE: TRAVEL AUTHORIZATION (LEFT) & BANK INFORMATION (RIGHT) ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* ── LEFT BLOCK: TRAVEL AUTHORIZATION & GENERAL INFORMATION ── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-zinc-800 pb-3.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Travel Authorization &amp; General Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Official travel details, requisition purpose, and department alignment.
                  </p>
                </div>
              </div>

              {/* Subject / Purpose Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-800/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center space-x-1.5">
                    <span>SUBJECT / PURPOSE OF VISIT *</span>
                    <span className="text-rose-500 font-bold">(Mandatory)</span>
                  </label>
                  <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 font-medium select-none">
                    Auto-adjusts &amp; Resizable
                  </span>
                </div>
                <textarea
                  ref={subjectRef}
                  disabled={readOnly}
                  rows={1}
                  value={formData.title || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, title: e.target.value }));
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.max(38, e.target.scrollHeight)}px`;
                  }}
                  placeholder="e.g. Field Assessment Visit to Cox's Bazar Rohingya Camp Schools"
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-colors shadow-2xs resize-y min-h-[38px] leading-relaxed"
                />
              </div>

              {/* Grid 2-cols: Employee Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Name of Employee
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.employeeName || ''}
                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Employee Code
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.employeeCode || ''}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Grid 2-cols: Designation & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Employee Designation
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.employeeDesignation || ''}
                    onChange={(e) => setFormData({ ...formData, employeeDesignation: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Grid 2-cols: Project & Activity Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Project
                  </label>
                  <select
                    disabled={readOnly}
                    value={formData.project || ''}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                  >
                    <option value="">Select Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                    <option value="Founder's Office">Founder&apos;s Office</option>
                    <option value="Child Welfare Sponsorship">Child Welfare Sponsorship</option>
                    <option value="Digital School Modernization">Digital School Modernization</option>
                    <option value="General Operations">General Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Activity Code / Budget Line
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.activityCode || ''}
                    onChange={(e) => setFormData({ ...formData, activityCode: e.target.value })}
                    placeholder="e.g. ACT-2026-CSB-01"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-zinc-100 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Grid 2-cols: Visiting Place & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Visiting Place
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.visitingPlace || ''}
                    onChange={(e) => setFormData({ ...formData, visitingPlace: e.target.value })}
                    placeholder="e.g. Cox's Bazar, Ramu"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Duration of Visit
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    placeholder="e.g. 3 Days"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Grid 2-cols: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Date of Advance Request
                  </label>
                  <input
                    type="date"
                    disabled={readOnly}
                    value={formData.requestDate || ''}
                    onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Cash Required Date
                  </label>
                  <input
                    type="date"
                    disabled={readOnly}
                    value={formData.cashRequiredDate || ''}
                    onChange={(e) => setFormData({ ...formData, cashRequiredDate: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── RIGHT BLOCK: BANK & DISBURSEMENT INFORMATION ── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-zinc-800 pb-3.5">
                <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Bank &amp; Disbursement Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Official employee bank account for direct electronic fund transfer (EFT).
                  </p>
                </div>
              </div>

              {/* Grid 2-cols: Bank Name & Routing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.bankName || ''}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Routing No.
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.routingNumber || ''}
                    onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-zinc-100 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Grid 2-cols: Account Number & Currency/Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.bankAccountNumber || ''}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-zinc-100 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Disbursement Currency
                  </label>
                  <input
                    type="text"
                    disabled={true}
                    value={`${formData.currency || 'BDT'} — Electronic Transfer`}
                    className="w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-300"
                  />
                </div>
              </div>

              {/* Bank Branch Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Bank Branch Address
                </label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={formData.bankAddress || ''}
                  onChange={(e) => setFormData({ ...formData, bankAddress: e.target.value })}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-blue-600"
                />
              </div>

              {/* Remarks & Justification Notes */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Remarks &amp; Justification Notes
                </label>
                <textarea
                  disabled={readOnly}
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={3}
                  placeholder="Add any specific justification, emergency approval references, or advance disbursement notes..."
                  className="w-full bg-slate-50/50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            </div>

            {/* EFT Verified Notification Pill at bottom of right block */}
            <div className="mt-2 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center space-x-2 text-[11px] font-semibold text-blue-800 dark:text-blue-300">
              <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>Direct Electronic Fund Transfer (EFT) to authorized employee bank account.</span>
            </div>
          </section>
        </div>

        {/* ════ SECTION 1 — LONG TRAVEL ════ */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Plane className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 1 &mdash; Long Travel
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Air, Railway, or Long Distance Inter-district Bus journeys
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Subtotal: ৳ {longTravelSubtotal.toLocaleString()}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Budget Line</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">From</th>
                  <th className="p-3">To</th>
                  <th className="p-3">Departure</th>
                  <th className="p-3">Arrival</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Cost (BDT)</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.longTravelItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 dark:hover:bg-zinc-800/40 transition">
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.budgetLine}
                        onChange={(e) => updateLongTravelRow(idx, 'budgetLine', e.target.value)}
                        className="w-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="date"
                        disabled={readOnly}
                        value={item.date}
                        onChange={(e) => updateLongTravelRow(idx, 'date', e.target.value)}
                        className="w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.from}
                        onChange={(e) => updateLongTravelRow(idx, 'from', e.target.value)}
                        placeholder="e.g. Dhaka"
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.to}
                        onChange={(e) => updateLongTravelRow(idx, 'to', e.target.value)}
                        placeholder="e.g. Cox's Bazar"
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.departure}
                        onChange={(e) => updateLongTravelRow(idx, 'departure', e.target.value)}
                        className="w-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.arrival}
                        onChange={(e) => updateLongTravelRow(idx, 'arrival', e.target.value)}
                        className="w-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.mode}
                        onChange={(e) => updateLongTravelRow(idx, 'mode', e.target.value)}
                        placeholder="Flight/Bus/Train"
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.cost || ''}
                        onChange={(e) => updateLongTravelRow(idx, 'cost', Number(e.target.value))}
                        className="w-28 text-right font-mono font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-blue-600"
                      />
                    </td>
                    {!readOnly && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLongTravelRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {(formData.longTravelItems || []).length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No travel rows added yet. Click &quot;+ Add Row&quot; below to add long travel items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={addLongTravelRow}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ ADD TRAVEL ROW</span>
            </button>
          )}
        </section>

        {/* ════ SECTION 2 — ACCOMMODATION ════ */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Hotel className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 2 &mdash; Accommodation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hotel, Guest House, or Field Lodging
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Subtotal: ৳ {accommodationSubtotal.toLocaleString()}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Budget Line</th>
                  <th className="p-3">District/City</th>
                  <th className="p-3">From Date</th>
                  <th className="p-3">To Date</th>
                  <th className="p-3">Hotel Name</th>
                  <th className="p-3 text-right">Tariff/Night</th>
                  <th className="p-3 text-center">Nights</th>
                  <th className="p-3 text-right">Total (BDT)</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.accommodationItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 dark:hover:bg-zinc-800/40 transition">
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.budgetLine}
                        onChange={(e) => updateAccommodationRow(idx, 'budgetLine', e.target.value)}
                        className="w-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.districtCity}
                        onChange={(e) => updateAccommodationRow(idx, 'districtCity', e.target.value)}
                        placeholder="e.g. Cox's Bazar"
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="date"
                        disabled={readOnly}
                        value={item.fromDate}
                        onChange={(e) => updateAccommodationRow(idx, 'fromDate', e.target.value)}
                        className="w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="date"
                        disabled={readOnly}
                        value={item.toDate}
                        onChange={(e) => updateAccommodationRow(idx, 'toDate', e.target.value)}
                        className="w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.hotelName}
                        onChange={(e) => updateAccommodationRow(idx, 'hotelName', e.target.value)}
                        placeholder="Hotel Name"
                        className="w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.tariffPerDay || ''}
                        onChange={(e) => updateAccommodationRow(idx, 'tariffPerDay', Number(e.target.value))}
                        className="w-24 text-right font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.days || ''}
                        onChange={(e) => updateAccommodationRow(idx, 'days', Number(e.target.value))}
                        className="w-16 text-center font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳ {item.total?.toLocaleString()}
                    </td>
                    {!readOnly && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeAccommodationRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {(formData.accommodationItems || []).length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No accommodation rows added. Click &quot;+ Add Row&quot; below to add hotel expenses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={addAccommodationRow}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ ADD ACCOMMODATION ROW</span>
            </button>
          )}
        </section>

        {/* ════ SECTION 3 — PER DIEM (DAILY SUBSISTENCE) ════ */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Utensils className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 3 &mdash; Per Diem &amp; Meals
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily meal allowances and incidental expenses per JAAGO HR policy
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Subtotal: ৳ {perDiemSubtotal.toLocaleString()}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Budget Line</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3 text-center">Applicable?</th>
                  <th className="p-3 text-right">Breakfast</th>
                  <th className="p-3 text-right">Lunch</th>
                  <th className="p-3 text-right">Dinner</th>
                  <th className="p-3 text-right">Incidental</th>
                  <th className="p-3 text-right">Total (BDT)</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.perDiemItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 dark:hover:bg-zinc-800/40 transition">
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.budgetLine}
                        onChange={(e) => updatePerDiemRow(idx, 'budgetLine', e.target.value)}
                        className="w-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="date"
                        disabled={readOnly}
                        value={item.date}
                        onChange={(e) => updatePerDiemRow(idx, 'date', e.target.value)}
                        className="w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.start}
                        onChange={(e) => updatePerDiemRow(idx, 'start', e.target.value)}
                        className="w-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.end}
                        onChange={(e) => updatePerDiemRow(idx, 'end', e.target.value)}
                        className="w-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        disabled={readOnly}
                        checked={item.applicable}
                        onChange={(e) => updatePerDiemRow(idx, 'applicable', e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.breakfast || ''}
                        onChange={(e) => updatePerDiemRow(idx, 'breakfast', Number(e.target.value))}
                        className="w-18 text-right font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.lunch || ''}
                        onChange={(e) => updatePerDiemRow(idx, 'lunch', Number(e.target.value))}
                        className="w-18 text-right font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.dinner || ''}
                        onChange={(e) => updatePerDiemRow(idx, 'dinner', Number(e.target.value))}
                        className="w-18 text-right font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.incidental || ''}
                        onChange={(e) => updatePerDiemRow(idx, 'incidental', Number(e.target.value))}
                        className="w-18 text-right font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳ {item.total?.toLocaleString()}
                    </td>
                    {!readOnly && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removePerDiemRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {(formData.perDiemItems || []).length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No per diem rows added. Click &quot;+ Add Row&quot; below to add daily subsistence.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={addPerDiemRow}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ ADD PER DIEM ROW</span>
            </button>
          )}
        </section>

        {/* ════ SECTION 4 — LOCAL CONVEYANCE ════ */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 4 &mdash; Local Conveyance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Local taxi, CNG auto, Uber/ride-sharing, or boat trips
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Subtotal: ৳ {localConveyanceSubtotal.toLocaleString()}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Budget Line</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Start</th>
                  <th className="p-3">End</th>
                  <th className="p-3">From</th>
                  <th className="p-3">To</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Amount (BDT)</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.localConveyanceItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 dark:hover:bg-zinc-800/40 transition">
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.budgetLine}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'budgetLine', e.target.value)}
                        className="w-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="date"
                        disabled={readOnly}
                        value={item.date}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'date', e.target.value)}
                        className="w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.start}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'start', e.target.value)}
                        className="w-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.end}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'end', e.target.value)}
                        className="w-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.from}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'from', e.target.value)}
                        placeholder="Origin"
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.to}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'to', e.target.value)}
                        placeholder="Destination"
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.mode}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'mode', e.target.value)}
                        placeholder="Auto/CNG/Uber"
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.amount || ''}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'amount', Number(e.target.value))}
                        className="w-28 text-right font-mono font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      />
                    </td>
                    {!readOnly && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLocalConveyanceRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {(formData.localConveyanceItems || []).length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No local conveyance rows added. Click &quot;+ Add Row&quot; below to add local travel expenses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={addLocalConveyanceRow}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ ADD CONVEYANCE ROW</span>
            </button>
          )}
        </section>

        {/* ════ SECTION 5 — PROGRAM EXPENSES ════ */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 5 &mdash; Program &amp; Event Expenses
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stationery, workshop materials, venue rentals, and emergency project costs
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Subtotal: ৳ {programExpensesSubtotal.toLocaleString()}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">Budget Line</th>
                  <th className="p-3 text-center">Unit</th>
                  <th className="p-3 text-right">Unit Cost</th>
                  <th className="p-3 text-right">Total (BDT)</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.programExpenseItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-50/20 dark:hover:bg-zinc-800/40 transition">
                    <td className="p-2.5">
                      <input
                        type="date"
                        disabled={readOnly}
                        value={item.date}
                        onChange={(e) => updateProgramExpenseRow(idx, 'date', e.target.value)}
                        className="w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.itemDescription}
                        onChange={(e) => updateProgramExpenseRow(idx, 'itemDescription', e.target.value)}
                        placeholder="e.g. Training Handouts, Banners"
                        className="w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.budgetLine}
                        onChange={(e) => updateProgramExpenseRow(idx, 'budgetLine', e.target.value)}
                        className="w-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.unit || ''}
                        onChange={(e) => updateProgramExpenseRow(idx, 'unit', Number(e.target.value))}
                        className="w-16 text-center font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.unitCost || ''}
                        onChange={(e) => updateProgramExpenseRow(idx, 'unitCost', Number(e.target.value))}
                        className="w-28 text-right font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳ {item.total?.toLocaleString()}
                    </td>
                    {!readOnly && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeProgramExpenseRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {(formData.programExpenseItems || []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No program expense rows added. Click &quot;+ Add Row&quot; below to add program expenses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={addProgramExpenseRow}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ ADD PROGRAM EXPENSE ROW</span>
            </button>
          )}
        </section>



        {/* ════ EXPENSE SUMMARY & TOTAL BANNER (COMPACT SIZING) ════ */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Consolidated Expense Summary
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Itemized breakdown across all five travel and operational categories
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
              5 Categories
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Long Travel
              </span>
              <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">
                ৳ {longTravelSubtotal.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Accommodation
              </span>
              <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">
                ৳ {accommodationSubtotal.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Per Diem &amp; Meals
              </span>
              <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">
                ৳ {perDiemSubtotal.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Local Conveyance
              </span>
              <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">
                ৳ {localConveyanceSubtotal.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Program Expenses
              </span>
              <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">
                ৳ {programExpensesSubtotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Compact Slim Grand Total Banner */}
          <div className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-600/15 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2 min-w-0">
              <Sparkles className="h-4 w-4 text-blue-200 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-blue-100 truncate">
                TOTAL ADVANCE REQUISITION AMOUNT
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-black font-mono tracking-tight text-white flex-shrink-0">
              ৳ {totalAmount.toLocaleString()}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
