export interface EvaluationSubject {
  userId: string;
  organizationId: string;
  departmentId?: string | undefined;
  roles: string[];
  permissions: string[];
  isSuperAdmin?: boolean | undefined;
}

export interface EvaluationTarget {
  permission: string;
  organizationId?: string | undefined;
  departmentId?: string | undefined;
  ownerUserId?: string | undefined;
}

export function evaluatePermission(subject: EvaluationSubject, target: EvaluationTarget): boolean {
  // 1. Super Admin bypasses all checks
  if (subject.isSuperAdmin) {
    return true;
  }

  // 2. Tenant isolation check: Subject can never access another organization
  if (target.organizationId && target.organizationId !== subject.organizationId) {
    return false;
  }

  // 3. Global wildcard check
  if (subject.permissions.includes('*') || subject.roles.includes('super_admin')) {
    return true;
  }

  // 4. Exact permission match
  if (subject.permissions.includes(target.permission)) {
    return true;
  }

  // 5. Wildcard domain match (e.g. "hr.*" satisfies "hr.employees.view")
  const targetParts = target.permission.split('.');
  if (targetParts.length >= 2) {
    const domainWildcard = `${targetParts[0]}.*`;
    if (subject.permissions.includes(domainWildcard)) {
      return true;
    }
  }

  return false;
}
