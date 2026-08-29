'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Upload,
  Download,
  Plus,
  Search,
  RotateCw,
  X,
  UserPlus,
  Mail,
  CheckCircle2,
  Check,
  ExternalLink,
  Edit3,
  Archive,
  Trash2,
  Send,
  Loader2,
  FileText,
  AlertTriangle,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from 'lucide-react';
import {
  EmployeeProfileDetail,
  FullEmployeeProfile,
  EmployeeStatus,
} from '@/components/pnc/employee-profile-detail';
import {
  fetchEmployeesFromSupabase,
  saveEmployeeToSupabase,
  archiveEmployeesInSupabase,
  unarchiveEmployeesInSupabase,
  deleteEmployeesFromSupabase,
} from '@/lib/supabase-employees';
import { syncEmployeeToLocalUser } from '@/lib/user-profile-sync';
import {
  exportEmployeesToComprehensiveCSV,
  parseComprehensiveEmployeeCSV,
} from '@/lib/employee-csv-helper';
import {
  ALL_EMPLOYEE_COLUMNS,
  DEFAULT_VISIBLE_COLUMN_KEYS,
  getCategorizedColumns,
  EmployeeColumnConfig,
} from '@/lib/employee-columns-config';

export default function PnCEmployeesPage() {
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);

  // Current selected employee for the rich tab-wise profile view (null = Table view)
  const [selectedProfile, setSelectedProfile] = useState<FullEmployeeProfile | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importParsedResult, setImportParsedResult] = useState<{
    employees: FullEmployeeProfile[];
    errors: string[];
    totalParsed: number;
  } | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

  // Current logged in user info
  const [currentUser, setCurrentUser] = useState({
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator',
  });

  // Invite Success Modal State
  const [showInviteSuccessModal, setShowInviteSuccessModal] = useState<{
    employee: FullEmployeeProfile;
    emailPayload: {
      to: string;
      recipientName?: string;
      subject?: string;
      userId: string;
      tempPassword: string;
      loginUrl: string;
      securityNote?: string;
      fullEmailText?: string;
      sentAt: string;
    };
  } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'ACTIVE' | 'TERMINATED' | 'RESIGNED' | 'INCOMPLETE' | 'ARCHIVED'
  >('ALL');

  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  // ── COLUMN SELECTION & CUSTOMIZATION ──
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<(keyof FullEmployeeProfile)[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jaago_pnc_employee_custom_columns_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_VISIBLE_COLUMN_KEYS;
  });
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  // ── SORTING STATE ──
  const [sortKey, setSortKey] = useState<keyof FullEmployeeProfile | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  // Categorized Columns for Dropdown Popover
  const categorizedColumns = useMemo(() => getCategorizedColumns(), []);

  // Visible Column Config Objects
  const visibleColumnConfigs = useMemo(() => {
    return visibleColumnKeys
      .map((key) => ALL_EMPLOYEE_COLUMNS.find((c) => c.key === key))
      .filter((c): c is EmployeeColumnConfig => Boolean(c));
  }, [visibleColumnKeys]);

  // Click outside to close Columns Popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
        setIsColumnsMenuOpen(false);
      }
    }
    if (isColumnsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnsMenuOpen]);

  // Column Selection Handlers
  const handleToggleColumn = (key: keyof FullEmployeeProfile) => {
    let nextKeys: (keyof FullEmployeeProfile)[];
    if (visibleColumnKeys.includes(key)) {
      if (visibleColumnKeys.length <= 1) return;
      nextKeys = visibleColumnKeys.filter((k) => k !== key);
    } else {
      nextKeys = [...visibleColumnKeys, key];
    }
    setVisibleColumnKeys(nextKeys);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jaago_pnc_employee_custom_columns_v2', JSON.stringify(nextKeys));
      } catch {}
    }
  };

  const handleResetColumns = () => {
    setVisibleColumnKeys(DEFAULT_VISIBLE_COLUMN_KEYS);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jaago_pnc_employee_custom_columns_v2', JSON.stringify(DEFAULT_VISIBLE_COLUMN_KEYS));
      } catch {}
    }
  };

  const handleSelectAllColumns = () => {
    const allKeys = ALL_EMPLOYEE_COLUMNS.map((c) => c.key);
    setVisibleColumnKeys(allKeys);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jaago_pnc_employee_custom_columns_v2', JSON.stringify(allKeys));
      } catch {}
    }
  };

  // Sorting Handler
  const handleSort = (key: keyof FullEmployeeProfile) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Hydrate state on client mount and fetch Supabase Source of Truth
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jaago_pnc_employees_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setEmployees(parsed);
          }
        }
      } catch {}

      try {
        const userStr = localStorage.getItem('jaago_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          if (parsed.fullName) {
            setCurrentUser({
              fullName: parsed.fullName,
              jobTitle: parsed.jobTitle || 'Coordinator',
            });
          }
        }
      } catch {}

      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('id');
      const isNewAction = params.get('action') === 'new';

      if (isNewAction) {
        setSelectedProfile({} as FullEmployeeProfile);
      }

      // Fetch latest employees directly from Supabase PostgreSQL (Single Source of Truth)
      fetchEmployeesFromSupabase()
        .then((remoteData) => {
          if (remoteData !== null) {
            setEmployees(remoteData);
            try {
              localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(remoteData));
            } catch {}

            if (urlId) {
              const target = remoteData.find((e) => e.id === urlId || e.code === urlId);
              if (target) setSelectedProfile(target);
            }
          }
        });
    }
  }, []);

  // Persist employees state to localStorage
  const persistEmployees = (updatedList: FullEmployeeProfile[]) => {
    setEmployees(updatedList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(updatedList));
      } catch {}
    }
  };

  // Filter & Sort employees
  const filtered = useMemo(() => {
    const list = employees.filter((emp) => {
      const isArchived = emp.status === 'Archived' || Boolean(emp.isArchived);

      // If ARCHIVED tab is selected, show ONLY archived employees
      if (activeTab === 'ARCHIVED') {
        if (!isArchived) return false;
      } else {
        // In all standard tabs, NEVER show archived employees
        if (isArchived) return false;
      }

      if (activeTab === 'ACTIVE' && emp.status !== 'Active') return false;
      if (activeTab === 'TERMINATED' && emp.status !== 'Terminated') return false;
      if (activeTab === 'RESIGNED' && emp.status !== 'Resigned') return false;
      if (activeTab === 'INCOMPLETE' && emp.status !== 'Incomplete') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchCode = emp.code.toLowerCase().includes(q);
        const matchEmail = (emp.workEmail || '').toLowerCase().includes(q);
        const matchDesig = (emp.designation || '').toLowerCase().includes(q);
        const matchDept = (emp.department || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchEmail && !matchDesig && !matchDept) return false;
      }

      if (selectedDept && emp.department !== selectedDept) return false;
      if (selectedOrg && emp.organization !== selectedOrg) return false;
      if (selectedBranch && emp.branch !== selectedBranch) return false;
      if (selectedDesignation && emp.designation !== selectedDesignation) return false;

      return true;
    });

    if (sortKey && sortDirection) {
      list.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (valA === undefined || valA === null || valA === '') return 1;
        if (valB === undefined || valB === null || valB === '') return -1;

        let cmp = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          cmp = valA - valB;
        } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
          cmp = valA === valB ? 0 : valA ? -1 : 1;
        } else {
          cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        }

        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [employees, activeTab, searchQuery, selectedDept, selectedOrg, selectedBranch, selectedDesignation, sortKey, sortDirection]);

  // Dynamic Cell Content Renderer
  const renderCellContent = (emp: FullEmployeeProfile, colKey: keyof FullEmployeeProfile) => {
    const val = emp[colKey];

    if (colKey === 'name') {
      const initials = emp.name
        ? emp.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'EM';
      return (
        <div className="flex items-center space-x-3">
          {emp.avatarUrl ? (
            <div className="h-9 w-9 rounded-full overflow-hidden relative shadow-sm border border-border flex-shrink-0">
              <Image
                src={emp.avatarUrl}
                alt={emp.name}
                fill
                sizes="36px"
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-9 w-9 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0 border border-amber-500/20">
              {initials}
            </div>
          )}
          <div>
            <div className="font-extrabold text-foreground group-hover:text-amber-500 transition">
              {emp.name}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              ID: {emp.code}
            </div>
            {emp.workEmail && (
              <div className="text-[10px] text-muted-foreground/80">{emp.workEmail}</div>
            )}
          </div>
        </div>
      );
    }

    if (colKey === 'status') {
      return <div className="text-center">{getStatusBadge(emp.status)}</div>;
    }

    if (colKey === 'isUser') {
      return (
        <div className="text-center">
          {emp.isUser ? (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold inline-flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>User Active</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-medium">
              No
            </span>
          )}
        </div>
      );
    }

    if (colKey === 'noTaxDeduction') {
      return <span>{emp.noTaxDeduction ? 'Yes' : 'No'}</span>;
    }

    if (
      [
        'wage',
        'salaryJulDec',
        'salaryJanJun',
        'regularSalary',
        'temporarySalary',
        'totalCurrentSalary',
        'extraPayment',
        'insuranceMonthlyPremium',
      ].includes(colKey as string)
    ) {
      const num = Number(val || 0);
      return (
        <span className="font-mono font-bold text-foreground">
          ৳{num.toLocaleString()}
        </span>
      );
    }

    if (
      colKey === 'joiningDate' ||
      colKey === 'contractEndDate' ||
      colKey === 'birthday' ||
      colKey === 'adjustmentStartDate' ||
      colKey === 'adjustmentEndDate'
    ) {
      return (
        <span className="font-mono text-[11px] text-muted-foreground">
          {val ? String(val).slice(0, 10) : '—'}
        </span>
      );
    }

    if (val === undefined || val === null || val === '') {
      return <span className="text-muted-foreground/40 text-[11px]">—</span>;
    }

    return <span className="text-foreground/90 font-medium">{String(val)}</span>;
  };

  // Handle saving employee profile from detail view
  const handleSaveProfile = async (updatedProfile: FullEmployeeProfile) => {
    const existingIndex = employees.findIndex((e) => e.id === updatedProfile.id || e.code === updatedProfile.code);
    let newList: FullEmployeeProfile[];

    if (existingIndex >= 0) {
      newList = [...employees];
      newList[existingIndex] = updatedProfile;
    } else {
      newList = [updatedProfile, ...employees];
    }

    persistEmployees(newList);
    setSelectedProfile(null); // Auto close window and show Employee List view
    setToastMessage(`Employee profile for "${updatedProfile.name}" saved successfully.`);
    setTimeout(() => setToastMessage(null), 3500);

    // Save to Supabase PostgreSQL in background
    await saveEmployeeToSupabase(updatedProfile, updatedProfile.logHistory);
    syncEmployeeToLocalUser(updatedProfile);
  };

  // Create User Account from Employee and send Invite Email
  const handleCreateUserForEmployee = async (emp: FullEmployeeProfile) => {
    try {
      const emailToUse = emp.workEmail || `${emp.name.toLowerCase().replace(/\s+/g, '.')}@jaago.com.bd`;
      const res = await fetch('/api/v1/users/create-from-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: emp.name,
          email: emailToUse,
          department: emp.department,
          designation: emp.designation,
          employeeCode: emp.code,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedEmp: FullEmployeeProfile = {
          ...emp,
          isUser: true,
          workEmail: emailToUse,
          userId: data.data?.user?.id || '',
        };
        const updatedList = employees.map((e) =>
          e.id === emp.id || e.code === emp.code ? updatedEmp : e
        );
        persistEmployees(updatedList);
        await saveEmployeeToSupabase(updatedEmp);

        if (selectedProfile && (selectedProfile.id === emp.id || selectedProfile.code === emp.code)) {
          setSelectedProfile(updatedEmp);
        }

        setShowInviteSuccessModal({
          employee: updatedEmp,
          emailPayload: data.data.emailPayload,
        });
      } else {
        alert(data.error || 'Failed to create user account');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // Comprehensive Export CSV Handler (All 88 fields from all 7 tabs)
  const handleExportCSV = () => {
    try {
      const csvContent = exportEmployeesToComprehensiveCSV(employees);
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `jaago_employees_all_fields_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToastMessage(`✓ Exported all ${employees.length} employee records with complete 88 fields`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to generate CSV export: ' + err.message);
    }
  };

  // CSV File Selection & Instant Parsing
  const handleCSVFileSelect = (file: File) => {
    setImportFile(file);
    setImportErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const result = parseComprehensiveEmployeeCSV(text);
        if (!result.success && result.employees.length === 0) {
          setImportErrorMsg(result.errors.join('\n') || 'Failed to parse CSV file.');
          setImportParsedResult(null);
        } else {
          setImportParsedResult(result);
        }
      } catch (err: any) {
        setImportErrorMsg(err.message || 'Error reading CSV file');
        setImportParsedResult(null);
      }
    };
    reader.readAsText(file);
  };

  // Process Batch Import & Upsert to Supabase + Local State
  const handleProcessImport = async () => {
    if (!importParsedResult || importParsedResult.employees.length === 0) return;
    setIsProcessingImport(true);
    try {
      const newOrUpdated = importParsedResult.employees;
      
      // Merge into state and storage
      const existingMap = new Map(employees.map((e) => [e.code.toLowerCase(), e]));
      newOrUpdated.forEach((emp) => {
        existingMap.set(emp.code.toLowerCase(), emp);
      });
      const mergedList = Array.from(existingMap.values());
      
      setEmployees(mergedList);
      persistEmployees(mergedList);

      // Save all to Supabase in parallel
      await Promise.all(newOrUpdated.map((emp) => saveEmployeeToSupabase(emp)));

      setShowImportModal(false);
      setImportFile(null);
      setImportParsedResult(null);
      setToastMessage(`✓ Successfully imported & synchronized ${newOrUpdated.length} employee records across all 7 tabs!`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Import processing error');
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Helper for Status Badge in Table
  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            Active
          </span>
        );
      case 'Terminated':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20">
            Terminated
          </span>
        );
      case 'Resigned':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
            Resigned
          </span>
        );
      case 'Incomplete':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
            Incomplete
          </span>
        );
      case 'Archived':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-slate-400 bg-slate-500/10 border border-slate-500/20">
            Archived
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-muted-foreground bg-muted border border-border">
            {status}
          </span>
        );
    }
  };

  // Bulk Actions Handlers
  const handleArchiveSelected = async () => {
    if (selectedCodes.length === 0) return;
    const updated = employees.map((e) =>
      selectedCodes.includes(e.code) ? { ...e, status: 'Archived' as EmployeeStatus, isArchived: true } : e
    );
    persistEmployees(updated);
    await archiveEmployeesInSupabase(selectedCodes);
    setSelectedCodes([]);
  };

  const handleUnarchiveSelected = async () => {
    if (selectedCodes.length === 0) return;
    const updated = employees.map((e) =>
      selectedCodes.includes(e.code) ? { ...e, status: 'Active' as EmployeeStatus, isArchived: false } : e
    );
    persistEmployees(updated);
    await unarchiveEmployeesInSupabase(selectedCodes);
    setSelectedCodes([]);
  };

  const handleDeleteEmployee = async (code: string) => {
    const updated = employees.filter((e) => e.code !== code);
    persistEmployees(updated);
    if (selectedProfile?.code === code) {
      setSelectedProfile(null);
    }
    await deleteEmployeesFromSupabase([code]);
  };

  const handleDeleteSelected = async () => {
    if (selectedCodes.length === 0) return;
    const updated = employees.filter((e) => !selectedCodes.includes(e.code));
    persistEmployees(updated);
    await deleteEmployeesFromSupabase(selectedCodes);
    setSelectedCodes([]);
  };

  // If a profile is selected, render the rich tab-wise Employee Profile Detail View
  if (selectedProfile !== null) {
    return (
      <div className="p-2 sm:p-4 select-none">
        <EmployeeProfileDetail
          initialData={selectedProfile.id ? selectedProfile : null}
          allEmployees={employees.map((e) => ({
            id: e.id,
            name: e.name,
            code: e.code,
            designation: e.designation,
            department: e.department,
            avatarUrl: e.avatarUrl,
          }))}
          currentUser={currentUser}
          onSave={handleSaveProfile}
          onBack={() => setSelectedProfile(null)}
          onDelete={handleDeleteEmployee}
          onCreateUser={handleCreateUserForEmployee}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN EMPLOYEE LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-400 flex items-center space-x-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-200" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-emerald-700/50 rounded-lg transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground pb-1">
            <Link href="/pnc" className="hover:text-primary hover:underline transition cursor-pointer">
              People and Culture
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Employees</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-foreground">
            Employee List
          </h1>
          <p className="text-xs font-semibold text-muted-foreground pt-1" suppressHydrationWarning>
            {employees.filter((e) => e.status !== 'Archived' && !e.isArchived).length} active employee records managed across all entities
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 rounded-2xl bg-card border border-border text-xs font-bold text-foreground hover:border-primary/50 transition flex items-center space-x-2 shadow-sm cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span>IMPORT</span>
          </button>

          <button
            onClick={() => setSelectedProfile({} as FullEmployeeProfile)}
            className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black transition flex items-center space-x-2 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>NEW EMPLOYEE</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-2xl bg-card border border-border text-xs font-bold text-foreground hover:border-primary/50 transition flex items-center space-x-2 shadow-sm cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>EXPORT</span>
          </button>
        </div>
      </div>

      {/* ── 2. STATUS FILTER TABS (With ARCHIVED) ── */}
      <div className="flex items-center space-x-6 border-b border-border/60 text-xs font-extrabold tracking-wider text-muted-foreground overflow-x-auto pb-0.5">
        {(['ALL', 'ACTIVE', 'TERMINATED', 'RESIGNED', 'INCOMPLETE', 'ARCHIVED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedCodes([]);
            }}
            className={`pb-3 transition relative cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? 'text-amber-500 dark:text-amber-400 font-black'
                : 'hover:text-foreground'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── 3. SEARCH & FILTERS BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, email, or department..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
          >
            <option value="">Department (All)</option>
            <option value="Program Implementation">Program Implementation</option>
            <option value="Digital School Program">Digital School Program</option>
            <option value="Communications">Communications</option>
            <option value="Executive Office">Executive Office</option>
            <option value="Finance & Accounts">Finance &amp; Accounts</option>
            <option value="People and Culture">People and Culture</option>
            <option value="EMK Center">EMK Center</option>
          </select>
        </div>

        <div>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
          >
            <option value="">Organization (All)</option>
            <option value="JAAGO Foundation">JAAGO Foundation</option>
            <option value="JAAGO Foundation Trust">JAAGO Foundation Trust</option>
            <option value="EMK Center">EMK Center</option>
          </select>
        </div>

        <div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
          >
            <option value="">Branch (All)</option>
            <option value="Head Office (Banani)">Head Office (Banani)</option>
            <option value="Rayer Bazar Free School">Rayer Bazar Free School</option>
            <option value="Chittagong Campus">Chittagong Campus</option>
            <option value="Cox's Bazar Branch">Cox&apos;s Bazar Branch</option>
            <option value="Rajshahi Campus">Rajshahi Campus</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedDesignation}
            onChange={(e) => setSelectedDesignation(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
          >
            <option value="">Designation (All)</option>
            <option value="Manager">Manager</option>
            <option value="Assistant Manager">Assistant Manager</option>
            <option value="Program Officer">Program Officer</option>
            <option value="Security Guard">Security Guard</option>
            <option value="Digital Instructor">Digital Instructor</option>
            <option value="Coordinator">Coordinator</option>
          </select>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDept('');
              setSelectedOrg('');
              setSelectedBranch('');
              setSelectedDesignation('');
            }}
            className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground transition cursor-pointer flex-shrink-0"
            title="Reset Filters"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── BULK ACTIONS FLOATING/TOP BAR (Appears when 1+ selected) ── */}
      {selectedCodes.length > 0 && (
        <div className="p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-xs font-black text-amber-500">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{selectedCodes.length} employee(s) selected</span>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === 'ARCHIVED' ? (
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
              onClick={() => setSelectedCodes([])}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-semibold transition cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ── 4. EMPLOYEE DATA TABLE WITH DYNAMIC COLUMNS & SORTING ── */}
      <div className="rounded-3xl bg-card border border-border shadow-xl relative">
        {/* ── COLUMNS CUSTOMIZER POPOVER (Positioned right below button) ── */}
        {isColumnsMenuOpen && (
          <div
            ref={columnsMenuRef}
            className="absolute right-4 top-14 z-50 w-80 sm:w-96 max-h-[500px] bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
          >
            {/* Popover Header */}
            <div className="p-3 px-4 border-b border-border flex items-center justify-between bg-surface/60">
              <div className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center space-x-1.5">
                <span>COLUMNS</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-extrabold">
                  ({visibleColumnKeys.length}/{ALL_EMPLOYEE_COLUMNS.length})
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={handleResetColumns}
                  className="text-muted-foreground hover:text-foreground hover:underline transition cursor-pointer"
                >
                  RESET
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={() => {
                    if (visibleColumnKeys.length === ALL_EMPLOYEE_COLUMNS.length) {
                      handleResetColumns();
                    } else {
                      handleSelectAllColumns();
                    }
                  }}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer font-extrabold"
                >
                  {visibleColumnKeys.length === ALL_EMPLOYEE_COLUMNS.length ? 'DESELECT' : 'SELECT ALL'}
                </button>
              </div>
            </div>

            {/* Column Search Box */}
            <div className="p-2.5 px-3 border-b border-border/60 bg-surface/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={columnSearchQuery}
                  onChange={(e) => setColumnSearchQuery(e.target.value)}
                  placeholder="Search columns..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {columnSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setColumnSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Categorized Column Checkboxes */}
            <div className="overflow-y-auto p-2 space-y-3 flex-1 max-h-80 divide-y divide-border/30">
              {categorizedColumns.map((cat) => {
                const matchingCols = cat.columns.filter(
                  (c) =>
                    c.label.toLowerCase().includes(columnSearchQuery.toLowerCase()) ||
                    c.key.toLowerCase().includes(columnSearchQuery.toLowerCase())
                );
                if (matchingCols.length === 0) return null;

                return (
                  <div key={cat.id} className="pt-2 first:pt-0 space-y-1">
                    <div className="px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">
                      {cat.name}
                    </div>
                    <div className="space-y-0.5">
                      {matchingCols.map((col) => {
                        const isChecked = visibleColumnKeys.includes(col.key);
                        return (
                          <div
                            key={col.key}
                            onClick={() => handleToggleColumn(col.key)}
                            className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-xl cursor-pointer transition text-xs select-none ${
                              isChecked
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                                : 'hover:bg-surface/80 text-foreground/80'
                            }`}
                          >
                            <div
                              className={`h-4 w-4 rounded-md flex items-center justify-center border transition flex-shrink-0 ${
                                isChecked
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-border bg-card'
                              }`}
                            >
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{col.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-3xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground bg-surface/40">
                <th className="py-3.5 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((e) => selectedCodes.includes(e.code))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCodes(Array.from(new Set([...selectedCodes, ...filtered.map((f) => f.code)])));
                      } else {
                        const filteredCodes = new Set(filtered.map((f) => f.code));
                        setSelectedCodes(selectedCodes.filter((c) => !filteredCodes.has(c)));
                      }
                    }}
                    className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                  />
                </th>

                {/* Dynamic Visible Columns with Sorting */}
                {visibleColumnConfigs.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      style={{ minWidth: col.minWidth }}
                      className={`py-3.5 px-4 select-none ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={`group inline-flex items-center space-x-1.5 font-black uppercase tracking-wider transition cursor-pointer ${
                          isSorted
                            ? 'text-amber-500 dark:text-amber-400'
                            : 'hover:text-foreground text-muted-foreground'
                        }`}
                        title={`Click to sort whole dataset by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        <span className="inline-flex items-center">
                          {isSorted && sortDirection === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-amber-500 font-bold" />
                          ) : isSorted && sortDirection === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5 text-amber-500 font-bold" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition text-muted-foreground" />
                          )}
                        </span>
                      </button>
                    </th>
                  );
                })}

                {/* Rightmost Actions Header with Columns Popover Trigger */}
                <th className="py-3.5 px-4 text-right">
                  <div className="inline-flex items-center space-x-2.5 justify-end">
                    <span>ACTIONS</span>
                    <button
                      type="button"
                      onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        isColumnsMenuOpen
                          ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-surface hover:bg-surface/80 border-border text-foreground hover:border-amber-500/50'
                      }`}
                      title="Add Custom Columns / View Fields"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.map((emp) => {
                const isSelected = selectedCodes.includes(emp.code);

                return (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedProfile(emp)}
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
                            setSelectedCodes(selectedCodes.filter((c) => c !== emp.code));
                          } else {
                            setSelectedCodes([...selectedCodes, emp.code]);
                          }
                        }}
                        className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                      />
                    </td>

                    {/* Dynamic Visible Data Cells */}
                    {visibleColumnConfigs.map((col) => (
                      <td
                        key={col.key}
                        className={`py-3.5 px-4 ${
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      >
                        {renderCellContent(emp, col.key)}
                      </td>
                    ))}

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        {/* If NOT a user, show Create User button */}
                        {!emp.isUser ? (
                          <button
                            type="button"
                            onClick={() => handleCreateUserForEmployee(emp)}
                            className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-[11px] flex items-center space-x-1.5 transition shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
                            title="Create JAAGO HUB User Account & Send Credentials"
                          >
                            <UserPlus className="h-3 w-3 stroke-[2.5]" />
                            <span>Create User</span>
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>User Active</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedProfile(emp)}
                          className="p-1.5 rounded-xl bg-surface border border-border text-foreground hover:border-amber-500/50 hover:text-amber-500 transition cursor-pointer"
                          title="Open Full Tab-Wise Profile"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp.code)}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete Employee Profile"
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

      {/* ── 5. IMPORT CSV MODAL (Full 88-Field Comprehensive Engine) ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">Import Employee Records</h2>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Supports all 88 fields across all 7 profile tabs
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportParsedResult(null);
                  setImportErrorMsg(null);
                }}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {/* File Dropzone / Selector */}
              <label className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-amber-500/60 text-center space-y-2 cursor-pointer bg-surface/50 hover:bg-surface/80 transition flex flex-col items-center justify-center block">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCSVFileSelect(f);
                  }}
                />
                <FileText className="h-8 w-8 text-amber-500" />
                <div className="text-xs font-bold text-foreground">
                  {importFile ? importFile.name : 'Click to select CSV or drag & drop'}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {importFile
                    ? `${(importFile.size / 1024).toFixed(1)} KB — Ready to analyze`
                    : 'Upload your complete employee database spreadsheet'}
                </div>
              </label>

              {/* Error Alert */}
              {importErrorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="whitespace-pre-line">{importErrorMsg}</div>
                </div>
              )}

              {/* Parsed Preview */}
              {importParsedResult && (
                <div className="p-3.5 rounded-2xl bg-surface border border-border/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{importParsedResult.employees.length} Employee Records Recognized</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      88 columns verified
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 divide-y divide-border/40 font-mono text-[11px]">
                    {importParsedResult.employees.slice(0, 5).map((emp, i) => (
                      <div key={i} className="pt-1.5 flex items-center justify-between text-muted-foreground">
                        <span className="font-bold text-foreground truncate max-w-[200px]">
                          {emp.name} ({emp.code})
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {emp.designation} • {emp.department}
                        </span>
                      </div>
                    ))}
                    {importParsedResult.employees.length > 5 && (
                      <div className="pt-1.5 text-center text-[10px] text-muted-foreground font-sans">
                        + {importParsedResult.employees.length - 5} more employee records
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
              <a
                href="/demo_employees_comprehensive_template.csv"
                download="demo_employees_comprehensive_template.csv"
                className="text-primary hover:underline font-bold flex items-center space-x-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download All-Field Template</span>
              </a>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportParsedResult(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!importParsedResult || importParsedResult.employees.length === 0 || isProcessingImport}
                  onClick={handleProcessImport}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-black cursor-pointer flex items-center space-x-2 shadow-md shadow-amber-500/20"
                >
                  {isProcessingImport ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <span>Process &amp; Sync</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. INVITE EMAIL DISPATCHED MODAL ── */}
      {showInviteSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground">Welcome &amp; Invite Email Dispatched</h2>
                  <p className="text-[11px] font-bold text-emerald-500 flex items-center space-x-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Supabase Auth &amp; JAAGO HUB User Created</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteSuccessModal(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Email Subject Line Header */}
            <div className="p-3 rounded-xl bg-surface border border-border/80 text-xs space-y-1">
              <div className="text-[10px] uppercase font-black text-muted-foreground tracking-wider">Email Subject:</div>
              <div className="font-bold text-foreground">
                {showInviteSuccessModal.emailPayload.subject || 'Welcome to JAAGO HUB — Your Login Access & Credentials'}
              </div>
              <div className="text-[11px] text-muted-foreground pt-1 flex items-center space-x-1">
                <span>Recipient:</span>
                <span className="font-extrabold text-foreground">{showInviteSuccessModal.emailPayload.to}</span>
              </div>
            </div>

            {/* Credential Details Card */}
            <div className="p-4 rounded-2xl bg-surface/90 border border-border space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-sans font-bold">User ID (Work Email):</span>
                <span className="font-bold text-foreground select-all">{showInviteSuccessModal.emailPayload.userId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-sans font-bold">Auto Password:</span>
                <span className="font-black text-amber-500 tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 select-all">
                  {showInviteSuccessModal.emailPayload.tempPassword}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-muted-foreground font-sans font-bold">Portal Access Link:</span>
                <a
                  href="/login"
                  target="_blank"
                  className="text-primary hover:underline flex items-center space-x-1 font-sans text-[11px] font-bold"
                >
                  <span>{showInviteSuccessModal.emailPayload.loginUrl || '/login'}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Security Note Alert */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-start space-x-2">
              <span className="text-sm leading-none">⚠️</span>
              <div>
                <strong>Security Note:</strong>{' '}
                {showInviteSuccessModal.emailPayload.securityNote ||
                  'Please update your password as soon as possible after your initial login.'}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={async () => {
                  if (!showInviteSuccessModal) return;
                  setIsSendingEmail(true);
                  try {
                    const payload = showInviteSuccessModal.emailPayload;
                    const res = await fetch('/api/v1/notifications/send-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        to: payload.to,
                        subject: payload.subject || 'Welcome to JAAGO HUB — Your Login Access & Credentials',
                        bodyText: payload.fullEmailText,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setEmailSentSuccess(true);
                      setToastMessage(`✓ Welcome email successfully sent to ${payload.to}`);
                      setTimeout(() => setToastMessage(null), 4000);
                      setTimeout(() => setEmailSentSuccess(false), 3000);
                    } else {
                      alert(data.error || 'Failed to dispatch email');
                    }
                  } catch (err: any) {
                    alert(err.message || 'Email dispatch network error');
                  } finally {
                    setIsSendingEmail(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
              >
                {isSendingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : emailSentSuccess ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>
                  {isSendingEmail ? 'Sending Email...' : emailSentSuccess ? 'Email Dispatched!' : 'Send Email'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowInviteSuccessModal(null)}
                className="px-6 py-2.5 rounded-xl bg-surface border border-border text-foreground hover:border-primary/50 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
