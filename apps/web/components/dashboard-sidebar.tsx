'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOutUser } from '@/lib/supabase-auth';
import { hasModuleAccess, hasDepartmentAccess } from '@/lib/rbac-guard';
import {
  STANDARD_DEPARTMENTS_CONFIG,
  DepartmentConfigItem,
  normalizeDeptSlug,
} from '@/lib/rbac-data';

import {
  User,
  LayoutGrid,
  FileText,
  Tag,
  Briefcase,
  ShoppingCart,
  DollarSign,
  UserPlus,
  PenTool,
  Receipt,
  Calendar,
  Award,
  Clock,
  History,
  Radio,
  Building2,
  Users,
  GitFork,
  BookUser,
  UserCheck,
  MapPin,
  Star,
  TrendingUp,
  ClipboardList,
  HeartHandshake,
  BarChart2,
  Settings,
  Boxes,
  Wand2,
  Cpu,
  Activity,
  Server,
  Bot,
  Shield,
  MessageSquare,
  Mail,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

export interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function DashboardSidebar({
  collapsed,
  onToggle,
  onMouseEnter,
  onMouseLeave,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  // Accordion state for sidebar categories
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dashboard: true,
    requests: false,
    attendance: false,
    organization: false,
    settings: false,
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [canAccessPnC, setCanAccessPnC] = useState<boolean>(false);
  const [canAccessAdmin, setCanAccessAdmin] = useState<boolean>(false);
  const [departmentsList, setDepartmentsList] = useState<DepartmentConfigItem[]>(STANDARD_DEPARTMENTS_CONFIG);
  const [allowedDeptSlugs, setAllowedDeptSlugs] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const checkRole = () => {
      try {
        const raw = localStorage.getItem('jaago_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const rawRole = (parsed.role || (Array.isArray(parsed.roles) ? parsed.roles[0] : '') || 'USER').toString();
          const rawRoleUpper = rawRole.toUpperCase();
          const superAdmin =
            parsed.isSuperAdmin === true ||
            rawRoleUpper === 'SUPER_ADMIN' ||
            rawRole.toLowerCase() === 'super_admin' ||
            Boolean(parsed.email && parsed.email.toLowerCase().includes('nasif.kamal'));

          const admin =
            superAdmin ||
            rawRoleUpper === 'ADMIN' ||
            rawRoleUpper === 'HR_MANAGER' ||
            rawRoleUpper === 'HR_ADMIN' ||
            rawRole.toLowerCase() === 'admin' ||
            rawRole.toLowerCase() === 'hr_manager' ||
            rawRole.toLowerCase() === 'coordinator' ||
            hasModuleAccess('admin', parsed);

          setIsSuperAdmin(Boolean(superAdmin));
          setIsAdmin(Boolean(admin));
          setCanAccessPnC(hasModuleAccess('pnc', parsed));
          setCanAccessAdmin(Boolean(superAdmin || admin || hasModuleAccess('admin', parsed)));

          // Dynamically load custom + standard departments
          const deptsRaw = localStorage.getItem('jaago_departments');
          let customDepts: any[] = [];
          if (deptsRaw) {
            try { customDepts = JSON.parse(deptsRaw); } catch {}
          }
          const combinedDepts: DepartmentConfigItem[] = [...STANDARD_DEPARTMENTS_CONFIG];
          if (Array.isArray(customDepts)) {
            customDepts.forEach((cd) => {
              if (!cd.name) return;
              const slug = normalizeDeptSlug(cd.name);
              if (!combinedDepts.some((d) => (d.slug || normalizeDeptSlug(d.name)) === slug)) {
                combinedDepts.push({
                  name: cd.name,
                  slug,
                  code: cd.code,
                  icon: 'Building2',
                  description: cd.description,
                  href: '/workflows',
                });
              }
            });
          }
          setDepartmentsList(combinedDepts);

          // Calculate allowed departments for current user
          const allowed: Record<string, boolean> = {};
          combinedDepts.forEach((d) => {
            const slug = d.slug || normalizeDeptSlug(d.name);
            allowed[slug] = Boolean(superAdmin || hasDepartmentAccess(slug, parsed));
          });
          setAllowedDeptSlugs(allowed);
        } else {
          setCanAccessPnC(false);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setCanAccessAdmin(false);
          setAllowedDeptSlugs({});
        }
      } catch {
        setCanAccessPnC(false);
        setCanAccessAdmin(false);
        setAllowedDeptSlugs({});
      }
    };

    checkRole();
    window.addEventListener('jaago_user_updated', checkRole);
    window.addEventListener('jaago_rbac_updated', checkRole);
    window.addEventListener('jaago_departments_updated', checkRole);
    window.addEventListener('storage', checkRole);
    return () => {
      window.removeEventListener('jaago_user_updated', checkRole);
      window.removeEventListener('jaago_rbac_updated', checkRole);
      window.removeEventListener('jaago_departments_updated', checkRole);
      window.removeEventListener('storage', checkRole);
    };
  }, []);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSignOut = async () => {
    await signOutUser();
  };


  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed top-0 bottom-0 left-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col justify-between select-none shadow-2xl ${
        collapsed
          ? '-translate-x-full w-72 pointer-events-none opacity-0'
          : 'translate-x-0 w-72 pointer-events-auto opacity-100'
      }`}
    >
      {/* Top Section: Logo & Nav List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 no-scrollbar relative">
        {/* Small Hide/Collapse Button in Top-Right Corner */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-surface/80 hover:bg-surface border border-border/80 text-muted-foreground hover:text-foreground transition shadow-sm z-10 cursor-pointer"
          title="Hide Sidebar"
          aria-label="Hide Sidebar"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
        </button>
        {/* Official JAAGO Foundation Logo Card (Clickable to Dashboard Home) */}
        <div className="flex items-center justify-center py-1">
          <Link
            href="/dashboard"
            title="JAAGO Foundation - Dashboard Home"
            className={`inline-flex items-center justify-center p-1 rounded-2xl overflow-hidden shadow-[0_0_14px_rgba(255,230,0,0.35)] border-2 border-primary bg-surface group transition transform hover:scale-[1.03] active:scale-95 cursor-pointer ${
              collapsed ? 'w-12 h-12' : ''
            }`}
          >
            <Image
              src="/jaago-logo.png"
              alt="JAAGO Foundation"
              width={160}
              height={80}
              priority
              className={`${
                collapsed ? 'w-9 h-9 object-contain' : 'w-auto h-14 sm:h-16 object-contain'
              } block rounded-xl`}
            />
          </Link>
        </div>

        {/* Navigation Menus */}
        <nav className="space-y-4 pt-1">
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── 1. DASHBOARD SECTION (EVERYTHING UNDER MY DASHBOARD) ──  */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="space-y-1.5">
            {!collapsed && (
              <div className="px-1 text-[10px] uppercase font-bold tracking-wider text-sidebar-muted">
                DASHBOARD
              </div>
            )}

            {/* MY DASHBOARD CONTAINER BUTTON */}
            <button
              onClick={() => toggleSection('dashboard')}
              title="My Dashboard"
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
              } py-2.5 rounded-2xl text-xs font-black bg-primary text-primary-foreground shadow-md transition transform active:scale-95 cursor-pointer`}
            >
              <div className="flex items-center space-x-2.5">
                <User className="h-4 w-4 stroke-[2.5] flex-shrink-0 text-primary-foreground" />
                {!collapsed && <span>My Dashboard</span>}
              </div>
              {!collapsed && (
                openSections['dashboard'] ? <ChevronDown className="h-4 w-4 stroke-[2.5]" /> : <ChevronRight className="h-4 w-4 stroke-[2.5]" />
              )}
            </button>

            {/* NESTED CONTENT INSIDE MY DASHBOARD */}
            {openSections['dashboard'] && !collapsed && (
              <div className="pl-2 space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* 1.1 Overview (Active Highlighted Pill) */}
                <Link
                  href="/dashboard"
                  title="Overview"
                  className={`w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                    pathname === '/dashboard'
                      ? 'bg-primary/20 text-foreground font-black border border-primary/40'
                      : 'text-sidebar-foreground hover:bg-surface hover:text-primary'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 text-foreground flex-shrink-0" />
                  <span>Overview</span>
                </Link>

                {/* 1.2 My Profile */}
                <Link
                  href="/dashboard/my-profile"
                  title="My Profile"
                  className={`w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                    pathname === '/dashboard/my-profile'
                      ? 'bg-primary/20 text-foreground font-black border border-primary/40'
                      : 'text-sidebar-foreground hover:bg-surface hover:text-primary'
                  }`}
                >
                  <UserCheck className="h-4 w-4 text-foreground flex-shrink-0" />
                  <span>My Profile</span>
                </Link>

                {/* 1.2 Requests Accordion */}
                <div className="space-y-0.5">
                  <button
                    onClick={() => toggleSection('requests')}
                    title="Requests"
                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-sidebar-muted hover:text-sidebar-foreground transition rounded-xl hover:bg-surface/50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
                      <span>Requests</span>
                    </div>
                    {openSections['requests'] ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {openSections['requests'] && (
                    <div className="pl-4 space-y-0.5 border-l border-sidebar-border/50 ml-3 text-sidebar-foreground animate-in fade-in duration-100">
                      <Link
                        href="/workflows"
                        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span>All Requests</span>
                      </Link>
                      {[
                        { label: 'Leave Request', icon: Tag, href: '/leaves' },
                        { label: 'General Requisition...', icon: Briefcase, href: '/workflows' },
                        { label: 'Purchase Requisition...', icon: ShoppingCart, href: '/workflows' },
                        { label: 'Expenses', icon: DollarSign, href: '/workflows' },
                        { label: 'Recruitment Requisition...', icon: UserPlus, href: '/workflows' },
                        { label: 'Sign Request', icon: PenTool, href: '/workflows' },
                        { label: 'Tax & NOC Request...', icon: DollarSign, href: '/workflows' },
                        { label: 'Payment Voucher...', icon: Receipt, href: '/workflows' },
                        { label: 'Meeting Rooms', icon: Calendar, href: '/workflows' },
                        { label: 'Volunteering Program...', icon: Award, href: '/workflows' },
                      ].map((item, idx) => (
                        <Link
                          key={idx}
                          href={item.href}
                          className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                        >
                          <item.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* 1.3 Attendance & Leave Accordion */}
                <div className="space-y-0.5">
                  <button
                    onClick={() => toggleSection('attendance')}
                    title="Attendance & Leave"
                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-sidebar-muted hover:text-sidebar-foreground transition rounded-xl hover:bg-surface/50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Clock className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
                      <span>Attendance &amp; Leave</span>
                    </div>
                    {openSections['attendance'] ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {openSections['attendance'] && (
                    <div className="pl-4 space-y-0.5 border-l border-sidebar-border/50 ml-3 text-sidebar-foreground animate-in fade-in duration-100">
                      <Link
                        href="/attendance"
                        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                      >
                        <History className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span>Attendance</span>
                      </Link>
                      <Link
                        href="/leaves"
                        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                      >
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span>My Leave</span>
                      </Link>
                      <Link
                        href="/on-duty"
                        className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                      >
                        <Radio className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span>On Duty</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* 1.4 Organization Accordion */}
                <div className="space-y-0.5">
                  <button
                    onClick={() => toggleSection('organization')}
                    title="Organization"
                    className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-sidebar-muted hover:text-sidebar-foreground transition rounded-xl hover:bg-surface/50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Building2 className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
                      <span>Organization</span>
                    </div>
                    {openSections['organization'] ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {openSections['organization'] && (
                    <div className="pl-4 space-y-0.5 border-l border-sidebar-border/50 ml-3 text-sidebar-foreground animate-in fade-in duration-100">
                      {[
                        { label: 'My Team', icon: Users, href: '/organization/team' },
                        { label: 'My Department', icon: Users, href: '/organization/department' },
                        { label: 'Cross Department...', icon: GitFork, href: '/organization/cross-department' },
                        { label: 'Contacts', icon: BookUser, href: '/organization/contacts' },
                        { label: 'On Leave', icon: UserCheck, href: '/organization/on-leave' },
                        { label: 'Performance & Appraisal...', icon: Star, href: '/organization/performance' },
                      ].map((item, idx) => (
                        <Link
                          key={idx}
                          href={item.href}
                          className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                        >
                          <item.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── 2. DEPARTMENTS SECTION (Directly from Reference Images) ─ */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {!collapsed && (
            <div className="space-y-1 pt-3 border-t border-sidebar-border/70">
              <div className="px-1 text-[10px] uppercase font-bold tracking-wider text-sidebar-muted">
                DEPARTMENTS
              </div>

              {/* People and Culture (Opens dedicated portal in New Tab - Only if user has RBAC access) */}
              {canAccessPnC && (
                <a
                  href="/pnc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-foreground bg-primary/10 hover:bg-primary/20 border border-primary/30 transition text-left cursor-pointer group shadow-sm mb-1"
                  title="Open People and Culture Portal in New Tab"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="h-5 w-5 rounded-md bg-[#26180E] text-primary font-black text-[9px] flex items-center justify-center flex-shrink-0">
                      P&amp;C
                    </div>
                    <span className="font-bold text-foreground group-hover:text-primary transition">
                      People and Culture
                    </span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition flex-shrink-0" />
                </a>
              )}
              {departmentsList
                .filter((dept) => {
                  const slug = dept.slug || normalizeDeptSlug(dept.name);
                  return isSuperAdmin || allowedDeptSlugs[slug];
                })
                .map((dept, idx) => {
                  const getIcon = (iconName?: string) => {
                    switch (iconName) {
                      case 'Star': return Star;
                      case 'TrendingUp': return TrendingUp;
                      case 'FileText': return FileText;
                      case 'DollarSign': return DollarSign;
                      case 'Radio': return Radio;
                      case 'ClipboardList': return ClipboardList;
                      case 'Users': return Users;
                      case 'HeartHandshake': return HeartHandshake;
                      case 'BarChart2': return BarChart2;
                      case 'Building2':
                      default:
                        return Building2;
                    }
                  };
                  const IconComp = getIcon(dept.icon);

                  if (dept.href) {
                    return (
                      <a
                        key={idx}
                        href={dept.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-foreground hover:bg-surface transition text-left cursor-pointer group"
                        title={`Open ${dept.name} in New Tab`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <IconComp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition flex-shrink-0" />
                          <span className="truncate">{dept.name}</span>
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary transition flex-shrink-0" />
                      </a>
                    );
                  }
                  return (
                    <button
                      key={idx}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-foreground hover:bg-surface transition text-left cursor-pointer"
                    >
                      <IconComp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{dept.name}</span>
                    </button>
                  );
                })}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ── 3. SETTINGS ACCORDION (Admin / Super Admin Only) ─────── */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {(canAccessAdmin || isAdmin || isSuperAdmin) && (
            <div className="space-y-1 pt-2 border-t border-sidebar-border">
              <button
                onClick={() => toggleSection('settings')}
                title="Settings"
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
                } py-2 text-xs font-bold tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition cursor-pointer`}
              >
                <div className="flex items-center space-x-2.5">
                  <Settings className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
                  {!collapsed && <span>Settings</span>}
                </div>
                {!collapsed && (
                  openSections['settings'] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {openSections['settings'] && !collapsed && (
                <div className="pl-4 space-y-0.5 border-l border-sidebar-border/50 ml-3 text-sidebar-foreground animate-in fade-in duration-100">
                  <Link
                    href="/admin/users"
                    className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      pathname === '/admin/users'
                        ? 'bg-sidebar-active text-sidebar-active-foreground font-bold shadow-sm'
                        : 'text-sidebar-foreground/80 hover:text-primary hover:bg-surface'
                    } transition`}
                  >
                    <Users className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>User Management</span>
                  </Link>
                  <Link
                    href="/admin/gps-coordinates"
                    className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      pathname === '/admin/gps-coordinates'
                        ? 'bg-sidebar-active text-sidebar-active-foreground font-bold shadow-sm'
                        : 'text-sidebar-foreground/80 hover:text-primary hover:bg-surface'
                    } transition`}
                  >
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>GPS Coordinates</span>
                  </Link>
                  <Link
                    href="/admin/modules"
                    className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      pathname === '/admin/modules'
                        ? 'bg-sidebar-active text-sidebar-active-foreground font-bold shadow-sm'
                        : 'text-sidebar-foreground/80 hover:text-primary hover:bg-surface'
                    } transition`}
                  >
                    <Boxes className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Modules Manager</span>
                  </Link>
                  <Link
                    href="/admin/studio"
                    className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>Studio-lite Builder</span>
                  </Link>
                  <Link
                    href="/admin/control-center"
                    className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                  >
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>Control Center</span>
                  </Link>
                  <Link
                    href="/admin/logs"
                    className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                  >
                    <Activity className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>System Logs</span>
                  </Link>
                  <Link
                    href="/admin/api-keys"
                    className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                  >
                    <Server className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>API Settings</span>
                  </Link>
                  <Link
                    href="/admin/integrations"
                    className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                  >
                    <Bot className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>AI Agent &amp; Integrations</span>
                  </Link>
                  <Link
                    href="/admin/rbac"
                    className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      pathname === '/admin/rbac'
                        ? 'bg-sidebar-active text-sidebar-active-foreground font-bold shadow-sm'
                        : 'text-sidebar-foreground/80 hover:text-primary hover:bg-surface'
                    } transition`}
                  >
                    <Shield className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                    <span>RBAC Matrix</span>
                  </Link>
                  <Link
                    href="/admin/email"
                    className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      pathname?.startsWith('/admin/email')
                        ? 'bg-sidebar-active text-sidebar-active-foreground font-bold shadow-sm'
                        : 'text-sidebar-foreground/80 hover:text-primary hover:bg-surface'
                    } transition`}
                  >
                    <Mail className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                    <span>Email / SMTP Settings</span>
                  </Link>
                  <Link
                    href="/admin/about"
                    className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      pathname === '/admin/about'
                        ? 'bg-sidebar-active text-sidebar-active-foreground font-bold shadow-sm'
                        : 'text-sidebar-foreground/80 hover:text-primary hover:bg-surface'
                    } transition`}
                  >
                    <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>About JAAGO HUB</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* Bottom Section: Quick Action Icons & Sign Out */}
      <div className="p-3.5 border-t border-sidebar-border space-y-3">
        {!collapsed && (
          <div className="flex items-center justify-center space-x-3">
            <button className="h-9 w-9 rounded-full bg-surface border border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition cursor-pointer" title="Chat">
              <MessageSquare className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 rounded-full bg-surface border border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition cursor-pointer" title="Mail">
              <Mail className="h-4 w-4" />
            </button>
            <button className="h-9 w-9 rounded-full bg-surface border border-border hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary transition cursor-pointer" title="Calendar">
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        )}

        <button
          onClick={handleSignOut}
          title="Sign Out"
          className={`w-full py-2.5 ${
            collapsed ? 'px-2 justify-center' : 'px-4 justify-center space-x-2'
          } rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-xs uppercase tracking-wider flex items-center transition cursor-pointer`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>SIGN OUT</span>}
        </button>
      </div>
    </aside>
  );
}
