'use client';

import { useState, useEffect } from 'react';
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

export function useOrganizationScope() {
  const [selectedOrg, setSelectedOrg] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('jaago_selected_org') || 'ALL';
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

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'jaago_selected_org' && e.newValue) {
        setSelectedOrg(e.newValue);
      }
    };

    window.addEventListener('jaago_org_changed', handleOrgChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('jaago_org_changed', handleOrgChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const filterEmployeesByOrg = (employees: FullEmployeeProfile[]) => {
    if (!selectedOrg || selectedOrg === 'ALL') return employees;
    return employees.filter((emp) => matchesSelectedOrg(emp.organization, selectedOrg));
  };

  const isMatchingOrg = (orgName: string | null | undefined) => {
    return matchesSelectedOrg(orgName, selectedOrg);
  };

  return {
    selectedOrg,
    setSelectedOrg,
    isMatchingOrg,
    filterEmployeesByOrg,
    matchesSelectedOrg,
    normalizeOrgKey,
  };
}
