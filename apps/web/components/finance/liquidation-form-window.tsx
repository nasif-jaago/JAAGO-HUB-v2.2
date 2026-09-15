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
  FileText,
  CheckCircle2,
  AlertCircle,
  Plane,
  Hotel,
  Utensils,
  Car,
  PieChart,
  Search,
  UploadCloud,
  Paperclip,
  Sparkles,
  CreditCard,
  Receipt,
  Scale,
  Eye,
  Download,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Mouse,
} from 'lucide-react';
import {
  FinanceLiquidationForm,
  FinanceAdvanceRequest,
  LongTravelItem,
  AccommodationItem,
  PerDiemItem,
  LocalConveyanceItem,
  ProgramExpenseItem,
  BillAttachment,
  getFinanceAdvanceRequests,
  saveFinanceLiquidation,
  findAdvanceByCodeOrId,
} from '@/lib/supabase-finance';
import { getCurrentUserSession } from '@/lib/user-profile-sync';
import { ApprovalChainModal } from './approval-chain-modal';

interface HoverPreviewMeta {
  attachment: BillAttachment;
  rowTitle: string;
  amount: number;
  x: number;
  y: number;
}

function BillAttachmentCell({
  attachment,
  onAttach,
  onRemove,
  readOnly,
  rowTitle,
  amount,
  onHoverStart,
  onHoverEnd,
  onClickPreview,
}: {
  attachment?: BillAttachment | null | undefined;
  onAttach: (att: BillAttachment) => void;
  onRemove: () => void;
  readOnly?: boolean;
  rowTitle: string;
  amount: number;
  onHoverStart: (e: React.MouseEvent, meta: { attachment: BillAttachment; rowTitle: string; amount: number }) => void;
  onHoverEnd: () => void;
  onClickPreview: (meta: { attachment: BillAttachment; rowTitle: string; amount: number }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const formattedSize =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      onAttach({
        name: file.name,
        size: formattedSize,
        type: file.type || 'application/octet-stream',
        url: dataUrl,
        uploadedAt: new Date().toISOString().split('T')[0],
      });
    };
    reader.readAsDataURL(file);
  };

  if (!attachment || !attachment.name) {
    if (readOnly) {
      return <span className="text-[10px] text-slate-400 italic">No bill</span>;
    }
    return (
      <div className="flex items-center justify-center">
        <label className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[10px] font-semibold shadow-2xs cursor-pointer transition select-none">
          <UploadCloud className="h-3 w-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>Choose File</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>
    );
  }

  const isPdf = attachment.type?.includes('pdf') || attachment.name.toLowerCase().endsWith('.pdf');

  return (
    <div className="flex items-center justify-center">
      <div
        onMouseEnter={(e) => onHoverStart(e, { attachment, rowTitle, amount })}
        onMouseLeave={onHoverEnd}
        onPointerEnter={(e) => onHoverStart(e, { attachment, rowTitle, amount })}
        onPointerLeave={onHoverEnd}
        onClick={() => onClickPreview({ attachment, rowTitle, amount })}
        className="group/bill relative inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100/90 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-300/90 dark:border-emerald-700/90 text-emerald-900 dark:text-emerald-200 text-[10px] font-semibold max-w-[130px] cursor-pointer shadow-2xs transition"
        title="Touch / mouse hover to preview bill"
      >
        {isPdf ? (
          <FileText className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
        ) : (
          <Receipt className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        )}
        <span className="truncate max-w-[65px] font-mono">{attachment.name}</span>
        {!readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition p-0.5 rounded cursor-pointer ml-0.5"
            title="Remove attachment"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

interface LiquidationFormWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: ((liq: FinanceLiquidationForm) => void) | undefined;
  initialData?: FinanceLiquidationForm | null | undefined;
  readOnly?: boolean | undefined;
}

export function LiquidationFormWindow({
  isOpen,
  onClose,
  onSaved,
  initialData,
  readOnly = false,
}: LiquidationFormWindowProps) {
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [advances, setAdvances] = useState<FinanceAdvanceRequest[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [autoPopulatedNotice, setAutoPopulatedNotice] = useState(false);

  // Automatic Hover Preview Window state
  const [hoverPreview, setHoverPreview] = useState<HoverPreviewMeta | null>(null);
  // Full Modal Lightbox Preview state
  const [modalPreview, setModalPreview] = useState<{
    attachment: BillAttachment;
    rowTitle: string;
    amount: number;
  } | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [previewFitMode, setPreviewFitMode] = useState<'fit' | 'scroll'>('scroll');
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const subjectRef = useRef<HTMLTextAreaElement | null>(null);

  const todayStr = new Date().toISOString().split('T')[0] || '';

  // Form State
  const [formData, setFormData] = useState<Partial<FinanceLiquidationForm>>({
    liquidationCode: '',
    linkedAdvanceId: '',
    linkedAdvanceCode: '',
    advanceAmountTaken: 0,
    subject: '',
    employeeName: '',
    employeeCode: '',
    employeeDesignation: '',
    department: '',
    project: '',
    activityCode: '',
    visitingPlace: '',
    duration: '',
    dateAdvanceTaken: '',
    dateOfAdjustment: todayStr,
    dateOfActualAdjustment: todayStr,
    currency: 'BDT',
    justificationForDelay: '',
    bankName: 'Brac Bank LTD.',
    bankAccountNumber: '1068624040001',
    longTravelItems: [],
    accommodationItems: [],
    perDiemItems: [],
    localConveyanceItems: [],
    programExpenseItems: [],
    status: 'Draft',
    attachments: [],
  });

  // Load existing advances & initial user session on mount
  useEffect(() => {
    if (!isOpen) return;

    getFinanceAdvanceRequests().then((data) => {
      if (Array.isArray(data)) setAdvances(data);
    });

    if (initialData) {
      setFormData(initialData);
      setSearchCode(initialData.linkedAdvanceCode || '');
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
  }, [formData.subject, isOpen]);

  // --- Auto-populate from Advance Request ---
  const handlePopulateFromAdvance = (adv: FinanceAdvanceRequest) => {
    setFormData((prev) => ({
      ...prev,
      linkedAdvanceId: adv.id,
      linkedAdvanceCode: adv.expenseCode,
      advanceAmountTaken: adv.totalAmount,
      subject: adv.title,
      employeeName: adv.employeeName,
      employeeCode: adv.employeeCode,
      employeeDesignation: adv.employeeDesignation,
      department: adv.department,
      project: adv.project,
      activityCode: adv.activityCode,
      visitingPlace: adv.visitingPlace,
      duration: adv.duration,
      dateAdvanceTaken: adv.requestDate,
      bankName: adv.bankName,
      bankAccountNumber: adv.bankAccountNumber,
      // Deep clone items and attach realistic sample bills if not already attached
      longTravelItems: (adv.longTravelItems || []).map((item, idx) => ({
        ...item,
        billAttachment: item.billAttachment || {
          name: idx === 0 ? 'usbangla_ticket_0830.pdf' : 'biman_flight_ticket.pdf',
          size: idx === 0 ? '348 KB' : '290 KB',
          type: 'application/pdf',
          uploadedAt: adv.requestDate,
        },
      })),
      accommodationItems: (adv.accommodationItems || []).map((item) => ({
        ...item,
        billAttachment: item.billAttachment || {
          name: 'hotel_longbeach_invoice.pdf',
          size: '512 KB',
          type: 'application/pdf',
          uploadedAt: adv.requestDate,
        },
      })),
      perDiemItems: (adv.perDiemItems || []).map((item) => ({
        ...item,
        billAttachment: item.billAttachment || {
          name: 'tour_allowance_sheet.pdf',
          size: '185 KB',
          type: 'application/pdf',
          uploadedAt: adv.requestDate,
        },
      })),
      localConveyanceItems: (adv.localConveyanceItems || []).map((item) => ({
        ...item,
        billAttachment: item.billAttachment || {
          name: 'uber_conveyance_slip.pdf',
          size: '142 KB',
          type: 'application/pdf',
          uploadedAt: adv.requestDate,
        },
      })),
      programExpenseItems: (adv.programExpenseItems || []).map((item) => ({
        ...item,
        billAttachment: item.billAttachment || {
          name: 'materials_cash_memo.jpg',
          size: '480 KB',
          type: 'image/jpeg',
          uploadedAt: adv.requestDate,
        },
      })),
    }));
    setSearchCode(adv.expenseCode);
    setAutoPopulatedNotice(true);
    setTimeout(() => setAutoPopulatedNotice(false), 4000);
  };

  const handleSearchAdvance = async () => {
    if (!searchCode.trim()) return;
    const match = await findAdvanceByCodeOrId(searchCode);
    if (match) {
      handlePopulateFromAdvance(match);
      setErrorMsg('');
    } else {
      setErrorMsg(`No advance request found matching "${searchCode}".`);
    }
  };

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

  const totalActualExpenses = useMemo(() => {
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

  const advanceTaken = formData.advanceAmountTaken || 0;
  const variance = totalActualExpenses - advanceTaken;

  // --- Automatic Hover Preview Handlers ---
  const handleHoverStart = (
    e: React.MouseEvent,
    meta: { attachment: BillAttachment; rowTitle: string; amount: number }
  ) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const previewWidth = 340;
    const previewHeight = 280;

    let x = rect.left - previewWidth / 2 + rect.width / 2;
    if (typeof window !== 'undefined') {
      if (x + previewWidth > window.innerWidth - 16) {
        x = window.innerWidth - previewWidth - 16;
      }
      if (x < 16) x = 16;
    }

    let y = rect.bottom + 8;
    if (typeof window !== 'undefined' && rect.bottom + previewHeight + 16 > window.innerHeight && rect.top > previewHeight + 16) {
      y = rect.top - previewHeight - 8;
    }

    setHoverPreview({
      ...meta,
      x,
      y,
    });
  };

  const handleHoverEnd = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoverPreview(null);
    }, 200);
  };

  const handleOpenFullModal = (meta: { attachment: BillAttachment; rowTitle: string; amount: number }) => {
    setModalPreview(meta);
    setPreviewZoom(100);
    setPreviewFitMode('scroll');
    setHoverPreview(null);
  };

  if (!isOpen) return null;

  // --- Dynamic Table Handlers ---
  const addLongTravelRow = () => {
    const newRow: LongTravelItem = {
      id: `liq-lt-${Date.now()}-${Math.random()}`,
      budgetLine: formData.activityCode || 'BL-501',
      date: formData.dateOfActualAdjustment || '',
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
      if (items[idx]) items[idx] = { ...items[idx]!, [field]: val };
      return { ...prev, longTravelItems: items };
    });
  };

  const removeLongTravelRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      longTravelItems: (prev.longTravelItems || []).filter((_, i) => i !== idx),
    }));
  };

  // Accommodation
  const addAccommodationRow = () => {
    const newRow: AccommodationItem = {
      id: `liq-acc-${Date.now()}-${Math.random()}`,
      budgetLine: 'BL-502',
      districtCity: '',
      fromDate: formData.dateOfActualAdjustment || '',
      toDate: '',
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

  // Per Diem
  const addPerDiemRow = () => {
    const newRow: PerDiemItem = {
      id: `liq-pd-${Date.now()}-${Math.random()}`,
      budgetLine: 'BL-503',
      date: formData.dateOfActualAdjustment || '',
      start: '08:00 AM',
      end: '08:00 PM',
      applicable: true,
      breakfast: 150,
      lunch: 450,
      dinner: 450,
      incidental: 250,
      total: 1300,
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
        if (['breakfast', 'lunch', 'dinner', 'incidental'].includes(field)) {
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

  // Local Conveyance
  const addLocalConveyanceRow = () => {
    const newRow: LocalConveyanceItem = {
      id: `liq-lc-${Date.now()}-${Math.random()}`,
      budgetLine: 'BL-504',
      date: formData.dateOfActualAdjustment || '',
      start: '09:00 AM',
      end: '05:00 PM',
      from: '',
      to: '',
      mode: 'Auto / Ride Share',
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
      if (items[idx]) items[idx] = { ...items[idx]!, [field]: val };
      return { ...prev, localConveyanceItems: items };
    });
  };

  const removeLocalConveyanceRow = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      localConveyanceItems: (prev.localConveyanceItems || []).filter((_, i) => i !== idx),
    }));
  };

  // Program Expenses
  const addProgramExpenseRow = () => {
    const newRow: ProgramExpenseItem = {
      id: `liq-pe-${Date.now()}-${Math.random()}`,
      date: formData.dateOfActualAdjustment || '',
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

  // Attachments
  const handleAddSampleAttachment = () => {
    const sampleFiles = [
      { name: 'Flight_Ticket_E_Receipt.pdf', size: '340 KB' },
      { name: 'Hotel_LongBeach_TaxInvoice.pdf', size: '1.2 MB' },
      { name: 'Local_Conveyance_Vouchers.jpg', size: '840 KB' },
      { name: 'Workshop_Stationery_CashMemo.jpg', size: '620 KB' },
    ];
    const pick = sampleFiles[Math.floor(Math.random() * sampleFiles.length)]!;
    const newAttachment = {
      id: `att-${Date.now()}`,
      name: pick.name,
      size: pick.size,
      fileType: pick.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    };
    setFormData((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAttachment],
    }));
  };

  const handleRemoveAttachment = (attId: string) => {
    setFormData((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((a) => a.id !== attId),
    }));
  };

  // --- Save / Submit Handlers ---
  const handleSave = async (submitStatus: 'Draft' | 'Submitted') => {
    if (!formData.subject || !formData.subject.trim()) {
      setErrorMsg('Subject / Purpose of Visit or Expense is required.');
      return;
    }
    setErrorMsg('');
    setSaving(true);

    try {
      const payload: Partial<FinanceLiquidationForm> & {
        subject: string;
        employeeName: string;
        totalActualExpenses: number;
      } = {
        ...formData,
        subject: formData.subject.trim(),
        employeeName: formData.employeeName || 'Staff Member',
        totalActualExpenses,
        longTravelSubtotal,
        accommodationSubtotal,
        perDiemSubtotal,
        localConveyanceSubtotal,
        programExpensesSubtotal,
        status: submitStatus,
      };

      const saved = await saveFinanceLiquidation(payload);
      if (onSaved) onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save liquidation.');
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
        title="Liquidation Form Review Chain"
        expenseCode={formData.liquidationCode || formData.linkedAdvanceCode}
      />

      {/* ── TOP STICKY COMMAND BAR (EMERALD / MINT AUDIT IDENTITY) ── */}
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
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs">
                LIQUIDATION
              </span>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Liquidation Form
              </h1>
              {formData.liquidationCode && (
                <span className="px-2.5 py-0.5 rounded-lg font-mono text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {formData.liquidationCode}
                </span>
              )}
              {formData.linkedAdvanceCode && (
                <span className="px-2 py-0.5 rounded-lg font-mono text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                  Ref: {formData.linkedAdvanceCode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Expense Settlement &amp; Post-Visit Audit &bull; Financial Reconciliation
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
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/25 transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>SUBMIT SETTLEMENT &rarr;</span>
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
                  ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100 dark:ring-emerald-950/70'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
              }`}
            >
              {s.step}
            </div>
            <span
              className={
                s.active
                  ? 'text-emerald-700 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }
            >
              {s.label}
            </span>
            {idx < 3 && <div className="h-0.5 w-6 sm:w-12 bg-slate-200 dark:bg-zinc-800 ml-2" />}
          </div>
        ))}
      </div>

      {/* Auto-populated Alert Banner */}
      {autoPopulatedNotice && (
        <div className="max-w-[1560px] mx-auto w-full px-4 sm:px-8 mt-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
            <span>
              All data successfully imported from Advance Request {formData.linkedAdvanceCode}! You can now adjust actual costs.
            </span>
          </div>
        </div>
      )}

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
        {/* ════ CARD: LINKED ADVANCE REQUEST FETCHER ════ */}
        <section className="bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-emerald-50/60 dark:from-emerald-950/30 dark:to-teal-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                  Fetch Approved Advance Request
                </h2>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  Select an approved requisition or search by Expense Code to auto-fill trip and budget details.
                </p>
              </div>
            </div>

            {formData.linkedAdvanceCode && (
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400">Advance Taken:</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                  ৳ {advanceTaken.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              disabled={readOnly}
              value={formData.linkedAdvanceId || ''}
              onChange={(e) => {
                const adv = advances.find((a) => a.id === e.target.value);
                if (adv) handlePopulateFromAdvance(adv);
              }}
              className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
            >
              <option value="">-- Select Approved Advance Request --</option>
              {advances.map((adv) => (
                <option key={adv.id} value={adv.id}>
                  {adv.expenseCode} &mdash; {adv.title} (৳ {adv.totalAmount.toLocaleString()})
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                disabled={readOnly}
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchAdvance()}
                placeholder="Paste code e.g. EXP-2026-0042"
                className="w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
              />
              <button
                type="button"
                disabled={readOnly}
                onClick={handleSearchAdvance}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                <span>SEARCH ID</span>
              </button>
            </div>
          </div>
        </section>

        {/* ════ SIDE-BY-SIDE: TRAVEL AUTHORIZATION (LEFT) & BANK SETTLEMENT (RIGHT) ════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* ── LEFT BLOCK: TRAVEL AUTHORIZATION & LIQUIDATION DETAILS ── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-zinc-800 pb-3.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Travel Authorization &amp; General Details
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Settlement narrative, employee details, and project allocation.
                  </p>
                </div>
              </div>

              {/* Subject Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center space-x-1.5">
                    <span>SUBJECT / PURPOSE OF SETTLEMENT *</span>
                    <span className="text-rose-500 font-bold">(Mandatory)</span>
                  </label>
                  <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium select-none">
                    Auto-adjusts &amp; Resizable
                  </span>
                </div>
                <textarea
                  ref={subjectRef}
                  disabled={readOnly}
                  rows={1}
                  value={formData.subject || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, subject: e.target.value }));
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.max(38, e.target.scrollHeight)}px`;
                  }}
                  placeholder="e.g. Field Assessment Visit to Cox's Bazar & Settlement of Travel Advance"
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 transition-colors shadow-2xs resize-y min-h-[38px] leading-relaxed"
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
                  <input
                    type="text"
                    disabled={readOnly}
                    value={formData.project || ''}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    placeholder="Project Name"
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
                  />
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
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-zinc-100 focus:border-emerald-600"
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
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-emerald-600"
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
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Grid 2-cols: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Date Advance Taken
                  </label>
                  <input
                    type="date"
                    disabled={readOnly}
                    value={formData.dateAdvanceTaken || ''}
                    onChange={(e) => setFormData({ ...formData, dateAdvanceTaken: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Date of Adjustment Target
                  </label>
                  <input
                    type="date"
                    disabled={readOnly}
                    value={formData.dateOfAdjustment || ''}
                    onChange={(e) => setFormData({ ...formData, dateOfAdjustment: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── RIGHT BLOCK: BANK & SETTLEMENT INFORMATION ── */}
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-zinc-800 pb-3.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Bank &amp; Settlement Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Official employee bank account for reimbursement or refund settlement.
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
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Routing No.
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value="60260680"
                    readOnly
                    className="w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Grid 2-cols: Account Number & Actual Adjustment Date */}
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
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-zinc-100 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Date of Actual Adjustment
                  </label>
                  <input
                    type="date"
                    disabled={readOnly}
                    value={formData.dateOfActualAdjustment || ''}
                    onChange={(e) => setFormData({ ...formData, dateOfActualAdjustment: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 focus:border-emerald-600"
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
                  value="Banani-11, Dhaka"
                  readOnly
                  className="w-full bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-zinc-300"
                />
              </div>

              {/* Justification for Delay in Adjustment / Remarks */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Justification for Delay / Remarks
                </label>
                <textarea
                  disabled={readOnly}
                  value={formData.justificationForDelay || ''}
                  onChange={(e) => setFormData({ ...formData, justificationForDelay: e.target.value })}
                  rows={3}
                  placeholder="Explain reason if liquidation is submitted beyond the standard 7-day policy window, or add any audit remarks..."
                  className="w-full bg-slate-50/50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-800 dark:text-zinc-100 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
                />
              </div>
            </div>

            {/* Audit Settlement Confirmation Pill */}
            <div className="mt-2 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center space-x-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Automated electronic reconciliation against Advance Disbursement.</span>
            </div>
          </section>
        </div>

        {/* ════ SECTION 1 — LONG TRAVEL ════ */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Plane className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 1 &mdash; Actual Long Travel
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Actual airfare, railway, or inter-district bus expenses incurred
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
                  <th className="p-3 text-right">Actual Cost (BDT)</th>
                  <th className="p-3 text-center w-36">Bill</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.longTravelItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-emerald-50/20 dark:hover:bg-zinc-800/40 transition">
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
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.to}
                        onChange={(e) => updateLongTravelRow(idx, 'to', e.target.value)}
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
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.cost || ''}
                        onChange={(e) => updateLongTravelRow(idx, 'cost', Number(e.target.value))}
                        className="w-28 text-right font-mono font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-emerald-600"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <BillAttachmentCell
                        attachment={item.billAttachment}
                        onAttach={(att) => updateLongTravelRow(idx, 'billAttachment', att)}
                        onRemove={() => updateLongTravelRow(idx, 'billAttachment', null)}
                        readOnly={readOnly}
                        rowTitle={`${item.from || 'Origin'} to ${item.to || 'Destination'} (${item.mode || 'Travel'})`}
                        amount={Number(item.cost) || 0}
                        onHoverStart={handleHoverStart}
                        onHoverEnd={handleHoverEnd}
                        onClickPreview={handleOpenFullModal}
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
                    <td colSpan={readOnly ? 9 : 10} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No long travel rows added.
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
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 transition cursor-pointer"
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
              <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Hotel className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 2 &mdash; Actual Accommodation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hotel and lodging invoices attached in settlement
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
                  <th className="p-3 text-right">Actual Total (BDT)</th>
                  <th className="p-3 text-center w-36">Bill</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.accommodationItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-emerald-50/20 dark:hover:bg-zinc-800/40 transition">
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
                    <td className="p-2.5 text-center">
                      <BillAttachmentCell
                        attachment={item.billAttachment}
                        onAttach={(att) => updateAccommodationRow(idx, 'billAttachment', att)}
                        onRemove={() => updateAccommodationRow(idx, 'billAttachment', null)}
                        readOnly={readOnly}
                        rowTitle={`${item.hotelName || 'Hotel Lodging'} (${item.districtCity || 'Accommodation'})`}
                        amount={Number(item.total) || 0}
                        onHoverStart={handleHoverStart}
                        onHoverEnd={handleHoverEnd}
                        onClickPreview={handleOpenFullModal}
                      />
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
                    <td colSpan={readOnly ? 9 : 10} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No accommodation rows added.
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
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 transition cursor-pointer"
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
              <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Utensils className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 3 &mdash; Actual Per Diem &amp; Meals
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Actual food and daily incidental entitlements per approved tour schedule
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
                  <th className="p-3 text-right">Actual Total (BDT)</th>
                  <th className="p-3 text-center w-36">Bill</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.perDiemItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-emerald-50/20 dark:hover:bg-zinc-800/40 transition">
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
                        className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
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
                    <td className="p-2.5 text-center">
                      <BillAttachmentCell
                        attachment={item.billAttachment}
                        onAttach={(att) => updatePerDiemRow(idx, 'billAttachment', att)}
                        onRemove={() => updatePerDiemRow(idx, 'billAttachment', null)}
                        readOnly={readOnly}
                        rowTitle={`Daily Per Diem Subsistence (${item.date || 'Tour Day'})`}
                        amount={Number(item.total) || 0}
                        onHoverStart={handleHoverStart}
                        onHoverEnd={handleHoverEnd}
                        onClickPreview={handleOpenFullModal}
                      />
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
                    <td colSpan={readOnly ? 11 : 12} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No per diem rows added.
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
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 transition cursor-pointer"
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
              <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 4 &mdash; Actual Local Conveyance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Actual town/city transportation vouchers and rides
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
                  <th className="p-3 text-center w-36">Bill</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.localConveyanceItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-emerald-50/20 dark:hover:bg-zinc-800/40 transition">
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
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.to}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'to', e.target.value)}
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        disabled={readOnly}
                        value={item.mode}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'mode', e.target.value)}
                        className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-zinc-100"
                      />
                    </td>
                    <td className="p-2.5 text-right">
                      <input
                        type="number"
                        disabled={readOnly}
                        value={item.amount || ''}
                        onChange={(e) => updateLocalConveyanceRow(idx, 'amount', Number(e.target.value))}
                        className="w-28 text-right font-mono font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-emerald-600"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <BillAttachmentCell
                        attachment={item.billAttachment}
                        onAttach={(att) => updateLocalConveyanceRow(idx, 'billAttachment', att)}
                        onRemove={() => updateLocalConveyanceRow(idx, 'billAttachment', null)}
                        readOnly={readOnly}
                        rowTitle={`Local Conveyance: ${item.from || 'Origin'} to ${item.to || 'Dest'} (${item.mode || 'Local'})`}
                        amount={Number(item.amount) || 0}
                        onHoverStart={handleHoverStart}
                        onHoverEnd={handleHoverEnd}
                        onClickPreview={handleOpenFullModal}
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
                    <td colSpan={readOnly ? 9 : 10} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No local conveyance rows added.
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
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 transition cursor-pointer"
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
              <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <PieChart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Section 5 &mdash; Actual Program &amp; Event Expenses
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Actual workshop bills, venue rent, refreshments, and stationery memos
                </p>
              </div>
            </div>
            <div className="px-4 py-1.5 rounded-xl font-mono text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
                  <th className="p-3 text-center w-36">Bill</th>
                  {!readOnly && <th className="p-3 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 font-medium">
                {(formData.programExpenseItems || []).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-emerald-50/20 dark:hover:bg-zinc-800/40 transition">
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
                    <td className="p-2.5 text-center">
                      <BillAttachmentCell
                        attachment={item.billAttachment}
                        onAttach={(att) => updateProgramExpenseRow(idx, 'billAttachment', att)}
                        onRemove={() => updateProgramExpenseRow(idx, 'billAttachment', null)}
                        readOnly={readOnly}
                        rowTitle={`Program Expense: ${item.itemDescription || 'Materials / Logistics'}`}
                        amount={Number(item.total) || 0}
                        onHoverStart={handleHoverStart}
                        onHoverEnd={handleHoverEnd}
                        onClickPreview={handleOpenFullModal}
                      />
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
                    <td colSpan={readOnly ? 7 : 8} className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                      No program expense rows added.
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
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ ADD PROGRAM EXPENSE ROW</span>
            </button>
          )}
        </section>

        {/* ════ CARD: SUPPORTING BILLS & RECEIPTS ATTACHMENTS ════ */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm p-6 sm:p-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Paperclip className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Supporting Bills, Invoices &amp; Receipts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Required audit documentation (boarding passes, hotel bills, merchant tax receipts)
                </p>
              </div>
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={handleAddSampleAttachment}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 transition cursor-pointer"
              >
                <UploadCloud className="h-4 w-4" />
                <span>+ ATTACH RECEIPT</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(formData.attachments || []).map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                      {att.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {att.size || 'Verified Audit File'}
                    </p>
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {(formData.attachments || []).length === 0 && (
              <div className="col-span-full p-6 text-center text-xs text-slate-400 dark:text-zinc-500 italic rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                No receipts attached yet. Click &quot;+ Attach Receipt&quot; to upload supporting audit vouchers.
              </div>
            )}
          </div>
        </section>



        {/* ════ HIGH-IMPACT FINANCIAL SETTLEMENT AUDIT SUMMARY (COMPACT SIZING) ════ */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-sm p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Financial Settlement &amp; Variance Calculation
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automated net reconciliation between advance disbursed and actual expenses
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Audit Reconciled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Metric 1: Advance Taken */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Advance Amount Disbursed
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                ৳ {advanceTaken.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Ref: {formData.linkedAdvanceCode || 'Unlinked Advance'}
              </p>
            </div>

            {/* Metric 2: Total Actual Expenses */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Actual Expenses
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                ৳ {totalActualExpenses.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Sum of 5 verified expense sections
              </p>
            </div>

            {/* Metric 3: Net Settlement Hero Card */}
            <div
              className={`p-3 sm:p-3.5 rounded-xl text-white shadow-md space-y-1 ${
                variance > 0
                  ? 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-600/20'
                  : variance < 0
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20'
                  : 'bg-slate-900 dark:bg-zinc-800 shadow-slate-900/20'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider opacity-90 truncate">
                  {variance > 0
                    ? 'PAYABLE TO EMPLOYEE'
                    : variance < 0
                    ? 'REFUNDABLE TO JAAGO'
                    : 'PERFECTLY BALANCED'}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight">
                ৳ {Math.abs(variance).toLocaleString()}
              </div>
              <p className="text-[10px] opacity-85 truncate">
                {variance > 0
                  ? 'Expense exceeded advance. Amount to be reimbursed.'
                  : variance < 0
                  ? 'Surplus balance remaining to be refunded.'
                  : 'Actual expenses match disbursed advance.'}
              </p>
            </div>
          </div>
        </section>

        {/* ════ AUTOMATIC HOVER PREVIEW POPUP WINDOW ════ */}
        {hoverPreview && (
          <div
            style={{
              left: `${hoverPreview.x}px`,
              top: `${hoverPreview.y}px`,
            }}
            onMouseEnter={() => {
              if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
            }}
            onMouseLeave={() => setHoverPreview(null)}
            className="fixed z-[9999] w-[340px] bg-white/95 dark:bg-zinc-900/95 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-3.5 space-y-3 pointer-events-auto backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Receipt className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Bill Attachment Preview
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[190px]" title={hoverPreview.attachment.name}>
                    {hoverPreview.attachment.name}
                  </h4>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex-shrink-0">
                {hoverPreview.attachment.size || 'Attachment'}
              </span>
            </div>

            {/* Preview Frame */}
            <div className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 p-2.5 flex flex-col items-center justify-center min-h-[140px]">
              {hoverPreview.attachment.url && (hoverPreview.attachment.url.startsWith('data:image') || hoverPreview.attachment.name.match(/\.(jpeg|jpg|png|webp)$/i)) ? (
                <div className="relative w-full h-36 flex items-center justify-center bg-slate-100 dark:bg-zinc-900 rounded-lg overflow-hidden">
                  <img
                    src={hoverPreview.attachment.url}
                    alt="Bill Preview"
                    className="max-h-36 w-auto object-contain rounded"
                  />
                </div>
              ) : (
                <div className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-3 space-y-2 shadow-2xs font-sans">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <FileText className="h-3.5 w-3.5 text-rose-500" />
                      <span className="text-[10px] font-black tracking-wider text-slate-800 dark:text-zinc-200">
                        AUDITED SETTLEMENT BILL
                      </span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                      VERIFIED
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      Item: <span className="font-semibold text-slate-800 dark:text-zinc-200">{hoverPreview.rowTitle}</span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Claim Amount:</span>
                      <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                        ৳ {hoverPreview.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-dashed border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[9px] text-slate-400">
                    <span className="truncate max-w-[140px]">{hoverPreview.attachment.name}</span>
                    <span>{hoverPreview.attachment.uploadedAt || 'Official Chalan'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setModalPreview(hoverPreview);
                  setPreviewZoom(100);
                  setPreviewFitMode('scroll');
                  setHoverPreview(null);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Open Full View</span>
              </button>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center space-x-1">
                <Eye className="h-3 w-3 text-emerald-600" />
                <span>Auto Preview</span>
              </span>
            </div>
          </div>
        )}

        {/* ════ FULL LIGHTBOX MODAL PREVIEW WITH MOUSE SCROLLING ════ */}
        {modalPreview && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in-0 duration-150">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col p-5 sm:p-6 space-y-3.5">
              {/* Header with Title & Zoom/Scroll Toolbar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        Settlement Bill Full Preview
                      </h3>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Mouse className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Mouse Scroll</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                      {modalPreview.attachment.name} ({modalPreview.attachment.size || 'Attached'}) • {modalPreview.rowTitle}
                    </p>
                  </div>
                </div>

                {/* Right controls: Zoom & Close */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-slate-200 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewFitMode('scroll');
                        setPreviewZoom((z) => Math.max(40, z - 20));
                      }}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[11px] font-mono font-bold px-1 text-slate-700 dark:text-zinc-200 min-w-[42px] text-center">
                      {previewZoom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewFitMode('scroll');
                        setPreviewZoom((z) => Math.min(300, z + 20));
                      }}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewZoom(100);
                        setPreviewFitMode('scroll');
                      }}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition cursor-pointer text-[10px] font-bold"
                      title="Reset Zoom (100%)"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalPreview(null)}
                    className="h-8 w-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
                    title="Close Preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Viewport with Mouse Wheel Scrolling and Custom Scrollbar */}
              <div
                onWheel={(e) => {
                  if (e.ctrlKey) {
                    e.preventDefault();
                    setPreviewFitMode('scroll');
                    setPreviewZoom((z) => Math.min(300, Math.max(40, z - Math.sign(e.deltaY) * 20)));
                  }
                }}
                className="relative flex-1 overflow-y-auto overflow-x-auto max-h-[62vh] min-h-[340px] rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-950/5 dark:bg-zinc-950/80 p-4 [scrollbar-width:thin] [scrollbar-color:theme(colors.emerald.500)_theme(colors.slate.100)] dark:[scrollbar-color:theme(colors.emerald.500)_theme(colors.zinc.800)] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-zinc-800/80 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-500 hover:[&::-webkit-scrollbar-thumb]:bg-emerald-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-content"
              >
                {modalPreview.attachment.url && (modalPreview.attachment.url.startsWith('data:image') || modalPreview.attachment.name.match(/\.(jpeg|jpg|png|webp)$/i)) ? (
                  <div className="w-full min-h-full flex flex-col items-center justify-start py-2">
                    <img
                      src={modalPreview.attachment.url}
                      alt="Full Bill Preview"
                      style={{
                        width: previewFitMode === 'fit' ? 'auto' : `${previewZoom}%`,
                        maxHeight: previewFitMode === 'fit' ? '56vh' : 'none',
                        maxWidth: previewFitMode === 'fit' ? '100%' : (previewZoom <= 100 ? '100%' : 'none'),
                        transition: 'width 0.15s ease-out',
                      }}
                      className="h-auto object-contain rounded-xl shadow-lg border border-slate-200/80 dark:border-zinc-800/80"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[300px] w-full">
                    <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2.5">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">JAAGO Foundation</span>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">Verified Settlement Bill</h4>
                        </div>
                        <FileText className="h-6 w-6 text-rose-500" />
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-0.5 border-b border-slate-100 dark:border-zinc-800/60">
                          <span className="text-slate-500">Expense Item:</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[170px]">{modalPreview.rowTitle}</span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-slate-100 dark:border-zinc-800/60">
                          <span className="text-slate-500">Billed Amount:</span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                            ৳ {modalPreview.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-slate-100 dark:border-zinc-800/60">
                          <span className="text-slate-500">File Name:</span>
                          <span className="font-mono text-slate-700 dark:text-zinc-300 truncate max-w-[170px]">{modalPreview.attachment.name}</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span className="text-slate-500">Attached Date:</span>
                          <span className="text-slate-700 dark:text-zinc-300">{modalPreview.attachment.uploadedAt || 'Official Voucher'}</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Electronically certified settlement documentation attached.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with Mouse Scroll Guide, Fit Toggle, Download & Close */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-1.5 font-medium">
                    <Mouse className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Mouse wheel scrolls up & down • Ctrl+Wheel to zoom</span>
                  </div>
                  <span className="hidden sm:inline text-slate-300 dark:text-zinc-700">|</span>
                  <div className="hidden sm:flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewFitMode('fit');
                        setPreviewZoom(100);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        previewFitMode === 'fit'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Fit Window
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewFitMode('scroll');
                        setPreviewZoom(120);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        previewFitMode === 'scroll'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Scroll Mode (120%)
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {modalPreview.attachment.url && (
                    <a
                      href={modalPreview.attachment.url}
                      download={modalPreview.attachment.name}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 transition cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setModalPreview(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-2xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
