'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Printer,
  DollarSign,
  Calendar,
  QrCode,
  X,
  Eye,
} from 'lucide-react';
import {
  fetchEmployeesFromSupabase,
} from '@/lib/supabase-employees';
import {
  getPayrollConfig,
  getSavedPayRuns,
  savePayRuns,
  generatePayRunBatch,
  numberToWordsBDT,
  PayRun,
  PayRunItem,
} from '@/lib/payroll-engine';

export default function PayslipsPage() {
  const [payRuns, setPayRuns] = useState<PayRun[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayRunFilter, setSelectedPayRunFilter] = useState('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  // Selected Payslip Item for Printable Voucher Modal
  const [selectedItem, setSelectedItem] = useState<PayRunItem | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayRun | null>(null);

  const voucherPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const empList = await fetchEmployeesFromSupabase();
        let runs = getSavedPayRuns();
        if (runs.length === 0 && empList && empList.length > 0) {
          const cfg = getPayrollConfig();
          const sepRun = generatePayRunBatch(9, 2026, empList, cfg, { applyAttendanceDeductions: true });
          runs = [sepRun];
          savePayRuns(runs);
        }
        setPayRuns(runs);
      } catch (err) {
        console.warn('Failed to load payslips:', err);
      }
    }
    load();
  }, []);

  // Collect all line items across pay runs
  const allPayslips = useMemo(() => {
    const list: { item: PayRunItem; run: PayRun }[] = [];
    payRuns.forEach((run) => {
      run.items.forEach((item) => {
        list.push({ item, run });
      });
    });
    return list;
  }, [payRuns]);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    allPayslips.forEach(({ item }) => item.department && set.add(item.department));
    return Array.from(set).sort();
  }, [allPayslips]);

  // Filtered payslips
  const filteredPayslips = useMemo(() => {
    return allPayslips.filter(({ item, run }) => {
      if (selectedPayRunFilter !== 'ALL' && run.id !== selectedPayRunFilter) return false;
      if (selectedDeptFilter !== 'ALL' && item.department !== selectedDeptFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const mName = item.employeeName.toLowerCase().includes(q);
        const mCode = item.employeeCode.toLowerCase().includes(q);
        const mSlip = item.payslipNumber.toLowerCase().includes(q);
        const mDesig = item.designation.toLowerCase().includes(q);
        if (!mName && !mCode && !mSlip && !mDesig) return false;
      }
      return true;
    });
  }, [allPayslips, selectedPayRunFilter, selectedDeptFilter, searchQuery]);

  const handleOpenVoucher = (item: PayRunItem, run: PayRun) => {
    setSelectedItem(item);
    setSelectedRun(run);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              JAAGO PAY &bull; Payslips &amp; Salary Vouchers
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">
            Employee Salary Payslips
          </h1>
          <p className="text-xs text-muted-foreground">
            View, print, and export official JAAGO Foundation payslip vouchers with QR code verification.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/pnc/payroll/pay-runs"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-card hover:bg-muted text-foreground border border-border shadow-xs transition"
          >
            <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>Pay Run Cycles</span>
          </Link>
          <Link
            href="/pnc/settings/payroll"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <DollarSign className="h-4 w-4" />
            <span>Payroll Settings</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search payslip by staff name, ID, or slip number (PS-...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
          />
        </div>

        <select
          value={selectedPayRunFilter}
          onChange={(e) => setSelectedPayRunFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
        >
          <option value="ALL">All Pay Run Cycles ({payRuns.length})</option>
          {payRuns.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={selectedDeptFilter}
          onChange={(e) => setSelectedDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-500"
        >
          <option value="ALL">All Departments ({departments.length})</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <span className="text-xs text-muted-foreground font-mono">
          Showing {filteredPayslips.length} Payslips
        </span>
      </div>

      {/* Payslips Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Payslip #</th>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Pay Period</th>
                <th className="py-3.5 px-4 text-right">Gross (৳)</th>
                <th className="py-3.5 px-4 text-right">Deductions (৳)</th>
                <th className="py-3.5 px-4 text-right">Net Payable (৳)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {filteredPayslips.map(({ item, run }) => (
                <tr key={item.id} className="hover:bg-muted/30 transition">
                  <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {item.payslipNumber}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-foreground">{item.employeeName}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {item.employeeCode} &bull; {item.designation} &bull; {item.department}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-foreground/90">{run.name}</div>
                    <div className="text-[10px] text-muted-foreground">{run.periodStart} ~ {run.periodEnd}</div>
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                    ৳{item.grossWage.toLocaleString()}
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">
                    ৳{item.totalDeductions.toLocaleString()}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    ৳{item.netWage.toLocaleString()}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        run.status === 'Paid'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenVoucher(item, run)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition text-xs font-bold"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Voucher</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Printable JAAGO Foundation Payslip Voucher Modal */}
      {selectedItem && selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-6 animate-in zoom-in-95 my-8 print:p-0 print:shadow-none">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                <FileText className="h-4 w-4 text-amber-600" />
                <span>OFFICIAL SALARY VOUCHER &bull; {selectedItem.payslipNumber}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Payslip</span>
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Document Container */}
            <div ref={voucherPrintRef} className="space-y-6">
              {/* Organization Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-black tracking-tight text-slate-900 uppercase">
                      JAAGO FOUNDATION
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    House 57, Road 7/B, Block H, Banani, Dhaka-1213, Bangladesh
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Phone: +880 2 9887755 &bull; Email: info@jaago.com.bd &bull; Web: www.jaago.com.bd
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="inline-block px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded">
                    SALARY SLIP
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800">
                    {selectedItem.payslipNumber}
                  </div>
                  <div className="text-[11px] text-slate-500">Pay Period: {selectedRun.name}</div>
                </div>
              </div>

              {/* Employee & Bank Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-500">Employee Name: </span>
                    <strong className="text-slate-900">{selectedItem.employeeName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Employee Code: </span>
                    <strong className="font-mono text-slate-900">{selectedItem.employeeCode}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Designation: </span>
                    <span className="text-slate-800">{selectedItem.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Department: </span>
                    <span className="text-slate-800">{selectedItem.department}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-500">Branch / Location: </span>
                    <span className="text-slate-800">{selectedItem.branch}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Disbursing Bank: </span>
                    <span className="text-slate-800">{selectedItem.bankName || 'BRAC Bank Ltd'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Bank Account No: </span>
                    <strong className="font-mono text-slate-900">
                      {selectedItem.bankAccountNumber || '1501203456789001'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Payment Date: </span>
                    <span className="text-slate-800">{selectedRun.paymentDate}</span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Earnings Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 font-bold px-3 py-2 text-slate-800 border-b border-slate-200 uppercase text-[10px]">
                    Earnings (BDT)
                  </div>
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-1.5 px-3">Basic Salary (50%)</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold">
                          ৳{selectedItem.basicWage.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3">House Rent Allowance (25%)</td>
                        <td className="py-1.5 px-3 text-right font-mono">
                          ৳{selectedItem.houseRent.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3">Medical Allowance (10%)</td>
                        <td className="py-1.5 px-3 text-right font-mono">
                          ৳{selectedItem.medicalAllowance.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3">Conveyance Allowance (10%)</td>
                        <td className="py-1.5 px-3 text-right font-mono">
                          ৳{selectedItem.conveyanceAllowance.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3">Special / Other Allowance (5%)</td>
                        <td className="py-1.5 px-3 text-right font-mono">
                          ৳{selectedItem.otherAllowance.toLocaleString()}
                        </td>
                      </tr>
                      {selectedItem.bonusAmount > 0 && (
                        <tr className="bg-amber-50">
                          <td className="py-1.5 px-3 font-bold text-amber-900">Festival Bonus</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-amber-900">
                            ৳{selectedItem.bonusAmount.toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                      <tr>
                        <td className="py-2 px-3">Total Gross Salary</td>
                        <td className="py-2 px-3 text-right font-mono text-sm">
                          ৳{selectedItem.grossWage.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Deductions Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 font-bold px-3 py-2 text-slate-800 border-b border-slate-200 uppercase text-[10px]">
                    Deductions (BDT)
                  </div>
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-1.5 px-3">Provident Fund (PF)</td>
                        <td className="py-1.5 px-3 text-right font-mono text-rose-700">
                          ৳{selectedItem.employeePF.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3">Income Tax (TDS)</td>
                        <td className="py-1.5 px-3 text-right font-mono text-rose-700">
                          ৳{selectedItem.taxTDS.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3">Health Insurance Premium</td>
                        <td className="py-1.5 px-3 text-right font-mono text-rose-700">
                          ৳{selectedItem.insurancePremium.toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3">Attendance / Late Penalty</td>
                        <td className="py-1.5 px-3 text-right font-mono text-rose-700">
                          ৳{selectedItem.attendanceDeduction.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                      <tr>
                        <td className="py-2 px-3">Total Deductions</td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-rose-700">
                          ৳{selectedItem.totalDeductions.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-amber-400">
                    NET SALARY PAYABLE
                  </div>
                  <div className="text-xl font-black font-mono">
                    ৳{selectedItem.netWage.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Amount in Words</div>
                  <div className="text-xs font-bold text-slate-200 italic max-w-sm">
                    {numberToWordsBDT(selectedItem.netWage)}
                  </div>
                </div>
              </div>

              {/* Signatures & QR Verification */}
              <div className="pt-6 grid grid-cols-4 gap-4 items-end text-center text-xs text-slate-500">
                <div className="space-y-6">
                  <div className="border-b border-slate-300 pb-1 font-semibold text-slate-700">
                    Prepared By
                  </div>
                  <div className="text-[10px]">HR Executive</div>
                </div>

                <div className="space-y-6">
                  <div className="border-b border-slate-300 pb-1 font-semibold text-slate-700">
                    Checked &amp; Verified
                  </div>
                  <div className="text-[10px]">HR Lead / Coordinator</div>
                </div>

                <div className="space-y-6">
                  <div className="border-b border-slate-300 pb-1 font-semibold text-slate-700">
                    Authorized Signatory
                  </div>
                  <div className="text-[10px]">Director, People &amp; Culture</div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="h-16 w-16 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-slate-800" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">DIGITAL SECURE SEAL</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center pt-2 border-t border-slate-200">
                This is a system-generated document produced by JAAGO PAY. No physical signature is required.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
