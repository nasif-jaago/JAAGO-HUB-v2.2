'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  MapPin,
  Clock,
  Car,
  UserCheck,
} from 'lucide-react';
import {
  OnDutyLogItem,
  getLocalOnDutyLogs,
  saveLocalOnDutyLogs,
} from '@/lib/supabase-attendance';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';
import { useOrganizationScope, matchesSelectedOrg, matchesSelectedDept } from '@/lib/use-organization-scope';

export default function OnDutyLogsPage() {
  const { selectedOrg, selectedDept } = useOrganizationScope();
  const [logs, setLogs] = useState<OnDutyLogItem[]>([]);
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<OnDutyLogItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<OnDutyLogItem, 'id' | 'appliedDate'>>({
    employeeId: '',
    employeeCode: '',
    employeeName: '',
    designation: '',
    department: '',
    branch: '',
    purpose: '',
    destination: '',
    dutyDate: new Date().toISOString().slice(0, 10),
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    transportType: 'Office Vehicle',
    status: 'Approved',
    approverName: 'Korvi Rakshand (Founder & ED)',
    notes: '',
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const loaded = getLocalOnDutyLogs();
    setLogs(loaded);

    fetchEmployeesFromSupabase().then((emps) => {
      if (emps && emps.length > 0) {
        setEmployees(emps);
      }
    });
  }, []);

  const handleOpenAddModal = () => {
    setEditingLog(null);
    const defaultEmp = employees[0] || {
      id: 'emp-nasif',
      code: 'FO032507061190',
      name: 'Nasif Kamal',
      designation: 'Coordinator, Tech 4 Development',
      department: "Founder's Office (JFT)",
      branch: 'Head Office (Banani)',
    };
    setFormData({
      employeeId: defaultEmp.id,
      employeeCode: defaultEmp.code,
      employeeName: defaultEmp.name,
      designation: defaultEmp.designation,
      department: defaultEmp.department,
      branch: defaultEmp.branch,
      purpose: '',
      destination: '',
      dutyDate: new Date().toISOString().slice(0, 10),
      startTime: '09:00 AM',
      endTime: '05:00 PM',
      transportType: 'Office Vehicle',
      status: 'Approved',
      approverName: 'Korvi Rakshand (Founder & ED)',
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (log: OnDutyLogItem) => {
    setEditingLog(log);
    setFormData({
      employeeId: log.employeeId,
      employeeCode: log.employeeCode,
      employeeName: log.employeeName,
      designation: log.designation,
      department: log.department,
      branch: log.branch,
      purpose: log.purpose,
      destination: log.destination,
      dutyDate: log.dutyDate,
      startTime: log.startTime,
      endTime: log.endTime,
      transportType: log.transportType,
      status: log.status,
      approverName: log.approverName,
      notes: log.notes || '',
    });
    setShowModal(true);
  };

  const handleEmployeeSelectInForm = (empCode: string) => {
    const emp = employees.find((e) => e.code === empCode);
    if (emp) {
      setFormData((prev) => ({
        ...prev,
        employeeId: emp.id,
        employeeCode: emp.code,
        employeeName: emp.name,
        designation: emp.designation,
        department: emp.department,
        branch: emp.branch,
      }));
    }
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeName) {
      showToast('Please select an employee', 'error');
      return;
    }
    if (!formData.purpose || !formData.destination) {
      showToast('Purpose and Destination are required', 'error');
      return;
    }

    let updated: OnDutyLogItem[];
    if (editingLog) {
      updated = logs.map((l) =>
        l.id === editingLog.id
          ? {
              ...l,
              ...formData,
            }
          : l
      );
      showToast(`On Duty record for ${formData.employeeName} updated!`);
    } else {
      const newLog: OnDutyLogItem = {
        id: `onduty-${Date.now()}`,
        ...formData,
        appliedDate: new Date().toISOString().slice(0, 10),
      };
      updated = [newLog, ...logs];
      showToast(`New On Duty registered for ${formData.employeeName}!`);
    }

    setLogs(updated);
    saveLocalOnDutyLogs(updated);
    setShowModal(false);
  };

  const handleStatusChange = (id: string, newStatus: OnDutyLogItem['status']) => {
    const updated = logs.map((l) =>
      l.id === id ? { ...l, status: newStatus } : l
    );
    setLogs(updated);
    saveLocalOnDutyLogs(updated);
    showToast(`Status updated to ${newStatus}`);
  };

  const handleDeleteRecord = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete On Duty log for ${name}?`)) {
      const updated = logs.filter((l) => l.id !== id);
      setLogs(updated);
      saveLocalOnDutyLogs(updated);
      showToast(`Record for ${name} removed.`);
    }
  };

  const empCodeToOrg = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => {
      if (e.code) map.set(e.code, e.organization || '');
    });
    return map;
  }, [employees]);

  // Filter computation
  const filteredLogs = logs.filter((log) => {
    if (selectedOrg && selectedOrg !== 'ALL') {
      const org = empCodeToOrg.get(log.employeeCode);
      if (!matchesSelectedOrg(org, selectedOrg)) return false;
    }

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.employeeName.toLowerCase().includes(q) ||
      log.employeeCode.toLowerCase().includes(q) ||
      log.designation.toLowerCase().includes(q) ||
      log.department.toLowerCase().includes(q) ||
      log.purpose.toLowerCase().includes(q) ||
      log.destination.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'All Status' || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold transition transform animate-in slide-in-from-top ${
            toast.type === 'error'
              ? 'bg-rose-500 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            On Duty Logs
          </h1>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground mt-1">
            <span>Dashboard</span>
            <span>&bull;</span>
            <span>Attendance</span>
            <span>&bull;</span>
            <span className="text-primary font-bold">On Duty Logs</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New On Duty Request</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card border border-border/70 rounded-2xl p-3.5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by employee, purpose, destination..."
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            >
              <option value="All Status">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-surface/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Purpose &amp; Destination</th>
                <th className="py-3.5 px-3">Date &amp; Time</th>
                <th className="py-3.5 px-3">Transport</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4">Approver</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-medium">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-surface/50 transition duration-150 group"
                  >
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground text-xs sm:text-[13px]">
                          {log.employeeName}
                        </div>
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-500 font-mono font-bold text-[10px] border border-sky-500/20">
                            {log.employeeCode}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {log.designation}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="font-bold text-foreground leading-tight">
                          {log.purpose}
                        </div>
                        <div className="flex items-center space-x-1 text-amber-500 text-[11px]">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span>{log.destination}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="space-y-0.5 text-[11px]">
                        <div className="font-semibold text-foreground">
                          {log.dutyDate}
                        </div>
                        <div className="text-muted-foreground flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{log.startTime} - {log.endTime}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="flex items-center space-x-1 text-sky-500 font-semibold text-[11px]">
                        <Car className="h-3.5 w-3.5" />
                        <span>{log.transportType}</span>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      {log.status === 'Approved' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[11px] font-bold">
                          Approved
                        </span>
                      ) : log.status === 'Pending' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-bold">
                          Pending
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[11px] font-bold">
                          {log.status}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-[11px] text-muted-foreground">
                      <div className="font-semibold text-foreground">
                        {log.approverName}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {log.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(log.id, 'Approved')}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition cursor-pointer"
                            title="Approve"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(log)}
                          className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(log.id, log.employeeName)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-semibold text-sm">No On Duty logs found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── CREATE / EDIT ON DUTY MODAL ─────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/70">
              <h2 className="text-lg font-black text-foreground tracking-tight">
                {editingLog ? 'Edit On Duty Request' : 'New On Duty Request'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Employee <span className="text-amber-500">*</span>
                  </label>
                  <select
                    value={formData.employeeCode}
                    onChange={(e) => handleEmployeeSelectInForm(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    {employees.map((emp) => (
                      <option key={emp.code} value={emp.code}>
                        {emp.name} ({emp.code}) &bull; {emp.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Purpose / Assignment <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="e.g. Field School Telecommunication Inspection"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Destination Location <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g. Cox's Bazar Branch Campus"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Duty Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dutyDate}
                    onChange={(e) => setFormData({ ...formData, dutyDate: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Transport Type
                  </label>
                  <select
                    value={formData.transportType}
                    onChange={(e) => setFormData({ ...formData, transportType: e.target.value as any })}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Office Vehicle">Office Vehicle</option>
                    <option value="Public Transport">Public Transport</option>
                    <option value="Personal Vehicle">Personal Vehicle</option>
                    <option value="Rideshare">Rideshare</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 transition cursor-pointer"
                >
                  {editingLog ? 'Save Changes' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
