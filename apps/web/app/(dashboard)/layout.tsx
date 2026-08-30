'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { getActiveEmployeeProfile, getCurrentUserSession } from '@/lib/user-profile-sync';
import { getSupabase } from '@/lib/supabase-auth';
import { AbilityProvider } from '@/lib/casl-ability';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currentUser, setCurrentUser] = useState({
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator',
    avatarUrl: '',
  });

  // Client-Side User Session Sync & Auth Listener
  useEffect(() => {
    let isMounted = true;
    const session = getCurrentUserSession();
    if (session && isMounted) {
      setCurrentUser({
        fullName: session.fullName || 'Nasif Kamal',
        jobTitle: session.jobTitle || 'Coordinator',
        avatarUrl: session.avatarUrl || '',
      });
    }

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
    } = supabase.auth.onAuthStateChange(async (_event, authSession) => {
      if (authSession?.user && isMounted) {
        const userMeta = authSession.user.user_metadata || {};
        setCurrentUser({
          fullName: userMeta.full_name || authSession.user.email?.split('@')[0] || 'User',
          jobTitle: userMeta.job_title || 'Staff Member',
          avatarUrl: userMeta.avatar_url || authSession.user.user_metadata?.picture || '',
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Auto-Expand on Hover Handlers ──
  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setSidebarCollapsed(false);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setSidebarCollapsed(true);
    }, 400);
  };

  return (
    <AbilityProvider>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* ── Collapsible Floating Hover Trigger & Sidebar ── */}
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
    </AbilityProvider>
  );
}
