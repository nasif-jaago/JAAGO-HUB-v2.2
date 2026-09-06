'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Download,
  Eye,
  Calculator,
  Sparkles,
  X,
} from 'lucide-react';
import {
  fetchEmployeesFromSupabase,
  FullEmployeeProfile,
} from '@/lib/supabase-employees';
import {
  getPayrollConfig,
  calculateEmployeeSalary,
  PayrollConfig,
  INITIAL_PAYROLL_CONFIG,
  SalaryCalculationResult,
} from '@/lib/payroll-engine';

export default function PayrollContractsPage() {
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [config, setConfig] = useState<PayrollConfig>(INITIAL_PAYROLL_CONFIG);

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [wageTypeFilter, setWageTypeFilter] = useState('ALL');
  const [contractTypeFilter, setContractTypeFilter] = useState('ALL');

  // Selected employee for detailed breakdown modal
  const [selectedEmp, setSelectedEmp] = useState<FullEmployeeProfile | null>(null);
  const [selectedCalc, setSelectedCalc] = useState<SalaryCalculationResult | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const empList = await fetchEmployeesFromSupabase();
        if (empList) setEmployees(empList);
        const cfg = getPayrollConfig();
        setConfig(cfg);
      } catch (err) {
        console.warn('Failed to load contracts:', err);
      }
    }
    load();

    const onConfigChange = () => {
      setConfig(getPayrollConfig());
    };
    window.addEventListener('jaago_payroll_config_changed', onConfigChange);
    return () => window.removeEventListener('jaago_payroll_config_changed', onConfigChange);
  }, []);

  // Filter lists
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.department && set.add(e.department));
    return Array.from(set).sort();
  }, [employees]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.branch && set.add(e.branch));
    return Array.from(set).sort();
  }, [employees]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (emp.isArchived || emp.status === 'Archived') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesCode = emp.code.toLowerCase().includes(q);
        const matchesEmail = (emp.workEmail || '').toLowerCase().includes(q);
        const matchesDesig = (emp.designation || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesEmail && !matchesDesig) return false;
      }

      if (deptFilter !== 'ALL' && emp.department !== deptFilter) return false;
      if (branchFilter !== 'ALL' && emp.branch !== branchFilter) return false;
      if (wageTypeFilter !== 'ALL' && emp.wageType !== wageTypeFilter) return false;
      if (contractTypeFilter !== 'ALL' && emp.contractType !== contractTypeFilter) return false;

      return true;
    });
  }, [employees, searchQuery, deptFilter, branchFilter, wageTypeFilter, contractTypeFilter]);

  const handleOpenBreakdown = (emp: FullEmployeeProfile) => {
    setSelectedEmp(emp);
    const calc = calculateEmployeeSalary(emp, config);
    setSelectedCalc(calc);
  };

  const exportContractsCSV = () => {
    const headers = [
      'Employee Code',
      'Employee Name',
      'Designation',
      'Department',
      'Branch',
      'Wage Type',
      'Contract Type',
      'Gross Salary (BDT)',
      'Basic Salary (BDT)',
      'House Rent (BDT)',
      'Medical Allowance (BDT)',
      'Conveyance Allowance (BDT)',
      'PF Deduction (BDT)',
      'Tax TDS (BDT)',
      'Net Estimated Pay (BDT)',
      'Bank Name',
      'Bank Account',
    ];

    const rows = filteredEmployees.map((emp) => {
      const c = calculateEmployeeSalary(emp, config);
      return [
        `"${emp.code}"`,
        `"${emp.name}"`,
        `"${emp.designation}"`,
        `"${emp.department}"`,
        `"${emp.branch}"`,
        `"${emp.wageType || 'Fixed'}"`,
        `"${emp.contractType || 'Full Time'}"`,
        c.grossWage,
        c.basicWage,
        c.houseRent,
        c.medicalAllowance,
        c.conveyanceAllowance,
        c.employeePF,
        c.monthlyTaxTDS,
        c.netWage,
        `"${emp.bankName || ''}"`,
        `"${emp.bankAccountNumber || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JAAGO_Salary_Contracts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              JAAGO PAY &bull; Compensation &amp; Contracts
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">
            Employee Salary Contracts &amp; Packages
          </h1>
          <p className="text-xs text-muted-foreground">
            Real-time calculation of Basic, Allowances, PF, and NBR Tax driven dynamically by the active Payroll Configuration.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportContractsCSV}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-card hover:bg-muted text-foreground border border-border shadow-xs transition"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Contracts CSV</span>
          </button>
          <Link
            href="/pnc/settings/payroll"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <Calculator className="h-4 w-4" />
            <span>Adjust Global Rules</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search employee by name, code, designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
        >
          <option value="ALL">All Departments ({departments.length})</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
        >
          <option value="ALL">All Branches ({branches.length})</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={wageTypeFilter}
          onChange={(e) => setWageTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
        >
          <option value="ALL">All Wage Types</option>
          <option value="Fixed">Fixed Wage</option>
          <option value="Hourly">Hourly Wage</option>
        </select>

        <select
          value={contractTypeFilter}
          onChange={(e) => setContractTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
        >
          <option value="ALL">All Contract Types</option>
          <option value="Full Time">Full Time</option>
          <option value="Part Time">Part Time</option>
          <option value="Contractual">Contractual</option>
          <option value="Probationary">Probationary</option>
        </select>

        <div className="text-xs text-muted-foreground px-2 font-mono">
          Showing {filteredEmployees.length} of {employees.length} contracts
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Department &amp; Branch</th>
                <th className="py-3.5 px-4">Contract Type</th>
                <th className="py-3.5 px-4 text-right">Gross Salary</th>
                <th className="py-3.5 px-4 text-right">Basic ({config.basic_salary_percentage}%)</th>
                <th className="py-3.5 px-4 text-right">Allowances</th>
                <th className="py-3.5 px-4 text-right">PF ({config.provident_fund_employee_rate}%)</th>
                <th className="py-3.5 px-4 text-right">Tax (TDS)</th>
                <th className="py-3.5 px-4 text-right">Net Take-Home</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {filteredEmployees.map((emp) => {
                const calc = calculateEmployeeSalary(emp, config);
                return (
                  <tr key={emp.id || emp.code} className="hover:bg-muted/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {emp.avatarUrl ? (
                          <Image
                            src={emp.avatarUrl}
                            alt={emp.name}
                            width={32}
                            height={32}
                            className="rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                            {emp.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-foreground text-xs">{emp.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{emp.code} &bull; {emp.designation}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground/90">{emp.department || 'General Operations'}</div>
                      <div className="text-[10px] text-muted-foreground">{emp.branch || 'Head Office'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                        {emp.contractType || 'Full Time'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      ৳{calc.grossWage.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                      ৳{calc.basicWage.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      ৳{calc.totalAllowances.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                      {calc.employeePF > 0 ? `৳${calc.employeePF.toLocaleString()}` : <span className="text-muted-foreground/40">Exempt</span>}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                      {calc.monthlyTaxTDS > 0 ? `৳${calc.monthlyTaxTDS.toLocaleString()}` : <span className="text-muted-foreground/40">৳0</span>}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      ৳{calc.netWage.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenBreakdown(emp)}
                        className="p-1.5 rounded-lg bg-muted hover:bg-amber-500/20 text-muted-foreground hover:text-amber-700 dark:hover:text-amber-300 border border-border transition"
                        title="View Detailed Salary Breakdown"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Salary Breakdown Drawer / Modal */}
      {selectedEmp && selectedCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-card-foreground animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                  {selectedEmp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">{selectedEmp.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {selectedEmp.code} &bull; {selectedEmp.designation} &bull; {selectedEmp.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Compensation Structure Grid */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              {/* Earnings Section */}
              <div className="space-y-3 bg-muted/20 border border-border rounded-xl p-4">
                <div className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                  Monthly Earnings
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Gross Wage:</span>
                    <span className="font-mono font-bold text-foreground">৳{selectedCalc.grossWage.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50 text-amber-700 dark:text-amber-400">
                    <span>Basic Salary ({config.basic_salary_percentage}%):</span>
                    <span className="font-mono font-bold">৳{selectedCalc.basicWage.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">House Rent ({config.house_rent_percentage}%):</span>
                    <span className="font-mono text-foreground">৳{selectedCalc.houseRent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Medical Allowance ({config.medical_allowance_percentage}%):</span>
                    <span className="font-mono text-foreground">৳{selectedCalc.medicalAllowance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Conveyance ({config.conveyance_allowance_percentage}%):</span>
                    <span className="font-mono text-foreground">৳{selectedCalc.conveyanceAllowance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Special / Other ({config.other_allowance_percentage}%):</span>
                    <span className="font-mono text-foreground">৳{selectedCalc.otherAllowance.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="space-y-3 bg-muted/20 border border-border rounded-xl p-4">
                <div className="text-xs font-bold uppercase text-rose-700 dark:text-rose-400 tracking-wider">
                  Monthly Statutory Deductions
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">PF Deduction ({config.provident_fund_employee_rate}%):</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">৳{selectedCalc.employeePF.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">NBR Income Tax (TDS):</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">৳{selectedCalc.monthlyTaxTDS.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Insurance Premium:</span>
                    <span className="font-mono text-foreground">৳{selectedCalc.insurancePremium.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Attendance Deductions:</span>
                    <span className="font-mono text-foreground">৳{selectedCalc.attendanceDeduction.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 text-rose-700 dark:text-rose-400 font-bold">
                    <span>Total Deductions:</span>
                    <span className="font-mono font-black">৳{selectedCalc.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Payout Banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-bold">Net Monthly Disbursable</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ৳{selectedCalc.netWage.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Employer Total Cost</span>
                <div className="text-base font-black text-amber-700 dark:text-amber-300">
                  ৳{selectedCalc.employerCost.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>Calculated dynamically in real-time from active Payroll Configuration.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
