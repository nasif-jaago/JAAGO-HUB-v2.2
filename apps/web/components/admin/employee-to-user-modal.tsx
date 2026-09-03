'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Users,
  Send,
  RotateCw,
  Mail,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export interface UnlinkedEmployeeItem {
  id: string;
  code: string;
  name: string;
  work_email?: string;
  personal_email?: string;
  designation?: string;
  department?: string;
  organization?: string;
  branch?: string;
  avatar_url?: string;
  status?: string;
}

export interface InviteLogItem {
  id: string;
  toAddress: string;
  subjectRendered: string;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'deferred' | 'bounced';
  errorReason?: string;
  attemptCount: number;
  providerMessageId?: string;
  queuedAt: string;
  completedAt?: string;
  variablesUsed?: {
    employeeName?: string;
    employeeCode?: string;
    designation?: string;
    department?: string;
    workEmail?: string;
    tempPassword?: string;
  };
}

interface EmployeeToUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: () => void;
}

export function EmployeeToUserModal({ isOpen, onClose, onUserCreated }: EmployeeToUserModalProps) {
  const [activeTab, setActiveTab] = useState<'employees' | 'logs'>('employees');

  // Employees State
  const [employees, setEmployees] = useState<UnlinkedEmployeeItem[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmpCodes, setSelectedEmpCodes] = useState<string[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [sendingSingleCode, setSendingSingleCode] = useState<string | null>(null);

  // Filter options dynamically populated from unlinked employees
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // Logs State
  const [logs, setLogs] = useState<InviteLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Toast / Status banner
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showBanner = (type: 'success' | 'error' | 'info', message: string) => {
    setBanner({ type, message });
    setTimeout(() => {
      setBanner(null);
    }, 5000);
  };

  // ── 1. Fetch Non-User Employees from People & Culture ──
  const fetchUnlinkedEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const res = await fetch('/api/v1/users/unlinked-employees', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEmployees(json.data);
        if (json.organizations) setOrganizations(json.organizations);
        if (json.departments) setDepartments(json.departments);
      }
    } catch (err: any) {
      showBanner('error', `Failed to load employees: ${err?.message}`);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // ── 2. Fetch Invitation Logs from Supabase email_logs ──
  const fetchInviteLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/v1/users/invite-logs', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data);
      }
    } catch (err: any) {
      console.warn('Failed to load invite logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUnlinkedEmployees();
      fetchInviteLogs();
      setSelectedEmpCodes([]);
      setBanner(null);
    }
  }, [isOpen]);

  // ── Filtered Employees ──
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedOrg && selectedOrg !== 'all') {
        if ((emp.organization || '').toLowerCase().trim() !== selectedOrg.toLowerCase().trim()) {
          return false;
        }
      }
      if (selectedDept && selectedDept !== 'all') {
        if ((emp.department || '').toLowerCase().trim() !== selectedDept.toLowerCase().trim()) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchCode = (emp.code || '').toLowerCase().includes(q);
        const matchEmail = (emp.work_email || '').toLowerCase().includes(q);
        const matchDesig = (emp.designation || '').toLowerCase().includes(q);
        return matchName || matchCode || matchEmail || matchDesig;
      }
      return true;
    });
  }, [employees, selectedOrg, selectedDept, searchQuery]);

  // ── Filtered Logs ──
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (logStatusFilter !== 'all' && l.status !== logStatusFilter) return false;
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase().trim();
        const matchEmail = l.toAddress.toLowerCase().includes(q);
        const matchSubject = (l.subjectRendered || '').toLowerCase().includes(q);
        const matchName = (l.variablesUsed?.employeeName || '').toLowerCase().includes(q);
        return matchEmail || matchSubject || matchName;
      }
      return true;
    });
  }, [logs, logStatusFilter, logSearchQuery]);

  // ── 3. Single Send Invite Handler ──
  const handleSendSingleInvite = async (emp: UnlinkedEmployeeItem) => {
    setSendingSingleCode(emp.code);
    try {
      const res = await fetch('/api/v1/users/bulk-create-from-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: [
            {
              id: emp.id,
              name: emp.name,
              code: emp.code,
              workEmail: emp.work_email,
              personalEmail: emp.personal_email,
              department: emp.department,
              designation: emp.designation,
              organization: emp.organization,
              branch: emp.branch,
            },
          ],
        }),
      });

      const json = await res.json();
      if (json.success && json.successful > 0) {
        showBanner('success', `Official invite dispatched to ${emp.name} (${emp.work_email || 'work email'})!`);
        // Remove from unlinked list
        setEmployees((prev) => prev.filter((e) => e.code !== emp.code));
        setSelectedEmpCodes((prev) => prev.filter((c) => c !== emp.code));
        fetchInviteLogs();
        if (onUserCreated) onUserCreated();
      } else {
        showBanner('error', json.error || json.results?.[0]?.error || 'Failed to dispatch invite');
      }
    } catch (err: any) {
      showBanner('error', `Error dispatching invite: ${err?.message}`);
    } finally {
      setSendingSingleCode(null);
    }
  };

  // ── 4. Bulk Send Invites Handler ──
  const handleSendBulkInvites = async () => {
    if (selectedEmpCodes.length === 0) return;
    const selectedEmps = employees.filter((e) => selectedEmpCodes.includes(e.code));
    if (selectedEmps.length === 0) return;

    setIsBulkSending(true);
    try {
      const res = await fetch('/api/v1/users/bulk-create-from-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employees: selectedEmps.map((emp) => ({
            id: emp.id,
            name: emp.name,
            code: emp.code,
            workEmail: emp.work_email,
            personalEmail: emp.personal_email,
            department: emp.department,
            designation: emp.designation,
            organization: emp.organization,
            branch: emp.branch,
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        showBanner(
          'success',
          `Successfully provisioned & sent invites to ${json.successful} employee(s)${
            json.failed > 0 ? ` (${json.failed} failed)` : ''
          }!`
        );
        const successfulCodes = new Set(
          json.results.filter((r: any) => r.success).map((r: any) => r.code)
        );
        setEmployees((prev) => prev.filter((e) => !successfulCodes.has(e.code)));
        setSelectedEmpCodes([]);
        fetchInviteLogs();
        if (onUserCreated) onUserCreated();
      } else {
        showBanner('error', json.error || 'Failed to process bulk invites');
      }
    } catch (err: any) {
      showBanner('error', `Bulk invite failed: ${err?.message}`);
    } finally {
      setIsBulkSending(false);
    }
  };

  // ── 5. Retry Invite Handler ──
  const handleRetryLog = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await fetch(`/api/v1/admin/email/logs/${logId}/retry`, {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        showBanner('success', 'Invitation email retried successfully!');
        fetchInviteLogs();
      } else {
        showBanner('error', json.message || 'Retry failed');
      }
    } catch (err: any) {
      showBanner('error', `Retry failed: ${err?.message}`);
    } finally {
      setRetryingLogId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0b0f19] border border-amber-500/30 rounded-3xl shadow-2xl shadow-black/80 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden backdrop-blur-2xl text-slate-100 animate-in zoom-in-95 duration-200">
        {/* ── MODAL HEADER ── */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-[#0f172a]/90 to-slate-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-inner">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Convert Employees &rarr; System Users</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-extrabold">
                  {employees.length} Available
                </span>
              </div>
              <p className="text-xs text-slate-400 pt-0.5">
                Provision Supabase Auth user accounts &amp; send official welcome invites to People &amp; Culture employee work emails
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700/50"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── BANNER / TOAST ── */}
        {banner && (
          <div
            className={`px-5 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
              banner.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : banner.type === 'error'
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            <div className="flex items-center space-x-2">
              {banner.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : banner.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-rose-400" />
              ) : (
                <Sparkles className="h-4 w-4 text-amber-400" />
              )}
              <span>{banner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* ── NAVIGATION TABS ── */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/40 justify-between">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('employees')}
              className={`py-3 px-4 text-xs font-extrabold flex items-center space-x-2 border-b-2 transition cursor-pointer ${
                activeTab === 'employees'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Available Employees</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                {filteredEmployees.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('logs');
                fetchInviteLogs();
              }}
              className={`py-3 px-4 text-xs font-extrabold flex items-center space-x-2 border-b-2 transition cursor-pointer ${
                activeTab === 'logs'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="h-4 w-4" />
              <span>Invitation Logs</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                {logs.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchUnlinkedEmployees();
              fetchInviteLogs();
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700/50"
            title="Refresh data"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoadingEmployees || isLoadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ── TAB 1: AVAILABLE EMPLOYEES ── */}
        {activeTab === 'employees' && (
          <div className="flex-1 flex flex-col overflow-hidden p-5 sm:p-6 space-y-4">
            {/* Filter Bar: Search, Organization, Department */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, code, email, designation..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>

              {/* Organization Filter */}
              <div className="relative">
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Organization (All)</option>
                  {organizations.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="relative">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                >
                  <option value="">Department (All)</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selection Toolbar */}
            <div className="p-3 px-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEmpCodes.length === filteredEmployees.length) {
                      setSelectedEmpCodes([]);
                    } else {
                      setSelectedEmpCodes(filteredEmployees.map((e) => e.code));
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer text-[11px]"
                >
                  {selectedEmpCodes.length === filteredEmployees.length && filteredEmployees.length > 0
                    ? 'Deselect All'
                    : 'Select All Filtered'}
                </button>
                <span className="text-slate-400 font-semibold">
                  <strong className="text-amber-400">{selectedEmpCodes.length}</strong> selected of {filteredEmployees.length} available
                </span>
              </div>

              {/* Batch Send Button */}
              <button
                type="button"
                disabled={selectedEmpCodes.length === 0 || isBulkSending}
                onClick={handleSendBulkInvites}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isBulkSending ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>Sending Invites...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 fill-current" />
                    <span>Send Invite to Selected ({selectedEmpCodes.length})</span>
                  </>
                )}
              </button>
            </div>

            {/* Employee Table */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-900/30">
              {isLoadingEmployees ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                  <RotateCw className="h-6 w-6 text-amber-500 animate-spin" />
                  <span className="text-xs font-semibold">Loading non-user employees from People &amp; Culture...</span>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
                  <span className="text-sm font-bold text-slate-200">No Non-User Employees Found</span>
                  <span className="text-xs text-slate-500">
                    All employees matching the filter are already active system users in Supabase Auth.
                  </span>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#0c101b] border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-3 px-4 w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredEmployees.length > 0 &&
                            filteredEmployees.every((e) => selectedEmpCodes.includes(e.code))
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEmpCodes(filteredEmployees.map((f) => f.code));
                            } else {
                              setSelectedEmpCodes([]);
                            }
                          }}
                          className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                        />
                      </th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Staff ID</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Department &amp; Org</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredEmployees.map((emp) => {
                      const isSelected = selectedEmpCodes.includes(emp.code);
                      const isSending = sendingSingleCode === emp.code;
                      const initials = emp.name
                        ? emp.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()
                        : 'EM';

                      return (
                        <tr
                          key={emp.code || emp.id}
                          className={`transition ${
                            isSelected ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedEmpCodes((prev) =>
                                  prev.includes(emp.code) ? prev.filter((c) => c !== emp.code) : [...prev, emp.code]
                                );
                              }}
                              className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-white text-xs">{emp.name}</div>
                                <div className="text-[11px] text-cyan-400 font-mono flex items-center space-x-1">
                                  <Mail className="h-3 w-3 inline text-slate-500" />
                                  <span>{emp.work_email || `${emp.code.toLowerCase()}@jaago.com.bd`}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] font-bold">
                              {emp.code}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-medium">
                            {emp.designation || 'Staff Member'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-300 text-xs">{emp.department || 'General'}</div>
                            <div className="text-[10px] text-slate-500">{emp.organization || 'JAAGO Foundation'}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              disabled={isSending || isBulkSending}
                              onClick={() => handleSendSingleInvite(emp)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 font-bold text-xs transition cursor-pointer flex items-center space-x-1.5 ml-auto shadow-sm active:scale-95 disabled:opacity-50"
                              title="Provision user and send welcome invite email"
                            >
                              {isSending ? (
                                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Mail className="h-3.5 w-3.5" />
                              )}
                              <span>Send Invite</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: INVITATION LOGS & AUDIT ── */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col overflow-hidden p-5 sm:p-6 space-y-4">
            {/* Logs Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                {['all', 'sent', 'failed', 'queued'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setLogStatusFilter(status)}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                      logStatusFilter === status
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Search logs by email or name..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Logs Table */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-900/30">
              {isLoadingLogs ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
                  <RotateCw className="h-6 w-6 text-amber-500 animate-spin" />
                  <span className="text-xs font-semibold">Loading invitation logs from Supabase...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <Mail className="h-8 w-8 text-slate-600" />
                  <span className="text-sm font-bold text-slate-300">No Invitation Logs Recorded</span>
                  <span className="text-xs text-slate-500">
                    Dispatched employee invites will appear here with delivery receipts and retry capabilities.
                  </span>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#0c101b] border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-3 px-4">Recipient / Employee</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Attempt / Queued At</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredLogs.map((log) => {
                      const isRetrying = retryingLogId === log.id;
                      const empName = log.variablesUsed?.employeeName || log.toAddress.split('@')[0];

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-xs">{empName}</div>
                            <div className="text-[11px] text-cyan-400 font-mono">{log.toAddress}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.subjectRendered}>
                            {log.subjectRendered}
                          </td>
                          <td className="py-3 px-4">
                            {log.status === 'sent' ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10px] uppercase">
                                ● Sent
                              </span>
                            ) : log.status === 'failed' ? (
                              <span
                                className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-extrabold text-[10px] uppercase"
                                title={log.errorReason || 'Transmission failed'}
                              >
                                ● Failed
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] uppercase">
                                ● {log.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            <div>{new Date(log.queuedAt).toLocaleString()}</div>
                            <div className="text-[10px] text-slate-600">Attempt #{log.attemptCount}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {log.status === 'failed' && (
                              <button
                                type="button"
                                disabled={isRetrying}
                                onClick={() => handleRetryLog(log.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 border border-rose-500/40 font-bold text-[11px] transition cursor-pointer flex items-center space-x-1 ml-auto shadow-sm active:scale-95 disabled:opacity-50"
                                title="Retry delivery"
                              >
                                <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
                                <span>Retry</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL FOOTER ── */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            <span>Encrypted Outbound Pipeline &bull; Template: <code>pnc.employee_welcome</code></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
