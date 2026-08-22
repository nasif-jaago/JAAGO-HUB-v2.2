import { createApiHandler } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler({
  requireAuth: true,
  async handler(_request, context) {
    const session = context.session!;

    return Response.json({
      user: {
        id: session.userId,
        email: session.email,
        organizationId: session.organizationId,
        roles: session.roles,
        permissions: session.permissions,
        isSuperAdmin: session.isSuperAdmin,
        mfaVerified: session.mfaVerified,
      },
    });
  },
});
