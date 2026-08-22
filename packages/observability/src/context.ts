import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  traceId: string;
  requestId: string;
  correlationId?: string | undefined;
  userId?: string | undefined;
  organizationId?: string | undefined;
  departmentId?: string | undefined;
  projectId?: string | undefined;
  route?: string | undefined;
  httpMethod?: string | undefined;
  service?: string | undefined;
  startTime?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

export function updateContext(updates: Partial<RequestContext>): void {
  const current = asyncLocalStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
}
