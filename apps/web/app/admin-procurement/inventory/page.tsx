'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  getInventoryItems,
  saveInventoryItem,
  InventoryItem,
} from '@/lib/supabase-procurement';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('IT Hardware');
  const [stock, setStock] = useState('10');
  const [uom, setUom] = useState('PCS');
  const [unitCost, setUnitCost] = useState('5000');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadItems = async () => {
    try {
      const data = await getInventoryItems();
      setItems(data);
    } catch (err) {
      console.warn('Error loading inventory:', err);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await saveInventoryItem({
        name: name.trim(),
        category,
        stockOnHand: Number(stock) || 0,
        uom,
        unitCost: Number(unitCost) || 0,
        reorderLevel: Number(reorderLevel) || 5,
        warehouse: 'Banani Central Depot',
        status: (Number(stock) || 0) <= (Number(reorderLevel) || 5) ? 'Low Stock' : 'In Stock',
      });

      await loadItems();
      setIsModalOpen(false);
      setName('');
      showToast(`Inventory item "${name}" added successfully.`);
    } catch {
      showToast('Error saving inventory item.');
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
            Inventory &amp; Stock Levels
          </h1>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            Real-time warehouse stock tracking, minimum thresholds, and stock valuation
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition transform active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>ADD STOCK ITEM</span>
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-border/70 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">Central Inventory Registry</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-surface/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <th className="py-3.5 px-4 sm:px-6">ITEM CODE</th>
                <th className="py-3.5 px-4">ITEM NAME</th>
                <th className="py-3.5 px-4">CATEGORY</th>
                <th className="py-3.5 px-4">WAREHOUSE</th>
                <th className="py-3.5 px-4 text-center">ON HAND</th>
                <th className="py-3.5 px-4 text-center">REORDER LVL</th>
                <th className="py-3.5 px-4 text-right">UNIT COST</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-primary/5 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-extrabold text-foreground">{item.itemCode}</td>
                  <td className="py-3.5 px-4 font-bold text-foreground">{item.name}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{item.category}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{item.warehouse}</td>
                  <td className="py-3.5 px-4 text-center font-black text-foreground">
                    {item.stockOnHand} {item.uom}
                  </td>
                  <td className="py-3.5 px-4 text-center text-muted-foreground">
                    {item.reorderLevel} {item.uom}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-foreground">
                    ৳ {item.unitCost.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {item.status === 'In Stock' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        • In Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        • Low Stock
                      </span>
                    )}
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
              <h2 className="text-base font-black text-foreground">Add Inventory Stock Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full border border-border">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-muted-foreground block mb-1">Item Description *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cat6 UTP Network Cable (305m)"
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
                    <option value="Stationery">Stationery</option>
                    <option value="Furniture">Furniture</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Unit of Measure (UOM)</label>
                  <select
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  >
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="BOX">Box</option>
                    <option value="RIM">Ream (RIM)</option>
                    <option value="SET">Set</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Stock Qty</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Unit Cost (BDT)</label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none"
                  />
                </div>
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
                  {isSubmitting ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
