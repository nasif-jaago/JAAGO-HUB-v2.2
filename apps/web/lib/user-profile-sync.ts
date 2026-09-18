import { getSupabase } from './supabase-auth';
import {
  fetchEmployeesFromSupabase,
  saveEmployeeToSupabase,
  type FullEmployeeProfile,
} from './supabase-employees';
import { normalizeDeptSlug } from './rbac-data';

export interface UserSessionData {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | undefined;
  jobTitle?: string | undefined;
  organizationName?: string | undefined;
  department?: string | undefined;
  team?: string | undefined;
  manager?: string | undefined;
  employeeCode?: string | undefined;
  workingSchedule?: string | undefined;
  roles?: string[] | undefined;
  permissions?: string[] | undefined;
  allowRegularization?: boolean | undefined;
  crossDepartments?: string[] | undefined;
}

/**
 * Retrieves the currently cached user session from localStorage
 */
export function getCurrentUserSession(): UserSessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('jaago_user');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

/**
 * Fetches the active employee profile from Supabase corresponding to the current logged-in user.
 * Matches by work_email, code, or user_id.
 */
export async function getActiveEmployeeProfile(): Promise<FullEmployeeProfile | null> {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check active Supabase Auth session first for ground truth
    const supabase = getSupabase();
    let authEmail = '';
    let authUserId = '';
    let authName = '';

    try {
      const {
        data: { session: supaSession },
      } = await supabase.auth.getSession();
      if (supaSession?.user) {
        authEmail = (supaSession.user.email || '').toLowerCase().trim();
        authUserId = (supaSession.user.id || '').trim();
        authName = (
          supaSession.user.user_metadata?.full_name ||
          supaSession.user.user_metadata?.name ||
          ''
        ).toLowerCase().trim();
      }
    } catch {}

    // 2. Check local session
    const session = getCurrentUserSession();
    let searchEmail = authEmail || session?.email?.toLowerCase().trim() || '';
    let searchCode = session?.employeeCode?.trim() || '';
    let searchName = authName || session?.fullName?.toLowerCase().trim() || '';
    let searchId = authUserId || session?.id?.trim() || '';

    // If still empty or default, check if Nasif Kamal coordinator fallback
    if (!searchEmail && !searchCode && !searchName && !searchId) {
      searchEmail = 'nasif.kamal@jaago.com.bd';
      searchName = 'nasif kamal';
    }

    // Helper matcher function
    const isEmployeeMatch = (emp: FullEmployeeProfile) => {
      const empWorkEmail = (emp.workEmail || '').toLowerCase().trim();
      const empPersonalEmail = (emp.personalEmail || '').toLowerCase().trim();
      const empCode = (emp.code || '').toLowerCase().trim();
      const empName = (emp.name || '').toLowerCase().trim();
      const empId = (emp.id || '').trim();
      const empUserId = (emp.userId || '').trim();

      // Email match (Highest confidence)
      if (searchEmail && (empWorkEmail === searchEmail || empPersonalEmail === searchEmail)) {
        return true;
      }
      // User ID match
      if (authUserId && (empUserId === authUserId || empId === authUserId)) {
        return true;
      }
      // Employee Code match
      if (searchCode && (empCode === searchCode.toLowerCase() || empId === searchCode)) {
        return true;
      }
      // Normalized code match (handle letter O vs digit 0)
      if (searchCode) {
        const normSearch = searchCode.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normEmp = empCode.replace(/[^a-z0-9]/g, '');
        if (normSearch && normEmp && normSearch === normEmp) {
          return true;
        }
      }
      // Full Name exact match
      if (searchName && empName === searchName) {
        return true;
      }
      // Special case for Nasif Kamal
      if (
        (searchEmail.includes('nasif.kamal') || searchName.includes('nasif kamal')) &&
        (empName.includes('nasif') || empWorkEmail.includes('nasif'))
      ) {
        return true;
      }
      return false;
    };

    const hydrateCrossDepts = (emp: FullEmployeeProfile): FullEmployeeProfile => {
      if (Array.isArray(emp.crossDepartments) && emp.crossDepartments.length > 0) return emp;
      if (typeof window === 'undefined') return emp;
      try {
        const rawActive = localStorage.getItem('jaago_active_cross_departments');
        if (rawActive) {
          const p = JSON.parse(rawActive);
          if (Array.isArray(p) && p.length > 0) return { ...emp, crossDepartments: p };
        }
        const codes = [
          emp.code,
          emp.code?.replace(/^FO/, 'F0'),
          emp.code?.replace(/^F0/, 'FO'),
        ].filter(Boolean) as string[];
        for (const c of codes) {
          const rawCode = localStorage.getItem(`jaago_employee_cross_departments_${c}`);
          if (rawCode) {
            const p = JSON.parse(rawCode);
            if (Array.isArray(p) && p.length > 0) return { ...emp, crossDepartments: p };
          }
        }
        const rawMap = localStorage.getItem('jaago_cross_departments_map');
        if (rawMap) {
          const map = JSON.parse(rawMap);
          const list =
            map[emp.code] ||
            map[emp.code?.replace(/^FO/, 'F0')] ||
            map[emp.code?.replace(/^F0/, 'FO')] ||
            map[emp.id] ||
            (emp.workEmail ? map[emp.workEmail.toLowerCase().trim()] : null) ||
            (emp.name ? map[emp.name.toLowerCase().trim()] : null);
          if (Array.isArray(list) && list.length > 0) return { ...emp, crossDepartments: list };
        }
      } catch {}
      return emp;
    };

    // 3. Fetch from Supabase
    const allEmployees = await fetchEmployeesFromSupabase();
    if (allEmployees && allEmployees.length > 0) {
      const match = allEmployees.find(isEmployeeMatch);
      if (match) {
        const hydrated = hydrateCrossDepts(match);
        syncEmployeeToLocalUser(hydrated);
        return hydrated;
      }
    }

    // Fallback: check localStorage cached employees
    const cachedRaw = localStorage.getItem('jaago_pnc_employees_v2');
    if (cachedRaw) {
      const cachedList: FullEmployeeProfile[] = JSON.parse(cachedRaw);
      const match = cachedList.find(isEmployeeMatch);
      if (match) {
        const hydrated = hydrateCrossDepts(match);
        syncEmployeeToLocalUser(hydrated);
        return hydrated;
      }
    }
  } catch (err) {
    console.warn('Error fetching active employee profile:', err);
  }

  return null;
}

