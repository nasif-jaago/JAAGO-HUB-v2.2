'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Printer,
} from 'lucide-react';
import {
  FinanceAdvanceRequest,
  FinanceLiquidationForm,
  getFinanceAdvanceRequests,
  getFinanceLiquidations,
} from '@/lib/supabase-finance';

export default function FinanceReportsPage() {
  const [advances, setAdvances] = useState<FinanceAdvanceRequest[]>([]);
  const [liquidations, setLiquidations] = useState<FinanceLiquidationForm[]>([]);
  const [selectedTab, setSelectedTab] = useState<'AGING' | 'DEPARTMENT' | 'BUDGET_LINES'>('AGING');

  useEffect(() => {
    Promise.all([getFinanceAdvanceRequests(), getFinanceLiquidations()]).then(
      ([advList, liqList]) => {
        setAdvances(advList);
        setLiquidations(liqList);
      }
    );
  }, []);

  // 1. Advance Aging Report (Advances that do not have a settled liquidation)
  const agingReport = useMemo(() => {
    const settledCodes = new Set(
      liquidations
        .filter((l) => l.status === 'Settled' || l.status === 'Approved')
        .map((l) => l.linkedAdvanceCode)
        .filter(Boolean)
    );

    const now = new Date().getTime();

    return advances
      .filter((a) => a.status === 'Approved' && !settledCodes.has(a.expenseCode))
      .map((a) => {
        const reqDate = new Date(a.cashRequiredDate || a.requestDate).getTime();
        const diffDays = Math.max(0, Math.floor((now - reqDate) / (1000 * 60 * 60 * 24)));

        let bucket: '< 15 Days' | '15 - 30 Days' | '> 30 Days Overdue' = '< 15 Days';
        if (diffDays > 30) bucket = '> 30 Days Overdue';
        else if (diffDays >= 15) bucket = '15 - 30 Days';

        return {
          ...a,
          diffDays,
          bucket,
        };
      })
      .sort((a, b) => b.diffDays - a.diffDays);
  }, [advances, liquidations]);

  // 2. Department-wise Expenditure Summary
  const departmentBreakdown = useMemo(() => {
    const map: Record<
      string,
      { department: string; advanceTotal: number; liquidationTotal: number; count: number }
    > = {};

    advances.forEach((a) => {
      const dept = a.department || 'Other';
      if (!map[dept]) {
        map[dept] = { department: dept, advanceTotal: 0, liquidationTotal: 0, count: 0 };
      }
      map[dept].advanceTotal += a.totalAmount || 0;
      map[dept].count += 1;
    });

    liquidations.forEach((l) => {
      const dept = l.department || 'Other';
      if (!map[dept]) {
        map[dept] = { department: dept, advanceTotal: 0, liquidationTotal: 0, count: 0 };
      }
      map[dept].liquidationTotal += l.totalActualExpenses || 0;
    });

    return Object.values(map).sort((a, b) => b.advanceTotal - a.advanceTotal);
  }, [advances, liquidations]);

  // 3. Budget Line Utilization
  const budgetLineBreakdown = useMemo(() => {
    let travel = 0;
    let accommodation = 0;
    let perDiem = 0;
    let conveyance = 0;
    let program = 0;

    liquidations.forEach((l) => {
      travel += l.longTravelSubtotal || 0;
      accommodation += l.accommodationSubtotal || 0;
      perDiem += l.perDiemSubtotal || 0;
      conveyance += l.localConveyanceSubtotal || 0;
      program += l.programExpensesSubtotal || 0;
    });

    const total = travel + accommodation + perDiem + conveyance + program || 1;

    return [
      { name: 'BL-501 (Long Travel)', amount: travel, pct: ((travel / total) * 100).toFixed(1) },
      { name: 'BL-502 (Accommodation)', amount: accommodation, pct: ((accommodation / total) * 100).toFixed(1) },
      { name: 'BL-503 (Per Diem)', amount: perDiem, pct: ((perDiem / total) * 100).toFixed(1) },
      { name: 'BL-504 (Local Conveyance)', amount: conveyance, pct: ((conveyance / total) * 100).toFixed(1) },
      { name: 'BL-505 (Program Expenses)', amount: program, pct: ((program / total) * 100).toFixed(1) },
    ];
  }, [liquidations]);

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (selectedTab === 'AGING') {
      csvContent += 'Expense Code,Employee Name,Department,Purpose,Required Date,Days Elapsed,Bucket,Amount (BDT)\n';
      agingReport.forEach((r) => {
        csvContent += `"${r.expenseCode}","${r.employeeName}","${r.department}","${r.title}","${r.cashRequiredDate}",${r.diffDays},"${r.bucket}",${r.totalAmount}\n`;
      });
    } else if (selectedTab === 'DEPARTMENT') {
      csvContent += 'Department,Advance Total (BDT),Audited Spent (BDT),Requisitions Count\n';
      departmentBreakdown.forEach((d) => {
        csvContent += `"${d.department}",${d.advanceTotal},${d.liquidationTotal},${d.count}\n`;
      });
    } else {
      csvContent += 'Budget Line,Verified Actual Amount (BDT),Percentage (%)\n';
      budgetLineBreakdown.forEach((b) => {
        csvContent += `"${b.name}",${b.amount},${b.pct}%\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JAAGO_Finance_Report_${selectedTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200 text-foreground">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Finance &amp; Expense Reports
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
              Audit Intelligence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Reconciliation aging, department-wise cost allocations, and budget line utilization reports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ── REPORT SELECTOR TABS ── */}
      <div className="flex items-center space-x-2 bg-muted/40 p-1.5 rounded-2xl w-fit border border-border">
        <button
          onClick={() => setSelectedTab('AGING')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedTab === 'AGING'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Unsettled Advance Aging ({agingReport.length})
        </button>
        <button
          onClick={() => setSelectedTab('DEPARTMENT')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedTab === 'DEPARTMENT'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Department Cost Breakdown
        </button>
        <button
          onClick={() => setSelectedTab('BUDGET_LINES')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            selectedTab === 'BUDGET_LINES'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Budget Line Utilization
        </button>
      </div>

      {/* ── TAB 1: ADVANCE AGING ── */}
      {selectedTab === 'AGING' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-card border border-border">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                &lt; 15 Days (Current Advances)
              </span>
              <div className="text-xl font-black text-foreground font-mono pt-1">
                {agingReport.filter((r) => r.bucket === '< 15 Days').length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-amber-500/30 bg-amber-500/5">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                15 &ndash; 30 Days (Adjustment Reminder)
              </span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono pt-1">
                {agingReport.filter((r) => r.bucket === '15 - 30 Days').length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-rose-500/30 bg-rose-500/5">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                &gt; 30 Days (Overdue Alert)
              </span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono pt-1">
                {agingReport.filter((r) => r.bucket === '> 30 Days Overdue').length}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground text-[10px] font-black uppercase tracking-wider border-b border-border">
                    <th className="py-3 px-4">Expense Code</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Required Date</th>
                    <th className="py-3 px-4 text-center">Days Elapsed</th>
                    <th className="py-3 px-4 text-center">Aging Status</th>
                    <th className="py-3 px-4 text-right">Advance (BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {agingReport.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {item.expenseCode}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">{item.employeeName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{item.department}</td>
                      <td className="py-3 px-4 max-w-xs truncate text-foreground">{item.title}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {item.cashRequiredDate || item.requestDate}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {item.diffDays} days
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            item.bucket === '> 30 Days Overdue'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : item.bucket === '15 - 30 Days'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {item.bucket}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        ৳ {item.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {agingReport.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground italic">
                        All approved advances have been settled! No outstanding advance aging records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: DEPARTMENT BREAKDOWN ── */}
      {selectedTab === 'DEPARTMENT' && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground text-[10px] font-black uppercase tracking-wider border-b border-border">
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Requisitions Logged</th>
                  <th className="py-3 px-4 text-right">Total Advance Disbursed (BDT)</th>
                  <th className="py-3 px-4 text-right">Total Audited Expenditures (BDT)</th>
                  <th className="py-3 px-4 text-right">Net Settlement Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {departmentBreakdown.map((dept, idx) => {
                  const variance = dept.liquidationTotal - dept.advanceTotal;
                  return (
                    <tr key={idx} className="hover:bg-muted/30 transition">
                      <td className="py-3 px-4 font-bold text-foreground">{dept.department}</td>
                      <td className="py-3 px-4 text-center font-mono">{dept.count}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        ৳ {dept.advanceTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        ৳ {dept.liquidationTotal.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {variance > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            +৳ {Math.abs(variance).toLocaleString()} (Reimbursed)
                          </span>
                        ) : variance < 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            -৳ {Math.abs(variance).toLocaleString()} (Refunded)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Balanced</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: BUDGET LINE BREAKDOWN ── */}
      {selectedTab === 'BUDGET_LINES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetLineBreakdown.map((b, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{b.name}</span>
                  <span className="font-mono text-xs font-black text-primary">{b.pct}%</span>
                </div>
                <div className="text-xl font-black font-mono text-foreground">
                  ৳ {b.amount.toLocaleString()}
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, Number(b.pct)))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
