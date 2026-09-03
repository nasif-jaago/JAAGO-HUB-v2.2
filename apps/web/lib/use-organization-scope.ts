'use client';

import { useState, useEffect, useCallback } from 'react';
import { FullEmployeeProfile } from '@/lib/supabase-employees';

export function normalizeOrgKey(str: string | null | undefined): string {
  if (!str) return '';
  const lower = str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (lower.includes('trust') || lower.includes('jft')) return 'jaago foundation trust';
  if (lower.includes('inc') || lower.includes('jfi')) return 'jaago foundation inc';
  if (lower.includes('uk')) return 'jaago foundation uk';
  if (lower.includes('emk')) return 'emk center';
  if (lower.includes('jaago foundation') || lower === 'jf') return 'jaago foundation';
  return lower;
}

export function matchesSelectedOrg(itemOrg: string | null | undefined, selectedOrg: string): boolean {
  if (!selectedOrg || selectedOrg === 'ALL' || selectedOrg.trim() === '') return true;
  if (!itemOrg) return false;
  return normalizeOrgKey(itemOrg) === normalizeOrgKey(selectedOrg);
}

export function normalizeDeptKey(str: string | null | undefined): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function matchesSelectedDept(itemDept: string | null | undefined, selectedDept: string): boolean {
  if (!selectedDept || selectedDept === 'ALL' || selectedDept.trim() === '') return true;
  if (!itemDept) return false;
  const d1 = normalizeDeptKey(itemDept);
  const d2 = normalizeDeptKey(selectedDept);
  return d1 === d2 || d1.includes(d2) || d2.includes(d1);
}

export function useOrganizationScope() {
  const [selectedOrg, setSelectedOrg] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('jaago_selected_org') || 'ALL';
      } catch {}
    }
    return 'ALL';
  });

  const [selectedDept, setSelectedDept] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('jaago_selected_dept') || 'ALL';
      } catch {}
    }
    return 'ALL';
  });

  useEffect(() => {
    const handleOrgChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setSelectedOrg(detail);
      }
    };

    const handleDeptChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setSelectedDept(detail);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'jaago_selected_org' && e.newValue) {
        setSelectedOrg(e.newValue);
      }
      if (e.key === 'jaago_selected_dept' && e.newValue) {
        setSelectedDept(e.newValue);
      }
    };

    window.addEventListener('jaago_org_changed', handleOrgChanged);
    window.addEventListener('jaago_dept_changed', handleDeptChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('jaago_org_changed', handleOrgChanged);
      window.removeEventListener('jaago_dept_changed', handleDeptChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const filterEmployeesByOrg = useCallback((employees: FullEmployeeProfile[]) => {
    if (!selectedOrg || selectedOrg === 'ALL') return employees;
    return employees.filter((emp) => matchesSelectedOrg(emp.organization, selectedOrg));
  }, [selectedOrg]);

  const filterEmployeesByScope = useCallback((employees: FullEmployeeProfile[]) => {
    return employees.filter((emp) => {
      const matchesOrg = matchesSelectedOrg(emp.organization, selectedOrg);
      const matchesDept = matchesSelectedDept(emp.department, selectedDept);
      return matchesOrg && matchesDept;
    });
  }, [selectedOrg, selectedDept]);

  const isMatchingOrg = useCallback((orgName: string | null | undefined) => {
    return matchesSelectedOrg(orgName, selectedOrg);
  }, [selectedOrg]);

  const isMatchingDept = useCallback((deptName: string | null | undefined) => {
    return matchesSelectedDept(deptName, selectedDept);
  }, [selectedDept]);

  return {
    selectedOrg,
    setSelectedOrg,
    selectedDept,
    setSelectedDept,
    isMatchingOrg,
    isMatchingDept,
    filterEmployeesByOrg,
    filterEmployeesByScope,
    matchesSelectedOrg,
    matchesSelectedDept,
    normalizeOrgKey,
    normalizeDeptKey,
  };
}
