'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  X,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Layers,
  FileText,
  Heart,
  Baby,
  Clock,
  Briefcase,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import {
  LeavePolicyConfig,
  LeaveTypeDetailConfig,
  LeaveType,
  BEREAVEMENT_RELATIONSHIPS,
  STANDARD_LEAVE_TYPES_CONFIG,
  fetchLeavePolicies,
  saveLeavePolicy,
} from '@/lib/supabase-time-off';

export default function LeaveConfigPage() {
  const [policies, setPolicies] = useState<LeavePolicyConfig[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<LeavePolicyConfig | null>(null);
  const [activeLeaveType, setActiveLeaveType] = useState<LeaveTypeDetailConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Policy Modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyFormData, setPolicyFormData] = useState<Partial<LeavePolicyConfig>>({
    name: '',
    code: '',
    description: '',
    applicableGroup: 'Standard Full-time',
    isActive: true,
  });

  const loadData = async () => {
    const data = await fetchLeavePolicies();
    if (data) {
      setPolicies(data);
      if (selectedPolicy) {
        const found = data.find((p) => p.id === selectedPolicy.id);
        if (found) setSelectedPolicy(found);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Select a policy to drill down
  const handleSelectPolicy = (policy: LeavePolicyConfig) => {
    setSelectedPolicy(policy);
    setActiveLeaveType(null);
  };

  // Open rule window for a specific leave type
  const handleOpenLeaveTypeRules = (leaveType: LeaveTypeDetailConfig) => {
    setActiveLeaveType({ ...leaveType });
  };

  // Save modified leave type rules
  const handleSaveLeaveTypeRules = async (updatedRules: LeaveTypeDetailConfig) => {
    if (!selectedPolicy) return;

    const updatedLeaveTypes = selectedPolicy.leaveTypes.map((t) =>
      t.key === updatedRules.key ? updatedRules : t
    );

    const updatedPolicy: LeavePolicyConfig = {
      ...selectedPolicy,
      leaveTypes: updatedLeaveTypes,
    };

    setSelectedPolicy(updatedPolicy);
    setActiveLeaveType(null);

    const updatedPolicies = policies.map((p) => (p.id === updatedPolicy.id ? updatedPolicy : p));
    setPolicies(updatedPolicies);

    await saveLeavePolicy(updatedPolicy);
    showToastMsg(`Rules for ${updatedRules.name} updated successfully`);
  };

  // Toggle single rule in Active Leave Type form
  const handleToggle = (key: keyof LeaveTypeDetailConfig) => {
    if (!activeLeaveType) return;
    setActiveLeaveType({
      ...activeLeaveType,
      [key]: !activeLeaveType[key],
    });
  };

  const getLeaveTypeIcon = (type: LeaveType) => {
    switch (type) {
      case 'Casual Leave':
        return <Calendar className="h-5 w-5 text-amber-500" />;
      case 'Medical Leave':
        return <Heart className="h-5 w-5 text-rose-500" />;
      case 'Emergency Leave':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'Annual Leave':
        return <Briefcase className="h-5 w-5 text-blue-500" />;
      case 'Maternity Leave':
        return <Baby className="h-5 w-5 text-pink-500" />;
      case 'Paternity Leave':
        return <Baby className="h-5 w-5 text-cyan-500" />;
      case 'Compensatory Leave':
        return <Clock className="h-5 w-5 text-purple-500" />;
      case 'Bereavement Leave':
        return <Layers className="h-5 w-5 text-stone-400" />;
      default:
        return <FileText className="h-5 w-5 text-amber-500" />;
    }
  };

  const filteredPolicies = policies.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.applicableGroup.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-2xl animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 1: POLICIES OVERVIEW LIST (When no policy is selected)
          ═══════════════════════════════════════════════════════════════════ */}
      {!selectedPolicy ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground">
                <Link href="/pnc" className="hover:text-primary hover:underline transition cursor-pointer">
                  People and Culture
                </Link>
                <span>/</span>
                <Link href="/pnc/time-off/calendar" className="hover:text-primary hover:underline transition cursor-pointer">
                  Time Off
                </Link>
                <span>/</span>
                <span className="text-foreground font-bold">Leave Config</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                Leave Policies &amp; Configuration
              </h1>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={loadData}
                className="p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground transition shadow-sm cursor-pointer"
                title="Refresh Policies"
              >
                <RotateCw className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPolicyFormData({
                    name: '',
                    code: `POL-${Math.floor(100 + Math.random() * 900)}`,
                    description: '',
                    applicableGroup: 'Standard Full-time',
                    isActive: true,
                  });
                  setShowPolicyModal(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>NEW POLICY</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policy name, group, code..."
              className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Policies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPolicies.map((policy) => {
              const cl = policy.leaveTypes?.find((t) => t.key === 'Casual Leave')?.entitlementDays ?? 10;
              const ml = policy.leaveTypes?.find((t) => t.key === 'Medical Leave')?.entitlementDays ?? 10;
              const al = policy.leaveTypes?.find((t) => t.key === 'Annual Leave')?.entitlementDays ?? 15;
              const el = policy.leaveTypes?.find((t) => t.key === 'Emergency Leave')?.entitlementDays ?? 4;
              const totalDays = cl + ml + al + el;

              return (
                <div
                  key={policy.id}
                  onClick={() => handleSelectPolicy(policy)}
                  className="p-6 rounded-3xl bg-card border border-border hover:border-amber-500/60 hover:shadow-2xl transition-all cursor-pointer shadow-md space-y-4 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-11 w-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0 group-hover:scale-105 transition">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-extrabold text-foreground group-hover:text-amber-500 transition text-sm">
                            {policy.name}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">{policy.code}</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 font-extrabold text-[10px] uppercase border border-emerald-500/30">
                        ACTIVE
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {policy.description || 'Comprehensive organizational leave rules framework.'}
                    </p>

                    {/* Quick Quotas Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
                      <div className="p-2.5 rounded-xl bg-surface/60 border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Casual (CL)</span>
                        <span className="font-mono font-black text-foreground text-sm">{cl} Days</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface/60 border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Medical (ML)</span>
                        <span className="font-mono font-black text-foreground text-sm">{ml} Days</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface/60 border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Annual (AL)</span>
                        <span className="font-mono font-black text-foreground text-sm">{al} Days</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-surface/60 border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Emergency (EL)</span>
                        <span className="font-mono font-black text-foreground text-sm">{el} Days</span>
                      </div>
                    </div>

                    {/* Subtext info */}
                    <div className="p-3 rounded-2xl bg-surface/40 border border-border/80 text-[11px] font-medium text-muted-foreground space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Configured Categories:</span>
                        <span className="font-bold text-foreground">8 Leave Types</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Target Audience:</span>
                        <span className="font-bold text-amber-500">{policy.applicableGroup}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="font-black text-foreground">{totalDays} Core Days / Yr</span>
                    <span className="font-bold text-amber-500 flex items-center space-x-1 group-hover:translate-x-1 transition text-[11px]">
                      <span>CONFIGURE RULES</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
            VIEW 2: LEAVE TYPES DRILLDOWN (All 8 Leave Types for Selected Policy)
            ═══════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Top Breadcrumb & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="p-2 rounded-2xl bg-card border border-border hover:border-amber-500 text-foreground hover:text-amber-500 transition shadow-sm cursor-pointer"
                title="Back to All Policies"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-muted-foreground">
                  <span className="cursor-pointer hover:underline" onClick={() => setSelectedPolicy(null)}>
                    Policies
                  </span>
                  <span>/</span>
                  <span className="text-foreground font-bold">{selectedPolicy.name}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                  {selectedPolicy.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 text-amber-500 font-black text-xs border border-amber-500/30">
                {selectedPolicy.code} &bull; {selectedPolicy.applicableGroup}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPolicy(null)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground hover:text-foreground text-xs font-bold transition cursor-pointer"
              >
                BACK TO POLICIES
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-foreground font-medium">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span>
                Click on any <strong>Leave Type</strong> below to customize its specific entitlement, probation allowances, advance notice, and validation toggles.
              </span>
            </div>
            <span className="font-bold text-amber-500 hidden sm:inline">8 LEAVE CATEGORIES CONFIGURED</span>
          </div>

          {/* 8 Leave Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedPolicy.leaveTypes.map((leaveType) => {
              return (
                <div
                  key={leaveType.key}
                  onClick={() => handleOpenLeaveTypeRules(leaveType)}
                  className={`p-5 rounded-3xl bg-card border transition-all cursor-pointer shadow-md hover:shadow-xl space-y-3 flex flex-col justify-between group ${
                    leaveType.isActive
                      ? 'border-border hover:border-amber-500'
                      : 'border-border/50 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-2xl bg-surface border border-border flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition">
                        {getLeaveTypeIcon(leaveType.key)}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          leaveType.isActive
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                            : 'bg-stone-500/15 text-stone-400 border-stone-500/30'
                        }`}
                      >
                        {leaveType.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <div>
                      <div className="font-extrabold text-foreground group-hover:text-amber-500 transition text-sm">
                        {leaveType.name}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground font-bold">
                        {leaveType.code}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-surface/70 border border-border space-y-1">
                      <div className="text-xl font-black text-foreground">
                        {leaveType.entitlementUnit === 'Hours'
                          ? 'Overtime Ledger'
                          : leaveType.entitlementUnit === 'Per Incident'
                          ? `${leaveType.entitlementDays}d / Incident`
                          : `${leaveType.entitlementDays} ${leaveType.entitlementUnit}`}
                      </div>
                      <div className="text-[10px] font-semibold text-muted-foreground">
                        {leaveType.entitlementUnit === 'Calendar Days'
                          ? 'Consecutive calendar days with full pay'
                          : leaveType.entitlementUnit === 'Hours'
                          ? 'Earned via weekend / holiday duty'
                          : 'Standard annual quota (July–June)'}
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {leaveType.description}
                    </p>
                  </div>

                  {/* Highlights */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-muted-foreground">
                      Notice: {leaveType.advanceNoticeDays > 0 ? `${leaveType.advanceNoticeDays}d prior` : 'Same day'}
                    </span>
                    <span className="font-extrabold text-amber-500 flex items-center space-x-1 group-hover:translate-x-1 transition">
                      <span>EDIT RULES</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ACTIVE POLICY RULE WINDOW (SLIDE-OVER / MODAL WITH TOGGLES)
          ═══════════════════════════════════════════════════════════════════ */}
      {activeLeaveType && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-6 no-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                  {getLeaveTypeIcon(activeLeaveType.key)}
                </div>
                <div>
                  <h3 className="text-lg font-serif font-black text-foreground">
                    Configure {activeLeaveType.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Policy Framework: {selectedPolicy?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLeaveType(null)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Form & Toggles */}
            <div className="space-y-5 text-xs">
              {/* Active Toggle */}
              <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-foreground text-xs">Leave Type Active Status</div>
                  <div className="text-[11px] text-muted-foreground">
                    Enable or disable this leave category for employee applications
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('isActive')}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    activeLeaveType.isActive ? 'bg-amber-500' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white absolute top-1 transition-transform ${
                      activeLeaveType.isActive ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Entitlement Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Entitlement Quota
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={activeLeaveType.entitlementDays}
                    onChange={(e) =>
                      setActiveLeaveType({ ...activeLeaveType, entitlementDays: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Entitlement Unit
                  </label>
                  <select
                    value={activeLeaveType.entitlementUnit}
                    onChange={(e) =>
                      setActiveLeaveType({
                        ...activeLeaveType,
                        entitlementUnit: e.target.value as any,
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Days">Days</option>
                    <option value="Calendar Days">Calendar Days</option>
                    <option value="Hours">Hours (Overtime Ledger)</option>
                    <option value="Per Incident">Per Incident</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Advance Notice (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={activeLeaveType.advanceNoticeDays}
                    onChange={(e) =>
                      setActiveLeaveType({ ...activeLeaveType, advanceNoticeDays: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Consecutive Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Max Consecutive Days per Application
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={activeLeaveType.maxConsecutiveDays}
                    onChange={(e) =>
                      setActiveLeaveType({ ...activeLeaveType, maxConsecutiveDays: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Min Consecutive Days Required
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={activeLeaveType.minConsecutiveDays}
                    onChange={(e) =>
                      setActiveLeaveType({ ...activeLeaveType, minConsecutiveDays: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* ── INTERACTIVE TOGGLE SWITCHES ── */}
              <div className="space-y-2 pt-2 border-t border-border/70">
                <div className="text-[11px] font-black uppercase tracking-wider text-amber-500">
                  Policy Validation Rules &amp; Restrictions
                </div>

                {/* Half-Day Toggle */}
                <div className="p-3 rounded-xl bg-surface/70 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground text-xs">Allow Half-Day Applications</div>
                    <div className="text-[10px] text-muted-foreground">
                      Allows staff to request First Half or Second Half shifts (0.5 day)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('allowHalfDay')}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                      activeLeaveType.allowHalfDay ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        activeLeaveType.allowHalfDay ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Probation Toggle */}
                <div className="p-3 rounded-xl bg-surface/70 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground text-xs">Allow During Probation Period</div>
                    <div className="text-[10px] text-muted-foreground">
                      Enables newly onboarded staff to avail this leave before permanent confirmation
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('allowDuringProbation')}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                      activeLeaveType.allowDuringProbation ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        activeLeaveType.allowDuringProbation ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Probation Max Days (if probation enabled) */}
                {activeLeaveType.allowDuringProbation && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground">Probation Max Days Allowance:</span>
                    <input
                      type="number"
                      min={1}
                      value={activeLeaveType.probationMaxDays}
                      onChange={(e) =>
                        setActiveLeaveType({
                          ...activeLeaveType,
                          probationMaxDays: Number(e.target.value),
                        })
                      }
                      className="w-20 h-8 px-2 rounded-lg bg-card border border-border text-center font-bold text-foreground"
                    />
                  </div>
                )}

                {/* Sandwiching Prevention Toggle */}
                <div className="p-3 rounded-xl bg-surface/70 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground text-xs">Prevent Sandwiching with Annual Leave</div>
                    <div className="text-[10px] text-muted-foreground">
                      Disallows prefixing or suffixing with Annual Leave as per policy
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('preventAnnualLeaveSandwiching')}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                      activeLeaveType.preventAnnualLeaveSandwiching ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        activeLeaveType.preventAnnualLeaveSandwiching ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Document Upload Toggle */}
                <div className="p-3 rounded-xl bg-surface/70 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground text-xs">Mandatory Document / Medical Upload</div>
                    <div className="text-[10px] text-muted-foreground">
                      Requires medical certificate or official documentation upload
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('requireDocumentUpload')}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                      activeLeaveType.requireDocumentUpload ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        activeLeaveType.requireDocumentUpload ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Notice Period Restriction */}
                <div className="p-3 rounded-xl bg-surface/70 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground text-xs">Restrict During Notice Period</div>
                    <div className="text-[10px] text-muted-foreground">
                      Automatically restricts applications if employee has submitted resignation
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('restrictDuringNoticePeriod')}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                      activeLeaveType.restrictDuringNoticePeriod ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        activeLeaveType.restrictDuringNoticePeriod ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Retrospective Submission Toggle */}
                <div className="p-3 rounded-xl bg-surface/70 border border-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground text-xs">Allow Retrospective Submission</div>
                    <div className="text-[10px] text-muted-foreground">
                      Enables emergency post-facto submissions after returning to work
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle('allowRetrospectiveSubmission')}
                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                      activeLeaveType.allowRetrospectiveSubmission ? 'bg-amber-500' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        activeLeaveType.allowRetrospectiveSubmission ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Bereavement Specific Relationship Checklist */}
              {activeLeaveType.key === 'Bereavement Leave' && (
                <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                  <div className="font-extrabold text-xs text-foreground">
                    Mandatory Bereavement Relationship Options
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {BEREAVEMENT_RELATIONSHIPS.map((rel) => (
                      <div key={rel} className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>{rel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => setActiveLeaveType(null)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => handleSaveLeaveTypeRules(activeLeaveType)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
              >
                SAVE RULES &amp; CONFIG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE NEW POLICY ── */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-serif font-black text-foreground">
                Create Leave Policy Framework
              </h3>
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!policyFormData.name) return;
                const newPol: LeavePolicyConfig = {
                  id: `pol-${Date.now()}`,
                  name: policyFormData.name,
                  code: policyFormData.code || `POL-${Math.floor(100 + Math.random() * 900)}`,
                  description: policyFormData.description || 'Custom institutional leave framework.',
                  applicableGroup: policyFormData.applicableGroup || 'Standard Staff',
                  isActive: true,
                  leaveTypes: [...STANDARD_LEAVE_TYPES_CONFIG],
                };
                setPolicies([...policies, newPol]);
                setShowPolicyModal(false);
                await saveLeavePolicy(newPol);
                showToastMsg('New leave policy framework created');
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Policy Name <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={policyFormData.name || ''}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, name: e.target.value })}
                  placeholder="e.g. Field Operations & Projects Policy"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Policy Code
                  </label>
                  <input
                    type="text"
                    value={policyFormData.code || ''}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, code: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-mono font-bold text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Target Group
                  </label>
                  <input
                    type="text"
                    value={policyFormData.applicableGroup || ''}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, applicableGroup: e.target.value })}
                    placeholder="Field Staff"
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={policyFormData.description || ''}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, description: e.target.value })}
                  placeholder="Define target audience and policy scope..."
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
                >
                  CREATE POLICY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
