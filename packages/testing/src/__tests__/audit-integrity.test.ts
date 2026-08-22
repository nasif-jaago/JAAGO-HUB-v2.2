import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAuditHash, GENESIS_AUDIT_HASH } from '@jaago/core-infra';

describe('Tamper-Evident Hash-Chained Audit Log Suite', () => {
  it('computes deterministic SHA-256 hash chains across sequential records', () => {
    const timestamp1 = '2026-08-22T01:00:00.000Z';
    const hash1 = computeAuditHash({
      previousHash: GENESIS_AUDIT_HASH,
      timestamp: timestamp1,
      organizationId: 'org-test-01',
      userId: 'usr-001',
      action: 'user.login',
      entityType: 'user',
      entityId: 'usr-001',
      newState: { ip: '127.0.0.1' },
    });

    assert.ok(hash1);
    assert.equal(hash1.length, 64); // 256-bit hex

    const timestamp2 = '2026-08-22T01:05:00.000Z';
    const hash2 = computeAuditHash({
      previousHash: hash1,
      timestamp: timestamp2,
      organizationId: 'org-test-01',
      userId: 'usr-001',
      action: 'invoice.approved',
      entityType: 'invoice',
      entityId: 'inv-100',
      newState: { amount: 50000, status: 'approved' },
    });

    assert.ok(hash2);
    assert.notEqual(hash1, hash2);

    // If an attacker tampers with record 1's state, recalculating hash1 produces a mismatch
    const tamperedHash1 = computeAuditHash({
      previousHash: GENESIS_AUDIT_HASH,
      timestamp: timestamp1,
      organizationId: 'org-test-01',
      userId: 'usr-001',
      action: 'user.login',
      entityType: 'user',
      entityId: 'usr-001',
      newState: { ip: '192.168.1.99' }, // Modified!
    });

    assert.notEqual(hash1, tamperedHash1);
  });
});
