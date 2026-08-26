'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  User,
  Clock,
  MapPin,
  Layers,
  History,
  Timer,
  Calendar,
  CheckCircle2,
  CreditCard,
  Award,
  DollarSign,
  FileText,
  UserCheck,
  Users,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export interface SubNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

export const DASHBOARD_SUB_NAV_ITEMS: SubNavItem[] = [
  { id: 'overview', label: 'OVERVIEW', href: '/dashboard', icon: LayoutGrid },
  { id: 'my-profile', label: 'MY PROFILE', href: '/dashboard/my-profile', icon: User },
  { id: 'attendance-logs', label: 'ATTENDANCE LOGS', href: '/dashboard#attendance', icon: Clock },
  { id: 'gps-attendance', label: 'GPS ATTENDANCE', href: '/dashboard#gps', icon: MapPin },
  { id: 'all-request', label: 'ALL REQUEST', href: '/dashboard#requests', icon: Layers },
  { id: 'history-track', label: 'HISTORY TRACK', href: '/dashboard#history', icon: History },
  { id: 'on-duty', label: 'ON DUTY', href: '/dashboard#onduty', icon: Timer },
  { id: 'my-leave', label: 'MY LEAVE', href: '/dashboard#leave', icon: Calendar },
  { id: 'approvals', label: 'APPROVALS', href: '/workflows', icon: CheckCircle2 },
  { id: 'expenses', label: 'EXPENSES', href: '/dashboard#expenses', icon: CreditCard },
  { id: 'appraisal', label: 'APPRAISAL', href: '/dashboard#appraisal', icon: Award },
  { id: 'payroll', label: 'PAYROLL', href: '/dashboard#payroll', icon: DollarSign },
  { id: 'tax-noc', label: 'TAX & NOC REQUEST', href: '/dashboard#tax', icon: FileText },
  { id: 'on-leave', label: 'ON LEAVE', href: '/dashboard#onleave', icon: UserCheck },
  { id: 'my-department', label: 'MY DEPARTMENT', href: '/dashboard#department', icon: Users },
  { id: 'my-team', label: 'MY TEAM', href: '/dashboard#team', icon: Users },
];

export function DashboardSubNav({ activeTab }: { activeTab?: string }) {
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative mb-6 select-none">
      <div className="flex items-center">
        {/* Scroll Left Button */}
        <button
          onClick={() => scroll('left')}
          className="hidden sm:flex p-1.5 rounded-xl bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-surface mr-2 flex-shrink-0 transition shadow-sm"
          title="Scroll Left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Scrollable Navigation Strip */}
        <div
          ref={scrollContainerRef}
          className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth w-full"
        >
          {DASHBOARD_SUB_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.href === '/dashboard' && pathname === '/dashboard' && !activeTab) ||
              (item.href === '/dashboard/my-profile' && pathname === '/dashboard/my-profile');

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap transition-all shadow-sm flex-shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md ring-1 ring-primary/60 scale-[1.02]'
                    : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-surface hover:border-primary/40'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary-foreground' : 'text-amber-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          onClick={() => scroll('right')}
          className="hidden sm:flex p-1.5 rounded-xl bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-surface ml-2 flex-shrink-0 transition shadow-sm"
          title="Scroll Right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
