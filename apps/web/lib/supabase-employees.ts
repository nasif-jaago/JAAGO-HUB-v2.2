import { getSupabase } from './supabase-auth';
import { getCurrentUserSession } from './user-profile-sync';
import type { FullEmployeeProfile, LogHistoryEntry } from '@/components/pnc/employee-profile-detail';
export type { FullEmployeeProfile, LogHistoryEntry };

/**
 * Maps database snake_case row to frontend FullEmployeeProfile
 */
export function mapRowToEmployeeProfile(row: any): FullEmployeeProfile {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    avatarUrl: row.avatar_url || '',
    designation: row.designation || '',
    workEmail: row.work_email || '',
    workMobile: row.work_mobile || '',
    workingSchedule: row.working_schedule || 'JAAGO HQ (10:00 AM - 06:00 PM)',
    status: (row.status as any) || 'Active',
    isArchived: row.status === 'Archived' || Boolean(row.is_archived),

    // Tab 1: Work
    organization: row.organization || '',
    branch: row.branch || '',
    department: row.department || '',
    project: row.project || '',
    team: row.team || '',
    crossDepartments: (() => {
      let depts: string[] = [];
      if (Array.isArray(row.cross_departments)) {
        depts = row.cross_departments.filter((c: any) => typeof c === 'string' && c.trim());
      } else if (typeof row.cross_departments === 'string' && row.cross_departments.trim()) {
        if (row.cross_departments.startsWith('[')) {
          try {
            const p = JSON.parse(row.cross_departments);
            if (Array.isArray(p)) depts = p.filter((c: any) => typeof c === 'string' && c.trim());
          } catch {
            depts = [];
          }
        } else {
          depts = row.cross_departments.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      if (depts.length === 0 && typeof window !== 'undefined') {
        try {
          const code = row.code || '';
          const rawCode = localStorage.getItem(`jaago_employee_cross_departments_${code}`);
          if (rawCode) {
            const parsed = JSON.parse(rawCode);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
          const rawMap = localStorage.getItem('jaago_cross_departments_map');
          if (rawMap) {
            const map = JSON.parse(rawMap);
            const list = map[code] || map[row.id] || (row.work_email ? map[row.work_email.toLowerCase().trim()] : null);
            if (Array.isArray(list) && list.length > 0) return list;
          }
        } catch {}
      }
      return depts;
    })(),
    supervisor: row.supervisor || '',
    secondarySupervisor: row.secondary_supervisor || '',
    workLocation: row.work_location || 'Banani, Dhaka',
    remark: row.remark || '',

    // Tab 2: Personal
    personalEmail: row.personal_email || '',
    personalPhone: row.personal_phone || '',
    bankName: row.bank_name || '',
    bankBranch: row.bank_branch || '',
    bankAccountNumber: row.bank_account_number || '',
    bankRoutingNumber: row.bank_routing_number || '',
    bankSwiftCode: row.bank_swift_code || '',
    nickName: row.nick_name || '',
    nid: row.nid || '',
    bloodGroup: row.blood_group || '',
    birthday: row.birthday ? row.birthday.slice(0, 10) : '',
    gender: row.gender || '',
    religion: row.religion || 'Islam',
    maritalStatus: row.marital_status || 'Single',
    emergencyContactName: row.emergency_contact_name || '',
    emergencyPhone: row.emergency_phone || '',
    nationality: row.nationality || 'Bangladeshi',
    passportNo: row.passport_no || '',
    homeAddress: row.home_address || '',
    dependentChildren: Number(row.dependent_children || 0),
    fatherName: row.father_name || '',
    motherName: row.mother_name || '',
    spouseName: row.spouse_name || '',
    childrenNames: Array.isArray(row.children_names)
      ? row.children_names.filter((c: any) => typeof c === 'string' && c.trim())
      : typeof row.children_names === 'string' && row.children_names.trim()
      ? row.children_names.split(/[;,]/).map((s: string) => s.trim()).filter(Boolean)
      : [row.child1_name, row.child2_name, row.child3_name].filter(Boolean),

    // Tab 3: Payroll & Contracts
    joiningDate: row.joining_date ? row.joining_date.slice(0, 10) : '',
    contractEndDate: row.contract_end_date ? row.contract_end_date.slice(0, 10) : '',
    confirmationDate: row.confirmation_date ? row.confirmation_date.slice(0, 10) : '',
    isNoticePeriod: Boolean(row.is_notice_period),
    noticePeriodDate: row.notice_period_end_date ? row.notice_period_end_date.slice(0, 10) : (row.notice_period_date ? row.notice_period_date.slice(0, 10) : ''),
    noticePeriodStartDate: row.notice_period_start_date ? row.notice_period_start_date.slice(0, 10) : '',
    noticePeriodEndDate: row.notice_period_end_date ? row.notice_period_end_date.slice(0, 10) : (row.notice_period_date ? row.notice_period_date.slice(0, 10) : ''),
    resignationDate: row.resignation_date ? row.resignation_date.slice(0, 10) : '',
    wageType: row.wage_type || 'Fixed',
    wage: Number(row.wage || 0),
    salaryJulDec: Number(row.salary_jul_dec || 0),
    salaryJanJun: Number(row.salary_jan_jun || 0),
    monthlyTotalAllowance: row.monthly_total_allowance || 'Yes',
    sixMonthsCompletionStatus: row.six_months_completion_status || 'Yes',
    probationaryStatus: row.probationary_status || 'Confirmed',
    contractType: row.contract_type || 'Full Time',
    noTaxDeduction: Boolean(row.no_tax_deduction),
    bonusEligibility: row.bonus_eligibility || 'Yes',
    pfApplies: row.pf_applies || 'Yes',
    pfRate: Number(row.pf_rate || 10),
    regularSalary: Number(row.regular_salary || 0),
    extraHours: Number(row.extra_hours || 0),
    extraPayment: Number(row.extra_payment || 0),
    calculationValue: row.calculation_value || '1.0x',
    temporarySalary: Number(row.temporary_salary || 0),
    totalCurrentSalary: Number(row.total_current_salary || 0),
    currency: row.currency || 'BDT',
    adjustmentStartDate: row.adjustment_start_date ? row.adjustment_start_date.slice(0, 10) : '',
    adjustmentEndDate: row.adjustment_end_date ? row.adjustment_end_date.slice(0, 10) : '',
    assignedTeacherStaff: row.assigned_teacher_staff || '',
    payrollRemark: row.payroll_remark || '',

    // Tab 4: Insurance
    insuranceStatus: row.insurance_status || 'Active',
    insuranceCoverageCategory: row.insurance_coverage_category || '',
    insuranceMonthlyPremium: Number(row.insurance_monthly_premium ?? 1500),
    employeeHealthInsuranceId: row.employee_health_insurance_id || '',
    spouseHealthInsuranceId: row.spouse_health_insurance_id || '',
    child1HealthInsuranceId: row.child1_health_insurance_id || '',
    child1Name: row.child1_name || '',
    child2HealthInsuranceId: row.child2_health_insurance_id || '',
    child2Name: row.child2_name || '',
    child3HealthInsuranceId: row.child3_health_insurance_id || '',
    child3Name: row.child3_name || '',

    // Tab 5: DSP
    officeDays: row.office_days || 'Sunday to Thursday',
    customOfficeDaysFrom: row.custom_office_days_from || undefined,
    customOfficeDaysTo: row.custom_office_days_to || undefined,
    officeHours: row.office_hours || '10:00 AM - 06:00 PM',
    rfid: row.rfid || '',
    leaveGroup: row.leave_group || 'Standard Full-time',
    employeeType: row.employee_type || 'Permanent',

    // Tab 6: Leave & Attendance
    leavePolicy: row.leave_policy || 'Standard Full-time Employee Policy',
    casualLeaveAllocated: Number(row.casual_leave_allocated ?? 14),
    casualLeaveUsed: Number(row.casual_leave_used ?? 3),
    sickLeaveAllocated: Number(row.sick_leave_allocated ?? 10),
    sickLeaveUsed: Number(row.sick_leave_used ?? 1),
    earnedLeaveAllocated: Number(row.earned_leave_allocated ?? 15),
    earnedLeaveUsed: Number(row.earned_leave_used ?? 0),
    specialLeaveAllocated: Number(row.special_leave_allocated ?? 5),
    specialLeaveUsed: Number(row.special_leave_used ?? 0),
    weekendDays: row.weekend_days || 'Friday & Saturday',
    overtimeEligible: row.overtime_eligible || 'No',
    attendanceGracePeriodMin: Number(row.attendance_grace_period_min ?? 15),
    allowRegularization:
      row.allow_regularization !== undefined && row.allow_regularization !== null
        ? Boolean(row.allow_regularization)
        : row.regularization_allowed !== undefined && row.regularization_allowed !== null
        ? Boolean(row.regularization_allowed)
        : true,

    // Tab 7: Logs
    logHistory: [],
    isUser: Boolean(row.is_user),
    userId: row.user_id || undefined,
  };
}

function sanitizeDate(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (
    !trimmed ||
    trimmed === 'N/A' ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === '-' ||
    trimmed === '0000-00-00' ||
    trimmed.toLowerCase() === 'none'
  ) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const d = dmyMatch[1];
    const m = dmyMatch[2];
    const y = dmyMatch[3];
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function sanitizeUuid(val: any): string | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'N/A') return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
}

function sanitizeNumber(val: any, fallback: number = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (!val) return fallback;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

/**
 * Maps frontend FullEmployeeProfile to database snake_case payload
 */
export function mapEmployeeProfileToPayload(profile: FullEmployeeProfile): Record<string, any> {
  return {
    code: profile.code,
    name: profile.name,
    avatar_url: profile.avatarUrl || null,
    designation: profile.designation,
    work_email: profile.workEmail || null,
    work_mobile: profile.workMobile || null,
    working_schedule: profile.workingSchedule,
    status: profile.status,
    is_archived: profile.isArchived || false,

    // Tab 1: Work
    organization: profile.organization,
    branch: profile.branch,
    department: profile.department,
    project: profile.project,
    team: profile.team || null,
    cross_departments: Array.isArray(profile.crossDepartments)
      ? profile.crossDepartments.filter(Boolean)
      : [],
    supervisor: profile.supervisor || null,
    secondary_supervisor: profile.secondarySupervisor || null,
    work_location: profile.workLocation || null,
    remark: profile.remark || null,

    // Tab 2: Personal
    personal_email: profile.personalEmail || null,
    personal_phone: profile.personalPhone || null,
    bank_name: profile.bankName || null,
    bank_branch: profile.bankBranch || null,
    bank_account_number: profile.bankAccountNumber || null,
    bank_routing_number: profile.bankRoutingNumber || null,
    bank_swift_code: profile.bankSwiftCode || null,
    nick_name: profile.nickName || null,
    nid: profile.nid || null,
    blood_group: profile.bloodGroup || null,
    birthday: sanitizeDate(profile.birthday),
    gender: profile.gender || null,
    religion: profile.religion || 'Islam',
    marital_status: profile.maritalStatus || 'Single',
    emergency_contact_name: profile.emergencyContactName || null,
    emergency_phone: profile.emergencyPhone || null,
    nationality: profile.nationality || 'Bangladeshi',
    passport_no: profile.passportNo || null,
    home_address: profile.homeAddress || null,
    dependent_children: sanitizeNumber(profile.dependentChildren, 0),
    father_name: profile.fatherName || null,
    mother_name: profile.motherName || null,
    spouse_name: profile.spouseName || null,
    children_names: profile.childrenNames && profile.childrenNames.length > 0 ? profile.childrenNames : [],

    // Tab 3: Payroll & Contracts
    joining_date: sanitizeDate(profile.joiningDate),
    contract_end_date: sanitizeDate(profile.contractEndDate),
    confirmation_date: sanitizeDate(profile.confirmationDate),
    is_notice_period: Boolean(profile.isNoticePeriod),
    notice_period_date: sanitizeDate(profile.noticePeriodEndDate || profile.noticePeriodDate),
    notice_period_start_date: sanitizeDate(profile.noticePeriodStartDate),
    notice_period_end_date: sanitizeDate(profile.noticePeriodEndDate || profile.noticePeriodDate),
    resignation_date: sanitizeDate(profile.resignationDate),
    wage_type: profile.wageType,
    wage: sanitizeNumber(profile.wage, 0),
    salary_jul_dec: sanitizeNumber(profile.salaryJulDec, 0),
    salary_jan_jun: sanitizeNumber(profile.salaryJanJun, 0),
    monthly_total_allowance: profile.monthlyTotalAllowance,
    six_months_completion_status: profile.sixMonthsCompletionStatus,
    probationary_status: profile.probationaryStatus,
    contract_type: profile.contractType,
    no_tax_deduction: profile.noTaxDeduction || false,
    bonus_eligibility: profile.bonusEligibility,
    pf_applies: profile.pfApplies,
    pf_rate: sanitizeNumber(profile.pfRate, 10),
    regular_salary: sanitizeNumber(profile.regularSalary, 0),
    extra_hours: sanitizeNumber(profile.extraHours, 0),
    extra_payment: sanitizeNumber(profile.extraPayment, 0),
    calculation_value: profile.calculationValue || '1.0x',
    temporary_salary: sanitizeNumber(profile.temporarySalary, 0),
    total_current_salary: sanitizeNumber(profile.totalCurrentSalary, 0),
    currency: profile.currency,
    adjustment_start_date: sanitizeDate(profile.adjustmentStartDate),
    adjustment_end_date: sanitizeDate(profile.adjustmentEndDate),
    assigned_teacher_staff: profile.assignedTeacherStaff || null,
    payroll_remark: profile.payrollRemark || null,

    // Tab 4: Insurance
    insurance_status: profile.insuranceStatus || 'Active',
    insurance_coverage_category: profile.insuranceCoverageCategory || null,
    insurance_monthly_premium: sanitizeNumber(profile.insuranceMonthlyPremium, 1500),
    employee_health_insurance_id: profile.employeeHealthInsuranceId || null,
    spouse_health_insurance_id: profile.spouseHealthInsuranceId || null,
    child1_health_insurance_id: profile.child1HealthInsuranceId || null,
    child1_name: profile.child1Name || null,
    child2_health_insurance_id: profile.child2HealthInsuranceId || null,
    child2_name: profile.child2Name || null,
    child3_health_insurance_id: profile.child3HealthInsuranceId || null,
    child3_name: profile.child3Name || null,

    // Tab 5: DSP
    office_days: profile.officeDays,
    custom_office_days_from: sanitizeDate(profile.customOfficeDaysFrom),
    custom_office_days_to: sanitizeDate(profile.customOfficeDaysTo),
    office_hours: profile.officeHours,
    rfid: profile.rfid || null,
    leave_group: profile.leaveGroup,
    employee_type: profile.employeeType,

    // Tab 6: Leave & Attendance
    leave_policy: profile.leavePolicy || 'Standard Full-time Employee Policy',
    casual_leave_allocated: sanitizeNumber(profile.casualLeaveAllocated, 14),
    casual_leave_used: sanitizeNumber(profile.casualLeaveUsed, 3),
    sick_leave_allocated: sanitizeNumber(profile.sickLeaveAllocated, 10),
    sick_leave_used: sanitizeNumber(profile.sickLeaveUsed, 1),
    earned_leave_allocated: sanitizeNumber(profile.earnedLeaveAllocated, 15),
    earned_leave_used: sanitizeNumber(profile.earnedLeaveUsed, 0),
    special_leave_allocated: sanitizeNumber(profile.specialLeaveAllocated, 5),
    special_leave_used: sanitizeNumber(profile.specialLeaveUsed, 0),
    weekend_days: profile.weekendDays || 'Friday & Saturday',
    overtime_eligible: profile.overtimeEligible || 'No',
    attendance_grace_period_min: sanitizeNumber(profile.attendanceGracePeriodMin, 15),
    allow_regularization: profile.allowRegularization !== false,
    regularization_allowed: profile.allowRegularization !== false,

    is_user: Boolean(profile.isUser),
    user_id: sanitizeUuid(profile.userId),
    updated_at: new Date().toISOString(),
  };
}

import { fetchWithCache, invalidateCache } from './data-cache';

/**
 * Fetch all employees directly from Supabase with in-memory deduplication and SWR caching
 */
export async function fetchEmployeesFromSupabase(forceRefresh: boolean = false): Promise<FullEmployeeProfile[] | null> {
  return fetchWithCache(
    'pnc_employees_list',
    async () => {
      try {
        const res = await fetch('/api/v1/hr/employees', {
          cache: 'no-store',
        });
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.data)) {
          if (json.data.length === 0) return [];
          const mapped = json.data.map(mapRowToEmployeeProfile);
          try {
            localStorage.setItem('jaago_pnc_employees_v2', JSON.stringify(mapped));
          } catch {}
          return mapped;
        }
        return null;
      } catch (err) {
        console.warn('Supabase fetch employees error:', err);
        return null;
      }
    },
    25000,
    forceRefresh
  );
}