/**
 * Updates localStorage and dispatches global event so that Header, Sidebar,
 * and Dashboard immediately reflect the latest employee data.
 * STRICTLY GUARDS against overwriting the logged-in user with an unrelated employee.
 */
export function syncEmployeeToLocalUser(employee: FullEmployeeProfile) {
  if (typeof window === 'undefined') return;

  try {
    const existing: UserSessionData | null = getCurrentUserSession();

    // If an existing session is present, verify this employee actually belongs to the active user
    if (existing && existing.fullName) {
      const currentEmail = (existing.email || '').toLowerCase().trim();
      const currentCode = (existing.employeeCode || '').toLowerCase().trim();
      const currentName = (existing.fullName || '').toLowerCase().trim();
      const currentId = (existing.id || '').trim();

      const empWorkEmail = (employee.workEmail || '').toLowerCase().trim();
      const empPersonalEmail = (employee.personalEmail || '').toLowerCase().trim();
      const empCode = (employee.code || '').toLowerCase().trim();
      const empName = (employee.name || '').toLowerCase().trim();
      const empId = (employee.id || '').trim();
      const empUserId = (employee.userId || '').trim();

      const isSameUser =
        (currentEmail && (empWorkEmail === currentEmail || empPersonalEmail === currentEmail)) ||
        (currentCode && empCode === currentCode) ||
        (currentId && (empId === currentId || empUserId === currentId)) ||
        (currentName && empName === currentName) ||
        (currentEmail.includes('nasif.kamal') && (empName.includes('nasif') || empWorkEmail.includes('nasif')));

      if (!isSameUser) {
        // Do NOT overwrite the logged-in user session with a different employee
        return;
      }
    }

    const isNasif =
      (employee.workEmail || '').toLowerCase().includes('nasif.kamal') ||
      (employee.name || '').toLowerCase().includes('nasif kamal');

    const baseSession: UserSessionData = existing || {
      id: employee.userId || employee.id || 'usr-default',
      email: employee.workEmail || employee.personalEmail || '',
      fullName: employee.name,
      jobTitle: employee.designation,
      avatarUrl: employee.avatarUrl || '',
      roles: isNasif ? ['super_admin', 'coordinator'] : ['user'],
      permissions: isNasif ? ['*'] : ['self.attendance', 'self.leaves', 'self.profile', 'self.requests'],
    };

    // Look up any saved custom permissions for this employee
    let userPermissions = baseSession.permissions;
    const lookupKeys = [
      employee.id,
      employee.userId,
      employee.workEmail,
      employee.personalEmail,
      employee.name,
      employee.code,
    ].filter(Boolean) as string[];

    for (const k of lookupKeys) {
      const saved =
        localStorage.getItem(`jaago_user_permissions_${k.toLowerCase().trim()}`) ||
        localStorage.getItem(`jaago_user_permissions_${k}`);
      if (saved) {
        try {
          const parsedPerms = JSON.parse(saved);
          if (Array.isArray(parsedPerms)) {
            userPermissions = parsedPerms;
            break;
          }
        } catch {}
      }
    }

    // Auto-inject user's own department permission so they always have access
    // to their own department portal (e.g., Child Welfare user sees Child Welfare)
    if (employee.department && Array.isArray(userPermissions) && !userPermissions.includes('*')) {
      const ownDeptPerm = `dept.${normalizeDeptSlug(employee.department)}.view`;
      if (!userPermissions.includes(ownDeptPerm)) {
        userPermissions = [...userPermissions, ownDeptPerm];
      }
    }

    let userCrossDepts = employee.crossDepartments;
    if (!Array.isArray(userCrossDepts) || userCrossDepts.length === 0) {
      if (typeof window !== 'undefined') {
        try {
          const rawActive = localStorage.getItem('jaago_active_cross_departments');
          if (rawActive) {
            const p = JSON.parse(rawActive);
            if (Array.isArray(p) && p.length > 0) userCrossDepts = p;
          }
          const empCode = employee.code || employee.id || '';
          const codes = [
            empCode,
            empCode.replace(/^FO/, 'F0'),
            empCode.replace(/^F0/, 'FO'),
          ].filter(Boolean);
          for (const c of codes) {
            if (!Array.isArray(userCrossDepts) || userCrossDepts.length === 0) {
              const rawCode = localStorage.getItem(`jaago_employee_cross_departments_${c}`);
              if (rawCode) {
                const p = JSON.parse(rawCode);
                if (Array.isArray(p) && p.length > 0) userCrossDepts = p;
              }
            }
          }
          if (!Array.isArray(userCrossDepts) || userCrossDepts.length === 0) {
            const rawMap = localStorage.getItem('jaago_cross_departments_map');
            if (rawMap) {
              const map = JSON.parse(rawMap);
              const list =
                map[empCode] ||
                map[empCode.replace(/^FO/, 'F0')] ||
                map[empCode.replace(/^F0/, 'FO')] ||
                map[employee.id] ||
                (employee.workEmail ? map[employee.workEmail.toLowerCase().trim()] : null) ||
                (employee.name ? map[employee.name.toLowerCase().trim()] : null);
              if (Array.isArray(list) && list.length > 0) userCrossDepts = list;
            }
          }
        } catch {}
      }
      if (!Array.isArray(userCrossDepts) || userCrossDepts.length === 0) {
        userCrossDepts = baseSession.crossDepartments || [];
      }
    }

    const updatedUser: UserSessionData = {
      ...baseSession,
      id: employee.userId || employee.id || baseSession.id,
      email: employee.workEmail || employee.personalEmail || baseSession.email,
      fullName: employee.name,
      jobTitle: employee.designation,
      avatarUrl: employee.avatarUrl || baseSession.avatarUrl || '',
      organizationName: employee.organization,
      department: employee.department,
      team: employee.team,
      manager: employee.supervisor || 'Founder & Executive Director',
      employeeCode: employee.code,
      workingSchedule: employee.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
      permissions: userPermissions !== undefined && userPermissions !== null ? userPermissions : (isNasif ? ['*'] : []),
      roles: isNasif ? ['super_admin', 'coordinator'] : baseSession.roles || ['user'],
      allowRegularization: employee.allowRegularization !== false,
      crossDepartments: userCrossDepts || [],
    };

    localStorage.setItem('jaago_user', JSON.stringify(updatedUser));
    document.cookie = `jaago_user=${encodeURIComponent(
      JSON.stringify(updatedUser)
    )}; path=/; max-age=604800; SameSite=Lax`;

    // Background sync to Supabase Auth user_metadata to maintain auth parity
    try {
      const supa = getSupabase();
      supa.auth.updateUser({
        data: {
          full_name: employee.name,
          name: employee.name,
          avatar_url: employee.avatarUrl || updatedUser.avatarUrl || '',
          picture: employee.avatarUrl || updatedUser.avatarUrl || '',
          job_title: employee.designation,
          department: employee.department,
          organization_name: employee.organization,
          employee_code: employee.code,
        },
      }).catch(() => {});
    } catch {}

    // Broadcast update across the application
    window.dispatchEvent(
      new CustomEvent('jaago_user_updated', {
        detail: { user: updatedUser, employee },
      })
    );
    window.dispatchEvent(
      new CustomEvent('jaago_cross_departments_updated', {
        detail: { crossDepartments: updatedUser.crossDepartments || [] },
      })
    );
  } catch (err) {
    console.warn('Error syncing employee to local user:', err);
  }
}

