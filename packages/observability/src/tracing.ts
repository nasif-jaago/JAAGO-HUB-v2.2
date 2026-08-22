import { randomUUID } from 'node:crypto';

export function generateTraceId(): string {
  return randomUUID();
}

export function generateRequestId(): string {
  return randomUUID();
}

export function extractTraceHeaders(headers: Headers | Record<string, string | string[] | undefined>): {
  traceId: string;
  requestId: string;
  correlationId?: string | undefined;
} {
  let traceId: string | undefined;
  let requestId: string | undefined;
  let correlationId: string | undefined;

  if (headers instanceof Headers) {
    traceId = headers.get('x-trace-id') || headers.get('traceparent') || undefined;
    requestId = headers.get('x-request-id') || undefined;
    correlationId = headers.get('x-correlation-id') || undefined;
  } else {
    const getHeader = (key: string) => {
      const val = headers[key] || headers[key.toLowerCase()];
      return Array.isArray(val) ? val[0] : val;
    };
    traceId = getHeader('x-trace-id') || getHeader('traceparent');
    requestId = getHeader('x-request-id');
    correlationId = getHeader('x-correlation-id');
  }

  const resolvedTraceId = traceId || generateTraceId();
  const resolvedRequestId = requestId || generateRequestId();

  return {
    traceId: resolvedTraceId,
    requestId: resolvedRequestId,
    ...(correlationId ? { correlationId } : {}),
  };
}
