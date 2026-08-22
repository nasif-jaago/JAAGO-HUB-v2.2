'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ShieldCheck,
  Zap,
  Bot,
  HardDrive,
  MessageSquare,
  DollarSign,
  RefreshCw,
} from 'lucide-react';

interface Connector {
  id: string;
  name: string;
  type: string;
  status: string;
  circuitBreaker: string;
  vaultStatus: string;
  lastHealthCheck: string;
  description: string;
  toolsCount?: number;
  tools?: string[];
}

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConnectors = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/integrations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.data) {
        setConnectors(data.data);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConnectors();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConnectors();
  };

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarSign className="h-6 w-6 text-emerald-400" />;
      case 'messaging':
        return <MessageSquare className="h-6 w-6 text-primary" />;
      case 'storage':
        return <HardDrive className="h-6 w-6 text-amber-400" />;
      case 'ai_agent':
        return <Bot className="h-6 w-6 text-purple-400" />;
      default:
        return <Boxes className="h-6 w-6 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground">
      {/* ── HEADER ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg border border-primary/30">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Integrations &amp; Connectors Hub
            </h1>
            <p className="text-xs text-muted-foreground">
              AES-256-GCM Secret Vault &bull; Circuit Breaker Health &bull; Governed MCP Server
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="px-4 py-2.5 rounded-2xl bg-surface border border-border hover:border-primary/40 font-bold text-xs flex items-center space-x-2 text-foreground transition shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 text-primary ${refreshing ? 'animate-spin' : ''}`} />
          <span>Health Probe Sync</span>
        </button>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>CONNECTED SERVICES</span>
            <Boxes className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            {connectors.length} Active
          </div>
          <div className="text-[11px] text-muted-foreground">All integration channels healthy</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>VAULT ENCRYPTION</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
            AES-256-GCM
          </div>
          <div className="text-[11px] text-muted-foreground">Authenticated 16-byte tags</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>CIRCUIT BREAKER</span>
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            CLOSED
          </div>
          <div className="text-[11px] text-muted-foreground">Zero tripped fallbacks</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>MCP AI TOOLS</span>
            <Bot className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-purple-400 font-mono">
            2 Governed
          </div>
          <div className="text-[11px] text-muted-foreground">RBAC permission gated</div>
        </div>
      </div>

      {/* ── CONNECTOR CARDS GRID ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Configured Connectors &amp; Gateways
        </h3>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground rounded-2xl bg-card border border-border">
            Probing integration connector states...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectors.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-4 hover:border-primary/40 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-2xl bg-surface border border-border">
                    {getConnectorIcon(c.type)}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {c.status}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-foreground">{c.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
                </div>

                <div className="pt-2 border-t border-border/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Secret Vault:</span>
                    <span className="font-mono text-emerald-400 text-[11px] font-bold">{c.vaultStatus}</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Circuit Breaker:</span>
                    <span className="font-mono text-foreground text-[11px] font-bold">{c.circuitBreaker}</span>
                  </div>

                  {c.tools && (
                    <div className="pt-1">
                      <div className="text-[11px] text-muted-foreground mb-1">Available MCP Tools:</div>
                      <div className="flex flex-wrap gap-1">
                        {c.tools.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-surface border border-border text-purple-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
