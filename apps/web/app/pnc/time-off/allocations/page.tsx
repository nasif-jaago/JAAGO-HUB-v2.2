'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  RotateCw,
  X,
  Trash2,
} from 'lucide-react';
import {
  LeaveAllocationItem,
  fetchLeaveAllocations,
  saveLeaveAllocation,
  saveBulkLeaveAllocations,
  deleteLeaveAllocation,
  deleteBulkLeaveAllocations,
} from '@/lib/supabase-time-off';
import { fetchEmployeesFromSupabase } from '@/lib/supabase-employees';
import {
  fetchDepartmentsFromSupabase,
  fetchProjectsFromSupabase,
  DepartmentItem,
  ProjectItem,
} from '@/lib/supabase-organization';
import {
  useOrganizationScope,
  matchesSelectedOrg,
  matchesSelectedDept,
  isDspDepartment,
} from '@/lib/use-organization-scope';

export default function LeaveAllocationsPage() {
  const { selectedOrg, selectedDept, isDspScoped } = useOrganizationScope();
  const [allocations, setAllocations] = useState<LeaveAllocationItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // One-to-Many Table Selection & Deletion State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    ids: string[];
    names: string;
  }>({
    isOpen: false,
    ids: [],
    names: '',
  });

  // Modal State
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [editingSingleItem, setEditingSingleItem] = useState<LeaveAllocationItem | null>(null);

  // Bulk / Multi-Select Modal State
  const [modalDeptFilter, setModalDeptFilter] = useState<string>('');
  const [modalProjectFilter, setModalProjectFilter] = useState<string>('');
  const [modalEmpSearch, setModalEmpSearch] = useState<string>('');
  const [selectedEmpCodes, setSelectedEmpCodes] = useState<string[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('ALL_PACKAGE');
  const [allocationYear, setAllocationYear] = useState<string>('2026');
  const [totalDaysInput, setTotalDaysInput] = useState<number>(10);

  // Single Edit Modal State
  const [singleFormData, setSingleFormData] = useState<LeaveAllocationItem>({
    id: '',
    employeeId: '',
    employeeCode: '',
    employeeName: '',
    department: "Founder's Office",
    designation: 'Staff',
    leaveGroup: 'Standard Full-time',
    casualAllocated: 10,
    casualUsed: 0,
    medicalAllocated: 10,
    medicalUsed: 0,
    emergencyAllocated: 4,
    emergencyUsed: 0,
    annualAllocated: 15,
    annualUsed: 0,
    maternityAllocated: 0,
    maternityUsed: 0,
    paternityAllocated: 15,
    paternityUsed: 0,
    compOffAllocated: 16,
    compOffUsed: 0,
    bereavementUsed: 0,
    unpaidUsed: 0,
    fiscalYear: '2026-2027',
  });

  const loadData = async () => {
    const [allocs, emps, depts, projs] = await Promise.all([
      fetchLeaveAllocations(),
      fetchEmployeesFromSupabase(),
      fetchDepartmentsFromSupabase(),
      fetchProjectsFromSupabase(),
    ]);
    if (allocs) setAllocations(allocs);
    if (emps) setEmployees(emps);
    if (depts) setDepartmentsList(depts);
    if (projs) setProjectsList(projs);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('jaago_leave_allocation_updated', handleUpdate);
    window.addEventListener('jaago_employees_updated', handleUpdate);

    return () => {
      window.removeEventListener('jaago_leave_allocation_updated', handleUpdate);
      window.removeEventListener('jaago_employees_updated', handleUpdate);
    };
  }, []);

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Open Bulk Allocate Modal
  const handleOpenAllocateModal = () => {
    setEditingSingleItem(null);
    setModalDeptFilter('');
    setModalProjectFilter('');
    setModalEmpSearch('');
    setSelectedEmpCodes(employees.map((e) => e.code)); // select all by default
    setSelectedLeaveType('ALL_PACKAGE');
    setAllocationYear('2026');
    setTotalDaysInput(10);
    setShowAllocateModal(true);
  };

  // Open Single Edit Modal
  const handleOpenEditSingle = (item: LeaveAllocationItem) => {
    setEditingSingleItem(item);
    setSingleFormData({ ...item });
    setShowAllocateModal(true);
  };

  // Filter employees inside the Allocate Modal
  const modalFilteredEmployees = employees.filter((emp) => {
    if (isDspScoped && !isDspDepartment(emp.department, emp.leaveGroup)) {
      return false;
    }
    if (modalDeptFilter && emp.department !== modalDeptFilter) return false;
    if (modalProjectFilter && emp.project !== modalProjectFilter) return false;
    if (modalEmpSearch.trim()) {
      const q = modalEmpSearch.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        (emp.department && emp.department.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggleSelectAllModal = () => {
    if (selectedEmpCodes.length === modalFilteredEmployees.length) {
      setSelectedEmpCodes([]);
    } else {
      setSelectedEmpCodes(modalFilteredEmployees.map((e) => e.code));
    }
  };

  const handleToggleEmployeeModal = (code: string) => {
    if (selectedEmpCodes.includes(code)) {
      setSelectedEmpCodes(selectedEmpCodes.filter((c) => c !== code));
    } else {
      setSelectedEmpCodes([...selectedEmpCodes, code]);
    }
  };

  // ── TABLE ONE-TO-MANY SELECTION & DELETION ────────────────────────────────
  const handleToggleSelectAllTable = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((item) => item.id));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleRequestDeleteSingle = (item: LeaveAllocationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      ids: [item.id],
      names: item.employeeName,
    });
  };

  const handleRequestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedAllocations = allocations.filter((a) => selectedIds.includes(a.id));
    const names =
      selectedAllocations.length === 1
        ? selectedAllocations[0]?.employeeName || 'Selected employee'
        : `${selectedAllocations.length} employee allocations`;

    setDeleteConfirm({
      isOpen: true,
      ids: selectedIds,
      names,
    });
  };

  const handleExecuteDelete = async () => {
    const idsToDelete = deleteConfirm.ids;
    if (idsToDelete.length === 0) return;

    // Optimistic UI update
    const remaining = allocations.filter((a) => !idsToDelete.includes(a.id));
    setAllocations(remaining);
    setSelectedIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
    setDeleteConfirm({ isOpen: false, ids: [], names: '' });

    if (idsToDelete.length === 1 && idsToDelete[0]) {
      await deleteLeaveAllocation(idsToDelete[0]);
      showToastMsg('Leave allocation removed successfully');
    } else {
      await deleteBulkLeaveAllocations(idsToDelete);
      showToastMsg(`${idsToDelete.length} leave allocations deleted permanently`);
    }
  };

  // Submit Single or Bulk Allocation
  const handleSaveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSingleItem) {
      // Save Single
      const updated = allocations.map((a) =>
        a.id === singleFormData.id ? singleFormData : a
      );
      setAllocations(updated);
      setShowAllocateModal(false);
      await saveLeaveAllocation(singleFormData);
      showToastMsg(`Updated leave allocation for ${singleFormData.employeeName}`);
      return;
    }

    // Bulk Allocation
    if (selectedEmpCodes.length === 0) {
      showToastMsg('Please select at least one employee', 'error');
      return;
    }

    const itemsToSave: LeaveAllocationItem[] = selectedEmpCodes.map((code) => {
      const emp = employees.find((e) => e.code === code);
      const existing = allocations.find((a) => a.employeeCode === code);

      let casual = existing?.casualAllocated || 10;
      let medical = existing?.medicalAllocated || 10;
      let emergency = existing?.emergencyAllocated || 4;
      let annual = existing?.annualAllocated || 15;
      let paternity = existing?.paternityAllocated || 15;
      let maternity = existing?.maternityAllocated || 120;
      let compOff = existing?.compOffAllocated || 16;

      if (selectedLeaveType === 'ALL_PACKAGE') {
        casual = 10;
        medical = 10;
        emergency = 4;
        annual = 15;
      } else if (selectedLeaveType === 'Casual Leave') {
        casual = totalDaysInput;
      } else if (selectedLeaveType === 'Medical Leave') {
        medical = totalDaysInput;
      } else if (selectedLeaveType === 'Emergency Leave') {
        emergency = totalDaysInput;
      } else if (selectedLeaveType === 'Annual Leave') {
        annual = totalDaysInput;
      } else if (selectedLeaveType === 'Paternity Leave') {
        paternity = totalDaysInput;
      } else if (selectedLeaveType === 'Maternity Leave') {
        maternity = totalDaysInput;
      } else if (selectedLeaveType === 'Compensatory Leave') {
        compOff = totalDaysInput * 8;
      }

      return {
        id: existing?.id || `alloc-${code}`,
        employeeId: emp?.id || existing?.employeeId || code,
        employeeCode: code,
        employeeName: emp?.name || existing?.employeeName || 'Staff Member',
        department: emp?.department || existing?.department || "Founder's Office",
        designation: emp?.designation || existing?.designation || 'Staff',
        leaveGroup: existing?.leaveGroup || 'Standard Full-time',
        casualAllocated: casual,
        casualUsed: existing?.casualUsed ?? 0,
        medicalAllocated: medical,
        medicalUsed: existing?.medicalUsed ?? 0,
        emergencyAllocated: emergency,
        emergencyUsed: existing?.emergencyUsed ?? 0,
        annualAllocated: annual,
        annualUsed: existing?.annualUsed ?? 0,
        maternityAllocated: maternity,
        maternityUsed: existing?.maternityUsed ?? 0,
        paternityAllocated: paternity,
        paternityUsed: existing?.paternityUsed ?? 0,
        compOffAllocated: compOff,
        compOffUsed: existing?.compOffUsed ?? 0,
        bereavementUsed: existing?.bereavementUsed ?? 0,
        unpaidUsed: existing?.unpaidUsed ?? 0,
        fiscalYear: allocationYear.includes('-') ? allocationYear : `${allocationYear}-${Number(allocationYear) + 1}`,
      };
    });

    const updatedMap = new Map<string, LeaveAllocationItem>();
    allocations.forEach((a) => updatedMap.set(a.employeeCode, a));
    itemsToSave.forEach((item) => updatedMap.set(item.employeeCode, item));
    const mergedList = Array.from(updatedMap.values());

    setAllocations(mergedList);
    setShowAllocateModal(false);
    await saveBulkLeaveAllocations(itemsToSave);
    showToastMsg(`Allocated leave quotas to ${itemsToSave.length} employees successfully`);
  };

  const empCodeToProfile = useMemo(() => {
    const map = new Map<string, any>();
    employees.forEach((e) => {
      if (e.code) map.set(e.code, e);
    });
    return map;
  }, [employees]);

  // Filtered Table List
  const filtered = allocations.filter((item) => {
    const emp = empCodeToProfile.get(item.employeeCode);
    const org = emp?.organization || '';
    const dept = emp?.department || item.department || '';

    if (isDspScoped && !isDspDepartment(dept, item.leaveGroup)) {
      return false;
    }
    if (!matchesSelectedOrg(org, selectedOrg)) return false;
    if (!matchesSelectedDept(dept, selectedDept)) return false;

    if (selectedDeptFilter && item.department !== selectedDeptFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.employeeName.toLowerCase().includes(q) ||
        item.employeeCode.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.designation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const departmentFilterOptions = useMemo(() => {
    if (isDspScoped) {
      return ['Digital School Program'];
    }
    return Array.from(
      new Set([
        ...departmentsList.map((d) => d.name),
        ...allocations.map((a) => a.department),
        ...employees.map((e) => e.department),
      ])
    ).filter(Boolean);
  }, [departmentsList, allocations, employees, isDspScoped]);

  const projectFilterOptions = Array.from(
    new Set([
      ...projectsList.map((p) => p.name),
      ...employees.map((e) => e.project),
    ])
  ).filter(Boolean);

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-2xl animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <Link href="/pnc" className="hover:text-primary hover:underline transition cursor-pointer">
              People and Culture
            </Link>
            <span>/</span>
            <Link href="/pnc/time-off/calendar" className="hover:text-primary hover:underline transition cursor-pointer">
              Time Off
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Allocations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Leave Allocations &amp; Quotas
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground transition shadow-sm cursor-pointer"
            title="Refresh Allocations"
          >
            <RotateCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={handleOpenAllocateModal}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>ALLOCATE LEAVE</span>
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee name, code, department, or grade..."
            className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <select
          suppressHydrationWarning
          value={isDspScoped ? 'Digital School Program' : selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
          disabled={isDspScoped}
          className={`w-full sm:w-64 h-10 px-3.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm ${
            isDspScoped ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'
          }`}
        >
          {!isDspScoped && (
            <option value="">Department (All)</option>
          )}
          {departmentFilterOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Multi-Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-md animate-in slide-in-from-top-1">
          <div className="flex items-center space-x-3">
            <span className="h-6 px-2.5 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-foreground">
              {selectedIds.length === 1 ? '1 allocation selected' : `${selectedIds.length} allocations selected`}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-surface text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={handleRequestDeleteSelected}
              className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 shadow-md shadow-rose-500/20 cursor-pointer active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-surface/50">
                <th className="py-3.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={handleToggleSelectAllTable}
                    className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                    title="Select all"
                  />
                </th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Policy Group</th>
                <th className="py-3.5 px-4">Casual (CL)</th>
                <th className="py-3.5 px-4">Medical (ML)</th>
                <th className="py-3.5 px-4">Emergency (EL)</th>
                <th className="py-3.5 px-4">Annual (AL)</th>
                <th className="py-3.5 px-4">Remaining Balance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground text-xs font-semibold">
                    No leave allocations found. Click <strong>+ ALLOCATE LEAVE</strong> above to allocate quotas in bulk.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const totalAlloc =
                    (item.casualAllocated || 10) +
                    (item.medicalAllocated || 10) +
                    (item.emergencyAllocated || 4) +
                    (item.annualAllocated || 15);
                  const totalUsed =
                    (item.casualUsed || 0) +
                    (item.medicalUsed || 0) +
                    (item.emergencyUsed || 0) +
                    (item.annualUsed || 0);
                  const totalRemaining = totalAlloc - totalUsed;
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenEditSingle(item)}
                      className={`hover:bg-surface/60 transition cursor-pointer group ${
                        isSelected ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectRow(item.id, e as any)}
                          className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                            {item.employeeName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-foreground group-hover:text-amber-500 transition text-xs sm:text-[13px]">
                              {item.employeeName}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {item.employeeCode} &bull; {item.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-bold text-foreground">
                          {item.leaveGroup}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="font-bold text-emerald-500">
                          {(item.casualAllocated || 10) - (item.casualUsed || 0)}
                        </span>
                        <span className="text-muted-foreground"> / {item.casualAllocated || 10}d</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="font-bold text-rose-500">
                          {(item.medicalAllocated || 10) - (item.medicalUsed || 0)}
                        </span>
                        <span className="text-muted-foreground"> / {item.medicalAllocated || 10}d</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="font-bold text-orange-500">
                          {(item.emergencyAllocated || 4) - (item.emergencyUsed || 0)}
                        </span>
                        <span className="text-muted-foreground"> / {item.emergencyAllocated || 4}d</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <span className="font-bold text-blue-500">
                          {(item.annualAllocated || 15) - (item.annualUsed || 0)}
                        </span>
                        <span className="text-muted-foreground"> / {item.annualAllocated || 15}d</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs">
                          {totalRemaining} Days Left
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSingle(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                            title="Edit Quota"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRequestDeleteSingle(item, e)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete Allocation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {deleteConfirm.ids.length > 1 ? 'Delete Selected Allocations' : 'Delete Leave Allocation'}
                </h3>
                <p className="text-xs text-muted-foreground">Permanent deletion from database and storage</p>
              </div>
            </div>

            <p className="text-xs text-foreground/80 leading-relaxed font-medium">
              Are you sure you want to permanently delete the leave allocation for{' '}
              <strong className="text-foreground">{deleteConfirm.names}</strong>? The selected employee(s) will have 0 allocated leave balances until re-allocated.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, ids: [], names: '' })}
                className="px-5 py-2.5 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-rose-500/20 cursor-pointer active:scale-95"
              >
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: ALLOCATE LEAVE QUOTA (BULK ONE-TO-MANY & DEPARTMENT/PROJECT)
          ═══════════════════════════════════════════════════════════════════ */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5 no-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-xl font-serif font-black text-foreground">
                {editingSingleItem ? 'Adjust Individual Leave Quota' : 'Allocate Leave Quota'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAllocateModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAllocation} className="space-y-4 text-xs">
              {editingSingleItem ? (
                /* Single Employee Form */
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Employee
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${singleFormData.employeeName} (${singleFormData.employeeCode})`}
                      className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Casual Leave (CL Days)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={singleFormData.casualAllocated}
                        onChange={(e) =>
                          setSingleFormData({ ...singleFormData, casualAllocated: Number(e.target.value) })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Medical Leave (ML Days)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={singleFormData.medicalAllocated}
                        onChange={(e) =>
                          setSingleFormData({ ...singleFormData, medicalAllocated: Number(e.target.value) })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Emergency Leave (EL Days)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={singleFormData.emergencyAllocated}
                        onChange={(e) =>
                          setSingleFormData({ ...singleFormData, emergencyAllocated: Number(e.target.value) })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Annual Leave (AL Days)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={singleFormData.annualAllocated}
                        onChange={(e) =>
                          setSingleFormData({ ...singleFormData, annualAllocated: Number(e.target.value) })
                        }
                        className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Bulk Allocation Form Matching Screenshot 3 */
                <div className="space-y-3.5">
                  {/* Filter Row 1: Department & Project & Search */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Department Filter */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Filter by Department
                      </label>
                      <select
                        value={modalDeptFilter}
                        onChange={(e) => setModalDeptFilter(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-surface border border-amber-500/50 text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                      >
                        <option value="">All Departments</option>
                        {departmentFilterOptions.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Employee Search */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Search Employee
                      </label>
                      <input
                        type="text"
                        value={modalEmpSearch}
                        onChange={(e) => setModalEmpSearch(e.target.value)}
                        placeholder="Name or ID..."
                        className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Project Filter */}
                  {projectFilterOptions.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Filter by Project / Initiative
                      </label>
                      <select
                        value={modalProjectFilter}
                        onChange={(e) => setModalProjectFilter(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="">All Projects</option>
                        {projectFilterOptions.map((proj) => (
                          <option key={proj} value={proj}>
                            {proj}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Multi-Select Employee Box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                        SELECT EMPLOYEES ({selectedEmpCodes.length} SELECTED) <span className="text-amber-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleToggleSelectAllModal}
                        className="text-[11px] font-black text-amber-500 hover:text-amber-600 uppercase tracking-wider cursor-pointer"
                      >
                        {selectedEmpCodes.length === modalFilteredEmployees.length && modalFilteredEmployees.length > 0
                          ? 'DESELECT ALL'
                          : `SELECT ALL (${modalFilteredEmployees.length})`}
                      </button>
                    </div>

                    <div className="max-h-52 overflow-y-auto rounded-2xl bg-surface/70 border border-border p-2 space-y-1 divide-y divide-border/40">
                      {modalFilteredEmployees.length === 0 ? (
                        <div className="py-6 text-center text-muted-foreground text-xs">
                          No employees match the filters.
                        </div>
                      ) : (
                        modalFilteredEmployees.map((emp) => {
                          const isChecked = selectedEmpCodes.includes(emp.code);
                          return (
                            <div
                              key={emp.code || emp.id}
                              onClick={() => handleToggleEmployeeModal(emp.code)}
                              className={`p-2.5 rounded-xl flex items-center space-x-3 transition cursor-pointer ${
                                isChecked ? 'bg-amber-500/10' : 'hover:bg-card'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // handled by row click
                                className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500 border-border cursor-pointer flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-extrabold text-foreground text-xs sm:text-[13px] truncate">
                                  {emp.name}
                                </div>
                                <div className="text-[10px] font-mono text-muted-foreground truncate">
                                  {emp.code} &bull; {emp.department || 'General'}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Leave Type Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Leave Type <span className="text-amber-500">*</span>
                    </label>
                    <select
                      value={selectedLeaveType}
                      onChange={(e) => setSelectedLeaveType(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="ALL_PACKAGE">
                        All Standard Quotas (Package: CL 10d, ML 10d, EL 4d, AL 15d)
                      </option>
                      <option value="Casual Leave">Casual Leave (CL)</option>
                      <option value="Medical Leave">Medical Leave (ML)</option>
                      <option value="Emergency Leave">Emergency Leave (EL)</option>
                      <option value="Annual Leave">Annual Leave (AL)</option>
                      <option value="Paternity Leave">Paternity Leave (15 Days)</option>
                      <option value="Maternity Leave">Maternity Leave (120 Days)</option>
                      <option value="Compensatory Leave">Compensatory Leave (Hours)</option>
                    </select>
                  </div>

                  {/* Year & Total Days Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Year <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={allocationYear}
                        onChange={(e) => setAllocationYear(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Total Days <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        disabled={selectedLeaveType === 'ALL_PACKAGE'}
                        value={selectedLeaveType === 'ALL_PACKAGE' ? 39 : totalDaysInput}
                        onChange={(e) => setTotalDaysInput(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-70"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!editingSingleItem && selectedEmpCodes.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
                >
                  SAVE ALLOCATION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
