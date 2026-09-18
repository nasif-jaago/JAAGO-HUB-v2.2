import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, boolean, index, unique } from 'drizzle-orm/pg-core';

export type McpClientType = 'claude_desktop' | 'claude_web' | 'chatgpt' | 'custom_sdk' | 'other';
export type McpCredentialKind = 'api_token' | 'connection_link';

export const mcpModules = pgTable(
  'mcp_modules',
  {
    moduleKey: varchar('module_key', { length: 50 }).primaryKey(),
    label: varchar('label', { length: 100 }).notNull(),
    description: text('description'),
    isExposed: boolean('is_exposed').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const mcpAgents = pgTable(
  'mcp_agents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: text('org_id'),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    agentType: varchar('agent_type', { length: 50 }).default('custom').notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    createdBy: varchar('created_by', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mcp_agents_org').on(table.orgId),
    index('idx_mcp_agents_status').on(table.status),
  ]
);

export const mcpAgentCredentials = pgTable(
  'mcp_agent_credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id').references(() => mcpAgents.id, { onDelete: 'cascade' }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    tokenPrefix: varchar('token_prefix', { length: 16 }).notNull(),
    audience: varchar('audience', { length: 100 }).default('https://hub.jaago.com.bd/api/mcp').notNull(),
    kind: varchar('kind', { length: 20 }).default('api_token').notNull(),
    clientType: varchar('client_type', { length: 50 }),
    label: varchar('label', { length: 100 }),
    ipAllowlist: jsonb('ip_allowlist'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: varchar('created_by', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mcp_cred_agent').on(table.agentId),
    index('idx_mcp_cred_hash').on(table.tokenHash),
    index('idx_mcp_cred_kind').on(table.kind),
  ]
);

export const mcpAgentScopes = pgTable(
  'mcp_agent_scopes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id').references(() => mcpAgents.id, { onDelete: 'cascade' }).notNull(),
    moduleKey: varchar('module_key', { length: 50 }).references(() => mcpModules.moduleKey, { onDelete: 'cascade' }).notNull(),
    permission: varchar('permission', { length: 20 }).notNull(), // 'read' | 'write' | 'delete'
    resourceFilter: jsonb('resource_filter'),
    grantedBy: varchar('granted_by', { length: 100 }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mcp_scopes_agent').on(table.agentId),
    unique('uq_agent_module_perm').on(table.agentId, table.moduleKey, table.permission),
  ]
);

export const mcpConnections = pgTable(
  'mcp_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id').references(() => mcpAgents.id, { onDelete: 'cascade' }).notNull(),
    clientName: varchar('client_name', { length: 100 }),
    clientVersion: varchar('client_version', { length: 50 }),
    protocolVersion: varchar('protocol_version', { length: 20 }).default('2026-07-28').notNull(),
    clientCapabilities: jsonb('client_capabilities').default({}),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    status: varchar('status', { length: 20 }).default('active').notNull(), // 'active' | 'idle' | 'closed'
    requestCount: integer('request_count').default(1).notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mcp_conn_agent').on(table.agentId),
    index('idx_mcp_conn_status').on(table.status, table.lastSeenAt),
  ]
);

export const mcpActivity = pgTable(
  'mcp_activity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agentId: uuid('agent_id').references(() => mcpAgents.id, { onDelete: 'set null' }),
    connectionId: uuid('connection_id').references(() => mcpConnections.id, { onDelete: 'set null' }),
    mcpMethod: varchar('mcp_method', { length: 50 }).notNull(),
    mcpName: varchar('mcp_name', { length: 100 }),
    moduleKey: varchar('module_key', { length: 50 }),
    permissionUsed: varchar('permission_used', { length: 20 }),
    outcome: varchar('outcome', { length: 20 }).notNull(), // 'ok' | 'denied' | 'error'
    denialReason: text('denial_reason'),
    durationMs: integer('duration_ms'),
    paramsDigest: jsonb('params_digest').default({}),
    resultSummary: jsonb('result_summary').default({}),
    traceId: varchar('trace_id', { length: 64 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_mcp_activity_agent').on(table.agentId, table.createdAt),
    index('idx_mcp_activity_time').on(table.createdAt),
  ]
);

export type McpModule = typeof mcpModules.$inferSelect;
export type McpAgent = typeof mcpAgents.$inferSelect;
export type McpAgentCredential = typeof mcpAgentCredentials.$inferSelect;
export type McpAgentScope = typeof mcpAgentScopes.$inferSelect;
export type McpConnection = typeof mcpConnections.$inferSelect;
export type McpActivity = typeof mcpActivity.$inferSelect;
