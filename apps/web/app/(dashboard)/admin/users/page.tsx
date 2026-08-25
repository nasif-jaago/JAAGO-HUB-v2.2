'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Upload,
  Download,
  Search,
  MoreVertical,
  Key,
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
} from 'lucide-react';

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  role: string;
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

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateEmployeeModal, setShowCreateEmployeeModal] = useState<UserRecord | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<{ user: UserRecord; tempPass: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<UserRecord | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

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

      const res = await fetch(`/api/v1/users?${params.toString()}`);
      const data = await res.json();
      if (data.data) {
        setUsers(data.data);
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
        showToast(`Access revoked for ${user.fullName}.`);
      } else {
        alert(data.error || 'Revoke failed');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // ── 9. SINGLE HARD DELETE USER ──
  const handleDeleteUser = async () => {
    if (!showDeleteModal) return;
    try {
      const res = await fetch(`/api/v1/users/${showDeleteModal.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== showDeleteModal.id));
        setSelectedUserIds((prev) => prev.filter((id) => id !== showDeleteModal.id));
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
            <span>User Management &amp; Directory</span>
          </h1>
          <p className="text-xs text-muted-foreground pt-1">
            Provision system accounts, batch invite employees, manage RBAC privileges, and link users to HR payroll profiles.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-brand-strong font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground hover:border-primary/50 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Mail className="h-4 w-4 text-primary" />
            <span>Invite</span>
          </button>

          <button
            onClick={() => setShowBulkInviteModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground hover:border-primary/50 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Send className="h-4 w-4 text-amber-500" />
            <span>Bulk Invite</span>
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
            <option value="Super Admin">Super Admin</option>
            <option value="Manager">Manager</option>
            <option value="Coordinator">Coordinator</option>
            <option value="Officer">Officer</option>
            <option value="Staff">Staff</option>
            <option value="Intern">Intern</option>
            <option value="Volunteer">Volunteer</option>
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
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            user.role === 'Super Admin'
                              ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                              : user.role === 'Manager'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : user.role === 'Coordinator'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : user.role === 'Officer'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-surface text-muted-foreground border border-border'
                          }`}
                        >
                          {user.role}
                        </span>
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
                              className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-primary transition"
                              title="Create Employee Profile"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Quick Reset Password */}
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-amber-500 transition"
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
                    <option value="Super Admin">Super Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="Officer">Officer</option>
                    <option value="Staff">Staff</option>
                    <option value="Intern">Intern</option>
                    <option value="Volunteer">Volunteer</option>
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
                    <option value="Staff">Staff</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="Officer">Officer</option>
                    <option value="Manager">Manager</option>
                    <option value="Intern">Intern</option>
                    <option value="Volunteer">Volunteer</option>
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
                    <option value="Staff">Staff</option>
                    <option value="Officer">Officer</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="Intern">Intern</option>
                    <option value="Volunteer">Volunteer</option>
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
    </div>
  );
}
