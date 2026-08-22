import { createApiHandler } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler({
  requireAuth: true,
  permission: 'system.org.view',
  async handler(_request, context) {
    const orgId = context.organizationId!;

    return Response.json({
      data: {
        id: orgId,
        key: 'jaago-foundation',
        name: 'JAAGO Foundation Trust',
        code: 'JFG-HQ',
        timezone: 'Asia/Dhaka',
        currency: 'BDT',
        isActive: true,
      },
    });
  },
});
