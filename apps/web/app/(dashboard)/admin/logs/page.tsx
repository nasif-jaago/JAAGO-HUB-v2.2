'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  HardDrive,
  Clock,
  Filter,
  Search,
  ChevronRight,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  eventType: string;
  action: string;
  environment: string;
  service: string;
  traceId: string;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  route?: string;
  httpMethod?: string;
  statusCode?: number;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeLevel, setActiveLevel] = useState('ALL');
  const [activeType, setActiveType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
        const res = await fetch(`/api/v1/logs?level=${activeLevel}&eventType=${activeType}&search=${encodeURIComponent(searchQuery)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.data) {
          setLogs(data.data);
        }
      } catch (err) {
        console.error('Failed to load logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [activeLevel, activeType, searchQuery]);

  const levelTabs = ['ALL', 'INFO', 'WARN', 'ERROR', 'DEBUG', 'AUDIT'];
  const eventTypes = ['ALL', 'HTTP', 'AUTH', 'SECURITY', 'SYSTEM', 'AUDIT'];

  const getLevelBadgeClass = (lvl: string) => {
    switch (lvl.toLowerCase()) {
      case 'error':
      case 'fatal':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'warn':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'info':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'audit':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-surface text-muted-foreground border-border';
    }
  };

  const copyJson = (obj: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground">
      {/* ── HEADER ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg border border-primary/30">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Observability &amp; Logs Center
            </h1>
            <p className="text-xs text-muted-foreground">
              30-Field Structured Log Event Stream &bull; Bounded Disk Spool &bull; Pino Central Redaction
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>TOTAL EVENTS (24H)</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            142,890
          </div>
          <div className="text-[11px] text-muted-foreground">99.88% ingestion rate</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>ERROR RATE</span>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-3xl font-black tracking-tight text-destructive font-mono">
            0.12%
          </div>
          <div className="text-[11px] text-muted-foreground">18 recorded incident logs</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>ACTIVE DISK SPOOLS</span>
            <HardDrive className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            2 <span className="text-sm font-semibold text-muted-foreground">Files</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Bounded buffer (500MB max)</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>INGESTION LATENCY</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            42ms
          </div>
          <div className="text-[11px] text-muted-foreground">Spool &rarr; PostgreSQL bulk ingest</div>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Level Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <Filter className="h-4 w-4 text-muted-foreground mr-1 flex-shrink-0" />
          {levelTabs.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setActiveLevel(lvl)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition tracking-wider ${
                activeLevel === lvl
                  ? 'bg-primary text-primary-foreground font-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Search & EventType Selector */}
        <div className="flex items-center space-x-3">
          <select
            value={activeType}
            onChange={(e) => setActiveType(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t === 'ALL' ? 'All Event Types' : t}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trace / action / route..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>
      </div>

      {/* ── LOGS TABLE ── */}
      <div className="rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Action / Route</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Status / Latency</th>
                <th className="py-3 px-4">Trace ID</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">
                    No log events match the selected criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-surface/60 cursor-pointer transition select-none group"
                  >
                    <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getLevelBadgeClass(
                          log.level,
                        )}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">{log.eventType}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground group-hover:text-primary transition">
                        {log.action}
                      </div>
                      {log.route && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {log.httpMethod} {log.route}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{log.service}</td>
                    <td className="py-3 px-4">
                      {log.statusCode ? (
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`font-mono font-bold ${
                              log.statusCode >= 500
                                ? 'text-destructive'
                                : log.statusCode >= 400
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {log.statusCode}
                          </span>
                          {log.durationMs && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({log.durationMs}ms)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-primary/80 truncate max-w-[140px]">
                      {log.traceId.slice(0, 12)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ChevronRight className="h-4 w-4 text-muted-foreground inline group-hover:text-primary transition" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/90 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${getLevelBadgeClass(
                    selectedLog.level,
                  )}`}
                >
                  {selectedLog.level}
                </span>
                <span className="font-bold text-sm text-foreground">{selectedLog.action}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyJson(selectedLog)}
                  className="p-2 rounded-xl bg-surface border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center space-x-1.5 transition"
                  title="Copy JSON"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-surface border border-border text-[11px]">
                <div>
                  <span className="text-muted-foreground">Trace ID:</span>
                  <div className="text-primary truncate">{selectedLog.traceId}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Request ID:</span>
                  <div className="text-foreground truncate">{selectedLog.requestId || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <div className="text-foreground">{selectedLog.timestamp}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Service / Env:</span>
                  <div className="text-foreground">{selectedLog.service} ({selectedLog.environment})</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-muted-foreground">
                  Structured 30-Field Event JSON (Redacted)
                </div>
                <pre className="p-4 rounded-2xl bg-background border border-border/80 text-foreground overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
