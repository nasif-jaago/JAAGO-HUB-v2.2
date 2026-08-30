'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Fingerprint,
  Radio,
  RefreshCw,
  Search,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  X,
} from 'lucide-react';
import { BioTimeDevice } from '@/lib/biotime-data';

export interface BioTimeReconciledRow {
  id: string;
  rfid: string; // BioTime Employee ID
  name: string; // BioTime Full Name
  employeeId: string; // P&C Employee ID (from Supabase employees code)
  department: string;
  branch: string;
  deviceLocation: string;
  date: string;
  checkIn: string; // First Check IN
  checkOut: string; // Last Check OUT or '--'
  status: 'Present' | 'Absent';
  punchesCount: number;
}

export default function BioTimeLogsPage() {
  const [rows, setRows] = useState<BioTimeReconciledRow[]>([]);
  const [devices, setDevices] = useState<BioTimeDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRowsLoading, setIsRowsLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Present' | 'Absent'>('ALL');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST7' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Set date preset helpers
  const applyDatePreset = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST7' | 'THIS_MONTH' | 'CUSTOM') => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0] || '';

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0] || '';
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'LAST7') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      const d7Str = d7.toISOString().split('T')[0] || '';
      setStartDate(d7Str);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0] || '';
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  };

  // Fetch Reconciled BioTime Rows from API
  const fetchReconciledLogs = async (targetPage: number, targetSize?: number) => {
    const size = targetSize || pageSize;
    setIsRowsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(size),
        view: 'reconciled',
      });
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/v1/biotime/logs?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRows(data.data);
        setPage(data.page || targetPage);
        setTotalRows(data.total || data.data.length);
        setTotalPages(data.totalPages || Math.ceil((data.total || data.data.length) / size));
      }
    } catch (e) {
      console.error('Error fetching reconciled BioTime logs:', e);
    } finally {
      setIsRowsLoading(false);
    }
  };

  // Initial Data Load
  const loadInitial = async () => {
    try {
      const devRes = await fetch('/api/v1/biotime/devices');
      const devData = await devRes.json();
      if (devData.success && devData.data) setDevices(devData.data);
      await fetchReconciledLogs(1, pageSize);
    } catch (e) {
      console.error('Error loading initial data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  // Refetch when filters change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReconciledLogs(1, pageSize);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, startDate, endDate]);

  // Trigger manual sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/v1/biotime/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceAll: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || '✓ Synchronized live punches with Supabase attendance!');
        await fetchReconciledLogs(1, pageSize);
      } else {
        showToast(data.error || 'Failed to sync punches', 'error');
      }
    } catch {
      showToast('Network error during sync', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Client-side device filter
  const displayedRows = useMemo(() => {
    if (deviceFilter === 'ALL') return rows;
    return rows.filter((r) => r.deviceLocation.includes(deviceFilter));
  }, [rows, deviceFilter]);

  // Metrics summary
  const presentCount = useMemo(() => rows.filter((r) => r.status === 'Present').length, [rows]);
  const absentCount = useMemo(() => rows.filter((r) => r.status === 'Absent').length, [rows]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">Reconciling BioTime check-in &amp; check-out records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pb-12 text-xs">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
              : 'bg-rose-950/90 text-rose-200 border-rose-800'
          }`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
            <span>People &amp; Culture</span>
            <span>&bull;</span>
            <span>Attendance</span>
            <span>&bull;</span>
            <span className="text-cyan-600 dark:text-cyan-400">BioTime Logs</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            BioTime Attendance Log
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Daily reconciled biometric check-in &amp; check-out summary matched with People &amp; Culture employee profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pnc/settings/biotime"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-accent transition-all flex items-center gap-1.5 text-foreground shadow-2xs"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-600" />
            <span>Terminal Control Center</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground ml-0.5" />
          </Link>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync with Supabase'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Ingested Punches</div>
            <div className="text-xl font-bold text-foreground">20,472</div>
            <div className="text-[10px] text-muted-foreground">Live ZKTeco BioTime Database</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Present (Completed)</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <span>{presentCount}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Both IN &amp; OUT OK</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Two or more distinct punches</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Absent / Incomplete</div>
            <div className="text-xl font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <span>{absentCount}</span>
              <span className="text-[10px] font-semibold text-muted-foreground">Missing OUT</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Only 1 Check-In or no Check-Out</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hardware Terminals</div>
            <div className="text-xl font-bold text-foreground flex items-center gap-2">
              <span>{devices.length} Online</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] text-muted-foreground">Banani HQ &amp; School Terminals</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls Toolbar ── */}
      <div className="p-3 bg-card rounded-xl border border-border shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left search & filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by RFID, Name, Employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-2xs"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none shadow-2xs"
            >
              <option value="ALL">All Status</option>
              <option value="Present">Present (IN &amp; OUT done)</option>
              <option value="Absent">Absent (Missing OUT)</option>
            </select>

            {/* Device Location Filter */}
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none shadow-2xs"
            >
              <option value="ALL">All Terminals</option>
              {devices.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Date Range Presets */}
            <select
              value={datePreset}
              onChange={(e) => applyDatePreset(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none shadow-2xs"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="LAST7">Last 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>

          {/* Right Summary */}
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Showing {displayedRows.length} daily employee summaries</span>
          </div>
        </div>

        {/* ── Date Range Inputs Bar (when Active or Custom) ── */}
        {(datePreset === 'CUSTOM' || startDate || endDate) && (
          <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-2 bg-accent/20 p-2 rounded-lg text-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-1 text-muted-foreground font-semibold">
              <Calendar className="w-3.5 h-3.5 text-cyan-600" />
              <span>Date Range:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setStartDate(e.target.value);
                }}
                className="px-2.5 py-1 rounded-md bg-background border border-border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setEndDate(e.target.value);
                }}
                className="px-2.5 py-1 rounded-md bg-background border border-border text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => applyDatePreset('ALL')}
                className="px-2 py-1 rounded-md bg-accent hover:bg-accent/80 border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all"
                title="Reset Date Range"
              >
                <X className="w-3 h-3 text-rose-500" />
                <span>Clear Range</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table Card ── */}
      <div className="bg-card rounded-xl border border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto relative">
          {isRowsLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border shadow-md">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                <span className="text-xs font-bold text-foreground">Reconciling BioTime logs...</span>
              </div>
            </div>
          )}

          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
              <tr>
                <th className="p-2.5">RFID</th>
                <th className="p-2.5">Name</th>
                <th className="p-2.5">Employee ID</th>
                <th className="p-2.5">Department</th>
                <th className="p-2.5">Branch</th>
                <th className="p-2.5">Device Location</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5 text-center">Check IN</th>
                <th className="p-2.5 text-center">Check OUT</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-normal">
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    No reconciled attendance records found for the current date range and search filters.
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => {
                  const isPresent = row.status === 'Present';
                  return (
                    <tr key={row.id} className="hover:bg-accent/20 transition-all text-[11px]">
                      {/* 1. RFID */}
                      <td className="p-2.5 font-mono font-bold text-cyan-700 dark:text-cyan-300">
                        {row.rfid}
                      </td>

                      {/* 2. Name */}
                      <td className="p-2.5 font-bold text-foreground">
                        {row.name}
                      </td>

                      {/* 3. Employee ID (P&C) */}
                      <td className="p-2.5 font-mono text-[10px] font-semibold text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-muted border border-border/60">
                          {row.employeeId}
                        </span>
                      </td>

                      {/* 4. Department */}
                      <td className="p-2.5 text-foreground">
                        {row.department}
                      </td>

                      {/* 5. Branch */}
                      <td className="p-2.5 text-muted-foreground">
                        {row.branch}
                      </td>

                      {/* 6. Device Location */}
                      <td className="p-2.5 font-medium text-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-cyan-600 shrink-0" />
                          <span className="truncate">{row.deviceLocation}</span>
                        </div>
                      </td>

                      {/* 7. DATE */}
                      <td className="p-2.5 font-mono text-[10px] text-muted-foreground">
                        {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      {/* 8. CHECK IN (First Punch) */}
                      <td className="p-2.5 text-center font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          {row.checkIn}
                        </span>
                      </td>

                      {/* 9. CHECK OUT (Last Punch or --) */}
                      <td className="p-2.5 text-center font-mono text-[10px] font-bold">
                        {row.checkOut !== '--' ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                            {row.checkOut}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-mono font-normal">--</span>
                        )}
                      </td>

                      {/* 10. STATUS */}
                      <td className="p-2.5 text-center">
                        {isPresent ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3" />
                            Present
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-2xs"
                            title="Check-Out was empty or not completed"
                          >
                            <XCircle className="w-3 h-3" />
                            Absent
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Controls Bar ── */}
        <div className="p-3 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Left: Summary and Page Size */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>
              Showing{' '}
              <strong className="text-foreground">
                {totalRows === 0 ? 0 : (page - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-foreground">
                {Math.min(page * pageSize, totalRows)}
              </strong>{' '}
              of <strong className="text-foreground">{totalRows.toLocaleString()}</strong> employee records
            </span>

            <div className="flex items-center gap-1.5 pl-3 border-l border-border">
              <span className="text-[11px]">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPageSize(newSize);
                  fetchReconciledLogs(1, newSize);
                }}
                className="px-2 py-0.5 rounded-md bg-background border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Right: Pagination Navigation */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchReconciledLogs(1, pageSize)}
              disabled={page <= 1 || isRowsLoading}
              className="px-2 py-1 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-all flex items-center gap-1"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => fetchReconciledLogs(page - 1, pageSize)}
              disabled={page <= 1 || isRowsLoading}
              className="px-2.5 py-1 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-all flex items-center gap-1"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <div className="px-3 py-1 rounded-md bg-accent/40 border border-border text-xs font-bold text-foreground">
              Page {page} of {Math.max(1, totalPages)}
            </div>

            <button
              onClick={() => fetchReconciledLogs(page + 1, pageSize)}
              disabled={page >= totalPages || isRowsLoading}
              className="px-2.5 py-1 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-all flex items-center gap-1"
              title="Next Page"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => fetchReconciledLogs(totalPages, pageSize)}
              disabled={page >= totalPages || isRowsLoading}
              className="px-2.5 py-1 rounded-md border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-foreground transition-all flex items-center gap-1"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
