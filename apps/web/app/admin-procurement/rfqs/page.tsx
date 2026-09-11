'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Filter,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  getProcurementRFQs,
  saveProcurementRFQ,
  ProcurementRFQ,
} from '@/lib/supabase-procurement';

export default function RFQsPage() {
  const [rfqs, setRfqs] = useState<ProcurementRFQ[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('IT Hardware');
  const [deadline, setDeadline] = useState('');
  const [vendorsInput, setVendorsInput] = useState('Rangs Technologies, Daffodil IT Supplies');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadRFQs = async () => {
    try {
      const data = await getProcurementRFQs();
      setRfqs(data);
    } catch (err) {
      console.warn('Error loading RFQs:', err);
    }
  };

  useEffect(() => {
    loadRFQs();
  }, []);

  const handleCreateRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) {
      alert('Please enter a title and submission deadline.');
      return;
    }

    setIsSubmitting(true);
    try {
      const invited = vendorsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await saveProcurementRFQ({
        title: title.trim(),
        category,
        deadline,
        invitedVendors: invited,
        submissionsCount: 0,
        status: 'Published',
        notes,
      });

      await loadRFQs();
      setIsModalOpen(false);
      setTitle('');
      setNotes('');
      showToast(`RFQ "${title}" published to vendors.`);
    } catch {
      showToast('Failed to create RFQ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = rfqs.filter((r) => {
    if (selectedFilter === 'ALL') return true;
    return r.status.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F5C200] text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Quotations &amp; RFQs
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Request for Quotation tenders, comparative bidding statements, and vendor evaluations
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>CREATE RFQ TENDER</span>
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">RFQ Master Register</h2>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-bold text-foreground">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer uppercase text-foreground"
              aria-label="Filter RFQ by Status"
            >
              <option value="ALL" className="bg-card text-foreground">ALL</option>
              <option value="Published" className="bg-card text-foreground">Published</option>
              <option value="Under Evaluation" className="bg-card text-foreground">Under Evaluation</option>
              <option value="Awarded" className="bg-card text-foreground">Awarded</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">RFQ NO.</th>
                <th className="py-3.5 px-4">TITLE</th>
                <th className="py-3.5 px-4">CATEGORY</th>
                <th className="py-3.5 px-4">INVITED VENDORS</th>
                <th className="py-3.5 px-4 text-center">BIDS REC&apos;D</th>
                <th className="py-3.5 px-4">DEADLINE</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {filtered.map((rfq) => (
                <tr key={rfq.id} className="hover:bg-primary/5 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-extrabold text-foreground">{rfq.rfqNumber}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">{rfq.title}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{rfq.category}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{rfq.invitedVendors.join(', ')}</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-foreground">{rfq.submissionsCount}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{rfq.deadline}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      • {rfq.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-black text-foreground">Create Request for Quotation (RFQ)</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRFQ} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Tender Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 50x Laptops for Digital Teachers"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  >
                    <option value="IT Hardware">IT Hardware</option>
                    <option value="Services">Services</option>
                    <option value="Printing">Printing</option>
                    <option value="Furniture">Furniture</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Submission Deadline *</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Invited Vendors (comma-separated)</label>
                <input
                  type="text"
                  value={vendorsInput}
                  onChange={(e) => setVendorsInput(e.target.value)}
                  placeholder="e.g. Rangs Technologies, Flora Ltd"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Technical Specifications / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Tender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
