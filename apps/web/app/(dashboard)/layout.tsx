'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardSidebar } from '@/components/dashboard-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const currentUser = {
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator',
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
