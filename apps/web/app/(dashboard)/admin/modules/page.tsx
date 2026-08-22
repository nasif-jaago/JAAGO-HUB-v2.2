'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  CheckCircle2,
  Download,
  Power,
  Shield,
  Layers,
  ArrowRight,
  Filter,
  Search,
} from 'lucide-react';

interface ModuleItem {
  key: string;
  name: string;
  version: string;
  summary: string;
  category: string;
  author: string;
  depends: string[];
  permissions: { key: string; name: string }[];
  status: string;
  installed: boolean;
}

export default function AdminModulesPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModules() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
        const res = await fetch('/api/v1/modules', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.data) {
          setModules(data.data);
        }
      } catch (err) {
        console.error('Failed to load modules:', err);
      } finally {
        setLoading(false);
      }
    }
    loadModules();
  }, []);

  const categories = ['ALL', 'CORE', 'OPERATIONS', 'HUMAN CAPITAL', 'FINANCE', 'IMPACT'];

  const filtered = modules.filter((m) => {
    const matchesCategory =
      activeCategory === 'ALL' || m.category.toUpperCase() === activeCategory.replace(' ', '_');
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
              Module Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Odoo-Class Modular App Registry &amp; Topological Lifecycle Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>
      </div>

      {/* ── CATEGORY FILTER TABS ── */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center space-x-1.5 p-1 bg-surface rounded-2xl border border-border min-w-max">
          <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition tracking-wider ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── MODULE CARDS GRID ── */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-xs">
          Loading platform modules...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((mod) => (
            <div
              key={mod.key}
              className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl flex flex-col justify-between space-y-4 hover:border-primary/40 transition group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground group-hover:text-primary transition">
                        {mod.name}
                      </h2>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        v{mod.version} &bull; {mod.key}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      mod.installed
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-surface text-muted-foreground border border-border'
                    }`}
                  >
                    {mod.installed ? 'ACTIVE' : 'AVAILABLE'}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {mod.summary}
                </p>

                {/* Dependencies */}
                {mod.depends && mod.depends.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1.5">
                      Depends On:
                    </span>
                    <div className="inline-flex flex-wrap gap-1 mt-1">
                      {mod.depends.map((dep) => (
                        <span
                          key={dep}
                          className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-mono border border-primary/20"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Permissions Contributed */}
                {mod.permissions && mod.permissions.length > 0 && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 text-primary/70" />
                    <span>{mod.permissions.length} RBAC Permissions Registered</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {mod.author}
                </span>

                {mod.installed ? (
                  <button
                    onClick={() => {
                      alert(`Module '${mod.name}' is active in current organization.`);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-primary/40 text-xs font-bold text-foreground transition"
                  >
                    <Power className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Config</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      alert(`Installing '${mod.name}' with dependencies: ${mod.depends.join(', ') || 'None'}`);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-brand-strong transition shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Install</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TOPOLOGICAL DEPENDENCY ENGINE EXPLAINER CARD ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl space-y-4">
        <div className="flex items-center space-x-2.5">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Topological Dependency Resolver &amp; Migration Integrity
          </h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          JAAGO HUB executes Kahn&apos;s topological sort algorithm across all declared module manifests to guarantee that database migrations and service contracts execute in strict dependency order before dependent modules initialize. Circular dependency chains are rejected at compile-time.
        </p>
        <div className="flex items-center space-x-3 p-3 bg-surface rounded-2xl border border-border text-xs font-mono text-foreground overflow-x-auto">
          <span className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold">core</span>
          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 font-bold">directory</span>
          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/30 font-bold">announcements</span>
          <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-muted-foreground">hr / finance / procurement</span>
        </div>
      </div>
    </div>
  );
}
