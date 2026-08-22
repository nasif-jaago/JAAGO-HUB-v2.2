import { createApiHandler } from '@jaago/authz';
import { AiLogDiagnosticEngine } from '@jaago/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = createApiHandler({
  requireAuth: true,
  async handler(request) {
    const body = await request.json();
    const { eventId, errorCode, errorMessage, route, stack } = body;

    const report = AiLogDiagnosticEngine.analyzeErrorEvent({
      eventId,
      errorCode,
      errorMessage,
      route,
      stack,
    });

    return Response.json({
      data: report,
    });
  },
});
