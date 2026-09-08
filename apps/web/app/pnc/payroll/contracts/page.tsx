'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  FileText,
  Printer,
  Plus,
  Layers,
  Grid,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  History,
  Building,
  Users,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import {
  fetchEmployeesFromSupabase,
  saveEmployeeToSupabase,
  FullEmployeeProfile,
} from '@/lib/supabase-employees';
import {
  fetchDepartmentsFromSupabase,
  DepartmentItem,
} from '@/lib/supabase-organization';
import {
  EmploymentContractVersion,
  deriveContractStatus,
  getDaysRemaining,
  resolveAllCurrentContracts,
  calculateContractsSummary,
  buildContractsFromEmployees,
  getStoredCustomContracts,
  saveStoredCustomContracts,
} from '@/lib/contracts-engine';
import { ContractDocumentModal } from '@/components/contracts/ContractDocumentModal';
import { ContractPivotTable } from '@/components/contracts/ContractPivotTable';
import { NewContractModal } from '@/components/contracts/NewContractModal';
import { ContractHistoryModal } from '@/components/contracts/ContractHistoryModal';

export type GroupByDimension =
  | 'None'
  | 'Department'
  | 'Project'
  | 'Contract Type'
  | 'Working Schedule'
  | 'Status'
  | 'Entity';