/**
 * Updates employee personal, contact, and emergency details in Supabase and broadcasts changes.
 */
export async function updateEmployeeProfileDetails(
  updatedProfile: FullEmployeeProfile
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await saveEmployeeToSupabase(updatedProfile, [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        formattedDate: new Date().toLocaleString(),
        userName: updatedProfile.name,
        userRole: 'Self',
        field: 'Profile Update',
        oldValue: 'Previous Information',
        newValue: 'Updated via My Profile',
        actionType: 'update',
      },
    ]);

    if (!result.success) {
      return { success: false, ...(result.error ? { error: result.error } : {}) };
    }

    // Also update cached list in localStorage if present
    if (typeof window !== 'undefined') {
      const cachedRaw = localStorage.getItem('jaago_pnc_employees_v2');
      if (cachedRaw) {
        try {
          const list: FullEmployeeProfile[] = JSON.parse(cachedRaw);
          const index = list.findIndex(
            (e) => e.id === updatedProfile.id || e.code === updatedProfile.code
          );
          if (index >= 0) {
            list[index] = updatedProfile;
          } else {
            list.unshift(updatedProfile);
          }
          localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(list));
        } catch {}
      }
    }

    // Sync to active user session & broadcast
    syncEmployeeToLocalUser(updatedProfile);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update profile' };
  }
}
