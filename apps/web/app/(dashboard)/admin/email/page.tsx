'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Server,
  FileCode,
  History,
  ShieldCheck,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Send,
  Lock,
  Search,
  Filter,
  Check,
} from 'lucide-react';

interface EmailServer {
  id: string;
  name: string;
  isEnabled: boolean;
  priority: number;
  senderEmail: string;
  senderName: string;
  host: string;
  port: number;
  encryption: 'starttls' | 'ssl_tls' | 'none';
  username: string;
  hasPassword?: boolean;
  minIntervalSeconds: number;
  maxPerHour: number;
  maxPerDay: number;
  replyTo?: string;
  healthState: 'healthy' | 'degraded' | 'down';
  consecutiveFailures: number;
  lastVerifiedAt?: string;
  lastUsedAt?: string;
  lastErrorMessage?: string;
}

interface EmailTemplate {
  id: string;
  templateKey: string;
  name: string;
  module: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variablesSchema: Array<{ key: string; name: string; description: string; required: boolean; sample: string }>;
  isActive: boolean;
  version: number;
  updatedAt: string;
}

interface EmailLog {
  id: string;
  templateKey?: string;
  serverId?: string;
  serverName?: string;
  toAddress: string;
  ccAddress?: string;
  fromAddress: string;
  subjectRendered: string;
  bodyRendered?: string;
  variablesUsed?: Record<string, unknown>;
  module: string;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'deferred' | 'bounced';
  errorReason?: string;
  attemptCount: number;
  providerMessageId?: string;
  traceId?: string;
  queuedAt: string;
  completedAt?: string;
}

