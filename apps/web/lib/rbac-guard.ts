import { normalizeRoleKey, getPermissionsForRole } from '@/lib/rbac-data';

export interface RBACUserContext {
  id?: string;
  email?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
  department?: string;
  branch?: string;
  organizationId?: string;
}

/**
 * Gets the current active user context from localStorage or parameter
 */
export function getActiveUser(): RBACUserContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('jaago_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Gets the consolidated list of permissions for the active user
 */
export function getUserPermissions(user?: RBACUserContext | null): string[] {
  let active = user;
  if (!active || (!active.id && !active.email && !Array.isArray(active.permissions))) {
    active = getActiveUser() || user || null;
  }
  if (!active) return [];

  const rawRole = (active.role || (Array.isArray(active.roles) ? active.roles[0] : '') || 'USER').toString();
  const rawRoleUpper = rawRole.toUpperCase();
  const isSuper =
    active.isSuperAdmin === true ||
    rawRoleUpper === 'SUPER_ADMIN' ||
    rawRole.toLowerCase() === 'super_admin' ||
    Boolean(active.email && active.email.toLowerCase().includes('nasif.kamal'));

  if (isSuper) {
    return ['*'];
  }

  // 1. Check user-specific explicit permissions or local user override
  if (Array.isArray(active.permissions) && active.permissions.length > 0) {
    return active.permissions;
  }

  // 2. Check localStorage custom permissions across all candidate keys
  if (typeof window !== 'undefined') {
    try {
      const candidateKeys = [
        active.id,
        active.email ? active.email.toLowerCase().trim() : null,
        (active as any).employeeCode ? (active as any).employeeCode.toLowerCase().trim() : null,
        (active as any).fullName ? (active as any).fullName.toLowerCase().trim() : null,
      ].filter(Boolean) as string[];

      for (const k of candidateKeys) {
        const userSaved = localStorage.getItem(`jaago_user_permissions_${k}`);
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }

      const activePermsSaved = localStorage.getItem('jaago_active_user_permissions');
      if (activePermsSaved) {
        const parsed = JSON.parse(activePermsSaved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }

  // 3. Check local matrix cache if updated from /admin/rbac
  if (typeof window !== 'undefined') {
    try {
      const savedMatrix = localStorage.getItem('jaago_rbac_matrix_cache');
      if (savedMatrix) {
        const matrixObj = JSON.parse(savedMatrix);
        const norm = normalizeRoleKey(rawRole);
        if (Array.isArray(matrixObj[norm])) {
          return matrixObj[norm];
        }
      }
    } catch {}
  }

  // 4. Fallback to runtime roles
  const normKey = normalizeRoleKey(rawRole);
  return getPermissionsForRole(normKey);
}

/**
 * Checks if the user has a specific permission or wildcard access
 */
export function hasPermission(permKey: string, user?: RBACUserContext | null): boolean {
  const perms = getUserPermissions(user);
  if (perms.includes('*')) return true;
  if (perms.includes(permKey)) return true;

  // Prefix wildcard check (e.g. 'hr.*' matches 'hr.employees.view_all')
  const dotIndex = permKey.lastIndexOf('.');
  if (dotIndex !== -1) {
    const prefixWildcard = `${permKey.slice(0, dotIndex)}.*`;
    if (perms.includes(prefixWildcard)) return true;
  }

  return false;
}

/**
 * Checks if the user has ANY of the specified permissions
 */
export function hasAnyPermission(permKeys: string[], user?: RBACUserContext | null): boolean {
  const perms = getUserPermissions(user);
  if (perms.includes('*')) return true;
  return permKeys.some((k) => hasPermission(k, user));
}

/**
 * Checks if the user has ALL of the specified permissions
 */
export function hasAllPermissions(permKeys: string[], user?: RBACUserContext | null): boolean {
  const perms = getUserPermissions(user);
  if (perms.includes('*')) return true;
  return permKeys.every((k) => hasPermission(k, user));
}

/**
 * Checks if the user is allowed to access a specific module
 */
export function hasModuleAccess(
  moduleKey: 'pnc' | 'admin' | 'org' | 'attendance' | 'time_off' | 'payroll' | 'appraisals' | 'requests' | 'reports',
  user?: RBACUserContext | null
): boolean {
  const active = user || getActiveUser();
  if (!active) return false;

  const rawRole = (active.role || (Array.isArray(active.roles) ? active.roles[0] : '') || 'USER').toString().toUpperCase();
  if (active.isSuperAdmin || rawRole === 'SUPER_ADMIN' || (active.email && active.email.toLowerCase().includes('nasif.kamal'))) {
    return true;
  }

  switch (moduleKey) {
    case 'pnc':
      return hasAnyPermission(
        [
          'hr.employees.view_all',
          'hr.employees.view_dept',
          'hr.employees.create',
          'hr.employees.edit',
          'org.view',
          'org.manage',
          'attendance.view_all',
          'attendance.view_dept',
          'leave.view_all',
          'leave.view_dept',
          'payroll.view_all',
          'reports.headcount.view',
        ],
        user
      );

    case 'admin':
      return (
        rawRole === 'ADMIN' ||
        hasAnyPermission(
          [
            'system.users.view',
            'system.users.create',
            'system.users.manage_roles',
            'system.settings.manage',
            'system.gps.manage',
            'system.email.manage',
          ],
          user
        )
      );

    case 'org':
      return hasAnyPermission(
        [
          'org.view',
          'org.manage',
          'org.branches.manage',
          'org.departments.manage',
          'org.designations.manage',
          'org.projects.manage',
          'org.teams.manage',
        ],
        user
      );

    case 'attendance':
      return hasAnyPermission(
        [
          'attendance.view_all',
          'attendance.view_dept',
          'attendance.view_own',
          'attendance.clock_in_out',
          'attendance.manage_shifts',
        ],
        user
      );

    case 'time_off':
      return hasAnyPermission(
        [
          'leave.view_all',
          'leave.view_dept',
          'leave.view_own',
          'leave.apply_own',
          'leave.approve_dept',
          'leave.approve_all',
        ],
        user
      );

    case 'payroll':
      return hasAnyPermission(['payroll.view_all', 'finance.journals.view', 'finance.budget.manage'], user);

    case 'appraisals':
      return hasAnyPermission(['appraisals.view_dept', 'appraisals.evaluate_dept', 'appraisals.manage_cycles', 'appraisals.approve_all'], user);

    case 'requests':
      return hasAnyPermission(['requests.view_dept', 'requests.approve_dept', 'requests.approve_all'], user);

    case 'reports':
      return hasAnyPermission(['reports.headcount.view', 'reports.attendance.view', 'reports.leave.view', 'reports.finance.view', 'reports.turnover.view'], user);

    default:
      return false;
  }
}

/**
 * Checks if the user is allowed to access a specific department portal
 */
export function hasDepartmentAccess(
  deptSlug: string,
  user?: RBACUserContext | null
): boolean {
  const active = user || getActiveUser();
  if (!active) return false;

  const rawRole = (active.role || (Array.isArray(active.roles) ? active.roles[0] : '') || 'USER').toString().toUpperCase();
  if (
    active.isSuperAdmin ||
    rawRole === 'SUPER_ADMIN' ||
    (active.email && active.email.toLowerCase().includes('nasif.kamal'))
  ) {
    return true;
  }

  // Check specific department permission
  const cleanSlug = deptSlug.toLowerCase().replace(/[^\w]/g, '_');
  const permKey = `dept.${cleanSlug}.view`;
  return hasPermission(permKey, user) || hasPermission(`dept.${cleanSlug}.*`, user) || hasPermission('*', user);
}

/**
 * Checks if a department or leave group belongs to Digital School Program (DSP)
 */
export function isDspDepartment(deptName?: string | null, leaveGroup?: string | null): boolean {
  if (!deptName && !leaveGroup) return false;
  const d = (deptName || '').toLowerCase().trim();
  const g = (leaveGroup || '').toLowerCase().trim();
  if (
    d.includes('digital school') ||
    d.includes('dsp') ||
    d === 'digi' ||
    d.startsWith('dsp ') ||
    d === 'digital school program' ||
    d === 'dsp faculty group' ||
    d.includes('dsp hub') ||
    d.includes('dsp central')
  ) {
    return true;
  }
  if (g.includes('dsp') || g.includes('digital school') || g === 'dsp faculty group') {
    return true;
  }
  return false;
}

/**
 * Checks if the current active user or specified user context has the "Only Show DSP" scope active
 */
export function isDspOnlyScoped(user?: RBACUserContext | null): boolean {
  // 1. Direct active permissions check if array exists
  if (user && Array.isArray(user.permissions) && user.permissions.length > 0) {
    if (user.permissions.includes('pnc.scope.dsp_only') || user.permissions.includes('hr.scope.dsp_only')) {
      return true;
    }
  }

  // 2. Lookup against all candidate identifiers in localStorage
  if (typeof window !== 'undefined') {
    try {
      const candidateKeys: string[] = [];
      if (user?.id) candidateKeys.push(user.id);
      if (user?.email) candidateKeys.push(user.email.toLowerCase().trim());
      if ((user as any)?.employeeCode) candidateKeys.push((user as any).employeeCode.toLowerCase().trim());
      if ((user as any)?.fullName) candidateKeys.push((user as any).fullName.toLowerCase().trim());

      for (const k of candidateKeys) {
        const saved = localStorage.getItem(`jaago_user_permissions_${k}`);
        if (saved && (saved.includes('pnc.scope.dsp_only') || saved.includes('hr.scope.dsp_only'))) {
          return true;
        }
      }

      // 3. Check active session user in localStorage ('jaago_user')
      const activeRaw = localStorage.getItem('jaago_user');
      if (activeRaw) {
        const activeObj = JSON.parse(activeRaw);
        if (Array.isArray(activeObj.permissions)) {
          if (activeObj.permissions.includes('pnc.scope.dsp_only') || activeObj.permissions.includes('hr.scope.dsp_only')) {
            return true;
          }
        }
        const activeCandidates = [
          activeObj.id,
          activeObj.email ? activeObj.email.toLowerCase().trim() : null,
          activeObj.employeeCode ? activeObj.employeeCode.toLowerCase().trim() : null,
          activeObj.fullName ? activeObj.fullName.toLowerCase().trim() : null,
          activeObj.name ? activeObj.name.toLowerCase().trim() : null,
        ].filter(Boolean);

        for (const k of activeCandidates) {
          const saved = localStorage.getItem(`jaago_user_permissions_${k}`);
          if (saved && (saved.includes('pnc.scope.dsp_only') || saved.includes('hr.scope.dsp_only'))) {
            return true;
          }
        }
      }

      // 4. Check explicit active permissions storage key
      const activePermsSaved = localStorage.getItem('jaago_active_user_permissions');
      if (activePermsSaved && (activePermsSaved.includes('pnc.scope.dsp_only') || activePermsSaved.includes('hr.scope.dsp_only'))) {
        return true;
      }

      // 5. Check if any jaago_user_permissions_* key in localStorage contains DSP scope matching the session
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('jaago_user_permissions_')) {
          const val = localStorage.getItem(key);
          if (val && (val.includes('pnc.scope.dsp_only') || val.includes('hr.scope.dsp_only'))) {
            if (activeRaw) {
              const activeObj = JSON.parse(activeRaw);
              const suffix = key.replace('jaago_user_permissions_', '').toLowerCase().trim();
              if (
                suffix === activeObj.id?.toLowerCase().trim() ||
                suffix === activeObj.email?.toLowerCase().trim() ||
                suffix === activeObj.employeeCode?.toLowerCase().trim() ||
                suffix === activeObj.fullName?.toLowerCase().trim()
              ) {
                return true;
              }
            }
          }
        }
      }
    } catch {}
  }

  return false;
}


