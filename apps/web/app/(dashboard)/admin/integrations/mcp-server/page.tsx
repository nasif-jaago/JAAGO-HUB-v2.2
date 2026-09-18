'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Bot,
  ShieldCheck,
  Activity,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Radio,
  Sliders,
  AlertTriangle,
  Play,
  Pause,
  Key,
  Database,
  Globe,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

export interface CatalogTool {
  type?: 'tool' | 'resource';
  name: string;
  description: string;
  moduleKey: string;
  permission: string;
}

const DEFAULT_TOOLS_CATALOG: CatalogTool[] = [
  { name: 'attendance.get_record', description: 'Retrieve normalized effective attendance check-in/out record for an employee', moduleKey: 'attendance', permission: 'read' },
  { name: 'attendance.check_in', description: 'Submit an authenticated check-in punch for an employee via authorized agent', moduleKey: 'attendance', permission: 'write' },
  { name: 'attendance.check_out', description: 'Submit an authenticated check-out punch for an employee via authorized agent', moduleKey: 'attendance', permission: 'write' },
  { name: 'hr.get_employee', description: 'Retrieve employee profile, designation, branch, and status by employee code', moduleKey: 'hr', permission: 'read' },
  { name: 'hr.list_directory', description: 'List active employees filtered by department or branch', moduleKey: 'hr', permission: 'read' },
  { name: 'payroll.get_payslip', description: 'Fetch official salary calculation summary for an employee for a specific pay period', moduleKey: 'payroll', permission: 'read' },
  { name: 'finance.list_invoices', description: 'Retrieve recent purchase orders and vendor invoices', moduleKey: 'finance', permission: 'read' },
  { name: 'on_duty.submit_request', description: 'Submit an on-duty field mission request on behalf of an employee', moduleKey: 'on_duty', permission: 'write' },
  { name: 'leave.get_balance', description: 'Check employee remaining leave quota and available balance', moduleKey: 'leave', permission: 'read' },
  { name: 'procurement.list_pos', description: 'Query procurement purchase orders, statuses, and vendor assignments', moduleKey: 'procurement', permission: 'read' },
  { name: 'documents.list_files', description: 'Browse company policies, contracts, and repository documents', moduleKey: 'documents', permission: 'read' },
  { name: 'organization.get_hierarchy', description: 'Fetch organizational structure, branches, and department hierarchies', moduleKey: 'organization', permission: 'read' },
];

interface McpAgent {
  id: string;
  name: string;
  description: string | null;
  agentType: string;
  status: 'active' | 'suspended' | 'revoked';
  createdAt: string;
  tokenPrefix: string | null;
  credentialId: string | null;
  lastUsedAt: string | null;
  isConnected: boolean;
  activeClient: string | null;
  activeIp: string | null;
  scopeCount: number;
  scopes: Array<{ moduleKey: string; permission: string }>;
}

