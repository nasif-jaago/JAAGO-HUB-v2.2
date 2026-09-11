'use client';

import React, { useState, useEffect } from 'react';
import { Warehouse, Plus, CheckCircle2, X, MapPin, User } from 'lucide-react';
import { getProcurementWarehouses, saveProcurementWarehouse, ProcurementWarehouse } from '@/lib/supabase-procurement';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<ProcurementWarehouse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [capacity, setCapacity] = useState('2500');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadWarehouses = async () => {
    try {
      const data = await getProcurementWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.warn('Error loading warehouses:', err);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) return;

    try {
      await saveProcurementWarehouse({
        name: name.trim(),
        location: location.trim(),
        manager: manager.trim() || 'Habibur Rahman',
        capacitySqft: Number(capacity) || 2000,
        type: 'Regional Depot',
        status: 'Active',
      });
      await loadWarehouses();
      setIsModalOpen(false);
      setName('');
      setLocation('');
      setManager('');
      showToast(`Warehouse facility "${name}" registered.`);
    } catch {
      showToast('Error saving warehouse.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#F5C200] text-black px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-black" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Warehouses &amp; Storage Depots
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            HQ central depots, divisional regional stores, and school inventory rooms
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>ADD WAREHOUSE</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {warehouses.map((wh) => (
          <div key={wh.id} className="p-5 rounded-2xl bg-card border border-border/70 shadow-sm hover:shadow-md transition space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-[#F5C200] flex items-center justify-center font-bold">
                  <Warehouse className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-foreground text-sm">{wh.name}</h3>
                  <span className="text-[10px] text-muted-foreground">{wh.code} • {wh.type}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Active
              </span>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground pt-1">
              <div className="flex items-center space-x-2">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{wh.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-3.5 w-3.5 flex-shrink-0" />
                <span>In-Charge: <strong className="text-foreground">{wh.manager}</strong></span>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Floor Area</span>
              <span className="font-black text-foreground">{Number(wh.capacitySqft).toLocaleString()} sq. ft</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <h2 className="text-base font-black text-foreground">Add Storage Facility</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Warehouse Name *</label>
                <input type="text" required placeholder="e.g. Sylhet Regional Store" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Physical Address / Location *</label>
                <input type="text" required placeholder="e.g. Zindabazar, Sylhet" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Depot Manager / Custodian</label>
                <input type="text" placeholder="e.g. Tanvir Hossain" value={manager} onChange={(e) => setManager(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Capacity (Square Feet)</label>
                <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none" />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-border text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black shadow-md">Register Warehouse</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
