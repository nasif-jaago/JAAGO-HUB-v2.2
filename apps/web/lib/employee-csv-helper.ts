import type { FullEmployeeProfile, EmployeeStatus } from '@/components/pnc/employee-profile-detail';

export interface CSVColumnDefinition {
  header: string;
  key: keyof FullEmployeeProfile;
  aliases: string[];
  type?: 'string' | 'number' | 'boolean';
  defaultValue?: any;
}

export const EMPLOYEE_CSV_COLUMNS: CSVColumnDefinition[] = [
  // ── Tab 1: Basic & Work Info ──
  { header: 'Employee Name', key: 'name', aliases: ['name', 'full_name', 'employee_name', 'employee name', 'display_name', 'contact_name'], defaultValue: '' },
  { header: 'Employee Code', key: 'code', aliases: ['code', 'employee_code', 'employee code', 'emp_code', 'id', 'identification_id', 'barcode', 'badge_id'], defaultValue: '' },
  { header: 'Designation', key: 'designation', aliases: ['designation', 'job_title', 'job title', 'job_position', 'job position', 'position', 'title', 'role'], defaultValue: 'Program Officer' },
  { header: 'Status', key: 'status', aliases: ['status', 'employment_status', 'employee_status', 'state', 'active'], defaultValue: 'Active' },
  { header: 'Organization', key: 'organization', aliases: ['organization', 'company', 'company_id', 'company_name', 'company name', 'org', 'legal_entity', 'entity'], defaultValue: 'JAAGO Foundation' },
  { header: 'Branch', key: 'branch', aliases: ['branch', 'office_location', 'branch_name', 'campus', 'work_location_id', 'work_location_name'], defaultValue: 'Head Office (Banani)' },
  { header: 'Department', key: 'department', aliases: ['department', 'dept', 'department_id', 'department_name', 'dept_name', 'parent_department', 'parent department'], defaultValue: 'Program Implementation' },
  { header: 'Project', key: 'project', aliases: ['project', 'project_name', 'cost_center', 'program'], defaultValue: 'General Operations' },
  { header: 'Team', key: 'team', aliases: ['team', 'squad', 'team_name', 'unit'], defaultValue: 'Core Development Team' },
  { header: 'Supervisor', key: 'supervisor', aliases: ['supervisor', 'reporting_to', 'line_manager', 'parent_id', 'manager_id', 'coach_id', 'manager'], defaultValue: '' },
  { header: 'Secondary Supervisor', key: 'secondarySupervisor', aliases: ['secondary_supervisor', 'secondary supervisor', 'co_manager'], defaultValue: '' },
  { header: 'Work Location', key: 'workLocation', aliases: ['work_location', 'work location', 'location', 'work_address', 'work address'], defaultValue: 'Banani, Dhaka' },
  { header: 'Working Schedule', key: 'workingSchedule', aliases: ['working_schedule', 'working schedule', 'shift', 'work_schedule', 'resource_calendar_id', 'calendar', 'working_hours'], defaultValue: 'JAAGO HQ (10:00 AM - 06:00 PM)' },
  { header: 'Work Email', key: 'workEmail', aliases: ['work_email', 'work email', 'email', 'office_email', 'user_email'], defaultValue: '' },
  { header: 'Work Mobile', key: 'workMobile', aliases: ['work_mobile', 'work mobile', 'phone', 'mobile', 'work_phone', 'mobile_phone', 'mobile phone'], defaultValue: '' },
  { header: 'Work Remark', key: 'remark', aliases: ['remark', 'work_remark', 'notes', 'work_notes', 'comment'], defaultValue: '' },

  // ── Tab 2: Personal Information ──
  { header: 'Nick Name', key: 'nickName', aliases: ['nick_name', 'nickname', 'preferred_name'], defaultValue: '' },
  { header: 'National ID (NID)', key: 'nid', aliases: ['nid', 'national_id', 'national id', 'nid_no'], defaultValue: '' },
  { header: 'Passport No', key: 'passportNo', aliases: ['passport_no', 'passport', 'passport number'], defaultValue: '' },
  { header: 'Date of Birth', key: 'birthday', aliases: ['birthday', 'date_of_birth', 'dob', 'birth_date'], defaultValue: '' },
  { header: 'Gender', key: 'gender', aliases: ['gender', 'sex'], defaultValue: 'MALE' },
  { header: 'Blood Group', key: 'bloodGroup', aliases: ['blood_group', 'blood group', 'blood'], defaultValue: 'B+' },
  { header: 'Religion', key: 'religion', aliases: ['religion', 'faith'], defaultValue: 'Islam' },
  { header: 'Marital Status', key: 'maritalStatus', aliases: ['marital_status', 'marital status', 'marriage_status'], defaultValue: 'Single' },
  { header: 'Nationality', key: 'nationality', aliases: ['nationality', 'citizenship'], defaultValue: 'Bangladeshi' },
  { header: 'Personal Email', key: 'personalEmail', aliases: ['personal_email', 'personal email', 'private_email'], defaultValue: '' },
  { header: 'Personal Phone', key: 'personalPhone', aliases: ['personal_phone', 'personal phone', 'personal_mobile'], defaultValue: '' },
  { header: 'Home Address', key: 'homeAddress', aliases: ['home_address', 'home address', 'residential_address', 'address'], defaultValue: '' },
  { header: 'Emergency Contact Name', key: 'emergencyContactName', aliases: ['emergency_contact_name', 'emergency contact name', 'emergency_name'], defaultValue: '' },
  { header: 'Emergency Contact Phone', key: 'emergencyPhone', aliases: ['emergency_phone', 'emergency phone', 'emergency_contact_phone'], defaultValue: '' },
  { header: 'Dependent Children', key: 'dependentChildren', aliases: ['dependent_children', 'dependent children', 'children_count'], type: 'number', defaultValue: 0 },
  { header: 'Bank Name', key: 'bankName', aliases: ['bank_name', 'bank name', 'bank'], defaultValue: '' },
  { header: 'Bank Account Number', key: 'bankAccountNumber', aliases: ['bank_account_number', 'bank account number', 'account_no', 'bank_account'], defaultValue: '' },

  // ── Tab 3: Payroll & Compensation ──
  { header: 'Joining Date', key: 'joiningDate', aliases: ['joining_date', 'joining date', 'start_date', 'hire_date'], defaultValue: '' },
  { header: 'Contract End Date', key: 'contractEndDate', aliases: ['contract_end_date', 'contract end date', 'end_date'], defaultValue: '' },
  { header: 'Wage Type', key: 'wageType', aliases: ['wage_type', 'wage type', 'salary_type'], defaultValue: 'Fixed' },
  { header: 'Gross Wage / Salary', key: 'wage', aliases: ['wage', 'gross_wage', 'salary', 'basic_salary', 'gross_salary'], type: 'number', defaultValue: 0 },
  { header: 'Salary Jul-Dec', key: 'salaryJulDec', aliases: ['salary_jul_dec', 'salary jul dec', 'salary_h2'], type: 'number', defaultValue: 0 },
  { header: 'Salary Jan-Jun', key: 'salaryJanJun', aliases: ['salary_jan_jun', 'salary jan jun', 'salary_h1'], type: 'number', defaultValue: 0 },
  { header: 'Currency', key: 'currency', aliases: ['currency', 'salary_currency'], defaultValue: 'BDT' },
  { header: 'Monthly Allowance (Yes/No)', key: 'monthlyTotalAllowance', aliases: ['monthly_total_allowance', 'monthly allowance', 'allowance'], defaultValue: 'Yes' },
  { header: 'Bonus Eligibility (Yes/No)', key: 'bonusEligibility', aliases: ['bonus_eligibility', 'bonus eligibility', 'bonus'], defaultValue: 'Yes' },
  { header: 'PF Applies (Yes/No)', key: 'pfApplies', aliases: ['pf_applies', 'pf applies', 'provident_fund'], defaultValue: 'Yes' },
  { header: 'PF Rate (%)', key: 'pfRate', aliases: ['pf_rate', 'pf rate', 'provident_fund_rate'], type: 'number', defaultValue: 10 },
  { header: 'No Tax Deduction', key: 'noTaxDeduction', aliases: ['no_tax_deduction', 'no tax deduction', 'tax_exempt'], type: 'boolean', defaultValue: false },
  { header: 'Six Months Completion Status', key: 'sixMonthsCompletionStatus', aliases: ['six_months_completion_status', 'six months completion', 'probation_completion'], defaultValue: 'Yes' },
  { header: 'Probationary Status', key: 'probationaryStatus', aliases: ['probationary_status', 'probationary status', 'confirmation_status'], defaultValue: 'Confirmed' },
  { header: 'Contract Type', key: 'contractType', aliases: ['contract_type', 'contract type', 'employment_type'], defaultValue: 'Full Time' },
  { header: 'Regular Salary', key: 'regularSalary', aliases: ['regular_salary', 'regular salary'], type: 'number', defaultValue: 0 },
  { header: 'Extra Hours', key: 'extraHours', aliases: ['extra_hours', 'extra hours', 'ot_hours'], type: 'number', defaultValue: 0 },
  { header: 'Extra Payment', key: 'extraPayment', aliases: ['extra_payment', 'extra payment', 'ot_payment'], type: 'number', defaultValue: 0 },
  { header: 'Temporary Salary', key: 'temporarySalary', aliases: ['temporary_salary', 'temporary salary'], type: 'number', defaultValue: 0 },
  { header: 'Total Current Salary', key: 'totalCurrentSalary', aliases: ['total_current_salary', 'total current salary', 'net_salary'], type: 'number', defaultValue: 0 },
  { header: 'Calculation Value', key: 'calculationValue', aliases: ['calculation_value', 'calculation value', 'calc_value'], defaultValue: '1.0x' },
  { header: 'Adjustment Start Date', key: 'adjustmentStartDate', aliases: ['adjustment_start_date', 'adjustment start date', 'adj_start_date'], defaultValue: '' },
  { header: 'Adjustment End Date', key: 'adjustmentEndDate', aliases: ['adjustment_end_date', 'adjustment end date', 'adj_end_date'], defaultValue: '' },
  { header: 'Assigned Teacher / Staff', key: 'assignedTeacherStaff', aliases: ['assigned_teacher_staff', 'assigned teacher staff', 'assigned_staff'], defaultValue: '' },
  { header: 'Payroll Remark', key: 'payrollRemark', aliases: ['payroll_remark', 'payroll remark', 'payroll_notes'], defaultValue: '' },

  // ── Tab 4: Insurance Information ──
  { header: 'Insurance Status', key: 'insuranceStatus', aliases: ['insurance_status', 'insurance status'], defaultValue: 'Active' },
  { header: 'Insurance Coverage Category', key: 'insuranceCoverageCategory', aliases: ['insurance_coverage_category', 'insurance category', 'coverage_plan'], defaultValue: 'Standard Full-Time (Plan B)' },
  { header: 'Insurance Monthly Premium', key: 'insuranceMonthlyPremium', aliases: ['insurance_monthly_premium', 'insurance premium', 'monthly_premium'], type: 'number', defaultValue: 1500 },
  { header: 'Employee Health Insurance ID', key: 'employeeHealthInsuranceId', aliases: ['employee_health_insurance_id', 'health_insurance_id', 'insurance_id'], defaultValue: '' },
  { header: 'Spouse Name', key: 'spouseName', aliases: ['spouse_name', 'spouse name', 'wife_name', 'husband_name'], defaultValue: '' },
  { header: 'Spouse Health Insurance ID', key: 'spouseHealthInsuranceId', aliases: ['spouse_health_insurance_id', 'spouse insurance id'], defaultValue: '' },
  { header: 'Child 1 Name', key: 'child1Name', aliases: ['child1_name', 'child 1 name'], defaultValue: '' },
  { header: 'Child 1 Health Insurance ID', key: 'child1HealthInsuranceId', aliases: ['child1_health_insurance_id', 'child 1 insurance id'], defaultValue: '' },
  { header: 'Child 2 Name', key: 'child2Name', aliases: ['child2_name', 'child 2 name'], defaultValue: '' },
  { header: 'Child 2 Health Insurance ID', key: 'child2HealthInsuranceId', aliases: ['child2_health_insurance_id', 'child 2 insurance id'], defaultValue: '' },
  { header: 'Child 3 Name', key: 'child3Name', aliases: ['child3_name', 'child 3 name'], defaultValue: '' },
  { header: 'Child 3 Health Insurance ID', key: 'child3HealthInsuranceId', aliases: ['child3_health_insurance_id', 'child 3 insurance id'], defaultValue: '' },

  // ── Tab 5: DSP / Digital School Program ──
  { header: 'Employee Type', key: 'employeeType', aliases: ['employee_type', 'employee type', 'staff_type'], defaultValue: 'Permanent' },
  { header: 'Office Days', key: 'officeDays', aliases: ['office_days', 'office days', 'working_days'], defaultValue: 'Sunday to Thursday' },
  { header: 'Office Hours', key: 'officeHours', aliases: ['office_hours', 'office hours', 'shift_hours'], defaultValue: '10:00 AM - 06:00 PM' },
  { header: 'RFID Number', key: 'rfid', aliases: ['rfid', 'rfid_no', 'card_number', 'rfid_tag'], defaultValue: '' },
  { header: 'Leave Group', key: 'leaveGroup', aliases: ['leave_group', 'leave group'], defaultValue: 'Standard Full-time' },

  // ── Tab 6: Leave & Attendance Settings ──
  { header: 'Leave Policy', key: 'leavePolicy', aliases: ['leave_policy', 'leave policy', 'leave_policy_name'], defaultValue: 'Standard Full-time Employee Policy' },
  { header: 'Casual Leave Allocated', key: 'casualLeaveAllocated', aliases: ['casual_leave_allocated', 'casual leave quota', 'casual_leave'], type: 'number', defaultValue: 14 },
  { header: 'Casual Leave Used', key: 'casualLeaveUsed', aliases: ['casual_leave_used', 'casual leave taken'], type: 'number', defaultValue: 0 },
  { header: 'Sick Leave Allocated', key: 'sickLeaveAllocated', aliases: ['sick_leave_allocated', 'sick leave quota', 'sick_leave', 'medical_leave'], type: 'number', defaultValue: 10 },
  { header: 'Sick Leave Used', key: 'sickLeaveUsed', aliases: ['sick_leave_used', 'sick leave taken'], type: 'number', defaultValue: 0 },
  { header: 'Earned Leave Allocated', key: 'earnedLeaveAllocated', aliases: ['earned_leave_allocated', 'annual_leave_allocated', 'earned_leave', 'annual_leave'], type: 'number', defaultValue: 15 },
  { header: 'Earned Leave Used', key: 'earnedLeaveUsed', aliases: ['earned_leave_used', 'annual_leave_used'], type: 'number', defaultValue: 0 },
  { header: 'Special Leave Allocated', key: 'specialLeaveAllocated', aliases: ['special_leave_allocated', 'special leave quota', 'special_leave'], type: 'number', defaultValue: 5 },
  { header: 'Special Leave Used', key: 'specialLeaveUsed', aliases: ['special_leave_used', 'special leave taken'], type: 'number', defaultValue: 0 },
  { header: 'Weekend Days', key: 'weekendDays', aliases: ['weekend_days', 'weekend days', 'weekends'], defaultValue: 'Friday & Saturday' },
  { header: 'Overtime Eligible', key: 'overtimeEligible', aliases: ['overtime_eligible', 'overtime eligible', 'ot_eligible'], defaultValue: 'No' },
  { header: 'Attendance Grace Period (Min)', key: 'attendanceGracePeriodMin', aliases: ['attendance_grace_period_min', 'grace_period', 'grace_min'], type: 'number', defaultValue: 15 },

  // ── Tab 7: User Provisioning ──
  { header: 'User Account Created', key: 'isUser', aliases: ['is_user', 'user_account_created', 'has_user_login'], type: 'boolean', defaultValue: false },
  { header: 'System User ID', key: 'userId', aliases: ['user_id', 'system_user_id', 'auth_user_id'], defaultValue: '' },
];

