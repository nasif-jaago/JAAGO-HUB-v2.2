'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Filter,
  Trash2,
  CheckCircle2,
  FileText,
  Briefcase,
  UserPlus,
  X,
} from 'lucide-react';
import {
  getProcurementRequests,
  saveProcurementRequest,
  deleteProcurementRequest,
  ProcurementRequest,
} from '@/lib/supabase-procurement';

export default function RequisitionLogsPage() {
  const [requests, setRequests] = useState<ProcurementRequest[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [formType, setFormType] = useState<'Purchase' | 'General' | 'Recruitment'>('Purchase');
  const [formTitle, setFormTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState("Founder's Office (JFT)");
  const [formAmount, setFormAmount] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [formPriority, setFormPriority] = useState<'Low' | 'Normal' | 'High' | 'Urgent'>('Normal');
  const [formRequiredDate, setFormRequiredDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadRequests = async () => {
    try {
      const data = await getProcurementRequests();
      setRequests(data);
    } catch (err) {
      console.warn('Error loading requisitions:', err);
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

  const handleDelete = async (id: string, prNumber: string) => {
    if (!confirm(`Are you sure you want to delete requisition ${prNumber}?`)) return;
    try {
      await deleteProcurementRequest(id);
      await loadRequests();
      showToast(`Requisition ${prNumber} deleted.`);
    } catch {
      showToast('Error deleting requisition.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Please enter a requisition title.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveProcurementRequest({
        requisitionType: formType,
        title: formTitle.trim(),
        department: formDepartment,
        requestOwner: 'Nasif Kamal',
        requestOwnerCode: 'FO032507061190',
        estAmount: Number(formAmount) || 0,
        currency: 'BDT',
        status: 'Submitted',
        justification: formJustification,
        priority: formPriority,
        requiredDate: formRequiredDate || undefined,
      });

      await loadRequests();
      setIsNewModalOpen(false);
      setFormTitle('');
      setFormAmount('');
      setFormJustification('');
      setFormRequiredDate('');
      showToast(`Purchase requisition "${formTitle}" submitted successfully.`);
    } catch (err) {
      console.error(err);
      showToast('Error saving requisition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedFilter !== 'ALL' && r.status.toLowerCase() !== selectedFilter.toLowerCase()) return false;
    if (selectedType !== 'ALL' && r.requisitionType.toLowerCase() !== selectedType.toLowerCase()) return false;
    return true;
  });

  const getStatusBadge = (status: ProcurementRequest['status']) => {
    switch (status) {
      case 'Approved':
      case 'Fulfilled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            • Approved
          </span>
        );
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

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F5C200] text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Page Title Header (Matches Screenshot 2) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase">
            PURCHASE REQUISITION
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Purchase requisitions (PR), supplier orders &amp; institutional procurement tracking
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>NEW PURCHASE REQUISITION</span>
        </button>
      </div>

      {/* ── PR/GR Register Table (Matches Screenshot 2) ── */}
      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-black text-foreground">
            Purchase Requisition (PR) Register
          </h2>

          <div className="flex items-center space-x-2">
            {/* Filter by Type */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground">
              <span className="text-[10px] text-muted-foreground uppercase">TYPE:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer uppercase text-foreground"
                aria-label="Filter by Requisition Type"
              >
                <option value="ALL" className="bg-card text-foreground">ALL TYPES</option>
                <option value="Purchase" className="bg-card text-foreground">Purchase</option>
                <option value="General" className="bg-card text-foreground">General</option>
                <option value="Recruitment" className="bg-card text-foreground">Recruitment</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer uppercase text-foreground"
                aria-label="Filter Requisitions by Status"
              >
                <option value="ALL" className="bg-card text-foreground">ALL</option>
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
                <th className="py-3.5 px-4 w-10 text-center">
                  <input type="checkbox" className="rounded border-border" aria-label="Select all" />
                </th>
                <th className="py-3.5 px-4">PR NO.</th>
                <th className="py-3.5 px-4">TITLE</th>
                <th className="py-3.5 px-4">DEPARTMENT</th>
                <th className="py-3.5 px-4">REQUEST OWNER</th>
                <th className="py-3.5 px-4 text-right">EST. AMOUNT</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground font-medium">
                    No requisition requests found matching filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-primary/5 transition group">
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-border" aria-label="Select row" />
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-foreground group-hover:text-primary transition whitespace-nowrap">
                      {req.prNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      <div className="flex items-center space-x-2">
                        {req.requisitionType === 'Recruitment' ? (
                          <span className="p-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[9px] uppercase">REC</span>
                        ) : req.requisitionType === 'General' ? (
                          <span className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[9px] uppercase">GEN</span>
                        ) : (
                          <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[9px] uppercase">PR</span>
                        )}
                        <span>{req.title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {req.department}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                      {req.requestOwner}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-foreground whitespace-nowrap">
                      ৳ {Number(req.estAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(req.id, req.prNumber)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
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

      {/* ── Modal: NEW PURCHASE / GENERAL / RECRUITMENT REQUEST ── */}
      {isNewModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsNewModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-black text-foreground text-base uppercase">
                  New Purchase Requisition (PR)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Submit procurement requisition for vendor goods, services or staffing
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

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Requisition Type Selector */}
              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1.5">
                  Requisition Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('Purchase')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      formType === 'Purchase'
                        ? 'bg-primary/20 text-[#F5C200] border-primary font-black shadow-sm'
                        : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Purchase</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('General')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      formType === 'General'
                        ? 'bg-primary/20 text-[#F5C200] border-primary font-black shadow-sm'
                        : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                    }`}
                  >
                    <Briefcase className="h-4 w-4" />
                    <span>General</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('Recruitment')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      formType === 'Recruitment'
                        ? 'bg-primary/20 text-[#F5C200] border-primary font-black shadow-sm'
                        : 'bg-surface border-border text-foreground hover:bg-surface-elevated'
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Recruitment</span>
                  </button>
                </div>
              </div>

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
                  placeholder={
                    formType === 'Recruitment'
                      ? 'e.g. Senior Frontend Engineer (Tech 4 Development)'
                      : formType === 'General'
                      ? 'e.g. Office stationery & repair work'
                      : 'e.g. 5x High-capacity network switches'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              {/* Department & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Department
                  </label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="Founder's Office (JFT)">Founder&apos;s Office (JFT)</option>
                    <option value="Digital School Project">Digital School Project</option>
                    <option value="People & Culture">People &amp; Culture</option>
                    <option value="Communications">Communications</option>
                    <option value="IT & Systems">IT &amp; Systems</option>
                    <option value="Admin & Operations">Admin &amp; Operations</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Est. Amount (BDT)
                  </label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="e.g. 485000"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              {/* Priority & Required Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Required By Date
                  </label>
                  <input
                    type="date"
                    value={formRequiredDate}
                    onChange={(e) => setFormRequiredDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              {/* Justification */}
              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Justification / Purpose
                </label>
                <textarea
                  rows={3}
                  value={formJustification}
                  onChange={(e) => setFormJustification(e.target.value)}
                  placeholder="State the project need, operational reason, or recruitment rationale..."
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
                />
              </div>

              {/* Submit Buttons */}
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
                  {isSubmitting ? 'Submitting...' : 'Submit Purchase Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
