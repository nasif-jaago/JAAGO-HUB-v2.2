'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabase } from '@/lib/supabase-auth';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  Fingerprint,
  Award,
  DollarSign,
  FileText,
  BarChart3,
  Megaphone,
  ShieldAlert,
  Settings,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Bell,
  HelpCircle,
  Search,
  Sun,
  Moon,
  Coffee,
  Menu,
} from 'lucide-react';

export type ThemeMode = 'dark' | 'light' | 'espresso';

export default function PnCLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Client-Side ERP Auth State Listener
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          window.location.href = '/login';
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Auto-hide after 3 seconds on initial load
  useEffect(() => {
    startAutoHideTimer();
    return () => {
      clearAutoHideTimer();
    };
  }, []);

  const startAutoHideTimer = () => {
    clearAutoHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setSidebarCollapsed(true);
    }, 3000);
  };

  const clearAutoHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearAutoHideTimer();
    setSidebarCollapsed(false);
  };

  const handleMouseLeave = () => {
    startAutoHideTimer();
  };

  // Load saved theme or sync from DOM on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('jaago_theme') as ThemeMode | null;
      const root = document.documentElement;
      if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'espresso') {
        root.classList.remove('dark', 'light', 'espresso');
        if (savedTheme !== 'light') {
          root.classList.add(savedTheme);
        }
        setTheme(savedTheme);
      } else if (root.classList.contains('espresso')) {
        setTheme('espresso');
      } else if (root.classList.contains('dark')) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    }
  }, []);

  const cycleTheme = () => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'espresso');
    let nextTheme: ThemeMode;
    if (theme === 'dark') {
      nextTheme = 'light';
    } else if (theme === 'light') {
      nextTheme = 'espresso';
      root.classList.add('espresso');
    } else {
      nextTheme = 'dark';
      root.classList.add('dark');
    }
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jaago_theme', nextTheme);
    }
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    organization: false,
    timeOff: false,
    attendance: false,
    appraisals: false,
    payroll: false,
    requests: false,
    reports: false,
    settings: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getBreadcrumb = () => {
    if (pathname.includes('/employees')) return 'Employees';
    if (pathname.includes('/organization')) return 'Organization & Branches';
    if (pathname.includes('/designations')) return 'Designations';
    if (pathname.includes('/teams')) return 'Teams';
    if (pathname.includes('/departments')) return 'Departments';
    if (pathname.includes('/projects')) return 'Projects';
    if (pathname.includes('/insurance')) return 'Insurance Info';
    if (pathname.includes('/attendance/shifts')) return 'Working Hours & Schedules';
    if (pathname.includes('/attendance/logs')) return 'Attendance Logs';
    if (pathname.includes('/attendance/on-duty')) return 'On Duty Logs';
    if (pathname.includes('/attendance/report')) return 'Attendance Report';
    if (pathname.includes('/attendance')) return 'Attendance';
    if (pathname.includes('/time-off/requests')) return 'Leave Requests';
    if (pathname.includes('/time-off/allocations')) return 'Leave Allocations';
    if (pathname.includes('/time-off/holidays')) return 'Public Holidays';
    if (pathname.includes('/time-off/config')) return 'Leave Configuration';
    if (pathname.includes('/time-off') || pathname.includes('/leave')) return 'Leave Calendar';
    return 'Dashboard';
  };



  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased font-sans select-none relative overflow-x-hidden">
      {/* ── Left Edge Hit Sensor Panel (Hovering here opens sidebar) ── */}
      <div
        onMouseEnter={handleMouseEnter}
        className="fixed top-0 bottom-0 left-0 w-4 md:w-5 z-50 pointer-events-auto cursor-pointer"
        title="Hover left edge to open sidebar"
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── LEFT SIDEBAR (People & Culture HR Management) ─────────  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 bottom-0 left-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col justify-between select-none shadow-2xl overflow-hidden ${
          sidebarCollapsed
            ? '-translate-x-full w-72 pointer-events-none opacity-0'
            : 'translate-x-0 w-72 pointer-events-auto opacity-100'
        }`}
      >
        {/* Top Header Card: P&C Brand Badge */}
        <div className="p-4 border-b border-sidebar-border space-y-3 bg-surface/30 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-[#26180E] border border-primary/40 text-primary flex items-center justify-center font-black text-sm shadow-md flex-shrink-0">
                P&amp;C
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-foreground leading-tight">
                  People and Culture
                </h1>
                <p className="text-[11px] font-semibold text-muted-foreground">
                  v1.0 HR Management
                </p>
              </div>
            </div>

            {/* Small Hide Button in Top-Right Corner */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSidebarCollapsed(true);
              }}
              className="p-1 rounded-lg bg-surface/80 hover:bg-surface border border-border/80 text-muted-foreground hover:text-foreground transition shadow-sm cursor-pointer"
              title="Hide Sidebar"
              aria-label="Hide Sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
            </button>
          </div>

          {/* Back to JAAGO HUB button */}
          <Link
            href="/dashboard"
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-foreground bg-surface border border-border/80 hover:border-primary/50 hover:bg-surface/80 transition shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-primary" />
            <span className="uppercase tracking-wider text-[10px]">BACK TO JAAGO HUB</span>
          </Link>
        </div>

        {/* Middle Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 no-scrollbar">
          {/* DASHBOARD */}
          <Link
            href="/pnc"
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              pathname === '/pnc'
                ? 'bg-primary/20 text-foreground font-black border border-primary/40'
                : 'text-sidebar-foreground hover:bg-surface hover:text-primary'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-foreground flex-shrink-0" />
            <span className="uppercase tracking-wider text-[11px]">DASHBOARD</span>
          </Link>

          {/* EMPLOYEES */}
          <Link
            href="/pnc/employees"
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              pathname === '/pnc/employees'
                ? 'bg-primary/20 text-foreground font-black border border-primary/40'
                : 'text-sidebar-foreground hover:bg-surface hover:text-primary'
            }`}
          >
            <Users className="h-4 w-4 text-foreground flex-shrink-0" />
            <span className="uppercase tracking-wider text-[11px]">EMPLOYEES</span>
          </Link>

          {/* ORGANIZATION ACCORDION */}
          <div className="space-y-0.5">
            <button
              onClick={() => toggleSection('organization')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                pathname.startsWith('/pnc/organization') ||
                pathname.startsWith('/pnc/designations') ||
                pathname.startsWith('/pnc/teams') ||
                pathname.startsWith('/pnc/departments') ||
                pathname.startsWith('/pnc/projects') ||
                pathname.startsWith('/pnc/insurance')
                  ? 'text-primary font-black bg-primary/10'
                  : 'text-sidebar-foreground hover:bg-surface'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Building2 className={`h-4 w-4 flex-shrink-0 ${
                  pathname.startsWith('/pnc/organization') ||
                  pathname.startsWith('/pnc/designations') ||
                  pathname.startsWith('/pnc/teams') ||
                  pathname.startsWith('/pnc/departments') ||
                  pathname.startsWith('/pnc/projects') ||
                  pathname.startsWith('/pnc/insurance')
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`} />
                <span className="uppercase tracking-wider text-[11px]">ORGANIZATION</span>
              </div>
              {openSections['organization'] ||
              pathname.startsWith('/pnc/organization') ||
              pathname.startsWith('/pnc/designations') ||
              pathname.startsWith('/pnc/teams') ||
              pathname.startsWith('/pnc/departments') ||
              pathname.startsWith('/pnc/projects') ||
              pathname.startsWith('/pnc/insurance') ? (
                <ChevronDown className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
            {(openSections['organization'] ||
              pathname.startsWith('/pnc/organization') ||
              pathname.startsWith('/pnc/designations') ||
              pathname.startsWith('/pnc/teams') ||
              pathname.startsWith('/pnc/departments') ||
              pathname.startsWith('/pnc/projects') ||
              pathname.startsWith('/pnc/insurance')) && (
              <div className="pl-6 space-y-1 text-xs text-muted-foreground border-l border-sidebar-border/60 ml-4 py-1">
                <Link
                  href="/pnc/organization"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/organization'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Organization &amp; Branches
                </Link>
                <Link
                  href="/pnc/designations"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/designations'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Designations
                </Link>
                <Link
                  href="/pnc/teams"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/teams'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Teams
                </Link>
                <Link
                  href="/pnc/departments"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/departments'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Departments
                </Link>
                <Link
                  href="/pnc/projects"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/projects'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Projects
                </Link>
                <Link
                  href="/pnc/insurance"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/insurance'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Insurance Info
                </Link>
              </div>
            )}
          </div>

          {/* TIME OFF ACCORDION */}
          <div className="space-y-0.5">
            <button
              onClick={() => toggleSection('timeOff')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                pathname.startsWith('/pnc/time-off')
                  ? 'text-primary font-black bg-primary/10'
                  : 'text-sidebar-foreground hover:bg-surface'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Calendar className={`h-4 w-4 flex-shrink-0 ${
                  pathname.startsWith('/pnc/time-off')
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`} />
                <span className="uppercase tracking-wider text-[11px]">TIME OFF</span>
              </div>
              {openSections['timeOff'] || pathname.startsWith('/pnc/time-off') ? (
                <ChevronDown className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
            {(openSections['timeOff'] || pathname.startsWith('/pnc/time-off')) && (
              <div className="pl-6 space-y-1 text-xs text-muted-foreground border-l border-sidebar-border/60 ml-4 py-1">
                <Link
                  href="/pnc/time-off/calendar"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/time-off/calendar' || pathname === '/pnc/time-off'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Leave Calendar
                </Link>
                <Link
                  href="/leaves"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/leaves'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; My Leave
                </Link>
                <Link
                  href="/pnc/time-off/requests"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/time-off/requests'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Leave Requests
                </Link>
                <Link
                  href="/pnc/time-off/allocations"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/time-off/allocations'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Allocations
                </Link>
                <Link
                  href="/pnc/time-off/holidays"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/time-off/holidays'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Public Holidays
                </Link>
                <Link
                  href="/pnc/time-off/config"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/time-off/config'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Leave Config
                </Link>
              </div>
            )}
          </div>

          {/* ATTENDANCE ACCORDION */}
          <div className="space-y-0.5">
            <button
              onClick={() => toggleSection('attendance')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                pathname.startsWith('/pnc/attendance')
                  ? 'text-primary font-black bg-primary/10'
                  : 'text-sidebar-foreground hover:bg-surface'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Fingerprint
                  className={`h-4 w-4 flex-shrink-0 ${
                    pathname.startsWith('/pnc/attendance')
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                />
                <span className="uppercase tracking-wider text-[11px]">ATTENDANCE</span>
              </div>
              {openSections['attendance'] || pathname.startsWith('/pnc/attendance') ? (
                <ChevronDown className="h-3.5 w-3.5 text-primary" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
            {(openSections['attendance'] || pathname.startsWith('/pnc/attendance')) && (
              <div className="pl-6 space-y-1 text-xs text-muted-foreground border-l border-sidebar-border/60 ml-4 py-1">
                <Link
                  href="/pnc/attendance/logs"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/attendance/logs' || pathname === '/pnc/attendance'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Attendance Logs
                </Link>
                <Link
                  href="/pnc/attendance/on-duty"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/attendance/on-duty'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; On Duty Logs
                </Link>
                <Link
                  href="/pnc/attendance/report"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/attendance/report'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Attendance Report
                </Link>
                <Link
                  href="/pnc/attendance/shifts"
                  className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                    pathname === '/pnc/attendance/shifts'
                      ? 'text-primary font-black bg-primary/15'
                      : 'hover:text-primary hover:bg-surface/60'
                  }`}
                >
                  &bull; Working Hours &amp; Schedules
                </Link>
              </div>
            )}
          </div>

          {/* APPRAISALS */}
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-sidebar-foreground hover:bg-surface transition cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <Award className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">APPRAISALS</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* PAYROLL */}
          <div className="space-y-0.5">
            <button
              onClick={() => toggleSection('payroll')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-sidebar-foreground hover:bg-surface transition cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="uppercase tracking-wider text-[11px]">PAYROLL</span>
              </div>
              {openSections['payroll'] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {openSections['payroll'] && (
              <div className="pl-6 space-y-1 text-xs text-muted-foreground border-l border-sidebar-border/60 ml-4 py-1">
                <div className="py-1 uppercase text-[10px] font-bold">&bull; Contracts</div>
                <div className="py-1 uppercase text-[10px] font-bold">&bull; Pay Runs</div>
                <div className="py-1 uppercase text-[10px] font-bold">&bull; Payslips</div>
              </div>
            )}
          </div>

          {/* REQUESTS */}
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-sidebar-foreground hover:bg-surface transition cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">REQUESTS</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* REPORTS */}
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-sidebar-foreground hover:bg-surface transition cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">REPORTS</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* ANNOUNCEMENTS */}
          <div className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-sidebar-foreground hover:bg-surface transition cursor-pointer">
            <Megaphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="uppercase tracking-wider text-[11px]">ANNOUNCEMENTS</span>
          </div>

          {/* U.ROLE */}
          <div className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-sidebar-foreground hover:bg-surface transition cursor-pointer">
            <ShieldAlert className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="uppercase tracking-wider text-[11px]">U.ROLE</span>
          </div>

          {/* SETTINGS */}
          <div className="space-y-0.5">
            <button
              onClick={() => toggleSection('settings')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-sidebar-foreground hover:bg-surface transition cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="uppercase tracking-wider text-[11px]">SETTINGS</span>
              </div>
              {openSections['settings'] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            {openSections['settings'] && (
              <div className="pl-6 space-y-1 text-xs text-muted-foreground border-l border-sidebar-border/60 ml-4 py-1">
                <div className="py-1 uppercase text-[10px] font-bold">&bull; Configuration</div>
                <div className="py-1 uppercase text-[10px] font-bold">&bull; Biotime Control Center</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom User Card */}
        <div className="p-3.5 border-t border-sidebar-border flex items-center space-x-3 bg-surface/20">
          <div className="h-8 w-8 rounded-full bg-[#26180E] text-primary flex items-center justify-center font-black text-xs shadow-sm">
            N
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-foreground truncate">
              Nasif Kamal | Coordinator, T...
            </div>
            <div className="text-[10px] font-semibold text-muted-foreground">
              Super Admin
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MAIN CONTENT WORKSPACE ────────────────────────────────  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          !sidebarCollapsed ? 'md:pl-72' : 'pl-0'
        }`}
      >
        {/* Top Header Bar */}
        <header className="h-16 border-b border-header-border bg-header text-header-foreground px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3 text-xs sm:text-sm font-bold">
            <button
              onClick={() => {
                if (sidebarCollapsed) {
                  handleMouseEnter();
                } else {
                  setSidebarCollapsed(true);
                }
              }}
              className="p-1.5 rounded-xl hover:bg-surface/50 text-header-foreground transition cursor-pointer"
              title="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-primary">People and Culture</span>
              <span className="text-header-foreground/40">&gt;</span>
              <span className="text-foreground">{getBreadcrumb()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-3">
            {/* Theme Mode Switcher (3-Way: Dark / Light / Espresso) */}
            <button
              onClick={cycleTheme}
              className="p-2 rounded-xl text-header-foreground/80 hover:text-header-foreground hover:bg-surface/30 transition flex items-center justify-center cursor-pointer"
              title={`Theme: ${
                theme === 'dark'
                  ? 'Matte Black (Click for Light Mode)'
                  : theme === 'light'
                  ? 'Warm Cream (Click for Espresso Mode)'
                  : 'Warm Espresso (Click for Dark Mode)'
              }`}
              aria-label="Toggle Theme Mode"
            >
              {theme === 'dark' && <Moon className="h-4 w-4 text-primary" />}
              {theme === 'light' && <Sun className="h-4 w-4 text-amber-500" />}
              {theme === 'espresso' && <Coffee className="h-4 w-4 text-amber-400" />}
            </button>

            <button className="p-2 rounded-xl text-header-foreground/80 hover:text-primary transition cursor-pointer" title="Search">
              <Search className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-xl text-header-foreground/80 hover:text-primary transition cursor-pointer" title="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-xl text-header-foreground/80 hover:text-primary transition cursor-pointer" title="Help">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
