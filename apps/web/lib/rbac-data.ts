export interface PermissionItem {
  id: string;
  key: string;
  name: string;
  description: string;
  moduleKey: string;
  category: string;
}

export interface RoleItem {
  id: string;
  key: string;
  name: string;
  description: string;
  color: string;
  isSystem: boolean;
  userCount?: number;
  permissions: string[]; // array of permission keys
}

export interface PermissionModuleGroup {
  moduleKey: string;
  moduleName: string;
  iconName: string;
  description: string;
  permissions: PermissionItem[];
}

export const PERMISSION_MODULES: PermissionModuleGroup[] = [
  {
    moduleKey: 'system_admin',
    moduleName: 'User & System Administration',
    iconName: 'ShieldAlert',
    description: 'System-wide settings, user account provisioning, role assignment, and security policies.',
    permissions: [
      { id: 'p1', key: 'system.users.view', name: 'View Users', description: 'View user directory and account details', moduleKey: 'system_admin', category: 'Users' },
      { id: 'p2', key: 'system.users.create', name: 'Create Users', description: 'Create user accounts and send email invitations', moduleKey: 'system_admin', category: 'Users' },
      { id: 'p3', key: 'system.users.update', name: 'Update Users', description: 'Edit user accounts, profiles, and departments', moduleKey: 'system_admin', category: 'Users' },
      { id: 'p4', key: 'system.users.delete', name: 'Delete / Revoke Users', description: 'Hard delete user accounts or revoke sessions', moduleKey: 'system_admin', category: 'Users' },
      { id: 'p5', key: 'system.users.manage_roles', name: 'Manage RBAC Roles', description: 'Assign roles and modify RBAC permission matrix', moduleKey: 'system_admin', category: 'Security' },
      { id: 'p6', key: 'system.api_keys.manage', name: 'Manage API Keys & Webhooks', description: 'Generate and revoke system API credentials', moduleKey: 'system_admin', category: 'Security' },
      { id: 'p7', key: 'system.settings.manage', name: 'System Configuration', description: 'Modify global platform settings & integrations', moduleKey: 'system_admin', category: 'Settings' },
    ],
  },
  {
    moduleKey: 'organization',
    moduleName: 'Organization & Hierarchy',
    iconName: 'Building2',
    description: 'Organizations, branches, departments, designations, and organizational policies.',
    permissions: [
      { id: 'p8', key: 'org.view', name: 'View Organization Structure', description: 'View organization profiles, branches, and departments', moduleKey: 'organization', category: 'Structure' },
      { id: 'p9', key: 'org.manage', name: 'Manage Organizations', description: 'Create and update organization legal entities', moduleKey: 'organization', category: 'Structure' },
      { id: 'p10', key: 'org.branches.manage', name: 'Manage Branches', description: 'Create, update, and archive branch locations', moduleKey: 'organization', category: 'Structure' },
      { id: 'p11', key: 'org.departments.manage', name: 'Manage Departments', description: 'Create, rename, and manage department hierarchies', moduleKey: 'organization', category: 'Structure' },
      { id: 'p12', key: 'org.designations.manage', name: 'Manage Designations', description: 'Create and configure organizational job titles', moduleKey: 'organization', category: 'Structure' },
      { id: 'p13', key: 'org.policies.manage', name: 'Manage Policies & Documents', description: 'Upload and publish official NGO compliance policies', moduleKey: 'organization', category: 'Compliance' },
    ],
  },
  {
    moduleKey: 'hr_employees',
    moduleName: 'People & Culture (Employees)',
    iconName: 'Users',
    description: 'Employee master data, profile management, comprehensive CSV import/export, and audit logs.',
    permissions: [
      { id: 'p14', key: 'hr.employees.view_all', name: 'View All Employee Records', description: 'Access directory of all 746+ employee records', moduleKey: 'hr_employees', category: 'Employees' },
      { id: 'p15', key: 'hr.employees.view_dept', name: 'View Department Employees', description: 'Access employee records only within assigned department', moduleKey: 'hr_employees', category: 'Employees' },
      { id: 'p16', key: 'hr.employees.create', name: 'Create & Onboard Employee', description: 'Add new staff profiles across all 7 tabs', moduleKey: 'hr_employees', category: 'Employees' },
      { id: 'p17', key: 'hr.employees.edit', name: 'Edit Employee Records', description: 'Modify employee personal, payroll, and work info', moduleKey: 'hr_employees', category: 'Employees' },
      { id: 'p18', key: 'hr.employees.mass_update', name: 'Mass Update Employees', description: 'Perform bulk Odoo-style batch edits on employee fields', moduleKey: 'hr_employees', category: 'Operations' },
      { id: 'p19', key: 'hr.employees.delete', name: 'Delete Employee Records', description: 'Hard delete or archive employee records', moduleKey: 'hr_employees', category: 'Operations' },
      { id: 'p20', key: 'hr.employees.export', name: 'Export Employee CSV (88 Fields)', description: 'Export full comprehensive employee database', moduleKey: 'hr_employees', category: 'Data' },
      { id: 'p21', key: 'hr.employees.import', name: 'Bulk Import Employee CSV', description: 'Import and reconcile large employee spreadsheets', moduleKey: 'hr_employees', category: 'Data' },
    ],
  },
  {
    moduleKey: 'attendance',
    moduleName: 'Attendance, Shifts & Biometrics',
    iconName: 'Clock',
    description: 'Shift planning, biometric RFID device logs, daily clock-in/out records, and attendance grace policies.',
    permissions: [
      { id: 'p22', key: 'attendance.view_all', name: 'View All Attendance Logs', description: 'View organization-wide daily check-in/out records', moduleKey: 'attendance', category: 'Attendance' },
      { id: 'p23', key: 'attendance.view_own', name: 'View Own Attendance', description: 'View personal check-in/out history and timesheets', moduleKey: 'attendance', category: 'Attendance' },
      { id: 'p24', key: 'attendance.manage_shifts', name: 'Manage Shift Rosters', description: 'Create and assign work shifts (HQ, School, Custom)', moduleKey: 'attendance', category: 'Rosters' },
      { id: 'p25', key: 'attendance.manual_entry', name: 'Manual Attendance Entry', description: 'Add or adjust attendance punches on behalf of staff', moduleKey: 'attendance', category: 'Operations' },
      { id: 'p26', key: 'attendance.export', name: 'Export Attendance Reports', description: 'Download monthly biometric attendance spreadsheets', moduleKey: 'attendance', category: 'Reports' },
    ],
  },
  {
    moduleKey: 'leave_timeoff',
    moduleName: 'Leave & Time-Off Management',
    iconName: 'CalendarCheck2',
    description: 'Leave balances, holiday schedules, casual/sick/earned leave requests, and multi-tier approval workflows.',
    permissions: [
      { id: 'p27', key: 'leave.apply_own', name: 'Apply for Own Leave', description: 'Submit self-service casual, sick, or earned leave', moduleKey: 'leave_timeoff', category: 'Requests' },
      { id: 'p28', key: 'leave.view_all', name: 'View All Leave Requests', description: 'Access organization-wide leave calendar and balances', moduleKey: 'leave_timeoff', category: 'Visibility' },
      { id: 'p29', key: 'leave.approve_dept', name: 'Approve Department Leaves', description: 'Approve/Reject leaves for direct team/department members', moduleKey: 'leave_timeoff', category: 'Approvals' },
      { id: 'p30', key: 'leave.approve_all', name: 'Final HR Leave Approval', description: 'Give final People & Culture authorization on any leave', moduleKey: 'leave_timeoff', category: 'Approvals' },
      { id: 'p31', key: 'leave.manage_holidays', name: 'Manage Holiday Calendar', description: 'Configure national holidays and organizational off-days', moduleKey: 'leave_timeoff', category: 'Settings' },
      { id: 'p32', key: 'leave.balance_adjust', name: 'Adjust Leave Quotas & Balances', description: 'Manually credit/debit annual leave allocation balances', moduleKey: 'leave_timeoff', category: 'Settings' },
    ],
  },
  {
    moduleKey: 'on_duty',
    moduleName: 'On-Duty & Field Travel Requests',
    iconName: 'Briefcase',
    description: 'Official fieldwork, teacher training travel, client meeting on-duty logging, and location validation.',
    permissions: [
      { id: 'p33', key: 'onduty.apply_own', name: 'Submit On-Duty Request', description: 'Submit personal fieldwork / travel duty records', moduleKey: 'on_duty', category: 'Requests' },
      { id: 'p34', key: 'onduty.view_all', name: 'View All On-Duty Records', description: 'View organization-wide field travel and on-duty logs', moduleKey: 'on_duty', category: 'Visibility' },
      { id: 'p35', key: 'onduty.approve_dept', name: 'Approve Department On-Duty', description: 'Line manager approval for team field movements', moduleKey: 'on_duty', category: 'Approvals' },
      { id: 'p36', key: 'onduty.approve_all', name: 'Final HR On-Duty Authorization', description: 'Authorize and mark attendance as Official On-Duty', moduleKey: 'on_duty', category: 'Approvals' },
      { id: 'p37', key: 'onduty.export', name: 'Export Field Travel Logs', description: 'Download monthly field travel and on-duty audit reports', moduleKey: 'on_duty', category: 'Reports' },
    ],
  },
  {
    moduleKey: 'payroll_finance',
    moduleName: 'Payroll, Finance & Accounting',
    iconName: 'CreditCard',
    description: 'Salary disbursement, tax deductions, PF calculations, financial journals, and project budgeting.',
    permissions: [
      { id: 'p38', key: 'finance.journals.view', name: 'View Financial Journals', description: 'Access chart of accounts, ledgers, and general journals', moduleKey: 'payroll_finance', category: 'Finance' },
      { id: 'p39', key: 'finance.journals.post', name: 'Post Journal Transactions', description: 'Create and post balanced debit/credit transactions', moduleKey: 'payroll_finance', category: 'Finance' },
      { id: 'p40', key: 'finance.budget.manage', name: 'Manage Project Budgets', description: 'Allocate, adjust, and track project expenditure budgets', moduleKey: 'payroll_finance', category: 'Finance' },
      { id: 'p41', key: 'payroll.view_all', name: 'View Organization Payroll', description: 'Access confidential salary and wage data for all staff', moduleKey: 'payroll_finance', category: 'Payroll' },
      { id: 'p42', key: 'payroll.manage_structures', name: 'Configure Salary & Allowances', description: 'Set wage rates, bonus rules, and PF percentages', moduleKey: 'payroll_finance', category: 'Payroll' },
      { id: 'p43', key: 'payroll.export', name: 'Export Bank Payroll Advice', description: 'Generate bank-ready salary disbursement CSV files', moduleKey: 'payroll_finance', category: 'Payroll' },
    ],
  },
  {
    moduleKey: 'audit_security',
    moduleName: 'Audit Trail & Compliance',
    iconName: 'ShieldCheck',
    description: 'Tamper-evident audit logs, SHA-256 cryptographic integrity verification, and security monitoring.',
    permissions: [
      { id: 'p44', key: 'system.audit.view', name: 'View Audit Logs', description: 'Review system events and user activity histories', moduleKey: 'audit_security', category: 'Audit' },
      { id: 'p45', key: 'system.audit.verify', name: 'Verify Cryptographic Chains', description: 'Execute SHA-256 integrity checks against audit blocks', moduleKey: 'audit_security', category: 'Audit' },
      { id: 'p46', key: 'system.audit.export', name: 'Export Audit Evidence Packages', description: 'Download compliance audit logs for external regulators', moduleKey: 'audit_security', category: 'Audit' },
    ],
  },
];

