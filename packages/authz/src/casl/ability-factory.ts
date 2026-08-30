import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { AppAbility, UserAuthzContext, UserAbilityPayload } from './types';

/**
 * Builds and returns a pure CASL AppAbility instance derived from server-resolved context.
 * Single source of truth for authorization logic across API, UI, and MCP tools.
 */
export function createAppAbility(context: UserAuthzContext): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  const isSuper = Boolean(
    context.isSuperAdmin ||
    context.roles?.includes('super_admin') ||
    context.roles?.includes('super-admin') ||
    context.permissions?.includes('*')
  );

  // 1. Super Admin: Explicit full root capability
  if (isSuper) {
    can('manage', 'all');
    return build({
      detectSubjectType: (item) => {
        if (!item || typeof item === 'string') return item as any;
        return item.__typename || item.constructor?.name || 'all';
      },
    });
  }

  const permissions = new Set<string>(context.permissions || []);

  // Multi-tenant baseline: Enforce organization boundary
  if (context.organizationId) {
    can('read', 'Organization', { id: context.organizationId });
  }

  // 2. Organization & Structure
  if (permissions.has('org.view') || permissions.has('org.*')) {
    can('read', 'Organization');
    can('read', 'Branch');
    can('read', 'Department');
    can('read', 'Designation');
    can('read', 'PolicyDocument');
  }
  if (permissions.has('org.manage') || permissions.has('org.*')) {
    can('manage', 'Organization');
  }
  if (permissions.has('org.branches.manage')) {
    can('manage', 'Branch');
  }
  if (permissions.has('org.departments.manage')) {
    can('manage', 'Department');
  }
  if (permissions.has('org.designations.manage')) {
    can('manage', 'Designation');
  }
  if (permissions.has('org.policies.manage')) {
    can('manage', 'PolicyDocument');
  }

  // 3. People & Culture (HR Employees)
  if (permissions.has('hr.employees.view_all') || permissions.has('hr.*') || permissions.has('hr.view')) {
    can('read', 'Employee');
  } else if (permissions.has('hr.employees.view_dept') && context.departmentId) {
    can('read', 'Employee', { department_id: context.departmentId });
  }

  if (permissions.has('hr.employees.create') || permissions.has('hr.*') || permissions.has('hr.create')) {
    can('create', 'Employee');
  }
  if (permissions.has('hr.employees.edit') || permissions.has('hr.*') || permissions.has('hr.update')) {
    can('update', 'Employee');
  }
  if (permissions.has('hr.employees.delete') || permissions.has('hr.*') || permissions.has('hr.delete')) {
    can('delete', 'Employee');
  }
  if (permissions.has('hr.employees.mass_update') || permissions.has('hr.employees.manage')) {
    can('manage', 'Employee');
  }
  if (permissions.has('hr.employees.export')) {
    can('export', 'Employee');
  }
  if (permissions.has('hr.employees.import')) {
    can('import', 'Employee');
  }

  // 4. Attendance & Shifts
  if (permissions.has('attendance.view_all') || permissions.has('attendance.*')) {
    can('read', 'Attendance');
  }
  if (permissions.has('attendance.view_own')) {
    can('read', 'Attendance', { user_id: context.userId });
  }
  if (permissions.has('attendance.manage_shifts') || permissions.has('attendance.*')) {
    can('manage', 'Shift');
  }
  if (permissions.has('attendance.manual_entry')) {
    can('create', 'Attendance');
    can('adjust', 'Attendance');
  }
  if (permissions.has('attendance.export')) {
    can('export', 'Attendance');
  }

  // 5. Leave Management
  if (permissions.has('leave.apply_own') || permissions.has('leave.*')) {
    can('submit', 'LeaveRequest');
    can('read', 'LeaveRequest', { user_id: context.userId });
    can('cancel', 'LeaveRequest', { user_id: context.userId });
  }
  if (permissions.has('leave.view_all') || permissions.has('leave.*')) {
    can('read', 'LeaveRequest');
    can('read', 'LeaveBalance');
  }
  if (permissions.has('leave.approve_dept') && context.departmentId) {
    can('approve', 'LeaveRequest', { department_id: context.departmentId });
    can('reject', 'LeaveRequest', { department_id: context.departmentId });
  }
  if (permissions.has('leave.approve_all') || permissions.has('leave.manage') || permissions.has('leave.*')) {
    can('approve', 'LeaveRequest');
    can('reject', 'LeaveRequest');
  }
  if (permissions.has('leave.manage_holidays')) {
    can('manage', 'Holiday');
  }
  if (permissions.has('leave.balance_adjust')) {
    can('adjust', 'LeaveBalance');
  }

  // 6. On-Duty & Field Travel
  if (permissions.has('onduty.apply_own') || permissions.has('onduty.*')) {
    can('submit', 'OnDutyRequest');
    can('read', 'OnDutyRequest', { user_id: context.userId });
    can('cancel', 'OnDutyRequest', { user_id: context.userId });
  }
  if (permissions.has('onduty.view_all') || permissions.has('onduty.*')) {
    can('read', 'OnDutyRequest');
  }
  if (permissions.has('onduty.approve_dept') && context.departmentId) {
    can('approve', 'OnDutyRequest', { department_id: context.departmentId });
    can('reject', 'OnDutyRequest', { department_id: context.departmentId });
  }
  if (permissions.has('onduty.approve_all') || permissions.has('onduty.manage') || permissions.has('onduty.*')) {
    can('approve', 'OnDutyRequest');
    can('reject', 'OnDutyRequest');
  }
  if (permissions.has('onduty.export')) {
    can('export', 'OnDutyRequest');
  }

  // 7. Finance & Accounting
  if (permissions.has('finance.journals.view') || permissions.has('finance.*')) {
    can('read', 'JournalEntry');
    can('read', 'AccountLedger');
  }
  if (permissions.has('finance.journals.post') || permissions.has('finance.*')) {
    can('create', 'JournalEntry');
  }
  if (permissions.has('finance.budget.manage') || permissions.has('finance.*')) {
    can('manage', 'Budget');
  }
  if (permissions.has('payroll.view_all') || permissions.has('payroll.*')) {
    can('read', 'Payroll');
  }
  if (permissions.has('payroll.manage_structures') || permissions.has('payroll.*')) {
    can('manage', 'SalaryStructure');
    can('process', 'Payroll');
  }
  if (permissions.has('payroll.export')) {
    can('export', 'Payroll');
  }

  // 8. System & User Administration
  if (permissions.has('system.users.view') || permissions.has('system.*')) {
    can('read', 'User');
  }
  if (permissions.has('system.users.create') || permissions.has('system.*')) {
    can('create', 'User');
  }
  if (permissions.has('system.users.update') || permissions.has('system.*')) {
    can('update', 'User');
  }
  if (permissions.has('system.users.delete') || permissions.has('system.*')) {
    can('delete', 'User');
  }
  if (permissions.has('system.users.manage_roles') || permissions.has('system.*')) {
    can('manage', 'Role');
    can('manage', 'Permission');
  }
  if (permissions.has('system.api_keys.manage') || permissions.has('system.*')) {
    can('manage', 'ApiKey');
  }
  if (permissions.has('system.settings.manage') || permissions.has('system.*')) {
    can('manage', 'SystemSetting');
    can('manage', 'Integration');
    can('manage', 'Module');
  }

  // 9. Audit & Security
  if (permissions.has('system.audit.view') || permissions.has('audit.*') || permissions.has('system.*')) {
    can('read', 'AuditLog');
  }
  if (permissions.has('system.audit.verify') || permissions.has('system.audit.export')) {
    can('export', 'AuditLog');
    can('manage', 'AuditLog');
  }

  // 10. AI / MCP Tool execution
  can('read', 'McpTool');
  if (permissions.has('ai.tools.execute') || isSuper) {
    can('process', 'McpTool');
  }

  return build({
    detectSubjectType: (item: any) => {
      if (!item || typeof item === 'string') return item;
      return (
        item.__typename ||
        item.__type ||
        item.entityType ||
        (item.constructor && item.constructor.name !== 'Object' ? item.constructor.name : 'all')
      );
    },
  });
}

/**
 * Serializes user CASL ability into a transportable JSON payload for frontend hydration.
 */
export function serializeUserAbility(context: UserAuthzContext): UserAbilityPayload {
  const ability = createAppAbility(context);
  const rules = ability.rules.map((rule) => ({
    action: rule.action,
    subject: rule.subject as any,
    fields: rule.fields,
    conditions: rule.conditions,
    inverted: rule.inverted,
  }));

  return {
    userId: context.userId,
    organizationId: context.organizationId,
    roles: context.roles || [],
    isSuperAdmin: Boolean(context.isSuperAdmin || context.roles?.includes('super_admin')),
    rules,
  };
}
