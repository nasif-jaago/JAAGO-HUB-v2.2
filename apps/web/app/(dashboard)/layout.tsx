'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { getActiveEmployeeProfile } from '@/lib/user-profile-sync';
import { getSupabase } from '@/lib/supabase-auth';
import { Shield, Lock } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Strict Enterprise Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [currentUser, setCurrentUser] = useState({
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator',
    avatarUrl: '',
  });

  // Client-Side ERP Authentication Verification
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();

    async function verifySession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const storedToken =
          typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
        const storedUser =
          typeof window !== 'undefined' ? localStorage.getItem('jaago_user') : null;

        if (!session && !storedToken && !storedUser) {
          if (isMounted) {
            setIsAuthenticated(false);
            const redirectPath = window.location.pathname + window.location.search;
            window.location.href = `/login?redirect=${encodeURIComponent(redirectPath)}`;
          }
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
        }

        // Hydrate user from stored session
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed.fullName && isMounted) {
              setCurrentUser({
                fullName: parsed.fullName,
                jobTitle: parsed.jobTitle || 'Coordinator',
                avatarUrl: parsed.avatarUrl || '',
              });
            }
          } catch {}
        }

        // Fetch fresh employee profile from Supabase
        getActiveEmployeeProfile().then((emp) => {
          if (emp && isMounted) {
            setCurrentUser({
              fullName: emp.name,
              jobTitle: emp.designation,
              avatarUrl: emp.avatarUrl || '',
            });
          }
        });
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          window.location.href = '/login';
        }
      }
    }

    verifySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (isMounted) {
          setIsAuthenticated(false);
          window.location.href = '/login';
        }
      } else if (session) {
        if (isMounted) {
          setIsAuthenticated(true);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Auto-hide sidebar timer
  useEffect(() => {
    startAutoHideTimer();

    const handleUserUpdated = (e: any) => {
      if (e.detail?.user) {
        setCurrentUser({
          fullName: e.detail.user.fullName || 'Nasif Kamal',
          jobTitle: e.detail.user.jobTitle || 'Coordinator',
          avatarUrl: e.detail.user.avatarUrl || '',
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('jaago_user_updated', handleUserUpdated);
    }

    return () => {
      clearAutoHideTimer();
      if (typeof window !== 'undefined') {
        window.removeEventListener('jaago_user_updated', handleUserUpdated);
      }
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

  // ── ZERO CONTENT LEAK GUARD ──
  // If unauthenticated or verifying credentials, NEVER render sidebar, header or dashboard contents
  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground p-6 text-center select-none">
        <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-primary/10 border border-primary/25 animate-ping opacity-25" />
            <div className="relative h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center text-primary shadow-xl">
              <Shield className="h-8 w-8 stroke-[2.2] animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2 text-xs font-black uppercase tracking-widest text-primary">
              <Lock className="h-3.5 w-3.5" />
              <span>Enterprise Identity Verification</span>
            </div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              Authenticating JAAGO HUB Session
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verifying authorized organization access credentials. Redirecting to login...
            </p>
          </div>

          <div className="w-48 h-1 bg-surface rounded-full mx-auto overflow-hidden border border-border">
            <div className="w-full h-full bg-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex relative overflow-x-hidden">
      {/* ── Left Side Hit Sensor Panel (Hovering here immediately opens the sidebar) ── */}
      <div
        onMouseEnter={handleMouseEnter}
        className="fixed top-0 bottom-0 left-0 w-4 lg:w-5 z-50 pointer-events-auto cursor-pointer"
        title="Hover left edge to open sidebar"
      />

      {/* ── Sidebar Navigation with Auto-Hide and Hover detection ── */}
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => {
          if (sidebarCollapsed) {
            handleMouseEnter();
          } else {
            setSidebarCollapsed(true);
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* ── Main App Content Area (Smoothly expands when sidebar is collapsed) ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          !sidebarCollapsed ? 'lg:pl-72' : 'pl-0'
        }`}
      >
        <DashboardHeader
          user={currentUser}
          onToggleSidebar={() => {
            if (sidebarCollapsed) {
              handleMouseEnter();
            } else {
              setSidebarCollapsed(true);
            }
          }}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