interface LiveConnection {
  id: string;
  agentId: string;
  agentName: string;
  clientName: string;
  clientVersion: string;
  ipAddress: string;
  protocolVersion: string;
  status: 'active' | 'idle' | 'closed';
  requestCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

interface ActivityItem {
  id: string;
  agentId: string;
  agentName: string;
  method: string;
  name?: string;
  moduleKey?: string;
  permission?: string;
  outcome: 'ok' | 'denied' | 'error';
  denialReason?: string;
  durationMs?: number;
  timestamp: string;
}

import {
  CORE_MODULES,
  PLATFORM_MENUS,
  PLATFORM_PAGES,
  STANDARD_DEPARTMENTS,
  McpItemDef,
} from '@/lib/mcp/module-sync';

export type ModuleDef = McpItemDef;

const INITIAL_MODULES: ModuleDef[] = [
  ...CORE_MODULES,
  ...STANDARD_DEPARTMENTS,
  ...PLATFORM_MENUS,
  ...PLATFORM_PAGES,
];

export default function GovernedMcpServerPage() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'agents' | 'grants' | 'activity' | 'catalog'>('monitor');
  const [refreshing, setRefreshing] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  const [agents, setAgents] = useState<McpAgent[]>([]);
  const [connections, setConnections] = useState<LiveConnection[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogTool[]>(DEFAULT_TOOLS_CATALOG);
  const [metrics, setMetrics] = useState({
    connectedTotal: 0,
    activeCount: 0,
    idleCount: 0,
    rpm: 0,
    deniedToday: 0,
    governedToolsCount: DEFAULT_TOOLS_CATALOG.length,
  });

  // Selected agent for Access Grants tab
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Permission Tester State
  const [testToolName, setTestToolName] = useState<string>('attendance.check_in');
  const [testResult, setTestResult] = useState<{ allowed: boolean; reason: string; requiredPermission: string } | null>(null);

  // Register Agent Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDesc, setNewAgentDesc] = useState('');
  const [newAgentType, setNewAgentType] = useState('chatgpt');
  const [submittingAgent, setSubmittingAgent] = useState(false);

  // One-time Token & Connection Link Reveal Modal State
  const [revealedToken, setRevealedToken] = useState<{
    name: string;
    token: string;
    connectionLink?: string;
    pathConnectionLink?: string;
    clientType?: string;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPathLink, setCopiedPathLink] = useState(false);
  const [activeRevealTab, setActiveRevealTab] = useState<'link' | 'token'>('link');
  const [activeInstructionTab, setActiveInstructionTab] = useState<'chatgpt' | 'claude_desktop' | 'claude_web' | 'custom_sdk'>('chatgpt');

  // Auth headers helper
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('jaago_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Grants matrix local state
  const [modules, setModules] = useState<ModuleDef[]>(INITIAL_MODULES);
  const [agentScopes, setAgentScopes] = useState<Array<{ moduleKey: string; permission: string }>>([]);
  const [savingGrants, setSavingGrants] = useState(false);
  const [grantsSearch, setGrantsSearch] = useState('');
  const [grantsCategoryFilter, setGrantsCategoryFilter] = useState<'all' | 'core' | 'department' | 'menu' | 'page'>('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<'all' | 'tool' | 'resource'>('all');

  // Load Data
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const headers = getAuthHeaders();
      const [agentsRes, liveRes] = await Promise.all([
        fetch('/api/v1/mcp/agents', { headers }),
        fetch('/api/v1/mcp/live', { headers }),
      ]);

      const agentsJson = await agentsRes.json();
      const liveJson = await liveRes.json();

      if (agentsJson.success && Array.isArray(agentsJson.data)) {
        setAgents(agentsJson.data);
        if (agentsJson.data.length > 0) {
          setSelectedAgentId((prev) => {
            if (prev && agentsJson.data.some((a: any) => a.id === prev)) return prev;
            return agentsJson.data[0].id;
          });
        } else {
          setSelectedAgentId('');
        }
      }

      if (liveJson.success && liveJson.data) {
        setMetrics(liveJson.data.metrics);
        setConnections(liveJson.data.connections || []);
        setActivities(liveJson.data.activity || []);
        if (liveJson.data.catalog && Array.isArray(liveJson.data.catalog)) {
          setCatalog(liveJson.data.catalog);
        }
        if (Array.isArray(liveJson.data.modules) && liveJson.data.modules.length > 0) {
          setModules(liveJson.data.modules);
        }
      }
    } catch (err) {
      console.error('Failed to load MCP server state:', err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedAgentId, getAuthHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live polling / streaming interval
  useEffect(() => {
    if (!isLiveStreaming) return;
    const timer = setInterval(() => {
      fetchData(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [isLiveStreaming, fetchData]);

  // Sync selected agent's scopes when selected agent changes
  useEffect(() => {
    if (!selectedAgentId) return;
    const current = agents.find((a) => a.id === selectedAgentId);
    if (current) {
      setAgentScopes(current.scopes || []);
    }
  }, [selectedAgentId, agents]);

  // Evaluate Permission Tester
  const runPermissionTest = useCallback(async () => {
    if (!selectedAgentId || !testToolName) return;
    const tool = catalog.find((t) => t.name === testToolName);
    if (tool) {
      const hasGrant = agentScopes.some(
        (s) => s.moduleKey === tool.moduleKey && s.permission === tool.permission
      );

      setTestResult({
        allowed: hasGrant,
        requiredPermission: tool.permission,
        reason: hasGrant
          ? `grant present: ${tool.moduleKey}/${tool.permission}`
          : `no grant found for: ${tool.moduleKey}/${tool.permission}`,
      });
      return;
    }

    // Direct module / page / dept / menu check
    const mod = modules.find((m) => m.key === testToolName || (m.path && `page://${m.path}` === testToolName));
    if (mod) {
      const hasGrant = agentScopes.some(
        (s) => s.moduleKey === mod.key && s.permission === 'read'
      );
      setTestResult({
        allowed: hasGrant,
        requiredPermission: 'read',
        reason: hasGrant
          ? `grant present: ${mod.key}/read`
          : `no grant found for: ${mod.key}/read`,
      });
    }
  }, [selectedAgentId, testToolName, agentScopes, catalog, modules]);

  useEffect(() => {
    runPermissionTest();
  }, [runPermissionTest]);

  // Toggle Grant
  const handleToggleScope = async (moduleKey: string, permission: string) => {
    const exists = agentScopes.some((s) => s.moduleKey === moduleKey && s.permission === permission);
    let updated: Array<{ moduleKey: string; permission: string }>;

    if (exists) {
      updated = agentScopes.filter((s) => !(s.moduleKey === moduleKey && s.permission === permission));
    } else {
      updated = [...agentScopes, { moduleKey, permission }];
    }

    setAgentScopes(updated);
    setSavingGrants(true);

    try {
      await fetch('/api/v1/mcp/scopes', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId, scopes: updated }),
      });

      // Update in local agent list
      setAgents((prev) =>
        prev.map((a) => (a.id === selectedAgentId ? { ...a, scopes: updated, scopeCount: updated.length } : a))
      );
    } catch (err) {
      console.error('Failed to update scope:', err);
    } finally {
      setSavingGrants(false);
    }
  };

  // Grant 'read' on all modules, departments, menus, and pages across the whole platform
  const handleGrantAllRead = async () => {
    if (!selectedAgentId) return;
    const nonReadExisting = agentScopes.filter((s) => s.permission !== 'read');
    const allRead = modules.map((m) => ({ moduleKey: m.key, permission: 'read' }));
    const updated = [...allRead, ...nonReadExisting];

    setAgentScopes(updated);
    setSavingGrants(true);

    try {
      await fetch('/api/v1/mcp/scopes', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId, scopes: updated }),
      });

      setAgents((prev) =>
        prev.map((a) => (a.id === selectedAgentId ? { ...a, scopes: updated, scopeCount: updated.length } : a))
      );
    } catch (err) {
      console.error('Failed to grant all read access:', err);
    } finally {
      setSavingGrants(false);
    }
  };

  // Revoke all grants for the selected agent
  const handleRevokeAll = async () => {
    if (!selectedAgentId) return;
    setAgentScopes([]);
    setSavingGrants(true);

    try {
      await fetch('/api/v1/mcp/scopes', {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId, scopes: [] }),
      });

      setAgents((prev) =>
        prev.map((a) => (a.id === selectedAgentId ? { ...a, scopes: [], scopeCount: 0 } : a))
      );
    } catch (err) {
      console.error('Failed to revoke all access:', err);
    } finally {
      setSavingGrants(false);
    }
  };

