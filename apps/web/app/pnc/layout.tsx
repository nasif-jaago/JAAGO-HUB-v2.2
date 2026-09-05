'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSupabase, signOutUser } from '@/lib/supabase-auth';
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
  LogOut,
} from 'lucide-react';

import {
  fetchOrganizationsFromSupabase,
  fetchDepartmentsFromSupabase,
  OrganizationEntity,
  DepartmentItem,
} from '@/lib/supabase-organization';
import { fetchEmployeesFromSupabase } from '@/lib/supabase-employees';
import { hasPermission, hasModuleAccess, isDspOnlyScoped } from '@/lib/rbac-guard';
import { matchesSelectedOrg } from '@/lib/use-organization-scope';
import { RouteProgressBar } from '@/components/ui/route-progress-bar';

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

  // Global Organization & Department Selectors in Header
  const [organizations, setOrganizations] = useState<OrganizationEntity[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('ALL');
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  useEffect(() => {
    try {
      const savedOrg = localStorage.getItem('jaago_selected_org');
      if (savedOrg) setSelectedOrg(savedOrg);
      const savedDept = localStorage.getItem('jaago_selected_dept');
      if (savedDept) setSelectedDept(savedDept);
    } catch {}

    const loadOrgsAndDepts = async () => {
      try {
        const [orgs, depts, emps] = await Promise.all([
          fetchOrganizationsFromSupabase(),
          fetchDepartmentsFromSupabase(),
          fetchEmployeesFromSupabase(),
        ]);
        if (orgs) setOrganizations(orgs);

        const deptMap = new Map<string, DepartmentItem>();
        (depts || []).forEach((d) => {
          if (d.name && d.name.trim()) {
            deptMap.set(d.name.trim().toLowerCase(), d);
          }
        });

        // Ensure all departments assigned to any employee are also included
        (emps || []).forEach((e) => {
          if (e.department && e.department.trim()) {
            const key = e.department.trim().toLowerCase();
            if (!deptMap.has(key)) {
              deptMap.set(key, {
                id: `dept-${key.replace(/[^a-z0-9]+/g, '-')}`,
                name: e.department.trim(),
                code: e.department.trim().slice(0, 4).toUpperCase(),
                organizationName: e.organization || 'JAAGO Foundation',
                organizationId: orgs?.find((o) => o.name === e.organization)?.id || 'org-1',
                isArchived: false,
              });
            }
          }
        });

        setDepartments(Array.from(deptMap.values()));
      } catch (err) {
        console.warn('Error loading orgs and departments in layout:', err);
      }
    };

    loadOrgsAndDepts();

    const handleOrgSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setSelectedOrg(detail);
    };

    const handleDeptSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setSelectedDept(detail);
    };

    const handleEntityUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.entityType === 'organization' || detail?.entityType === 'department') {
        loadOrgsAndDepts();
      }
    };

    window.addEventListener('jaago_org_changed', handleOrgSync);
    window.addEventListener('jaago_dept_changed', handleDeptSync);
    window.addEventListener('jaago_departments_updated', loadOrgsAndDepts);
    window.addEventListener('jaago_employees_updated', loadOrgsAndDepts);
    window.addEventListener('jaago_entity_updated', handleEntityUpdate);
    window.addEventListener('storage', loadOrgsAndDepts);
    return () => {
      window.removeEventListener('jaago_org_changed', handleOrgSync);
      window.removeEventListener('jaago_dept_changed', handleDeptSync);
      window.removeEventListener('jaago_departments_updated', loadOrgsAndDepts);
      window.removeEventListener('jaago_employees_updated', loadOrgsAndDepts);
      window.removeEventListener('jaago_entity_updated', handleEntityUpdate);
      window.removeEventListener('storage', loadOrgsAndDepts);
    };
  }, []);

  const handleOrgChange = (newOrg: string) => {
    setSelectedOrg(newOrg);
    try {
      localStorage.setItem('jaago_selected_org', newOrg);
    } catch {}
    window.dispatchEvent(new CustomEvent('jaago_org_changed', { detail: newOrg }));
  };

  const [isDspScoped, setIsDspScoped] = useState(false);

  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    email?: string;
    employeeCode?: string;
    permissions?: string[];
    fullName: string;
    jobTitle: string;
    role: string;
    roles: string[];
    isSuperAdmin: boolean;
    isAdmin: boolean;
    avatarUrl?: string;
  }>({
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator',
    role: 'SUPER_ADMIN',
    roles: ['super_admin'],
    isSuperAdmin: true,
    isAdmin: true,
  });

  const handleSignOut = async () => {
    await signOutUser();
  };

  useEffect(() => {
    const dsp = isDspOnlyScoped(currentUser);
    setIsDspScoped(dsp);
    if (dsp) {
      setSelectedDept('Digital School Program');
    }
  }, [currentUser]);

  const handleDeptChange = (newDept: string) => {
    if (isDspScoped) return;
    setSelectedDept(newDept);
    try {
      localStorage.setItem('jaago_selected_dept', newDept);
    } catch {}
    window.dispatchEvent(new CustomEvent('jaago_dept_changed', { detail: newDept }));
  };

  const availableDepts = React.useMemo(() => {
    if (isDspScoped) {
      return ['Digital School Program'];
    }
    const deptMap = new Map<string, string>();
    departments.forEach((d) => {
      if (!d.name || d.isArchived) return;
      if (selectedOrg !== 'ALL') {
        const orgName = d.organizationName || organizations.find((o) => o.id === d.organizationId)?.name;
        if (orgName && !matchesSelectedOrg(orgName, selectedOrg)) return;
      }
      const key = d.name.trim().toLowerCase();
      if (!deptMap.has(key)) {
        deptMap.set(key, d.name.trim());
      }
    });
    return Array.from(deptMap.values()).sort((a, b) => a.localeCompare(b));
  }, [departments, selectedOrg, organizations, isDspScoped]);

  // Granular Dynamic RBAC Module Access State
  const [permissionsState, setPermissionsState] = useState<{
    canAccessDashboard: boolean;
    canAccessEmployees: boolean;
    canAccessOrg: boolean;
    canAccessTimeOff: boolean;
    canAccessAttendance: boolean;
    canAccessAppraisals: boolean;
    canAccessPayroll: boolean;
    canAccessRequests: boolean;
    canAccessReports: boolean;
    canAccessAnnouncements: boolean;
    canAccessRbac: boolean;
    canAccessAnyPnC: boolean;
    isLoaded: boolean;
  }>({
    canAccessDashboard: false,
    canAccessEmployees: false,
    canAccessOrg: false,
    canAccessTimeOff: false,
    canAccessAttendance: false,
    canAccessAppraisals: false,
    canAccessPayroll: false,
    canAccessRequests: false,
    canAccessReports: false,
    canAccessAnnouncements: false,
    canAccessRbac: false,
    canAccessAnyPnC: true,
    isLoaded: false,
  });

  // Client-Side ERP Auth State Listener & User Hydration
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();

    const loadSessionUser = () => {
      try {
        const raw = localStorage.getItem('jaago_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const rawRole = (parsed.role || (Array.isArray(parsed.roles) ? parsed.roles[0] : '') || 'USER').toString();
          const rawRoleUpper = rawRole.toUpperCase();
          const isSuper =
            parsed.isSuperAdmin === true ||
            rawRoleUpper === 'SUPER_ADMIN' ||
            rawRole.toLowerCase() === 'super_admin' ||
            Boolean(parsed.email && parsed.email.toLowerCase().includes('nasif.kamal'));

          const isAdmin =
            isSuper ||
            rawRoleUpper === 'ADMIN' ||
            rawRoleUpper === 'HR_MANAGER' ||
            rawRoleUpper === 'HR_ADMIN' ||
            rawRole.toLowerCase() === 'admin' ||
            rawRole.toLowerCase() === 'hr_manager' ||
            rawRole.toLowerCase() === 'coordinator';

          const canAccessDashboard = isSuper || isAdmin || hasPermission('reports.headcount.view', parsed) || hasPermission('hr.employees.view_all', parsed);
          const canAccessEmployees = isSuper || hasPermission('hr.employees.view_all', parsed) || hasPermission('hr.employees.view_dept', parsed);
          const canAccessOrg = isSuper || hasModuleAccess('org', parsed);
          const canAccessTimeOff = isSuper || hasModuleAccess('time_off', parsed);
          const canAccessAttendance = isSuper || hasModuleAccess('attendance', parsed);
          const canAccessAppraisals = isSuper || hasModuleAccess('appraisals', parsed);
          const canAccessPayroll = isSuper || hasModuleAccess('payroll', parsed);
          const canAccessRequests = isSuper || hasModuleAccess('requests', parsed);
          const canAccessReports = isSuper || hasModuleAccess('reports', parsed);
          const canAccessAnnouncements = isSuper || hasPermission('announcements.view', parsed);
          const canAccessRbac = isSuper || hasPermission('system.users.manage_roles', parsed);
          const canAccessAnyPnC = isSuper || canAccessDashboard || canAccessEmployees || canAccessOrg || canAccessTimeOff || canAccessAttendance || canAccessAppraisals || canAccessPayroll || canAccessRequests || canAccessReports;

          if (isMounted) {
            setCurrentUser({
              id: parsed.id,
              email: parsed.email,
              employeeCode: parsed.employeeCode,
              permissions: parsed.permissions,
              fullName: parsed.fullName || parsed.name || 'User',
              jobTitle: parsed.jobTitle || parsed.designation || (isSuper ? 'Coordinator' : 'Staff Member'),
              role: isSuper ? 'SUPER_ADMIN' : isAdmin ? 'ADMIN' : 'USER',
              roles: parsed.roles || (isSuper ? ['super_admin'] : isAdmin ? ['admin'] : ['user']),
              isSuperAdmin: isSuper,
              isAdmin,
              avatarUrl: parsed.avatarUrl || '',
            });

            setPermissionsState({
              canAccessDashboard,
              canAccessEmployees,
              canAccessOrg,
              canAccessTimeOff,
              canAccessAttendance,
              canAccessAppraisals,
              canAccessPayroll,
              canAccessRequests,
              canAccessReports,
              canAccessAnnouncements,
              canAccessRbac,
              canAccessAnyPnC,
              isLoaded: true,
            });
          }
        } else if (isMounted) {
          setPermissionsState({
            canAccessDashboard: false,
            canAccessEmployees: false,
            canAccessOrg: false,
            canAccessTimeOff: false,
            canAccessAttendance: false,
            canAccessAppraisals: false,
            canAccessPayroll: false,
            canAccessRequests: false,
            canAccessReports: false,
            canAccessAnnouncements: false,
            canAccessRbac: false,
            canAccessAnyPnC: false,
            isLoaded: true,
          });
        }
      } catch {}
    };

    loadSessionUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (isMounted) {
          window.location.href = '/login';
        }
      } else if (session?.user) {
        loadSessionUser();
      }
    });

    const handleUserUpdate = () => {
      loadSessionUser();
    };

    window.addEventListener('jaago_user_updated', handleUserUpdate);
    window.addEventListener('jaago_rbac_updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('jaago_user_updated', handleUserUpdate);
      window.removeEventListener('jaago_rbac_updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
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
    if (pathname.includes('/employees')) return { label: 'Employees', href: '/pnc/employees' };
    if (pathname.includes('/organization')) return { label: 'Organization & Branches', href: '/pnc/organization' };
    if (pathname.includes('/designations')) return { label: 'Designations', href: '/pnc/designations' };
    if (pathname.includes('/teams')) return { label: 'Teams', href: '/pnc/teams' };
    if (pathname.includes('/departments')) return { label: 'Departments', href: '/pnc/departments' };
    if (pathname.includes('/projects')) return { label: 'Projects', href: '/pnc/projects' };
    if (pathname.includes('/insurance')) return { label: 'Insurance Info', href: '/pnc/insurance' };
    if (pathname.includes('/attendance/shifts')) return { label: 'Working Hours & Schedules', href: '/pnc/attendance/shifts' };
    if (pathname.includes('/attendance/logs')) return { label: 'Attendance Logs', href: '/pnc/attendance/logs' };
    if (pathname.includes('/attendance/on-duty')) return { label: 'On Duty Logs', href: '/pnc/attendance/on-duty' };
    if (pathname.includes('/attendance/report')) return { label: 'Attendance Report', href: '/pnc/attendance/report' };
    if (pathname.includes('/attendance')) return { label: 'Attendance', href: '/pnc/attendance/logs' };
    if (pathname.includes('/time-off/requests')) return { label: 'Leave Requests', href: '/pnc/time-off/requests' };
    if (pathname.includes('/time-off/allocations')) return { label: 'Leave Allocations', href: '/pnc/time-off/allocations' };
    if (pathname.includes('/time-off/holidays')) return { label: 'Public Holidays', href: '/pnc/time-off/holidays' };
    if (pathname.includes('/attendance/biotime-logs')) return { label: 'BioTime Logs', href: '/pnc/attendance/biotime-logs' };
    if (pathname.includes('/settings/biotime')) return { label: 'BioTime Control Center', href: '/pnc/settings/biotime' };
    if (pathname.includes('/admin/rbac')) return { label: 'RBAC Matrix', href: '/admin/rbac' };
    return { label: 'Dashboard', href: '/pnc' };
  };
  const currentCrumb = getBreadcrumb();
  const isDashboard = pathname === '/pnc' || pathname === '/pnc/';

  return (
    <div className={`min-h-screen ${isDashboard ? 'bg-transparent' : 'bg-background'} text-foreground flex flex-col md:flex-row antialiased font-sans select-none relative overflow-x-hidden`}>
      <RouteProgressBar />
      {/* ── Dashboard ONLY Fullscreen Background (JAAGO School Children) ── */}
      {isDashboard && (
        <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none select-none bg-black">
          <Image
            src="/pnc-bg-children.jpg"
            alt="JAAGO Children Background"
            fill
            priority
            sizes="100vw"
            quality={95}
            className="object-cover object-center w-full h-full opacity-85"
          />
          {/* Subtle Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
        </div>
      )}

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
        className={`fixed top-0 bottom-0 left-0 z-40 h-screen bg-[#090C10]/90 dark:bg-[#06080B]/92 backdrop-blur-2xl border-r border-white/10 text-white transition-all duration-300 ease-in-out flex flex-col justify-between select-none shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden ${
          sidebarCollapsed
            ? '-translate-x-full w-72 pointer-events-none opacity-0'
            : 'translate-x-0 w-72 pointer-events-auto opacity-100'
        }`}
      >
        {/* Top Header Card: P&C Brand Badge */}
        <div className="p-4 border-b border-white/[0.08] space-y-3 bg-white/[0.03] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-sm shadow-md flex-shrink-0">
                P&amp;C
              </div>
              <div>
                <h1 className="text-sm font-extrabold text-white leading-tight">
                  People and Culture
                </h1>
                <p className="text-[11px] font-semibold text-white/50">
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
              className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white transition shadow-sm cursor-pointer"
              title="Hide Sidebar"
              aria-label="Hide Sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-white" />
            </button>
          </div>

          {/* Back to JAAGO HUB button */}
          <Link
            href="/dashboard"
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-white/80 hover:text-amber-400 bg-white/[0.04] hover:bg-amber-500/10 border border-white/[0.08] hover:border-amber-500/30 transition shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-amber-400" />
            <span className="uppercase tracking-wider text-[10px]">BACK TO JAAGO HUB</span>
          </Link>
        </div>

        {/* Middle Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 no-scrollbar">
          {/* DASHBOARD */}
          {permissionsState.canAccessDashboard && (
            <Link
              href="/pnc"
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                pathname === '/pnc'
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 font-black border border-amber-500/30 shadow-sm shadow-amber-500/10'
                  : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">DASHBOARD</span>
            </Link>
          )}

          {/* EMPLOYEES */}
          {permissionsState.canAccessEmployees && (
            <Link
              href="/pnc/employees"
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                pathname === '/pnc/employees'
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-400 font-black border border-amber-500/30 shadow-sm shadow-amber-500/10'
                  : 'text-white/75 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Users className="h-4 w-4 text-amber-400/90 flex-shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">EMPLOYEES</span>
            </Link>
          )}

          {/* ORGANIZATION ACCORDION */}
          {permissionsState.canAccessOrg && (
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
                    ? 'text-amber-400 font-black bg-white/[0.04]'
                    : 'text-white/75 hover:bg-white/[0.05] hover:text-white'
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
                      ? 'text-amber-400'
                      : 'text-white/60'
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
                  <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-white/40" />
                )}
              </button>
              {(openSections['organization'] ||
                pathname.startsWith('/pnc/organization') ||
                pathname.startsWith('/pnc/designations') ||
                pathname.startsWith('/pnc/teams') ||
                pathname.startsWith('/pnc/departments') ||
                pathname.startsWith('/pnc/projects') ||
                pathname.startsWith('/pnc/insurance')) && (
                <div className="pl-6 space-y-1 text-xs text-white/60 border-l border-white/10 ml-4 py-1">
                  <Link
                    href="/pnc/organization"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/organization'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Organization &amp; Branches
                  </Link>
                  <Link
                    href="/pnc/designations"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/designations'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Designations
                  </Link>
                  <Link
                    href="/pnc/teams"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/teams'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Teams
                  </Link>
                  <Link
                    href="/pnc/departments"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/departments'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Departments
                  </Link>
                  <Link
                    href="/pnc/projects"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/projects'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Projects
                  </Link>
                  <Link
                    href="/pnc/insurance"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/insurance'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Insurance Info
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TIME OFF ACCORDION */}
          {permissionsState.canAccessTimeOff && (
            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection('timeOff')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  pathname.startsWith('/pnc/time-off')
                    ? 'text-amber-400 font-black bg-white/[0.04]'
                    : 'text-white/75 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Calendar className={`h-4 w-4 flex-shrink-0 ${
                    pathname.startsWith('/pnc/time-off')
                      ? 'text-amber-400'
                      : 'text-white/60'
                  }`} />
                  <span className="uppercase tracking-wider text-[11px]">TIME OFF</span>
                </div>
                {openSections['timeOff'] || pathname.startsWith('/pnc/time-off') ? (
                  <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-white/40" />
                )}
              </button>
              {(openSections['timeOff'] || pathname.startsWith('/pnc/time-off')) && (
                <div className="pl-6 space-y-1 text-xs text-white/60 border-l border-white/10 ml-4 py-1">
                  <Link
                    href="/pnc/time-off/calendar"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/time-off/calendar' || pathname === '/pnc/time-off'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Leave Calendar
                  </Link>
                  <Link
                    href="/pnc/time-off/requests"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/time-off/requests'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Leave Requests
                  </Link>
                  <Link
                    href="/pnc/time-off/allocations"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/time-off/allocations'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Allocations
                  </Link>
                  <Link
                    href="/pnc/time-off/holidays"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/time-off/holidays'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Public Holidays
                  </Link>
                  <Link
                    href="/pnc/time-off/config"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/time-off/config'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Leave Config
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ATTENDANCE ACCORDION */}
          {permissionsState.canAccessAttendance && (
            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection('attendance')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  pathname.startsWith('/pnc/attendance')
                    ? 'text-amber-400 font-black bg-white/[0.04]'
                    : 'text-white/75 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Fingerprint
                    className={`h-4 w-4 flex-shrink-0 ${
                      pathname.startsWith('/pnc/attendance')
                        ? 'text-amber-400'
                        : 'text-white/60'
                    }`}
                  />
                  <span className="uppercase tracking-wider text-[11px]">ATTENDANCE</span>
                </div>
                {openSections['attendance'] || pathname.startsWith('/pnc/attendance') ? (
                  <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-white/40" />
                )}
              </button>
              {(openSections['attendance'] || pathname.startsWith('/pnc/attendance')) && (
                <div className="pl-6 space-y-1 text-xs text-white/60 border-l border-white/10 ml-4 py-1">
                  <Link
                    href="/pnc/attendance/logs"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/attendance/logs' || pathname === '/pnc/attendance'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Attendance Logs
                  </Link>
                  <Link
                    href="/pnc/attendance/on-duty"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/attendance/on-duty'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; On Duty Logs
                  </Link>
                  <Link
                    href="/pnc/attendance/report"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/attendance/report'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Attendance Report
                  </Link>
                  <Link
                    href="/pnc/attendance/shifts"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname === '/pnc/attendance/shifts'
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; Working Hours &amp; Schedules
                  </Link>
                  <Link
                    href="/pnc/attendance/biotime-logs"
                    className={`block py-1 px-2 rounded-lg uppercase text-[10px] font-bold transition ${
                      pathname.startsWith('/pnc/attendance/biotime-logs')
                        ? 'text-amber-400 font-black bg-amber-500/15'
                        : 'hover:text-amber-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    &bull; BioTime Log
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* APPRAISALS */}
          {permissionsState.canAccessAppraisals && (
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-white/75 hover:bg-white/[0.05] hover:text-white transition cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <Award className="h-4 w-4 text-white/60 flex-shrink-0" />
                <span className="uppercase tracking-wider text-[11px]">APPRAISALS</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            </div>
          )}

          {/* PAYROLL */}
          {permissionsState.canAccessPayroll && (
            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection('payroll')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-white/75 hover:bg-white/[0.05] hover:text-white transition cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <DollarSign className="h-4 w-4 text-white/60 flex-shrink-0" />
                  <span className="uppercase tracking-wider text-[11px]">PAYROLL</span>
                </div>
                {openSections['payroll'] ? <ChevronDown className="h-3.5 w-3.5 text-amber-400" /> : <ChevronRight className="h-3.5 w-3.5 text-white/40" />}
              </button>
              {openSections['payroll'] && (
                <div className="pl-6 space-y-1 text-xs text-white/60 border-l border-white/10 ml-4 py-1">
                  <div className="py-1 uppercase text-[10px] font-bold hover:text-amber-400 cursor-pointer">&bull; Contracts</div>
                  <div className="py-1 uppercase text-[10px] font-bold hover:text-amber-400 cursor-pointer">&bull; Pay Runs</div>
                  <div className="py-1 uppercase text-[10px] font-bold hover:text-amber-400 cursor-pointer">&bull; Payslips</div>
                </div>
              )}
            </div>
          )}

          {/* REQUESTS */}
          {permissionsState.canAccessRequests && (
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-white/75 hover:bg-white/[0.05] hover:text-white transition cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <FileText className="h-4 w-4 text-white/60 flex-shrink-0" />
                <span className="uppercase tracking-wider text-[11px]">REQUESTS</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            </div>
          )}

          {/* REPORTS */}
          {permissionsState.canAccessReports && (
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-white/75 hover:bg-white/[0.05] hover:text-white transition cursor-pointer">
              <div className="flex items-center space-x-2.5">
                <BarChart3 className="h-4 w-4 text-white/60 flex-shrink-0" />
                <span className="uppercase tracking-wider text-[11px]">REPORTS</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            </div>
          )}

          {/* ANNOUNCEMENTS */}
          {permissionsState.canAccessAnnouncements && (
            <div className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-white/75 hover:bg-white/[0.05] hover:text-white transition cursor-pointer">
              <Megaphone className="h-4 w-4 text-white/60 flex-shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">ANNOUNCEMENTS</span>
            </div>
          )}

          {/* U.ROLE (Admin / Super Admin Only) */}
          {permissionsState.canAccessRbac && (
            <Link
              href="/admin/rbac"
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                pathname.startsWith('/admin/rbac')
                  ? 'bg-amber-500/15 text-amber-400 font-black border border-amber-500/30'
                  : 'text-white/75 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <ShieldAlert className="h-4 w-4 text-white/60 flex-shrink-0" />
              <span className="uppercase tracking-wider text-[11px]">U.ROLE</span>
            </Link>
          )}

          {/* SETTINGS (Admin / Super Admin Only) */}
          {(currentUser.isAdmin || currentUser.isSuperAdmin) && (
            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection('settings')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  pathname.startsWith('/pnc/settings') || pathname.includes('/biotime')
                    ? 'text-amber-400 font-black bg-white/[0.04]'
                    : 'text-white/75 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Settings className="h-4 w-4 text-white/60 flex-shrink-0" />
                  <span className="uppercase tracking-wider text-[11px]">SETTINGS</span>
                </div>
                {openSections['settings'] || pathname.startsWith('/pnc/settings') || pathname.includes('/biotime') ? (
                  <ChevronDown className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-white/40" />
                )}
              </button>
              {(openSections['settings'] || pathname.startsWith('/pnc/settings') || pathname.includes('/biotime')) && (
                <div className="pl-6 space-y-1 text-xs text-white/60 border-l border-white/10 ml-4 py-1">
                  <Link
                    href="/pnc/organization"
                    className={`block py-1 uppercase text-[10px] font-bold transition hover:text-amber-400 ${
                      pathname === '/pnc/organization' ? 'text-amber-400 font-black' : ''
                    }`}
                  >
                    &bull; Configuration
                  </Link>
                  <Link
                    href="/pnc/settings/biotime"
                    className={`block py-1 uppercase text-[10px] font-bold transition hover:text-amber-400 ${
                      pathname.includes('/biotime') ? 'text-amber-400 font-black' : ''
                    }`}
                  >
                    &bull; BioTime Device Sync
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom User Card & Log Out */}
        <div className="p-3.5 border-t border-white/[0.08] bg-white/[0.03] space-y-3">
          <div className="flex items-center space-x-3">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="h-9 w-9 rounded-full object-cover border border-amber-500/40 shadow-sm ring-1 ring-amber-500/20 flex-shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-xs shadow-sm uppercase flex-shrink-0">
                {currentUser.fullName ? currentUser.fullName.charAt(0) : 'U'}
              </div>
            )}
            <div className="overflow-hidden min-w-0 flex-1">
              <div
                className="text-xs font-bold text-white truncate"
                title={`${currentUser.fullName} | ${currentUser.jobTitle}`}
              >
                {currentUser.fullName} | {currentUser.jobTitle}
              </div>
              <div className="text-[10px] font-semibold text-amber-400/90">
                {currentUser.isSuperAdmin
                  ? 'Super Admin'
                  : currentUser.isAdmin
                  ? 'Admin / HR'
                  : 'User'}
              </div>
            </div>
          </div>

          {/* Prominent Log Out Button */}
          <button
            onClick={handleSignOut}
            title="Log Out of Session"
            className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 border border-rose-500/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition duration-150 cursor-pointer active:scale-95 shadow-xs"
          >
            <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Log Out</span>
          </button>
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
        <header className="h-16 border-b border-white/[0.08] bg-[#090C10]/75 dark:bg-[#06080B]/85 backdrop-blur-xl text-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-md shadow-black/30">
          <div className="flex items-center space-x-3 text-xs sm:text-sm font-bold">
            <button
              onClick={() => {
                if (sidebarCollapsed) {
                  handleMouseEnter();
                } else {
                  setSidebarCollapsed(true);
                }
              }}
              className="p-1.5 rounded-xl hover:bg-white/[0.08] text-white/80 hover:text-amber-400 transition cursor-pointer"
              title="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold">
              <Link
                href="/pnc"
                className="text-amber-400 hover:underline transition cursor-pointer font-bold"
              >
                People and Culture
              </Link>
              <span className="text-white/30 font-bold">&gt;</span>
              <Link
                href={currentCrumb.href}
                className="text-white hover:text-amber-400 transition cursor-pointer font-bold"
              >
                {currentCrumb.label}
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            {/* Organization Switcher Dropdown in Top Header */}
            <div className="relative">
              <select
                suppressHydrationWarning
                value={selectedOrg}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="appearance-none pl-8 pr-7 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 backdrop-blur-md transition cursor-pointer shadow-sm max-w-[160px] sm:max-w-[210px] truncate"
                title="Select Active Organization"
              >
                <option value="ALL" className="bg-[#0D1117] text-white font-bold">
                  All Organizations (Consolidated)
                </option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.name} className="bg-[#0D1117] text-white">
                    {org.name}
                  </option>
                ))}
              </select>
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400 pointer-events-none" />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60 pointer-events-none" />
            </div>

            {/* Department Switcher Dropdown in Top Header */}
            <div className="relative">
              <select
                suppressHydrationWarning
                value={isDspScoped ? 'Digital School Program' : selectedDept}
                onChange={(e) => handleDeptChange(e.target.value)}
                disabled={isDspScoped}
                className={`appearance-none pl-8 pr-7 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 backdrop-blur-md transition shadow-sm max-w-[150px] sm:max-w-[200px] truncate ${
                  isDspScoped
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 cursor-not-allowed'
                    : 'border-white/10 cursor-pointer'
                }`}
                title={isDspScoped ? 'Locked to Digital School Program Scope' : 'Select Active Department'}
              >
                {!isDspScoped && (
                  <option value="ALL" className="bg-[#0D1117] text-white font-bold">
                    All Departments
                  </option>
                )}
                {availableDepts.map((deptName) => (
                  <option key={deptName} value={deptName} className="bg-[#0D1117] text-white">
                    {deptName}
                  </option>
                ))}
              </select>
              <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400 pointer-events-none" />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/60 pointer-events-none" />
            </div>

            {/* Theme Mode Switcher (3-Way: Dark / Light / Espresso) */}
            <button
              onClick={cycleTheme}
              className="p-2 rounded-xl text-white/75 hover:text-white hover:bg-white/[0.08] transition flex items-center justify-center cursor-pointer"
              title={`Theme: ${
                theme === 'dark'
                  ? 'Matte Black (Click for Light Mode)'
                  : theme === 'light'
                  ? 'Warm Cream (Click for Espresso Mode)'
                  : 'Warm Espresso (Click for Dark Mode)'
              }`}
              aria-label="Toggle Theme Mode"
            >
              {theme === 'dark' && <Moon className="h-4 w-4 text-amber-400" />}
              {theme === 'light' && <Sun className="h-4 w-4 text-amber-400" />}
              {theme === 'espresso' && <Coffee className="h-4 w-4 text-amber-400" />}
            </button>

            <button className="p-2 rounded-xl text-white/75 hover:text-amber-400 hover:bg-white/[0.08] transition cursor-pointer" title="Search">
              <Search className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-xl text-white/75 hover:text-amber-400 hover:bg-white/[0.08] transition cursor-pointer" title="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-xl text-white/75 hover:text-amber-400 hover:bg-white/[0.08] transition cursor-pointer" title="Help">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Body Page Content */}
        {permissionsState.isLoaded && !permissionsState.canAccessAnyPnC ? (
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto flex items-center justify-center min-h-[65vh]">
            <div className="p-8 sm:p-12 rounded-3xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl text-center max-w-lg space-y-5 animate-in fade-in zoom-in-95">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
                <ShieldAlert className="h-9 w-9 stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-foreground">
                  Access Restricted
                </h2>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  You do not have active Role-Based Access Control (RBAC) permissions to view or manage the People &amp; Culture module. Please contact your system administrator or HR lead for permission delegation.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-primary/20 transition transform active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
                  <span>Return to My Dashboard</span>
                </Link>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
