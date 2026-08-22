import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const workflowDefinitions = pgTable(
  'workflow_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    key: varchar('key', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    tiers: jsonb('tiers').notNull().default([]), // Array of tier definitions
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_wf_defs_org').on(table.organizationId),
    index('idx_wf_defs_key').on(table.key),
  ],
);

export const workflowInstances = pgTable(
  'workflow_instances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    definitionKey: varchar('definition_key', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    requesterId: uuid('requester_id').references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
    currentState: varchar('current_state', { length: 50 }).default('draft').notNull(),
    currentTier: integer('current_tier').default(1).notNull(),
    totalTiers: integer('total_tiers').default(1).notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_wf_instances_org').on(table.organizationId),
    index('idx_wf_instances_requester').on(table.requesterId),
    index('idx_wf_instances_state').on(table.currentState),
  ],
);

export const workflowApprovals = pgTable(
  'workflow_approvals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    instanceId: uuid('instance_id').references(() => workflowInstances.id, { onDelete: 'cascade' }),
    tier: integer('tier').notNull(),
    approverId: uuid('approver_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 50 }).notNull(), // 'approved' | 'rejected' | 'reassigned'
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_wf_approvals_instance').on(table.instanceId),
    index('idx_wf_approvals_approver').on(table.approverId),
  ],
);

export type WorkflowDefinition = typeof workflowDefinitions.$inferSelect;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type WorkflowApproval = typeof workflowApprovals.$inferSelect;
