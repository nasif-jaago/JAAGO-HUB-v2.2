export interface PermissionItem {
  id: string;
  key: string;
  name: string;
  description: string;
  moduleKey: string;
  category: string;
  actionType: 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'APPROVE' | 'EXPORT' | 'MANAGE' | 'CONFIG';
  scope: 'GLOBAL' | 'DEPARTMENT' | 'OWN' | 'SYSTEM';
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
    description: 'System-wide settings, user account provisioning, role assignment, GPS geofencing, and security policies.',
    permissions: [
      { id: 'p1', key: 'system.users.view', name: 'View Users', description: 'View user directory and account details', moduleKey: 'system_admin', category: 'Users', actionType: 'VIEW', scope: 'SYSTEM' },
      { id: 'p2', key: 'system.users.create', name: 'Create Users', description: 'Create user accounts and send email invitations', moduleKey: 'system_admin', category: 'Users', actionType: 'CREATE', scope: 'SYSTEM' },
      { id: 'p3', key: 'system.users.update', name: 'Update Users', description: 'Edit user accounts, profiles, and assigned roles', moduleKey: 'system_admin', category: 'Users', actionType: 'EDIT', scope: 'SYSTEM' },
      { id: 'p4', key: 'system.users.delete', name: 'Delete / Revoke Users', description: 'Hard delete user accounts or revoke login sessions', moduleKey: 'system_admin', category: 'Users', actionType: 'DELETE', scope: 'SYSTEM' },
      { id: 'p5', key: 'system.users.manage_roles', name: 'Manage RBAC Roles', description: 'Configure roles, grant permissions, and edit delegation matrix', moduleKey: 'system_admin', category: 'Security', actionType: 'MANAGE', scope: 'SYSTEM' },
      { id: 'p6', key: 'system.api_keys.manage', name: 'Manage API Keys & Webhooks', description: 'Generate and revoke system API credentials', moduleKey: 'system_admin', category: 'Security', actionType: 'CONFIG', scope: 'SYSTEM' },
      { id: 'p7', key: 'system.settings.manage', name: 'System Configuration', description: 'Modify global platform settings & integrations', moduleKey: 'system_admin', category: 'Settings', actionType: 'CONFIG', scope: 'SYSTEM' },
      { id: 'p8', key: 'system.gps.manage', name: 'Manage GPS & Geofence Sites', description: 'Configure office geo-coordinates and check-in radii', moduleKey: 'system_admin', category: 'Settings', actionType: 'CONFIG', scope: 'SYSTEM' },
      { id: 'p9', key: 'system.email.manage', name: 'Manage Email & SMTP Templates', description: 'Configure SMTP credentials and edit email templates', moduleKey: 'system_admin', category: 'Settings', actionType: 'CONFIG', scope: 'SYSTEM' },
    ],
  },
  {
    moduleKey: 'organization',
    moduleName: 'Organization & Hierarchy',
    iconName: 'Building2',
    description: 'Organizations, branches, departments, designations, projects, teams, and organizational policies.',
    permissions: [
      { id: 'p10', key: 'org.view', name: 'View Organization Structure', description: 'View organization profiles, branches, and departments', moduleKey: 'organization', category: 'Structure', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p11', key: 'org.manage', name: 'Manage Organizations', description: 'Create and update organization legal entities', moduleKey: 'organization', category: 'Structure', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p12', key: 'org.branches.manage', name: 'Manage Branches', description: 'Create, update, and archive branch locations', moduleKey: 'organization', category: 'Structure', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p13', key: 'org.departments.manage', name: 'Manage Departments', description: 'Create, rename, and manage department hierarchies', moduleKey: 'organization', category: 'Structure', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p14', key: 'org.designations.manage', name: 'Manage Designations', description: 'Create and configure organizational job titles', moduleKey: 'organization', category: 'Structure', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p15', key: 'org.projects.manage', name: 'Manage Projects & Grants', description: 'Create and configure development projects and grants', moduleKey: 'organization', category: 'Structure', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p16', key: 'org.teams.manage', name: 'Manage Teams', description: 'Create and manage cross-functional staff teams', moduleKey: 'organization', category: 'Structure', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p17', key: 'org.policies.manage', name: 'Manage Policies & Documents', description: 'Upload and publish official NGO compliance policies', moduleKey: 'organization', category: 'Compliance', actionType: 'CONFIG', scope: 'GLOBAL' },
    ],
  },
  {
    moduleKey: 'hr_employees',
    moduleName: 'People & Culture (Employees)',
    iconName: 'Users',
    description: 'Employee master data, profile management, comprehensive CSV import/export, and benefits.',
    permissions: [
      { id: 'p18', key: 'hr.employees.view_all', name: 'View All Employee Records', description: 'Access directory of all 746+ employee records', moduleKey: 'hr_employees', category: 'Employees', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p19', key: 'hr.employees.view_dept', name: 'View Department Employees', description: 'Access employee records only within assigned department', moduleKey: 'hr_employees', category: 'Employees', actionType: 'VIEW', scope: 'DEPARTMENT' },
      { id: 'p20', key: 'hr.employees.view_own', name: 'View Own Employee Profile', description: 'View own employee profile, documents, and personal details', moduleKey: 'hr_employees', category: 'Employees', actionType: 'VIEW', scope: 'OWN' },
      { id: 'p21', key: 'hr.employees.create', name: 'Create & Onboard Employee', description: 'Add new staff profiles across all 7 tabs', moduleKey: 'hr_employees', category: 'Employees', actionType: 'CREATE', scope: 'GLOBAL' },
      { id: 'p22', key: 'hr.employees.edit', name: 'Edit Employee Records', description: 'Modify employee personal, payroll, and work info', moduleKey: 'hr_employees', category: 'Employees', actionType: 'EDIT', scope: 'GLOBAL' },
      { id: 'p23', key: 'hr.employees.mass_update', name: 'Mass Update Employees', description: 'Perform bulk Odoo-style batch edits on employee fields', moduleKey: 'hr_employees', category: 'Operations', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p24', key: 'hr.employees.delete', name: 'Delete Employee Records', description: 'Hard delete or archive employee records', moduleKey: 'hr_employees', category: 'Operations', actionType: 'DELETE', scope: 'GLOBAL' },
      { id: 'p25', key: 'hr.employees.export', name: 'Export Employee CSV (88 Fields)', description: 'Export full comprehensive employee database', moduleKey: 'hr_employees', category: 'Data', actionType: 'EXPORT', scope: 'GLOBAL' },
      { id: 'p26', key: 'hr.employees.import', name: 'Bulk Import Employee CSV', description: 'Import and reconcile large employee spreadsheets', moduleKey: 'hr_employees', category: 'Data', actionType: 'CREATE', scope: 'GLOBAL' },
      { id: 'p27', key: 'hr.insurance.manage', name: 'Manage Insurance & Benefits', description: 'Configure health insurance plans, tiers, and claims', moduleKey: 'hr_employees', category: 'Benefits', actionType: 'MANAGE', scope: 'GLOBAL' },
    ],
  },
  {
    moduleKey: 'attendance',
    moduleName: 'Attendance, Shifts & Biometrics',
    iconName: 'Clock',
    description: 'Shift planning, biometric RFID device logs, daily clock-in/out records, and attendance grace policies.',
    permissions: [
      { id: 'p28', key: 'attendance.view_all', name: 'View All Attendance Logs', description: 'View organization-wide daily check-in/out records and reports', moduleKey: 'attendance', category: 'Attendance', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p29', key: 'attendance.view_dept', name: 'View Department Attendance', description: 'View team and department daily attendance punches', moduleKey: 'attendance', category: 'Attendance', actionType: 'VIEW', scope: 'DEPARTMENT' },
      { id: 'p30', key: 'attendance.view_own', name: 'View Own Attendance', description: 'View personal check-in/out history and timesheets', moduleKey: 'attendance', category: 'Attendance', actionType: 'VIEW', scope: 'OWN' },
      { id: 'p31', key: 'attendance.clock_in_out', name: 'Clock In / Out (Self)', description: 'Record daily attendance punch via Web Portal or GPS Geofence', moduleKey: 'attendance', category: 'Attendance', actionType: 'CREATE', scope: 'OWN' },
      { id: 'p32', key: 'attendance.manage_shifts', name: 'Manage Shift Rosters', description: 'Create and assign work shifts (HQ, School, Rotational)', moduleKey: 'attendance', category: 'Rosters', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p33', key: 'attendance.manual_entry', name: 'Manual Attendance Adjustment', description: 'Add or adjust attendance punches on behalf of staff', moduleKey: 'attendance', category: 'Operations', actionType: 'EDIT', scope: 'GLOBAL' },
      { id: 'p34', key: 'attendance.export', name: 'Export Attendance Reports', description: 'Download monthly biometric attendance spreadsheets', moduleKey: 'attendance', category: 'Reports', actionType: 'EXPORT', scope: 'GLOBAL' },
      { id: 'p35', key: 'attendance.biotime.manage', name: 'Biotime Device Center', description: 'Control biometric attendance machines and synchronization', moduleKey: 'attendance', category: 'Settings', actionType: 'CONFIG', scope: 'SYSTEM' },
    ],
  },
  {
    moduleKey: 'leave_timeoff',
    moduleName: 'Leave & Time-Off Management',
    iconName: 'CalendarCheck2',
    description: 'Leave balances, holiday schedules, casual/sick/earned leave requests, and multi-tier approval workflows.',
    permissions: [
      { id: 'p36', key: 'leave.apply_own', name: 'Apply for Own Leave', description: 'Submit self-service casual, sick, maternity, or earned leave', moduleKey: 'leave_timeoff', category: 'Requests', actionType: 'CREATE', scope: 'OWN' },
      { id: 'p37', key: 'leave.view_own', name: 'View Own Leave Balances', description: 'View personal leave balances, quotas, and history', moduleKey: 'leave_timeoff', category: 'Requests', actionType: 'VIEW', scope: 'OWN' },
      { id: 'p38', key: 'leave.view_all', name: 'View All Leave Requests', description: 'Access organization-wide leave calendar and balances', moduleKey: 'leave_timeoff', category: 'Visibility', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p39', key: 'leave.view_dept', name: 'View Department Leaves', description: 'View leave requests for team and department subordinates', moduleKey: 'leave_timeoff', category: 'Visibility', actionType: 'VIEW', scope: 'DEPARTMENT' },
      { id: 'p40', key: 'leave.approve_dept', name: 'Approve Department Leaves', description: 'Line manager approval/rejection for department members', moduleKey: 'leave_timeoff', category: 'Approvals', actionType: 'APPROVE', scope: 'DEPARTMENT' },
      { id: 'p41', key: 'leave.approve_all', name: 'Final HR Leave Approval', description: 'Final People & Culture authorization on any leave request', moduleKey: 'leave_timeoff', category: 'Approvals', actionType: 'APPROVE', scope: 'GLOBAL' },
      { id: 'p42', key: 'leave.manage_holidays', name: 'Manage Holiday Calendar', description: 'Configure national holidays and organizational off-days', moduleKey: 'leave_timeoff', category: 'Settings', actionType: 'CONFIG', scope: 'GLOBAL' },
      { id: 'p43', key: 'leave.balance_adjust', name: 'Adjust Leave Quotas & Balances', description: 'Manually credit/debit annual leave allocation balances', moduleKey: 'leave_timeoff', category: 'Settings', actionType: 'EDIT', scope: 'GLOBAL' },
      { id: 'p44', key: 'leave.export', name: 'Export Leave Reports', description: 'Export monthly leave balance and utilization spreadsheets', moduleKey: 'leave_timeoff', category: 'Reports', actionType: 'EXPORT', scope: 'GLOBAL' },
    ],
  },
  {
    moduleKey: 'on_duty',
    moduleName: 'On-Duty & Field Travel Requests',
    iconName: 'Briefcase',
    description: 'Official fieldwork, school travel, client meeting on-duty logging, and location validation.',
    permissions: [
      { id: 'p45', key: 'onduty.apply_own', name: 'Submit On-Duty Request', description: 'Submit personal fieldwork / official travel duty records', moduleKey: 'on_duty', category: 'Requests', actionType: 'CREATE', scope: 'OWN' },
      { id: 'p46', key: 'onduty.view_own', name: 'View Own Field Duty History', description: 'View personal field movements and travel status', moduleKey: 'on_duty', category: 'Requests', actionType: 'VIEW', scope: 'OWN' },
      { id: 'p47', key: 'onduty.view_all', name: 'View All On-Duty Records', description: 'View organization-wide field travel and on-duty logs', moduleKey: 'on_duty', category: 'Visibility', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p48', key: 'onduty.approve_dept', name: 'Approve Department On-Duty', description: 'Line manager approval for team field movements', moduleKey: 'on_duty', category: 'Approvals', actionType: 'APPROVE', scope: 'DEPARTMENT' },
      { id: 'p49', key: 'onduty.approve_all', name: 'Final HR On-Duty Authorization', description: 'Authorize and mark attendance as Official On-Duty', moduleKey: 'on_duty', category: 'Approvals', actionType: 'APPROVE', scope: 'GLOBAL' },
      { id: 'p50', key: 'onduty.export', name: 'Export Field Travel Logs', description: 'Download monthly field travel and on-duty audit reports', moduleKey: 'on_duty', category: 'Reports', actionType: 'EXPORT', scope: 'GLOBAL' },
    ],
  },
  {
    moduleKey: 'payroll_finance',
    moduleName: 'Payroll, Finance & Accounting',
    iconName: 'CreditCard',
    description: 'Salary disbursement, tax deductions, PF calculations, financial journals, and project budgeting.',
    permissions: [
      { id: 'p51', key: 'finance.journals.view', name: 'View Financial Journals', description: 'Access chart of accounts, ledgers, and general journals', moduleKey: 'payroll_finance', category: 'Finance', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p52', key: 'finance.journals.post', name: 'Post Journal Transactions', description: 'Create and post balanced debit/credit transactions', moduleKey: 'payroll_finance', category: 'Finance', actionType: 'CREATE', scope: 'GLOBAL' },
      { id: 'p53', key: 'finance.budget.manage', name: 'Manage Project Budgets', description: 'Allocate, adjust, and track project expenditure budgets', moduleKey: 'payroll_finance', category: 'Finance', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p54', key: 'payroll.view_all', name: 'View Organization Payroll', description: 'Access confidential salary and wage data for all staff', moduleKey: 'payroll_finance', category: 'Payroll', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p55', key: 'payroll.view_own', name: 'View Own Payslips', description: 'Download personal monthly salary slips and tax statements', moduleKey: 'payroll_finance', category: 'Payroll', actionType: 'VIEW', scope: 'OWN' },
      { id: 'p56', key: 'payroll.manage_structures', name: 'Configure Salary & Allowances', description: 'Set wage rates, tax slabs, bonus rules, and PF deductions', moduleKey: 'payroll_finance', category: 'Payroll', actionType: 'CONFIG', scope: 'GLOBAL' },
      { id: 'p57', key: 'payroll.process', name: 'Process Monthly Payroll', description: 'Lock attendance, calculate net salaries, and disburse', moduleKey: 'payroll_finance', category: 'Payroll', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p58', key: 'payroll.export', name: 'Export Bank Payroll Advice', description: 'Generate bank-ready salary disbursement CSV files', moduleKey: 'payroll_finance', category: 'Payroll', actionType: 'EXPORT', scope: 'GLOBAL' },
    ],
  },
  {
    moduleKey: 'appraisals',
    moduleName: 'Performance Appraisals & KPIs',
    iconName: 'Sparkles',
    description: 'Annual performance evaluations, KPI scorecards, self-reviews, and supervisor appraisals.',
    permissions: [
      { id: 'p59', key: 'appraisals.view_own', name: 'View Own KPIs & Appraisal', description: 'View assigned key performance indicators and appraisal goals', moduleKey: 'appraisals', category: 'Reviews', actionType: 'VIEW', scope: 'OWN' },
      { id: 'p60', key: 'appraisals.submit_own', name: 'Submit Self-Appraisal', description: 'Complete and submit self-evaluation review form', moduleKey: 'appraisals', category: 'Reviews', actionType: 'CREATE', scope: 'OWN' },
      { id: 'p61', key: 'appraisals.view_dept', name: 'View Department Appraisals', description: 'Review KPI submissions for department team members', moduleKey: 'appraisals', category: 'Reviews', actionType: 'VIEW', scope: 'DEPARTMENT' },
      { id: 'p62', key: 'appraisals.evaluate_dept', name: 'Conduct Manager Appraisal', description: 'Score subordinates, add feedback, and recommend increments', moduleKey: 'appraisals', category: 'Reviews', actionType: 'APPROVE', scope: 'DEPARTMENT' },
      { id: 'p63', key: 'appraisals.manage_cycles', name: 'Manage Appraisal Cycles & KPIs', description: 'Create appraisal rounds, templates, and rating matrices', moduleKey: 'appraisals', category: 'Settings', actionType: 'MANAGE', scope: 'GLOBAL' },
      { id: 'p64', key: 'appraisals.approve_all', name: 'Final HR Appraisal Calibration', description: 'Review organization-wide scores and finalize promotions', moduleKey: 'appraisals', category: 'Reviews', actionType: 'APPROVE', scope: 'GLOBAL' },
    ],
  },
  {
    moduleKey: 'requests_hub',
    moduleName: 'Requests & Approvals Central Hub',
    iconName: 'Send',
    description: 'Centralized helpdesk for staff requisitions, travel allowances, IT assets, and expense requests.',
    permissions: [
      { id: 'p65', key: 'requests.submit_own', name: 'Submit General Request', description: 'Create requisitions for equipment, travel, or HR letters', moduleKey: 'requests_hub', category: 'Requests', actionType: 'CREATE', scope: 'OWN' },
      { id: 'p66', key: 'requests.view_own', name: 'View Own Requests', description: 'Track progress and approval status of personal requisitions', moduleKey: 'requests_hub', category: 'Requests', actionType: 'VIEW', scope: 'OWN' },
      { id: 'p67', key: 'requests.view_dept', name: 'View Department Requests', description: 'Monitor pending requisitions from team subordinates', moduleKey: 'requests_hub', category: 'Requests', actionType: 'VIEW', scope: 'DEPARTMENT' },
      { id: 'p68', key: 'requests.approve_dept', name: 'Approve Department Requests', description: 'Authorize requisitions within delegated department budget', moduleKey: 'requests_hub', category: 'Approvals', actionType: 'APPROVE', scope: 'DEPARTMENT' },
      { id: 'p69', key: 'requests.approve_all', name: 'HR / Admin Universal Resolution', description: 'Final institutional sign-off and procurement dispatch', moduleKey: 'requests_hub', category: 'Approvals', actionType: 'APPROVE', scope: 'GLOBAL' },
    ],
  },
  {
    moduleKey: 'reports_analytics',
    moduleName: 'Reports & Executive Analytics',
    iconName: 'FileText',
    description: 'Cross-functional executive analytics, attendance trends, headcount reports, and financial insights.',
    permissions: [
      { id: 'p70', key: 'reports.headcount.view', name: 'View Headcount Analytics', description: 'Access branch, department, and gender diversity reports', moduleKey: 'reports_analytics', category: 'Analytics', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p71', key: 'reports.attendance.view', name: 'View Attendance Analytics', description: 'Inspect organization-wide punctuality and absence trends', moduleKey: 'reports_analytics', category: 'Analytics', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p72', key: 'reports.leave.view', name: 'View Leave Utilization Analytics', description: 'Analyze leave consumption rates and seasonal spikes', moduleKey: 'reports_analytics', category: 'Analytics', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p73', key: 'reports.finance.view', name: 'View Payroll & Financial Summaries', description: 'Review monthly payroll expenditure and grant allocation', moduleKey: 'reports_analytics', category: 'Analytics', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p74', key: 'reports.turnover.view', name: 'View Attrition & Retention Metrics', description: 'Track staff turnover rates and resignation analytics', moduleKey: 'reports_analytics', category: 'Analytics', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p75', key: 'reports.export', name: 'Export Executive Reports', description: 'Download executive summary PDF decks and Excel spreadsheets', moduleKey: 'reports_analytics', category: 'Reports', actionType: 'EXPORT', scope: 'GLOBAL' },
    ],
  },
  {
    moduleKey: 'announcements',
    moduleName: 'Announcements & Broadcasts',
    iconName: 'SlidersHorizontal',
    description: 'Institutional notices, leadership updates, urgent alerts, and internal news broadcasts.',
    permissions: [
      { id: 'p76', key: 'announcements.view', name: 'View Announcements', description: 'Read published organizational circulars and notices', moduleKey: 'announcements', category: 'Announcements', actionType: 'VIEW', scope: 'GLOBAL' },
      { id: 'p77', key: 'announcements.create', name: 'Publish Announcements', description: 'Draft and broadcast notices to all staff or selected branches', moduleKey: 'announcements', category: 'Announcements', actionType: 'CREATE', scope: 'GLOBAL' },
      { id: 'p78', key: 'announcements.manage', name: 'Manage & Archive Announcements', description: 'Pin, edit, unpublish, or delete organizational notices', moduleKey: 'announcements', category: 'Announcements', actionType: 'MANAGE', scope: 'GLOBAL' },
    ],
  },
  {
    moduleKey: 'audit_security',
    moduleName: 'Audit Trail & Compliance',
    iconName: 'ShieldCheck',
    description: 'Tamper-evident audit logs, SHA-256 cryptographic integrity verification, and security monitoring.',
    permissions: [
      { id: 'p79', key: 'system.audit.view', name: 'View Audit Logs', description: 'Review system events and user activity histories', moduleKey: 'audit_security', category: 'Audit', actionType: 'VIEW', scope: 'SYSTEM' },
      { id: 'p80', key: 'system.audit.verify', name: 'Verify Cryptographic Chains', description: 'Execute SHA-256 integrity checks against audit blocks', moduleKey: 'audit_security', category: 'Audit', actionType: 'MANAGE', scope: 'SYSTEM' },
      { id: 'p81', key: 'system.audit.export', name: 'Export Audit Evidence Packages', description: 'Download compliance audit logs for external regulators', moduleKey: 'audit_security', category: 'Audit', actionType: 'EXPORT', scope: 'SYSTEM' },
    ],
  },
];

export const INITIAL_ROLES: RoleItem[] = [
  {
    id: 'role-super-admin',
    key: 'super_admin',
    name: 'Super Administrator',
    description: 'Unrestricted master access to all platform modules, configuration, security, and databases.',
    color: '#8B5CF6',
    isSystem: true,
    userCount: 1,
    permissions: [
      '*', // Wildcard - all permissions granted
    ],
  },
  {
    id: 'role-admin',
    key: 'admin',
    name: 'Administrator / HR Lead',
    description: 'Comprehensive administrative control over HR, organization hierarchy, attendance, leaves, payroll, and settings.',
    color: '#EC4899',
    isSystem: true,
    userCount: 0,
    permissions: [
      'system.users.view',
      'system.users.create',
      'system.users.update',
      'system.users.manage_roles',
      'system.settings.manage',
      'system.gps.manage',
      'system.email.manage',
      'org.view',
      'org.manage',
      'org.branches.manage',
      'org.departments.manage',
      'org.designations.manage',
      'org.projects.manage',
      'org.teams.manage',
      'org.policies.manage',
      'hr.employees.view_all',
      'hr.employees.create',
      'hr.employees.edit',
      'hr.employees.mass_update',
      'hr.employees.export',
      'hr.employees.import',
      'hr.insurance.manage',
      'attendance.view_all',
      'attendance.manage_shifts',
      'attendance.manual_entry',
      'attendance.export',
      'attendance.biotime.manage',
      'leave.view_all',
      'leave.apply_own',
      'leave.approve_all',
      'leave.manage_holidays',
      'leave.balance_adjust',
      'leave.export',
      'onduty.view_all',
      'onduty.apply_own',
      'onduty.approve_all',
      'onduty.export',
      'payroll.view_all',
      'payroll.manage_structures',
      'payroll.process',
      'payroll.export',
      'appraisals.view_own',
      'appraisals.manage_cycles',
      'appraisals.approve_all',
      'requests.view_all',
      'requests.approve_all',
      'reports.headcount.view',
      'reports.attendance.view',
      'reports.leave.view',
      'reports.finance.view',
      'reports.turnover.view',
      'reports.export',
      'announcements.view',
      'announcements.create',
      'announcements.manage',
      'system.audit.view',
    ],
  },
  {
    id: 'role-executive-director',
    key: 'executive_director',
    name: 'Executive Director / Management',
    description: 'Strategic leadership with full organizational visibility, executive analytics, audit access, and top approvals.',
    color: '#6366F1',
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
      'appraisals.approve_all',
      'requests.approve_all',
      'reports.headcount.view',
      'reports.attendance.view',
      'reports.leave.view',
      'reports.finance.view',
      'reports.turnover.view',
      'reports.export',
      'announcements.view',
      'announcements.create',
      'system.audit.view',
      'system.audit.verify',
    ],
  },
  {
    id: 'role-dept-manager',
    key: 'dept_manager',
    name: 'Department Manager / Team Lead',
    description: 'Line managers responsible for team shift oversight, leave approvals, KPIs, and field movement sign-off.',
    color: '#10B981',
    isSystem: true,
    userCount: 0,
    permissions: [
      'org.view',
      'hr.employees.view_dept',
      'hr.employees.view_own',
      'attendance.view_dept',
      'attendance.view_own',
      'attendance.clock_in_out',
      'leave.view_dept',
      'leave.view_own',
      'leave.apply_own',
      'leave.approve_dept',
      'onduty.view_all',
      'onduty.view_own',
      'onduty.apply_own',
      'onduty.approve_dept',
      'appraisals.view_own',
      'appraisals.submit_own',
      'appraisals.view_dept',
      'appraisals.evaluate_dept',
      'requests.submit_own',
      'requests.view_own',
      'requests.view_dept',
      'requests.approve_dept',
      'announcements.view',
    ],
  },
  {
    id: 'role-finance-lead',
    key: 'finance_lead',
    name: 'Finance & Accounts Lead',
    description: 'Full accounting control, financial journal posting, salary disbursement, and project budgeting.',
    color: '#F97316',
    isSystem: true,
    userCount: 0,
    permissions: [
      'org.view',
      'finance.journals.view',
      'finance.journals.post',
      'finance.budget.manage',
      'payroll.view_all',
      'payroll.view_own',
      'payroll.manage_structures',
      'payroll.process',
      'payroll.export',
      'reports.finance.view',
      'reports.export',
      'attendance.view_own',
      'attendance.clock_in_out',
      'leave.apply_own',
      'leave.view_own',
      'onduty.apply_own',
      'announcements.view',
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
      'attendance.view_own',
      'attendance.clock_in_out',
      'attendance.manual_entry',
      'attendance.export',
      'leave.view_all',
      'leave.apply_own',
      'leave.view_own',
      'leave.approve_dept',
      'onduty.view_all',
      'onduty.apply_own',
      'onduty.view_own',
      'onduty.approve_dept',
      'onduty.export',
      'announcements.view',
      'announcements.create',
    ],
  },
  {
    id: 'role-employee-user',
    key: 'user',
    name: 'Employee / User',
    description: 'Standard employee self-service access for clock-in/out, leave requests, on-duty travel, appraisals, and profile view.',
    color: '#F59E0B',
    isSystem: true,
    userCount: 0,
    permissions: [
      'org.view',
      'hr.employees.view_own',
      'attendance.view_own',
      'attendance.clock_in_out',
      'leave.apply_own',
      'leave.view_own',
      'onduty.apply_own',
      'onduty.view_own',
      'payroll.view_own',
      'appraisals.view_own',
      'appraisals.submit_own',
      'requests.submit_own',
      'requests.view_own',
      'announcements.view',
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
      'reports.headcount.view',
      'reports.attendance.view',
      'reports.finance.view',
      'system.audit.view',
      'system.audit.verify',
      'system.audit.export',
      'announcements.view',
    ],
  },
  {
    id: 'role-cluster-head',
    key: 'cluster_head',
    name: 'Cluster Head',
    description: 'Supervises regional hub schools, teacher rosters, localized leave requests, and school operations.',
    color: '#14B8A6',
    isSystem: true,
    userCount: 0,
    permissions: [
      'org.view',
      'hr.employees.view_dept',
      'hr.employees.view_own',
      'attendance.view_dept',
      'attendance.view_own',
      'attendance.clock_in_out',
      'leave.view_dept',
      'leave.view_own',
      'leave.apply_own',
      'leave.approve_dept',
      'onduty.view_all',
      'onduty.view_own',
      'onduty.apply_own',
      'onduty.approve_dept',
      'appraisals.view_dept',
      'appraisals.evaluate_dept',
      'requests.view_dept',
      'requests.approve_dept',
      'reports.attendance.view',
      'announcements.view',
    ],
  },
];

// Normalize any raw role string to canonical RBAC key
export function normalizeRoleKey(raw: string | null | undefined): string {
  if (!raw) return 'user';
  const clean = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (clean === 'super_admin' || clean === 'superadmin' || clean === 'super') return 'super_admin';
  if (clean === 'admin' || clean === 'pnc_lead' || clean === 'hr_manager' || clean === 'hr_admin' || clean === 'coordinator') return 'admin';
  if (clean === 'executive_director' || clean === 'director' || clean === 'management') return 'executive_director';
  if (clean === 'dept_manager' || clean === 'manager' || clean === 'team_lead') return 'dept_manager';
  if (clean === 'finance_lead' || clean === 'finance' || clean === 'accounts_lead') return 'finance_lead';
  if (clean === 'pnc_officer' || clean === 'hr_officer') return 'pnc_officer';
  if (clean === 'auditor' || clean === 'compliance') return 'auditor';
  if (clean === 'cluster_head' || clean === 'cluster_lead') return 'cluster_head';
  if (clean === 'user' || clean === 'employee' || clean === 'staff' || clean === 'officer' || clean === 'general_staff' || clean === 'intern' || clean === 'volunteer') return 'user';
  return clean;
}

// Runtime store for customized roles (persisted in memory + localStorage / Supabase sync)
export let runtimeRoles: RoleItem[] = [...INITIAL_ROLES];

export function getRoles(): RoleItem[] {
  return runtimeRoles;
}

export function getRoleByNormalizedKey(rawKey: string): RoleItem | undefined {
  const norm = normalizeRoleKey(rawKey);
  return runtimeRoles.find((r) => r.key === norm || r.id === norm);
}

export function getPermissionsForRole(rawKey: string): string[] {
  const role = getRoleByNormalizedKey(rawKey);
  if (role) return role.permissions;
  const norm = normalizeRoleKey(rawKey);
  if (norm === 'super_admin') return ['*'];
  return ['org.view', 'attendance.view_own', 'attendance.clock_in_out', 'leave.apply_own', 'leave.view_own', 'onduty.apply_own', 'requests.submit_own', 'announcements.view'];
}

export function updateRolePermissions(roleKey: string, permissions: string[]): boolean {
  const norm = normalizeRoleKey(roleKey);
  const target = runtimeRoles.find((r) => r.key === norm || r.id === roleKey);
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

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC DEPARTMENT MODULE GENERATOR FOR RBAC & USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

export interface DepartmentConfigItem {
  id?: string | undefined;
  name: string;
  slug?: string | undefined;
  code?: string | undefined;
  icon?: string | undefined;
  description?: string | undefined;
  href?: string | undefined;
}

export const STANDARD_DEPARTMENTS_CONFIG: DepartmentConfigItem[] = [
  {
    name: 'Admin & Procurement',
    slug: 'admin_procurement',
    code: 'ADMIN-PROC',
    icon: 'Building2',
    description: 'Procurement requests, inventory logistics, vendor management, and administrative services.',
    href: '/workflows',
  },
  {
    name: 'Child Welfare',
    slug: 'child_welfare',
    code: 'CW',
    icon: 'Star',
    description: 'Child sponsorship tracking, student safeguarding, nutrition, and welfare case management.',
    href: 'https://jaagohub.jaago.com.bd/?view=child-welfare-v1',
  },
  {
    name: 'Digital & Creative (DKL)',
    slug: 'digital_creative',
    code: 'DKL',
    icon: 'TrendingUp',
    description: 'Digital school development, graphic branding, creative assets, and tech innovation.',
    href: '/workflows',
  },
  {
    name: "Founder's Office (FC)",
    slug: 'founders_office',
    code: 'FC',
    icon: 'FileText',
    description: 'Strategic governance, institutional partnerships, high-level directives, and executive briefings.',
    href: '/workflows',
  },
  {
    name: 'Fundraising & Grants',
    slug: 'fundraising_grants',
    code: 'FRG',
    icon: 'DollarSign',
    description: 'Donor proposals, grant tracking, fundraising campaigns, and CSR partnership management.',
    href: '/workflows',
  },
  {
    name: 'Impact Investment',
    slug: 'impact_investment',
    code: 'II',
    icon: 'Radio',
    description: 'Sustainable social enterprise projects, impact funding, and investment viability analysis.',
    href: '/workflows',
  },
  {
    name: 'Project Implementation',
    slug: 'project_implementation',
    code: 'PI',
    icon: 'ClipboardList',
    description: 'Field school operations, project site rollouts, activity tracking, and milestone delivery.',
    href: '/workflows',
  },
  {
    name: 'Programmes',
    slug: 'programmes',
    code: 'PROG',
    icon: 'Users',
    description: 'Nationwide education programs, community development, and teacher training curriculum.',
    href: '/workflows',
  },
  {
    name: 'Private Sector (PSE)',
    slug: 'private_sector',
    code: 'PSE',
    icon: 'Building2',
    description: 'Corporate engagements, private sector partnerships, and sustainable sponsorship programs.',
    href: '/workflows',
  },
  {
    name: 'Youth Development (YDF)',
    slug: 'youth_development',
    code: 'YDF',
    icon: 'HeartHandshake',
    description: 'Volunteer For Bangladesh (VBD) chapters, youth leadership, and civic empowerment events.',
    href: '/workflows',
  },
  {
    name: 'MEAL (Monitoring & Eval)',
    slug: 'meal_monitoring',
    code: 'MEAL',
    icon: 'BarChart2',
    description: 'Monitoring, evaluation, accountability, and learning metrics across all donor grants.',
    href: '/workflows',
  },
];

export function normalizeDeptSlug(name: string): string {
  if (!name) return 'general';
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

export function createDepartmentPermissionModule(dept: DepartmentConfigItem): PermissionModuleGroup {
  const slug = dept.slug || normalizeDeptSlug(dept.name);
  const modKey = `dept_${slug}`;
  const icon = dept.icon || 'Building2';

  return {
    moduleKey: modKey,
    moduleName: `Department: ${dept.name}`,
    iconName: icon,
    description: dept.description || `Departmental portal, operational requests, team oversight, and records for ${dept.name}.`,
    permissions: [
      {
        id: `perm-${slug}-view`,
        key: `dept.${slug}.view`,
        name: `View ${dept.name} Portal`,
        description: `Access and view ${dept.name} department dashboard, files, and staff directory`,
        moduleKey: modKey,
        category: 'Department Portal',
        actionType: 'VIEW',
        scope: 'DEPARTMENT',
      },
      {
        id: `perm-${slug}-manage`,
        key: `dept.${slug}.manage`,
        name: `Manage ${dept.name} Operations`,
        description: `Manage ${dept.name} functional units, team allocations, and operational tasks`,
        moduleKey: modKey,
        category: 'Operations',
        actionType: 'MANAGE',
        scope: 'DEPARTMENT',
      },
      {
        id: `perm-${slug}-requests`,
        key: `dept.${slug}.requests`,
        name: `${dept.name} Requisitions & Requests`,
        description: `Submit, review, and approve departmental requisitions and resource demands`,
        moduleKey: modKey,
        category: 'Requests',
        actionType: 'CREATE',
        scope: 'DEPARTMENT',
      },
      {
        id: `perm-${slug}-reports`,
        key: `dept.${slug}.reports`,
        name: `${dept.name} Reports & KPIs`,
        description: `Inspect monthly performance indicators, activity logs, and progress reports`,
        moduleKey: modKey,
        category: 'Reports',
        actionType: 'VIEW',
        scope: 'DEPARTMENT',
      },
    ],
  };
}

export function getDepartmentPermissionModules(customDepts?: Array<{ name: string; code?: string; description?: string }>): PermissionModuleGroup[] {
  const combinedMap = new Map<string, DepartmentConfigItem>();

  // 1. Add all standard departments
  STANDARD_DEPARTMENTS_CONFIG.forEach((d) => {
    const slug = d.slug || normalizeDeptSlug(d.name);
    combinedMap.set(slug, d);
  });

  // 2. Add custom or dynamically fetched departments from Supabase
  if (Array.isArray(customDepts)) {
    customDepts.forEach((cd) => {
      if (!cd.name) return;
      const slug = normalizeDeptSlug(cd.name);
      if (!combinedMap.has(slug)) {
        combinedMap.set(slug, {
          name: cd.name,
          slug,
          code: cd.code,
          description: cd.description,
          icon: 'Building2',
        });
      }
    });
  }

  return Array.from(combinedMap.values()).map(createDepartmentPermissionModule);
}

/**
 * Returns all System Modules combined with all Department Modules dynamically
 */
export function getAllPermissionModules(customDepts?: Array<{ name: string; code?: string; description?: string }>): PermissionModuleGroup[] {
  const deptModules = getDepartmentPermissionModules(customDepts);
  return [...PERMISSION_MODULES, ...deptModules];
}

