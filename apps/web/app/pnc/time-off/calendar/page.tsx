'use client';

import React, { useState, useEffect } from 'react';
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PnCLeaveCalendarPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 1)); // August 2026 default
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [holidays, setHolidays] = useState<PublicHolidayItem[]>([]);

  const loadData = async () => {
    const [reqs, hols] = await Promise.all([
      fetchLeaveRequests(),
      fetchPublicHolidays(),
    ]);
    if (reqs) setRequests(reqs);
    if (hols) setHolidays(hols);
  };

  useEffect(() => {
    loadData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthString = `${MONTH_NAMES[month]} ${year}`;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar calculations
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Metrics for current month
  const approvedLeaves = requests.filter((r) => r.status === 'Approved');
  const pendingLeaves = requests.filter((r) => r.status === 'Pending');
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
            Leave Calendar
          </h1>
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
        <button
          onClick={prevMonth}
          className="p-2 rounded-xl bg-surface border border-border hover:border-amber-500 text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-serif font-black text-foreground">
          {monthString}
        </h2>

        <button
          onClick={nextMonth}
          className="p-2 rounded-xl bg-surface border border-border hover:border-amber-500 text-muted-foreground hover:text-foreground transition cursor-pointer"
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
            <div key={`empty-${idx}`} className="min-h-[110px] p-2 bg-surface/20"></div>
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

            // Find leaves on this date
            const dayLeaves = requests.filter((r) => {
              return dateStr >= r.fromDate && dateStr <= r.toDate;
            });

            return (
              <div
                key={`day-${dayNum}`}
                className={`min-h-[110px] p-2 space-y-1 transition ${
                  isToday
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : dayHoliday
                    ? 'bg-blue-500/5'
                    : 'hover:bg-surface/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  {isToday ? (
                    <span className="text-[9px] uppercase font-black text-amber-500">TODAY</span>
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
                    title={dayHoliday.title}
                    className="text-[10px] font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 p-1 rounded-md truncate"
                  >
                    🎉 {dayHoliday.title}
                  </div>
                )}

                {dayLeaves.map((lv) => (
                  <div
                    key={lv.id}
                    title={`${lv.employeeName} — ${lv.leaveType} (${lv.status})`}
                    className={`text-[10px] font-semibold border p-1 rounded-md truncate ${
                      lv.status === 'Approved'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : lv.status === 'Pending'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                        : 'bg-surface border-border text-muted-foreground'
                    }`}
                  >
                    👤 {lv.employeeName}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
