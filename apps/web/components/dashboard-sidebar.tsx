'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
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
} from 'lucide-react';

export interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function DashboardSidebar({ collapsed, onToggle }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Accordion state for sidebar categories
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dashboard: true,
    requests: true,
    attendance: false,
    organization: false,
    settings: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jaago_access_token');
      localStorage.removeItem('jaago_user');
    }
    router.push('/sign-in');
  };

  return (
    <aside
      className={`fixed lg:relative top-0 bottom-0 left-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col justify-between select-none ${
        collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'w-72'
      }`}
    >
      {/* ── HIDE / UNHIDE SIDEBAR TOGGLE BUTTON ── */}
      <button
        onClick={onToggle}
        type="button"
        aria-label={collapsed ? 'Unhide sidebar' : 'Hide sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3.5 top-20 z-50 flex items-center justify-center group focus:outline-none transition-transform active:scale-90"
      >
        <div className="relative flex items-center justify-center w-7 h-16 rounded-full bg-surface border border-border/90 shadow-[0_4px_16px_rgba(0,0,0,0.5)] group-hover:border-primary/80 group-hover:shadow-[0_0_16px_rgba(250,192,10,0.45)] transition-all duration-200 cursor-pointer overflow-hidden">
          <div className="absolute inset-y-2 w-2 rounded-full bg-gradient-to-b from-amber-500 via-primary to-orange-500 opacity-80 group-hover:opacity-100 group-hover:w-2.5 transition-all duration-200" />
          <div className="relative z-10 flex items-center justify-center">
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 stroke-[3] text-foreground group-hover:text-primary transition" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 stroke-[3] text-foreground group-hover:text-primary transition" />
            )}
          </div>
        </div>
      </button>

      {/* Top Section: Logo & Nav List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 no-scrollbar">
        {/* Official JAAGO Foundation Logo Card */}
        <div className="flex items-center justify-center py-1">
          <div
            className={`inline-flex items-center justify-center p-1 rounded-2xl overflow-hidden shadow-[0_0_14px_rgba(255,230,0,0.35)] border-2 border-primary bg-surface group transition transform hover:scale-[1.02] ${
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
          </div>
        </div>

        {/* Navigation Menus */}
        <nav className="space-y-3 pt-1">
          {/* ── 1. OVERVIEW MENU ITEM ── */}
          <div>
            <Link
              href="/dashboard"
              title="Overview"
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2' : 'space-x-2.5 px-3.5'
              } py-2.5 rounded-2xl text-xs font-bold transition shadow-sm ${
                pathname === '/dashboard'
                  ? 'bg-primary/20 text-foreground font-black border border-primary/40 shadow-sm'
                  : 'text-sidebar-foreground hover:bg-surface hover:text-primary'
              }`}
            >
              <LayoutGrid className="h-4 w-4 text-foreground flex-shrink-0" />
              {!collapsed && <span>Overview</span>}
            </Link>
          </div>

          {/* ── 2. REQUESTS ACCORDION ── */}
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('requests')}
              title="Requests"
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
              } py-2 text-xs font-bold tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition`}
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
                {!collapsed && <span>Requests</span>}
              </div>
              {!collapsed && (
                openSections['requests'] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>

            {openSections['requests'] && !collapsed && (
              <div className="pl-4 space-y-0.5 border-l border-sidebar-border/40 ml-3 text-sidebar-foreground">
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

          {/* ── 3. ATTENDANCE & LEAVE ACCORDION ── */}
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('attendance')}
              title="Attendance & Leave"
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
              } py-2 text-xs font-bold tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition`}
            >
              <div className="flex items-center space-x-2.5">
                <Clock className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
                {!collapsed && <span>Attendance &amp; Leave</span>}
              </div>
              {!collapsed && (
                openSections['attendance'] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>

            {openSections['attendance'] && !collapsed && (
              <div className="pl-4 space-y-0.5 border-l border-sidebar-border/40 ml-3 text-sidebar-foreground">
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

          {/* ── 4. ORGANIZATION ACCORDION ── */}
          <div className="space-y-1">
            <button
              onClick={() => toggleSection('organization')}
              title="Organization"
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
              } py-2 text-xs font-bold tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition`}
            >
              <div className="flex items-center space-x-2.5">
                <Building2 className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
                {!collapsed && <span>Organization</span>}
              </div>
              {!collapsed && (
                openSections['organization'] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>

            {openSections['organization'] && !collapsed && (
              <div className="pl-4 space-y-0.5 border-l border-sidebar-border/40 ml-3 text-sidebar-foreground">
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

          {/* ── 5. DEPARTMENTS SECTION (Directly from Reference Images) ── */}
          {!collapsed && (
            <div className="space-y-1 pt-3 border-t border-sidebar-border/70">
              <div className="px-3.5 py-1 text-[10px] uppercase font-bold tracking-wider text-sidebar-muted">
                Departments
              </div>
              {[
                { label: 'Admin & Procurement', icon: Building2 },
                { label: 'Child Welfare', icon: Star },
                { label: 'Digital & Creative (DKL)', icon: TrendingUp },
                { label: "Founder's Office (FC)", icon: FileText },
                { label: 'Fundraising & Grants', icon: DollarSign },
                { label: 'Impact Investment', icon: Radio },
                { label: 'Project Implementation', icon: ClipboardList },
                { label: 'Programmes', icon: Users },
                { label: 'Private Sector (PSE)', icon: Building2 },
                { label: 'Youth Development (YDF)', icon: HeartHandshake },
                { label: 'MEAL (Monitoring & Eval)', icon: BarChart2 },
              ].map((dept, idx) => (
                <button
                  key={idx}
                  className="w-full flex items-center space-x-2.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-foreground hover:bg-surface transition text-left"
                >
                  <dept.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{dept.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── 6. SETTINGS ACCORDION ── */}
          <div className="space-y-1 pt-2 border-t border-sidebar-border">
            <button
              onClick={() => toggleSection('settings')}
              title="Settings"
              className={`w-full flex items-center ${
                collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
              } py-2 text-xs font-bold tracking-wider text-sidebar-muted hover:text-sidebar-foreground transition`}
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
              <div className="pl-4 space-y-0.5 border-l border-sidebar-border/40 ml-3 text-sidebar-foreground">
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
                  className="w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:text-primary hover:bg-surface transition"
                >
                  <Shield className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span>RBAC Matrix</span>
                </Link>
              </div>
            )}
          </div>
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
