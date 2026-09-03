'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
  User,
  Archive,
  RotateCw,
  Check,
  Users,
  ShieldAlert,
} from 'lucide-react';
import {
  DepartmentItem,
  OrganizationEntity,
  fetchDepartmentsFromSupabase,
  saveDepartmentToSupabase,
  deleteDepartmentFromSupabase,
  fetchOrganizationsFromSupabase,
} from '@/lib/supabase-organization';
import { fetchEmployeesFromSupabase } from '@/lib/supabase-employees';
import type { FullEmployeeProfile } from '@/components/pnc/employee-profile-detail';
import { hasPermission } from '@/lib/rbac-guard';
import { useOrganizationScope, matchesSelectedOrg, matchesSelectedDept } from '@/lib/use-organization-scope';

export default function DepartmentsPage() {
  const { selectedOrg, selectedDept } = useOrganizationScope();
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationEntity[]>([]);
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);

  // ── RBAC STATE ──
  const [rbacLoaded, setRbacLoaded] = useState(false);
  const [canView, setCanView] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DepartmentItem | null>(null);
  const [formData, setFormData] = useState<Partial<DepartmentItem>>({
    name: '',
    code: '',
    organizationId: 'org-1',
    organizationName: 'JAAGO Foundation',
    parentDepartmentId: '',
    parentDepartmentName: '',
    managerName: '',
    managerId: '',
    description: '',
  });

  // Autocomplete state for Department Head / Manager (3+ characters)
  const [managerQuery, setManagerQuery] = useState('');
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  const managerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (managerRef.current && !managerRef.current.contains(event.target as Node)) {
        setShowManagerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // RBAC permissions loader
  useEffect(() => {
    const checkRbac = () => {
      try {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('jaago_user') : null;
        if (userStr) {
          const parsed = JSON.parse(userStr);
          const rawRole = (parsed.role || (Array.isArray(parsed.roles) ? parsed.roles[0] : '') || 'USER').toString();
          const rawRoleUpper = rawRole.toUpperCase();
          const isSuper =
            parsed.isSuperAdmin === true ||
            rawRoleUpper === 'SUPER_ADMIN' ||
            rawRole.toLowerCase() === 'super_admin' ||
            Boolean(parsed.email && parsed.email.toLowerCase().includes('nasif.kamal'));

          const view = isSuper || hasPermission('org.departments.manage', parsed) || hasPermission('org.entities.view', parsed);
          const manage = isSuper || hasPermission('org.departments.manage', parsed);

          setCanView(view);
          setCanManage(manage);
          setRbacLoaded(true);
        } else {
          setRbacLoaded(true);
        }
      } catch {
        setRbacLoaded(true);
      }
    };

    checkRbac();
    window.addEventListener('jaago_user_updated', checkRbac);
    window.addEventListener('jaago_rbac_updated', checkRbac);
    return () => {
      window.removeEventListener('jaago_user_updated', checkRbac);
      window.removeEventListener('jaago_rbac_updated', checkRbac);
    };
  }, []);

  useEffect(() => {
    // Step 1: Auto-sync all entity data from employees → Supabase master tables
    fetch('/api/v1/hr/entities/sync', { method: 'POST' })
      .then(() => {
        // Step 2: After sync, reload departments (now complete from Supabase)
        return Promise.all([
          fetchDepartmentsFromSupabase(),
          fetchOrganizationsFromSupabase(),
          fetchEmployeesFromSupabase(),
        ]);
      })
      .then(([depts, orgs, emps]) => {
        if (orgs) setOrganizations(orgs);
        if (emps) setEmployees(emps);
        if (depts) {
          // Departments are now fully in Supabase — just use them directly.
          // Only add employee-derived items that are still not in Supabase as a safety net.
          const deptMap = new Map<string, DepartmentItem>();
          depts.forEach((d) => deptMap.set(d.name.trim().toLowerCase(), d));

          if (emps && emps.length > 0) {
            emps.forEach((e) => {
              if (e.department && e.department.trim()) {
                const key = e.department.trim().toLowerCase();
                if (!deptMap.has(key)) {
                  deptMap.set(key, {
                    id: `dept-${e.department.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                    name: e.department.trim(),
                    code: e.department.trim().slice(0, 4).toUpperCase(),
                    organizationName: e.organization || 'JAAGO Foundation',
                    organizationId: orgs?.find((o) => o.name === e.organization)?.id || 'org-1',
                    isArchived: false,
                  });
                }
              }
            });
          }
          setDepartments(Array.from(deptMap.values()));
        }
      })
      .catch(() => {
        // Fallback: if sync fails, just load normally
        Promise.all([
          fetchDepartmentsFromSupabase(),
          fetchOrganizationsFromSupabase(),
          fetchEmployeesFromSupabase(),
        ]).then(([depts, orgs, emps]) => {
          if (orgs) setOrganizations(orgs);
          if (emps) setEmployees(emps);
          if (depts) setDepartments(depts);
        });
      });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Autocomplete filter for Department Manager (>= 3 chars)
  const managerSuggestions =
    managerQuery.trim().length >= 3
      ? employees.filter((e) => {
          const q = managerQuery.toLowerCase();
          return (
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q)
          );
        })
      : [];

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      organizationId: organizations[0]?.id || 'org-1',
      organizationName: organizations[0]?.name || 'JAAGO Foundation',
      parentDepartmentId: '',
      parentDepartmentName: '',
      managerName: '',
      managerId: '',
      description: '',
    });
    setManagerQuery('');
    setShowModal(true);
  };

  const handleOpenEditModal = (dept: DepartmentItem) => {
    setEditingItem(dept);
    setFormData({ ...dept });
    setManagerQuery(dept.managerName || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      showToast('Department Name is mandatory *', 'error');
      return;
    }

    const payload: DepartmentItem = {
      id: editingItem?.id || `dept-${Date.now()}`,
      name: formData.name.trim(),
      code: formData.code || '',
      organizationId: formData.organizationId || 'org-1',
      organizationName:
        organizations.find((o) => o.id === formData.organizationId)?.name ||
        formData.organizationName ||
        'JAAGO Foundation',
      parentDepartmentId: formData.parentDepartmentId || '',
      parentDepartmentName:
        departments.find((d) => d.id === formData.parentDepartmentId)?.name ||
        formData.parentDepartmentName ||
        '',
      managerName: formData.managerName || '',
      managerId: formData.managerId || '',
      description: formData.description || '',
      isArchived: editingItem ? editingItem.isArchived : false,
    };

    await saveDepartmentToSupabase(payload, editingItem?.name);

    if (editingItem?.name && editingItem.name.trim() !== payload.name.trim()) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.department?.trim().toLowerCase() === editingItem.name.trim().toLowerCase()
            ? { ...e, department: payload.name.trim() }
            : e
        )
      );
    }

    setDepartments((prev) => {
      // Try to find by id first; fallback to old name (handles synthetic IDs from employee data)
      const oldNameLower = editingItem?.name?.trim().toLowerCase();
      const idx = prev.findIndex(
        (d) => d.id === payload.id || (oldNameLower && d.name.trim().toLowerCase() === oldNameLower)
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...payload, id: prev[idx]?.id || payload.id }; // preserve real id
        return next;
      }
      return [payload, ...prev];
    });

    setShowModal(false);
    showToast(editingItem ? 'Department updated & employee list synced successfully!' : 'Department created successfully!');
  };

  const handleDelete = async (id: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    if (editingItem?.id === id) {
      setShowModal(false);
    }
    await deleteDepartmentFromSupabase(id);
    showToast('Department deleted successfully');
  };

  // Bulk actions
  const handleArchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    const updated = departments.map((d) =>
      selectedIds.includes(d.id) ? { ...d, isArchived: true } : d
    );
    setDepartments(updated);
    for (const id of selectedIds) {
      const target = updated.find((d) => d.id === id);
      if (target) await saveDepartmentToSupabase(target);
    }
    showToast(`${selectedIds.length} department(s) archived`);
    setSelectedIds([]);
  };

  const handleUnarchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    const updated = departments.map((d) =>
      selectedIds.includes(d.id) ? { ...d, isArchived: false } : d
    );
    setDepartments(updated);
    for (const id of selectedIds) {
      const target = updated.find((d) => d.id === id);
      if (target) await saveDepartmentToSupabase(target);
    }
    showToast(`${selectedIds.length} department(s) restored`);
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const idsToDelete = [...selectedIds];
    setDepartments((prev) => prev.filter((d) => !idsToDelete.includes(d.id)));
    setSelectedIds([]);
    await Promise.all(idsToDelete.map((id) => deleteDepartmentFromSupabase(id)));
    showToast(`${count} department(s) deleted`);
  };

  // Filtered list
  const filtered = departments.filter((dept) => {
    const isArchived = Boolean(dept.isArchived);
    if (viewMode === 'ARCHIVED') {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
    }

    if (selectedOrg && selectedOrg !== 'ALL') {
      const orgName = dept.organizationName || organizations.find((o) => o.id === dept.organizationId)?.name;
      if (!matchesSelectedOrg(orgName, selectedOrg)) return false;
    }
    if (selectedDept && selectedDept !== 'ALL') {
      if (!matchesSelectedDept(dept.name, selectedDept)) return false;
    }
    if (selectedOrgFilter && dept.organizationId !== selectedOrgFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        dept.name.toLowerCase().includes(q) ||
        dept.code?.toLowerCase().includes(q) ||
        dept.organizationName?.toLowerCase().includes(q) ||
        dept.managerName?.toLowerCase().includes(q) ||
        dept.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (rbacLoaded && !canView) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-lg mx-auto min-h-[60vh] space-y-5 animate-in fade-in zoom-in-95 select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
          <ShieldAlert className="h-9 w-9 stroke-[2.5]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            You do not have permission to view departments. Role-Based Access Control requires <code className="text-amber-500 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">org.departments.manage</code> or <code className="text-amber-500 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">org.entities.view</code> permission.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-primary/20 transition transform active:scale-95 cursor-pointer"
          >
            <span>Return to My Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Toast Notification */}
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
            <span className="text-foreground font-bold">Departments</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Departments
          </h1>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>NEW DEPARTMENT</span>
          </button>
        )}
      </div>

      {/* Active vs Archived Filter Tabs */}
      <div className="flex items-center space-x-4 border-b border-border/60 text-xs font-extrabold tracking-wider text-muted-foreground">
        <button
          type="button"
          onClick={() => {
            setViewMode('ACTIVE');
            setSelectedIds([]);
          }}
          className={`pb-3 transition relative cursor-pointer ${
            viewMode === 'ACTIVE' ? 'text-amber-500 font-black' : 'hover:text-foreground'
          }`}
        >
          ACTIVE ({departments.filter((d) => !d.isArchived).length})
          {viewMode === 'ACTIVE' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode('ARCHIVED');
            setSelectedIds([]);
          }}
          className={`pb-3 transition relative cursor-pointer ${
            viewMode === 'ARCHIVED' ? 'text-amber-500 font-black' : 'hover:text-foreground'
          }`}
        >
          ARCHIVED ({departments.filter((d) => Boolean(d.isArchived)).length})
          {viewMode === 'ARCHIVED' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search department name, code, manager, or entity..."
            className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <select
          value={selectedOrgFilter}
          onChange={(e) => setSelectedOrgFilter(e.target.value)}
          className="w-full sm:w-64 h-10 px-3.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
        >
          <option value="">Organization (All)</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-xs font-black text-amber-500">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{selectedIds.length} department(s) selected</span>
          </div>

          <div className="flex items-center space-x-2">
            {viewMode === 'ARCHIVED' ? (
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
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-semibold transition cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Departments Table */}
      <div className="rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-surface/50">
                <th className="py-3.5 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((dept) => selectedIds.includes(dept.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(Array.from(new Set([...selectedIds, ...filtered.map((d) => d.id)])));
                      } else {
                        const filteredIds = new Set(filtered.map((d) => d.id));
                        setSelectedIds(selectedIds.filter((id) => !filteredIds.has(id)));
                      }
                    }}
                    className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                  />
                </th>
                <th className="py-3.5 px-4">Department Name</th>
                <th className="py-3.5 px-4">Code / Short Name</th>
                <th className="py-3.5 px-4">Organization</th>
                <th className="py-3.5 px-4 text-center">Employees</th>
                <th className="py-3.5 px-4">Parent Department</th>
                <th className="py-3.5 px-4">Department Head</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.map((dept) => {
                const isSelected = selectedIds.includes(dept.id);
                const staffCount = employees.filter(
                  (e) =>
                    e.department &&
                    e.department.trim().toLowerCase() === dept.name.trim().toLowerCase() &&
                    e.status !== 'Archived' &&
                    !e.isArchived
                ).length;

                return (
                  <tr
                    key={dept.id}
                    onClick={() => handleOpenEditModal(dept)}
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
                            setSelectedIds(selectedIds.filter((id) => id !== dept.id));
                          } else {
                            setSelectedIds([...selectedIds, dept.id]);
                          }
                        }}
                        className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="font-extrabold text-foreground group-hover:text-amber-500 transition text-xs sm:text-[13px]">
                          {dept.name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-muted-foreground">
                      {dept.code || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">
                      {dept.organizationName || 'JAAGO Foundation'}
                    </td>
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/pnc/employees?dept=${encodeURIComponent(dept.name)}`}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-black hover:bg-amber-500/25 transition cursor-pointer"
                        title={`View ${staffCount} employees in ${dept.name}`}
                      >
                        <Users className="h-3 w-3" />
                        <span>{staffCount} Staff</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      {dept.parentDepartmentName ? (
                        <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-bold text-foreground inline-flex items-center space-x-1">
                          <Layers className="h-3 w-3 text-muted-foreground" />
                          <span>{dept.parentDepartmentName}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">— Top Level</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-500 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                          {(dept.managerName || 'DH').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-foreground">{dept.managerName || 'Not Assigned'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(dept)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                          title="Edit Department"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(dept.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete Department"
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

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT DEPARTMENT
          ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-serif font-black text-foreground">
                {editingItem ? 'Edit Department' : 'Create New Department'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Department Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Department Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Program Implementation"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              {/* Code / Short Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Code / Short Name
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. PI"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              {/* Organization (Call from Organization) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Organization (Call data from Organization)
                </label>
                <select
                  value={formData.organizationId || (organizations[0]?.id || 'org-1')}
                  onChange={(e) => {
                    const selOrg = organizations.find((o) => o.id === e.target.value);
                    setFormData({
                      ...formData,
                      organizationId: e.target.value,
                      organizationName: selOrg?.name || 'JAAGO Foundation',
                    });
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                >
                  {organizations.length > 0 ? (
                    organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="org-1">JAAGO Foundation</option>
                      <option value="org-2">JAAGO Foundation Trust</option>
                      <option value="org-3">JAAGO Foundation USA</option>
                      <option value="org-4">JAAGO Foundation UK</option>
                      <option value="org-5">JAAGO Foundation Australia</option>
                    </>
                  )}
                </select>
              </div>

              {/* Parent Department (Call from Department) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Parent Department (Call data from Department)
                </label>
                <select
                  value={formData.parentDepartmentId || ''}
                  onChange={(e) => {
                    const pDept = departments.find((d) => d.id === e.target.value);
                    setFormData({
                      ...formData,
                      parentDepartmentId: e.target.value,
                      parentDepartmentName: pDept?.name || '',
                    });
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="">None (Top Level Department)</option>
                  {departments
                    .filter((d) => d.id !== editingItem?.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Department Head (Manager) - Autocomplete (>= 3 chars) */}
              <div ref={managerRef} className="space-y-1 relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Department Head (Manager) (Call from Employees after 3 alphabets)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={managerQuery}
                    onChange={(e) => {
                      setManagerQuery(e.target.value);
                      setShowManagerDropdown(true);
                      setFormData((prev) => ({
                        ...prev,
                        managerName: e.target.value,
                      }));
                    }}
                    onFocus={() => setShowManagerDropdown(true)}
                    placeholder="Type at least 3 letters (e.g. 'Abd', 'Kav')..."
                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {/* Dropdown Suggestions */}
                {showManagerDropdown && managerSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl p-1.5 space-y-1">
                    {managerSuggestions.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            managerName: emp.name,
                            managerId: emp.id,
                          }));
                          setManagerQuery(emp.name);
                          setShowManagerDropdown(false);
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-surface/80 transition flex items-center justify-between text-xs cursor-pointer group"
                      >
                        <div>
                          <div className="font-extrabold text-foreground group-hover:text-amber-500">
                            {emp.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {emp.code} • {emp.designation}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-amber-500 uppercase font-bold">Select</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Outline departmental domain, goals, and strategic deliverables..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/70">
              {editingItem ? (
                <button
                  type="button"
                  onClick={() => handleDelete(editingItem.id)}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border border-rose-500/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>DELETE</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
                >
                  {editingItem ? 'UPDATE DEPARTMENT' : 'CREATE DEPARTMENT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
