'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Trash2,
  Loader2,
  Grid3X3,
  UserPlus,
  Zap,
  BookOpen,
  Pencil,
} from 'lucide-react';
import {
  PERMISSION_MODULES,
  INITIAL_ROLES,
  RoleItem,
  PermissionModuleGroup,
  normalizeRoleKey,
} from '@/lib/rbac-data';

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  jobTitle: string;
  avatarUrl?: string;
}

export default function AdminRbacPage() {
  const [roles, setRoles] = useState<RoleItem[]>(INITIAL_ROLES);
  const [permissionModules, setPermissionModules] = useState<PermissionModuleGroup[]>(PERMISSION_MODULES);
  
  // Matrix State: Granted permissions per role
  const [matrixState, setMatrixState] = useState<Record<string, Set<string>>>({});
  const [initialMatrixState, setInitialMatrixState] = useState<Record<string, Set<string>>>({});
  
  // Re-grant State: Delegatable permissions per role
  const [regrantState, setRegrantState] = useState<Record<string, Set<string>>>({});
  const [initialRegrantState, setInitialRegrantState] = useState<Record<string, Set<string>>>({});

  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('super_admin');
  const [roleSearchQuery, setRoleSearchQuery] = useState<string>('');
  const [permSearchQuery, setPermSearchQuery] = useState<string>('');
  const [selectedModuleKey, setSelectedModuleKey] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<'all' | 'view' | 'create_edit' | 'approve' | 'export' | 'config'>('all');
  const [showDelegationGuide, setShowDelegationGuide] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Accordion state for modules: all collapsed/hidden by default
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // Modals
  const [showCreateRoleModal, setShowCreateRoleModal] = useState<boolean>(false);
  const [showUserAssignModal, setShowUserAssignModal] = useState<boolean>(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState<boolean>(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);

  // Edit Role State
  const [roleToEdit, setRoleToEdit] = useState<RoleItem | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [editRoleColor, setEditRoleColor] = useState('#10B981');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Users list
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Create Role Form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleKey, setNewRoleKey] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#10B981');
  const [newRoleBaseTemplate, setNewRoleBaseTemplate] = useState('general_staff');
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Simulator state
  const [simRoleKey, setSimRoleKey] = useState<string>('pnc_officer');
  const [simPermissionKey, setSimPermissionKey] = useState<string>('hr.employees.create');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load RBAC Matrix & Users
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [matrixRes, usersRes] = await Promise.all([
          fetch('/api/v1/rbac/matrix'),
          fetch('/api/v1/users'),
        ]);

        const matrixData = await matrixRes.json();
        const usersData = await usersRes.json();

        if (matrixData.success && matrixData.data) {
          const loadedRoles: RoleItem[] = matrixData.data.roles;
          setRoles(loadedRoles);
          setPermissionModules(matrixData.data.modules || PERMISSION_MODULES);

          const grantedMap: Record<string, Set<string>> = {};
          const regrantMap: Record<string, Set<string>> = {};

          loadedRoles.forEach((r) => {
            grantedMap[r.key] = new Set(r.permissions);
            // Default: if role has permission and is manager/lead/admin, enable regrant
            const regrantable = r.permissions.filter(() =>
              r.key === 'super_admin' || r.key === 'executive_director' || r.key.includes('lead') || r.key.includes('manager') || r.key.includes('admin')
            );
            regrantMap[r.key] = new Set(regrantable);
          });

          setMatrixState(grantedMap);
          setRegrantState(regrantMap);

          // Deep copies for dirty checking
          const initialCopyGranted: Record<string, Set<string>> = {};
          const initialCopyRegrant: Record<string, Set<string>> = {};
          loadedRoles.forEach((r) => {
            initialCopyGranted[r.key] = new Set(grantedMap[r.key]);
            initialCopyRegrant[r.key] = new Set(regrantMap[r.key]);
          });
          setInitialMatrixState(initialCopyGranted);
          setInitialRegrantState(initialCopyRegrant);
        }

        if (usersData.data) {
          setUsersList(usersData.data);
        }
      } catch (err) {
        console.error('Failed to load RBAC data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Check for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    for (const r of roles) {
      const currentG = matrixState[r.key] || new Set();
      const initialG = initialMatrixState[r.key] || new Set();
      if (currentG.size !== initialG.size) return true;
      for (const p of currentG) {
        if (!initialG.has(p)) return true;
      }

      const currentR = regrantState[r.key] || new Set();
      const initialR = initialRegrantState[r.key] || new Set();
      if (currentR.size !== initialR.size) return true;
      for (const p of currentR) {
        if (!initialR.has(p)) return true;
      }
    }
    return false;
  }, [matrixState, initialMatrixState, regrantState, initialRegrantState, roles]);

  const activeRole = useMemo(() => {
    return roles.find((r) => r.key === selectedRoleKey) || roles[0];
  }, [roles, selectedRoleKey]);

  // Active user counts dynamically mapped per role
  const roleUserCounts = useMemo(() => {
    const map: Record<string, number> = {};
    usersList.forEach((u) => {
      const norm = normalizeRoleKey(u.role);
      map[norm] = (map[norm] || 0) + 1;
    });
    return map;
  }, [usersList]);

  // Total permissions count
  const allPermissionsCount = useMemo(() => {
    return permissionModules.reduce((acc, m) => acc + m.permissions.length, 0);
  }, [permissionModules]);

  // Filtered roles in left panel
  const filteredRoles = useMemo(() => {
    if (!roleSearchQuery.trim()) return roles;
    const q = roleSearchQuery.toLowerCase();
    return roles.filter((r) => r.name.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
  }, [roles, roleSearchQuery]);

  // Toggle GRANT for a single permission
  const handleToggleGrant = (roleKey: string, permKey: string) => {
    if (roleKey === 'super_admin') return;

    setMatrixState((prev) => {
      const rolePerms = new Set(prev[roleKey] || []);
      const willBeGranted = !rolePerms.has(permKey);

      if (willBeGranted) {
        rolePerms.add(permKey);
      } else {
        rolePerms.delete(permKey);
        // Cascading: If Grant is OFF, Re-grant must also be turned OFF
        setRegrantState((rPrev) => {
          const rPerms = new Set(rPrev[roleKey] || []);
          rPerms.delete(permKey);
          return { ...rPrev, [roleKey]: rPerms };
        });
      }
      return { ...prev, [roleKey]: rolePerms };
    });
  };

  // Toggle RE-GRANT for a single permission
  const handleToggleRegrant = (roleKey: string, permKey: string) => {
    if (roleKey === 'super_admin') return;

    setRegrantState((prev) => {
      const roleRegrants = new Set(prev[roleKey] || []);
      const willBeRegrantable = !roleRegrants.has(permKey);

      if (willBeRegrantable) {
        roleRegrants.add(permKey);
        // Enabling Re-grant requires Grant to be ON
        setMatrixState((mPrev) => {
          const mPerms = new Set(mPrev[roleKey] || []);
          mPerms.add(permKey);
          return { ...mPrev, [roleKey]: mPerms };
        });
      } else {
        roleRegrants.delete(permKey);
      }
      return { ...prev, [roleKey]: roleRegrants };
    });
  };

  // Toggle all permissions in a module
  const handleToggleModuleAll = (moduleGroup: PermissionModuleGroup, grantAll: boolean) => {
    if (!activeRole || activeRole.key === 'super_admin') return;

    setMatrixState((prev) => {
      const rolePerms = new Set(prev[activeRole.key] || []);
      moduleGroup.permissions.forEach((p) => {
        if (grantAll) {
          rolePerms.add(p.key);
        } else {
          rolePerms.delete(p.key);
        }
      });
      return { ...prev, [activeRole.key]: rolePerms };
    });

    if (!grantAll) {
      setRegrantState((prev) => {
        const roleRegrants = new Set(prev[activeRole.key] || []);
        moduleGroup.permissions.forEach((p) => roleRegrants.delete(p.key));
        return { ...prev, [activeRole.key]: roleRegrants };
      });
    }
  };

  // Grant or Revoke all permissions for active role
  const handleBatchToggleActiveRole = (grantAll: boolean) => {
    if (!activeRole || activeRole.key === 'super_admin') return;

    setMatrixState((prev) => {
      const rolePerms = new Set<string>();
      if (grantAll) {
        permissionModules.forEach((m) => m.permissions.forEach((p) => rolePerms.add(p.key)));
      }
      return { ...prev, [activeRole.key]: rolePerms };
    });

    setRegrantState((prev) => {
      const roleRegrants = new Set<string>();
      if (grantAll) {
        permissionModules.forEach((m) => m.permissions.forEach((p) => roleRegrants.add(p.key)));
      }
      return { ...prev, [activeRole.key]: roleRegrants };
    });
  };

  // Save changes to API
  const handleSaveMatrix = async () => {
    setIsSaving(true);
    try {
      const matrixPayload: Record<string, string[]> = {};
      Object.entries(matrixState).forEach(([key, perms]) => {
        matrixPayload[key] = Array.from(perms);
      });

      const res = await fetch('/api/v1/rbac/matrix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matrix: matrixPayload }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const updatedInitialG: Record<string, Set<string>> = {};
        const updatedInitialR: Record<string, Set<string>> = {};
        Object.entries(matrixState).forEach(([k, set]) => {
          updatedInitialG[k] = new Set(set);
        });
        Object.entries(regrantState).forEach(([k, set]) => {
          updatedInitialR[k] = new Set(set);
        });
        setInitialMatrixState(updatedInitialG);
        setInitialRegrantState(updatedInitialR);
        showToast('✓ RBAC Matrix & Delegation Toggles successfully saved!');
      } else {
        showToast(data.error || 'Failed to save matrix', 'error');
      }
    } catch {
      showToast('Network error while saving matrix', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Edit Role Modal
  const openEditRoleModal = (role: RoleItem) => {
    setRoleToEdit(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || '');
    setEditRoleColor(role.color || '#10B981');
  };

  // Save Edited Role (Persists Name, Description, and Color)
  const handleSaveEditedRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleToEdit || !editRoleName.trim()) {
      showToast('Role name cannot be empty', 'error');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/v1/rbac/roles/${roleToEdit.id || roleToEdit.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editRoleName.trim(),
          description: editRoleDesc.trim(),
          color: editRoleColor,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRoles((prev) =>
          prev.map((r) =>
            r.key === roleToEdit.key
              ? { ...r, name: editRoleName.trim(), description: editRoleDesc.trim(), color: editRoleColor }
              : r
          )
        );
        setRoleToEdit(null);
        showToast(`✓ Role '${editRoleName.trim()}' updated successfully!`);
      } else {
        showToast(data.error || 'Failed to update role', 'error');
      }
    } catch {
      showToast('Network error while updating role', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Create custom role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleKey.trim()) {
      showToast('Please enter both Role Name and unique Key', 'error');
      return;
    }

    setIsCreatingRole(true);
    try {
      const templatePerms = matrixState[newRoleBaseTemplate]
        ? Array.from(matrixState[newRoleBaseTemplate])
        : [];

      const res = await fetch('/api/v1/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName.trim(),
          key: newRoleKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          description: newRoleDesc.trim(),
          color: newRoleColor,
          permissions: templatePerms,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const createdRole: RoleItem = data.data;
        setRoles((prev) => [...prev, createdRole]);
        setMatrixState((prev) => ({
          ...prev,
          [createdRole.key]: new Set(createdRole.permissions),
        }));
        setRegrantState((prev) => ({
          ...prev,
          [createdRole.key]: new Set(createdRole.permissions),
        }));
        setInitialMatrixState((prev) => ({
          ...prev,
          [createdRole.key]: new Set(createdRole.permissions),
        }));
        setInitialRegrantState((prev) => ({
          ...prev,
          [createdRole.key]: new Set(createdRole.permissions),
        }));
        setSelectedRoleKey(createdRole.key);
        setShowCreateRoleModal(false);
        setNewRoleName('');
        setNewRoleKey('');
        setNewRoleDesc('');
        showToast(`✓ Custom Role '${createdRole.name}' created successfully!`);
      } else {
        showToast(data.error || 'Failed to create role', 'error');
      }
    } catch {
      showToast('Error creating role', 'error');
    } finally {
      setIsCreatingRole(false);
    }
  };

  // Delete custom role
  const handleDeleteRole = async (role: RoleItem) => {
    if (role.isSystem) {
      showToast('System core roles cannot be deleted', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/v1/rbac/roles/${role.id || role.key}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.success) {
        setRoles((prev) => prev.filter((r) => r.key !== role.key));
        setMatrixState((prev) => {
          const next = { ...prev };
          delete next[role.key];
          return next;
        });
        setRegrantState((prev) => {
          const next = { ...prev };
          delete next[role.key];
          return next;
        });
        if (selectedRoleKey === role.key) {
          setSelectedRoleKey('super_admin');
        }
        setRoleToDelete(null);
        showToast(`✓ Role '${role.name}' deleted successfully.`);
      } else {
        showToast(data.error || 'Failed to delete role', 'error');
      }
    } catch {
      showToast('Network error deleting role', 'error');
    }
  };

  // Assign user role
  const handleAssignUserRole = async (userId: string, newRoleKey: string) => {
    try {
      const res = await fetch(`/api/v1/rbac/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleKey: newRoleKey }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRoleKey } : u))
        );
        setRoles((prev) =>
          prev.map((r) => {
            const count = usersList.filter((u) =>
              u.id === userId ? newRoleKey === r.key : u.role === r.key
            ).length;
            return { ...r, userCount: count };
          })
        );
        showToast('✓ User role updated successfully!');
      } else {
        showToast(data.error || 'Failed to update user role', 'error');
      }
    } catch {
      showToast('Error updating user role', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Loading RBAC Permission Matrix & Policy Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pb-12 text-xs">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2.5 text-xs font-medium border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Top Header Section (Compact & Clean) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/70 backdrop-blur-md p-4 rounded-xl border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
            <span>Enterprise Security</span>
            <span>&bull;</span>
            <span className="text-cyan-600 dark:text-cyan-400">CASL RBAC Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Role-Based Access Control (RBAC) Matrix
          </h1>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowDelegationGuide(!showDelegationGuide)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
              showDelegationGuide
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300'
                : 'border-border hover:bg-accent text-muted-foreground'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>

          <button
            onClick={() => setShowSimulatorModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-accent transition-all flex items-center gap-1.5 text-foreground"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Policy Tester</span>
          </button>

          <button
            onClick={() => setShowUserAssignModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-accent transition-all flex items-center gap-1.5 text-foreground"
          >
            <UserPlus className="w-3.5 h-3.5 text-primary" />
            <span>Users ({usersList.length})</span>
          </button>

          <button
            onClick={handleSaveMatrix}
            disabled={!hasUnsavedChanges || isSaving}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 animate-pulse'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
            }`}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
          </button>
        </div>
      </div>

      {/* ── 3-Column / 2-Column Responsive Workspace Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ═══════════════════════════════════════════════════════════════
            LEFT SIDE PANEL: ROLE MANAGER & NEW ROLE (3 COLS)
           ═══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-3 lg:sticky lg:top-4">
          
          {/* Create New Role Hero Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-500/10 via-card to-card border border-cyan-500/20 shadow-xs relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                  <Sparkles className="w-2.5 h-2.5" />
                  Custom Role
                </span>
                <h3 className="text-xs font-bold text-foreground mt-1">Create Custom Role</h3>
              </div>
            </div>

            <button
              onClick={() => {
                setNewRoleName('');
                setNewRoleKey('');
                setNewRoleDesc('');
                setNewRoleColor('#06B6D4');
                setShowCreateRoleModal(true);
              }}
              className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Role</span>
            </button>
          </div>

          {/* Roles Directory List Card */}
          <div className="bg-card rounded-xl border border-border shadow-2xs p-3 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="font-bold text-xs text-foreground">Roles & Profiles</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                {roles.length} Total
              </span>
            </div>

            {/* Role Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search roles..."
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            {/* "All Roles Matrix" Toggle */}
            <button
              onClick={() => setSelectedRoleKey('all')}
              className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between text-xs ${
                selectedRoleKey === 'all'
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-700 dark:text-cyan-300 font-bold'
                  : 'bg-card hover:bg-accent/40 border-border text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-semibold text-[11px]">All Roles Grid Table</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            </button>

            {/* Roles List */}
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-0.5">
              {filteredRoles.map((role) => {
                const isSelected = selectedRoleKey === role.key;
                const rolePermCount = matrixState[role.key]?.size || 0;
                const isSuper = role.key === 'super_admin';

                return (
                  <div
                    key={role.id || role.key}
                    onClick={() => setSelectedRoleKey(role.key)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all relative group text-xs ${
                      isSelected
                        ? 'bg-accent/70 border-cyan-500/50 shadow-2xs ring-1 ring-cyan-500/30'
                        : 'bg-background hover:bg-accent/30 border-border/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-background"
                          style={{ backgroundColor: role.color || '#10B981' }}
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-foreground truncate flex items-center gap-1">
                            <span className="truncate">{role.name}</span>
                            {role.isSystem ? (
                              <span className="px-1 py-0.1 rounded text-[9px] font-semibold bg-muted text-muted-foreground">
                                Sys
                              </span>
                            ) : (
                              <span className="px-1 py-0.1 rounded text-[9px] font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons (Edit Pencil + Trash for custom) */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditRoleModal(role);
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-cyan-600 hover:bg-cyan-500/10 transition-all"
                          title="Edit Role Name & Details"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>

                        {!role.isSystem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleToDelete(role);
                            }}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 transition-all"
                            title="Delete Custom Role"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {roleUserCounts[role.key] || (role.key === 'super_admin' ? (roleUserCounts['super_admin'] || 1) : 0)} user
                        {(roleUserCounts[role.key] || (role.key === 'super_admin' ? (roleUserCounts['super_admin'] || 1) : 0)) === 1 ? '' : 's'}
                      </span>
                      <span>
                        {isSuper ? (
                          <strong className="text-amber-500">Root Access</strong>
                        ) : (
                          <><strong className="text-foreground">{rolePermCount}</strong> / {allPermissionsCount}</>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            CENTER PANEL: DUAL-TOGGLE CAPABILITY CONFIGURATOR (6 or 9 COLS)
           ═══════════════════════════════════════════════════════════════ */}
        <div className={`${showDelegationGuide ? 'lg:col-span-6' : 'lg:col-span-9'} space-y-3`}>
          
          {/* Active Role Bar */}
          {selectedRoleKey !== 'all' && activeRole && (
            <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-primary/20 shrink-0"
                    style={{ backgroundColor: activeRole.color || '#10B981' }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-bold text-foreground">{activeRole.name}</h2>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-muted text-muted-foreground">
                        {activeRole.isSystem ? 'System' : 'Custom'}
                      </span>
                      <button
                        onClick={() => openEditRoleModal(activeRole)}
                        className="p-1 rounded text-muted-foreground hover:text-cyan-600 hover:bg-cyan-500/10 transition-all flex items-center gap-1 text-[10px] font-semibold"
                        title="Edit Role Name"
                      >
                        <Pencil className="w-3 h-3 text-cyan-600" />
                        <span>Edit</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{activeRole.description}</p>
                  </div>
                </div>

                {activeRole.key !== 'super_admin' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleBatchToggleActiveRole(true)}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-accent hover:bg-accent/80 text-foreground border border-border"
                    >
                      Grant All
                    </button>
                    <button
                      onClick={() => handleBatchToggleActiveRole(false)}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-accent hover:bg-accent/80 text-rose-500 border border-border"
                    >
                      Revoke All
                    </button>
                  </div>
                )}
              </div>

              {/* Search & Module filter row */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search permissions, actions, or scopes (e.g. attendance, VIEW, EXPORT)..."
                      value={permSearchQuery}
                      onChange={(e) => setPermSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>

                  <select
                    value={selectedModuleKey}
                    onChange={(e) => setSelectedModuleKey(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] font-medium text-foreground focus:outline-none"
                  >
                    <option value="all">All Modules ({permissionModules.length})</option>
                    {permissionModules.map((m) => (
                      <option key={m.moduleKey} value={m.moduleKey}>
                        {m.moduleName} ({m.permissions.length})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const allExpanded = permissionModules.every((m) => expandedModules[m.moduleKey]);
                      const next: Record<string, boolean> = {};
                      permissionModules.forEach((m) => {
                        next[m.moduleKey] = !allExpanded;
                      });
                      setExpandedModules(next);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-background hover:bg-accent border border-border text-[11px] font-semibold text-muted-foreground transition-all shrink-0"
                  >
                    {permissionModules.every((m) => expandedModules[m.moduleKey]) ? 'Collapse All' : 'Expand All'}
                  </button>
                </div>

                {/* Micro-Level Action Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
                    Filter by Action:
                  </span>
                  {[
                    { key: 'all', label: 'All Operations' },
                    { key: 'view', label: 'View & Read (VIEW)' },
                    { key: 'create_edit', label: 'Create & Modify' },
                    { key: 'approve', label: 'Approvals (APPROVE)' },
                    { key: 'export', label: 'Data Exports (EXPORT)' },
                    { key: 'config', label: 'System & Config' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActionFilter(tab.key as any)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        actionFilter === tab.key
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                          : 'bg-background hover:bg-surface border border-border text-muted-foreground'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module Permission Blocks with DUAL TOGGLES (GRANT & RE-GRANT) */}
          {selectedRoleKey !== 'all' && activeRole ? (
            <div className="space-y-2.5">
              {permissionModules
                .filter((m) => selectedModuleKey === 'all' || m.moduleKey === selectedModuleKey)
                .map((moduleGroup) => {
                  const isExpanded = expandedModules[moduleGroup.moduleKey] ?? false;
                  const grantedCount = moduleGroup.permissions.filter((p) =>
                    matrixState[activeRole.key]?.has(p.key) || activeRole.key === 'super_admin'
                  ).length;
                  const totalCount = moduleGroup.permissions.length;
                  const isAllGranted = grantedCount === totalCount;

                  const filteredPerms = moduleGroup.permissions.filter((p) => {
                    if (actionFilter === 'view' && p.actionType !== 'VIEW') return false;
                    if (actionFilter === 'create_edit' && !['CREATE', 'EDIT', 'DELETE'].includes(p.actionType)) return false;
                    if (actionFilter === 'approve' && p.actionType !== 'APPROVE') return false;
                    if (actionFilter === 'export' && p.actionType !== 'EXPORT') return false;
                    if (actionFilter === 'config' && !['CONFIG', 'MANAGE'].includes(p.actionType)) return false;

                    if (!permSearchQuery.trim()) return true;
                    const q = permSearchQuery.toLowerCase();
                    return (
                      p.name.toLowerCase().includes(q) ||
                      p.key.toLowerCase().includes(q) ||
                      p.description.toLowerCase().includes(q) ||
                      p.actionType.toLowerCase().includes(q) ||
                      p.scope.toLowerCase().includes(q)
                    );
                  });

                  if (filteredPerms.length === 0) return null;

                  return (
                    <div
                      key={moduleGroup.moduleKey}
                      className="rounded-xl bg-card border border-border shadow-2xs overflow-hidden"
                    >
                      {/* Module Block Header */}
                      <div
                        onClick={() =>
                          setExpandedModules((prev) => ({
                            ...prev,
                            [moduleGroup.moduleKey]: !isExpanded,
                          }))
                        }
                        className={`p-3 bg-accent/25 hover:bg-accent/40 cursor-pointer flex items-center justify-between transition-all ${
                          isExpanded ? 'border-b border-border/40' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-xs font-bold text-foreground">{moduleGroup.moduleName}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            {totalCount} PERMISSIONS
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeRole.key !== 'super_admin' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleModuleAll(moduleGroup, !isAllGranted);
                              }}
                              className="text-[10px] font-bold px-2 py-0.5 rounded border border-border bg-background hover:bg-accent text-muted-foreground"
                            >
                              {isAllGranted ? 'Revoke All' : 'Grant All'}
                            </button>
                          )}
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Permissions List with Rich Micro-Labels & Dual Toggles */}
                      {isExpanded && (
                        <div className="divide-y divide-border/40 bg-background/40">
                          {filteredPerms.map((perm) => {
                            const isGranted =
                              matrixState[activeRole.key]?.has(perm.key) ||
                              activeRole.key === 'super_admin';
                            const isRegrantable =
                              regrantState[activeRole.key]?.has(perm.key) ||
                              activeRole.key === 'super_admin';

                            return (
                              <div
                                key={perm.key}
                                className="p-3 hover:bg-accent/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                {/* Left side: Micro-Labels & Description */}
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-mono font-bold text-foreground">{perm.key}</span>
                                    
                                    {/* Action Type Micro-Badge */}
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider border ${
                                        perm.actionType === 'VIEW'
                                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                                          : perm.actionType === 'CREATE'
                                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                          : perm.actionType === 'EDIT'
                                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                          : perm.actionType === 'DELETE'
                                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                          : perm.actionType === 'APPROVE'
                                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                                          : perm.actionType === 'EXPORT'
                                          ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30'
                                          : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                                      }`}
                                    >
                                      {perm.actionType}
                                    </span>

                                    {/* Scope Micro-Badge */}
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${
                                        perm.scope === 'GLOBAL'
                                          ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25'
                                          : perm.scope === 'DEPARTMENT'
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                                          : perm.scope === 'OWN'
                                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25'
                                      }`}
                                    >
                                      {perm.scope}
                                    </span>

                                    {isGranted && (
                                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1">
                                        <Shield className="w-2.5 h-2.5" />
                                        ROLE INHERITED
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-muted-foreground leading-snug">
                                    <strong className="text-foreground">{perm.name}</strong> &mdash; {perm.description}
                                  </div>
                                </div>

                                {/* Right side: GRANT and RE-GRANT Toggle Switches */}
                                <div className="flex items-center gap-4 shrink-0 sm:self-center">
                                  
                                  {/* ── 1. GRANT TOGGLE (Cyan / Teal) ── */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      GRANT
                                    </span>
                                    <button
                                      type="button"
                                      disabled={activeRole.key === 'super_admin'}
                                      onClick={() => handleToggleGrant(activeRole.key, perm.key)}
                                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center cursor-pointer ${
                                        isGranted
                                          ? 'bg-cyan-500 justify-end shadow-xs'
                                          : 'bg-muted justify-start'
                                      } ${activeRole.key === 'super_admin' ? 'cursor-not-allowed opacity-90' : ''}`}
                                    >
                                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                                    </button>
                                  </div>

                                  {/* ── 2. RE-GRANT TOGGLE (Gold / Amber) ── */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      RE-GRANT
                                    </span>
                                    <button
                                      type="button"
                                      disabled={activeRole.key === 'super_admin'}
                                      onClick={() => handleToggleRegrant(activeRole.key, perm.key)}
                                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center cursor-pointer ${
                                        isRegrantable
                                          ? 'bg-amber-500 justify-end shadow-xs'
                                          : 'bg-muted justify-start'
                                      } ${activeRole.key === 'super_admin' ? 'cursor-not-allowed opacity-90' : ''}`}
                                    >
                                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            /* Cross-Role Grid View */
            <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
              <div className="p-3 bg-accent/30 border-b border-border flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">Cross-Role Permission Matrix</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                  {roles.length} Roles &bull; {allPermissionsCount} Capabilities
                </span>
              </div>
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-card z-10 border-b border-border">
                    <tr>
                      <th className="p-2.5 font-bold text-foreground min-w-[220px]">Capability Key</th>
                      {roles.map((r) => (
                        <th key={r.key} className="p-2 text-center font-bold text-[11px] min-w-[100px]">
                          <span className="truncate block max-w-[90px] mx-auto">{r.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {permissionModules.flatMap((m) =>
                      m.permissions.map((p) => (
                        <tr key={p.key} className="hover:bg-accent/20">
                          <td className="p-2 font-mono text-[10px] text-muted-foreground">{p.key}</td>
                          {roles.map((r) => {
                            const isG = matrixState[r.key]?.has(p.key) || r.key === 'super_admin';
                            return (
                              <td
                                key={r.key}
                                onClick={() => handleToggleGrant(r.key, p.key)}
                                className="p-2 text-center cursor-pointer hover:bg-cyan-500/10"
                              >
                                {isG ? (
                                  <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-600 mx-auto flex items-center justify-center font-bold text-[9px]">
                                    ✓
                                  </div>
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mx-auto block" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT SIDE PANEL: DELEGATION GUIDE (3 COLS)
           ═══════════════════════════════════════════════════════════════ */}
        {showDelegationGuide && (
          <div className="lg:col-span-3 space-y-3 lg:sticky lg:top-4">
            <div className="p-4 rounded-xl bg-card border border-border shadow-2xs space-y-3.5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                  <BookOpen className="w-4 h-4" />
                  <span>Delegation Guide</span>
                </div>
                <button
                  onClick={() => setShowDelegationGuide(false)}
                  className="text-muted-foreground hover:text-foreground text-[10px]"
                >
                  ✕
                </button>
              </div>

              {/* Step 1: Granting Access */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-foreground">Granting Access</div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Toggling <strong>&quot;Grant&quot;</strong> immediately registers the permission as active for this role.
                  </p>
                </div>
              </div>

              {/* Step 2: Delegation Downstream */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-foreground">Delegation Downstream</div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Enabling <strong>&quot;Re-grant&quot;</strong> permits the user to delegate the permission to their direct subordinates.
                  </p>
                </div>
              </div>

              {/* Warning: Cascading Revocation */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Cascading Revocation</span>
                </div>
                <p className="text-[10px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  Revoking a permission immediately cascades to revoke it from all downstream subordinates in their hierarchy.
                </p>
              </div>

              {/* System Compliance Note */}
              <div className="text-[10px] italic text-muted-foreground pt-1 border-t border-border/40">
                All permission updates take effect instantly and are recorded in the system compliance log.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: EDIT ROLE DETAILS (NAME, DESCRIPTION, COLOR)
         ═══════════════════════════════════════════════════════════════ */}
      {roleToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-foreground">Edit Role Details</h3>
              </div>
              <button
                onClick={() => setRoleToEdit(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedRole} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Role Display Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Department Head"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  required
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">System Key (Slug - Read-only)</label>
                <input
                  type="text"
                  value={roleToEdit.key}
                  disabled
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-muted text-muted-foreground border border-border font-mono text-[11px] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe scope of duties..."
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Color Badge</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={editRoleColor}
                    onChange={(e) => setEditRoleColor(e.target.value)}
                    className="w-7 h-7 rounded border border-border cursor-pointer p-0.5 bg-background"
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">{editRoleColor}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRoleToEdit(null)}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs flex items-center gap-1.5"
                >
                  {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingEdit ? 'Saving...' : 'Save Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: CREATE NEW CUSTOM ROLE
         ═══════════════════════════════════════════════════════════════ */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-foreground">Create Custom Role</h3>
              </div>
              <button
                onClick={() => setShowCreateRoleModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Role Display Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Field Operations Coordinator"
                  value={newRoleName}
                  onChange={(e) => {
                    setNewRoleName(e.target.value);
                    if (!newRoleKey || newRoleKey === newRoleName.toLowerCase().replace(/[^a-z0-9_]/g, '_')) {
                      setNewRoleKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                    }
                  }}
                  required
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Unique System Key (Slug) *</label>
                <input
                  type="text"
                  placeholder="e.g. field_operations_coord"
                  value={newRoleKey}
                  onChange={(e) => setNewRoleKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  required
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe scope of duties..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">Clone Template</label>
                  <select
                    value={newRoleBaseTemplate}
                    onChange={(e) => setNewRoleBaseTemplate(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] text-foreground focus:outline-none"
                  >
                    <option value="general_staff">General Staff</option>
                    <option value="pnc_officer">P&C Officer</option>
                    <option value="dept_manager">Dept Manager</option>
                    <option value="finance_lead">Finance Lead</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Color Badge</label>
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="color"
                      value={newRoleColor}
                      onChange={(e) => setNewRoleColor(e.target.value)}
                      className="w-7 h-7 rounded border border-border cursor-pointer p-0.5 bg-background"
                    />
                    <span className="text-[10px] font-mono text-muted-foreground">{newRoleColor}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingRole}
                  className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs"
                >
                  {isCreatingRole ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: USER ROLE ASSIGNMENTS
         ═══════════════════════════════════════════════════════════════ */}
      {showUserAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-xl rounded-xl border border-border shadow-2xl p-5 space-y-3 animate-in fade-in zoom-in-95 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-foreground">User Role Assignments</h3>
              </div>
              <button
                onClick={() => setShowUserAssignModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {usersList
                .filter((u) => {
                  if (!userSearchQuery.trim()) return true;
                  const q = userSearchQuery.toLowerCase();
                  return (
                    u.fullName?.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q) ||
                    u.department?.toLowerCase().includes(q)
                  );
                })
                .map((user) => (
                  <div
                    key={user.id}
                    className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-foreground truncate">{user.fullName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{user.email} &bull; {user.department || 'Banani HQ'}</div>
                    </div>

                    <select
                      value={(user.role || 'general_staff').toLowerCase().replace(/\s+/g, '_')}
                      onChange={(e) => handleAssignUserRole(user.id, e.target.value)}
                      className="px-2 py-1 rounded bg-card border border-border text-[11px] font-semibold text-foreground focus:outline-none shrink-0"
                    >
                      {roles.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-border flex justify-end shrink-0">
              <button
                onClick={() => setShowUserAssignModal(false)}
                className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: POLICY SIMULATOR
         ═══════════════════════════════════════════════════════════════ */}
      {showSimulatorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-5 space-y-3.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">CASL Policy Simulator</h3>
              </div>
              <button
                onClick={() => setShowSimulatorModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-semibold text-foreground">Select Role</label>
                <select
                  value={simRoleKey}
                  onChange={(e) => setSimRoleKey(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] text-foreground focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground">Permission Capability</label>
                <select
                  value={simPermissionKey}
                  onChange={(e) => setSimPermissionKey(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-[11px] text-foreground focus:outline-none"
                >
                  {permissionModules.flatMap((m) =>
                    m.permissions.map((p) => (
                      <option key={p.key} value={p.key}>
                        [{m.moduleName}] {p.name} ({p.key})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {(() => {
                const isPermitted =
                  simRoleKey === 'super_admin' || Boolean(matrixState[simRoleKey]?.has(simPermissionKey));

                return (
                  <div
                    className={`p-3 rounded-lg border flex items-start gap-2 ${
                      isPermitted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isPermitted ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold">
                        {isPermitted ? 'AUTHORIZED (HTTP 200)' : 'DENIED (HTTP 403 Forbidden)'}
                      </div>
                      <p className="text-[10px] opacity-90">
                        {isPermitted
                          ? `Role '${simRoleKey}' holds active grant for '${simPermissionKey}'.`
                          : `Role '${simRoleKey}' lacks '${simPermissionKey}'.`}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setShowSimulatorModal(false)}
                className="px-4 py-1.5 rounded-lg font-bold bg-cyan-600 text-white text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: DELETE ROLE CONFIRMATION
         ═══════════════════════════════════════════════════════════════ */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center gap-2 text-rose-500 font-bold">
              <Trash2 className="w-4 h-4" />
              <span>Delete Custom Role?</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Are you sure you want to permanently delete custom role <strong>{roleToDelete.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRoleToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRole(roleToDelete)}
                className="px-3.5 py-1.5 rounded-lg font-bold bg-rose-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
