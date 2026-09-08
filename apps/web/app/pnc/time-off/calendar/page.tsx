'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import {
  fetchLeaveRequests,
  fetchPublicHolidays,
  LeaveRequestItem,
  PublicHolidayItem,
} from '@/lib/supabase-time-off';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';
import {
  useOrganizationScope,
  matchesSelectedOrg,
  matchesSelectedDept,
  isDspDepartment,
} from '@/lib/use-organization-scope';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getLeaveTypeBadge(type: string): { code: string; color: string; bg: string; border: string } {
  switch (type) {
    case 'Casual Leave':
      return { code: 'CL', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' };
    case 'Medical Leave':
      return { code: 'ML', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30' };
    case 'Annual Leave':
      return { code: 'AL', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30' };
    case 'Emergency Leave':
      return { code: 'EL', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
    case 'Maternity Leave':
      return { code: 'MatL', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/15', border: 'border-pink-500/30' };
    case 'Paternity Leave':
      return { code: 'PatL', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' };
    case 'Compensatory Leave':
      return { code: 'CO', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/15', border: 'border-teal-500/30' };
    case 'Bereavement Leave':
      return { code: 'BL', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30' };
    default:
      return { code: 'LV', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
  }
}

export default function PnCLeaveCalendarPage() {
  const { selectedOrg, selectedDept, isDspScoped } = useOrganizationScope();
  // Default to current dynamic date/month
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [holidays, setHolidays] = useState<PublicHolidayItem[]>([]);

  const loadData = async () => {
    const [reqs, hols, emps] = await Promise.all([
      fetchLeaveRequests(),
      fetchPublicHolidays(),
      fetchEmployeesFromSupabase(),
    ]);
    if (reqs) setRequests(reqs);
    if (hols) setHolidays(hols);
    if (emps) setEmployees(emps);
  };

  useEffect(() => {
    try {
      const rawReq = localStorage.getItem('jaago_pnc_leave_requests_v2');
      if (rawReq) {
        const parsed = JSON.parse(rawReq);
        if (Array.isArray(parsed) && parsed.length > 0) setRequests(parsed);
      }
      const rawEmps = localStorage.getItem('jaago_pnc_employees_v2');
      if (rawEmps) {
        const parsed = JSON.parse(rawEmps);
        if (Array.isArray(parsed) && parsed.length > 0) setEmployees(parsed);
      }
      const rawHols = localStorage.getItem('jaago_pnc_public_holidays');
      if (rawHols) {
        const parsed = JSON.parse(rawHols);
        if (Array.isArray(parsed) && parsed.length > 0) setHolidays(parsed);
      }
    } catch {}

    loadData();
  }, []);

  const empCodeToProfile = useMemo(() => {
    const map = new Map<string, FullEmployeeProfile>();
    employees.forEach((e) => {
      if (e.code) map.set(e.code, e);
    });
    return map;
  }, [employees]);

  // Filter requests based on organization and department (strictly respects DSP-only scope)
  const scopedRequests = useMemo(() => {
    return requests.filter((r) => {
      const emp = empCodeToProfile.get(r.employeeCode);
      const org = emp?.organization || '';
      const dept = emp?.department || r.department || '';
      if (isDspScoped && !isDspDepartment(dept)) {
        return false;
      }
      return matchesSelectedOrg(org, selectedOrg) && matchesSelectedDept(dept, selectedDept);
    });
  }, [requests, empCodeToProfile, selectedOrg, selectedDept, isDspScoped]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthString = `${MONTH_NAMES[month]} ${year}`;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar calculations
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Metrics for current month
  const approvedLeaves = scopedRequests.filter((r) => r.status === 'Approved');
  const pendingLeaves = scopedRequests.filter((r) => r.status === 'Pending');
  const holidaysThisMonth = holidays.filter((h) => {
    const hDate = new Date(h.date);
    return hDate.getFullYear() === year && hDate.getMonth() === month;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <Link href="/pnc" className="hover:text-primary hover:underline transition cursor-pointer">
              People and Culture
            </Link>
            <span>/</span>
            <Link href="/pnc/time-off/calendar" className="hover:text-primary hover:underline transition cursor-pointer">
              Time Off
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Leave Calendar</span>
          </div>
          <div className="flex items-center space-x-3 mt-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Leave Calendar
            </h1>
            {isDspScoped && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                DSP Scoped
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground transition shadow-sm cursor-pointer"
            title="Refresh Calendar"
          >
            <RotateCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <Link
            href="/pnc/time-off/requests"
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>APPLY FOR LEAVE</span>
          </Link>
        </div>
      </div>

      {/* ── 2. TOP METRIC CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Approved Leaves */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-emerald-500 tracking-tight">{approvedLeaves.length}</div>
            <div className="text-xs font-bold text-muted-foreground pt-1">Approved Leaves</div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-amber-500 tracking-tight">{pendingLeaves.length}</div>
            <div className="text-xs font-bold text-muted-foreground pt-1">Pending Leaves</div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Holidays This Month */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-blue-500 tracking-tight">{holidaysThisMonth.length}</div>
            <div className="text-xs font-bold text-muted-foreground pt-1">Holidays This Month</div>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-500 flex items-center justify-center">
            <CalendarIcon className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── 3. MONTH PICKER BAR ── */}
      <div className="p-3 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-surface border border-border hover:border-amber-500 text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3.5 py-1.5 rounded-xl bg-surface border border-border hover:border-amber-500/60 text-xs font-bold text-foreground hover:text-amber-500 transition cursor-pointer"
            title="Jump to Current Month"
          >
            Today
          </button>
        </div>

        <h2 className="text-lg font-serif font-black text-foreground">
          {monthString}
        </h2>

        <button
          onClick={nextMonth}
          className="p-2 rounded-xl bg-surface border border-border hover:border-amber-500 text-muted-foreground hover:text-foreground transition cursor-pointer"
          title="Next Month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── 4. CALENDAR MATRIX ── */}
      <div className="rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border/70 text-center text-xs font-extrabold uppercase tracking-wider py-3 bg-surface/50 text-amber-600 dark:text-amber-400">
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border/50 text-xs">
          {/* Pre-padding empty boxes */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[120px] p-2 bg-surface/20"></div>
          ))}

          {/* Days in Month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

            // Check if today
            const today = new Date();
            const isToday =
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === dayNum;

            // Find holidays on this date
            const dayHoliday = holidays.find((h) => {
              if (h.date === dateStr) return true;
              if (h.endDate && dateStr >= h.date && dateStr <= h.endDate) return true;
              return false;
            });

            // Find leaves on this date (filtered to scoped requests)
            const dayLeaves = scopedRequests.filter((r) => {
              return dateStr >= r.fromDate && dateStr <= r.toDate;
            });

            return (
              <div
                key={`day-${dayNum}`}
                className={`min-h-[120px] p-2 space-y-1.5 transition ${
                  isToday
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : dayHoliday
                    ? 'bg-blue-500/5'
                    : 'hover:bg-surface/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  {isToday ? (
                    <span className="text-[9px] uppercase font-black text-amber-500 tracking-wider">TODAY</span>
                  ) : <span />}
                  <span
                    className={`font-mono font-bold text-xs ${
                      isToday
                        ? 'h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                {dayHoliday && (
                  <div
                    title={`Public Holiday: ${dayHoliday.title}`}
                    className="text-[10px] font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-1.5 py-1 rounded-lg truncate shadow-xs flex items-center space-x-1"
                  >
                    <span>🎉</span>
                    <span className="truncate">{dayHoliday.title}</span>
                  </div>
                )}

                {/* VISUAL LEAVE DURATION BARS */}
                {dayLeaves.map((lv) => {
                  const badge = getLeaveTypeBadge(lv.leaveType);
                  const isFirstHalf = lv.halfDayType === 'First Half' || (lv.totalDays === 0.5 && lv.halfDayType !== 'Second Half');
                  const isSecondHalf = lv.halfDayType === 'Second Half';

                  const statusBorder =
                    lv.status === 'Approved'
                      ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15'
                      : lv.status === 'Pending'
                      ? 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15'
                      : 'border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/15';

                  const durationText = isFirstHalf
                    ? '½d • 1st Half'
                    : isSecondHalf
                    ? '½d • 2nd Half'
                    : lv.totalDays > 1
                    ? `Full (${lv.totalDays}d)`
                    : 'Full Day';

                  const tooltipText = `${lv.employeeName} (${lv.employeeCode})
Department: ${lv.department || 'General'}
Leave Category: ${lv.leaveType}
Duration: ${isFirstHalf ? 'Half Day — First Half (Morning / AM)' : isSecondHalf ? 'Half Day — Second Half (Afternoon / PM)' : `Full Day (${lv.totalDays} Day${lv.totalDays > 1 ? 's' : ''})`}
Date Span: ${lv.fromDate}${lv.toDate && lv.toDate !== lv.fromDate ? ` to ${lv.toDate}` : ''}
Status: ${lv.status}
Reason: "${lv.reason}"`;

                  return (
                    <div
                      key={lv.id}
                      title={tooltipText}
                      className={`rounded-lg border p-1.5 transition text-xs shadow-xs space-y-0.5 cursor-pointer relative overflow-hidden group ${statusBorder}`}
                    >
                      {/* Top bar row: Leave Type Badge + Duration Pill + Status Dot */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center space-x-1 min-w-0">
                          <span
                            className={`px-1 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider border flex-shrink-0 ${badge.bg} ${badge.color} ${badge.border}`}
                          >
                            {badge.code}
                          </span>

                          <span
                            className={`px-1 py-0.2 rounded text-[8.5px] font-extrabold flex-shrink-0 ${
                              isFirstHalf
                                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                                : isSecondHalf
                                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                                : 'bg-surface/80 text-foreground/80 border border-border/50'
                            }`}
                          >
                            {durationText}
                          </span>
                        </div>

                        {/* Status Indicator Dot */}
                        <span
                          className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                            lv.status === 'Approved'
                              ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                              : lv.status === 'Pending'
                              ? 'bg-amber-500 ring-2 ring-amber-500/20'
                              : 'bg-rose-500 ring-2 ring-rose-500/20'
                          }`}
                          title={lv.status}
                        />
                      </div>

                      {/* Employee Name */}
                      <div className="text-[10px] font-bold text-foreground truncate group-hover:text-amber-500 transition">
                        {lv.employeeName}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── 5. CALENDAR LEGEND BAR ── */}
        <div className="p-3.5 bg-surface/50 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Legend:</span>
            <div className="flex items-center space-x-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface border border-border text-foreground">Full Day</span>
              <span>Full Day Leave</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">½d • 1st Half</span>
              <span>Morning Shift</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">½d • 2nd Half</span>
              <span>Afternoon Shift</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Approved</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Pending</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs">🎉</span>
              <span>Holiday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
