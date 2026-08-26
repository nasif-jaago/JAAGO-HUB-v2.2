import { getSupabase } from './supabase-auth';
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
    designation: row.designation || 'Program Officer',
    workEmail: row.work_email || '',
    workMobile: row.work_mobile || '',
    workingSchedule: row.working_schedule || 'General Schedule (10:00 AM - 6:00 PM)',
    status: (row.status as any) || 'Active',
    isArchived: row.status === 'Archived' || Boolean(row.is_archived),

    // Tab 1: Work
    organization: row.organization || 'JAAGO Foundation',
    branch: row.branch || 'Head Office (Banani)',
    department: row.department || 'Program Implementation',
    project: row.project || 'General Operations',
    supervisor: row.supervisor || '',
    secondarySupervisor: row.secondary_supervisor || '',
    workLocation: row.work_location || 'Banani, Dhaka',
    remark: row.remark || '',

    // Tab 2: Personal
    personalEmail: row.personal_email || '',
    personalPhone: row.personal_phone || '',
    bankName: row.bank_name || '',
    bankAccountNumber: row.bank_account_number || '',
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

    // Tab 3: Payroll
    joiningDate: row.joining_date ? row.joining_date.slice(0, 10) : '',
    contractEndDate: row.contract_end_date ? row.contract_end_date.slice(0, 10) : '',
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

    // Tab 4: DSP
    officeDays: row.office_days || 'Sunday to Thursday',
    customOfficeDaysFrom: row.custom_office_days_from || undefined,
    customOfficeDaysTo: row.custom_office_days_to || undefined,
    officeHours: row.office_hours || '10:00 AM - 06:00 PM',
    rfid: row.rfid || '',
    leaveGroup: row.leave_group || 'Standard Full-time',
    employeeType: row.employee_type || 'Permanent',

    // Tab 5: Logs
    logHistory: [],
    isUser: Boolean(row.is_user),
    userId: row.user_id || undefined,
  };
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
    supervisor: profile.supervisor || null,
    secondary_supervisor: profile.secondarySupervisor || null,
    work_location: profile.workLocation || null,
    remark: profile.remark || null,

    // Tab 2: Personal
    personal_email: profile.personalEmail || null,
    personal_phone: profile.personalPhone || null,
    bank_name: profile.bankName || null,
    bank_account_number: profile.bankAccountNumber || null,
    nick_name: profile.nickName || null,
    nid: profile.nid || null,
    blood_group: profile.bloodGroup || null,
    birthday: profile.birthday || null,
    gender: profile.gender || null,
    religion: profile.religion || 'Islam',
    marital_status: profile.maritalStatus || 'Single',
    emergency_contact_name: profile.emergencyContactName || null,
    emergency_phone: profile.emergencyPhone || null,
    nationality: profile.nationality || 'Bangladeshi',
    passport_no: profile.passportNo || null,
    home_address: profile.homeAddress || null,
    dependent_children: profile.dependentChildren || 0,

    // Tab 3: Payroll
    joining_date: profile.joiningDate || null,
    contract_end_date: profile.contractEndDate || null,
    wage_type: profile.wageType,
    wage: profile.wage || 0,
    salary_jul_dec: profile.salaryJulDec || 0,
    salary_jan_jun: profile.salaryJanJun || 0,
    monthly_total_allowance: profile.monthlyTotalAllowance,
    six_months_completion_status: profile.sixMonthsCompletionStatus,
    probationary_status: profile.probationaryStatus,
    contract_type: profile.contractType,
    no_tax_deduction: profile.noTaxDeduction || false,
    bonus_eligibility: profile.bonusEligibility,
    pf_applies: profile.pfApplies,
    pf_rate: profile.pfRate || 10,
    regular_salary: profile.regularSalary || 0,
    extra_hours: profile.extraHours || 0,
    extra_payment: profile.extraPayment || 0,
    calculation_value: profile.calculationValue || '1.0x',
    temporary_salary: profile.temporarySalary || 0,
    total_current_salary: profile.totalCurrentSalary || 0,
    currency: profile.currency,
    adjustment_start_date: profile.adjustmentStartDate || null,
    adjustment_end_date: profile.adjustmentEndDate || null,
    assigned_teacher_staff: profile.assignedTeacherStaff || null,
    payroll_remark: profile.payrollRemark || null,

    // Tab 4: DSP
    office_days: profile.officeDays,
    custom_office_days_from: profile.customOfficeDaysFrom || null,
    custom_office_days_to: profile.customOfficeDaysTo || null,
    office_hours: profile.officeHours,
    rfid: profile.rfid || null,
    leave_group: profile.leaveGroup,
    employee_type: profile.employeeType,

    is_user: Boolean(profile.isUser),
    user_id: profile.userId || null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch all employees directly from Supabase
 */
export async function fetchEmployeesFromSupabase(): Promise<FullEmployeeProfile[] | null> {
  try {
    const res = await fetch('/api/v1/hr/employees', {
      cache: 'no-store',
    });
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.data)) {
      if (json.data.length === 0) return [];
      return json.data.map(mapRowToEmployeeProfile);
    }
    return null;
  } catch (err) {
    console.warn('Supabase fetch employees error:', err);
    return null;
  }
}

/**
 * Save / Upsert an employee profile to Supabase
 */
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
      const savedProfile = mapRowToEmployeeProfile(json.data);
      return { success: true, data: savedProfile };
    }

    return { success: false, error: json.error || 'Failed to save employee to Supabase' };
  } catch (err: any) {
    console.warn('Save employee error:', err);
    return { success: false, error: err?.message || 'Failed to save employee profile' };
  }
}

export function getDeletedEmployeeCodes(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('jaago_pnc_deleted_employee_codes');
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function addDeletedEmployeeCode(code: string) {
  if (typeof window === 'undefined' || !code) return;
  try {
    const codes = getDeletedEmployeeCodes();
    codes.add(code);
    localStorage.setItem('jaago_pnc_deleted_employee_codes', JSON.stringify(Array.from(codes)));
  } catch {}
}

export function removeDeletedEmployeeCode(code: string) {
  if (typeof window === 'undefined' || !code) return;
  try {
    const codes = getDeletedEmployeeCodes();
    codes.delete(code);
    localStorage.setItem('jaago_pnc_deleted_employee_codes', JSON.stringify(Array.from(codes)));
  } catch {}
}

/**
 * Bulk archive employees
 */
export async function archiveEmployeesInSupabase(codes: string[]): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { error } = await supabase
      .from('employees')
      .update({ status: 'Archived', is_archived: true, updated_at: new Date().toISOString() })
      .in('code', codes);
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
    return !error;
  } catch {
    return false;
  }
}

/**
 * Bulk delete employees permanently from Supabase
 */
export async function deleteEmployeesFromSupabase(codes: string[]): Promise<boolean> {
  codes.forEach((c) => addDeletedEmployeeCode(c));
  try {
    const res = await fetch('/api/v1/hr/employees', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Delete employee error:', err);
    return false;
  }
}

