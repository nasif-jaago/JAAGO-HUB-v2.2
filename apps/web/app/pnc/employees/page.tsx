'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  Plus,
  Search,
  RotateCw,
  Eye,
  X,
  UserPlus,
  Mail,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface EmployeeItem {
  id: string;
  name: string;
  code: string;
  email?: string | undefined;
  workingSchedule: string;
  department: string;
  designation: string;
  organization: string;
  joiningDate: string;
  confirmationDate: string;
  status: 'Active' | 'Inactive' | 'Terminated' | 'Resigned';
  isUser?: boolean | undefined;
  userId?: string | undefined;
}

const INITIAL_EMPLOYEES: EmployeeItem[] = [
  {
    id: 'emp-1',
    name: 'Abdul Aziz',
    code: 'GLSP08241107940',
    email: 'abdul.aziz@jaago.com.bd',
    workingSchedule: 'General 9 AM to 5 PM',
    department: 'Program Implementation',
    designation: 'Security Guard',
    organization: 'JAAGO Foundation Trust',
    joiningDate: '2024-05-12',
    confirmationDate: '2024-05-12',
    status: 'Active',
    isUser: false,
  },
  {
    id: 'emp-2',
    name: 'Abdul Mazid',
    code: 'ADM011420100045',
    email: 'abdul.mazid@jaago.com.bd',
    workingSchedule: 'General 9 AM to 5 PM',
    department: 'Digital School Program',
    designation: 'Manager',
    organization: 'JAAGO Foundation',
    joiningDate: '—',
    confirmationDate: '—',
    status: 'Active',
    isUser: false,
  },
  {
    id: 'emp-3',
    name: 'Abdullah Al Imran',
    code: 'DC082224020391',
    email: 'abdullah.imran@jaago.com.bd',
    workingSchedule: 'General Schedule (10:00 AM - 6:00 PM)',
    department: 'Communications',
    designation: 'Assistant Manager',
    organization: 'JAAGO Foundation',
    joiningDate: '2022-08-16',
    confirmationDate: '2022-08-16',
    status: 'Active',
    isUser: false,
  },
  {
    id: 'emp-4',
    name: 'Abdullah Al Yousuf',
    code: 'EMK2025154',
    email: 'abdullah.yousuf@emkcenter.org',
    workingSchedule: 'General Schedule (10:00 AM - 6:00 PM)',
    department: 'EMK Center',
    designation: 'Program Officer',
    organization: 'JAAGO Foundation',
    joiningDate: '2025-02-24',
    confirmationDate: '2025-02-16',
    status: 'Active',
    isUser: false,
  },
  {
    id: 'emp-5',
    name: 'Abdullah Bin Alam Opi',
    code: 'BBN012501011128',
    email: 'abdullah.opi@jaago.com.bd',
    workingSchedule: '—',
    department: 'Digital School Program',
    designation: 'Program Executive',
    organization: 'JAAGO Foundation',
    joiningDate: '—',
    confirmationDate: '—',
    status: 'Active',
    isUser: false,
  },
  {
    id: 'emp-6',
    name: 'Abdur Rahim',
    code: 'FMDC072501011307',
    email: 'po13.cmdc@jaago.com.bd',
    workingSchedule: 'General 9 AM to 5 PM',
    department: 'Program Implementation',
    designation: 'Field Officer',
    organization: 'JAAGO Foundation Trust',
    joiningDate: '2024-05-12',
    confirmationDate: '2024-05-12',
    status: 'Active',
    isUser: false,
  },
  {
    id: 'emp-7',
    name: 'Abdur Rahman',
    code: 'TEK012501011133',
    email: 'abdur.rahman2@jaago.com.bd',
    workingSchedule: '—',
    department: 'Digital School Program',
    designation: 'Digital Instructor',
    organization: 'JAAGO Foundation',
    joiningDate: '—',
    confirmationDate: '—',
    status: 'Active',
    isUser: false,
  },
  {
    id: 'emp-8',
    name: 'Abdur Rahman Helal',
    code: 'DC011912120014',
    email: 'abdur.rahman@jaago.com.bd',
    workingSchedule: 'General Schedule (10:00 AM - 6:00 PM)',
    department: 'Communications',
    designation: 'Assistant Manager',
    organization: 'JAAGO Foundation',
    joiningDate: '2019-01-02',
    confirmationDate: '2025-01-01',
    status: 'Active',
    isUser: false,
  },
];

