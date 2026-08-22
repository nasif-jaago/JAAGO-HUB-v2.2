'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Flag,
  Calendar,
  Radio,
  Zap,
  ArrowRight,
  LogOut,
  CheckCircle2,
  Building2,
  MapPin,
  Briefcase,
  Inbox,
  Timer,
} from 'lucide-react';

export default function DashboardPage() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [user, setUser] = useState({
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator',
    department: "Founder's Office",
    manager: 'S M Nayeem Rahman',
    organization: 'JAAGO Foundation Trust',
  });

  // Fast hydration of attendance status & elapsed timer from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('jaago_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.fullName) {
            setUser({
              fullName: parsed.fullName,
              jobTitle: parsed.jobTitle || 'Coordinator',
              department: parsed.department || "Founder's Office",
              manager: parsed.manager || 'S M Nayeem Rahman',
              organization: 'JAAGO Foundation Trust',
            });
          }
        }

        const savedState = localStorage.getItem('jaago_is_checked_in');
        const savedTime = localStorage.getItem('jaago_checkin_timestamp');
        if (savedState === 'true' && savedTime) {
          setIsCheckedIn(true);
          setCheckInTime(
            new Date(parseInt(savedTime, 10)).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          );
          const diffSeconds = Math.max(0, Math.floor((Date.now() - parseInt(savedTime, 10)) / 1000));
          setElapsedSeconds(diffSeconds);
        }
      } catch {
        // Fallback gracefully
      }
    }
  }, []);

  // Live timer tick when checked in
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCheckedIn) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCheckedIn]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':');
  };

  const handleToggleCheckIn = () => {
    if (!isCheckedIn) {
      const now = Date.now();
      const timeStr = new Date(now).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setIsCheckedIn(true);
      setCheckInTime(timeStr);
      setElapsedSeconds(0);
      if (typeof window !== 'undefined') {
        localStorage.setItem('jaago_is_checked_in', 'true');
        localStorage.setItem('jaago_checkin_timestamp', now.toString());
      }
    } else {
      setIsCheckedIn(false);
      setCheckInTime(null);
      setElapsedSeconds(0);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jaago_is_checked_in');
        localStorage.removeItem('jaago_checkin_timestamp');
      }
    }
  };

  const firstName = user.fullName.split(' ')[0] || 'Nasif';

  return (
    <div className="max-w-[1700px] mx-auto text-foreground pb-24 md:pb-28 select-none">
      {/* ========================================================================= */}
      {/* 📱 MOBILE VIEW ONLY (Strictly based on Reference Images 2 & 3)            */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4 pt-1">
        {/* User Greeting Header */}
        <div className="space-y-0.5 px-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Hi, {firstName}!
          </h1>
          <p className="text-xs font-semibold text-muted-foreground">
            {user.jobTitle}
          </p>
        </div>

        <div className="h-px bg-border/60 my-2" />

        {/* ── CARD 1: LIVE STATUS TIMER ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md text-center space-y-2 relative overflow-hidden">
          {/* Header Lightning Bolt */}
          <div className="flex items-center justify-center space-x-1.5 text-xs font-black uppercase text-amber-500 tracking-wider">
            <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span>LIVE STATUS</span>
          </div>

          {/* Large Digital Clock Display */}
          <div className="text-5xl font-black tracking-tight text-foreground font-mono py-1">
            {formatTime(elapsedSeconds)}
          </div>

          {/* Subtitle */}
          <div className="text-xs font-medium text-muted-foreground">
            Working Hours Today
          </div>
        </div>

        {/* ── CARD 2: BIG INSTANT ONE-TAP CHECK-IN / CHECK-OUT BUTTON ── */}
        <div className="space-y-2">
          <button
            onClick={handleToggleCheckIn}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2.5 transition-all duration-200 active:scale-[0.98] cursor-pointer select-none ${
              !isCheckedIn
                ? 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-emerald-500/25'
                : 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-rose-500/25'
            }`}
          >
            {!isCheckedIn ? (
              <>
                <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                <span>CHECK IN NOW</span>
              </>
            ) : (
              <>
                <LogOut className="h-5 w-5 stroke-[2.5]" />
                <span>CHECK OUT NOW</span>
              </>
            )}
          </button>

          {/* Live Check-In Context Pill */}
          {isCheckedIn && (
            <div className="flex items-center justify-center space-x-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-xl animate-in fade-in">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Checked in at {checkInTime || '09:05 AM'} &bull; Banani Head Office</span>
            </div>
          )}
        </div>

        {/* ── CARD 3: MONTHLY ATTENDANCE SUMMARY ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-5">
          {/* Header */}
          <div className="flex items-center space-x-2 text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
            <Clock className="h-4 w-4" />
            <span>MONTHLY ATTENDANCE SUMMARY</span>
          </div>

          {/* 3-Column Top Stats */}
          <div className="grid grid-cols-3 gap-2 text-left">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Working Days</div>
              <div className="text-base font-black text-foreground pt-1">13 / 15</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Late Days</div>
              <div className="text-base font-black text-rose-500 pt-1">6</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Auto Check</div>
              <div className="text-base font-black text-amber-500 pt-1">8</div>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Horizontal Progress Bars */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">On Time Performance</span>
                <span className="text-emerald-500 font-black">53.8%</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '53.8%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">Late Penalty</span>
                <span className="text-rose-500 font-black">46.2%</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '46.2%' }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground">Auto Check–out Rate</span>
                <span className="text-amber-500 font-black">61.5%</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '61.5%' }} />
              </div>
            </div>
          </div>

          {/* Smooth Daily Trend Chart */}
          <div className="pt-2">
            <div className="h-24 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 70">
                <defs>
                  <linearGradient id="mobileTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <path
                  d="M 20 25 Q 60 55, 100 48 T 160 30 T 220 28 T 280 30 L 280 70 L 20 70 Z"
                  fill="url(#mobileTrendGrad)"
                />

                <path
                  d="M 20 25 Q 60 55, 100 48 T 160 30 T 220 28 T 280 30"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <circle cx="20" cy="25" r="3.5" fill="#EF4444" />
                <circle cx="100" cy="48" r="3.5" fill="#10B981" />
                <circle cx="160" cy="30" r="3.5" fill="#EF4444" />
                <circle cx="220" cy="28" r="3.5" fill="#10B981" />
                <circle cx="280" cy="30" r="3.5" fill="#EF4444" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-1 px-2">
              <span>11 Aug</span>
              <span>13 Aug</span>
              <span>18 Aug</span>
              <span>20 Aug</span>
            </div>
          </div>

          <div className="h-px bg-border/60" />

          {/* Summary Row */}
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Avg Hours/Day</div>
              <div className="text-base font-black text-blue-500 dark:text-blue-400 pt-0.5">11.2h</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground">Total Hours</div>
              <div className="text-base font-black text-amber-500 pt-0.5">145.6h</div>
            </div>
          </div>

          <div className="w-full py-2.5 rounded-full border border-rose-400/80 bg-rose-500/10 text-rose-500 font-black text-xs uppercase tracking-wider text-center flex items-center justify-center">
            NEEDS IMPROVEMENT
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 💻 DESKTOP, LAPTOP & TABLET VIEW ONLY (Pixel-Faithful to Provided Design)  */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-5">
        {/* ── 1. USER PROFILE HERO CARD ── */}
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 relative">
          <div className="flex items-center space-x-5">
            {/* Avatar inside Yellow Border Card with Green Online Dot */}
            <div className="relative flex-shrink-0">
              <div className="h-20 w-20 rounded-2xl border-2 border-primary bg-primary/10 overflow-hidden flex items-center justify-center shadow-md">
                <div className="h-full w-full bg-gradient-to-br from-amber-400/20 via-primary/30 to-amber-600/30 flex items-center justify-center text-primary font-black text-2xl">
                  NK
                </div>
              </div>
              {/* Online Green Indicator Dot */}
              <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card shadow-sm animate-pulse" />
            </div>

            {/* User Credentials & Metadata */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {user.fullName}
              </h1>
              <div className="text-sm font-semibold text-muted-foreground">
                {user.jobTitle}
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-500 pt-0.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>{user.organization}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground pt-0.5">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" />
                  <span>{user.department}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground/80" />
                  <span>Manager: {user.manager}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right-Side Attendance Radar & Check-In / Check-Out Capsule Boxes */}
          <div className="flex items-center space-x-3.5 w-full xl:w-auto justify-end">
            {/* Radar Pulse Capsule */}
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-sm flex-shrink-0">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>

            {/* Check In Box */}
            <button
              onClick={handleToggleCheckIn}
              className={`px-4 py-2.5 rounded-2xl border transition text-left flex items-center space-x-3 cursor-pointer shadow-sm ${
                isCheckedIn
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-surface border-border hover:border-primary/50 text-foreground'
              }`}
            >
              <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  CHECK IN
                </div>
                <div className="text-xs font-black font-mono">
                  {isCheckedIn ? checkInTime || '09:05 AM' : '--:--'}
                </div>
              </div>
              <span className="text-muted-foreground/60 text-xs font-bold">-</span>
            </button>

            {/* Check Out Box */}
            <button
              onClick={handleToggleCheckIn}
              disabled={!isCheckedIn}
              className={`px-4 py-2.5 rounded-2xl border transition text-left flex items-center space-x-3 ${
                isCheckedIn
                  ? 'bg-surface border-border hover:border-destructive/50 text-foreground cursor-pointer shadow-sm'
                  : 'bg-surface/50 border-border/60 text-muted-foreground/50 cursor-not-allowed'
              }`}
            >
              <Flag className="h-4 w-4 text-destructive/80 flex-shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  CHECK OUT
                </div>
                <div className="text-xs font-black font-mono">--:--</div>
              </div>
              <span className="text-muted-foreground/60 text-xs font-bold">-</span>
            </button>
          </div>
        </div>

        {/* ── 2. ROW OF 4 METRIC KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Card 1: Working Hours Today */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground">
                Target: 8.0h
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                Working Hours Today
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-foreground pt-1">
                {formatTime(elapsedSeconds)}
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Schedule: General Schedule (10:00 AM – 6:00 PM)
            </div>
          </div>

          {/* Card 2: On Duty Status */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Timer className="h-5 w-5 text-amber-500" />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground">
                Recent Request
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                On Duty Status
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-foreground pt-1">
                4 Pending
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Awaiting supervisor verification
            </div>
          </div>

          {/* Card 3: Available Time Off */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground">
                In balance
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                Available Time Off
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-foreground pt-1 flex items-baseline space-x-1.5">
                <span>61</span>
                <span className="text-lg font-bold text-muted-foreground">Days</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Annual &bull; Casual &bull; Sick Leave Pool
            </div>
          </div>

          {/* Card 4: Active Approvals */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-border text-muted-foreground">
                Action required
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground">
                Active Approvals
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-foreground pt-1">
                2
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
              Purchase requisitions &bull; Leave
            </div>
          </div>
        </div>

        {/* ── 4. LOWER 3-COLUMN SECTION (Strictly from Image) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* ── COLUMN 1: MONTHLY ATTENDANCE SUMMARY ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md space-y-5 flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-black uppercase text-foreground tracking-wider">
                <Clock className="h-4 w-4 text-emerald-500" />
                <span>Monthly Attendance Summary</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-rose-500 bg-rose-500/10 border border-rose-400/30">
                NEEDS IMPROVEMENT
              </span>
            </div>

            {/* 3-Column Top Stats */}
            <div className="grid grid-cols-3 gap-2 text-left">
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Working Days</div>
                <div className="text-lg font-black text-foreground pt-1">14 / 15</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-emerald-500 pt-0.5">
                  PRESENT / TARGET
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Late Days</div>
                <div className="text-lg font-black text-rose-500 pt-1">6</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-rose-500 pt-0.5">
                  LATE ENTRIES
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground">Auto Check</div>
                <div className="text-lg font-black text-amber-500 pt-1">8</div>
                <div className="text-[9px] font-black uppercase tracking-wider text-amber-500 pt-0.5">
                  AUTO CHECKOUTS
                </div>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* Horizontal Progress Bars */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">On-Time Performance</span>
                  <span className="text-emerald-500 font-black">57.1%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '57.1%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">Late Penalty</span>
                  <span className="text-rose-500 font-black">42.9%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '42.9%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">Auto Check–out Rate</span>
                  <span className="text-amber-500 font-black">57.1%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/40">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '57.1%' }} />
                </div>
              </div>
            </div>

            {/* Smooth Daily Trend Line Chart Matching Reference Images */}
            <div className="pt-2">
              <div className="h-28 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 80">
                  <defs>
                    <linearGradient id="desktopTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.30" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Shaded Area Under Curve */}
                  <path
                    d="M 20 30 Q 60 28, 100 60 T 160 30 T 220 52 T 280 32 T 340 28 T 390 35 L 390 80 L 20 80 Z"
                    fill="url(#desktopTrendGrad)"
                  />

                  {/* Curved Smooth Spline */}
                  <path
                    d="M 20 30 Q 60 28, 100 60 T 160 30 T 220 52 T 280 32 T 340 28 T 390 35"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Points on Curve */}
                  <circle cx="20" cy="30" r="3.5" fill="#10B981" />
                  <circle cx="60" cy="28" r="3.5" fill="#10B981" />
                  <circle cx="100" cy="60" r="3.5" fill="#EF4444" />
                  <circle cx="160" cy="30" r="3.5" fill="#EF4444" />
                  <circle cx="220" cy="52" r="3.5" fill="#10B981" />
                  <circle cx="280" cy="32" r="3.5" fill="#10B981" />
                  <circle cx="340" cy="28" r="3.5" fill="#10B981" />
                  <circle cx="390" cy="35" r="3.5" fill="#EF4444" />
                </svg>
              </div>

              {/* X-Axis Dates */}
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-1 px-1">
                <span>06 Aug</span>
                <span>09 Aug</span>
                <span>10 Aug</span>
                <span>11 Aug</span>
                <span>12 Aug</span>
                <span>13 Aug</span>
                <span>17 Aug</span>
                <span>18 Aug</span>
                <span>20 Aug</span>
              </div>
            </div>

            <div className="h-px bg-border/60" />

            {/* Bottom Row Summary */}
            <div className="flex items-center justify-between text-xs font-bold">
              <div className="text-foreground">
                Avg Hours: <span className="text-blue-500 font-mono font-black">11.0h</span>
              </div>
              <div className="text-foreground">
                Total Worked: <span className="text-amber-500 font-mono font-black">153.6h</span>
              </div>
            </div>
          </div>

          {/* ── COLUMN 2: UPCOMING HOLIDAYS ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col justify-between space-y-6">
            <div className="flex items-center space-x-2 text-xs font-black uppercase text-foreground tracking-wider">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Upcoming Holidays</span>
            </div>

            {/* Empty State / Notice */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                No upcoming holidays found
              </p>
            </div>

            {/* Bottom Legend */}
            <div className="flex items-center justify-start space-x-4 text-xs font-semibold text-muted-foreground pt-2 border-t border-border/60">
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>This Week</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>This Month</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>Later</span>
              </div>
            </div>
          </div>

          {/* ── COLUMN 3: HR ANNOUNCEMENT BOARD ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-md flex flex-col justify-between space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Zap className="h-4 w-4 fill-purple-400" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                HR Announcement Board
              </h3>
            </div>

            {/* Empty State / All Caught Up */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-muted-foreground">
                <Inbox className="h-7 w-7 stroke-[1.5]" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">All Caught Up!</div>
                <div className="text-xs text-muted-foreground pt-0.5">
                  No active announcements for your department.
                </div>
              </div>
            </div>

            {/* Bottom Link */}
            <div className="pt-3 text-center border-t border-border/60">
              <button className="text-xs font-black uppercase tracking-wider text-purple-500 hover:text-purple-400 hover:underline transition">
                EXPLORE ALL ARCHIVES
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
