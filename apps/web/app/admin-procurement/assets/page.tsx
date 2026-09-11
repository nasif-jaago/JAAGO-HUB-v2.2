'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  getProcurementAssets,
  saveProcurementAsset,
  ProcurementAsset,
} from '@/lib/supabase-procurement';

export default function AssetsPage() {
  const [assets, setAssets] = useState<ProcurementAsset[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('IT Hardware');
  const [assignedUser, setAssignedUser] = useState('Nasif Kamal');
  const [department, setDepartment] = useState("Founder's Office");
  const [cost, setCost] = useState('150000');
  const [condition, setCondition] = useState<ProcurementAsset['condition']>('Operational');
  const [location, setLocation] = useState('Head Office (Banani)');
  const [serial, setSerial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAssets = async () => {
    try {
      const data = await getProcurementAssets();
      setAssets(data);
    } catch (err) {
      console.warn('Error loading assets:', err);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await saveProcurementAsset({
        name: name.trim(),
        category,
        assignedUser,
        department,
        purchaseCost: Number(cost) || 0,
        currentValue: Number(cost) || 0,
        condition,
        location,
        serialNumber: serial,
        purchaseDate: new Date().toISOString().split('T')[0]!,
      });

      await loadAssets();
      setIsModalOpen(false);
      setName('');
      setSerial('');
      showToast(`Asset "${name}" registered with tracking tag.`);
    } catch {
      showToast('Error registering asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Fixed &amp; Capital Assets
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Asset tagging, depreciation valuation, custodian accountability, and equipment lifecycle
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>REGISTER ASSET</span>
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">Asset Register</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">ASSET TAG</th>
                <th className="py-3.5 px-4">ASSET NAME</th>
                <th className="py-3.5 px-4">CATEGORY</th>
                <th className="py-3.5 px-4">ASSIGNED TO</th>
                <th className="py-3.5 px-4">LOCATION</th>
                <th className="py-3.5 px-4 text-right">ORIGINAL COST</th>
                <th className="py-3.5 px-4 text-right">CURRENT VALUE</th>
                <th className="py-3.5 px-4 text-center">CONDITION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-primary/5 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-extrabold text-foreground">{asset.assetTag}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">{asset.name}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{asset.category}</td>
                  <td className="py-3.5 px-4 text-foreground font-semibold">{asset.assignedUser}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{asset.location}</td>
                  <td className="py-3.5 px-4 text-right text-muted-foreground">
                    ৳ {asset.purchaseCost.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-foreground">
                    ৳ {asset.currentValue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      • {asset.condition}
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
            className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <h2 className="text-base font-black text-foreground">Register New Capital Asset</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterAsset} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Asset Name / Model *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dell Precision 5820 Workstation"
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
                    <option value="Office Equipment">Office Equipment</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Furniture">Furniture</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Purchase Cost (BDT)</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Assigned Custodian</label>
                  <input
                    type="text"
                    value={assignedUser}
                    onChange={(e) => setAssignedUser(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ProcurementAsset['condition'])}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Maintenance">Under Maintenance</option>
                    <option value="Disposed">Disposed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Serial Number</label>
                <input
                  type="text"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  placeholder="e.g. SN-DELL-992019"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
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
                  {isSubmitting ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
