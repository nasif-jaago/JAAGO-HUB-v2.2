'use client';

import React, { useState } from 'react';
import {
  Clock,
  Flag,
  ChevronRight,
  Sparkles,
  FileText,
  DollarSign,
  Briefcase,
  Calendar,
  Layers,
  Radio,
} from 'lucide-react';

export default function DashboardPage() {
  const [holidayTab, setHolidayTab] = useState<'upcoming' | 'month' | 'year'>('upcoming');
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  return (
    <div className="space-y-5 pb-28 max-w-[1600px] mx-auto text-foreground">
      {/* ── 1. USER HERO PROFILE & ATTENDANCE STATUS CARD ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 relative">
        <div className="flex items-center space-x-4">
          {/* Avatar with yellow background and IA */}
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-primary text-primary-foreground font-black text-xl sm:text-2xl flex items-center justify-center shadow-lg border border-primary/40 flex-shrink-0">
            IA
          </div>

          {/* User Info */}
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Intern account
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/90">Admin & Logistics Officer</span>
              <span className="opacity-40">&bull;</span>
              <span>JAAGO Foundation Trust</span>
              <span className="opacity-40">&bull;</span>
              <span className="text-muted-foreground/80 font-mono">ID: JFT-2026-0417</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground/80 pt-0.5">
              <span>Founder&apos;s Office / Fc</span>
              <span className="opacity-40">&bull;</span>
              <span>Managers &bull; HR / Masoor Rahman</span>
            </div>
          </div>
        </div>

        {/* Live On-Duty & Check-In Widget */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 w-full xl:w-auto justify-between xl:justify-end">
          {/* ON DUTY Badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-emerald-400">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="uppercase tracking-wider">{isCheckedIn ? 'ON DUTY' : 'OFF DUTY'}</span>
          </div>

          {/* CHECK IN Widget */}
          <div className="flex items-center space-x-2.5">
            <Clock className="h-4 w-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">CHECK IN</span>
              <span className="text-xs font-bold text-foreground font-mono">{isCheckedIn ? '09:05:12 AM' : '--:--:--'}</span>
            </div>
            <button
              onClick={() => setIsCheckedIn(true)}
              className={`ml-1 px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md active:scale-95 ${
                isCheckedIn ? 'bg-surface border border-border text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-brand-strong'
              }`}
            >
              Check In
            </button>
          </div>

          {/* CHECK OUT Widget */}
          <div className="flex items-center space-x-2.5">
            <Flag className="h-4 w-4 text-destructive/80" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">CHECK OUT</span>
              <span className="text-xs font-bold text-foreground font-mono">--:--:--</span>
            </div>
            <button
              onClick={() => setIsCheckedIn(false)}
              className="ml-1 text-xs font-bold text-muted-foreground hover:text-foreground transition uppercase tracking-wider px-2 py-1.5"
            >
              Check Out
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. FOUR METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Hours Today */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            HOURS TODAY
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground font-mono">
            00:00:00
          </div>
        </div>

        {/* Card 2: On-Duty Status */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            ON-DUTY STATUS
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            Present
          </div>
        </div>

        {/* Card 3: Leave Balance */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            LEAVE BALANCE
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            0 <span className="text-base font-medium text-muted-foreground">Days</span>
          </div>
        </div>

        {/* Card 4: Pending Approvals */}
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            PENDING APPROVALS
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground">
            1
          </div>
        </div>
      </div>

      {/* ── 3. MIDDLE TWO-COLUMN SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Attendance */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border/80 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Monthly Attendance</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-primary text-primary-foreground uppercase tracking-wider">
              92% RATE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* Donut Ring Mock */}
            <div className="sm:col-span-5 flex items-center justify-center">
              <div className="relative h-36 w-36 flex items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-primary"
                    strokeDasharray="92, 100"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-foreground">92%</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Rate</span>
                </div>
              </div>
            </div>

            {/* Attendance Details Grid */}
            <div className="sm:col-span-7 grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <div className="text-muted-foreground text-[11px]">Present</div>
                <div className="text-base font-bold text-foreground">15 <span className="text-xs text-muted-foreground font-normal">/ 22</span></div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px]">Absent</div>
                <div className="text-base font-bold text-foreground">1</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px]">Late Check-Ins</div>
                <div className="text-base font-bold text-foreground">3</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px]">On Leave</div>
                <div className="text-base font-bold text-foreground">2</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px]">Avg Hours</div>
                <div className="text-base font-bold text-foreground">8.3h</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px]">Avg Check-In</div>
                <div className="text-base font-bold text-foreground">9:05 AM</div>
              </div>
            </div>
          </div>

          {/* Weekly Trend Line Chart */}
          <div className="pt-2 space-y-2 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="uppercase font-bold tracking-wider">WEEKLY TREND</span>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full bg-foreground"></span>
                  <span>Present</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="h-2 w-2 rounded-full bg-primary"></span>
                  <span>Late</span>
                </div>
              </div>
            </div>

            <div className="h-20 w-full flex items-end justify-between px-2 pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 60">
                {/* Present Line */}
                <path
                  d="M 10 50 Q 80 48, 140 20 T 260 25 T 390 35"
                  fill="none"
                  stroke="currentColor"
                  className="text-foreground/80"
                  strokeWidth="2"
                />
                {/* Late Line */}
                <path
                  d="M 10 55 Q 80 52, 140 50 T 260 48 T 390 52"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2.5"
                />
                {/* Points */}
                <circle cx="10" cy="50" r="3.5" className="fill-foreground/80" />
                <circle cx="140" cy="20" r="3.5" className="fill-foreground/80" />
                <circle cx="260" cy="25" r="3.5" className="fill-foreground/80" />
                <circle cx="390" cy="35" r="3.5" className="fill-foreground/80" />

                <circle cx="10" cy="55" r="3.5" fill="hsl(var(--primary))" />
                <circle cx="140" cy="50" r="3.5" fill="hsl(var(--primary))" />
                <circle cx="260" cy="48" r="3.5" fill="hsl(var(--primary))" />
                <circle cx="390" cy="52" r="3.5" fill="hsl(var(--primary))" />
              </svg>
            </div>
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-card border border-border/80 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">Upcoming Holidays</h2>
            </div>

            {/* Pill Tabs */}
            <div className="grid grid-cols-3 p-1 bg-surface rounded-xl border border-border text-xs font-bold">
              {(['upcoming', 'month', 'year'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setHolidayTab(t)}
                  className={`py-1.5 rounded-lg capitalize transition text-center ${
                    holidayTab === t
                      ? 'bg-primary text-primary-foreground font-black shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'upcoming' ? 'Upcoming' : t === 'month' ? 'This Month' : 'This Year'}
                </button>
              ))}
            </div>

            {/* Holiday Items */}
            <div className="space-y-2.5">
              {[
                { name: 'Ashura', date: 'Jul 5, 2026', daysLeft: '7D' },
                { name: 'July Playing Day', date: 'Jul 22, 2026', daysLeft: '24D' },
                { name: 'Eid-e-Milad-un-Nabi', date: 'Sep 26, 2026', daysLeft: '90D' },
                { name: 'Shaba Baraat', date: 'Oct 14, 2026', daysLeft: '108D' },
              ].map((holiday, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/60 hover:border-primary/40 transition"
                >
                  <div>
                    <div className="text-xs font-bold text-foreground">{holiday.name}</div>
                    <div className="text-[11px] text-muted-foreground">{holiday.date}</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-black">
                    {holiday.daysLeft}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM SECTION: PENDING REQUESTS & APPROVALS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending Requests */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Pending Requests
              </h3>
            </div>
            <a
              href="#view-all"
              className="text-xs font-bold text-primary hover:underline flex items-center space-x-1"
            >
              <span>VIEW ALL</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="space-y-3">
            {[
              {
                title: 'Leave Request — Jul 12-14',
                sub: 'Submitted Jul 6, 2026',
                badge: 'Pending',
              },
              {
                title: 'Tax & NOC Request',
                sub: 'Submitted Jul 3, 2026',
                badge: 'In Review',
              },
              {
                title: 'Purchase Requisition — PR-2026-0417',
                sub: 'Submitted Jul 1, 2026',
                badge: 'Pending',
              },
            ].map((req, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border/60 hover:border-primary/40 transition"
              >
                <div>
                  <div className="text-xs font-bold text-foreground">{req.title}</div>
                  <div className="text-[11px] text-muted-foreground">{req.sub}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/30">
                  {req.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Pending Approvals
              </h3>
            </div>
            <a
              href="#view-all"
              className="text-xs font-bold text-primary hover:underline flex items-center space-x-1"
            >
              <span>VIEW ALL</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="space-y-3">
            {[
              {
                title: 'Purchase Requisition',
                sub: 'By F. Islam - Procurement',
                badge: 'Pending',
              },
              {
                title: 'Leave Request',
                sub: 'By T. Ahmed - Programs',
                badge: 'Pending',
              },
            ].map((app, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border/60 hover:border-primary/40 transition"
              >
                <div>
                  <div className="text-xs font-bold text-foreground">{app.title}</div>
                  <div className="text-[11px] text-muted-foreground">{app.sub}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/30">
                  {app.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. FLOATING QUICK ACTION BAR ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface/90 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-1.5 flex items-center space-x-1 sm:space-x-2">
        {[
          { label: 'New Purchase Request', icon: DollarSign, active: true },
          { label: 'Apply Leave', icon: Calendar },
          { label: 'Submit Expense', icon: FileText },
          { label: 'All Requests', icon: Briefcase },
          { label: 'Attendance', icon: Clock },
          { label: 'Tax & NOC', icon: Sparkles },
        ].map((action, idx) => (
          <button
            key={idx}
            className={`flex flex-col items-center justify-center py-2 px-3 sm:px-4 rounded-xl transition group ${
              action.active
                ? 'bg-primary/15 border border-primary/40 text-primary'
                : 'hover:bg-card text-muted-foreground hover:text-foreground'
            }`}
            title={action.label}
          >
            <action.icon className="h-4 w-4 mb-1 group-hover:scale-110 transition" />
            <span className="text-[9px] font-bold whitespace-nowrap hidden sm:block">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
