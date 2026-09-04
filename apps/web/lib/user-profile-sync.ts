import { getSupabase } from './supabase-auth';
import {
  fetchEmployeesFromSupabase,
  saveEmployeeToSupabase,
  type FullEmployeeProfile,
} from './supabase-employees';

export interface UserSessionData {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  jobTitle?: string;
  organizationName?: string;
  department?: string;
  manager?: string;
  employeeCode?: string;
  workingSchedule?: string;
  roles?: string[];
  permissions?: string[];
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
    // 1. Check local session email / code
    const session = getCurrentUserSession();
    let searchEmail = session?.email?.toLowerCase().trim() || '';
    let searchCode = session?.employeeCode?.trim() || '';

    // 2. If no session email, check active Supabase Auth session
    if (!searchEmail) {
      const supabase = getSupabase();
      const {
        data: { session: supaSession },
      } = await supabase.auth.getSession();
      if (supaSession?.user?.email) {
        searchEmail = supaSession.user.email.toLowerCase().trim();
      }
    }

    // Default fallback to Nasif Kamal if development / mock
    if (!searchEmail && !searchCode) {
      searchEmail = 'nasif.kamal@jaago.com.bd';
    }

    // 3. Fetch from Supabase
    const allEmployees = await fetchEmployeesFromSupabase();
    if (allEmployees && allEmployees.length > 0) {
      const match = allEmployees.find(
        (emp) =>
          (searchEmail && emp.workEmail?.toLowerCase().trim() === searchEmail) ||
          (searchCode && emp.code === searchCode) ||
          (searchEmail && emp.personalEmail?.toLowerCase().trim() === searchEmail)
      );

      if (match) {
        // Sync to localStorage
        syncEmployeeToLocalUser(match);
        return match;
      }
    }

    // Fallback: check localStorage cached employees
    const cachedRaw = localStorage.getItem('jaago_pnc_employees_v2');
    if (cachedRaw) {
      const cachedList: FullEmployeeProfile[] = JSON.parse(cachedRaw);
      const match = cachedList.find(
        (emp) =>
          (searchEmail && emp.workEmail?.toLowerCase().trim() === searchEmail) ||
          (searchCode && emp.code === searchCode)
      );
      if (match) {
        syncEmployeeToLocalUser(match);
        return match;
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
 */
export function syncEmployeeToLocalUser(employee: FullEmployeeProfile) {
  if (typeof window === 'undefined') return;

  try {
    const isNasif = (employee.workEmail || '').toLowerCase().includes('nasif.kamal');
    const existing: UserSessionData = getCurrentUserSession() || {
      id: employee.userId || employee.id || 'usr-default',
      email: employee.workEmail || employee.personalEmail || '',
      fullName: employee.name,
      jobTitle: employee.designation,
      avatarUrl: employee.avatarUrl || '',
      roles: isNasif ? ['super_admin', 'coordinator'] : ['user'],
      permissions: isNasif ? ['*'] : ['self.attendance', 'self.leaves', 'self.profile', 'self.requests'],
    };

    // Look up any saved custom permissions for this employee
    let userPermissions = existing.permissions;
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
          if (Array.isArray(parsedPerms) && parsedPerms.length > 0) {
            userPermissions = parsedPerms;
            break;
          }
        } catch {}
      }
    }

    const updatedUser: UserSessionData = {
      ...existing,
      id: employee.userId || employee.id || existing.id,
      email: employee.workEmail || employee.personalEmail || existing.email,
      fullName: employee.name,
      jobTitle: employee.designation,
      avatarUrl: employee.avatarUrl || existing.avatarUrl || '',
      organizationName: employee.organization,
      department: employee.department,
      manager: employee.supervisor || 'Founder & Executive Director',
      employeeCode: employee.code,
      workingSchedule: employee.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
      permissions: userPermissions || existing.permissions || [],
    };

    localStorage.setItem('jaago_user', JSON.stringify(updatedUser));
    document.cookie = `jaago_user=${encodeURIComponent(
      JSON.stringify(updatedUser)
    )}; path=/; max-age=604800; SameSite=Lax`;

    // Broadcast update across the application
    window.dispatchEvent(
      new CustomEvent('jaago_user_updated', {
        detail: { user: updatedUser, employee },
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
