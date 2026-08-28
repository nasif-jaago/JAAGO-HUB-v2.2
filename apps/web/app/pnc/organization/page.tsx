'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Building2,
  Plus,
  Search,
  Upload,
  Save,
  Trash2,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Download,
  Paperclip,
  Edit2,
  Archive,
  RotateCw,
  Check,
} from 'lucide-react';
import {
  OrganizationEntity,
  OrganizationBranch,
  OrganizationPolicy,
  INITIAL_ORGANIZATIONS,
  fetchOrganizationsFromSupabase,
  saveOrganizationToSupabase,
  deleteOrganizationFromSupabase,
  fetchBranchesFromSupabase,
  saveBranchToSupabase,
  deleteBranchFromSupabase,
  fetchPoliciesFromSupabase,
  savePolicyToSupabase,
  deletePolicyFromSupabase,
} from '@/lib/supabase-organization';
import { resizeAndCropImage } from '@/lib/supabase-storage';

type PolicyCategory = 'ALL' | 'GENERAL' | 'LEAVE' | 'ATTENDANCE' | 'CODE OF CONDUCT' | 'TRAVEL' | 'EXPENSES' | 'OTHER';

export default function OrganizationPage() {
  const [organizations, setOrganizations] = useState<OrganizationEntity[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationEntity | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form State for Active Company Profile
  const [formData, setFormData] = useState<OrganizationEntity>(INITIAL_ORGANIZATIONS[0]!);
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'BRANCHES' | 'POLICIES' | 'HISTORY'>('GENERAL');

  // Branches & Policies for the selected organization
  const [branches, setBranches] = useState<OrganizationBranch[]>([]);
  const [policies, setPolicies] = useState<OrganizationPolicy[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [policyCategoryFilter, setPolicyCategoryFilter] = useState<PolicyCategory>('ALL');
  const [policySearchQuery, setPolicySearchQuery] = useState('');

  // Modals
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState<Partial<OrganizationBranch>>({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    city: 'Dhaka',
    country: 'Bangladesh',
  });

  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const [policyForm, setPolicyForm] = useState<Partial<OrganizationPolicy>>({
    title: '',
    category: 'GENERAL',
    description: '',
    attachmentName: '',
    attachmentSize: '',
    attachmentUrl: '',
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load from Supabase on mount
  useEffect(() => {
    fetchOrganizationsFromSupabase().then((orgs) => {
      if (orgs) setOrganizations(orgs);
    });
  }, []);

  // When selectedOrg changes, fetch its branches & policies
  useEffect(() => {
    if (selectedOrg) {
      setFormData({ ...selectedOrg });
      fetchBranchesFromSupabase(selectedOrg.id).then((brs) => {
        setBranches(brs);
      });
      fetchPoliciesFromSupabase(selectedOrg.id).then((pols) => {
        setPolicies(pols);
      });
    }
  }, [selectedOrg]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenDetail = (org: OrganizationEntity) => {
    setSelectedOrg(org);
    setIsCreatingNew(false);
    setActiveTab('GENERAL');
  };

  const handleCreateNewOrg = () => {
    const newOrg: OrganizationEntity = {
      id: `org-${Date.now()}`,
      name: '',
      partnerCountry: 'Bangladesh',
      website: 'https://jaago.com.bd',
      address: '',
      banani: 'Banani',
      city: 'Dhaka',
      division: 'Dhaka Division',
      postalCode: '1213',
      country: 'Bangladesh',
      phone: '',
      email: '',
      emailDomain: 'jaago.com.bd',
      brandColor: '#FED900',
      taxId: '',
      companyId: '',
      currency: 'BDT',
      isArchived: false,
    };
    setSelectedOrg(newOrg);
    setFormData(newOrg);
    setBranches([]);
    setPolicies([]);
    setIsCreatingNew(true);
    setActiveTab('GENERAL');
  };

  // Handle Logo Upload
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Logo image size exceeds 5MB limit', 'error');
      return;
    }

    try {
      const { dataUrl } = await resizeAndCropImage(file, 500, 0.92);
      setFormData((prev) => ({
        ...prev,
        logoUrl: dataUrl,
      }));
      showToast('Logo selected! Click Save Profile to apply changes.');
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setFormData((prev) => ({
          ...prev,
          logoUrl: result,
        }));
        showToast('Logo selected! Click Save Profile to apply changes.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Logo removed. Click Save Profile to save.');
  };

  // Save Company General Info
  const handleSaveOrganization = async () => {
    if (!formData.name?.trim()) {
      showToast('Organization Name is mandatory', 'error');
      return;
    }

    const payload: OrganizationEntity = {
      ...formData,
      name: formData.name.trim(),
      updatedAt: new Date().toISOString(),
    };

    await saveOrganizationToSupabase(payload);

    setOrganizations((prev) => {
      const idx = prev.findIndex((o) => o.id === payload.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [payload, ...prev];
    });

    setSelectedOrg(payload);
    setIsCreatingNew(false);
    showToast('Organization details saved successfully!');
  };

  const handleDeleteOrganization = async (id: string) => {
    setOrganizations((prev) => prev.filter((o) => o.id !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    if (selectedOrg?.id === id) {
      setSelectedOrg(null);
    }
    await deleteOrganizationFromSupabase(id);
    showToast('Organization entity deleted');
  };

  // Bulk actions
  const handleArchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    const updated = organizations.map((o) =>
      selectedIds.includes(o.id) ? { ...o, isArchived: true } : o
    );
    setOrganizations(updated);
    for (const id of selectedIds) {
      const target = updated.find((o) => o.id === id);
      if (target) await saveOrganizationToSupabase(target);
    }
    showToast(`${selectedIds.length} organization(s) archived`);
    setSelectedIds([]);
  };

  const handleUnarchiveSelected = async () => {
    if (selectedIds.length === 0) return;
    const updated = organizations.map((o) =>
      selectedIds.includes(o.id) ? { ...o, isArchived: false } : o
    );
    setOrganizations(updated);
    for (const id of selectedIds) {
      const target = updated.find((o) => o.id === id);
      if (target) await saveOrganizationToSupabase(target);
    }
    showToast(`${selectedIds.length} organization(s) restored`);
    setSelectedIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const idsToDelete = [...selectedIds];
    setOrganizations((prev) => prev.filter((o) => !idsToDelete.includes(o.id)));
    setSelectedIds([]);
    await Promise.all(idsToDelete.map((id) => deleteOrganizationFromSupabase(id)));
    showToast(`${count} organization(s) deleted`);
  };

  // Branch Handlers
  const handleSaveBranch = async () => {
    if (!branchForm.name?.trim()) {
      showToast('Branch Name is required', 'error');
      return;
    }
    const newBranch: OrganizationBranch = {
      id: `br-${Date.now()}`,
      organizationId: formData.id,
      name: branchForm.name.trim(),
      code: branchForm.code || `BR-${Date.now()}`,
      phone: branchForm.phone || '',
      email: branchForm.email || '',
      address: branchForm.address || '',
      city: branchForm.city || 'Dhaka',
      country: branchForm.country || 'Bangladesh',
    };
    await saveBranchToSupabase(newBranch);
    setBranches((prev) => [...prev, newBranch]);
    setShowAddBranchModal(false);
    setBranchForm({ name: '', code: '', phone: '', email: '', address: '', city: 'Dhaka', country: 'Bangladesh' });
    showToast('Branch location added successfully!');
  };

  const handleDeleteBranch = async (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    await deleteBranchFromSupabase(id);
    showToast('Branch location removed successfully');
  };

  // Policy Handlers
  const handleSavePolicy = async () => {
    if (!policyForm.title?.trim()) {
      showToast('Policy Title is required', 'error');
      return;
    }
    const newPolicy: OrganizationPolicy = {
      id: `pol-${Date.now()}`,
      organizationId: formData.id,
      title: policyForm.title,
      category: policyForm.category as any || 'GENERAL',
      description: policyForm.description || '',
      attachmentName: policyForm.attachmentName || `${policyForm.title.replace(/\s+/g, '_')}.pdf`,
      attachmentSize: policyForm.attachmentSize || '350.0 KB',
      attachmentUrl: policyForm.attachmentUrl || 'https://hub.jaago.com.bd/policies/document.pdf',
      uploadedAt: new Date().toISOString(),
    };
    await savePolicyToSupabase(newPolicy);
    setPolicies((prev) => [newPolicy, ...prev]);
    setShowAddPolicyModal(false);
    setPolicyForm({ title: '', category: 'GENERAL', description: '', attachmentName: '', attachmentSize: '', attachmentUrl: '' });
    showToast('Policy document uploaded successfully!');
  };

  const handleDeletePolicy = async (id: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
    await deletePolicyFromSupabase(id);
    showToast('Policy document deleted successfully');
  };

  // Filtered organizations
  const filteredOrgs = organizations.filter((org) => {
    const isArchived = Boolean(org.isArchived);
    if (viewMode === 'ARCHIVED') {
      if (!isArchived) return false;
    } else {
      if (isArchived) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      org.name.toLowerCase().includes(q) ||
      org.partnerCountry?.toLowerCase().includes(q) ||
      org.website?.toLowerCase().includes(q) ||
      org.city?.toLowerCase().includes(q)
    );
  });

  // Filtered policies
  const filteredPolicies = policies.filter((pol) => {
    if (policyCategoryFilter !== 'ALL' && pol.category !== policyCategoryFilter) return false;
    if (policySearchQuery.trim()) {
      const q = policySearchQuery.toLowerCase();
      return pol.title.toLowerCase().includes(q) || pol.description?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-2xl animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-red-500/20 border border-red-500/40 text-red-400'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 1: COMPANIES LIST VIEW (Follows Screenshot 2)
          ═══════════════════════════════════════════════════════════════════ */}
      {!selectedOrg ? (
        <div className="space-y-5">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
              Organization &amp; Branches
            </h1>
            <p className="text-xs text-muted-foreground pt-1">
              Manage your legal entity structure, contact details, and branch office locations.
            </p>
          </div>

          {/* Active vs Archived Filter Tabs */}
          <div className="flex items-center space-x-4 border-b border-border/60 text-xs font-extrabold tracking-wider text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setViewMode('ACTIVE');
                setSelectedIds([]);
              }}
              className={`pb-3 transition relative cursor-pointer ${
                viewMode === 'ACTIVE' ? 'text-amber-500 font-black' : 'hover:text-foreground'
              }`}
            >
              ACTIVE ({organizations.filter((o) => !o.isArchived).length})
              {viewMode === 'ACTIVE' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('ARCHIVED');
                setSelectedIds([]);
              }}
              className={`pb-3 transition relative cursor-pointer ${
                viewMode === 'ARCHIVED' ? 'text-amber-500 font-black' : 'hover:text-foreground'
              }`}
            >
              ARCHIVED ({organizations.filter((o) => Boolean(o.isArchived)).length})
              {viewMode === 'ARCHIVED' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handleCreateNewOrg}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>NEW</span>
              </button>

              <button
                type="button"
                className="px-4 py-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>IMPORT</span>
              </button>

              <h2 className="text-xl font-serif font-black text-foreground ml-2 hidden sm:block">
                Companies
              </h2>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-10 pl-9 pr-4 rounded-2xl bg-card border border-border text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedIds.length > 0 && (
            <div className="p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center space-x-2 text-xs font-black text-amber-500">
                <Check className="h-4 w-4 stroke-[3]" />
                <span>{selectedIds.length} organization(s) selected</span>
              </div>

              <div className="flex items-center space-x-2">
                {viewMode === 'ARCHIVED' ? (
                  <button
                    type="button"
                    onClick={handleUnarchiveSelected}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span>Restore / Unarchive</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleArchiveSelected}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>Archive Selected</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Selected</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-1.5 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-semibold transition cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Companies Table (Screenshot 2) */}
          <div className="rounded-3xl bg-card border border-border shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-surface/50">
                    <th className="py-3.5 px-4 w-8">
                      <input
                        type="checkbox"
                        checked={filteredOrgs.length > 0 && filteredOrgs.every((org) => selectedIds.includes(org.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(Array.from(new Set([...selectedIds, ...filteredOrgs.map((o) => o.id)])));
                          } else {
                            const filteredIds = new Set(filteredOrgs.map((o) => o.id));
                            setSelectedIds(selectedIds.filter((id) => !filteredIds.has(id)));
                          }
                        }}
                        className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th className="py-3.5 px-4">Company Name</th>
                    <th className="py-3.5 px-4">Partner / Country</th>
                    <th className="py-3.5 px-4">Website</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredOrgs.map((org) => {
                    const isSelected = selectedIds.includes(org.id);
                    
                    const getOrgBadge = (name: string) => {
                      const clean = (name || '').trim();
                      const lower = clean.toLowerCase();
                      if (lower.includes('uk') || lower.endsWith('uk')) return 'JF UK';
                      if (lower.includes('inc') || lower.endsWith('inc')) return 'JF INC';
                      if (lower.includes('trust') || lower.endsWith('trust') || lower === 'jft') return 'JFT';
                      if (lower.startsWith('jaago foundation') || lower === 'jf') return 'JF';
                      if (lower.includes('emk')) return 'EMK';
                      const words = clean.split(/\s+/).filter(Boolean);
                      if (words.length === 1 && words[0]) return words[0].slice(0, 3).toUpperCase();
                      return words.map((w) => w[0] || '').join('').slice(0, 4).toUpperCase() || 'JF';
                    };

                    const initials = getOrgBadge(org.name);
                    const brandColor = org.brandColor || '#FED900';

                    return (
                      <tr
                        key={org.id}
                        onClick={() => handleOpenDetail(org)}
                        className={`transition cursor-pointer group ${
                          isSelected ? 'bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-surface/60'
                        }`}
                      >
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (isSelected) {
                                setSelectedIds(selectedIds.filter((id) => id !== org.id));
                              } else {
                                setSelectedIds([...selectedIds, org.id]);
                              }
                            }}
                            className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            {/* Colorful Initials Badge */}
                            <div
                              style={{ backgroundColor: brandColor }}
                              className="h-8 min-w-[36px] px-1.5 rounded-lg flex items-center justify-center font-black text-[11px] text-white shadow-sm flex-shrink-0 tracking-tight"
                            >
                              {initials}
                            </div>
                            <div className="font-extrabold text-foreground group-hover:text-amber-500 transition text-xs sm:text-[13px]">
                              {org.name}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-medium">
                          {org.partnerCountry || org.country || 'Bangladesh'}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                          {org.website}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrganization(org.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete Company"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
            VIEW 2: COMPANY PROFILE DETAIL VIEW (Follows Screenshots 3, 4, 5)
            ═══════════════════════════════════════════════════════════════════ */
        <div className="space-y-6">
          {/* Top Breadcrumb & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                className="p-2 rounded-2xl bg-card border border-border hover:border-primary/50 text-foreground hover:text-primary transition shadow-sm cursor-pointer"
                title="Back to Companies"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-muted-foreground">
                  <span className="cursor-pointer hover:underline" onClick={() => setSelectedOrg(null)}>
                    Companies
                  </span>
                  <span>/</span>
                  <span className="text-foreground font-bold">{formData.name || 'New Company'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-foreground">
                  {formData.name || (isCreatingNew ? 'Create Legal Entity' : 'Company Profile')}
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  Manage your legal entity structure, contact details, and branch office locations.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              {!isCreatingNew && (
                <button
                  type="button"
                  onClick={() => handleDeleteOrganization(formData.id)}
                  className="px-4 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 border border-rose-500/30"
                  title="Delete this company"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>DELETE</span>
                </button>
              )}

              <button
                type="button"
                className="px-4 py-2 rounded-2xl bg-card border border-border hover:bg-surface text-xs font-bold text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center space-x-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>IMPORT</span>
              </button>

              <button
                type="button"
                onClick={handleSaveOrganization}
                className="px-5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black tracking-wide transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
              >
                <Save className="h-4 w-4 stroke-[2.5]" />
                <span>SAVE PROFILE</span>
              </button>
            </div>
          </div>

          {/* Top Hero Box: Logo + Company Name (Screenshot 3) */}
          <div className="rounded-3xl bg-card border border-border shadow-xl p-6 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Left: Logo Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-amber-500/40 bg-surface/60 hover:bg-amber-500/10 transition flex flex-col items-center justify-center text-center p-2 cursor-pointer relative overflow-hidden group flex-shrink-0"
                title="Click to upload or change company logo"
              >
                {formData.logoUrl ? (
                  <>
                    <Image
                      src={formData.logoUrl}
                      alt={formData.name || 'Company Logo'}
                      fill
                      sizes="112px"
                      unoptimized
                      className="object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[10px] font-bold p-1">
                      <span>Change Logo</span>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="mt-1 px-1.5 py-0.5 rounded bg-rose-500 hover:bg-rose-600 text-[9px] text-white transition"
                        title="Remove Logo"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground group-hover:text-amber-500 transition">
                    <Building2 className="h-7 w-7 mb-1 text-amber-500/80" />
                    <span className="text-[10px] font-bold text-foreground">Upload Logo</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>

              {/* Right: Company Name Field */}
              <div className="flex-1 w-full space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  COMPANY NAME <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. JAAGO Foundation"
                  className="w-full text-xl sm:text-2xl font-black bg-surface/50 border border-border focus:border-amber-500 px-3.5 py-2.5 rounded-xl text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Modern Navigation Tabs (Screenshot 3) */}
          <div className="flex items-center space-x-2 border-b border-border/80 text-xs font-bold tracking-wider overflow-x-auto pb-0.5">
            {[
              { key: 'GENERAL', label: 'GENERAL INFORMATION', icon: Building2 },
              { key: 'BRANCHES', label: 'BRANCHES', icon: MapPin, count: branches.length },
              { key: 'POLICIES', label: 'POLICIES', icon: FileText, count: policies.length },
              { key: 'HISTORY', label: 'HISTORY LOG', icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2.5 rounded-t-xl font-bold text-xs uppercase tracking-wider transition flex items-center space-x-2 border-b-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-amber-500 border-amber-500 bg-amber-500/10 shadow-sm'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface/50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="rounded-3xl bg-card border border-border shadow-xl p-6 sm:p-8 space-y-6">
            {/* ═══════════════════════════════════════════════════════════════
                TAB 1: GENERAL INFORMATION (Screenshot 3)
                ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'GENERAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                {/* Left Column: Address Fields */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="HQ-House#57, Road#7B"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      value={formData.banani}
                      onChange={(e) => setFormData({ ...formData, banani: e.target.value })}
                      placeholder="Banani"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Dhaka"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                    <input
                      type="text"
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      placeholder="Dhaka Division"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Bangladesh"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="1213"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      placeholder="444095931072"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Company ID
                    </label>
                    <input
                      type="text"
                      value={formData.companyId}
                      onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                      placeholder="S- 8027(48)"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                    </select>
                  </div>
                </div>

                {/* Right Column: Contact, Domain & Brand Color */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="8801766666654"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@jaago.com.bd"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://jaago.com.bd"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Email Domain
                    </label>
                    <input
                      type="text"
                      value={formData.emailDomain}
                      onChange={(e) => setFormData({ ...formData, emailDomain: e.target.value })}
                      placeholder="jaago.com.bd"
                      className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                    />
                  </div>

                  {/* Brand Color (Screenshot 3) */}
                  <div className="space-y-1 pt-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Brand Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <div
                        style={{ backgroundColor: formData.brandColor || '#FED900' }}
                        className="h-10 w-12 rounded-xl border border-border shadow-inner flex-shrink-0 cursor-pointer relative"
                      >
                        <input
                          type="color"
                          value={formData.brandColor || '#FED900'}
                          onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={formData.brandColor}
                        onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                        placeholder="#FED900"
                        className="w-full h-10 px-3.5 rounded-xl bg-surface/50 border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB 2: BRANCHES (Screenshot 4)
                ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'BRANCHES' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                      Branch Office Locations
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Operating campuses, schools, and regional administrative branches.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddBranchModal(true)}
                    className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black transition flex items-center space-x-2 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Branch Location</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branches.map((br) => (
                    <div
                      key={br.id}
                      className="p-5 rounded-2xl bg-surface/50 border border-border/80 hover:border-amber-500/40 transition shadow-sm space-y-3 relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                            {br.code || 'BRANCH'}
                          </div>
                          <h4 className="text-sm font-bold text-foreground">{br.name}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBranch(br.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Delete Branch"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground/80 flex-shrink-0" />
                          <span>{br.address || 'Address not specified'}, {br.city}, {br.country}</span>
                        </div>
                        {br.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground/80 flex-shrink-0" />
                            <span>{br.phone}</span>
                          </div>
                        )}
                        {br.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/80 flex-shrink-0" />
                            <span>{br.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB 3: POLICIES (Screenshot 5)
                ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'POLICIES' && (
              <div className="space-y-5">
                {/* Search, Filter Pills & Add Policy Bar (Screenshot 5) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="relative w-full lg:w-64">
                    <input
                      type="text"
                      value={policySearchQuery}
                      onChange={(e) => setPolicySearchQuery(e.target.value)}
                      placeholder="Search policies..."
                      className="w-full h-9 pl-8 pr-3 rounded-xl bg-surface/50 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[10px] font-bold uppercase tracking-wider">
                    {(['ALL', 'GENERAL', 'LEAVE', 'ATTENDANCE', 'CODE OF CONDUCT', 'TRAVEL', 'EXPENSES', 'OTHER'] as PolicyCategory[]).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPolicyCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                            policyCategoryFilter === cat
                              ? 'bg-amber-500 text-white font-black shadow-sm'
                              : 'bg-surface text-muted-foreground hover:text-foreground hover:bg-surface/80 border border-border'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddPolicyModal(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider transition flex items-center space-x-1.5 shadow-md cursor-pointer flex-shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ ADD POLICY</span>
                  </button>
                </div>

                {/* Policies Grid (Screenshot 5) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {filteredPolicies.map((pol) => (
                    <div
                      key={pol.id}
                      className="p-5 rounded-2xl bg-surface/50 border border-border/80 hover:border-amber-500/40 transition shadow-sm space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs sm:text-[13px] font-black text-foreground leading-tight">
                            {pol.title}
                          </h4>
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/20 text-[9px] font-bold">
                              {formData.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[9px] font-bold">
                              {pol.category}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {pol.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          ATTACHMENTS (1)
                        </div>
                        <div className="p-2 rounded-xl bg-card border border-border/80 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 min-w-0">
                            <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-mono text-[11px] text-foreground truncate">
                              {pol.attachmentName || `${pol.title}.pdf`}
                            </span>
                            <span className="text-[10px] text-muted-foreground">({pol.attachmentSize || '500 KB'})</span>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <a
                              href={pol.attachmentUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-muted-foreground hover:text-amber-500 cursor-pointer"
                              title="View Document"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={pol.attachmentUrl || '#'}
                              download
                              className="p-1 text-muted-foreground hover:text-amber-500 cursor-pointer"
                              title="Download"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                          <span>Uploaded: {pol.uploadedAt ? new Date(pol.uploadedAt).toLocaleDateString() : '8/10/2026'}</span>
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => showToast('Edit policy feature')}
                              className="text-muted-foreground hover:text-foreground font-bold flex items-center space-x-0.5 cursor-pointer"
                            >
                              <Edit2 className="h-2.5 w-2.5" />
                              <span>EDIT POLICY</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePolicy(pol.id)}
                              className="text-rose-500 hover:text-rose-400 font-bold flex items-center space-x-0.5 cursor-pointer"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              <span>DELETE POLICY</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TAB 4: HISTORY LOG
                ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'HISTORY' && (
              <div className="space-y-4">
                <div className="border-b border-border/70 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span>Company Entity Audit History</span>
                  </h3>
                </div>
                <div className="p-4 rounded-2xl bg-surface/50 border border-border flex items-center space-x-3 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Entity profile synchronized with PostgreSQL Supabase backend.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 1: ADD BRANCH LOCATION (Screenshot 4)
          ═══════════════════════════════════════════════════════════════════ */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-serif font-black text-foreground">Add Branch Location</h3>
              <button
                type="button"
                onClick={() => setShowAddBranchModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  BRANCH NAME *
                </label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="e.g. Banani Office"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  BRANCH CODE
                </label>
                <input
                  type="text"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  placeholder="e.g. DHK-01"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    PHONE
                  </label>
                  <input
                    type="tel"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                    placeholder="e.g. +8802..."
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={branchForm.email}
                    onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                    placeholder="e.g. branch@jaago.com.bd"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  ADDRESS
                </label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="Street and house number..."
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    CITY
                  </label>
                  <input
                    type="text"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    placeholder="e.g. Dhaka"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    COUNTRY
                  </label>
                  <input
                    type="text"
                    value={branchForm.country}
                    onChange={(e) => setBranchForm({ ...branchForm, country: e.target.value })}
                    placeholder="Bangladesh"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => setShowAddBranchModal(false)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveBranch}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
              >
                SAVE LOCATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL 2: ADD POLICY MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      {showAddPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="text-lg font-serif font-black text-foreground">Upload Policy Document</h3>
              <button
                type="button"
                onClick={() => setShowAddPolicyModal(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  POLICY TITLE *
                </label>
                <input
                  type="text"
                  required
                  value={policyForm.title}
                  onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })}
                  placeholder="e.g. JAAGO Child Protection Policy"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  CATEGORY
                </label>
                <select
                  value={policyForm.category}
                  onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value as any })}
                  className="w-full h-10 px-3 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-sm"
                >
                  <option value="GENERAL">GENERAL</option>
                  <option value="LEAVE">LEAVE</option>
                  <option value="ATTENDANCE">ATTENDANCE</option>
                  <option value="CODE OF CONDUCT">CODE OF CONDUCT</option>
                  <option value="TRAVEL">TRAVEL</option>
                  <option value="EXPENSES">EXPENSES</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  DESCRIPTION
                </label>
                <textarea
                  rows={3}
                  value={policyForm.description}
                  onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                  placeholder="Brief summary of policy provisions and compliance requirements..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    FILE NAME
                  </label>
                  <input
                    type="text"
                    value={policyForm.attachmentName}
                    onChange={(e) => setPolicyForm({ ...policyForm, attachmentName: e.target.value })}
                    placeholder="e.g. Policy_2026.pdf"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    FILE SIZE
                  </label>
                  <input
                    type="text"
                    value={policyForm.attachmentSize}
                    onChange={(e) => setPolicyForm({ ...policyForm, attachmentSize: e.target.value })}
                    placeholder="e.g. 520.4 KB"
                    className="w-full h-10 px-3.5 rounded-xl bg-surface border border-border text-xs sm:text-[13px] font-mono font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/70">
              <button
                type="button"
                onClick={() => setShowAddPolicyModal(false)}
                className="px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-muted-foreground text-xs font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSavePolicy}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider transition shadow-md cursor-pointer"
              >
                SAVE POLICY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
