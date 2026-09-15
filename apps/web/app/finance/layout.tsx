'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DollarSign,
  LayoutGrid,
  FileText,
  ClipboardList,
  Receipt,
  BarChart3,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Coffee,
  LogOut,
} from 'lucide-react';
import { signOutUser } from '@/lib/supabase-auth';
import { getCurrentUserSession, UserSessionData } from '@/lib/user-profile-sync';

export type ThemeMode = 'dark' | 'light' | 'espresso';

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [expenseAccordionOpen, setExpenseAccordionOpen] = useState(true);

  // Sync theme
  useEffect(() => {
    if (typeof window === 'undefined') return;

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

    const session = getCurrentUserSession();
    setCurrentUser(session);

    return () => {
      window.removeEventListener('jaago_theme_changed', handleThemeChanged);
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

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── TOP NAV HEADER ── */}
      <header className="sticky top-0 z-40 h-14 bg-card/80 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 text-xs font-bold text-muted-foreground hover:text-foreground transition"
            title="Return to JAAGO Hub Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Hub Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              ৳
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black tracking-tight text-foreground">
                Finance &amp; Accounting
              </span>
              <span className="hidden md:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Department Portal
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            title={`Current: ${theme} mode (click to cycle)`}
          >
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 text-amber-400" />
            ) : theme === 'espresso' ? (
              <Coffee className="h-4 w-4 text-amber-600" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
          </button>

          <div className="flex items-center space-x-2 pl-2 border-l border-border">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-foreground truncate max-w-[120px]">
                {currentUser?.fullName || 'Finance Lead'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                {currentUser?.jobTitle || 'Finance & Accounts'}
              </p>
            </div>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs border border-primary/20">
              {(currentUser?.fullName || 'F')[0]}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN SHELL WITH SIDEBAR ── */}
      <div className="flex-1 flex">
        {/* Department Sidebar */}
        <aside className="w-60 bg-card border-r border-border p-3 space-y-1 hidden md:flex flex-col justify-between flex-shrink-0">
          <div className="space-y-1">
            {/* Overview */}
            <Link
              href="/finance"
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                pathname === '/finance'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <LayoutGrid className="h-4 w-4 flex-shrink-0" />
              <span>Overview</span>
            </Link>

            {/* EXPENSE Accordion */}
            <div className="pt-2 space-y-1">
              <button
                type="button"
                onClick={() => setExpenseAccordionOpen(!expenseAccordionOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span>EXPENSE</span>
                </div>
                {expenseAccordionOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              {expenseAccordionOpen && (
                <div className="pl-3 space-y-1 border-l-2 border-border ml-3 animate-in fade-in">
                  <Link
                    href="/finance/expenses/advance-requests"
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname?.includes('/finance/expenses/advance-requests')
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Advance Request Form</span>
                  </Link>

                  <Link
                    href="/finance/expenses/liquidations"
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      pathname?.includes('/finance/expenses/liquidations')
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Liquidation Form</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Payment Voucher / Bill */}
            <Link
              href="/finance/payment-vouchers"
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                pathname?.includes('/finance/payment-vouchers')
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Receipt className="h-4 w-4 flex-shrink-0" />
              <span>Payment Voucher / Bill</span>
            </Link>

            {/* Reports */}
            <Link
              href="/finance/reports"
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                pathname?.includes('/finance/reports')
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <BarChart3 className="h-4 w-4 flex-shrink-0" />
              <span>Reports</span>
            </Link>
          </div>

          {/* Bottom user logout */}
          <div className="pt-3 border-t border-border space-y-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
