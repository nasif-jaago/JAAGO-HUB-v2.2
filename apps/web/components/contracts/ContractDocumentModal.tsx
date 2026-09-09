'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Printer,
  FileCheck,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { EmploymentContractVersion } from '@/lib/contracts-engine';
import { FullEmployeeProfile } from '@/lib/supabase-employees';
import { formatDisplayDate } from '@/lib/date-format';

interface ContractDocumentModalProps {
  contract: EmploymentContractVersion | null;
  employeeProfile?: FullEmployeeProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export type DocumentLayoutType =
  | 'letterhead_contract'
  | 'detailed_clauses'
  | 'letter_of_increment';

export function ContractDocumentModal({
  contract,
  employeeProfile,
  isOpen,
  onClose,
}: ContractDocumentModalProps) {
  const [selectedOrg, setSelectedOrg] = useState<'JAAGO Foundation' | 'JAAGO Foundation Trust'>(
    employeeProfile?.organization?.includes('Trust') || contract?.organization?.includes('Trust')
      ? 'JAAGO Foundation Trust'
      : 'JAAGO Foundation'
  );

  const [documentType, setDocumentType] = useState<DocumentLayoutType>('letterhead_contract');
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(0.88);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-fit calculation based on current viewport container height
  const calculateAutoFitScale = useCallback(() => {
    if (!containerRef.current) return 0.88;
    const availableHeight = containerRef.current.clientHeight;
    // Standard unscaled paper height is ~860px
    const scale = Math.min(1.05, Math.max(0.65, (availableHeight - 20) / 860));
    return Math.round(scale * 100) / 100;
  }, []);

  useEffect(() => {
    if (!isOpen || !isAutoFit) return;

    const handleResize = () => {
      setZoomLevel(calculateAutoFitScale());
    };

    // Calculate initial auto-fit scale
    const t = setTimeout(() => {
      setZoomLevel(calculateAutoFitScale());
    }, 50);

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, isAutoFit, calculateAutoFitScale]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !contract) return null;

  const isTrust = selectedOrg.includes('Trust');

  // Exact live data resolution directly from employee profile with contract fallbacks
  const empName = employeeProfile?.name || contract.employeeName || 'Staff Member';
  const empCode = employeeProfile?.code || contract.employeeCode || 'EMP-000';
  const empDesignation = employeeProfile?.designation || contract.designation || 'Officer';
  const empDepartment = employeeProfile?.department || contract.department || 'Operations';
  const empProject = employeeProfile?.project || contract.project || 'Core Program';
  const empSupervisor =
    employeeProfile?.supervisor || contract.reportingTo || 'Founder / Head of People & Culture';
  const empSchedule =
    employeeProfile?.workingSchedule ||
    contract.workingSchedule ||
    'Full-Time (09:00 AM – 05:00 PM)';

  // Safe numeric wage parsing
  const parseWage = (val: unknown): number => {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };
  const rawWage =
    employeeProfile?.wage ??
    contract.remunerationAmount ??
    employeeProfile?.regularSalary ??
    employeeProfile?.totalCurrentSalary;
  const empWage = parseWage(rawWage);

  const empStartDate = employeeProfile?.joiningDate || contract.startDate || contract.effectiveDate;
  const empEndDate = employeeProfile?.contractEndDate || contract.endDate;
  const empLocation =
    employeeProfile?.workLocation ||
    employeeProfile?.branch ||
    contract.placeOfPosting ||
    'Banani, Dhaka';
  const empNid = employeeProfile?.nid || 'NID-9182371928';
  const empAddress = employeeProfile?.homeAddress || 'Banani, Dhaka, Bangladesh';

  const orgConfig = isTrust
    ? {
        name: 'JAAGO Foundation Trust',
        displayName: 'JAAGO FOUNDATION TRUST',
        motto: 'Breaking the Cycle of Poverty through Education and Rebuilding Our Nation',
        regNo: 'Registered with NGO Affairs Bureau Bangladesh, No: 3229',
        address: 'House# 57, Road# 7B, Block# H, Banani, Dhaka-1213, Bangladesh',
        email: 'info@jaagotrust.org.bd',
        web: 'www.jaagotrust.org.bd',
        mobile: '+88 01766 66 66 54',
        signatoryName: 'Farhana Aziz',
        signatoryTitle: 'Department Head, People & Culture',
      }
    : {
        name: 'JAAGO Foundation',
        displayName: 'JAAGO FOUNDATION',
        motto: 'Breaking the Cycle of Poverty through Education and Rebuilding Our Nation',
        regNo: 'Registered with NGO Affairs Bureau Bangladesh, No: 3229',
        address: 'House# 57, Road# 7B, Block# H, Banani, Dhaka-1213, Bangladesh',
        email: 'hr@jaago.com.bd',
        web: 'www.jaago.com.bd',
        mobile: '+88 01766 66 66 54',
        signatoryName: 'Farhana Aziz',
        signatoryTitle: 'Department Head, People & Culture',
      };

  const handlePrint = () => {
    window.print();
  };

  const handleZoomIn = () => {
    setIsAutoFit(false);
    setZoomLevel((prev) => Math.min(1.25, Math.round((prev + 0.05) * 100) / 100));
  };

  const handleZoomOut = () => {
    setIsAutoFit(false);
    setZoomLevel((prev) => Math.max(0.55, Math.round((prev - 0.05) * 100) / 100));
  };

  const handleToggleAutoFit = () => {
    setIsAutoFit(true);
    setZoomLevel(calculateAutoFitScale());
  };

  const handleSetPreset = (targetScale: number) => {
    setIsAutoFit(false);
    setZoomLevel(targetScale);
  };

  const formatDateLong = (dateStr?: string | null) => {
    if (!dateStr || dateStr === '-') return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateNumeric = (dateStr?: string | null) => {
    return formatDisplayDate(dateStr);
  };

  const getSalutationName = (fullName?: string | null) => {
    if (!fullName) return 'Colleague';
    const clean = fullName.replace(/\([^)]*\)/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fullName;
    const first = parts[0] || '';
    const second = parts[1] || '';
    if (parts.length > 1 && first && /^(md|mr|ms|mrs|dr|prof|engr)\.?$/i.test(first)) {
      return `${first} ${second}`.trim();
    }
    return first || fullName;
  };

  const formattedRef =
    contract.contractNo ||
    `JAAGO/HR/Contract/${new Date().getFullYear()}/L-${empCode.slice(-4)}`;

  return (
    <>
      {/* ── Global Print Stylesheet for Pristine 1-Page Document Isolation ── */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm 12mm 8mm 12mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Hide everything in the document by default */
          body > * {
            visibility: hidden !important;
          }
          /* Make modal container visible and static */
          #contract-document-modal-overlay {
            visibility: visible !important;
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }
          #contract-document-modal-window {
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border-radius: 0 !important;
          }
          #contract-document-canvas {
            visibility: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            overflow: visible !important;
            display: block !important;
          }
          #contract-document-paper-wrapper {
            visibility: visible !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
          }
          #printable-contract-pad {
            visibility: visible !important;
            padding: 4mm 6mm !important;
            margin: 0 !important;
            min-height: auto !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          #printable-contract-pad * {
            visibility: visible !important;
          }
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      {/* ── Modal Overlay ── */}
      <div
        id="contract-document-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* ── Modal Window Container (Exact size as marked in red) ── */}
        <div
          id="contract-document-modal-window"
          className="relative w-full max-w-4xl h-[92vh] max-h-[880px] bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Top Control Toolbar (Never prints) */}
          <div className="no-print flex-shrink-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-3.5 py-2.5 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
            {/* Employee & Document Info */}
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black flex-shrink-0">
                <FileCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                    Document View
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground font-mono truncate max-w-[150px] sm:max-w-[240px]">
                    Ref: {formattedRef}
                  </span>
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold text-foreground truncate max-w-[220px] sm:max-w-md">
                  {empName} &bull; <span className="font-mono text-amber-500 font-semibold">{empCode}</span>
                </h2>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              {/* Auto-Fit / Zoom Segmented Controls */}
              <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border text-xs">
                <button
                  onClick={handleZoomOut}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={handleToggleAutoFit}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition cursor-pointer flex items-center space-x-1 ${
                    isAutoFit
                      ? 'bg-amber-500/20 text-amber-500 font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Auto-Fit Document to Window Height"
                >
                  <span>{Math.round(zoomLevel * 100)}%</span>
                  {isAutoFit && <span className="text-[9px] uppercase tracking-tighter">(Fit)</span>}
                </button>

                <button
                  onClick={handleZoomIn}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Quick Presets */}
              <div className="hidden sm:flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60 text-[10.5px] font-bold">
                <button
                  onClick={() => handleSetPreset(0.75)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    zoomLevel === 0.75 && !isAutoFit
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  75%
                </button>
                <button
                  onClick={() => handleSetPreset(0.88)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    zoomLevel === 0.88 && !isAutoFit
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  88%
                </button>
                <button
                  onClick={() => handleSetPreset(1.0)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    zoomLevel === 1.0 && !isAutoFit
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  100%
                </button>
              </div>

              {/* Template Format Selector */}
              <div className="flex items-center bg-muted/70 p-0.5 rounded-lg border border-border text-xs font-bold">
                <button
                  onClick={() => setDocumentType('letterhead_contract')}
                  className={`px-2 py-1 rounded-md text-[11px] transition ${
                    documentType === 'letterhead_contract'
                      ? 'bg-card text-amber-500 shadow-2xs font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Standard JAAGO Letterhead Format"
                >
                  Letterhead
                </button>
                <button
                  onClick={() => setDocumentType('letter_of_increment')}
                  className={`px-2 py-1 rounded-md text-[11px] transition ${
                    documentType === 'letter_of_increment'
                      ? 'bg-card text-amber-500 shadow-2xs font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Letter of Increment Format"
                >
                  Increment
                </button>
                <button
                  onClick={() => setDocumentType('detailed_clauses')}
                  className={`px-2 py-1 rounded-md text-[11px] transition ${
                    documentType === 'detailed_clauses'
                      ? 'bg-card text-amber-500 shadow-2xs font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Detailed Clauses Agreement"
                >
                  Clauses
                </button>
              </div>

              {/* Employing Entity Switcher */}
              <select
                value={selectedOrg}
                onChange={(e) =>
                  setSelectedOrg(e.target.value as 'JAAGO Foundation' | 'JAAGO Foundation Trust')
                }
                className="text-[11px] font-bold bg-muted/80 border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[135px] truncate"
              >
                <option value="JAAGO Foundation Trust">Foundation Trust</option>
                <option value="JAAGO Foundation">Foundation</option>
              </select>

              {/* Print / PDF Action Button */}
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 transition active:scale-95 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print / PDF</span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Close Preview (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Document Canvas (Scrollable with Auto-Scaled Paper) ────── */}
          <div
            id="contract-document-canvas"
            ref={containerRef}
            className="flex-1 overflow-auto p-3 sm:p-5 md:p-6 bg-slate-950/25 dark:bg-black/50 flex justify-center items-start"
          >
            <div
              id="contract-document-paper-wrapper"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
                marginBottom: `${(zoomLevel - 1) * 860}px`,
              }}
              className="w-full max-w-2xl bg-white text-slate-900 rounded-md shadow-2xl border border-slate-200 font-sans leading-normal text-[11px] print:transform-none print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:mb-0"
            >
              {/* Paper Container Inner */}
              <div
                id="printable-contract-pad"
                className="relative p-7 sm:p-9 min-h-[840px] flex flex-col justify-between"
              >
                {/* Top-Left Signature Yellow Corner Triangle */}
                <div
                  className="absolute top-0 left-0 w-20 h-20 bg-[#FAC00A] pointer-events-none print:block"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                  }}
                />

                {/* Main Content Area */}
                <div>
                  {/* ── Top Header Bar with Original Official Logo ──────────── */}
                  <div className="flex items-start justify-between mb-5 pl-7">
                    <div className="pt-0.5">
                      <span className="font-mono text-[10.5px] font-bold text-slate-700 block">
                        Ref: {formattedRef}
                      </span>
                      <span className="text-[10.5px] font-medium text-slate-600 block mt-0.5">
                        {formatDateLong(empStartDate || new Date().toISOString())}
                      </span>
                    </div>

                    {/* Official Exact JAAGO Brand Logo Image */}
                    <div className="flex-shrink-0 flex flex-col items-end">
                      <img
                        src="/images/jaago-official-logo.png"
                        alt={orgConfig.name}
                        className="h-14 sm:h-16 w-auto object-contain rounded-xs shadow-xs print:h-16"
                        crossOrigin="anonymous"
                      />
                      {isTrust && (
                        <div className="text-right mt-0.5">
                          <span className="text-[7.5px] font-black tracking-wider uppercase text-slate-900 bg-[#FAC00A] px-1.5 py-0.5 rounded-2xs font-mono">
                            TRUST
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Recipient Block (Left Aligned) ─────────────────────── */}
                  <div className="space-y-0.5 mb-4 text-slate-900 text-[11px]">
                    <p className="font-black text-xs text-slate-950">{empName}</p>
                    <p className="font-semibold text-slate-800">{empDesignation}</p>
                    <p className="text-slate-700">{empDepartment}</p>
                    <p className="font-medium text-slate-700">{orgConfig.name}</p>
                  </div>

                  {/* ── Document Title (Centered & Underlined) ─────────────── */}
                  <div className="text-center my-3.5">
                    <h3 className="text-xs sm:text-sm font-black text-slate-950 underline underline-offset-4 decoration-slate-900 tracking-wide">
                      {documentType === 'letter_of_increment'
                        ? 'Letter of Increment'
                        : documentType === 'letterhead_contract'
                        ? 'Letter of Employment Contract'
                        : 'Contract of Employment'}
                    </h3>
                  </div>

                  {/* ── Salutation ────────────────────────────────────────── */}
                  <p className="font-bold text-slate-900 mb-2.5 text-[11.5px]">
                    Dear Mr./Ms. {getSalutationName(empName)},
                  </p>

                  {/* ── Document Template Views ───────────────────────────── */}
                  {documentType === 'letter_of_increment' ? (
                    /* LETTER OF INCREMENT (Exact match with physical letterhead) */
                    <div className="space-y-3 text-justify text-slate-800 leading-relaxed text-[11px]">
                      <p>
                        JAAGO Management conveys its heartiest thanks for successfully completing another
                        year of engagement with us and congratulates you for your commendable service
                        and dedication. In recognition to your excellent service, Management is pleased
                        to award you an increment in your current salary, and the new salary is{' '}
                        <strong className="font-black text-slate-950 font-mono">
                          {empWage > 0 ? `BDT ${empWage.toLocaleString('en-IN')}/-` : 'As per Approved Pay Scale'}
                        </strong>
                        , effective from{' '}
                        <strong className="font-black text-slate-950">
                          {formatDateLong(empStartDate)}
                        </strong>
                        .
                      </p>

                      <p>
                        All the other terms and conditions of your appointment remain unchanged. We
                        appreciate the hard work and devotion put in by you and believe that in the future
                        endeavor, your contribution will continue to support JAAGO in achieving its goal.
                      </p>
                    </div>
                  ) : documentType === 'letterhead_contract' ? (
                    /* OFFICIAL LETTERHEAD CONTRACT (Modern, clean, auto-bound) */
                    <div className="space-y-2.5 text-justify text-slate-800 leading-relaxed text-[11px]">
                      <p>
                        JAAGO Management is pleased to confirm your employment appointment with{' '}
                        <strong className="font-black text-slate-950">{orgConfig.name}</strong> as{' '}
                        <strong className="font-black text-slate-950">{empDesignation}</strong> in the{' '}
                        <strong className="font-bold text-slate-950">{empDepartment}</strong> (
                        <em>{empProject}</em>), under the Bangladesh Labour Act, 2006 (as amended).
                      </p>

                      {/* Clean Structured Appointment Table */}
                      <div className="my-2.5 border border-slate-300 rounded-md overflow-hidden font-sans text-[10.5px] bg-slate-50/50">
                        <table className="w-full text-left border-collapse">
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="w-1/3 py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">
                                Employee Code &amp; ID
                              </td>
                              <td className="py-1.5 px-3 font-mono font-bold text-slate-950">
                                {empCode}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">
                                Contract Type &amp; Schedule
                              </td>
                              <td className="py-1.5 px-3 font-bold text-slate-900">
                                {contract.contractType} &bull; {empSchedule}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">
                                Consolidated Gross Wage
                              </td>
                              <td className="py-1.5 px-3 font-black text-slate-950 font-mono">
                                {empWage > 0 ? `BDT ${empWage.toLocaleString('en-IN')}/- (Monthly)` : 'As per HR Scale'}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">
                                Commencement / Start Date
                              </td>
                              <td className="py-1.5 px-3 font-bold text-slate-900">
                                {formatDateLong(empStartDate)}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-200">
                              <td className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">
                                Contract End Date
                              </td>
                              <td className="py-1.5 px-3 font-medium text-slate-900">
                                {empEndDate && empEndDate !== '-'
                                  ? formatDateLong(empEndDate)
                                  : 'Permanent / Open-Ended'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 px-3 bg-slate-100 font-semibold text-slate-700">
                                Reporting Supervisor &amp; Posting
                              </td>
                              <td className="py-1.5 px-3 text-slate-900">
                                {empSupervisor} &bull; {empLocation}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <p>
                        You are expected to perform your duties faithfully, uphold our organizational Code
                        of Conduct, and strictly adhere to our child safeguarding, PSEAH, and data
                        protection policies.
                      </p>

                      <p>
                        We congratulate you on your appointment and look forward to your valuable
                        contributions towards achieving JAAGO&rsquo;s vision of empowering communities
                        through quality education.
                      </p>
                    </div>
                  ) : (
                    /* DETAILED CLAUSES VIEW */
                    <div className="space-y-2.5 text-justify text-slate-800 leading-relaxed text-[11px]">
                      <p>
                        <strong>1. PARTIES &amp; APPOINTMENT:</strong> This agreement is between{' '}
                        <strong>{orgConfig.name}</strong> and <strong>{empName}</strong> (NID: {empNid}, Residing at: {empAddress}) as{' '}
                        <strong>{empDesignation}</strong> in <strong>{empDepartment}</strong> starting on{' '}
                        <strong>{formatDateLong(empStartDate)}</strong>.
                      </p>
                      <p>
                        <strong>2. REMUNERATION:</strong> A monthly consolidated gross remuneration of{' '}
                        <strong>
                          {empWage > 0 ? `BDT ${empWage.toLocaleString('en-IN')}/-` : 'As per HR Grade'}
                        </strong>{' '}
                        will be disbursed via bank transfer, subject to lawful deductions and applicable taxes.
                      </p>
                      <p>
                        <strong>3. DUTIES &amp; SAFEGUARDING:</strong> The Employee shall strictly adhere to
                        JAAGO&rsquo;s Child Protection, Safeguarding, and Code of Conduct frameworks.
                      </p>
                      <p>
                        <strong>4. TERMINATION &amp; NOTICE:</strong> Either party may terminate this
                        contract by giving the notice period prescribed in the People &amp; Culture policy.
                      </p>
                    </div>
                  )}

                  {/* ── Signatures Section ─────────────────────────────────── */}
                  <div className="mt-6 pt-2 font-sans text-[11px]">
                    <p className="text-slate-800 mb-4 font-medium">Sincerely,</p>

                    <div className="grid grid-cols-2 gap-6 items-end">
                      {/* Employer Signature Block (Left) */}
                      <div className="space-y-0.5">
                        <div className="h-6 flex items-end">
                          <span className="font-serif italic font-bold text-sm text-slate-800 -rotate-6 transform inline-block">
                            Farhana
                          </span>
                        </div>
                        <div className="pt-1 border-t border-slate-400 space-y-0.5 text-[10px]">
                          <p className="font-bold text-slate-950">{orgConfig.signatoryName}</p>
                          <p className="text-slate-700 font-semibold">{orgConfig.signatoryTitle}</p>
                          <p className="text-slate-700">{orgConfig.name}</p>
                        </div>
                      </div>

                      {/* Employee Signature Acknowledgement (Right) */}
                      <div className="space-y-0.5 text-right flex flex-col items-end">
                        <div className="h-6 flex items-end justify-end">
                          <span className="font-serif italic font-semibold text-xs text-slate-800 -rotate-3 transform inline-block">
                            {getSalutationName(empName)}
                          </span>
                        </div>
                        <div className="pt-1 border-t border-slate-400 w-36 text-[10px] text-right space-y-0.5">
                          <p className="font-bold text-slate-950">{empName}</p>
                          <p className="text-slate-600 font-mono text-[9px]">
                            Date: {formatDateNumeric(empStartDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Official Footer (Clean Address & Contact Only) ───────── */}
                <div className="mt-6 pt-2.5 border-t border-slate-300 text-center text-slate-600 text-[9.5px] font-sans space-y-0.5">
                  <p className="font-medium text-slate-700">{orgConfig.address}</p>
                  <p className="text-slate-500 text-[8.5px]">
                    email: {orgConfig.email} &bull; {orgConfig.web} &bull; Mobile: {orgConfig.mobile}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
