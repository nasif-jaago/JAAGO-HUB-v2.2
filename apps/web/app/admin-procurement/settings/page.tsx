'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Hash,
  DollarSign,
  Bell,
  CheckCircle2,
  Save,
  RotateCcw,
  Sliders,
  Check,
} from 'lucide-react';
import {
  getProcurementSettings,
  saveProcurementSettings,
  ProcurementSettings,
  INITIAL_SETTINGS,
} from '@/lib/supabase-procurement';

export default function ProcurementSettingsPage() {
  const [settings, setSettings] = useState<ProcurementSettings>(INITIAL_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'numbering' | 'approvals' | 'tax' | 'notifications'>('general');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await getProcurementSettings();
        setSettings(data);
      } catch (err) {
        console.warn('Error loading procurement settings:', err);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveProcurementSettings(settings);
      showToast('Procurement configuration saved to Supabase store successfully.');
    } catch {
      showToast('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all procurement settings back to standard system defaults?')) return;
    setSettings(INITIAL_SETTINGS);
    await saveProcurementSettings(INITIAL_SETTINGS);
    showToast('Settings reset to system defaults.');
  };

  const handleTierAmountChange = (index: number, newAmount: number) => {
    const updated = [...settings.approvalTiers];
    if (updated[index]) {
      updated[index].maxAmount = newAmount;
      setSettings({ ...settings, approvalTiers: updated });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F5C200] text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="h-4 w-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Procurement Settings
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Configure fiscal years, approval limits, auto-numbering prefixes, and compliance rules
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-elevated text-xs font-bold text-foreground transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving to Supabase...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-border overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'general', label: 'General Procurement', icon: Sliders },
          { id: 'numbering', label: 'Numbering Schemes', icon: Hash },
          { id: 'approvals', label: 'Approval Matrix', icon: ShieldCheck },
          { id: 'tax', label: 'Tax & Compliance', icon: DollarSign },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-primary/20 text-[#F5C200] border border-primary/40 font-black shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Content Container */}
      <div className="rounded-3xl bg-card border border-border/80 shadow-sm p-6 space-y-6">
        {/* Tab 1: General */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
              Fiscal &amp; Warehouse Operations
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Active Fiscal Year
                </label>
                <input
                  type="text"
                  value={settings.fiscalYear}
                  onChange={(e) => setSettings({ ...settings, fiscalYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Base System Currency
                </label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Default Receiving Warehouse
                </label>
                <input
                  type="text"
                  value={settings.defaultWarehouse}
                  onChange={(e) => setSettings({ ...settings, defaultWarehouse: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-foreground">Mandatory Quality Inspection (QC)</p>
                <p className="text-[11px] text-muted-foreground">
                  Require goods receipt notes (GRN) to undergo physical inspection before inventory restock
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireQcInspection}
                onChange={(e) => setSettings({ ...settings, requireQcInspection: e.target.checked })}
                className="h-5 w-5 rounded border-border text-primary cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Numbering Schemes */}
        {activeTab === 'numbering' && (
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
              Sequential Document Prefixes
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Purchase Order Prefix (PO)
                </label>
                <input
                  type="text"
                  value={settings.poPrefix}
                  onChange={(e) => setSettings({ ...settings, poPrefix: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Sample generated: {settings.poPrefix}0143</p>
              </div>

              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Requisition Prefix (PR / GR)
                </label>
                <input
                  type="text"
                  value={settings.prPrefix}
                  onChange={(e) => setSettings({ ...settings, prPrefix: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Sample generated: {settings.prPrefix}05989</p>
              </div>

              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  RFQ Prefix (Quotation)
                </label>
                <input
                  type="text"
                  value={settings.rfqPrefix}
                  onChange={(e) => setSettings({ ...settings, rfqPrefix: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Sample generated: {settings.rfqPrefix}0083</p>
              </div>

              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Goods Receipt Prefix (GRN)
                </label>
                <input
                  type="text"
                  value={settings.grnPrefix}
                  onChange={(e) => setSettings({ ...settings, grnPrefix: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Sample generated: {settings.grnPrefix}0046</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Approval Matrix */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
              Financial Approval Thresholds
            </h2>

            <div className="space-y-3">
              {settings.approvalTiers.map((tier, idx) => (
                <div
                  key={tier.tier}
                  className="p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center">
                        {tier.tier}
                      </span>
                      <h3 className="font-extrabold text-xs text-foreground">{tier.name}</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Assigned Role: <span className="font-bold text-foreground">{tier.role}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-muted-foreground">Ceiling: ৳</span>
                    <input
                      type="number"
                      value={tier.maxAmount}
                      onChange={(e) => handleTierAmountChange(idx, Number(e.target.value))}
                      className="w-32 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground text-right focus:outline-none"
                    />
                    <span className="text-[11px] text-muted-foreground">BDT</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Tax & Financial Compliance */}
        {activeTab === 'tax' && (
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
              Tax Deductions &amp; National Revenue Compliance
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  Default Value Added Tax (VAT %)
                </label>
                <input
                  type="number"
                  value={settings.vatDefaultPct}
                  onChange={(e) => setSettings({ ...settings, vatDefaultPct: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="font-extrabold uppercase text-[10px] text-muted-foreground block mb-1">
                  NBR Advance Income Tax (AIT %)
                </label>
                <input
                  type="number"
                  defaultValue={5}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-semibold"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">
              Email &amp; Workflow Dispatches
            </h2>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-foreground">Auto-Email Vendor on PO Approval</p>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically dispatch official signed PO voucher PDF to supplier contact email upon final authorization
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoEmailVendorOnPO}
                  onChange={(e) => setSettings({ ...settings, autoEmailVendorOnPO: e.target.checked })}
                  className="h-5 w-5 rounded border-border text-primary cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-foreground">Notify Request Owner on Status Changes</p>
                  <p className="text-[11px] text-muted-foreground">
                    Send real-time alerts when requisitions are approved, rejected, or delivery confirmed
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-5 w-5 rounded border-border text-primary cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Save Footer inside Settings */}
        <div className="pt-4 border-t border-border flex items-center justify-end space-x-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md hover:bg-primary/90 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
