'use client';

import React, { useState, useEffect } from 'react';
import { X, Receipt, AlertCircle } from 'lucide-react';
import {
  FinancePaymentVoucher,
  savePaymentVoucher,
} from '@/lib/supabase-finance';

interface PaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: ((voucher: FinancePaymentVoucher) => void) | undefined;
  initialData?: FinancePaymentVoucher | null | undefined;
}

export function PaymentVoucherModal({
  isOpen,
  onClose,
  onSaved,
  initialData,
}: PaymentVoucherModalProps) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const todayStr = new Date().toISOString().split('T')[0] || '';

  const [formData, setFormData] = useState<Partial<FinancePaymentVoucher>>({
    voucherType: 'Payment Voucher',
    payeeName: '',
    payeeType: 'Vendor',
    amount: 0,
    currency: 'BDT',
    paymentMethod: 'Bank Transfer',
    bankName: 'Brac Bank LTD.',
    bankAccount: '',
    chequeNumber: '',
    expenseCategory: 'General Expenditure',
    project: 'General Operations',
    budgetLine: '',
    description: '',
    status: 'Draft',
    voucherDate: todayStr,
  });

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        voucherType: 'Payment Voucher',
        payeeName: '',
        payeeType: 'Vendor',
        amount: 0,
        currency: 'BDT',
        paymentMethod: 'Bank Transfer',
        bankName: 'Brac Bank LTD.',
        bankAccount: '',
        chequeNumber: '',
        expenseCategory: 'General Expenditure',
        project: 'General Operations',
        budgetLine: '',
        description: '',
        status: 'Draft',
        voucherDate: todayStr,
      });
    }
  }, [isOpen, initialData, todayStr]);

  if (!isOpen) return null;

  const handleSave = async (submitStatus?: FinancePaymentVoucher['status']) => {
    if (!formData.payeeName || !formData.payeeName.trim()) {
      setErrorMsg('Payee / Vendor name is required.');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      setErrorMsg('Amount must be greater than zero.');
      return;
    }
    setErrorMsg('');
    setSaving(true);

    try {
      const payload: Partial<FinancePaymentVoucher> & {
        payeeName: string;
        amount: number;
        voucherType: FinancePaymentVoucher['voucherType'];
      } = {
        ...formData,
        payeeName: formData.payeeName.trim(),
        amount: Number(formData.amount),
        voucherType: formData.voucherType || 'Payment Voucher',
        status: submitStatus || formData.status || 'Draft',
      };

      const saved = await savePaymentVoucher(payload);
      if (onSaved) onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save voucher.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {formData.voucherNumber ? `Payment Voucher ${formData.voucherNumber}` : 'New Payment Voucher / Bill'}
              </h3>
              <p className="text-xs text-muted-foreground">Accounts Disbursement &amp; Invoicing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Voucher Type
              </label>
              <select
                value={formData.voucherType || 'Payment Voucher'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    voucherType: e.target.value as FinancePaymentVoucher['voucherType'],
                  })
                }
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground font-medium"
              >
                <option value="Payment Voucher">Payment Voucher</option>
                <option value="Vendor Bill">Vendor Bill</option>
                <option value="Reimbursement Settlement">Reimbursement Settlement</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Voucher Date
              </label>
              <input
                type="date"
                value={formData.voucherDate || ''}
                onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Payee / Beneficiary Name *
              </label>
              <input
                type="text"
                value={formData.payeeName || ''}
                onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                placeholder="Vendor company or employee name"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Payee Type
              </label>
              <select
                value={formData.payeeType || 'Vendor'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payeeType: e.target.value as FinancePaymentVoucher['payeeType'],
                  })
                }
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground font-medium"
              >
                <option value="Vendor">Vendor</option>
                <option value="Employee">Employee</option>
                <option value="Partner">Partner</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Amount (BDT) *
              </label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono font-bold text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod || 'Bank Transfer'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentMethod: e.target.value as FinancePaymentVoucher['paymentMethod'],
                  })
                }
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground font-medium"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="bKash / Mobile Wallet">bKash / Mobile Wallet</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bankName || ''}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Bank Account / Cheque No.
              </label>
              <input
                type="text"
                value={formData.bankAccount || formData.chequeNumber || ''}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                placeholder="Account number or cheque reference"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Reference Document
              </label>
              <input
                type="text"
                value={formData.referenceDoc || ''}
                onChange={(e) => setFormData({ ...formData, referenceDoc: e.target.value })}
                placeholder="e.g. EXP-000434 or PO-2026-0142"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Expense Category
              </label>
              <input
                type="text"
                value={formData.expenseCategory || ''}
                onChange={(e) => setFormData({ ...formData, expenseCategory: e.target.value })}
                placeholder="e.g. Travel, Capital Expenditure, Printing"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                Project &amp; Budget Line
              </label>
              <input
                type="text"
                value={formData.budgetLine || ''}
                onChange={(e) => setFormData({ ...formData, budgetLine: e.target.value })}
                placeholder="e.g. Digital School Modernization (BL-IT-2026)"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Description / Notes
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Payment particulars, invoice details or justification..."
              className="w-full bg-background border border-border rounded-lg p-3 text-xs text-foreground focus:border-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition"
          >
            Cancel
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('Draft')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border transition disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('Approved')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              Approve Voucher
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
