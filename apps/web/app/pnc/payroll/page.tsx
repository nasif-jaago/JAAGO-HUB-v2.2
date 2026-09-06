'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Users,
  FileText,
  Calendar,
  Building2,
  ArrowRight,
  Calculator,
  Plus,
} from 'lucide-react';
import {
  fetchEmployeesFromSupabase,
  FullEmployeeProfile,
} from '@/lib/supabase-employees';
import {
  getPayrollConfig,
  getSavedPayRuns,
  calculateEmployeeSalary,
  PayrollConfig,
  PayRun,
  INITIAL_PAYROLL_CONFIG,
} from '@/lib/payroll-engine';

export default function PayrollOverviewPage() {
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);
  const [config, setConfig] = useState<PayrollConfig>(INITIAL_PAYROLL_CONFIG);

  useEffect(() => {
    async function loadData() {
      try {
        const empList = await fetchEmployeesFromSupabase();
        if (empList) setEmployees(empList);
        const runs = getSavedPayRuns();
        setPayRuns(runs);
        const cfg = getPayrollConfig();
        setConfig(cfg);
      } catch (err) {
        console.warn('Error loading payroll hub data:', err);
      }
    }
    loadData();

    // Listen for config changes
    const onConfigChange = () => {
      setConfig(getPayrollConfig());
    };
    window.addEventListener('jaago_payroll_config_changed', onConfigChange);
    return () => window.removeEventListener('jaago_payroll_config_changed', onConfigChange);
  }, []);

  // Compute live payroll stats across active employees using active config
  const stats = useMemo(() => {
    const active = employees.filter((e) => !e.isArchived && e.status !== 'Archived');
    let totalGross = 0;
    let totalNet = 0;
    let totalPF = 0;
    let totalTax = 0;
    let totalAllowances = 0;

    const deptMap: Record<string, { count: number; gross: number; net: number }> = {};

    active.forEach((emp) => {
      const calc = calculateEmployeeSalary(emp, config);
      totalGross += calc.grossWage;
      totalNet += calc.netWage;
      totalPF += calc.employeePF + calc.employerPF;
      totalTax += calc.monthlyTaxTDS;
      totalAllowances += calc.totalAllowances;

      const dept = emp.department || 'General Operations';
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, gross: 0, net: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].gross += calc.grossWage;
      deptMap[dept].net += calc.netWage;
    });

    const avgSalary = active.length > 0 ? Math.round(totalGross / active.length) : 0;
    const sortedDepts = Object.entries(deptMap).sort((a, b) => b[1].gross - a[1].gross);

    return {
      activeCount: active.length,
      totalGross,
      totalNet,
      totalPF,
      totalTax,
      totalAllowances,
      avgSalary,
      departments: sortedDepts,
    };
  }, [employees, config]);

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-card to-card border border-amber-500/25 p-6 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-xs uppercase font-bold tracking-widest text-amber-600 dark:text-amber-400">
                PEOPLE &amp; CULTURE &bull; PAYROLL COMMAND CENTER
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">
              JAAGO PAY Overview &amp; Intelligence
            </h1>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Live compensation metrics, batch pay run management, salary contracts, and automated payslip generation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pnc/settings/payroll"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-card hover:bg-muted text-foreground border border-border shadow-xs transition"
            >
              <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Payroll Configuration</span>
            </Link>
            <Link
              href="/pnc/payroll/pay-runs"
              className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Process Pay Run</span>
            </Link>
          </div>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-border">
          <div className="bg-background/80 dark:bg-muted/30 border border-amber-500/30 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Monthly Gross Bill</span>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400">
              ৳{stats.totalGross.toLocaleString()}
            </div>
            <span className="text-[10px] text-muted-foreground/70">Estimated salary expenditure</span>
          </div>

          <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">Net Disbursable</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              ৳{stats.totalNet.toLocaleString()}
            </div>
            <span className="text-[10px] text-muted-foreground/70">Take-home payout pool</span>
          </div>

          <div className="bg-background/80 dark:bg-muted/30 border border-sky-500/30 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-sky-700 dark:text-sky-400 uppercase font-bold">PF Reserve Pool</span>
            <div className="text-lg font-black text-sky-600 dark:text-sky-400">
              ৳{stats.totalPF.toLocaleString()}
            </div>
            <span className="text-[10px] text-muted-foreground/70">Employee + Matching Employer</span>
          </div>

          <div className="bg-background/80 dark:bg-muted/30 border border-purple-500/30 rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-purple-700 dark:text-purple-400 uppercase font-bold">Tax Withheld (TDS)</span>
            <div className="text-lg font-black text-purple-600 dark:text-purple-400">
              ৳{stats.totalTax.toLocaleString()}
            </div>
            <span className="text-[10px] text-muted-foreground/70">Monthly NBR deduction</span>
          </div>

          <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Staff On Payroll</span>
            <div className="text-lg font-black text-foreground">
              {stats.activeCount} <span className="text-xs font-normal text-muted-foreground">Active</span>
            </div>
            <span className="text-[10px] text-muted-foreground/70">Audited workforce profiles</span>
          </div>

          <div className="bg-background/80 dark:bg-muted/30 border border-border rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Average Salary</span>
            <div className="text-lg font-black text-amber-600 dark:text-amber-300">
              ৳{stats.avgSalary.toLocaleString()}
            </div>
            <span className="text-[10px] text-muted-foreground/70">Per employee monthly</span>
          </div>
        </div>
      </div>

      {/* Quick Access Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/pnc/payroll/contracts"
          className="group bg-card hover:bg-muted/30 border border-border hover:border-amber-500/50 rounded-2xl p-5 shadow-xs transition"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
              <Users className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="text-sm font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
            Salary Contracts
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Manage individual compensation, wage types, tax exemptions, and salary structures.
          </p>
        </Link>

        <Link
          href="/pnc/payroll/pay-runs"
          className="group bg-card hover:bg-muted/30 border border-border hover:border-sky-500/50 rounded-2xl p-5 shadow-xs transition"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-110 transition">
              <Calendar className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-sky-500 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="text-sm font-bold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
            Monthly Pay Runs
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Execute batch salary cycles, auto-apply attendance deductions, and export BEFTN advice.
          </p>
        </Link>

        <Link
          href="/pnc/payroll/payslips"
          className="group bg-card hover:bg-muted/30 border border-border hover:border-emerald-500/50 rounded-2xl p-5 shadow-xs transition"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
              <FileText className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
            Employee Payslips
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            View, print, and download official JAAGO Foundation voucher salary slips with QR verification.
          </p>
        </Link>

        <Link
          href="/pnc/settings/payroll"
          className="group bg-card hover:bg-muted/30 border border-border hover:border-purple-500/50 rounded-2xl p-5 shadow-xs transition"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition">
              <Calculator className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-500 group-hover:translate-x-1 transition" />
          </div>
          <h3 className="text-sm font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
            Rule-Trace Simulator
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Inspect step-by-step 19 canonical rule calculations and test hypothetical salary packages.
          </p>
        </Link>
      </div>

      {/* Main Content Grid: Department Breakdown & Recent Pay Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department-wise Payroll Cost Breakdown */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Department Salary Distribution
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {stats.departments.length} Departments
            </span>
          </div>

          <div className="space-y-3.5 pt-2">
            {stats.departments.slice(0, 7).map(([dept, data]) => {
              const pct = stats.totalGross > 0 ? (data.gross / stats.totalGross) * 100 : 0;
              return (
                <div key={dept} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{dept}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-muted-foreground text-[11px]">{data.count} Staff</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        ৳{data.gross.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Pay Runs Summary Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Recent Pay Runs
                </h3>
              </div>
              <Link
                href="/pnc/payroll/pay-runs"
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold"
              >
                View All &rarr;
              </Link>
            </div>

            {payRuns.length === 0 ? (
              <div className="bg-muted/30 border border-dashed border-border rounded-xl p-6 text-center space-y-3">
                <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  No payroll cycles processed yet for this fiscal year.
                </p>
                <Link
                  href="/pnc/payroll/pay-runs"
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Pay Run</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {payRuns.slice(0, 4).map((run) => (
                  <Link
                    key={run.id}
                    href={`/pnc/payroll/pay-runs?runId=${run.id}`}
                    className="block bg-muted/40 hover:bg-muted border border-border rounded-xl p-3 transition space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{run.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          run.status === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30'
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{run.totalEmployees} Staff</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        ৳{run.totalNetPayout.toLocaleString()} Net
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-1 mt-4">
            <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-black">
              Payroll Policy Active
            </span>
            <p className="text-xs text-foreground/80">
              Basic 50% &bull; PF {config.provident_fund_employee_rate}% &bull; Tax Slabs NBR Bangladesh
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