  // Submit New Agent
  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    setSubmittingAgent(true);
    try {
      const res = await fetch('/api/v1/mcp/agents', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName.trim(),
          description: newAgentDesc.trim() || undefined,
          agentType: newAgentType,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setRegisterModalOpen(false);
        const cred = json.data.credential;
        setRevealedToken({
          name: json.data.agent.name,
          token: cred.plaintextToken,
          connectionLink: cred.connectionLink,
          pathConnectionLink: cred.pathConnectionLink,
          clientType: json.data.agent.agentType,
        });
        setActiveRevealTab('link');
        setActiveInstructionTab(
          json.data.agent.agentType === 'chatgpt'
            ? 'chatgpt'
            : json.data.agent.agentType === 'claude_web'
            ? 'claude_web'
            : json.data.agent.agentType === 'custom_sdk'
            ? 'custom_sdk'
            : 'claude_desktop'
        );
        setNewAgentName('');
        setNewAgentDesc('');
        fetchData();
      }
    } catch (err) {
      console.error('Agent registration failed:', err);
    } finally {
      setSubmittingAgent(false);
    }
  };

  // Rotate Agent Token
  const handleRotateCredential = async (agentId: string, agentName: string) => {
    if (!confirm(`Rotate credential for "${agentName}"?\nExisting tokens and connection links will be immediately invalidated and bots disconnected.`)) return;
    try {
      const res = await fetch(`/api/v1/mcp/agents/${agentId}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate' }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRevealedToken({
          name: agentName,
          token: json.data.plaintextToken,
          connectionLink: json.data.connectionLink,
          pathConnectionLink: json.data.pathConnectionLink,
        });
        setActiveRevealTab('link');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to rotate token:', err);
    }
  };

  // Revoke Agent Token
  const handleRevokeCredential = async (agentId: string, agentName: string) => {
    if (!confirm(`Revoke ALL credentials for "${agentName}"?\nThis action immediately disconnects all sessions and invalidates this agent's tokens.`)) return;
    try {
      const res = await fetch(`/api/v1/mcp/agents/${agentId}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to revoke credential:', err);
    }
  };

  // Delete Agent Permanently
  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`Permanently delete AI agent "${agentName}"?\nThis action cannot be undone. All credentials, connection links, and departmental scopes will be deleted.`)) return;
    try {
      const res = await fetch(`/api/v1/mcp/agents/${agentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        if (selectedAgentId === agentId) {
          setSelectedAgentId('');
        }
        fetchData();
      } else {
        alert(`Failed to delete agent: ${json.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  };

  // Toggle Status (Active / Suspended)
  const handleToggleAgentStatus = async (agentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await fetch(`/api/v1/mcp/agents/${agentId}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Selected agent object
  const activeAgentObj = useMemo(() => agents.find((a) => a.id === selectedAgentId), [agents, selectedAgentId]);

  // Copy token to clipboard
  const handleCopyToken = () => {
    if (!revealedToken) return;
    navigator.clipboard.writeText(revealedToken.token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  // Copy connection link to clipboard
  const handleCopyLink = () => {
    if (!revealedToken?.connectionLink) return;
    navigator.clipboard.writeText(revealedToken.connectionLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Copy path connection link to clipboard
  const handleCopyPathLink = () => {
    if (!revealedToken?.pathConnectionLink) return;
    navigator.clipboard.writeText(revealedToken.pathConnectionLink);
    setCopiedPathLink(true);
    setTimeout(() => setCopiedPathLink(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── 1. BREADCRUMBS & HEADER ── */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground font-medium">
          <Link href="/dashboard" className="hover:text-foreground transition">
            JAAGO HUB
          </Link>
          <span>/</span>
          <Link href="/admin/integrations" className="hover:text-foreground transition">
            AI Agent
          </Link>
          <span>/</span>
          <span className="text-foreground font-bold">MCP</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              MCP
            </h1>
          </div>

          <div className="flex items-center space-x-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center space-x-1.5 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>MCP 2026-07-28 &bull; stateless</span>
            </span>

            <button
              onClick={() => setRegisterModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center space-x-2 shadow-md hover:bg-primary/90 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Register agent</span>
            </button>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-surface border border-border text-foreground">
            &bull; OAuth 2.1 resource server
          </span>
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-surface border border-border text-foreground">
            &bull; Department scoped
          </span>
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-surface border border-border text-foreground">
            &bull; Live agent tracking
          </span>
        </div>
      </div>

      {/* ── 2. METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>CONNECTED AGENTS</span>
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black text-foreground font-mono">
            {metrics.connectedTotal}
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="text-emerald-500 font-semibold">{metrics.activeCount} active</span>,{' '}
            <span>{metrics.idleCount} idle</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>REQUESTS / MIN</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-foreground font-mono">
            {metrics.rpm}
          </div>
          <div className="text-xs text-muted-foreground">rolling last 60s</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>DENIED TODAY</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-rose-500 font-mono">
            {metrics.deniedToday}
          </div>
          <div className="text-xs text-muted-foreground">blocked by policy</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>GOVERNED TOOLS</span>
            <Sliders className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black text-foreground font-mono">
            {metrics.governedToolsCount}
          </div>
          <div className="text-xs text-muted-foreground">across {modules.length} modules &amp; pages</div>
        </div>
      </div>

      {/* ── 3. NAVIGATION TABS ── */}
      <div className="border-b border-border">
        <nav className="flex space-x-1 sm:space-x-6 overflow-x-auto text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'monitor'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Radio className="h-4 w-4" />
            <span>Live monitor</span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'agents'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Agents</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface border border-border">
              {agents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('grants')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'grants'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Access grants</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'activity'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Activity log</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'catalog'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Catalog</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-surface border border-border">
              {catalog.length}
            </span>
          </button>
        </nav>
      </div>

      {/* ── TAB 1: LIVE MONITOR ── */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Connected Now */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center space-x-2">
                <span>Connected now</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-surface border border-border text-muted-foreground font-mono">
                  {connections.length} active
                </span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {connections.length === 0 ? (
                <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-2">
                  <Radio className="h-7 w-7 mx-auto text-muted-foreground opacity-40" />
                  <p className="font-bold text-foreground text-xs">No active connections</p>
                  <p className="text-[11px] text-muted-foreground">
                    Connected AI agents will appear here with live heartbeat status.
                  </p>
                </div>
              ) : (
                connections.map((bot: any, idx) => {
                  const isOnline = bot.status === 'active';
                  const botName = bot.agentName || 'Unknown Bot';
                  const clientTitle = bot.clientName ? `${bot.clientName} ${bot.clientVersion || ''}`.trim() : 'MCP Client';
                  const ipStr = bot.ipAddress || '127.0.0.1';

                  return (
                    <div
                      key={bot.id || idx}
                      className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition shadow-sm space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-xl bg-surface border border-border font-mono font-black text-xs flex items-center justify-center text-foreground">
                            {botName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                              <h4 className="font-bold text-sm text-foreground">{botName}</h4>
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {clientTitle} &bull; {ipStr}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50 text-muted-foreground">
                        <span>{isOnline ? 'active' : 'idle'} &bull; last seen {new Date(bot.lastSeenAt).toLocaleTimeString()}</span>
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-surface border border-border text-primary font-bold">
                          {bot.requestCount || 0} reqs
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live Activity Stream */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-foreground">
                  Live activity <span className="font-mono text-muted-foreground text-xs font-normal">({metrics.rpm} req/min)</span>
                </h3>
              </div>

              <button
                onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-surface border border-border hover:border-primary/40 transition flex items-center space-x-1.5 text-foreground"
              >
                {isLiveStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span>{isLiveStreaming ? 'Pause' : 'Resume'}</span>
              </button>
            </div>

            <div className="p-2 sm:p-3 rounded-2xl bg-card border border-border shadow-sm divide-y divide-border/60 max-h-[580px] overflow-y-auto font-mono text-xs">
              {activities.length === 0 ? (
                <div className="p-8 text-center font-sans space-y-2">
                  <Activity className="h-7 w-7 mx-auto text-muted-foreground opacity-40" />
                  <p className="font-bold text-foreground text-xs">No activity stream yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    Real-time tool invocations and authorization events will stream here.
                  </p>
                </div>
              ) : (
                activities.map((act: any) => (
                  <div key={act.id} className="py-2.5 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface/50 rounded-lg transition">
                    <div className="flex items-center space-x-3">
                      <span className="text-[11px] text-muted-foreground">
                        {act.timestamp ? (act.timestamp.length > 19 ? act.timestamp.slice(11, 19) : act.timestamp) : '—'}
                      </span>
                      <span className="font-bold text-foreground">{act.agentName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface border border-border text-muted-foreground">
                        {act.method}
                      </span>
                      <span className="text-foreground font-medium">{act.name}</span>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      {act.moduleKey && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-surface border border-border text-muted-foreground uppercase">
                          {act.moduleKey}
                        </span>
                      )}
                      {act.permission && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary uppercase font-bold">
                          {act.permission}
                        </span>
                      )}
                      {act.durationMs && <span className="text-[10px] text-muted-foreground">{act.durationMs}ms</span>}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center space-x-1 ${
                          act.outcome === 'ok'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}
                      >
                        {act.outcome === 'ok' ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        <span>{act.outcome === 'ok' ? 'allowed' : 'denied'}</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: AGENTS DIRECTORY ── */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Registered Inbound Bots</h3>
            <button
              onClick={() => setRegisterModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center space-x-1.5 shadow-sm hover:bg-primary/90 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register new bot</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface/60 border-b border-border text-[11px] font-bold text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3.5 pl-5">Agent Name</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Token Prefix</th>
                    <th className="p-3.5">Grants</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Last Seen</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {agents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <Bot className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                        <p className="font-bold text-foreground text-xs">No registered AI agents yet</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Click "Register new bot" to provision your first inbound agent.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-surface/40 transition">
                      <td className="p-3.5 pl-5 font-bold text-foreground">
                        <div>{agent.name}</div>
                        {agent.description && <div className="text-[11px] text-muted-foreground font-normal">{agent.description}</div>}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-medium text-foreground">
                          {agent.agentType === 'chatgpt'
                            ? 'ChatGPT (Dev)'
                            : agent.agentType === 'claude_desktop'
                            ? 'Claude Desktop'
                            : agent.agentType === 'claude_web' || agent.agentType === 'claude_chrome'
                            ? 'Claude Web'
                            : agent.agentType === 'custom_sdk'
                            ? 'Custom SDK'
                            : agent.agentType || 'Custom'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-muted-foreground">{agent.tokenPrefix || '—'}...</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-surface border border-border font-bold">
                          {agent.scopeCount} grants
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            agent.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}
                        >
                          {agent.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground">
                        {agent.lastUsedAt ? new Date(agent.lastUsedAt).toLocaleTimeString() : 'Never'}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedAgentId(agent.id);
                              setAgentScopes(agent.scopes || []);
                              setActiveTab('grants');
                            }}
                            title="Configure Grants"
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-surface border border-border hover:border-primary/40 text-foreground transition"
                          >
                            Grants
                          </button>
                          <button
                            onClick={() => handleRotateCredential(agent.id, agent.name)}
                            title="Rotate Key"
                            className="px-2 py-1 rounded-lg text-xs font-bold bg-surface border border-border hover:border-amber-500/40 text-amber-400 transition"
                          >
                            Rotate
                          </button>
                          <button
                            onClick={() => handleToggleAgentStatus(agent.id, agent.status)}
                            title={agent.status === 'active' ? 'Suspend Bot' : 'Activate Bot'}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition border ${
                              agent.status === 'active'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                          >
                            {agent.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleRevokeCredential(agent.id, agent.name)}
                            title="Revoke Token"
                            className="px-2 py-1 rounded-lg text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition"
                          >
                            Revoke
                          </button>
                          <button
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            title="Delete Bot"
                            className="px-2 py-1 rounded-lg text-xs font-bold bg-rose-600/10 border border-rose-600/30 text-rose-500 hover:bg-rose-600 hover:text-white transition flex items-center space-x-1 shadow-sm"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: ACCESS GRANTS MATRIX & PERMISSION TESTER (Screenshot 3 Match) ── */}
      {activeTab === 'grants' && (
        <div className="space-y-5">
          {agents.length === 0 ? (
            <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
              <h4 className="font-bold text-foreground text-sm">No AI agents registered yet</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Register an inbound agent first before configuring departmental read, write, and delete permissions.
              </p>
              <button
                onClick={() => setRegisterModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition inline-flex items-center space-x-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register new agent</span>
              </button>
            </div>
          ) : (
            <>
              {/* Agent Pill Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground mr-1">Editing access for:</span>
                {agents.map((agent) => {
                  const isSelected = agent.id === selectedAgentId;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${
                        isSelected
                          ? 'bg-foreground text-background shadow-md'
                          : 'bg-card border border-border text-foreground hover:border-primary/40'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isSelected ? 'bg-emerald-400' : 'bg-muted-foreground'
                        }`}
                      />
                      <span>{agent.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Department & Module Access Matrix */}
                <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Department &amp; Module Access</h3>
                      <p className="text-xs text-muted-foreground">
                        Grant read, write, or delete per module &amp; department — deny by default
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {savingGrants && (
                        <span className="text-xs text-primary font-bold animate-pulse mr-1">Saving...</span>
                      )}
                      <button
                        type="button"
                        onClick={handleGrantAllRead}
                        disabled={savingGrants || !selectedAgentId}
                        className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition flex items-center space-x-1.5 shadow-sm hover:bg-primary/90 active:scale-95 disabled:opacity-50"
                        title="Grant Read access across each and every module and department"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Grant All Read Access</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeAll}
                        disabled={savingGrants || !selectedAgentId || agentScopes.length === 0}
                        className="px-2.5 py-1.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-rose-500 hover:border-rose-500/40 text-xs font-bold transition disabled:opacity-50"
                        title="Revoke all grants for this agent"
                      >
                        Revoke All
                      </button>
                    </div>
                  </div>

                  {/* Category Filter & Search */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5 bg-surface p-1.5 rounded-xl border border-border text-xs">
                      <button
                        type="button"
                        onClick={() => setGrantsCategoryFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          grantsCategoryFilter === 'all'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        All ({modules.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrantsCategoryFilter('core')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          grantsCategoryFilter === 'core'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Core Modules ({modules.filter((m) => m.category === 'core').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrantsCategoryFilter('department')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          grantsCategoryFilter === 'department'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Departments ({modules.filter((m) => m.category === 'department').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrantsCategoryFilter('menu')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          grantsCategoryFilter === 'menu'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Menus ({modules.filter((m) => m.category === 'menu').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrantsCategoryFilter('page')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          grantsCategoryFilter === 'page'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Pages &amp; Submenus ({modules.filter((m) => m.category === 'page').length})
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Filter by name, key, code, or path..."
                      value={grantsSearch}
                      onChange={(e) => setGrantsSearch(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-full sm:w-56"
                    />
                  </div>

                  <div className="overflow-x-auto max-h-[640px] overflow-y-auto pr-1">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-card z-10 border-b border-border text-[11px] font-bold text-muted-foreground uppercase shadow-sm">
                        <tr>
                          <th className="py-2.5 px-1">MODULE / PAGE / DEPARTMENT</th>
                          <th className="py-2.5 text-center w-16">
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">Read</span>
                          </th>
                          <th className="py-2.5 text-center w-16">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">Write</span>
                          </th>
                          <th className="py-2.5 text-center w-16">
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold">Delete</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {modules.filter((m) => {
                          if (grantsCategoryFilter !== 'all' && m.category !== grantsCategoryFilter) return false;
                          if (grantsSearch.trim()) {
                            const q = grantsSearch.toLowerCase();
                            return (
                              m.label.toLowerCase().includes(q) ||
                              m.key.toLowerCase().includes(q) ||
                              m.code.toLowerCase().includes(q) ||
                              m.desc.toLowerCase().includes(q) ||
                              (m.path && m.path.toLowerCase().includes(q))
                            );
                          }
                          return true;
                        }).map((mod) => {
                          const hasRead = agentScopes.some((s) => s.moduleKey === mod.key && s.permission === 'read');
                          const hasWrite = agentScopes.some((s) => s.moduleKey === mod.key && s.permission === 'write');
                          const hasDelete = agentScopes.some((s) => s.moduleKey === mod.key && s.permission === 'delete');

                          const categoryStyles = {
                            core: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                            department: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                            menu: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                            page: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                          }[mod.category] || 'bg-surface text-muted-foreground border-border';

                          return (
                            <tr key={mod.key} className="hover:bg-surface/40 transition">
                              <td className="py-3 px-1">
                                <div className="flex items-center space-x-2.5">
                                  <div className={`h-8 w-9 rounded-lg border font-mono font-black text-[11px] flex items-center justify-center flex-shrink-0 ${categoryStyles}`}>
                                    {mod.code}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-foreground text-xs truncate">{mod.label}</span>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border flex-shrink-0 ${categoryStyles}`}>
                                        {mod.category}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                                      <span>{mod.key}</span>
                                      {mod.path && (
                                        <>
                                          <span className="opacity-40">&bull;</span>
                                          <span className="text-primary/90 font-medium truncate">{mod.path}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Read Toggle */}
                              <td className="py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleScope(mod.key, 'read')}
                                  title={`Toggle Read permission for ${mod.label}`}
                                  className={`h-5 w-9 rounded-full transition-colors relative inline-flex items-center cursor-pointer ${
                                    hasRead ? 'bg-primary' : 'bg-muted border border-border'
                                  }`}
                                >
                                  <span
                                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                                      hasRead ? 'translate-x-4' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              </td>

                              {/* Write Toggle */}
                              <td className="py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleScope(mod.key, 'write')}
                                  title={`Toggle Write permission for ${mod.label}`}
                                  className={`h-5 w-9 rounded-full transition-colors relative inline-flex items-center cursor-pointer ${
                                    hasWrite ? 'bg-amber-600' : 'bg-muted border border-border'
                                  }`}
                                >
                                  <span
                                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                                      hasWrite ? 'translate-x-4' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              </td>

                              {/* Delete Toggle */}
                              <td className="py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleScope(mod.key, 'delete')}
                                  title={`Toggle Delete permission for ${mod.label}`}
                                  className={`h-5 w-9 rounded-full transition-colors relative inline-flex items-center cursor-pointer ${
                                    hasDelete ? 'bg-rose-600' : 'bg-muted border border-border'
                                  }`}
                                >
                                  <span
                                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                                      hasDelete ? 'translate-x-4' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: Permission Tester (Screenshot 3 Match) */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Permission tester</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Check whether <strong className="text-foreground">{activeAgentObj?.name || 'this agent'}</strong> would be allowed to call a tool or access a page/department — evaluated against the grants on the left, exactly as the server would.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-foreground block">Tool, Resource, Page, or Department</label>
                    <select
                      value={testToolName}
                      onChange={(e) => setTestToolName(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-surface border border-border font-mono text-xs text-foreground focus:outline-none focus:border-primary max-h-60"
                    >
                      <optgroup label="MCP Standard Tools">
                        {catalog.filter((t) => t.type === 'tool' || !t.name.includes('://')).map((t, idx) => (
                          <option key={`tool-opt-${t.name}-${idx}`} value={t.name}>
                            {t.name} ({t.moduleKey} &bull; {t.permission})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Platform Pages &amp; Submenus">
                        {modules.filter((m) => m.category === 'page').map((m, idx) => (
                          <option key={`page-opt-${m.key}-${idx}`} value={m.key}>
                            Page: {m.label} ({m.path || m.key} &bull; read)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Operational Departments">
                        {modules.filter((m) => m.category === 'department').map((m, idx) => (
                          <option key={`dept-opt-${m.key}-${idx}`} value={m.key}>
                            Dept: {m.label} ({m.key} &bull; read)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Navigation Menus">
                        {modules.filter((m) => m.category === 'menu').map((m, idx) => (
                          <option key={`menu-opt-${m.key}-${idx}`} value={m.key}>
                            Menu: {m.label} ({m.key} &bull; read)
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Core Platform Modules">
                        {modules.filter((m) => m.category === 'core').map((m, idx) => (
                          <option key={`core-opt-${m.key}-${idx}`} value={m.key}>
                            Module: {m.label} ({m.key} &bull; read)
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    <div className="flex items-center space-x-2 pt-1">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-surface border border-border text-foreground">
                        {catalog.find((t) => t.name === testToolName)?.moduleKey || modules.find((m) => m.key === testToolName || (m.path && `page://${m.path}` === testToolName))?.key || 'attendance'}
                      </span>
                      <span className="text-xs text-muted-foreground">requires</span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                        {catalog.find((t) => t.name === testToolName)?.permission || 'READ'}
                      </span>
                    </div>

                    {/* Live Verdict Card */}
                    {testResult && (
                      <div
                        className={`p-4 rounded-xl border space-y-1.5 transition ${
                          testResult.allowed
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                        }`}
                      >
                        <div className="flex items-center space-x-2 font-bold text-sm">
                          {testResult.allowed ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          <span>{testResult.allowed ? 'Allowed' : 'Denied'}</span>
                        </div>
                        <div className="font-mono text-xs opacity-90">{testResult.reason}</div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-border text-xs text-muted-foreground">
                      <strong className="text-foreground">{activeAgentObj?.name || 'Agent'}</strong> can currently:{' '}
                      {agentScopes.length === 0 ? (
                        <span className="text-rose-500 font-bold">Nothing (zero grants assigned)</span>
                      ) : (
                        <span className="font-mono text-foreground font-semibold">
                          {agentScopes.length} grants active across platform
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB 4: AUDIT ACTIVITY LOG ── */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Complete Bot Execution Trail</h3>
            <button
              onClick={() => fetchData()}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold flex items-center space-x-1.5 text-foreground hover:border-primary/40 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface/60 border-b border-border text-[11px] font-bold text-muted-foreground uppercase font-sans">
                  <tr>
                    <th className="p-3.5 pl-5">Timestamp</th>
                    <th className="p-3.5">Agent</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Target</th>
                    <th className="p-3.5">Module</th>
                    <th className="p-3.5">Latency</th>
                    <th className="p-3.5 pr-5 text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center font-sans">
                        <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                        <p className="font-bold text-foreground text-xs">No activity recorded yet</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Inbound MCP requests and tool invocations will appear here in real time.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    activities.map((act) => (
                    <tr key={act.id} className="hover:bg-surface/40 transition">
                      <td className="p-3.5 pl-5 text-muted-foreground">
                        {new Date(act.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3.5 font-bold text-foreground font-sans">{act.agentName}</td>
                      <td className="p-3.5 text-muted-foreground">{act.method}</td>
                      <td className="p-3.5 text-foreground font-bold">{act.name || '—'}</td>
                      <td className="p-3.5 uppercase text-muted-foreground">{act.moduleKey || '—'}</td>
                      <td className="p-3.5 text-muted-foreground">{act.durationMs ? `${act.durationMs}ms` : '—'}</td>
                      <td className="p-3.5 pr-5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            act.outcome === 'ok'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}
                        >
                          {act.outcome}
                        </span>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: GOVERNED CATALOG ── */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Registered MCP Tools &amp; Resources</h3>
              <p className="text-xs text-muted-foreground">
                Exposing all platform modules, menus, submenus, pages, and operational departments to authorized agents with read access.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-surface p-1 rounded-xl border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setCatalogCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    catalogCategoryFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({catalog.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogCategoryFilter('tool')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    catalogCategoryFilter === 'tool'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tools ({catalog.filter((c) => c.type !== 'resource').length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogCategoryFilter('resource')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    catalogCategoryFilter === 'resource'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Resources ({catalog.filter((c) => c.type === 'resource').length})
                </button>
              </div>

              <input
                type="text"
                placeholder="Search tools & resources..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-full sm:w-56"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog
              .filter((t) => {
                if (catalogCategoryFilter === 'tool' && t.type === 'resource') return false;
                if (catalogCategoryFilter === 'resource' && t.type !== 'resource') return false;
                if (catalogSearch.trim()) {
                  const q = catalogSearch.toLowerCase();
                  return (
                    t.name.toLowerCase().includes(q) ||
                    t.description.toLowerCase().includes(q) ||
                    t.moduleKey.toLowerCase().includes(q)
                  );
                }
                return true;
              })
              .map((t, idx) => (
                <div key={`catalog-card-${t.name}-${t.moduleKey}-${idx}`} className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3 hover:border-primary/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-surface border border-border text-primary">
                        {t.moduleKey}
                      </span>
                      {t.type === 'resource' ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          RESOURCE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-surface border border-border text-muted-foreground">
                          TOOL
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase flex-shrink-0 ${
                        t.permission === 'read'
                          ? 'bg-primary/10 text-primary'
                          : t.permission === 'write'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {t.permission}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-mono font-bold text-xs text-foreground break-all">{t.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t.description}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTER AGENT ── */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-foreground">Register New AI Agent</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Provision credentials for an inbound bot to connect via Model Context Protocol.
              </p>
            </div>

            <form onSubmit={handleRegisterAgent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Agent Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finance Copilot"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Client Type</span>
                  <span className="text-[10px] text-primary font-normal">Select for tailored setup instructions</span>
                </label>
                <select
                  value={newAgentType}
                  onChange={(e) => setNewAgentType(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-primary font-medium"
                >
                  <option value="chatgpt">ChatGPT (Developer Mode)</option>
                  <option value="claude_desktop">Claude Desktop (Mac/Win)</option>
                  <option value="claude_web">Claude in Chrome / claude.ai</option>
                  <option value="custom_sdk">Custom Agent / Python SDK</option>
                  <option value="other">Other MCP Client</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Scoped to payroll validation and audit report read operations"
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAgent}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow hover:bg-primary/90 transition"
                >
                  {submittingAgent ? 'Minting Credentials...' : 'Register & Mint Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONNECT AGENT (CONNECTION LINK & TOKEN) ── */}
      {revealedToken && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg sm:max-w-xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            {/* Modal Header (Pinned) */}
            <div className="p-3.5 sm:p-4 border-b border-border/60 flex items-center justify-between shrink-0 bg-card">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Share2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">Connect {revealedToken.name}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">Production Live Server Connection Details</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center space-x-0.5 p-0.5 rounded-lg bg-surface border border-border text-[11px] font-bold">
                  <button
                    onClick={() => setActiveRevealTab('link')}
                    className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                      activeRevealTab === 'link'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Link</span>
                  </button>
                  <button
                    onClick={() => setActiveRevealTab('token')}
                    className={`px-2.5 py-1 rounded-md transition flex items-center space-x-1 ${
                      activeRevealTab === 'token'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Key className="h-3 w-3" />
                    <span>Token</span>
                  </button>
                </div>

                <button
                  onClick={() => setRevealedToken(null)}
                  className="p-1 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition"
                  title="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Body (Auto-adjusts & Scrolls if needed) */}
            <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              {/* Security Notice */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] leading-relaxed flex items-start space-x-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div>
                  <strong>Shown-Once Notice:</strong> Credential hashed with SHA-256 and <strong>will never be shown again</strong>. Copy your link or token now.
                </div>
              </div>

              {/* TAB: CONNECTION LINK */}
              {activeRevealTab === 'link' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                      <span>Live Server Connection Link (Auth = None)</span>
                      <span className="text-[10px] text-emerald-500 font-normal">Production Host</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-surface border border-border font-mono text-xs text-foreground break-all flex items-center justify-between gap-2">
                      <span className="text-primary font-semibold select-all truncate">
                        {revealedToken.connectionLink || `https://hub.jaago.com.bd/api/mcp?k=${revealedToken.token}`}
                      </span>
                      <button
                        onClick={() => handleCopyLink()}
                        className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs shrink-0 flex items-center space-x-1 transition shadow-sm"
                      >
                        {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Path-based Alternative */}
                  <div className="p-2 rounded-xl bg-surface/60 border border-border text-[10px] font-mono text-muted-foreground flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="font-bold text-foreground">Path Format: </span>
                      <span className="select-all">{revealedToken.pathConnectionLink || `https://hub.jaago.com.bd/c/${revealedToken.token}/mcp`}</span>
                    </div>
                    <button
                      onClick={handleCopyPathLink}
                      className="p-1 rounded-md hover:bg-surface text-foreground shrink-0 transition"
                      title="Copy path link"
                    >
                      {copiedPathLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: API TOKEN */}
              {activeRevealTab === 'token' && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-foreground">Opaque Bearer Token</label>
                    <div className="p-2.5 rounded-xl bg-surface border border-border font-mono text-xs text-foreground break-all flex items-center justify-between gap-2">
                      <span className="text-foreground select-all truncate">{revealedToken.token}</span>
                      <button
                        onClick={handleCopyToken}
                        className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs shrink-0 flex items-center space-x-1 transition shadow-sm"
                      >
                        {copiedToken ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-surface border border-border text-[10px] font-mono text-muted-foreground space-y-0.5">
                    <div><strong>Endpoint:</strong> https://hub.jaago.com.bd/api/mcp</div>
                    <div><strong>Header:</strong> Authorization: Bearer {revealedToken.token.slice(0, 16)}...</div>
                  </div>
                </div>
              )}

              {/* Setup Instructions */}
              <div className="border-t border-border/60 pt-2.5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center space-x-1">
                    <Globe className="h-3 w-3 text-primary" />
                    <span>Setup Instructions</span>
                  </h4>

                  {/* Instruction Client Tabs */}
                  <div className="flex items-center space-x-1 text-[10px] font-bold">
                    {(['chatgpt', 'claude_desktop', 'claude_web', 'custom_sdk'] as const).map((tabKey) => {
                      const labels: Record<string, string> = {
                        chatgpt: 'ChatGPT',
                        claude_desktop: 'Claude Desktop',
                        claude_web: 'Claude Web',
                        custom_sdk: 'SDK',
                      };
                      return (
                        <button
                          key={tabKey}
                          onClick={() => setActiveInstructionTab(tabKey)}
                          className={`px-2 py-0.5 rounded-md transition ${
                            activeInstructionTab === tabKey
                              ? 'bg-primary/15 text-primary border border-primary/30'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {labels[tabKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* INSTRUCTION CONTENT (Auto-height with max constraint) */}
                <div className="max-h-40 overflow-y-auto rounded-xl bg-surface border border-border p-2.5 space-y-1.5 text-[11px] text-foreground leading-relaxed">
                  {activeInstructionTab === 'chatgpt' && (
                    <div className="space-y-1">
                      <div className="font-bold text-primary flex items-center space-x-1.5">
                        <span>ChatGPT Developer Mode Setup</span>
                        <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">Paid</span>
                      </div>
                      <ol className="list-decimal pl-3.5 space-y-0.5 text-muted-foreground">
                        <li>In ChatGPT, open <strong>Settings → Apps &amp; Connectors → Advanced</strong>.</li>
                        <li>Toggle <strong>Developer Mode</strong> to <strong>Enabled</strong>.</li>
                        <li>Click <strong>Create</strong> under Custom Connectors.</li>
                        <li>Paste your <strong>Connection Link</strong> into <strong>Server URL</strong>:
                          <div className="font-mono text-[10px] p-1 rounded bg-card border border-border text-primary mt-0.5 break-all select-all">
                            {revealedToken.connectionLink || `https://hub.jaago.com.bd/api/mcp?k=${revealedToken.token}`}
                          </div>
                        </li>
                        <li>Set Authentication to: <strong>None</strong>.</li>
                        <li>Save and activate the connector.</li>
                      </ol>
                    </div>
                  )}

                  {activeInstructionTab === 'claude_desktop' && (
                    <div className="space-y-1">
                      <div className="font-bold text-primary">Claude Desktop (<code className="font-mono text-[10px]">claude_desktop_config.json</code>)</div>
                      <pre className="p-2 rounded-lg bg-card border border-border font-mono text-[10px] text-foreground overflow-x-auto">
{`{
  "mcpServers": {
    "jaago-hub": {
      "url": "https://hub.jaago.com.bd/api/mcp",
      "headers": {
        "Authorization": "Bearer ${revealedToken.token}"
      }
    }
  }
}`}
                      </pre>
                    </div>
                  )}

                  {activeInstructionTab === 'claude_web' && (
                    <div className="space-y-1">
                      <div className="font-bold text-primary">Claude Web / Chrome Extension</div>
                      <ol className="list-decimal pl-3.5 space-y-0.5 text-muted-foreground">
                        <li>In claude.ai or extension, open <strong>Settings → Connectors</strong>.</li>
                        <li>Click <strong>Add Custom Connector</strong>.</li>
                        <li>Paste your <strong>Connection Link</strong>:
                          <div className="font-mono text-[10px] p-1 rounded bg-card border border-border text-primary mt-0.5 break-all select-all">
                            {revealedToken.connectionLink || `https://hub.jaago.com.bd/api/mcp?k=${revealedToken.token}`}
                          </div>
                        </li>
                        <li>Save and test connection.</li>
                      </ol>
                    </div>
                  )}

                  {activeInstructionTab === 'custom_sdk' && (
                    <div className="space-y-1">
                      <div className="font-bold text-primary">Python / TypeScript SDK</div>
                      <pre className="p-2 rounded-lg bg-card border border-border font-mono text-[10px] text-foreground overflow-x-auto">
{`import requests
url = "https://hub.jaago.com.bd/api/mcp"
headers = {"Authorization": "Bearer ${revealedToken.token}", "Content-Type": "application/json"}
res = requests.post(url, json={"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"attendance.get_record","arguments":{"employeeId":"EMP-001"}}}, headers=headers)
print(res.json())`}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer (Pinned & Never Pushed Off Screen) */}
            <div className="p-3 border-t border-border/60 bg-card flex justify-end shrink-0">
              <button
                onClick={() => setRevealedToken(null)}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow hover:bg-primary/90 transition active:scale-95"
              >
                I have saved this connection link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
