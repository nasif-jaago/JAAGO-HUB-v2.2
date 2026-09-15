'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  FileText,
  Copy,
  Check,
  RotateCw,
  Wallet,
  Clock,
  CheckCircle2,
  FileEdit,
  X,
  ArrowRight,
  Plane,
  Receipt,
} from 'lucide-react';
import {
  FinanceAdvanceRequest,
  FinanceLiquidationForm,
  getFinanceAdvanceRequests,
  getFinanceLiquidations,
} from '@/lib/supabase-finance';
import { AdvanceRequestFormWindow } from '@/components/finance/advance-request-form-window';
import { LiquidationFormWindow } from '@/components/finance/liquidation-form-window';
import { getCurrentUserSession, UserSessionData } from '@/lib/user-profile-sync';

function ExpensesContent() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');
  const targetCode = searchParams.get('code');
  const targetAction = searchParams.get('action');

  const [currentUser, setCurrentUser] = useState<UserSessionData | null>(null);
  const [advances, setAdvances] = useState<FinanceAdvanceRequest[]>([]);
  const [liquidations, setLiquidations] = useState<FinanceLiquidationForm[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'ALL' | 'ADVANCE' | 'LIQUIDATION'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<FinanceAdvanceRequest | null>(null);

  const [isLiquidationModalOpen, setIsLiquidationModalOpen] = useState(false);
  const [selectedLiquidation, setSelectedLiquidation] = useState<FinanceLiquidationForm | null>(null);

  const loadData = async () => {
    try {
      const [advList, liqList] = await Promise.all([
        getFinanceAdvanceRequests(),
        getFinanceLiquidations(),
      ]);
      setAdvances(advList);
      setLiquidations(liqList);

      // Auto-open if query param exists
      if (targetAction === 'new-advance') {
        setSelectedAdvance(null);
        setIsAdvanceModalOpen(true);
      } else if (targetAction === 'new-liquidation') {
        setSelectedLiquidation(null);
        setIsLiquidationModalOpen(true);
      } else if (targetCode || targetId) {
        const advMatch = advList.find(
          (a) =>
            (targetCode && a.expenseCode.toLowerCase() === targetCode.toLowerCase()) ||
            (targetId && a.id === targetId)
        );
        if (advMatch) {
          setSelectedAdvance(advMatch);
          setIsAdvanceModalOpen(true);
        } else {
          const liqMatch = liqList.find(
            (l) =>
              (targetCode &&
                (l.liquidationCode.toLowerCase() === targetCode.toLowerCase() ||
                  l.linkedAdvanceCode?.toLowerCase() === targetCode.toLowerCase())) ||
              (targetId && l.id === targetId)
          );
          if (liqMatch) {
            setSelectedLiquidation(liqMatch);
            setIsLiquidationModalOpen(true);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load user expenses:', err);
    }
  };

  useEffect(() => {
    const sess = getCurrentUserSession();
    setCurrentUser(sess);
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('jaago_finance_updated', handleUpdate);
    return () => {
      window.removeEventListener('jaago_finance_updated', handleUpdate);
    };
  }, []);

  // Filter scoped to user (unless Super Admin)
  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.roles?.includes('super_admin') ||
      Boolean(currentUser.email && currentUser.email.toLowerCase().includes('nasif.kamal'))
    );
  }, [currentUser]);

  const userAdvances = useMemo(() => {
    if (!currentUser) return advances;
    if (isSuperAdmin) return advances;
    return advances.filter(
      (a) =>
        (currentUser.employeeCode && a.employeeCode === currentUser.employeeCode) ||
        a.employeeName.toLowerCase().includes((currentUser.fullName || '').toLowerCase())
    );
  }, [advances, currentUser, isSuperAdmin]);

  const userLiquidations = useMemo(() => {
    if (!currentUser) return liquidations;
    if (isSuperAdmin) return liquidations;
    return liquidations.filter(
      (l) =>
        (currentUser.employeeCode && l.employeeCode === currentUser.employeeCode) ||
        l.employeeName.toLowerCase().includes((currentUser.fullName || '').toLowerCase())
    );
  }, [liquidations, currentUser, isSuperAdmin]);

  // Combined Logs
  type CombinedLog = {
    type: 'ADVANCE' | 'LIQUIDATION';
    id: string;
    code: string;
    title: string;
    date: string;
    amount: number;
    status: string;
    project?: string | undefined;
    visitingPlace?: string | undefined;
    rawAdvance?: FinanceAdvanceRequest | undefined;
    rawLiquidation?: FinanceLiquidationForm | undefined;
  };

  const combinedLogs: CombinedLog[] = useMemo(() => {
    const list: CombinedLog[] = [];

    if (activeTab === 'ALL' || activeTab === 'ADVANCE') {
      userAdvances.forEach((a) => {
        list.push({
          type: 'ADVANCE',
          id: a.id,
          code: a.expenseCode,
          title: a.title,
          date: a.requestDate,
          amount: a.totalAmount,
          status: a.status,
          project: a.project,
          visitingPlace: a.visitingPlace,
          rawAdvance: a,
        });
      });
    }

    if (activeTab === 'ALL' || activeTab === 'LIQUIDATION') {
      userLiquidations.forEach((l) => {
        list.push({
          type: 'LIQUIDATION',
          id: l.id,
          code: l.liquidationCode,
          title: `${l.subject} ${l.linkedAdvanceCode ? `(Ref: ${l.linkedAdvanceCode})` : ''}`,
          date: l.dateOfActualAdjustment || l.dateOfAdjustment,
          amount: l.totalActualExpenses,
          status: l.status,
          project: l.project,
          visitingPlace: l.visitingPlace,
          rawLiquidation: l,
        });
      });
    }

    // Sort by date desc
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply Search & Status Filter
    return list.filter((item) => {
      const matchSearch =
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.project && item.project.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.visitingPlace && item.visitingPlace.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus =
        statusFilter === 'ALL' || item.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [userAdvances, userLiquidations, activeTab, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalAdvancesAmount = userAdvances.reduce((acc, a) => acc + (a.totalAmount || 0), 0);
    const activeCount = userAdvances.filter((a) => a.status === 'Submitted' || a.status === 'Approved').length;
    const settledCount = userLiquidations.filter((l) => l.status === 'Settled' || l.status === 'Approved').length;
    const draftsCount =
      userAdvances.filter((a) => a.status === 'Draft').length +
      userLiquidations.filter((l) => l.status === 'Draft').length;

    return { totalAdvancesAmount, activeCount, settledCount, draftsCount };
  }, [userAdvances, userLiquidations]);

  const handleOpenRow = (item: CombinedLog) => {
    if (item.type === 'ADVANCE' && item.rawAdvance) {
      setSelectedAdvance(item.rawAdvance);
      setIsAdvanceModalOpen(true);
    } else if (item.type === 'LIQUIDATION' && item.rawLiquidation) {
      setSelectedLiquidation(item.rawLiquidation);
      setIsLiquidationModalOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Settled':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{status}</span>
          </span>
        );
      case 'Submitted':
      case 'Reviewed':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>{status}</span>
          </span>
        );
      case 'Draft':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted/80 text-muted-foreground border border-border shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            <span>{status || 'Draft'}</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 space-y-6 text-foreground select-none animate-in fade-in duration-200">
      {/* Advance Request Modal */}
      <AdvanceRequestFormWindow
        isOpen={isAdvanceModalOpen}
        onClose={() => {
          setIsAdvanceModalOpen(false);
          setSelectedAdvance(null);
        }}
        onSaved={() => loadData()}
        initialData={selectedAdvance}
      />

      {/* Liquidation Form Modal */}
      <LiquidationFormWindow
        isOpen={isLiquidationModalOpen}
        onClose={() => {
          setIsLiquidationModalOpen(false);
          setSelectedLiquidation(null);
        }}
        onSaved={() => loadData()}
        initialData={selectedLiquidation}
      />

      {/* ── 1. HEADER SECTION (MATCHING PNC REFERENCE STANDARD) ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground pb-1.5">
            <Link href="/" className="hover:text-amber-500 transition cursor-pointer">
              Dashboards
            </Link>
            <span>/</span>
            <Link href="/dashboard" className="hover:text-amber-500 transition cursor-pointer">
              My Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Expenses</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight text-foreground">
            Expense Requisitions &amp; Liquidations
          </h1>
        </div>

        {/* Right-side Action Buttons */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedAdvance(null);
              setIsAdvanceModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black transition flex items-center space-x-2 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>NEW ADVANCE REQUEST</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedLiquidation(null);
              setIsLiquidationModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-card border border-border/80 hover:border-amber-500/50 hover:bg-surface text-foreground text-xs font-black transition flex items-center space-x-2 shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>NEW LIQUIDATION FORM</span>
          </button>

          <button
            type="button"
            onClick={() => loadData()}
            className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground transition cursor-pointer hover:border-amber-500/50 hover:text-amber-500 shadow-sm"
            title="Sync latest data from Supabase"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── 2. COMPACT AUTO-ADJUSTED KPI METRICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Advances Taken */}
        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-amber-500/40 transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Total Advances
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-xs font-bold text-muted-foreground">৳</span>
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-foreground truncate">
                  {metrics.totalAdvancesAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-muted/80 text-muted-foreground border border-border/60 flex-shrink-0">
            {userAdvances.length} total
          </span>
        </div>

        {/* Card 2: Active / Approved Advances */}
        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-sky-500/40 transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Active / Approved
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-sky-600 dark:text-sky-400">
                  {metrics.activeCount}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">advances</span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex-shrink-0">
            Ready
          </span>
        </div>

        {/* Card 3: Liquidated & Settled */}
        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-emerald-500/40 transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Liquidated &amp; Settled
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                  {metrics.settledCount}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">settled</span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
            Audited
          </span>
        </div>

        {/* Card 4: Draft Requisitions */}
        <div className="rounded-2xl bg-card border border-border/80 p-3 sm:p-3.5 shadow-xs hover:border-border transition-all duration-150 flex items-center justify-between gap-3 group">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-muted text-muted-foreground border border-border flex-shrink-0 group-hover:scale-105 transition-transform">
              <FileEdit className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block truncate">
                Draft Requisitions
              </span>
              <div className="flex items-baseline space-x-1 mt-0.5">
                <span className="text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight text-foreground">
                  {metrics.draftsCount}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">drafts</span>
              </div>
            </div>
          </div>
          <span className="hidden xl:inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-muted text-muted-foreground border border-border flex-shrink-0">
            Editable
          </span>
        </div>
      </div>

      {/* ── 3. LOGS VIEW / FILTER TOOLBAR ── */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-card p-3 rounded-3xl border border-border/80 shadow-sm">
          {/* Segmented Tabs */}
          <div className="flex items-center space-x-1.5 bg-surface/60 p-1.5 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>All Requests</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground">
                {userAdvances.length + userLiquidations.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ADVANCE')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'ADVANCE'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plane className="h-3.5 w-3.5" />
              <span>Advance Requests</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'ADVANCE' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                {userAdvances.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('LIQUIDATION')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'LIQUIDATION'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Liquidation Forms</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'LIQUIDATION' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                {userLiquidations.length}
              </span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center space-x-2.5 flex-1 lg:max-w-md justify-end">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, title, place..."
                className="w-full pl-10 pr-8 py-2 rounded-2xl bg-surface/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 rounded-2xl bg-surface/50 border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Approved">Approved</option>
              <option value="Settled">Settled</option>
            </select>
          </div>
        </div>

        {/* ── 4. MODERN ZERO-ANOMALY DATA TABLE ── */}
        <div className="rounded-3xl bg-card border border-border/80 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-surface/60">
                  <th className="py-4 px-5 w-28">TYPE</th>
                  <th className="py-4 px-5 w-44">EXPENSE CODE</th>
                  <th className="py-4 px-5">SUBJECT / PURPOSE</th>
                  <th className="py-4 px-5 w-32">DATE</th>
                  <th className="py-4 px-5 text-right w-36">AMOUNT (BDT)</th>
                  <th className="py-4 px-5 text-center w-36">STATUS</th>
                  <th className="py-4 px-5 text-right w-24">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {combinedLogs.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleOpenRow(item)}
                    className="hover:bg-surface/60 transition cursor-pointer group"
                  >
                    <td className="py-4 px-5">
                      {item.type === 'ADVANCE' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                          <Plane className="h-3 w-3 mr-0.5" />
                          <span>ADVANCE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          <Receipt className="h-3 w-3 mr-0.5" />
                          <span>LIQUIDATION</span>
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center space-x-1.5">
                        <span className="font-mono font-black text-xs text-foreground px-2 py-0.5 rounded-md bg-muted/60 border border-border">
                          {item.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(item.code);
                            setCopiedCode(item.code);
                            setTimeout(() => setCopiedCode(null), 2000);
                          }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition cursor-pointer"
                          title="Copy Expense Code"
                        >
                          {copiedCode === item.code ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="max-w-md">
                        <p className="font-bold text-foreground line-clamp-1 group-hover:text-amber-500 transition">
                          {item.title}
                        </p>
                        {(item.project || item.visitingPlace) && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {[item.project, item.visitingPlace].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-muted-foreground font-medium">
                      {new Date(item.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    <td className="py-4 px-5 text-right font-mono font-black text-xs sm:text-sm text-foreground">
                      <span className="text-[11px] text-muted-foreground font-bold mr-0.5">৳</span>
                      {item.amount.toLocaleString()}
                    </td>

                    <td className="py-4 px-5 text-center">{getStatusBadge(item.status)}</td>

                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenRow(item)}
                        className="px-3 py-1.5 rounded-xl bg-surface hover:bg-amber-500 hover:text-white border border-border/70 hover:border-amber-500 text-xs font-black transition-all duration-150 inline-flex items-center space-x-1 shadow-xs cursor-pointer active:scale-95"
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}

                {combinedLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-4 rounded-3xl bg-muted/50 border border-border">
                          <FileText className="h-8 w-8 text-muted-foreground/60" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-foreground">No expense records found</p>
                          <p className="text-xs text-muted-foreground max-w-sm">
                            Submit a new travel advance or liquidation form using the action buttons above.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAdvance(null);
                            setIsAdvanceModalOpen(true);
                          }}
                          className="mt-2 px-4 py-2 rounded-2xl bg-amber-500 text-white text-xs font-black hover:bg-amber-600 transition shadow-sm cursor-pointer"
                        >
                          + Create Advance Request
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Summary Footer */}
          {combinedLogs.length > 0 && (
            <div className="p-4 px-5 bg-surface/40 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-semibold text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{combinedLogs.length}</strong> of{' '}
                <strong className="text-foreground">
                  {userAdvances.length + userLiquidations.length}
                </strong>{' '}
                requisitions
              </span>
              <div className="flex items-center space-x-2">
                <span>Total Filtered Amount:</span>
                <span className="font-mono font-black text-foreground text-sm">
                  ৳ {combinedLogs.reduce((acc, c) => acc + c.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestsExpensesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading expenses...</div>}>
      <ExpensesContent />
    </Suspense>
  );
}

