'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  CheckCircle2,
  XCircle,
  Building,
  GraduationCap,
  Sparkles,
  Layers,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';
import { getLocalAttendanceLogs } from '@/lib/supabase-attendance';

interface ReportRow {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  branch: string;
  avatarUrl?: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  lateBy: string;
  earlyOutBy: string;
  status: 'Present' | 'Absent' | 'Late' | 'Early Out' | 'Checked In' | 'Checked Out' | 'Half Day' | 'Leave' | 'Holiday' | 'Weekend';
}

export default function AttendanceReportPage() {
  const [timePeriod, setTimePeriod] = useState<'Today' | 'Yesterday' | 'This Week' | 'Last 7 Days' | 'Last 15 Days' | 'Last 30 Days' | 'This Month' | 'Last Month'>('Today');
  const [selectedDate, setSelectedDate] = useState('2026-08-26');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(2026, 7, 1)); // August 2026

  // Filters
  const [branchFilter, setBranchFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState<string>('All');

  // Manual In/Out Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [selectedRowForManual, setSelectedRowForManual] = useState<ReportRow | null>(null);
  const [manualCheckIn, setManualCheckIn] = useState('09:00 AM');
  const [manualCheckOut, setManualCheckOut] = useState('06:00 PM');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchEmployeesFromSupabase().then((emps) => {
      if (emps && emps.length > 0) {
        setEmployees(emps);
      }
    });

    getLocalAttendanceLogs();
    // Build report rows
    const rows: ReportRow[] = [
      {
        id: 'rep-1',
        employeeId: 'emp-nasif',
        employeeCode: 'FO032507061190',
        employeeName: 'Nasif Kamal',
        department: "Founder's Office / FC",
        designation: 'Coordinator, Tech 4 Development',
        branch: 'Head Office (Banani)',
        date: '25-08-2026',
        checkInTime: '09:58 AM',
        checkOutTime: '06:15 PM',
        lateBy: 'N/A',
        earlyOutBy: 'N/A',
        status: 'Present',
      },
      {
        id: 'rep-2',
        employeeId: 'emp-nayeem',
        employeeCode: 'FO072408231002',
        employeeName: 'S M Nayeem Rahman',
        department: "Founder's Office / FC",
        designation: 'Program Officer',
        branch: 'Head Office (Banani)',
        date: '25-08-2026',
        checkInTime: '10:15 AM',
        checkOutTime: '06:05 PM',
        lateBy: '15 min',
        earlyOutBy: 'N/A',
        status: 'Late',
      },
      {
        id: 'rep-3',
        employeeId: 'emp-nurul',
        employeeCode: 'MAD06220101579',
        employeeName: 'Md. Nurul Islam',
        department: 'Digital School Program',
        designation: 'Support Staff',
        branch: 'Madaripur School',
        date: '25-08-2026',
        checkInTime: '08:50 AM',
        checkOutTime: '05:05 PM',
        lateBy: 'N/A',
        earlyOutBy: 'N/A',
        status: 'Present',
      },
      {
        id: 'rep-4',
        employeeId: 'emp-admin2',
        employeeCode: 'admin2',
        employeeName: 'admin2(Do Not Delete)',
        department: 'DSP Central Team - Manager - DSP HUB',
        designation: 'Manager',
        branch: 'Head Office (Banani)',
        date: '25-08-2026',
        checkInTime: 'N/A',
        checkOutTime: 'N/A',
        lateBy: 'N/A',
        earlyOutBy: 'N/A',
        status: 'Absent',
      },
      {
        id: 'rep-5',
        employeeId: 'emp-dev-1',
        employeeCode: 'employee-id-1',
        employeeName: 'Employee',
        department: 'DSP Central Team - In Officer - DSP HUB',
        designation: 'Field Officer',
        branch: 'Chittagong Campus',
        date: '25-08-2026',
        checkInTime: 'N/A',
        checkOutTime: 'N/A',
        lateBy: 'N/A',
        earlyOutBy: 'N/A',
        status: 'Absent',
      },
      {
        id: 'rep-6',
        employeeId: 'emp-sup-1',
        employeeCode: 'supervisor',
        employeeName: 'Supervisor',
        department: 'DSP Central Team',
        designation: 'Area Supervisor',
        branch: 'Cox’s Bazar Branch',
        date: '25-08-2026',
        checkInTime: 'N/A',
        checkOutTime: 'N/A',
        lateBy: 'N/A',
        earlyOutBy: 'N/A',
        status: 'Absent',
      },
      {
        id: 'rep-7',
        employeeId: 'emp-rishan',
        employeeCode: 'HOB062616061625',
        employeeName: 'Md. Rishan Mia',
        department: 'Digital School Program',
        designation: 'Community Teacher',
        branch: 'Habiganj School',
        date: '25-08-2026',
        checkInTime: '08:55 AM',
        checkOutTime: '05:00 PM',
        lateBy: 'N/A',
        earlyOutBy: 'N/A',
        status: 'Present',
      },
      {
        id: 'rep-8',
        employeeId: 'emp-akkas',
        employeeCode: 'BN10171503549',
        employeeName: 'Md. Akkas Ali',
        department: 'Program Implementation',
        designation: 'Support Staff',
        branch: 'Banani School',
        date: '25-08-2026',
        checkInTime: '07:25 AM',
        checkOutTime: '04:35 PM',
        lateBy: 'N/A',
        earlyOutBy: 'N/A',
        status: 'Present',
      },
    ];
    setReportRows(rows);
  }, []);

  const handleOpenManualModal = (row: ReportRow) => {
    setSelectedRowForManual(row);
    setManualCheckIn(row.checkInTime !== 'N/A' ? row.checkInTime : '09:00 AM');
    setManualCheckOut(row.checkOutTime !== 'N/A' ? row.checkOutTime : '06:00 PM');
    setManualModalOpen(true);
  };

  const handleSaveManualAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRowForManual) return;

    const updated = reportRows.map((r) =>
      r.id === selectedRowForManual.id
        ? {
            ...r,
            checkInTime: manualCheckIn,
            checkOutTime: manualCheckOut,
            status: 'Present' as const,
            lateBy: 'N/A',
          }
        : r
    );

    setReportRows(updated);
    setManualModalOpen(false);
    showToast(`Manual attendance applied for ${selectedRowForManual.employeeName}!`);
  };

  const handleExportAll = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Employee Name,Employee ID,Department,Date,Check In,Check Out,Late By,Status']
        .concat(
          filteredRows.map(
            (r) =>
              `"${r.employeeName}","${r.employeeCode}","${r.department}","${r.date}","${r.checkInTime}","${r.checkOutTime}","${r.lateBy}","${r.status}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JAAGO_Attendance_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance report exported successfully!');
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  const monthName = currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Filtering
  const filteredRows = reportRows.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.employeeName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q);

    const matchesBranch = !branchFilter || r.branch.includes(branchFilter);
    const matchesDept = !departmentFilter || r.department.includes(departmentFilter);
    const matchesDesig = !designationFilter || r.designation.includes(designationFilter);

    const matchesStatusTab =
      activeStatusTab === 'All' ||
      (activeStatusTab === 'Present' && (r.status === 'Present' || r.status === 'Late')) ||
      (activeStatusTab === 'Absent' && r.status === 'Absent') ||
      (activeStatusTab === 'Late' && r.status === 'Late') ||
      (activeStatusTab === 'Checked In' && r.checkInTime !== 'N/A') ||
      (activeStatusTab === 'Checked Out' && r.checkOutTime !== 'N/A');

    return matchesSearch && matchesBranch && matchesDept && matchesDesig && matchesStatusTab;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-bold transition transform animate-in slide-in-from-top ${
            toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
          Attendance
        </h1>
        <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground mt-1">
          <span>Dashboard</span>
          <span>&bull;</span>
          <span className="text-primary font-bold">Attendance</span>
        </div>
      </div>

      {/* ── 1. SELECT TIME PERIOD BAR (Screenshot 5) ── */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Select Time Period
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(
            [
              'Today',
              'Yesterday',
              'This Week',
              'Last 7 Days',
              'Last 15 Days',
              'Last 30 Days',
              'This Month',
              'Last Month',
            ] as const
          ).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setTimePeriod(period)}
              className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                timePeriod === period
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-surface/60 hover:bg-surface text-muted-foreground hover:text-foreground border border-border/60'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. MONTH CALENDAR GRID (Screenshot 5) ── */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="text-center">
            <h2 className="text-base font-black text-foreground">{monthName}</h2>
            <p className="text-[11px] font-semibold text-muted-foreground">
              Selected: 25 August 2026
            </p>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-muted-foreground uppercase">
          <div className="py-1">Sun</div>
          <div className="py-1">Mon</div>
          <div className="py-1">Tue</div>
          <div className="py-1">Wed</div>
          <div className="py-1">Thu</div>
          <div className="py-1 text-purple-400">Fri</div>
          <div className="py-1 text-purple-400">Sat</div>
        </div>

        {/* Date Blocks (Screenshot 5 interactive calendar) */}
        <div className="grid grid-cols-7 gap-2 text-xs">
          {[23, 24, 25, 26, 27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(
            (day, idx) => {
              const isSelected = day === 25;
              const isToday = day === 26;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(`2026-08-${day < 10 ? '0' + day : day}`)}
                  className={`h-10 rounded-xl font-bold flex items-center justify-center transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : isToday
                      ? 'bg-surface border-2 border-primary text-foreground font-black'
                      : 'bg-surface/50 hover:bg-surface text-muted-foreground hover:text-foreground border border-border/40'
                  }`}
                >
                  {day}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* ── 3. FILTER CONTROLS (Screenshot 5) ── */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Branch */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            >
              <option value="">Branch (All)</option>
              <option value="Head Office (Banani)">Head Office (Banani)</option>
              <option value="Madaripur School">Madaripur School</option>
              <option value="Habiganj School">Habiganj School</option>
              <option value="Cox’s Bazar Branch">Cox’s Bazar Branch</option>
              <option value="Chittagong Campus">Chittagong Campus</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            >
              <option value="">Department (All)</option>
              <option value="Founder's Office">Founder&apos;s Office / FC</option>
              <option value="Digital School Program">Digital School Program</option>
              <option value="Program Implementation">Program Implementation</option>
              <option value="DSP Central Team">DSP Central Team</option>
            </select>
          </div>

          {/* Designation */}
          <div>
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
            >
              <option value="">Designation (All)</option>
              {Array.from(new Set(employees.map((e) => e.designation).filter(Boolean))).map((des) => (
                <option key={des} value={des}>
                  {des}
                </option>
              ))}
            </select>
          </div>

          {/* Search ID or Name */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID or Name"
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ── 4. STAT SUMMARY BADGE CARDS (Screenshot 5) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5 text-xs">
        <div className="bg-card border border-border/70 rounded-2xl p-3 text-center space-y-1 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center text-[10px] font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
            Total Present
          </div>
          <div className="text-base font-black text-emerald-500">363</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-3 text-center space-y-1 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-rose-500/20 text-rose-500 mx-auto flex items-center justify-center text-[10px] font-bold">
            <XCircle className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
            Total Absent
          </div>
          <div className="text-base font-black text-rose-500">45</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-3 text-center space-y-1 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-teal-500/20 text-teal-500 mx-auto flex items-center justify-center text-[10px] font-bold">
            <Users className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
            DSP Central
          </div>
          <div className="text-base font-black text-teal-500">17</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-3 text-center space-y-1 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-500 mx-auto flex items-center justify-center text-[10px] font-bold">
            <GraduationCap className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
            Comm Teacher
          </div>
          <div className="text-base font-black text-amber-500">107</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-3 text-center space-y-1 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-orange-500/20 text-orange-500 mx-auto flex items-center justify-center text-[10px] font-bold">
            <Building className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
            School Mgmt
          </div>
          <div className="text-base font-black text-orange-500">37</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-3 text-center space-y-1 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-sky-500/20 text-sky-500 mx-auto flex items-center justify-center text-[10px] font-bold">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
            Digital Teacher
          </div>
          <div className="text-base font-black text-sky-500">51</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-3 text-center space-y-1 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-500 mx-auto flex items-center justify-center text-[10px] font-bold">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
            Digital School
          </div>
          <div className="text-base font-black text-indigo-500">6</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-3 text-center space-y-1 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-pink-500/20 text-pink-500 mx-auto flex items-center justify-center text-[10px] font-bold">
            <Users className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
            Support Staff
          </div>
          <div className="text-base font-black text-pink-500">46</div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-3 text-center space-y-1 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-purple-500/20 text-purple-500 mx-auto flex items-center justify-center text-[10px] font-bold">
            <GraduationCap className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">
            Conv Teacher
          </div>
          <div className="text-base font-black text-purple-500">119</div>
        </div>
      </div>

      {/* ── 5. STATUS FILTER TABS & EXPORT (Screenshot 5) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'All', label: 'All 408' },
            { id: 'Present', label: 'Present 363' },
            { id: 'Absent', label: 'Absent 45' },
            { id: 'Late', label: 'Late 22' },
            { id: 'Early Out', label: 'Early Out 15' },
            { id: 'Checked In', label: 'Checked In 15' },
            { id: 'Checked Out', label: 'Checked Out 348' },
            { id: 'Half Day', label: 'Half Day 2' },
            { id: 'Leave', label: 'Leave 4' },
            { id: 'Holiday', label: 'Holiday 0' },
            { id: 'Weekend', label: 'Weekend 0' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatusTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                activeStatusTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-surface/50 hover:bg-surface text-muted-foreground hover:text-foreground border border-border/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExportAll}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer flex-shrink-0"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export All</span>
        </button>
      </div>

      {/* ── 6. REPORT DATA TABLE (Screenshot 5) ── */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-surface/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 px-3">Check in time</th>
                <th className="py-3.5 px-3">Check out time</th>
                <th className="py-3.5 px-3">Late By</th>
                <th className="py-3.5 px-3">Early Out By</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-center">Manual Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-medium">
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-surface/50 transition duration-150 group"
                  >
                    {/* Employee info */}
                    <td className="py-4 px-4">
                      <div className="flex items-start space-x-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                          {row.employeeName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground text-xs sm:text-[13px]">
                            {row.employeeName}
                          </div>
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-500 font-mono font-bold text-[10px] border border-sky-500/20">
                              ID: {row.employeeCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {row.department}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-3 text-muted-foreground font-semibold">
                      {row.date}
                    </td>

                    {/* Check in time */}
                    <td className="py-4 px-3">
                      {row.checkInTime !== 'N/A' ? (
                        <span className="text-emerald-500 font-bold font-mono">
                          {row.checkInTime}
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold">N/A</span>
                      )}
                    </td>

                    {/* Check out time */}
                    <td className="py-4 px-3">
                      {row.checkOutTime !== 'N/A' ? (
                        <span className="text-amber-500 font-bold font-mono">
                          {row.checkOutTime}
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold">N/A</span>
                      )}
                    </td>

                    {/* Late by */}
                    <td className="py-4 px-3">
                      {row.lateBy !== 'N/A' ? (
                        <span className="text-amber-500 font-bold font-mono bg-amber-500/10 px-2 py-0.5 rounded">
                          {row.lateBy}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>

                    {/* Early out by */}
                    <td className="py-4 px-3 text-muted-foreground">
                      {row.earlyOutBy}
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-3">
                      {row.status === 'Present' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[11px] font-bold">
                          Present
                        </span>
                      ) : row.status === 'Late' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px] font-bold">
                          Late
                        </span>
                      ) : row.status === 'Absent' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[11px] font-bold">
                          Absent
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-500 border border-purple-500/30 text-[11px] font-bold">
                          {row.status}
                        </span>
                      )}
                    </td>

                    {/* Add In/Out Button (Screenshot 5) */}
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenManualModal(row)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        Add In/Out
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-semibold text-sm">No report records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── MANUAL ATTENDANCE (ADD IN/OUT) MODAL ────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {manualModalOpen && selectedRowForManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-border/70">
              <div>
                <h2 className="text-base font-black text-foreground">
                  Manual In/Out Entry
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedRowForManual.employeeName} ({selectedRowForManual.employeeCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualAttendance} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Check-in Time
                </label>
                <input
                  type="text"
                  required
                  value={manualCheckIn}
                  onChange={(e) => setManualCheckIn(e.target.value)}
                  placeholder="09:00 AM"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Check-out Time
                </label>
                <input
                  type="text"
                  required
                  value={manualCheckOut}
                  onChange={(e) => setManualCheckOut(e.target.value)}
                  placeholder="06:00 PM"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border font-bold text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black uppercase tracking-wider shadow-md transition cursor-pointer"
                >
                  Apply In/Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
