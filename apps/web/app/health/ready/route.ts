import { NextResponse } from 'next/server';
import { HealthReadyResponse } from '@jaago/contracts';
import { extractTraceHeaders } from '@jaago/observability';
import fs from 'node:fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { traceId } = extractTraceHeaders(request.headers);
  const startTime = Date.now();

  const checks: HealthReadyResponse['checks'] = {};
  let overallHealthy = true;

  // 1. Config Check
  const hasAppSecret = Boolean(process.env['APP_SECRET'] || process.env['NODE_ENV'] === 'test');
  checks['config'] = {
    status: hasAppSecret ? 'healthy' : 'degraded',
    message: hasAppSecret ? 'Config loaded' : 'Missing some optional config',
  };

  // 2. Log Spool Directory Check (Req 52-58)
  const spoolDir = process.env['LOG_SPOOL_DIR'] || './.spool-temp';
  try {
    const spoolExists = fs.existsSync(spoolDir);
    checks['logSpool'] = {
      status: 'healthy',
      details: {
        spoolDir,
        directoryExists: spoolExists,
      },
    };
  } catch {
    checks['logSpool'] = {
      status: 'degraded',
      message: 'Log spool inaccessible',
    };
  }

  // 3. Database Check stub (evaluated further in Phase 1)
  const dbUrl = process.env['DATABASE_URL'];
  checks['database'] = {
    status: dbUrl ? 'healthy' : 'degraded',
    message: dbUrl ? 'Configured' : 'DATABASE_URL not set in current env',
  };

  // 4. Redis Check stub (evaluated further in Phase 4)
  const redisHost = process.env['REDIS_HOST'];
  checks['redis'] = {
    status: redisHost ? 'healthy' : 'degraded',
    message: redisHost ? 'Configured' : 'REDIS_HOST using default',
  };

  const durationMs = Date.now() - startTime;
  const status = overallHealthy ? 'healthy' : 'unhealthy';
  const httpStatus = status === 'healthy' ? 200 : 503;

  const payload: HealthReadyResponse = {
    status,
    timestamp: new Date().toISOString(),
    traceId,
    version: '2.2.0',
    checks,
  };

  return NextResponse.json(payload, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Content-Type': 'application/json',
      'X-Trace-Id': traceId,
      'X-Response-Time-Ms': durationMs.toString(),
    },
  });
}
