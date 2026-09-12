'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  Paperclip,
  Calendar,
  Layers,
  ShieldCheck,
  Package,
  Info,
  FileText,
  Clock,
  CheckCircle2,
  Send,
  UploadCloud,
  X,
  XCircle,
  Check,
  Search,
  UserCheck,
  AlertCircle,
  Mail,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import {
  ProcurementRequest,
  RequisitionLineItem,
  RequisitionApprovalStep,
  RequisitionHistoryLog,
  saveProcurementRequest,
  getInventoryItems,
  getProcurementRequests,
  InventoryItem,
} from '@/lib/supabase-procurement';
import { fetchProjectsFromSupabase, ProjectItem } from '@/lib/supabase-organization';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';
import { getActiveEmployeeProfile, getCurrentUserSession } from '@/lib/user-profile-sync';

/**
 * 12 Predefined Approval Roles strictly matching JAAGO Workflow Standard
 */
export const APPROVAL_STEP_NAMES = [
  'Supervisor',
  'Manager',
  'Finance',
  'Project Manager',
  'Project Coordinator',
  'Sr. Manager',
  'ED',
  'Admin',
  'Department Lead',
  'Organization Lead',
  'Assistant Director',
  'Head of Account',
] as const;

export type ApprovalStepName = (typeof APPROVAL_STEP_NAMES)[number];

interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
  resize?: 'y' | 'both' | 'none';
}

/**
 * Auto-adjusts height based on content while supporting manual user resize
 */
const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, onChange, minHeight = 56, resize = 'both', className = '', style, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const userAdjustedHeightRef = useRef<number | null>(null);
    const lastAutoHeightRef = useRef<number>(minHeight);

    const setRefs = (el: HTMLTextAreaElement | null) => {
      internalRef.current = el;
      if (typeof forwardedRef === 'function') {
        forwardedRef(el);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      }
    };

    const adjustHeight = () => {
      const el = internalRef.current;
      if (!el) return;

      if (userAdjustedHeightRef.current !== null) {
        el.style.height = `${Math.max(userAdjustedHeightRef.current, minHeight)}px`;
        return;
      }

      el.style.height = 'auto';
      const scrollHeight = el.scrollHeight;
      const targetHeight = Math.max(scrollHeight + 2, minHeight);

      el.style.height = `${targetHeight}px`;
      lastAutoHeightRef.current = targetHeight;
    };

    useEffect(() => {
      adjustHeight();
      window.addEventListener('resize', adjustHeight);
      return () => window.removeEventListener('resize', adjustHeight);
    }, [value, minHeight]);

    const handleResizeEnd = () => {
      const el = internalRef.current;
      if (!el) return;
      if (Math.abs(el.offsetHeight - lastAutoHeightRef.current) > 2) {
        userAdjustedHeightRef.current = el.offsetHeight;
      }
    };

    const resizeClass =
      resize === 'both' ? 'resize' : resize === 'none' ? 'resize-none' : 'resize-y';

    return (
      <textarea
        ref={setRefs}
        value={value}
        onChange={(e) => {
          if (!e.target.value.trim()) {
            userAdjustedHeightRef.current = null;
          }
          adjustHeight();
          onChange?.(e);
        }}
        onMouseDown={() => {
          const handleWindowMouseUp = () => {
            handleResizeEnd();
            window.removeEventListener('mouseup', handleWindowMouseUp);
          };
          window.addEventListener('mouseup', handleWindowMouseUp);
        }}
        onDoubleClick={() => {
          userAdjustedHeightRef.current = null;
          adjustHeight();
        }}
        onMouseUp={handleResizeEnd}
        onTouchEnd={handleResizeEnd}
        style={{
          minHeight: `${minHeight}px`,
          ...style,
        }}
        className={`${resizeClass} overflow-y-auto transition-colors ${className}`}
        {...props}
      />
    );
  }
);
AutoResizeTextarea.displayName = 'AutoResizeTextarea';

/**
 * Format any date string to YYYY-MM-DD
 */
function formatDateISO(val: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return trimmed;
}

