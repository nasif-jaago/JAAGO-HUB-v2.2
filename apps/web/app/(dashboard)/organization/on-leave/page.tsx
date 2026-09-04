'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  UserCheck,
  Search,
  CheckCircle2,
  CalendarDays,
  MessageSquareQuote,
  RotateCw,
} from 'lucide-react';
import {
  fetchLeaveRequests,
  LeaveRequestItem,
  LeaveType,
} from '@/lib/supabase-time-off';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';

export default function OnLeaveCalendarPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('jaago_pnc_leave_requests_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [employees, setEmployees] = useState<FullEmployeeProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('jaago_pnc_employees_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL_APPROVED'>('TODAY');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  const loadData = async () => {
    const [reqs, emps] = await Promise.all([
      fetchLeaveRequests(),
      fetchEmployeesFromSupabase(),
    ]);
    if (reqs) setLeaveRequests(reqs);
    if (emps) setEmployees(emps);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('jaago_leave_request_updated', loadData);
    return () => window.removeEventListener('jaago_leave_request_updated', loadData);
  }, []);

  const empCodeToProfile = useMemo(() => {
    const map = new Map<string, FullEmployeeProfile>();
    employees.forEach((e) => {
      if (e.code) map.set(e.code.toLowerCase(), e);
    });
    return map;
  }, [employees]);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Helper date calculators
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  const endOfWeekStr = endOfWeek.toISOString().slice(0, 10);

  const startOfMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const endOfMonthStr = endOfMonth.toISOString().slice(0, 10);

  // Filter approved leaves by timeframe
  const approvedLeaves = useMemo(() => {
    return leaveRequests.filter((req) => req.status === 'Approved');
  }, [leaveRequests]);

  const todayOnLeave = useMemo(() => {
    return approvedLeaves.filter((r) => r.fromDate <= todayStr && r.toDate >= todayStr);
  }, [approvedLeaves, todayStr]);

  const thisWeekOnLeave = useMemo(() => {
    return approvedLeaves.filter((r) => r.fromDate <= endOfWeekStr && r.toDate >= startOfWeekStr);
  }, [approvedLeaves, startOfWeekStr, endOfWeekStr]);

  const thisMonthOnLeave = useMemo(() => {
    return approvedLeaves.filter((r) => r.fromDate <= endOfMonthStr && r.toDate >= startOfMonthStr);
  }, [approvedLeaves, startOfMonthStr, endOfMonthStr]);

  // Active list based on timeframe
  const activeTimeframeList = useMemo(() => {
    if (timeframeFilter === 'TODAY') return todayOnLeave;
    if (timeframeFilter === 'THIS_WEEK') return thisWeekOnLeave;
    if (timeframeFilter === 'THIS_MONTH') return thisMonthOnLeave;
    return approvedLeaves;
  }, [timeframeFilter, todayOnLeave, thisWeekOnLeave, thisMonthOnLeave, approvedLeaves]);

  // Apply search & filters
  const filteredLeaves = useMemo(() => {
    return activeTimeframeList.filter((req) => {
      if (selectedDeptFilter && (req.department || '').trim() !== selectedDeptFilter.trim()) return false;
      if (selectedTypeFilter && req.leaveType !== selectedTypeFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        req.employeeName.toLowerCase().includes(q) ||
        req.employeeCode.toLowerCase().includes(q) ||
        (req.department && req.department.toLowerCase().includes(q)) ||
        req.leaveType.toLowerCase().includes(q) ||
        (req.reason && req.reason.toLowerCase().includes(q)) ||
        (req.approvedBy && req.approvedBy.toLowerCase().includes(q))
      );
    });
  }, [activeTimeframeList, selectedDeptFilter, selectedTypeFilter, searchQuery]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    leaveRequests.forEach((r) => {
      if (r.department) set.add(r.department.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [leaveRequests]);

  const leaveTypeOptions = useMemo(() => {
    const set = new Set<string>();
    leaveRequests.forEach((r) => {
      if (r.leaveType) set.add(r.leaveType);
    });
    return Array.from(set);
  }, [leaveRequests]);

  const getLeaveBadgeStyle = (type: LeaveType) => {
    switch (type) {
      case 'Casual Leave':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
      case 'Medical Leave':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
      case 'Emergency Leave':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
      case 'Annual Leave':
        return 'bg-purple-500/15 border-purple-500/30 text-purple-400';
      case 'Compensatory Leave':
        return 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400';
      case 'Paternity Leave':
        return 'bg-blue-500/15 border-blue-500/30 text-blue-400';
      case 'Maternity Leave':
        return 'bg-pink-500/15 border-pink-500/30 text-pink-400';
      default:
        return 'bg-slate-500/15 border-slate-500/30 text-slate-400';
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <Link href="/dashboard" className="hover:text-primary transition cursor-pointer">
              Organization
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">On Leave</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center space-x-3 mt-1">
            <span>Staff Absence &amp; On-Leave Calendar</span>
            <span className="px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold">
              {todayOnLeave.length} On Leave Today
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Live absence roster pulled directly from approved Leave Calendar applications.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl bg-card border border-border hover:border-amber-500 text-foreground transition shadow-sm cursor-pointer"
            title="Refresh Leave Data"
          >
            <RotateCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <Link
            href="/leaves"
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20"
          >
            + APPLY FOR LEAVE
          </Link>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setTimeframeFilter('TODAY')}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-sm flex items-center space-x-4 ${
            timeframeFilter === 'TODAY'
              ? 'bg-purple-500/10 border-purple-500/50 ring-1 ring-purple-500/40'
              : 'bg-card border-border/80 hover:border-purple-500/40'
          }`}
        >
          <div className="h-12 w-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-black flex-shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-400 font-mono">{todayOnLeave.length}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Away Today</div>
          </div>
        </div>

        <div
          onClick={() => setTimeframeFilter('THIS_WEEK')}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-sm flex items-center space-x-4 ${
            timeframeFilter === 'THIS_WEEK'
              ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/40'
              : 'bg-card border-border/80 hover:border-amber-500/40'
          }`}
        >
          <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black flex-shrink-0">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-500 font-mono">{thisWeekOnLeave.length}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This Week</div>
          </div>
        </div>

        <div
          onClick={() => setTimeframeFilter('THIS_MONTH')}
          className={`p-4 rounded-2xl border transition cursor-pointer shadow-sm flex items-center space-x-4 ${
            timeframeFilter === 'THIS_MONTH'
              ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/40'
              : 'bg-card border-border/80 hover:border-blue-500/40'
          }`}
        >
          <div className="h-12 w-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-black flex-shrink-0">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-400 font-mono">{thisMonthOnLeave.length}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">This Month ({new Intl.DateTimeFormat('en-US', { month: 'long' }).format(today)})</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search + Department + Type Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-card border border-border/80 rounded-2xl p-3.5 shadow-sm">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee, ID, reason, approver..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface/60 border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <div>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-surface/60 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="">Department (All)</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-surface/60 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="">Leave Type (All)</option>
            {leaveTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leave Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLeaves.map((req) => {
          const emp = empCodeToProfile.get(req.employeeCode.toLowerCase());
          const badgeClass = getLeaveBadgeStyle(req.leaveType);
          const isToday = req.fromDate <= todayStr && req.toDate >= todayStr;

          return (
            <div
              key={req.id}
              className={`rounded-3xl bg-card border p-5 space-y-4 shadow-sm hover:shadow-md transition relative overflow-hidden ${
                isToday ? 'border-purple-500/50 bg-purple-500/5' : 'border-border/80'
              }`}
            >
              {/* Top Banner for Today */}
              {isToday && (
                <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-purple-500 text-white font-black text-[9px] uppercase tracking-wider shadow-sm">
                  Away Today
                </div>
              )}

              {/* Employee Info Header */}
              <div className="flex items-start space-x-3.5">
                {emp?.avatarUrl ? (
                  <img
                    src={emp.avatarUrl}
                    alt={req.employeeName}
                    className="h-12 w-12 rounded-2xl object-cover border border-border shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-2xl bg-[#26180E] text-amber-500 font-black text-sm flex items-center justify-center border border-amber-500/30 flex-shrink-0">
                    {req.employeeName.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-foreground text-sm truncate">
                    {req.employeeName}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground">
                    ID: {req.employeeCode}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                    {req.department || emp?.department || 'General Operations'} &bull; {emp?.designation || 'Staff'}
                  </div>
                </div>
              </div>

              {/* Leave Type & Dates */}
              <div className="p-3.5 rounded-2xl bg-surface/60 border border-border/70 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-lg border font-bold text-xs ${badgeClass}`}>
                    {req.leaveType}
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {req.totalDays} Day{req.totalDays > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center space-x-2 font-mono text-[11px] text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <span>
                    {req.fromDate} &rarr; {req.toDate}
                  </span>
                  {req.halfDayType && req.halfDayType !== 'Full Day' && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[10px] font-bold">
                      {req.halfDayType}
                    </span>
                  )}
                </div>

                {req.reason && (
                  <div className="text-[11px] text-foreground/80 italic flex items-start space-x-1.5 pt-1">
                    <MessageSquareQuote className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="truncate">&ldquo;{req.reason}&rdquo;</span>
                  </div>
                )}
              </div>

              {/* Approver Footer */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Approved by <strong className="text-foreground">{req.approvedBy || 'Supervisor'}</strong></span>
                </div>
                {emp?.branch && (
                  <span className="font-medium text-muted-foreground">{emp.branch}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredLeaves.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-card border border-border text-muted-foreground">
          <UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-bold text-foreground text-sm">No staff members currently on leave in this timeframe</h3>
          <p className="text-xs mt-1">All team members are scheduled to be active and present.</p>
        </div>
      )}
    </div>
  );
}
