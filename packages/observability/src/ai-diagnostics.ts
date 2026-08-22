export interface DiagnosticFact {
  timestamp: string;
  errorCode: string;
  eventType: string;
  route?: string | undefined;
  organizationId?: string | undefined;
  occurrenceCount: number;
  stackSnippet?: string | undefined;
}

export interface DiagnosticInference {
  hypothesis: string;
  confidenceScore: number; // 0.0 - 1.0
  affectedSubsystems: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DiagnosticRecommendation {
  actionTitle: string;
  actionType: 'CONFIG_CHANGE' | 'REINDEX' | 'SECRET_ROTATION' | 'SCALE_RESOURCES' | 'CODE_FIX';
  remediationSteps: string[];
  preventiveMeasures: string[];
}

export interface AiDiagnosticReport {
  diagnosticId: string;
  analyzedAt: string;
  fact: DiagnosticFact;
  inference: DiagnosticInference;
  recommendation: DiagnosticRecommendation;
}

export class AiLogDiagnosticEngine {
  /**
   * Analyzes an error event and synthesizes a structured, hallucination-resistant report
   */
  public static analyzeErrorEvent(errorEvent: {
    eventId?: string;
    timestamp?: string;
    errorCode?: string;
    errorMessage?: string;
    eventType?: string;
    route?: string;
    organizationId?: string;
    stack?: string;
  }): AiDiagnosticReport {
    const errorCode = errorEvent.errorCode || 'UNKNOWN_ERROR';
    const timestamp = errorEvent.timestamp || new Date().toISOString();
    const route = errorEvent.route || '/unknown';

    // 1. FACT EXTRACTION
    const fact: DiagnosticFact = {
      timestamp,
      errorCode,
      eventType: errorEvent.eventType || 'HTTP',
      route,
      organizationId: errorEvent.organizationId,
      occurrenceCount: 1,
      stackSnippet: errorEvent.stack ? errorEvent.stack.split('\n').slice(0, 3).join('\n') : undefined,
    };

    // 2. INFERENCE FORMULATION
    let hypothesis = 'Unexpected application runtime exception detected during request lifecycle.';
    let confidenceScore = 0.85;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    let affectedSubsystems = ['web'];

    let actionTitle = 'Review Application Server Logs';
    let actionType: 'CONFIG_CHANGE' | 'REINDEX' | 'SECRET_ROTATION' | 'SCALE_RESOURCES' | 'CODE_FIX' = 'CODE_FIX';
    let remediationSteps = [
      'Inspect full stack trace in centralized log runner.',
      'Reproduce with mock user context in staging environment.',
    ];
    let preventiveMeasures = ['Add unit test coverage for edge case handling.'];

    if (errorCode === 'AUTH_UNAUTHENTICATED' || errorCode === 'AUTH_TOKEN_EXPIRED') {
      hypothesis = 'Client attempted accessing authenticated endpoint without a valid Bearer JWT session.';
      confidenceScore = 0.98;
      severity = 'LOW';
      affectedSubsystems = ['auth', 'web'];
      actionTitle = 'Re-authenticate User Session';
      actionType = 'CONFIG_CHANGE';
      remediationSteps = [
        'Redirect client to /sign-in page to refresh authentication token.',
        'Verify client credentials and token expiration timestamp.',
      ];
      preventiveMeasures = ['Implement silent token refresh via HttpOnly refresh cookie.'];
    } else if (errorCode.includes('DATABASE') || errorCode.includes('POOL') || errorCode.includes('CONN')) {
      hypothesis = 'PostgreSQL connection pool exhausted or statement timeout exceeded under heavy concurrent query load.';
      confidenceScore = 0.92;
      severity = 'HIGH';
      affectedSubsystems = ['database', 'core-infra'];
      actionTitle = 'Optimize Connection Pool & Query Indices';
      actionType = 'SCALE_RESOURCES';
      remediationSteps = [
        'Increase PG max_connections or adjust Drizzle pool size.',
        'Analyze slow queries using pg_stat_activity and add missing indexes.',
      ];
      preventiveMeasures = ['Implement Redis cache layer for frequently queried relational data.'];
    } else if (errorCode.includes('RATE_LIMIT') || errorCode.includes('FLOOD')) {
      hypothesis = 'User or integration client exceeded allocated sliding window request quotas.';
      confidenceScore = 0.95;
      severity = 'MEDIUM';
      affectedSubsystems = ['rate-limiter', 'security'];
      actionTitle = 'Review Quota Tier or Investigate Traffic Spike';
      actionType = 'CONFIG_CHANGE';
      remediationSteps = [
        'Check X-RateLimit headers returned to the client.',
        'Upgrade client credential rate limit tier from API to INTEGRATION if authorized.',
      ];
      preventiveMeasures = ['Configure exponential backoff and retry jitter in client SDK.'];
    }

    const inference: DiagnosticInference = {
      hypothesis,
      confidenceScore,
      affectedSubsystems,
      severity,
    };

    const recommendation: DiagnosticRecommendation = {
      actionTitle,
      actionType,
      remediationSteps,
      preventiveMeasures,
    };

    return {
      diagnosticId: `diag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      analyzedAt: new Date().toISOString(),
      fact,
      inference,
      recommendation,
    };
  }
}
