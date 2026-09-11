'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Filter,
  MoreVertical,
  CheckCircle2,
  Eye,
  Download,
  Check,
  X,
} from 'lucide-react';
import {
  getPurchaseOrders,
  savePurchaseOrder,
  updatePOStatus,
  getProcurementVendors,
  PurchaseOrder,
  ProcurementVendor,
} from '@/lib/supabase-procurement';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<ProcurementVendor[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [activeMenuPOId, setActiveMenuPOId] = useState<string | null>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New PO Form State
  const [formVendor, setFormVendor] = useState('');
  const [formDept, setFormDept] = useState('Digital School Project');
  const [formDelivery, setFormDelivery] = useState('');
  const [formTerms, setFormTerms] = useState('Net 30 Days');
  const [formAddress, setFormAddress] = useState('Central Office, Banani, Dhaka');
  const [lineItems, setLineItems] = useState([
    { name: '', quantity: 1, uom: 'PCS', unitPrice: 0, totalPrice: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      const [oList, vList] = await Promise.all([
        getPurchaseOrders(),
        getProcurementVendors(),
      ]);
      setOrders(oList);
      setVendors(vList);
      if (vList.length > 0 && !formVendor) {
        setFormVendor(vList[0]?.name || '');
      }
    } catch (err) {
      console.warn('Error loading purchase orders:', err);
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

  const handleLineItemChange = (idx: number, field: string, val: any) => {
    const updated = [...lineItems];
    const item = { ...updated[idx]!, [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(val) : item.quantity;
      const p = field === 'unitPrice' ? Number(val) : item.unitPrice;
      item.totalPrice = (q || 0) * (p || 0);
    }
    updated[idx] = item;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { name: '', quantity: 1, uom: 'PCS', unitPrice: 0, totalPrice: 0 },
    ]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const totalPOAmount = lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  const handleStatusChange = async (poId: string, newStatus: PurchaseOrder['status']) => {
    try {
      await updatePOStatus(poId, newStatus, 'Nasif Kamal');
      await loadData();
      setActiveMenuPOId(null);
      showToast(`Order status updated to "${newStatus}".`);
    } catch {
      showToast('Failed to update status.');
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVendor) {
      alert('Please select a supplier/vendor.');
      return;
    }
    const validItems = lineItems.filter((i) => i.name.trim().length > 0);
    if (validItems.length === 0) {
      alert('Please add at least one line item with a name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const vendorObj = vendors.find((v) => v.name === formVendor);
      await savePurchaseOrder({
        vendorId: vendorObj?.id,
        vendorName: formVendor,
        department: formDept,
        amountBDT: totalPOAmount || 10000,
        expectedDelivery: formDelivery || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]!,
        paymentTerms: formTerms,
        deliveryAddress: formAddress,
        status: 'Pending',
        createdByName: 'Nasif Kamal',
        createdByCode: 'FO032507061190',
        lineItems: validItems.map((v, i) => ({
          id: `li-${Date.now()}-${i}`,
          name: v.name,
          quantity: v.quantity,
          uom: v.uom,
          unitPrice: v.unitPrice,
          totalPrice: v.totalPrice,
        })),
      });

      await loadData();
      setIsNewModalOpen(false);
      setLineItems([{ name: '', quantity: 1, uom: 'PCS', unitPrice: 0, totalPrice: 0 }]);
      showToast('New Purchase Order issued successfully.');
    } catch (err) {
      console.error(err);
      showToast('Error issuing PO.');
    } finally {
      setIsSubmitting(false);
    }
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

      {/* ── Header (Matches Screenshot 3) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Purchase Orders
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Official supplier purchase orders
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>NEW PURCHASE ORDER</span>
        </button>
      </div>

      {/* ── PO Register Table (Matches Screenshot 3) ── */}
      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        {/* Header Controls */}
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-black text-foreground">
            PO Register
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">PO NO.</th>
                <th className="py-3.5 px-4">VENDOR</th>
                <th className="py-3.5 px-4">DEPARTMENT</th>
                <th className="py-3.5 px-4 text-right">AMOUNT (BDT)</th>
                <th className="py-3.5 px-4">EXPECTED DELIVERY</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium">
                    No purchase orders found matching &quot;{selectedFilter}&quot;.
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
                      ৳ {Number(po.amountBDT).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {po.expectedDelivery}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(po.status)}
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
                              showToast(`Exported PO ${po.poNumber}`);
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

      {/* ── Modal: NEW PURCHASE ORDER ── */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsNewModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-black text-foreground">
                  Generate Purchase Order
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Issue legally-binding PO to registered vendor with line items
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              {/* Vendor & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Select Vendor *
                  </label>
                  <select
                    required
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.name} className="bg-card text-foreground">
                        {v.name} ({v.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Department *
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="Digital School Project">Digital School Project</option>
                    <option value="People & Culture">People &amp; Culture</option>
                    <option value="Communications">Communications</option>
                    <option value="Admin — Founder's Office">Admin — Founder&apos;s Office</option>
                    <option value="IT & Systems">IT &amp; Systems</option>
                  </select>
                </div>
              </div>

              {/* Delivery Date & Payment Terms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formDelivery}
                    onChange={(e) => setFormDelivery(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>

                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formTerms}
                    onChange={(e) => setFormTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="Net 15 Days">Net 15 Days</option>
                    <option value="Net 7 Days">Net 7 Days</option>
                    <option value="Immediate / COD">Immediate / Cash on Delivery</option>
                    <option value="50% Advance, 50% Delivery">50% Advance, 50% Delivery</option>
                  </select>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Delivery Destination
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Delivery address / warehouse..."
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              {/* Line Items Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-[10px] text-muted-foreground">
                    ORDER LINE ITEMS
                  </span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="inline-flex items-center space-x-1 text-primary hover:underline font-bold text-[11px]"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-surface p-2 rounded-xl border border-border/60">
                      <div className="col-span-5">
                        <input
                          type="text"
                          required
                          placeholder="Item description / specification"
                          value={item.name}
                          onChange={(e) => handleLineItemChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-center text-foreground focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="UOM"
                          value={item.uom}
                          onChange={(e) => handleLineItemChange(idx, 'uom', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-center text-foreground focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Unit BDT"
                          value={item.unitPrice || ''}
                          onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-right text-foreground focus:outline-none"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition"
                          title="Remove item"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Summary */}
                <div className="p-3 rounded-xl bg-surface-elevated/70 border border-border flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground">TOTAL ESTIMATED VALUE:</span>
                  <span className="font-black text-base text-foreground">
                    ৳ {totalPOAmount.toLocaleString('en-IN')} BDT
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PO Details Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-black text-foreground text-sm flex items-center space-x-2">
                  <span>Purchase Order Details</span>
                  <span className="text-primary font-mono text-xs">{selectedPO.poNumber}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Created on {selectedPO.createdAt}</p>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface border border-border">
                <div>
                  <span className="text-muted-foreground font-semibold">Vendor:</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedPO.vendorName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Department:</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedPO.department}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Expected Delivery:</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedPO.expectedDelivery}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedPO.status)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-2">Order Line Items</h4>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-surface-elevated/70 text-[11px] text-muted-foreground font-bold border-b border-border">
                      <tr>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(selectedPO.lineItems || []).map((item, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-medium text-foreground">{item.name}</td>
                          <td className="py-2 px-3 text-center text-muted-foreground">{item.quantity} {item.uom}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">৳ {item.unitPrice.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">৳ {item.totalPrice.toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-elevated/80 border border-border flex items-center justify-between">
                <span className="font-bold text-muted-foreground">TOTAL PO VALUE:</span>
                <span className="font-black text-sm text-foreground">
                  ৳ {selectedPO.amountBDT.toLocaleString('en-IN')} BDT
                </span>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedPO(null)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow hover:bg-primary/90 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
