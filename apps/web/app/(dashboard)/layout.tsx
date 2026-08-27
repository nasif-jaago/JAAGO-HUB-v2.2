'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { getActiveEmployeeProfile, getCurrentUserSession } from '@/lib/user-profile-sync';
import { getSupabase } from '@/lib/supabase-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currentUser, setCurrentUser] = useState(() => {
    const session = getCurrentUserSession();
    return {
      fullName: session?.fullName || 'Nasif Kamal',
      jobTitle: session?.jobTitle || 'Coordinator',
      avatarUrl: session?.avatarUrl || '',
    };
  });

  // Client-Side User Session Sync & Auth Listener
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();

    // Hydrate user from stored session
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('jaago_user') : null;
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

  // Auto-hide sidebar timer & real-time profile event listener
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