/**
 * Escapes a cell value for CSV output
 */
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Exports full employee profiles to a complete CSV string with all fields
 */
export function exportEmployeesToComprehensiveCSV(employees: FullEmployeeProfile[]): string {
  const headerRow = EMPLOYEE_CSV_COLUMNS.map((col) => escapeCSVValue(col.header)).join(',');
  const dataRows = employees.map((emp) => {
    return EMPLOYEE_CSV_COLUMNS.map((col) => {
      const val = emp[col.key];
      return escapeCSVValue(val !== undefined ? val : col.defaultValue ?? '');
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Generates sample demo CSV template with all columns populated
 */
export function generateComprehensiveEmployeeTemplateCSV(): string {
  const sampleProfiles: FullEmployeeProfile[] = [
    {
      id: 'emp-sample-1',
      name: 'Nasif Kamal',
      code: 'FO032507061190',
      avatarUrl: '',
      designation: 'Coordinator, Technology',
      workEmail: 'nasif.kamal@jaago.com.bd',
      workMobile: '+8801780522666',
      status: 'Active',
      isArchived: false,
      workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
      organization: 'JAAGO Foundation',
      branch: 'Head Office (Banani)',
      department: "Founder's Office",
      project: 'General Operations',
      team: 'Executive Technology Team',
      supervisor: 'Founder & Executive Director',
      secondarySupervisor: 'Director, People & Culture',
      workLocation: 'Banani, Dhaka',
      remark: 'Core System Architect & Lead Coordinator',
      nickName: 'Nasif',
      nid: '19952691234567890',
      passportNo: 'A01234567',
      birthday: '1995-08-15',
      gender: 'MALE',
      bloodGroup: 'B+',
      religion: 'Islam',
      maritalStatus: 'Single',
      nationality: 'Bangladeshi',
      personalEmail: 'nasif.kamal.personal@gmail.com',
      personalPhone: '+8801780522666',
      homeAddress: 'House 12, Road 4, Sector 3, Uttara, Dhaka-1230',
      emergencyContactName: 'Kamal Uddin',
      emergencyPhone: '+8801711223344',
      dependentChildren: 0,
      bankName: 'BRAC Bank Ltd',
      bankAccountNumber: '1501203456789001',
      joiningDate: '2024-08-26',
      contractEndDate: '2027-08-25',
      wageType: 'Fixed',
      wage: 65000,
      salaryJulDec: 65000,
      salaryJanJun: 65000,
      currency: 'BDT',
      monthlyTotalAllowance: 'Yes',
      bonusEligibility: 'Yes',
      pfApplies: 'Yes',
      pfRate: 10,
      noTaxDeduction: false,
      sixMonthsCompletionStatus: 'Yes',
      probationaryStatus: 'Confirmed',
      contractType: 'Full Time',
      regularSalary: 65000,
      extraHours: 0,
      extraPayment: 0,
      calculationValue: '1.0x',
      temporarySalary: 0,
      totalCurrentSalary: 65000,
      adjustmentStartDate: '',
      adjustmentEndDate: '',
      assignedTeacherStaff: 'Staff',
      payrollRemark: 'Standard monthly executive payroll',
      insuranceStatus: 'Active',
      insuranceCoverageCategory: 'Executive Full Coverage (Plan A)',
      insuranceMonthlyPremium: 2500,
      employeeHealthInsuranceId: 'INS-JAAGO-2026-001',
      spouseName: '',
      spouseHealthInsuranceId: '',
      child1Name: '',
      child1HealthInsuranceId: '',
      child2Name: '',
      child2HealthInsuranceId: '',
      child3Name: '',
      child3HealthInsuranceId: '',
      employeeType: 'Permanent',
      officeDays: 'Sunday to Thursday',
      officeHours: '10:00 AM - 06:00 PM',
      rfid: 'RFID-990812',
      leaveGroup: 'Executive Full-time',
      leavePolicy: 'Standard Executive Employee Policy',
      casualLeaveAllocated: 14,
      casualLeaveUsed: 2,
      sickLeaveAllocated: 10,
      sickLeaveUsed: 1,
      earnedLeaveAllocated: 15,
      earnedLeaveUsed: 0,
      specialLeaveAllocated: 5,
      specialLeaveUsed: 0,
      weekendDays: 'Friday & Saturday',
      overtimeEligible: 'No',
      attendanceGracePeriodMin: 15,
      logHistory: [],
      isUser: true,
      userId: 'usr-nasif-001',
    },
    {
      id: 'emp-sample-2',
      name: 'SM Nayeem',
      code: 'FO072408011290',
      avatarUrl: '',
      designation: 'Program Officer',
      workEmail: 'nayeem.rashid@jaago.com.bd',
      workMobile: '+8801711223399',
      status: 'Active',
      isArchived: false,
      workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
      organization: 'JAAGO Foundation',
      branch: 'Head Office (Banani)',
      department: "Founder's Office",
      project: 'General Operations',
      team: 'Program Operations Squad',
      supervisor: 'Nasif Kamal',
      secondarySupervisor: 'Director, Operations',
      workLocation: 'Banani, Dhaka',
      remark: 'Program operations officer',
      nickName: 'Nayeem',
      nid: '19962691234567891',
      passportNo: 'A09876543',
      birthday: '1996-03-22',
      gender: 'MALE',
      bloodGroup: 'A+',
      religion: 'Islam',
      maritalStatus: 'Single',
      nationality: 'Bangladeshi',
      personalEmail: 'nayeem.personal@gmail.com',
      personalPhone: '+8801711223399',
      homeAddress: 'House 45, Road 8, Dhanmondi, Dhaka',
      emergencyContactName: 'Rashid Ahmed',
      emergencyPhone: '+8801711000999',
      dependentChildren: 0,
      bankName: 'City Bank Ltd',
      bankAccountNumber: '2101234567890002',
      joiningDate: '2024-08-26',
      contractEndDate: '2026-08-25',
      wageType: 'Fixed',
      wage: 55000,
      salaryJulDec: 55000,
      salaryJanJun: 55000,
      currency: 'BDT',
      monthlyTotalAllowance: 'Yes',
      bonusEligibility: 'Yes',
      pfApplies: 'Yes',
      pfRate: 10,
      noTaxDeduction: false,
      sixMonthsCompletionStatus: 'Yes',
      probationaryStatus: 'Confirmed',
      contractType: 'Full Time',
      regularSalary: 55000,
      extraHours: 0,
      extraPayment: 0,
      calculationValue: '1.0x',
      temporarySalary: 0,
      totalCurrentSalary: 55000,
      adjustmentStartDate: '',
      adjustmentEndDate: '',
      assignedTeacherStaff: 'Staff',
      payrollRemark: 'Regular monthly payroll',
      insuranceStatus: 'Active',
      insuranceCoverageCategory: 'Standard Full-Time (Plan B)',
      insuranceMonthlyPremium: 1500,
      employeeHealthInsuranceId: 'INS-JAAGO-2026-002',
      spouseName: '',
      spouseHealthInsuranceId: '',
      child1Name: '',
      child1HealthInsuranceId: '',
      child2Name: '',
      child2HealthInsuranceId: '',
      child3Name: '',
      child3HealthInsuranceId: '',
      employeeType: 'Permanent',
      officeDays: 'Sunday to Thursday',
      officeHours: '10:00 AM - 06:00 PM',
      rfid: 'RFID-990813',
      leaveGroup: 'Standard Full-time',
      leavePolicy: 'Standard Full-time Employee Policy',
      casualLeaveAllocated: 14,
      casualLeaveUsed: 0,
      sickLeaveAllocated: 10,
      sickLeaveUsed: 0,
      earnedLeaveAllocated: 15,
      earnedLeaveUsed: 0,
      specialLeaveAllocated: 5,
      specialLeaveUsed: 0,
      weekendDays: 'Friday & Saturday',
      overtimeEligible: 'No',
      attendanceGracePeriodMin: 15,
      logHistory: [],
      isUser: true,
      userId: 'usr-nayeem-002',
    },
  ];

  return exportEmployeesToComprehensiveCSV(sampleProfiles);
}

/**
 * Parses raw CSV text and maps it to FullEmployeeProfile records
 */
export function parseComprehensiveEmployeeCSV(csvText: string): {
  success: boolean;
  employees: FullEmployeeProfile[];
  errors: string[];
  totalParsed: number;
} {
  const errors: string[] = [];
  const employees: FullEmployeeProfile[] = [];

  if (!csvText || !csvText.trim()) {
    return { success: false, employees: [], errors: ['CSV file is completely empty.'], totalParsed: 0 };
  }

  // Parse lines with quotes support
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) {
    return {
      success: false,
      employees: [],
      errors: ['CSV file must contain a header row and at least one employee data row.'],
      totalParsed: 0,
    };
  }

  if (!rows[0] || rows[0].length === 0) {
    return {
      success: false,
      employees: [],
      errors: ['Invalid CSV headers.'],
      totalParsed: 0,
    };
  }

  const rawHeaders = rows[0].map((h) => h.replace(/^["']|["']$/g, '').trim());

  // Map header index to column definition
  const headerMap: { [colIndex: number]: CSVColumnDefinition } = {};
  rawHeaders.forEach((header, index) => {
    const norm = header.toLowerCase().replace(/[\s_-]+/g, '');
    const matchedCol = EMPLOYEE_CSV_COLUMNS.find((col) => {
      if (col.header.toLowerCase().replace(/[\s_-]+/g, '') === norm) return true;
      return col.aliases.some((alias) => alias.toLowerCase().replace(/[\s_-]+/g, '') === norm);
    });

    if (matchedCol) {
      headerMap[index] = matchedCol;
    }
  });

  // Iterate over data rows
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0 || row.every((c) => !c || !c.trim())) continue;

    const rowObj: any = {};

    row.forEach((cellVal, colIndex) => {
      const colDef = headerMap[colIndex];
      if (!colDef) return;

      const cleanVal = cellVal.replace(/^["']|["']$/g, '').trim();

      if (colDef.type === 'number') {
        const num = parseFloat(cleanVal.replace(/[^0-9.-]/g, ''));
        rowObj[colDef.key] = isNaN(num) ? colDef.defaultValue ?? 0 : num;
      } else if (colDef.type === 'boolean') {
        const lower = cleanVal.toLowerCase();
        rowObj[colDef.key] = lower === 'true' || lower === 'yes' || lower === '1';
      } else {
        rowObj[colDef.key] = cleanVal || colDef.defaultValue || '';
      }
    });

    // Validate minimum required identity: name or code
    const empName = rowObj.name || rowObj.employeeName || '';
    const empCode = rowObj.code || rowObj.employeeCode || `EMP-${Date.now()}-${r}`;

    if (!empName) {
      errors.push(`Row ${r + 1}: Skipped because Employee Name is missing.`);
      continue;
    }

    // Fill all missing fields with canonical defaults
    const completeEmployee: FullEmployeeProfile = {
      id: rowObj.id || `emp-${Date.now()}-${r}`,
      name: empName,
      code: empCode,
      avatarUrl: rowObj.avatarUrl || '',
      designation: rowObj.designation || 'Program Officer',
      workEmail: rowObj.workEmail || '',
      workMobile: rowObj.workMobile || '',
      status: (rowObj.status as EmployeeStatus) || 'Active',
      isArchived: rowObj.status === 'Archived' || Boolean(rowObj.isArchived),
      workingSchedule: rowObj.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',

      // Tab 1: Work
      organization: rowObj.organization || 'JAAGO Foundation',
      branch: rowObj.branch || 'Head Office (Banani)',
      department: rowObj.department || 'Program Implementation',
      project: rowObj.project || 'General Operations',
      team: rowObj.team || 'Core Development Team',
      supervisor: rowObj.supervisor || '',
      secondarySupervisor: rowObj.secondarySupervisor || '',
      workLocation: rowObj.workLocation || 'Banani, Dhaka',
      remark: rowObj.remark || '',

      // Tab 2: Personal
      nickName: rowObj.nickName || '',
      nid: rowObj.nid || '',
      passportNo: rowObj.passportNo || '',
      birthday: rowObj.birthday || '',
      gender: rowObj.gender || 'MALE',
      bloodGroup: rowObj.bloodGroup || 'B+',
      religion: rowObj.religion || 'Islam',
      maritalStatus: rowObj.maritalStatus || 'Single',
      nationality: rowObj.nationality || 'Bangladeshi',
      personalEmail: rowObj.personalEmail || '',
      personalPhone: rowObj.personalPhone || '',
      homeAddress: rowObj.homeAddress || '',
      emergencyContactName: rowObj.emergencyContactName || '',
      emergencyPhone: rowObj.emergencyPhone || '',
      dependentChildren: Number(rowObj.dependentChildren || 0),
      bankName: rowObj.bankName || '',
      bankAccountNumber: rowObj.bankAccountNumber || '',

      // Tab 3: Payroll
      joiningDate: rowObj.joiningDate || new Date().toISOString().slice(0, 10),
      contractEndDate: rowObj.contractEndDate || '',
      wageType: rowObj.wageType || 'Fixed',
      wage: Number(rowObj.wage || 0),
      salaryJulDec: Number(rowObj.salaryJulDec || rowObj.wage || 0),
      salaryJanJun: Number(rowObj.salaryJanJun || rowObj.wage || 0),
      currency: rowObj.currency || 'BDT',
      monthlyTotalAllowance: rowObj.monthlyTotalAllowance || 'Yes',
      bonusEligibility: rowObj.bonusEligibility || 'Yes',
      pfApplies: rowObj.pfApplies || 'Yes',
      pfRate: Number(rowObj.pfRate ?? 10),
      noTaxDeduction: Boolean(rowObj.noTaxDeduction),
      sixMonthsCompletionStatus: rowObj.sixMonthsCompletionStatus || 'Yes',
      probationaryStatus: rowObj.probationaryStatus || 'Confirmed',
      contractType: rowObj.contractType || 'Full Time',
      regularSalary: Number(rowObj.regularSalary || rowObj.wage || 0),
      extraHours: Number(rowObj.extraHours || 0),
      extraPayment: Number(rowObj.extraPayment || 0),
      calculationValue: rowObj.calculationValue || '1.0x',
      temporarySalary: Number(rowObj.temporarySalary || 0),
      totalCurrentSalary: Number(rowObj.totalCurrentSalary || rowObj.wage || 0),
      adjustmentStartDate: rowObj.adjustmentStartDate || '',
      adjustmentEndDate: rowObj.adjustmentEndDate || '',
      assignedTeacherStaff: rowObj.assignedTeacherStaff || 'Staff',
      payrollRemark: rowObj.payrollRemark || '',

      // Tab 4: Insurance
      insuranceStatus: rowObj.insuranceStatus || 'Active',
      insuranceCoverageCategory: rowObj.insuranceCoverageCategory || 'Standard Full-Time (Plan B)',
      insuranceMonthlyPremium: Number(rowObj.insuranceMonthlyPremium ?? 1500),
      employeeHealthInsuranceId: rowObj.employeeHealthInsuranceId || '',
      spouseName: rowObj.spouseName || '',
      spouseHealthInsuranceId: rowObj.spouseHealthInsuranceId || '',
      child1Name: rowObj.child1Name || '',
      child1HealthInsuranceId: rowObj.child1HealthInsuranceId || '',
      child2Name: rowObj.child2Name || '',
      child2HealthInsuranceId: rowObj.child2HealthInsuranceId || '',
      child3Name: rowObj.child3Name || '',
      child3HealthInsuranceId: rowObj.child3HealthInsuranceId || '',

      // Tab 5: DSP
      employeeType: rowObj.employeeType || 'Permanent',
      officeDays: rowObj.officeDays || 'Sunday to Thursday',
      customOfficeDaysFrom: rowObj.customOfficeDaysFrom || undefined,
      customOfficeDaysTo: rowObj.customOfficeDaysTo || undefined,
      officeHours: rowObj.officeHours || '10:00 AM - 06:00 PM',
      rfid: rowObj.rfid || '',
      leaveGroup: rowObj.leaveGroup || 'Standard Full-time',

      // Tab 6: Leave & Attendance
      leavePolicy: rowObj.leavePolicy || 'Standard Full-time Employee Policy',
      casualLeaveAllocated: Number(rowObj.casualLeaveAllocated ?? 14),
      casualLeaveUsed: Number(rowObj.casualLeaveUsed ?? 0),
      sickLeaveAllocated: Number(rowObj.sickLeaveAllocated ?? 10),
      sickLeaveUsed: Number(rowObj.sickLeaveUsed ?? 0),
      earnedLeaveAllocated: Number(rowObj.earnedLeaveAllocated ?? 15),
      earnedLeaveUsed: Number(rowObj.earnedLeaveUsed ?? 0),
      specialLeaveAllocated: Number(rowObj.specialLeaveAllocated ?? 5),
      specialLeaveUsed: Number(rowObj.specialLeaveUsed ?? 0),
      weekendDays: rowObj.weekendDays || 'Friday & Saturday',
      overtimeEligible: rowObj.overtimeEligible || 'No',
      attendanceGracePeriodMin: Number(rowObj.attendanceGracePeriodMin ?? 15),

      // Tab 7: Logs
      logHistory: [],
      isUser: Boolean(rowObj.isUser),
      userId: rowObj.userId || undefined,
    };

    employees.push(completeEmployee);
  }

  return {
    success: employees.length > 0,
    employees,
    errors,
    totalParsed: employees.length,
  };
}
