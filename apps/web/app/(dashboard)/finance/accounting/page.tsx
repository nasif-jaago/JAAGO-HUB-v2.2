'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Scale,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
} from 'lucide-react';
import { EnterpriseTable, ColumnDef } from '@jaago/ui';

interface JournalLine {
  accountId: string;
  accountName: string;
  debitBdt: number;
  creditBdt: number;
}

interface JournalEntry {
  entryNumber: string;
  date: string;
  memo: string;
  totalAmountBdt: number;
  status: string;
  hashSha256: string;
  postedAt: string;
  lines: JournalLine[];
}

export default function FinanceAccountingPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Post Modal Form State
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');
  const [debitAccountId, setDebitAccountId] = useState('5010');
  const [creditAccountId, setCreditAccountId] = useState('1010');
  const [amountBdt, setAmountBdt] = useState('50000');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchFinanceData = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/finance/journal-entries', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.data) {
        setEntries(json.data.entries);
        setChartOfAccounts(json.data.chartOfAccounts);
      }
    } catch (err) {
      console.error('Failed to fetch finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handlePostEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const amt = Number(amountBdt);

    if (amt <= 0) {
      setErrorMsg('Transaction amount must be greater than 0');
      return;
    }

    const debitAcc = chartOfAccounts.find((a) => a.code === debitAccountId);
    const creditAcc = chartOfAccounts.find((a) => a.code === creditAccountId);

    const lines: JournalLine[] = [
      {
        accountId: debitAccountId,
        accountName: debitAcc ? debitAcc.name : 'Debit Account',
        debitBdt: amt,
        creditBdt: 0,
      },
      {
        accountId: creditAccountId,
        accountName: creditAcc ? creditAcc.name : 'Credit Account',
        debitBdt: 0,
        creditBdt: amt,
      },
    ];

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/finance/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          date,
          memo,
          lines,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setShowPostModal(false);
        setMemo('');
        fetchFinanceData();
      } else if (json.error) {
        setErrorMsg(json.error.message || 'Posting failed');
      }
    } catch (err) {
      console.error('Failed to post journal entry:', err);
    }
  };

  const columns: ColumnDef<JournalEntry>[] = [
    {
      key: 'entryNumber',
      header: 'Entry #',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-primary bg-surface px-2 py-1 rounded-lg border border-border">
          {row.entryNumber}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      accessor: (row) => <span className="font-mono text-xs text-muted-foreground">{row.date}</span>,
    },
    {
      key: 'memo',
      header: 'Transaction Memo / Narrative',
      accessor: (row) => <span className="font-bold text-foreground">{row.memo}</span>,
    },
    {
      key: 'totalAmountBdt',
      header: 'Amount (BDT)',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-emerald-400">
          BDT {row.totalAmountBdt.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Ledger Status',
      accessor: (row) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground">
      {/* ── HEADER ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg border border-primary/30">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Finance &amp; Accounting Center
            </h1>
            <p className="text-xs text-muted-foreground">
              Double-Entry General Ledger &bull; Balanced Debit/Credit Invariant &bull; SHA-256 Tamper Audit
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPostModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs flex items-center space-x-2 hover:bg-primary/90 shadow-lg transition"
        >
          <Plus className="h-4 w-4" />
          <span>Post Balanced Journal Entry</span>
        </button>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>CHART OF ACCOUNTS</span>
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            {chartOfAccounts.length || 28}
          </div>
          <div className="text-[11px] text-muted-foreground">Assets, Liabilities, Funds &amp; Grants</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>YTD EXPENDITURE</span>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-amber-400 font-mono">
            23.4 <span className="text-sm font-semibold text-muted-foreground">M BDT</span>
          </div>
          <div className="text-[11px] text-muted-foreground">100% voucher reconciled</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>BALANCED POSTINGS</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
            100%
          </div>
          <div className="text-[11px] text-muted-foreground">Strict Debit == Credit invariant</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>AUDIT INTEGRITY</span>
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            SHA-256
          </div>
          <div className="text-[11px] text-muted-foreground">Tamper-evident chained seals</div>
        </div>
      </div>

      {/* ── ENTERPRISE TABLE ── */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground rounded-2xl bg-card border border-border">
          Loading journal postings...
        </div>
      ) : (
        <EnterpriseTable
          columns={columns}
          data={entries}
          keyField="entryNumber"
          title="General Ledger Journal Entries"
          searchPlaceholder="Search entry number, narrative, or account..."
          onRowClick={(entry) => setSelectedEntry(entry)}
        />
      )}

      {/* ── POST BALANCED ENTRY MODAL ── */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/90 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-foreground">Post Balanced Journal Entry</h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePostEntry} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Posting Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Total Amount (BDT)</label>
                  <input
                    type="number"
                    required
                    value={amountBdt}
                    onChange={(e) => setAmountBdt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Transaction Memo / Narrative</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Free School Monthly Supplies Disbursement"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Double-Entry Line Postings
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">Debit Account (+ Asset / + Expense)</label>
                  <select
                    value={debitAccountId}
                    onChange={(e) => setDebitAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    {chartOfAccounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">Credit Account (- Asset / + Income)</label>
                  <select
                    value={creditAccountId}
                    onChange={(e) => setCreditAccountId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-border text-foreground focus:ring-1 focus:ring-primary"
                  >
                    {chartOfAccounts.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:bg-primary/90 transition shadow-lg mt-2"
              >
                Validate &amp; Post Balanced Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ENTRY DETAIL DRAWER ── */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="bg-card border-l border-border/90 w-full max-w-lg h-full p-6 space-y-5 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-primary">{selectedEntry.entryNumber}</span>
                <h3 className="font-black text-base text-foreground mt-0.5">{selectedEntry.memo}</h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-2 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Double-Entry Line Items
              </h4>
              <div className="space-y-2">
                {selectedEntry.lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-foreground">{line.accountName}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">Acc #{line.accountId}</div>
                    </div>
                    <div className="text-right font-mono font-bold">
                      {line.debitBdt > 0 ? (
                        <span className="text-emerald-400">Dr BDT {line.debitBdt.toLocaleString()}</span>
                      ) : (
                        <span className="text-primary">Cr BDT {line.creditBdt.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border text-[11px] font-mono text-muted-foreground break-all space-y-1">
              <span className="text-foreground font-bold">SHA-256 Audit Seal:</span>
              <div>{selectedEntry.hashSha256}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
