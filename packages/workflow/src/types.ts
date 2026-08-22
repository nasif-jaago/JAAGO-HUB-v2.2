export type WorkflowState =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export interface WorkflowTierRule {
  tierNumber: number;
  tierName: string;
  requiredRole?: string | undefined;
  requiredPermission?: string | undefined;
  autoApproveBelowAmount?: number | undefined;
}

export interface WorkflowInstanceData {
  id: string;
  definitionKey: string;
  title: string;
  entityType: string;
  entityId: string;
  requesterId: string;
  organizationId: string;
  currentState: WorkflowState;
  currentTier: number;
  totalTiers: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  history: WorkflowTransitionEvent[];
}

export interface WorkflowTransitionEvent {
  fromState: WorkflowState;
  toState: WorkflowState;
  actorId: string;
  tier?: number | undefined;
  action: string;
  comment?: string | undefined;
  timestamp: string;
}