export default function EmploymentContractsPage() {
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jaago_pnc_employees_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simulation & View state
  const [asOfDate, setAsOfDate] = useState('2026-09-07');
  const [viewMode, setViewMode] = useState<'register' | 'pivot'>('register');
  const [scope, setScope] = useState<'current' | 'history'>('current');
  const [groupBy, setGroupBy] = useState<GroupByDimension>('Department');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  // Modals state
  const [selectedContractForDoc, setSelectedContractForDoc] = useState<EmploymentContractVersion | null>(null);
  const [selectedEmpForHistory, setSelectedEmpForHistory] = useState<{
    name: string;
    code: string;
    versions: EmploymentContractVersion[];
  } | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [contractToAmend, setContractToAmend] = useState<EmploymentContractVersion | null>(null);

  // Load real employees and departments
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empList, deptList] = await Promise.all([
        fetchEmployeesFromSupabase(),
        fetchDepartmentsFromSupabase(),
      ]);
      if (empList && empList.length > 0) {
        setEmployees(empList);
      }
      if (deptList) {
        setDepartments(deptList);
      }
    } catch (err) {
      console.warn('Error loading employee contracts data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleEmployeeUpdate = () => {
      loadData();
    };

    window.addEventListener('jaago_employees_updated', handleEmployeeUpdate);
    window.addEventListener('jaago_departments_updated', handleEmployeeUpdate);
    window.addEventListener('storage', handleEmployeeUpdate);
    return () => {
      window.removeEventListener('jaago_employees_updated', handleEmployeeUpdate);
      window.removeEventListener('jaago_departments_updated', handleEmployeeUpdate);
      window.removeEventListener('storage', handleEmployeeUpdate);
    };
  }, []);

  // Build live contracts directly connected to 100% real employee profiles
  const allContracts = useMemo(() => {
    return buildContractsFromEmployees(employees);
  }, [employees]);

  // Unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department && e.department.trim()) {
        set.add(e.department.trim());
      }
    });
    departments.forEach((d) => {
      if (d.name && d.name.trim()) {
        set.add(d.name.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees, departments]);

  // Filter and resolve contracts
  const activeContracts = useMemo(() => {
    if (scope === 'history') {
      return allContracts;
    }
    return resolveAllCurrentContracts(allContracts, asOfDate);
  }, [allContracts, scope, asOfDate]);

  // Aggregate KPI summary
  const summary = useMemo(() => {
    return calculateContractsSummary(activeContracts, asOfDate);
  }, [activeContracts, asOfDate]);

  // Filtered dataset
  const filteredContracts = useMemo(() => {
    return activeContracts.filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.employeeName.toLowerCase().includes(q);
        const matchesCode = c.employeeCode.toLowerCase().includes(q);
        const matchesDept = c.department.toLowerCase().includes(q);
        const matchesDesig = c.designation.toLowerCase().includes(q);
        const matchesRef = c.contractNo.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDept && !matchesDesig && !matchesRef) {
          return false;
        }
      }

      if (deptFilter !== 'ALL' && c.department !== deptFilter) return false;
      if (typeFilter !== 'ALL' && c.contractType !== typeFilter) return false;

      const derived = deriveContractStatus(c, asOfDate);
      if (statusFilter !== 'ALL' && derived !== statusFilter) return false;

      if (entityFilter !== 'ALL') {
        if (entityFilter === 'Foundation' && c.organization !== 'JAAGO Foundation') return false;
        if (entityFilter === 'Trust' && c.organization !== 'JAAGO Foundation Trust') return false;
      }

      return true;
    });
  }, [activeContracts, searchQuery, deptFilter, typeFilter, statusFilter, entityFilter, asOfDate]);

  // Grouped dataset
  const groupedData = useMemo(() => {
    if (groupBy === 'None') {
      return { 'All Contracts': filteredContracts };
    }

    const groups: Record<string, EmploymentContractVersion[]> = {};

    filteredContracts.forEach((c) => {
      let key = 'Other';
      switch (groupBy) {
        case 'Department':
          key = c.department || 'Unassigned Department';
          break;
        case 'Project':
          key = c.project || 'General Operations';
          break;
        case 'Contract Type':
          key = c.contractType || 'Permanent';
          break;
        case 'Working Schedule':
          key = c.workingSchedule || 'Full-Time';
          break;
        case 'Status':
          key = deriveContractStatus(c, asOfDate);
          break;
        case 'Entity':
          key = c.organization || 'JAAGO Foundation';
          break;
      }

      if (!groups[key]) groups[key] = [];
      groups[key]!.push(c);
    });

    return groups;
  }, [filteredContracts, groupBy, asOfDate]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleSaveNewContract = async (newContract: EmploymentContractVersion) => {
    // 1. Update Custom Contracts Store
    const existingCustoms = getStoredCustomContracts();
    let updatedCustoms = [...existingCustoms];

    if (newContract.supersedesId) {
      updatedCustoms = updatedCustoms.map((c) =>
        c.id === newContract.supersedesId
          ? {
              ...c,
              supersededAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : c
      );
    }
    updatedCustoms.unshift(newContract);
    saveStoredCustomContracts(updatedCustoms);

    // 2. Synchronously Update Employee Profile Fields (Wage, Dates, Work Info)
    const wageNum = Number(newContract.remunerationAmount || 0);
    let targetProfileToPersist: FullEmployeeProfile | null = null;

    const mapToProfileContractType = (
      sched: string
    ): 'Full Time' | 'Part Time' | 'Shift' | 'Hourly' | 'Commission' => {
      if (sched.includes('Part-Time')) return 'Part Time';
      if (sched.includes('Shift')) return 'Shift';
      return 'Full Time';
    };

    const mapToProfileEmployeeType = (
      cType: string
    ): 'Permanent' | 'Contractual' | 'Volunteer' | 'Intern' | 'Consultant' => {
      if (cType === 'Permanent') return 'Permanent';
      if (cType === 'Intern') return 'Intern';
      if (cType === 'Consultant') return 'Consultant';
      return 'Contractual';
    };

    const updatedEmployees = employees.map((emp) => {
      if (emp.id === newContract.employeeId || emp.code === newContract.employeeCode) {
        const updated: FullEmployeeProfile = {
          ...emp,
          // Tab 3: Payroll Wage & Terms
          wage: wageNum,
          regularSalary: wageNum,
          totalCurrentSalary: wageNum,
          salaryJulDec: wageNum,
          salaryJanJun: wageNum,
          joiningDate: newContract.startDate || emp.joiningDate,
          contractEndDate:
            newContract.contractType === 'Permanent' ? '' : newContract.endDate || '',
          contractType: mapToProfileContractType(newContract.workingSchedule),
          employeeType: mapToProfileEmployeeType(newContract.contractType),
          probationaryStatus:
            newContract.contractType === 'Probationary' ? 'On Probation' : 'Confirmed',

          // Tab 1: Work & Organizational Hierarchy
          organization: newContract.organization,
          department: newContract.department,
          project: newContract.project,
          designation: newContract.designation,
          workingSchedule: newContract.workingSchedule,
          supervisor: newContract.reportingTo || emp.supervisor,
          workLocation: newContract.placeOfPosting || emp.workLocation,

          // Remarks & Logs
          payrollRemark: newContract.notes || emp.payrollRemark,
          remark: newContract.notes || emp.remark,
        };
        targetProfileToPersist = updated;
        return updated;
      }
      return emp;
    });

    // Update Local Storage
    try {
      localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(updatedEmployees));
    } catch {}

    // Update in-memory state
    setEmployees(updatedEmployees);

    // Dispatch system events so /pnc/employees and profile pages reflect updates immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('employees-updated', { detail: updatedEmployees })
      );
      window.dispatchEvent(new Event('jaago_pnc_employees_changed'));
    }

    // Persist to Supabase in background
    if (targetProfileToPersist) {
      try {
        await saveEmployeeToSupabase(targetProfileToPersist);
      } catch (err) {
        console.warn('Background Supabase save employee error:', err);
      }
    }

    loadData();
  };

  const openHistoryModal = (contract: EmploymentContractVersion) => {
    const employeeVersions = allContracts.filter(
      (c) => c.employeeId === contract.employeeId || c.employeeCode === contract.employeeCode
    );
    setSelectedEmpForHistory({
      name: contract.employeeName,
      code: contract.employeeCode,
      versions: employeeVersions,
    });
  };

  const exportContractsCSV = () => {
    const headers = [
      'Contract Ref',
      'Employee Code',
      'Employee Name',
      'Organization / Entity',
      'Department',
      'Project',
      'Designation',
      'Contract Type',
      'Working Schedule',
      'Effective Date',
      'Start Date',
      'End Date',
      'Status (Derived)',
      'Remaining Days',
      'Monthly Remuneration',
    ];

    const rows = filteredContracts.map((c) => {
      const status = deriveContractStatus(c, asOfDate);
      const remaining = getDaysRemaining(c.endDate, asOfDate);
      return [
        `"${c.contractNo}"`,
        `"${c.employeeCode}"`,
        `"${c.employeeName}"`,
        `"${c.organization}"`,
        `"${c.department}"`,
        `"${c.project}"`,
        `"${c.designation}"`,
        `"${c.contractType}"`,
        `"${c.workingSchedule}"`,
        c.effectiveDate,
        c.startDate,
        c.endDate || 'Permanent',
        status,
        remaining !== null ? remaining : 'N/A',
        c.remunerationAmount || 0,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JAAGO_Employment_Contracts_${asOfDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateShort = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Find exact employee profile for selected document
  const selectedEmpProfile = useMemo(() => {
    if (!selectedContractForDoc) return null;
    return (
      employees.find(
        (e) =>
          e.id === selectedContractForDoc.employeeId ||
          e.code === selectedContractForDoc.employeeCode
      ) || null
    );
  }, [selectedContractForDoc, employees]);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* ── Page Header Banner ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-500">
              JAAGO HUB &bull; Human Resources
            </span>
            <span className="text-muted-foreground text-xs">&bull;</span>
            <span className="text-xs font-semibold text-muted-foreground">
              Employment Contracts &bull; 100% Employee Profile Bound
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight flex items-center space-x-3">
            <span>Employment Contracts</span>
            {isLoading && <RefreshCw className="h-5 w-5 text-amber-500 animate-spin" />}
          </h1>
          <p className="text-xs text-muted-foreground">
            Directly synced with {employees.length} active employee profiles across all departments, branches, and entities.
          </p>
        </div>

        {/* Date Simulation & Scope Pill */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center space-x-2 bg-card border border-border px-3 py-1.5 rounded-xl shadow-xs text-xs font-bold">
            <Calendar className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">As of</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-foreground font-black focus:outline-none cursor-pointer"
              title="Change evaluation date to preview future expiry windows"
            />
          </div>

          <div className="flex items-center bg-muted/70 p-1 rounded-xl border border-border text-xs font-bold">
            <button
              onClick={() => setScope('current')}
              className={`px-3 py-1 rounded-lg transition ${
                scope === 'current'
                  ? 'bg-card text-amber-500 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Current Active ({activeContracts.length})
            </button>
            <button
              onClick={() => setScope('history')}
              className={`px-3 py-1 rounded-lg transition ${
                scope === 'history'
                  ? 'bg-card text-amber-500 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Full History
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards Strip ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contracts */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center space-x-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Total Contracts</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-foreground font-mono">
              {summary.total}
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-1.5 text-[11px] font-semibold text-muted-foreground">
            <span>{summary.foundationCount} Foundation</span>
            <span>&bull;</span>
            <span>{summary.trustCount} Trust</span>
          </div>
        </div>

        {/* Active Contracts */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Active</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-500 font-mono">
              {summary.activeCount}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {Math.round((summary.activeCount / (summary.total || 1)) * 100)}% of workforce covered
          </div>
        </div>

        {/* Expiring in <= 60 Days (Actionable Warning) */}
        <div className="bg-gradient-to-br from-amber-500/10 via-card to-card border border-amber-500/30 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-amber-500/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center space-x-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Expiring &le; 60 days</span>
            </span>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
              Needs Attention
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-500 font-mono">
              {summary.expiringCount}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-amber-600/80 dark:text-amber-400/80">
            Fixed-term / Intern renewals due soon
          </div>
        </div>

        {/* Ended Contracts */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Ended / Historical</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-rose-500 font-mono">
              {summary.endedCount}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {summary.upcomingCount > 0 ? `${summary.upcomingCount} upcoming` : 'Completed terms'}
          </div>
        </div>
      </div>

      {/* ── Action Toolbar: Search + View Switcher + Filters ─────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee by name, code (e.g. GESP06241107940), designation, or contract ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold bg-muted/50 hover:bg-muted/80 focus:bg-card border border-border focus:border-amber-500 text-foreground transition focus:outline-none"
            />
          </div>

          {/* View Switcher Segmented Control */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('register')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                viewMode === 'register'
                  ? 'bg-card text-amber-500 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Register</span>
            </button>
            <button
              onClick={() => setViewMode('pivot')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                viewMode === 'pivot'
                  ? 'bg-card text-amber-500 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Cross-Tab Pivot</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={exportContractsCSV}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-muted/60 hover:bg-muted text-foreground border border-border shadow-xs transition"
            >
              <Download className="h-4 w-4 text-emerald-500" />
              <span>Export</span>
            </button>
            <button
              onClick={() => {
                setContractToAmend(null);
                setIsNewModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>New Contract</span>
            </button>
          </div>
        </div>

        {/* Dimension & Attribute Filters (Standard Compact Size) */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-border/60 text-xs">
          {/* Group By Selector */}
          <div className="flex items-center space-x-1.5 bg-muted/40 border border-border/70 rounded-lg px-2 py-0.5">
            <span className="text-muted-foreground font-extrabold text-[10px] uppercase tracking-wider">
              Group:
            </span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByDimension)}
              className="bg-transparent font-bold text-[11.5px] text-foreground focus:outline-none cursor-pointer py-1"
            >
              <option value="Department">Department</option>
              <option value="Project">Project</option>
              <option value="Contract Type">Contract Type</option>
              <option value="Working Schedule">Working Schedule</option>
              <option value="Status">Status</option>
              <option value="Entity">Employing Entity</option>
              <option value="None">None (Flat List)</option>
            </select>
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-8 bg-muted/40 hover:bg-muted/70 border border-border/70 rounded-lg px-2.5 py-1 text-[11.5px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[155px] truncate transition cursor-pointer"
          >
            <option value="ALL">All Departments ({uniqueDepartments.length})</option>
            {uniqueDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Contract Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 bg-muted/40 hover:bg-muted/70 border border-border/70 rounded-lg px-2.5 py-1 text-[11.5px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[130px] truncate transition cursor-pointer"
          >
            <option value="ALL">All Types (All)</option>
            <option value="Permanent">Permanent</option>
            <option value="Fixed-Term">Fixed-Term</option>
            <option value="Probationary">Probationary</option>
            <option value="Project-Based">Project-Based</option>
            <option value="Intern">Intern</option>
            <option value="Consultant">Consultant</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 bg-muted/40 hover:bg-muted/70 border border-border/70 rounded-lg px-2.5 py-1 text-[11.5px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[135px] truncate transition cursor-pointer"
          >
            <option value="ALL">All Statuses (All)</option>
            <option value="Active">Active</option>
            <option value="Expiring">Expiring (&le; 60 days)</option>
            <option value="Ended">Ended</option>
            <option value="Upcoming">Upcoming</option>
          </select>

          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-8 bg-muted/40 hover:bg-muted/70 border border-border/70 rounded-lg px-2.5 py-1 text-[11.5px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[135px] truncate transition cursor-pointer"
          >
            <option value="ALL">All Entities (All)</option>
            <option value="Foundation">JAAGO Foundation</option>
            <option value="Trust">JAAGO Foundation Trust</option>
          </select>

          <span className="text-[10.5px] text-muted-foreground ml-auto font-medium whitespace-nowrap">
            Showing <strong className="text-foreground">{filteredContracts.length}</strong> of{' '}
            {activeContracts.length} contracts
          </span>
        </div>
      </div>

      {/* ── View Content Area ─────────────────────────────────────────── */}
      {viewMode === 'pivot' ? (
        <ContractPivotTable contracts={filteredContracts} asOfDate={asOfDate} />
      ) : (
        /* Register Grid Table with Group Accordions */
        <div className="space-y-4">
          {Object.entries(groupedData).map(([groupTitle, rows]) => {
            const isCollapsed = Boolean(collapsedGroups[groupTitle]);

            return (
              <div
                key={groupTitle}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Group Accordion Header */}
                {groupBy !== 'None' && (
                  <button
                    onClick={() => toggleGroup(groupTitle)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 border-b border-border/80 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-xs font-black text-foreground uppercase tracking-wider">
                        {groupTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-muted text-muted-foreground">
                        {rows.length} {rows.length === 1 ? 'contract' : 'contracts'}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-muted-foreground">
                      {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                    </span>
                  </button>
                )}

                {/* Group Rows Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border/60 text-muted-foreground">
                          <th className="py-3 px-4 font-black uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="py-3 px-3 font-black uppercase tracking-wider">
                            Employee ID
                          </th>
                          <th className="py-3 px-3 font-black uppercase tracking-wider">
                            Department
                          </th>
                          <th className="py-3 px-3 font-black uppercase tracking-wider">
                            Project
                          </th>
                          <th className="py-3 px-3 font-black uppercase tracking-wider">
                            Effective
                          </th>
                          <th className="py-3 px-3 font-black uppercase tracking-wider">
                            Start
                          </th>
                          <th className="py-3 px-3 font-black uppercase tracking-wider">
                            End
                          </th>
                          <th className="py-3 px-3 font-black uppercase tracking-wider">
                            Contract Type
                          </th>
                          <th className="py-3 px-3 font-black uppercase tracking-wider">
                            Working Schedule
                          </th>
                          <th className="py-3 px-3 font-black uppercase tracking-wider">
                            Status
                          </th>
                          <th className="py-3 px-4 font-black uppercase tracking-wider text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={11}
                              className="py-8 text-center text-muted-foreground italic"
                            >
                              No contracts found matching your active filter.
                            </td>
                          </tr>
                        ) : (
                          rows.map((contract) => {
                            const status = deriveContractStatus(contract, asOfDate);
                            const daysLeft = getDaysRemaining(contract.endDate, asOfDate);
                            const isTrust = contract.organization === 'JAAGO Foundation Trust';

                            return (
                              <tr
                                key={contract.id}
                                className="hover:bg-muted/30 transition-colors group"
                              >
                                {/* Employee Name & Entity Badge */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center space-x-2.5">
                                    <div className="h-8 w-8 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-black text-xs flex-shrink-0">
                                      {contract.employeeName
                                        .split(' ')
                                        .map((n) => n[0])
                                        .slice(0, 2)
                                        .join('')}
                                    </div>
                                    <div>
                                      <div className="font-extrabold text-foreground flex items-center space-x-1.5">
                                        <span>{contract.employeeName}</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-[10px] text-muted-foreground">
                                        <Building className="h-3 w-3 text-muted-foreground/70" />
                                        <span>{isTrust ? 'Trust' : 'Foundation'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Employee ID */}
                                <td className="py-3.5 px-3 font-mono font-bold text-foreground">
                                  {contract.employeeCode}
                                </td>

                                {/* Department */}
                                <td className="py-3.5 px-3 font-medium text-foreground">
                                  {contract.department}
                                </td>

                                {/* Project */}
                                <td className="py-3.5 px-3 text-muted-foreground font-medium">
                                  {contract.project}
                                </td>

                                {/* Effective Date */}
                                <td className="py-3.5 px-3 font-mono text-muted-foreground font-medium">
                                  {formatDateShort(contract.effectiveDate)}
                                </td>

                                {/* Start Date */}
                                <td className="py-3.5 px-3 font-mono text-muted-foreground font-medium">
                                  {formatDateShort(contract.startDate)}
                                </td>

                                {/* End Date */}
                                <td className="py-3.5 px-3 font-mono font-medium">
                                  {contract.endDate ? (
                                    <span className="text-foreground">
                                      {formatDateShort(contract.endDate)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground font-sans font-bold">
                                      —
                                    </span>
                                  )}
                                </td>

                                {/* Contract Type */}
                                <td className="py-3.5 px-3">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-muted text-foreground border border-border shadow-2xs">
                                    {contract.contractType}
                                  </span>
                                </td>

                                {/* Working Schedule */}
                                <td className="py-3.5 px-3">
                                  <span className="text-muted-foreground text-xs font-semibold">
                                    {contract.workingSchedule}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-3">
                                  <span
                                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide shadow-2xs ${
                                      status === 'Active'
                                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                        : status === 'Expiring'
                                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                        : status === 'Upcoming'
                                        ? 'bg-sky-500/15 text-sky-500 border border-sky-500/30'
                                        : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                    }`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${
                                        status === 'Active'
                                          ? 'bg-emerald-500'
                                          : status === 'Expiring'
                                          ? 'bg-amber-500 animate-pulse'
                                          : status === 'Upcoming'
                                          ? 'bg-sky-500'
                                          : 'bg-rose-500'
                                      }`}
                                    />
                                    <span>
                                      {status}
                                      {status === 'Expiring' && daysLeft !== null
                                        ? ` (${daysLeft}d)`
                                        : ''}
                                    </span>
                                  </span>
                                </td>

                                {/* Contract Actions */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end space-x-1">
                                    {/* View Document Pad */}
                                    <button
                                      onClick={() => setSelectedContractForDoc(contract)}
                                      className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-amber-500 border border-border/60 transition shadow-xs cursor-pointer"
                                      title="View Official Legal Contract Document"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Direct Print */}
                                    <button
                                      onClick={() => {
                                        setSelectedContractForDoc(contract);
                                        setTimeout(() => window.print(), 300);
                                      }}
                                      className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition shadow-xs cursor-pointer"
                                      title="Print / Save PDF"
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Edit / Amend Contract */}
                                    <button
                                      onClick={() => {
                                        setContractToAmend(contract);
                                        setIsNewModalOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-amber-500 border border-border/60 transition shadow-xs cursor-pointer"
                                      title="Edit / Amend Contract"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Version History */}
                                    <button
                                      onClick={() => openHistoryModal(contract)}
                                      className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-amber-500 border border-border/60 transition shadow-xs cursor-pointer"
                                      title="View Contract Version History"
                                    >
                                      <History className="h-3.5 w-3.5" />
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Official Legal Document Modal ────────────────────────────── */}
      <ContractDocumentModal
        contract={selectedContractForDoc}
        employeeProfile={selectedEmpProfile}
        isOpen={Boolean(selectedContractForDoc)}
        onClose={() => setSelectedContractForDoc(null)}
      />

      {/* ── New Contract / Amend Version Modal ───────────────────────── */}
      <NewContractModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setContractToAmend(null);
        }}
        onSaveContract={handleSaveNewContract}
        employees={employees}
        existingContractToAmend={contractToAmend}
      />

      {/* ── Version History Modal ────────────────────────────────────── */}
      {selectedEmpForHistory && (
        <ContractHistoryModal
          isOpen={Boolean(selectedEmpForHistory)}
          onClose={() => setSelectedEmpForHistory(null)}
          employeeName={selectedEmpForHistory.name}
          employeeCode={selectedEmpForHistory.code}
          versions={selectedEmpForHistory.versions}
          asOfDate={asOfDate}
          onSelectVersionForDoc={(v) => setSelectedContractForDoc(v)}
          onAmendVersion={(v) => {
            setContractToAmend(v);
            setIsNewModalOpen(true);
          }}
        />
      )}
    </div>
  );
}
