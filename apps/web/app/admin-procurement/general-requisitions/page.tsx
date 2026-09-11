'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Filter,
  Trash2,
  CheckCircle2,
  ClipboardList,
  Search,
  X,
  Clock,
  Check,
  Building,
  DollarSign,
} from 'lucide-react';
import {
  getProcurementRequests,
  saveProcurementRequest,
  deleteProcurementRequest,
  ProcurementRequest,
} from '@/lib/supabase-procurement';

interface GeneralRequisitionFormItem {
  id: string;
  name: string;
  quantity: number;
  uom: string;
  unitCost: number;
  totalCost: number;
}

export default function GeneralRequisitionsPage() {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ProcurementRequest | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New GR Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState("Founder's Office (JFT)");
  const [formCategory, setFormCategory] = useState('Office Supplies & Stationery');
  const [formPriority, setFormPriority] = useState<'Low' | 'Normal' | 'High' | 'Urgent'>('Normal');
  const [formRequiredDate, setFormRequiredDate] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [items, setItems] = useState<GeneralRequisitionFormItem[]>([
    {
      id: 'item-1',
      name: 'A4 Offset Printing Paper (80 GSM)',
      quantity: 10,
      uom: 'Box',
      unitCost: 2850,
      totalCost: 28500,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadRequests = async () => {
    try {
      const data = await getProcurementRequests();
      // Filter requests for General Requisitions
      setRequests(data.filter((r) => r.requisitionType === 'General'));
    } catch (err) {
      console.warn('Error loading general requisitions:', err);
    }
  };

  useEffect(() => {
    loadRequests();
    const handleUpdate = () => loadRequests();
    window.addEventListener('jaago_procurement_updated', handleUpdate);
    return () => {
      window.removeEventListener('jaago_procurement_updated', handleUpdate);
    };
  }, []);

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        quantity: 1,
        uom: 'Pcs',
        unitCost: 0,
        totalCost: 0,
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof GeneralRequisitionFormItem, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index]!, [field]: val };
      if (field === 'quantity' || field === 'unitCost') {
        const qty = field === 'quantity' ? Number(val) || 0 : target.quantity;
        const price = field === 'unitCost' ? Number(val) || 0 : target.unitCost;
        target.totalCost = qty * price;
      }
      next[index] = target;
      return next;
    });
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalEstimatedAmount = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);

  const handleCreateGR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Please enter a requisition title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newGR = await saveProcurementRequest({
        title: formTitle.trim(),
        requisitionType: 'General',
        department: formDepartment,
        requestOwner: 'Nasif Kamal',
        requestOwnerCode: 'FO032507061190',
        estAmount: totalEstimatedAmount || 15000,
        currency: 'BDT',
        status: 'Submitted',
        priority: formPriority,
        requiredDate: formRequiredDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]!,
        justification: formJustification,
        lineItems: items.map((it) => ({
          name: it.name || 'General Item',
          quantity: it.quantity || 1,
          unitCost: it.unitCost || 0,
          totalCost: it.totalCost || 0,
        })),
      });

      await loadRequests();
      setIsNewModalOpen(false);
      setFormTitle('');
      setFormJustification('');
      setFormRequiredDate('');
      showToast(`General Requisition ${newGR.prNumber} created successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to create general requisition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, grNumber: string) => {
    if (!confirm(`Are you sure you want to delete requisition ${grNumber}?`)) return;
    try {
      await deleteProcurementRequest(id);
      await loadRequests();
      showToast(`Requisition ${grNumber} deleted.`);
    } catch {
      showToast('Error deleting requisition.');
    }
  };

  const formatBDT = (amount: number) => {
    return `৳ ${amount.toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (status: ProcurementRequest['status']) => {
    switch (status) {
      case 'Submitted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            • Submitted
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            • Under Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            • Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            • Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border">
            • {status}
          </span>
        );
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedFilter !== 'ALL' && r.status.toLowerCase() !== selectedFilter.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.prNumber.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.requestOwner.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const submittedCount = requests.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const totalSpendBDT = requests.reduce((acc, r) => acc + (r.estAmount || 0), 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F5C200] text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Page Title Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase">
              GENERAL REQUISITION
            </h1>
          </div>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Internal office supplies, facility logistics, maintenance, and departmental petty requisitions
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>NEW GENERAL REQUISITION</span>
        </button>
      </div>

      {/* ── KPI Metric Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase text-muted-foreground tracking-wider block">
              TOTAL GR LOGS
            </span>
            <div className="text-2xl font-black text-foreground mt-1">{requests.length}</div>
            <span className="text-[10px] text-muted-foreground font-semibold">Departmental requisitions</span>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase text-muted-foreground tracking-wider block">
              PENDING REVIEW
            </span>
            <div className="text-2xl font-black text-amber-500 mt-1">{submittedCount}</div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Awaiting department lead</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase text-muted-foreground tracking-wider block">
              APPROVED REQUISITIONS
            </span>
            <div className="text-2xl font-black text-emerald-500 mt-1">{approvedCount}</div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Ready for dispatch / petty cash</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Check className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10.5px] font-extrabold uppercase text-muted-foreground tracking-wider block">
              EST. GENERAL BUDGET
            </span>
            <div className="text-2xl font-black text-foreground mt-1">{formatBDT(totalSpendBDT)}</div>
            <span className="text-[10px] text-muted-foreground font-semibold">Current fiscal cycle</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ── General Requisition Register Table ── */}
      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-foreground">
              General Requisition (GR) Register
            </h2>
            <p className="text-xs text-muted-foreground">Showing internal requisitions across branches and projects</p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search GR number, title, dept..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-56"
              />
            </div>

            {/* Filter by Status */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer uppercase text-foreground"
                aria-label="Filter General Requisitions by Status"
              >
                <option value="ALL" className="bg-card text-foreground">ALL STATUSES</option>
                <option value="Submitted" className="bg-card text-foreground">Submitted</option>
                <option value="Under Review" className="bg-card text-foreground">Under Review</option>
                <option value="Approved" className="bg-card text-foreground">Approved</option>
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
                <th className="py-3.5 px-4">GR NUMBER</th>
                <th className="py-3.5 px-4">REQUISITION TITLE</th>
                <th className="py-3.5 px-4">DEPARTMENT</th>
                <th className="py-3.5 px-4">REQUEST OWNER</th>
                <th className="py-3.5 px-4 text-right">EST. AMOUNT (BDT)</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4">REQUIRED BY</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground font-medium">
                    No general requisitions found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedReq(req)}
                    className="hover:bg-primary/5 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-black text-foreground group-hover:text-primary transition whitespace-nowrap">
                      {req.prNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground max-w-xs truncate">
                      {req.title}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Building className="h-3 w-3 text-muted-foreground/70" />
                        <span>{req.department}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                      {req.requestOwner}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-foreground whitespace-nowrap">
                      {formatBDT(req.estAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {req.requiredDate}
                    </td>
                    <td
                      className="py-3.5 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDelete(req.id, req.prNumber)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        title="Delete Requisition"
                        aria-label="Delete Requisition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: NEW GENERAL REQUISITION ── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-foreground text-base uppercase">
                    New General Requisition (GR)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Submit departmental request for internal procurement, supplies or maintenance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGR} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Requisition Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Monthly Stationery & Pantry Supplies for Central Banani"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              {/* Department & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Department *
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="Founder's Office (JFT)">Founder&apos;s Office (JFT)</option>
                    <option value="Digital School Program (DSP)">Digital School Program (DSP)</option>
                    <option value="People & Culture (P&C)">People &amp; Culture (P&amp;C)</option>
                    <option value="Admin & Procurement">Admin &amp; Procurement</option>
                    <option value="Child Welfare">Child Welfare</option>
                    <option value="Fundraising & Grants">Fundraising &amp; Grants</option>
                    <option value="Communications & PR">Communications &amp; PR</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Requisition Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="Office Supplies & Stationery">Office Supplies &amp; Stationery</option>
                    <option value="Facility Maintenance & Repair">Facility Maintenance &amp; Repair</option>
                    <option value="Utility & Pantry Items">Utility &amp; Pantry Items</option>
                    <option value="Event Logistics & Refreshments">Event Logistics &amp; Refreshments</option>
                    <option value="Printing & Marketing Materials">Printing &amp; Marketing Materials</option>
                    <option value="Petty Cash / Administrative">Petty Cash / Administrative</option>
                  </select>
                </div>
              </div>

              {/* Priority & Required Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High Priority</option>
                    <option value="Urgent">Urgent / Immediate</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Required Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formRequiredDate}
                    onChange={(e) => setFormRequiredDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              {/* Multi-item Breakdown */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground">
                    Required Items &amp; Estimated Breakdown
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-bold text-foreground hover:bg-surface-elevated transition"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={it.id || idx} className="p-3 rounded-xl bg-surface border border-border space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <input
                            type="text"
                            placeholder="Item description..."
                            value={it.name}
                            onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="UOM"
                            value={it.uom}
                            onChange={(e) => handleUpdateItem(idx, 'uom', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none text-center"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={items.length <= 1}
                            className="p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <input
                            type="number"
                            placeholder="Unit Price (BDT)"
                            value={it.unitCost || ''}
                            onChange={(e) => handleUpdateItem(idx, 'unitCost', e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none"
                          />
                        </div>
                        <div className="col-span-6 text-right font-black text-foreground text-xs pr-2">
                          Subtotal: ৳ {(it.totalCost || 0).toLocaleString('en-IN')} BDT
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Estimated Cost */}
                <div className="p-3 rounded-xl bg-surface-elevated/70 border border-border flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground">TOTAL ESTIMATED REQUISITION VALUE:</span>
                  <span className="font-black text-base text-foreground">
                    ৳ {totalEstimatedAmount.toLocaleString('en-IN')} BDT
                  </span>
                </div>
              </div>

              {/* Justification */}
              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Operational Justification &amp; Purpose
                </label>
                <textarea
                  rows={2}
                  value={formJustification}
                  onChange={(e) => setFormJustification(e.target.value)}
                  placeholder="Explain the administrative need or institutional necessity for this request..."
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
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
                  {isSubmitting ? 'Submitting...' : 'Submit General Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View GR Details Modal ── */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-black text-foreground text-sm flex items-center space-x-2">
                  <span>General Requisition</span>
                  <span className="text-primary font-mono text-xs">{selectedReq.prNumber}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Submitted on {selectedReq.createdAt.split('T')[0]}</p>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface border border-border">
                <div>
                  <span className="text-muted-foreground font-semibold">Title:</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedReq.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Department:</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedReq.department}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Requested By:</span>
                  <p className="font-bold text-foreground mt-0.5">{selectedReq.requestOwner}</p>
                </div>
                <div>
                  <span className="text-muted-foreground font-semibold">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedReq.status)}</div>
                </div>
              </div>

              {selectedReq.justification && (
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <span className="text-muted-foreground font-semibold">Justification:</span>
                  <p className="text-foreground mt-1">{selectedReq.justification}</p>
                </div>
              )}

              {selectedReq.lineItems && selectedReq.lineItems.length > 0 && (
                <div>
                  <h4 className="font-bold text-foreground mb-2">Requisition Items</h4>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-surface-elevated/70 text-[11px] text-muted-foreground font-bold border-b border-border">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedReq.lineItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium text-foreground">{it.name}</td>
                            <td className="py-2 px-3 text-center text-muted-foreground">{it.quantity}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">৳ {it.unitCost.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 text-right font-bold text-foreground">৳ {it.totalCost.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-surface-elevated/80 border border-border flex items-center justify-between">
                <span className="font-bold text-muted-foreground">ESTIMATED AMOUNT:</span>
                <span className="font-black text-sm text-foreground">
                  ৳ {selectedReq.estAmount.toLocaleString('en-IN')} BDT
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <button
                onClick={() => setSelectedReq(null)}
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
