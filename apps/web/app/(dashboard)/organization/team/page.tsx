'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Mail,
  Phone,
  Copy,
  Check,
  ShieldCheck,
  UserCheck,
  Crown,
  Sparkles,
  CheckCircle2,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';
import { fetchTeamsFromSupabase, TeamItem } from '@/lib/supabase-organization';
import { fetchLeaveRequests, LeaveRequestItem } from '@/lib/supabase-time-off';
import { getActiveEmployeeProfile, updateEmployeeProfileDetails } from '@/lib/user-profile-sync';

const PAGE_SIZE = 24;

export default function MyTeamPage() {
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<FullEmployeeProfile | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | 'MEMBERS' | 'LEADS'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);

  // Load active user, employees, teams, and leaves on client mount
  useEffect(() => {
    setMounted(true);

    const loadAll = async () => {
      // Hydrate from localStorage first if available
      try {
        const raw = localStorage.getItem('jaago_pnc_employees_v2');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEmployees(
              parsed.map((e: any) => ({
                ...e,
                team: e.team === 'Core Development Team' ? '' : (e.team || ''),
              }))
            );
          }
        }
      } catch {}

      const [emp, allEmps, allTeams, allLeaves] = await Promise.all([
        getActiveEmployeeProfile(),
        fetchEmployeesFromSupabase(),
        fetchTeamsFromSupabase(),
        fetchLeaveRequests(),
      ]);

      if (allEmps && allEmps.length > 0) {
        setEmployees(allEmps);
      }

      if (allTeams && allTeams.length > 0) {
        setTeams(allTeams);
      }

      if (emp) {
        setCurrentUserProfile(emp);
        if (emp.team && emp.team.trim() && emp.team.trim() !== 'Core Development Team') {
          setSelectedTeam(emp.team.trim());
        } else if (allTeams && allTeams.length > 0) {
          const userNorm = (emp.name || '').trim().toLowerCase();
          const codeNorm = (emp.code || '').trim().toLowerCase();
          const matchingSquad = allTeams.find(
            (t) =>
              t.teamLeadName?.trim().toLowerCase() === userNorm ||
              t.members?.some(
                (m) =>
                  m.employeeName?.trim().toLowerCase() === userNorm ||
                  (m.employeeCode && m.employeeCode.trim().toLowerCase() === codeNorm)
              )
          );
          if (matchingSquad) {
            setSelectedTeam(matchingSquad.name);
          } else if (allTeams[0]) {
            setSelectedTeam(allTeams[0].name);
          }
        }
      } else if (allTeams && allTeams.length > 0 && allTeams[0]) {
        setSelectedTeam(allTeams[0].name);
      }

      if (allLeaves && allLeaves.length > 0) {
        setLeaveRequests(allLeaves);
      }
    };

    loadAll();

    const handleUserUpdate = () => {
      getActiveEmployeeProfile().then((emp) => {
        if (emp) {
          setCurrentUserProfile(emp);
          if (emp.team && emp.team.trim() && emp.team.trim() !== 'Core Development Team') {
            setSelectedTeam(emp.team.trim());
          }
        }
      });
    };

    window.addEventListener('jaago_user_updated', handleUserUpdate);
    return () => window.removeEventListener('jaago_user_updated', handleUserUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied ${label}: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // List of distinct team names from Team master records and Employee Profiles
  const availableTeamNames = useMemo(() => {
    const map = new Map<string, string>();

    // 1. Teams from /pnc/teams master
    teams.forEach((t) => {
      if (t.name && !t.isArchived) {
        map.set(t.name.trim().toLowerCase(), t.name.trim());
      }
    });

    // 2. Teams found in employee profile records
    employees.forEach((e) => {
      const tName = (e.team || '').trim();
      if (tName && tName.toLowerCase() !== 'all' && tName.toLowerCase() !== 'core development team') {
        map.set(tName.toLowerCase(), tName);
      }
    });

    const list = Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    if (list.length === 0) {
      return ['Tech 4 Development'];
    }
    return list;
  }, [teams, employees]);

  // Set initial selected team if empty
  useEffect(() => {
    if (!selectedTeam) {
      if (currentUserProfile?.team && currentUserProfile.team.trim() && currentUserProfile.team !== 'Core Development Team') {
        setSelectedTeam(currentUserProfile.team.trim());
      } else if (availableTeamNames.length > 0 && availableTeamNames[0]) {
        setSelectedTeam(availableTeamNames[0]);
      }
    }
  }, [selectedTeam, currentUserProfile, availableTeamNames]);

  const activeTargetTeam =
    selectedTeam ||
    currentUserProfile?.team ||
    (availableTeamNames.length > 0 ? availableTeamNames[0] || 'Tech 4 Development' : 'Tech 4 Development');

  // Find operational team details from master
  const activeMasterTeam = useMemo(() => {
    return teams.find(
      (t) => t.name && t.name.trim().toLowerCase() === activeTargetTeam.trim().toLowerCase()
    );
  }, [teams, activeTargetTeam]);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Set of employee codes currently on approved leave today
  const onLeaveEmpCodes = useMemo(() => {
    const set = new Set<string>();
    leaveRequests.forEach((req) => {
      if (req.status === 'Approved' && req.fromDate <= todayStr && req.toDate >= todayStr) {
        if (req.employeeCode) set.add(req.employeeCode.toLowerCase());
      }
    });
    return set;
  }, [leaveRequests, todayStr]);

  const currentUserName = (currentUserProfile?.name || 'Nasif Kamal').toLowerCase();
  const currentUserCode = (currentUserProfile?.code || 'FO032507061190').toLowerCase();

  // Filter team members based STRICTLY on Employee Profile Team field & Operational Squad roster
  const myTeamMembers = useMemo(() => {
    const targetNorm = activeTargetTeam.trim().toLowerCase();

    // Collect member names & codes from the operational team object
    const masterMemberNames = new Set<string>();
    const masterMemberCodes = new Set<string>();
    let masterLeadName = '';

    if (activeMasterTeam) {
      masterLeadName = (activeMasterTeam.teamLeadName || '').trim().toLowerCase();
      (activeMasterTeam.members || []).forEach((m) => {
        if (m.employeeName) masterMemberNames.add(m.employeeName.trim().toLowerCase());
        if (m.employeeCode) masterMemberCodes.add(m.employeeCode.trim().toLowerCase());
      });
    }

    return employees.filter((emp) => {
      if (!emp || emp.isArchived || emp.status === 'Terminated' || emp.status === 'Resigned') return false;

      const empName = (emp.name || '').trim().toLowerCase();
      const empCode = (emp.code || '').trim().toLowerCase();
      const empTeam = (emp.team || '').trim().toLowerCase();

      // Condition 1: Employee's Profile Team field matches this team exactly
      const matchesProfileTeam = empTeam === targetNorm;

      // Condition 2: Listed in the Operational Squad members in /pnc/teams
      const isMasterMember = masterMemberNames.has(empName) || (empCode && masterMemberCodes.has(empCode));

      // Condition 3: Is Team Lead / Supervisor of this team
      const isTeamLead = masterLeadName && (empName === masterLeadName || empName.includes(masterLeadName) || masterLeadName.includes(empName));

      // Condition 4: Current user if this is their selected/assigned team
      const isMeInThisTeam =
        currentUserProfile?.team?.trim().toLowerCase() === targetNorm &&
        (empCode === currentUserCode || empName === currentUserName);

      return matchesProfileTeam || isMasterMember || isTeamLead || isMeInThisTeam;
    });
  }, [employees, activeTargetTeam, activeMasterTeam, currentUserProfile, currentUserCode, currentUserName]);

  // Identify the designated Team Lead
  const teamLeadPerson = useMemo(() => {
    const masterLeadName = (activeMasterTeam?.teamLeadName || '').trim().toLowerCase();
    if (masterLeadName) {
      const match = myTeamMembers.find(
        (e) => (e.name || '').trim().toLowerCase().includes(masterLeadName) || masterLeadName.includes((e.name || '').trim().toLowerCase())
      );
      if (match) return match;
    }
    const leadByDesig = myTeamMembers.find((e) =>
      /lead|manager|supervisor|head|director/i.test(e.designation || '')
    );
    return leadByDesig || null;
  }, [activeMasterTeam, myTeamMembers]);

  // Search & Role Filter Tabs
  const filteredMembers = useMemo(() => {
    return myTeamMembers.filter((emp) => {
      const empName = (emp.name || '').toLowerCase();
      const isLead = teamLeadPerson && (emp.id === teamLeadPerson.id || emp.code === teamLeadPerson.code);

      if (selectedRoleFilter === 'LEADS' && !isLead) return false;
      if (selectedRoleFilter === 'MEMBERS' && isLead) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        empName.includes(q) ||
        (emp.code && emp.code.toLowerCase().includes(q)) ||
        (emp.designation && emp.designation.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.team && emp.team.toLowerCase().includes(q)) ||
        (emp.workEmail && emp.workEmail.toLowerCase().includes(q)) ||
        (emp.workMobile && emp.workMobile.includes(q)) ||
        (emp.personalPhone && emp.personalPhone.includes(q)) ||
        (emp.bloodGroup && emp.bloodGroup.toLowerCase().includes(q)) ||
        (emp.branch && emp.branch.toLowerCase().includes(q))
      );
    });
  }, [myTeamMembers, selectedRoleFilter, searchQuery, teamLeadPerson]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeam, searchQuery, selectedRoleFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, currentPage]);

  // Team Stats
  const totalTeamCount = myTeamMembers.length;
  const onLeaveCount = myTeamMembers.filter((e) => e.code && onLeaveEmpCodes.has(e.code.toLowerCase())).length;
  const activeCount = totalTeamCount - onLeaveCount;

  // 1-Click "Set As My Primary Team"
  const handleSetAsMyTeam = async () => {
    if (!currentUserProfile || !activeTargetTeam) return;
    setIsUpdatingTeam(true);

    const updatedProfile: FullEmployeeProfile = {
      ...currentUserProfile,
      team: activeTargetTeam,
    };

    const res = await updateEmployeeProfileDetails(updatedProfile);
    setIsUpdatingTeam(false);

    if (res.success) {
      setCurrentUserProfile(updatedProfile);
      showToast(`Team "${activeTargetTeam}" set as your profile team!`);
    } else {
      showToast(res.error || 'Failed to update team');
    }
  };

  const isCurrentUsersAssignedTeam =
    currentUserProfile?.team?.trim().toLowerCase() === activeTargetTeam.trim().toLowerCase();

  // Prevent SSR Hydration Mismatch
  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-card/60 rounded-2xl w-48 border border-border/50" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-20 bg-card/60 rounded-2xl border border-border/50" />
          <div className="h-20 bg-card/60 rounded-2xl border border-border/50" />
          <div className="h-20 bg-card/60 rounded-2xl border border-border/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-64 bg-card/60 rounded-3xl border border-border/50" />
          <div className="h-64 bg-card/60 rounded-3xl border border-border/50" />
          <div className="h-64 bg-card/60 rounded-3xl border border-border/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-2xl flex items-center space-x-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
            <Link href="/dashboard" className="hover:text-primary transition cursor-pointer">
              Organization
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">My Team</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center space-x-3 mt-1">
            <span>{activeTargetTeam}</span>
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold">
              {totalTeamCount} Team Member{totalTeamCount !== 1 ? 's' : ''}
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Active team colleagues and operational squad members synced directly from People &amp; Culture Employee Profiles.
          </p>
        </div>

        {/* Team Switcher & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Team Dropdown Selector */}
          <div className="relative">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="h-10 pl-3.5 pr-8 rounded-xl bg-card border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm cursor-pointer"
            >
              {availableTeamNames.map((t) => (
                <option key={t} value={t}>
                  {t} {currentUserProfile?.team?.trim().toLowerCase() === t.trim().toLowerCase() ? '★ (Your Team)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Set As My Team Button */}
          {!isCurrentUsersAssignedTeam && (
            <button
              type="button"
              onClick={handleSetAsMyTeam}
              disabled={isUpdatingTeam}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md shadow-amber-500/20 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              title="Set this team as your primary team in your Employee Profile"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isUpdatingTeam ? 'Saving...' : 'Set as My Team'}</span>
            </button>
          )}

          <Link
            href="/organization/contacts"
            className="px-3.5 py-2 rounded-xl bg-card border border-border hover:border-amber-500 text-xs font-bold text-foreground transition shadow-sm flex items-center space-x-1.5"
          >
            <Users className="h-3.5 w-3.5 text-amber-500" />
            <span>EXCEL CONTACTS</span>
          </Link>

          <Link
            href="/organization/on-leave"
            className="px-3.5 py-2 rounded-xl bg-card border border-border hover:border-amber-500 text-xs font-bold text-foreground transition shadow-sm flex items-center space-x-1.5"
          >
            <UserCheck className="h-3.5 w-3.5 text-purple-400" />
            <span>ON LEAVE ({onLeaveCount})</span>
          </Link>
        </div>
      </div>

      {/* Team Details Strip & Lead Banner */}
      {activeMasterTeam && (
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[10px] font-mono font-black uppercase">
                {activeMasterTeam.code || 'TEAM'}
              </span>
              <span className="text-xs font-extrabold text-foreground">{activeMasterTeam.name}</span>
              {activeMasterTeam.departmentOrProject && (
                <span className="text-xs text-muted-foreground">
                  &bull; {activeMasterTeam.departmentOrProject}
                </span>
              )}
            </div>
            {activeMasterTeam.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeMasterTeam.description}
              </p>
            )}
          </div>

          {activeMasterTeam.teamLeadName && (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-card border border-amber-500/30 shadow-xs flex-shrink-0">
              <Crown className="h-4 w-4 text-amber-500" />
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Team Lead</div>
                <div className="text-xs font-black text-amber-500">{activeMasterTeam.teamLeadName}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black flex-shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-foreground font-mono">{totalTeamCount}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Team Members</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black flex-shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-500 font-mono">{activeCount}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active &amp; Working Today</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-black flex-shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-purple-400 font-mono">{onLeaveCount}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">On Approved Leave</div>
          </div>
        </div>
      </div>

      {/* Search & Role Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member name, code, designation, mobile, email..."
            className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <div className="flex items-center space-x-1.5 self-stretch sm:self-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
              selectedRoleFilter === 'ALL'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            All Members ({totalTeamCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('MEMBERS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
              selectedRoleFilter === 'MEMBERS'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Team Members
          </button>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('LEADS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
              selectedRoleFilter === 'LEADS'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            Leads &amp; Supervisors
          </button>
        </div>
      </div>

      {/* Team Member Cards Grid (Paginated for instantaneous loading) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedMembers.map((emp) => {
          const isOnLeave = emp.code && onLeaveEmpCodes.has(emp.code.toLowerCase());
          const isMe =
            (emp.code && emp.code.toLowerCase() === currentUserCode) ||
            (emp.name && emp.name.toLowerCase() === currentUserName);
          const isLead = teamLeadPerson && (emp.id === teamLeadPerson.id || emp.code === teamLeadPerson.code);
          const mobile = emp.workMobile || emp.personalPhone || '';
          const email = emp.workEmail || emp.personalEmail || '';

          return (
            <div
              key={emp.id || emp.code}
              className={`rounded-3xl bg-card border p-5 space-y-4 shadow-sm hover:shadow-md transition group relative overflow-hidden ${
                isMe
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : isLead
                  ? 'border-amber-500/30 bg-amber-500/[0.02]'
                  : 'border-border/80 hover:border-amber-500/40'
              }`}
            >
              {/* Top Banner Tag */}
              <div className="absolute top-3 right-3 flex items-center space-x-1">
                {isLead && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 font-black text-[9px] uppercase tracking-wider flex items-center space-x-1">
                    <Crown className="h-2.5 w-2.5 fill-amber-500" />
                    <span>Lead</span>
                  </span>
                )}
                {isMe && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                    You
                  </span>
                )}
              </div>

              {/* Avatar + Main Info */}
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
                      {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'TM'}
                    </div>
                  )}
                  {/* Status Indicator Dot */}
                  <span
                    className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card flex items-center justify-center ${
                      isOnLeave ? 'bg-purple-500' : 'bg-emerald-500'
                    }`}
                    title={isOnLeave ? 'On Approved Leave Today' : 'Active / Working'}
                  />
                </div>

                <div className="min-w-0 flex-1 pr-14">
                  <div className="font-extrabold text-foreground text-sm group-hover:text-amber-500 transition truncate">
                    {emp.name}
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate">
                    ID: {emp.code}
                  </div>
                  <div className="text-xs font-semibold text-amber-500 truncate mt-0.5">
                    {emp.designation || 'Team Member'}
                  </div>
                </div>
              </div>

              {/* Status Badge Strip */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {isOnLeave ? (
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 font-bold text-[10px]">
                    On Leave Today
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                    Active
                  </span>
                )}
                {emp.bloodGroup && (
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono font-bold text-[10px]">
                    Blood: {emp.bloodGroup}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-muted-foreground font-medium text-[10px]">
                  {emp.branch || 'Head Office'}
                </span>
              </div>

              {/* Hierarchy Info Box */}
              <div className="p-3 rounded-2xl bg-surface/50 border border-border/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Department:</span>
                  <span className="font-bold text-foreground truncate max-w-[170px]">{emp.department || 'General'}</span>
                </div>
                {emp.team && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">Team:</span>
                    <span className="font-bold text-amber-500 truncate max-w-[170px]">{emp.team}</span>
                  </div>
                )}
                {emp.supervisor && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">Supervisor:</span>
                    <span className="font-semibold text-foreground truncate max-w-[170px]">{emp.supervisor}</span>
                  </div>
                )}
              </div>

              {/* Contact Actions Footer */}
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-border/60">
                {/* Mobile */}
                {mobile ? (
                  <div className="flex items-center space-x-1 min-w-0">
                    <a
                      href={`tel:${mobile}`}
                      className="p-1.5 rounded-lg bg-surface hover:bg-surface/80 text-muted-foreground hover:text-emerald-400 transition"
                      title={`Call ${mobile}`}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <span className="text-[11px] font-mono text-muted-foreground truncate">{mobile}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(mobile, `mob-${emp.code}`, 'Phone Number')}
                      className="p-1 rounded text-muted-foreground hover:text-amber-500 transition cursor-pointer"
                      title="Copy phone number"
                    >
                      {copiedKey === `mob-${emp.code}` ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">No mobile recorded</span>
                )}

                {/* Email */}
                {email && (
                  <div className="flex items-center space-x-1">
                    <a
                      href={`mailto:${email}`}
                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition"
                      title={`Send email to ${email}`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopy(email, `email-${emp.code}`, 'Work Email')}
                      className="p-1 rounded text-muted-foreground hover:text-amber-500 transition cursor-pointer"
                      title="Copy email"
                    >
                      {copiedKey === `email-${emp.code}` ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-bold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
            <span className="font-bold text-foreground">{Math.min(currentPage * PAGE_SIZE, filteredMembers.length)}</span> of{' '}
            <span className="font-bold text-foreground">{filteredMembers.length}</span> members
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl bg-surface border border-border hover:border-amber-500 text-foreground disabled:opacity-40 disabled:hover:border-border transition cursor-pointer flex items-center space-x-1 text-xs font-bold"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 font-mono text-xs font-bold">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl bg-surface border border-border hover:border-amber-500 text-foreground disabled:opacity-40 disabled:hover:border-border transition cursor-pointer flex items-center space-x-1 text-xs font-bold"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-card border border-border text-muted-foreground space-y-3">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <h3 className="font-bold text-foreground text-sm">No employees currently assigned to {activeTargetTeam}</h3>
            <p className="text-xs mt-1">
              Select a different team from the dropdown above, or assign employees to this team under{' '}
              <Link href="/pnc/employees" className="text-amber-500 hover:underline">
                People &amp; Culture &gt; Employee Profiles
              </Link>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