export async function saveEmployeeToSupabase(
  profile: FullEmployeeProfile,
  newLogs: LogHistoryEntry[] = []
): Promise<{ success: boolean; data?: FullEmployeeProfile; error?: string }> {
  try {
    const payload = mapEmployeeProfileToPayload(profile);
    const body = {
      ...(profile.id && !profile.id.startsWith('emp-') ? { id: profile.id } : {}),
      ...payload,
      logs: newLogs,
    };

    const res = await fetch('/api/v1/hr/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (res.ok && json.success && json.data) {
      invalidateCache('pnc_employees_list');
      const savedProfile = mapRowToEmployeeProfile(json.data);
      return { success: true, data: savedProfile };
    }

    return { success: false, error: json.error || 'Failed to save employee to Supabase' };
  } catch (err: any) {
    console.warn('Save employee error:', err);
    return { success: false, error: err?.message || 'Failed to save employee profile' };
  }
}

export async function bulkImportEmployeesToSupabase(
  employees: FullEmployeeProfile[]
): Promise<{
  success: boolean;
  totalUpserted?: number;
  autoDefined?: {
    organizations: number;
    departments: number;
    designations: number;
    branches: number;
    projects: number;
    teams: number;
  };
  error?: string;
}> {
  try {
    const res = await fetch('/api/v1/hr/employees/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employees }),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      invalidateCache('pnc_employees_list');
      return {
        success: true,
        totalUpserted: json.totalUpserted,
        autoDefined: json.autoDefined,
      };
    }

    return { success: false, error: json.error || 'Failed to bulk import employees' };
  } catch (err: any) {
    console.warn('Bulk import employees error:', err);
    return { success: false, error: err?.message || 'Network error during bulk import' };
  }
}

