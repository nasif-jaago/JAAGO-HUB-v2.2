import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { redactSensitiveData } from '../redaction';
import { buildLogEvent } from '../event-builder';
import { logger } from '../logger';

describe('packages/logger - Central Redaction and Event Builder', () => {
  it('redacts sensitive fields in payload recursively', () => {
    const rawPayload = {
      username: 'intern_account',
      password: 'SuperSecretPassword123!',
      nested: {
        authorization: 'Bearer secret_token_xyz',
        apiKey: 'key_live_998877',
        safeField: 'safeValue',
      },
      tokens: ['token1', { refreshToken: 'refresh_secret_abc' }],
    };

    const redacted = redactSensitiveData(rawPayload) as typeof rawPayload;

    assert.equal(redacted.username, 'intern_account');
    assert.equal(redacted.password, '[REDACTED]');
    assert.equal(redacted.nested.authorization, '[REDACTED]');
    assert.equal(redacted.nested.apiKey, '[REDACTED]');
    assert.equal(redacted.nested.safeField, 'safeValue');
    assert.equal((redacted.tokens[1] as any).refreshToken, '[REDACTED]');
  });

  it('builds structured 30-field compliant log events', () => {
    const event = buildLogEvent('info', 'AUTH', 'user.login.success', {
      userId: 'usr-12345',
      organizationId: 'org-jaago',
      metadata: {
        method: 'google_oauth',
        password: 'should_not_leak',
      },
    });

    assert.equal(event.level, 'info');
    assert.equal(event.eventType, 'AUTH');
    assert.equal(event.action, 'user.login.success');
    assert.equal(event.userId, 'usr-12345');
    assert.ok(event.eventId);
    assert.ok(event.timestamp);
    assert.ok(event.traceId);
    assert.equal((event.metadata as any)?.password, '[REDACTED]');
    assert.equal((event.metadata as any)?.method, 'google_oauth');
  });

  it('logs events without throwing errors', () => {
    assert.doesNotThrow(() => {
      logger.info('SYSTEM', 'server.boot', { service: 'test-runner' });
      logger.warn('SECURITY', 'rate_limit.warning', { metadata: { ip: '127.0.0.1' } });
      logger.error('HTTP', 'request.failed', new Error('Simulated database timeout'));
      logger.audit('user.role.updated', { userId: 'usr-admin' });
    });
  });
});
