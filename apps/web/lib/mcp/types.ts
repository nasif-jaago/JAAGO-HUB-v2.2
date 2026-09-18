import type { ZodSchema } from 'zod';
import type { MongoAbility } from '@casl/ability';

export type McpPermission = 'read' | 'write' | 'delete';

export type McpModuleKey =
  // Core Platform Modules
  | 'dashboard'
  | 'attendance'
  | 'leave'
  | 'on_duty'
  | 'requests'
  | 'hr'
  | 'payroll'
  | 'finance'
  | 'procurement'
  | 'organization'
  | 'documents'
  | 'settings'
  | 'contracts'
  | 'approvals'
  | 'reporting'
  // Operational Departments
  | 'dept_admin_procurement'
  | 'dept_finance_accounting'
  | 'dept_child_welfare'
  | 'dept_digital_creative'
  | 'dept_founders_office'
  | 'dept_fundraising_grants'
  | 'dept_impact_investment'
  | 'dept_project_implementation'
  | 'dept_programmes'
  | 'dept_private_sector'
  | 'dept_youth_development'
  | 'dept_meal_monitoring'
  | (string & {});

export type McpAbility = MongoAbility<[McpPermission | string, McpModuleKey | string]>;

export interface McpAgentRecord {
  id: string;
  orgId: string | null;
  name: string;
  description: string | null;
  agentType: string;
  status: 'active' | 'suspended' | 'revoked';
  createdBy?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface McpAgentScopeRecord {
  id: string;
  agentId: string;
  moduleKey: McpModuleKey;
  permission: McpPermission;
  resourceFilter?: Record<string, unknown> | null | undefined;
}

export interface McpContext {
  agent: McpAgentRecord;
  credentialId: string;
  scopes: McpAgentScopeRecord[];
  ability: McpAbility;
  traceId: string;
  clientName?: string | undefined;
  clientVersion?: string | undefined;
  protocolVersion: string;
  ipAddress?: string | undefined;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  moduleKey: McpModuleKey;
  permission: McpPermission;
  inputSchema: ZodSchema<any>;
  parametersDescription?: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (input: any, ctx: McpContext) => Promise<Record<string, unknown>>;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  moduleKey: McpModuleKey;
  mimeType?: string;
  handler: (ctx: McpContext) => Promise<{ text?: string; json?: Record<string, unknown> }>;
}
