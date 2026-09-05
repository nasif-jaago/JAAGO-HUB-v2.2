'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Coffee,
  Bell,
  Search,
  Tv,
  Smartphone,
  LogOut,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOutUser } from '@/lib/supabase-auth';
import {
  fetchUserNotifications,
  fetchUserNotificationsAsync,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  AppNotification,
} from '@/lib/notifications';


export interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  user: {
    fullName: string;
    jobTitle: string;
    avatarUrl?: string;
  };
}

export type ThemeMode = 'dark' | 'light' | 'espresso';
export type ViewMode = 'desktop' | 'mobile';

export function DashboardHeader({ onToggleSidebar, user }: DashboardHeaderProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const notifMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    // 1. Immediate sync from local cache
    const cached = fetchUserNotifications();
    if (cached.length > 0) {
      setNotifications(cached);
    }
    // 2. Fetch live data from Supabase / API
    try {
      const live = await fetchUserNotificationsAsync();
      setNotifications(live);
    } catch {}
  };

  useEffect(() => {
    loadNotifications();

    const handleNotifUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('jaago_notifications_updated', handleNotifUpdate);
    window.addEventListener('jaago_leave_request_updated', handleNotifUpdate);
    window.addEventListener('jaago_attendance_regularization_updated', handleNotifUpdate);
    window.addEventListener('jaago_attendance_updated', handleNotifUpdate);
    window.addEventListener('storage', handleNotifUpdate);

    // Periodic live sync every 15 seconds
    const interval = setInterval(loadNotifications, 15000);

    return () => {
      window.removeEventListener('jaago_notifications_updated', handleNotifUpdate);
      window.removeEventListener('jaago_leave_request_updated', handleNotifUpdate);
      window.removeEventListener('jaago_attendance_regularization_updated', handleNotifUpdate);
      window.removeEventListener('jaago_attendance_updated', handleNotifUpdate);
      window.removeEventListener('storage', handleNotifUpdate);
      clearInterval(interval);
    };
  }, []);

  // Close dropdowns on outside click or ESC key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifMenu(false);
        setShowUserMenu(false);
        setShowSearchModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Load saved theme and view mode from localStorage on mount
  useEffect(() => {
    setMounted(true);
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

      const savedViewMode = localStorage.getItem('jaago_view_mode') as ViewMode | null;
      if (savedViewMode === 'mobile' || savedViewMode === 'desktop') {
        setViewMode(savedViewMode);
      }
    }
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.data) {
        setSearchResults(data.data);
      }
    } catch {
      // Ignore search error
    }
  };

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

  const toggleViewMode = () => {
    const nextMode: ViewMode = viewMode === 'desktop' ? 'mobile' : 'desktop';
    setViewMode(nextMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jaago_view_mode', nextMode);
      window.dispatchEvent(new CustomEvent('jaago_view_mode_change', { detail: nextMode }));
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
  };


  return (
    <header className="h-16 border-b border-header-border bg-header text-header-foreground px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none transition-colors duration-200">
      {/* Left: Hamburger Menu (Mobile & Desktop) */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-header-foreground/80 hover:text-header-foreground hover:bg-surface/30 transition cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Breadcrumbs */}
        <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm font-semibold tracking-wide">
          <Link
            href="/dashboard"
            className="text-primary font-black tracking-wider hover:opacity-85 transition cursor-pointer"
          >
            JAAGO HUB
          </Link>
          <Link
            href="/dashboard"
            className="text-header-foreground/60 hover:text-header-foreground transition hidden sm:inline cursor-pointer"
          >
            Dashboards
          </Link>
          <span className="text-header-foreground/50 hidden sm:inline">&gt;</span>
          <Link
            href="/dashboard"
            className="text-header-foreground hover:text-primary transition cursor-pointer"
          >
            My Dashboard
          </Link>
        </div>
      </div>

      {/* Center on Mobile: JAAGO HUB Brand */}
      <Link
        href="/dashboard"
        className="sm:hidden text-base font-black tracking-wider text-foreground hover:opacity-85 transition cursor-pointer"
      >
        <span className="text-primary">JAAGO</span> HUB
      </Link>

      {/* Right: Actions */}
      <div className="flex items-center space-x-1.5 sm:space-x-3">
        {/* Desktop Search */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="hidden sm:inline-flex p-2 rounded-xl text-header-foreground/80 hover:text-header-foreground hover:bg-surface/30 transition cursor-pointer"
          title="Search (Cmd+K)"
        >
          <Search className="h-4 w-4 hover:text-primary" />
        </button>

        {/* Global Search Modal */}
        {showSearchModal && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4"
            onClick={() => setShowSearchModal(false)}
          >
            <div
              className="bg-card border border-border/90 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 space-y-3 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search staff, workflows, modules, circulars, reports..."
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-surface border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono px-2 py-0.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground"
                >
                  ESC
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setShowSearchModal(false);
                        router.push(item.url);
                      }}
                      className="p-3 rounded-xl bg-surface/70 hover:bg-surface border border-border/70 hover:border-primary/40 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-foreground">{item.title}</div>
                        <div className="text-[11px] text-muted-foreground">{item.subtitle || item.snippet}</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-card border border-border text-primary">
                        {item.entityType}
                      </span>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No matching records found for &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="text-center py-4 text-[11px] text-muted-foreground font-mono">
                  Type to search across JAAGO Foundation ERP modules
                </div>
              )}
            </div>
          </div>
        )}

        {/* Theme Switcher (3-Way: Dark / Light / Espresso) */}
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

        {/* Mobile Quick Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="sm:hidden p-2 rounded-xl text-destructive hover:bg-destructive/10 transition border border-destructive/20 cursor-pointer"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>

        {/* Shift Mobile View & Desktop View Button */}
        <button
          onClick={toggleViewMode}
          className={`p-2 rounded-xl text-header-foreground/80 hover:text-header-foreground hover:bg-surface/30 transition flex items-center justify-center cursor-pointer ${
            viewMode === 'mobile' ? 'bg-primary/20 text-primary border border-primary/40' : ''
          }`}
          title={
            viewMode === 'mobile'
              ? 'Currently in Mobile View — Click to shift to Desktop View'
              : 'Currently in Desktop View — Click to shift to Mobile View'
          }
          aria-label="Shift Mobile View and Desktop View"
        >
          {viewMode === 'mobile' ? (
            <Smartphone className="h-4 w-4 text-primary" />
          ) : (
            <Tv className="h-4 w-4 hover:text-primary" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 rounded-xl text-header-foreground/80 hover:text-header-foreground hover:bg-surface/30 transition relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-4 w-4 hover:text-primary" />
            {notifications.some((n) => !n.isRead) && (
              <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse border-2 border-background" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  {notifications.filter((n) => !n.isRead).length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold text-[10px]">
                      {notifications.filter((n) => !n.isRead).length} pending
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      markAllNotificationsAsRead();
                      setNotifications([]);
                    }}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    <Check className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                    <span>All caught up! No action pending notifications.</span>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationAsRead(notif.id);
                        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                        setShowNotifMenu(false);
                        router.push(notif.actionUrl || '/workflows');
                      }}
                      className={`group relative p-2.5 rounded-xl border cursor-pointer transition space-y-1.5 ${
                        !notif.isRead
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30'
                          : 'bg-surface/70 hover:bg-surface border-border/80 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider ${
                              notif.category === 'approvals' ? 'text-amber-400' : 'text-primary'
                            }`}
                          >
                            {notif.category.replace(/_/g, ' ')}
                          </span>
                          {notif.category === 'approvals' && (
                            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                              Action Required
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-[9px] font-mono text-muted-foreground">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notif.id);
                              setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface/60 transition cursor-pointer"
                            title="Dismiss notification"
                            aria-label="Dismiss notification"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs font-bold text-foreground leading-snug">{notif.title}</div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">{notif.message}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-1.5 text-center border-t border-border">
                <button
                  onClick={() => {
                    setShowNotifMenu(false);
                    router.push('/workflows');
                  }}
                  className="text-[11px] text-primary font-bold hover:underline cursor-pointer"
                >
                  View all in Workflows &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar with Yellow Circle */}
        <div className="relative pl-1" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-0.5 rounded-full hover:ring-2 hover:ring-primary/50 transition cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center text-xs shadow-md overflow-hidden border border-primary/40">
              {mounted && user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {user.fullName
                    ? user.fullName
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'NK'}
                </span>
              )}
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-card border border-border shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="p-3 border-b border-border">
                <div className="text-xs font-bold text-foreground truncate">{user.fullName}</div>
                <div className="text-[11px] text-muted-foreground truncate">{user.jobTitle}</div>
              </div>
              <div className="pt-2 space-y-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/dashboard/my-profile');
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface rounded-xl transition cursor-pointer"
                >
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