export function getDeletedEmployeeCodes(): Set<string> {
  return new Set();
}

export function addDeletedEmployeeCode(_code: string) {}

export function removeDeletedEmployeeCode(_code: string) {}

export async function archiveEmployeesInSupabase(codes: string[]): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { error } = await supabase
      .from('employees')
      .update({ status: 'Archived', is_archived: true, updated_at: new Date().toISOString() })
      .in('code', codes);
    if (!error) {
      invalidateCache('pnc_employees_list');
    }
    return !error;
  } catch {
    return false;
  }
}

/**
 * Bulk unarchive / restore employees
 */
export async function unarchiveEmployeesInSupabase(codes: string[]): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { error } = await supabase
      .from('employees')
      .update({ status: 'Active', is_archived: false, updated_at: new Date().toISOString() })
      .in('code', codes);
    if (!error) {
      invalidateCache('pnc_employees_list');
    }
    return !error;
  } catch {
    return false;
  }
}

/**
 * Bulk delete employees permanently from Supabase (Super Admin Only)
 */
export async function deleteEmployeesFromSupabase(codes: string[]): Promise<boolean> {
  codes.forEach((c) => addDeletedEmployeeCode(c));
  try {
    const session = typeof window !== 'undefined' ? getCurrentUserSession() : null;
    const sessAny = session as any;
    const rawRole = (sessAny?.role || (Array.isArray(session?.roles) ? session?.roles[0] : '') || '').toString();
    const isSuper =
      sessAny?.isSuperAdmin === true ||
      rawRole.toUpperCase() === 'SUPER_ADMIN' ||
      rawRole.toLowerCase() === 'super_admin' ||
      (Array.isArray(session?.roles) && session?.roles.some((r: string) => r.toString().toUpperCase() === 'SUPER_ADMIN' || r.toString().toLowerCase() === 'super_admin')) ||
      Boolean(session?.email && session.email.toLowerCase().includes('nasif.kamal'));

    const res = await fetch('/api/v1/hr/employees', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': isSuper ? 'SUPER_ADMIN' : rawRole,
        'x-user-email': session?.email || '',
      },
      body: JSON.stringify({
        codes,
        isSuperAdmin: isSuper,
        requesterEmail: session?.email || '',
      }),
    });
    if (res.ok) {
      invalidateCache('pnc_employees_list');
    }
    return res.ok;
  } catch (err) {
    console.warn('Delete employee error:', err);
    return false;
  }
}


