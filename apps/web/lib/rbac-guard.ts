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
  const active = user || getActiveUser();
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
  if (typeof window !== 'undefined') {
    try {
      if (active.id) {
        const userSaved = localStorage.getItem(`jaago_user_permissions_${active.id}`);
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
      if (active.email) {
        const userSavedEmail = localStorage.getItem(`jaago_user_permissions_${active.email.toLowerCase().trim()}`);
        if (userSavedEmail) {
          const parsed = JSON.parse(userSavedEmail);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
  }

  // 2. Check local matrix cache if updated from /admin/rbac
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

  // 3. Fallback to runtime roles
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

