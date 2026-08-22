import { WorkflowInstanceData, WorkflowTransitionEvent } from './types';
import { logger } from '@jaago/logger';

export class WorkflowEngine {
  private instances = new Map<string, WorkflowInstanceData>();

  public createInstance(params: {
    id?: string;
    definitionKey: string;
    title: string;
    entityType: string;
    entityId: string;
    requesterId: string;
    organizationId: string;
    totalTiers?: number;
    metadata?: Record<string, unknown>;
  }): WorkflowInstanceData {
    const id = params.id || `wf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const instance: WorkflowInstanceData = {
      id,
      definitionKey: params.definitionKey,
      title: params.title,
      entityType: params.entityType,
      entityId: params.entityId,
      requesterId: params.requesterId,
      organizationId: params.organizationId,
      currentState: 'draft',
      currentTier: 1,
      totalTiers: params.totalTiers || 1,
      metadata: params.metadata || {},
      createdAt: now,
      updatedAt: now,
      history: [],
    };

    this.instances.set(id, instance);

    logger.info('AUDIT', 'workflow.instance_created', {
      organizationId: params.organizationId,
      metadata: { instanceId: id, definitionKey: params.definitionKey },
    });

    return instance;
  }

  public getInstance(id: string): WorkflowInstanceData | undefined {
    return this.instances.get(id);
  }

  public submitForApproval(instanceId: string, actorId: string): WorkflowInstanceData {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    if (instance.currentState !== 'draft') {
      throw new Error(`Cannot submit workflow from state ${instance.currentState}`);
    }

    const previousState = instance.currentState;
    instance.currentState = 'pending_approval';
    instance.currentTier = 1;
    instance.updatedAt = new Date().toISOString();

    const event: WorkflowTransitionEvent = {
      fromState: previousState,
      toState: 'pending_approval',
      actorId,
      action: 'submit',
      timestamp: instance.updatedAt,
    };
    instance.history.push(event);

    logger.info('AUDIT', 'workflow.submitted_for_approval', {
      organizationId: instance.organizationId,
      metadata: { instanceId, actorId },
    });

    return instance;
  }

  public approveStep(
    instanceId: string,
    approverId: string,
    comment?: string,
  ): WorkflowInstanceData {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    if (instance.currentState !== 'pending_approval') {
      throw new Error(`Cannot approve workflow in state ${instance.currentState}`);
    }

    const previousState = instance.currentState;
    const currentTier = instance.currentTier;
    const isFinalTier = currentTier >= instance.totalTiers;

    if (isFinalTier) {
      instance.currentState = 'approved';
    } else {
      instance.currentTier += 1;
    }

    instance.updatedAt = new Date().toISOString();

    const event: WorkflowTransitionEvent = {
      fromState: previousState,
      toState: instance.currentState,
      actorId: approverId,
      tier: currentTier,
      action: 'approve',
      comment,
      timestamp: instance.updatedAt,
    };
    instance.history.push(event);

    logger.info('AUDIT', 'workflow.step_approved', {
      organizationId: instance.organizationId,
      metadata: {
        instanceId,
        approverId,
        tier: currentTier,
        isFinalTier,
        newState: instance.currentState,
      },
    });

    return instance;
  }

  public rejectStep(
    instanceId: string,
    approverId: string,
    reason: string,
  ): WorkflowInstanceData {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    if (instance.currentState !== 'pending_approval') {
      throw new Error(`Cannot reject workflow in state ${instance.currentState}`);
    }

    const previousState = instance.currentState;
    instance.currentState = 'rejected';
    instance.updatedAt = new Date().toISOString();

    const event: WorkflowTransitionEvent = {
      fromState: previousState,
      toState: 'rejected',
      actorId: approverId,
      tier: instance.currentTier,
      action: 'reject',
      comment: reason,
      timestamp: instance.updatedAt,
    };
    instance.history.push(event);

    logger.info('AUDIT', 'workflow.step_rejected', {
      organizationId: instance.organizationId,
      metadata: { instanceId, approverId, reason },
    });

    return instance;
  }

  public cancelInstance(instanceId: string, actorId: string): WorkflowInstanceData {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance ${instanceId} not found`);
    }

    if (instance.currentState === 'completed' || instance.currentState === 'cancelled') {
      throw new Error(`Cannot cancel workflow in terminal state ${instance.currentState}`);
    }

    const previousState = instance.currentState;
    instance.currentState = 'cancelled';
    instance.updatedAt = new Date().toISOString();

    const event: WorkflowTransitionEvent = {
      fromState: previousState,
      toState: 'cancelled',
      actorId,
      action: 'cancel',
      timestamp: instance.updatedAt,
    };
    instance.history.push(event);

    return instance;
  }
}

export const globalWorkflowEngine = new WorkflowEngine();
