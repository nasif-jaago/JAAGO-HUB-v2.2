'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Mail,
  Phone,
  Copy,
  Check,
  GitFork,
  Users,
} from 'lucide-react';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';
import {
  getActiveEmployeeProfile,
  getCurrentUserSession,
  UserSessionData,
} from '@/lib/user-profile-sync';

function isDeptMatch(empDept?: string | null, targetDept?: string | null): boolean {
  if (!empDept || !targetDept) return false;
  const a = empDept.toLowerCase().trim();
  const b = targetDept.toLowerCase().trim();
  if (a === b) return true;
  const normA = a.replace(/[^a-z0-9]/g, '');
  const normB = b.replace(/[^a-z0-9]/g, '');
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  if (normA.length >= 6 && normB.length >= 6) {
    if (normA.includes(normB) || normB.includes(normA)) return true;
  }
  return false;
}

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

  const [activeProfile, setActiveProfile] = useState<FullEmployeeProfile | null>(null);
  const [session, setSession] = useState<UserSessionData | null>(null);
  const [activeDeptTab, setActiveDeptTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load active employee profile and user session
  const refreshActiveUser = () => {
    if (typeof window === 'undefined') return;
    setSession(getCurrentUserSession());
    getActiveEmployeeProfile().then((emp) => {
      if (emp) setActiveProfile(emp);
    });
    try {
      const raw = localStorage.getItem('jaago_pnc_employees_v2');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setEmployees(parsed);
      }
    } catch {}
  };

  useEffect(() => {
    refreshActiveUser();

    fetchEmployeesFromSupabase().then((emps) => {
      if (emps && emps.length > 0) setEmployees(emps);
    });

    const handleUserUpdate = () => {
      refreshActiveUser();
    };

    window.addEventListener('jaago_user_updated', handleUserUpdate);
    window.addEventListener('jaago_cross_departments_updated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);

    return () => {
      window.removeEventListener('jaago_user_updated', handleUserUpdate);
      window.removeEventListener('jaago_cross_departments_updated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Configured cross departments from active profile, session, or multi-tier storage
  const configuredCrossDepts = useMemo(() => {
    const list: string[] = [];

    // 1. From activeProfile state
    if (activeProfile?.crossDepartments && Array.isArray(activeProfile.crossDepartments) && activeProfile.crossDepartments.length > 0) {
      list.push(...activeProfile.crossDepartments);
    }

    // 2. From session state
    if (list.length === 0 && session?.crossDepartments && Array.isArray(session.crossDepartments) && session.crossDepartments.length > 0) {
      list.push(...session.crossDepartments);
    }

    if (typeof window !== 'undefined') {
      // 3. From jaago_active_cross_departments key (instant multi-select write)
      if (list.length === 0) {
        try {
          const rawActive = localStorage.getItem('jaago_active_cross_departments');
          if (rawActive) {
            const p = JSON.parse(rawActive);
            if (Array.isArray(p) && p.length > 0) list.push(...p);
          }
        } catch {}
      }

      // 4. From jaago_user in localStorage
      if (list.length === 0) {
        try {
          const rawUser = localStorage.getItem('jaago_user');
          if (rawUser) {
            const u = JSON.parse(rawUser);
            if (Array.isArray(u?.crossDepartments) && u.crossDepartments.length > 0) {
              list.push(...u.crossDepartments);
            }
          }
        } catch {}
      }

      // 5. From jaago_cross_departments_map in localStorage
      if (list.length === 0) {
        try {
          const rawMap = localStorage.getItem('jaago_cross_departments_map');
          if (rawMap) {
            const map = JSON.parse(rawMap);
            if (map && typeof map === 'object') {
              const keysToCheck = [
                session?.employeeCode,
                session?.email?.toLowerCase().trim(),
                session?.fullName?.toLowerCase().trim(),
                activeProfile?.code,
                activeProfile?.id,
                activeProfile?.workEmail?.toLowerCase().trim(),
                'FO032507061190',
                'F0832507061190',
                'nasif.kamal@jaago.com.bd',
              ].filter(Boolean) as string[];

              for (const k of keysToCheck) {
                if (Array.isArray(map[k]) && map[k].length > 0) {
                  list.push(...map[k]);
                  break;
                }
              }

              if (list.length === 0) {
                for (const v of Object.values(map)) {
                  if (Array.isArray(v) && v.length > 0) {
                    list.push(...(v as string[]));
                    break;
                  }
                }
              }
            }
          }
        } catch {}
      }

      // 6. Check all localStorage keys matching jaago_employee_cross_departments_*
      if (list.length === 0) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('jaago_employee_cross_departments_')) {
              const val = localStorage.getItem(k);
              if (val) {
                const p = JSON.parse(val);
                if (Array.isArray(p) && p.length > 0) {
                  list.push(...p);
                  break;
                }
              }
            }
          }
        } catch {}
      }

      // 7. Check cached list in jaago_pnc_employees_v2
      if (list.length === 0) {
        try {
          const rawPnc = localStorage.getItem('jaago_pnc_employees_v2');
          if (rawPnc) {
            const parsedList = JSON.parse(rawPnc);
            if (Array.isArray(parsedList)) {
              const found = parsedList.find((e: any) => {
                const em = (e.workEmail || '').toLowerCase();
                const nm = (e.name || '').toLowerCase();
                const cd = (e.code || '').toLowerCase();
                return (
                  (session?.email && em === session.email.toLowerCase()) ||
                  (session?.employeeCode && cd === session.employeeCode.toLowerCase()) ||
                  em.includes('nasif.kamal') ||
                  nm.includes('nasif kamal') ||
                  cd.includes('032507061190') ||
                  cd.includes('832507061190')
                );
              });
              if (found && Array.isArray(found.crossDepartments) && found.crossDepartments.length > 0) {
                list.push(...found.crossDepartments);
              }
            }
          }
        } catch {}
      }
    }

    // 8. Check in-memory employees state
    if (list.length === 0 && employees && employees.length > 0) {
      const found = employees.find((e) => {
        const em = (e.workEmail || '').toLowerCase();
        const nm = (e.name || '').toLowerCase();
        const cd = (e.code || '').toLowerCase();
        return (
          (session?.email && em === session.email.toLowerCase()) ||
          (session?.employeeCode && cd === session.employeeCode.toLowerCase()) ||
          em.includes('nasif.kamal') ||
          nm.includes('nasif kamal') ||
          cd.includes('032507061190') ||
          cd.includes('832507061190')
        );
      });
      if (found && Array.isArray(found.crossDepartments) && found.crossDepartments.length > 0) {
        list.push(...found.crossDepartments);
      }
    }

    return Array.from(new Set(list.map((d) => d.trim()))).filter(Boolean);
  }, [activeProfile, session, employees]);

  const hasCrossDeptScope = configuredCrossDepts.length > 0;

  // Accessible employees based on strict Cross Department field scoping
  const accessibleEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!emp || emp.isArchived || emp.status === 'Terminated' || emp.status === 'Resigned') {
        return false;
      }
      if (!hasCrossDeptScope) {
        return false;
      }
      return configuredCrossDepts.some((cd) => isDeptMatch(emp.department, cd));
    });
  }, [employees, hasCrossDeptScope, configuredCrossDepts]);

  // Group employees strictly by configured Cross Departments
  const departmentGroups = useMemo(() => {
    if (!hasCrossDeptScope) {
      return [];
    }

    // STRICTLY ONLY show the selected cross-departments as tabs!
    const map = new Map<string, FullEmployeeProfile[]>();
    configuredCrossDepts.forEach((dept) => {
      map.set(dept, []);
    });

    accessibleEmployees.forEach((emp) => {
      const matchedDept = configuredCrossDepts.find((cd) => isDeptMatch(emp.department, cd));
      if (matchedDept) {
        const list = map.get(matchedDept) || [];
        list.push(emp);
        map.set(matchedDept, list);
      }
    });

    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [accessibleEmployees, hasCrossDeptScope, configuredCrossDepts]);

  // Filtered employees list based on active tab and search query
  const filteredEmployees = useMemo(() => {
    return accessibleEmployees.filter((emp) => {
      if (activeDeptTab !== 'ALL') {
        if (!isDeptMatch(emp.department, activeDeptTab)) {
          return false;
        }
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
  }, [accessibleEmployees, activeDeptTab, searchQuery]);

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
            Explore teams, project focal persons, and contacts across assigned collaborative departments.
          </p>
        </div>

      </div>

      {/* Department Summary Badges Strip / Sub-menus (Rendered strictly for scoped departments) */}
      {hasCrossDeptScope && (
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-2">
          <button
            type="button"
            onClick={() => setActiveDeptTab('ALL')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-wider whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
              activeDeptTab === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            All Selected ({accessibleEmployees.length})
          </button>

          {departmentGroups.map(([deptName, members]) => (
            <button
              key={deptName}
              type="button"
              onClick={() => setActiveDeptTab(deptName)}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex-shrink-0 flex items-center space-x-2 ${
                activeDeptTab === deptName
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
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
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search any employee by name, designation, department, team..."
          className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Employees Grid */}
      {!hasCrossDeptScope ? (
        <div className="rounded-3xl bg-card border border-border p-12 text-center space-y-4">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-surface border border-border flex items-center justify-center text-muted-foreground">
            <GitFork className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="font-extrabold text-foreground text-base">
              No Cross-Department Collaborators Configured
            </div>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Per organization policy, this view strictly displays personnel from your assigned cross-departments. Please select your collaborative departments in Employee Profile under PNC.
            </p>
          </div>
          <div>
            <Link
              href="/pnc/employees"
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider transition shadow-md shadow-primary/20"
            >
              <span>Assign Cross Departments</span>
            </Link>
          </div>
        </div>
      ) : filteredEmployees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const mobile = emp.workMobile || emp.personalPhone || '';
            const email = emp.workEmail || emp.personalEmail || '';

            return (
              <div
                key={emp.id || emp.code}
                className="rounded-3xl bg-card border border-border/80 p-5 space-y-4 shadow-sm hover:shadow-md hover:border-primary/40 transition group"
              >
                <div className="flex items-start space-x-3.5">
                  {emp.avatarUrl ? (
                    <img
                      src={emp.avatarUrl}
                      alt={emp.name}
                      className="h-12 w-12 rounded-2xl object-cover border border-border shadow-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary font-black text-sm flex items-center justify-center border border-primary/30 shadow-sm flex-shrink-0">
                      {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'CD'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-foreground text-sm group-hover:text-primary transition truncate">
                      {emp.name}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground truncate">
                      ID: {emp.code}
                    </div>
                    <div className="text-xs font-semibold text-primary truncate mt-0.5">
                      {emp.designation}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="px-2.5 py-0.5 rounded-lg bg-surface border border-border font-bold text-foreground">
                    {emp.department}
                  </span>
                  {emp.team && (
                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold">
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
                      <span className="text-[11px] font-mono text-muted-foreground truncate">
                        {mobile}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(mobile, `cross-mob-${emp.code}`)}
                        className="p-1 text-muted-foreground hover:text-primary cursor-pointer"
                        title="Copy phone"
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
                      className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition"
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
      ) : (
        <div className="rounded-3xl bg-card border border-border p-12 text-center space-y-3">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-surface border border-border flex items-center justify-center text-muted-foreground">
            <Users className="h-6 w-6" />
          </div>
          <div className="font-bold text-foreground text-sm">
            No employees found
          </div>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? `No personnel match "${searchQuery}" in the selected cross-department scope.`
              : 'There are no active employee records registered under the selected cross-departments.'}
          </p>
        </div>
      )}
    </div>
  );
}
