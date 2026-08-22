import { createApiHandler } from '@jaago/authz';
import { SystemTelemetryService } from '@jaago/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler({
  requireAuth: true,
  async handler(_request, context) {
    const snapshot = SystemTelemetryService.getSnapshot();
    return Response.json({
      data: snapshot,
      meta: {
        timestamp: new Date().toISOString(),
        organizationId: context.organizationId,
      },
    });
  },
});
