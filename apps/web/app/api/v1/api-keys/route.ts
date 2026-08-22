import { createApiHandler } from '@jaago/authz';
import { ApiKeyManager, GeneratedApiClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory persistent demo store
const activeApiClients: GeneratedApiClient[] = [
  {
    clientId: 'jg_live_8f3b2a194c7e6d0a',
    clientSecret: '••••••••••••••••••••••••••••••••',
    hashedSecret: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    name: 'Volunteer Mobile App Sync',
    scopes: ['directory.view', 'announcements.read', 'volunteer.sync'],
    rateLimitTier: 'API',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    clientId: 'jg_live_99d14f2a718b52e3',
    clientSecret: '••••••••••••••••••••••••••••••••',
    hashedSecret: 'c5b4e78298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    name: 'Finance & Donor Reporting Daemon',
    scopes: ['reports.read', 'finance.view'],
    rateLimitTier: 'REPORTS',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const GET = createApiHandler({
  requireAuth: true,
  async handler(_request, context) {
    return Response.json({
      data: activeApiClients.map((c) => ({
        clientId: c.clientId,
        name: c.name,
        scopes: c.scopes,
        rateLimitTier: c.rateLimitTier,
        createdAt: c.createdAt,
        isActive: true,
      })),
      meta: {
        total: activeApiClients.length,
        organizationId: context.organizationId,
      },
    });
  },
});

export const POST = createApiHandler({
  requireAuth: true,
  async handler(request) {
    const body = await request.json();
    const { name, environment, scopes, rateLimitTier } = body;

    const generated = ApiKeyManager.generateCredentials({
      name: name || 'Custom API Client',
      environment: environment || 'live',
      scopes: scopes || ['directory.view'],
      rateLimitTier: rateLimitTier || 'API',
    });

    activeApiClients.push(generated);

    return Response.json({
      data: generated, // Returns clientSecret only once
    });
  },
});
