import assert from 'node:assert/strict';
import { loadConfig, resetConfigCache } from '../../packages/config/src/index';
import { extractTraceHeaders, runWithContext, getContext } from '../../packages/observability/src/index';
import { redactSensitiveData, buildLogEvent, logger } from '../../packages/logger/src/index';
import { createErrorEnvelope, ErrorCode, HealthLiveResponseSchema, HealthReadyResponseSchema } from '../../packages/contracts/src/index';

console.log('\n===============================================================');
console.log('   JAAGO HUB v2.2 — Phase 0 Foundation Smoke Test');
console.log('===============================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err);
  }
}

// 1. Context & Tracing
runTest('Observability Context & Tracing', () => {
  const headers = new Headers();
  headers.set('x-trace-id', 'trace-smoke-001');
  headers.set('x-request-id', 'req-smoke-001');

  const { traceId, requestId } = extractTraceHeaders(headers);
  assert.equal(traceId, 'trace-smoke-001');
  assert.equal(requestId, 'req-smoke-001');

  runWithContext({ traceId, requestId, userId: 'usr-smoke' }, () => {
    const ctx = getContext();
    assert.equal(ctx?.traceId, 'trace-smoke-001');
    assert.equal(ctx?.userId, 'usr-smoke');
  });
});

// 2. Central Redaction
runTest('Logger Central Redaction Filter', () => {
  const testPayload = {
    user: 'admin',
    password: 'UnsafePassword123!',
    credentials: {
      accessToken: 'jwt_token_value',
      smtpPassword: 'email_password_123',
    },
    safeDetails: 'Public information',
  };

  const redacted = redactSensitiveData(testPayload) as typeof testPayload;
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.credentials.accessToken, '[REDACTED]');
  assert.equal(redacted.credentials.smtpPassword, '[REDACTED]');
  assert.equal(redacted.safeDetails, 'Public information');
});

// 3. Structured JSON Event Builder
runTest('Structured JSON Event Builder (30-field Contract)', () => {
  const event = buildLogEvent('info', 'SYSTEM', 'smoke_test.executed', {
    service: 'smoke-test',
    metadata: {
      check: 'complete',
      serviceRoleKey: 'secret_key_to_redact',
    },
  });

  assert.equal(event.level, 'info');
  assert.equal(event.eventType, 'SYSTEM');
  assert.equal(event.action, 'smoke_test.executed');
  assert.ok(event.eventId);
  assert.ok(event.timestamp);
  assert.ok(event.traceId);
  assert.equal((event.metadata as any)?.serviceRoleKey, '[REDACTED]');
});

// 4. Standard Error Envelope
runTest('Standard API Error Envelope', () => {
  const envelope = createErrorEnvelope(
    ErrorCode.FINANCE_INVOICE_NOT_APPROVABLE,
    'Invoice is currently in draft state.',
    'trace-err-001',
    { invoiceId: 'INV-2026-001' }
  );

  assert.equal(envelope.error.code, ErrorCode.FINANCE_INVOICE_NOT_APPROVABLE);
  assert.equal(envelope.error.traceId, 'trace-err-001');
  assert.equal((envelope.error.details as any)?.invoiceId, 'INV-2026-001');
});

// 5. Health Check Schemas
runTest('Health Probes Response Validation', () => {
  const liveData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: 120,
  };
  const liveParsed = HealthLiveResponseSchema.safeParse(liveData);
  assert.equal(liveParsed.success, true);

  const readyData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    traceId: 'trace-ready-001',
    version: '2.2.0',
    checks: {
      database: { status: 'healthy', latencyMs: 2 },
      redis: { status: 'healthy' },
    },
  };
  const readyParsed = HealthReadyResponseSchema.safeParse(readyData);
  assert.equal(readyParsed.success, true);
});

// 6. Fail-Safe Env Validation
runTest('Fail-Safe Environment Validation on Missing Config', () => {
  resetConfigCache();
  assert.throws(() => {
    loadConfig({ NODE_ENV: 'test' });
  });
});

console.log(`\nSmoke Test Results: ${passedTests}/${totalTests} tests passed.\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
