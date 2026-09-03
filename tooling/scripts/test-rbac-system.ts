import {
  PERMISSION_MODULES,
  INITIAL_ROLES,
  normalizeRoleKey,
  getRoleByNormalizedKey,
  getPermissionsForRole,
} from '../../apps/web/lib/rbac-data';
import { createAppAbility } from '../../packages/authz/src/casl/ability-factory';

console.log('─── 1. VERIFYING ROLE NORMALIZATION & UNIFICATION ───');
const testRoles = ['USER', 'employee', 'EMPLOYEE', 'Staff', 'Officer', 'general_staff'];
for (const tr of testRoles) {
  const norm = normalizeRoleKey(tr);
  if (norm !== 'user') {
    throw new Error(`Expected "${tr}" to normalize to "user", but got "${norm}"`);
  }
}
console.log('✓ All Employee and User variations successfully normalize to unified canonical "user" role');

console.log('\n─── 2. VERIFYING 12 PERMISSION MODULES & MICRO-LABELS ───');
console.log(`Total Modules Configured: ${PERMISSION_MODULES.length}`);
if (PERMISSION_MODULES.length < 12) {
  throw new Error(`Expected at least 12 modules, found ${PERMISSION_MODULES.length}`);
}

let totalPermissions = 0;
PERMISSION_MODULES.forEach((m) => {
  totalPermissions += m.permissions.length;
  m.permissions.forEach((p) => {
    if (!p.actionType || !p.scope) {
      throw new Error(`Permission ${p.key} missing actionType or scope`);
    }
  });
});
console.log(`✓ All ${PERMISSION_MODULES.length} modules configured with ${totalPermissions} micro-labeled permissions!`);

console.log('\n─── 3. VERIFYING CASL ABILITY ENFORCEMENT ───');

// Test 3.1: Standard Employee / User
const userPerms = getPermissionsForRole('user');
const userAbility = createAppAbility({
  userId: 'user-123',
  email: 'employee@jaago.com.bd',
  organizationId: 'org-jaago',
  roles: ['user'],
  permissions: userPerms,
});

if (!userAbility.can('read', { __typename: 'Attendance', user_id: 'user-123' } as any)) {
  throw new Error('User should be able to view their own attendance');
}
if (userAbility.can('read', { __typename: 'Attendance', user_id: 'other-user' } as any)) {
  throw new Error('User should NOT be able to view other employees attendance');
}
if (!userAbility.can('submit', 'LeaveRequest')) {
  throw new Error('User should be able to submit a leave request');
}
if (userAbility.can('approve', 'LeaveRequest')) {
  throw new Error('Standard User should NOT be able to approve leave requests');
}
console.log('✓ Standard Employee / User CASL ability verified: Self-service allowed, restricted from management');

// Test 3.2: Department Manager
const mgrPerms = getPermissionsForRole('dept_manager');
const mgrAbility = createAppAbility({
  userId: 'mgr-456',
  email: 'manager@jaago.com.bd',
  organizationId: 'org-jaago',
  departmentId: 'dept-education',
  roles: ['dept_manager'],
  permissions: mgrPerms,
});

if (!mgrAbility.can('approve', { __typename: 'LeaveRequest', department_id: 'dept-education' } as any)) {
  throw new Error('Dept Manager should be able to approve leaves in their department');
}
if (mgrAbility.can('approve', { __typename: 'LeaveRequest', department_id: 'dept-finance' } as any)) {
  throw new Error('Dept Manager should NOT be able to approve leaves in other departments');
}
console.log('✓ Department Manager CASL ability verified: Scoped to assigned department');

// Test 3.3: Super Admin Root Access
const superAbility = createAppAbility({
  userId: 'super-admin-root',
  email: 'nasif.kamal@jaago.com.bd',
  organizationId: 'org-jaago',
  roles: ['super_admin'],
  permissions: ['*'],
  isSuperAdmin: true,
});

if (!superAbility.can('manage', 'all')) {
  throw new Error('Super Admin must have unrestricted manage all capability');
}
console.log('✓ Super Admin CASL ability verified: Unrestricted root manage all capability');

console.log('\n========================================');
console.log('🎉 ALL RBAC VERIFICATIONS PASSED 100%! 🎉');
console.log('========================================');