export default function PnCEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>(INITIAL_EMPLOYEES);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'RESIGNED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDept, setNewDept] = useState('Program Implementation');
  const [newDesignation, setNewDesignation] = useState('Program Officer');
  const [newOrg, setNewOrg] = useState('JAAGO Foundation');
  const [linkedUserId, setLinkedUserId] = useState<string | null>(null);

  // Invite Success Modal State
  const [showInviteSuccessModal, setShowInviteSuccessModal] = useState<{
    employee: EmployeeItem;
    emailPayload: {
      to: string;
      userId: string;
      tempPassword: string;
      loginUrl: string;
      sentAt: string;
    };
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Handle URL query params (e.g. redirected from User Management with pre-filled data)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new' || params.get('name')) {
        const nameParam = params.get('name') || '';
        const emailParam = params.get('email') || '';
        const deptParam = params.get('department') || params.get('dept') || 'Program Implementation';
        const desigParam = params.get('designation') || params.get('desig') || 'Program Officer';
        const uId = params.get('userId') || null;

        if (nameParam) setNewName(nameParam);
        if (emailParam) setNewEmail(emailParam);
        if (deptParam) setNewDept(deptParam);
        if (desigParam) setNewDesignation(desigParam);
        if (uId) setLinkedUserId(uId);

        setShowAddModal(true);
      }
    }
  }, []);

  const filtered = employees.filter((emp) => {
    if (activeTab === 'ACTIVE' && emp.status !== 'Active') return false;
    if (activeTab === 'INACTIVE' && emp.status !== 'Inactive') return false;
    if (activeTab === 'TERMINATED' && emp.status !== 'Terminated') return false;
    if (activeTab === 'RESIGNED' && emp.status !== 'Resigned') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = emp.name.toLowerCase().includes(q);
      const matchCode = emp.code.toLowerCase().includes(q);
      const matchEmail = emp.email?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchEmail) return false;
    }

    if (selectedDept && emp.department !== selectedDept) return false;
    return true;
  });

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItemCode = `JFT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newItem: EmployeeItem = {
      id: `emp-${Date.now()}`,
      name: newName,
      code: newItemCode,
      email: newEmail || undefined,
      workingSchedule: 'General Schedule (10:00 AM - 6:00 PM)',
      department: newDept,
      designation: newDesignation,
      organization: newOrg,
      joiningDate: new Date().toISOString().slice(0, 10),
      confirmationDate: '—',
      status: 'Active',
      isUser: Boolean(linkedUserId),
      userId: linkedUserId || undefined,
    };

    // If linked to an existing user, update the user in the database
    if (linkedUserId) {
      try {
        await fetch('/api/v1/users/link-employee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: linkedUserId, employeeCode: newItemCode }),
        });
      } catch (err) {
        console.error('Failed to link user:', err);
      }
    }

    setEmployees([newItem, ...employees]);
    setShowAddModal(false);
    setNewName('');
    setNewEmail('');
    setLinkedUserId(null);
  };

  // Create User Account from Employee and send Invite Email
  const handleCreateUserForEmployee = async (emp: EmployeeItem) => {
    try {
      const emailToUse = emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '.')}@jaago.com.bd`;
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
        // Automatically hide the Create User button by marking isUser = true
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === emp.id ? { ...e, isUser: true, email: emailToUse, userId: data.data.user.id } : e
          )
        );
        setShowInviteSuccessModal({
          employee: emp,
          emailPayload: data.data.emailPayload,
        });
      } else {
        alert(data.error || 'Failed to create user account');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Employee Name', 'Code', 'Email', 'Department', 'Designation', 'Organization', 'Joining Date', 'Status'];
    const rows = employees.map((e) => [
      `"${e.name}"`,
      `"${e.code}"`,
      `"${e.email || ''}"`,
      `"${e.department}"`,
      `"${e.designation}"`,
      `"${e.organization}"`,
      `"${e.joiningDate}"`,
      `"${e.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `jaago_employees_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 select-none">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-foreground">
            Employee List
          </h1>
          <p className="text-xs font-semibold text-muted-foreground pt-1">
            742 employees total
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
            onClick={() => {
              setNewName('');
              setNewEmail('');
              setNewDept('Program Implementation');
              setNewDesignation('Program Officer');
              setLinkedUserId(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold transition flex items-center space-x-2 shadow-md cursor-pointer"
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

      {/* ── 2. STATUS TABS ── */}
      <div className="flex items-center space-x-6 border-b border-border/60 text-xs font-extrabold tracking-wider text-muted-foreground">
        {(['ALL', 'ACTIVE', 'INACTIVE', 'TERMINATED', 'RESIGNED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 transition relative cursor-pointer ${
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
            placeholder="Search by name, email, or ID..."
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
            <option value="EMK Center">EMK Center</option>
          </select>
        </div>

        <div>
          <select className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer">
            <option value="">Organization (All)</option>
            <option value="JAAGO Foundation">JAAGO Foundation</option>
            <option value="JAAGO Foundation Trust">JAAGO Foundation Trust</option>
          </select>
        </div>

        <div>
          <select className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer">
            <option value="">Branch (All)</option>
            <option value="Head Office">Head Office (Banani)</option>
            <option value="Rayer Bazar">Rayer Bazar</option>
            <option value="Chittagong">Chittagong</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <select className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer">
            <option value="">Designation (All)</option>
            <option value="Manager">Manager</option>
            <option value="Assistant Manager">Assistant Manager</option>
            <option value="Program Officer">Program Officer</option>
            <option value="Security Guard">Security Guard</option>
          </select>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDept('');
            }}
            className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground transition cursor-pointer flex-shrink-0"
            title="Reset Filters"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── 4. EMPLOYEE DATA TABLE ── */}
      <div className="rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground bg-surface/40">
                <th className="py-3.5 px-4 w-8">
                  <input type="checkbox" className="rounded accent-amber-500 cursor-pointer" />
                </th>
                <th className="py-3.5 px-4">EMPLOYEE</th>
                <th className="py-3.5 px-4">WORKING SCHEDULE</th>
                <th className="py-3.5 px-4">DEPARTMENT</th>
                <th className="py-3.5 px-4">DESIGNATION</th>
                <th className="py-3.5 px-4">ORGANIZATION</th>
                <th className="py-3.5 px-4">JOINING DATE</th>
                <th className="py-3.5 px-4">CONFIRMATION DATE</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.map((emp) => {
                const initials = emp.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr key={emp.id} className="hover:bg-surface/50 transition">
                    <td className="py-3.5 px-4">
                      <input type="checkbox" className="rounded accent-amber-500 cursor-pointer" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-[#26180E] text-primary flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-extrabold text-foreground">{emp.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            ID: {emp.code}
                          </div>
                          {emp.email && (
                            <div className="text-[10px] text-muted-foreground/80">{emp.email}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {emp.workingSchedule}
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-semibold">
                      {emp.department}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {emp.designation}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-medium">
                      {emp.organization}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                      {emp.joiningDate}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                      {emp.confirmationDate}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* If NOT a user, show Create User button */}
                        {!emp.isUser ? (
                          <button
                            onClick={() => handleCreateUserForEmployee(emp)}
                            className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-[11px] flex items-center space-x-1.5 transition shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
                            title="Create JAAGO HUB User Account & Send Invite Email"
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
                          className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
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

      {/* ── 5. NEW EMPLOYEE MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-extrabold text-foreground">Add New Employee</h2>
                {linkedUserId && (
                  <p className="text-[11px] font-bold text-amber-500">
                    🔗 Linked to User Account: {linkedUserId}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setLinkedUserId(null);
                }}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Masoor Rahman"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Work Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="masoor.rahman@jaago.com.bd"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Department</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Designation</label>
                  <input
                    type="text"
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Organization</label>
                <select
                  value={newOrg}
                  onChange={(e) => setNewOrg(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground font-semibold"
                >
                  <option value="JAAGO Foundation">JAAGO Foundation</option>
                  <option value="JAAGO Foundation Trust">JAAGO Foundation Trust</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setLinkedUserId(null);
                  }}
                  className="px-4 py-2 rounded-xl text-muted-foreground hover:bg-surface font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md cursor-pointer"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. IMPORT CSV MODAL ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-extrabold text-foreground">Import Employee CSV</h2>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary text-center space-y-2 cursor-pointer bg-surface/50">
              <Upload className="h-8 w-8 text-primary mx-auto" />
              <div className="text-xs font-bold text-foreground">Click to upload CSV or drag &amp; drop</div>
              <div className="text-[10px] text-muted-foreground font-mono">Maximum 5,000 records per batch</div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <a
                href="/demo_users_import_template.csv"
                download
                className="text-primary hover:underline font-bold"
              >
                Download Demo Template
              </a>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  alert('Batch import completed: 8 new employee records synchronized!');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold cursor-pointer"
              >
                Process File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. INVITE EMAIL DISPATCHED MODAL ── */}
      {showInviteSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-amber-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-foreground">Invitation Email Sent!</h2>
                <p className="text-[11px] font-bold text-emerald-500 flex items-center space-x-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>JAAGO HUB User Account Provisioned</span>
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              An invitation email with access credentials has been dispatched to{' '}
              <span className="font-extrabold text-foreground">{showInviteSuccessModal.emailPayload.to}</span>.
            </div>

            {/* Credential Details Card */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-sans font-bold">User ID (Login):</span>
                <span className="font-bold text-foreground">{showInviteSuccessModal.emailPayload.userId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-sans font-bold">Auto Password:</span>
                <span className="font-black text-amber-500 tracking-wider">
                  {showInviteSuccessModal.emailPayload.tempPassword}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className="text-muted-foreground font-sans font-bold">Login Portal:</span>
                <a
                  href="/login"
                  target="_blank"
                  className="text-primary hover:underline flex items-center space-x-1 font-sans text-[11px] font-bold"
                >
                  <span>/login</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-center font-medium">
              ✨ The user account is now active and the <span className="font-bold text-foreground">&quot;Create User&quot;</span> button for this employee is automatically hidden.
            </p>

            <div className="pt-2 flex items-center space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `JAAGO HUB Credentials\nLogin: ${showInviteSuccessModal.emailPayload.userId}\nPassword: ${showInviteSuccessModal.emailPayload.tempPassword}\nPortal: ${showInviteSuccessModal.emailPayload.loginUrl}`
                  );
                  setCopiedPass(true);
                  setTimeout(() => setCopiedPass(false), 2000);
                }}
                className="flex-1 py-2.5 rounded-xl bg-surface border border-border text-foreground hover:border-primary/50 font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                {copiedPass ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                <span>{copiedPass ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>
              <button
                onClick={() => setShowInviteSuccessModal(null)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
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
