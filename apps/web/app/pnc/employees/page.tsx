'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Upload,
  Download,
  Plus,
  Search,
  RotateCw,
  X,
  UserPlus,
  Mail,
  CheckCircle2,
  Check,
  ExternalLink,
  Edit3,
  Archive,
  Trash2,
  Send,
  Loader2,
  FileText,
  AlertTriangle,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Sparkles,
  Building2,
  Briefcase,
  MapPin,
  Layers,
  Users,
  Clock,
  User,
  Shield,
  ShieldAlert,
  CalendarDays,
  DollarSign,
  Copy,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  EmployeeProfileDetail,
  FullEmployeeProfile,
  EmployeeStatus,
} from '@/components/pnc/employee-profile-detail';
import {
  fetchEmployeesFromSupabase,
  saveEmployeeToSupabase,
  bulkImportEmployeesToSupabase,
  archiveEmployeesInSupabase,
  unarchiveEmployeesInSupabase,
  deleteEmployeesFromSupabase,
} from '@/lib/supabase-employees';
import { syncEmployeeToLocalUser } from '@/lib/user-profile-sync';
import {
  exportEmployeesToComprehensiveCSV,
  parseComprehensiveEmployeeCSV,
} from '@/lib/employee-csv-helper';
import {
  ALL_EMPLOYEE_COLUMNS,
  DEFAULT_VISIBLE_COLUMN_KEYS,
  getCategorizedColumns,
  EmployeeColumnConfig,
} from '@/lib/employee-columns-config';
import {
  OrganizationEntity,
  OrganizationBranch,
  DepartmentItem,
  DesignationItem,
  ProjectItem,
  TeamItem,
  fetchOrganizationsFromSupabase,
  fetchBranchesFromSupabase,
  fetchDepartmentsFromSupabase,
  fetchDesignationsFromSupabase,
  fetchProjectsFromSupabase,
  fetchTeamsFromSupabase,
} from '@/lib/supabase-organization';
import { getLocalShifts, ShiftItem } from '@/lib/supabase-attendance';
import { hasPermission, isDspDepartment, isDspOnlyScoped } from '@/lib/rbac-guard';

export default function PnCEmployeesPage() {
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);

  // ── RBAC PERMISSION STATE ──
  const [rbacLoaded, setRbacLoaded] = useState(false);
  const [canViewAllEmployees, setCanViewAllEmployees] = useState(false);
  const [canViewDeptEmployees, setCanViewDeptEmployees] = useState(false);
  const [canCreateEmployee, setCanCreateEmployee] = useState(false);
  const [canEditEmployee, setCanEditEmployee] = useState(false);
  const [canDeleteEmployee, setCanDeleteEmployee] = useState(false);
  const [canExportEmployee, setCanExportEmployee] = useState(false);
  const [canImportEmployee, setCanImportEmployee] = useState(false);
  const [canMassUpdateEmployee, setCanMassUpdateEmployee] = useState(false);
  const [userDepartment, setUserDepartment] = useState('');

  // Current selected employee for the rich tab-wise profile view (null = Table view)
  const [selectedProfile, setSelectedProfile] = useState<FullEmployeeProfile | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');

  // Master Organization Data for Filters & Cascades
  const [masterOrganizations, setMasterOrganizations] = useState<OrganizationEntity[]>([]);
  const [masterBranches, setMasterBranches] = useState<OrganizationBranch[]>([]);
  const [masterDepartments, setMasterDepartments] = useState<DepartmentItem[]>([]);
  const [masterDesignations, setMasterDesignations] = useState<DesignationItem[]>([]);
  const [masterProjects, setMasterProjects] = useState<ProjectItem[]>([]);
  const [masterTeams, setMasterTeams] = useState<TeamItem[]>([]);
  const [masterShifts, setMasterShifts] = useState<ShiftItem[]>([]);

  // ── MASS UPDATE MODAL STATE ──
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false);
  const [massUpdateField, setMassUpdateField] = useState<keyof FullEmployeeProfile>('department');
  const [massUpdateValue, setMassUpdateValue] = useState<string>('');
  const [massUpdateSearch, setMassUpdateSearch] = useState<string>('');
  const [isApplyingMassUpdate, setIsApplyingMassUpdate] = useState(false);

  // ── CONFIRM MASS UPDATE "SMART WINDOW" STATE ──
  const [confirmMassUpdateData, setConfirmMassUpdateData] = useState<{
    targetCodes: string[];
    field: keyof FullEmployeeProfile;
    fieldLabel: string;
    newValue: any;
    affectedEmployees: FullEmployeeProfile[];
  } | null>(null);
  const [confirmSearchQuery, setConfirmSearchQuery] = useState<string>('');

  // ── ODOO-STYLE INLINE CELL QUICK POPOVER STATE ──
  const [activeInlineEditor, setActiveInlineEditor] = useState<{
    empCode: string;
    field: keyof FullEmployeeProfile;
    anchorRect: { top: number; left: number; width: number; height: number; bottom: number };
    currentValue: string;
  } | null>(null);
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');
  const inlineEditorRef = useRef<HTMLDivElement>(null);

  // Click outside to close Inline Cell Editor Popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inlineEditorRef.current && !inlineEditorRef.current.contains(event.target as Node)) {
        setActiveInlineEditor(null);
        setInlineSearchQuery('');
      }
    }
    if (activeInlineEditor) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeInlineEditor]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importParsedResult, setImportParsedResult] = useState<{
    employees: FullEmployeeProfile[];
    errors: string[];
    totalParsed: number;
  } | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

  // Current logged in user info
  const [currentUser, setCurrentUser] = useState({
    fullName: 'Nasif Kamal',
    jobTitle: 'Coordinator',
  });

  // Invite Success Modal State & Controls
  const [showInviteSuccessModal, setShowInviteSuccessModal] = useState<{
    employee: FullEmployeeProfile;
    emailPayload: {
      to: string;
      personalEmail?: string;
      recipientName?: string;
      employeeCode?: string;
      designation?: string;
      department?: string;
      branch?: string;
      subject?: string;
      userId: string;
      tempPassword: string;
      loginUrl: string;
      securityNote?: string;
      htmlEmail?: string;
      fullEmailText?: string;
      sentAt: string;
      autoSent?: boolean;
    };
  } | null>(null);
  const [modalTab, setModalTab] = useState<'preview' | 'credentials' | 'text'>('preview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [customToEmail, setCustomToEmail] = useState('');
  const [customCCEmail, setCustomCCEmail] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'ACTIVE' | 'TERMINATED' | 'RESIGNED' | 'INCOMPLETE' | 'ARCHIVED'
  >('ALL');

  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  // ── COLUMN SELECTION & CUSTOMIZATION ──
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<(keyof FullEmployeeProfile)[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jaago_pnc_employee_custom_columns_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_VISIBLE_COLUMN_KEYS;
  });
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  // ── SORTING STATE (Default: A to Z by Employee Name) ──
  const [sortKey, setSortKey] = useState<keyof FullEmployeeProfile | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');

  // Categorized Columns for Dropdown Popover
  const categorizedColumns = useMemo(() => getCategorizedColumns(), []);

  // Visible Column Config Objects
  const visibleColumnConfigs = useMemo(() => {
    return visibleColumnKeys
      .map((key) => ALL_EMPLOYEE_COLUMNS.find((c) => c.key === key))
      .filter((c): c is EmployeeColumnConfig => Boolean(c));
  }, [visibleColumnKeys]);

  // Click outside to close Columns Popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(event.target as Node)) {
        setIsColumnsMenuOpen(false);
      }
    }
    if (isColumnsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnsMenuOpen]);

  // Column Selection Handlers
  const handleToggleColumn = (key: keyof FullEmployeeProfile) => {
    let nextKeys: (keyof FullEmployeeProfile)[];
    if (visibleColumnKeys.includes(key)) {
      if (visibleColumnKeys.length <= 1) return;
      nextKeys = visibleColumnKeys.filter((k) => k !== key);
    } else {
      nextKeys = [...visibleColumnKeys, key];
    }
    setVisibleColumnKeys(nextKeys);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jaago_pnc_employee_custom_columns_v2', JSON.stringify(nextKeys));
      } catch {}
    }
  };

  const handleResetColumns = () => {
    setVisibleColumnKeys(DEFAULT_VISIBLE_COLUMN_KEYS);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jaago_pnc_employee_custom_columns_v2', JSON.stringify(DEFAULT_VISIBLE_COLUMN_KEYS));
      } catch {}
    }
  };

  const handleSelectAllColumns = () => {
    const allKeys = ALL_EMPLOYEE_COLUMNS.map((c) => c.key);
    setVisibleColumnKeys(allKeys);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jaago_pnc_employee_custom_columns_v2', JSON.stringify(allKeys));
      } catch {}
    }
  };

  // Sorting Handler
  const handleSort = (key: keyof FullEmployeeProfile) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        if (key === 'name') {
          setSortDirection('asc');
        } else {
          setSortKey('name');
          setSortDirection('asc');
        }
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const checkRbac = () => {
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('jaago_user') : null;
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed.fullName) {
          setCurrentUser({
            fullName: parsed.fullName,
            jobTitle: parsed.jobTitle || 'Staff Member',
          });
        }
        setUserDepartment(parsed.department || '');

        const rawRole = (parsed.role || (Array.isArray(parsed.roles) ? parsed.roles[0] : '') || 'USER').toString();
        const rawRoleUpper = rawRole.toUpperCase();
        const isSuper =
          parsed.isSuperAdmin === true ||
          rawRoleUpper === 'SUPER_ADMIN' ||
          rawRole.toLowerCase() === 'super_admin' ||
          Boolean(parsed.email && parsed.email.toLowerCase().includes('nasif.kamal'));

        const viewAll = isSuper || hasPermission('hr.employees.view_all', parsed);
        const viewDept = isSuper || viewAll || hasPermission('hr.employees.view_dept', parsed);
        const createEmp = isSuper || hasPermission('hr.employees.create', parsed);
        const editEmp = isSuper || hasPermission('hr.employees.edit', parsed);
        const deleteEmp = isSuper || hasPermission('hr.employees.delete', parsed);
        const exportEmp = isSuper || hasPermission('hr.employees.export', parsed);
        const importEmp = isSuper || hasPermission('hr.employees.import', parsed);
        const massUpdateEmp = isSuper || hasPermission('hr.employees.mass_update', parsed);

        setCanViewAllEmployees(viewAll);
        setCanViewDeptEmployees(viewDept);
        setCanCreateEmployee(createEmp);
        setCanEditEmployee(editEmp);
        setCanDeleteEmployee(deleteEmp);
        setCanExportEmployee(exportEmp);
        setCanImportEmployee(importEmp);
        setCanMassUpdateEmployee(massUpdateEmp);
        setRbacLoaded(true);
      } else {
        setRbacLoaded(true);
      }
    } catch {
      setRbacLoaded(true);
    }
  };

  // Hydrate state on client mount and fetch Supabase Source of Truth
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('jaago_pnc_employees_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setEmployees(parsed);
          }
        }
      } catch {}

      try {
        const savedOrg = localStorage.getItem('jaago_selected_org');
        if (savedOrg && savedOrg !== 'ALL') setSelectedOrg(savedOrg);
        const savedDept = localStorage.getItem('jaago_selected_dept');
        if (savedDept && savedDept !== 'ALL') setSelectedDept(savedDept);
      } catch {}

      checkRbac();

      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('id');
      const isNewAction = params.get('action') === 'new';

      if (isNewAction) {
        setSelectedProfile({} as FullEmployeeProfile);
      }

      // Fetch latest employees directly from Supabase PostgreSQL (Single Source of Truth)
      fetchEmployeesFromSupabase()
        .then((remoteData) => {
          if (remoteData !== null && remoteData.length > 0) {
            // Check if local cache has more employees (e.g. from an import) to avoid wiping them out
            try {
              const cached = localStorage.getItem('jaago_pnc_employees_v2');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > remoteData.length) {
                  const map = new Map(parsed.map((e: FullEmployeeProfile) => [e.code.toLowerCase(), e]));
                  remoteData.forEach((e) => map.set(e.code.toLowerCase(), e));
                  const merged = Array.from(map.values());
                  setEmployees(merged);
                  bulkImportEmployeesToSupabase(merged);
                  return;
                }
              }
            } catch {}

            setEmployees(remoteData);
            try {
              localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(remoteData));
            } catch {}

            if (urlId) {
              const target = remoteData.find((e) => e.id === urlId || e.code === urlId);
              if (target) setSelectedProfile(target);
            }
          } else if (remoteData !== null && remoteData.length === 0) {
            // Check if local cache has imported employees to restore and auto-sync to Supabase
            try {
              const cached = localStorage.getItem('jaago_pnc_employees_v2');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setEmployees(parsed);
                  bulkImportEmployeesToSupabase(parsed);
                }
              }
            } catch {}
          }
        });

      // Fetch Organization Master Data for dynamic filters & mass updates
      Promise.all([
        fetchOrganizationsFromSupabase(),
        fetchBranchesFromSupabase(),
        fetchDepartmentsFromSupabase(),
        fetchDesignationsFromSupabase(),
        fetchProjectsFromSupabase(),
        fetchTeamsFromSupabase(),
      ]).then(([orgs, branches, depts, desigs, projs, tms]) => {
        if (orgs) setMasterOrganizations(orgs);
        if (branches) setMasterBranches(branches);
        if (depts) setMasterDepartments(depts);
        if (desigs) setMasterDesignations(desigs);
        if (projs) setMasterProjects(projs);
        if (tms) setMasterTeams(tms);
        const shifts = getLocalShifts();
        if (shifts) setMasterShifts(shifts);
      });
    }
  }, []);

  // Live real-time synchronization when any entity is renamed, updated, or added in Organization/Department/Project/Team modules
  useEffect(() => {
    const handleEntityRenamed = (event: any) => {
      const { entityType, oldName, newName } = event.detail || {};
      if (!entityType || !oldName || !newName) return;

      const trimmedOld = oldName.trim().toLowerCase();
      const trimmedNew = newName.trim();

      // 1. Immediately update all in-memory employee records
      setEmployees((prev) =>
        prev.map((emp) => {
          const updated = { ...emp };
          if (entityType === 'organization' && emp.organization?.trim().toLowerCase() === trimmedOld) {
            updated.organization = trimmedNew;
          }
          if (entityType === 'department' && emp.department?.trim().toLowerCase() === trimmedOld) {
            updated.department = trimmedNew;
          }
          if (entityType === 'designation' && emp.designation?.trim().toLowerCase() === trimmedOld) {
            updated.designation = trimmedNew;
          }
          if (entityType === 'branch' && emp.branch?.trim().toLowerCase() === trimmedOld) {
            updated.branch = trimmedNew;
          }
          if (entityType === 'project' && emp.project?.trim().toLowerCase() === trimmedOld) {
            updated.project = trimmedNew;
          }
          if (entityType === 'team' && emp.team?.trim().toLowerCase() === trimmedOld) {
            updated.team = trimmedNew;
          }
          return updated;
        })
      );

      // 2. Refresh master entity lists
      fetchOrganizationsFromSupabase().then(setMasterOrganizations);
      fetchDepartmentsFromSupabase().then(setMasterDepartments);
      fetchBranchesFromSupabase().then(setMasterBranches);
      fetchDesignationsFromSupabase().then(setMasterDesignations);
      fetchProjectsFromSupabase().then(setMasterProjects);
      fetchTeamsFromSupabase().then(setMasterTeams);
    };

    const handleEntityUpdated = () => {
      fetchOrganizationsFromSupabase().then(setMasterOrganizations);
      fetchDepartmentsFromSupabase().then(setMasterDepartments);
      fetchBranchesFromSupabase().then(setMasterBranches);
      fetchDesignationsFromSupabase().then(setMasterDesignations);
      fetchProjectsFromSupabase().then(setMasterProjects);
      fetchTeamsFromSupabase().then(setMasterTeams);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jaago_pnc_employees_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setEmployees(parsed);
          }
        } catch {}
      }
    };

    const handleUserRevoked = (event: any) => {
      const { userId, email } = event.detail || {};
      if (!userId && !email) return;

      const cleanEmail = email ? String(email).toLowerCase().trim() : null;

      // Immediately reset is_user on the matching employee in memory & storage
      setEmployees((prev) => {
        const next = prev.map((emp) => {
          const isMatch =
            (userId && (emp.userId === userId || emp.id === userId)) ||
            (cleanEmail &&
              ((emp.workEmail && emp.workEmail.toLowerCase().trim() === cleanEmail) ||
                (emp.personalEmail && emp.personalEmail.toLowerCase().trim() === cleanEmail)));

          return isMatch ? { ...emp, isUser: false, userId: '' } : emp;
        });

        try {
          localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(next));
        } catch {}

        return next;
      });
    };

    const handleOrgChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSelectedOrg(detail === 'ALL' || !detail ? '' : detail);
    };

    const handleDeptChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSelectedDept(detail === 'ALL' || !detail ? '' : detail);
    };

    window.addEventListener('jaago_entity_renamed', handleEntityRenamed);
    window.addEventListener('jaago_entity_updated', handleEntityUpdated);
    window.addEventListener('jaago_user_revoked', handleUserRevoked);
    window.addEventListener('jaago_user_updated', checkRbac);
    window.addEventListener('jaago_rbac_updated', checkRbac);
    window.addEventListener('jaago_org_changed', handleOrgChanged);
    window.addEventListener('jaago_dept_changed', handleDeptChanged);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('jaago_entity_renamed', handleEntityRenamed);
      window.removeEventListener('jaago_entity_updated', handleEntityUpdated);
      window.removeEventListener('jaago_user_revoked', handleUserRevoked);
      window.removeEventListener('jaago_user_updated', checkRbac);
      window.removeEventListener('jaago_rbac_updated', checkRbac);
      window.removeEventListener('jaago_org_changed', handleOrgChanged);
      window.removeEventListener('jaago_dept_changed', handleDeptChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

// ═══════════════════════════════════════════════════════════════════════════
// FILTER NORMALIZATION & CANONICAL DEDUPLICATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function normalizeOrgKey(str: string | null | undefined): string {
  if (!str) return '';
  const lower = str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (lower.includes('trust') || lower.includes('jft')) return 'jaago foundation trust';
  if (lower.includes('inc') || lower.includes('jfi')) return 'jaago foundation inc';
  if (lower.includes('uk')) return 'jaago foundation uk';
  if (lower.includes('emk')) return 'emk center';
  if (lower.includes('jaago foundation') || lower === 'jf') return 'jaago foundation';
  return lower;
}

