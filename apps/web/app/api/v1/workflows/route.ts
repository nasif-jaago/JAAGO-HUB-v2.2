import { createApiHandler } from '@jaago/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Seed sample workflow instances for demonstration & interaction
const sampleInstances = [
  {
    id: 'wf-001',
    definitionKey: 'leave_request',
    title: 'Annual Leave Request (5 Days) - Habibur Rahman',
    entityType: 'leave_request',
    entityId: 'lv-902',
    requesterId: 'emp-001',
    organizationId: '11111111-1111-4111-a111-111111111111',
    currentState: 'pending_approval',
    currentTier: 2,
    totalTiers: 3,
    metadata: {
      requesterName: 'Habibur Rahman',
      department: 'Education Program (Rayer Bazar School)',
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      reason: 'Family event in Sylhet',
    },
    createdAt: new Date(Date.now() - 1000 * 3600 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 3600 * 4).toISOString(),
    history: [
      {
        fromState: 'draft',
        toState: 'pending_approval',
        actorId: 'emp-001',
        action: 'submit',
        timestamp: new Date(Date.now() - 1000 * 3600 * 24).toISOString(),
      },
      {
        fromState: 'pending_approval',
        toState: 'pending_approval',
        actorId: 'mgr-001',
        tier: 1,
        action: 'approve',
        comment: 'Recommended by Line Manager',
        timestamp: new Date(Date.now() - 1000 * 3600 * 4).toISOString(),
      },
    ],
  },
  {
    id: 'wf-002',
    definitionKey: 'purchase_requisition',
    title: 'School IT Equipment Requisition (10 Laptops)',
    entityType: 'purchase_requisition',
    entityId: 'pr-441',
    requesterId: 'emp-002',
    organizationId: '11111111-1111-4111-a111-111111111111',
    currentState: 'pending_approval',
    currentTier: 1,
    totalTiers: 3,
    metadata: {
      requesterName: 'Farhana Ahmed',
      department: 'Digital Literacy Hub',
      amount: 'BDT 450,000',
      vendor: 'Flora Telecom Ltd',
    },
    createdAt: new Date(Date.now() - 1000 * 3600 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 3600 * 12).toISOString(),
    history: [
      {
        fromState: 'draft',
        toState: 'pending_approval',
        actorId: 'emp-002',
        action: 'submit',
        timestamp: new Date(Date.now() - 1000 * 3600 * 12).toISOString(),
      },
    ],
  },
  {
    id: 'wf-003',
    definitionKey: 'travel_grant',
    title: 'Field Visit Grant (Bandarban Branch)',
    entityType: 'travel_grant',
    entityId: 'tg-105',
    requesterId: 'emp-003',
    organizationId: '11111111-1111-4111-a111-111111111111',
    currentState: 'approved',
    currentTier: 2,
    totalTiers: 2,
    metadata: {
      requesterName: 'Tanvir Hossain',
      department: 'Monitoring & Evaluation',
      amount: 'BDT 28,500',
    },
    createdAt: new Date(Date.now() - 1000 * 3600 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 3600 * 20).toISOString(),
    history: [
      {
        fromState: 'draft',
        toState: 'pending_approval',
        actorId: 'emp-003',
        action: 'submit',
        timestamp: new Date(Date.now() - 1000 * 3600 * 72).toISOString(),
      },
      {
        fromState: 'pending_approval',
        toState: 'approved',
        actorId: 'dir-001',
        tier: 2,
        action: 'approve',
        comment: 'Field survey approved by Director',
        timestamp: new Date(Date.now() - 1000 * 3600 * 20).toISOString(),
      },
    ],
  },
];

export const GET = createApiHandler({
  requireAuth: true,
  async handler(request, context) {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'ALL';

    const filtered = sampleInstances.filter((item) => {
      if (status === 'ALL') return true;
      return item.currentState.toUpperCase() === status.toUpperCase();
    });

    return Response.json({
      data: filtered,
      meta: {
        total: filtered.length,
        pendingApprovals: filtered.filter((i) => i.currentState === 'pending_approval').length,
        organizationId: context.organizationId,
      },
    });
  },
});

export const POST = createApiHandler({
  requireAuth: true,
  async handler(request, context) {
    const body = await request.json();
    const { action, instanceId, comment } = body;

    const instance = sampleInstances.find((i) => i.id === instanceId);
    if (!instance) {
      return Response.json({ error: { message: 'Workflow instance not found' } }, { status: 404 });
    }

    if (action === 'approve') {
      if (instance.currentTier >= instance.totalTiers) {
        instance.currentState = 'approved';
      } else {
        instance.currentTier += 1;
      }
      instance.history.push({
        fromState: 'pending_approval',
        toState: instance.currentState as any,
        actorId: context.session?.userId || 'usr-admin',
        tier: instance.currentTier,
        action: 'approve',
        comment: comment || 'Approved in portal',
        timestamp: new Date().toISOString(),
      });
      instance.updatedAt = new Date().toISOString();
    } else if (action === 'reject') {
      instance.currentState = 'rejected';
      instance.history.push({
        fromState: 'pending_approval',
        toState: 'rejected',
        actorId: context.session?.userId || 'usr-admin',
        tier: instance.currentTier,
        action: 'reject',
        comment: comment || 'Rejected',
        timestamp: new Date().toISOString(),
      });
      instance.updatedAt = new Date().toISOString();
    }

    return Response.json({ data: instance });
  },
});
