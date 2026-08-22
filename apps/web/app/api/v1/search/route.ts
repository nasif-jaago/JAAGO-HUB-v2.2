import { createApiHandler } from '@jaago/authz';
import { globalSearchEngine } from '@jaago/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Seed default searchable documents in search engine
globalSearchEngine.indexDocuments([
  {
    id: 'user-001',
    entityType: 'user',
    title: 'Nasif Kamal',
    subtitle: 'Founder & Executive Director',
    snippet: 'Executive Office, JAAGO Foundation Dhaka Head Office',
    url: '/dashboard',
    organizationId: '11111111-1111-4111-a111-111111111111',
  },
  {
    id: 'user-002',
    entityType: 'user',
    title: 'Habibur Rahman',
    subtitle: 'Principal, Rayer Bazar Free School',
    snippet: 'Education Program campus administration and staff directory',
    url: '/workflows',
    organizationId: '11111111-1111-4111-a111-111111111111',
  },
  {
    id: 'wf-001',
    entityType: 'workflow',
    title: 'Annual Leave Request (5 Days)',
    subtitle: 'Habibur Rahman • Education Program',
    snippet: 'Leave request currently in Tier 2 approval review',
    url: '/workflows',
    organizationId: '11111111-1111-4111-a111-111111111111',
  },
  {
    id: 'mod-001',
    entityType: 'module',
    title: 'Staff & Beneficiary Directory',
    subtitle: 'Core Foundation Module (v1.0.0)',
    snippet: 'Centralized directory for volunteers, staff, and campus coordinators',
    url: '/admin/modules',
    organizationId: '11111111-1111-4111-a111-111111111111',
  },
  {
    id: 'rep-001',
    entityType: 'report',
    title: 'Monthly Staff Attendance & Leave Audit',
    subtitle: 'HR & Personnel Reporting',
    snippet: 'Monthly summary of present days, leaves, and attendance metrics',
    url: '/reports',
    organizationId: '11111111-1111-4111-a111-111111111111',
  },
]);

export const GET = createApiHandler({
  requireAuth: true,
  async handler(request, context) {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';

    if (!context.session) {
      return Response.json({ data: [] });
    }

    const results = globalSearchEngine.search(query, context.session);

    return Response.json({
      data: results,
      meta: {
        total: results.length,
        query,
      },
    });
  },
});
