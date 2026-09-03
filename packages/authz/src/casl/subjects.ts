/**
 * Centralized Typed Subjects for JAAGO HUB Authorization Engine (CASL)
 * Exhaustive domain entities covering HR, Finance, Attendance, Operations, Governance, and AI/MCP.
 */

export const SUBJECT_NAMES = [
  'all',               // Global wildcard subject
  // Core System & Governance
  'User',
  'Role',
  'Permission',
  'AuditLog',
  'ApiKey',
  'SystemSetting',
  'Integration',
  'Module',
  'McpTool',

  // Organization & Hierarchy
  'Organization',
  'Branch',
  'Department',
  'Designation',
  'PolicyDocument',

  // People & Culture (HR)
  'Employee',
  'Attendance',
  'Shift',
  'LeaveRequest',
  'LeaveBalance',
  'Holiday',
  'OnDutyRequest',
  'InsurancePolicy',

  // Payroll & Accounting
  'Payroll',
  'SalaryStructure',
  'Payslip',
  'JournalEntry',
  'AccountLedger',
  'Budget',

  // Performance & Appraisals
  'Appraisal',
  'AppraisalCycle',
  'KpiGoal',

  // Requests Central Hub
  'GeneralRequest',

  // Reports & Analytics
  'ReportAnalytics',

  // Announcements & Circulars
  'Announcement',

  // Infrastructure & Biotime Devices
  'GpsLocation',
  'EmailTemplate',
  'SmtpSetting',
  'BiotimeDevice',

  // Operations & Projects
  'Project',
  'Team',
  'Task',
  'Workflow',
  'Report',
  'StorageFile',
] as const;

export type AppSubjectType = typeof SUBJECT_NAMES[number];

/**
 * Subject can be either a type string (e.g. 'Employee') or a live domain object instance.
 */
export type AppSubject = AppSubjectType | Record<string, any>;
