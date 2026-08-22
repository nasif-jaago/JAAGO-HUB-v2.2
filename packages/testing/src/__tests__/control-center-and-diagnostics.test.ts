import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiLogDiagnosticEngine, SystemTelemetryService } from '@jaago/observability';
import { translate, i18nDictionary } from '@jaago/ui';

describe('System Control Center, AI Log Diagnostics & Hardening Suite', () => {
  it('synthesizes structured FACT, INFERENCE, and RECOMMENDATION records for anomalies', () => {
    const errorPayload = {
      errorCode: 'DATABASE_POOL_EXHAUSTED',
      errorMessage: 'Timeout: could not acquire client connection from pool within 5000ms',
      eventType: 'DATABASE',
      route: '/api/v1/reports',
      organizationId: 'org-dhaka-01',
      stack: 'Error: DATABASE_POOL_EXHAUSTED\n  at acquireConnection (db.ts:12)\n  at runQuery (query.ts:45)',
    };

    const report = AiLogDiagnosticEngine.analyzeErrorEvent(errorPayload);

    // 1. Check FACT
    assert.ok(report.diagnosticId.startsWith('diag_'));
    assert.equal(report.fact.errorCode, 'DATABASE_POOL_EXHAUSTED');
    assert.equal(report.fact.route, '/api/v1/reports');
    assert.equal(report.fact.organizationId, 'org-dhaka-01');
    assert.ok(report.fact.stackSnippet?.includes('acquireConnection'));

    // 2. Check INFERENCE
    assert.equal(report.inference.severity, 'HIGH');
    assert.ok(report.inference.confidenceScore >= 0.9);
    assert.ok(report.inference.hypothesis.includes('connection pool'));
    assert.ok(report.inference.affectedSubsystems.includes('database'));

    // 3. Check RECOMMENDATION
    assert.equal(report.recommendation.actionType, 'SCALE_RESOURCES');
    assert.ok(report.recommendation.remediationSteps.length >= 2);
    assert.ok(report.recommendation.preventiveMeasures.length >= 1);
  });

  it('correctly maps authentication and rate-limit error diagnostics', () => {
    const authReport = AiLogDiagnosticEngine.analyzeErrorEvent({
      errorCode: 'AUTH_UNAUTHENTICATED',
      route: '/api/v1/workflows',
    });
    assert.equal(authReport.inference.severity, 'LOW');
    assert.ok(authReport.inference.hypothesis.includes('Bearer JWT'));

    const rateLimitReport = AiLogDiagnosticEngine.analyzeErrorEvent({
      errorCode: 'RATE_LIMIT_EXCEEDED',
      route: '/api/v1/search',
    });
    assert.equal(rateLimitReport.inference.severity, 'MEDIUM');
    assert.ok(rateLimitReport.inference.affectedSubsystems.includes('rate-limiter'));
  });

  it('aggregates live host, node runtime, queue, and database telemetry', () => {
    const snapshot = SystemTelemetryService.getSnapshot();

    assert.ok(snapshot.host.hostname);
    assert.ok(snapshot.host.cpuCores >= 1);
    assert.ok(snapshot.nodeRuntime.heapUsedMb > 0);
    assert.equal(snapshot.spoolBuffer.safetyCapMb, 500);
    assert.equal(snapshot.spoolBuffer.status, 'OPTIMAL');
    assert.equal(snapshot.database.rlsEnforced, true);
    assert.equal(snapshot.disasterRecovery.vaultEncryption, 'AES-256-GCM');
    assert.equal(snapshot.disasterRecovery.lastDrillStatus, 'VERIFIED');
  });

  it('provides complete and consistent English and Bangla i18n dictionaries', () => {
    const enKeys = Object.keys(i18nDictionary.en);
    const bnKeys = Object.keys(i18nDictionary.bn);

    assert.equal(enKeys.length, bnKeys.length);
    assert.ok(enKeys.length >= 15);

    // Verify key translation outputs
    assert.equal(translate('nav.dashboard', 'en'), 'My Dashboard');
    assert.equal(translate('nav.dashboard', 'bn'), 'আমার ড্যাশবোর্ড');
    assert.equal(translate('status.clean', 'bn'), 'নিরাপদ');
  });
});
