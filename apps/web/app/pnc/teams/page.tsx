'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Crown,
  Archive,
  RotateCw,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  TeamItem,
  TeamMemberItem,
  DepartmentItem,
  ProjectItem,
  fetchTeamsFromSupabase,
  saveTeamToSupabase,
  deleteTeamFromSupabase,
  fetchDepartmentsFromSupabase,
  fetchProjectsFromSupabase,
} from '@/lib/supabase-organization';
import { fetchEmployeesFromSupabase } from '@/lib/supabase-employees';
import type { FullEmployeeProfile } from '@/components/pnc/employee-profile-detail';
import { hasPermission } from '@/lib/rbac-guard';
import { useOrganizationScope, matchesSelectedOrg } from '@/lib/use-organization-scope';

export default function TeamsPage() {
  const { selectedOrg } = useOrganizationScope();
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);

  // ── RBAC STATE ──
  const [rbacLoaded, setRbacLoaded] = useState(false);
  const [canView, setCanView] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TeamItem | null>(null);
  const [formData, setFormData] = useState<Partial<TeamItem>>({
    name: '',
    code: '',
    departmentOrProject: 'Digital School Program',
    teamLeadName: '',
    teamLeadId: '',
    description: '',
    members: [],
  });

  // Autocomplete state for Team Lead (3+ characters)
  const [leadQuery, setLeadQuery] = useState('');
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const leadRef = useRef<HTMLDivElement>(null);

  // Autocomplete state for Multiple Team Members (3+ characters)
  const [memberQuery, setMemberQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const memberRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (leadRef.current && !leadRef.current.contains(event.target as Node)) {
        setShowLeadDropdown(false);
      }
      if (memberRef.current && !memberRef.current.contains(event.target as Node)) {
        setShowMemberDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // RBAC Loader
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
    fetchTeamsFromSupabase().then((data) => {
      if (data) setTeams(data);
    });
    fetchDepartmentsFromSupabase().then((depts) => {
      if (depts) setDepartments(depts);
    });
    fetchProjectsFromSupabase().then((prjs) => {
      if (prjs) setProjects(prjs);
    });
    fetchEmployeesFromSupabase().then((emps) => {
      if (emps) setEmployees(emps);
    });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Autocomplete filter for Team Lead (triggers after >= 3 chars)
  const leadSuggestions =
    leadQuery.trim().length >= 3
      ? employees.filter((e) => {
          const q = leadQuery.toLowerCase();
          return (
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            e.designation.toLowerCase().includes(q)
          );
        })
      : [];

  // Autocomplete filter for Multiple Members (triggers after >= 3 chars)
  const memberSuggestions =
    memberQuery.trim().length >= 3
      ? employees.filter((e) => {
          const q = memberQuery.toLowerCase();
          const alreadyAdded = (formData.members || []).some((m) => m.employeeName === e.name);
          if (alreadyAdded) return false;
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
      code: `TM-${String(teams.length + 1).padStart(3, '0')}`,
      departmentOrProject: departments[0]?.name || 'Program Implementation',
      teamLeadName: '',
      teamLeadId: '',
      description: '',
      members: [],
    });
    setLeadQuery('');
    setMemberQuery('');
    setShowModal(true);
  };

  const handleOpenEditModal = (team: TeamItem) => {
    setEditingItem(team);
    setFormData({
      ...team,
      members: team.members || [],
    });
    setLeadQuery(team.teamLeadName || '');
    setMemberQuery('');
    setShowModal(true);
  };

  const handleAddMember = (emp: FullEmployeeProfile) => {
    const newMember: TeamMemberItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeCode: emp.code,
      role: 'Team Member',
    };
    setFormData((prev) => ({
      ...prev,
      members: [...(prev.members || []), newMember],
    }));
    setMemberQuery('');
    setShowMemberDropdown(false);
  };

  const handleRemoveMember = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      members: (prev.members || []).filter((m) => m.id !== id),
    }));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      showToast('Team Name is mandatory *', 'error');
      return;
    }

    const payload: TeamItem = {
      id: editingItem?.id || `tm-${Date.now()}`,
      name: formData.name.trim(),
      code: formData.code || `TM-${Date.now()}`,
      departmentOrProject: formData.departmentOrProject || 'Program Implementation',
      teamLeadName: formData.teamLeadName || '',
      teamLeadId: formData.teamLeadId || '',
      description: formData.description || '',
      members: formData.members || [],
      isArchived: editingItem ? editingItem.isArchived : false,
    };

    await saveTeamToSupabase(payload, editingItem?.name);

    if (editingItem?.name && editingItem.name.trim() !== payload.name.trim()) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.team?.trim().toLowerCase() === editingItem.name.trim().toLowerCase()
            ? { ...e, team: payload.name.trim() }
            : e
        )
      );
    }

    setTeams((prev) => {
      const idx = prev.findIndex((t) => t.id === payload.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [payload, ...prev];
    });

    setShowModal(false);
    showToast(editingItem ? 'Team updated & employee list synced successfully!' : 'Team created successfully!');
  };

  const handleDelete = async (id: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    if (editingItem?.id === id) {
      setShowModal(false);
    }
    await deleteTeamFromSupabase(id);
    showToast('Team deleted successfully');
  };

  // Bulk actions
  const handleArchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    const updated = teams.map((t) =>
      selectedIds.includes(t.id) ? { ...t, isArchived: true } : t
    );
    setTeams(updated);
    for (const id of selectedIds) {
      const target = updated.find((t) => t.id === id);
      if (target) await saveTeamToSupabase(target);
    }
    showToast(`${selectedIds.length} team(s) archived`);
    setSelectedIds([]);
  };

  const handleUnarchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    const updated = teams.map((t) =>
      selectedIds.includes(t.id) ? { ...t, isArchived: false } : t
    );
    setTeams(updated);
    for (const id of selectedIds) {
      const target = updated.find((t) => t.id === id);
      if (target) await saveTeamToSupabase(target);
    }
    showToast(`${selectedIds.length} team(s) restored`);
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const idsToDelete = [...selectedIds];
    setTeams((prev) => prev.filter((t) => !idsToDelete.includes(t.id)));
    setSelectedIds([]);
    await Promise.all(idsToDelete.map((id) => deleteTeamFromSupabase(id)));
    showToast(`${count} team(s) deleted`);
  };

  // Filtered List
  const filtered = teams.filter((t) => {
    const isArchived = Boolean(t.isArchived);
    if (viewMode === 'ARCHIVED') {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
    }

    if (selectedOrg && selectedOrg !== 'ALL') {
      const dept = departments.find(
        (d) => d.name === t.departmentOrProject || d.id === t.departmentOrProject
      );
      const orgName = dept?.organizationName || '';
      const hasMemberInOrg = (t.members || []).some((m) => {
        const emp = employees.find((e) => e.code === m.employeeCode || e.id === m.employeeId);
        return matchesSelectedOrg(emp?.organization, selectedOrg);
      });
      if (orgName && !matchesSelectedOrg(orgName, selectedOrg) && !hasMemberInOrg) {
        return false;
      }
    }
    if (selectedDeptFilter && !t.departmentOrProject?.toLowerCase().includes(selectedDeptFilter.toLowerCase())) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q) ||
        t.teamLeadName?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        (t.members || []).some((m) => m.employeeName.toLowerCase().includes(q))
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
            You do not have permission to view teams. Role-Based Access Control requires <code className="text-amber-500 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">org.departments.manage</code> or <code className="text-amber-500 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">org.entities.view</code> permission.
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
            <span className="text-foreground font-bold">Teams</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Operational Teams &amp; Squads
          </h1>
          <p className="text-xs text-muted-foreground pt-0.5">
            Organize functional units, appoint team leads, and manage multi-member operational squads.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>NEW TEAM</span>
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
          ACTIVE ({teams.filter((t) => !t.isArchived).length})
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
          ARCHIVED ({teams.filter((t) => Boolean(t.isArchived)).length})
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
            placeholder="Search team name, code, lead, or members..."
            className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <select
          value={selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
          className="w-full sm:w-64 h-10 px-3.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
        >
          <option value="">Department / Project (All)</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
          {projects.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-xs font-black text-amber-500">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{selectedIds.length} team(s) selected</span>
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

      {/* Teams Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((team) => {
          const isSelected = selectedIds.includes(team.id);

          return (
            <div
              key={team.id}
              onClick={() => handleOpenEditModal(team)}
              className={`p-6 rounded-3xl bg-card border shadow-xl transition cursor-pointer flex flex-col justify-between space-y-4 group relative ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/5 shadow-amber-500/10'
                  : 'border-border hover:border-amber-500/50'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (isSelected) {
                          setSelectedIds(selectedIds.filter((id) => id !== team.id));
                        } else {
                          setSelectedIds([...selectedIds, team.id]);
                        }
                      }}
                      className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                    />
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                        {team.code || 'TEAM'}
                      </div>
                      <h3 className="text-base font-extrabold text-foreground group-hover:text-amber-500 transition">
                        {team.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(team.id);
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Delete Team"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <span className="font-semibold text-foreground">{team.departmentOrProject}</span>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {team.description || 'Operational squad assigned to departmental deliverables.'}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-border/60 text-xs">
                {/* Team Lead */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    TEAM LEAD
                  </span>
                  <div className="flex items-center space-x-1.5 bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-bold text-amber-400 text-xs">
                      {team.teamLeadName || 'Not Assigned'}
                    </span>
                  </div>
                </div>

                {/* Members Count & List */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground">
                      MEMBERS ({team.members?.length || 0})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {team.members && team.members.length > 0 ? (
                      team.members.map((m) => (
                        <span
                          key={m.id}
                          className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-medium text-foreground flex items-center space-x-1"
                        >
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                          <span>{m.employeeName}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">No members assigned yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT TEAM
          ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-serif font-black text-foreground">
                {editingItem ? 'Edit Team' : 'Create New Team'}
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
              {/* Team Name * (mandatory) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Team Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Tech 4 Development Engineering Core"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              {/* Team Code */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Team Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. TM-T4D-01"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              {/* Department / Project */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Department / Project
                </label>
                <select
                  value={formData.departmentOrProject || ''}
                  onChange={(e) => setFormData({ ...formData, departmentOrProject: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="">Select Department or Project</option>
                  <optgroup label="── Departments ──">
                    {departments.length > 0 ? (
                      departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Executive Office">Executive Office</option>
                        <option value="Program Implementation">Program Implementation</option>
                        <option value="Digital School Program">Digital School Program</option>
                        <option value="Finance & Accounts">Finance & Accounts</option>
                        <option value="People and Culture">People and Culture</option>
                        <option value="Communications & Fundraising">Communications & Fundraising</option>
                      </>
                    )}
                  </optgroup>
                  <optgroup label="── Projects ──">
                    {projects.length > 0 ? (
                      projects.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Telco Digital School">Telco Digital School</option>
                        <option value="Free School Education for Underprivileged">Free School Education for Underprivileged</option>
                        <option value="Universal Youth Development & Volunteer Voice">Universal Youth Development & Volunteer Voice</option>
                      </>
                    )}
                  </optgroup>
                </select>
              </div>

              {/* Team Lead (Data call from Employee Profile after 3 alphabets) */}
              <div ref={leadRef} className="space-y-1 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Team Lead
                  </label>
                  <span className="text-[10px] text-muted-foreground/80">(Type 3+ letters to search)</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={leadQuery}
                    onChange={(e) => {
                      setLeadQuery(e.target.value);
                      setFormData({ ...formData, teamLeadName: e.target.value });
                      setShowLeadDropdown(true);
                    }}
                    onFocus={() => setShowLeadDropdown(true)}
                    placeholder="Search employee for Team Lead..."
                    className="w-full h-10 pl-8 pr-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                  <Crown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500" />
                </div>

                {/* Lead Suggestions Dropdown */}
                {showLeadDropdown && leadSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-2xl p-2 z-30 space-y-1 max-h-48 overflow-y-auto animate-in fade-in">
                    {leadSuggestions.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setLeadQuery(emp.name);
                          setFormData((prev) => ({
                            ...prev,
                            teamLeadName: emp.name,
                            teamLeadId: emp.id,
                          }));
                          setShowLeadDropdown(false);
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-surface transition flex items-center space-x-2.5 cursor-pointer text-xs"
                      >
                        <div className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{emp.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {emp.designation} &bull; {emp.code}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Team MEMBERS (Allow Multiple add Team Members, Data call from Employee Profile after 3 alphabets) */}
              <div ref={memberRef} className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Team Members (Multiple Add Allowed)
                  </label>
                  <span className="text-[10px] text-muted-foreground/80">(Type 3+ letters to search &amp; add)</span>
                </div>

                {/* Member Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => {
                      setMemberQuery(e.target.value);
                      setShowMemberDropdown(true);
                    }}
                    onFocus={() => setShowMemberDropdown(true)}
                    placeholder="Type 3+ letters to search and add team members..."
                    className="w-full h-10 pl-8 pr-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />

                  {/* Member Suggestions Dropdown */}
                  {showMemberDropdown && memberSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-2xl p-2 z-30 space-y-1 max-h-48 overflow-y-auto animate-in fade-in">
                      {memberSuggestions.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleAddMember(emp)}
                          className="w-full text-left p-2 rounded-xl hover:bg-surface transition flex items-center space-x-2.5 cursor-pointer text-xs"
                        >
                          <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{emp.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {emp.designation} &bull; {emp.code}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Members Chips Container */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(formData.members || []).map((mem) => (
                    <div
                      key={mem.id}
                      className="px-2.5 py-1 rounded-xl bg-surface border border-border flex items-center space-x-2 text-xs font-semibold text-foreground shadow-sm"
                    >
                      <User className="h-3 w-3 text-amber-500" />
                      <span>{mem.employeeName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(mem.id)}
                        className="p-0.5 text-muted-foreground hover:text-rose-500 cursor-pointer"
                        title="Remove Member"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Team scope, primary mission, or operational duties..."
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
                  {editingItem ? 'UPDATE TEAM' : 'CREATE TEAM'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
