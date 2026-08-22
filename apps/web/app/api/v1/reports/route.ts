import { createApiHandler } from '@jaago/authz';
import { ReportingEngine } from '@jaago/reporting';
import { ExportEngine } from '@jaago/importexport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = createApiHandler({
  requireAuth: true,
  async handler(_request, context) {
    const definitions = ReportingEngine.listDefinitions();
    return Response.json({
      data: definitions,
      meta: {
        total: definitions.length,
        organizationId: context.organizationId,
      },
    });
  },
});

export const POST = createApiHandler({
  requireAuth: true,
  async handler(request, context) {
    const body = await request.json();
    const { definitionKey, filters } = body;

    const reportResult = await ReportingEngine.executeReport({
      definitionKey,
      filters,
      organizationId: context.organizationId || '11111111-1111-4111-a111-111111111111',
    });

    // Generate async export with 15-minute signed URL
    const exportResult = await ExportEngine.createAsyncExport({
      entityType: definitionKey,
      format: 'csv',
      data: reportResult.rows,
      columns: reportResult.definition.columns,
      requestedBy: context.session?.userId || 'usr-admin',
      organizationId: context.organizationId || '11111111-1111-4111-a111-111111111111',
    });

    return Response.json({
      data: {
        ...reportResult,
        export: exportResult,
      },
    });
  },
});
