import { MongoAbility } from '@casl/ability';
import { AppAction } from './actions';
import { AppSubject } from './subjects';

/**
 * Pure CASL MongoAbility typed with JAAGO Actions & Subjects
 */
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

/**
 * Server-resolved context for generating user ability
 */
export interface UserAuthzContext {
  userId: string;
  email: string;
  organizationId: string;
  companyId?: string | undefined;
  branchId?: string | undefined;
  departmentId?: string | undefined;
  roles: string[];
  permissions: string[];
  isSuperAdmin?: boolean | undefined;
}

/**
 * Serialized permission rule sent to web client for UX gating
 */
export interface SerializedAbilityRule {
  action: AppAction | AppAction[];
  subject: string | string[];
  fields?: string | string[] | undefined;
  conditions?: Record<string, any> | undefined;
  inverted?: boolean | undefined;
}

export interface UserAbilityPayload {
  userId: string;
  organizationId: string;
  roles: string[];
  isSuperAdmin: boolean;
  rules: SerializedAbilityRule[];
}
