'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Search,
  Mail,
  Phone,
  Copy,
  Check,
  Layers,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';
import { fetchDepartmentsFromSupabase, DepartmentItem } from '@/lib/supabase-organization';
import { fetchLeaveRequests, LeaveRequestItem } from '@/lib/supabase-time-off';
import { getActiveEmployeeProfile } from '@/lib/user-profile-sync';

export default function MyDepartmentPage() {
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

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    getActiveEmployeeProfile().then((emp) => {
      if (emp && emp.department) {
        setSelectedDept(emp.department);
      }
    });

    fetchEmployeesFromSupabase().then((emps) => {
      if (emps && emps.length > 0) setEmployees(emps);
    });

    fetchDepartmentsFromSupabase().then((depts) => {
      if (depts && depts.length > 0) setDepartments(depts);
    });

    fetchLeaveRequests().then((reqs) => {
      if (reqs && reqs.length > 0) setLeaveRequests(reqs);
    });
  }, []);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const onLeaveEmpCodes = useMemo(() => {
    const set = new Set<string>();
    leaveRequests.forEach((req) => {
      if (req.status === 'Approved' && req.fromDate <= todayStr && req.toDate >= todayStr) {
        if (req.employeeCode) set.add(req.employeeCode.toLowerCase());
      }
    });
    return set;
  }, [leaveRequests, todayStr]);

  // List of all department names from employees & master data
  const availableDepartmentNames = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => {
      if (d.name) map.set(d.name.trim().toLowerCase(), d.name.trim());
    });
    employees.forEach((e) => {
      if (e.department && e.department.trim()) {
        map.set(e.department.trim().toLowerCase(), e.department.trim());
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [departments, employees]);

  // Active department employees
  const activeDeptEmployees = useMemo(() => {
    const currentTarget = (selectedDept || availableDepartmentNames[0] || '').toLowerCase();
    return employees.filter(
      (e) =>
        e &&
        !e.isArchived &&
        e.status !== 'Terminated' &&
        e.status !== 'Resigned' &&
        e.department &&
        e.department.toLowerCase().trim() === currentTarget.trim()
    );
  }, [employees, selectedDept, availableDepartmentNames]);

  // Search filter
  const filteredDeptEmployees = useMemo(() => {
    if (!searchQuery.trim()) return activeDeptEmployees;
    const q = searchQuery.toLowerCase();
    return activeDeptEmployees.filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.code && emp.code.toLowerCase().includes(q)) ||
        (emp.designation && emp.designation.toLowerCase().includes(q)) ||
        (emp.team && emp.team.toLowerCase().includes(q)) ||
        (emp.branch && emp.branch.toLowerCase().includes(q)) ||
        (emp.supervisor && emp.supervisor.toLowerCase().includes(q))
    );
  }, [activeDeptEmployees, searchQuery]);

  // Department Statistics
  const totalHeadcount = activeDeptEmployees.length;
  const onLeaveCount = activeDeptEmployees.filter((e) => e.code && onLeaveEmpCodes.has(e.code.toLowerCase())).length;
  const activeCount = totalHeadcount - onLeaveCount;

  // Distinct teams in this department
  const teamsInDept = Array.from(new Set(activeDeptEmployees.map((e) => e.team).filter(Boolean)));

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
            <span className="text-foreground font-bold">My Department</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center space-x-3 mt-1">
            <span>{selectedDept || 'My Department'}</span>
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold">
              {totalHeadcount} Staff Members
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Departmental headcount, team units, and organizational roster synced from People &amp; Culture profiles.
          </p>
        </div>

        {/* Department Switcher Dropdown */}
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-10 pl-3.5 pr-8 rounded-xl bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
            >
              {availableDepartmentNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/organization/contacts"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-amber-500/20 flex items-center space-x-1.5"
          >
            <span>EXCEL DIRECTORY</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black flex-shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground font-mono">{totalHeadcount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">Total Staff</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black flex-shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-500 font-mono">{activeCount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">In Office / Active</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-black flex-shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-purple-400 font-mono">{onLeaveCount}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">On Leave</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-black flex-shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-blue-400 font-mono">{teamsInDept.length}</div>
            <div className="text-[11px] font-bold text-muted-foreground uppercase">Operational Teams</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, ID, designation, team, or supervisor..."
          className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Staff Directory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDeptEmployees.map((emp) => {
          const isOnLeave = emp.code && onLeaveEmpCodes.has(emp.code.toLowerCase());
          const mobile = emp.workMobile || emp.personalPhone || '';
          const email = emp.workEmail || emp.personalEmail || '';

          return (
            <div
              key={emp.id || emp.code}
              className="rounded-3xl bg-card border border-border/80 p-5 space-y-4 shadow-sm hover:shadow-md hover:border-amber-500/40 transition group"
            >
              <div className="flex items-start space-x-3.5">
                <div className="relative">
                  {emp.avatarUrl ? (
                    <img
                      src={emp.avatarUrl}
                      alt={emp.name}
                      className="h-12 w-12 rounded-2xl object-cover border border-border shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-[#26180E] text-amber-500 font-black text-sm flex items-center justify-center border border-amber-500/30 shadow-sm flex-shrink-0">
                      {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'DP'}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${
                      isOnLeave ? 'bg-purple-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>

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

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {emp.team && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold text-[10px]">
                    Team: {emp.team}
                  </span>
                )}
                {emp.bloodGroup && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono font-bold text-[10px]">
                    {emp.bloodGroup}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-muted-foreground text-[10px]">
                  {emp.branch || 'Head Office'}
                </span>
              </div>

              {/* Hierarchy Box */}
              {emp.supervisor && (
                <div className="p-2.5 rounded-xl bg-surface/50 border border-border/60 text-xs flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">Reporting To:</span>
                  <span className="text-[11px] font-bold text-foreground truncate max-w-[170px]">{emp.supervisor}</span>
                </div>
              )}

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
                      onClick={() => handleCopy(mobile, `dept-mob-${emp.code}`)}
                      className="p-1 text-muted-foreground hover:text-amber-500 cursor-pointer"
                    >
                      {copiedKey === `dept-mob-${emp.code}` ? (
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

      {filteredDeptEmployees.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-card border border-border text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-bold text-foreground text-sm">No employees found in this department</h3>
          <p className="text-xs mt-1">Select a different department from the dropdown above.</p>
        </div>
      )}
    </div>
  );
}