export const INITIAL_ROLES: RoleItem[] = [
  {
    id: 'role-super-admin',
    key: 'super_admin',
    name: 'Super Administrator',
    description: 'Unrestricted master access to all platform modules, configuration, security, and databases.',
    color: '#F59E0B',
    isSystem: true,
    userCount: 1,
    permissions: [
      '*', // Wildcard - all permissions granted
    ],
  },
  {
    id: 'role-executive-director',
    key: 'executive_director',
    name: 'Executive Director / Management',
    description: 'Strategic leadership with full organizational visibility, audit access, and top-level approvals.',
    color: '#8B5CF6',
    isSystem: true,
    userCount: 0,
    permissions: [
      'system.users.view',
      'org.view',
      'hr.employees.view_all',
      'hr.employees.export',
      'attendance.view_all',
      'attendance.export',
      'leave.view_all',
      'leave.approve_all',
      'leave.apply_own',
      'onduty.view_all',
      'onduty.approve_all',
      'onduty.apply_own',
      'finance.journals.view',
      'finance.budget.manage',
      'payroll.view_all',
      'system.audit.view',
      'system.audit.verify',
    ],
  },
  {
    id: 'role-pnc-lead',
    key: 'pnc_lead',
    name: 'People & Culture (HR) Lead',
    description: 'Full administrative control over HR, employee lifecycle, leaves, on-duty, attendance, and policies.',
    color: '#EC4899',
    isSystem: true,
    userCount: 0,
    permissions: [
      'system.users.view',
      'system.users.create',
      'system.users.update',
      'org.view',
      'org.branches.manage',
      'org.departments.manage',
      'org.designations.manage',
      'org.policies.manage',
      'hr.employees.view_all',
      'hr.employees.create',
      'hr.employees.edit',
      'hr.employees.mass_update',
      'hr.employees.export',
      'hr.employees.import',
      'attendance.view_all',
      'attendance.manage_shifts',
      'attendance.manual_entry',
      'attendance.export',
      'leave.view_all',
      'leave.apply_own',
      'leave.approve_all',
      'leave.manage_holidays',
      'leave.balance_adjust',
      'onduty.view_all',
      'onduty.apply_own',
      'onduty.approve_all',
      'onduty.export',
      'payroll.view_all',
      'payroll.manage_structures',
      'payroll.export',
      'system.audit.view',
    ],
  },
  {
    id: 'role-pnc-officer',
    key: 'pnc_officer',
    name: 'People & Culture Officer',
    description: 'Operational HR staff managing employee records, attendance logs, and leave requests.',
    color: '#3B82F6',
    isSystem: true,
    userCount: 0,
    permissions: [
      'system.users.view',
      'org.view',
      'hr.employees.view_all',
      'hr.employees.create',
      'hr.employees.edit',
      'hr.employees.export',
      'attendance.view_all',
      'attendance.manual_entry',
      'attendance.export',
      'leave.view_all',
      'leave.apply_own',
      'leave.approve_dept',
      'onduty.view_all',
      'onduty.apply_own',
      'onduty.approve_dept',
      'onduty.export',
    ],
  },
  {
    id: 'role-dept-manager',
    key: 'dept_manager',
    name: 'Department Manager / Line Lead',
    description: 'Line managers responsible for team shift oversight, leave approvals, and field movement sign-off.',
    color: '#10B981',
    isSystem: true,
    userCount: 0,
    permissions: [
      'org.view',
      'hr.employees.view_dept',
      'attendance.view_all',
      'leave.view_all',
      'leave.apply_own',
      'leave.approve_dept',
      'onduty.view_all',
      'onduty.apply_own',
      'onduty.approve_dept',
    ],
  },
  {
    id: 'role-finance-lead',
    key: 'finance_lead',
    name: 'Finance & Accounts Lead',
    description: 'Full accounting control, financial journal posting, salary disbursement, and budget tracking.',
    color: '#F97316',
    isSystem: true,
    userCount: 0,
    permissions: [
      'org.view',
      'finance.journals.view',
      'finance.journals.post',
      'finance.budget.manage',
      'payroll.view_all',
      'payroll.manage_structures',
      'payroll.export',
      'system.audit.view',
      'leave.apply_own',
      'onduty.apply_own',
    ],
  },
  {
    id: 'role-general-staff',
    key: 'general_staff',
    name: 'General Staff / Teacher',
    description: 'Standard employee self-service access for applying for leaves, on-duty travel, and profile view.',
    color: '#64748B',
    isSystem: true,
    userCount: 0,
    permissions: [
      'org.view',
      'attendance.view_own',
      'leave.apply_own',
      'onduty.apply_own',
    ],
  },
  {
    id: 'role-auditor',
    key: 'auditor',
    name: 'Compliance & External Auditor',
    description: 'Read-only access to audit logs, cryptographic ledger verification, and compliance exports.',
    color: '#06B6D4',
    isSystem: true,
    userCount: 0,
    permissions: [
      'org.view',
      'hr.employees.view_all',
      'finance.journals.view',
      'payroll.view_all',
      'system.audit.view',
      'system.audit.verify',
      'system.audit.export',
    ],
  },
];

// Runtime store for customized roles (persisted in memory + localStorage / Supabase sync)
export let runtimeRoles: RoleItem[] = [...INITIAL_ROLES];

export function getRoles(): RoleItem[] {
  return runtimeRoles;
}

export function updateRolePermissions(roleKey: string, permissions: string[]): boolean {
  const target = runtimeRoles.find((r) => r.key === roleKey || r.id === roleKey);
  if (!target) return false;
  target.permissions = permissions;
  return true;
}

export function addCustomRole(newRole: RoleItem): void {
  runtimeRoles = [...runtimeRoles.filter((r) => r.key !== newRole.key), newRole];
}

export function deleteCustomRole(roleKey: string): boolean {
  const target = runtimeRoles.find((r) => r.key === roleKey || r.id === roleKey);
  if (!target || target.isSystem) return false; // cannot delete system roles
  runtimeRoles = runtimeRoles.filter((r) => r.key !== roleKey && r.id !== roleKey);
  return true;
}
