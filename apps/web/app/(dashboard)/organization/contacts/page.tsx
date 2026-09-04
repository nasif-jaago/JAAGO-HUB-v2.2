'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Droplet,
} from 'lucide-react';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';

export default function ContactsExcelPage() {
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

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployeesFromSupabase().then((emps) => {
      if (emps && emps.length > 0) setEmployees(emps);
    });
  }, []);

  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setToastMsg(`Copied ${label}: ${text}`);
    setTimeout(() => {
      setCopiedKey(null);
      setToastMsg(null);
    }, 2500);
  };

  // Department, Blood Group, Branch options
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const bloodGroupOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.bloodGroup) set.add(e.bloodGroup.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.branch) set.add(e.branch.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!emp || emp.isArchived || emp.status === 'Terminated' || emp.status === 'Resigned') return false;

      if (departmentFilter && (emp.department || '').trim() !== departmentFilter.trim()) return false;
      if (bloodGroupFilter && (emp.bloodGroup || '').trim() !== bloodGroupFilter.trim()) return false;
      if (branchFilter && (emp.branch || '').trim() !== branchFilter.trim()) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.code && emp.code.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.designation && emp.designation.toLowerCase().includes(q)) ||
        (emp.workMobile && emp.workMobile.includes(q)) ||
        (emp.personalPhone && emp.personalPhone.includes(q)) ||
        (emp.workEmail && emp.workEmail.toLowerCase().includes(q)) ||
        (emp.personalEmail && emp.personalEmail.toLowerCase().includes(q)) ||
        (emp.bloodGroup && emp.bloodGroup.toLowerCase().includes(q)) ||
        (emp.branch && emp.branch.toLowerCase().includes(q)) ||
        (emp.supervisor && emp.supervisor.toLowerCase().includes(q))
      );
    });
  }, [employees, departmentFilter, bloodGroupFilter, branchFilter, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Employee Code',
      'Name',
      'Department',
      'Designation',
      'Work Mobile',
      'Personal Phone',
      'Work Email',
      'Personal Email',
      'Blood Group',
      'Branch',
      'Work Location',
      'Supervisor',
    ];

    const rows = filteredEmployees.map((e) => [
      `"${e.code || ''}"`,
      `"${e.name || ''}"`,
      `"${e.department || ''}"`,
      `"${e.designation || ''}"`,
      `"${e.workMobile || ''}"`,
      `"${e.personalPhone || ''}"`,
      `"${e.workEmail || ''}"`,
      `"${e.personalEmail || ''}"`,
      `"${e.bloodGroup || ''}"`,
      `"${e.branch || ''}"`,
      `"${e.workLocation || ''}"`,
      `"${e.supervisor || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `JAAGO_Contacts_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <span className="text-foreground font-bold">Contacts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center space-x-3 mt-1">
            <span>Staff Contacts &amp; Blood Group Directory</span>
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold">
              {filteredEmployees.length} Contacts
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Excel-style comprehensive contact table with 1-click clipboard copy, email links, and blood group search.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95 flex-shrink-0"
        >
          <Download className="h-4 w-4" />
          <span>EXPORT EXCEL / CSV</span>
        </button>
      </div>

      {/* Toolbar: Search + Filter Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card border border-border/80 rounded-2xl p-3.5 shadow-sm">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Name, ID, Phone, Email, Blood..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface/60 border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Department Filter */}
        <div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-surface/60 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="">Department (All)</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Blood Group Filter */}
        <div>
          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-surface/60 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="">Blood Group (All)</option>
            {bloodGroupOptions.map((bg) => (
              <option key={bg} value={bg}>
                Blood Group: {bg}
              </option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-surface/60 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            <option value="">Branch / Location (All)</option>
            {branchOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Excel Spreadsheet Table */}
      <div className="rounded-3xl bg-card border border-border/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-surface/60 select-none">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Employee Name</th>
                <th className="py-3 px-4 min-w-[150px]">Department</th>
                <th className="py-3 px-4 min-w-[150px]">Designation</th>
                <th className="py-3 px-4 min-w-[180px]">Mobile (Click to Copy)</th>
                <th className="py-3 px-4 min-w-[200px]">Work Email</th>
                <th className="py-3 px-4 min-w-[100px] text-center">Blood Group</th>
                <th className="py-3 px-4 min-w-[140px]">Branch / Location</th>
                <th className="py-3 px-4 min-w-[150px]">Supervisor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium font-sans">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground text-xs font-semibold">
                    No matching contacts found in the directory.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => {
                  const mobile = emp.workMobile || emp.personalPhone || '';
                  const email = emp.workEmail || emp.personalEmail || '';
                  const blood = emp.bloodGroup?.trim() || '--';

                  return (
                    <tr
                      key={emp.id || emp.code}
                      className="hover:bg-surface/60 transition group font-normal text-xs"
                    >
                      {/* Row Index */}
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-muted-foreground">
                        {index + 1}
                      </td>

                      {/* Employee Name + ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.name}
                              className="h-8 w-8 rounded-xl object-cover border border-border shadow-xs flex-shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-xl bg-[#26180E] text-amber-500 font-black text-xs flex items-center justify-center border border-amber-500/30 flex-shrink-0">
                              {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'JA'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-extrabold text-foreground text-xs group-hover:text-amber-500 transition truncate">
                              {emp.name}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground">
                              {emp.code}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground text-xs">{emp.department || 'General'}</span>
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground text-xs">{emp.designation || 'Staff'}</span>
                      </td>

                      {/* Mobile with Copy Icon */}
                      <td className="py-3 px-4">
                        {mobile ? (
                          <div className="flex items-center space-x-2">
                            <a
                              href={`tel:${mobile}`}
                              className="font-mono text-xs text-foreground hover:text-emerald-400 hover:underline transition font-semibold"
                            >
                              {mobile}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopy(mobile, `mob-${emp.code}`, 'Mobile Number')}
                              className="p-1 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                              title="Copy mobile number"
                            >
                              {copiedKey === `mob-${emp.code}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-[11px] italic">N/A</span>
                        )}
                      </td>

                      {/* Work Email with Copy */}
                      <td className="py-3 px-4">
                        {email ? (
                          <div className="flex items-center space-x-2">
                            <a
                              href={`mailto:${email}`}
                              className="text-xs text-amber-500 hover:underline truncate max-w-[170px]"
                              title={email}
                            >
                              {email}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopy(email, `email-${emp.code}`, 'Email')}
                              className="p-1 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                              title="Copy email address"
                            >
                              {copiedKey === `email-${emp.code}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-[11px] italic">N/A</span>
                        )}
                      </td>

                      {/* Blood Group */}
                      <td className="py-3 px-4 text-center">
                        {blood !== '--' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-black font-mono text-[11px]">
                            <Droplet className="h-2.5 w-2.5 mr-1 text-rose-500 fill-rose-500" />
                            {blood}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 text-[11px] font-mono">--</span>
                        )}
                      </td>

                      {/* Branch / Location */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-foreground">{emp.branch || emp.workLocation || 'Head Office'}</span>
                      </td>

                      {/* Supervisor */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-muted-foreground truncate block max-w-[150px]">
                          {emp.supervisor || '--'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
