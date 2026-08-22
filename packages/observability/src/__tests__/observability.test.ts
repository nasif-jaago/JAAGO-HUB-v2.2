import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runWithContext, getContext, updateContext } from '../context';
import { generateTraceId, extractTraceHeaders } from '../tracing';

describe('packages/observability - Context & Tracing', () => {
  it('propagates request context via AsyncLocalStorage', () => {
    const traceId = generateTraceId();
    const requestId = generateTraceId();

    runWithContext({ traceId, requestId, userId: 'usr-1001' }, () => {
      const ctx = getContext();
      assert.ok(ctx);
      assert.equal(ctx.traceId, traceId);
      assert.equal(ctx.userId, 'usr-1001');

      updateContext({ organizationId: 'org-root' });
      const updated = getContext();
      assert.equal(updated?.organizationId, 'org-root');
    });

    assert.equal(getContext(), undefined);
  });

  it('extracts or generates trace headers', () => {
    const headers = new Headers();
    headers.set('x-trace-id', 'trace-custom-abc');
    headers.set('x-request-id', 'req-custom-123');

    const extracted = extractTraceHeaders(headers);
    assert.equal(extracted.traceId, 'trace-custom-abc');
    assert.equal(extracted.requestId, 'req-custom-123');

    const emptyExtracted = extractTraceHeaders({});
    assert.ok(emptyExtracted.traceId);
    assert.ok(emptyExtracted.requestId);
  });
});
