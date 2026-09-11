'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Check,
  Search,
  UserCheck,
  AlertCircle,
  Calculator,
  ChevronLeft,
  ChevronRight,
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

interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
}

/**
 * Auto-adjusts height based on content while supporting manual user vertical resize
 */
const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, onChange, minHeight = 56, className = '', style, ...props }, forwardedRef) => {
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

      el.style.height = 'auto';
      const scrollHeight = el.scrollHeight;
      const baseHeight = userAdjustedHeightRef.current ?? minHeight;
      const targetHeight = Math.max(scrollHeight + 2, baseHeight, minHeight);

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
        onMouseUp={handleResizeEnd}
        onTouchEnd={handleResizeEnd}
        style={{
          minHeight: `${minHeight}px`,
          ...style,
        }}
        className={`resize-y overflow-y-auto transition-colors ${className}`}
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
  initialData?: ProcurementRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (req: ProcurementRequest) => void;
}

export function RequisitionFormWindow({
  requisitionType,
  initialData,
  isOpen,
  onClose,
  onSaved,
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);


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

          // Initialize Clean, Unmocked Approval Steps
          setApprovalSteps([
            {
              stepNumber: 1,
              stepName: 'Supervisor',
              approver: empSupervisor,
              status: 'PENDING',
              method: 'DIGITAL SIGNATURE',
            },
            {
              stepNumber: 2,
              stepName: 'Department Head',
              approver: '',
              status: 'PENDING',
              method: 'DIGITAL SIGNATURE',
            },
            {
              stepNumber: 3,
              stepName: 'Admin & Procurement',
              approver: '',
              status: 'PENDING',
              method: 'DIGITAL SIGNATURE',
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
      if (initialData.approvalSteps && initialData.approvalSteps.length > 0) {
        setApprovalSteps(initialData.approvalSteps as any);
      } else {
        setApprovalSteps([]);
      }
      if (initialData.historyLogs && initialData.historyLogs.length > 0) {
        setHistoryLogs(initialData.historyLogs as any);
      } else {
        setHistoryLogs([]);
      }
    } else {
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

  // Calculate estimated total
  const estimatedTotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.totalCost) || 0), 0);
  }, [items]);

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

  // Approval step management
  const handleAddStep = () => {
    setApprovalSteps((prev) => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        stepName: 'Procurement Officer',
        approver: '',
        status: 'PENDING',
        method: 'DIGITAL SIGNATURE',
      },
    ]);
  };

  const handleRemoveStep = (stepNumber: number) => {
    setApprovalSteps((prev) =>
      prev
        .filter((s) => s.stepNumber !== stepNumber)
        .map((s, idx) => ({ ...s, stepNumber: idx + 1 }))
    );
  };

  // Save handler (Draft or Submit) - 100% Reliable with strict inventory validation
  const handleSave = async (isDraft: boolean) => {
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
      const status = isDraft ? 'Draft' : 'Submitted';

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
      const updatedHistory: RequisitionHistoryLog[] = [
        ...historyLogs,
        {
          action: isDraft ? 'DRAFT SAVED' : 'REQUISITION SUBMITTED',
          actor: requestOwner,
          details: `Requisition ${reference} ${isDraft ? 'saved as draft' : 'submitted for workflow approval'}.`,
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
        approvalSteps,
        historyLogs: updatedHistory,
      });

      setStatusMessage(
        `${requisitionType} Requisition ${savedReq.prNumber} ${
          isDraft ? 'saved as draft' : 'submitted successfully'
        }!`
      );

      if (onSaved) {
        onSaved(savedReq);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setStatusMessage(null);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save requisition:', err);
      setIsSubmitting(false);
      setStatusMessage('Error saving requisition. Please check your network and inputs.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-background text-foreground flex flex-col min-h-screen transition-all animate-in fade-in duration-150 select-text"
      role="dialog"
      aria-modal="true"
      aria-label={`New ${typeLabel} Request`}
    >
      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* FULL-WIDTH STICKY TOP HEADER                                      */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 w-full px-4 sm:px-8 py-3.5 border-b border-border bg-card/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-card hover:bg-muted border border-border text-foreground transition cursor-pointer shadow-sm group"
            title="Return to log"
            aria-label="Back to Log"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {initialData ? `${typeLabel} requisition details` : `New ${requisitionType.toLowerCase()} request`}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                {initialData ? 'EDIT' : 'NEW'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {initialData && (
            <button
              type="button"
              onClick={() => setShowApprovalModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 border border-border text-foreground transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="View Approval Chain & History"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>APPROVAL CHAIN</span>
            </button>
          )}
          {/* SAVE DRAFT BUTTON */}
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-card hover:bg-muted border border-border text-foreground transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
            title="Save draft requisition"
          >
            <span>{isSubmitting ? 'Saving...' : 'Save draft'}</span>
          </button>
          {/* SUBMIT REQUEST BUTTON */}
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
        </div>
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
                      value={project}
                      onChange={(e) => {
                        const selName = e.target.value;
                        setProject(selName);
                        const matchedProj = organizationProjects.find((p) => p.name === selName);
                        if (matchedProj?.code) {
                          setActivityCode(matchedProj.code);
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition cursor-pointer"
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
                        value={activityCode}
                        onChange={(e) => setActivityCode(e.target.value)}
                        placeholder="PRJ-GEN"
                        className="w-full px-2.5 py-1.5 bg-muted/40 dark:bg-muted/20 border border-dashed border-border rounded-xl text-xs font-mono font-semibold text-foreground/90 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
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
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-muted/40 dark:bg-muted/20 border border-dashed border-border rounded-xl text-xs font-medium text-foreground/90 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition truncate"
                      />
                    </div>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Company
                    </label>
                    <select
                      value={company}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition cursor-pointer"
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

                  {/* Reference with inline Unstamped draft status */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-muted-foreground">
                        Reference
                      </label>
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
                        <span>Unstamped draft</span>
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={reference}
                        className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-mono font-bold text-foreground shadow-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setReference(generateNewReference())}
                        className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title="Regenerate unique reference code"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
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
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject..."
                    className="w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
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
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition cursor-pointer"
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
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="Budget limit..."
                      className="w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
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

                  <div className="min-h-[30px] flex items-center">
                    <JaagoDatePicker
                      dates={requiredDates}
                      onSelectDate={(d) => addRequisitionRequiredDate(d)}
                      onRemoveDate={(d) => {
                        const targetIdx = requiredDates.findIndex(
                          (rd) => formatDateISO(rd) === formatDateISO(d)
                        );
                        if (targetIdx !== -1) removeRequisitionRequiredDate(targetIdx);
                      }}
                      onClear={() => {
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
                      onOpenChange={(open) => setIsReqDatePickerOpen(open)}
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
                    value={reasonForPurchase}
                    onChange={(e) => setReasonForPurchase(e.target.value)}
                    placeholder="Reason..."
                    className="w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Delivery instructions
                  </label>
                  <AutoResizeTextarea
                    minHeight={56}
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Deliver directly to Banani Central Depot, Floor 2."
                    className="w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#F5A623] hover:bg-[#E09612] text-white shadow-sm transition flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add item</span>
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-visible">

              {items.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border rounded-xl bg-card/30">
                  <Package className="h-9 w-9 text-muted-foreground/60 stroke-[1.5]" />
                  <div className="text-xs font-bold text-muted-foreground">
                    No items added to this requisition.
                  </div>
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
                          const showSuggestions = activeItemSearchIdx === idx && hasThreeAlphabets;

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
                              className={`transition ${
                                activeItemSearchIdx === idx || activeItemDatePickerIdx === idx
                                  ? 'relative z-40 bg-muted/20'
                                  : 'hover:bg-muted/20 relative z-0'
                              }`}
                            >
                              <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">
                                {idx + 1}
                              </td>

                              {/* PRODUCT / SERVICE - Search Inventory after 3 characters */}
                              <td className={`py-2.5 px-3 ${activeItemSearchIdx === idx ? 'relative z-40' : 'relative z-10'}`}>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onFocus={() => {
                                      setActiveItemSearchIdx(idx);
                                    }}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      handleUpdateItem(idx, 'name', val);
                                      if (itemErrors[idx]) {
                                        setItemErrors((prev) => ({ ...prev, [idx]: null }));
                                      }
                                      setActiveItemSearchIdx(idx);
                                    }}
                                    onKeyDown={(e) => {
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
                                    placeholder="Search inventory or type item..."
                                    className={`w-full px-3 py-2 bg-background border rounded-xl text-xs font-medium text-foreground transition focus:outline-none focus:ring-2 focus:ring-[#E8A317] focus:border-[#E8A317] pr-8 ${
                                      itemErrors[idx]
                                        ? 'border-rose-400 bg-rose-500/5'
                                        : isRecognizedInventory
                                        ? 'border-emerald-500/50 bg-emerald-500/5'
                                        : 'border-border'
                                    }`}
                                  />

                                  {/* Clear button if item has value */}
                                  {item.name && (
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
                                  {activeItemSearchIdx === idx && !hasThreeAlphabets && letterCount > 0 && (
                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center space-x-1">
                                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                      <span>Type at least 3 letters to view suggestions ({letterCount}/3)</span>
                                    </div>
                                  )}

                                  {/* Error message if custom item attempted */}
                                  {itemErrors[idx] && (
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
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={item.description || ''}
                                  onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                  placeholder="Specification notes..."
                                  className="w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                                />
                              </td>

                              {/* REQUIRED DATE */}
                              <td className="py-2.5 px-3 relative overflow-visible">
                                <JaagoDatePicker
                                  dates={
                                    item.requiredDates && item.requiredDates.length > 0
                                      ? item.requiredDates
                                      : item.requiredDate
                                      ? [item.requiredDate]
                                      : []
                                  }
                                  requisitionDates={requiredDates}
                                  onSelectDate={(d) => handleAddItemDate(idx, d)}
                                  onRemoveDate={(d) => handleRemoveItemDate(idx, d)}
                                  onClear={() => handleClearItemDates(idx)}
                                  isMulti={true}
                                  onOpenChange={(open) => {
                                    if (open) setActiveItemDatePickerIdx(idx);
                                    else if (activeItemDatePickerIdx === idx) setActiveItemDatePickerIdx(null);
                                  }}
                                />
                              </td>

                              {/* QTY */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                                  className="w-full px-2 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-center text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                                />
                              </td>

                              {/* UNIT */}
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  value={item.unit || ''}
                                  onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                                  placeholder="PCS"
                                  className="w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                                />
                              </td>

                              {/* PRICE / UNIT */}
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitCost}
                                  onChange={(e) => handleUpdateItem(idx, 'unitCost', e.target.value)}
                                  className="w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-mono font-medium text-right text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                                />
                              </td>

                              {/* TOTAL (৳) */}
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#F5A623] text-xs sm:text-sm">
                                ৳ {Number(item.totalCost || 0).toFixed(2)}
                              </td>

                              {/* Delete item icon */}
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
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
              <button
                type="button"
                onClick={handleAddAttachment}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Paperclip className="h-3.5 w-3.5 text-slate-300" />
                <span>Attach</span>
              </button>
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
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="text-muted-foreground hover:text-destructive p-1 transition cursor-pointer"
                        title="Remove attachment"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description for this requisition (Odoo reason field)..."
                className="w-full px-3 py-2 bg-white dark:bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>
        </div>
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
            <div className="overflow-y-auto px-5 sm:px-7 py-5 space-y-5 text-xs">
              {/* STEPS Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                    <span className="h-3.5 w-1 bg-emerald-500 rounded-full" />
                    <span>STEPS</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="px-3 py-1 rounded-lg text-[10.5px] font-black uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>ADD STEP</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {approvalSteps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="p-3 bg-background border border-border rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center space-x-3 min-w-[200px] flex-1">
                        <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-black text-[10.5px] flex items-center justify-center flex-shrink-0">
                          {step.stepNumber}
                        </div>
                        <input
                          type="text"
                          value={step.stepName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setApprovalSteps((prev) =>
                              prev.map((s) =>
                                s.stepNumber === step.stepNumber ? { ...s, stepName: val } : s
                              )
                            );
                          }}
                          className="w-28 px-2 py-1 bg-card border border-border rounded text-xs font-bold text-foreground focus:outline-none"
                        />

                        {/* Approver Search with Real People & Culture Directory */}
                        <div className="relative flex-1 min-w-[140px]">
                          <Search className="h-3 w-3 absolute left-2.5 top-2 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            value={step.approver}
                            onFocus={() => setActiveApproverSearchStep(step.stepNumber)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setApprovalSteps((prev) =>
                                prev.map((s) =>
                                  s.stepNumber === step.stepNumber ? { ...s, approver: val } : s
                                )
                              );
                              setActiveApproverSearchStep(step.stepNumber);
                            }}
                            placeholder="Search employee from P&C..."
                            className="w-full pl-7 pr-2 py-1 bg-card border border-border rounded text-xs font-medium text-foreground focus:outline-none"
                          />

                          {/* Real Employee Directory Dropdown */}
                          {activeApproverSearchStep === step.stepNumber && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto bg-card border border-border rounded-lg shadow-xl p-1 space-y-1">
                              {employeesList
                                .filter((emp) =>
                                  !step.approver ||
                                  emp.name.toLowerCase().includes(step.approver.toLowerCase()) ||
                                  (emp.designation && emp.designation.toLowerCase().includes(step.approver.toLowerCase())) ||
                                  (emp.department && emp.department.toLowerCase().includes(step.approver.toLowerCase()))
                                )
                                .slice(0, 6)
                                .map((emp) => (
                                  <button
                                    key={emp.id}
                                    type="button"
                                    onClick={() => {
                                      setApprovalSteps((prev) =>
                                        prev.map((s) =>
                                          s.stepNumber === step.stepNumber ? { ...s, approver: emp.name } : s
                                        )
                                      );
                                      setActiveApproverSearchStep(null);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-muted transition text-xs flex items-center justify-between cursor-pointer"
                                  >
                                    <div>
                                      <div className="font-bold text-foreground">{emp.name}</div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {emp.designation || 'Staff'} • {emp.department}
                                      </div>
                                    </div>
                                    <UserCheck className="h-3 w-3 text-primary" />
                                  </button>
                                ))}
                              {employeesList.length === 0 && (
                                <div className="text-xs text-muted-foreground p-1 text-center">
                                  No employees found.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {step.status === 'SIGNED' ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            SIGNED
                          </span>
                        ) : step.status === 'SENT' ? (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            SENT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            PENDING
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {step.signedAt || '--'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9.5px] font-black tracking-wider uppercase">
                          {step.method || 'DIGITAL SIGNATURE'}
                        </span>

                        {/* Remove step button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(step.stepNumber)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive transition cursor-pointer"
                          title="Remove step"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {approvalSteps.length === 0 && (
                    <div className="text-center py-4 border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                      No approval steps configured. Click &quot;ADD STEP&quot; to define an approver.
                    </div>
                  )}
                </div>
              </div>

              {/* HISTORY LOGS Section - CLEAN, NO MOCK DATA */}
              <div className="pt-3 border-t border-border space-y-2.5">
                <div className="flex items-center space-x-2 text-primary font-black text-xs uppercase tracking-wider">
                  <Clock className="h-3.5 w-3.5" />
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
                        className="p-3 bg-background border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                      >
                        <div className="flex items-start space-x-2">
                          <Info className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
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

              {/* Info Banner */}
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground flex items-center space-x-2">
                <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span>
                  Configure approval steps in sequence. Click{' '}
                  <strong className="text-foreground">CONFIRM</strong> to finalize submission.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowApprovalModal(false)}
                className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowApprovalModal(false);
                  await handleSave(false);
                }}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isSubmitting ? 'SUBMITTING...' : 'CONFIRM'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
