import { randomUUID } from 'node:crypto';
import { getContext } from '@jaago/observability';
import { redactSensitiveData } from './redaction';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export type EventType =
  | 'AUTH'
  | 'SECURITY'
  | 'BUSINESS'
  | 'AUDIT'
  | 'SYSTEM'
  | 'HTTP'
  | 'JOB'
  | 'INTEGRATION';

export interface StructuredLogEvent {
  eventId: string;
  timestamp: string;
  level: LogLevel;
  eventType: EventType;
  action: string;
  environment: string;
  service: string;
  module?: string | undefined;
  traceId: string;
  requestId: string;
  correlationId?: string | undefined;
  userId?: string | undefined;
  organizationId?: string | undefined;
  departmentId?: string | undefined;
  projectId?: string | undefined;
  route?: string | undefined;
  httpMethod?: string | undefined;
  statusCode?: number | undefined;
  durationMs?: number | undefined;
  entityType?: string | undefined;
  entityId?: string | undefined;
  jobId?: string | undefined;
  connectorId?: string | undefined;
  errorCode?: string | undefined;
  errorType?: string | undefined;
  errorMessage?: string | undefined;
  errorFingerprint?: string | undefined;
  cause?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export function buildLogEvent(
  level: LogLevel,
  eventType: EventType,
  action: string,
  payload: Partial<StructuredLogEvent> = {},
): StructuredLogEvent {
  const ctx = getContext();
  const env = process.env['NODE_ENV'] || 'development';
  const service = payload.service || ctx?.service || 'web';

  const baseEvent: StructuredLogEvent = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    eventType,
    action,
    environment: env,
    service,
    traceId: payload.traceId || ctx?.traceId || randomUUID(),
    requestId: payload.requestId || ctx?.requestId || randomUUID(),
    ...(ctx?.correlationId || payload.correlationId
      ? { correlationId: payload.correlationId || ctx?.correlationId }
      : {}),
    ...(ctx?.userId || payload.userId ? { userId: payload.userId || ctx?.userId } : {}),
    ...(ctx?.organizationId || payload.organizationId
      ? { organizationId: payload.organizationId || ctx?.organizationId }
      : {}),
    ...(ctx?.departmentId || payload.departmentId
      ? { departmentId: payload.departmentId || ctx?.departmentId }
      : {}),
    ...(ctx?.projectId || payload.projectId
      ? { projectId: payload.projectId || ctx?.projectId }
      : {}),
    ...(ctx?.route || payload.route ? { route: payload.route || ctx?.route } : {}),
    ...(ctx?.httpMethod || payload.httpMethod
      ? { httpMethod: payload.httpMethod || ctx?.httpMethod }
      : {}),
    ...(payload.module ? { module: payload.module } : {}),
    ...(payload.statusCode !== undefined ? { statusCode: payload.statusCode } : {}),
    ...(payload.durationMs !== undefined ? { durationMs: payload.durationMs } : {}),
    ...(payload.entityType ? { entityType: payload.entityType } : {}),
    ...(payload.entityId ? { entityId: payload.entityId } : {}),
    ...(payload.jobId ? { jobId: payload.jobId } : {}),
    ...(payload.connectorId ? { connectorId: payload.connectorId } : {}),
    ...(payload.errorCode ? { errorCode: payload.errorCode } : {}),
    ...(payload.errorType ? { errorType: payload.errorType } : {}),
    ...(payload.errorMessage ? { errorMessage: payload.errorMessage } : {}),
    ...(payload.errorFingerprint ? { errorFingerprint: payload.errorFingerprint } : {}),
    ...(payload.cause ? { cause: payload.cause } : {}),
    ...(payload.metadata ? { metadata: payload.metadata } : {}),
  };

  // Perform central redaction before emitting
  return redactSensitiveData(baseEvent);
}