interface JaagoDatePickerProps {
  dates: string[];
  onSelectDate: (dateStr: string) => void;
  onRemoveDate: (dateStr: string) => void;
  onClear?: () => void;
  requisitionDates?: string[];
  isMulti?: boolean;
  align?: 'left' | 'right';
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Custom Calendar Popover matching Image 2 reference design
 */
function JaagoDatePicker({
  dates,
  onSelectDate,
  onRemoveDate,
  onClear,
  requisitionDates = [],
  isMulti = true,
  align = 'left',
  className = '',
  onOpenChange,
}: JaagoDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateOpen = (val: boolean) => {
    setIsOpen(val);
    onOpenChange?.(val);
  };

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const normalizedDates = useMemo(() => dates.map(formatDateISO).filter(Boolean), [dates]);

  // Initial view year and month
  const firstDateStr = normalizedDates[0];
  const firstDateObj = firstDateStr ? new Date(firstDateStr) : now;
  const initialYear = !isNaN(firstDateObj.getTime()) ? firstDateObj.getFullYear() : now.getFullYear();
  const initialMonth = !isNaN(firstDateObj.getTime()) ? firstDateObj.getMonth() : now.getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    if (isOpen && normalizedDates.length > 0 && normalizedDates[0]) {
      const d = new Date(normalizedDates[0]);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [isOpen, normalizedDates]);

  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        updateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [isOpen]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const [openUpwards, setOpenUpwards] = useState(false);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 350 && spaceAbove > spaceBelow) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [isOpen]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center flex-wrap gap-1.5 ${
        isOpen ? 'z-50' : 'z-10'
      } ${className}`}
    >
      {/* Date badges: 2026-09-16 × */}
      {normalizedDates.map((dStr) => (
        <span
          key={dStr}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/60 shadow-2xs whitespace-nowrap"
        >
          <span>{dStr}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveDate(dStr);
            }}
            className="ml-1 text-amber-700/70 hover:text-destructive transition cursor-pointer font-bold leading-none"
            title="Remove date"
          >
            ×
          </button>
        </span>
      ))}

      {/* Calendar icon button [ 📅 ] */}
      <button
        type="button"
        onClick={() => updateOpen(!isOpen)}
        className="p-1 rounded-md border border-amber-300/80 dark:border-amber-800/80 bg-white dark:bg-muted/40 hover:bg-amber-50 dark:hover:bg-amber-950/60 text-amber-600 dark:text-amber-400 transition cursor-pointer shadow-2xs flex items-center justify-center flex-shrink-0"
        title="Open calendar picker"
      >
        <Calendar className="h-3.5 w-3.5" />
      </button>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 ${
            openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            align === 'right' ? 'right-0' : 'left-0'
          } bg-white dark:bg-slate-900 border border-border shadow-2xl rounded-2xl p-4 w-[260px] text-foreground animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Header: Month, Year and Navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-bold text-xs sm:text-sm text-foreground">
              {monthNames[viewMonth]}, {viewYear}
            </span>
            <div className="flex items-center space-x-0.5 border border-border/70 rounded-lg p-0.5 bg-muted/20">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick-pick requisition dates if available */}
          {requisitionDates && requisitionDates.length > 0 && (
            <div className="mb-2.5 pb-2 border-b border-border/60">
              <div className="text-[9.5px] font-semibold text-muted-foreground mb-1">
                Connected requisition dates:
              </div>
              <div className="flex flex-wrap gap-1">
                {requisitionDates.map((rd) => {
                  const rdNorm = formatDateISO(rd);
                  const isSel = normalizedDates.includes(rdNorm);
                  return (
                    <button
                      key={rd}
                      type="button"
                      onClick={() => {
                        if (isSel) {
                          onRemoveDate(rdNorm);
                        } else {
                          onSelectDate(rdNorm);
                        }
                        if (!isMulti) updateOpen(false);
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                        isSel
                          ? 'bg-[#F5A623] text-white border-[#F5A623] font-bold shadow-2xs'
                          : 'bg-muted/40 hover:bg-amber-50 text-foreground border-border'
                      }`}
                    >
                      {rdNorm}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekday headers: SU MO TU WE TH FR SA */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map((d) => (
              <div key={d} className="text-[10px] font-bold text-muted-foreground uppercase py-0.5">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7 w-7" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = normalizedDates.includes(dateStr);
              const isToday = dateStr === todayISO;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onRemoveDate(dateStr);
                    } else {
                      onSelectDate(dateStr);
                    }
                    if (!isMulti) updateOpen(false);
                  }}
                  className={`h-7 w-7 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer mx-auto ${
                    isSelected
                      ? 'bg-[#F5A623] text-white font-bold shadow-xs'
                      : isToday
                      ? 'border border-amber-500 text-foreground font-bold hover:bg-amber-50 dark:hover:bg-amber-950/40'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer: CLEAR & TODAY */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border px-1">
            <button
              type="button"
              onClick={() => {
                onClear?.();
                updateOpen(false);
              }}
              className="text-[10.5px] font-bold text-rose-500 hover:text-rose-600 transition uppercase tracking-wider cursor-pointer"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => {
                if (!normalizedDates.includes(todayISO)) {
                  onSelectDate(todayISO);
                }
                if (!isMulti) updateOpen(false);
              }}
              className="text-[10.5px] font-bold text-[#F5A623] hover:text-[#E09612] transition uppercase tracking-wider cursor-pointer"
            >
              TODAY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface RequisitionFormWindowProps {
  requisitionType: 'Purchase' | 'General';
  initialData?: ProcurementRequest | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: ((req: ProcurementRequest) => void) | undefined;
  initialOpenApprovalModal?: boolean | undefined;
  approverContext?: string | undefined;
  stepNumberContext?: number | undefined;
}

export function RequisitionFormWindow({
  requisitionType,
  initialData,
  isOpen,
  onClose,
  onSaved,
  initialOpenApprovalModal = false,
  approverContext,
  stepNumberContext,
}: RequisitionFormWindowProps) {
  const isPurchase = requisitionType === 'Purchase';
  const typePrefix = isPurchase ? 'PR' : 'GR';
  const typeLabel = isPurchase ? 'PURCHASE' : 'GENERAL';

  // Master Data from Supabase / P&C / Inventory
  const [organizationProjects, setOrganizationProjects] = useState<ProjectItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [employeesList, setEmployeesList] = useState<FullEmployeeProfile[]>([]);
  const [existingRequests, setExistingRequests] = useState<ProcurementRequest[]>([]);

  // Session & User
  const [currentUser, setCurrentUser] = useState({
    name: 'Nasif Kamal',
    department: "Founder's Office",
    supervisor: 'S M Nayeem Rahman',
    company: 'JAAGO Foundation Trust',
    code: 'FO032507061190',
  });

  // Form Fields
  const [project, setProject] = useState('Digital School Modernization');
  const [activityCode, setActivityCode] = useState('ACT-2026-081');
  const [company, setCompany] = useState('JAAGO Foundation Trust');
  const [department, setDepartment] = useState("Founder's Office");
  const [requestOwner, setRequestOwner] = useState('Nasif Kamal');
  const [requestOwnerCode, setRequestOwnerCode] = useState('FO032507061190');
  const [supervisor, setSupervisor] = useState('S M Nayeem Rahman');
  const [reference, setReference] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState<string>('');

  // Required Date(s) - Multi-date support
  const [requiredDates, setRequiredDates] = useState<string[]>([]);
  const [isReqDatePickerOpen, setIsReqDatePickerOpen] = useState(false);
  const [activeItemDatePickerIdx, setActiveItemDatePickerIdx] = useState<number | null>(null);

  const [reasonForPurchase, setReasonForPurchase] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Normal' | 'High' | 'Urgent'>('Normal');

  // Line items
  const [items, setItems] = useState<RequisitionLineItem[]>([]);

  // Attachments
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; size: string }>>([]);

  // Small window approval modal state (shown only after clicking Submit)
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Approval steps - CLEAN, NO MOCK DATA
  const [approvalSteps, setApprovalSteps] = useState<RequisitionApprovalStep[]>([]);

  // History logs - CLEAN, NO MOCK DATA
  const [historyLogs, setHistoryLogs] = useState<RequisitionHistoryLog[]>([]);

  // Autocomplete state for Line Items (active index when typing >= 3 characters)
  const [activeItemSearchIdx, setActiveItemSearchIdx] = useState<number | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<number, string | null>>({});

  // Inventory catalog modal state (Add from inventory button)
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('All');

  // Approver autocomplete state
  const [activeApproverSearchStep, setActiveApproverSearchStep] = useState<number | null>(null);

  // Step name role dropdown state
  const [activeStepNameDropdown, setActiveStepNameDropdown] = useState<number | null>(null);

  // Step email sending spinner state
  const [isSendingStepEmail, setIsSendingStepEmail] = useState<number | null>(null);

  // Viewer role state: 'REQUESTER' (never sees approve/refuse, only send request) vs 'APPROVER' (can approve/refuse active step)
  const [viewerMode, setViewerMode] = useState<'REQUESTER' | 'APPROVER'>('REQUESTER');
  const [activeApproverStep, setActiveApproverStep] = useState<number>(1);

  // Status tracking: 'Draft' | 'Submitted' | 'Approved' | 'Rejected'
  const [currentStatus, setCurrentStatus] = useState<string>(initialData?.status || 'Draft');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(
    Boolean(initialData?.status && initialData.status !== 'Draft')
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // Lock body scrolling when full-window requisition form is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);


  // Rule: JAAGO Foundation -> JF, JAAGO Foundation Trust -> JFT
  // Code format: [PREFIX]/[TYPE]/[YY]/[MM]/[UNIQUE_6_DIGIT]
  const generateNewReference = (companyName?: string, currentReqs?: ProcurementRequest[]) => {
    const targetCompany = companyName || company;
    const isTrust = (targetCompany || '').toLowerCase().includes('trust');
    const orgPrefix = isTrust ? 'JFT' : 'JF';
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');

    const listToCheck = currentReqs || existingRequests;
    let candidate = '';
    let attempts = 0;
    do {
      const randomCode = String(Math.floor(100000 + Math.random() * 900000));
      candidate = `${orgPrefix}/${typePrefix}/${yy}/${mm}/${randomCode}`;
      attempts++;
    } while (listToCheck.some((r) => r.prNumber === candidate) && attempts < 50);

    return candidate;
  };

  // Switch Company: auto-update reference prefix between JF and JFT
  const handleCompanyChange = (newCompany: string) => {
    setCompany(newCompany);
    const isTrust = newCompany.toLowerCase().includes('trust');
    const targetPrefix = isTrust ? 'JFT' : 'JF';

    setReference((prev) => {
      if (!prev) return generateNewReference(newCompany);
      const parts = prev.split('/');
      if (parts.length >= 5) {
        parts[0] = targetPrefix;
        return parts.join('/');
      }
      return generateNewReference(newCompany);
    });
  };

  // Load master data and auto-detect employee profile on mount
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    (async () => {
      try {
        const [profile, projects, inventory, employees, allRequests] = await Promise.all([
          getActiveEmployeeProfile(),
          fetchProjectsFromSupabase(),
          getInventoryItems(),
          fetchEmployeesFromSupabase(),
          getProcurementRequests(),
        ]);

        if (!isMounted) return;

        if (projects && projects.length > 0) {
          setOrganizationProjects(projects);
        }
        if (inventory && inventory.length > 0) {
          setInventoryItems(inventory);
        }
        if (employees && employees.length > 0) {
          setEmployeesList(employees);
        }
        if (allRequests && allRequests.length > 0) {
          setExistingRequests(allRequests);
        }

        const session = getCurrentUserSession();
        const empDept = profile?.department || session?.department || "Founder's Office";
        const empOrg = profile?.organization || session?.organizationName || 'JAAGO Foundation Trust';
        const empName = profile?.name || session?.fullName || 'Nasif Kamal';
        const empCode = profile?.code || session?.employeeCode || 'FO032507061190';
        const empSupervisor = profile?.supervisor || session?.manager || 'S M Nayeem Rahman';

        setCurrentUser({
          name: empName,
          department: empDept,
          supervisor: empSupervisor,
          company: empOrg,
          code: empCode,
        });

        // Initialize for New Requisition
        if (!initialData) {
          setDepartment(empDept);
          setCompany(empOrg);
          setRequestOwner(empName);
          setRequestOwnerCode(empCode);
          setSupervisor(empSupervisor);

          // Auto-select project: check if employee project matches P&C project list
          if (profile?.project && projects.some((p) => p.name.toLowerCase() === profile.project.toLowerCase())) {
            const matched = projects.find((p) => p.name.toLowerCase() === profile.project.toLowerCase())!;
            setProject(matched.name);
            if (matched.code) setActivityCode(matched.code);
          } else if (projects.length > 0) {
            setProject(projects[0]!.name);
            if (projects[0]?.code) setActivityCode(projects[0]!.code);
          }

          // Generate unique reference
          setReference(generateNewReference(empOrg, allRequests));

          // Default single required date 7 days ahead
          const defaultDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]!;
          setRequiredDates([defaultDate]);

          // Initialize with 1 empty item row ready to add from inventory (matching Screenshot 2)
          setItems([
            {
              id: `item-${Date.now()}-1`,
              name: '',
              description: '',
              requiredDate: defaultDate,
              quantity: 1,
              unit: '',
              unitCost: 0,
              totalCost: 0,
            },
          ]);

          // Step 1: By default, set supervisor based on request owner employee profile data, called from People & Culture
          const matchedSupervisor = employees?.find((e) => {
            if (profile?.supervisor && e.name.toLowerCase().trim() === profile.supervisor.toLowerCase().trim()) return true;
            if (empSupervisor && e.name.toLowerCase().trim() === empSupervisor.toLowerCase().trim()) return true;
            return false;
          });

          const supName = matchedSupervisor?.name || empSupervisor || '';
          const supEmail = matchedSupervisor?.workEmail || matchedSupervisor?.personalEmail || '';
          const supId = matchedSupervisor?.id || '';

          // Initialize Clean Approval Steps with Step 1 Supervisor auto-filled and other steps left for manual input
          setApprovalSteps([
            {
              stepNumber: 1,
              stepName: 'Supervisor',
              approver: supName,
              approverEmail: supEmail,
              approverId: supId,
              status: 'PENDING',
              method: 'DRAW ON PAD',
            },
            {
              stepNumber: 2,
              stepName: 'Finance',
              approver: '',
              approverEmail: '',
              approverId: '',
              status: 'PENDING',
              method: 'DRAW ON PAD',
            },
            {
              stepNumber: 3,
              stepName: 'Sr. Manager',
              approver: '',
              approverEmail: '',
              approverId: '',
              status: 'PENDING',
              method: 'DRAW ON PAD',
            },
          ]);
          setHistoryLogs([]);
        }
      } catch (err) {
        console.warn('Error loading ERP master data:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Populate form when viewing an existing initialData
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setReference(initialData.prNumber || generateNewReference());
      setSubject(initialData.title || '');
      setCurrentStatus(initialData.status || 'Draft');
      setIsSubmitted(Boolean(initialData.status && initialData.status !== 'Draft'));
      setDepartment(initialData.department || currentUser.department);
      setRequestOwner(initialData.requestOwner || currentUser.name);
      setRequestOwnerCode(initialData.requestOwnerCode || currentUser.code);
      setProject(initialData.project || 'Digital School Modernization');
      setActivityCode(initialData.activityCode || '');
      setCompany(initialData.company || currentUser.company);
      setSupervisor(initialData.supervisor || currentUser.supervisor);
      setBudget(initialData.budget ? String(initialData.budget) : String(initialData.estAmount || ''));
      setReasonForPurchase(initialData.justification || '');
      setDeliveryInstructions(initialData.deliveryInstructions || '');
      setDescription(initialData.description || '');
      setPriority(initialData.priority || 'Normal');
      setDate(
        initialData.createdAt
          ? new Date(initialData.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
      );

      // Multiple required dates
      if (initialData.requiredDates && initialData.requiredDates.length > 0) {
        setRequiredDates(initialData.requiredDates);
      } else if (initialData.requiredDate) {
        setRequiredDates([initialData.requiredDate]);
      } else {
        setRequiredDates([]);
      }

      if (initialData.lineItems && initialData.lineItems.length > 0) {
        setItems(initialData.lineItems);
      } else {
        setItems([]);
      }
      if (initialData.attachments && initialData.attachments.length > 0) {
        setAttachments(initialData.attachments as any);
      } else {
        setAttachments([]);
      }
      const resolvedSupervisor = initialData.supervisor || supervisor || currentUser.supervisor || 'S M Nayeem Rahman';
      if (initialData.approvalSteps && initialData.approvalSteps.length > 0) {
        const updatedSteps = initialData.approvalSteps.map((s, idx) => {
          if (idx === 0) {
            return {
              ...s,
              stepName: s.stepName || 'Supervisor',
              approver: s.approver && s.approver.trim() ? s.approver : resolvedSupervisor,
            };
          }
          return s;
        });
        setApprovalSteps(updatedSteps as any);
      } else {
        setApprovalSteps([
          {
            stepNumber: 1,
            stepName: 'Supervisor',
            approver: resolvedSupervisor,
            status: 'PENDING',
            method: 'DRAW ON PAD',
          },
          {
            stepNumber: 2,
            stepName: 'Finance',
            approver: '',
            status: 'PENDING',
            method: 'DRAW ON PAD',
          },
          {
            stepNumber: 3,
            stepName: 'Sr. Manager',
            approver: '',
            status: 'PENDING',
            method: 'DRAW ON PAD',
          },
        ]);
      }
      if (initialData.historyLogs && initialData.historyLogs.length > 0) {
        setHistoryLogs(initialData.historyLogs as any);
      } else {
        setHistoryLogs([]);
      }
    } else {
      setCurrentStatus('Draft');
      setIsSubmitted(false);
      setDate(
        new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
      setSubject('');
      setReasonForPurchase('');
      setDeliveryInstructions('Deliver directly to Banani Central Depot, Floor 2.');
      setDescription('');
      setPriority('Normal');
      setBudget('');
      setAttachments([]);
    }
  }, [isOpen, initialData, requisitionType]);

  // Auto-open approval modal if launched with approval context from email
  useEffect(() => {
    if (isOpen && initialOpenApprovalModal) {
      setShowApprovalModal(true);
    }
  }, [isOpen, initialOpenApprovalModal]);

  // Check if opened in an approver session (e.g. from review link in approval request email)
  const isApproverSession = Boolean(
    approverContext &&
    (!requestOwner || approverContext.toLowerCase().trim() !== requestOwner.toLowerCase().trim())
  );

  // Determine if current logged-in user is the Request Owner (never allow request owner to approve their own request)
  const isCurrentUserRequestOwner = Boolean(
    !isApproverSession &&
    (!requestOwner ||
      (currentUser?.name && requestOwner && currentUser.name.toLowerCase().trim() === requestOwner.toLowerCase().trim()))
  );

  // Strict Form Edit Rights:
  // "Do not allow approval to edit the form. For form edit rights, only the request owner is allowed to edit before submitting the form.
  // After submitting the form, the request owner is not allowed to re-edit or edit it. Only allow it if it is in the refused status."
  const isFormEditable = Boolean(
    isCurrentUserRequestOwner &&
    (currentStatus === 'Draft' || currentStatus === 'Refused' || currentStatus === 'Rejected')
  );

  // Exclusive right for Request Owner: Allow only request owner anytime to add/configure approval steps
  const canRequestOwnerAddSteps = Boolean(isCurrentUserRequestOwner && viewerMode === 'REQUESTER');

  const canEditStep = (step: RequisitionApprovalStep) =>
    Boolean(isCurrentUserRequestOwner && viewerMode === 'REQUESTER' && step.status !== 'SIGNED');

  const canRemoveStep = (step: RequisitionApprovalStep) =>
    Boolean(
      isCurrentUserRequestOwner &&
      viewerMode === 'REQUESTER' &&
      step.stepNumber > 1 &&
      step.status !== 'SIGNED'
    );

  // Set viewer mode: Request Owner is always REQUESTER; Approver session enters APPROVER mode with active step
  useEffect(() => {
    if (isCurrentUserRequestOwner) {
      setViewerMode('REQUESTER');
      return;
    }

    if (approverContext) {
      const stepIdx = approvalSteps.findIndex(
        (s) => s.approver.toLowerCase().trim() === approverContext.toLowerCase().trim()
      );
      if (stepIdx !== -1) {
        setViewerMode('APPROVER');
        setActiveApproverStep(approvalSteps[stepIdx]!.stepNumber);
      } else if (stepNumberContext) {
        setViewerMode('APPROVER');
        setActiveApproverStep(stepNumberContext);
      } else {
        setViewerMode('APPROVER');
        setActiveApproverStep(1);
      }
    } else if (stepNumberContext) {
      setViewerMode('APPROVER');
      setActiveApproverStep(stepNumberContext);
    } else {
      setViewerMode('REQUESTER');
    }
  }, [isCurrentUserRequestOwner, approverContext, stepNumberContext, approvalSteps]);

  // Handle click outside to close role dropdown or approver autocomplete without blocking scroll
  useEffect(() => {
    if (activeStepNameDropdown === null && activeApproverSearchStep === null) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('[data-approval-dropdown]')) {
        setActiveStepNameDropdown(null);
        setActiveApproverSearchStep(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeStepNameDropdown, activeApproverSearchStep]);

  // Ensure Step 1 is ALWAYS populated with the actual supervisor from People & Culture
  useEffect(() => {
    const currentSup = supervisor || currentUser.supervisor || 'S M Nayeem Rahman';
    setApprovalSteps((prev) => {
      if (prev.length === 0) return prev;
      const step1 = prev[0];
      const needsFix =
        !step1?.approver ||
        step1.approver.trim() === '' ||
        step1.approver.toLowerCase().includes('auto-called') ||
        step1.stepName !== 'Supervisor';

      if (needsFix) {
        const supEmp = employeesList.find((e) => e.name.toLowerCase().trim() === currentSup.toLowerCase().trim());
        return prev.map((s, idx) =>
          idx === 0
            ? {
                ...s,
                stepName: 'Supervisor',
                approver: currentSup,
                approverEmail: supEmp?.workEmail || supEmp?.personalEmail || s.approverEmail || '',
                approverId: supEmp?.id || s.approverId || '',
              }
            : s
        );
      }
      return prev;
    });
  }, [supervisor, currentUser.supervisor, employeesList]);

  // Calculate estimated total
  const estimatedTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);
  }, [items]);

  // Condition to show embedded Approval Chain and History Track directly in the request form
  const isSubmittedOrActive =
    currentStatus !== 'Draft' ||
    isSubmitted ||
    Boolean(initialData?.status && initialData.status !== 'Draft') ||
    approvalSteps.some((s) => s.status === 'SENT' || s.status === 'SIGNED' || s.status === 'REJECTED') ||
    historyLogs.length > 0;

  // ─── Connected Multi-Date Management ──────────────────────────────
  // Add required date to requisition master list and auto-connect to line items
  const addRequisitionRequiredDate = (dateStr: string) => {
    if (!dateStr) return;
    const formatted = dateStr.trim();
    if (!formatted) return;

    setRequiredDates((prev) => {
      if (prev.includes(formatted)) return prev;
      return [...prev, formatted].sort();
    });

    // Connect to items: if any item has no required dates, assign this date
    setItems((prevItems) =>
      prevItems.map((it) => {
        const itDates = it.requiredDates || (it.requiredDate ? [it.requiredDate] : []);
        if (itDates.length === 0 || (itDates.length === 1 && !itDates[0])) {
          return {
            ...it,
            requiredDate: formatted,
            requiredDates: [formatted],
          };
        }
        return it;
      })
    );
  };

  // Remove required date from requisition and all connected line items
  const removeRequisitionRequiredDate = (index: number) => {
    const targetDate = requiredDates[index];
    setRequiredDates((prev) => prev.filter((_, idx) => idx !== index));

    if (targetDate) {
      setItems((prevItems) =>
        prevItems.map((it) => {
          const itDates = (it.requiredDates || (it.requiredDate ? [it.requiredDate] : [])).filter(
            (d) => d !== targetDate
          );
          return {
            ...it,
            requiredDate: itDates[0] || '',
            requiredDates: itDates,
          };
        })
      );
    }
  };

  // Add date to specific line item (and auto-connect to requisition master list)
  const handleAddItemDate = (itemIndex: number, dateStr: string) => {
    if (!dateStr) return;
    const formatted = dateStr.trim();
    if (!formatted) return;

    // 1. Sync to requisition master requiredDates if not already present
    setRequiredDates((prev) => {
      if (!prev.includes(formatted)) {
        return [...prev, formatted].sort();
      }
      return prev;
    });

    // 2. Add to line item's dates
    setItems((prev) => {
      const updated = [...prev];
      const it = { ...updated[itemIndex]! };
      const currentDates = it.requiredDates || (it.requiredDate ? [it.requiredDate] : []);
      if (!currentDates.includes(formatted)) {
        const newDates = [...currentDates, formatted].sort();
        it.requiredDates = newDates;
        it.requiredDate = newDates[0];
      }
      updated[itemIndex] = it;
      return updated;
    });
  };

  // Remove date from specific line item
  const handleRemoveItemDate = (itemIndex: number, dateStr: string) => {
    setItems((prev) => {
      const updated = [...prev];
      const it = { ...updated[itemIndex]! };
      const currentDates = (it.requiredDates || (it.requiredDate ? [it.requiredDate] : [])).filter(
        (d) => d !== dateStr
      );
      it.requiredDates = currentDates;
      it.requiredDate = currentDates[0] || '';
      updated[itemIndex] = it;
      return updated;
    });
  };

  // Clear all dates from specific line item
  const handleClearItemDates = (itemIndex: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const it = { ...updated[itemIndex]! };
      it.requiredDates = [];
      it.requiredDate = '';
      updated[itemIndex] = it;
      return updated;
    });
  };

  // Add Item (always adds a row to be populated from inventory, matching Screenshot 2)
  const handleAddItem = () => {
    const defaultDates = requiredDates.length > 0 ? [...requiredDates] : [new Date().toISOString().split('T')[0]!];
    const newIdx = items.length;
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        name: '',
        description: '',
        requiredDate: defaultDates[0],
        requiredDates: defaultDates,
        quantity: 1,
        unit: '',
        unitCost: 0,
        totalCost: 0,
      },
    ]);
    setActiveItemSearchIdx(newIdx);
  };

  // Add Item directly from Inventory Catalog Modal
  const handleAddCatalogItem = (inv: InventoryItem) => {
    const defaultDates = requiredDates.length > 0 ? [...requiredDates] : [new Date().toISOString().split('T')[0]!];
    setItems((prev) => {
      // If the only item is an empty placeholder, replace it
      if (prev.length === 1 && !prev[0]?.name.trim()) {
        return [
          {
            id: `item-${Date.now()}-1`,
            name: inv.name,
            description: inv.description || (inv.itemCode && inv.itemCode !== 'N/A' ? `[${inv.itemCode}] ${inv.category}` : inv.category || 'General supplies'),
            requiredDate: defaultDates[0],
            requiredDates: defaultDates,
            quantity: 1,
            unit: inv.uom || 'PCS',
            unitCost: inv.unitCost || 0,
            totalCost: inv.unitCost || 0,
            inventoryId: inv.id,
            itemCode: inv.itemCode,
          },
        ];
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${prev.length + 1}`,
          name: inv.name,
          description: inv.description || (inv.itemCode && inv.itemCode !== 'N/A' ? `[${inv.itemCode}] ${inv.category}` : inv.category || 'General supplies'),
          requiredDate: defaultDates[0],
          requiredDates: defaultDates,
          quantity: 1,
          unit: inv.uom || 'PCS',
          unitCost: inv.unitCost || 0,
          totalCost: inv.unitCost || 0,
          inventoryId: inv.id,
          itemCode: inv.itemCode,
        },
      ];
    });
    setShowInventoryModal(false);
  };

  // Select Inventory product inside line item autocomplete
  const handleSelectInventoryForItem = (index: number, inv: InventoryItem) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index]! };
      item.name = inv.name;
      item.description = item.description || (inv.itemCode && inv.itemCode !== 'N/A' ? `[${inv.itemCode}] ${inv.category}` : inv.category || 'General supplies');
      item.unit = inv.uom || 'PCS';
      item.unitCost = inv.unitCost || 0;
      item.totalCost = (item.quantity || 1) * (inv.unitCost || 0);
      item.inventoryId = inv.id;
      item.itemCode = inv.itemCode;
      updated[index] = item;
      return updated;
    });
    setActiveItemSearchIdx(null);
    setItemErrors((prev) => {
      const cp = { ...prev };
      delete cp[index];
      return cp;
    });
  };

  // Update line item
  const handleUpdateItem = (index: number, field: keyof RequisitionLineItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index]!, [field]: value };
      if (field === 'quantity' || field === 'unitCost') {
        const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
        const cost = field === 'unitCost' ? Number(value) || 0 : item.unitCost;
        item.totalCost = qty * cost;
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setItemErrors((prev) => {
      const cp = { ...prev };
      delete cp[index];
      return cp;
    });
  };

  // Add Attachment mock
  const handleAddAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}`,
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
          },
        ]);
      }
    };
    input.click();
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Approval step management - Exclusive right for Request Owner anytime
  const handleAddStep = async () => {
    if (!isCurrentUserRequestOwner) return;

    const nextStepNumber = approvalSteps.length + 1;
    const defaultRole =
      nextStepNumber === 2
        ? 'Manager'
        : nextStepNumber === 3
        ? 'Finance'
        : nextStepNumber === 4
        ? 'Sr. Manager'
        : 'Managing Director';

    const newStep: RequisitionApprovalStep = {
      stepNumber: nextStepNumber,
      stepName: defaultRole,
      approver: '',
      approverEmail: '',
      approverId: '',
      status: 'PENDING',
      method: 'DRAW ON PAD',
    };

    const updatedSteps = [...approvalSteps, newStep];
    setApprovalSteps(updatedSteps);

    // If requisition is already active/submitted, persist immediately to Supabase
    if (currentStatus !== 'Draft') {
      const timeNow = new Date().toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });
      const newLog: RequisitionHistoryLog = {
        action: 'APPROVAL STEP ADDED',
        actor: requestOwner || currentUser.name,
        details: `Step ${nextStepNumber} (${defaultRole}) added to approval workflow by Request Owner.`,
        timestamp: timeNow,
      };
      const updatedHistory = [...historyLogs, newLog];
      setHistoryLogs(updatedHistory);
      await handleSave(false, updatedSteps, updatedHistory, currentStatus as any);
    }
  };

  const handleRemoveStep = async (stepNumber: number) => {
    if (!isCurrentUserRequestOwner) return;

    const targetStep = approvalSteps.find((s) => s.stepNumber === stepNumber);
    if (targetStep?.status === 'SIGNED') {
      alert('Cannot remove an approval step that has already been signed.');
      return;
    }

    const updatedSteps = approvalSteps
      .filter((s) => s.stepNumber !== stepNumber)
      .map((s, idx) => ({ ...s, stepNumber: idx + 1 }));

    setApprovalSteps(updatedSteps);

    if (currentStatus !== 'Draft') {
      const timeNow = new Date().toLocaleString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
      });
      const newLog: RequisitionHistoryLog = {
        action: 'APPROVAL STEP REMOVED',
        actor: requestOwner || currentUser.name,
        details: `Step ${stepNumber} (${targetStep?.stepName || 'Step'}) removed from approval chain by Request Owner.`,
        timestamp: timeNow,
      };
      const updatedHistory = [...historyLogs, newLog];
      setHistoryLogs(updatedHistory);
      await handleSave(false, updatedSteps, updatedHistory, currentStatus as any);
    }
  };

  // Helper to persist step role change for Request Owner
  const handleSelectStepRole = async (stepNumber: number, role: string) => {
    const updatedSteps = approvalSteps.map((s) =>
      s.stepNumber === stepNumber ? { ...s, stepName: role } : s
    );
    setApprovalSteps(updatedSteps);
    setActiveStepNameDropdown(null);

    if (currentStatus !== 'Draft') {
      await handleSave(false, updatedSteps, historyLogs, currentStatus as any);
    }
  };

  // Helper to persist step approver selection for Request Owner
  const handleSelectStepApprover = async (
    stepNumber: number,
    approverName: string,
    approverEmail: string,
    approverId?: string
  ) => {
    const updatedSteps = approvalSteps.map((s) =>
      s.stepNumber === stepNumber
        ? {
            ...s,
            approver: approverName,
            approverEmail,
            approverId: approverId || s.approverId,
          }
        : s
    );
    setApprovalSteps(updatedSteps);
    setActiveApproverSearchStep(null);

    if (currentStatus !== 'Draft') {
      await handleSave(false, updatedSteps, historyLogs, currentStatus as any);
    }
  };

  // Dispatch automated notification email for an approval step
  const dispatchApprovalStepEmail = async (
    targetStep: RequisitionApprovalStep,
    currentPrNumber: string,
    currentTitle: string,
    currentAmount: number,
    targetRequestId?: string
  ) => {
    let recipientEmail = targetStep.approverEmail;
    const approverName = targetStep.approver;

    // Fallback lookup from employeesList if approverEmail wasn't populated
    if (!recipientEmail && approverName) {
      const emp = employeesList.find(
        (e) => e.name.toLowerCase().trim() === approverName.toLowerCase().trim()
      );
      if (emp) {
        recipientEmail = emp.workEmail || emp.personalEmail;
      }
    }

    try {
      const res = await fetch('/api/v1/procurement/requests/notify-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: targetRequestId || initialData?.id,
          prNumber: currentPrNumber || reference,
          requisitionType,
          title: currentTitle || subject || 'Requisition Request',
          stepNumber: targetStep.stepNumber,
          stepName: targetStep.stepName,
          approverName: approverName || 'Approver',
          approverEmail: recipientEmail || '',
          requesterName: requestOwner || currentUser.name,
          department: department || currentUser.department,
          totalAmount: currentAmount || estimatedTotal,
        }),
      });
      return await res.json();
    } catch (err) {
      console.error('Failed to notify approver:', err);
      return { success: false, error: err };
    }
  };

  // Dispatch refusal notification email to Request Owner
  const dispatchRefusalNoticeEmail = async (
    refusingStep: RequisitionApprovalStep,
    refusalReason: string,
    ownerEmail: string,
    currentPrNumber: string,
    targetRequestId?: string
  ) => {
    try {
      const res = await fetch('/api/v1/procurement/requests/notify-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'refusal_notice',
          requestId: targetRequestId || initialData?.id,
          prNumber: currentPrNumber || reference,
          requisitionType,
          title: subject || 'Requisition Request',
          stepNumber: refusingStep.stepNumber,
          stepName: refusingStep.stepName,
          approverName: refusingStep.approver || 'Approver',
          requesterName: requestOwner || currentUser.name,
          requesterEmail: ownerEmail,
          refusalReason,
        }),
      });
      return await res.json();
    } catch (err) {
      console.error('Failed to notify requester of refusal:', err);
      return { success: false, error: err };
    }
  };

  // Confirm Approval Chain: Dispatches Step 1 email, records history, saves to Supabase, and automatically closes modal
  const handleConfirmApprovalChain = async () => {
    if (approvalSteps.length === 0) {
      alert('Please add at least one approval step.');
      return;
    }

    const step1 = approvalSteps[0];
    if (!step1?.approver || !step1.approver.trim()) {
      alert('Please designate an approver for Step 1 before confirming.');
      return;
    }

    let step1Email = step1.approverEmail;
    if (!step1Email) {
      const emp = employeesList.find(
        (e) => e.name.toLowerCase().trim() === step1.approver.toLowerCase().trim()
      );
      if (emp) {
        step1Email = emp.workEmail || emp.personalEmail;
      }
    }

    const timeNow = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });

    const updatedSteps: RequisitionApprovalStep[] = approvalSteps.map((s, idx) => {
      if (idx === 0) {
        return {
          ...s,
          status: 'SENT' as const,
          approverEmail: step1Email,
          sentAt: timeNow,
        };
      }
      return s;
    });

    const confirmLog: RequisitionHistoryLog = {
      action: 'APPROVAL CHAIN CONFIGURED',
      actor: requestOwner || currentUser.name,
      details: `Approval request dispatched to Step 1 (${step1.stepName}: ${step1.approver}) via email.`,
      timestamp: timeNow,
    };

    const updatedHistory = [...historyLogs, confirmLog];

    setApprovalSteps(updatedSteps);
    setHistoryLogs(updatedHistory);
    setCurrentStatus('Submitted');
    setIsSubmitted(true);

    // Automatically close the approval chain window as requested
    setShowApprovalModal(false);

    // Save and submit the requisition first to obtain real ID
    const saved = await handleSave(false, updatedSteps, updatedHistory, 'Submitted');

    // Dispatch email to Step 1 approver
    await dispatchApprovalStepEmail(
      updatedSteps[0]!,
      saved?.prNumber || reference,
      saved?.title || subject,
      saved?.estAmount || estimatedTotal,
      saved?.id || initialData?.id
    );

    // Smoothly scroll down to the embedded approval chain and history track section
    setTimeout(() => {
      const approvalSection = document.getElementById('approval-chain-section');
      if (approvalSection) {
        approvalSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 200);
  };

  // Step Approval handler: marks current step SIGNED, dispatches next step email (Step 2 when Step 1 is done, Step 3 when Step 2 is done)
  const handleApproveStep = async (stepNumber: number) => {
    const currentStep = approvalSteps.find((s) => s.stepNumber === stepNumber);
    if (!currentStep) return;

    const timeNow = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });

    const nextStepIndex = approvalSteps.findIndex((s) => s.stepNumber === stepNumber + 1);
    const hasNextStep = nextStepIndex !== -1;
    const newReqStatus: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Refused' = hasNextStep ? 'Submitted' : 'Approved';

    const updatedSteps = approvalSteps.map((s) => {
      if (s.stepNumber === stepNumber) {
        return {
          ...s,
          status: 'SIGNED' as const,
          signedAt: timeNow,
        };
      }
      if (hasNextStep && s.stepNumber === stepNumber + 1) {
        const nextEmp = employeesList.find((e) => e.name.toLowerCase().trim() === s.approver.toLowerCase().trim());
        return {
          ...s,
          status: 'SENT' as const,
          approverEmail: s.approverEmail || nextEmp?.workEmail || nextEmp?.personalEmail || '',
          sentAt: timeNow,
        };
      }
      return s;
    });

    const newLogs: RequisitionHistoryLog[] = [
      ...historyLogs,
      {
        action: 'STEP APPROVED',
        actor: currentStep.approver || currentUser.name,
        details: `Step ${stepNumber} (${currentStep.stepName}) approved.`,
        timestamp: timeNow,
      },
    ];

    if (hasNextStep) {
      const nextStep = updatedSteps[nextStepIndex]!;
      newLogs.push({
        action: 'APPROVAL REQUEST SENT',
        actor: 'System',
        details: `Approval notification dispatched to Step ${nextStep.stepNumber} (${nextStep.stepName}: ${nextStep.approver || 'Next Approver'}).`,
        timestamp: timeNow,
      });
      // Auto-send email to next step approver (Step 2 when Step 1 is done, Step 3 when Step 2 is done)
      dispatchApprovalStepEmail(
        nextStep,
        reference,
        subject,
        estimatedTotal,
        initialData?.id
      );
    } else {
      newLogs.push({
        action: 'REQUISITION FULLY APPROVED',
        actor: 'System',
        details: `All ${approvalSteps.length} approval steps signed. Requisition marked Approved.`,
        timestamp: timeNow,
      });
    }

    setApprovalSteps(updatedSteps);
    setHistoryLogs(newLogs);
    setCurrentStatus(newReqStatus);

    await handleSave(false, updatedSteps, newLogs, newReqStatus);
  };

  // Step Refusal handler: marks step REJECTED, marks requisition Refused, unlocks form for Request Owner, and emails Request Owner
  const handleRefuseStep = async (stepNumber: number) => {
    const currentStep = approvalSteps.find((s) => s.stepNumber === stepNumber);
    if (!currentStep) return;

    const refusalReason = window.prompt(
      `Please provide an optional reason/remark for refusing Step ${stepNumber} (${currentStep.stepName}):`,
      ''
    );
    if (refusalReason === null) {
      // Approver clicked cancel on prompt
      return;
    }

    const timeNow = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });

    const updatedSteps = approvalSteps.map((s) => {
      if (s.stepNumber === stepNumber) {
        return {
          ...s,
          status: 'REJECTED' as const,
        };
      }
      return s;
    });

    const reasonNote = refusalReason.trim() ? ` Reason: "${refusalReason.trim()}".` : '';

    const newLogs: RequisitionHistoryLog[] = [
      ...historyLogs,
      {
        action: 'STEP REFUSED',
        actor: currentStep.approver || currentUser.name,
        details: `Step ${stepNumber} (${currentStep.stepName}) refused by ${currentStep.approver}.${reasonNote}`,
        timestamp: timeNow,
      },
      {
        action: 'REQUISITION REFUSED',
        actor: 'System',
        details: `Requisition refused at Step ${stepNumber}. Returned to Request Owner (${requestOwner || currentUser.name}) for re-editing.`,
        timestamp: timeNow,
      },
    ];

    setApprovalSteps(updatedSteps);
    setHistoryLogs(newLogs);
    setCurrentStatus('Refused');

    // Save as Refused in database
    const saved = await handleSave(false, updatedSteps, newLogs, 'Refused');

    // Dispatch refusal notice email to the Request Owner
    let ownerEmail = '';
    const ownerName = requestOwner || currentUser.name;
    const ownerEmp = employeesList.find((e) => e.name.toLowerCase().trim() === ownerName.toLowerCase().trim());
    if (ownerEmp) {
      ownerEmail = ownerEmp.workEmail || ownerEmp.personalEmail || '';
    }

    await dispatchRefusalNoticeEmail(
      currentStep,
      refusalReason.trim() || 'No specific remark provided.',
      ownerEmail,
      saved?.prNumber || reference,
      saved?.id || initialData?.id
    );
  };

  // Resubmit Request handler: restarts the same approval sequence from Step 1 after owner re-edits a refused requisition
  const handleResubmitForApproval = async () => {
    if (!subject.trim()) {
      alert('Please provide a Subject / Title for this requisition before resubmitting.');
      return;
    }

    const itemsWithNames = items.filter((it) => it.name && it.name.trim().length > 0);
    if (itemsWithNames.length === 0) {
      alert('Please add at least one item from inventory before resubmitting.');
      return;
    }

    const timeNow = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });

    // Reset approval chain to start fresh from Step 1 while retaining all configured steps & approvers
    const step1 = approvalSteps[0];
    let step1Email = step1?.approverEmail;
    if (!step1Email && step1?.approver) {
      const emp = employeesList.find((e) => e.name.toLowerCase().trim() === step1.approver.toLowerCase().trim());
      step1Email = emp?.workEmail || emp?.personalEmail || '';
    }

    const restartedSteps: RequisitionApprovalStep[] = approvalSteps.map((s, idx) => {
      if (idx === 0) {
        return {
          ...s,
          status: 'SENT' as const,
          sentAt: timeNow,
          signedAt: undefined,
          approverEmail: step1Email || s.approverEmail,
        };
      }
      return {
        ...s,
        status: 'PENDING' as const,
        sentAt: undefined,
        signedAt: undefined,
      };
    });

    const resubmitLog: RequisitionHistoryLog = {
      action: 'REQUISITION RESUBMITTED',
      actor: requestOwner || currentUser.name,
      details: `Requisition resubmitted for approval after refusal. Approval chain restarted from Step 1 (${step1?.stepName || 'Supervisor'}: ${step1?.approver || 'Approver'}).`,
      timestamp: timeNow,
    };

    const updatedHistory = [...historyLogs, resubmitLog];

    setApprovalSteps(restartedSteps);
    setHistoryLogs(updatedHistory);
    setCurrentStatus('Submitted');
    setIsSubmitted(true);

    const saved = await handleSave(false, restartedSteps, updatedHistory, 'Submitted');

    if (restartedSteps[0]) {
      await dispatchApprovalStepEmail(
        restartedSteps[0],
        saved?.prNumber || reference,
        saved?.title || subject,
        saved?.estAmount || estimatedTotal,
        saved?.id || initialData?.id
      );
    }
  };

  // Manual Resend Step Email handler
  const handleSendRequestStep = async (stepNumber: number) => {
    const currentStep = approvalSteps.find((s) => s.stepNumber === stepNumber);
    if (!currentStep) return;

    const timeNow = new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });

    setIsSendingStepEmail(stepNumber);
    await dispatchApprovalStepEmail(currentStep, reference, subject, estimatedTotal);
    setIsSendingStepEmail(null);

    const updatedSteps = approvalSteps.map((s) =>
      s.stepNumber === stepNumber ? { ...s, sentAt: timeNow } : s
    );

    const newLogs: RequisitionHistoryLog[] = [
      ...historyLogs,
      {
        action: 'APPROVAL REQUEST RESENT',
        actor: requestOwner || currentUser.name,
        details: `Approval reminder re-dispatched to Step ${stepNumber} (${currentStep.stepName}: ${currentStep.approver}).`,
        timestamp: timeNow,
      },
    ];

    setApprovalSteps(updatedSteps);
    setHistoryLogs(newLogs);
    await handleSave(false, updatedSteps, newLogs);
  };

  // Save handler (Draft or Submit) - 100% Reliable with strict inventory validation
  const handleSave = async (
    isDraft: boolean,
    overrideSteps?: RequisitionApprovalStep[],
    overrideHistory?: RequisitionHistoryLog[],
    overrideStatus?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Refused'
  ) => {
    const finalSubject = subject.trim() || `Draft ${typeLabel} Requisition (${reference})`;

    if (!isDraft && !subject.trim()) {
      alert('Please provide a Subject / Title for this requisition before submitting.');
      return;
    }

    // STRICT INVENTORY VALIDATION: "do not allow the user to input a new custom item. Always add item data from inventory."
    const itemsWithNames = items.filter((it) => it.name && it.name.trim().length > 0);
    if (!isDraft && itemsWithNames.length === 0) {
      alert('Please add at least one item from inventory before submitting the requisition.');
      return;
    }

    const nonInventoryItems = itemsWithNames.filter(
      (it) => !inventoryItems.some((inv) => inv.name.toLowerCase().trim() === it.name.toLowerCase().trim())
    );

    if (nonInventoryItems.length > 0) {
      alert(
        `Custom item "${nonInventoryItems[0]?.name}" is not permitted. All items must be selected from the inventory suggestions. Please type at least 3 letters in the Product/Service field and select an item from the suggestions list.`
      );
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(isDraft ? 'Saving draft requisition to Supabase...' : 'Submitting requisition...');

    try {
      const finalTotal = estimatedTotal > 0 ? estimatedTotal : Number(budget) || 0;
      const status = overrideStatus || (isDraft ? 'Draft' : 'Submitted');
      const effectiveSteps = overrideSteps || approvalSteps;
      const baseHistory = overrideHistory || historyLogs;

      // Save multiple required dates & primary date across both requisition and items
      const allUnifiedDates = Array.from(
        new Set([
          ...requiredDates,
          ...items.flatMap((it) => it.requiredDates || (it.requiredDate ? [it.requiredDate] : [])),
        ])
      )
        .filter(Boolean)
        .sort();

      const primaryDate = allUnifiedDates.length > 0 ? allUnifiedDates[0] : '';

      // Audit log entry
      const updatedHistory: RequisitionHistoryLog[] = overrideHistory
        ? overrideHistory
        : [
            ...baseHistory,
            {
              action: isDraft
                ? 'DRAFT SAVED'
                : status === 'Approved'
                ? 'REQUISITION APPROVED'
                : status === 'Refused' || status === 'Rejected'
                ? 'REQUISITION REFUSED'
                : 'REQUISITION SUBMITTED',
              actor: requestOwner || currentUser.name,
              details: `Requisition ${reference} ${
                isDraft
                  ? 'saved as draft'
                  : status === 'Refused'
                  ? 'refused and returned to request owner for re-editing'
                  : `marked as ${status}`
              }.`,
              timestamp: new Date().toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true,
              }),
            },
          ];

      const savedReq = await saveProcurementRequest({
        ...(initialData?.id ? { id: initialData.id } : {}),
        prNumber: reference,
        requisitionType,
        title: finalSubject,
        department: department.trim() || currentUser.department,
        requestOwner: requestOwner.trim() || currentUser.name,
        requestOwnerCode: requestOwnerCode || currentUser.code,
        estAmount: finalTotal,
        currency: 'BDT',
        status,
        justification: reasonForPurchase.trim(),
        priority,
        requiredDate: primaryDate,
        requiredDates: allUnifiedDates,
        lineItems: itemsWithNames.map((it) => ({
          ...it,
          requiredDate: it.requiredDate || (it.requiredDates?.[0] || primaryDate),
          requiredDates: it.requiredDates || (it.requiredDate ? [it.requiredDate] : []),
        })),
        attachments,
        project,
        activityCode,
        company,
        supervisor,
        budget: Number(budget) || finalTotal,
        deliveryInstructions,
        description,
        approvalSteps: effectiveSteps,
        historyLogs: updatedHistory,
      });

      setCurrentStatus(status);
      if (status !== 'Draft') {
        setIsSubmitted(true);
      }

      setStatusMessage(
        `${requisitionType} Requisition ${savedReq.prNumber} ${
          isDraft
            ? 'saved as draft'
            : status === 'Approved'
            ? 'approved successfully!'
            : status === 'Refused'
            ? 'refused and returned to request owner for re-editing.'
            : 'submitted successfully! Approval chain activated.'
        }`
      );

      if (onSaved) {
        onSaved(savedReq);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setStatusMessage(null);
        if (!isDraft) {
          // Keep form open for submitted/approved/rejected and scroll down to the Approval Chain section
          const approvalSection = document.getElementById('approval-chain-section');
          if (approvalSection) {
            approvalSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }, 1000);

      return savedReq;
    } catch (err) {
      console.error('Failed to save requisition:', err);
      setIsSubmitting(false);
      setStatusMessage('Error saving requisition. Please check your network and inputs.');
      return null;
    }
  };

  if (!isOpen) return null;
  if (!isClientMounted || typeof document === 'undefined') return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-background text-foreground flex flex-col min-h-screen select-text"
      role="dialog"
      aria-modal="true"
      aria-label={`New ${typeLabel} Request`}
    >
      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* FULL-WIDTH STICKY TOP HEADER                                      */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-8 py-3.5 border-b border-border bg-card/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-muted/60 hover:bg-muted border border-border text-foreground transition cursor-pointer shadow-xs group"
            title="Return to log"
            aria-label="Back to Log"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {initialData ? `${requisitionType} requisition details` : `New ${requisitionType.toLowerCase()} request`}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  currentStatus === 'Submitted'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    : currentStatus === 'Approved'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : currentStatus === 'Rejected' || currentStatus === 'Refused'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {currentStatus === 'Submitted'
                  ? 'SUBMITTED'
                  : currentStatus === 'Approved'
                  ? 'APPROVED'
                  : currentStatus === 'Rejected' || currentStatus === 'Refused'
                  ? 'REFUSED'
                  : initialData
                  ? 'EDIT'
                  : 'NEW'}
              </span>
            </div>
          </div>
        </div>

        {/* APPROVER VIEW: Direct APPROVE and REFUSE action buttons in sticky header */}
        {viewerMode === 'APPROVER' ? (
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => {
                const approvalSection = document.getElementById('approval-chain-section');
                if (approvalSection) {
                  approvalSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 border border-border text-foreground transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Scroll to approval steps and history"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>STEP {activeApproverStep} REVIEW</span>
            </button>
            <button
              type="button"
              onClick={() => handleRefuseStep(activeApproverStep)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              title="Refuse requisition and notify Request Owner"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>REFUSE</span>
            </button>
            <button
              type="button"
              onClick={() => handleApproveStep(activeApproverStep)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
              title="Approve step and advance approval chain"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>APPROVE</span>
            </button>
          </div>
        ) : (
          /* REQUEST OWNER / VIEWER VIEW */
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => {
                if (isSubmittedOrActive) {
                  const approvalSection = document.getElementById('approval-chain-section');
                  if (approvalSection) {
                    approvalSection.scrollIntoView({ behavior: 'smooth' });
                    return;
                  }
                }
                setShowApprovalModal(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 border border-border text-foreground transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Configure Approval Chain & View History"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>APPROVAL CHAIN</span>
            </button>

            {/* If Refused / Rejected: Owner can edit, save draft, or resubmit for approval */}
            {currentStatus === 'Refused' || currentStatus === 'Rejected' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-card hover:bg-muted border border-border text-foreground transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  title="Save draft updates"
                >
                  <span>{isSubmitting ? 'Saving...' : 'Save draft'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResubmitForApproval}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-[#F5A623] hover:bg-[#E09612] text-white shadow-sm transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                  title="Resubmit requisition and restart approval chain from Step 1"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Resubmitting...' : 'Resubmit for Approval'}</span>
                </button>
              </>
            ) : currentStatus === 'Submitted' ? (
              /* If Submitted: Form is locked. Request owner cannot edit. Show Under Review badge */
              <div className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Under Review (Locked)</span>
              </div>
            ) : currentStatus === 'Approved' ? (
              /* If Approved: Form is locked. */
              <div className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Approved &amp; Completed</span>
              </div>
            ) : (
              /* Draft mode: Save draft and Submit request */
              <>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-card hover:bg-muted border border-border text-foreground transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  title="Save draft requisition"
                >
                  <span>{isSubmitting ? 'Saving...' : 'Save draft'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!subject.trim()) {
                      alert('Please provide a Subject / Title for this requisition.');
                      return;
                    }
                    setShowApprovalModal(true);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-[#F5A623] hover:bg-[#E09612] text-white shadow-sm transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Processing...' : 'Submit request'}</span>
                </button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Status banner */}
      {statusMessage && (
        <div className="w-full px-4 sm:px-8 py-2.5 bg-primary/10 border-b border-primary/20 text-xs font-bold text-primary flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Full Page Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-5">
        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* TOP SECTION: 2-COLUMN GRID (LEFT: 4 cols, RIGHT: 8 cols)           */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch relative z-20">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* LEFT COLUMN: Project context with integrated Est. total       */}
          {/* (lg:col-span-4)                                               */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 flex flex-col">
            {/* Card: Project context (Self-contained with Est. total) */}
            <div className="bg-card border border-slate-300/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between h-full">
              <div className="px-4 py-2.5 bg-[#1E2530] dark:bg-sidebar border-b border-slate-700/80 dark:border-sidebar-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-2 font-bold text-xs tracking-tight text-white">
                  <Layers className="h-4 w-4 text-[#F5A623]" />
                  <span className="text-xs font-bold text-white tracking-wide">Project context</span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2.5">
                  {/* Project (People & Culture) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Project (People &amp; Culture)
                    </label>
                    <select
                      disabled={!isFormEditable}
                      value={project}
                      onChange={(e) => {
                        const selName = e.target.value;
                        setProject(selName);
                        const matchedProj = organizationProjects.find((p) => p.name === selName);
                        if (matchedProj?.code) {
                          setActivityCode(matchedProj.code);
                        }
                      }}
                      className={`w-full px-3 py-1.5 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none transition ${
                        !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'cursor-pointer focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                      }`}
                    >
                      <option value="">Select Project...</option>
                      {organizationProjects.map((p) => (
                        <option key={p.id || p.name} value={p.name}>
                          {p.name} {p.code ? `(${p.code})` : ''}
                        </option>
                      ))}
                      {organizationProjects.length === 0 && (
                        <option value="Digital School Modernization">DASRA (PRJ-002)</option>
                      )}
                    </select>
                  </div>

                  {/* 2-Column Row: Activity code & Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-muted-foreground">
                          Activity code
                        </label>
                        <span className="text-[9.5px] text-muted-foreground font-mono">Auto</span>
                      </div>
                      <input
                        type="text"
                        readOnly={!isFormEditable}
                        value={activityCode}
                        onChange={(e) => setActivityCode(e.target.value)}
                        placeholder="PRJ-GEN"
                        className={`w-full px-2.5 py-1.5 bg-muted/40 dark:bg-muted/20 border border-dashed border-border rounded-xl text-xs font-mono font-semibold text-foreground/90 focus:outline-none transition ${
                          !isFormEditable ? 'cursor-not-allowed opacity-75' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-muted-foreground">
                          Department
                        </label>
                        <span className="text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300/40 px-1.5 py-0.2 rounded-full shadow-2xs">
                          Logged
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly={!isFormEditable}
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className={`w-full px-2.5 py-1.5 bg-muted/40 dark:bg-muted/20 border border-dashed border-border rounded-xl text-xs font-medium text-foreground/90 focus:outline-none transition truncate ${
                          !isFormEditable ? 'cursor-not-allowed opacity-75' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Company
                    </label>
                    <select
                      disabled={!isFormEditable}
                      value={company}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className={`w-full px-3 py-1.5 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none transition ${
                        !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'cursor-pointer focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                      }`}
                    >
                      <option value="JAAGO Foundation">JAAGO Foundation (JF)</option>
                      <option value="JAAGO Foundation Trust">JAAGO Foundation Trust (JFT)</option>
                    </select>
                  </div>

                  {/* Request owner with Avatar chip */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Request owner
                    </label>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white dark:bg-muted/30 border border-border shadow-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold text-[10.5px] flex items-center justify-center flex-shrink-0 shadow-xs">
                          NK
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-foreground leading-tight truncate">
                            {requestOwner || 'Nasif Kamal'}
                          </div>
                          <div className="text-[9.5px] text-muted-foreground leading-tight">
                            Requester
                          </div>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-full flex-shrink-0">
                        Owner
                      </span>
                    </div>
                  </div>

                  {/* Supervisor with Avatar chip */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Supervisor
                    </label>
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white dark:bg-muted/30 border border-border shadow-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-bold text-[10.5px] flex items-center justify-center flex-shrink-0 shadow-xs">
                          SN
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-foreground leading-tight truncate">
                            {supervisor || 'S M Nayeem Rahman'}
                          </div>
                          <div className="text-[9.5px] text-muted-foreground leading-tight">
                            Line Manager
                          </div>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 px-2 py-0.5 rounded-full flex-shrink-0">
                        Approver
                      </span>
                    </div>
                  </div>

                  {/* Reference with dynamic status badge */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-muted-foreground">
                        Reference
                      </label>
                      {currentStatus === 'Submitted' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block animate-pulse"></span>
                          <span>Submitted</span>
                        </span>
                      ) : currentStatus === 'Approved' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span>Approved</span>
                        </span>
                      ) : currentStatus === 'Rejected' || currentStatus === 'Refused' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block"></span>
                          <span>Refused</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                          <span>Unstamped draft</span>
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={reference}
                        className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-mono font-bold text-foreground shadow-xs focus:outline-none"
                      />
                      {isFormEditable && (
                        <button
                          type="button"
                          onClick={() => setReference(generateNewReference())}
                          className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Regenerate unique reference code"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Est. total (Included inside Project context block) */}
                <div className="pt-2">
                  <div className="px-3.5 py-2.5 bg-[#1E2530] text-white border border-slate-700/80 rounded-xl shadow-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                      <Calculator className="h-4 w-4 text-[#F5A623]" />
                      <span className="text-white font-bold">Est. total</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-[#F5A623] font-mono tracking-tight">
                      ৳ {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* RIGHT COLUMN: Requisition Details, Products, Supplementary    */}
          {/* (lg:col-span-8)                                               */}
          {/* ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-5">
            {/* Card 1: Requisition details */}
            <div className={`bg-card border border-slate-300/80 dark:border-slate-800 rounded-2xl overflow-visible shadow-xs relative ${
              isReqDatePickerOpen ? 'z-50' : 'z-30'
            }`}>
              <div className="px-4 py-2.5 bg-[#1E2530] dark:bg-sidebar border-b border-slate-700/80 dark:border-sidebar-border rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-xs tracking-tight text-white">
                  <FileText className="h-4 w-4 text-[#F5A623]" />
                  <span className="text-xs font-bold text-white tracking-wide">Requisition details</span>
                </div>
              </div>

              <div className="p-5 space-y-3.5">
                {/* Subject * */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    readOnly={!isFormEditable}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject..."
                    className={`w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none transition ${
                      !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                    }`}
                    required
                  />
                </div>

                {/* 3-Column Row: Date, Priority, Budget */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Date
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly={!isFormEditable}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`w-full pl-3 pr-8 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none transition ${
                          !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                        }`}
                      />
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Priority
                    </label>
                    <select
                      disabled={!isFormEditable}
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className={`w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none transition ${
                        !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'cursor-pointer focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                      }`}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Low">Low</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Budget (৳)
                    </label>
                    <input
                      type="number"
                      readOnly={!isFormEditable}
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="Budget limit..."
                      className={`w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none transition ${
                        !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Required date(s) - Connected Master Date Pool */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Required date(s)
                    </label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {requiredDates.length} selected • connected to items
                    </span>
                  </div>

                  <div className={`min-h-[30px] flex items-center ${!isFormEditable ? 'pointer-events-none opacity-80' : ''}`}>
                    <JaagoDatePicker
                      dates={requiredDates}
                      onSelectDate={(d) => isFormEditable && addRequisitionRequiredDate(d)}
                      onRemoveDate={(d) => {
                        if (!isFormEditable) return;
                        const targetIdx = requiredDates.findIndex(
                          (rd) => formatDateISO(rd) === formatDateISO(d)
                        );
                        if (targetIdx !== -1) removeRequisitionRequiredDate(targetIdx);
                      }}
                      onClear={() => {
                        if (!isFormEditable) return;
                        setRequiredDates([]);
                        setItems((prev) =>
                          prev.map((it) => ({
                            ...it,
                            requiredDates: [],
                            requiredDate: '',
                          }))
                        );
                      }}
                      isMulti={true}
                      onOpenChange={(open) => isFormEditable && setIsReqDatePickerOpen(open)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Supplementary info */}
            <div className="bg-card border border-slate-300/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs relative z-10">
              <div className="px-4 py-2.5 bg-[#1E2530] dark:bg-sidebar border-b border-slate-700/80 dark:border-sidebar-border flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-xs tracking-tight text-white">
                  <Info className="h-4 w-4 text-[#F5A623]" />
                  <span className="text-xs font-bold text-white tracking-wide">Supplementary info</span>
                </div>
              </div>

              <div className="p-5 space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Reason for purchase
                  </label>
                  <AutoResizeTextarea
                    minHeight={56}
                    readOnly={!isFormEditable}
                    value={reasonForPurchase}
                    onChange={(e) => setReasonForPurchase(e.target.value)}
                    placeholder="Reason..."
                    className={`w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none ${
                      !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Delivery instructions
                  </label>
                  <AutoResizeTextarea
                    minHeight={56}
                    readOnly={!isFormEditable}
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Deliver directly to Banani Central Depot, Floor 2."
                    className={`w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none ${
                      !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* FULL-WIDTH SECTION: SERVICE & PRODUCTS (FULL BLOCK)               */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="w-full bg-card border border-slate-300/80 dark:border-slate-800 rounded-2xl overflow-visible shadow-xs relative z-10">
          <div className="px-5 py-3 bg-[#1E2530] dark:bg-sidebar border-b border-slate-700/80 dark:border-sidebar-border rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2 font-bold text-xs tracking-tight text-white">
              <Package className="h-4 w-4 text-[#F5A623]" />
              <span className="text-xs font-bold text-white tracking-wide">Service &amp; products</span>
            </div>

            {/* Header button: Add item */}
            {isFormEditable && (
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#F5A623] hover:bg-[#E09612] text-white shadow-sm transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add item</span>
              </button>
            )}
          </div>

          <div className="p-5 space-y-4 overflow-visible">

              {items.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border rounded-xl bg-card/30">
                  <Package className="h-9 w-9 text-muted-foreground/60 stroke-[1.5]" />
                  <div className="text-xs font-bold text-muted-foreground">
                    No items added to this requisition.
                  </div>
                  {isFormEditable && (
                    <div className="flex items-center space-x-2 mt-1">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#F5A623] hover:bg-[#E09612] text-white shadow-sm transition flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add item</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`border border-border rounded-xl bg-card transition-all duration-200 overflow-visible ${
                    activeItemSearchIdx !== null ? 'pb-48' : ''
                  }`}
                >
                  <div className="overflow-visible">
                    <table className="w-full text-left text-xs border-collapse overflow-visible">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                          <th className="py-3 px-3 w-10 text-center">#</th>
                          <th className="py-3 px-3 min-w-[240px]">Product / service</th>
                          <th className="py-3 px-3 min-w-[180px]">Description</th>
                          <th className="py-3 px-3 min-w-[160px]">Required date</th>
                          <th className="py-3 px-3 w-20 text-center">Qty</th>
                          <th className="py-3 px-3 w-24">Unit</th>
                          <th className="py-3 px-3 w-28 text-right">Price / unit</th>
                          <th className="py-3 px-3 w-32 text-right">Total (৳)</th>
                          <th className="py-3 px-3 w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y border-border">
                        {items.map((item, idx) => {
                          const countAlphabets = (text: string) => (text || '').replace(/[^a-zA-Z0-9]/g, '').length;
                          const letterCount = countAlphabets(item.name);
                          const hasThreeAlphabets = letterCount >= 3;
                          const showSuggestions = isFormEditable && activeItemSearchIdx === idx && hasThreeAlphabets;

                          const q = (item.name || '').trim().toLowerCase();
                          const matchingInventory = hasThreeAlphabets
                            ? inventoryItems.filter((inv) => {
                                return (
                                  inv.name.toLowerCase().includes(q) ||
                                  (inv.itemCode && inv.itemCode.toLowerCase().includes(q)) ||
                                  (inv.category && inv.category.toLowerCase().includes(q))
                                );
                              })
                            : [];

                          const isRecognizedInventory =
                            item.name.trim().length > 0 &&
                            inventoryItems.some((inv) => inv.name.toLowerCase().trim() === item.name.toLowerCase().trim());

                          return (
                            <tr
                              key={item.id || idx}
                              className={`transition align-top ${
                                activeItemSearchIdx === idx || activeItemDatePickerIdx === idx
                                  ? 'relative z-40 bg-muted/20'
                                  : 'hover:bg-muted/20 relative z-0'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center text-muted-foreground font-mono pt-4">
                                {idx + 1}
                              </td>

                              {/* PRODUCT / SERVICE - Search Inventory after 3 characters */}
                              <td className={`py-2.5 px-3 ${activeItemSearchIdx === idx ? 'relative z-40' : 'relative z-10'}`}>
                                <div className="relative">
                                  <input
                                    type="text"
                                    readOnly={!isFormEditable}
                                    value={item.name}
                                    onFocus={() => {
                                      if (isFormEditable) setActiveItemSearchIdx(idx);
                                    }}
                                    onChange={(e) => {
                                      if (!isFormEditable) return;
                                      const val = e.target.value;
                                      handleUpdateItem(idx, 'name', val);
                                      if (itemErrors[idx]) {
                                        setItemErrors((prev) => ({ ...prev, [idx]: null }));
                                      }
                                      setActiveItemSearchIdx(idx);
                                    }}
                                    onKeyDown={(e) => {
                                      if (!isFormEditable) return;
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (showSuggestions && matchingInventory.length > 0) {
                                          handleSelectInventoryForItem(idx, matchingInventory[0]!);
                                        }
                                      } else if (e.key === 'Escape') {
                                        setActiveItemSearchIdx(null);
                                      }
                                    }}
                                    onBlur={() => {
                                      if (!isFormEditable) return;
                                      setTimeout(() => {
                                        setActiveItemSearchIdx((cur) => (cur === idx ? null : cur));
                                        const typedText = (item.name || '').trim();
                                        if (!typedText) return;

                                        const matched = inventoryItems.find(
                                          (inv) => inv.name.toLowerCase().trim() === typedText.toLowerCase()
                                        );
                                        if (matched) {
                                          handleSelectInventoryForItem(idx, matched);
                                        } else {
                                          handleUpdateItem(idx, 'name', '');
                                          handleUpdateItem(idx, 'unit', '');
                                          handleUpdateItem(idx, 'unitCost', 0);
                                          handleUpdateItem(idx, 'totalCost', 0);
                                          setItemErrors((prev) => ({
                                            ...prev,
                                            [idx]: 'Custom items cannot be added. Please select from inventory.',
                                          }));
                                        }
                                      }, 250);
                                    }}
                                    placeholder={isFormEditable ? "Search inventory or type item..." : "Item name"}
                                    className={`w-full px-3 py-2 bg-background border rounded-xl text-xs font-medium text-foreground transition focus:outline-none pr-8 ${
                                      !isFormEditable
                                        ? 'cursor-not-allowed opacity-85 bg-muted/20 border-border'
                                        : itemErrors[idx]
                                        ? 'border-rose-400 bg-rose-500/5 focus:ring-2 focus:ring-[#E8A317] focus:border-[#E8A317]'
                                        : isRecognizedInventory
                                        ? 'border-emerald-500/50 bg-emerald-500/5 focus:ring-2 focus:ring-[#E8A317] focus:border-[#E8A317]'
                                        : 'border-border focus:ring-2 focus:ring-[#E8A317] focus:border-[#E8A317]'
                                    }`}
                                  />

                                  {/* Clear button if item has value */}
                                  {isFormEditable && item.name && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateItem(idx, 'name', '');
                                        handleUpdateItem(idx, 'unit', '');
                                        handleUpdateItem(idx, 'unitCost', 0);
                                        handleUpdateItem(idx, 'totalCost', 0);
                                        setItemErrors((prev) => ({ ...prev, [idx]: null }));
                                      }}
                                      className="absolute right-2.5 top-2.5 p-0.5 rounded text-muted-foreground hover:text-foreground transition cursor-pointer"
                                      title="Clear item selection"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  )}

                                  {/* Inventory Verified Badge */}
                                  {isRecognizedInventory && (
                                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center space-x-1">
                                      <Check className="h-3 w-3 flex-shrink-0" />
                                      <span>Inventory item verified</span>
                                    </div>
                                  )}

                                  {/* Guidance when typing < 3 characters */}
                                  {isFormEditable && activeItemSearchIdx === idx && !hasThreeAlphabets && letterCount > 0 && (
                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center space-x-1">
                                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                      <span>Type at least 3 letters to view suggestions ({letterCount}/3)</span>
                                    </div>
                                  )}

                                  {/* Error message if custom item attempted */}
                                  {isFormEditable && itemErrors[idx] && (
                                    <div className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center space-x-1">
                                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                      <span>{itemErrors[idx]}</span>
                                    </div>
                                  )}

                                  {/* EXACT AUTOCOMPLETE DROPDOWN */}
                                  {showSuggestions && (
                                    <div
                                      className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[360px] max-w-lg bg-card text-foreground border-2 border-[#E8A317] dark:border-[#E8A317] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                                      onMouseDown={(e) => e.preventDefault()}
                                    >
                                      <div className="divide-y divide-border/60 max-h-60 overflow-y-auto">
                                        {matchingInventory.map((inv, sIdx) => {
                                          const isFirst = sIdx === 0;
                                          return (
                                            <div
                                              key={inv.id || sIdx}
                                              onClick={() => handleSelectInventoryForItem(idx, inv)}
                                              className={`px-4 py-2.5 cursor-pointer transition flex items-center justify-between group ${
                                                isFirst
                                                  ? 'bg-amber-500/15 dark:bg-amber-500/20 border-l-4 border-[#E8A317]'
                                                  : 'hover:bg-muted/70'
                                              }`}
                                            >
                                              <div className="flex-1 min-w-0 pr-3">
                                                <div className="font-bold text-foreground text-xs sm:text-[13px] tracking-tight group-hover:text-primary transition truncate flex items-center space-x-1.5">
                                                  <span>{inv.name}</span>
                                                  {isFirst && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#E8A317]/20 text-[#D97706] dark:text-[#FBBF24]">
                                                      ↵ Select
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center space-x-2">
                                                  <span>SKU: {inv.itemCode || 'N/A'}</span>
                                                  {inv.category && (
                                                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-muted">
                                                      {inv.category}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="text-right flex-shrink-0 font-mono font-bold text-[#F5A623] text-xs sm:text-sm">
                                                ৳ {Number(inv.unitCost || 0).toLocaleString()}
                                              </div>
                                            </div>
                                          );
                                        })}
                                        {matchingInventory.length === 0 && (
                                          <div className="px-4 py-3 text-xs text-muted-foreground text-center space-y-0.5">
                                            <div className="font-bold text-foreground">No inventory items found</div>
                                            <div className="text-[10.5px] text-muted-foreground">
                                              Custom items are not permitted. Please select from inventory.
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* DESCRIPTION */}
                              <td className="py-2.5 px-3 align-top">
                                <AutoResizeTextarea
                                  rows={1}
                                  minHeight={36}
                                  resize="both"
                                  readOnly={!isFormEditable}
                                  value={item.description || ''}
                                  onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                  placeholder="Specification notes..."
                                  className={`w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none transition leading-snug ${
                                    !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                                  }`}
                                />
                              </td>

                              {/* REQUIRED DATE */}
                              <td className="py-2.5 px-3 relative overflow-visible">
                                <div className={!isFormEditable ? 'pointer-events-none opacity-80' : ''}>
                                  <JaagoDatePicker
                                    dates={
                                      item.requiredDates && item.requiredDates.length > 0
                                        ? item.requiredDates
                                        : item.requiredDate
                                        ? [item.requiredDate]
                                        : []
                                    }
                                    requisitionDates={requiredDates}
                                    onSelectDate={(d) => isFormEditable && handleAddItemDate(idx, d)}
                                    onRemoveDate={(d) => isFormEditable && handleRemoveItemDate(idx, d)}
                                    onClear={() => isFormEditable && handleClearItemDates(idx)}
                                    isMulti={true}
                                    onOpenChange={(open) => {
                                      if (!isFormEditable) return;
                                      if (open) setActiveItemDatePickerIdx(idx);
                                      else if (activeItemDatePickerIdx === idx) setActiveItemDatePickerIdx(null);
                                    }}
                                  />
                                </div>
                              </td>

                              {/* QTY */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min="1"
                                  readOnly={!isFormEditable}
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                                  className={`w-full px-2 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-center text-foreground shadow-xs focus:outline-none transition ${
                                    !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                                  }`}
                                />
                              </td>

                              {/* UNIT */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  readOnly={!isFormEditable}
                                  value={item.unit || ''}
                                  onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                                  placeholder="PCS"
                                  className={`w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none transition ${
                                    !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                                  }`}
                                />
                              </td>

                              {/* PRICE / UNIT */}
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  readOnly={!isFormEditable}
                                  value={item.unitCost}
                                  onChange={(e) => handleUpdateItem(idx, 'unitCost', e.target.value)}
                                  className={`w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-mono font-medium text-right text-foreground shadow-xs focus:outline-none transition ${
                                    !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                                  }`}
                                />
                              </td>

                              {/* TOTAL (৳) */}
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#F5A623] text-xs sm:text-sm pt-4">
                                ৳ {Number(item.totalCost || 0).toFixed(2)}
                              </td>

                              {/* Delete item icon */}
                              <td className="py-2.5 px-3 text-center pt-3.5">
                                {isFormEditable && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                                    title="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Subtotal Estimated Footer */}
              <div className="pt-2 flex justify-end">
                <div className="text-right">
                  <span className="text-xs font-bold text-muted-foreground mr-2">
                    Subtotal estimated:
                  </span>
                  <span className="text-base font-black text-[#F5A623] font-mono">
                    ৳ {Number(estimatedTotal || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* BOTTOM SECTION: 2-COLUMN GRID (ATTACHMENTS & DESCRIPTION)         */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card 1: Attachments */}
          <div className="bg-card border border-slate-300/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 bg-[#1E2530] dark:bg-sidebar border-b border-slate-700/80 dark:border-sidebar-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Paperclip className="h-4 w-4 text-[#F5A623]" />
                <span className="font-bold text-xs tracking-tight text-white">
                  Attachments
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
                  DRAFT
                </span>
              </div>
              {isFormEditable && (
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Paperclip className="h-3.5 w-3.5 text-slate-300" />
                  <span>Attach</span>
                </button>
              )}
            </div>

            <div className="p-5">
              {attachments.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border rounded-xl bg-muted/20">
                  <UploadCloud className="h-8 w-8 text-muted-foreground/50 stroke-[1.5]" />
                  <div className="text-xs text-muted-foreground">
                    No documents attached yet.
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 bg-background border border-border rounded-xl text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium truncate text-foreground">
                          {att.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({att.size})
                        </span>
                      </div>
                      {isFormEditable && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="text-muted-foreground hover:text-destructive p-1 transition cursor-pointer"
                          title="Remove attachment"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Description */}
          <div className="bg-card border border-slate-300/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 bg-[#1E2530] dark:bg-sidebar border-b border-slate-700/80 dark:border-sidebar-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-[#F5A623]" />
                <span className="font-bold text-xs tracking-tight text-white">
                  Description
                </span>
              </div>
              <span className="text-[9.5px] font-mono text-slate-400 font-semibold">
                TECHNICAL NAME: REASON
              </span>
            </div>

            <div className="p-5 space-y-1.5">
              <label className="block text-[11px] font-semibold text-muted-foreground">
                Description / comments
              </label>
              <AutoResizeTextarea
                minHeight={88}
                readOnly={!isFormEditable}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description for this requisition (Odoo reason field)..."
                className={`w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none transition ${
                  !isFormEditable ? 'cursor-not-allowed opacity-75 bg-muted/20' : 'focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* EMBEDDED APPROVAL CHAIN & HISTORY TRACK (VISIBLE AFTER SUBMITTING) */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {isSubmittedOrActive && (
          <div id="approval-chain-section" className="space-y-5 scroll-mt-20 animate-in fade-in duration-300">
            {/* Card 1: Approval Chain Table */}
            <div className="bg-card border border-slate-300/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              {/* Header matching JAAGO signature dark banner */}
              <div className="px-4 py-2.5 bg-[#1E2530] dark:bg-sidebar border-b border-slate-700/80 dark:border-sidebar-border flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4 w-4 text-[#F5A623]" />
                  <span className="font-bold text-xs tracking-tight text-white">
                    Approval Chain
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {approvalSteps.length} STEPS CONFIGURED
                  </span>
                </div>
                {canRequestOwnerAddSteps && (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                      title="Add another approval step"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>+ ADD STEP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApprovalModal(true)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                      title="Open configuration modal"
                    >
                      <span>Configure Modal</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Table Container matching 7 columns */}
              <div className="p-5 space-y-4">
                <div className="border border-border rounded-2xl overflow-visible bg-card shadow-xs">
                  {/* Table Header strictly matching 7 columns */}
                  <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/50 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-1 flex items-center justify-center">#</div>
                    <div className="col-span-2">STEP NAME</div>
                    <div className="col-span-3">APPROVER</div>
                    <div className="col-span-1 text-center">STATUS</div>
                    <div className="col-span-1 text-center">SIGNATURES</div>
                    <div className="col-span-1 text-center">METHOD</div>
                    <div className="col-span-3 text-right">ACTION</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-border">
                    {approvalSteps.map((step) => {
                      const isApproverForThisStep =
                        !isCurrentUserRequestOwner &&
                        viewerMode === 'APPROVER' &&
                        activeApproverStep === step.stepNumber;
                      const isRowDropdownOpen =
                        activeStepNameDropdown === step.stepNumber || activeApproverSearchStep === step.stepNumber;

                      return (
                        <div
                          key={step.stepNumber}
                          className={`p-3 bg-background lg:bg-card flex flex-wrap lg:grid lg:grid-cols-12 gap-2.5 items-center text-xs transition ${
                            isRowDropdownOpen ? 'relative z-50' : 'relative z-10 hover:bg-muted/15'
                          }`}
                        >
                          {/* # Column */}
                          <div className="lg:col-span-1 flex items-center justify-center">
                            <div className="relative">
                              <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center">
                                {step.stepNumber}
                              </div>
                              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-card" />
                            </div>
                          </div>

                          {/* STEP NAME Column with 12 predefined roles */}
                          <div
                            data-approval-dropdown="true"
                            className="lg:col-span-2 relative min-w-[135px]"
                          >
                            {canEditStep(step) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveStepNameDropdown(
                                    activeStepNameDropdown === step.stepNumber ? null : step.stepNumber
                                  );
                                  setActiveApproverSearchStep(null);
                                }}
                                className="w-full h-9 px-3 py-1.5 bg-muted/40 hover:bg-muted/70 border border-border rounded-xl text-xs font-bold text-foreground flex items-center justify-between space-x-1.5 cursor-pointer shadow-xs transition"
                              >
                                <span className="truncate">{step.stepName || (step.stepNumber === 1 ? 'Supervisor' : 'Manager')}</span>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              </button>
                            ) : (
                              <div className="w-full h-9 px-3 py-1.5 bg-muted/20 border border-border rounded-xl text-xs font-bold text-foreground flex items-center justify-between shadow-xs opacity-80 cursor-default">
                                <span className="truncate">{step.stepName || (step.stepNumber === 1 ? 'Supervisor' : 'Manager')}</span>
                              </div>
                            )}

                            {/* Dropdown Menu */}
                            {activeStepNameDropdown === step.stepNumber && (
                              <div
                                onWheel={(e) => e.stopPropagation()}
                                style={{
                                  maxHeight: '230px',
                                  scrollbarWidth: 'thin',
                                  scrollbarColor: 'hsl(var(--muted-foreground) / 0.5) transparent',
                                }}
                                className="absolute left-0 top-full z-50 mt-1 w-52 max-h-60 overflow-y-auto overscroll-contain touch-pan-y bg-card border border-border rounded-xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 select-none"
                              >
                                {APPROVAL_STEP_NAMES.map((role) => {
                                  const isSelected = step.stepName === role;
                                  return (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => handleSelectStepRole(step.stepNumber, role)}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                                        isSelected
                                          ? 'bg-blue-600 text-white font-bold'
                                          : 'text-foreground hover:bg-muted font-medium'
                                      }`}
                                    >
                                      <span>{role}</span>
                                      {isSelected && <Check className="h-3.5 w-3.5 text-white flex-shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* APPROVER Column with autocomplete and work email */}
                          <div
                            data-approval-dropdown="true"
                            className="lg:col-span-3 relative flex-1 min-w-[170px]"
                          >
                            <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                            <input
                              type="text"
                              readOnly={!canEditStep(step)}
                              value={step.approver}
                              onFocus={() => {
                                if (canEditStep(step)) {
                                  setActiveApproverSearchStep(step.stepNumber);
                                  setActiveStepNameDropdown(null);
                                }
                              }}
                              onChange={(e) => {
                                if (!canEditStep(step)) return;
                                const val = e.target.value;
                                setApprovalSteps((prev) =>
                                  prev.map((s) => {
                                    if (s.stepNumber === step.stepNumber) {
                                      const match = employeesList.find(
                                        (emp) => emp.name.toLowerCase().trim() === val.toLowerCase().trim()
                                      );
                                      return {
                                        ...s,
                                        approver: val,
                                        approverEmail: match ? (match.workEmail || match.personalEmail) : s.approverEmail,
                                        approverId: match?.id || s.approverId,
                                      };
                                    }
                                    return s;
                                  })
                                );
                                setActiveApproverSearchStep(step.stepNumber);
                              }}
                              placeholder={step.stepNumber === 1 ? (supervisor || 'Supervisor') : 'Search employee from P&C...'}
                              className={`w-full pl-8 pr-3 py-2 bg-muted/40 hover:bg-muted/60 border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none shadow-xs transition ${
                                !canEditStep(step) ? 'cursor-not-allowed opacity-80 bg-muted/20' : 'focus:bg-card focus:ring-1 focus:ring-primary'
                              }`}
                            />

                            {/* Autocomplete Dropdown from People & Culture Directory */}
                            {canEditStep(step) && activeApproverSearchStep === step.stepNumber && (
                              <div
                                onWheel={(e) => e.stopPropagation()}
                                style={{
                                  maxHeight: '220px',
                                  scrollbarWidth: 'thin',
                                  scrollbarColor: 'hsl(var(--muted-foreground) / 0.5) transparent',
                                }}
                                className="absolute left-0 min-w-[270px] sm:min-w-[310px] top-full z-50 mt-1 max-h-56 overflow-y-auto overscroll-contain touch-pan-y bg-card border border-border rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 select-none"
                              >
                                {employeesList
                                  .filter((emp) => {
                                    if (!step.approver) return true;
                                    const q = step.approver.toLowerCase().trim();
                                    return (
                                      emp.name.toLowerCase().includes(q) ||
                                      (emp.workEmail && emp.workEmail.toLowerCase().includes(q)) ||
                                      (emp.personalEmail && emp.personalEmail.toLowerCase().includes(q)) ||
                                      (emp.designation && emp.designation.toLowerCase().includes(q)) ||
                                      (emp.department && emp.department.toLowerCase().includes(q))
                                    );
                                  })
                                  .slice(0, 8)
                                  .map((emp) => {
                                    const resolvedWorkEmail =
                                      emp.workEmail ||
                                      emp.personalEmail ||
                                      `${emp.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@jaago.com.bd`;
                                    return (
                                      <button
                                        key={emp.id}
                                        type="button"
                                        onClick={() => handleSelectStepApprover(step.stepNumber, emp.name, resolvedWorkEmail, emp.id)}
                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted transition text-xs flex items-center justify-between cursor-pointer group"
                                      >
                                        <div className="flex-1 min-w-0 pr-2">
                                          <div className="font-bold text-foreground truncate">{emp.name}</div>
                                          {/* Work Email Address from People & Culture */}
                                          <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5 mt-0.5 truncate">
                                            <Mail className="h-3 w-3 shrink-0 text-emerald-500/70" />
                                            <span className="truncate">{resolvedWorkEmail}</span>
                                          </div>
                                          <div className="text-[9.5px] text-muted-foreground mt-0.5 truncate">
                                            {emp.designation || 'Staff'} • {emp.department} {emp.organization ? `• ${emp.organization}` : ''}
                                          </div>
                                        </div>
                                        <UserCheck className="h-4 w-4 text-primary shrink-0 opacity-80 group-hover:opacity-100" />
                                      </button>
                                    );
                                  })}
                                {employeesList.length === 0 && (
                                  <div className="text-xs text-muted-foreground p-2 text-center">
                                    No employees found in directory.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* STATUS Column */}
                          <div className="lg:col-span-1 flex items-center justify-center">
                            {step.status === 'SIGNED' ? (
                              <span className="px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                SIGNED
                              </span>
                            ) : step.status === 'SENT' ? (
                              <span className="px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center space-x-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                <span>SENT</span>
                              </span>
                            ) : step.status === 'REJECTED' ? (
                              <span className="px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                REFUSED
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                PENDING
                              </span>
                            )}
                          </div>

                          {/* SIGNATURES Column */}
                          <div className="lg:col-span-1 flex flex-col items-center justify-center text-center">
                            {step.signedAt ? (
                              <div className="text-[10px] font-bold text-foreground leading-tight">
                                <div>{step.signedAt.split(' ').slice(0, 3).join(' ')}</div>
                                <div className="text-[9px] text-muted-foreground font-normal">
                                  {step.signedAt.split(' ').slice(3).join(' ')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs font-mono">--</span>
                            )}
                          </div>

                          {/* METHOD Column */}
                          <div className="lg:col-span-1 flex items-center justify-center">
                            <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wider whitespace-nowrap">
                              {step.method || 'DRAW ON PAD'}
                            </span>
                          </div>

                          {/* ACTION Column */}
                          <div className="lg:col-span-3 flex items-center justify-end space-x-1.5">
                            {/* If viewing as Approver on this active step -> show REFUSE and APPROVE */}
                            {isApproverForThisStep && (step.status === 'SENT' || step.status === 'PENDING') ? (
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRefuseStep(step.stepNumber)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase transition cursor-pointer shadow-xs"
                                  title="Refuse / Reject this requisition step"
                                >
                                  REFUSE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveStep(step.stepNumber)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase transition cursor-pointer shadow-xs"
                                  title="Approve step and advance to next approver"
                                >
                                  APPROVE
                                </button>
                              </div>
                            ) : (
                              /* Request Owner or non-approver view: strictly SEND REQUEST button */
                              <button
                                type="button"
                                onClick={() => handleSendRequestStep(step.stepNumber)}
                                disabled={isSendingStepEmail === step.stepNumber}
                                className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-[10.5px] font-bold text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
                                title="Send approval request notification email to this approver"
                              >
                                <Send className="h-3 w-3" />
                                <span>{isSendingStepEmail === step.stepNumber ? 'SENDING...' : 'SEND REQUEST'}</span>
                              </button>
                            )}

                            {/* Remove step button (only for step 2+ and when un-signed for request owner) */}
                            {canRemoveStep(step) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveStep(step.stepNumber)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition cursor-pointer hover:bg-destructive/10"
                                title="Remove step"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: History Track / Audit Log */}
            <div id="history-track-section" className="bg-card border border-slate-300/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="px-4 py-2.5 bg-[#1E2530] dark:bg-sidebar border-b border-slate-700/80 dark:border-sidebar-border flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-[#F5A623]" />
                  <span className="font-bold text-xs tracking-tight text-white">
                    History Track & Audit Log
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {historyLogs.length} EVENTS
                  </span>
                </div>
                <span className="text-[9.5px] font-mono text-slate-400 font-semibold">
                  AUDIT LOG • IMMUTABLE
                </span>
              </div>

              <div className="p-5 space-y-2.5">
                {historyLogs.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border rounded-xl bg-muted/20">
                    <Clock className="h-8 w-8 text-muted-foreground/50 stroke-[1.5]" />
                    <div className="text-xs text-muted-foreground">
                      No prior approval logs for this requisition yet. Submission log will be recorded upon confirmation.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historyLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-background border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/15 transition shadow-2xs"
                      >
                        <div className="flex items-start space-x-2.5">
                          <div className="h-6 w-6 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Info className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-foreground">{log.action}</span>
                              {log.actor && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-muted text-muted-foreground">
                                  by {log.actor}
                                </span>
                              )}
                            </div>
                            {log.details && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {log.details}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap sm:text-right">
                          {log.timestamp}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* ADD FROM INVENTORY CATALOG MODAL                                   */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showInventoryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 transition-all animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Add from Inventory"
        >
          <div className="w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden text-foreground animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-[#F5A623]" />
                <h2 className="text-sm font-bold text-foreground">
                  Add Item from Inventory
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInventoryModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Filter Bar */}
            <div className="p-4 border-b border-border space-y-3 bg-background/50">
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder="Search inventory by name, SKU, or category..."
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Stationery', 'IT Hardware', 'Biometric Devices', 'Furniture', 'Services'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setInventoryCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      inventoryCategoryFilter === cat
                        ? 'bg-[#F5A623] text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-border/50 max-h-[50vh]">
              {inventoryItems
                .filter((inv) => {
                  if (inventoryCategoryFilter !== 'All' && inv.category !== inventoryCategoryFilter) return false;
                  if (!inventorySearch.trim()) return true;
                  const q = inventorySearch.toLowerCase().trim();
                  return (
                    inv.name.toLowerCase().includes(q) ||
                    (inv.itemCode && inv.itemCode.toLowerCase().includes(q)) ||
                    (inv.category && inv.category.toLowerCase().includes(q)) ||
                    (inv.warehouse && inv.warehouse.toLowerCase().includes(q))
                  );
                })
                .map((inv) => (
                  <div
                    key={inv.id}
                    className="py-3 flex items-center justify-between hover:bg-muted/30 px-3 rounded-xl transition"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="font-bold text-xs text-foreground truncate">{inv.name}</div>
                      <div className="text-[10.5px] text-muted-foreground flex items-center space-x-2 mt-0.5 font-mono">
                        <span>SKU: {inv.itemCode || 'N/A'}</span>
                        <span>•</span>
                        <span>{inv.category}</span>
                        <span>•</span>
                        <span>{inv.warehouse}</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold">{inv.stockOnHand} {inv.uom} in stock</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <div className="text-right font-mono font-bold text-xs text-foreground">
                        ৳ {inv.unitCost}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddCatalogItem(inv)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#F5A623] hover:bg-[#E09612] text-white transition shadow-sm cursor-pointer flex items-center space-x-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* CONFIGURE APPROVAL CHAIN SMALL WINDOW MODAL                        */}
      {/* Zero Mock Data: Auto-adjusts based on screen size, on submit       */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {showApprovalModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-8 transition-all animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Configure Approval Chain"
        >
          <div className="w-full max-w-xl sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden text-foreground animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight text-foreground">
                    CONFIGURE APPROVAL CHAIN
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Define approvers for this requisition
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition cursor-pointer"
                title="Close"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto px-5 sm:px-7 py-5 space-y-4 text-xs">
              {/* STEPS Section matching Image 2 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <span className="h-4 w-1.5 bg-emerald-500 rounded-full" />
                    <span>STEPS</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ + ADD STEP</span>
                  </button>
                </div>

                {/* Table Container strictly matching Image 2 */}
                <div className="border border-border rounded-2xl overflow-visible bg-card shadow-xs">
                  {/* Table Header strictly matching Image 2 */}
                  <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/50 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-1 flex items-center justify-center">#</div>
                    <div className="col-span-2">STEP NAME</div>
                    <div className="col-span-3">APPROVER</div>
                    <div className="col-span-1 text-center">STATUS</div>
                    <div className="col-span-1 text-center">SIGNATURES</div>
                    <div className="col-span-1 text-center">METHOD</div>
                    <div className="col-span-3 text-right">ACTION</div>
                  </div>

                  {/* Table Rows strictly matching Image 2 */}
                  <div className="divide-y divide-border">
                    {approvalSteps.map((step) => {
                      const isApproverForThisStep =
                        !isCurrentUserRequestOwner &&
                        viewerMode === 'APPROVER' &&
                        activeApproverStep === step.stepNumber;
                      const isRowDropdownOpen =
                        activeStepNameDropdown === step.stepNumber || activeApproverSearchStep === step.stepNumber;

                      return (
                        <div
                          key={step.stepNumber}
                          className={`p-3 bg-background lg:bg-card flex flex-wrap lg:grid lg:grid-cols-12 gap-2.5 items-center text-xs transition ${
                            isRowDropdownOpen ? 'relative z-50' : 'relative z-10 hover:bg-muted/15'
                          }`}
                        >
                          {/* # Column */}
                          <div className="lg:col-span-1 flex items-center justify-center">
                            <div className="relative">
                              <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center">
                                {step.stepNumber}
                              </div>
                              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-card" />
                            </div>
                          </div>

                          {/* STEP NAME Column with 12-role dropdown */}
                          <div
                            data-approval-dropdown="true"
                            className="lg:col-span-2 relative min-w-[135px]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveStepNameDropdown(
                                  activeStepNameDropdown === step.stepNumber ? null : step.stepNumber
                                );
                                setActiveApproverSearchStep(null);
                              }}
                              className="w-full h-9 px-3 py-1.5 bg-muted/40 hover:bg-muted/70 border border-border rounded-xl text-xs font-bold text-foreground flex items-center justify-between space-x-1.5 cursor-pointer shadow-xs transition"
                            >
                              <span className="truncate">{step.stepName || (step.stepNumber === 1 ? 'Supervisor' : 'Manager')}</span>
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            </button>

                            {/* Dropdown Menu matching Image 2 */}
                            {activeStepNameDropdown === step.stepNumber && (
                              <div
                                onWheel={(e) => e.stopPropagation()}
                                style={{
                                  maxHeight: '230px',
                                  scrollbarWidth: 'thin',
                                  scrollbarColor: 'hsl(var(--muted-foreground) / 0.5) transparent',
                                }}
                                className="absolute left-0 top-full z-50 mt-1 w-52 max-h-60 overflow-y-auto overscroll-contain touch-pan-y bg-card border border-border rounded-xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 select-none"
                              >
                                {APPROVAL_STEP_NAMES.map((role) => {
                                  const isSelected = step.stepName === role;
                                  return (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => {
                                        setApprovalSteps((prev) =>
                                          prev.map((s) =>
                                            s.stepNumber === step.stepNumber ? { ...s, stepName: role } : s
                                          )
                                        );
                                        setActiveStepNameDropdown(null);
                                      }}
                                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                                        isSelected
                                          ? 'bg-blue-600 text-white font-bold'
                                          : 'text-foreground hover:bg-muted font-medium'
                                      }`}
                                    >
                                      <span>{role}</span>
                                      {isSelected && <Check className="h-3.5 w-3.5 text-white flex-shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* APPROVER Column matching Image 2 */}
                          <div
                            data-approval-dropdown="true"
                            className="lg:col-span-3 relative flex-1 min-w-[170px]"
                          >
                            <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                            <input
                              type="text"
                              value={step.approver}
                              onFocus={() => {
                                setActiveApproverSearchStep(step.stepNumber);
                                setActiveStepNameDropdown(null);
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                setApprovalSteps((prev) =>
                                  prev.map((s) => {
                                    if (s.stepNumber === step.stepNumber) {
                                      const match = employeesList.find((emp) => emp.name.toLowerCase().trim() === val.toLowerCase().trim());
                                      return {
                                        ...s,
                                        approver: val,
                                        approverEmail: match ? (match.workEmail || match.personalEmail) : s.approverEmail,
                                        approverId: match?.id || s.approverId,
                                      };
                                    }
                                    return s;
                                  })
                                );
                                setActiveApproverSearchStep(step.stepNumber);
                              }}
                              placeholder={step.stepNumber === 1 ? (supervisor || 'Supervisor') : 'Search employee from P&C...'}
                              className="w-full pl-8 pr-3 py-2 bg-muted/40 hover:bg-muted/60 focus:bg-card border border-border rounded-xl text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs transition"
                            />

                            {/* Autocomplete Dropdown from People & Culture Directory */}
                            {activeApproverSearchStep === step.stepNumber && (
                              <div
                                onWheel={(e) => e.stopPropagation()}
                                style={{
                                  maxHeight: '220px',
                                  scrollbarWidth: 'thin',
                                  scrollbarColor: 'hsl(var(--muted-foreground) / 0.5) transparent',
                                }}
                                className="absolute left-0 min-w-[270px] sm:min-w-[310px] top-full z-50 mt-1 max-h-56 overflow-y-auto overscroll-contain touch-pan-y bg-card border border-border rounded-2xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 select-none"
                              >
                                {employeesList
                                  .filter((emp) => {
                                    if (!step.approver) return true;
                                    const q = step.approver.toLowerCase().trim();
                                    return (
                                      emp.name.toLowerCase().includes(q) ||
                                      (emp.workEmail && emp.workEmail.toLowerCase().includes(q)) ||
                                      (emp.personalEmail && emp.personalEmail.toLowerCase().includes(q)) ||
                                      (emp.designation && emp.designation.toLowerCase().includes(q)) ||
                                      (emp.department && emp.department.toLowerCase().includes(q))
                                    );
                                  })
                                  .slice(0, 8)
                                  .map((emp) => {
                                    const resolvedWorkEmail = emp.workEmail || emp.personalEmail || `${emp.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@jaago.com.bd`;
                                    return (
                                      <button
                                        key={emp.id}
                                        type="button"
                                        onClick={() => {
                                          setApprovalSteps((prev) =>
                                            prev.map((s) =>
                                              s.stepNumber === step.stepNumber
                                                ? {
                                                    ...s,
                                                    approver: emp.name,
                                                    approverEmail: resolvedWorkEmail,
                                                    approverId: emp.id,
                                                  }
                                                : s
                                            )
                                          );
                                          setActiveApproverSearchStep(null);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted transition text-xs flex items-center justify-between cursor-pointer group"
                                      >
                                        <div className="flex-1 min-w-0 pr-2">
                                          <div className="font-bold text-foreground truncate">{emp.name}</div>
                                          {/* Work Email Address from People & Culture Employee Profile */}
                                          <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5 mt-0.5 truncate">
                                            <Mail className="h-3 w-3 shrink-0 text-emerald-500/70" />
                                            <span className="truncate">{resolvedWorkEmail}</span>
                                          </div>
                                          <div className="text-[9.5px] text-muted-foreground mt-0.5 truncate">
                                            {emp.designation || 'Staff'} • {emp.department} {emp.organization ? `• ${emp.organization}` : ''}
                                          </div>
                                        </div>
                                        <UserCheck className="h-4 w-4 text-primary shrink-0 opacity-80 group-hover:opacity-100" />
                                      </button>
                                    );
                                  })}
                                {employeesList.length === 0 && (
                                  <div className="text-xs text-muted-foreground p-2 text-center">
                                    No employees found in directory.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* STATUS Column matching Image 2 */}
                          <div className="lg:col-span-1 flex items-center justify-center">
                            {step.status === 'SIGNED' ? (
                              <span className="px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                SIGNED
                              </span>
                            ) : step.status === 'SENT' ? (
                              <span className="px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                SENT
                              </span>
                            ) : step.status === 'REJECTED' ? (
                              <span className="px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                REFUSED
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                PENDING
                              </span>
                            )}
                          </div>

                          {/* SIGNATURES Column matching Image 2 */}
                          <div className="lg:col-span-1 flex flex-col items-center justify-center text-center">
                            {step.signedAt ? (
                              <div className="text-[10px] font-bold text-foreground leading-tight">
                                <div>{step.signedAt.split(' ').slice(0, 3).join(' ')}</div>
                                <div className="text-[9px] text-muted-foreground font-normal">
                                  {step.signedAt.split(' ').slice(3).join(' ')}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs font-mono">--</span>
                            )}
                          </div>

                          {/* METHOD Column matching Image 2 */}
                          <div className="lg:col-span-1 flex items-center justify-center">
                            <span className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wider whitespace-nowrap">
                              {step.method || 'DRAW ON PAD'}
                            </span>
                          </div>

                          {/* ACTION Column matching Image 2 */}
                          <div className="lg:col-span-3 flex items-center justify-end space-x-1.5">
                            {/* If viewing as Approver on this active step -> show REFUSE and APPROVE */}
                            {isApproverForThisStep && (step.status === 'SENT' || step.status === 'PENDING') ? (
                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRefuseStep(step.stepNumber)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase transition cursor-pointer shadow-xs"
                                  title="Refuse / Reject this requisition step"
                                >
                                  REFUSE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveStep(step.stepNumber)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase transition cursor-pointer shadow-xs"
                                  title="Approve step and advance to next approver"
                                >
                                  APPROVE
                                </button>
                              </div>
                            ) : (
                              /* Request Owner or non-approver view: strictly SEND REQUEST button (Image 2) */
                              <button
                                type="button"
                                onClick={() => handleSendRequestStep(step.stepNumber)}
                                disabled={isSendingStepEmail === step.stepNumber}
                                className="px-3 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-[10.5px] font-bold text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
                                title="Send approval request notification email to this approver"
                              >
                                <Send className="h-3 w-3" />
                                <span>{isSendingStepEmail === step.stepNumber ? 'SENDING...' : 'SEND REQUEST'}</span>
                              </button>
                            )}

                            {/* Remove step button (only for step 2+) */}
                            {step.stepNumber > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveStep(step.stepNumber)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition cursor-pointer hover:bg-destructive/10"
                                title="Remove step"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* HISTORY LOGS Section matching Image 2 */}
              <div className="pt-3 border-t border-border space-y-2.5">
                <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>HISTORY LOGS</span>
                </div>

                <div className="space-y-2">
                  {historyLogs.length === 0 ? (
                    <div className="p-3.5 bg-background border border-dashed border-border rounded-xl text-center text-muted-foreground text-xs">
                      No prior approval logs for this new requisition. Submission log will be recorded upon confirmation.
                    </div>
                  ) : (
                    historyLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-background border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                      >
                        <div className="flex items-start space-x-2.5">
                          <div className="h-5 w-5 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Info className="h-3 w-3" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{log.action}</div>
                            {log.details && (
                              <div className="text-[10px] text-muted-foreground">
                                {log.details}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground whitespace-nowrap sm:text-right">
                          {log.timestamp}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Info Banner strictly matching Image 2 text */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground flex items-center space-x-2">
                <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span>
                  Add multiple steps in sequence. Use <strong className="text-foreground">Save Chain</strong> to persist draft steps, or <strong className="text-foreground">Confirm</strong> to finalize.
                </span>
              </div>
            </div>

            {/* Modal Footer strictly matching Image 2 with Amber Confirm button */}
            <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition cursor-pointer text-foreground"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (currentStatus === 'Draft') {
                    await handleConfirmApprovalChain();
                  } else {
                    setShowApprovalModal(false);
                    await handleSave(false, approvalSteps, historyLogs, currentStatus as any);
                  }
                }}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#E09612] text-white text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>
                  {isSubmitting
                    ? 'SAVING...'
                    : currentStatus === 'Draft'
                    ? 'CONFIRM'
                    : 'SAVE CHAIN'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
