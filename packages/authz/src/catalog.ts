export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  moduleKey: string;
  category: string;
}

export const PERMISSION_CATALOG: Record<string, PermissionDefinition> = {
  // ── SYSTEM & USERS ──
  'system.users.view': {
    key: 'system.users.view',
    name: 'View Users',
    description: 'View user accounts within the organization',
    moduleKey: 'core',
    category: 'users',
  },
  'system.users.create': {
    key: 'system.users.create',
    name: 'Create Users',
    description: 'Create new user accounts and send invitations',
    moduleKey: 'core',
    category: 'users',
  },
  'system.users.update': {
    key: 'system.users.update',
    name: 'Update Users',
    description: 'Modify user profiles, departments, and metadata',
    moduleKey: 'core',
    category: 'users',
  },
  'system.users.manage_roles': {
    key: 'system.users.manage_roles',
    name: 'Manage User Roles',
    description: 'Assign or revoke roles from users',
    moduleKey: 'core',
    category: 'users',
  },

  // ── ORGANIZATIONS & SETTINGS ──
  'system.org.view': {
    key: 'system.org.view',
    name: 'View Organization Details',
    description: 'View organization profile, branches, and departments',
    moduleKey: 'core',
    category: 'organization',
  },
  'system.org.manage': {
    key: 'system.org.manage',
    name: 'Manage Organization',
    description: 'Update organization settings and branch hierarchy',
    moduleKey: 'core',
    category: 'organization',
  },

  // ── AUDIT ──
  'system.audit.view': {
    key: 'system.audit.view',
    name: 'View Audit Logs',
    description: 'Access the tamper-evident audit history',
    moduleKey: 'core',
    category: 'security',
  },
  'system.audit.verify': {
    key: 'system.audit.verify',
    name: 'Verify Audit Integrity',
    description: 'Re-verify cryptographic SHA-256 hash chains',
    moduleKey: 'core',
    category: 'security',
  },

  // ── EMAIL / SMTP SUBSYSTEM ──
  'system.email.settings_manage': {
    key: 'system.email.settings_manage',
    name: 'Manage Email / SMTP Settings',
    description: 'Configure outbound SMTP servers, credentials, and failover priority',
    moduleKey: 'core',
    category: 'email',
  },
  'system.email.templates_manage': {
    key: 'system.email.templates_manage',
    name: 'Manage Email Templates',
    description: 'Create, modify, and preview system email templates',
    moduleKey: 'core',
    category: 'email',
  },
  'system.email.logs_view': {
    key: 'system.email.logs_view',
    name: 'View Email Transmission Logs',
    description: 'Access delivery audit records and error diagnostics',
    moduleKey: 'core',
    category: 'email',
  },
  'system.email.logs_retry': {
    key: 'system.email.logs_retry',
    name: 'Retry Email Transmissions',
    description: 'Manually re-queue failed email delivery attempts',
    moduleKey: 'core',
    category: 'email',
  },

  // ── HR MODULE ──
  'hr.employees.view': {
    key: 'hr.employees.view',
    name: 'View Employees',
    description: 'View employee directory and employment details',
    moduleKey: 'hr',
    category: 'employees',
  },
  'hr.employees.manage': {
    key: 'hr.employees.manage',
    name: 'Manage Employees',
    description: 'Create and update employee records',
    moduleKey: 'hr',
    category: 'employees',
  },

  // ── FINANCE MODULE ──
  'finance.journals.view': {
    key: 'finance.journals.view',
    name: 'View Financial Journals',
    description: 'Access chart of accounts and journal ledgers',
    moduleKey: 'finance',
    category: 'accounting',
  },
  'finance.journals.post': {
    key: 'finance.journals.post',
    name: 'Post Journal Entries',
    description: 'Create and post balanced debit/credit transactions',
    moduleKey: 'finance',
    category: 'accounting',
  },
};
