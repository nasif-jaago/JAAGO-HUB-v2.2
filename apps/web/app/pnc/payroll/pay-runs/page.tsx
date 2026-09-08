'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Check,
  CreditCard,
  X,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  fetchEmployeesFromSupabase,
  FullEmployeeProfile,
} from '@/lib/supabase-employees';
import {
  getPayrollConfig,
  getSavedPayRuns,
  savePayRuns,
  loadPayRunsFromIndexedDB,
  generatePayRunBatch,
  PayrollConfig,
  PayRun,
  INITIAL_PAYROLL_CONFIG,
  getSavedSalaryStructures,
  SalaryStructureDefinition,
  DEFAULT_SALARY_STRUCTURES,
} from '@/lib/payroll-engine';

export default function PayRunsPage() {
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [config, setConfig] = useState<PayrollConfig>(INITIAL_PAYROLL_CONFIG);
  const [structures, setStructures] = useState<SalaryStructureDefinition[]>(DEFAULT_SALARY_STRUCTURES);

  // New Pay Run Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runName, setRunName] = useState('September 2026 Regular Salary');
  const [companyScope, setCompanyScope] = useState('JAAGO Foundation');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [periodStart, setPeriodStart] = useState('2026-09-01');
  const [periodEnd, setPeriodEnd] = useState('2026-09-30');
  const [paymentDate, setPaymentDate] = useState('2026-09-28');
  const [selectedStructureCode, setSelectedStructureCode] = useState('JAAGO_PAY_ATT_INS');

  // Modal Employee Search & Selection
  const [modalEmployeeSearch, setModalEmployeeSearch] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isProcessingRun, setIsProcessingRun] = useState<boolean>(false);

  // Search & Filter within active pay run
  const [itemSearch, setItemSearch] = useState('');
  const [itemDeptFilter, setItemDeptFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Initial Data
  useEffect(() => {
    async function load() {
      try {
        const empList = await fetchEmployeesFromSupabase();
        if (empList) {
          setEmployees(empList);
          // Initialize selected employees
          const allActive = empList.filter((e) => !e.isArchived && e.status !== 'Archived').map((e) => e.id);
          setSelectedEmployeeIds(allActive);

          // Initialize all departments
          const depts = Array.from(new Set(empList.map((e) => e.department).filter(Boolean))) as string[];
          setSelectedDepartments(depts.length > 0 ? depts : DEFAULT_DEPARTMENTS);
        }

        const structList = getSavedSalaryStructures();
        if (structList && structList.length > 0) {
          setStructures(structList);
        }

        let runs = getSavedPayRuns();
        if (runs.length === 0) {
          const idbRuns = await loadPayRunsFromIndexedDB();
          if (idbRuns && idbRuns.length > 0) {
            runs = idbRuns;
          }
        }
        if (runs.length === 0 && empList && empList.length > 0) {
          const cfg = getPayrollConfig();
          const sepRun = generatePayRunBatch(9, 2026, empList, cfg, {
            applyAttendanceDeductions: true,
            customRunName: 'September 2026 General Payroll',
          });
          const augRun = generatePayRunBatch(8, 2026, empList, cfg, {
            applyAttendanceDeductions: true,
            customRunName: 'August 2026 General Payroll',
          });
          augRun.status = 'Paid';
          runs = [sepRun, augRun];
          savePayRuns(runs);
        }
        setPayRuns(runs);
        if (runs.length > 0 && runs[0] && !selectedRunId) {
          setSelectedRunId(runs[0].id);
        }
        setConfig(getPayrollConfig());
      } catch (err) {
        console.warn('Failed to load pay runs:', err);
      }
    }
    load();

    const onRunsChange = (e: any) => {
      if (e.detail) setPayRuns(e.detail);
    };
    window.addEventListener('jaago_payruns_changed', onRunsChange);
    return () => window.removeEventListener('jaago_payruns_changed', onRunsChange);
  }, []);

  const activeRun = useMemo(() => {
    return payRuns.find((r) => r.id === selectedRunId) || payRuns[0] || null;
  }, [payRuns, selectedRunId]);

  // Available unique departments from employees list
  const availableDepartments = useMemo(() => {
    const list = Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[];
    return list.length > 0 ? list.sort() : DEFAULT_DEPARTMENTS;
  }, [employees]);

  // Available projects list
  const availableProjects = useMemo(() => {
    return DEFAULT_PROJECTS;
  }, []);

  // Filtered employees in modal based on Department, Project, Company, and Search
  const modalMatchedEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (emp.isArchived || emp.status === 'Archived') return false;

      // Company scope
      if (companyScope !== 'All Companies' && emp.organization && emp.organization !== companyScope) {
        // fallback if exact match or default
      }

      // Department filter
      if (selectedDepartments.length > 0 && emp.department && !selectedDepartments.includes(emp.department)) {
        return false;
      }

      // Search filter
      if (modalEmployeeSearch.trim()) {
        const q = modalEmployeeSearch.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchCode = emp.code.toLowerCase().includes(q);
        const matchDesig = (emp.designation || '').toLowerCase().includes(q);
        const matchDept = (emp.department || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDesig && !matchDept) return false;
      }

      return true;
    });
  }, [employees, companyScope, selectedDepartments, modalEmployeeSearch]);

  // Toggle single employee selection
  const toggleEmployeeSelection = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all or clear all matched in modal
  const handleSelectAllMatched = () => {
    const matchedIds = modalMatchedEmployees.map((e) => e.id);
    const newSelected = Array.from(new Set([...selectedEmployeeIds, ...matchedIds]));
    setSelectedEmployeeIds(newSelected);
  };

  const handleClearAllMatched = () => {
    const matchedIds = new Set(modalMatchedEmployees.map((e) => e.id));
    setSelectedEmployeeIds((prev) => prev.filter((id) => !matchedIds.has(id)));
  };

  // Handle Create Pay Run Batch
  const handleCreateRun = () => {
    if (selectedEmployeeIds.length === 0) {
      showToast('Please select at least 1 employee to generate the pay run.', 'error');
      return;
    }

    setIsProcessingRun(true);
    try {
      const month = new Date(periodStart).getMonth() + 1 || 9;
      const year = new Date(periodStart).getFullYear() || 2026;

      const newRun = generatePayRunBatch(month, year, employees, config, {
        applyAttendanceDeductions: true,
        customRunName: runName.trim() || `${month} ${year} General Payroll`,
        customPeriodStart: periodStart,
        customPeriodEnd: periodEnd,
        customPaymentDate: paymentDate,
        salaryStructureId: selectedStructureCode,
        companyScope,
        selectedDepartmentIds: selectedDepartments,
        selectedProjectIds: selectedProjects,
        selectedEmployeeIds,
      });

      const updatedRuns = [newRun, ...payRuns.filter((r) => r.id !== newRun.id)];
      savePayRuns(updatedRuns);
      setPayRuns(updatedRuns);
      setSelectedRunId(newRun.id);
      setShowCreateModal(false);
      showToast(`Successfully created and calculated ${newRun.name}!`);
    } catch (err: any) {
      showToast(err.message || 'Error processing pay run', 'error');
    } finally {
      setIsProcessingRun(false);
    }
  };

  // Status transition
  const handleStatusChange = (newStatus: PayRun['status']) => {
    if (!activeRun) return;
    const updated = payRuns.map((r) => (r.id === activeRun.id ? { ...r, status: newStatus } : r));
    savePayRuns(updated);
    setPayRuns(updated);
    showToast(`Pay Run status updated to ${newStatus}`);
  };

  // Export BEFTN Bank Advice CSV
  const exportBEFTNAdvice = () => {
    if (!activeRun) return;

    const headers = [
      'Beneficiary Account Number',
      'Beneficiary Name',
      'Bank Name',
      'Branch Name',
      'Routing Number',
      'Payment Amount (BDT)',
      'Payment Currency',
      'Payment Narration',
      'Employee Code',
    ];

    const rows = activeRun.items.map((item) => {
      return [
        `"${item.bankAccountNumber || '1501203456789001'}"`,
        `"${item.employeeName}"`,
        `"${item.bankName || 'BRAC Bank Ltd'}"`,
        `"Banani Branch"`,
        `"060260485"`,
        item.netWage,
        `"BDT"`,
        `"Salary for ${activeRun.name} - ${item.employeeCode}"`,
        `"${item.employeeCode}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BEFTN_Salary_Advice_${activeRun.code}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Line items in current pay run
  const filteredItems = useMemo(() => {
    if (!activeRun) return [];
    return activeRun.items.filter((item) => {
      if (itemSearch) {
        const q = itemSearch.toLowerCase();
        const mName = item.employeeName.toLowerCase().includes(q);
        const mCode = item.employeeCode.toLowerCase().includes(q);
        const mDesig = item.designation.toLowerCase().includes(q);
        if (!mName && !mCode && !mDesig) return false;
      }
      if (itemDeptFilter !== 'ALL' && item.department !== itemDeptFilter) return false;
      return true;
    });
  }, [activeRun, itemSearch, itemDeptFilter]);

  // Reset pagination when search, dept filter, active run, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemSearch, itemDeptFilter, selectedRunId, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const startItem = filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredItems.length);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const departmentsInRun = useMemo(() => {
    if (!activeRun) return [];
    const set = new Set<string>();
    activeRun.items.forEach((i) => i.department && set.add(i.department));
    return Array.from(set).sort();
  }, [activeRun]);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto font-sans text-stone-900 dark:text-stone-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner matching Screenshot 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[#8C7866] dark:text-[#B5A595]">
            JAAGO PAY &bull; MONTHLY PAYROLL CYCLES
          </span>
          <h1 className="text-3xl lg:text-4xl font-black font-serif text-[#2A231C] dark:text-[#F3EFEA] tracking-tight mt-0.5">
            Batch Pay Run Cycles &amp; Disbursement
          </h1>
          <p className="text-xs text-[#8C7866] dark:text-stone-400 mt-1">
            Execute batch salary computations with attendance deductions, review summaries, and generate bank advice files.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Process New Pay Run</span>
        </button>
      </div>

      {/* Pay Runs Cycle Selector Strip */}
      <div className="flex overflow-x-auto space-x-3 pb-1 no-scrollbar">
        {payRuns.map((run) => (
          <button
            key={run.id}
            onClick={() => setSelectedRunId(run.id)}
            className={`flex items-center space-x-3 px-4 py-3 rounded-2xl border text-left transition whitespace-nowrap min-w-[220px] cursor-pointer ${
              activeRun?.id === run.id
                ? 'bg-[#FAF7F2] dark:bg-stone-900 border-[#C4B5A5] dark:border-amber-400/50 shadow-sm ring-1 ring-[#C4B5A5]/50'
                : 'bg-white/80 dark:bg-stone-900/60 hover:bg-[#FAF7F2] border-[#E8E1D5] dark:border-stone-800'
            }`}
          >
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                activeRun?.id === run.id
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
              }`}
            >
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-900 dark:text-stone-100">{run.name}</div>
              <div className="flex items-center space-x-2 mt-0.5">
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                    run.status === 'Paid'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30'
                  }`}
                >
                  {run.status}
                </span>
                <span className="text-[10px] text-[#8C7866] dark:text-stone-400 font-medium">
                  {run.totalEmployees} Staff
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Active Pay Run Details Dashboard */}
      {activeRun && (
        <div className="space-y-6">
          {/* Summary KPIs Banner matching Screenshot 2 */}
          <div className="rounded-2xl bg-white/95 dark:bg-stone-900/90 border border-[#E8E1D5] dark:border-stone-800 p-6 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[#E8E1D5] dark:border-stone-800">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    {activeRun.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      activeRun.status === 'Paid'
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-sky-500/20 text-sky-800 dark:text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    STATUS: {activeRun.status.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-2xl lg:text-3xl font-black font-serif text-[#2A231C] dark:text-[#F3EFEA]">
                  {activeRun.name}
                </h2>
                <p className="text-xs text-[#8C7866] dark:text-stone-400 font-medium">
                  Pay Period: {activeRun.periodStart} &rarr; {activeRun.periodEnd} &bull; Payment Date:{' '}
                  {activeRun.paymentDate}
                </p>
              </div>

              {/* Action Buttons matching Screenshot 2 */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={exportBEFTNAdvice}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-stone-800 hover:bg-[#F9F6F0] text-stone-800 dark:text-stone-200 border border-[#C4B5A5] dark:border-stone-700 shadow-xs transition cursor-pointer"
                  title="Export BEFTN CSV for Bank Upload"
                >
                  <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Export BEFTN Bank Advice</span>
                </button>

                <Link
                  href={`/pnc/payroll/payslips?payRunId=${activeRun.id}`}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-stone-800 hover:bg-[#F9F6F0] text-stone-800 dark:text-stone-200 border border-[#C4B5A5] dark:border-stone-700 shadow-xs transition"
                >
                  <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span>Generate All Payslips</span>
                </Link>

                {activeRun.status !== 'Paid' && (
                  <button
                    onClick={() => handleStatusChange('Paid')}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Mark as Disbursed (Paid)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Run KPI Cards matching Screenshot 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-[#FAF7F2] dark:bg-stone-800/50 border border-[#E5DDD0] dark:border-stone-700 rounded-xl p-3.5 shadow-xs space-y-1">
                <span className="text-[10px] text-[#8C7866] dark:text-stone-400 uppercase font-bold">TOTAL GROSS</span>
                <div className="text-lg font-black text-stone-900 dark:text-stone-100">
                  ৳{activeRun.totalGross.toLocaleString()}
                </div>
              </div>

              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 shadow-xs space-y-1">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold">NET PAYOUT</span>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  ৳{activeRun.totalNetPayout.toLocaleString()}
                </div>
              </div>

              <div className="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl p-3.5 shadow-xs space-y-1">
                <span className="text-[10px] text-sky-800 dark:text-sky-300 uppercase font-bold">TOTAL PF</span>
                <div className="text-lg font-black text-sky-700 dark:text-sky-300">
                  ৳{activeRun.totalPFEmployee.toLocaleString()}
                </div>
              </div>

              <div className="bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-3.5 shadow-xs space-y-1">
                <span className="text-[10px] text-purple-800 dark:text-purple-300 uppercase font-bold">TAX TDS</span>
                <div className="text-lg font-black text-purple-700 dark:text-purple-300">
                  ৳{activeRun.totalTDS.toLocaleString()}
                </div>
              </div>

              <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-3.5 shadow-xs space-y-1">
                <span className="text-[10px] text-rose-800 dark:text-rose-300 uppercase font-bold">ATTENDANCE DED</span>
                <div className="text-lg font-black text-rose-700 dark:text-rose-300">
                  ৳{activeRun.totalAttendanceDeductions.toLocaleString()}
                </div>
              </div>

              <div className="bg-[#FAF7F2] dark:bg-stone-800/50 border border-[#E5DDD0] dark:border-stone-700 rounded-xl p-3.5 shadow-xs space-y-1">
                <span className="text-[10px] text-[#8C7866] dark:text-stone-400 uppercase font-bold">EMPLOYER COST</span>
                <div className="text-lg font-black text-stone-900 dark:text-stone-100">
                  ৳{activeRun.totalEmployerCost.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table & Search matching Screenshot 2 */}
          <div className="bg-white/95 dark:bg-stone-900/90 border border-[#E8E1D5] dark:border-stone-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px] max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search staff in this pay run..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 text-xs font-semibold focus:outline-none"
                />
              </div>

              <select
                value={itemDeptFilter}
                onChange={(e) => setItemDeptFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-[#524439] dark:text-stone-200 text-xs font-bold focus:outline-none"
              >
                <option value="ALL">All Departments ({departmentsInRun.length})</option>
                {departmentsInRun.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <span className="text-xs text-[#8C7866] dark:text-stone-400 font-bold">
                {filteredItems.length} Staff Calculated
              </span>
            </div>

            {/* Table matching Screenshot 2 */}
            <div className="overflow-x-auto rounded-xl border border-[#E8E1D5] dark:border-stone-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#EBE2D5] dark:bg-stone-800 text-[#524439] dark:text-stone-300 border-b border-[#DDD4C5] dark:border-stone-700 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">EMPLOYEE</th>
                    <th className="py-3 px-4">DEPARTMENT</th>
                    <th className="py-3 px-4 text-right">GROSS (৳)</th>
                    <th className="py-3 px-4 text-right">BASIC (৳)</th>
                    <th className="py-3 px-4 text-right">PF DED (৳)</th>
                    <th className="py-3 px-4 text-right">TAX TDS (৳)</th>
                    <th className="py-3 px-4 text-right">ATT. DED (৳)</th>
                    <th className="py-3 px-4 text-right">NET PAYOUT (৳)</th>
                    <th className="py-3 px-4 text-center">PAYSLIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DC] dark:divide-stone-800">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-stone-500 dark:text-stone-400 text-xs">
                        No staff records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FAF7F2] dark:hover:bg-stone-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900 dark:text-stone-100">{item.employeeName}</div>
                          <div className="text-[10px] text-[#8C7866] dark:text-stone-400 font-mono">
                            {item.employeeCode} &bull; {item.designation}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-stone-700 dark:text-stone-300 font-medium">
                          {item.department}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                          ৳{item.grossWage.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-700 dark:text-amber-400 font-semibold">
                          ৳{item.basicWage.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          ৳{item.employeePF.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-semibold">
                          ৳{item.taxTDS.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          ৳{item.attendanceDeduction.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          ৳{item.netWage.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/pnc/payroll/payslips?search=${item.employeeCode}`}
                            className="px-2.5 py-1 rounded-md bg-[#FAF7F2] dark:bg-stone-800 hover:bg-amber-100 text-[#524439] dark:text-stone-200 border border-[#DDD5C9] transition text-[10px] font-bold"
                          >
                            View Slip
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Standard Pagination Controls Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E8E1D5] dark:border-stone-800 text-xs">
              {/* Left: Counts & Rows Per Page */}
              <div className="flex flex-wrap items-center gap-3 text-[#6B5B4D] dark:text-stone-400">
                <div>
                  Showing <span className="font-bold text-stone-900 dark:text-stone-100">{startItem}</span> to{' '}
                  <span className="font-bold text-stone-900 dark:text-stone-100">{endItem}</span> of{' '}
                  <span className="font-bold text-stone-900 dark:text-stone-100">{filteredItems.length}</span> staff members
                </div>

                <div className="flex items-center space-x-1.5 pl-3 border-l border-[#DDD5C9] dark:border-stone-700">
                  <span className="text-[11px] font-semibold">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-[#524439] dark:text-stone-200 text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Right: Pagination Navigation Buttons */}
              <div className="flex items-center space-x-1.5 select-none">
                {/* First Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  title="First Page"
                  className="p-2 rounded-xl border border-[#DDD5C9] dark:border-stone-700 bg-[#FAF7F2] dark:bg-stone-800 hover:bg-[#EFE8DC] dark:hover:bg-stone-700 text-[#524439] dark:text-stone-200 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Previous Page"
                  className="flex items-center space-x-1 px-3 py-2 rounded-xl border border-[#DDD5C9] dark:border-stone-700 bg-[#FAF7F2] dark:bg-stone-800 hover:bg-[#EFE8DC] dark:hover:bg-stone-700 text-[#524439] dark:text-stone-200 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer font-bold text-xs"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Numbered Page Buttons */}
                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((p, idx) => {
                    if (p === '...') {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-2 py-1 text-stone-400 dark:text-stone-500 font-bold select-none"
                        >
                          &hellip;
                        </span>
                      );
                    }

                    const isCurrent = p === currentPage;
                    return (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setCurrentPage(p as number)}
                        className={`min-w-[34px] h-9 px-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                          isCurrent
                            ? 'bg-[#2A231C] dark:bg-amber-400 text-[#FAF7F2] dark:text-stone-950 border-[#2A231C] dark:border-amber-400 shadow-sm'
                            : 'bg-[#FAF7F2] dark:bg-stone-800 text-[#524439] dark:text-stone-200 border-[#DDD5C9] dark:border-stone-700 hover:bg-[#EFE8DC] dark:hover:bg-stone-700'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  title="Next Page"
                  className="flex items-center space-x-1 px-3 py-2 rounded-xl border border-[#DDD5C9] dark:border-stone-700 bg-[#FAF7F2] dark:bg-stone-800 hover:bg-[#EFE8DC] dark:hover:bg-stone-700 text-[#524439] dark:text-stone-200 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer font-bold text-xs"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  title="Last Page"
                  className="p-2 rounded-xl border border-[#DDD5C9] dark:border-stone-700 bg-[#FAF7F2] dark:bg-stone-800 hover:bg-[#EFE8DC] dark:hover:bg-stone-700 text-[#524439] dark:text-stone-200 disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE SALARY PAY RUN (Exact Screenshot 1 Layout)             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-[#D5CABB] dark:border-stone-700 shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
            {/* Modal Header matching Screenshot 1 */}
            <div className="p-6 border-b border-[#E8E1D5] dark:border-stone-800 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold font-serif text-[#2A231C] dark:text-[#F3EFEA]">
                  Create Salary Pay Run
                </h3>
                <p className="text-xs text-[#8C7866] dark:text-stone-400 mt-0.5">
                  Select filters below &mdash; employee list auto-updates on the right
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Split Content Body matching Screenshot 1 */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
              {/* ── LEFT COLUMN: Filter & Parameters ── */}
              <div className="lg:col-span-6 space-y-4">
                {/* Pay Run Name */}
                <div className="space-y-1">
                  <label className="font-bold text-[#524439] dark:text-stone-300">
                    Pay Run Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. June 2026 Regular Salary"
                    value={runName}
                    onChange={(e) => setRunName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8C7866]/30"
                  />
                </div>

                {/* Company Scope */}
                <div className="space-y-1">
                  <label className="font-bold text-[#524439] dark:text-stone-300">
                    Company Scope <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyScope}
                    onChange={(e) => setCompanyScope(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold focus:outline-none focus:ring-2 focus:ring-[#8C7866]/30"
                  />
                </div>

                {/* Departments & Projects Split Pickers */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Departments Selection */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[#524439] dark:text-stone-300">
                        Departments Selection <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDepartments(
                            selectedDepartments.length === availableDepartments.length
                              ? []
                              : availableDepartments
                          )
                        }
                        className="text-[10px] font-bold text-[#8C7866] hover:underline cursor-pointer"
                      >
                        {selectedDepartments.length === availableDepartments.length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>

                    <div className="h-32 overflow-y-auto p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 space-y-1.5">
                      {availableDepartments.map((dept) => {
                        const isChecked = selectedDepartments.includes(dept);
                        return (
                          <label
                            key={dept}
                            className="flex items-start space-x-2 text-[11px] font-medium text-stone-800 dark:text-stone-200 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setSelectedDepartments((prev) =>
                                  e.target.checked ? [...prev, dept] : prev.filter((d) => d !== dept)
                                );
                              }}
                              className="mt-0.5 rounded accent-blue-600"
                            />
                            <span className="leading-tight truncate">{dept}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Projects Selection */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[#524439] dark:text-stone-300">
                        Projects Selection <span className="text-stone-400 font-normal">(Optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedProjects(
                            selectedProjects.length === availableProjects.length ? [] : availableProjects
                          )
                        }
                        className="text-[10px] font-bold text-[#8C7866] hover:underline cursor-pointer"
                      >
                        {selectedProjects.length === availableProjects.length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>

                    <div className="h-32 overflow-y-auto p-2.5 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 space-y-1.5">
                      {availableProjects.map((proj) => {
                        const isChecked = selectedProjects.includes(proj);
                        return (
                          <label
                            key={proj}
                            className="flex items-start space-x-2 text-[11px] font-medium text-stone-800 dark:text-stone-200 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setSelectedProjects((prev) =>
                                  e.target.checked ? [...prev, proj] : prev.filter((p) => p !== proj)
                                );
                              }}
                              className="mt-0.5 rounded accent-blue-600"
                            />
                            <span className="leading-tight truncate">{proj}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Period Start & End */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[#524439] dark:text-stone-300">
                      Period Start <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#524439] dark:text-stone-300">
                      Period End <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold"
                    />
                  </div>
                </div>

                {/* Payment Date & Default Salary Structure */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[#524439] dark:text-stone-300">
                      Payment Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#524439] dark:text-stone-300">
                      Default Salary Structure <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedStructureCode}
                      onChange={(e) => setSelectedStructureCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold truncate"
                    >
                      {structures.map((s) => (
                        <option key={s.id} value={s.code}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: MATCHED EMPLOYEES ── */}
              <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-[#E8E1D5] dark:border-stone-800 pt-4 lg:pt-0 lg:pl-6 space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-[#8C7866]" />
                    <span className="font-bold uppercase tracking-wider text-xs text-[#524439] dark:text-stone-300">
                      MATCHED EMPLOYEES
                    </span>
                  </div>

                  <span className="bg-[#6B5B4D] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {selectedEmployeeIds.filter((id) => modalMatchedEmployees.some((e) => e.id === id)).length} /{' '}
                    {modalMatchedEmployees.length}
                  </span>
                </div>

                {/* Filter & Clear/Select Toolbar */}
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search matched employee..."
                      value={modalEmployeeSearch}
                      onChange={(e) => setModalEmployeeSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FAF7F2] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const allMatchedSelected = modalMatchedEmployees.every((e) =>
                        selectedEmployeeIds.includes(e.id)
                      );
                      if (allMatchedSelected) {
                        handleClearAllMatched();
                      } else {
                        handleSelectAllMatched();
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition cursor-pointer"
                  >
                    {modalMatchedEmployees.every((e) => selectedEmployeeIds.includes(e.id))
                      ? 'CLEAR ALL'
                      : 'SELECT ALL'}
                  </button>
                </div>

                {/* Scrollable Employee Cards List matching Screenshot 1 */}
                <div className="flex-1 max-h-[360px] overflow-y-auto space-y-2 pr-1">
                  {modalMatchedEmployees.length === 0 ? (
                    <div className="p-8 text-center text-stone-400 text-xs">
                      No employees match the selected department or search filter.
                    </div>
                  ) : (
                    modalMatchedEmployees.map((emp) => {
                      const isSelected = selectedEmployeeIds.includes(emp.id);
                      const initial = emp.name.trim().charAt(0).toUpperCase() || 'A';
                      const grossAmount = Number(emp.wage || emp.totalCurrentSalary || 0);

                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleEmployeeSelection(emp.id)}
                          className={`p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#FAF7F2] dark:bg-stone-800/80 border-[#C4B5A5] dark:border-amber-400/50'
                              : 'bg-white dark:bg-stone-900/60 hover:bg-[#FAF7F2] border-[#E8E1D5] dark:border-stone-800 opacity-60'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded accent-[#6B5B4D] h-4 w-4 pointer-events-none"
                            />

                            <div className="h-7 w-7 rounded-full bg-[#A89887] dark:bg-stone-700 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {initial}
                            </div>

                            <div className="min-w-0 truncate">
                              <div className="font-bold text-stone-900 dark:text-stone-100 truncate">
                                {emp.name}
                              </div>
                              <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                                {emp.designation || 'Staff'} &bull; {emp.department || 'General'}
                              </div>
                            </div>
                          </div>

                          <div className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 pl-2 flex-shrink-0">
                            ৳{grossAmount.toLocaleString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer matching Screenshot 1 */}
            <div className="p-4 bg-[#FBF9F5] dark:bg-stone-950 border-t border-[#E8E1D5] dark:border-stone-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-700 border border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleCreateRun}
                disabled={isProcessingRun}
                className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#6B5B4D] hover:bg-[#5A4C3F] dark:bg-[#857262] text-white shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isProcessingRun ? 'CALCULATING...' : 'PAY RUN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_DEPARTMENTS = [
  'Admin & Procurement (JF)',
  'Admin & Procurement (JFT)',
  'Child Welfare',
  'Communications',
  'Digital School Program',
  'Finance & Accounts',
  'Fundraising & Grants',
  'People and Culture',
  'Program Implementation',
  'Volunteer For Bangladesh (VBD)',
  'Executive Leadership',
];

const DEFAULT_PROJECTS = [
  'Access Alumni Program',
  'DASRA',
  'Digital Gender Norms',
  'EARN Project',
  'EMDC',
  'Empower Youth Bangladesh',
  'Girls in Tech',
  'School Operations',
  'Water & Sanitation (WASH)',
  'Emergency Response',
];
