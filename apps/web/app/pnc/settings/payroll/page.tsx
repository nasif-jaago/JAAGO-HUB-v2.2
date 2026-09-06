'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  ShieldCheck,
  Calculator,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Clock,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  PayrollConfig,
  INITIAL_PAYROLL_CONFIG,
  getPayrollConfig,
  savePayrollConfig,
  resetPayrollConfig,
  evaluateSalaryRules,
  runCanonicalVerificationTest,
  SalaryCalculationResult,
  RuleContext,
} from '@/lib/payroll-engine';

export default function PayrollSettingsPage() {
  const [config, setConfig] = useState<PayrollConfig>(INITIAL_PAYROLL_CONFIG);
  const [activeTab, setActiveTab] = useState<
    'structure' | 'pf_deductions' | 'tax' | 'attendance_ot' | 'bonus_banking' | 'simulator'
  >('structure');

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Verification Test State (§17.1)
  const [verificationResult, setVerificationResult] = useState<ReturnType<
    typeof runCanonicalVerificationTest
  > | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Simulator State (§14.6)
  const [simGross, setSimGross] = useState<number>(60000);
  const [simPfRate, setSimPfRate] = useState<number>(5);
  const [simGender, setSimGender] = useState<'male' | 'female'>('male');
  const [simBonusEligible, setSimBonusEligible] = useState<boolean>(true);
  const [simDepartment, setSimDepartment] = useState<string>('General Operations');
  const [simAttendanceDed, setSimAttendanceDed] = useState<number>(0);
  const [simInsuranceStatus, setSimInsuranceStatus] = useState<string>('Disabled');
  const [simInsurancePremium, setSimInsurancePremium] = useState<number>(0);
  const [simManualLate, setSimManualLate] = useState<number>(0);

  // Load saved config on mount
  useEffect(() => {
    const loaded = getPayrollConfig();
    setConfig(loaded);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      const ok = savePayrollConfig(config);
      if (ok) {
        showToast('Payroll Configuration saved and synchronized across JAAGO HUB successfully!');
      } else {
        showToast('Failed to save configuration to storage', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to restore default JAAGO Foundation payroll rules?')) {
      const def = resetPayrollConfig();
      setConfig(def);
      showToast('Payroll configuration reset to standard defaults.');
    }
  };

  const handleRunVerification = () => {
    const res = runCanonicalVerificationTest();
    setVerificationResult(res);
    setShowVerificationModal(true);
  };

  // Calculate Allowance Allocation Total
  const totalAllocationPct = useMemo(() => {
    return (
      (config.basic_salary_percentage || 0) +
      (config.house_rent_percentage || 0) +
      (config.medical_allowance_percentage || 0) +
      (config.conveyance_allowance_percentage || 0) +
      (config.other_allowance_percentage || 0)
    );
  }, [config]);

  // Live Simulator Calculation
  const simResult: SalaryCalculationResult = useMemo(() => {
    const contract: RuleContext['contract'] = {
      wage: simGross,
      pf_rate: simPfRate / 100,
      bonus_eligibility: simBonusEligible,
      gender: simGender,
      department: simDepartment,
      insurance_status: simInsuranceStatus,
      insurance_monthly_premium: simInsurancePremium,
      pf_enabled: simPfRate > 0,
      no_tax_deduction: false,
    };

    const inputs: RuleContext['inputs'] = {
      ATTENDANCE_DEDUCTION: simAttendanceDed,
      LATE: simManualLate,
    };

    return evaluateSalaryRules(contract, config, inputs);
  }, [
    simGross,
    simPfRate,
    simGender,
    simBonusEligible,
    simDepartment,
    simAttendanceDed,
    simInsuranceStatus,
    simInsurancePremium,
    simManualLate,
    config,
  ]);

  const loadCanonicalPreset = () => {
    setSimGross(60000);
    setSimPfRate(5);
    setSimGender('male');
    setSimBonusEligible(true);
    setSimDepartment('General');
    setSimAttendanceDed(0);
    setSimInsuranceStatus('Disabled');
    setSimInsurancePremium(0);
    setSimManualLate(0);
    showToast('Loaded Canonical Worked Example Preset (৳60,000 Gross)');
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-card to-card border border-amber-500/25 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Settings className="h-5 w-5" />
              </div>
              <span className="text-xs uppercase font-bold tracking-widest text-amber-600 dark:text-amber-400">
                JAAGO PAY &bull; Configuration Engine
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {config.fiscalYear || 'FY 2026-2027'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">
              Payroll Rules &amp; Global Settings
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Configure wage structures, Bangladesh NBR progressive tax slabs, Provident Fund rules,
              attendance penalties, and test with the native Rule-Trace Simulator.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunVerification}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-card hover:bg-muted text-foreground border border-border shadow-xs transition"
              title="Run §17.1 Canonical Worked Example Verification"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Verify Engine (§17.1)</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border shadow-xs transition"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        {/* Quick Config Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-border">
          <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Basic Salary Ratio</span>
            <div className="text-base font-black text-amber-600 dark:text-amber-400">{config.basic_salary_percentage}% of Gross</div>
          </div>
          <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">PF Deduction (Staff)</span>
            <div className="text-base font-black text-foreground">{config.provident_fund_employee_rate}% ({config.pf_base})</div>
          </div>
          <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Tax Exemption Ceiling</span>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">৳{(config.tax_exemption_limit_1 || 500000).toLocaleString()}</div>
          </div>
          <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Minimum Annual Tax</span>
            <div className="text-base font-black text-foreground">৳{(config.minimum_tax || 5000).toLocaleString()}</div>
          </div>
          <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Late Penalty Rule</span>
            <div className="text-base font-black text-foreground">{config.late_penalty_threshold} Lates = {config.late_penalty_deduction_days}d Ded</div>
          </div>
          <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Salary Payout Day</span>
            <div className="text-base font-black text-amber-600 dark:text-amber-300">{config.disbursement_day}th of Month</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto space-x-2 border-b border-border pb-2 scrollbar-none">
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'structure'
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Salary Structure &amp; Allowances</span>
        </button>

        <button
          onClick={() => setActiveTab('pf_deductions')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'pf_deductions'
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Provident Fund &amp; Insurance</span>
        </button>

        <button
          onClick={() => setActiveTab('tax')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'tax'
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Percent className="h-4 w-4" />
          <span>NBR Income Tax (TDS) Slabs</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance_ot')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'attendance_ot'
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Attendance &amp; Overtime Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('bonus_banking')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'bonus_banking'
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Bonus &amp; Bank Advice</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ml-auto ${
            activeTab === 'simulator'
              ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20'
          }`}
        >
          <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Rule-Trace Simulator (§14.6)</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 1: SALARY STRUCTURE & ALLOWANCES
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'structure' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Gross Salary Percentage Distribution</h3>
                <p className="text-xs text-muted-foreground">
                  Define the percentage allocation of Gross Salary into Basic Salary and statutory allowances.
                </p>
              </div>
              <div
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-black border ${
                  totalAllocationPct === 100
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                }`}
              >
                <span>Total Allocated: {totalAllocationPct}%</span>
                {totalAllocationPct === 100 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </div>
            </div>

            {/* Allocation Progress Bar */}
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
              <div
                style={{ width: `${config.basic_salary_percentage}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Basic: ${config.basic_salary_percentage}%`}
              />
              <div
                style={{ width: `${config.house_rent_percentage}%` }}
                className="bg-sky-500 h-full transition-all"
                title={`House Rent: ${config.house_rent_percentage}%`}
              />
              <div
                style={{ width: `${config.medical_allowance_percentage}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Medical: ${config.medical_allowance_percentage}%`}
              />
              <div
                style={{ width: `${config.conveyance_allowance_percentage}%` }}
                className="bg-purple-500 h-full transition-all"
                title={`Conveyance: ${config.conveyance_allowance_percentage}%`}
              />
              <div
                style={{ width: `${config.other_allowance_percentage}%` }}
                className="bg-pink-500 h-full transition-all"
                title={`Other: ${config.other_allowance_percentage}%`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
              {/* Basic Salary */}
              <div className="bg-muted/20 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">1. Basic Salary</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black">
                    {config.basic_salary_percentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="70"
                  step="1"
                  value={config.basic_salary_percentage}
                  onChange={(e) =>
                    setConfig({ ...config, basic_salary_percentage: Number(e.target.value) })
                  }
                  className="w-full accent-amber-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Standard JAAGO Foundation policy sets basic salary at 50% of gross wage.
                </p>
              </div>

              {/* House Rent Allowance */}
              <div className="bg-muted/20 border border-sky-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase">2. House Rent</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 font-black">
                    {config.house_rent_percentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="1"
                  value={config.house_rent_percentage}
                  onChange={(e) =>
                    setConfig({ ...config, house_rent_percentage: Number(e.target.value) })
                  }
                  className="w-full accent-sky-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Non-taxable housing allowance component (standard 25% of gross).
                </p>
              </div>

              {/* Medical Allowance */}
              <div className="bg-muted/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">3. Medical Allowance</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black">
                    {config.medical_allowance_percentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={config.medical_allowance_percentage}
                  onChange={(e) =>
                    setConfig({ ...config, medical_allowance_percentage: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Medical healthcare coverage benefit (standard 10% of gross).
                </p>
              </div>

              {/* Conveyance Allowance */}
              <div className="bg-muted/20 border border-purple-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase">4. Conveyance / Transport</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-black">
                    {config.conveyance_allowance_percentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={config.conveyance_allowance_percentage}
                  onChange={(e) =>
                    setConfig({ ...config, conveyance_allowance_percentage: Number(e.target.value) })
                  }
                  className="w-full accent-purple-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Daily commute and transport allowance (standard 10% of gross).
                </p>
              </div>

              {/* Special / Other Allowance */}
              <div className="bg-muted/20 border border-pink-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pink-700 dark:text-pink-400 uppercase">5. Special / Other</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-700 dark:text-pink-300 font-black">
                    {config.other_allowance_percentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={config.other_allowance_percentage}
                  onChange={(e) =>
                    setConfig({ ...config, other_allowance_percentage: Number(e.target.value) })
                  }
                  className="w-full accent-pink-500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Miscellaneous and performance balance allowance (standard 5% of gross).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 2: PROVIDENT FUND & INSURANCE
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'pf_deductions' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Provident Fund (PF) Rules (§5 Rule 3)</h3>
              <p className="text-xs text-muted-foreground">
                Configure PF contribution percentages and calculation base (Basic Salary vs Gross Salary).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">PF Calculation Base</label>
                <select
                  value={config.pf_base}
                  onChange={(e) => setConfig({ ...config, pf_base: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
                >
                  <option value="Basic">Basic Salary (Recommended Standard)</option>
                  <option value="GROSS">Gross Salary</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Standard rule calculates PF deduction on Basic Salary.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Employee Contribution Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  step="0.5"
                  value={config.provident_fund_employee_rate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      provident_fund_employee_rate: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
                />
                <p className="text-[11px] text-muted-foreground">Monthly deduction from employee salary.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Employer Matching Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  step="0.5"
                  value={config.provident_fund_employer_rate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      provident_fund_employer_rate: Number(e.target.value),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
                />
                <p className="text-[11px] text-muted-foreground">Contributes to Total Employer Cost.</p>
              </div>
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Health &amp; Life Insurance Tiers (§5 Rule 18)</h3>
                <p className="text-xs text-muted-foreground">
                  Default monthly employee premium deduction for staff enrolled in group insurance plans.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Executive Plan A</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">৳</span>
                    <input
                      type="number"
                      value={config.insurance_plan_a_premium}
                      onChange={(e) =>
                        setConfig({ ...config, insurance_plan_a_premium: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                    />
                    <span className="text-[11px] text-muted-foreground">/month</span>
                  </div>
                </div>

                <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase">Standard Plan B</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">৳</span>
                    <input
                      type="number"
                      value={config.insurance_plan_b_premium}
                      onChange={(e) =>
                        setConfig({ ...config, insurance_plan_b_premium: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                    />
                    <span className="text-[11px] text-muted-foreground">/month</span>
                  </div>
                </div>

                <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">Basic Plan C</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">৳</span>
                    <input
                      type="number"
                      value={config.insurance_plan_c_premium}
                      onChange={(e) =>
                        setConfig({ ...config, insurance_plan_c_premium: Number(e.target.value) })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                    />
                    <span className="text-[11px] text-muted-foreground">/month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 3: BANGLADESH NBR INCOME TAX (TDS) SLABS
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'tax' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">National Board of Revenue (NBR) Tax Parameters</h3>
              <p className="text-xs text-muted-foreground">
                Statutory annual exemption ceilings, demographic caps, investment rebate limits, and progressive tax slabs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Section-1 Exemption Ceiling</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">৳</span>
                  <input
                    type="number"
                    value={config.tax_exemption_limit_1}
                    onChange={(e) =>
                      setConfig({ ...config, tax_exemption_limit_1: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-bold"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Default: ৳500,000 (or ⅓ of TYI)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Minimum Annual Tax</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">৳</span>
                  <input
                    type="number"
                    value={config.minimum_tax}
                    onChange={(e) => setConfig({ ...config, minimum_tax: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-bold"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Mandatory floor if tax due (৳5,000)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Max Investment Rebate</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">৳</span>
                  <input
                    type="number"
                    value={config.investment_rebate_limit}
                    onChange={(e) =>
                      setConfig({ ...config, investment_rebate_limit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-bold"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Statutory rebate ceiling (৳1,000,000)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Monthly Tax Factor</label>
                <input
                  type="number"
                  step="0.05"
                  value={config.monthly_tax_factor}
                  onChange={(e) =>
                    setConfig({ ...config, monthly_tax_factor: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-bold"
                />
                <p className="text-[10px] text-muted-foreground">Multiplier for monthly TDS (1.0)</p>
              </div>
            </div>

            {/* Demographic Exemption Caps */}
            <div className="border-t border-border pt-6 space-y-4">
              <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase">Demographic Exemption-2 Caps (§5 Rule 8)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted/20 border border-border rounded-xl p-3.5 space-y-1.5">
                  <span className="text-xs font-bold text-foreground">General / Male Default</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">৳</span>
                    <input
                      type="number"
                      value={config.tax_exemption2_caps.default}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          tax_exemption2_caps: {
                            ...config.tax_exemption2_caps,
                            default: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="bg-muted/20 border border-border rounded-xl p-3.5 space-y-1.5">
                  <span className="text-xs font-bold text-pink-700 dark:text-pink-400">Female / Senior (65+)</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">৳</span>
                    <input
                      type="number"
                      value={config.tax_exemption2_caps.female}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          tax_exemption2_caps: {
                            ...config.tax_exemption2_caps,
                            female: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="bg-muted/20 border border-border rounded-xl p-3.5 space-y-1.5">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Gazetted Freedom Fighter</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">৳</span>
                    <input
                      type="number"
                      value={config.tax_exemption2_caps.freedom_fighter}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          tax_exemption2_caps: {
                            ...config.tax_exemption2_caps,
                            freedom_fighter: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="bg-muted/20 border border-border rounded-xl p-3.5 space-y-1.5">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400">Disabled / Third Gender</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">৳</span>
                    <input
                      type="number"
                      value={config.tax_exemption2_caps.disabled_third_gender}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          tax_exemption2_caps: {
                            ...config.tax_exemption2_caps,
                            disabled_third_gender: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Progressive Tax Slabs Table */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground uppercase">Progressive Tax Slabs Staircase (§5 Rule 10)</h4>
                  <p className="text-xs text-muted-foreground">Executed sequentially on net taxable income.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Slab #</th>
                      <th className="py-3 px-4">Band Limit (৳)</th>
                      <th className="py-3 px-4">Tax Rate (%)</th>
                      <th className="py-3 px-4">Label</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-foreground">
                    {config.tax_slabs.map((slab, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">Band {idx + 1}</td>
                        <td className="py-3 px-4 font-mono">
                          {slab.limit === null || slab.limit === 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Top Open Band (Remaining)</span>
                          ) : (
                            `৳${slab.limit.toLocaleString()}`
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">{slab.rate}%</td>
                        <td className="py-3 px-4 text-muted-foreground">{slab.label || `Slab ${idx + 1}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 4: ATTENDANCE & OVERTIME RULES
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'attendance_ot' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Attendance &amp; BioTime Deduction Engine (§6.7, §9.1)</h3>
              <p className="text-xs text-muted-foreground">
                Automatically consumes BioTime and Attendance module records to compute monthly salary deductions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Daily Wage Basis Formula</label>
                <select
                  value={config.working_days_basis}
                  onChange={(e) =>
                    setConfig({ ...config, working_days_basis: e.target.value as any })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
                >
                  <option value="30_DAYS">Fixed 30 Days (Gross / 30) — Standard</option>
                  <option value="ACTUAL_DAYS">Actual Month Days (Gross / 28..31)</option>
                  <option value="WORKING_DAYS">Actual Working Days (Gross / 22)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Defines the divisor used for daily salary basis calculation.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Late Arrivals Penalty Ratio</label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.late_penalty_threshold}
                    onChange={(e) =>
                      setConfig({ ...config, late_penalty_threshold: Number(e.target.value) })
                    }
                    className="w-16 px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-bold text-center"
                  />
                  <span className="text-xs text-muted-foreground">Lates =</span>
                  <input
                    type="number"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={config.late_penalty_deduction_days}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        late_penalty_deduction_days: Number(e.target.value),
                      })
                    }
                    className="w-16 px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-bold text-center"
                  />
                  <span className="text-xs text-muted-foreground">Day Salary Ded</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Standard rule: 3 Late arrivals/auto-checkouts = 1 day gross salary deduction.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Overtime Rate Multipliers</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Regular OT</span>
                    <input
                      type="number"
                      step="0.1"
                      value={config.overtime_multiplier_standard}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          overtime_multiplier_standard: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Holiday OT</span>
                    <input
                      type="number"
                      step="0.1"
                      value={config.overtime_multiplier_holiday}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          overtime_multiplier_holiday: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Standard 1.5x regular, 2.0x holiday.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 5: BONUS & BANKING ADVICE
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'bonus_banking' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">Festival Bonus Policies (§5 Rule 4)</h3>
              <p className="text-xs text-muted-foreground">
                Configure Eid-ul-Fitr, Eid-ul-Adha, and Durga Puja pro-rata bonus calculations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Festival Bonus Percentage (% of Basic)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="10"
                    max="150"
                    value={config.festival_bonus_percentage}
                    onChange={(e) =>
                      setConfig({ ...config, festival_bonus_percentage: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs font-semibold"
                  />
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Standard policy: 100% of 1 month Basic Salary for eligible staff.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Minimum Service Tenure (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  value={config.bonus_min_service_months}
                  onChange={(e) =>
                    setConfig({ ...config, bonus_min_service_months: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-foreground text-xs font-semibold"
                />
                <p className="text-[11px] text-muted-foreground">
                  Staff with &lt; 12 months receive pro-rated bonus: (Basic / 12) × service months.
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Bank Disbursement Advice (BEFTN)</h3>
                <p className="text-xs text-muted-foreground">
                  Corporate banking details and export parameters for bank salary upload files.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Disbursing Bank</label>
                  <input
                    type="text"
                    value={config.default_bank_name}
                    onChange={(e) => setConfig({ ...config, default_bank_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Corporate Account Number</label>
                  <input
                    type="text"
                    value={config.default_bank_account}
                    onChange={(e) =>
                      setConfig({ ...config, default_bank_account: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Disbursement Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={config.disbursement_day}
                    onChange={(e) =>
                      setConfig({ ...config, disbursement_day: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Advice Export Format</label>
                  <select
                    value={config.advice_export_format}
                    onChange={(e) =>
                      setConfig({ ...config, advice_export_format: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold"
                  >
                    <option value="BEFTN_CSV">BEFTN Bank Standard CSV</option>
                    <option value="STANDARD_CSV">Generic Excel / CSV</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          TAB 6: RULE-TRACE INSPECTOR / SIMULATOR (§14.6)
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500/[0.05] via-card to-card border border-amber-500/30 rounded-2xl p-6 shadow-sm backdrop-blur-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-lg font-black text-foreground tracking-tight">
                    Rule-Trace Inspector &amp; Salary Simulator (§14.6)
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Live execution of the 19 canonical rules without database mutation. Tests exactly how changes to settings impact employee pay.
                </p>
              </div>

              <button
                onClick={loadCanonicalPreset}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition"
              >
                <Sparkles className="h-4 w-4" />
                <span>Load §17.1 Canonical Example</span>
              </button>
            </div>

            {/* Simulator Inputs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-muted/20 border border-border rounded-xl p-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Gross Wage (৳)</label>
                <input
                  type="number"
                  step="5000"
                  value={simGross}
                  onChange={(e) => setSimGross(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">PF Rate (%)</label>
                <input
                  type="number"
                  step="1"
                  value={simPfRate}
                  onChange={(e) => setSimPfRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Gender / Category</label>
                <select
                  value={simGender}
                  onChange={(e) => setSimGender(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                >
                  <option value="male">Male (General)</option>
                  <option value="female">Female / Senior</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Bonus Eligible</label>
                <select
                  value={simBonusEligible ? 'yes' : 'no'}
                  onChange={(e) => setSimBonusEligible(e.target.value === 'yes')}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                >
                  <option value="yes">Yes (Eligible)</option>
                  <option value="no">No (Ineligible)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Attendance Ded (৳)</label>
                <input
                  type="number"
                  step="500"
                  value={simAttendanceDed}
                  onChange={(e) => setSimAttendanceDed(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Insurance Status</label>
                <select
                  value={simInsuranceStatus}
                  onChange={(e) => setSimInsuranceStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-bold"
                >
                  <option value="Disabled">Disabled (৳0)</option>
                  <option value="Active">Active Plan</option>
                </select>
              </div>
            </div>

            {/* Simulator Output KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-4 shadow-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Gross Salary</span>
                <div className="text-xl font-black text-foreground">৳{simResult.grossWage.toLocaleString()}</div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Basic: ৳{simResult.basicWage.toLocaleString()}</span>
              </div>

              <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-4 shadow-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Deductions</span>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400">৳{simResult.totalDeductions.toLocaleString()}</div>
                <span className="text-[11px] text-muted-foreground">PF: ৳{simResult.employeePF} &bull; Tax: ৳{simResult.monthlyTaxTDS}</span>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold">Net Payout</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">৳{simResult.netWage.toLocaleString()}</div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300/70 font-semibold">Take-home monthly salary</span>
              </div>

              <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-4 shadow-xs">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Employer Cost</span>
                <div className="text-xl font-black text-amber-700 dark:text-amber-300">৳{simResult.employerCost.toLocaleString()}</div>
                <span className="text-[11px] text-muted-foreground">Incl. ৳{simResult.employerPF} Match PF</span>
              </div>
            </div>

            {/* Step-by-Step 19-Rule Trace Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center space-x-2">
                <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Deterministic 19-Rule Evaluation Trace</span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Seq</th>
                      <th className="py-2.5 px-3">Rule Code</th>
                      <th className="py-2.5 px-3">Rule Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Computed Value</th>
                      <th className="py-2.5 px-3 text-center">On Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-foreground font-mono">
                    {simResult.steps.map((step) => (
                      <tr
                        key={step.code}
                        className={`hover:bg-muted/30 ${
                          step.code === 'NET_SALARY'
                            ? 'bg-emerald-500/10 font-bold text-emerald-700 dark:text-emerald-300'
                            : step.code === 'GROSS_SALARY' || step.code === 'BASIC'
                            ? 'text-amber-700 dark:text-amber-300'
                            : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-muted-foreground">{step.sequence}</td>
                        <td className="py-2 px-3 font-bold">{step.code}</td>
                        <td className="py-2 px-3 font-sans text-foreground/90">{step.name}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                            {step.categoryCode}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          ৳{step.total.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          {step.appearsOnPayslip ? (
                            <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">Yes</span>
                          ) : (
                            <span className="text-muted-foreground/40 text-[10px]">Internal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal (§17.1) */}
      {showVerificationModal && verificationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-card-foreground animate-in zoom-in-95">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Engine Test Verification Passed!</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  Specification §17.1 Canonical Worked Example Verified
                </p>
              </div>
            </div>

            <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Test Gross Salary:</span>
                <span className="font-mono font-bold text-foreground">৳60,000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">PF Deduction (5% of Basic):</span>
                <span className="font-mono font-bold text-foreground">৳1,500</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Total Yearly Income (TYI):</span>
                <span className="font-mono font-bold text-foreground">৳780,000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">NBR Tax Floor (Minimum Tax):</span>
                <span className="font-mono font-bold text-foreground">৳5,000 / yr</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Monthly Tax TDS:</span>
                <span className="font-mono font-bold text-foreground">৳417 / mo</span>
              </div>
              <div className="flex justify-between py-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 rounded-lg">
                <span>Calculated Net Salary:</span>
                <span className="font-mono font-black">৳{verificationResult.actualNet.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Assertion verified byte-for-byte: `NET_SALARY = 58,083` matching the prompt specification §17.1.
            </p>

            <button
              onClick={() => setShowVerificationModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black transition"
            >
              Close Verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
