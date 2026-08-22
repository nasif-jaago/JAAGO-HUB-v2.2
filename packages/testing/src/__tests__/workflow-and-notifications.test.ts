import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WorkflowEngine } from '@jaago/workflow';
import {
  NotificationEngine,
  NotificationFloodControl,
  renderWorkflowApprovalEmail,
} from '@jaago/notifications';

describe('Multi-Tier State-Machine Workflow & Notifications Suite', () => {
  it('progresses workflow through multi-tier approval states to approved', () => {
    const engine = new WorkflowEngine();
    const instance = engine.createInstance({
      definitionKey: 'leave_request',
      title: 'Annual Leave - Nasif Kamal',
      entityType: 'leave_request',
      entityId: 'lv-101',
      requesterId: 'emp-001',
      organizationId: 'org-dhaka-01',
      totalTiers: 2,
    });

    assert.equal(instance.currentState, 'draft');
    assert.equal(instance.currentTier, 1);

    // 1. Submit for approval
    const submitted = engine.submitForApproval(instance.id, 'emp-001');
    assert.equal(submitted.currentState, 'pending_approval');
    assert.equal(submitted.currentTier, 1);

    // 2. Tier 1 Approval (Line Manager)
    const tier1Approved = engine.approveStep(instance.id, 'mgr-001', 'Recommended');
    assert.equal(tier1Approved.currentState, 'pending_approval');
    assert.equal(tier1Approved.currentTier, 2);

    // 3. Tier 2 Approval (Department Head - Final Tier)
    const tier2Approved = engine.approveStep(instance.id, 'dir-001', 'Approved by Director');
    assert.equal(tier2Approved.currentState, 'approved');
    assert.equal(tier2Approved.history.length, 3);
  });

  it('transitions workflow to rejected state when approver denies request', () => {
    const engine = new WorkflowEngine();
    const instance = engine.createInstance({
      definitionKey: 'purchase_requisition',
      title: 'Office Projector Purchase',
      entityType: 'purchase_requisition',
      entityId: 'pr-88',
      requesterId: 'emp-002',
      organizationId: 'org-dhaka-01',
      totalTiers: 2,
    });

    engine.submitForApproval(instance.id, 'emp-002');
    const rejected = engine.rejectStep(instance.id, 'mgr-001', 'Budget cap exceeded');

    assert.equal(rejected.currentState, 'rejected');
    assert.equal(rejected.history[1]?.comment, 'Budget cap exceeded');
  });

  it('rejects invalid state transitions (e.g. approving a draft)', () => {
    const engine = new WorkflowEngine();
    const instance = engine.createInstance({
      definitionKey: 'travel_grant',
      title: 'Chittagong School Visit',
      entityType: 'travel_grant',
      entityId: 'tg-01',
      requesterId: 'emp-003',
      organizationId: 'org-dhaka-01',
    });

    assert.throws(
      () => engine.approveStep(instance.id, 'mgr-001'),
      /Cannot approve workflow in state draft/,
    );
  });

  it('throttles notification spam using flood control', () => {
    const floodControl = new NotificationFloodControl({ maxPerMinute: 3 });
    const userId = 'user-test-flood';

    assert.equal(floodControl.shouldAllow(userId), true);
    assert.equal(floodControl.shouldAllow(userId), true);
    assert.equal(floodControl.shouldAllow(userId), true);

    // 4th notification within same minute must be throttled
    assert.equal(floodControl.shouldAllow(userId), false);
  });

  it('dispatches in-app notifications and renders branded HTML email template', async () => {
    const notifEngine = new NotificationEngine();

    const result = await notifEngine.dispatch({
      userId: 'usr-recipient-01',
      organizationId: 'org-root',
      title: 'Tier 1 Approval Required',
      message: 'Purchase Requisition PR-441 is waiting for your decision.',
      category: 'approvals',
      channels: ['in_app', 'email'],
      emailTo: 'approver@jaago.com.bd',
    });

    assert.equal(result.deliveredInApp, true);
    assert.equal(result.deliveredEmail, true);

    const userNotifs = notifEngine.getNotificationsForUser('usr-recipient-01');
    assert.equal(userNotifs.length, 1);
    assert.equal(userNotifs[0]?.isRead, false);

    // Test Mark as Read
    notifEngine.markAsRead(userNotifs[0]!.id, 'usr-recipient-01');
    assert.equal(userNotifs[0]?.isRead, true);

    // Test Email Template HTML
    const email = renderWorkflowApprovalEmail({
      requesterName: 'Farhana Ahmed',
      workflowTitle: 'School IT Equipment Requisition',
      tierNumber: 1,
      actionUrl: 'http://localhost:3000/workflows',
    });

    assert.ok(email.subject.includes('Approval Required'));
    assert.ok(email.html.includes('JAAGO HUB v2.2'));
    assert.ok(email.html.includes('Tier 1 Approval Pending'));
    assert.ok(email.html.includes('Farhana Ahmed'));
  });
});
