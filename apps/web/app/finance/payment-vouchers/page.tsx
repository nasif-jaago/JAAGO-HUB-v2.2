'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import {
  Receipt,
  Plus,
  Search,
  ChevronRight,
} from 'lucide-react';
import {
  FinancePaymentVoucher,
  getPaymentVouchers,
  savePaymentVoucher,
} from '@/lib/supabase-finance';
import { PaymentVoucherModal } from '@/components/finance/payment-voucher-modal';

function PaymentVouchersContent() {
  const [vouchers, setVouchers] = useState<FinancePaymentVoucher[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<FinancePaymentVoucher | null>(null);

  const loadData = async () => {
    try {
      const list = await getPaymentVouchers();
      setVouchers(list);
    } catch (err) {
      console.warn('Failed to load payment vouchers:', err);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('jaago_finance_updated', handleUpdate);
    return () => {
      window.removeEventListener('jaago_finance_updated', handleUpdate);
    };
  }, []);

  const filtered = useMemo(() => {
    return vouchers.filter((v) => {
      const matchSearch =
        v.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.payeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.referenceDoc && v.referenceDoc.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' || v.status.toLowerCase() === statusFilter.toLowerCase();
      const matchType = typeFilter === 'ALL' || v.voucherType === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [vouchers, searchQuery, statusFilter, typeFilter]);

  const metrics = useMemo(() => {
    const total = vouchers.length;
    const paid = vouchers.filter((v) => v.status === 'Paid').length;
    const pending = vouchers.filter((v) => v.status === 'Pending Approval' || v.status === 'Approved').length;
    const totalAmount = vouchers.reduce((acc, v) => acc + (v.amount || 0), 0);
    return { total, paid, pending, totalAmount };
  }, [vouchers]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Paid
          </span>
        );
      case 'Approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Approved
          </span>
        );
      case 'Pending Approval':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Pending
          </span>
        );
      case 'Draft':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted text-muted-foreground border border-border">
            {status || 'Draft'}
          </span>
        );
    }
  };

  const handleMarkAsPaid = async (e: React.MouseEvent, voucher: FinancePaymentVoucher) => {
    e.stopPropagation();
    try {
      await savePaymentVoucher({
        ...voucher,
        status: 'Paid',
        paidAt: new Date().toISOString(),
        paidBy: 'Finance & Accounts',
      });
      loadData();
    } catch {}
  };

  return (
    <div className="w-full space-y-6 select-none animate-in fade-in duration-200 text-foreground">
      <PaymentVoucherModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVoucher(null);
        }}
        onSaved={() => loadData()}
        initialData={selectedVoucher}
      />

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Payment Voucher &amp; Bill Register
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Disbursements
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Vendor invoices, bill reconciliations, reimbursement settlements, and official payment advices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedVoucher(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Payment Voucher</span>
        </button>
      </div>

      {/* ── METRICS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4.5 rounded-2xl bg-card border border-border space-y-1 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">
            Total Vouchers Logged
          </span>
          <div className="text-2xl font-black text-foreground font-mono">{metrics.total}</div>
          <p className="text-[10px] text-muted-foreground">Accounts register count</p>
        </div>

        <div className="p-4.5 rounded-2xl bg-card border border-border space-y-1 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">
            Disbursed &amp; Paid
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {metrics.paid}
          </div>
          <p className="text-[10px] text-muted-foreground">Bank/Cash payments finalized</p>
        </div>

        <div className="p-4.5 rounded-2xl bg-card border border-border space-y-1 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">
            Pending / Approved
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {metrics.pending}
          </div>
          <p className="text-[10px] text-muted-foreground">Awaiting disbursement</p>
        </div>

        <div className="p-4.5 rounded-2xl bg-card border border-border space-y-1 shadow-sm">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">
            Total Disbursed Value
          </span>
          <div className="text-2xl font-black text-foreground font-mono">
            ৳ {metrics.totalAmount.toLocaleString()}
          </div>
          <p className="text-[10px] text-muted-foreground">Total voucher volume</p>
        </div>
      </div>

      {/* ── TOOLBAR / FILTERS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voucher number, payee, reference..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-background border border-border text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Types</option>
            <option value="Payment Voucher">Payment Voucher</option>
            <option value="Vendor Bill">Vendor Bill</option>
            <option value="Reimbursement Settlement">Reimbursement Settlement</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-background border border-border text-foreground focus:outline-none focus:border-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      {/* ── TABLE OF VOUCHERS ── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground text-[10px] font-black uppercase tracking-wider border-b border-border">
                <th className="py-3 px-4">Voucher No.</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Payee Name</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Ref / Purpose</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Amount (BDT)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium">
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => {
                    setSelectedVoucher(v);
                    setIsModalOpen(true);
                  }}
                  className="hover:bg-muted/30 transition cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    {v.voucherNumber}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{v.voucherType}</td>
                  <td className="py-3 px-4 font-bold text-foreground">{v.payeeName}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {v.paymentMethod}
                    {v.chequeNumber && ` (${v.chequeNumber})`}
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-muted-foreground">
                    {v.referenceDoc ? `Ref: ${v.referenceDoc} - ` : ''}
                    {v.description}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{v.voucherDate}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                    ৳ {v.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">{getStatusBadge(v.status)}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {v.status === 'Approved' && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsPaid(e, v)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                      >
                        Mark Paid
                      </button>
                    )}
                    <span className="text-xs font-bold text-primary inline-flex items-center space-x-1 group-hover:translate-x-1 transition">
                      <span>Edit</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Receipt className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-xs font-semibold">No payment vouchers found.</p>
                      <p className="text-[11px] text-muted-foreground">
                        Click &ldquo;New Payment Voucher&rdquo; to issue a payment bill.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function PaymentVouchersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-muted-foreground">Loading vouchers...</div>}>
      <PaymentVouchersContent />
    </Suspense>
  );
}
