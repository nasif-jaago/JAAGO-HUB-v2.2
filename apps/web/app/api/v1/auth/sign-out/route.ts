import { createApiHandler } from '@jaago/authz';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createApiHandler({
  requireAuth: false,
  async handler(_request, context) {
    logger.info('AUTH', 'user.signout.success', {
      userId: context.session?.userId,
      organizationId: context.session?.organizationId,
    });

    return Response.json({
      success: true,
      message: 'Signed out successfully',
    });
  },
});
