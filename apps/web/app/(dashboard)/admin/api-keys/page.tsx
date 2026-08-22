'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Shield,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  X,
} from 'lucide-react';
import { EnterpriseTable, ColumnDef } from '@jaago/ui';

interface ApiKeyRecord {
  clientId: string;
  name: string;
  scopes: string[];
  rateLimitTier: string;
  createdAt: string;
  isActive: boolean;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['directory.view']);
  const [rateLimitTier, setRateLimitTier] = useState<'API' | 'REPORTS' | 'INTEGRATION'>('API');
  const [generatedResult, setGeneratedResult] = useState<{ clientId: string; clientSecret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const availableScopes = [
    { id: 'directory.view', label: 'directory.view (Staff & Volunteers)' },
    { id: 'workflow.view', label: 'workflow.view (Approvals Status)' },
    { id: 'reports.read', label: 'reports.read (Operational Reports)' },
    { id: 'volunteer.sync', label: 'volunteer.sync (App Sync)' },
    { id: 'audit.read', label: 'audit.read (Security Logs)' },
  ];

  const fetchKeys = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/api-keys', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.data) {
        setKeys(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleToggleScope = (scopeId: string) => {
    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scopeId));
    } else {
      setSelectedScopes([...selectedScopes, scopeId]);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: keyName,
          environment,
          scopes: selectedScopes,
          rateLimitTier,
        }),
      });

      const data = await res.json();
      if (data.data) {
        setGeneratedResult({
          clientId: data.data.clientId,
          clientSecret: data.data.clientSecret,
        });
        setKeyName('');
        fetchKeys();
      }
    } catch (err) {
      console.error('Failed to create key:', err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const columns: ColumnDef<ApiKeyRecord>[] = [
    {
      key: 'clientId',
      header: 'Client ID',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-primary bg-surface px-2 py-1 rounded-lg border border-border">
          {row.clientId}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Application Name',
      accessor: (row) => <span className="font-bold text-foreground">{row.name}</span>,
    },
    {
      key: 'rateLimitTier',
      header: 'Rate Limit Tier',
      accessor: (row) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-card border border-border text-muted-foreground">
          {row.rateLimitTier}
        </span>
      ),
    },
    {
      key: 'scopes',
      header: 'Assigned Scopes',
      accessor: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.scopes.map((s, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface border border-border text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      accessor: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            row.isActive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {row.isActive ? 'Active' : 'Revoked'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground">
      {/* ── HEADER ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg border border-primary/30">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              API Management Center
            </h1>
            <p className="text-xs text-muted-foreground">
              OAuth2 Client Credentials &bull; Granular Scopes &bull; Rate Limit Tiers &bull; Key Rotation
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setGeneratedResult(null);
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs flex items-center space-x-2 hover:bg-primary/90 shadow-lg transition"
        >
          <Plus className="h-4 w-4" />
          <span>Generate API Key</span>
        </button>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>ACTIVE API KEYS</span>
            <Key className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            {keys.length}
          </div>
          <div className="text-[11px] text-muted-foreground">Governed client applications</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>DAILY REQUESTS</span>
            <Activity className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-amber-400 font-mono">
            18,450
          </div>
          <div className="text-[11px] text-muted-foreground">Sliding window rate limit: 60/min</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>SUCCESS RATE</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
            99.98%
          </div>
          <div className="text-[11px] text-muted-foreground">Zero unauthorized leakages</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>AVG LATENCY</span>
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            42 <span className="text-sm font-semibold text-muted-foreground">ms</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Cache-accelerated verification</div>
        </div>
      </div>

      {/* ── ENTERPRISE TABLE ── */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground rounded-2xl bg-card border border-border">
          Loading active API client credentials...
        </div>
      ) : (
        <EnterpriseTable
          columns={columns}
          data={keys}
          keyField="clientId"
          title="Registered API Client Credentials"
          searchPlaceholder="Search client ID, name, or scopes..."
        />
      )}

      {/* ── CREATE KEY MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/90 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-black text-base text-foreground">Generate New API Key</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {generatedResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>API Client Credentials Created Successfully!</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Copy this secret now. For security reasons, you will not be able to view it again.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Client ID
                    </label>
                    <div className="font-mono text-xs p-2.5 rounded-xl bg-surface border border-border text-foreground font-bold mt-1">
                      {generatedResult.clientId}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Client Secret
                    </label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="font-mono text-xs p-2.5 rounded-xl bg-surface border border-border text-primary font-bold flex-1 break-all">
                        {generatedResult.clientSecret}
                      </div>
                      <button
                        onClick={() => handleCopy(generatedResult.clientSecret)}
                        className="p-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:bg-primary/90 transition shadow-lg"
                >
                  I Have Safely Saved My Secret
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground">Application / Integration Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Donor Mobile App Integration"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs focus:ring-1 focus:ring-primary focus:outline-none text-foreground"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Environment</label>
                    <select
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value as 'live' | 'test')}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-xs focus:ring-1 focus:ring-primary text-foreground"
                    >
                      <option value="live">Live (jg_live_)</option>
                      <option value="test">Test / Staging (jg_test_)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Rate Limit Tier</label>
                    <select
                      value={rateLimitTier}
                      onChange={(e) => setRateLimitTier(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-xs focus:ring-1 focus:ring-primary text-foreground"
                    >
                      <option value="API">API Tier (60 req/min)</option>
                      <option value="REPORTS">Reports Tier (10 req/min)</option>
                      <option value="INTEGRATION">Integration Tier (120 req/min)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground">Assigned Scopes (RBAC)</label>
                  <div className="space-y-1.5 p-3 rounded-2xl bg-surface border border-border max-h-40 overflow-y-auto">
                    {availableScopes.map((scope) => (
                      <label
                        key={scope.id}
                        className="flex items-center space-x-2.5 text-xs text-foreground cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.id)}
                          onChange={() => handleToggleScope(scope.id)}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span>{scope.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-2 text-[11px] text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>The client secret will only be shown once upon creation.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:bg-primary/90 transition shadow-lg"
                >
                  Generate Credentials
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
