'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
  Smartphone,
  Clock,
} from 'lucide-react';
import {
  AttendanceLogItem,
  getLocalAttendanceLogs,
  saveLocalAttendanceLogs,
} from '@/lib/supabase-attendance';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<AttendanceLogItem[]>([]);
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<AttendanceLogItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    designation: string;
    department: string;
    branch: string;
    status: AttendanceLogItem['status'];
    device: AttendanceLogItem['device'];
    date: string;
    time: string;
    notes: string;
  }>({
    employeeId: '',
    employeeCode: '',
    employeeName: '',
    designation: '',
    department: '',
    branch: '',
    status: 'Present',
    device: 'Device Login',
    date: new Date().toISOString().slice(0, 10),
    time: '09:00 AM',
    notes: '',
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const loadedLogs = getLocalAttendanceLogs();
    setLogs(loadedLogs);

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
      department: "Founder's Office / FC",
      branch: 'Head Office (Banani)',
    };
    setFormData({
      employeeId: defaultEmp.id,
      employeeCode: defaultEmp.code,
      employeeName: defaultEmp.name,
      designation: defaultEmp.designation,
      department: defaultEmp.department,
      branch: defaultEmp.branch,
      status: 'Present',
      device: 'Device Login',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (log: AttendanceLogItem) => {
    setEditingLog(log);
    setFormData({
      employeeId: log.employeeId,
      employeeCode: log.employeeCode,
      employeeName: log.employeeName,
      designation: log.designation,
      department: log.department,
      branch: log.branch,
      status: log.status,
      device: log.device,
      date: log.date || new Date().toISOString().slice(0, 10),
      time: log.checkInTime || '09:00 AM',
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

    const nowFormatted = new Date().toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    let updated: AttendanceLogItem[];
    if (editingLog) {
      updated = logs.map((l) =>
        l.id === editingLog.id
          ? {
              ...l,
              ...formData,
              checkInTime: formData.time,
              timestamp: `${new Date(formData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${formData.time}`,
              updatedAt: nowFormatted,
            }
          : l
      );
      showToast(`Record for ${formData.employeeName} updated successfully!`);
    } else {
      const newLog: AttendanceLogItem = {
        id: `att-${Date.now()}`,
        employeeId: formData.employeeId,
        employeeCode: formData.employeeCode,
        employeeName: formData.employeeName,
        designation: formData.designation,
        department: formData.department,
        branch: formData.branch,
        status: formData.status,
        device: formData.device,
        timestamp: `${new Date(formData.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${formData.time}`,
        date: formData.date,
        checkInTime: formData.time,
        checkOutTime: '06:00 PM',
        lateByMin: 0,
        earlyOutByMin: 0,
        createdBy: `${formData.employeeName} - (${formData.employeeCode})`,
        createdAt: nowFormatted,
        updatedAt: nowFormatted,
        notes: formData.notes,
      };
      updated = [newLog, ...logs];
      showToast(`Attendance record logged for ${formData.employeeName}!`);
    }

    setLogs(updated);
    saveLocalAttendanceLogs(updated);
    setShowModal(false);
  };

  const handleDeleteRecord = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete attendance record for ${name}?`)) {
      const updated = logs.filter((l) => l.id !== id);
      setLogs(updated);
      saveLocalAttendanceLogs(updated);
      showToast(`Record for ${name} removed.`);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredLogs.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter computation
  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.employeeName.toLowerCase().includes(q) ||
      log.employeeCode.toLowerCase().includes(q) ||
      log.designation.toLowerCase().includes(q) ||
      log.department.toLowerCase().includes(q) ||
      log.branch.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'All Status' || log.status === statusFilter;

    const matchesEmployee =
      !employeeFilter || log.employeeCode === employeeFilter;

    const matchesDate =
      (!startDate || log.date >= startDate) &&
      (!endDate || log.date <= endDate);

    return matchesSearch && matchesStatus && matchesEmployee && matchesDate;
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
            Attendance
          </h1>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground mt-1">
            <span>Dashboard</span>
            <span>&bull;</span>
            <span className="text-primary font-bold">Attendance</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Record</span>
        </button>
      </div>

      {/* Filter Toolbar (Screenshot 4 layout) */}
      <div className="bg-card border border-border/70 rounded-2xl p-3.5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search by name, ID, RFID */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID, RFID..."
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
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
              <option value="On Duty">On Duty</option>
              <option value="Leave">Leave</option>
            </select>
          </div>

          {/* Employee Dropdown */}
          <div>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            >
              <option value="">Employee (All)</option>
              {employees.map((emp) => (
                <option key={emp.code} value={emp.code}>
                  {emp.name} ({emp.code})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-surface/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredLogs.length > 0 &&
                      selectedIds.length === filteredLogs.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Device</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Created By</th>
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
                    {/* Checkbox */}
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(log.id)}
                        onChange={() => handleToggleSelect(log.id)}
                        className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>

                    {/* Employee Name & Details (Screenshot 4 exact layout) */}
                    <td className="py-4 px-4">
                      <div className="flex items-start space-x-3">
                        <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground text-xs sm:text-[13px]">
                            {log.employeeName}
                          </div>
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-500 font-mono font-bold text-[10px] border border-sky-500/20">
                              ID: {log.employeeCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {log.designation} &bull; {log.branch || log.department}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-3">
                      {log.status === 'Present' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[11px] font-bold">
                          Present
                        </span>
                      ) : log.status === 'Late' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-bold">
                          Late
                        </span>
                      ) : log.status === 'Absent' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[11px] font-bold">
                          Absent
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-semibold text-[11px]">
                          N/A
                        </span>
                      )}
                    </td>

                    {/* Device Badge */}
                    <td className="py-4 px-3">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-bold">
                        <Smartphone className="h-3 w-3" />
                        <span>{log.device}</span>
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-4 px-4">
                      <div className="text-foreground font-medium text-xs">
                        {log.timestamp}
                      </div>
                    </td>

                    {/* Created By Details */}
                    <td className="py-4 px-4">
                      <div className="flex items-start space-x-2">
                        <User className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="space-y-0.5 text-[11px]">
                          <div className="font-bold text-foreground">
                            {log.createdBy}
                          </div>
                          <div className="text-muted-foreground/80">
                            Created at: {log.createdAt}
                          </div>
                          <div className="text-muted-foreground/80">
                            Updated at: {log.updatedAt}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(log)}
                          className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
                          title="Edit Log"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(log.id, log.employeeName)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                          title="Delete Log"
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
                    <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-semibold text-sm">No attendance records found</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Log your first attendance entry using &quot;New Record&quot;.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── CREATE / EDIT ATTENDANCE RECORD MODAL ────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border/70">
              <h2 className="text-lg font-black text-foreground tracking-tight">
                {editingLog ? 'Edit Attendance Record' : 'Log New Attendance'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRecord} className="p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Employee Selector */}
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

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  />
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Check-in Time
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    placeholder="09:00 AM"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                    <option value="Half Day">Half Day</option>
                    <option value="On Duty">On Duty</option>
                    <option value="Leave">Leave</option>
                  </select>
                </div>

                {/* Device / Method */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Device / Method
                  </label>
                  <select
                    value={formData.device}
                    onChange={(e) => setFormData({ ...formData, device: e.target.value as any })}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                  >
                    <option value="Device Login">Device Login</option>
                    <option value="RFID Scanner">RFID Scanner</option>
                    <option value="Web Portal">Web Portal</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="Manual In/Out">Manual In/Out</option>
                  </select>
                </div>

                {/* Remarks / Notes */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Reason or entry remarks..."
                    className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
              </div>

              {/* Modal Actions */}
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
                  {editingLog ? 'Save Changes' : 'Log Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
