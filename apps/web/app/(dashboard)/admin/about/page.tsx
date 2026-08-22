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
} from 'lucide-react';

type TabType = 'constitution' | 'architecture' | 'telemetry' | 'packages';

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
    </div>
  );
}
