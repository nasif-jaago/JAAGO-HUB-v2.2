'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Upload,
  Download,
  Search,
  MoreVertical,
  Key,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  Building2,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Sparkles,
  Send,
  RefreshCw,
  Edit3,
  Check,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarCheck2,
  Briefcase,
  CreditCard,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  RotateCcw,
  Star,
  TrendingUp,
  DollarSign,
  Radio,
  ClipboardList,
  HeartHandshake,
  BarChart2,
  Cpu,
} from 'lucide-react';
import { EmployeeToUserModal } from '@/components/admin/employee-to-user-modal';
import {
  INITIAL_ROLES,
  RoleItem,
  PermissionModuleGroup,
  normalizeRoleKey,
  getRoleByNormalizedKey,
  getPermissionsForRole,
  getAllPermissionModules,
} from '@/lib/rbac-data';

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  department: string;
  branch: string;
  jobTitle: string;
  phone: string;
  status: 'active' | 'invited' | 'suspended';
  employeeId: string | null;
  isEmployeeLinked: boolean;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt: string | null;
}

function getModuleIconComponent(iconName: string) {
  switch (iconName) {
    case 'ShieldAlert':
      return ShieldAlert;
    case 'Building2':
      return Building2;
    case 'Users':
      return Users;
    case 'Clock':
      return Clock;
    case 'CalendarCheck2':
      return CalendarCheck2;
    case 'Briefcase':
      return Briefcase;
    case 'CreditCard':
      return CreditCard;
    case 'Sparkles':
      return Sparkles;
    case 'Send':
      return Send;
    case 'FileText':
      return FileText;
    case 'SlidersHorizontal':
      return SlidersHorizontal;
    case 'ShieldCheck':
      return ShieldCheck;
    case 'Star':
      return Star;
    case 'TrendingUp':
      return TrendingUp;
    case 'DollarSign':
      return DollarSign;
    case 'Radio':
      return Radio;
    case 'ClipboardList':
      return ClipboardList;
    case 'HeartHandshake':
      return HeartHandshake;
    case 'BarChart2':
      return BarChart2;
    case 'Cpu':
      return Cpu;
    default:
      return Layers;
  }
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleItem[]>(INITIAL_ROLES);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modals state
  const [showEmployeeToUserModal, setShowEmployeeToUserModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateEmployeeModal, setShowCreateEmployeeModal] = useState<UserRecord | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<{ user: UserRecord; tempPass: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<UserRecord | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // ── EDIT USER ROLE & MODULE ACCESS MODAL STATE ──
  const [showEditRoleModal, setShowEditRoleModal] = useState<UserRecord | null>(null);
  const [editModalTab, setEditModalTab] = useState<'role' | 'modules'>('role');
  const [selectedNewRole, setSelectedNewRole] = useState('USER');
  const [userCustomPermissions, setUserCustomPermissions] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [dynamicDepartments, setDynamicDepartments] = useState<any[]>([]);

  useEffect(() => {
    const loadDepts = () => {
      try {
        const raw = localStorage.getItem('jaago_departments');
        if (raw) {
          setDynamicDepartments(JSON.parse(raw));
        }
      } catch {}
    };
    loadDepts();
    window.addEventListener('jaago_departments_updated', loadDepts);
    window.addEventListener('storage', loadDepts);
    return () => {
      window.removeEventListener('jaago_departments_updated', loadDepts);
      window.removeEventListener('storage', loadDepts);
    };
  }, []);

  const allAvailableModules = useMemo(() => {
    return getAllPermissionModules(dynamicDepartments);
  }, [dynamicDepartments]);

  // Form states
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    role: 'Staff',
    department: 'Admin & Procurement',
    branch: 'Head Office (Banani)',
    jobTitle: 'Administrative Officer',
    phone: '',
    createEmployee: false,
  });

  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    role: 'Staff',
    department: 'Admin & Procurement',
    branch: 'Head Office (Banani)',
  });

  const [bulkInviteText, setBulkInviteText] = useState('');
  const [bulkInviteRole, setBulkInviteRole] = useState('Staff');
  const [bulkInviteDept, setBulkInviteDept] = useState('Admin & Procurement');

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);

  const [employeeForm, setEmployeeForm] = useState({
    designation: 'Officer',
    department: 'Admin & Procurement',
    branch: 'Head Office (Banani)',
    salaryBdt: 45000,
    dateOfJoining: '2026-08-01',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (departmentFilter !== 'all') params.set('department', departmentFilter);

      const [usersRes, matrixRes] = await Promise.all([
        fetch(`/api/v1/users?${params.toString()}`),
        fetch('/api/v1/rbac/matrix').catch(() => null),
      ]);

      const data = await usersRes.json();
      if (data.data) {
        setUsers(data.data);
      }

      if (matrixRes && matrixRes.ok) {
        const matrixData = await matrixRes.json();
        if (matrixData.success && matrixData.data?.roles && Array.isArray(matrixData.data.roles)) {
          setAvailableRoles(matrixData.data.roles);
        }
      }
    } catch {
      // Keep existing users state if fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, roleFilter, statusFilter, departmentFilter]);

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // ── 1. MANUAL ADD USER ──
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddModal(false);
        setNewUserForm({
          fullName: '',
          email: '',
          role: 'Staff',
          department: 'Admin & Procurement',
          branch: 'Head Office (Banani)',
          jobTitle: 'Administrative Officer',
          phone: '',
          createEmployee: false,
        });
        showToast(`User ${data.data.fullName} created successfully!`);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to create user');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // ── 2. SINGLE INVITE ──
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowInviteModal(false);
        showToast(`Invitation sent to ${inviteForm.email}!`);
        fetchUsers();
      } else {
        alert(data.error || 'Invitation failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // ── 3. BULK INVITE ──
  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = bulkInviteText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes('@'));

    if (emails.length === 0) {
      alert('Please enter at least one valid email address.');
      return;
    }

    try {
      const res = await fetch('/api/v1/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          role: bulkInviteRole,
          department: bulkInviteDept,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowBulkInviteModal(false);
        setBulkInviteText('');
        showToast(`Successfully dispatched ${data.count} invitations!`);
        fetchUsers();
      } else {
        alert(data.error || 'Bulk invite failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // ── 4. CSV IMPORT ──
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length > 1 && lines[0]) {
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
          const rows = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim());
            const rowObj: any = {};
            headers.forEach((h, idx) => {
              rowObj[h] = values[idx] || '';
            });
            return rowObj;
          });
          setCsvPreviewRows(rows);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportSubmit = async () => {
    if (csvPreviewRows.length === 0) {
      alert('No valid CSV records to import.');
      return;
    }
    try {
      const res = await fetch('/api/v1/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: csvPreviewRows }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowImportModal(false);
        setCsvFile(null);
        setCsvPreviewRows([]);
        showToast(`Successfully imported ${data.importedCount} users!`);
        fetchUsers();
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // ── 5. EXPORT CSV ──
  const handleExportCsv = () => {
    const headers = ['User ID', 'Full Name', 'Email', 'Role', 'Department', 'Branch', 'Job Title', 'Phone', 'Status', 'Employee ID', 'Created At'];
    const rows = users.map((u) => [
      u.id,
      `"${u.fullName}"`,
      u.email,
      u.role,
      `"${u.department}"`,
      `"${u.branch}"`,
      `"${u.jobTitle}"`,
      u.phone || '',
      u.status,
      u.employeeId || 'Not Linked',
      u.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `jaago_hub_users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported users dataset to CSV successfully.');
  };

  // ── 6. CONVERT USER TO EMPLOYEE ──
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCreateEmployeeModal) return;
    try {
      const res = await fetch(`/api/v1/users/${showCreateEmployeeModal.id}/convert-to-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const empCode = data.data.employeeCode;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === showCreateEmployeeModal.id
              ? { ...u, employeeId: empCode, isEmployeeLinked: true }
              : u
          )
        );
        setShowCreateEmployeeModal(null);
        showToast(`Employee ${empCode} created and linked to ${showCreateEmployeeModal.fullName}!`);
      } else {
        alert(data.error || 'Failed to convert to employee');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // ── 7. RESET PASSWORD ──
  const handleResetPassword = async (user: UserRecord) => {
    setActiveActionMenuId(null);
    try {
      const res = await fetch(`/api/v1/users/${user.id}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowResetPasswordModal({ user, tempPass: data.data.temporaryPassword });
      } else {
        alert(data.error || 'Reset failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // ── 8. REVOKE ACCESS ──
  const handleRevokeAccess = async (user: UserRecord) => {
    setActiveActionMenuId(null);
    if (!confirm(`Are you sure you want to revoke access for ${user.fullName}? All active sessions will be terminated immediately.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/users/${user.id}/revoke`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: 'suspended' } : u))
        );
        // Notify Employee List to show "Create User" button again
        window.dispatchEvent(
          new CustomEvent('jaago_user_revoked', { detail: { userId: user.id, email: user.email } })
        );
        showToast(`Access revoked for ${user.fullName}.`);
      } else {
        alert(data.error || 'Revoke failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // ── 9. OPEN EDIT USER ROLE & MODULE ACCESS MODAL ──
  const handleOpenEditRoleModal = (user: UserRecord, initialTab: 'role' | 'modules' = 'role') => {
    setShowEditRoleModal(user);
    setEditModalTab(initialTab);
    const userRoleKey = normalizeRoleKey(user.role || 'USER');
    setSelectedNewRole(userRoleKey);

    let existingPerms: string[] | null = null;
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      existingPerms = user.permissions;
    } else if (typeof window !== 'undefined') {
      try {
        const saved =
          localStorage.getItem(`jaago_user_permissions_${user.id}`) ||
          (user.email ? localStorage.getItem(`jaago_user_permissions_${user.email.toLowerCase().trim()}`) : null);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) existingPerms = parsed;
        }
      } catch {}
    }

    if (!existingPerms) {
      const roleObj = availableRoles.find((r) => r.key === userRoleKey) || getRoleByNormalizedKey(userRoleKey);
      const defaults = roleObj ? [...roleObj.permissions] : getPermissionsForRole(userRoleKey);
      if (defaults.includes('*')) {
        existingPerms = allAvailableModules.flatMap((m) => m.permissions.map((p) => p.key));
      } else {
        existingPerms = defaults;
      }
    } else if (existingPerms.includes('*')) {
      existingPerms = allAvailableModules.flatMap((m) => m.permissions.map((p) => p.key));
    }

    setUserCustomPermissions(existingPerms || []);
    setExpandedModules({});
    setModuleSearchQuery('');
  };

  const handleSelectRole = (newRoleKey: string) => {
    setSelectedNewRole(newRoleKey);
    const roleObj = availableRoles.find((r) => r.key === newRoleKey) || getRoleByNormalizedKey(newRoleKey);
    const defaultPerms = roleObj ? [...roleObj.permissions] : getPermissionsForRole(newRoleKey);
    if (defaultPerms.includes('*')) {
      setUserCustomPermissions(allAvailableModules.flatMap((m) => m.permissions.map((p) => p.key)));
    } else {
      setUserCustomPermissions(defaultPerms);
    }
  };

  const handleToggleModule = (mod: PermissionModuleGroup) => {
    const modPermKeys = mod.permissions.map((p) => p.key);
    const hasAnyActive = modPermKeys.some(
      (k) => userCustomPermissions.includes(k) || userCustomPermissions.includes('*')
    );

    if (hasAnyActive) {
      // Deactivate all permissions in this module
      setUserCustomPermissions((prev) =>
        prev.filter((k) => !modPermKeys.includes(k) && k !== '*')
      );
    } else {
      // Activate all permissions in this module
      setUserCustomPermissions((prev) =>
        Array.from(new Set([...prev.filter((k) => k !== '*'), ...modPermKeys]))
      );
    }
  };

  const handleTogglePermission = (permKey: string) => {
    setUserCustomPermissions((prev) => {
      let currentList = prev;
      if (prev.includes('*')) {
        currentList = allAvailableModules.flatMap((m) => m.permissions.map((p) => p.key));
      }
      if (currentList.includes(permKey)) {
        return currentList.filter((k) => k !== permKey);
      } else {
        return [...currentList, permKey];
      }
    });
  };

  const handleGrantAll = () => {
    const allKeys = allAvailableModules.flatMap((m) => m.permissions.map((p) => p.key));
    setUserCustomPermissions(allKeys);
  };

  const handleRevokeAll = () => {
    setUserCustomPermissions([]);
  };

  const handleResetToRoleDefaults = () => {
    const norm = normalizeRoleKey(selectedNewRole);
    const roleObj = availableRoles.find((r) => r.key === norm) || getRoleByNormalizedKey(selectedNewRole);
    const defaultPerms = roleObj ? [...roleObj.permissions] : getPermissionsForRole(norm);
    if (defaultPerms.includes('*')) {
      const allKeys = allAvailableModules.flatMap((m) => m.permissions.map((p) => p.key));
      setUserCustomPermissions(allKeys);
    } else {
      setUserCustomPermissions(defaultPerms);
    }
    showToast(`Permissions reset to default matrix for role "${selectedNewRole}".`);
  };

  const handleToggleExpandModule = (modKey: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modKey]: !prev[modKey],
    }));
  };

  // ── 10. SAVE USER ROLE & GRANULAR PERMISSIONS ──
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditRoleModal) return;
    setIsSavingRole(true);
    try {
      const res = await fetch(`/api/v1/users/${showEditRoleModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedNewRole,
          permissions: userCustomPermissions,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === showEditRoleModal.id
              ? { ...u, role: selectedNewRole, permissions: userCustomPermissions }
              : u
          )
        );

        // Store user-specific overrides in localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              `jaago_user_permissions_${showEditRoleModal.id}`,
              JSON.stringify(userCustomPermissions)
            );
            if (showEditRoleModal.email) {
              localStorage.setItem(
                `jaago_user_permissions_${showEditRoleModal.email.toLowerCase().trim()}`,
                JSON.stringify(userCustomPermissions)
              );
            }

            // If active session belongs to this user, update active session
            const currentActiveStr = localStorage.getItem('jaago_user');
            if (currentActiveStr) {
              const currentActive = JSON.parse(currentActiveStr);
              if (
                currentActive.id === showEditRoleModal.id ||
                currentActive.email?.toLowerCase().trim() === showEditRoleModal.email.toLowerCase().trim()
              ) {
                currentActive.role = selectedNewRole;
                currentActive.permissions = userCustomPermissions;
                localStorage.setItem('jaago_user', JSON.stringify(currentActive));
              }
            }

            window.dispatchEvent(new CustomEvent('jaago_user_updated'));
            window.dispatchEvent(new CustomEvent('jaago_rbac_updated'));
          } catch {}
        }

        showToast(
          `Role and module permissions for ${showEditRoleModal.fullName} updated successfully!`
        );
        setShowEditRoleModal(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to update user access');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    } finally {
      setIsSavingRole(false);
    }
  };

  // ── 10. SINGLE HARD DELETE USER ──
  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;
    try {
      const res = await fetch(`/api/v1/users/${showDeleteModal.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== showDeleteModal.id));
        setSelectedUserIds((prev) => prev.filter((id) => id !== showDeleteModal.id));
        // Notify Employee List to show "Create User" button again
        window.dispatchEvent(
          new CustomEvent('jaago_user_revoked', {
            detail: { userId: showDeleteModal.id, email: showDeleteModal.email },
          })
        );
        showToast(`User ${showDeleteModal.fullName} permanently hard deleted.`);
        setShowDeleteModal(null);
      } else {
        alert(data.error || 'Hard delete failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // ── 10. BULK HARD DELETE USERS ──
  const handleBulkHardDelete = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      const deletedUsers = users.filter((u) => selectedUserIds.includes(u.id));
      const res = await fetch('/api/v1/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedUserIds }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const count = selectedUserIds.length;
        setUsers((prev) => prev.filter((u) => !selectedUserIds.includes(u.id)));
        setSelectedUserIds([]);
        setShowBulkDeleteModal(false);
        // Notify Employee List for each deleted user
        deletedUsers.forEach((u) =>
          window.dispatchEvent(
            new CustomEvent('jaago_user_revoked', { detail: { userId: u.id, email: u.email } })
          )
        );
        showToast(`Permanently hard deleted ${count} user account(s) from database.`);
      } else {
        alert(data.error || 'Bulk hard delete failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error during hard delete');
    }
  };

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const invitedCount = users.filter((u) => u.status === 'invited').length;
  const employeesCount = users.filter((u) => u.isEmployeeLinked).length;

  return (
    <div className="space-y-6 pb-28 max-w-[1600px] mx-auto text-foreground">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-20 right-6 z-50 bg-primary text-primary-foreground font-black text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="h-4 w-4" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <span>Settings</span>
            <span>&gt;</span>
            <span className="text-primary font-bold">User Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center space-x-3 pt-1">
            <Users className="h-7 w-7 text-primary" />
            <span>User Management</span>
          </h1>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* EMPLOYEE > USER Button */}
          <button
            type="button"
            onClick={() => setShowEmployeeToUserModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-amber-500/25 border border-amber-400/40 transition cursor-pointer"
            title="Convert Non-User Employees from People & Culture to System Users"
          >
            <UserCheck className="h-4 w-4 stroke-[2.5]" />
            <span>EMPLOYEE &gt; USER</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-brand-strong font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground hover:border-primary/50 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Upload className="h-4 w-4 text-emerald-500" />
            <span>Import</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground hover:border-primary/50 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Download className="h-4 w-4 text-blue-500" />
            <span>Export</span>
          </button>

          {/* Delete Button shown when one or more users are selected */}
          {selectedUserIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-xl transition transform active:scale-95 cursor-pointer animate-in fade-in zoom-in-95 border border-rose-600/40"
              title="Permanently Hard Delete Selected Users"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete ({selectedUserIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-md space-y-1">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">Total Users</div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">{totalUsers}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-md space-y-1">
          <div className="text-[11px] font-bold uppercase text-emerald-500">Active Accounts</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-500">{activeCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-md space-y-1">
          <div className="text-[11px] font-bold uppercase text-amber-500">Pending Invites</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500">{invitedCount}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border shadow-md space-y-1">
          <div className="text-[11px] font-bold uppercase text-blue-500">Linked Employees</div>
          <div className="text-2xl sm:text-3xl font-black text-blue-500">{employeesCount}</div>
        </div>
      </div>

      {/* ── TOOLBAR & SEARCH BAR ── */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, employee ID, role, or department..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Roles</option>
            {availableRoles.map((r) => (
              <option key={r.key} value={r.key}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="invited">Pending Invite</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Departments</option>
            <option value="Admin & Procurement">Admin &amp; Procurement</option>
            <option value="Education & Schools">Education &amp; Schools</option>
            <option value="Finance & Accounts">Finance &amp; Accounts</option>
            <option value="Human Resources">Human Resources</option>
            <option value="Programs & Development">Programs &amp; Development</option>
            <option value="Founder's Office">Founder&apos;s Office</option>
            <option value="Volunteer for Bangladesh">Volunteer for Bangladesh</option>
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('all');
              setStatusFilter('all');
              setDepartmentFilter('all');
            }}
            className="p-2.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground transition"
            title="Reset Filters"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── USER DIRECTORY TABLE PANEL ── */}
      <div className="rounded-2xl bg-card border border-border shadow-xl">
        <div className="overflow-x-auto min-h-[380px] pb-28">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface/80 text-muted-foreground border-b border-border font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.length > 0 && selectedUserIds.length === users.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department &amp; Branch</th>
                <th className="p-4">Employee Record</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Login</th>
                <th className="p-4 text-center">Create Employee</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading users directory...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const initials = user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={user.id} className="hover:bg-surface/40 transition">
                      {/* Checkbox */}
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          className="rounded border-border text-primary focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* User (Avatar + Name + Email) */}
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 text-primary font-black text-xs flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-foreground flex items-center space-x-1.5">
                              <span>{user.fullName}</span>
                              {user.status === 'active' && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4">
                        {(() => {
                          const norm = normalizeRoleKey(user.role);
                          const roleObj = availableRoles.find((r) => r.key === norm) || getRoleByNormalizedKey(user.role);
                          const displayName = roleObj?.name || (norm === 'user' ? 'Employee / User' : user.role);

                          return (
                            <button
                              type="button"
                              onClick={() => handleOpenEditRoleModal(user, 'role')}
                              title="Click to edit role & module permissions"
                              className={`group px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 ${
                                norm === 'super_admin'
                                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/25'
                                  : norm === 'executive_director'
                                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25'
                                  : norm === 'admin'
                                  ? 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30 hover:bg-pink-500/25'
                                  : norm === 'pnc_officer'
                                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/25'
                                  : norm === 'dept_manager'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                  : norm === 'finance_lead'
                                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500/25'
                                  : norm === 'auditor'
                                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25'
                                  : norm === 'cluster_head'
                                  ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 hover:bg-teal-500/25'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                              }`}
                            >
                              <span>{displayName}</span>
                              <Edit3 className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 group-hover:text-primary transition" />
                            </button>
                          );
                        })()}
                      </td>

                      {/* Department & Branch */}
                      <td className="p-4">
                        <div className="font-bold text-foreground">{user.department}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center space-x-1">
                          <Building2 className="h-3 w-3" />
                          <span>{user.branch}</span>
                        </div>
                      </td>

                      {/* Employee Record */}
                      <td className="p-4">
                        {user.isEmployeeLinked && user.employeeId ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-[11px] font-mono font-bold text-primary">
                              {user.employeeId}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            Unlinked
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center space-x-1 ${
                            user.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                              : user.status === 'invited'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === 'active'
                                ? 'bg-emerald-500'
                                : user.status === 'invited'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span>{user.status}</span>
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="p-4 text-muted-foreground font-mono text-[11px]">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>

                      {/* Create Employee Column (Before Actions) */}
                      <td className="p-4 text-center">
                        {!user.isEmployeeLinked && !user.employeeId ? (
                          <button
                            onClick={() => {
                              const params = new URLSearchParams({
                                action: 'new',
                                name: user.fullName,
                                email: user.email,
                                department: user.department,
                                designation: user.jobTitle || user.role,
                                userId: user.id,
                              });
                              window.open(`/pnc/employees?${params.toString()}`, '_blank');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-[11px] uppercase tracking-wider transition flex items-center space-x-1.5 mx-auto cursor-pointer shadow-md active:scale-95"
                            title="Create Employee in People & Culture"
                          >
                            <UserPlus className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>Create Employee</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground/20 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="p-4 text-right relative">
                        <div className="inline-flex items-center space-x-1">
                          {/* Quick Edit Role & Modules */}
                          <button
                            onClick={() => handleOpenEditRoleModal(user, 'role')}
                            className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition cursor-pointer"
                            title="Edit Role & System Permissions"
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Module & Menu Access */}
                          <button
                            onClick={() => handleOpenEditRoleModal(user, 'modules')}
                            className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-amber-500 hover:border-amber-500/40 transition cursor-pointer"
                            title="Configure Module & Menu Access"
                          >
                            <Layers className="h-3.5 w-3.5" />
                          </button>

                          {/* Quick Create Employee if not linked */}
                          {!user.isEmployeeLinked && (
                            <button
                              onClick={() => {
                                setShowCreateEmployeeModal(user);
                                setEmployeeForm({
                                  designation: user.jobTitle || 'Officer',
                                  department: user.department || 'Admin & Procurement',
                                  branch: user.branch || 'Head Office (Banani)',
                                  salaryBdt: 45000,
                                  dateOfJoining: '2026-08-01',
                                });
                              }}
                              className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-primary transition cursor-pointer"
                              title="Create Employee Profile"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Quick Reset Password */}
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-amber-500 transition cursor-pointer"
                            title="Reset Password"
                          >
                            <Key className="h-3.5 w-3.5" />
                          </button>

                          {/* Action Menu Toggle */}
                          <button
                            onClick={() => setActiveActionMenuId(activeActionMenuId === user.id ? null : user.id)}
                            className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Action Popover Menu */}
                        {activeActionMenuId === user.id && (
                          <>
                            {/* Backdrop overlay to close on outside click */}
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setActiveActionMenuId(null)}
                            />

                            <div className="absolute right-4 top-full mt-1.5 w-56 rounded-2xl bg-card border border-border shadow-[0_12px_40px_rgba(0,0,0,0.25)] p-2 z-40 animate-in fade-in zoom-in-95 text-left space-y-1">
                              <button
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  handleOpenEditRoleModal(user, 'role');
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface rounded-xl transition cursor-pointer"
                              >
                                <Shield className="h-3.5 w-3.5 text-primary" />
                                <span>Edit Role Assignment</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  handleOpenEditRoleModal(user, 'modules');
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface rounded-xl transition cursor-pointer"
                              >
                                <Layers className="h-3.5 w-3.5 text-amber-500" />
                                <span>Module &amp; Menu Access</span>
                              </button>

                              {!user.isEmployeeLinked && (
                                <button
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setShowCreateEmployeeModal(user);
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface rounded-xl transition cursor-pointer"
                                >
                                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                                  <span>Create Employee</span>
                                </button>
                              )}

                              {user.status === 'invited' && (
                                <button
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    showToast(`Invitation re-sent to ${user.email}`);
                                  }}
                                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface rounded-xl transition cursor-pointer"
                                >
                                  <Mail className="h-3.5 w-3.5 text-amber-500" />
                                  <span>Resend Invite</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  handleResetPassword(user);
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface rounded-xl transition cursor-pointer"
                              >
                                <Key className="h-3.5 w-3.5 text-amber-500" />
                                <span>Reset Password</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  handleRevokeAccess(user);
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                                <span>Revoke / Suspend</span>
                              </button>

                              <div className="h-px bg-border my-1" />

                              <button
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  setShowDeleteModal(user);
                                }}
                                className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete User</span>
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: ADD USER (MANUAL) ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Manual Add User</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-muted-foreground pb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUserForm.fullName}
                  onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                  placeholder="e.g. Mahfuzur Rahman"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-muted-foreground pb-1">Official Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="e.g. mahfuzur.rahman@jaago.com.bd"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                    placeholder="+880 1711 000000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Department</label>
                  <select
                    value={newUserForm.department}
                    onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="Admin & Procurement">Admin &amp; Procurement</option>
                    <option value="Education & Schools">Education &amp; Schools</option>
                    <option value="Finance & Accounts">Finance &amp; Accounts</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Programs & Development">Programs &amp; Development</option>
                    <option value="Founder's Office / FC">Founder&apos;s Office / FC</option>
                    <option value="Volunteer for Bangladesh">Volunteer for Bangladesh</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Branch Location</label>
                  <select
                    value={newUserForm.branch}
                    onChange={(e) => setNewUserForm({ ...newUserForm, branch: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="Head Office (Banani)">Head Office (Banani)</option>
                    <option value="Rayer Bazar School">Rayer Bazar School</option>
                    <option value="Chittagong Campus">Chittagong Campus</option>
                    <option value="Bandarban Hub">Bandarban Hub</option>
                  </select>
                </div>
              </div>

              {/* Auto Create Employee Profile */}
              <div className="pt-2">
                <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForm.createEmployee}
                    onChange={(e) => setNewUserForm({ ...newUserForm, createEmployee: e.target.checked })}
                    className="rounded text-primary focus:ring-0"
                  />
                  <div>
                    <div className="font-bold text-foreground">Also Create HR Employee Profile</div>
                    <div className="text-[11px] text-muted-foreground">
                      Automatically generates JFT-2026 employee code and links user to HR database.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-bold hover:bg-card transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider hover:bg-brand-strong transition shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: INVITE USER ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Invite New User</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-muted-foreground pb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="colleague@jaago.com.bd"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-muted-foreground pb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  value={inviteForm.fullName}
                  onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                  placeholder="e.g. Farhana Islam"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Department</label>
                  <select
                    value={inviteForm.department}
                    onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="Admin & Procurement">Admin &amp; Procurement</option>
                    <option value="Education & Schools">Education &amp; Schools</option>
                    <option value="Finance & Accounts">Finance &amp; Accounts</option>
                    <option value="Programs & Development">Programs &amp; Development</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider hover:bg-brand-strong transition shadow-md flex items-center space-x-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: BULK INVITE ── */}
      {showBulkInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <Send className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">Bulk Invite Users</h3>
              </div>
              <button
                onClick={() => setShowBulkInviteModal(false)}
                className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBulkInvite} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-muted-foreground pb-1">
                  Email Addresses (One per line or comma-separated) *
                </label>
                <textarea
                  required
                  rows={5}
                  value={bulkInviteText}
                  onChange={(e) => setBulkInviteText(e.target.value)}
                  placeholder={`rahim@jaago.com.bd\nkarim@jaago.com.bd\nsultana@jaago.com.bd`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground font-mono focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Default Role</label>
                  <select
                    value={bulkInviteRole}
                    onChange={(e) => setBulkInviteRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Default Department</label>
                  <select
                    value={bulkInviteDept}
                    onChange={(e) => setBulkInviteDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="Admin & Procurement">Admin &amp; Procurement</option>
                    <option value="Education & Schools">Education &amp; Schools</option>
                    <option value="Finance & Accounts">Finance &amp; Accounts</option>
                    <option value="Programs & Development">Programs &amp; Development</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowBulkInviteModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-black font-black uppercase tracking-wider hover:bg-amber-600 transition shadow-md flex items-center space-x-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Batch Invitations</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: IMPORT USERS (CSV + DEMO TEMPLATE) ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                <h3 className="text-base font-bold text-foreground">Import Users (CSV)</h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setCsvFile(null);
                  setCsvPreviewRows([]);
                }}
                className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Demo Template Download Banner */}
            <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-foreground flex items-center space-x-1.5">
                  <Download className="h-3.5 w-3.5 text-primary" />
                  <span>Download Demo Template (CSV)</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Use this pre-formatted template with required columns to avoid validation errors.
                </div>
              </div>
              <a
                href="/demo_users_import_template.csv"
                download="demo_users_import_template.csv"
                className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:bg-brand-strong transition shadow-sm flex items-center space-x-1"
              >
                <Download className="h-3 w-3" />
                <span>Demo CSV</span>
              </a>
            </div>

            {/* File Upload Box */}
            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2 hover:border-primary/50 transition bg-surface/30">
              <Upload className="h-8 w-8 text-primary mx-auto" />
              <div className="text-xs font-bold text-foreground">
                {csvFile ? csvFile.name : 'Select or drag-and-drop CSV file here'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Columns: full_name, email, role, department, branch, job_title, phone, create_employee
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="block mx-auto text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground cursor-pointer"
              />
            </div>

            {/* Preview of Parsed Rows */}
            {csvPreviewRows.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-foreground">
                  Preview ({csvPreviewRows.length} records ready):
                </div>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-surface p-2 text-[11px] space-y-1">
                  {csvPreviewRows.slice(0, 5).map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-border/50">
                      <span className="font-bold text-foreground">{row.full_name || row.email}</span>
                      <span className="text-muted-foreground">{row.email} &bull; {row.role}</span>
                    </div>
                  ))}
                  {csvPreviewRows.length > 5 && (
                    <div className="text-center text-[10px] text-muted-foreground pt-1">
                      + {csvPreviewRows.length - 5} more records
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={csvPreviewRows.length === 0}
                onClick={handleImportSubmit}
                className={`px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md ${
                  csvPreviewRows.length > 0
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer'
                    : 'bg-surface text-muted-foreground border border-border cursor-not-allowed'
                }`}
              >
                Import {csvPreviewRows.length > 0 ? `(${csvPreviewRows.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: CREATE EMPLOYEE FROM USER ── */}
      {showCreateEmployeeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Create Employee Profile</h3>
              </div>
              <button
                onClick={() => setShowCreateEmployeeModal(null)}
                className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1 text-xs">
              <div className="text-muted-foreground">Target User:</div>
              <div className="font-bold text-foreground text-sm">{showCreateEmployeeModal.fullName}</div>
              <div className="text-muted-foreground font-mono text-[11px]">{showCreateEmployeeModal.email}</div>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Official Designation</label>
                  <input
                    type="text"
                    required
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Monthly Salary (BDT)</label>
                  <input
                    type="number"
                    required
                    value={employeeForm.salaryBdt}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, salaryBdt: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Assigned Department</label>
                  <select
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="Admin & Procurement">Admin &amp; Procurement</option>
                    <option value="Education & Schools">Education &amp; Schools</option>
                    <option value="Finance & Accounts">Finance &amp; Accounts</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Programs & Development">Programs &amp; Development</option>
                    <option value="Founder's Office / FC">Founder&apos;s Office / FC</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-muted-foreground pb-1">Branch / Campus</label>
                  <select
                    value={employeeForm.branch}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, branch: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="Head Office (Banani)">Head Office (Banani)</option>
                    <option value="Rayer Bazar School">Rayer Bazar School</option>
                    <option value="Chittagong Campus">Chittagong Campus</option>
                    <option value="Bandarban Hub">Bandarban Hub</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-muted-foreground pb-1">Date of Joining</label>
                <input
                  type="date"
                  required
                  value={employeeForm.dateOfJoining}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, dateOfJoining: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateEmployeeModal(null)}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider hover:bg-brand-strong transition shadow-md"
                >
                  Generate Employee Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: RESET PASSWORD RESULT ── */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">Password Reset</h3>
              </div>
              <button
                onClick={() => setShowResetPasswordModal(null)}
                className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                A temporary password was generated for{' '}
                <span className="font-bold text-foreground">{showResetPasswordModal.user.fullName}</span>:
              </p>
              <div className="p-4 rounded-2xl bg-surface border border-border font-mono text-base font-black text-primary select-all text-center tracking-wider">
                {showResetPasswordModal.tempPass}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                This credential is valid for 24 hours. The user must set a new password on their next sign-in.
              </p>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(showResetPasswordModal.tempPass);
                  showToast('Temporary password copied to clipboard!');
                  setShowResetPasswordModal(null);
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:bg-brand-strong transition shadow-md"
              >
                Copy Password &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING BULK SELECTION ACTION BAR ── */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 max-w-xl mx-auto z-50 bg-[#1A150E]/95 dark:bg-[#1A150E]/95 text-white backdrop-blur-md px-6 py-3.5 rounded-2xl shadow-2xl border border-primary/40 flex items-center justify-between animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center space-x-3">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold font-mono text-white">
              {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedUserIds([])}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/10 text-stone-300 hover:text-white transition cursor-pointer"
            >
              Deselect All
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-lg transition transform active:scale-95 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Hard Delete ({selectedUserIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 7: SINGLE USER HARD DELETE CONFIRMATION ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-destructive/40 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-destructive">
              <div className="h-10 w-10 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">Permanently Hard Delete User</h3>
                <p className="text-[11px] font-bold text-destructive uppercase tracking-wider">Irreversible Database Action</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-2.5 bg-surface p-4 rounded-2xl border border-border">
              <div>
                <span className="text-muted-foreground font-semibold">User:</span>{' '}
                <span className="font-extrabold text-foreground">{showDeleteModal.fullName}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Email:</span>{' '}
                <span className="font-mono text-foreground">{showDeleteModal.email}</span>
              </div>
              {showDeleteModal.employeeId && (
                <div>
                  <span className="text-muted-foreground font-semibold">Linked Employee ID:</span>{' '}
                  <span className="font-mono font-bold text-amber-500">{showDeleteModal.employeeId}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
              ⚠️ Warning: This is a permanent HARD DELETE. The user account, auth session tokens, database records, and RBAC matrix permissions will be permanently expunged.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-bold text-xs hover:bg-surface/80 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-black text-xs uppercase tracking-wider hover:bg-destructive/90 transition shadow-lg flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Confirm Hard Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 8: BULK HARD DELETE CONFIRMATION ── */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-destructive/40 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3 text-destructive">
              <div className="h-10 w-10 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-base font-black text-foreground">
                  Permanently Hard Delete ({selectedUserIds.length}) Users
                </h3>
                <p className="text-[11px] font-bold text-destructive uppercase tracking-wider">Batch Database Operation</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              You are about to permanently hard delete the following <span className="font-bold text-foreground">{selectedUserIds.length}</span> user accounts from the database:
            </p>

            {/* Selected Users List Preview */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-surface border border-border divide-y divide-border/40 text-xs no-scrollbar">
              {users
                .filter((u) => selectedUserIds.includes(u.id))
                .map((u) => (
                  <div key={u.id} className="pt-1.5 first:pt-0 flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-foreground">{u.fullName}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 font-mono">({u.email})</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground">
                      {u.role}
                    </span>
                  </div>
                ))}
            </div>

            <p className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
              ⚠️ This action cannot be undone. All active sessions, authentication tokens, and user database records will be permanently destroyed.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-bold text-xs hover:bg-surface/80 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkHardDelete}
                className="px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-black text-xs uppercase tracking-wider hover:bg-destructive/90 transition shadow-lg flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Hard Delete ({selectedUserIds.length}) Records</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT USER ROLE & MODULE ACCESS ── */}
      {showEditRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 text-foreground max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Edit User Access &amp; Permissions</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Assign canonical role and configure granular module &amp; menu access
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditRoleModal(null)}
                className="p-1.5 rounded-lg bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* User Target Card */}
            <div className="flex items-center space-x-3.5 p-3.5 rounded-2xl bg-surface border border-border flex-shrink-0">
              <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 text-primary font-black text-sm flex items-center justify-center flex-shrink-0">
                {showEditRoleModal.avatarUrl ? (
                  <img
                    src={showEditRoleModal.avatarUrl}
                    alt={showEditRoleModal.fullName}
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : (
                  showEditRoleModal.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-foreground text-sm truncate flex items-center space-x-2">
                  <span>{showEditRoleModal.fullName}</span>
                  <span className="text-muted-foreground text-xs font-normal">({showEditRoleModal.department})</span>
                </div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">
                  {showEditRoleModal.email}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Current Role</div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface border border-border text-foreground">
                  {showEditRoleModal.role?.toUpperCase() === 'OFFICER' || showEditRoleModal.role === 'Officer'
                    ? 'USER'
                    : showEditRoleModal.role}
                </span>
              </div>
            </div>

            {/* Tab Navigation (Role Assignment vs Module Access) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3 flex-shrink-0">
              <div className="flex items-center space-x-1.5 bg-surface p-1 rounded-2xl border border-border">
                <button
                  type="button"
                  onClick={() => setEditModalTab('role')}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    editModalTab === 'role'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Role Assignment</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalTab('modules')}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    editModalTab === 'modules'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Module &amp; Menu Access</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      editModalTab === 'modules'
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {allAvailableModules.length}
                  </span>
                </button>
              </div>

              <div className="text-[11px] font-semibold text-muted-foreground flex items-center space-x-2">
                {userCustomPermissions.includes('*') ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/30">
                    ★ SuperAdmin Master Access
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-surface border border-border text-foreground">
                    <strong className="text-primary font-black">{userCustomPermissions.length}</strong> active permissions
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleUpdateRole} className="flex-1 overflow-hidden flex flex-col min-h-0">
              {/* TAB 1: ROLE ASSIGNMENT */}
              {editModalTab === 'role' && (
                <div className="space-y-3 overflow-y-auto pr-1 no-scrollbar flex-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-muted-foreground">
                      Select Base Role Assignment:
                    </label>
                    <span className="text-[10px] text-muted-foreground italic">
                      Selecting a role loads its standard permissions into the Module Access tab.
                    </span>
                  </div>

                  <div className="space-y-2">
                    {availableRoles.map((roleItem) => {
                      const isSelected =
                        selectedNewRole === roleItem.key ||
                        normalizeRoleKey(selectedNewRole) === roleItem.key;

                      return (
                        <div
                          key={roleItem.key}
                          onClick={() => handleSelectRole(roleItem.key)}
                          className={`p-3 rounded-2xl border transition cursor-pointer flex items-start space-x-3 select-none ${
                            isSelected
                              ? 'bg-primary/10 border-primary/60 ring-1 ring-primary/40 shadow-sm'
                              : 'bg-surface/60 border-border hover:bg-surface hover:border-border/80'
                          }`}
                        >
                          <div className="pt-0.5">
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center transition ${
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40 bg-transparent'
                              }`}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-extrabold text-xs text-foreground">
                                {roleItem.name}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border"
                                style={{
                                  backgroundColor: `${roleItem.color}15`,
                                  color: roleItem.color,
                                  borderColor: `${roleItem.color}40`,
                                }}
                              >
                                {roleItem.key}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                              {roleItem.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: MODULE & MENU ACCESS */}
              {editModalTab === 'modules' && (
                <div className="space-y-3 overflow-y-auto pr-1 no-scrollbar flex-1 flex flex-col min-h-0">
                  {/* Search and Action Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-shrink-0">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={moduleSearchQuery}
                        onChange={(e) => setModuleSearchQuery(e.target.value)}
                        placeholder="Search system modules, department portals, or sub-menus..."
                        className="w-full h-9 pl-9 pr-3 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                      />
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleGrantAll}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[11px] hover:bg-emerald-500/20 transition cursor-pointer"
                      >
                        Grant All
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeAll}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold text-[11px] hover:bg-rose-500/20 transition cursor-pointer"
                      >
                        Revoke All
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToRoleDefaults}
                        className="px-2.5 py-1.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground font-bold text-[11px] transition flex items-center space-x-1 cursor-pointer"
                        title="Reset toggles to default permissions for current role"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Role Default</span>
                      </button>
                    </div>
                  </div>

                  {/* Modules List */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 no-scrollbar">
                    {allAvailableModules.filter((mod) => {
                      if (!moduleSearchQuery.trim()) return true;
                      const q = moduleSearchQuery.toLowerCase().trim();
                      if (mod.moduleName.toLowerCase().includes(q) || mod.description.toLowerCase().includes(q)) return true;
                      return mod.permissions.some(
                        (p) =>
                          p.name.toLowerCase().includes(q) ||
                          p.key.toLowerCase().includes(q) ||
                          p.description.toLowerCase().includes(q) ||
                          p.category.toLowerCase().includes(q) ||
                          p.actionType.toLowerCase().includes(q)
                      );
                    }).map((mod) => {
                      const IconComp = getModuleIconComponent(mod.iconName);
                      const isDeptModule = mod.moduleKey.startsWith('dept_');
                      const activePermsCount = mod.permissions.filter(
                        (p) =>
                          userCustomPermissions.includes(p.key) ||
                          userCustomPermissions.includes('*')
                      ).length;
                      const totalPermsCount = mod.permissions.length;
                      const isModuleOn =
                        activePermsCount > 0 || userCustomPermissions.includes('*');
                      const isExpanded =
                        expandedModules[mod.moduleKey] || moduleSearchQuery.trim().length > 0;

                      return (
                        <div
                          key={mod.moduleKey}
                          className={`rounded-2xl border transition-all ${
                            isModuleOn
                              ? 'bg-card border-border shadow-sm'
                              : 'bg-surface/50 border-border/60 opacity-85'
                          }`}
                        >
                          {/* Module Header Bar */}
                          <div
                            onClick={() => handleToggleExpandModule(mod.moduleKey)}
                            className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-surface/60 rounded-2xl transition"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div
                                className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                                  isModuleOn
                                    ? isDeptModule
                                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                      : 'bg-primary/15 text-primary border-primary/30'
                                    : 'bg-muted/40 text-muted-foreground border-border'
                                }`}
                              >
                                <IconComp className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <span className="font-extrabold text-xs text-foreground truncate">
                                    {mod.moduleName}
                                  </span>
                                  {isDeptModule && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                                      Department
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                      activePermsCount === totalPermsCount
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                        : activePermsCount > 0
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                        : 'bg-muted/30 text-muted-foreground border-border'
                                    }`}
                                  >
                                    {activePermsCount}/{totalPermsCount} Active
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate max-w-md">
                                  {mod.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 flex-shrink-0">
                              {/* Master Toggle Button */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleModule(mod);
                                }}
                                title={isModuleOn ? 'Disable entire module' : 'Enable entire module'}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isModuleOn
                                    ? isDeptModule
                                      ? 'bg-amber-500'
                                      : 'bg-primary'
                                    : 'bg-muted-foreground/30'
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    isModuleOn ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </div>

                              {/* Accordion Chevron */}
                              <div className="p-1 rounded-lg hover:bg-surface text-muted-foreground">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Inside Menus / Tabs Breakdown */}
                          {isExpanded && (
                            <div className="p-3 pt-0 border-t border-border/60 mt-1 space-y-1.5 animate-in fade-in duration-150">
                              <div className="text-[10px] uppercase font-bold text-muted-foreground px-1 pt-2 pb-1">
                                Sub-Menus &amp; Feature Permissions Breakdown
                              </div>
                              <div className="grid grid-cols-1 gap-1.5">
                                {mod.permissions.map((perm) => {
                                  const isPermOn =
                                    userCustomPermissions.includes(perm.key) ||
                                    userCustomPermissions.includes('*');

                                  return (
                                    <div
                                      key={perm.key}
                                      onClick={() => handleTogglePermission(perm.key)}
                                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition cursor-pointer select-none ${
                                        isPermOn
                                          ? 'bg-surface/90 border-border hover:bg-surface'
                                          : 'bg-surface/30 border-border/40 opacity-70 hover:opacity-100 hover:bg-surface/50'
                                      }`}
                                    >
                                      <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                          <span className="font-extrabold text-xs text-foreground">
                                            {perm.name}
                                          </span>
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                                            {perm.actionType}
                                          </span>
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-muted-foreground bg-surface border border-border">
                                            {perm.category}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                                          {perm.description}
                                        </p>
                                        <code className="text-[10px] text-muted-foreground/60 font-mono">
                                          {perm.key}
                                        </code>
                                      </div>

                                      {/* Sub-menu toggle switch */}
                                      <div
                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                          isPermOn ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                                        }`}
                                      >
                                        <span
                                          aria-hidden="true"
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            isPermOn ? 'translate-x-4' : 'translate-x-0'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border flex-shrink-0 mt-2">
                <div className="text-[11px] text-muted-foreground">
                  Changes take effect immediately across all modules in real time.
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEditRoleModal(null)}
                    className="px-4 py-2 rounded-xl bg-surface border border-border text-foreground font-bold text-xs hover:bg-surface/80 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRole}
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider hover:bg-brand-strong transition shadow-lg flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingRole ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving Access...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-3.5 w-3.5" />
                        <span>Save User Access</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EMPLOYEE > USER DARK GLASS MODAL ── */}
      <EmployeeToUserModal
        isOpen={showEmployeeToUserModal}
        onClose={() => setShowEmployeeToUserModal(false)}
        onUserCreated={() => {
          fetchUsers();
          setNotificationMsg('New user(s) provisioned and directory synchronized!');
        }}
      />
    </div>
  );
}
