'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  HardDrive,
  Users,
  DollarSign,
  GraduationCap,
  Play,
} from 'lucide-react';
import { EnterpriseTable, ColumnDef } from '@jaago/ui';

interface ReportDefinition {
  key: string;
  name: string;
  category: 'hr' | 'finance' | 'education' | 'operations';
  description: string;
  columns: Array<{ key: string; header: string }>;
}

export default function ReportsPage() {
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('hr_attendance_monthly');
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const [reportColumns, setReportColumns] = useState<ColumnDef<Record<string, unknown>>[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadDefinitions() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
        const res = await fetch('/api/v1/reports', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.data) {
          setDefinitions(data.data);
        }
      } catch (err) {
        console.error('Failed to load report definitions:', err);
      }
    }
    loadDefinitions();
    runReport('hr_attendance_monthly');
  }, []);

  const runReport = async (key: string) => {
    setSelectedKey(key);
    setLoading(true);
    setDownloadUrl(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ definitionKey: key }),
      });

      const json = await res.json();
      if (json.data) {
        setReportData(json.data.rows);
        setDownloadUrl(json.data.export.downloadUrl);

        const cols: ColumnDef<Record<string, unknown>>[] = json.data.definition.columns.map((c: any) => ({
          key: c.key,
          header: c.header,
          accessor: (row: Record<string, unknown>) => {
            const val = row[c.key];
            return <span className="font-medium text-foreground">{String(val ?? '')}</span>;
          },
        }));
        setReportColumns(cols);
      }
    } catch (err) {
      console.error('Failed to execute report:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hr':
        return <Users className="h-5 w-5 text-primary" />;
      case 'finance':
        return <DollarSign className="h-5 w-5 text-emerald-400" />;
      case 'education':
        return <GraduationCap className="h-5 w-5 text-amber-400" />;
      default:
        return <FileSpreadsheet className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground">
      {/* ── HEADER ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg border border-primary/30">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Reports &amp; Analytics Center
            </h1>
            <p className="text-xs text-muted-foreground">
              Pre-built Aggregate Templates &bull; 15-Min Expiring Signed Exports &bull; Automated Cron Distribution
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>GENERATED REPORTS</span>
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            1,420
          </div>
          <div className="text-[11px] text-muted-foreground">Last 30 days execution volume</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>SCHEDULED CRONS</span>
            <Calendar className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-amber-400 font-mono">
            4 Active
          </div>
          <div className="text-[11px] text-muted-foreground">Nightly email report batches</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>EXPORT STORAGE USED</span>
            <HardDrive className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            1.2 <span className="text-sm font-semibold text-muted-foreground">GB</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Auto-pruned after 24 hours</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>DATA ACCURACY</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
            100%
          </div>
          <div className="text-[11px] text-muted-foreground">Cross-department reconciled</div>
        </div>
      </div>

      {/* ── REPORT TEMPLATES SELECTOR ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Operational Report Templates
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {definitions.map((def) => {
            const isSelected = selectedKey === def.key;
            return (
              <div
                key={def.key}
                onClick={() => runReport(def.key)}
                className={`p-5 rounded-2xl border transition cursor-pointer shadow-xl space-y-2.5 ${
                  isSelected
                    ? 'bg-card border-primary ring-1 ring-primary/40'
                    : 'bg-card/70 border-border/80 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-surface border border-border">
                    {getCategoryIcon(def.category)}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground">
                    {def.category}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-foreground">{def.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {def.description}
                </p>
                <div className="pt-2 flex items-center justify-between text-xs font-bold text-primary">
                  <span className="flex items-center space-x-1">
                    <Play className="h-3 w-3" />
                    <span>Run Query</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">6 Columns</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── LIVE REPORT VIEWER ── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Report Output Table &amp; Export Link
          </h3>

          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center space-x-1.5 hover:bg-primary/90 shadow-lg transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Signed CSV</span>
            </a>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground rounded-2xl bg-card border border-border">
            Executing aggregation query...
          </div>
        ) : reportData.length > 0 && reportColumns.length > 0 ? (
          <EnterpriseTable
            columns={reportColumns}
            data={reportData}
            keyField={Object.keys(reportData[0] || {})[0] || 'id'}
            title={definitions.find((d) => d.key === selectedKey)?.name}
            searchPlaceholder="Filter report rows..."
          />
        ) : (
          <div className="p-12 text-center text-muted-foreground rounded-2xl bg-card border border-border">
            No rows returned for this report query.
          </div>
        )}
      </div>
    </div>
  );
}
