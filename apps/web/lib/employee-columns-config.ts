import type { FullEmployeeProfile } from '@/components/pnc/employee-profile-detail';

export interface ColumnCategory {
  id: string;
  name: string;
  columns: EmployeeColumnConfig[];
}

export interface EmployeeColumnConfig {
  key: keyof FullEmployeeProfile;
  label: string;
  category: string;
  defaultVisible?: boolean;
  align?: 'left' | 'center' | 'right';
  minWidth?: string;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'badge';
}

export const ALL_EMPLOYEE_COLUMNS: EmployeeColumnConfig[] = [
  // ── Work Information ──
  { key: 'name', label: 'Employee', category: 'Work Information', defaultVisible: true, minWidth: '220px' },
  { key: 'workingSchedule', label: 'Working Schedule', category: 'Work Information', defaultVisible: true, minWidth: '180px' },
  { key: 'department', label: 'Department', category: 'Work Information', defaultVisible: true, minWidth: '160px' },
  { key: 'designation', label: 'Designation', category: 'Work Information', defaultVisible: true, minWidth: '150px' },
  { key: 'organization', label: 'Organization', category: 'Work Information', defaultVisible: true, minWidth: '160px' },
  { key: 'branch', label: 'Branch / Campus', category: 'Work Information', defaultVisible: false, minWidth: '150px' },
  { key: 'project', label: 'Project', category: 'Work Information', defaultVisible: false, minWidth: '140px' },
  { key: 'team', label: 'Team / Squad', category: 'Work Information', defaultVisible: false, minWidth: '140px' },
  { key: 'supervisor', label: 'Supervisor', category: 'Work Information', defaultVisible: false, minWidth: '150px' },
  { key: 'secondarySupervisor', label: 'Secondary Supervisor', category: 'Work Information', defaultVisible: false, minWidth: '150px' },
  { key: 'workLocation', label: 'Work Location', category: 'Work Information', defaultVisible: false, minWidth: '140px' },
  { key: 'workEmail', label: 'Work Email', category: 'Work Information', defaultVisible: false, minWidth: '180px' },
  { key: 'workMobile', label: 'Work Mobile', category: 'Work Information', defaultVisible: false, minWidth: '130px' },
  { key: 'remark', label: 'Work Remark', category: 'Work Information', defaultVisible: false, minWidth: '160px' },

  // ── Personal Information ──
  { key: 'nickName', label: 'Nick Name', category: 'Personal Information', defaultVisible: false, minWidth: '120px' },
  { key: 'nid', label: 'National ID (NID)', category: 'Personal Information', defaultVisible: false, minWidth: '150px' },
  { key: 'passportNo', label: 'Passport No', category: 'Personal Information', defaultVisible: false, minWidth: '130px' },
  { key: 'birthday', label: 'Date of Birth', category: 'Personal Information', defaultVisible: false, minWidth: '120px', type: 'date' },
  { key: 'gender', label: 'Gender', category: 'Personal Information', defaultVisible: false, minWidth: '90px' },
  { key: 'bloodGroup', label: 'Blood Group', category: 'Personal Information', defaultVisible: false, minWidth: '100px' },
  { key: 'religion', label: 'Religion', category: 'Personal Information', defaultVisible: false, minWidth: '100px' },
  { key: 'maritalStatus', label: 'Marital Status', category: 'Personal Information', defaultVisible: false, minWidth: '110px' },
  { key: 'nationality', label: 'Nationality', category: 'Personal Information', defaultVisible: false, minWidth: '110px' },
  { key: 'personalEmail', label: 'Personal Email', category: 'Personal Information', defaultVisible: false, minWidth: '180px' },
  { key: 'personalPhone', label: 'Personal Phone', category: 'Personal Information', defaultVisible: false, minWidth: '130px' },
  { key: 'homeAddress', label: 'Home Address', category: 'Personal Information', defaultVisible: false, minWidth: '200px' },
  { key: 'emergencyContactName', label: 'Emergency Contact', category: 'Personal Information', defaultVisible: false, minWidth: '150px' },
  { key: 'emergencyPhone', label: 'Emergency Phone', category: 'Personal Information', defaultVisible: false, minWidth: '130px' },
  { key: 'dependentChildren', label: 'Children Count', category: 'Personal Information', defaultVisible: false, minWidth: '110px', type: 'number' },
  { key: 'bankName', label: 'Bank Name', category: 'Personal Information', defaultVisible: false, minWidth: '140px' },
  { key: 'bankAccountNumber', label: 'Bank Account No', category: 'Personal Information', defaultVisible: false, minWidth: '150px' },

  // ── Payroll & Compensation ──
  { key: 'joiningDate', label: 'Joining Date', category: 'Payroll & Compensation', defaultVisible: true, minWidth: '120px', type: 'date' },
  { key: 'contractEndDate', label: 'Contract End Date', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '130px', type: 'date' },
  { key: 'wageType', label: 'Wage Type', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '100px' },
  { key: 'wage', label: 'Gross Salary', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px', type: 'number' },
  { key: 'salaryJulDec', label: 'Salary Jul-Dec', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px', type: 'number' },
  { key: 'salaryJanJun', label: 'Salary Jan-Jun', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px', type: 'number' },
  { key: 'currency', label: 'Currency', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '90px' },
  { key: 'monthlyTotalAllowance', label: 'Monthly Allowance', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '130px' },
  { key: 'bonusEligibility', label: 'Bonus Eligibility', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px' },
  { key: 'pfApplies', label: 'PF Applies', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '100px' },
  { key: 'pfRate', label: 'PF Rate (%)', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '100px', type: 'number' },
  { key: 'noTaxDeduction', label: 'Tax Exempt', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '100px', type: 'boolean' },
  { key: 'sixMonthsCompletionStatus', label: '6 Months Completion', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '140px' },
  { key: 'probationaryStatus', label: 'Probation Status', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px' },
  { key: 'contractType', label: 'Contract Type', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '110px' },
  { key: 'regularSalary', label: 'Regular Salary', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px', type: 'number' },
  { key: 'extraHours', label: 'Extra Hours', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '100px', type: 'number' },
  { key: 'extraPayment', label: 'Extra Payment', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '110px', type: 'number' },
  { key: 'temporarySalary', label: 'Temporary Salary', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px', type: 'number' },
  { key: 'totalCurrentSalary', label: 'Total Net Salary', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px', type: 'number' },
  { key: 'calculationValue', label: 'Calculation Value', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px' },
  { key: 'adjustmentStartDate', label: 'Adj Start Date', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px', type: 'date' },
  { key: 'adjustmentEndDate', label: 'Adj End Date', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px', type: 'date' },
  { key: 'assignedTeacherStaff', label: 'Teacher / Staff', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '120px' },
  { key: 'payrollRemark', label: 'Payroll Remark', category: 'Payroll & Compensation', defaultVisible: false, minWidth: '150px' },

  // ── Insurance ──
  { key: 'insuranceStatus', label: 'Insurance Status', category: 'Insurance', defaultVisible: false, minWidth: '120px' },
  { key: 'insuranceCoverageCategory', label: 'Insurance Category', category: 'Insurance', defaultVisible: false, minWidth: '180px' },
  { key: 'insuranceMonthlyPremium', label: 'Monthly Premium', category: 'Insurance', defaultVisible: false, minWidth: '120px', type: 'number' },
  { key: 'employeeHealthInsuranceId', label: 'Health Insurance ID', category: 'Insurance', defaultVisible: false, minWidth: '150px' },
  { key: 'spouseName', label: 'Spouse Name', category: 'Insurance', defaultVisible: false, minWidth: '130px' },
  { key: 'spouseHealthInsuranceId', label: 'Spouse Insurance ID', category: 'Insurance', defaultVisible: false, minWidth: '150px' },
  { key: 'child1Name', label: 'Child 1 Name', category: 'Insurance', defaultVisible: false, minWidth: '120px' },
  { key: 'child1HealthInsuranceId', label: 'Child 1 Insurance ID', category: 'Insurance', defaultVisible: false, minWidth: '150px' },
  { key: 'child2Name', label: 'Child 2 Name', category: 'Insurance', defaultVisible: false, minWidth: '120px' },
  { key: 'child2HealthInsuranceId', label: 'Child 2 Insurance ID', category: 'Insurance', defaultVisible: false, minWidth: '150px' },
  { key: 'child3Name', label: 'Child 3 Name', category: 'Insurance', defaultVisible: false, minWidth: '120px' },
  { key: 'child3HealthInsuranceId', label: 'Child 3 Insurance ID', category: 'Insurance', defaultVisible: false, minWidth: '150px' },

  // ── DSP Program ──
  { key: 'employeeType', label: 'Staff Type', category: 'DSP Program', defaultVisible: false, minWidth: '110px' },
  { key: 'officeDays', label: 'Office Days', category: 'DSP Program', defaultVisible: false, minWidth: '140px' },
  { key: 'officeHours', label: 'Office Hours', category: 'DSP Program', defaultVisible: false, minWidth: '140px' },
  { key: 'rfid', label: 'RFID Number', category: 'DSP Program', defaultVisible: false, minWidth: '120px' },
  { key: 'leaveGroup', label: 'Leave Group', category: 'DSP Program', defaultVisible: false, minWidth: '130px' },

  // ── Leave & Attendance ──
  { key: 'leavePolicy', label: 'Leave Policy', category: 'Leave & Attendance', defaultVisible: false, minWidth: '180px' },
  { key: 'casualLeaveAllocated', label: 'Casual Leave Quota', category: 'Leave & Attendance', defaultVisible: false, minWidth: '130px', type: 'number' },
  { key: 'casualLeaveUsed', label: 'Casual Leave Used', category: 'Leave & Attendance', defaultVisible: false, minWidth: '130px', type: 'number' },
  { key: 'sickLeaveAllocated', label: 'Sick Leave Quota', category: 'Leave & Attendance', defaultVisible: false, minWidth: '120px', type: 'number' },
  { key: 'sickLeaveUsed', label: 'Sick Leave Used', category: 'Leave & Attendance', defaultVisible: false, minWidth: '120px', type: 'number' },
  { key: 'earnedLeaveAllocated', label: 'Earned Leave Quota', category: 'Leave & Attendance', defaultVisible: false, minWidth: '130px', type: 'number' },
  { key: 'earnedLeaveUsed', label: 'Earned Leave Used', category: 'Leave & Attendance', defaultVisible: false, minWidth: '130px', type: 'number' },
  { key: 'specialLeaveAllocated', label: 'Special Leave Quota', category: 'Leave & Attendance', defaultVisible: false, minWidth: '130px', type: 'number' },
  { key: 'specialLeaveUsed', label: 'Special Leave Used', category: 'Leave & Attendance', defaultVisible: false, minWidth: '130px', type: 'number' },
  { key: 'weekendDays', label: 'Weekend Days', category: 'Leave & Attendance', defaultVisible: false, minWidth: '140px' },
  { key: 'overtimeEligible', label: 'Overtime Eligible', category: 'Leave & Attendance', defaultVisible: false, minWidth: '120px' },
  { key: 'attendanceGracePeriodMin', label: 'Grace Period (Min)', category: 'Leave & Attendance', defaultVisible: false, minWidth: '130px', type: 'number' },

  // ── Status & System ──
  { key: 'status', label: 'Status', category: 'Status & System', defaultVisible: true, minWidth: '110px', align: 'center', type: 'badge' },
  { key: 'isUser', label: 'User Account Created', category: 'Status & System', defaultVisible: false, minWidth: '140px', type: 'boolean' },
  { key: 'userId', label: 'System User ID', category: 'Status & System', defaultVisible: false, minWidth: '140px' },
];

export const DEFAULT_VISIBLE_COLUMN_KEYS: (keyof FullEmployeeProfile)[] = [
  'name',
  'workingSchedule',
  'department',
  'designation',
  'organization',
  'joiningDate',
  'status',
];

/**
 * Returns columns grouped by categories for the Column Customizer dropdown
 */
export function getCategorizedColumns(): ColumnCategory[] {
  const categoriesMap = new Map<string, EmployeeColumnConfig[]>();

  ALL_EMPLOYEE_COLUMNS.forEach((col) => {
    const existing = categoriesMap.get(col.category) || [];
    existing.push(col);
    categoriesMap.set(col.category, existing);
  });

  return Array.from(categoriesMap.entries()).map(([name, columns]) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    columns,
  }));
}
