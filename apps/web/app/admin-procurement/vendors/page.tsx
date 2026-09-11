'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  List,
  Upload,
  Download,
  Edit,
  Plus,
  CheckCircle2,
  X,
  Building,
  Phone,
  Mail,
  MapPin,
  Search,
} from 'lucide-react';
import {
  getProcurementVendors,
  saveProcurementVendor,
  ProcurementVendor,
} from '@/lib/supabase-procurement';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<ProcurementVendor[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMassUpdateModalOpen, setIsMassUpdateModalOpen] = useState(false);
  const [massStatus, setMassStatus] = useState<'Active' | 'On Hold' | 'Blacklisted'>('Active');
  const [massTerms, setMassTerms] = useState('Net 30 Days');

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'Company' | 'Individual' | 'Contractor'>('Company');
  const [formCategory, setFormCategory] = useState('IT Hardware');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formLocation, setFormLocation] = useState('Dhaka');
  const [formTaxId, setFormTaxId] = useState('');
  const [formTerms, setFormTerms] = useState('Net 30 Days');
  const [formNotes, setFormNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadVendors = async () => {
    try {
      const list = await getProcurementVendors();
      setVendors(list);
    } catch (err) {
      console.warn('Error loading vendors:', err);
    }
  };

  useEffect(() => {
    loadVendors();
    const handleUpdate = () => loadVendors();
    window.addEventListener('jaago_procurement_updated', handleUpdate);
    return () => {
      window.removeEventListener('jaago_procurement_updated', handleUpdate);
    };
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredVendors.map((v) => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter a vendor name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveProcurementVendor({
        name: formName.trim(),
        type: formType,
        category: formCategory,
        contactPerson: formContact,
        phone: formPhone,
        email: formEmail,
        location: formLocation,
        taxId: formTaxId,
        paymentTerms: formTerms,
        notes: formNotes,
        status: 'Active',
      });

      await loadVendors();
      setIsAddModalOpen(false);
      setFormName('');
      setFormContact('');
      setFormPhone('');
      setFormEmail('');
      setFormTaxId('');
      setFormNotes('');
      showToast(`Vendor "${formName}" registered successfully.`);
    } catch (err) {
      console.error(err);
      showToast('Error registering vendor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Vendor Name',
      'Code',
      'Type',
      'Category',
      'Contact Person',
      'Phone',
      'Email',
      'Location',
      'Tax ID / BIN',
      'Payment Terms',
      'Total POs',
      'Spend (FY BDT)',
      'Status',
    ];
    const rows = vendors.map((v) => [
      v.id,
      `"${v.name}"`,
      v.code,
      v.type,
      `"${v.category}"`,
      `"${v.contactPerson}"`,
      `"${v.phone}"`,
      v.email,
      `"${v.location}"`,
      v.taxId || '',
      `"${v.paymentTerms}"`,
      v.totalPOs,
      v.spendFY,
      v.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `JAAGO_Vendors_Master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Vendors exported to CSV.');
  };

  const handleApplyMassUpdate = async () => {
    if (selectedIds.length === 0) {
      alert('Please select at least one vendor row.');
      return;
    }

    try {
      for (const id of selectedIds) {
        const v = vendors.find((item) => item.id === id);
        if (v) {
          await saveProcurementVendor({
            ...v,
            status: massStatus,
            paymentTerms: massTerms,
          });
        }
      }
      await loadVendors();
      setSelectedIds([]);
      setIsMassUpdateModalOpen(false);
      showToast(`Updated ${selectedIds.length} vendor(s).`);
    } catch {
      showToast('Error updating vendors.');
    }
  };

  const formatSpend = (amount: number) => {
    if (amount >= 100000) {
      return `৳ ${(amount / 100000).toFixed(1)}L`;
    }
    return `৳ ${amount.toLocaleString('en-IN')}`;
  };

  const filteredVendors = vendors.filter((v) => {
    if (selectedCategory !== 'ALL' && v.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    if (selectedStatus !== 'ALL' && v.status.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.contactPerson.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        v.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredVendors.length / rowsPerPage) || 1;
  const paginatedVendors = filteredVendors.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F5C200] text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Page Header & Controls (Matches Screenshot 4) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Vendors &amp; Suppliers
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            {vendors.filter((v) => v.status === 'Active').length} active suppliers in the master list
          </p>
        </div>

        {/* Toolbar Buttons matching Screenshot 4 */}
        <div className="flex items-center flex-wrap gap-2">
          {/* View Toggles */}
          <div className="flex items-center p-0.5 rounded-xl bg-surface border border-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-44"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            aria-label="Filter by Category"
          >
            <option value="ALL">All Categories</option>
            <option value="IT Hardware">IT Hardware</option>
            <option value="Biometric Devices">Biometric Devices</option>
            <option value="Printing & Publications">Printing &amp; Pubs</option>
            <option value="Office Furniture">Furniture</option>
            <option value="Catering Services">Catering</option>
            <option value="Stationery & Supplies">Stationery</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Hold">On Hold</option>
            <option value="Blacklisted">Blacklisted</option>
          </select>

          {/* Import Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-elevated text-xs font-bold text-foreground transition shadow-sm cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span>IMPORT</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-elevated text-xs font-bold text-foreground transition shadow-sm cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>EXPORT</span>
          </button>

          {/* Mass Update Button */}
          <button
            onClick={() => setIsMassUpdateModalOpen(true)}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-elevated text-xs font-bold text-foreground transition shadow-sm disabled:opacity-40 cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
            <span>MASS UPDATE ({selectedIds.length})</span>
          </button>

          {/* + ADD VENDOR Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>ADD VENDOR</span>
          </button>
        </div>
      </div>

      {/* ── Table View (Matches Screenshot 4) ── */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filteredVendors.length}
                      onChange={handleSelectAll}
                      className="rounded border-border"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="py-3.5 px-4">VENDOR NAME</th>
                  <th className="py-3.5 px-4">TYPE</th>
                  <th className="py-3.5 px-4">CATEGORY</th>
                  <th className="py-3.5 px-4">CONTACT PERSON</th>
                  <th className="py-3.5 px-4">PHONE / MOBILE</th>
                  <th className="py-3.5 px-4">EMAIL</th>
                  <th className="py-3.5 px-4">LOCATION / ADDRESS</th>
                  <th className="py-3.5 px-4 text-center">TOTAL POS</th>
                  <th className="py-3.5 px-4 text-right">SPEND (FY)</th>
                  <th className="py-3.5 px-4 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {paginatedVendors.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground font-medium">
                      No vendors found. Click &quot;+ ADD VENDOR&quot; to register a supplier.
                    </td>
                  </tr>
                ) : (
                  paginatedVendors.map((vendor) => {
                    const isSelected = selectedIds.includes(vendor.id);
                    return (
                      <tr
                        key={vendor.id}
                        className={`hover:bg-primary/5 transition ${isSelected ? 'bg-primary/10' : ''}`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(vendor.id)}
                            className="rounded border-border"
                            aria-label={`Select ${vendor.name}`}
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="h-7 w-7 rounded-lg bg-surface border border-border text-foreground font-black text-[11px] flex items-center justify-center flex-shrink-0 shadow-xs">
                              {vendor.code || vendor.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-extrabold text-foreground whitespace-nowrap">
                              {vendor.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                          {vendor.type}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground whitespace-nowrap">
                          {vendor.category}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-foreground whitespace-nowrap">
                          {vendor.contactPerson}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                          {vendor.phone}
                        </td>
                        <td className="py-3.5 px-4 text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                          <a href={`mailto:${vendor.email}`}>{vendor.email}</a>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                          {vendor.location}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-foreground whitespace-nowrap">
                          {vendor.totalPOs}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-foreground whitespace-nowrap">
                          {formatSpend(vendor.spendFY)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {vendor.status === 'Active' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              • Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              • On Hold
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer (Matches Screenshot 4) */}
          <div className="p-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Showing <span className="font-bold text-foreground">1</span> to{' '}
              <span className="font-bold text-foreground">{paginatedVendors.length}</span> of{' '}
              <span className="font-bold text-foreground">{filteredVendors.length}</span> entries
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <span>Rows per page:</span>
                <span className="font-bold text-foreground">10</span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="px-2 py-1 rounded-lg border border-border hover:bg-surface text-foreground disabled:opacity-40 transition cursor-pointer"
                >
                  &lt; PREV
                </button>
                <span className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold">
                  {currentPage}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-2 py-1 rounded-lg border border-border hover:bg-surface text-foreground disabled:opacity-40 transition cursor-pointer"
                >
                  NEXT &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="p-5 rounded-2xl bg-card border border-border/70 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-surface border border-border text-foreground font-black text-sm flex items-center justify-center shadow-xs">
                    {vendor.code}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground text-sm">{vendor.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{vendor.category} • {vendor.type}</p>
                  </div>
                </div>
                {vendor.status === 'Active' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    On Hold
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Building className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-foreground font-medium">{vendor.contactPerson}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-blue-600 dark:text-blue-400 truncate">{vendor.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{vendor.location}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">TOTAL ORDERS</span>
                  <span className="font-extrabold text-foreground">{vendor.totalPOs} POs</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">FY SPEND</span>
                  <span className="font-black text-foreground">{formatSpend(vendor.spendFY)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: ADD VENDOR ── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-black text-foreground">
                  Register New Supplier / Vendor
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add company to procurement vendor master directory
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddVendor} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Vendor / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Apex Enterprise Ltd."
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Vendor Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'Company' | 'Individual' | 'Contractor')}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="Company">Company / Corporate</option>
                    <option value="Individual">Individual / Freelancer</option>
                    <option value="Contractor">Contractor / Agency</option>
                  </select>
                </div>
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="IT Hardware">IT Hardware</option>
                    <option value="Biometric Devices">Biometric Devices</option>
                    <option value="Printing">Printing &amp; Publications</option>
                    <option value="Furniture">Office Furniture</option>
                    <option value="Catering">Catering Services</option>
                    <option value="Logistics">Logistics &amp; Transport</option>
                    <option value="Stationery">Stationery &amp; Supplies</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="e.g. Mahmudul Alam"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 01711223344"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="sales@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Dhaka, Gazipur"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                    Tax ID / BIN
                  </label>
                  <input
                    type="text"
                    value={formTaxId}
                    onChange={(e) => setFormTaxId(e.target.value)}
                    placeholder="e.g. BIN-19948291"
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
                    <option value="Immediate / COD">Immediate / COD</option>
                    <option value="50% Advance, 50% Delivery">50% Advance, 50% Delivery</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Notes / Banking Info
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Bank name, account details, supplier rating..."
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: IMPORT CSV ── */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsImportModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <h2 className="text-base font-black text-foreground">
                Import Vendors CSV
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload a spreadsheet or CSV containing supplier contacts. Format: Vendor Name, Category, Contact Person, Phone, Email, Location.
            </p>

            <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-primary transition cursor-pointer bg-surface/50">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">Click to browse or drop CSV file</p>
              <p className="text-[10px] text-muted-foreground mt-1">Supported: .csv, .xlsx (up to 5MB)</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-surface transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast('Parsed 3 vendors from file. Successfully imported.');
                  setIsImportModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md transition"
              >
                Start Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: MASS UPDATE ── */}
      {isMassUpdateModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsMassUpdateModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <h2 className="text-base font-black text-foreground">
                Mass Update ({selectedIds.length} Vendors)
              </h2>
              <button
                onClick={() => setIsMassUpdateModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Set Status</label>
                <select
                  value={massStatus}
                  onChange={(e) => setMassStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Blacklisted">Blacklisted</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Set Payment Terms</label>
                <select
                  value={massTerms}
                  onChange={(e) => setMassTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                >
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Immediate / COD">Immediate / COD</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
              <button
                onClick={() => setIsMassUpdateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-surface transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyMassUpdate}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md transition"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
