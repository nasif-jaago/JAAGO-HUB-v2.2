'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  FileText,
  ClipboardList,
  ShoppingCart,
  FileQuestion,
  PackageCheck,
  Users,
  Boxes,
  ShieldCheck,
  Tags,
  Ruler,
  Warehouse,
  FileSignature,
  DollarSign,
  BarChart3,
  Settings,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Building2,
  Sun,
  Moon,
  Coffee,
} from 'lucide-react';
import { signOutUser } from '@/lib/supabase-auth';
import { getCurrentUserSession, UserSessionData } from '@/lib/user-profile-sync';
import { getProcurementRequests, getPurchaseOrders } from '@/lib/supabase-procurement';

export type ThemeMode = 'dark' | 'light' | 'espresso';

export default function AdminProcurementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [selectedOrg, setSelectedOrg] = useState('ALL');
  const [globalSearch, setGlobalSearch] = useState('');
  const [pendingReqCount, setPendingReqCount] = useState(1);
  const [pendingGenReqCount, setPendingGenReqCount] = useState(1);
  const [openPOCount, setOpenPOCount] = useState(5);

  // Load User & Theme on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Theme sync
    const applyTheme = (savedTheme: ThemeMode | null) => {
      const root = document.documentElement;
      root.classList.remove('dark', 'light', 'espresso');
      if (savedTheme === 'dark' || savedTheme === 'espresso') {
        root.classList.add(savedTheme);
        setTheme(savedTheme);
      } else if (savedTheme === 'light') {
        setTheme('light');
      } else if (root.classList.contains('espresso')) {
        setTheme('espresso');
      } else if (root.classList.contains('dark')) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    };

    const saved = localStorage.getItem('jaago_theme') as ThemeMode | null;
    applyTheme(saved);

    const handleThemeChanged = (e: Event) => {
      const next = (e as CustomEvent).detail as ThemeMode;
      if (next) applyTheme(next);
    };
    window.addEventListener('jaago_theme_changed', handleThemeChanged);

    // User session
    const session = getCurrentUserSession();
    if (session) {
      setCurrentUser(session);
    } else {
      setCurrentUser({
        id: 'fo-nasif',
        fullName: 'Nasif Kamal',
        jobTitle: 'Coordinator',
        email: 'nasif.kamal@jaago.com.bd',
        employeeCode: 'FO032507061190',
        department: "Founder's Office",
        organizationName: 'JAAGO Foundation',
        roles: ['super_admin'],
        permissions: ['*'],
      });
    }

    // Badge Counts
    const loadCounts = async () => {
      try {
        const [reqs, pos] = await Promise.all([getProcurementRequests(), getPurchaseOrders()]);
        const pReqs = reqs.filter((r) => r.requisitionType === 'Purchase' && (r.status === 'Submitted' || r.status === 'Under Review')).length;
        const gReqs = reqs.filter((r) => r.requisitionType === 'General' && (r.status === 'Submitted' || r.status === 'Under Review')).length;
        const oPOs = pos.filter((p) => p.status === 'Pending' || p.status === 'Draft').length;
        setPendingReqCount(pReqs);
        setPendingGenReqCount(gReqs);
        setOpenPOCount(oPOs || 5);
      } catch {}
    };
    loadCounts();

    const handleUpdate = () => loadCounts();
    window.addEventListener('jaago_procurement_updated', handleUpdate);

    return () => {
      window.removeEventListener('jaago_theme_changed', handleThemeChanged);
      window.removeEventListener('jaago_procurement_updated', handleUpdate);
    };
  }, []);

  const cycleTheme = () => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light', 'espresso');
    let next: ThemeMode;
    if (theme === 'dark') {
      next = 'light';
    } else if (theme === 'light') {
      next = 'espresso';
      root.classList.add('espresso');
    } else {
      next = 'dark';
      root.classList.add('dark');
    }
    setTheme(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jaago_theme', next);
      window.dispatchEvent(new CustomEvent('jaago_theme_changed', { detail: next }));
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  const navProcurement = [
    { label: 'PURCHASE REQUISITION', href: '/admin-procurement/requests', icon: FileText, badge: pendingReqCount },
    { label: 'GENERAL REQUISITION', href: '/admin-procurement/general-requisitions', icon: ClipboardList, badge: pendingGenReqCount },
    { label: 'PURCHASE ORDERS', href: '/admin-procurement/orders', icon: ShoppingCart, badge: openPOCount },
    { label: 'QUOTATIONS / RFQS', href: '/admin-procurement/rfqs', icon: FileQuestion },
    { label: 'GOODS RECEIPT', href: '/admin-procurement/goods-receipt', icon: PackageCheck },
  ];

  const navAdmin = [
    { label: 'VENDORS & SUPPLIERS', href: '/admin-procurement/vendors', icon: Users },
    { label: 'INVENTORY', href: '/admin-procurement/inventory', icon: Boxes },
    { label: 'ASSETS', href: '/admin-procurement/assets', icon: ShieldCheck },
    { label: 'CATEGORIES', href: '/admin-procurement/categories', icon: Tags },
    { label: 'UNITS / UOM', href: '/admin-procurement/units', icon: Ruler },
    { label: 'WAREHOUSES', href: '/admin-procurement/warehouses', icon: Warehouse },
    { label: 'CONTRACTS', href: '/admin-procurement/contracts', icon: FileSignature },
    { label: 'BUDGET & APPROVALS', href: '/admin-procurement/budgets', icon: DollarSign },
    { label: 'REPORTS & ANALYTICS', href: '/admin-procurement/reports', icon: BarChart3 },
    { label: 'SETTINGS', href: '/admin-procurement/settings', icon: Settings },
  ];

  // Breadcrumbs determination
  const getBreadcrumbName = () => {
    if (pathname.includes('/general-requisitions')) return 'General Requisitions';
    if (pathname.includes('/requests')) return 'Purchase Requisitions';
    if (pathname.includes('/orders')) return 'Orders';
    if (pathname.includes('/vendors')) return 'Vendors';
    if (pathname.includes('/rfqs')) return 'Quotations / RFQs';
    if (pathname.includes('/goods-receipt')) return 'Goods Receipt';
    if (pathname.includes('/inventory')) return 'Inventory';
    if (pathname.includes('/assets')) return 'Assets';
    if (pathname.includes('/categories')) return 'Categories';
    if (pathname.includes('/units')) return 'Units / UOM';
    if (pathname.includes('/warehouses')) return 'Warehouses';
    if (pathname.includes('/contracts')) return 'Contracts';
    if (pathname.includes('/budgets')) return 'Budget & Approvals';
    if (pathname.includes('/reports')) return 'Reports & Analytics';
    if (pathname.includes('/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── 1. DEDICATED PROCUREMENT SIDEBAR (Matches Screenshots 1, 2, 3, 4) ─ */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col justify-between select-none shadow-2xl ${
          collapsed ? 'w-[72px]' : 'w-[250px]'
        }`}
      >
        {/* Top Header inside Sidebar */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-3 scrollbar-none relative">
          {/* Logo & Collapse Header */}
          <div className="flex items-center justify-between pb-1 border-b border-sidebar-border/40">
            <Link
              href="/admin-procurement"
              className="flex items-center space-x-2.5 group cursor-pointer"
              title="JAAGO HUB - Admin & Procurement"
            >
              <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center shadow-md flex-shrink-0 group-hover:scale-105 transition border border-primary/40 bg-[#F5C200]">
                <Image
                  src="/jaago-logo-round.png"
                  alt="JAAGO Foundation"
                  width={36}
                  height={36}
                  priority
                  className="h-full w-full object-contain rounded-full"
                />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-black tracking-wider text-sidebar-foreground uppercase leading-tight">
                    JAAGO HUB
                  </div>
                  <div className="text-[9px] font-extrabold tracking-wider text-[#F5C200] uppercase truncate">
                    ADMIN &amp; PROCUREMENT
                  </div>
                </div>
              )}
            </Link>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg bg-sidebar-foreground/5 hover:bg-sidebar-foreground/15 border border-sidebar-border text-sidebar-foreground transition cursor-pointer"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* ← BACK TO JAAGO HUB Button */}
          <Link
            href="/dashboard"
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-1' : 'justify-start space-x-2 px-3'
            } py-2 rounded-xl text-xs font-black bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition shadow-sm group`}
            title="Return to JAAGO HUB Dashboard"
          >
            <ArrowLeft className="h-3.5 w-3.5 flex-shrink-0 group-hover:-translate-x-0.5 transition" />
            {!collapsed && <span className="uppercase tracking-wider text-[10.5px]">Back to JAAGO HUB</span>}
          </Link>

          {/* Navigation Groups */}
          <nav className="space-y-4 pt-1">
            {/* OVERVIEW */}
            <div className="space-y-1">
              {!collapsed && (
                <div className="px-1 text-[9.5px] uppercase font-bold tracking-wider text-sidebar-muted">
                  OVERVIEW
                </div>
              )}
              <Link
                href="/admin-procurement"
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-1' : 'justify-between px-3'
                } py-2 rounded-xl text-xs font-bold transition ${
                  pathname === '/admin-procurement'
                    ? 'bg-primary/20 text-[#F5C200] border border-primary/40 font-black shadow-sm'
                    : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10'
                }`}
                title="Procurement Dashboard"
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <LayoutGrid className="h-4 w-4 flex-shrink-0 text-[#F5C200]" />
                  {!collapsed && <span className="truncate">DASHBOARD</span>}
                </div>
              </Link>
            </div>

            {/* PROCUREMENT */}
            <div className="space-y-1 pt-1 border-t border-sidebar-border/50">
              {!collapsed && (
                <div className="px-1 text-[9.5px] uppercase font-bold tracking-wider text-sidebar-muted">
                  PROCUREMENT
                </div>
              )}
              {navProcurement.map((item, idx) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    className={`w-full flex items-center ${
                      collapsed ? 'justify-center px-1' : 'justify-between px-3'
                    } py-2 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'bg-primary/20 text-[#F5C200] border border-primary/40 font-black shadow-sm'
                        : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10'
                    }`}
                    title={item.label}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                    {!collapsed && item.badge !== undefined && item.badge > 0 && (
                      <span className="h-5 px-1.5 rounded-full bg-[#F5C200] text-black text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* ADMIN */}
            <div className="space-y-1 pt-1 border-t border-sidebar-border/50">
              {!collapsed && (
                <div className="px-1 text-[9.5px] uppercase font-bold tracking-wider text-sidebar-muted">
                  ADMIN
                </div>
              )}
              {navAdmin.map((item, idx) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    className={`w-full flex items-center ${
                      collapsed ? 'justify-center px-1' : 'justify-between px-3'
                    } py-1.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-primary/20 text-[#F5C200] border border-primary/40 font-black shadow-sm'
                        : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10'
                    }`}
                    title={item.label}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* User Footer at Bottom of Sidebar */}
        <div className="p-3 border-t border-sidebar-border bg-sidebar-elevated/40">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-full bg-[#F5C200] text-black font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
                  {currentUser?.fullName ? currentUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'NK'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-sidebar-foreground truncate">
                    {currentUser?.fullName || 'Nasif Kamal'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 border border-destructive/20 transition cursor-pointer"
                title="Log Out of System"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>LOG OUT</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 rounded-full bg-[#F5C200] text-black font-black text-xs flex items-center justify-center shadow-sm" title={currentUser?.fullName || 'Nasif Kamal'}>
                {currentUser?.fullName ? currentUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'NK'}
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── 2. TOP HEADER & MAIN APPLICATION CONTENT CONTAINER ──────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          collapsed ? 'pl-[72px]' : 'pl-[250px]'
        }`}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-14 bg-card/80 backdrop-blur-md border-b border-border px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2 text-xs font-medium text-muted-foreground truncate">
            <Link href="/dashboard" className="hover:text-primary transition">
              JAAGO HUB
            </Link>
            <span>&gt;</span>
            <Link href="/admin-procurement" className="hover:text-primary transition">
              Admin &amp; Procurement
            </Link>
            <span>&gt;</span>
            <span className="font-bold text-foreground truncate">{getBreadcrumbName()}</span>
          </div>

          {/* Right Header Actions: Search, Organization, Theme Switcher */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 flex-shrink-0">
            {/* Search Input */}
            <div className="relative hidden md:block w-56 lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search POs, vendors, assets..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Organization Selector Dropdown */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer uppercase text-foreground"
                aria-label="Filter by Organization"
              >
                <option value="ALL" className="bg-card text-foreground">ALL ORGANIZATIONS</option>
                <option value="JAAGO Foundation Trust" className="bg-card text-foreground">JAAGO Foundation Trust</option>
                <option value="JAAGO Foundation (Society)" className="bg-card text-foreground">JAAGO Foundation (Society)</option>
              </select>
            </div>

            {/* Tri-Theme Toggle Button */}
            <button
              onClick={cycleTheme}
              className="p-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border text-foreground transition cursor-pointer shadow-sm flex items-center justify-center"
              title={`Theme: ${theme.toUpperCase()} (Click to toggle Light, Dark, Espresso)`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' && <Moon className="h-4 w-4 text-primary" />}
              {theme === 'light' && <Sun className="h-4 w-4 text-amber-500" />}
              {theme === 'espresso' && <Coffee className="h-4 w-4 text-amber-600" />}
            </button>
          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
