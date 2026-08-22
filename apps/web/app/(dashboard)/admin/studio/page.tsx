'use client';

import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
  Sliders,
  X,
  FileCode,
} from 'lucide-react';
import { EnterpriseTable, ColumnDef } from '@jaago/ui';

interface CustomField {
  id: string;
  targetEntity: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  optionsJson?: string[];
  isRequired: boolean;
  defaultValue: string;
  createdAt: string;
}

export default function StudioPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('hr_employees');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [fieldKey, setFieldKey] = useState('');
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [optionsStr, setOptionsStr] = useState('');
  const [isRequired, setIsRequired] = useState(false);

  const fetchFields = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/studio/custom-fields', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.data) {
        setFields(data.data);
      }
    } catch (err) {
      console.error('Failed to load custom fields:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldKey.trim() || !label.trim()) return;

    const optionsJson = fieldType === 'select' ? optionsStr.split(',').map((s) => s.trim()).filter(Boolean) : [];

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
      const res = await fetch('/api/v1/studio/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          targetEntity: selectedTarget,
          fieldKey,
          label,
          fieldType,
          optionsJson,
          isRequired,
        }),
      });

      const data = await res.json();
      if (data.data) {
        setShowAddModal(false);
        setFieldKey('');
        setLabel('');
        setOptionsStr('');
        fetchFields();
      }
    } catch (err) {
      console.error('Failed to create field:', err);
    }
  };

  const filteredFields = fields.filter((f) => f.targetEntity === selectedTarget);

  const columns: ColumnDef<CustomField>[] = [
    {
      key: 'fieldKey',
      header: 'Field Key',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-primary bg-surface px-2 py-1 rounded-lg border border-border">
          {row.fieldKey}
        </span>
      ),
    },
    {
      key: 'label',
      header: 'UI Label',
      accessor: (row) => <span className="font-bold text-foreground">{row.label}</span>,
    },
    {
      key: 'fieldType',
      header: 'Field Type',
      accessor: (row) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-card border border-border text-muted-foreground">
          {row.fieldType}
        </span>
      ),
    },
    {
      key: 'isRequired',
      header: 'Validation',
      accessor: (row) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            row.isRequired
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-surface border border-border text-muted-foreground'
          }`}
        >
          {row.isRequired ? 'Required' : 'Optional'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground">
      {/* ── HEADER ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg border border-primary/30">
            <Wand2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Studio-lite Runtime Extensibility
            </h1>
            <p className="text-xs text-muted-foreground">
              Dynamic Custom Fields &bull; No Schema Migrations &bull; Realtime Model Customization
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs flex items-center space-x-2 hover:bg-primary/90 shadow-lg transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add Custom Field</span>
        </button>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>CUSTOM FIELDS</span>
            <Sliders className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            {fields.length} Active
          </div>
          <div className="text-[11px] text-muted-foreground">Across all target business entities</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>TARGET MODELS</span>
            <Layers className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-amber-400 font-mono">
            3 Models
          </div>
          <div className="text-[11px] text-muted-foreground">HR, Finance, and Workflows</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>SCHEMA MIGRATIONS</span>
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black tracking-tight text-emerald-400 font-mono">
            0 Required
          </div>
          <div className="text-[11px] text-muted-foreground">Governed JSONB runtime attributes</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
            <span>VALIDATION ENGINE</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="text-3xl font-black tracking-tight text-foreground font-mono">
            Strict Zod
          </div>
          <div className="text-[11px] text-muted-foreground">Runtime type-checked inputs</div>
        </div>
      </div>

      {/* ── TARGET ENTITY SELECTOR ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Select Target Business Model
        </h3>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'hr_employees', label: 'HR / Staff Employees (hr_employees)' },
            { id: 'account_journal_entries', label: 'Financial Journal Entries (account_journal_entries)' },
            { id: 'workflow_instances', label: 'Workflow Requests (workflow_instances)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTarget(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
                selectedTarget === tab.id
                  ? 'bg-primary text-primary-foreground font-black shadow-lg'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ENTERPRISE TABLE ── */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground rounded-2xl bg-card border border-border">
          Loading custom field definitions...
        </div>
      ) : (
        <EnterpriseTable
          columns={columns}
          data={filteredFields}
          keyField="id"
          title={`Custom Fields for ${selectedTarget}`}
          searchPlaceholder="Search field key or label..."
        />
      )}

      {/* ── ADD FIELD MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/90 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-surface border border-border">
                  <FileCode className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-black text-base text-foreground">Add Custom Field</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddField} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Target Model</label>
                <div className="font-mono text-xs p-2.5 rounded-xl bg-surface border border-border text-foreground font-bold">
                  {selectedTarget}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Field Key (snake_case)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. emergency_contact"
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Field Label (UI Display)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Emergency Contact"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground">Field Type</label>
                <select
                  value={fieldType}
                  onChange={(e) => setFieldType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="text">Text (String)</option>
                  <option value="number">Number (Integer / Decimal)</option>
                  <option value="boolean">Boolean (True / False Toggle)</option>
                  <option value="select">Select Dropdown (Choice List)</option>
                  <option value="date">Date (Calendar Picker)</option>
                </select>
              </div>

              {fieldType === 'select' && (
                <div className="space-y-1">
                  <label className="font-bold text-muted-foreground">Dropdown Options (Comma separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Option A, Option B, Option C"
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              )}

              <label className="flex items-center space-x-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="font-bold text-foreground">Mark Field as Required</span>
              </label>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:bg-primary/90 transition shadow-lg mt-2"
              >
                Attach Custom Field to Model
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
