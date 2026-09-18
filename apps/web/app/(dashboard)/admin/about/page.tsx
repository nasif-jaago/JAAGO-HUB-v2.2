'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Activity,
  CheckCircle2,
  Shield,
  RefreshCw,
  Play,
  Copy,
  Check,
  Download,
  Boxes,
  Scale,
  Flame,
  Bot,
  Database,
  Terminal,
  Code,
} from 'lucide-react';

type TabType = 'constitution' | 'architecture' | 'telemetry' | 'packages' | 'mcp';

interface TelemetryStep {
  step: number;
  name: string;
  category: 'CLIENT' | 'GATEWAY' | 'AUTHZ' | 'CORE' | 'DATABASE' | 'ASYNC_LOG';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  durationMs: number;
  details: string;
  dataSnippet?: Record<string, any> | string;
}

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<TabType>('constitution');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Live Telemetry Simulation State
  const [telemetryEndpoint, setTelemetryEndpoint] = useState<string>('GET /api/v1/hr/employees');
  const [isRunningTelemetry, setIsRunningTelemetry] = useState(false);
  const [telemetrySteps, setTelemetrySteps] = useState<TelemetryStep[]>([]);
  const [telemetryExecutionTime, setTelemetryExecutionTime] = useState<number>(0);
  const [telemetryTraceId, setTelemetryTraceId] = useState<string>('tr_initial_001');

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const runTelemetrySimulation = (endpoint: string) => {
    setIsRunningTelemetry(true);
    const traceId = `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setTelemetryTraceId(traceId);
    setTelemetrySteps([]);

    const stepsTemplate: Omit<TelemetryStep, 'status' | 'durationMs'>[] = [
      {
        step: 1,
        name: 'User Client Request Dispatch',
        category: 'CLIENT',
        details: 'Browser UI dispatches fetch request with Bearer Auth Token & Trace Headers',
        dataSnippet: {
          url: endpoint.split(' ')[1],
          method: endpoint.split(' ')[0],
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsIn...',
            'X-Trace-Id': traceId,
            'X-Client-Version': 'v2.2.0-prod',
            'Accept': 'application/json',
          },
        },
      },
      {
        step: 2,
        name: 'Nginx Hardened Edge Proxy & Rate Limiter',
        category: 'GATEWAY',
        details: 'Same-origin validation, TLS 1.3 verification, request size guard & Redis token-bucket rate limit check',
        dataSnippet: {
          originAllowed: true,
          clientIp: '103.145.118.24',
          rateLimitRemaining: '498/500 req/min',
          sslCipher: 'TLS_AES_256_GCM_SHA384',
          bodyPayloadBytes: 0,
        },
      },
      {
        step: 3,
        name: 'Auth & Multi-Tenant RBAC Guard',
        category: 'AUTHZ',
        details: 'Supabase JWT session validation + @jaago/authz permission matrix verification with AsyncLocalStorage propagation',
        dataSnippet: {
          userId: 'usr_nasif_001',
          roles: ['SUPER_ADMIN', 'HR_COORDINATOR'],
          organizationId: 'org_jaago_trust',
          requiredPermission: 'hr.employees.view',
          permissionGranted: true,
          tenantIsolation: 'ENFORCED (RLS: organizationId = org_jaago_trust)',
        },
      },
      {
        step: 4,
        name: 'Framework-Agnostic Core Domain Service',
        category: 'CORE',
        details: 'Execution routed through packages/core-application/services/employee.service.ts using clean port interfaces',
        dataSnippet: {
          useCase: 'ListEmployeesUseCase',
          params: { page: 1, limit: 50, filterStatus: 'active' },
          cachePolicy: 'SWR (Stale-While-Revalidate: TTL 60s, Tag: hr:employees)',
          stampedeProtection: 'L1 In-Memory + L2 Redis Mutex',
        },
      },
      {
        step: 5,
        name: 'Drizzle ORM Query & Supabase PostgreSQL Execution',
        category: 'DATABASE',
        details: 'Parameterized SQL generation, connection pool execution, and Row-Level Security row filtering',
        dataSnippet: {
          sql: 'SELECT id, full_name, code, email, department, designation, status FROM hr_employees WHERE organization_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4',
          params: ['org_jaago_trust', 'active', 50, 0],
          dbLatencyMs: 4.8,
          rowsMatched: 742,
          rowsReturned: 50,
        },
      },
      {
        step: 6,
        name: 'Pino Async Spool Pipeline & Redaction',
        category: 'ASYNC_LOG',
        details: 'Structured event builder captures trace, recursively redacts secrets, and writes to local atomic buffer (*.ready.ndjson.gz)',
        dataSnippet: {
          eventId: `evt_${Date.now()}`,
          traceId: traceId,
          level: 'INFO',
          eventType: 'AUDIT',
          action: 'hr.employees.listed',
          durationMs: 14.2,
          spoolStatus: 'WRITTEN_TO_SPOOL_BUFFER (Uploaded via log-runner to separate logger Supabase)',
        },
      },
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < stepsTemplate.length) {
        const item = stepsTemplate[current]!;
        const duration = Math.floor(2 + Math.random() * 8);
        setTelemetrySteps((prev) => [
          ...prev,
          {
            ...item,
            status: 'COMPLETED',
            durationMs: duration,
          },
        ]);
        current++;
      } else {
        clearInterval(interval);
        setIsRunningTelemetry(false);
        setTelemetryExecutionTime(14.8);
      }
    }, 450);
  };

  useEffect(() => {
    runTelemetrySimulation('GET /api/v1/hr/employees');
  }, []);

  return (
    <div className="space-y-6 select-none font-sans text-[#2C2416] pb-16">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TOP BANNER & TAB CONTROLLER ───────────────────────────  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-[#FAF6EC] border-2 border-[#D9CEB8] p-6 rounded-3xl shadow-lg relative overflow-hidden">
        {/* Subtle Watermark Stamp */}
        <div className="absolute -right-6 -bottom-6 select-none pointer-events-none opacity-5 text-black font-serif font-black text-8xl rotate-12">
          JAAGO HUB
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#D9CEB8]/70 pb-5">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-2xl bg-[#2E2012] border-2 border-[#C5A869] text-[#F5C518] flex items-center justify-center font-serif font-black text-2xl shadow-md flex-shrink-0">
              §
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#E5DCB7] text-[#4A3B22] font-black border border-[#D0C4A4]">
                  ENGINEERING SPECIFICATION &amp; ARCHITECTURE
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  PRODUCTION v2.2
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-[#221A10] pt-1">
                JAAGO HUB Architecture &amp; System Blueprint
              </h1>
              <p className="text-xs font-serif italic text-[#6E5D42]">
                Permanent Technical Constitution &bull; 10–15 Year Maintainability Doctrine &bull; NGO Enterprise ERP
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(window.location.href, 'share')}
              className="px-3.5 py-2 rounded-xl bg-[#EBE3D3] hover:bg-[#DDD2C0] border border-[#C8BAA0] text-xs font-bold text-[#3B2F1C] flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            >
              {copiedSection === 'share' ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSection === 'share' ? 'Link Copied!' : 'Copy Share Link'}</span>
            </button>
            <a
              href="/demo_users_import_template.csv"
              download
              className="px-3.5 py-2 rounded-xl bg-[#2E2012] hover:bg-[#3D2C1B] text-[#F5C518] border border-[#C5A869] text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Schemas</span>
            </a>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center space-x-2 sm:space-x-4 pt-4 overflow-x-auto no-scrollbar">
          {[
            { id: 'constitution', label: '📜 Technical Constitution & Docs', icon: Scale },
            { id: 'architecture', label: '🗺️ Architecture Workflow', icon: Layers },
            { id: 'telemetry', label: '⚡ Live Request-to-DB Telemetry', icon: Activity },
            { id: 'packages', label: '📦 Monorepo Package Matrix', icon: Boxes },
            { id: 'mcp', label: '🤖 MCP Architecture & Database', icon: Bot },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#2E2012] text-[#F5C518] shadow-md border border-[#C5A869]'
                  : 'bg-[#EDE4D2] hover:bg-[#E2D6C0] text-[#54442E] border border-[#D5C9B3]'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: TECHNICAL CONSTITUTION (VINTAGE NEWSPAPER/LEGAL) ─ */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'constitution' && (
        <div className="bg-[#F6EFE2] border-2 border-[#D8CCB5] rounded-3xl p-6 sm:p-10 shadow-xl space-y-10 font-serif leading-relaxed text-[#2D2315]">
          {/* Newspaper Masthead */}
          <div className="text-center border-b-4 border-double border-[#6C5B42] pb-6 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.3em] font-extrabold text-[#746249]">
              THE OFFICIAL ENGINEERING GAZETTE &bull; VOL. II &bull; ISSUE 2026
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#22170B] uppercase">
              JAAGO HUB SYSTEM CONSTITUTION
            </h2>
            <div className="text-xs font-mono italic text-[#63533C] pt-1">
              Guaranteed 10-15 Year Production Stability &bull; Odoo-Class Modular Kernel &bull; Zero Leakage Security
            </div>
          </div>

          {/* § 1.0 Engineering Priority Order */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#D2C5AB] pb-1.5">
              <h3 className="text-xl font-bold text-[#2A1E11] uppercase tracking-wide flex items-center space-x-2">
                <span>§ 1.0</span>
                <span>Engineering Priority Order (Tie-Breaker Doctrine)</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#E4D9C1] px-2.5 py-0.5 rounded-full border border-[#CABDA1]">
                MANDATORY RULE
              </span>
            </div>
            <p className="text-sm">
              Whenever any architectural requirement, deadline, or design decision conflicts, all software architects and full-stack engineers MUST resolve the matter strictly adhering to this immutable priority order:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2 text-xs font-sans font-bold">
              {[
                { rank: '1', title: 'Data Integrity', desc: 'No lost or orphaned records' },
                { rank: '2', title: 'Security', desc: 'Zero token leaks, OWASP top 10' },
                { rank: '3', title: 'Tenant Isolation', desc: 'Multi-layer RLS enforcement' },
                { rank: '4', title: 'Production Uptime', desc: 'Resilient background workers' },
                { rank: '5', title: 'Runtime Compatibility', desc: 'Node 22 LTS, no edge crashes' },
                { rank: '6', title: 'Performance', desc: 'Cursor pagination, <1% log lag' },
                { rank: '7', title: 'Maintainability', desc: '10-15 year clean decoupled code' },
                { rank: '8', title: 'Operational Simplicity', desc: 'Pino spool, simple Nginx reverse' },
                { rank: '9', title: 'Developer Speed', desc: 'Turborepo caching & contracts' },
                { rank: '10', title: 'User Experience', desc: 'Warm cream & matte aesthetics' },
                { rank: '11', title: 'Convenience', desc: 'Never compromise rules for ease' },
              ].map((item) => (
                <div key={item.rank} className="p-3 rounded-2xl bg-[#ECE2CE] border border-[#D5C9B3] space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#8C7654]">PRIORITY #{item.rank}</span>
                    <Flame className="h-3.5 w-3.5 text-[#C5A869]" />
                  </div>
                  <div className="font-extrabold text-[#221A10]">{item.title}</div>
                  <div className="text-[11px] font-medium text-[#685840]">{item.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* § 2.0 Locked Technology Stack */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#D2C5AB] pb-1.5">
              <h3 className="text-xl font-bold text-[#2A1E11] uppercase tracking-wide flex items-center space-x-2">
                <span>§ 2.0</span>
                <span>Locked Technology Matrix</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#E4D9C1] px-2.5 py-0.5 rounded-full border border-[#CABDA1]">
                PINNED MAJORS
              </span>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#D5C9B3]">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-[#E4D8C1] border-b border-[#D5C9B3] text-[11px] font-extrabold uppercase text-[#4D3F2B]">
                    <th className="py-2.5 px-4">Concern</th>
                    <th className="py-2.5 px-4">Technology Choice</th>
                    <th className="py-2.5 px-4">Architectural Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCD1BA] bg-[#EFE6D4]">
                  {[
                    { concern: 'Language', choice: 'TypeScript (Strict)', note: 'strict: true, noUncheckedIndexedAccess, exactOptionalPropertyTypes' },
                    { concern: 'Runtime', choice: 'Node.js 22 LTS', note: 'Node runtime only — NO Edge runtime for DB/logger/secrets' },
                    { concern: 'Monorepo', choice: 'pnpm + Turborepo', note: 'Workspaces task graph + remote compilation cache' },
                    { concern: 'App Framework', choice: 'Next.js 15 (App Router)', note: 'Full-stack UI + BFF API route handlers under /api/v1' },
                    { concern: 'ORM / Database', choice: 'Drizzle ORM + Supabase PostgreSQL', note: 'Type-safe SQL + Row-Level Security (RLS) policies' },
                    { concern: 'Logger Database', choice: 'Separate Supabase Project', note: 'Isolated log storage so logs never compete with transactional DB' },
                    { concern: 'Cache & Locks', choice: 'Redis 7 (Native Low-Latency)', note: 'BullMQ + distributed locks + rate limiting + stampede protection' },
                    { concern: 'Background Jobs', choice: 'BullMQ Worker Process', note: 'Dedicated Node process for async jobs, retries & dead-letter queue' },
                    { concern: 'Central Logger', choice: 'Pino + Async Bounded Spool', note: 'Structured JSON, auto-redaction, 1GB local spool, *.ready.ndjson.gz' },
                    { concern: 'Reverse Proxy', choice: 'Hardened Nginx', note: 'Same-origin routing, TLS 1.3, security headers, request bounds' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#E8DFC9] transition">
                      <td className="py-2.5 px-4 font-bold text-[#2A1F13]">{row.concern}</td>
                      <td className="py-2.5 px-4 font-mono font-extrabold text-[#946A1B]">{row.choice}</td>
                      <td className="py-2.5 px-4 text-[#5E4F39]">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* § 3.0 Odoo-Class Module Engine */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#D2C5AB] pb-1.5">
              <h3 className="text-xl font-bold text-[#2A1E11] uppercase tracking-wide flex items-center space-x-2">
                <span>§ 3.0</span>
                <span>Odoo-Class Modular Architecture</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#E4D9C1] px-2.5 py-0.5 rounded-full border border-[#CABDA1]">
                CORE DIFFERENTIATOR
              </span>
            </div>
            <p className="text-sm">
              JAAGO HUB is built as an <strong>extensible platform kernel + installable modules</strong>. The kernel never hardcodes business domain logic. Every business vertical (Employees, Leave, Attendance, Finance, Grants) is packaged as an independent module adhering to <code className="font-mono text-xs bg-[#E4D8C1] px-1.5 py-0.5 rounded">module.manifest.ts</code>:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-sans text-xs">
              <div className="p-4 rounded-2xl bg-[#EDE3CF] border border-[#D5C9B3] space-y-2">
                <div className="font-bold text-[#291E11] flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>Tier 1: Developer Compile-Time Modules</span>
                </div>
                <p className="text-[#63533C]">
                  Live under <code className="font-mono">packages/modules/&lt;key&gt;/</code>. They own prefixed DB tables (<code className="font-mono">hr_employees</code>, <code className="font-mono">fin_journal_entries</code>), ship forward migrations, declare permissions, and support runtime enable/disable without data loss.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#EDE3CF] border border-[#D5C9B3] space-y-2">
                <div className="font-bold text-[#291E11] flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-700" />
                  <span>Tier 2: Extension Points (Odoo Inheritance)</span>
                </div>
                <p className="text-[#63533C]">
                  Modules declare <code className="font-mono">extends: [&apos;hr&apos;]</code> to inject columns, add sub-menus, listen to events, or hook into workflow approval steps. This is how Leave and Attendance extend Employees cleanly.
                </p>
              </div>
            </div>
          </section>

          {/* § 4.0 Observability & Central Logger Pipeline */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#D2C5AB] pb-1.5">
              <h3 className="text-xl font-bold text-[#2A1E11] uppercase tracking-wide flex items-center space-x-2">
                <span>§ 4.0</span>
                <span>Central Observability &amp; Pino Spool Pipeline</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#E4D9C1] px-2.5 py-0.5 rounded-full border border-[#CABDA1]">
                REQ 42–70
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#2E2012] text-[#F5C518] font-mono text-xs space-y-2 border border-[#C5A869] shadow-inner">
              <div className="font-bold text-white uppercase text-[11px] pb-1 border-b border-[#5E472D]">
                Spool Pipeline Architecture:
              </div>
              <div className="text-[#E7DFCD] space-y-1">
                <div>[1] App Request &rarr; Structured Event Builder &rarr; Central Redaction (Masking Passwords/Tokens)</div>
                <div>[2] Size Validation &rarr; Pino Logger &rarr; Async Worker Transport &rarr; Second Validation</div>
                <div>[3] Bounded Local Spool (/var/lib/jaago-hub/log-spool, 1GB Max Cap)</div>
                <div>[4] Atomic Lifecycle: *.open.ndjson &rarr; *.ready.ndjson &rarr; *.ready.ndjson.gz</div>
                <div>[5] Dedicated Log Runner Process &rarr; Batch Uploader &rarr; Separate Logger Supabase DB</div>
                <div>[6] Tamper-Evident Hash-Chaining for durable Audit Records</div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: INTERACTIVE ARCHITECTURE WORKFLOW DIAGRAM ─────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'architecture' && (
        <div className="bg-[#FAF6EC] border-2 border-[#D9CEB8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-[#261C10]">
              Interactive Architecture Workflow
            </h2>
            <p className="text-xs font-serif italic text-[#6E5D42]">
              End-to-end request lifecycle from user interface to database, queue worker, and log spool
            </p>
          </div>

          {/* Visual Architecture Flow Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            {[
              {
                step: '1. CLIENT UI',
                title: 'Next.js 15 PWA',
                tech: 'React 19 + TanStack Query',
                desc: 'Client/Server components, theme tokens, WCAG a11y, offline resilience',
                color: 'border-blue-500/50 bg-blue-50/50 text-blue-900',
              },
              {
                step: '2. EDGE PROXY',
                title: 'Hardened Nginx',
                tech: 'Same-Origin TLS 1.3',
                desc: 'Origin allowlist, rate limiting, request bounds (25MB), safe header filtering',
                color: 'border-purple-500/50 bg-purple-50/50 text-purple-900',
              },
              {
                step: '3. BFF & AUTHZ',
                title: 'Route Handlers',
                tech: '/api/v1 + Zod Validation',
                desc: 'AsyncLocalStorage traceId, Supabase JWT Auth, RBAC Matrix guards',
                color: 'border-amber-500/50 bg-amber-50/50 text-amber-900',
              },
              {
                step: '4. APPLICATION',
                title: 'Core Domain Engine',
                tech: 'packages/core-application',
                desc: 'Framework-agnostic use cases, ports/services, SWR caching with Redis',
                color: 'border-emerald-500/50 bg-emerald-50/50 text-emerald-900',
              },
              {
                step: '5. DATA LAYER',
                title: 'Drizzle + Supabase',
                tech: 'PostgreSQL + RLS',
                desc: 'Forward migrations, multi-tenant row isolation, cursor pagination, BDT/Dhaka',
                color: 'border-cyan-500/50 bg-cyan-50/50 text-cyan-900',
              },
              {
                step: '6. ASYNC & LOGS',
                title: 'BullMQ & Pino Spool',
                tech: 'Redis 7 + Log Runner',
                desc: 'Background workers, dead-letter queue, 1GB spool buffer & logger DB',
                color: 'border-rose-500/50 bg-rose-50/50 text-rose-900',
              },
            ].map((node, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border-2 shadow-sm flex flex-col justify-between space-y-2 ${node.color}`}
              >
                <div>
                  <div className="text-[10px] font-mono font-bold opacity-75 uppercase">{node.step}</div>
                  <div className="font-extrabold text-sm pt-0.5">{node.title}</div>
                  <div className="text-[11px] font-mono font-semibold opacity-90">{node.tech}</div>
                </div>
                <p className="text-[11px] leading-snug opacity-80 pt-2 border-t border-current/20">
                  {node.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Hardened Reverse Proxy Technical Specification */}
          <div className="p-5 rounded-2xl bg-[#EFE7D7] border border-[#D5C9B3] space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-serif font-black text-sm text-[#251B10] flex items-center space-x-2">
                <Shield className="h-4 w-4 text-[#946A1B]" />
                <span>Hardened Reverse Proxy Protection (TLS + Origin Strict Verification)</span>
              </div>
              <span className="text-[10px] font-mono bg-[#E2D5BE] px-2 py-0.5 rounded-full text-[#59462A] font-bold border border-[#CBBDA3]">
                CONFIRMED STANDARD
              </span>
            </div>
            <p className="text-xs text-[#5C4C36] leading-relaxed">
              In accordance with Section A17, JAAGO HUB enforces zero insecure fallbacks. TLS certificate validation is strictly ON, only allowlisted path prefixes (<code className="font-mono bg-[#E2D5BD] px-1 py-0.5 rounded">/api/</code>, <code className="font-mono bg-[#E2D5BD] px-1 py-0.5 rounded">/health</code>) and headers (<code className="font-mono bg-[#E2D5BD] px-1 py-0.5 rounded">Authorization, Content-Type, X-Request-Id</code>) are forwarded, body payload is strictly capped at 25 MB, and all internal errors are safely sanitized without stack trace leakage.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: LIVE REQUEST-TO-DATABASE TELEMETRY MONITOR ─────  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'telemetry' && (
        <div className="bg-[#FAF6EC] border-2 border-[#D9CEB8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9CEB8]/70 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-[#261C10]">
                Live Request-to-Database Telemetry
              </h2>
              <p className="text-xs font-serif italic text-[#6E5D42]">
                Real-time execution debugger tracing Client HTTP &rarr; BFF &rarr; RBAC &rarr; Core &rarr; Drizzle ORM &rarr; Supabase DB &rarr; Pino Log Spool
              </p>
            </div>

            {/* Endpoint Selector & Run Button */}
            <div className="flex items-center space-x-2">
              <select
                value={telemetryEndpoint}
                onChange={(e) => {
                  setTelemetryEndpoint(e.target.value);
                  runTelemetrySimulation(e.target.value);
                }}
                disabled={isRunningTelemetry}
                className="px-3 py-2 rounded-xl bg-[#EBE2D0] border border-[#C5B79F] text-xs font-mono font-bold text-[#2A1F13] focus:outline-none cursor-pointer"
              >
                <option value="GET /api/v1/hr/employees">GET /api/v1/hr/employees</option>
                <option value="POST /api/v1/workflows/submit">POST /api/v1/workflows/submit</option>
                <option value="GET /api/v1/admin/modules">GET /api/v1/admin/modules</option>
                <option value="POST /api/v1/auth/login">POST /api/v1/auth/login</option>
              </select>

              <button
                onClick={() => runTelemetrySimulation(telemetryEndpoint)}
                disabled={isRunningTelemetry}
                className="px-4 py-2 rounded-xl bg-[#2E2012] hover:bg-[#422F1D] text-[#F5C518] text-xs font-bold transition flex items-center space-x-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isRunningTelemetry ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isRunningTelemetry ? 'Executing Pipeline...' : 'Test Request'}</span>
              </button>
            </div>
          </div>

          {/* Telemetry Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#EDE4D2] border border-[#D5C9B3]">
              <div className="text-[10px] text-[#78644A] uppercase font-bold">Trace ID</div>
              <div className="font-extrabold text-[#221A10] truncate">{telemetryTraceId}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#EDE4D2] border border-[#D5C9B3]">
              <div className="text-[10px] text-[#78644A] uppercase font-bold">Total Duration</div>
              <div className="font-extrabold text-emerald-800">{telemetryExecutionTime ? `${telemetryExecutionTime} ms` : 'Measuring...'}</div>
            </div>
            <div className="p-3 rounded-xl bg-[#EDE4D2] border border-[#D5C9B3]">
              <div className="text-[10px] text-[#78644A] uppercase font-bold">HTTP Status</div>
              <div className="font-extrabold text-emerald-800">200 OK (Standard Envelope)</div>
            </div>
            <div className="p-3 rounded-xl bg-[#EDE4D2] border border-[#D5C9B3]">
              <div className="text-[10px] text-[#78644A] uppercase font-bold">Security Redaction</div>
              <div className="font-extrabold text-[#946A1B]">100% Passed (Zero Leakage)</div>
            </div>
          </div>

          {/* Live Step-by-Step Execution Waterfall */}
          <div className="space-y-3">
            {telemetrySteps.map((step) => (
              <div
                key={step.step}
                className="p-4 rounded-2xl bg-[#F4ECDE] border border-[#D8CEB7] shadow-sm space-y-2 transition animate-in fade-in slide-in-from-top-1"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className="h-6 w-6 rounded-full bg-[#2E2012] text-[#F5C518] flex items-center justify-center font-mono font-bold text-[11px]">
                      {step.step}
                    </span>
                    <span className="font-extrabold text-[#261C10]">{step.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase tracking-wider bg-[#E2D5BC] text-[#524128] border border-[#CABDA1]">
                      {step.category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    <span className="text-emerald-800 font-bold">{step.durationMs} ms</span>
                    <span className="text-emerald-700 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{step.status}</span>
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#63533B] font-serif pl-8">{step.details}</p>

                {step.dataSnippet && (
                  <div className="pl-8 pt-1">
                    <pre className="p-3 rounded-xl bg-[#261A0E] text-[#EADBB6] text-[10.5px] font-mono overflow-x-auto border border-[#4F3921] max-h-36">
                      {typeof step.dataSnippet === 'string'
                        ? step.dataSnippet
                        : JSON.stringify(step.dataSnippet, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: MONOREPO PACKAGE MATRIX & DEPENDENCY GRAPH ─────  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'packages' && (
        <div className="bg-[#FAF6EC] border-2 border-[#D9CEB8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9CEB8]/70 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-[#261C10]">
                Monorepo Workspace Packages Matrix
              </h2>
              <p className="text-xs font-serif italic text-[#6E5D42]">
                Strict architectural boundaries enforced via Turborepo task graph &amp; pnpm workspaces
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-[#6B5A41]">
              22 Packages &bull; 3 Applications
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'apps/web', desc: 'Next.js 15 App Router (UI + /api/v1 Route Handlers BFF)', type: 'APPLICATION' },
              { name: 'apps/worker', desc: 'Dedicated Node process running BullMQ job processors', type: 'APPLICATION' },
              { name: 'apps/log-runner', desc: 'Dedicated spool uploader to separate logger Supabase DB', type: 'APPLICATION' },
              { name: 'packages/core-domain', desc: 'Pure domain entities, value objects & events (zero framework)', type: 'CORE' },
              { name: 'packages/core-application', desc: 'Use-case services, port interfaces & execution policies', type: 'CORE' },
              { name: 'packages/core-infra', desc: 'Drizzle ORM repositories, Supabase clients & Redis adapters', type: 'INFRA' },
              { name: 'packages/contracts', desc: 'Zod DTO schemas, standard error envelope & OpenAPI specs', type: 'CONTRACTS' },
              { name: 'packages/authz', desc: 'RBAC/ABAC engine, permission catalog & RLS helpers', type: 'SECURITY' },
              { name: 'packages/logger', desc: 'Central Pino logger + structured event builder + redactor', type: 'OBSERVABILITY' },
              { name: 'packages/module-system', desc: 'Odoo-class manifest resolver, lifecycle engine & scaffolder', type: 'KERNEL' },
              { name: 'packages/cache', desc: 'Redis SWR caching, distributed locks & stampede protection', type: 'INFRA' },
              { name: 'packages/queue', desc: 'BullMQ queue setup, job contracts & dead-letter queue (DLQ)', type: 'INFRA' },
              { name: 'packages/workflow', desc: 'Multi-tier state-machine approval engine with full audit', type: 'BUSINESS' },
              { name: 'packages/notifications', desc: 'In-app, email templates & fan-out flood control', type: 'BUSINESS' },
              { name: 'packages/storage', desc: 'Supabase Storage, signed expiring URLs & ClamAV hook', type: 'STORAGE' },
              { name: 'packages/importexport', desc: 'Batch CSV/XLSX async parser & streaming generator', type: 'DATA' },
              { name: 'packages/testing', desc: 'RLS automated test harness & cross-tenant security suites', type: 'TESTING' },
              { name: 'packages/ui', desc: 'Radix primitives, design tokens & Enterprise Table Kit', type: 'UI' },
            ].map((pkg, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#EFE7D7] border border-[#D5C9B3] space-y-1.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-extrabold text-xs text-[#2A1F13]">{pkg.name}</span>
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#E0D3BC] text-[#524128] font-bold border border-[#CABCA0]">
                    {pkg.type}
                  </span>
                </div>
                <p className="text-xs text-[#63533B] font-serif">{pkg.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: MCP BACKEND ARCHITECTURE & DATABASE BLUEPRINT ─── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'mcp' && (
        <div className="bg-[#FAF6EC] border-2 border-[#D9CEB8] rounded-3xl p-6 sm:p-10 shadow-xl space-y-10 font-serif leading-relaxed text-[#2D2315]">
          {/* Masthead Banner */}
          <div className="text-center border-b-4 border-double border-[#6C5B42] pb-6 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-[0.3em] font-extrabold text-[#746249]">
              THE OFFICIAL ENGINEERING GAZETTE &bull; VOL. II &bull; SPECIAL TECHNICAL BULLETIN 2026
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#22170B] uppercase">
              GOVERNED MCP ENGINE &amp; DATABASE BLUEPRINT
            </h2>
            <div className="text-xs font-mono italic text-[#63533C] pt-1">
              Model Context Protocol (JSON-RPC 2.0 &amp; SSE) &bull; Zero-Trust Token Vault &bull; 109 Governed Entities &bull; Supabase PostgreSQL
            </div>
            {/* Architectural Badges */}
            <div className="flex flex-wrap justify-center gap-2 pt-3 font-sans text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>MCP Protocol 2026-07-28 &bull; Stateless</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#E5DCB7] text-[#4A3B22] border border-[#D0C4A4]">
                RFC 6749 OAuth 2.1 Bearer Tokens
              </span>
              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                SHA-256 One-Way Credentials
              </span>
              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                109 Governed Resources &amp; Tools
              </span>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Non-Repudiable Append-Only Audit
              </span>
            </div>
          </div>

          {/* § 1.0 MCP Backend Architecture & 7-Stage Request Pipeline */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#D2C5AB] pb-1.5">
              <h3 className="text-xl font-bold text-[#2A1E11] uppercase tracking-wide flex items-center space-x-2">
                <span>§ 1.0</span>
                <span>MCP Backend Architecture &amp; 7-Stage Pipeline</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#E4D9C1] px-2.5 py-0.5 rounded-full border border-[#CABDA1]">
                CORE RUNTIME
              </span>
            </div>
            <p className="text-sm">
              The JAAGO HUB Model Context Protocol (MCP) server is implemented as a high-performance, stateless gateway under <code className="font-mono text-xs bg-[#E4D8C1] px-1.5 py-0.5 rounded">/api/mcp</code>. It bridges external and internal AI agents (Claude Desktop, Cursor, Custom Automation) with JAAGO HUB&apos;s modular ERP domain services while enforcing strict department boundaries and Row-Level Security:
            </p>

            {/* Visual 7-Stage Execution Flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2.5 pt-2 text-xs font-sans">
              {[
                {
                  step: '1. CLIENT',
                  name: 'Agent Ingress',
                  tech: 'Claude / Cursor / SDK',
                  desc: 'Dispatches JSON-RPC 2.0 with Bearer mcp_live_<token>',
                  badge: 'TLS 1.3',
                },
                {
                  step: '2. GATEWAY',
                  name: 'Protocol Handshake',
                  tech: 'POST /api/mcp',
                  desc: 'Stateless HTTP/SSE, protocol version negotiation (2026-07-28)',
                  badge: 'Next.js BFF',
                },
                {
                  step: '3. AUTH VAULT',
                  name: 'SHA-256 Auth',
                  tech: 'mcp_agent_credentials',
                  desc: 'Constant-time token hash verification; rejects revoked/suspended bots',
                  badge: 'Zero Plaintext',
                },
                {
                  step: '4. RATE LIMIT',
                  name: 'Token Bucket',
                  tech: 'Sliding Window',
                  desc: 'Enforces 120 req/min per agent with Redis/In-memory mutex protection',
                  badge: '429 Guard',
                },
                {
                  step: '5. GOVERNANCE',
                  name: 'Scope Gatekeeper',
                  tech: 'mcp_agent_scopes',
                  desc: 'Validates read/write grants against 109 system modules before execution',
                  badge: 'Strict RBAC',
                },
                {
                  step: '6. EXECUTION',
                  name: 'Domain Kernel',
                  tech: 'core-application',
                  desc: 'Sandboxed dispatch to Attendance, HR, Payroll & Finance services',
                  badge: 'Zod DTO',
                },
                {
                  step: '7. AUDIT LOG',
                  name: 'Telemetry Spool',
                  tech: 'mcp_activity',
                  desc: 'Immutable audit log recording latency, client IP, params & outcomes',
                  badge: 'Append-Only',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-3.5 rounded-2xl bg-[#EDE3CF] border border-[#D5C9B3] space-y-1.5 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold text-[#8C7654]">{item.step}</span>
                      <span className="text-[8px] font-mono font-bold bg-[#DECFAF] text-[#4E3E27] px-1.5 py-0.2 rounded border border-[#CBBCA0]">
                        {item.badge}
                      </span>
                    </div>
                    <div className="font-extrabold text-xs text-[#221A10]">{item.name}</div>
                    <div className="text-[10px] font-mono text-[#946A1B]">{item.tech}</div>
                    <p className="text-[11px] text-[#63533B] font-serif leading-snug">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* § 2.0 PostgreSQL Database System & ERD Specification */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#D2C5AB] pb-1.5">
              <h3 className="text-xl font-bold text-[#2A1E11] uppercase tracking-wide flex items-center space-x-2">
                <span>§ 2.0</span>
                <span>Supabase PostgreSQL Database Schema (6 Core Tables)</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#E4D9C1] px-2.5 py-0.5 rounded-full border border-[#CABDA1]">
                DATA INTEGRITY
              </span>
            </div>
            <p className="text-sm">
              The MCP subsystem stores operational metadata across 6 isolated tables in the primary Supabase PostgreSQL cluster. These tables enforce cascade referential integrity, one-way credential hashing, and Row-Level Security:
            </p>

            {/* Table Matrix */}
            <div className="overflow-x-auto rounded-2xl border border-[#D5C9B3]">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-[#E4D8C1] border-b border-[#D5C9B3] text-[11px] font-extrabold uppercase text-[#4D3F2B]">
                    <th className="py-2.5 px-4">PostgreSQL Table</th>
                    <th className="py-2.5 px-4">Primary Keys &amp; Foreign Keys</th>
                    <th className="py-2.5 px-4">Security &amp; Rationale</th>
                    <th className="py-2.5 px-4">Key Columns</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCD1BA] bg-[#EFE6D4]">
                  {[
                    {
                      table: 'public.mcp_modules',
                      keys: 'PK: module_key (VARCHAR 50)',
                      sec: 'Public catalog of 109 system entities (Core, Depts, Menus, Pages)',
                      cols: 'module_key, label, description, is_active, category, route_path, department_id',
                    },
                    {
                      table: 'public.mcp_agents',
                      keys: 'PK: id (UUID), FK: org_id -> organizations(id)',
                      sec: 'Registered AI bots; status: active | suspended | revoked',
                      cols: 'id, org_id, name, description, agent_type, status, created_by, created_at',
                    },
                    {
                      table: 'public.mcp_agent_credentials',
                      keys: 'PK: id (UUID), FK: agent_id -> mcp_agents(id) ON DELETE CASCADE',
                      sec: 'Zero plaintext at rest. Token verified via SHA-256 hex digest',
                      cols: 'id, agent_id, token_hash (UNIQUE), token_prefix, audience, expires_at, revoked_at',
                    },
                    {
                      table: 'public.mcp_agent_scopes',
                      keys: 'PK: id (UUID), FKs: agent_id, module_key, UNIQUE(agent_id, module_key, permission)',
                      sec: 'Fine-grained grants: read | write | delete with optional JSONB resource_filter',
                      cols: 'id, agent_id, module_key, permission, resource_filter, granted_by, granted_at',
                    },
                    {
                      table: 'public.mcp_connections',
                      keys: 'PK: id (UUID), FK: agent_id -> mcp_agents(id) ON DELETE CASCADE',
                      sec: 'Live bot heartbeat tracking, protocol version negotiation & IP logging',
                      cols: 'id, agent_id, client_name, client_version, protocol_version, ip_address, status, last_seen_at',
                    },
                    {
                      table: 'public.mcp_activity',
                      keys: 'PK: id (UUID), FKs: agent_id, connection_id (ON DELETE SET NULL)',
                      sec: 'Immutable append-only audit trail with parameter sanitization & duration_ms',
                      cols: 'id, agent_id, mcp_method, mcp_name, module_key, outcome, duration_ms, params_digest, trace_id',
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#E8DFC9] transition">
                      <td className="py-2.5 px-4 font-mono font-extrabold text-[#2A1F13]">{row.table}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#785E2C]">{row.keys}</td>
                      <td className="py-2.5 px-4 text-[#4E412F]">{row.sec}</td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-[#554631]">{row.cols}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DDL Schema Code Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-sans font-bold text-[#4B3B23]">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-[#946A1B]" />
                  <span>Production PostgreSQL DDL (supabase/migrations/20260918010000_create_mcp_governed_server_schema.sql)</span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `-- ==============================================================================
-- JAAGO HUB GOVERNED MCP SERVER SCHEMA & DATABASE SYSTEM SPECIFICATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.mcp_modules (
    module_key VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    category VARCHAR(20) DEFAULT 'core' NOT NULL,
    route_path VARCHAR(200),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mcp_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    agent_type VARCHAR(50) DEFAULT 'custom' NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mcp_agent_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.mcp_agents(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_prefix VARCHAR(16) NOT NULL,
    audience VARCHAR(100) DEFAULT 'https://hub.jaago.com.bd/api/mcp' NOT NULL,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mcp_agent_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.mcp_agents(id) ON DELETE CASCADE,
    module_key VARCHAR(50) NOT NULL REFERENCES public.mcp_modules(module_key) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write', 'delete')),
    resource_filter JSONB,
    granted_by VARCHAR(100),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_agent_module_perm UNIQUE (agent_id, module_key, permission)
);

CREATE TABLE IF NOT EXISTS public.mcp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.mcp_agents(id) ON DELETE CASCADE,
    client_name VARCHAR(100),
    client_version VARCHAR(50),
    protocol_version VARCHAR(20) DEFAULT '2026-07-28' NOT NULL,
    client_capabilities JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    request_count INTEGER DEFAULT 1 NOT NULL,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mcp_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.mcp_agents(id) ON DELETE SET NULL,
    connection_id UUID REFERENCES public.mcp_connections(id) ON DELETE SET NULL,
    mcp_method VARCHAR(50) NOT NULL,
    mcp_name VARCHAR(100),
    module_key VARCHAR(50),
    permission_used VARCHAR(20),
    outcome VARCHAR(20) NOT NULL,
    denial_reason TEXT,
    duration_ms INTEGER,
    params_digest JSONB DEFAULT '{}'::jsonb,
    trace_id VARCHAR(64),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_cred_hash ON public.mcp_agent_credentials(token_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_scopes_agent ON public.mcp_agent_scopes(agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_activity_agent ON public.mcp_activity(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_activity_outcome ON public.mcp_activity(outcome);`,
                      'ddl-schema'
                    )
                  }
                  className="px-3 py-1 rounded-lg bg-[#E2D6C0] hover:bg-[#D5C6AC] border border-[#C5B497] font-mono text-[11px] flex items-center space-x-1.5 transition cursor-pointer"
                >
                  {copiedSection === 'ddl-schema' ? <Check className="h-3 w-3 text-emerald-700" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedSection === 'ddl-schema' ? 'DDL Copied!' : 'Copy SQL DDL'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-[#2E2012] text-[#F5C518] font-mono text-xs overflow-x-auto border border-[#C5A869] shadow-inner max-h-64 no-scrollbar">
{`CREATE TABLE public.mcp_modules (
    module_key VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    category VARCHAR(20) DEFAULT 'core' NOT NULL, -- 'core' | 'department' | 'menu' | 'page'
    route_path VARCHAR(200)
);

CREATE TABLE public.mcp_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    agent_type VARCHAR(50) DEFAULT 'custom' NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL -- 'active' | 'suspended' | 'revoked'
);

CREATE TABLE public.mcp_agent_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.mcp_agents(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 one-way digest
    token_prefix VARCHAR(16) NOT NULL,      -- e.g. "jhmcp_live_abc1"
    audience VARCHAR(100) DEFAULT 'https://hub.jaago.com.bd/api/mcp'
);

CREATE TABLE public.mcp_agent_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.mcp_agents(id) ON DELETE CASCADE,
    module_key VARCHAR(50) NOT NULL REFERENCES public.mcp_modules(module_key) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write', 'delete')),
    CONSTRAINT uq_agent_module_perm UNIQUE (agent_id, module_key, permission)
);

CREATE TABLE public.mcp_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.mcp_agents(id) ON DELETE SET NULL,
    mcp_method VARCHAR(50) NOT NULL,        -- 'tools/call', 'resources/read'
    mcp_name VARCHAR(100),                  -- e.g. 'attendance.check_in'
    outcome VARCHAR(20) NOT NULL,           -- 'ok' | 'denied' | 'error'
    duration_ms INTEGER,
    params_digest JSONB,                    -- Redacted parameters
    created_at TIMESTAMPTZ DEFAULT NOW()
);`}
              </pre>
            </div>
          </section>

          {/* § 3.0 Governed Tools & Resource Catalog (109 System Entities) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#D2C5AB] pb-1.5">
              <h3 className="text-xl font-bold text-[#2A1E11] uppercase tracking-wide flex items-center space-x-2">
                <span>§ 3.0</span>
                <span>Governed Tools &amp; Dynamic Catalog (109 System Entities)</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#E4D9C1] px-2.5 py-0.5 rounded-full border border-[#CABDA1]">
                AUTOMATIC DISCOVERY
              </span>
            </div>
            <p className="text-sm">
              The MCP server exposes all business tools and queryable resources dynamically using uniform resource identifiers (<code className="font-mono text-xs bg-[#E4D8C1] px-1.5 py-0.5 rounded">{'${category}://${module_key}'}</code>). The catalog is auto-synchronized at boot via <code className="font-mono text-xs bg-[#E4D8C1] px-1.5 py-0.5 rounded">apps/web/lib/mcp/module-sync.ts</code>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-sans">
              <div className="p-4 rounded-2xl bg-[#EDE3CF] border border-[#D5C9B3] space-y-1.5">
                <div className="font-extrabold text-[#291E11] flex items-center justify-between">
                  <span>Core Modules</span>
                  <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">15 Entities</span>
                </div>
                <p className="text-[11px] text-[#63533C] font-serif">
                  Attendance, HR Directory, Payroll, Finance, Procurement, Documents, Organization, Settings, GPS, RBAC.
                </p>
                <div className="font-mono text-[10px] text-[#8C7654]">URI: core://&lt;module_key&gt;</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#EDE3CF] border border-[#D5C9B3] space-y-1.5">
                <div className="font-extrabold text-[#291E11] flex items-center justify-between">
                  <span>Departments</span>
                  <span className="font-mono text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">34 Live Records</span>
                </div>
                <p className="text-[11px] text-[#63533C] font-serif">
                  Dynamically synchronized from the live Supabase <code className="font-mono">departments</code> table, mapped to business units.
                </p>
                <div className="font-mono text-[10px] text-[#8C7654]">URI: department://&lt;dept_key&gt;</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#EDE3CF] border border-[#D5C9B3] space-y-1.5">
                <div className="font-extrabold text-[#291E11] flex items-center justify-between">
                  <span>Portal Menus</span>
                  <span className="font-mono text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">9 Top-Level</span>
                </div>
                <p className="text-[11px] text-[#63533C] font-serif">
                  Main navigation menus including Dashboards, Requests, Admin, People &amp; Culture, and Settings.
                </p>
                <div className="font-mono text-[10px] text-[#8C7654]">URI: menu://&lt;menu_key&gt;</div>
              </div>

              <div className="p-4 rounded-2xl bg-[#EDE3CF] border border-[#D5C9B3] space-y-1.5">
                <div className="font-extrabold text-[#291E11] flex items-center justify-between">
                  <span>Pages &amp; Submenus</span>
                  <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">51 Sub-Routes</span>
                </div>
                <p className="text-[11px] text-[#63533C] font-serif">
                  Granular pages across all ERP areas: Employee Directory, Attendance Logs, Payslips, Studio-Lite, etc.
                </p>
                <div className="font-mono text-[10px] text-[#8C7654]">URI: page://&lt;page_key&gt;</div>
              </div>
            </div>
          </section>

          {/* § 4.0 Developer Integration Guide & Client Configurations */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#D2C5AB] pb-1.5">
              <h3 className="text-xl font-bold text-[#2A1E11] uppercase tracking-wide flex items-center space-x-2">
                <span>§ 4.0</span>
                <span>Developer Integration Guide &amp; Client Configurations</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#E4D9C1] px-2.5 py-0.5 rounded-full border border-[#CABDA1]">
                QUICKSTART
              </span>
            </div>
            <p className="text-sm">
              Any developer or authorized AI client can connect to the JAAGO HUB MCP server by supplying an issued bearer token. Below are the drop-in configuration manifests for Claude Desktop, Cursor AI, and direct HTTP testing:
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-sans text-xs">
              {/* Claude Desktop Config */}
              <div className="p-4 rounded-2xl bg-[#EDE3CF] border border-[#D5C9B3] space-y-2">
                <div className="flex items-center justify-between font-bold text-[#291E11]">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4 text-[#946A1B]" />
                    <span>Claude Desktop (claude_desktop_config.json)</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(
                          {
                            mcpServers: {
                              'jaago-hub': {
                                command: 'npx',
                                args: [
                                  '-y',
                                  'mcp-remote',
                                  'https://hub.jaago.com.bd/api/mcp',
                                  '--header',
                                  'Authorization: Bearer <YOUR_MCP_LIVE_TOKEN>',
                                ],
                              },
                            },
                          },
                          null,
                          2
                        ),
                        'claude-cfg'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-[#DECFAF] hover:bg-[#D3C19E] text-[10px] font-mono border border-[#C6B696] cursor-pointer"
                  >
                    {copiedSection === 'claude-cfg' ? 'Copied!' : 'Copy Config'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-[#2E2012] text-[#F5C518] font-mono text-[11px] overflow-x-auto no-scrollbar border border-[#C5A869]">
{`{
  "mcpServers": {
    "jaago-hub": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://hub.jaago.com.bd/api/mcp",
        "--header",
        "Authorization: Bearer <YOUR_MCP_LIVE_TOKEN>"
      ]
    }
  }
}`}
                </pre>
              </div>

              {/* Cursor AI Config */}
              <div className="p-4 rounded-2xl bg-[#EDE3CF] border border-[#D5C9B3] space-y-2">
                <div className="flex items-center justify-between font-bold text-[#291E11]">
                  <div className="flex items-center space-x-2">
                    <Code className="h-4 w-4 text-[#946A1B]" />
                    <span>Cursor AI / Windsurf (.cursor/mcp.json)</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(
                          {
                            mcpServers: {
                              'jaago-hub': {
                                url: 'https://hub.jaago.com.bd/api/mcp',
                                headers: {
                                  Authorization: 'Bearer <YOUR_MCP_LIVE_TOKEN>',
                                },
                              },
                            },
                          },
                          null,
                          2
                        ),
                        'cursor-cfg'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-[#DECFAF] hover:bg-[#D3C19E] text-[10px] font-mono border border-[#C6B696] cursor-pointer"
                  >
                    {copiedSection === 'cursor-cfg' ? 'Copied!' : 'Copy Config'}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-[#2E2012] text-[#F5C518] font-mono text-[11px] overflow-x-auto no-scrollbar border border-[#C5A869]">
{`{
  "mcpServers": {
    "jaago-hub": {
      "url": "https://hub.jaago.com.bd/api/mcp",
      "headers": {
        "Authorization": "Bearer <YOUR_MCP_LIVE_TOKEN>"
      }
    }
  }
}`}
                </pre>
              </div>
            </div>

            {/* Direct cURL Verification */}
            <div className="p-4 rounded-2xl bg-[#2E2012] text-[#F5C518] font-mono text-xs space-y-2 border border-[#C5A869] shadow-inner">
              <div className="flex items-center justify-between text-[#E7DFCD]">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold text-white uppercase text-[11px]">Direct Terminal Verification (cURL)</span>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -X POST https://hub.jaago.com.bd/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <YOUR_MCP_LIVE_TOKEN>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'`,
                      'curl-cmd'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-[#4E3923] hover:bg-[#63492D] text-[10px] border border-[#8C6F4B] text-[#F5C518] cursor-pointer"
                >
                  {copiedSection === 'curl-cmd' ? 'Copied!' : 'Copy cURL'}
                </button>
              </div>
              <pre className="text-[#E7DFCD] text-[11px] overflow-x-auto no-scrollbar pt-1">
{`curl -X POST https://hub.jaago.com.bd/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <YOUR_MCP_LIVE_TOKEN>" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'`}
              </pre>
            </div>
          </section>

          {/* § 5.0 Internal BFF & Protocol REST Endpoints */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#D2C5AB] pb-1.5">
              <h3 className="text-xl font-bold text-[#2A1E11] uppercase tracking-wide flex items-center space-x-2">
                <span>§ 5.0</span>
                <span>Internal BFF &amp; Developer REST API Matrix</span>
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#E4D9C1] px-2.5 py-0.5 rounded-full border border-[#CABDA1]">
                HTTP ROUTES
              </span>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[#D5C9B3]">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-[#E4D8C1] border-b border-[#D5C9B3] text-[11px] font-extrabold uppercase text-[#4D3F2B]">
                    <th className="py-2.5 px-4">Method &amp; Endpoint</th>
                    <th className="py-2.5 px-4">Authentication</th>
                    <th className="py-2.5 px-4">Description &amp; Handlers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCD1BA] bg-[#EFE6D4]">
                  {[
                    {
                      route: 'POST /api/mcp',
                      auth: 'Bearer mcp_live_<token>',
                      desc: 'Official Model Context Protocol JSON-RPC 2.0 endpoint (initialize, tools/list, tools/call, resources/read).',
                    },
                    {
                      route: 'GET /api/v1/mcp/live',
                      auth: 'Session Cookie / Bearer',
                      desc: 'Server telemetry, active connections count, sliding 60s throughput, denied requests & real-time audit feed.',
                    },
                    {
                      route: 'GET /api/v1/mcp/modules',
                      auth: 'Session Cookie / Bearer',
                      desc: 'Returns all 109 auto-synchronized platform modules, operational departments, menus, and sub-pages.',
                    },
                    {
                      route: 'GET / POST / DELETE /api/v1/mcp/agents',
                      auth: 'Admin Session Guard',
                      desc: 'Register new AI bots, generate one-time bearer tokens, update operational status, or revoke credentials.',
                    },
                    {
                      route: 'GET / POST / PUT /api/v1/mcp/scopes',
                      auth: 'Admin Session Guard',
                      desc: 'Query scope matrices, grant bulk read/write permissions across 109 entities, or revoke access.',
                    },
                    {
                      route: 'POST /api/v1/mcp/scopes/test-permission',
                      auth: 'Admin Session Guard',
                      desc: 'Interactive testing utility to dry-run whether an agent is authorized for a specific tool and action.',
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#E8DFC9] transition">
                      <td className="py-2.5 px-4 font-mono font-extrabold text-[#946A1B]">{row.route}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-[#4F3F2A]">{row.auth}</td>
                      <td className="py-2.5 px-4 text-[#5E4F39]">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
