import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePermission } from '@jaago/authz';
import { TEST_FIXTURES } from '../fixtures';

describe('RBAC Permission Evaluator Suite', () => {
  it('grants access when exact permission is present', () => {
    const allowed = evaluatePermission(
      {
        userId: TEST_FIXTURES.users.employeeA.id,
        organizationId: TEST_FIXTURES.tenants.tenantA.id,
        roles: ['employee'],
        permissions: ['hr.employees.view'],
      },
      {
        permission: 'hr.employees.view',
        organizationId: TEST_FIXTURES.tenants.tenantA.id,
      },
    );

    assert.equal(allowed, true);
  });

  it('denies access when permission is missing', () => {
    const allowed = evaluatePermission(
      {
        userId: TEST_FIXTURES.users.employeeA.id,
        organizationId: TEST_FIXTURES.tenants.tenantA.id,
        roles: ['employee'],
        permissions: ['hr.employees.view'],
      },
      {
        permission: 'finance.journals.post',
        organizationId: TEST_FIXTURES.tenants.tenantA.id,
      },
    );

    assert.equal(allowed, false);
  });

  it('supports domain wildcard permissions (e.g. system.* or hr.*)', () => {
    const adminUser = TEST_FIXTURES.users.adminA;

    const canViewUsers = evaluatePermission(adminUser, {
      permission: 'system.users.view',
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
    });
    const canCreateUsers = evaluatePermission(adminUser, {
      permission: 'system.users.create',
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
    });
    const canManageEmployees = evaluatePermission(adminUser, {
      permission: 'hr.employees.manage',
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
    });
    const canPostFinance = evaluatePermission(adminUser, {
      permission: 'finance.journals.post',
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
    });

    assert.equal(canViewUsers, true);
    assert.equal(canCreateUsers, true);
    assert.equal(canManageEmployees, true);
    assert.equal(canPostFinance, false); // Admin only has system.* and hr.*
  });

  it('strictly blocks cross-tenant access even if permission matches', () => {
    const allowed = evaluatePermission(
      {
        userId: TEST_FIXTURES.users.adminA.id,
        organizationId: TEST_FIXTURES.tenants.tenantA.id,
        roles: ['admin'],
        permissions: ['system.*'],
      },
      {
        permission: 'system.users.view',
        organizationId: TEST_FIXTURES.tenants.tenantB.id, // Different tenant!
      },
    );

    assert.equal(allowed, false);
  });

  it('allows SuperAdmin to access any permission across all tenants', () => {
    const superAdmin = TEST_FIXTURES.users.superAdmin;

    const allowedTenantB = evaluatePermission(superAdmin, {
      permission: 'finance.journals.post',
      organizationId: TEST_FIXTURES.tenants.tenantB.id,
    });

    assert.equal(allowedTenantB, true);
  });
});