export default function AdminEmailSettingsPage() {
  const [activeTab, setActiveTab] = useState<'servers' | 'templates' | 'logs' | 'deliverability'>('servers');
  const [loading, setLoading] = useState(true);

  // ── Servers State ──
  const [servers, setServers] = useState<EmailServer[]>([]);
  const [editingServer, setEditingServer] = useState<Partial<EmailServer> | null>(null);
  const [serverPassword, setServerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [verifyingServerId, setVerifyingServerId] = useState<string | null>(null);
  const [testSendModalServer, setTestSendModalServer] = useState<EmailServer | null>(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testSending, setTestSending] = useState(false);

  // ── Templates State ──
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [renderedPreview, setRenderedPreview] = useState<{ subject: string; html: string; text: string } | null>(null);

  // ── Logs State ──
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logMetrics, setLogMetrics] = useState({ total: 0, sent: 0, failed: 0 });
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logModuleFilter, setLogModuleFilter] = useState('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<EmailLog | null>(null);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // ── Feedback Notifications ──
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [srvRes, tmplRes, logsRes] = await Promise.all([
        fetch('/api/v1/admin/email/servers'),
        fetch('/api/v1/admin/email/templates'),
        fetch(`/api/v1/admin/email/logs?status=${logStatusFilter}&module=${logModuleFilter}&search=${encodeURIComponent(logSearchQuery)}`),
      ]);

      if (srvRes.ok) {
        const srvData = await srvRes.json();
        setServers(srvData.data || []);
      }
      if (tmplRes.ok) {
        const tmplData = await tmplRes.json();
        setTemplates(tmplData.data || []);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.data || []);
        if (logsData.metrics) setLogMetrics(logsData.metrics);
      }
    } catch {
      showToast('Failed to load email subsystem data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [logStatusFilter, logModuleFilter, logSearchQuery]);

  // ── Server Handlers ──
  const handleSaveServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingServer?.name || !editingServer?.host || !editingServer?.username) {
      showToast('Please fill in Server Name, Host, and Username', 'error');
      return;
    }

    try {
      const isNew = !editingServer.id;
      const url = isNew ? '/api/v1/admin/email/servers' : `/api/v1/admin/email/servers/${editingServer.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const payload = {
        ...editingServer,
        password: serverPassword.trim() !== '' ? serverPassword : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save SMTP server');
      }

      showToast(data.message || 'SMTP server configured successfully!');
      setServerModalOpen(false);
      setEditingServer(null);
      setServerPassword('');
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleVerifyServer = async (serverId: string) => {
    setVerifyingServerId(serverId);
    try {
      const res = await fetch(`/api/v1/admin/email/servers/${serverId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Connection verified successfully!', 'success');
      } else {
        showToast(data.message || data.error || 'Verification failed', 'error');
      }
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Verification error', 'error');
    } finally {
      setVerifyingServerId(null);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testSendModalServer || !testEmailRecipient) return;
    setTestSending(true);
    try {
      const res = await fetch(`/api/v1/admin/email/servers/${testSendModalServer.id}/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailRecipient }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Test email dispatched successfully!', 'success');
        setTestSendModalServer(null);
        setTestEmailRecipient('');
      } else {
        showToast(data.error || 'Failed to send test email', 'error');
      }
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setTestSending(false);
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SMTP server?')) return;
    try {
      const res = await fetch(`/api/v1/admin/email/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Server configuration deleted.');
        fetchData();
      }
    } catch {
      showToast('Failed to delete server', 'error');
    }
  };

  // ── Template Handlers ──
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate?.templateKey || !editingTemplate?.name || !editingTemplate?.subject || !editingTemplate?.bodyHtml) {
      showToast('Please fill all required template fields.', 'error');
      return;
    }

    try {
      const isNew = !editingTemplate.id;
      const url = isNew ? '/api/v1/admin/email/templates' : `/api/v1/admin/email/templates/${editingTemplate.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save template');
      }

      showToast('Template saved successfully!');
      setTemplateModalOpen(false);
      setEditingTemplate(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenPreview = async (template: EmailTemplate) => {
    setPreviewTemplate(template);
    const initialVars: Record<string, string> = {};
    template.variablesSchema.forEach((v) => {
      initialVars[v.key] = v.sample || `[${v.name}]`;
    });
    setPreviewVariables(initialVars);

    try {
      const res = await fetch('/api/v1/admin/email/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: template.templateKey,
          variables: initialVars,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRenderedPreview({
          subject: data.data.renderedSubject,
          html: data.data.renderedHtml,
          text: data.data.renderedText,
        });
      }
    } catch {}
  };

  const handleRefreshPreview = async () => {
    if (!previewTemplate) return;
    try {
      const res = await fetch('/api/v1/admin/email/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: previewTemplate.templateKey,
          variables: previewVariables,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRenderedPreview({
          subject: data.data.renderedSubject,
          html: data.data.renderedHtml,
          text: data.data.renderedText,
        });
      }
    } catch {}
  };

  // ── Log Retry Handler ──
  const handleRetryLog = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await fetch(`/api/v1/admin/email/logs/${logId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Email successfully re-sent!');
      } else {
        showToast(data.message || 'Retry attempt failed', 'error');
      }
      fetchData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRetryingLogId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
              : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="border-b border-border/60 bg-surface/50 backdrop-blur-md px-6 py-6 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Mail className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Email / SMTP Module</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Admin Settings
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Centralised outbound SMTP infrastructure, priority failover routing, custom templates, and transmission audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface border border-border hover:bg-surface-hover transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {activeTab === 'servers' && (
              <button
                onClick={() => {
                  setEditingServer({
                    name: '',
                    senderEmail: 'noreply@jaago.com.bd',
                    senderName: 'JAAGO HUB',
                    host: 'smtp-relay.brevo.com',
                    port: 587,
                    encryption: 'starttls',
                    username: '',
                    minIntervalSeconds: 0,
                    maxPerHour: 500,
                    maxPerDay: 5000,
                    isEnabled: true,
                    priority: servers.length + 1,
                  });
                  setServerPassword('');
                  setServerModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add SMTP Server
              </button>
            )}

            {activeTab === 'templates' && (
              <button
                onClick={() => {
                  setEditingTemplate({
                    templateKey: '',
                    name: '',
                    module: 'general',
                    subject: '',
                    bodyHtml: '',
                    bodyText: '',
                    variablesSchema: [],
                    isActive: true,
                  });
                  setTemplateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Email Template
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-6 flex gap-2 border-b border-border/40 pb-px overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('servers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'servers'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Server className="w-4 h-4" />
            SMTP Servers &amp; Failover ({servers.length})
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'templates'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Email Templates ({templates.length})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            Transmission Logs
            {logMetrics.failed > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black">
                {logMetrics.failed} failed
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('deliverability')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'deliverability'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Deliverability &amp; DMARC
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-6">
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: SMTP SERVERS & PRIORITY ─────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'servers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-surface border border-border/70 space-y-1">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">Active SMTP Endpoints</span>
                <p className="text-2xl font-black text-foreground">{servers.filter((s) => s.isEnabled).length} / {servers.length}</p>
                <p className="text-[11px] text-muted-foreground">Failover ordered by priority ascending (1 = Primary)</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border/70 space-y-1">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">Primary Transport</span>
                <p className="text-lg font-bold text-amber-400 truncate">{servers[0]?.name || 'None Configured'}</p>
                <p className="text-[11px] text-muted-foreground">{servers[0] ? `${servers[0].host}:${servers[0].port} (${servers[0].encryption})` : 'Add an SMTP server to begin'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border/70 space-y-1">
                <span className="text-[11px] font-bold uppercase text-muted-foreground">Security &amp; Encryption</span>
                <p className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> AES-256-GCM
                </p>
                <p className="text-[11px] text-muted-foreground">Passwords write-only &amp; encrypted at rest with rotation key</p>
              </div>
            </div>

            {/* Servers List Table */}
            <div className="rounded-2xl border border-border/70 bg-surface overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-border/60 bg-surface-hover/30 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Configured Outbound SMTP Relays
                </span>
                <span className="text-xs text-muted-foreground">
                  {servers.length} server{servers.length === 1 ? '' : 's'} registered
                </span>
              </div>

              {servers.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Server className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
                  <p className="text-sm text-muted-foreground font-medium">No SMTP servers configured yet.</p>
                  <button
                    onClick={() => {
                      setEditingServer({
                        name: 'Brevo SMTP Primary',
                        senderEmail: 'noreply@jaago.com.bd',
                        senderName: 'JAAGO HUB',
                        host: 'smtp-relay.brevo.com',
                        port: 587,
                        encryption: 'starttls',
                        username: '',
                        isEnabled: true,
                        priority: 1,
                      });
                      setServerModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Configure Primary SMTP
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {servers.map((server, idx) => (
                    <div key={server.id} className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-surface-hover/20 transition">
                      <div className="flex items-start gap-3.5">
                        <div className="flex flex-col items-center justify-center w-8 h-8 rounded-xl bg-surface-hover border border-border/80 font-black text-xs text-amber-400">
                          #{server.priority}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-black text-foreground">{server.name}</span>
                            {idx === 0 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Primary
                              </span>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                server.healthState === 'healthy'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : server.healthState === 'degraded'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {server.healthState}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                server.isEnabled ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-slate-700/50 text-slate-400'
                              }`}
                            >
                              {server.isEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span><strong>Host:</strong> {server.host}:{server.port}</span>
                            <span><strong>Auth:</strong> {server.username}</span>
                            <span><strong>From:</strong> {server.senderName} &lt;{server.senderEmail}&gt;</span>
                            {server.minIntervalSeconds > 0 && <span><strong>Throttle:</strong> {server.minIntervalSeconds}s / user</span>}
                          </div>

                          {server.lastErrorMessage && (
                            <p className="text-[11px] text-rose-400 font-medium mt-1">
                              Last Error: {server.lastErrorMessage}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                        <button
                          onClick={() => handleVerifyServer(server.id)}
                          disabled={verifyingServerId === server.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-hover border border-border hover:bg-surface text-foreground transition cursor-pointer"
                          title="Verify SMTP connection handshake"
                        >
                          <Play className={`w-3 h-3 text-emerald-400 ${verifyingServerId === server.id ? 'animate-spin' : ''}`} />
                          Verify
                        </button>

                        <button
                          onClick={() => {
                            setTestSendModalServer(server);
                            setTestEmailRecipient('nasif.kamal@jaago.com.bd');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-hover border border-border hover:bg-surface text-foreground transition cursor-pointer"
                          title="Send a real test email"
                        >
                          <Send className="w-3 h-3 text-amber-400" />
                          Test Send
                        </button>

                        <button
                          onClick={() => {
                            setEditingServer(server);
                            setServerPassword('');
                            setServerModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-hover border border-border hover:bg-surface text-foreground transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-blue-400" />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteServer(server.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/40 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: EMAIL TEMPLATES ─────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="p-5 rounded-2xl bg-surface border border-border/70 hover:border-amber-500/50 transition space-y-3 flex flex-col justify-between shadow-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {template.module}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">v{template.version}</span>
                    </div>

                    <h3 className="text-sm font-black text-foreground">{template.name}</h3>
                    <p className="text-xs font-mono text-amber-400/90 truncate">{template.templateKey}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      <strong>Subject:</strong> {template.subject}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {template.variablesSchema.length} variable{template.variablesSchema.length === 1 ? '' : 's'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenPreview(template)}
                        className="p-1.5 rounded-lg bg-surface-hover hover:bg-surface border border-border text-foreground transition cursor-pointer"
                        title="Live Preview"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingTemplate(template);
                          setTemplateModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-surface-hover hover:bg-surface border border-border text-foreground transition cursor-pointer"
                        title="Edit Template"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── TAB 3: TRANSMISSION LOGS ────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="p-4 rounded-2xl bg-surface border border-border/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Search recipient, subject, error..."
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500 w-64"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={logStatusFilter}
                    onChange={(e) => setLogStatusFilter(e.target.value)}
                    className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Statuses ({logMetrics.total})</option>
                    <option value="sent">Sent ({logMetrics.sent})</option>
                    <option value="failed">Failed ({logMetrics.failed})</option>
                    <option value="queued">Queued</option>
                    <option value="deferred">Deferred</option>
                  </select>

                  <select
                    value={logModuleFilter}
                    onChange={(e) => setLogModuleFilter(e.target.value)}
                    className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">All Modules</option>
                    <option value="pnc">People &amp; Culture (HR)</option>
                    <option value="approvals">Approvals</option>
                    <option value="attendance">Attendance</option>
                    <option value="finance">Finance</option>
                    <option value="auth">Auth &amp; Security</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {logMetrics.sent} Sent
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  {logMetrics.failed} Failed
                </span>
              </div>
            </div>

            {/* Logs Table */}
            <div className="rounded-2xl border border-border/70 bg-surface overflow-hidden shadow-sm">
              {logs.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground space-y-2">
                  <History className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-sm font-medium">No email transmission logs matching criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-surface-hover/40 text-[11px] font-extrabold uppercase text-muted-foreground">
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Recipient</th>
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Template / Module</th>
                        <th className="py-3 px-4">Server Used</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-hover/20 transition">
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                                log.status === 'sent'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : log.status === 'failed'
                                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {log.status === 'sent' ? <Check className="w-3 h-3" /> : log.status === 'failed' ? <XCircle className="w-3 h-3" /> : null}
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-foreground max-w-[200px] truncate">{log.toAddress}</td>
                          <td className="py-3 px-4 text-muted-foreground max-w-[240px] truncate">{log.subjectRendered}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] text-amber-400/90">{log.templateKey || log.module}</span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{log.serverName || 'System Default'}</td>
                          <td className="py-3 px-4 text-[11px] text-muted-foreground whitespace-nowrap">
                            {new Date(log.queuedAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedLogDetail(log)}
                                className="p-1.5 rounded-lg bg-surface-hover hover:bg-surface text-foreground border border-border text-[11px] font-bold cursor-pointer"
                                title="View Details"
                              >
                                View
                              </button>
                              {log.status === 'failed' && (
                                <button
                                  onClick={() => handleRetryLog(log.id)}
                                  disabled={retryingLogId === log.id}
                                  className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-black hover:bg-amber-400 transition cursor-pointer flex items-center gap-1"
                                >
                                  <RefreshCw className={`w-3 h-3 ${retryingLogId === log.id ? 'animate-spin' : ''}`} />
                                  Retry
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── TAB 4: DELIVERABILITY & DMARC ───────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'deliverability' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-surface border border-border/70 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-foreground">DNS &amp; Email Authentication Standards (DMARC/DKIM/SPF)</h2>
                <p className="text-xs text-muted-foreground">
                  To ensure inbox placement across Gmail, Outlook, and corporate firewalls for <strong>@jaago.com.bd</strong>, configure these DNS records on your domain registrar:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-background border border-border space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-bold text-amber-400">1. SPF (Sender Policy Framework) — TXT Record</span>
                    <span className="text-[10px]">Host: @</span>
                  </div>
                  <p className="text-foreground select-all bg-surface p-2 rounded-lg border border-border/60">
                    v=spf1 include:spf.brevo.com include:_spf.google.com ~all
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-bold text-amber-400">2. DKIM (DomainKeys Identified Mail) — TXT Record</span>
                    <span className="text-[10px]">Host: mail._domainkey.jaago.com.bd</span>
                  </div>
                  <p className="text-foreground select-all bg-surface p-2 rounded-lg border border-border/60">
                    k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3JAAGO...
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-bold text-amber-400">3. DMARC Policy — TXT Record</span>
                    <span className="text-[10px]">Host: _dmarc.jaago.com.bd</span>
                  </div>
                  <p className="text-foreground select-all bg-surface p-2 rounded-lg border border-border/60">
                    v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@jaago.com.bd; pct=100; sp=quarantine
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: CREATE / EDIT SMTP SERVER ────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {serverModalOpen && editingServer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <form onSubmit={handleSaveServer}>
              <div className="px-6 py-5 border-b border-border/70 flex items-center justify-between bg-surface-hover/30">
                <div className="flex items-center gap-2.5">
                  <Server className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-black text-foreground">
                    {editingServer.id ? 'Edit SMTP Server' : 'Add New SMTP Relay'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setServerModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Server Name *</label>
                    <input
                      type="text"
                      required
                      value={editingServer.name || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, name: e.target.value })}
                      placeholder="e.g. Brevo Primary"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Priority (1 = Highest) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editingServer.priority || 1}
                      onChange={(e) => setEditingServer({ ...editingServer, priority: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Sender Email Address *</label>
                    <input
                      type="email"
                      required
                      value={editingServer.senderEmail || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, senderEmail: e.target.value })}
                      placeholder="noreply@jaago.com.bd"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Sender Display Name *</label>
                    <input
                      type="text"
                      required
                      value={editingServer.senderName || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, senderName: e.target.value })}
                      placeholder="JAAGO HUB v2.0"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-foreground">SMTP Host *</label>
                    <input
                      type="text"
                      required
                      value={editingServer.host || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, host: e.target.value })}
                      placeholder="smtp-relay.brevo.com"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Port *</label>
                    <input
                      type="number"
                      required
                      value={editingServer.port || 587}
                      onChange={(e) => setEditingServer({ ...editingServer, port: parseInt(e.target.value, 10) || 587 })}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Encryption Protocol</label>
                  <select
                    value={editingServer.encryption || 'starttls'}
                    onChange={(e) => setEditingServer({ ...editingServer, encryption: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                  >
                    <option value="starttls">STARTTLS (Port 587 — Recommended)</option>
                    <option value="ssl_tls">SSL / TLS (Port 465)</option>
                    <option value="none">None (Insecure / Internal Only)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">SMTP Username *</label>
                  <input
                    type="text"
                    required
                    value={editingServer.username || ''}
                    onChange={(e) => setEditingServer({ ...editingServer, username: e.target.value })}
                    placeholder="Username / API Key login"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      SMTP Password {editingServer.id && editingServer.hasPassword ? '(Leave blank to keep existing)' : '*'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {showPassword ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingServer.id || !editingServer.hasPassword}
                    value={serverPassword}
                    onChange={(e) => setServerPassword(e.target.value)}
                    placeholder={editingServer.id && editingServer.hasPassword ? '••••••••••••' : 'Enter SMTP password'}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Password is encrypted using AES-256-GCM at rest and write-only across API boundaries.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Throttle Interval (Seconds / Recipient)</label>
                    <input
                      type="number"
                      min={0}
                      value={editingServer.minIntervalSeconds || 0}
                      onChange={(e) => setEditingServer({ ...editingServer, minIntervalSeconds: parseInt(e.target.value, 10) || 0 })}
                      placeholder="0 (Disabled)"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Reply-To Address (Optional)</label>
                    <input
                      type="email"
                      value={editingServer.replyTo || ''}
                      onChange={(e) => setEditingServer({ ...editingServer, replyTo: e.target.value })}
                      placeholder="pnc@jaago.com.bd"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="serverEnabledCheck"
                    checked={editingServer.isEnabled ?? true}
                    onChange={(e) => setEditingServer({ ...editingServer, isEnabled: e.target.checked })}
                    className="rounded border-border text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="serverEnabledCheck" className="text-xs font-bold text-foreground cursor-pointer">
                    Enable this SMTP relay for active outbound transmission
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border/70 flex items-center justify-end gap-3 bg-surface-hover/30">
                <button
                  type="button"
                  onClick={() => setServerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-md cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: TEST SEND EMAIL ──────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {testSendModalServer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Send className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-black text-foreground">Send Test Email</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Verify live message delivery through <strong>{testSendModalServer.name}</strong> ({testSendModalServer.host}).
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Recipient Email Address *</label>
              <input
                type="email"
                required
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="your.email@jaago.com.bd"
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTestSendModalServer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={testSending || !testEmailRecipient}
                className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer flex items-center gap-1.5"
              >
                {testSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {testSending ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: TEMPLATE LIVE PREVIEW ────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {previewTemplate && renderedPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between bg-surface-hover/30">
              <div className="flex items-center gap-2.5">
                <Eye className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-black text-foreground">{previewTemplate.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{previewTemplate.templateKey}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto flex-1">
              {/* Variables Sidebar */}
              <div className="space-y-4 border-r border-border/50 pr-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-amber-400">Sample Variables</span>
                  <button
                    onClick={handleRefreshPreview}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Re-render
                  </button>
                </div>

                {previewTemplate.variablesSchema.map((v) => (
                  <div key={v.key} className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground">{v.name} ({v.key})</label>
                    <input
                      type="text"
                      value={previewVariables[v.key] || ''}
                      onChange={(e) => setPreviewVariables({ ...previewVariables, [v.key]: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
                    />
                  </div>
                ))}
              </div>

              {/* Rendered HTML Container */}
              <div className="md:col-span-2 space-y-3">
                <div className="p-3 rounded-xl bg-background border border-border text-xs">
                  <strong>Rendered Subject:</strong> <span className="text-amber-400 font-medium">{renderedPreview.subject}</span>
                </div>

                <div className="rounded-xl border border-border overflow-hidden bg-white text-slate-900 p-4 max-h-[480px] overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: renderedPreview.html }} />
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border/70 flex justify-end bg-surface-hover/30">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-5 py-1.5 rounded-xl text-xs font-bold bg-surface border border-border text-foreground hover:bg-surface-hover cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: LOG DETAIL ───────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-border/70 flex items-center justify-between bg-surface-hover/30">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-foreground">Email Transmission Audit Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-bold text-foreground">{selectedLogDetail.status.toUpperCase()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Attempt Count:</span>
                  <p className="font-bold text-foreground">{selectedLogDetail.attemptCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Recipient:</span>
                  <p className="font-bold text-foreground">{selectedLogDetail.toAddress}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sender / Transport:</span>
                  <p className="font-bold text-foreground">{selectedLogDetail.serverName || 'System Default'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Provider Message ID:</span>
                  <p className="font-mono text-muted-foreground">{selectedLogDetail.providerMessageId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Trace ID:</span>
                  <p className="font-mono text-muted-foreground">{selectedLogDetail.traceId || 'N/A'}</p>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground">Subject Rendered:</span>
                <p className="font-bold text-foreground bg-background p-2.5 rounded-lg border border-border mt-1">
                  {selectedLogDetail.subjectRendered}
                </p>
              </div>

              {selectedLogDetail.errorReason && (
                <div>
                  <span className="text-rose-400 font-bold">Failure Reason:</span>
                  <p className="font-mono text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30 mt-1">
                    {selectedLogDetail.errorReason}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-border/70 flex justify-between bg-surface-hover/30">
              {selectedLogDetail.status === 'failed' ? (
                <button
                  onClick={() => {
                    handleRetryLog(selectedLogDetail.id);
                    setSelectedLogDetail(null);
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  Retry Send Now
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-5 py-1.5 rounded-xl text-xs font-bold bg-surface border border-border text-foreground hover:bg-surface-hover cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL: CREATE / EDIT EMAIL TEMPLATE ─────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {templateModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <form onSubmit={handleSaveTemplate}>
              <div className="px-6 py-5 border-b border-border/70 flex items-center justify-between bg-surface-hover/30">
                <div className="flex items-center gap-2.5">
                  <FileCode className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-black text-foreground">
                    {editingTemplate.id ? 'Edit Email Template' : 'Create New Email Template'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Template Name *</label>
                    <input
                      type="text"
                      required
                      value={editingTemplate.name || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      placeholder="e.g. Employee Welcome Invite"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Template Key (Slug) *</label>
                    <input
                      type="text"
                      required
                      value={editingTemplate.templateKey || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, templateKey: e.target.value })}
                      placeholder="e.g. pnc.employee_welcome"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Module</label>
                    <select
                      value={editingTemplate.module || 'general'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, module: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    >
                      <option value="pnc">People &amp; Culture (HR)</option>
                      <option value="approvals">Approvals &amp; Workflows</option>
                      <option value="attendance">Attendance &amp; Leave</option>
                      <option value="finance">Finance &amp; Grants</option>
                      <option value="auth">Auth &amp; Security</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Subject Line *</label>
                    <input
                      type="text"
                      required
                      value={editingTemplate.subject || ''}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      placeholder="e.g. Welcome {{employeeName}} to JAAGO HUB"
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">HTML Body Content *</label>
                  <textarea
                    rows={8}
                    required
                    value={editingTemplate.bodyHtml || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyHtml: e.target.value })}
                    placeholder="Enter standard responsive HTML markup..."
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono text-foreground focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Supports variable interpolation using syntax: <code>&#123;&#123;variableName&#125;&#125;</code>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Plaintext Fallback Body</label>
                  <textarea
                    rows={3}
                    value={editingTemplate.bodyText || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, bodyText: e.target.value })}
                    placeholder="Plaintext version for clients without HTML support..."
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono text-foreground focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-border/70 flex items-center justify-end gap-3 bg-surface-hover/30">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition shadow-md cursor-pointer"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