function toCanonicalOrgName(raw: string): string {
  const norm = normalizeOrgKey(raw);
  if (norm === 'jaago foundation trust') return 'JAAGO Foundation Trust';
  if (norm === 'jaago foundation inc') return 'JAAGO Foundation INC';
  if (norm === 'jaago foundation uk') return 'JAAGO Foundation UK';
  if (norm === 'jaago foundation') return 'JAAGO Foundation';
  if (norm === 'emk center') return 'EMK Center';
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

  // ── DYNAMIC HIERARCHICAL FILTERS DATA (CONNECTED TO ORGANIZATION MASTER DATA) ──
  // 1. Available Organizations (Deduplicated, with live employee counts)
  const availableOrganizations = useMemo(() => {
    const orgMap = new Map<string, { label: string; count: number }>();

    masterOrganizations.forEach((o) => {
      if (o.name && !o.isArchived) {
        const canonical = toCanonicalOrgName(o.name);
        const key = canonical.toLowerCase();
        if (!orgMap.has(key)) {
          orgMap.set(key, { label: canonical, count: 0 });
        }
      }
    });

    employees.forEach((e) => {
      if (!e.organization || !e.organization.trim()) return;
      const canonical = toCanonicalOrgName(e.organization);
      const key = canonical.toLowerCase();
      const existing = orgMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        orgMap.set(key, { label: canonical, count: 1 });
      }
    });

    return Array.from(orgMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [masterOrganizations, employees]);

  // 2. Available Departments (Connected to selected Organization, with live counts)
  const availableDepartments = useMemo(() => {
    if (isDspOnlyScoped()) {
      const dspCount = employees.filter((e) => isDspDepartment(e.department, e.leaveGroup)).length;
      return [{ label: 'Digital School Program', count: dspCount }];
    }

    const deptMap = new Map<string, { label: string; count: number }>();

    masterDepartments.forEach((d) => {
      if (!d.name || d.isArchived) return;
      const key = d.name.trim().toLowerCase();
      if (!deptMap.has(key)) {
        deptMap.set(key, { label: d.name.trim(), count: 0 });
      }
    });

    employees.forEach((e) => {
      if (!e.department || !e.department.trim()) return;
      if (selectedOrg) {
        if (normalizeOrgKey(e.organization) !== normalizeOrgKey(selectedOrg)) return;
      }
      const key = e.department.trim().toLowerCase();
      const existing = deptMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        deptMap.set(key, { label: e.department.trim(), count: 1 });
      }
    });

    return Array.from(deptMap.values())
      .filter((d) => d.count > 0 || !selectedOrg)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [masterDepartments, employees, selectedOrg]);

  // 3. Available Branches (Connected to selected Organization, with live counts)
  const availableBranches = useMemo(() => {
    const branchMap = new Map<string, { label: string; count: number }>();

    masterBranches.forEach((b) => {
      if (!b.name) return;
      const key = b.name.trim().toLowerCase();
      if (!branchMap.has(key)) {
        branchMap.set(key, { label: b.name.trim(), count: 0 });
      }
    });

    employees.forEach((e) => {
      if (isDspOnlyScoped() && !isDspDepartment(e.department, e.leaveGroup)) return;
      if (!e.branch || !e.branch.trim()) return;
      if (selectedOrg) {
        if (normalizeOrgKey(e.organization) !== normalizeOrgKey(selectedOrg)) return;
      }
      const key = e.branch.trim().toLowerCase();
      const existing = branchMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        branchMap.set(key, { label: e.branch.trim(), count: 1 });
      }
    });

    return Array.from(branchMap.values())
      .filter((b) => b.count > 0 || !selectedOrg)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [masterBranches, employees, selectedOrg]);

  // 4. Available Projects (Connected to selected Organization & Department, with live counts)
  const availableProjects = useMemo(() => {
    const prjMap = new Map<string, { label: string; count: number }>();

    masterProjects.forEach((p) => {
      if (p.name && !p.isArchived) {
        const key = p.name.trim().toLowerCase();
        if (!prjMap.has(key)) {
          prjMap.set(key, { label: p.name.trim(), count: 0 });
        }
      }
    });

    employees.forEach((e) => {
      if (isDspOnlyScoped() && !isDspDepartment(e.department, e.leaveGroup)) return;
      if (!e.project || !e.project.trim() || e.project === 'General Operations') return;
      if (selectedOrg) {
        if (normalizeOrgKey(e.organization) !== normalizeOrgKey(selectedOrg)) return;
      }
      if (selectedDept) {
        if (e.department.trim().toLowerCase() !== selectedDept.trim().toLowerCase()) return;
      }
      const key = e.project.trim().toLowerCase();
      const existing = prjMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        prjMap.set(key, { label: e.project.trim(), count: 1 });
      }
    });

    return Array.from(prjMap.values())
      .filter((p) => p.count > 0 || (!selectedOrg && !selectedDept))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [masterProjects, employees, selectedOrg, selectedDept]);

  // 5. Available Designations (Connected to selected Organization & Department, with live counts)
  const availableDesignations = useMemo(() => {
    const desigMap = new Map<string, { label: string; count: number }>();

    masterDesignations.forEach((d) => {
      if (d.name && !d.isArchived) {
        const key = d.name.trim().toLowerCase();
        if (!desigMap.has(key)) {
          desigMap.set(key, { label: d.name.trim(), count: 0 });
        }
      }
    });

    employees.forEach((e) => {
      if (isDspOnlyScoped() && !isDspDepartment(e.department, e.leaveGroup)) return;
      if (!e.designation || !e.designation.trim()) return;
      if (selectedOrg) {
        if (normalizeOrgKey(e.organization) !== normalizeOrgKey(selectedOrg)) return;
      }
      if (selectedDept) {
        if (e.department.trim().toLowerCase() !== selectedDept.trim().toLowerCase()) return;
      }
      const key = e.designation.trim().toLowerCase();
      const existing = desigMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        desigMap.set(key, { label: e.designation.trim(), count: 1 });
      }
    });

    return Array.from(desigMap.values())
      .filter((d) => d.count > 0 || (!selectedOrg && !selectedDept))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [masterDesignations, employees, selectedOrg, selectedDept]);

  // Persist employees state to localStorage
  const persistEmployees = (updatedList: FullEmployeeProfile[]) => {
    setEmployees(updatedList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(updatedList));
      } catch {}
    }
  };

  // Filter & Sort employees (Hierarchical connection across all entities)
  const filtered = useMemo(() => {
    const isDspScope = isDspOnlyScoped();
    const list = employees.filter((emp) => {
      if (isDspScope && !isDspDepartment(emp.department, emp.leaveGroup)) {
        return false;
      }

      const isArchived = emp.status === 'Archived' || Boolean(emp.isArchived);

      // If ARCHIVED tab is selected, show ONLY archived employees
      if (activeTab === 'ARCHIVED') {
        if (!isArchived) return false;
      } else {
        // In all standard tabs, NEVER show archived employees
        if (isArchived) return false;
      }

      if (activeTab === 'ACTIVE' && emp.status !== 'Active') return false;
      if (activeTab === 'TERMINATED' && emp.status !== 'Terminated') return false;
      if (activeTab === 'RESIGNED' && emp.status !== 'Resigned') return false;
      if (activeTab === 'INCOMPLETE' && emp.status !== 'Incomplete') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchCode = emp.code.toLowerCase().includes(q);
        const matchEmail = (emp.workEmail || '').toLowerCase().includes(q);
        const matchDesig = (emp.designation || '').toLowerCase().includes(q);
        const matchDept = (emp.department || '').toLowerCase().includes(q);
        const matchOrg = (emp.organization || '').toLowerCase().includes(q);
        const matchBranch = (emp.branch || '').toLowerCase().includes(q);
        const matchProj = (emp.project || '').toLowerCase().includes(q);
        const matchTeam = (emp.team || '').toLowerCase().includes(q);
        if (
          !matchName &&
          !matchCode &&
          !matchEmail &&
          !matchDesig &&
          !matchDept &&
          !matchOrg &&
          !matchBranch &&
          !matchProj &&
          !matchTeam
        ) {
          return false;
        }
      }

      if (selectedOrg) {
        if (normalizeOrgKey(emp.organization) !== normalizeOrgKey(selectedOrg)) {
          return false;
        }
      }

      if (selectedDept) {
        if (emp.department.trim().toLowerCase() !== selectedDept.trim().toLowerCase()) {
          return false;
        }
      }

      if (selectedBranch) {
        if (emp.branch.trim().toLowerCase() !== selectedBranch.trim().toLowerCase()) {
          return false;
        }
      }

      if (selectedProject) {
        if ((emp.project || '').trim().toLowerCase() !== selectedProject.trim().toLowerCase()) {
          return false;
        }
      }

      if (selectedDesignation) {
        if (emp.designation.trim().toLowerCase() !== selectedDesignation.trim().toLowerCase()) {
          return false;
        }
      }

      // RBAC Scope Check: If user cannot view all employees, scope only to their assigned department
      if (!canViewAllEmployees && canViewDeptEmployees && userDepartment) {
        if ((emp.department || '').trim().toLowerCase() !== userDepartment.trim().toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    const effectiveKey: keyof FullEmployeeProfile = sortKey || 'name';
    const effectiveDirection: 'asc' | 'desc' = sortDirection || 'asc';

    list.sort((a, b) => {
      const valA = a[effectiveKey];
      const valB = b[effectiveKey];

      if (valA === undefined || valA === null || valA === '') return 1;
      if (valB === undefined || valB === null || valB === '') return -1;

      let cmp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        cmp = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        cmp = valA === valB ? 0 : valA ? -1 : 1;
      } else {
        cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      }

      return effectiveDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [
    employees,
    activeTab,
    searchQuery,
    selectedOrg,
    selectedDept,
    selectedBranch,
    selectedProject,
    selectedDesignation,
    sortKey,
    sortDirection,
    canViewAllEmployees,
    canViewDeptEmployees,
    userDepartment,
  ]);

  // Dynamic Cell Content Renderer
  const renderCellContent = (emp: FullEmployeeProfile, colKey: keyof FullEmployeeProfile) => {
    const val = emp[colKey];

    if (colKey === 'name') {
      const initials = emp.name
        ? emp.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'EM';
      return (
        <div className="flex items-center space-x-3">
          {emp.avatarUrl ? (
            <div className="h-9 w-9 rounded-full overflow-hidden relative shadow-sm border border-border flex-shrink-0">
              <Image
                src={emp.avatarUrl}
                alt={emp.name}
                fill
                sizes="36px"
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-9 w-9 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0 border border-amber-500/20">
              {initials}
            </div>
          )}
          <div>
            <div className="font-extrabold text-foreground group-hover:text-amber-500 transition">
              {emp.name}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              ID: {emp.code}
            </div>
            {emp.workEmail && (
              <div className="text-[10px] text-muted-foreground/80">{emp.workEmail}</div>
            )}
          </div>
        </div>
      );
    }

    if (colKey === 'status') {
      return <div className="text-center">{getStatusBadge(emp.status)}</div>;
    }

    if (colKey === 'isUser') {
      return (
        <div className="text-center">
          {emp.isUser ? (
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold inline-flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>User Active</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-[10px] font-medium">
              No
            </span>
          )}
        </div>
      );
    }

    if (colKey === 'noTaxDeduction') {
      return <span>{emp.noTaxDeduction ? 'Yes' : 'No'}</span>;
    }

    if (
      [
        'wage',
        'salaryJulDec',
        'salaryJanJun',
        'regularSalary',
        'temporarySalary',
        'totalCurrentSalary',
        'extraPayment',
        'insuranceMonthlyPremium',
      ].includes(colKey as string)
    ) {
      const num = Number(val || 0);
      return (
        <span className="font-mono font-bold text-foreground">
          ৳{num.toLocaleString()}
        </span>
      );
    }

    if (
      colKey === 'joiningDate' ||
      colKey === 'contractEndDate' ||
      colKey === 'birthday' ||
      colKey === 'adjustmentStartDate' ||
      colKey === 'adjustmentEndDate'
    ) {
      return (
        <span className="font-mono text-[11px] text-muted-foreground">
          {val ? String(val).slice(0, 10) : '—'}
        </span>
      );
    }

    if (val === undefined || val === null || val === '') {
      return <span className="text-muted-foreground/40 text-[11px]">—</span>;
    }

    return <span className="text-foreground/90 font-medium">{String(val)}</span>;
  };

  // Handle saving employee profile from detail view
  const handleSaveProfile = async (updatedProfile: FullEmployeeProfile) => {
    const existingIndex = employees.findIndex((e) => e.id === updatedProfile.id || e.code === updatedProfile.code);
    let newList: FullEmployeeProfile[];

    if (existingIndex >= 0) {
      newList = [...employees];
      newList[existingIndex] = updatedProfile;
    } else {
      newList = [updatedProfile, ...employees];
    }

    persistEmployees(newList);
    setSelectedProfile(null); // Auto close window and show Employee List view
    setToastMessage(`Employee profile for "${updatedProfile.name}" saved successfully.`);
    setTimeout(() => setToastMessage(null), 3500);

    // Save to Supabase PostgreSQL in background
    await saveEmployeeToSupabase(updatedProfile, updatedProfile.logHistory);
    syncEmployeeToLocalUser(updatedProfile);
  };

  // Create User Account from Employee and send Invite Email
  const handleCreateUserForEmployee = async (emp: FullEmployeeProfile) => {
    try {
      let emailToUse = (emp.workEmail || '').trim().toLowerCase();
      if (!emailToUse || !emailToUse.includes('@')) {
        const cleanName = (emp.name || 'employee')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '.')
          .replace(/\.+/g, '.')
          .replace(/^\.|\.$/g, '');
        emailToUse = `${cleanName || 'employee'}@jaago.com.bd`;
      }

      const res = await fetch('/api/v1/users/create-from-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: emp.name,
          email: emailToUse,
          personalEmail: emp.personalEmail,
          department: emp.department,
          designation: emp.designation,
          employeeCode: emp.code,
          branch: emp.branch,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedEmp: FullEmployeeProfile = {
          ...emp,
          isUser: true,
          workEmail: emailToUse,
          userId: data.data?.user?.id || '',
        };
        const updatedList = employees.map((e) =>
          e.id === emp.id || e.code === emp.code ? updatedEmp : e
        );
        persistEmployees(updatedList);
        await saveEmployeeToSupabase(updatedEmp);

        if (selectedProfile && (selectedProfile.id === emp.id || selectedProfile.code === emp.code)) {
          setSelectedProfile(updatedEmp);
        }

        const payload = data.data.emailPayload;
        setShowInviteSuccessModal({
          employee: updatedEmp,
          emailPayload: payload,
        });
        setModalTab('preview');
        setCustomToEmail(payload.to || emailToUse);
        setCustomCCEmail(payload.personalEmail || emp.personalEmail || '');
        setCustomSubject(payload.subject || `Welcome to JAAGO HUB — Official Account Credentials for ${emp.name}`);
        setToastMessage(`✓ User account created for ${emp.name}`);
        setTimeout(() => setToastMessage(null), 3500);
      } else {
        alert(data.error || 'Failed to create user account');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  // Comprehensive Export CSV Handler (All 88 fields from all 7 tabs)
  const handleExportCSV = () => {
    try {
      const csvContent = exportEmployeesToComprehensiveCSV(employees);
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `jaago_employees_all_fields_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToastMessage(`✓ Exported all ${employees.length} employee records with complete 88 fields`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert('Failed to generate CSV export: ' + err.message);
    }
  };

  // CSV File Selection & Instant Parsing
  const handleCSVFileSelect = (file: File) => {
    setImportFile(file);
    setImportErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const result = parseComprehensiveEmployeeCSV(text);
        if (!result.success && result.employees.length === 0) {
          setImportErrorMsg(result.errors.join('\n') || 'Failed to parse CSV file.');
          setImportParsedResult(null);
        } else {
          setImportParsedResult(result);
        }
      } catch (err: any) {
        setImportErrorMsg(err.message || 'Error reading CSV file');
        setImportParsedResult(null);
      }
    };
    reader.readAsText(file);
  };

  // Process Batch Import & Upsert to Supabase + Auto-Define Master Entities + Local State
  const handleProcessImport = async () => {
    if (!importParsedResult || importParsedResult.employees.length === 0) return;
    setIsProcessingImport(true);
    try {
      const newOrUpdated = importParsedResult.employees;

      // 1. High-Performance Bulk Sync directly to Supabase PostgREST
      const importRes = await bulkImportEmployeesToSupabase(newOrUpdated);
      if (!importRes.success && importRes.error) {
        throw new Error(importRes.error);
      }

      // 2. Merge into state and local storage
      const existingMap = new Map(employees.map((e) => [e.code.toLowerCase(), e]));
      newOrUpdated.forEach((emp) => {
        existingMap.set(emp.code.toLowerCase(), emp);
      });
      const mergedList = Array.from(existingMap.values());

      setEmployees(mergedList);
      persistEmployees(mergedList);

      // 3. Re-fetch Master Organization Data to instantly reflect newly auto-defined entities
      const [freshOrgs, freshBranches, freshDepts, freshDesigs] = await Promise.all([
        fetchOrganizationsFromSupabase(),
        fetchBranchesFromSupabase(),
        fetchDepartmentsFromSupabase(),
        fetchDesignationsFromSupabase(),
      ]);
      if (freshOrgs) setMasterOrganizations(freshOrgs);
      if (freshBranches) setMasterBranches(freshBranches);
      if (freshDepts) setMasterDepartments(freshDepts);
      if (freshDesigs) setMasterDesignations(freshDesigs);

      // 4. Reset active filters so user sees all imported records immediately
      setSelectedOrg('');
      setSelectedDept('');
      setSelectedBranch('');
      setSelectedDesignation('');
      setSearchQuery('');

      setShowImportModal(false);
      setImportFile(null);
      setImportParsedResult(null);

      const totalCount = importRes.totalUpserted || newOrUpdated.length;
      const deptCount = importRes.autoDefined?.departments || 0;
      const desigCount = importRes.autoDefined?.designations || 0;
      const branchCount = importRes.autoDefined?.branches || 0;

      setToastMessage(
        `✓ Successfully imported & synchronized ${totalCount} employee records! Auto-defined ${deptCount} departments, ${desigCount} designations, and ${branchCount} branches.`
      );
      setTimeout(() => setToastMessage(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Import processing error');
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Helper for Status Badge in Table
  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            Active
          </span>
        );
      case 'Terminated':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20">
            Terminated
          </span>
        );
      case 'Resigned':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20">
            Resigned
          </span>
        );
      case 'Incomplete':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
            Incomplete
          </span>
        );
      case 'Archived':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-slate-400 bg-slate-500/10 border border-slate-500/20">
            Archived
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-muted-foreground bg-muted border border-border">
            {status}
          </span>
        );
    }
  };

  // ── MASS EDITABLE FIELDS DEFINITION ──
  const MASS_EDITABLE_FIELDS: { key: keyof FullEmployeeProfile; label: string; icon: any; category: string }[] = [
    { key: 'department', label: 'Department', icon: Building2, category: 'Work Hierarchy' },
    { key: 'designation', label: 'Designation / Job Position', icon: Briefcase, category: 'Work Hierarchy' },
    { key: 'organization', label: 'Company / Organization', icon: Building2, category: 'Work Hierarchy' },
    { key: 'branch', label: 'Branch / Campus', icon: MapPin, category: 'Work Hierarchy' },
    { key: 'project', label: 'Project', icon: Layers, category: 'Work Hierarchy' },
    { key: 'team', label: 'Team / Squad', icon: Users, category: 'Work Hierarchy' },
    { key: 'workingSchedule', label: 'Working Schedule / Shift', icon: Clock, category: 'Operations' },
    { key: 'supervisor', label: 'Direct Supervisor', icon: User, category: 'Work Hierarchy' },
    { key: 'secondarySupervisor', label: 'Secondary Supervisor', icon: User, category: 'Work Hierarchy' },
    { key: 'status', label: 'Employment Status', icon: Shield, category: 'Employment' },
    { key: 'employeeType', label: 'Employee Type', icon: Briefcase, category: 'Employment' },
    { key: 'contractType', label: 'Contract Type', icon: FileText, category: 'Employment' },
    { key: 'leaveGroup', label: 'Leave Group', icon: CalendarDays, category: 'Leave & Attendance' },
    { key: 'leavePolicy', label: 'Leave Policy', icon: CalendarDays, category: 'Leave & Attendance' },
    { key: 'officeDays', label: 'Office Days', icon: CalendarDays, category: 'Operations' },
    { key: 'officeHours', label: 'Office Hours', icon: Clock, category: 'Operations' },
    { key: 'weekendDays', label: 'Weekly Off / Weekend Days', icon: CalendarDays, category: 'Operations' },
    { key: 'overtimeEligible', label: 'Overtime Eligibility', icon: Sparkles, category: 'Payroll' },
    { key: 'wageType', label: 'Wage Type', icon: DollarSign, category: 'Payroll' },
    { key: 'bonusEligibility', label: 'Bonus Eligibility', icon: DollarSign, category: 'Payroll' },
    { key: 'pfApplies', label: 'Provident Fund (PF)', icon: DollarSign, category: 'Payroll' },
    { key: 'insuranceStatus', label: 'Insurance Status', icon: Shield, category: 'Insurance' },
    { key: 'workLocation', label: 'Work Location', icon: MapPin, category: 'Operations' },
  ];

  // Helper to extract options for any editable field
  const getFieldOptions = (field: keyof FullEmployeeProfile): { label: string; value: string }[] => {
    switch (field) {
      case 'department': {
        const map = new Map<string, string>();
        masterDepartments.forEach((d) => {
          if (d.name && d.name.trim()) map.set(d.name.trim().toLowerCase(), d.name.trim());
        });
        employees.forEach((e) => {
          if (e.department && e.department.trim()) map.set(e.department.trim().toLowerCase(), e.department.trim());
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v }));
      }
      case 'designation': {
        const map = new Map<string, string>();
        masterDesignations.forEach((d) => {
          if (d.name && d.name.trim()) map.set(d.name.trim().toLowerCase(), d.name.trim());
        });
        employees.forEach((e) => {
          if (e.designation && e.designation.trim()) map.set(e.designation.trim().toLowerCase(), e.designation.trim());
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v }));
      }
      case 'organization': {
        const map = new Map<string, string>();
        masterOrganizations.forEach((o) => {
          if (o.name && o.name.trim()) map.set(o.name.trim().toLowerCase(), o.name.trim());
        });
        employees.forEach((e) => {
          if (e.organization && e.organization.trim()) map.set(e.organization.trim().toLowerCase(), e.organization.trim());
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v }));
      }
      case 'branch': {
        const map = new Map<string, string>();
        masterBranches.forEach((b) => {
          if (b.name && b.name.trim()) map.set(b.name.trim().toLowerCase(), b.name.trim());
        });
        employees.forEach((e) => {
          if (e.branch && e.branch.trim()) map.set(e.branch.trim().toLowerCase(), e.branch.trim());
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v }));
      }
      case 'project': {
        const map = new Map<string, string>();
        masterProjects.forEach((p) => {
          if (p.name && p.name.trim()) map.set(p.name.trim().toLowerCase(), p.name.trim());
        });
        employees.forEach((e) => {
          if (e.project && e.project.trim()) map.set(e.project.trim().toLowerCase(), e.project.trim());
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v }));
      }
      case 'team': {
        const map = new Map<string, string>();
        masterTeams.forEach((t) => {
          if (t.name && t.name.trim()) map.set(t.name.trim().toLowerCase(), t.name.trim());
        });
        employees.forEach((e) => {
          if (e.team && e.team.trim()) map.set(e.team.trim().toLowerCase(), e.team.trim());
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v }));
      }
      case 'workingSchedule': {
        const set = new Set<string>();
        masterShifts.forEach((s) => set.add(`${s.name} (${s.officeStart} - ${s.officeEnd})`));
        employees.forEach((e) => {
          if (e.workingSchedule && e.workingSchedule.trim()) set.add(e.workingSchedule.trim());
        });
        return Array.from(set).map((v) => ({ label: v, value: v }));
      }
      case 'supervisor':
      case 'secondarySupervisor': {
        return employees
          .filter((e) => e.status !== 'Archived' && !e.isArchived)
          .map((e) => ({
            label: `${e.name} (${e.code}) • ${e.designation}`,
            value: e.name,
          }));
      }
      case 'status': {
        return [
          { label: 'Active', value: 'Active' },
          { label: 'Terminated', value: 'Terminated' },
          { label: 'Resigned', value: 'Resigned' },
          { label: 'Incomplete', value: 'Incomplete' },
          { label: 'Archived', value: 'Archived' },
        ];
      }
      case 'employeeType': {
        return [
          { label: 'Permanent', value: 'Permanent' },
          { label: 'Contractual', value: 'Contractual' },
          { label: 'Volunteer', value: 'Volunteer' },
          { label: 'Intern', value: 'Intern' },
          { label: 'Consultant', value: 'Consultant' },
        ];
      }
      case 'contractType': {
        return [
          { label: 'Full Time', value: 'Full Time' },
          { label: 'Part Time', value: 'Part Time' },
          { label: 'Shift', value: 'Shift' },
          { label: 'Hourly', value: 'Hourly' },
          { label: 'Commission', value: 'Commission' },
        ];
      }
      case 'leaveGroup': {
        return [
          { label: 'Standard Full-time', value: 'Standard Full-time' },
          { label: 'DSP Faculty Group', value: 'DSP Faculty Group' },
          { label: 'Project Staff', value: 'Project Staff' },
          { label: 'Casual/Intern Pool', value: 'Casual/Intern Pool' },
        ];
      }
      case 'leavePolicy': {
        return [
          { label: 'Standard Full-time Employee Policy (14 CL + 10 SL + 15 EL)', value: 'Standard Full-time Employee Policy' },
          { label: 'Executive & Management Policy (16 CL + 14 SL + 18 EL)', value: 'Executive & Management Policy' },
          { label: 'DSP School Faculty Policy (Academic Calendar Based)', value: 'DSP School Faculty Policy' },
          { label: 'Contractual & Project Staff Policy (Pro-rated)', value: 'Contractual & Project Staff Policy' },
          { label: 'Probationary Staff Policy (Emergency Only)', value: 'Probationary Staff Policy' },
        ];
      }
      case 'officeDays': {
        return [
          { label: 'Sunday to Thursday', value: 'Sunday to Thursday' },
          { label: 'Sunday to Thursday (Full Week)', value: 'Sunday to Thursday (Full Week)' },
          { label: 'Monday to Friday', value: 'Monday to Friday' },
          { label: 'Saturday to Wednesday', value: 'Saturday to Wednesday' },
        ];
      }
      case 'officeHours': {
        return [
          { label: '10:00 AM - 06:00 PM', value: '10:00 AM - 06:00 PM' },
          { label: '09:00 AM - 05:00 PM', value: '09:00 AM - 05:00 PM' },
          { label: '08:00 AM - 04:00 PM', value: '08:00 AM - 04:00 PM' },
          { label: '08:30 AM - 04:30 PM', value: '08:30 AM - 04:30 PM' },
          { label: '07:30 AM - 03:30 PM', value: '07:30 AM - 03:30 PM' },
        ];
      }
      case 'weekendDays': {
        return [
          { label: 'Friday & Saturday (Standard 5-Day Week)', value: 'Friday & Saturday' },
          { label: 'Friday Only (6-Day Field/School Week)', value: 'Friday Only' },
          { label: 'Sunday to Thursday (Rotational 5-Day)', value: 'Sunday to Thursday' },
          { label: 'Saturday Only (Rotational Single Off)', value: 'Saturday Only' },
        ];
      }
      case 'overtimeEligible': {
        return [
          { label: 'No / Not Applicable (Salaried Staff)', value: 'No' },
          { label: 'Yes (Standard 1.5x Hourly Rate)', value: 'Yes' },
          { label: 'Fixed (Fixed Overtime Allowance)', value: 'Fixed' },
        ];
      }
      case 'wageType': {
        return [
          { label: 'Fixed', value: 'Fixed' },
          { label: 'Hourly', value: 'Hourly' },
          { label: 'Monthly', value: 'Monthly' },
          { label: 'Stipend', value: 'Stipend' },
        ];
      }
      case 'bonusEligibility': {
        return [
          { label: 'Yes', value: 'Yes' },
          { label: 'No', value: 'No' },
        ];
      }
      case 'pfApplies': {
        return [
          { label: 'Yes', value: 'Yes' },
          { label: 'No', value: 'No' },
        ];
      }
      case 'insuranceStatus': {
        return [
          { label: 'Active', value: 'Active' },
          { label: 'Inactive', value: 'Inactive' },
        ];
      }
      case 'workLocation': {
        return [
          { label: 'Banani, Dhaka', value: 'Banani, Dhaka' },
          { label: 'Rayer Bazar Free School', value: 'Rayer Bazar Free School' },
          { label: 'Chittagong Campus', value: 'Chittagong Campus' },
          { label: 'Cox\'s Bazar Branch', value: 'Cox\'s Bazar Branch' },
          { label: 'Rajshahi Campus', value: 'Rajshahi Campus' },
        ];
      }
      default:
        return [];
    }
  };

  // Open "Are You Confirm?" Smart Window for Mass Update
  const requestMassUpdateConfirmation = (targetCodes: string[], field: keyof FullEmployeeProfile, value: any) => {
    if (targetCodes.length === 0) return;
    const fieldConfig = ALL_EMPLOYEE_COLUMNS.find((c) => c.key === field);
    const fieldLabel = fieldConfig ? fieldConfig.label : String(field);

    const targetSet = new Set(targetCodes);
    const affected = employees.filter((emp) => targetSet.has(emp.code));

    setConfirmMassUpdateData({
      targetCodes,
      field,
      fieldLabel,
      newValue: value,
      affectedEmployees: affected,
    });
    setConfirmSearchQuery('');

    // Close any previous popovers or initial modals
    setShowMassUpdateModal(false);
    setActiveInlineEditor(null);
    setInlineSearchQuery('');
  };

  // Execute Mass Update upon User Confirmation from the Smart Window
  const handleExecuteMassUpdateFinal = async () => {
    if (!confirmMassUpdateData) return;
    const { targetCodes, field, fieldLabel, newValue } = confirmMassUpdateData;
    if (targetCodes.length === 0) return;

    setIsApplyingMassUpdate(true);
    try {
      const targetSet = new Set(targetCodes);
      const updatedList = employees.map((emp) => {
        if (targetSet.has(emp.code)) {
          return {
            ...emp,
            [field]: newValue,
          };
        }
        return emp;
      });

      // 1. Update local state & cache immediately
      setEmployees(updatedList);
      persistEmployees(updatedList);

      // 2. Filter only updated records to send to Supabase bulk endpoint
      const modifiedRecords = updatedList.filter((emp) => targetSet.has(emp.code));
      const res = await bulkImportEmployeesToSupabase(modifiedRecords);

      if (!res.success && res.error) {
        throw new Error(res.error);
      }

      setToastMessage(
        `✓ Successfully updated ${fieldLabel} to "${newValue}" for ${targetCodes.length} employee${targetCodes.length > 1 ? 's' : ''}!`
      );
      setTimeout(() => setToastMessage(null), 6000);

      // Close confirmation modal
      setConfirmMassUpdateData(null);
      setConfirmSearchQuery('');
    } catch (err: any) {
      alert(`Mass update error: ${err?.message || 'Failed to update employees in database'}`);
    } finally {
      setIsApplyingMassUpdate(false);
    }
  };

  // Memoized options for Inline Quick Cell Popover
  const inlineFilteredOptions = useMemo(() => {
    if (!activeInlineEditor) return [];
    const allOpts = getFieldOptions(activeInlineEditor.field);
    if (!inlineSearchQuery.trim()) return allOpts;
    const q = inlineSearchQuery.toLowerCase();
    return allOpts.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [
    activeInlineEditor,
    inlineSearchQuery,
    masterDepartments,
    masterDesignations,
    masterOrganizations,
    masterBranches,
    masterProjects,
    masterTeams,
    masterShifts,
    employees,
  ]);

  // Memoized options for Mass Update Modal
  const modalFilteredOptions = useMemo(() => {
    const allOpts = getFieldOptions(massUpdateField);
    if (!massUpdateSearch.trim()) return allOpts;
    const q = massUpdateSearch.toLowerCase();
    return allOpts.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [
    massUpdateField,
    massUpdateSearch,
    masterDepartments,
    masterDesignations,
    masterOrganizations,
    masterBranches,
    masterProjects,
    masterTeams,
    masterShifts,
    employees,
  ]);

  // Bulk Actions Handlers
  const handleArchiveSelected = async () => {
    if (selectedCodes.length === 0) return;
    const updated = employees.map((e) =>
      selectedCodes.includes(e.code) ? { ...e, status: 'Archived' as EmployeeStatus, isArchived: true } : e
    );
    persistEmployees(updated);
    await archiveEmployeesInSupabase(selectedCodes);
    setSelectedCodes([]);
  };

  const handleUnarchiveSelected = async () => {
    if (selectedCodes.length === 0) return;
    const updated = employees.map((e) =>
      selectedCodes.includes(e.code) ? { ...e, status: 'Active' as EmployeeStatus, isArchived: false } : e
    );
    persistEmployees(updated);
    await unarchiveEmployeesInSupabase(selectedCodes);
    setSelectedCodes([]);
  };

  const handleDeleteEmployee = async (code: string) => {
    const updated = employees.filter((e) => e.code !== code);
    persistEmployees(updated);
    if (selectedProfile?.code === code) {
      setSelectedProfile(null);
    }
    await deleteEmployeesFromSupabase([code]);
  };

  const handleDeleteSelected = async () => {
    if (selectedCodes.length === 0) return;
    const updated = employees.filter((e) => !selectedCodes.includes(e.code));
    persistEmployees(updated);
    await deleteEmployeesFromSupabase(selectedCodes);
    setSelectedCodes([]);
  };

  // If a profile is selected, render the rich tab-wise Employee Profile Detail View
  if (selectedProfile !== null) {
    return (
      <div className="p-2 sm:p-4 select-none">
        <EmployeeProfileDetail
          initialData={selectedProfile.id ? selectedProfile : null}
          allEmployees={employees.map((e) => ({
            id: e.id,
            name: e.name,
            code: e.code,
            designation: e.designation,
            department: e.department,
            avatarUrl: e.avatarUrl,
            organization: e.organization,
            branch: e.branch,
            project: e.project,
            team: e.team,
            workingSchedule: e.workingSchedule,
          }))}
          currentUser={currentUser}
          readOnly={!canEditEmployee}
          onSave={handleSaveProfile}
          onBack={() => setSelectedProfile(null)}
          onDelete={canDeleteEmployee ? handleDeleteEmployee : undefined}
          onCreateUser={canCreateEmployee ? handleCreateUserForEmployee : undefined}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RBAC ACCESS RESTRICTION FALLBACK
  // ═══════════════════════════════════════════════════════════════════════
  if (rbacLoaded && !canViewDeptEmployees && !canViewAllEmployees) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-lg mx-auto min-h-[60vh] space-y-5 animate-in fade-in zoom-in-95 select-none">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
          <ShieldAlert className="h-9 w-9 stroke-[2.5]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            You do not have permission to view employee records. Role-Based Access Control requires <code className="text-amber-500 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">hr.employees.view_all</code> or <code className="text-amber-500 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">hr.employees.view_dept</code> permission.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-primary/20 transition transform active:scale-95 cursor-pointer"
          >
            <span>Return to My Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN EMPLOYEE LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-400 flex items-center space-x-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-200" />
          <span className="text-xs font-bold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-emerald-700/50 rounded-lg transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── 1. HEADER SECTION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-muted-foreground pb-1">
            <Link href="/pnc" className="hover:text-primary hover:underline transition cursor-pointer">
              People and Culture
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Employees</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-foreground">
            Employee List
          </h1>
          <p className="text-xs font-semibold text-muted-foreground pt-1" suppressHydrationWarning>
            {employees.filter((e) => e.status !== 'Archived' && !e.isArchived).length} active employee records managed across all entities
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {canImportEmployee && (
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 rounded-2xl bg-card border border-border text-xs font-bold text-foreground hover:border-primary/50 transition flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              <span>IMPORT</span>
            </button>
          )}

          {canCreateEmployee && (
            <button
              onClick={() => setSelectedProfile({} as FullEmployeeProfile)}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-black transition flex items-center space-x-2 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>NEW EMPLOYEE</span>
            </button>
          )}

          {canExportEmployee && (
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 rounded-2xl bg-card border border-border text-xs font-bold text-foreground hover:border-primary/50 transition flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>EXPORT</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. STATUS FILTER TABS (With ARCHIVED) ── */}
      <div className="flex items-center space-x-6 border-b border-border/60 text-xs font-extrabold tracking-wider text-muted-foreground overflow-x-auto pb-0.5">
        {(['ALL', 'ACTIVE', 'TERMINATED', 'RESIGNED', 'INCOMPLETE', 'ARCHIVED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setSelectedCodes([]);
            }}
            className={`pb-3 transition relative cursor-pointer whitespace-nowrap ${
              activeTab === tab
                ? 'text-amber-500 dark:text-amber-400 font-black'
                : 'hover:text-foreground'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── 3. SEARCH & HIERARCHICAL FILTERS BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, email, keywords..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
        </div>

        {/* 1. Organization Filter */}
        <div>
          <select
            value={selectedOrg}
            onChange={(e) => {
              setSelectedOrg(e.target.value);
            }}
            className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm cursor-pointer"
          >
            <option value="">Organization (All)</option>
            {availableOrganizations.map((org) => (
              <option key={org.label} value={org.label}>
                {org.label} {org.count > 0 ? `(${org.count})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Department Filter */}
        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm cursor-pointer"
          >
            <option value="">Department (All)</option>
            {availableDepartments.map((dept) => (
              <option key={dept.label} value={dept.label}>
                {dept.label} {dept.count > 0 ? `(${dept.count})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Branch Filter */}
        <div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm cursor-pointer"
          >
            <option value="">Branch (All)</option>
            {availableBranches.map((branch) => (
              <option key={branch.label} value={branch.label}>
                {branch.label} {branch.count > 0 ? `(${branch.count})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Project Filter */}
        <div>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm cursor-pointer"
          >
            <option value="">Project (All)</option>
            {availableProjects.map((prj) => (
              <option key={prj.label} value={prj.label}>
                {prj.label} {prj.count > 0 ? `(${prj.count})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Designation Filter + Reset Button */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedDesignation}
            onChange={(e) => setSelectedDesignation(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl bg-card border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm cursor-pointer"
          >
            <option value="">Designation (All)</option>
            {availableDesignations.map((desig) => (
              <option key={desig.label} value={desig.label}>
                {desig.label} {desig.count > 0 ? `(${desig.count})` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedOrg('');
              setSelectedDept('');
              setSelectedBranch('');
              setSelectedProject('');
              setSelectedDesignation('');
            }}
            className="p-2.5 rounded-2xl bg-card border border-border text-muted-foreground hover:text-foreground transition cursor-pointer flex-shrink-0 hover:border-amber-500/50 hover:text-amber-500"
            title="Reset All Filters"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── BULK ACTIONS / MASS UPDATE BAR (Appears ONLY when 1+ selected) ── */}
      {selectedCodes.length > 0 && (
        <div className="p-3.5 px-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          {/* Left Count */}
          <div className="flex items-center space-x-2 text-xs font-black text-amber-500">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>{selectedCodes.length} employee(s) selected</span>
          </div>

          {/* Center Mass Update Field & Value Controls */}
          {canMassUpdateEmployee && (
            <div className="flex flex-wrap items-center gap-2">
              {/* 1. Select Field */}
              <div className="flex items-center space-x-1.5 bg-card border border-border/80 rounded-xl px-2.5 py-1 text-xs shadow-sm">
                <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Field:</span>
                <select
                  value={massUpdateField}
                  onChange={(e) => {
                    const newField = e.target.value as keyof FullEmployeeProfile;
                    setMassUpdateField(newField);
                    const opts = getFieldOptions(newField);
                    setMassUpdateValue(opts[0]?.value || '');
                  }}
                  className="bg-transparent text-foreground font-bold focus:outline-none cursor-pointer text-xs"
                >
                  {MASS_EDITABLE_FIELDS.map((f) => (
                    <option key={f.key} value={f.key} className="bg-card text-foreground">
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Select / Input New Value */}
              <div className="flex items-center space-x-1.5 bg-card border border-border/80 rounded-xl px-2.5 py-1 text-xs shadow-sm max-w-xs">
                <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Value:</span>
                {getFieldOptions(massUpdateField).length > 0 ? (
                  <select
                    value={massUpdateValue}
                    onChange={(e) => setMassUpdateValue(e.target.value)}
                    className="bg-transparent text-foreground font-bold focus:outline-none cursor-pointer text-xs max-w-[180px] truncate"
                  >
                    {getFieldOptions(massUpdateField).map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={massUpdateValue}
                    onChange={(e) => setMassUpdateValue(e.target.value)}
                    placeholder="Type new value..."
                    className="bg-transparent text-foreground font-bold focus:outline-none text-xs w-36"
                  />
                )}
              </div>

              {/* 3. Apply Mass Update Button */}
              <button
                type="button"
                onClick={() => requestMassUpdateConfirmation(selectedCodes, massUpdateField, massUpdateValue)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                title={`Apply mass update to ${selectedCodes.length} selected employees`}
              >
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                <span>Apply Mass Update ({selectedCodes.length})</span>
              </button>
            </div>
          )}

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2">
            {canDeleteEmployee && activeTab === 'ARCHIVED' && (
              <button
                type="button"
                onClick={handleUnarchiveSelected}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Restore</span>
              </button>
            )}

            {canDeleteEmployee && activeTab !== 'ARCHIVED' && (
              <button
                type="button"
                onClick={handleArchiveSelected}
                className="px-3.5 py-1.5 rounded-xl bg-card border border-border text-foreground hover:border-amber-500/50 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Archive</span>
              </button>
            )}

            {canDeleteEmployee && (
              <button
                type="button"
                onClick={handleDeleteSelected}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedCodes([])}
              className="px-3 py-1.5 rounded-xl bg-card hover:bg-surface text-muted-foreground hover:text-foreground text-xs font-semibold transition cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* ── 4. EMPLOYEE DATA TABLE WITH DYNAMIC COLUMNS & SORTING ── */}
      <div className="rounded-3xl bg-card border border-border shadow-xl relative">
        {/* ── COLUMNS CUSTOMIZER POPOVER (Positioned right below button) ── */}
        {isColumnsMenuOpen && (
          <div
            ref={columnsMenuRef}
            className="absolute right-4 top-14 z-50 w-80 sm:w-96 max-h-[500px] bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
          >
            {/* Popover Header */}
            <div className="p-3 px-4 border-b border-border flex items-center justify-between bg-surface/60">
              <div className="text-[11px] font-black uppercase tracking-wider text-foreground flex items-center space-x-1.5">
                <span>COLUMNS</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-extrabold">
                  ({visibleColumnKeys.length}/{ALL_EMPLOYEE_COLUMNS.length})
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={handleResetColumns}
                  className="text-muted-foreground hover:text-foreground hover:underline transition cursor-pointer"
                >
                  RESET
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={() => {
                    if (visibleColumnKeys.length === ALL_EMPLOYEE_COLUMNS.length) {
                      handleResetColumns();
                    } else {
                      handleSelectAllColumns();
                    }
                  }}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer font-extrabold"
                >
                  {visibleColumnKeys.length === ALL_EMPLOYEE_COLUMNS.length ? 'DESELECT' : 'SELECT ALL'}
                </button>
              </div>
            </div>

            {/* Column Search Box */}
            <div className="p-2.5 px-3 border-b border-border/60 bg-surface/30">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={columnSearchQuery}
                  onChange={(e) => setColumnSearchQuery(e.target.value)}
                  placeholder="Search columns..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {columnSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setColumnSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Categorized Column Checkboxes */}
            <div className="overflow-y-auto p-2 space-y-3 flex-1 max-h-80 divide-y divide-border/30">
              {categorizedColumns.map((cat) => {
                const matchingCols = cat.columns.filter(
                  (c) =>
                    c.label.toLowerCase().includes(columnSearchQuery.toLowerCase()) ||
                    c.key.toLowerCase().includes(columnSearchQuery.toLowerCase())
                );
                if (matchingCols.length === 0) return null;

                return (
                  <div key={cat.id} className="pt-2 first:pt-0 space-y-1">
                    <div className="px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">
                      {cat.name}
                    </div>
                    <div className="space-y-0.5">
                      {matchingCols.map((col) => {
                        const isChecked = visibleColumnKeys.includes(col.key);
                        return (
                          <div
                            key={col.key}
                            onClick={() => handleToggleColumn(col.key)}
                            className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-xl cursor-pointer transition text-xs select-none ${
                              isChecked
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                                : 'hover:bg-surface/80 text-foreground/80'
                            }`}
                          >
                            <div
                              className={`h-4 w-4 rounded-md flex items-center justify-center border transition flex-shrink-0 ${
                                isChecked
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-border bg-card'
                              }`}
                            >
                              {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{col.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-3xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/80 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground bg-surface/40">
                <th className="py-3.5 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((e) => selectedCodes.includes(e.code))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCodes(Array.from(new Set([...selectedCodes, ...filtered.map((f) => f.code)])));
                      } else {
                        const filteredCodes = new Set(filtered.map((f) => f.code));
                        setSelectedCodes(selectedCodes.filter((c) => !filteredCodes.has(c)));
                      }
                    }}
                    className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                  />
                </th>

                {/* Dynamic Visible Columns with Sorting */}
                {visibleColumnConfigs.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      style={{ minWidth: col.minWidth }}
                      className={`py-3.5 px-4 select-none ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={`group inline-flex items-center space-x-1.5 font-black uppercase tracking-wider transition cursor-pointer ${
                          isSorted
                            ? 'text-amber-500 dark:text-amber-400'
                            : 'hover:text-foreground text-muted-foreground'
                        }`}
                        title={`Click to sort whole dataset by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        <span className="inline-flex items-center">
                          {isSorted && sortDirection === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-amber-500 font-bold" />
                          ) : isSorted && sortDirection === 'desc' ? (
                            <ArrowDown className="h-3.5 w-3.5 text-amber-500 font-bold" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-30 group-hover:opacity-100 transition text-muted-foreground" />
                          )}
                        </span>
                      </button>
                    </th>
                  );
                })}

                {/* Rightmost Actions Header with Columns Popover Trigger */}
                <th className="py-3.5 px-4 text-right">
                  <div className="inline-flex items-center space-x-2.5 justify-end">
                    <span>ACTIONS</span>
                    <button
                      type="button"
                      onClick={() => setIsColumnsMenuOpen(!isColumnsMenuOpen)}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        isColumnsMenuOpen
                          ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-surface hover:bg-surface/80 border-border text-foreground hover:border-amber-500/50'
                      }`}
                      title="Add Custom Columns / View Fields"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-medium">
              {filtered.map((emp) => {
                const isSelected = selectedCodes.includes(emp.code);

                return (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedProfile(emp)}
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
                            setSelectedCodes(selectedCodes.filter((c) => c !== emp.code));
                          } else {
                            setSelectedCodes([...selectedCodes, emp.code]);
                          }
                        }}
                        className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                      />
                    </td>

                    {/* Dynamic Visible Data Cells */}
                    {visibleColumnConfigs.map((col) => {
                      return (
                        <td
                          key={col.key}
                          className={`py-3 px-3.5 transition ${
                            col.align === 'center'
                              ? 'text-center'
                              : col.align === 'right'
                              ? 'text-right'
                              : 'text-left'
                          }`}
                        >
                          <div className="flex items-center justify-between space-x-1.5 min-h-[26px]">
                            <div className="min-w-0 flex-1">
                              {renderCellContent(emp, col.key)}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        {/* If NOT a user and has permission, show Create User button */}
                        {canCreateEmployee && !emp.isUser && (
                          <button
                            type="button"
                            onClick={() => handleCreateUserForEmployee(emp)}
                            className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-[11px] flex items-center space-x-1.5 transition shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
                            title="Create JAAGO HUB User Account & Send Credentials"
                          >
                            <UserPlus className="h-3 w-3 stroke-[2.5]" />
                            <span>Create User</span>
                          </button>
                        )}
                        {emp.isUser && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>User Active</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedProfile(emp)}
                          className="p-1.5 rounded-xl bg-surface border border-border text-foreground hover:border-amber-500/50 hover:text-amber-500 transition cursor-pointer"
                          title={canEditEmployee ? "Open Profile & Edit" : "View Profile (Read-Only)"}
                        >
                          {canEditEmployee ? (
                            <Edit3 className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>

                        {canDeleteEmployee && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(emp.code)}
                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete Employee Profile"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4.5 ODOO-STYLE INLINE CELL QUICK POPOVER EDITOR ── */}
      {activeInlineEditor && (
        <div
          ref={inlineEditorRef}
          style={{
            position: 'fixed',
            top: Math.min(activeInlineEditor.anchorRect.bottom + 6, window.innerHeight - 380),
            left: Math.min(Math.max(16, activeInlineEditor.anchorRect.left), window.innerWidth - 330),
            zIndex: 100,
          }}
          className="w-72 sm:w-80 bg-card/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
        >
          {/* Popover Header */}
          <div className="p-3 px-3.5 bg-amber-500/10 border-b border-border flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-500 flex items-center space-x-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {selectedCodes.includes(activeInlineEditor.empCode) && selectedCodes.length > 1
                  ? `Mass Update ${MASS_EDITABLE_FIELDS.find((f) => f.key === activeInlineEditor.field)?.label || activeInlineEditor.field} (${selectedCodes.length} selected)`
                  : `Update ${MASS_EDITABLE_FIELDS.find((f) => f.key === activeInlineEditor.field)?.label || activeInlineEditor.field}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveInlineEditor(null)}
              className="p-1 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-2 border-b border-border/60 bg-surface/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                value={inlineSearchQuery}
                onChange={(e) => setInlineSearchQuery(e.target.value)}
                placeholder={`Search ${MASS_EDITABLE_FIELDS.find((f) => f.key === activeInlineEditor.field)?.label || 'options'}...`}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 text-xs">
            {inlineFilteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No matching options found.
              </div>
            ) : (
              inlineFilteredOptions.map((opt) => {
                const isCurrent = opt.value === activeInlineEditor.currentValue;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const targetCodes = selectedCodes.includes(activeInlineEditor.empCode)
                        ? selectedCodes
                        : [activeInlineEditor.empCode];
                      requestMassUpdateConfirmation(targetCodes, activeInlineEditor.field, opt.value);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/15 text-amber-500 font-bold'
                        : 'hover:bg-surface text-foreground font-medium'
                    }`}
                  >
                    <span className="truncate mr-2">{opt.label}</span>
                    {isCurrent && <Check className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 4.6 ODOO-STYLE MASS UPDATE MODAL ── */}
      {showMassUpdateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0 shadow-inner">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground flex items-center space-x-2">
                    <span>Mass Update Employee Records</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-[11px] font-black">
                      {selectedCodes.length} Selected
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Batch update departments, designations, schedules, or teams across selected profiles
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMassUpdateModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Field Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Target Field to Update <span className="text-amber-500">*</span>
                </label>
                <select
                  value={massUpdateField}
                  onChange={(e) => {
                    const f = e.target.value as keyof FullEmployeeProfile;
                    setMassUpdateField(f);
                    const opts = getFieldOptions(f);
                    setMassUpdateValue(opts[0]?.value || '');
                    setMassUpdateSearch('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-surface border border-border text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm cursor-pointer"
                >
                  {MASS_EDITABLE_FIELDS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label} ({f.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* New Value Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  New Value for {MASS_EDITABLE_FIELDS.find((f) => f.key === massUpdateField)?.label} <span className="text-amber-500">*</span>
                </label>

                {/* Search & Option Picker */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={massUpdateSearch}
                      onChange={(e) => setMassUpdateSearch(e.target.value)}
                      placeholder={`Search ${MASS_EDITABLE_FIELDS.find((f) => f.key === massUpdateField)?.label || 'options'} or enter custom value...`}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-border bg-surface/50 p-1.5 space-y-1">
                    {modalFilteredOptions.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No matching predefined options. You can apply custom value:
                        <div className="font-bold text-foreground mt-1">&quot;{massUpdateSearch}&quot;</div>
                        <button
                          type="button"
                          onClick={() => setMassUpdateValue(massUpdateSearch)}
                          className="mt-2 px-3 py-1 rounded-xl bg-amber-500 text-white font-bold text-xs cursor-pointer"
                        >
                          Use &quot;{massUpdateSearch}&quot;
                        </button>
                      </div>
                    ) : (
                      modalFilteredOptions.map((opt) => {
                        const isSelected = massUpdateValue === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setMassUpdateValue(opt.value)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500 text-white font-bold shadow-sm'
                                : 'hover:bg-card text-foreground'
                            }`}
                          >
                            <span className="truncate">{opt.label}</span>
                            {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Impact Preview Note */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center space-x-2.5">
                <Sparkles className="h-4 w-4 flex-shrink-0 text-amber-500" />
                <span>
                  Will update <strong>{MASS_EDITABLE_FIELDS.find((f) => f.key === massUpdateField)?.label}</strong> to{' '}
                  <strong className="text-foreground">&quot;{massUpdateValue || 'Not Selected'}&quot;</strong> for all{' '}
                  <strong>{selectedCodes.length}</strong> selected employees in Supabase PostgreSQL.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowMassUpdateModal(false)}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!massUpdateValue || isApplyingMassUpdate}
                onClick={() => requestMassUpdateConfirmation(selectedCodes, massUpdateField, massUpdateValue)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-black text-xs transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>Review &amp; Confirm ({selectedCodes.length} Employees)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4.7 "ARE YOU CONFIRM?" MASS UPDATE SMART POPUP WINDOW (SMART VIEW) ── */}
      {confirmMassUpdateData && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-card border-2 border-amber-500/50 dark:border-amber-500/40 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 flex-shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                      Are you Sure? Confirm Mass Update
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                      Mass Action
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-0.5">
                    Review proposed changes across <strong>{confirmMassUpdateData.targetCodes.length}</strong> employee profiles before writing to Supabase PostgreSQL.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmMassUpdateData(null);
                  setConfirmSearchQuery('');
                }}
                className="p-1.5 rounded-xl hover:bg-surface text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Smart View: 3-Part Change Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-shrink-0">
              <div className="p-3 rounded-2xl bg-surface/80 border border-border/80 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-black tracking-wider text-muted-foreground flex items-center space-x-1">
                  <Layers className="h-3 w-3 text-amber-500" />
                  <span>Target Field</span>
                </span>
                <span className="text-xs sm:text-[13px] font-black text-foreground pt-1 truncate">
                  {confirmMassUpdateData.fieldLabel}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>New Target Value</span>
                </span>
                <span className="text-xs sm:text-[13px] font-black text-emerald-600 dark:text-emerald-400 pt-1 truncate">
                  {String(confirmMassUpdateData.newValue || '—')}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>Affected Profiles</span>
                </span>
                <span className="text-xs sm:text-[13px] font-black text-amber-600 dark:text-amber-400 pt-1">
                  {confirmMassUpdateData.targetCodes.length} Employees
                </span>
              </div>
            </div>

            {/* Smart View: Live Employee Impact & Diff Preview Table */}
            <div className="flex-1 min-h-[200px] overflow-hidden flex flex-col rounded-2xl border border-border bg-surface/30">
              <div className="p-2.5 border-b border-border bg-surface/60 flex items-center justify-between gap-2">
                <div className="text-[11px] font-bold text-foreground flex items-center space-x-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Smart View &bull; Profile Impact Preview</span>
                </div>
                <div className="relative w-48 sm:w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={confirmSearchQuery}
                    onChange={(e) => setConfirmSearchQuery(e.target.value)}
                    placeholder="Search affected profiles..."
                    className="w-full pl-7 pr-2.5 py-1 rounded-xl bg-card border border-border text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-2 space-y-1.5 divide-y divide-border/30">
                {(() => {
                  const filteredAffected = confirmMassUpdateData.affectedEmployees.filter((emp) => {
                    if (!confirmSearchQuery.trim()) return true;
                    const q = confirmSearchQuery.toLowerCase();
                    return (
                      emp.name?.toLowerCase().includes(q) ||
                      emp.code?.toLowerCase().includes(q) ||
                      emp.department?.toLowerCase().includes(q) ||
                      String(emp[confirmMassUpdateData.field] || '').toLowerCase().includes(q)
                    );
                  });

                  if (filteredAffected.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No employees match &quot;{confirmSearchQuery}&quot;
                      </div>
                    );
                  }

                  return filteredAffected.slice(0, 50).map((emp) => {
                    const beforeVal = String(emp[confirmMassUpdateData.field] || '—');
                    const afterVal = String(confirmMassUpdateData.newValue || '—');
                    return (
                      <div key={emp.code} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0 flex items-center space-x-2">
                          <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0 uppercase">
                            {emp.name ? emp.name.slice(0, 2) : 'EM'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground text-[11px] truncate">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate">
                              {emp.code} &bull; {emp.department || 'General'}
                            </div>
                          </div>
                        </div>

                        {/* Before -> After Diff Pill */}
                        <div className="flex items-center space-x-1.5 flex-shrink-0 text-[11px]">
                          <span className="px-2 py-0.5 rounded-lg bg-surface border border-border text-muted-foreground line-through max-w-[110px] truncate" title={`Current: ${beforeVal}`}>
                            {beforeVal}
                          </span>
                          <ArrowRight className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold max-w-[130px] truncate" title={`New: ${afterVal}`}>
                            {afterVal}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="p-2 border-t border-border bg-surface/50 text-[10px] text-muted-foreground flex items-center justify-between px-3">
                <span>
                  Showing {Math.min(50, confirmMassUpdateData.affectedEmployees.length)} of {confirmMassUpdateData.targetCodes.length} profiles
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                  <Check className="h-3 w-3" />
                  <span>All records will sync to Supabase</span>
                </span>
              </div>
            </div>

            {/* High-Impact Notice Alert */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-start space-x-2.5 flex-shrink-0">
              <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Confirmation Notice:</strong> Updating <strong>{confirmMassUpdateData.fieldLabel}</strong> to <strong className="text-foreground">&quot;{String(confirmMassUpdateData.newValue)}&quot;</strong> will batch-write to <strong>{confirmMassUpdateData.targetCodes.length} employee records</strong> in Supabase PostgreSQL and instantly reflect across all JAAGO HUB dashboards and reports.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setConfirmMassUpdateData(null);
                  setConfirmSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition cursor-pointer"
              >
                Cancel &amp; Keep Existing
              </button>

              <button
                type="button"
                disabled={isApplyingMassUpdate}
                onClick={handleExecuteMassUpdateFinal}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-black text-xs transition flex items-center space-x-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
              >
                {isApplyingMassUpdate ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Syncing {confirmMassUpdateData.targetCodes.length} Records...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Confirm Mass Update ({confirmMassUpdateData.targetCodes.length} Employees)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 5. IMPORT CSV MODAL (Full 88-Field Comprehensive Engine) ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">Import Employee Records</h2>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Supports all 88 fields across all 7 profile tabs
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportParsedResult(null);
                  setImportErrorMsg(null);
                }}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {/* File Dropzone / Selector */}
              <label className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-amber-500/60 text-center space-y-2 cursor-pointer bg-surface/50 hover:bg-surface/80 transition flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCSVFileSelect(f);
                  }}
                />
                <FileText className="h-8 w-8 text-amber-500" />
                <div className="text-xs font-bold text-foreground">
                  {importFile ? importFile.name : 'Click to select CSV or drag & drop'}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {importFile
                    ? `${(importFile.size / 1024).toFixed(1)} KB — Ready to analyze`
                    : 'Upload your complete employee database spreadsheet'}
                </div>
              </label>

              {/* Error Alert */}
              {importErrorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="whitespace-pre-line">{importErrorMsg}</div>
                </div>
              )}

              {/* Parsed Preview */}
              {importParsedResult && (
                <div className="p-3.5 rounded-2xl bg-surface border border-border/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{importParsedResult.employees.length} Employee Records Recognized</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      88 columns verified
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 divide-y divide-border/40 font-mono text-[11px]">
                    {importParsedResult.employees.slice(0, 5).map((emp, i) => (
                      <div key={i} className="pt-1.5 flex items-center justify-between text-muted-foreground">
                        <span className="font-bold text-foreground truncate max-w-[200px]">
                          {emp.name} ({emp.code})
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {emp.designation} • {emp.department}
                        </span>
                      </div>
                    ))}
                    {importParsedResult.employees.length > 5 && (
                      <div className="pt-1.5 text-center text-[10px] text-muted-foreground font-sans">
                        + {importParsedResult.employees.length - 5} more employee records
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
              <a
                href="/demo_employees_comprehensive_template.csv"
                download="demo_employees_comprehensive_template.csv"
                className="text-primary hover:underline font-bold flex items-center space-x-1"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download All-Field Template</span>
              </a>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportParsedResult(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!importParsedResult || importParsedResult.employees.length === 0 || isProcessingImport}
                  onClick={handleProcessImport}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-black cursor-pointer flex items-center space-x-2 shadow-md shadow-amber-500/20"
                >
                  {isProcessingImport ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <span>Process &amp; Sync</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. REDESIGNED STANDARD FORMAL INVITATION & CREDENTIALS MODAL ── */}
      {showInviteSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-card border border-amber-500/40 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
            {/* Modal Top Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3 flex-shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="h-11 w-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm flex-shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                    Employee Account Created &amp; Formal Invitation
                  </h2>
                  <div className="flex items-center space-x-2 pt-0.5">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>
                        {showInviteSuccessModal.emailPayload.autoSent
                          ? 'Supabase Auth & Auto-Mailer Dispatched'
                          : 'Supabase Auth Synchronized & Active'}
                      </span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                      &bull; JAAGO HUB Credentials Ready
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowInviteSuccessModal(null)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface rounded-xl transition cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Recipient & Delivery Details Toolbar */}
            <div className="p-3 rounded-2xl bg-surface border border-border/80 text-xs space-y-2 flex-shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block mb-1">
                    Primary Recipient (Work Email):
                  </label>
                  <input
                    type="email"
                    value={customToEmail}
                    onChange={(e) => setCustomToEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-bold text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="name@jaago.com.bd"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block mb-1">
                    CC / Backup Email (Optional):
                  </label>
                  <input
                    type="email"
                    value={customCCEmail}
                    onChange={(e) => setCustomCCEmail(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="personal.email@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-muted-foreground tracking-wider block mb-1">
                  Email Subject Line:
                </label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-card border border-border text-foreground font-medium text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Welcome to JAAGO HUB — Your Official Login Credentials"
                />
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center space-x-1 border-b border-border/80 pb-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  modalTab === 'preview'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-surface hover:bg-surface/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Formal Email Preview</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('credentials')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  modalTab === 'credentials'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-surface hover:bg-surface/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Key className="h-3.5 w-3.5" />
                <span>Quick Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('text')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  modalTab === 'text'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-surface hover:bg-surface/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Plain Text &amp; ASCII</span>
              </button>
            </div>

            {/* Scrollable Tab Content Body */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-3 min-h-[220px]">
              {/* TAB 1: FORMAL EMAIL PREVIEW */}
              {modalTab === 'preview' && (
                <div className="rounded-2xl border border-border bg-white text-slate-900 shadow-inner overflow-hidden font-sans">
                  {/* Formal Email Header Banner */}
                  <div className="bg-slate-900 px-5 py-4 text-white border-b-2 border-amber-500 text-center">
                    <span className="inline-block bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full mb-1">
                      JAAGO Foundation Trust
                    </span>
                    <h3 className="text-base font-extrabold tracking-tight text-white">
                      JAAGO HUB &bull; Official Account Provisioned
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium">
                      Enterprise Resource Planning &amp; Institutional Portal
                    </p>
                  </div>

                  {/* Formal Email Letter Content */}
                  <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
                    <div className="text-sm font-bold text-slate-900">
                      Dear {showInviteSuccessModal.employee.name},
                    </div>

                    <div className="p-3 bg-slate-50 border-l-4 border-sky-600 rounded-r-xl text-slate-800 text-xs">
                      We are pleased to welcome you to <strong>JAAGO Foundation Trust</strong>. Your official institutional user account on <strong>JAAGO HUB</strong> has been successfully configured and activated for immediate access.
                    </div>

                    {/* Metadata Table */}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Official Employee &amp; Account Details
                      </div>
                      <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                        <tbody>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <td className="px-3 py-2 font-semibold text-slate-500 w-1/3">Employee Name</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{showInviteSuccessModal.employee.name}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="px-3 py-2 font-semibold text-slate-500">Employee ID</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{showInviteSuccessModal.employee.code || '—'}</td>
                          </tr>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <td className="px-3 py-2 font-semibold text-slate-500">Designation</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{showInviteSuccessModal.employee.designation || 'Staff Member'}</td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="px-3 py-2 font-semibold text-slate-500">Department</td>
                            <td className="px-3 py-2 font-bold text-slate-900">{showInviteSuccessModal.employee.department || 'General'}</td>
                          </tr>
                          <tr className="bg-slate-50">
                            <td className="px-3 py-2 font-semibold text-slate-500">User ID (Work Email)</td>
                            <td className="px-3 py-2 font-black text-sky-700 font-mono select-all">
                              {customToEmail || showInviteSuccessModal.emailPayload.to}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Credentials Highlight Card */}
                    <div className="p-4 rounded-xl bg-amber-50 border-2 border-dashed border-amber-400 text-center space-y-2">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                        Temporary Initial Password
                      </div>
                      <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-amber-300 shadow-sm">
                        <span className="font-mono font-black text-base text-amber-900 select-all tracking-wider">
                          {showInviteSuccessModal.emailPayload.tempPassword}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(showInviteSuccessModal.emailPayload.tempPassword);
                            setCopiedKey('tempPasswordPreview');
                            setTimeout(() => setCopiedKey(null), 2500);
                          }}
                          className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg transition"
                          title="Copy Password"
                        >
                          {copiedKey === 'tempPasswordPreview' ? (
                            <Check className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-amber-800 font-medium">
                        * Please update your temporary password immediately upon your first sign-in under Profile &gt; Security.
                      </p>
                    </div>

                    {/* Login CTA Button */}
                    <div className="text-center pt-1">
                      <a
                        href={showInviteSuccessModal.emailPayload.loginUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition"
                      >
                        <span>Access JAAGO HUB Portal</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <div className="text-[11px] text-slate-500 pt-1.5">
                        Portal URL:{' '}
                        <a
                          href={showInviteSuccessModal.emailPayload.loginUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 underline font-mono text-[11px]"
                        >
                          {showInviteSuccessModal.emailPayload.loginUrl}
                        </a>
                      </div>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                        Getting Started &bull; Login Instructions:
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                        <li>Open the portal link in any modern web browser.</li>
                        <li>Enter your official Work Email and Temporary Password.</li>
                        <li>(Alternative) Click <strong>"Sign in with Google"</strong> if using official Google Workspace.</li>
                        <li>Update your password upon initial sign-in under <strong>My Profile &gt; Security</strong>.</li>
                      </ol>
                    </div>

                    {/* Security Notice */}
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] leading-relaxed flex items-start space-x-2">
                      <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <strong>Security Advisory:</strong> Keep these credentials confidential. Do not share your temporary password with anyone. JAAGO HR and IT Administrators will never ask for your password.
                      </div>
                    </div>

                    {/* Formal Sign-off */}
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                      <p>Warm regards,</p>
                      <p className="font-bold text-slate-900">People &amp; Culture Department</p>
                      <p className="font-semibold text-slate-800">JAAGO Foundation Trust</p>
                      <p className="text-slate-500">Head Office: Banani, Dhaka, Bangladesh &bull; pnc@jaago.com.bd</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: QUICK CREDENTIALS & ONE-CLICK COPY */}
              {modalTab === 'credentials' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-surface border border-border space-y-3 text-xs">
                    {/* User ID */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/80">
                      <div>
                        <div className="text-[10px] font-black uppercase text-muted-foreground">User ID / Work Email</div>
                        <div className="font-mono font-bold text-foreground text-sm select-all">
                          {customToEmail || showInviteSuccessModal.emailPayload.to}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(customToEmail || showInviteSuccessModal.emailPayload.to);
                          setCopiedKey('userId');
                          setTimeout(() => setCopiedKey(null), 2500);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-surface border border-border hover:bg-card text-foreground text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedKey === 'userId' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'userId' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Password */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div>
                        <div className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Temporary Password</div>
                        <div className="font-mono font-black text-amber-600 dark:text-amber-400 text-base select-all tracking-wider">
                          {showPasswordInModal ? showInviteSuccessModal.emailPayload.tempPassword : '••••••••••••••••'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                          className="p-2 rounded-xl bg-surface border border-border hover:bg-card text-muted-foreground hover:text-foreground text-xs transition cursor-pointer"
                          title={showPasswordInModal ? 'Hide Password' : 'Show Password'}
                        >
                          {showPasswordInModal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(showInviteSuccessModal.emailPayload.tempPassword);
                            setCopiedKey('tempPassword');
                            setTimeout(() => setCopiedKey(null), 2500);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-sm"
                        >
                          {copiedKey === 'tempPassword' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedKey === 'tempPassword' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Login URL */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/80">
                      <div className="min-w-0 flex-1 mr-2">
                        <div className="text-[10px] font-black uppercase text-muted-foreground">Portal Login URL</div>
                        <a
                          href={showInviteSuccessModal.emailPayload.loginUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-primary hover:underline text-xs truncate block select-all font-bold"
                        >
                          {showInviteSuccessModal.emailPayload.loginUrl}
                        </a>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(showInviteSuccessModal.emailPayload.loginUrl);
                            setCopiedKey('loginUrl');
                            setTimeout(() => setCopiedKey(null), 2500);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-surface border border-border hover:bg-card text-foreground text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedKey === 'loginUrl' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedKey === 'loginUrl' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <a
                          href={showInviteSuccessModal.emailPayload.loginUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-surface border border-border hover:bg-card text-foreground transition cursor-pointer"
                          title="Open Login Portal"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PLAIN TEXT & ASCII COPY */}
              {modalTab === 'text' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      Formatted ASCII Email Text (Ready to copy for Slack / SMS / WhatsApp):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(showInviteSuccessModal.emailPayload.fullEmailText || '');
                        setCopiedKey('fullText');
                        setTimeout(() => setCopiedKey(null), 2500);
                      }}
                      className="px-3 py-1 rounded-xl bg-surface border border-border hover:bg-card text-xs font-bold transition flex items-center space-x-1 cursor-pointer text-foreground"
                    >
                      {copiedKey === 'fullText' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey === 'fullText' ? 'Copied to Clipboard' : 'Copy Plain Text'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-surface/90 border border-border text-[11px] font-mono text-foreground whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto select-all">
                    {showInviteSuccessModal.emailPayload.fullEmailText}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="border-t border-border/80 pt-3 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const textToCopy = showInviteSuccessModal.emailPayload.fullEmailText || '';
                    navigator.clipboard.writeText(textToCopy);
                    setCopiedKey('all');
                    setToastMessage('✓ Complete invitation details copied to clipboard!');
                    setTimeout(() => setCopiedKey(null), 2500);
                    setTimeout(() => setToastMessage(null), 3500);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground hover:bg-card font-bold text-xs uppercase tracking-wider transition flex items-center space-x-1.5 cursor-pointer"
                  title="Copy complete invite credentials"
                >
                  {copiedKey === 'all' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span>{copiedKey === 'all' ? 'Copied All!' : 'Copy Invitation'}</span>
                </button>

                <a
                  href={showInviteSuccessModal.emailPayload.loginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl bg-surface border border-border text-foreground hover:border-primary/50 font-bold text-xs uppercase tracking-wider transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Open Portal</span>
                </a>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={async () => {
                    if (!showInviteSuccessModal) return;
                    setIsSendingEmail(true);
                    try {
                      const payload = showInviteSuccessModal.emailPayload;
                      const res = await fetch('/api/v1/notifications/send-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          to: customToEmail || payload.to,
                          cc: customCCEmail || payload.personalEmail,
                          subject: customSubject || payload.subject,
                          recipientName: showInviteSuccessModal.employee.name,
                          loginUrl: payload.loginUrl,
                          html: payload.htmlEmail,
                          bodyText: payload.fullEmailText,
                        }),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        setEmailSentSuccess(true);
                        setToastMessage(`✓ Formal invitation successfully dispatched to ${customToEmail || payload.to}`);
                        setTimeout(() => setToastMessage(null), 4500);
                        setTimeout(() => setEmailSentSuccess(false), 3000);
                      } else {
                        alert(data.error || 'Failed to dispatch email');
                      }
                    } catch (err: any) {
                      alert(err.message || 'Email dispatch network error');
                    } finally {
                      setIsSendingEmail(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                >
                  {isSendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : emailSentSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>
                    {isSendingEmail
                      ? 'Dispatching Email...'
                      : emailSentSuccess
                      ? 'Invitation Sent!'
                      : showInviteSuccessModal?.emailPayload?.autoSent
                      ? 'Resend Formal Email'
                      : 'Send Formal Email'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowInviteSuccessModal(null)}
                  className="px-5 py-2.5 rounded-xl bg-surface border border-border text-foreground hover:border-primary/50 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
