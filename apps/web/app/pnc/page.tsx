'use client';

import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Calendar,
  UserX,
  UserPlus,
  Award,
  ChevronDown,
  Building2,
} from 'lucide-react';

export default function PnCDashboardPage() {
  const [activeAttendanceFilter, setActiveAttendanceFilter] = useState<'TODAY' | 'YESTERDAY' | 'MTD'>('MTD');

  return (
    <div className="space-y-6 select-none">
      {/* ── 1. HERO HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            People and Culture <span className="italic font-serif text-amber-500 font-bold">Intelligence</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-muted-foreground pt-1">
            Comprehensive real-time workforce monitoring
          </p>
        </div>

        {/* All Organizations Filter Pill */}
        <button className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-card border border-border/90 shadow-sm text-xs font-bold text-foreground hover:border-primary/50 transition self-start sm:self-auto cursor-pointer">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>All Organizations</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* ── 2. ROW OF 6 KPI METRIC CARDS WITH SPARKLINES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: TOTAL EMPLOYEES */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
              TOTAL EMPLOYEES
            </span>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">742</div>
            <div className="text-[10px] font-bold text-emerald-500 flex items-center space-x-1 pt-0.5">
              <span>▲ 1.6%</span>
              <span className="text-muted-foreground font-normal">vs last month</span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-7 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 25">
              <path d="M 0 18 Q 25 15, 50 10 T 100 6" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: PRESENT TODAY */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
              PRESENT TODAY
            </span>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">0</div>
            <div className="text-[10px] font-bold text-emerald-500 flex items-center space-x-1 pt-0.5">
              <span>▲ 4.2%</span>
              <span className="text-muted-foreground font-normal">0.0% of workforce</span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-7 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 25">
              <path d="M 0 10 Q 30 8, 60 10 T 100 20" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: ON LEAVE */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
              ON LEAVE
            </span>
            <div className="h-8 w-8 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">0</div>
            <div className="text-[10px] font-bold text-emerald-500 flex items-center space-x-1 pt-0.5">
              <span>▲ 0%</span>
              <span className="text-muted-foreground font-normal">0 sick, 0 casual, 0 annual</span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-7 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 25">
              <path d="M 0 15 Q 35 12, 60 20 T 100 16" fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: ABSENT NOW */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
              ABSENT NOW
            </span>
            <div className="h-8 w-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">733</div>
            <div className="text-[10px] font-bold text-rose-500 flex items-center space-x-1 pt-0.5">
              <span>▼ 2.1%</span>
              <span className="text-muted-foreground font-normal">incl. field &amp; remote</span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-7 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 25">
              <path d="M 0 18 Q 30 18, 60 17 T 80 12 L 100 22" fill="none" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 5: NEW JOINERS */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
              NEW JOINERS
            </span>
            <div className="h-8 w-8 rounded-full bg-lime-500/10 text-lime-500 flex items-center justify-center">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">4</div>
            <div className="text-[10px] font-bold text-emerald-500 flex items-center space-x-1 pt-0.5">
              <span>▲ +4</span>
              <span className="text-muted-foreground font-normal">in filter range</span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-7 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 25">
              <path d="M 0 20 L 25 15 L 50 10 L 75 16 L 100 8" fill="none" stroke="#84CC16" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 6: EVP SUBMISSIONS */}
        <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
              EVP SUBMISSIONS
            </span>
            <div className="h-8 w-8 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground tracking-tight">9</div>
            <div className="text-[10px] font-bold text-emerald-500 flex items-center space-x-1 pt-0.5">
              <span>▲ +2</span>
              <span className="text-muted-foreground font-normal">volunteering program</span>
            </div>
          </div>
          {/* Sparkline */}
          <div className="h-7 w-full pt-1">
            <svg className="w-full h-full" viewBox="0 0 100 25">
              <path d="M 0 18 Q 30 14, 50 16 T 80 10 L 100 15" fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── 3. GENDER DISTRIBUTION CARD ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-foreground">Gender Distribution</h2>
            <p className="text-xs text-muted-foreground font-medium">Workforce composition</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-foreground">742</div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              EMPLOYEES
            </div>
          </div>
        </div>

        {/* Multi-color segment progress bar */}
        <div className="h-3 w-full bg-surface rounded-full overflow-hidden flex">
          <div className="h-full bg-sky-500" style={{ width: '55.0%' }} title="Male (55.0%)" />
          <div className="h-full bg-amber-500" style={{ width: '43.9%' }} title="Female (43.9%)" />
          <div className="h-full bg-slate-400" style={{ width: '1.1%' }} title="Other / Undisclosed (0.9%)" />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/50 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span className="font-semibold text-muted-foreground">Male</span>
            </div>
            <span className="font-extrabold text-foreground">408 (55.0%)</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="font-semibold text-muted-foreground">Female</span>
            </div>
            <span className="font-extrabold text-foreground">326 (43.9%)</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <span className="font-semibold text-muted-foreground">Other / Undisclosed</span>
            </div>
            <span className="font-extrabold text-foreground">7 (0.9%)</span>
          </div>
        </div>
      </div>

      {/* ── 4. LOWER 2-COLUMN GRID (Attendance Intelligence & Headcount) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Attendance Intelligence */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-foreground">Attendance Intelligence</h2>
              <p className="text-xs text-muted-foreground font-medium">Performance based on month to date</p>
            </div>

            {/* Filter Toggle Pills */}
            <div className="inline-flex p-1 rounded-xl bg-surface border border-border/80 self-start sm:self-auto">
              {(['TODAY', 'YESTERDAY', 'MTD'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveAttendanceFilter(mode)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase transition cursor-pointer ${
                    activeAttendanceFilter === mode
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="pt-4 space-y-2">
            <div className="h-44 w-full flex items-end justify-between gap-4 px-6 border-b border-border/60 pb-2">
              {/* Wk 1 */}
              <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-8 rounded-t-lg bg-emerald-500 h-[75%] relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-2 bg-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">Wk 1</span>
              </div>

              {/* Wk 2 */}
              <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-8 rounded-t-lg bg-emerald-500 h-[78%] relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-2 bg-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">Wk 2</span>
              </div>

              {/* Wk 3 */}
              <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-8 rounded-t-lg bg-emerald-500 h-[74%] relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-2 bg-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">Wk 3</span>
              </div>

              {/* Wk 4 (partial) */}
              <div className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-8 rounded-t-lg bg-emerald-500 h-[30%] relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">Wk 4 (partial)</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-4 pt-2 text-[10px] font-bold">
              <div className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span className="text-muted-foreground">Absent</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">Late</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">On leave</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">On-time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card B: Headcount by Department */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-foreground">Headcount by Department</h2>
              <p className="text-xs text-muted-foreground font-medium">Top departments - selected organization</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-surface border border-border text-muted-foreground">
              5 Depts
            </span>
          </div>

          {/* Horizontal Bar Chart List */}
          <div className="space-y-4 pt-2">
            {/* Dept 1 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Programs &amp; Education</span>
                <span className="text-foreground font-extrabold">312 (42.0%)</span>
              </div>
              <div className="h-4 w-full bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            {/* Dept 2 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Digital School Project</span>
                <span className="text-foreground font-extrabold">198 (26.7%)</span>
              </div>
              <div className="h-4 w-full bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>

            {/* Dept 3 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Finance &amp; Accounts</span>
                <span className="text-foreground font-extrabold">85 (11.5%)</span>
              </div>
              <div className="h-4 w-full bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '40%' }} />
              </div>
            </div>

            {/* Dept 4 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Child Welfare</span>
                <span className="text-foreground font-extrabold">64 (8.6%)</span>
              </div>
              <div className="h-4 w-full bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '30%' }} />
              </div>
            </div>

            {/* Dept 5 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Founder&apos;s Office</span>
                <span className="text-foreground font-extrabold">42 (5.7%)</span>
              </div>
              <div className="h-4 w-full bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '22%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
