import { NextResponse } from 'next/server';
import { extractTraceHeaders, runWithContext } from '@jaago/observability';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { traceId, requestId } = extractTraceHeaders(request.headers);

  return runWithContext({ traceId, requestId, route: '/api/v1', httpMethod: 'GET' }, () => {
    logger.info('HTTP', 'api.v1.root.accessed', {
      route: '/api/v1',
      httpMethod: 'GET',
      statusCode: 200,
    });

    return NextResponse.json({
      name: 'JAAGO HUB API',
      version: 'v1',
      platform: 'JAAGO HUB v2.2',
      status: 'active',
      timestamp: new Date().toISOString(),
      traceId,
    }, {
      status: 200,
      headers: {
        'X-Trace-Id': traceId,
        'X-Request-Id': requestId,
      },
    });
  });
}
