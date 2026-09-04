'use client';

import { useState, useEffect, useCallback } from 'react';
import { FullEmployeeProfile } from '@/lib/supabase-employees';
import { isDspDepartment, isDspOnlyScoped } from '@/lib/rbac-guard';

export { isDspDepartment, isDspOnlyScoped };

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
  // If DSP-only scope is active, ONLY DSP employees and departments match
  if (isDspOnlyScoped()) {
    return isDspDepartment(itemDept);
  }
  if (!selectedDept || selectedDept === 'ALL' || selectedDept.trim() === '') return true;
  if (!itemDept) return false;
  const d1 = normalizeDeptKey(itemDept);
  const d2 = normalizeDeptKey(selectedDept);
  return d1 === d2 || d1.includes(d2) || d2.includes(d1);
}

export function useOrganizationScope() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isDspScopedState, setIsDspScopedState] = useState<boolean>(false);
  const [selectedOrg, setSelectedOrg] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const checkDspScope = useCallback(() => {
    if (typeof window === 'undefined') return;
    const isDsp = isDspOnlyScoped();
    setIsDspScopedState(isDsp);
    if (isDsp) {
      setSelectedDept('Digital School Program');
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const savedOrg = localStorage.getItem('jaago_selected_org');
      if (savedOrg) setSelectedOrg(savedOrg);

      const isDsp = isDspOnlyScoped();
      setIsDspScopedState(isDsp);
      if (isDsp) {
        setSelectedDept('Digital School Program');
      } else {
        const savedDept = localStorage.getItem('jaago_selected_dept');
        if (savedDept) setSelectedDept(savedDept);
      }
    } catch {}
  }, []);

  useEffect(() => {
    checkDspScope();

    const handleOrgChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setSelectedOrg(detail);
      }
    };

    const handleDeptChanged = (e: Event) => {
      if (isDspOnlyScoped()) {
        setSelectedDept('Digital School Program');
        return;
      }
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setSelectedDept(detail);
      }
    };

    const handleUserUpdated = () => {
      checkDspScope();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'jaago_selected_org' && e.newValue) {
        setSelectedOrg(e.newValue);
      }
      if (e.key === 'jaago_selected_dept' && e.newValue) {
        if (isDspOnlyScoped()) {
          setSelectedDept('Digital School Program');
        } else {
          setSelectedDept(e.newValue);
        }
      }
      if (
        e.key === 'jaago_user' ||
        e.key === 'jaago_active_user_permissions' ||
        (e.key && e.key.startsWith('jaago_user_permissions_'))
      ) {
        checkDspScope();
      }
    };

    window.addEventListener('jaago_org_changed', handleOrgChanged);
    window.addEventListener('jaago_dept_changed', handleDeptChanged);
    window.addEventListener('jaago_user_updated', handleUserUpdated);
    window.addEventListener('jaago_rbac_updated', handleUserUpdated);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('jaago_org_changed', handleOrgChanged);
      window.removeEventListener('jaago_dept_changed', handleDeptChanged);
      window.removeEventListener('jaago_user_updated', handleUserUpdated);
      window.removeEventListener('jaago_rbac_updated', handleUserUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [checkDspScope]);

  const isDsp = mounted && (isDspScopedState || isDspOnlyScoped());
  const activeDept = isDsp ? 'Digital School Program' : selectedDept;

  const filterEmployeesByOrg = useCallback((employees: FullEmployeeProfile[]) => {
    if (!selectedOrg || selectedOrg === 'ALL') return employees;
    return employees.filter((emp) => matchesSelectedOrg(emp.organization, selectedOrg));
  }, [selectedOrg]);

  const filterEmployeesByScope = useCallback((employees: FullEmployeeProfile[]) => {
    return employees.filter((emp) => {
      if ((isDspScopedState || isDspOnlyScoped()) && !isDspDepartment(emp.department, emp.leaveGroup)) {
        return false;
      }
      const matchesOrg = matchesSelectedOrg(emp.organization, selectedOrg);
      const matchesDept = matchesSelectedDept(emp.department, activeDept);
      return matchesOrg && matchesDept;
    });
  }, [selectedOrg, activeDept, isDspScopedState]);

  const isMatchingOrg = useCallback((orgName: string | null | undefined) => {
    return matchesSelectedOrg(orgName, selectedOrg);
  }, [selectedOrg]);

  const isMatchingDept = useCallback((deptName: string | null | undefined) => {
    return matchesSelectedDept(deptName, activeDept);
  }, [activeDept]);

  return {
    isDspScoped: isDsp,
    selectedOrg,
    setSelectedOrg,
    selectedDept: activeDept,
    setSelectedDept,
    isMatchingOrg,
    isMatchingDept,
    filterEmployeesByOrg,
    filterEmployeesByScope,
    matchesSelectedOrg,
    matchesSelectedDept,
    normalizeOrgKey,
    normalizeDeptKey,
    isDspDepartment,
    isDspOnlyScoped,
  };
}
