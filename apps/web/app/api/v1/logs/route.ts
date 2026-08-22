import { createApiHandler } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler({
  requireAuth: true,
  async handler(request, context) {
    const url = new URL(request.url);
    const level = url.searchParams.get('level') || 'ALL';
    const eventType = url.searchParams.get('eventType') || 'ALL';
    const search = (url.searchParams.get('search') || '').toLowerCase();

    // Sample structured log stream for demonstration / testing
    const sampleLogs = [
      {
        id: 'log-001',
        timestamp: new Date(Date.now() - 1000 * 20).toISOString(),
        level: 'info',
        eventType: 'AUTH',
        action: 'user.signin.success',
        environment: 'production',
        service: 'web',
        traceId: 'fc337b21-8275-46ce-8159-61d114ddb450',
        requestId: '705fcdce-180e-4e7b-a8ac-3a3ed84da535',
        userId: 'aaaa1111-aaaa-4aaa-aaaa-111111111111',
        organizationId: context.organizationId || 'org-root',
        route: '/api/v1/auth/sign-in',
        httpMethod: 'POST',
        statusCode: 200,
        durationMs: 42,
        metadata: { email: 'nasif.kamal@jaago.com.bd', mfaVerified: true },
        ipAddress: '192.168.10.69',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        id: 'log-002',
        timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
        level: 'warn',
        eventType: 'SECURITY',
        action: 'rate_limit.warning',
        environment: 'production',
        service: 'web',
        traceId: 'f25dcbd6-c205-4f6a-a937-dc8d8635948b',
        requestId: '026e54a8-2f94-4389-8b84-6f440a029679',
        route: '/api/v1/auth/sign-in',
        httpMethod: 'POST',
        statusCode: 429,
        durationMs: 12,
        metadata: { ip: '192.168.1.105', attempts: 5 },
        ipAddress: '192.168.1.105',
        userAgent: 'curl/8.4.0',
      },
      {
        id: 'log-003',
        timestamp: new Date(Date.now() - 1000 * 120).toISOString(),
        level: 'info',
        eventType: 'AUDIT',
        action: 'user.role.updated',
        environment: 'production',
        service: 'web',
        traceId: 'd09cfd87-33fc-40f4-a275-71e008c7e4fa',
        requestId: '6f7737ca-7039-476f-9b4c-81be2080c29f',
        userId: 'usr-admin',
        organizationId: context.organizationId || 'org-root',
        route: '/api/v1/users/roles',
        httpMethod: 'POST',
        statusCode: 200,
        durationMs: 65,
        metadata: { targetUser: 'emp-dhaka-02', assignedRole: 'hr_manager' },
        ipAddress: '192.168.10.69',
      },
      {
        id: 'log-004',
        timestamp: new Date(Date.now() - 1000 * 180).toISOString(),
        level: 'error',
        eventType: 'HTTP',
        action: 'request.error',
        environment: 'production',
        service: 'web',
        traceId: '78079cb7-9b40-43c3-bd98-5f4133bb9e26',
        requestId: '3d96acd3-0065-4fdd-85d5-5a7d1b4d7afb',
        route: '/api/v1/finance/reports',
        httpMethod: 'GET',
        statusCode: 500,
        durationMs: 120,
        errorCode: 'DATABASE_TIMEOUT',
        errorMessage: 'Database connection pool timed out after 5000ms',
        metadata: { poolUtilization: '100%' },
        ipAddress: '192.168.10.69',
      },
      {
        id: 'log-005',
        timestamp: new Date(Date.now() - 1000 * 240).toISOString(),
        level: 'info',
        eventType: 'SYSTEM',
        action: 'module.installed',
        environment: 'production',
        service: 'log-runner',
        traceId: 'b98a5090-d64a-4342-9488-6a550447184f',
        requestId: 'db6709ed-31ff-48c5-8756-086591a303df',
        organizationId: context.organizationId || 'org-root',
        metadata: { moduleKey: 'announcements', version: '1.0.0' },
      },
    ];

    const filtered = sampleLogs.filter((l) => {
      const matchLevel = level === 'ALL' || l.level.toUpperCase() === level.toUpperCase();
      const matchType = eventType === 'ALL' || l.eventType.toUpperCase() === eventType.toUpperCase();
      const matchSearch =
        !search ||
        l.action.toLowerCase().includes(search) ||
        l.traceId.toLowerCase().includes(search) ||
        (l.route && l.route.toLowerCase().includes(search));

      return matchLevel && matchType && matchSearch;
    });

    return Response.json({
      data: filtered,
      meta: {
        total: filtered.length,
        organizationId: context.organizationId,
      },
    });
  },
});
