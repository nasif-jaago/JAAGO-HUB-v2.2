'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Mail,
  Phone,
  Copy,
  Check,
} from 'lucide-react';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';

export default function CrossDepartmentPage() {
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('jaago_pnc_employees_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [activeDeptTab, setActiveDeptTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployeesFromSupabase().then((emps) => {
      if (emps && emps.length > 0) setEmployees(emps);
    });
  }, []);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Group employees by Department
  const departmentGroups = useMemo(() => {
    const map = new Map<string, FullEmployeeProfile[]>();

    employees.forEach((emp) => {
      if (!emp || emp.isArchived || emp.status === 'Terminated' || emp.status === 'Resigned') return;
      const dept = emp.department?.trim() || 'General Operations';
      const list = map.get(dept) || [];
      list.push(emp);
      map.set(dept, list);
    });

    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [employees]);

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!emp || emp.isArchived || emp.status === 'Terminated' || emp.status === 'Resigned') return false;

      if (activeDeptTab !== 'ALL') {
        if ((emp.department || '').toLowerCase().trim() !== activeDeptTab.toLowerCase().trim()) return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.code && emp.code.toLowerCase().includes(q)) ||
        (emp.designation && emp.designation.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.team && emp.team.toLowerCase().includes(q)) ||
        (emp.branch && emp.branch.toLowerCase().includes(q)) ||
        (emp.workEmail && emp.workEmail.toLowerCase().includes(q)) ||
        (emp.workMobile && emp.workMobile.includes(q))
      );
    });
  }, [employees, activeDeptTab, searchQuery]);

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <Link href="/dashboard" className="hover:text-primary transition cursor-pointer">
              Organization
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Cross Department Collaboration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center space-x-3 mt-1">
            <span>Cross-Departmental Directory</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Explore teams, project focal persons, and contacts across all foundation departments.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            href="/organization/contacts"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-amber-500/20"
          >
            EXCEL CONTACTS
          </Link>
        </div>
      </div>

      {/* Department Summary Badges Strip */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2">
        <button
          type="button"
          onClick={() => setActiveDeptTab('ALL')}
          className={`px-4 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-wider whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
            activeDeptTab === 'ALL'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          All Departments ({employees.length})
        </button>

        {departmentGroups.map(([deptName, members]) => (
          <button
            key={deptName}
            type="button"
            onClick={() => setActiveDeptTab(deptName)}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex-shrink-0 flex items-center space-x-2 ${
              activeDeptTab === deptName
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{deptName}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-surface text-[10px] font-mono">
              {members.length}
            </span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search any employee by name, designation, department, team..."
          className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => {
          const mobile = emp.workMobile || emp.personalPhone || '';
          const email = emp.workEmail || emp.personalEmail || '';

          return (
            <div
              key={emp.id || emp.code}
              className="rounded-3xl bg-card border border-border/80 p-5 space-y-4 shadow-sm hover:shadow-md hover:border-amber-500/40 transition group"
            >
              <div className="flex items-start space-x-3.5">
                {emp.avatarUrl ? (
                  <img
                    src={emp.avatarUrl}
                    alt={emp.name}
                    className="h-12 w-12 rounded-2xl object-cover border border-border shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-2xl bg-[#26180E] text-amber-500 font-black text-sm flex items-center justify-center border border-amber-500/30 shadow-sm flex-shrink-0">
                    {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'CD'}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-foreground text-sm group-hover:text-amber-500 transition truncate">
                    {emp.name}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate">
                    ID: {emp.code}
                  </div>
                  <div className="text-xs font-semibold text-amber-500 truncate mt-0.5">
                    {emp.designation}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="px-2.5 py-0.5 rounded-lg bg-surface border border-border font-bold text-foreground">
                  {emp.department}
                </span>
                {emp.team && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold">
                    {emp.team}
                  </span>
                )}
                {emp.bloodGroup && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono font-bold">
                    {emp.bloodGroup}
                  </span>
                )}
              </div>

              {/* Contact Footer */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/60 text-xs">
                {mobile ? (
                  <div className="flex items-center space-x-1 min-w-0">
                    <a href={`tel:${mobile}`} className="text-muted-foreground hover:text-emerald-400">
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <span className="text-[11px] font-mono text-muted-foreground truncate">{mobile}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(mobile, `cross-mob-${emp.code}`)}
                      className="p-1 text-muted-foreground hover:text-amber-500 cursor-pointer"
                    >
                      {copiedKey === `cross-mob-${emp.code}` ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">No phone</span>
                )}

                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition"
                    title={`Email ${email}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
