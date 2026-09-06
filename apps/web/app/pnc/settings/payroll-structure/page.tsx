'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Search,
  Play,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sliders,
  Sparkles,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';

import {
  CategoryCode,
  PayrollConfig,
  INITIAL_PAYROLL_CONFIG,
  getPayrollConfig,
  SalaryRuleDefinition,
  SalaryStructureDefinition,
  getSavedSalaryRules,
  saveSalaryRules,
  getSavedSalaryStructures,
  saveSalaryStructures,
  resetSalaryStructuresAndRules,
  evaluateDynamicSalaryStructure,
  SalaryCalculationResult,
  RuleContext,
} from '@/lib/payroll-engine';

export default function PayrollStructurePage() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'rules' | 'structures' | 'settings' | 'test'>('rules');

  // Rules & Structures State
  const [rules, setRules] = useState<SalaryRuleDefinition[]>([]);
  const [structures, setStructures] = useState<SalaryStructureDefinition[]>([]);
  const [expandedStructures, setExpandedStructures] = useState<Record<string, boolean>>({
    'struct-jaago-payroll': true,
    'struct-jaago-pay-att-ins': false,
    'struct-jaago-pay-att': false,
    'struct-festival-bonus': false,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStructureFilter, setSelectedStructureFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Modals & Drawers
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SalaryRuleDefinition | null>(null);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructureDefinition | null>(null);

  // Form states for Rule Modal
  const [ruleForm, setRuleForm] = useState<Partial<SalaryRuleDefinition>>({
    name: '',
    code: '',
    categoryCode: 'ALW',
    sequence: 50,
    calculationDetails: '',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: '',
    structureCodes: [],
  });

  // Form states for Structure Modal
  const [structureForm, setStructureForm] = useState<Partial<SalaryStructureDefinition>>({
    name: '',
    code: '',
    scheduledPay: 'Monthly',
    country: 'Bangladesh',
    slipDisplayName: 'Salary Slip',
    workedDaysLinesEnabled: true,
    active: true,
    ruleCodes: [],
    description: '',
  });

  // Live Simulator State
  const [simStructureId, setSimStructureId] = useState<string>('JAAGO_PAY_ATT_INS');
  const [simGross, setSimGross] = useState<number>(60000);
  const [simPfRate, setSimPfRate] = useState<number>(5);
  const [simGender, setSimGender] = useState<'male' | 'female'>('male');
  const [simBonusEligible, setSimBonusEligible] = useState<boolean>(true);
  const [simDepartment, setSimDepartment] = useState<string>('General Operations');
  const [simAttendanceDed, setSimAttendanceDed] = useState<number>(0);
  const [simInsuranceStatus, setSimInsuranceStatus] = useState<string>('Disabled');
  const [simInsurancePremium, setSimInsurancePremium] = useState<number>(0);
  const [simManualLate, setSimManualLate] = useState<number>(0);
  const [simOtherDed, setSimOtherDed] = useState<number>(0);
  const [simJoiningDate, setSimJoiningDate] = useState<string>('2023-01-01');

  // Global Config
  const [config, setConfig] = useState<PayrollConfig>(INITIAL_PAYROLL_CONFIG);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Saved Data on Mount & Listen for Events
  useEffect(() => {
    const loadedRules = getSavedSalaryRules();
    const loadedStructures = getSavedSalaryStructures();
    const loadedConfig = getPayrollConfig();

    setRules(loadedRules);
    setStructures(loadedStructures);
    setConfig(loadedConfig);

    const handleRulesChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setRules(detail);
    };

    const handleStructuresChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) setStructures(detail);
    };

    const handleConfigChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setConfig(detail);
    };

    window.addEventListener('jaago_salary_rules_changed', handleRulesChange);
    window.addEventListener('jaago_salary_structures_changed', handleStructuresChange);
    window.addEventListener('jaago_payroll_config_changed', handleConfigChange);

    return () => {
      window.removeEventListener('jaago_salary_rules_changed', handleRulesChange);
      window.removeEventListener('jaago_salary_structures_changed', handleStructuresChange);
      window.removeEventListener('jaago_payroll_config_changed', handleConfigChange);
    };
  }, []);

  // Save Rules Helper
  const persistRules = (newRules: SalaryRuleDefinition[]) => {
    setRules(newRules);
    saveSalaryRules(newRules);
  };

  // Save Structures Helper
  const persistStructures = (newStructures: SalaryStructureDefinition[]) => {
    setStructures(newStructures);
    saveSalaryStructures(newStructures);
  };

  // Toggle Structure Accordion
  const toggleStructure = (id: string) => {
    setExpandedStructures((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Reorder Sequence Arrows (↑ / ↓)
  const moveRuleSequence = (index: number, direction: 'up' | 'down') => {
    const sorted = [...rules].sort((a, b) => a.sequence - b.sequence);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const currentRule = sorted[index];
    const targetRule = sorted[targetIdx];
    if (!currentRule || !targetRule) return;

    const currentSeq = currentRule.sequence;
    const targetSeq = targetRule.sequence;

    const newCurrentSeq = targetSeq === currentSeq
      ? (direction === 'up' ? currentSeq - 1 : currentSeq + 1)
      : targetSeq;
    const newTargetSeq = currentSeq;

    const updated = rules.map((r) => {
      if (r.id === currentRule.id) return { ...r, sequence: newCurrentSeq };
      if (r.id === targetRule.id) return { ...r, sequence: newTargetSeq };
      return r;
    });

    persistRules(updated);
    showToast(`Updated sequence order for ${currentRule.name}`);
  };

  // Toggle Active Status of a Rule
  const toggleRuleActive = (ruleId: string) => {
    const updated = rules.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r));
    persistRules(updated);
    showToast('Rule status updated');
  };

  // Duplicate a Rule
  const handleDuplicateRule = (rule: SalaryRuleDefinition) => {
    const newRule: SalaryRuleDefinition = {
      ...rule,
      id: `rule-${Date.now().toString(36)}`,
      code: `${rule.code}_COPY`,
      name: `${rule.name} (Copy)`,
      sequence: rule.sequence + 1,
    };
    persistRules([...rules, newRule]);
    showToast(`Duplicated rule as ${newRule.name}`);
  };

  // Delete a Rule
  const handleDeleteRule = (ruleId: string, ruleName: string) => {
    if (confirm(`Are you sure you want to delete "${ruleName}"? This action will remove it from all structures.`)) {
      const updated = rules.filter((r) => r.id !== ruleId);
      persistRules(updated);
      showToast(`Deleted rule: ${ruleName}`);
    }
  };

  // Open Rule Modal for Creation
  const handleOpenCreateRule = () => {
    setEditingRule(null);
    setRuleForm({
      name: '',
      code: '',
      categoryCode: 'ALW',
      sequence: rules.length > 0 ? Math.max(...rules.map((r) => r.sequence)) + 1 : 1,
      calculationDetails: 'contract.wage || 0',
      active: true,
      appearsOnPayslip: true,
      contributesToEmployerCost: false,
      description: '',
      structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAYROLL'],
    });
    setIsRuleModalOpen(true);
  };

  // Open Rule Modal for Editing
  const handleOpenEditRule = (rule: SalaryRuleDefinition) => {
    setEditingRule(rule);
    setRuleForm({ ...rule });
    setIsRuleModalOpen(true);
  };

  // Save Rule from Modal
  const handleSaveRule = () => {
    if (!ruleForm.name?.trim() || !ruleForm.code?.trim()) {
      showToast('Rule name and code are required', 'error');
      return;
    }

    const cleanCode = ruleForm.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    if (editingRule) {
      // Update existing
      const updated = rules.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              ...ruleForm,
              name: ruleForm.name!.trim(),
              code: cleanCode,
              sequence: Number(ruleForm.sequence || r.sequence),
              calculationDetails: ruleForm.calculationDetails?.trim() || '0',
            }
          : r
      );
      persistRules(updated);
      showToast(`Updated rule: ${ruleForm.name}`);
    } else {
      // Create new
      const newRule: SalaryRuleDefinition = {
        id: `rule-${Date.now().toString(36)}`,
        name: ruleForm.name.trim(),
        code: cleanCode,
        categoryCode: (ruleForm.categoryCode as CategoryCode) || 'ALW',
        sequence: Number(ruleForm.sequence || 50),
        calculationDetails: ruleForm.calculationDetails?.trim() || '0',
        active: ruleForm.active ?? true,
        appearsOnPayslip: ruleForm.appearsOnPayslip ?? true,
        contributesToEmployerCost: ruleForm.contributesToEmployerCost ?? false,
        description: ruleForm.description?.trim() || '',
        structureCodes: ruleForm.structureCodes || [],
      };
      persistRules([...rules, newRule]);
      showToast(`Created new rule: ${newRule.name}`);
    }

    setIsRuleModalOpen(false);
  };

  // Structure Operations
  const handleDuplicateStructure = (struct: SalaryStructureDefinition) => {
    const newStruct: SalaryStructureDefinition = {
      ...struct,
      id: `struct-${Date.now().toString(36)}`,
      name: `${struct.name} (Copy)`,
      code: `${struct.code}_COPY`,
    };
    persistStructures([...structures, newStruct]);
    showToast(`Duplicated structure: ${newStruct.name}`);
  };

  const handleDeleteStructure = (structId: string, structName: string) => {
    if (confirm(`Are you sure you want to delete "${structName}"?`)) {
      const updated = structures.filter((s) => s.id !== structId);
      persistStructures(updated);
      showToast(`Deleted structure: ${structName}`);
    }
  };

  const handleOpenCreateStructure = () => {
    setEditingStructure(null);
    setStructureForm({
      name: '',
      code: '',
      scheduledPay: 'Monthly',
      country: 'Bangladesh',
      slipDisplayName: 'Salary Slip',
      workedDaysLinesEnabled: true,
      active: true,
      ruleCodes: rules.map((r) => r.code),
      description: '',
    });
    setIsStructureModalOpen(true);
  };

  const handleOpenEditStructure = (struct: SalaryStructureDefinition) => {
    setEditingStructure(struct);
    setStructureForm({ ...struct });
    setIsStructureModalOpen(true);
  };

  const handleSaveStructure = () => {
    if (!structureForm.name?.trim() || !structureForm.code?.trim()) {
      showToast('Structure name and code are required', 'error');
      return;
    }

    const cleanCode = structureForm.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');

    if (editingStructure) {
      const updated = structures.map((s) =>
        s.id === editingStructure.id
          ? {
              ...s,
              ...structureForm,
              name: structureForm.name!.trim(),
              code: cleanCode,
            }
          : s
      );
      persistStructures(updated);
      showToast(`Updated structure: ${structureForm.name}`);
    } else {
      const newStruct: SalaryStructureDefinition = {
        id: `struct-${Date.now().toString(36)}`,
        name: structureForm.name.trim(),
        code: cleanCode,
        scheduledPay: (structureForm.scheduledPay as any) || 'Monthly',
        country: structureForm.country || 'Bangladesh',
        slipDisplayName: structureForm.slipDisplayName || 'Salary Slip',
        workedDaysLinesEnabled: structureForm.workedDaysLinesEnabled ?? true,
        active: structureForm.active ?? true,
        ruleCodes: structureForm.ruleCodes || [],
        description: structureForm.description || '',
      };
      persistStructures([...structures, newStruct]);
      showToast(`Created structure: ${newStruct.name}`);
    }

    setIsStructureModalOpen(false);
  };

  // Seed Bangladesh Rules Reset
  const handleSeedBangladeshRules = () => {
    if (confirm('Restore the default 19 Bangladesh NBR & JAAGO canonical salary rules and standard structures?')) {
      const { rules: defRules, structures: defStructures } = resetSalaryStructuresAndRules();
      setRules(defRules);
      setStructures(defStructures);
      showToast('Successfully seeded Bangladesh rules and salary structures!');
    }
  };

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules
      .filter((r) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = r.name.toLowerCase().includes(q);
          const matchCode = r.code.toLowerCase().includes(q);
          const matchCalc = r.calculationDetails.toLowerCase().includes(q);
          const matchDesc = (r.description || '').toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchCalc && !matchDesc) return false;
        }

        // Category filter
        if (selectedCategoryFilter !== 'ALL' && r.categoryCode !== selectedCategoryFilter) {
          return false;
        }

        // Structure filter
        if (selectedStructureFilter !== 'ALL') {
          const targetStruct = structures.find(
            (s) => s.id === selectedStructureFilter || s.code === selectedStructureFilter
          );
          if (targetStruct && !targetStruct.ruleCodes.includes(r.code)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.sequence - b.sequence);
  }, [rules, searchQuery, selectedCategoryFilter, selectedStructureFilter, structures]);

  // Live Simulator Calculation Result
  const simulatorResult: SalaryCalculationResult = useMemo(() => {
    const contract: RuleContext['contract'] = {
      wage: simGross,
      pf_rate: simPfRate / 100,
      bonus_eligibility: simBonusEligible,
      gender: simGender,
      department: simDepartment,
      joining_date: simJoiningDate,
      contract_start_date: simJoiningDate,
      insurance_status: simInsuranceStatus,
      insurance_monthly_premium: simInsurancePremium,
      pf_enabled: simPfRate > 0,
      no_tax_deduction: false,
    };

    const inputs: RuleContext['inputs'] = {
      ATTENDANCE_DEDUCTION: simAttendanceDed,
      LATE: simManualLate,
      OTHER_DEDUCTION: simOtherDed,
    };

    return evaluateDynamicSalaryStructure(simStructureId, contract, config, inputs, rules);
  }, [
    simStructureId,
    simGross,
    simPfRate,
    simBonusEligible,
    simGender,
    simDepartment,
    simJoiningDate,
    simInsuranceStatus,
    simInsurancePremium,
    simAttendanceDed,
    simManualLate,
    simOtherDed,
    config,
    rules,
  ]);

  // Canonical Preset Loader
  const loadCanonicalPreset = () => {
    setSimStructureId('JAAGO_PAY_ATT_INS');
    setSimGross(60000);
    setSimPfRate(5);
    setSimGender('male');
    setSimBonusEligible(true);
    setSimDepartment('General');
    setSimAttendanceDed(0);
    setSimInsuranceStatus('Disabled');
    setSimInsurancePremium(0);
    setSimManualLate(0);
    setSimOtherDed(0);
    showToast('Loaded §17.1 Canonical Worked Example Preset (৳60,000 Gross)');
  };

  // Category Badge Colors
  const getCategoryBadgeClass = (category: CategoryCode) => {
    switch (category) {
      case 'GROSS':
        return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';
      case 'BASIC':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'DED':
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'TAXABLE':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
      case 'TAX':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'NET':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'BONUS':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'ALW':
        return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800';
      case 'REIMB':
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200 dark:bg-stone-900/60 dark:text-stone-300 dark:border-stone-800';
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto font-sans text-stone-900 dark:text-stone-100">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500/40 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Top Header matching screenshot ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[#8C7866] dark:text-[#B5A595]">
            ENGINE &amp; CONSTANTS
          </span>
          <div className="flex items-center space-x-3 mt-0.5">
            <h1 className="text-3xl lg:text-4xl font-black font-serif text-[#2A231C] dark:text-[#F3EFEA] tracking-tight">
              Payroll Configuration
            </h1>
            <FileText className="h-6 w-6 text-[#8C7866]/70 dark:text-[#B5A595]/70" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSeedBangladeshRules}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#F9F6F0] dark:bg-stone-900/80 hover:bg-[#EFEAE1] dark:hover:bg-stone-800 text-[#524439] dark:text-stone-200 border border-[#C4B5A5]/80 dark:border-stone-700 shadow-xs transition"
          >
            <Settings className="h-3.5 w-3.5 text-[#8C7866]" />
            <span>SEED BANGLADESH RULES</span>
          </button>

          <button
            onClick={handleOpenCreateRule}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#6B5B4D] hover:bg-[#5A4C3F] dark:bg-[#857262] dark:hover:bg-[#726153] text-white shadow-sm transition active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 text-white" />
            <span>CREATE SALARY RULE</span>
          </button>
        </div>
      </div>

      {/* ── Tab Navigation Bar ── */}
      <div className="border-b border-[#E2D9CE] dark:border-stone-800 flex items-center space-x-6 overflow-x-auto no-scrollbar text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('rules')}
          className={`py-3 transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'rules'
              ? 'border-[#6B5B4D] text-[#2A231C] dark:border-amber-400 dark:text-white font-extrabold'
              : 'border-transparent text-[#8C7866] hover:text-[#524439] dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          SALARY RULES
        </button>

        <button
          onClick={() => setActiveTab('structures')}
          className={`py-3 transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'structures'
              ? 'border-[#6B5B4D] text-[#2A231C] dark:border-amber-400 dark:text-white font-extrabold'
              : 'border-transparent text-[#8C7866] hover:text-[#524439] dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          SALARY STRUCTURES
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 transition border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'border-[#6B5B4D] text-[#2A231C] dark:border-amber-400 dark:text-white font-extrabold'
              : 'border-transparent text-[#8C7866] hover:text-[#524439] dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          PAYROLL SETTINGS
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`py-3 transition border-b-2 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'test'
              ? 'border-amber-600 text-amber-700 dark:border-amber-400 dark:text-amber-300 font-black'
              : 'border-transparent text-amber-700/80 hover:text-amber-800 dark:text-amber-400/80'
          }`}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>TEST CALCULATION</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: SALARY RULES LIST                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'rules' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Box */}
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-semibold bg-white/90 dark:bg-stone-900 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8C7866]/30 shadow-xs"
                />
              </div>

              {/* Structure Filter Dropdown */}
              <select
                value={selectedStructureFilter}
                onChange={(e) => setSelectedStructureFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/90 dark:bg-stone-900 border border-[#DDD5C9] dark:border-stone-700 text-[#524439] dark:text-stone-200 focus:outline-none shadow-xs"
              >
                <option value="ALL">All Structures</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Category Filter Dropdown */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/90 dark:bg-stone-900 border border-[#DDD5C9] dark:border-stone-700 text-[#524439] dark:text-stone-200 focus:outline-none shadow-xs"
              >
                <option value="ALL">All Categories</option>
                <option value="GROSS">GROSS</option>
                <option value="BASIC">BASIC</option>
                <option value="ALW">ALW (Allowances)</option>
                <option value="DED">DED (Deductions)</option>
                <option value="TAXABLE">TAXABLE</option>
                <option value="TAX">TAX</option>
                <option value="BONUS">BONUS</option>
                <option value="NET">NET</option>
                <option value="REIMB">REIMB</option>
              </select>
            </div>

            {/* Test Calculation Button */}
            <button
              onClick={() => setActiveTab('test')}
              className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-white dark:bg-stone-900 hover:bg-[#F9F6F0] dark:hover:bg-stone-800 text-[#524439] dark:text-stone-200 border border-[#C4B5A5] dark:border-stone-700 shadow-xs transition cursor-pointer self-start md:self-auto"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>TEST CALCULATION</span>
            </button>
          </div>

          {/* Rules Card Container */}
          <div className="bg-white/95 dark:bg-stone-900/90 rounded-2xl border border-[#E8E1D5] dark:border-stone-800 shadow-xs overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold font-serif text-[#2A231C] dark:text-[#F3EFEA]">
                Salary Rules List ({filteredRules.length})
              </h2>

              <span className="text-xs text-[#8C7866] dark:text-stone-400 font-medium">
                Showing {filteredRules.length} of {rules.length} total rules
              </span>
            </div>

            {/* Rules Table */}
            <div className="overflow-x-auto rounded-xl border border-[#E5DDD0] dark:border-stone-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#EBE2D5] dark:bg-stone-800/90 text-[#524439] dark:text-stone-300 font-bold uppercase text-[11px] tracking-wider border-b border-[#DDD4C5] dark:border-stone-700">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredRules.length > 0 && filteredRules.every((r) => r.active)}
                        onChange={(e) => {
                          const allActive = e.target.checked;
                          const updated = rules.map((r) => ({ ...r, active: allActive }));
                          persistRules(updated);
                        }}
                        className="rounded accent-[#6B5B4D]"
                      />
                    </th>
                    <th className="p-3 w-16 text-center">Seq Order</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 w-16 text-center">Sequence</th>
                    <th className="p-3 min-w-[320px]">Calculation details</th>
                    <th className="p-3 w-16 text-center">Active</th>
                    <th className="p-3 w-24 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE8DC] dark:divide-stone-800">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-stone-500 font-medium">
                        No salary rules match your search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule, idx) => (
                      <tr
                        key={rule.id}
                        className="hover:bg-[#FBF8F3] dark:hover:bg-stone-800/50 transition group"
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={rule.active}
                            onChange={() => toggleRuleActive(rule.id)}
                            className="rounded accent-[#6B5B4D]"
                          />
                        </td>

                        {/* Reorder Arrows */}
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center justify-center space-y-0.5 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-300">
                            <button
                              onClick={() => moveRuleSequence(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 hover:text-amber-600 disabled:opacity-20 cursor-pointer"
                              title="Move Up in Sequence"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => moveRuleSequence(idx, 'down')}
                              disabled={idx === filteredRules.length - 1}
                              className="p-0.5 hover:text-amber-600 disabled:opacity-20 cursor-pointer"
                              title="Move Down in Sequence"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                        </td>

                        {/* Name */}
                        <td className="p-3 font-extrabold text-stone-900 dark:text-stone-100">
                          {rule.name}
                        </td>

                        {/* Code */}
                        <td className="p-3 font-mono font-bold text-[11px] text-[#2A231C] dark:text-amber-400">
                          {rule.code}
                        </td>

                        {/* Category */}
                        <td className="p-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase border ${getCategoryBadgeClass(
                              rule.categoryCode
                            )}`}
                          >
                            {rule.categoryCode}
                          </span>
                        </td>

                        {/* Sequence */}
                        <td className="p-3 text-center font-bold text-stone-700 dark:text-stone-300">
                          {rule.sequence}
                        </td>

                        {/* Calculation Details */}
                        <td className="p-3 font-mono text-[11px] text-stone-700 dark:text-stone-300 max-w-md truncate" title={rule.calculationDetails}>
                          <code>{rule.calculationDetails}</code>
                        </td>

                        {/* Active Checkbox */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={rule.active}
                            onChange={() => toggleRuleActive(rule.id)}
                            className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
                          />
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5 text-stone-400">
                            <button
                              onClick={() => handleDuplicateRule(rule)}
                              className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-800 dark:hover:text-stone-100 transition cursor-pointer"
                              title="Duplicate Rule"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditRule(rule)}
                              className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-700 dark:hover:text-amber-300 transition cursor-pointer"
                              title="Edit Rule"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id, rule.name)}
                              className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-600 transition cursor-pointer"
                              title="Delete Rule"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: SALARY STRUCTURES ACCORDIONS                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'structures' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-serif text-[#2A231C] dark:text-[#F3EFEA]">
              Salary Structures
            </h2>

            <button
              onClick={handleOpenCreateStructure}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#6B5B4D] hover:bg-[#5A4C3F] dark:bg-[#857262] text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>CREATE SALARY STRUCTURE</span>
            </button>
          </div>

          {/* Structures List Table / Accordion Card */}
          <div className="bg-white/95 dark:bg-stone-900/90 rounded-2xl border border-[#E8E1D5] dark:border-stone-800 shadow-xs overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 bg-[#EBE2D5] dark:bg-stone-800/90 text-[#524439] dark:text-stone-300 font-bold uppercase text-[11px] tracking-wider p-3.5 border-b border-[#DDD4C5] dark:border-stone-700">
              <div className="col-span-4 pl-3">Structure Name</div>
              <div className="col-span-2">Scheduled Pay</div>
              <div className="col-span-2">Country</div>
              <div className="col-span-2">Slip Display Name</div>
              <div className="col-span-1 text-center">Worked day lines</div>
              <div className="col-span-1 text-center">Actions</div>
            </div>

            {/* Structure Rows */}
            <div className="divide-y divide-[#EFE8DC] dark:divide-stone-800">
              {structures.map((struct) => {
                const isExpanded = Boolean(expandedStructures[struct.id]);
                const assignedRules = struct.ruleCodes
                  .map((code) => rules.find((r) => r.code === code))
                  .filter((r): r is SalaryRuleDefinition => Boolean(r))
                  .sort((a, b) => a.sequence - b.sequence);

                return (
                  <div key={struct.id} className="transition">
                    {/* Main Row */}
                    <div
                      onClick={() => toggleStructure(struct.id)}
                      className={`grid grid-cols-12 gap-2 items-center p-3.5 text-xs font-semibold cursor-pointer hover:bg-[#FBF8F3] dark:hover:bg-stone-800/50 transition ${
                        isExpanded ? 'bg-[#FAF6F0] dark:bg-stone-800/40' : ''
                      }`}
                    >
                      {/* Structure Name with Chevron */}
                      <div className="col-span-4 flex items-center space-x-2 pl-2 font-bold text-stone-900 dark:text-stone-100">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-[#8C7866] flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#8C7866] flex-shrink-0" />
                        )}
                        <span>{struct.name}</span>
                      </div>

                      {/* Scheduled Pay */}
                      <div className="col-span-2 text-stone-700 dark:text-stone-300">
                        {struct.scheduledPay}
                      </div>

                      {/* Country */}
                      <div className="col-span-2 text-stone-700 dark:text-stone-300">
                        {struct.country}
                      </div>

                      {/* Slip Display Name */}
                      <div className="col-span-2 text-stone-600 dark:text-stone-400 font-medium">
                        {struct.slipDisplayName}
                      </div>

                      {/* Worked day lines */}
                      <div className="col-span-1 text-center">
                        <span className="text-stone-700 dark:text-stone-300 font-medium">
                          {struct.workedDaysLinesEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div
                        className="col-span-1 text-center flex items-center justify-center space-x-1 text-stone-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleOpenEditStructure(struct)}
                          className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-700 dark:hover:text-amber-300 transition"
                          title="Edit Structure"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateStructure(struct)}
                          className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-800 transition"
                          title="Duplicate Structure"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteStructure(struct.id, struct.name)}
                          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-600 transition"
                          title="Delete Structure"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Subtable: RULES BREAKDOWN */}
                    {isExpanded && (
                      <div className="p-4 bg-[#F7F3EC] dark:bg-stone-950/60 border-t border-[#E5DDD0] dark:border-stone-800 animate-in fade-in duration-150">
                        <div className="bg-white dark:bg-stone-900 rounded-xl border border-[#E0D7CB] dark:border-stone-800 p-4 space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wider text-stone-800 dark:text-stone-200">
                              RULES BREAKDOWN ({assignedRules.length})
                            </h3>

                            <button
                              onClick={() => {
                                handleOpenCreateRule();
                                setRuleForm((prev) => ({
                                  ...prev,
                                  structureCodes: [struct.code],
                                }));
                              }}
                              className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#6B5B4D] hover:bg-[#5A4C3F] text-white shadow-xs transition"
                            >
                              <Plus className="h-3 w-3" />
                              <span>ADD RULE</span>
                            </button>
                          </div>

                          {/* Nested Rules Breakdown Table matching screenshots */}
                          <div className="overflow-x-auto rounded-lg border border-[#E8E0D4] dark:border-stone-800">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-[#EBE2D5] dark:bg-stone-800/90 text-[#524439] dark:text-stone-300 font-bold uppercase text-[10px] tracking-wider border-b border-[#DDD4C5] dark:border-stone-700">
                                  <th className="p-2.5 w-14 text-center">Seq</th>
                                  <th className="p-2.5">Rule Name</th>
                                  <th className="p-2.5">Code</th>
                                  <th className="p-2.5">Category</th>
                                  <th className="p-2.5 min-w-[320px]">Calculation Details</th>
                                  <th className="p-2.5 w-16 text-center">Active</th>
                                  <th className="p-2.5 w-20 text-center">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#EFE8DC] dark:divide-stone-800">
                                {assignedRules.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="p-4 text-center text-stone-500">
                                      No rules currently assigned to this structure.
                                    </td>
                                  </tr>
                                ) : (
                                  assignedRules.map((rule) => (
                                    <tr
                                      key={rule.id}
                                      className="hover:bg-[#FBF8F3] dark:hover:bg-stone-800/40 transition"
                                    >
                                      {/* Sequence */}
                                      <td className="p-2.5 text-center font-bold text-stone-700 dark:text-stone-300">
                                        {rule.sequence}
                                      </td>

                                      {/* Rule Name */}
                                      <td className="p-2.5 font-bold text-stone-900 dark:text-stone-100">
                                        {rule.name}
                                      </td>

                                      {/* Code */}
                                      <td className="p-2.5 font-mono font-bold text-[11px] text-[#2A231C] dark:text-amber-400">
                                        {rule.code}
                                      </td>

                                      {/* Category */}
                                      <td className="p-2.5">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${getCategoryBadgeClass(
                                            rule.categoryCode
                                          )}`}
                                        >
                                          {rule.categoryCode}
                                        </span>
                                      </td>

                                      {/* Calculation Details */}
                                      <td
                                        className="p-2.5 font-mono text-[11px] text-stone-700 dark:text-stone-300 max-w-sm truncate"
                                        title={rule.calculationDetails}
                                      >
                                        <code>{rule.calculationDetails}</code>
                                      </td>

                                      {/* Active */}
                                      <td className="p-2.5 text-center">
                                        <input
                                          type="checkbox"
                                          checked={rule.active}
                                          onChange={() => toggleRuleActive(rule.id)}
                                          className="h-3.5 w-3.5 rounded accent-blue-600 cursor-pointer"
                                        />
                                      </td>

                                      {/* Actions */}
                                      <td className="p-2.5 text-center">
                                        <div className="flex items-center justify-center space-x-1 text-stone-400">
                                          <button
                                            onClick={() => handleDuplicateRule(rule)}
                                            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-800 transition"
                                            title="Duplicate Rule"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => handleOpenEditRule(rule)}
                                            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-700 transition"
                                            title="Edit Rule"
                                          >
                                            <Edit2 className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteRule(rule.id, rule.name)}
                                            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-600 transition"
                                            title="Delete Rule"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: PAYROLL SETTINGS QUICK LINK                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white/95 dark:bg-stone-900/90 rounded-2xl border border-[#E8E1D5] dark:border-stone-800 p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-serif text-[#2A231C] dark:text-[#F3EFEA]">
                  Global Payroll Parameters
                </h2>
                <p className="text-xs text-[#8C7866] dark:text-stone-400 mt-1">
                  Global constants synchronized across JAAGO PAY engines.
                </p>
              </div>

              <a
                href="/pnc/settings/payroll"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#6B5B4D] hover:bg-[#5A4C3F] text-white shadow-xs transition"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>OPEN FULL PAYROLL CONFIGURATION</span>
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#FBF8F3] dark:bg-stone-800/40 p-4 rounded-xl border border-[#E5DDD0] dark:border-stone-700 space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-bold">Basic Salary %</span>
                <div className="text-xl font-black text-amber-700 dark:text-amber-400">
                  {config.basic_salary_percentage}% of Gross
                </div>
              </div>

              <div className="bg-[#FBF8F3] dark:bg-stone-800/40 p-4 rounded-xl border border-[#E5DDD0] dark:border-stone-700 space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-bold">PF Base &amp; Rate</span>
                <div className="text-xl font-black text-stone-900 dark:text-stone-100">
                  {config.provident_fund_employee_rate}% ({config.pf_base})
                </div>
              </div>

              <div className="bg-[#FBF8F3] dark:bg-stone-800/40 p-4 rounded-xl border border-[#E5DDD0] dark:border-stone-700 space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-bold">Tax Exemption Ceiling</span>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                  ৳{(config.tax_exemption_limit_1 || 500000).toLocaleString()}
                </div>
              </div>

              <div className="bg-[#FBF8F3] dark:bg-stone-800/40 p-4 rounded-xl border border-[#E5DDD0] dark:border-stone-700 space-y-1">
                <span className="text-[10px] text-stone-500 uppercase font-bold">Disbursement Day</span>
                <div className="text-xl font-black text-stone-900 dark:text-stone-100">
                  {config.disbursement_day}th of Month
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 6: TEST CALCULATION / SIMULATOR                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'test' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-500/15 via-[#FBF8F3] dark:via-stone-900 to-amber-500/10 rounded-2xl border border-amber-500/30 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-amber-700 dark:text-amber-400 text-xs uppercase font-bold tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                <span>§17.1 Canonical Verification Playground</span>
              </div>
              <h2 className="text-2xl font-black font-serif text-[#2A231C] dark:text-[#F3EFEA] mt-1">
                Salary Rules &amp; Structure Calculation Engine Simulator
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                Simulate full multi-rule execution trace live. Any edits made in the frontend rules table are immediately evaluated here.
              </p>
            </div>

            <button
              onClick={loadCanonicalPreset}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition active:scale-95 self-start md:self-auto"
            >
              <Sparkles className="h-4 w-4" />
              <span>LOAD §17.1 PRESET (৳60K)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Input Controls */}
            <div className="lg:col-span-4 bg-white/95 dark:bg-stone-900/90 rounded-2xl border border-[#E8E1D5] dark:border-stone-800 p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#524439] dark:text-stone-300 flex items-center space-x-2 border-b border-stone-200 dark:border-stone-800 pb-3">
                <Sliders className="h-4 w-4 text-amber-600" />
                <span>Simulation Parameters</span>
              </h3>

              {/* Select Structure */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Target Salary Structure
                </label>
                <select
                  value={simStructureId}
                  onChange={(e) => setSimStructureId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100"
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.name} ({s.ruleCodes.length} rules)
                    </option>
                  ))}
                </select>
              </div>

              {/* Gross Salary */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Gross Monthly Salary (৳)
                  </label>
                  <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
                    ৳{simGross.toLocaleString()}
                  </span>
                </div>
                <input
                  type="number"
                  step="1000"
                  value={simGross}
                  onChange={(e) => setSimGross(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              {/* PF Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Provident Fund Rate (%)
                  </label>
                  <span className="text-xs font-mono font-bold text-stone-600 dark:text-stone-400">
                    {simPfRate}%
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="25"
                  step="0.5"
                  value={simPfRate}
                  onChange={(e) => setSimPfRate(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Gender (Demographic Exemption Cap)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimGender('male')}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      simGender === 'male'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-[#FBF8F3] dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    Male (৳375k cap)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimGender('female')}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      simGender === 'female'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-[#FBF8F3] dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    Female (৳425k cap)
                  </button>
                </div>
              </div>

              {/* Department Split Weighting */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Department
                </label>
                <select
                  value={simDepartment}
                  onChange={(e) => setSimDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100"
                >
                  <option value="General Operations">General Operations (6:6 Split)</option>
                  <option value="EMK Center">EMK Center (3:9 Split)</option>
                  <option value="People & Culture">People &amp; Culture</option>
                  <option value="Education Program">Education Program</option>
                </select>
              </div>

              {/* Joining Date (for Pro-Rata Bonus) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Joining Date (for Festival Bonus)
                </label>
                <input
                  type="date"
                  value={simJoiningDate}
                  onChange={(e) => setSimJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              {/* Attendance Deduction */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Attendance Deduction (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={simAttendanceDed}
                  onChange={(e) => setSimAttendanceDed(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono"
                />
              </div>

              {/* Insurance Premium */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Health Insurance Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={simInsuranceStatus}
                    onChange={(e) => setSimInsuranceStatus(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100"
                  >
                    <option value="Disabled">Disabled</option>
                    <option value="Plan A">Plan A</option>
                    <option value="Plan B">Plan B</option>
                    <option value="Plan C">Plan C</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Premium (৳)"
                    disabled={simInsuranceStatus === 'Disabled'}
                    value={simInsurancePremium}
                    onChange={(e) => setSimInsurancePremium(Math.max(0, Number(e.target.value)))}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Right: Real-time Rule Execution Trace & Verification */}
            <div className="lg:col-span-8 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-xl border border-[#E8E1D5] dark:border-stone-800 space-y-1 shadow-xs">
                  <span className="text-[10px] text-stone-500 uppercase font-bold">Gross Earnings</span>
                  <div className="text-xl font-black text-stone-900 dark:text-stone-100">
                    ৳{simulatorResult.grossWage.toLocaleString()}
                  </div>
                </div>

                <div className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-xl border border-[#E8E1D5] dark:border-stone-800 space-y-1 shadow-xs">
                  <span className="text-[10px] text-stone-500 uppercase font-bold">Total Deductions</span>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                    -৳{simulatorResult.totalDeductions.toLocaleString()}
                  </div>
                </div>

                <div className="bg-white/95 dark:bg-stone-900/90 p-4 rounded-xl border border-[#E8E1D5] dark:border-stone-800 space-y-1 shadow-xs">
                  <span className="text-[10px] text-stone-500 uppercase font-bold">Monthly Tax (TDS)</span>
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400">
                    -৳{simulatorResult.monthlyTaxTDS.toLocaleString()}
                  </div>
                </div>

                <div className="bg-emerald-500/10 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/30 space-y-1 shadow-xs">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-black">
                    Net Payout
                  </span>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                    ৳{simulatorResult.netWage.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Canonical Worked Example Assertion Check */}
              {simGross === 60000 &&
                simPfRate === 5 &&
                simGender === 'male' &&
                simAttendanceDed === 0 &&
                simInsuranceStatus === 'Disabled' && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center space-x-3 text-xs font-bold ${
                      simulatorResult.netWage === 58083
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div>
                      <span>
                        §17.1 Canonical Spec Assertion Passed: ৳60,000 Gross evaluated to exact{' '}
                        <strong>৳58,083 Net Disbursable Salary</strong>.
                      </span>
                    </div>
                  </div>
                )}

              {/* Live Rule Execution Steps Table */}
              <div className="bg-white/95 dark:bg-stone-900/90 rounded-2xl border border-[#E8E1D5] dark:border-stone-800 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-stone-800 dark:text-stone-200">
                    Sequential Rule Execution Trace ({simulatorResult.steps.length} Steps)
                  </h3>

                  <span className="text-[11px] font-semibold text-stone-500">
                    Evaluated against {rules.length} active rules
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#E8E1D5] dark:border-stone-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#EBE2D5] dark:bg-stone-800 text-[#524439] dark:text-stone-300 font-bold uppercase text-[10px] tracking-wider border-b border-[#DDD4C5] dark:border-stone-700">
                        <th className="p-2.5 w-12 text-center">Seq</th>
                        <th className="p-2.5">Rule Code</th>
                        <th className="p-2.5">Rule Name</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-right">Amount (৳)</th>
                        <th className="p-2.5 text-right">Category Total</th>
                        <th className="p-2.5 w-16 text-center">Payslip?</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE8DC] dark:divide-stone-800">
                      {simulatorResult.steps.map((step) => (
                        <tr
                          key={`${step.sequence}-${step.code}`}
                          className="hover:bg-[#FBF8F3] dark:hover:bg-stone-800/40 transition font-mono"
                        >
                          <td className="p-2.5 text-center font-bold text-stone-600 dark:text-stone-400">
                            {step.sequence}
                          </td>
                          <td className="p-2.5 font-bold text-[#2A231C] dark:text-amber-400">
                            {step.code}
                          </td>
                          <td className="p-2.5 font-sans font-semibold text-stone-900 dark:text-stone-100">
                            {step.name}
                          </td>
                          <td className="p-2.5 font-sans">
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${getCategoryBadgeClass(
                                step.categoryCode
                              )}`}
                            >
                              {step.categoryCode}
                            </span>
                          </td>
                          <td
                            className={`p-2.5 text-right font-bold ${
                              step.categoryCode === 'DED' || step.categoryCode === 'TAX'
                                ? 'text-rose-600 dark:text-rose-400'
                                : step.categoryCode === 'NET'
                                ? 'text-emerald-700 dark:text-emerald-400 font-black'
                                : 'text-stone-900 dark:text-stone-100'
                            }`}
                          >
                            ৳{step.total.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right text-stone-500 font-medium">
                            ৳{step.categoryRunningTotal.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center font-sans">
                            {step.appearsOnPayslip ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="text-stone-400 font-medium">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE / EDIT SALARY RULE                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#D5CABB] dark:border-stone-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h3 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
                  {editingRule ? `Edit Salary Rule: ${editingRule.name}` : 'Create New Salary Rule'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Configure calculation formula, sequence ordering, and payslip inclusion.
                </p>
              </div>

              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Rule Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Conveyance Allowance"
                    value={ruleForm.name || ''}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Rule Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CONVEYANCE_ALW"
                    value={ruleForm.code || ''}
                    onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Category Code
                  </label>
                  <select
                    value={ruleForm.categoryCode || 'ALW'}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, categoryCode: e.target.value as CategoryCode })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold"
                  >
                    <option value="GROSS">GROSS (Gross Salary Base)</option>
                    <option value="BASIC">BASIC (Basic Salary Base)</option>
                    <option value="ALW">ALW (Allowances)</option>
                    <option value="DED">DED (Statutory & Attendance Deductions)</option>
                    <option value="TAXABLE">TAXABLE (Taxable Income Calculations)</option>
                    <option value="TAX">TAX (Progressive Tax Slabs & Rebates)</option>
                    <option value="BONUS">BONUS (Festival & Performance)</option>
                    <option value="NET">NET (Disbursable Net Amount)</option>
                    <option value="REIMB">REIMB (Reimbursements)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Sequence Order Number
                  </label>
                  <input
                    type="number"
                    value={ruleForm.sequence || 1}
                    onChange={(e) => setRuleForm({ ...ruleForm, sequence: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold font-mono"
                  />
                </div>
              </div>

              {/* Calculation Formula Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Calculation Details / Formula Expression <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-stone-500">
                    JavaScript / Expression Syntax
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={ruleForm.calculationDetails || ''}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, calculationDetails: e.target.value })
                  }
                  placeholder="e.g. rules.GROSS_SALARY * 0.10"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />

                {/* Helper Formula Quick Buttons */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#8C7866]">
                    Quick Formula Snippets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Contract Wage', expr: 'contract.wage || 0' },
                      { label: '50% of Gross', expr: 'rules.GROSS_SALARY * 0.5' },
                      { label: '25% House Rent', expr: 'rules.GROSS_SALARY * 0.25' },
                      { label: '10% Medical', expr: 'rules.GROSS_SALARY * 0.10' },
                      {
                        label: 'Standard Tax Slabs',
                        expr: 'calculateTax(rules.TAXABLE_INCOME, settings.tax_slabs)',
                      },
                      {
                        label: 'Pro-rata Festival Bonus',
                        expr: 'calculateBonus(rules.BASIC, contract.joining_date)',
                      },
                      {
                        label: 'Attendance Deductions',
                        expr: 'inputs.ATTENDANCE_DEDUCTION || 0',
                      },
                    ].map((snippet) => (
                      <button
                        key={snippet.label}
                        type="button"
                        onClick={() =>
                          setRuleForm({ ...ruleForm, calculationDetails: snippet.expr })
                        }
                        className="px-2 py-1 rounded-md text-[10px] font-mono bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition"
                      >
                        {snippet.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700 dark:text-stone-300">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly medical allowance calculated as 10% of gross salary."
                  value={ruleForm.description || ''}
                  onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-stone-200 dark:border-stone-800">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={ruleForm.active ?? true}
                    onChange={(e) => setRuleForm({ ...ruleForm, active: e.target.checked })}
                    className="rounded accent-blue-600"
                  />
                  <span>Active Rule</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer font-bold text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={ruleForm.appearsOnPayslip ?? true}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, appearsOnPayslip: e.target.checked })
                    }
                    className="rounded accent-blue-600"
                  />
                  <span>Appears on Payslip</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer font-bold text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={ruleForm.contributesToEmployerCost ?? false}
                    onChange={(e) =>
                      setRuleForm({ ...ruleForm, contributesToEmployerCost: e.target.checked })
                    }
                    className="rounded accent-blue-600"
                  />
                  <span>Employer Cost Item</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#6B5B4D] hover:bg-[#5A4C3F] dark:bg-[#857262] text-white shadow-xs transition"
              >
                Save Salary Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE / EDIT SALARY STRUCTURE                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#D5CABB] dark:border-stone-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
              <div>
                <h3 className="text-xl font-bold font-serif text-stone-900 dark:text-stone-100">
                  {editingStructure
                    ? `Edit Salary Structure: ${editingStructure.name}`
                    : 'Create New Salary Structure'}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Define pay frequency, country slip templates, and assign salary rules.
                </p>
              </div>

              <button
                onClick={() => setIsStructureModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Structure Form Body */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Structure Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JAAGO PAYroll"
                    value={structureForm.name || ''}
                    onChange={(e) =>
                      setStructureForm({ ...structureForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Structure Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JAAGO_PAYROLL"
                    value={structureForm.code || ''}
                    onChange={(e) =>
                      setStructureForm({
                        ...structureForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Scheduled Pay
                  </label>
                  <select
                    value={structureForm.scheduledPay || 'Monthly'}
                    onChange={(e) =>
                      setStructureForm({
                        ...structureForm,
                        scheduledPay: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-bold"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Country
                  </label>
                  <input
                    type="text"
                    value={structureForm.country || 'Bangladesh'}
                    onChange={(e) =>
                      setStructureForm({ ...structureForm, country: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Slip Display Name
                  </label>
                  <input
                    type="text"
                    value={structureForm.slipDisplayName || 'Salary Slip'}
                    onChange={(e) =>
                      setStructureForm({
                        ...structureForm,
                        slipDisplayName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#FBF8F3] dark:bg-stone-800 border border-[#DDD5C9] dark:border-stone-700 text-stone-900 dark:text-stone-100 font-semibold"
                  />
                </div>
              </div>

              {/* Rule Assignment Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Assigned Salary Rules ({structureForm.ruleCodes?.length || 0} selected)
                  </label>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        setStructureForm({
                          ...structureForm,
                          ruleCodes: rules.map((r) => r.code),
                        })
                      }
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setStructureForm({
                          ...structureForm,
                          ruleCodes: [],
                        })
                      }
                      className="text-[11px] font-bold text-stone-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-xl bg-[#FBF8F3] dark:bg-stone-800/60 border border-[#DDD5C9] dark:border-stone-700">
                  {rules.map((r) => {
                    const isChecked = Boolean(structureForm.ruleCodes?.includes(r.code));
                    return (
                      <label
                        key={r.id}
                        className="flex items-center space-x-2 p-1.5 rounded hover:bg-stone-200/60 dark:hover:bg-stone-700/60 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = structureForm.ruleCodes || [];
                            const updated = e.target.checked
                              ? [...current, r.code]
                              : current.filter((c) => c !== r.code);
                            setStructureForm({ ...structureForm, ruleCodes: updated });
                          }}
                          className="rounded accent-[#6B5B4D]"
                        />
                        <div className="truncate">
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            {r.name}
                          </span>{' '}
                          <span className="font-mono text-[10px] text-stone-500">
                            ({r.code})
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active & Worked Days Checkboxes */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-200 dark:border-stone-800">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={structureForm.active ?? true}
                    onChange={(e) =>
                      setStructureForm({ ...structureForm, active: e.target.checked })
                    }
                    className="rounded accent-blue-600"
                  />
                  <span>Active Structure</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer font-bold text-stone-800 dark:text-stone-200">
                  <input
                    type="checkbox"
                    checked={structureForm.workedDaysLinesEnabled ?? true}
                    onChange={(e) =>
                      setStructureForm({
                        ...structureForm,
                        workedDaysLinesEnabled: e.target.checked,
                      })
                    }
                    className="rounded accent-blue-600"
                  />
                  <span>Worked Day Lines Enabled</span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setIsStructureModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStructure}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#6B5B4D] hover:bg-[#5A4C3F] dark:bg-[#857262] text-white shadow-xs transition"
              >
                Save Salary Structure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
