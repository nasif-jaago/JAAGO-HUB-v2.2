import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MultiTenantCacheManager,
  acquireDistributedLock,
  releaseDistributedLock,
  SlidingWindowRateLimiter,
} from '@jaago/cache';
import { QueueProducerManager } from '@jaago/queue';

describe('Async Infrastructure, Cache, Rate Limits & Queue Suite', () => {
  it('constructs organization-scoped multi-tenant cache keys', () => {
    const cache = new MultiTenantCacheManager();
    const key = cache.buildKey('org-dhaka-01', 'hr', 'employee:123');

    assert.equal(key, 'jaago:org-dhaka-01:hr:employee:123');
  });

  it('prevents cache stampedes via mutex locking during concurrent misses', async () => {
    const cache = new MultiTenantCacheManager();
    const key = 'test:stampede:counter';
    let factoryInvocations = 0;

    const expensiveFactory = async () => {
      factoryInvocations++;
      await new Promise((r) => setTimeout(r, 50));
      return { data: 'calculated_value', version: 1 };
    };

    // Execute 5 concurrent getOrSet requests for the same missing key
    const results = await Promise.all([
      cache.getOrSet(key, expensiveFactory, { ttlSeconds: 60 }),
      cache.getOrSet(key, expensiveFactory, { ttlSeconds: 60 }),
      cache.getOrSet(key, expensiveFactory, { ttlSeconds: 60 }),
      cache.getOrSet(key, expensiveFactory, { ttlSeconds: 60 }),
      cache.getOrSet(key, expensiveFactory, { ttlSeconds: 60 }),
    ]);

    // All 5 calls should get the same data
    assert.equal(results.length, 5);
    assert.ok(results.every((r) => r.data === 'calculated_value'));

    // Expensive factory must only be called ONCE despite 5 concurrent callers!
    assert.equal(factoryInvocations, 1);
  });

  it('invalidates multiple cache entries using tags', async () => {
    const cache = new MultiTenantCacheManager();
    const tag = 'tag:employees:org-1';

    await cache.set('emp-1', { name: 'Alice' }, { tags: [tag] });
    await cache.set('emp-2', { name: 'Bob' }, { tags: [tag] });
    await cache.set('emp-3', { name: 'Charlie' }, { tags: ['other-tag'] });

    assert.ok(await cache.get('emp-1'));
    assert.ok(await cache.get('emp-2'));
    assert.ok(await cache.get('emp-3'));

    const purged = await cache.invalidateByTag(tag);
    assert.equal(purged, 2);

    assert.equal(await cache.get('emp-1'), undefined);
    assert.equal(await cache.get('emp-2'), undefined);
    assert.ok(await cache.get('emp-3')); // Unrelated tag remains cached
  });

  it('acquires and safely releases distributed locks', async () => {
    const lock1 = await acquireDistributedLock('db-migration-lock', 2000);
    assert.equal(lock1.acquired, true);

    // Concurrent attempt to acquire same lock should fail
    const lock2 = await acquireDistributedLock('db-migration-lock', 2000, 0);
    assert.equal(lock2.acquired, false);

    // Release lock1
    const released = await releaseDistributedLock(lock1);
    assert.equal(released, true);

    // Now another worker can acquire it
    const lock3 = await acquireDistributedLock('db-migration-lock', 2000);
    assert.equal(lock3.acquired, true);
    await releaseDistributedLock(lock3);
  });

  it('enforces sliding-window rate limit tiers and calculates retryAfter', () => {
    const limiter = new SlidingWindowRateLimiter();
    const ip = '192.168.1.50';

    // AUTH tier limit is 5 requests / 60s
    for (let i = 1; i <= 5; i++) {
      const res = limiter.check(ip, 'AUTH');
      assert.equal(res.allowed, true);
      assert.equal(res.remaining, 5 - i);
    }

    // 6th request should be blocked
    const blockedRes = limiter.check(ip, 'AUTH');
    assert.equal(blockedRes.allowed, false);
    assert.equal(blockedRes.remaining, 0);
    assert.ok(blockedRes.retryAfterSeconds! > 0);
  });

  it('deduplicates queue jobs using idempotency keys', async () => {
    const queue = new QueueProducerManager();
    const payload = {
      organizationId: 'org-root',
      traceId: 'tr-queue-001',
      to: 'donor@example.com',
      subject: 'Donation Receipt',
      idempotencyKey: 'idem-receipt-tx-999',
    };

    // First enqueue
    const res1 = await queue.enqueue('email', 'send_receipt', payload, {
      idempotencyKey: payload.idempotencyKey,
    });
    assert.equal(res1.duplicateSuppressed, undefined);
    assert.equal(queue.getQueueLength('email'), 1);

    // Duplicate enqueue with same idempotency key
    const res2 = await queue.enqueue('email', 'send_receipt', payload, {
      idempotencyKey: payload.idempotencyKey,
    });
    assert.equal(res2.duplicateSuppressed, true);
    assert.equal(queue.getQueueLength('email'), 1); // Queue length did not increment!
  });
});
