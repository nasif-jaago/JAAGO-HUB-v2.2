import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockRlsDatabase, BaseTenantRow } from '../rls-harness';
import { TEST_FIXTURES } from '../fixtures';

interface EmployeeRecord extends BaseTenantRow {
  fullName: string;
  salary: number;
}

describe('PostgreSQL Row Level Security (RLS) Isolation Suite', () => {
  let db: MockRlsDatabase<EmployeeRecord>;

  const records: EmployeeRecord[] = [
    {
      id: 'emp-dhaka-01',
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
      fullName: 'Dhaka Project Lead',
      salary: 75000,
    },
    {
      id: 'emp-dhaka-02',
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
      fullName: 'Dhaka Teacher',
      salary: 35000,
    },
    {
      id: 'emp-ctg-01',
      organizationId: TEST_FIXTURES.tenants.tenantB.id,
      fullName: 'Chittagong Project Lead',
      salary: 72000,
    },
  ];

  beforeEach(() => {
    db = new MockRlsDatabase<EmployeeRecord>();
    db.seed(records);
  });

  it('proves Tenant A user cannot query Tenant B records (cross-tenant isolation)', () => {
    // Set active session to Tenant A employee
    db.setSession({
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
      userId: TEST_FIXTURES.users.employeeA.id,
    });

    const visibleRows = db.select();
    assert.equal(visibleRows.length, 2);
    assert.ok(visibleRows.every((r) => r.organizationId === TEST_FIXTURES.tenants.tenantA.id));
    assert.ok(!visibleRows.some((r) => r.id === 'emp-ctg-01'));
  });

  it('proves unauthenticated queries return zero records', () => {
    db.setSession(null);
    const visibleRows = db.select();
    assert.equal(visibleRows.length, 0);
  });

  it('blocks cross-tenant record insertion', () => {
    // Tenant A attempts to insert a record tagged with Tenant B's organization ID
    db.setSession({
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
      userId: TEST_FIXTURES.users.employeeA.id,
    });

    const result = db.insert({
      id: 'emp-malicious-01',
      organizationId: TEST_FIXTURES.tenants.tenantB.id,
      fullName: 'Malicious Injected Record',
      salary: 99999,
    });

    assert.equal(result.success, false);
    assert.match(result.error || '', /RLS Security Violation/);
  });

  it('blocks cross-tenant update and tenant re-assignment attacks', () => {
    db.setSession({
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
      userId: TEST_FIXTURES.users.employeeA.id,
    });

    // Attempt to update a record belonging to Tenant B
    const updateTargetB = db.update('emp-ctg-01', { salary: 100000 });
    assert.equal(updateTargetB.count, 0); // 0 rows modified because row is invisible to Tenant A

    // Attempt to reassign Tenant A's record to Tenant B
    const reassignAttack = db.update('emp-dhaka-01', {
      organizationId: TEST_FIXTURES.tenants.tenantB.id,
    });
    assert.equal(reassignAttack.success, false);
    assert.match(reassignAttack.error || '', /Cannot reassign tenant ownership/);
  });

  it('allows SuperAdmin to view all tenant records for governance', () => {
    db.setSession({
      organizationId: TEST_FIXTURES.tenants.tenantA.id,
      userId: TEST_FIXTURES.users.superAdmin.id,
      isSuperAdmin: true,
    });

    const allRows = db.select();
    assert.equal(allRows.length, 3);
  });
});
