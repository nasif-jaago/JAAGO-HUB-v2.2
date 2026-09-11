'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  DollarSign,
  Users,
  Filter,
  MoreVertical,
  CheckCircle2,
  Eye,
  Download,
  Check,
  X,
  Plus,
} from 'lucide-react';
import {
  getPurchaseOrders,
  getProcurementDashboardKPIs,
  PurchaseOrder,
  updatePOStatus,
} from '@/lib/supabase-procurement';

export default function ProcurementDashboardPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [kpis, setKpis] = useState({
    openPOs: 5,
    openPOsTrend: '▲ 3 this week',
    pendingApprovals: 1,
    pendingApprovalsSubtitle: '▲ 2 awaiting review',
    spendThisQuarterBDT: 2480000,
    spendThisQuarterTrend: '▲ 8.4% vs Q2',
    activeVendors: 6,
    activeVendorsTrend: '▲ 4 onboarded',
  });
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [activeMenuPOId, setActiveMenuPOId] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      const [kpiData, orderList] = await Promise.all([
        getProcurementDashboardKPIs(),
        getPurchaseOrders(),
      ]);
      setKpis(kpiData);
      setOrders(orderList);
    } catch (err) {
      console.warn('Error loading procurement dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('jaago_procurement_updated', handleUpdate);
    return () => {
      window.removeEventListener('jaago_procurement_updated', handleUpdate);
    };
  }, []);

  const handleStatusChange = async (poId: string, newStatus: PurchaseOrder['status']) => {
    try {
      await updatePOStatus(poId, newStatus, 'Nasif Kamal');
      await loadData();
      setActiveMenuPOId(null);
      showToast(`Order status updated to "${newStatus}" successfully.`);
    } catch {
      showToast('Failed to update status.');
    }
  };

  const formatBDT = (amount: number) => {
    return `৳ ${Number(amount).toLocaleString('en-IN')}`;
  };

  const filteredOrders = orders.filter((o) => {
    if (selectedFilter === 'ALL') return true;
    return o.status.toLowerCase() === selectedFilter.toLowerCase();
  });

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            • Approved
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            • Pending
          </span>
        );
      case 'Draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border">
            • Draft
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            • Rejected
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            • Completed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F5C200] text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Page Title Header (Matches Screenshot 1) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Procurement Dashboard
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Fiscal Year 2025-26 • Asia/Dhaka
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/admin-procurement/orders"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>NEW PURCHASE ORDER</span>
          </Link>
        </div>
      </div>

      {/* ── 4 KPI Cards (Matches Screenshot 1) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: OPEN PURCHASE ORDERS */}
        <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              OPEN PURCHASE ORDERS
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-foreground tracking-tight">
              {kpis.openPOs}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1">
              <span>{kpis.openPOsTrend}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: PENDING APPROVALS */}
        <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              PENDING APPROVALS
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-foreground tracking-tight">
              {kpis.pendingApprovals}
            </div>
            <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center space-x-1">
              <span>{kpis.pendingApprovalsSubtitle}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: SPEND THIS QUARTER */}
        <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              SPEND THIS QUARTER
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-foreground tracking-tight">
              ৳ {(kpis.spendThisQuarterBDT / 100000).toFixed(1)}L
            </div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1">
              <span>{kpis.spendThisQuarterTrend}</span>
            </div>
          </div>
        </div>

        {/* KPI 4: ACTIVE VENDORS */}
        <div className="p-5 rounded-2xl bg-card border border-border/70 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              ACTIVE VENDORS
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-foreground tracking-tight">
              {kpis.activeVendors}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1">
              <span>{kpis.activeVendorsTrend}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Purchase Orders Table (Matches Screenshot 1) ── */}
      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-black text-foreground">
            Recent Purchase Orders
          </h2>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer uppercase text-foreground"
                aria-label="Filter Orders by Status"
              >
                <option value="ALL" className="bg-card text-foreground">ALL</option>
                <option value="Pending" className="bg-card text-foreground">Pending</option>
                <option value="Approved" className="bg-card text-foreground">Approved</option>
                <option value="Draft" className="bg-card text-foreground">Draft</option>
                <option value="Rejected" className="bg-card text-foreground">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">PO NO.</th>
                <th className="py-3.5 px-4">VENDOR</th>
                <th className="py-3.5 px-4">DEPARTMENT</th>
                <th className="py-3.5 px-4 text-right">AMOUNT (BDT)</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4">DATE</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium animate-pulse">
                    Loading purchase orders and metrics...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium">
                    No purchase orders matching filter &quot;{selectedFilter}&quot;.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr
                    key={po.id}
                    onClick={() => setSelectedPO(po)}
                    className="hover:bg-primary/5 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 sm:px-6 font-extrabold text-foreground group-hover:text-primary transition whitespace-nowrap">
                      {po.poNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground whitespace-nowrap">
                      {po.vendorName}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {po.department}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-foreground whitespace-nowrap">
                      {formatBDT(po.amountBDT)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(po.status)}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {po.createdAt.split('T')[0]}
                    </td>
                    <td
                      className="py-3.5 px-4 text-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setActiveMenuPOId(activeMenuPOId === po.id ? null : po.id)}
                        className="p-1 rounded-lg hover:bg-surface border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title="Actions"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuPOId === po.id && (
                        <div className="absolute right-4 top-10 z-20 w-44 rounded-xl bg-card border border-border shadow-xl p-1 text-left animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={() => {
                              setSelectedPO(po);
                              setActiveMenuPOId(null);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Details</span>
                          </button>
                          {po.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(po.id, 'Approved')}
                                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10 transition"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve PO</span>
                              </button>
                              <button
                                onClick={() => handleStatusChange(po.id, 'Rejected')}
                                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject PO</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              showToast(`Downloading PO ${po.poNumber} voucher...`);
                              setActiveMenuPOId(null);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-primary/10 hover:text-primary transition"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download PDF</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Purchase Order Detail Drawer / Modal ── */}
      {selectedPO && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedPO(null)}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl font-black text-foreground tracking-tight">
                    {selectedPO.poNumber}
                  </span>
                  {getStatusBadge(selectedPO.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vendor: <span className="font-bold text-foreground">{selectedPO.vendorName}</span> • Dept: {selectedPO.department}
                </p>
              </div>

              <button
                onClick={() => setSelectedPO(null)}
                className="p-1.5 rounded-full hover:bg-surface border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-surface border border-border/60 text-xs">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">AMOUNT (BDT)</span>
                <p className="font-black text-base text-foreground mt-0.5">{formatBDT(selectedPO.amountBDT)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">PAYMENT TERMS</span>
                <p className="font-semibold text-foreground mt-0.5">{selectedPO.paymentTerms}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">EXPECTED DELIVERY</span>
                <p className="font-semibold text-foreground mt-0.5">{selectedPO.expectedDelivery}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">CREATED BY</span>
                <p className="font-semibold text-foreground mt-0.5">{selectedPO.createdByName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">DELIVERY ADDRESS</span>
                <p className="font-semibold text-foreground mt-0.5 truncate">{selectedPO.deliveryAddress || 'Central HQ'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">PR REFERENCE</span>
                <p className="font-semibold text-foreground mt-0.5">{selectedPO.prReference || 'Direct PO'}</p>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                ORDER ITEMS
              </h3>
              <div className="border border-border rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-surface/60 text-[10px] font-bold uppercase text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-3 text-left">ITEM</th>
                      <th className="py-2 px-2 text-center">QTY</th>
                      <th className="py-2 px-3 text-right">UNIT PRICE</th>
                      <th className="py-2 px-3 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {selectedPO.lineItems && selectedPO.lineItems.length > 0 ? (
                      selectedPO.lineItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-foreground">{item.name}</td>
                          <td className="py-2 px-2 text-center text-muted-foreground">{item.quantity} {item.uom}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{formatBDT(item.unitPrice)}</td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">{formatBDT(item.totalPrice)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted-foreground">Standard delivery items bundle.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedPO.notes && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                <span className="font-bold">Remarks:</span> {selectedPO.notes}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                onClick={() => {
                  showToast(`Downloading PO voucher ${selectedPO.poNumber}...`);
                  setSelectedPO(null);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-surface transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export PDF</span>
              </button>

              <div className="flex items-center space-x-2">
                {selectedPO.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusChange(selectedPO.id, 'Rejected');
                        setSelectedPO(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      Reject Order
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(selectedPO.id, 'Approved');
                        setSelectedPO(null);
                      }}
                      className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-md cursor-pointer"
                    >
                      Approve Order
                    </button>
                  </>
                )}
                {selectedPO.status !== 'Pending' && (
                  <button
                    onClick={() => setSelectedPO(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground transition shadow-sm cursor-pointer"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
