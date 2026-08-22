import { createApiHandler } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler({
  requireAuth: true,
  permission: 'system.users.view',
  async handler(_request, context) {
    const orgId = context.organizationId!;

    // Return scoped tenant users
    return Response.json({
      data: [
        {
          id: 'aaaa1111-aaaa-4aaa-aaaa-111111111111',
          organizationId: orgId,
          email: 'nasif.kamal@jaago.com.bd',
          fullName: 'Nasif Kamal',
          jobTitle: 'Coordinator',
          status: 'active',
          role: 'Coordinator',
        },
        {
          id: 'aaaa2222-aaaa-4aaa-aaaa-222222222222',
          organizationId: orgId,
          email: 'masoor.rahman@jaago.com.bd',
          fullName: 'Masoor Rahman',
          jobTitle: 'HR Manager',
          status: 'active',
          role: 'HR Manager',
        },
      ],
      meta: {
        total: 2,
        organizationId: orgId,
      },
    });
  },
});
