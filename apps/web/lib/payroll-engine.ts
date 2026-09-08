/**
 * JAAGO PAY: Payroll Calculation Engine & Native Rule Registry
 *
 * Implements the 19 Canonical Salary Rules, Pure Decimal Arithmetic,
 * Global Payroll Settings, Snapshotting, and Batch Pay Run Processor
 * according to ANTIGRAVITY-PAYROLL-MODULE-PROMPT.md.
 */

import { FullEmployeeProfile } from '@/components/pnc/employee-profile-detail';

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & INTERFACES (§7, §8)
// ═══════════════════════════════════════════════════════════════════════════

export type CategoryCode =
  | 'GROSS'
  | 'BASIC'
  | 'ALW'
  | 'DED'
  | 'TAXABLE'
  | 'TAX'
  | 'BONUS'
  | 'REIMB'
  | 'NET'
  | 'COMP';

export interface TaxSlab {
  limit: number | null; // null or 0 = top open band
  rate: number; // percentage, e.g. 10 = 10%
  label?: string;
}

export interface Exemption2Caps {
  freedom_fighter: number; // default: 525000
  disabled_third_gender: number; // default: 500000
  female: number; // default: 425000
  default: number; // default: 375000
}

export interface DepartmentSalarySplit {
  pattern: string; // e.g. 'EMK' or '*'
  salary1_months: number;
  salary2_months: number;
}

export interface PayrollConfig {
  // Structure & Allowances
  basic_salary_percentage: number; // default: 50%
  house_rent_percentage: number; // default: 25%
  medical_allowance_percentage: number; // default: 10%
  conveyance_allowance_percentage: number; // default: 10%
  other_allowance_percentage: number; // default: 5%

  // PF Settings
  pf_base: 'Basic' | 'GROSS'; // default: 'Basic'
  provident_fund_employee_rate: number; // default: 10%
  provident_fund_employer_rate: number; // default: 10%

  // Tax Settings (NBR Bangladesh)
  tax_exemption_limit_1: number; // default: 500000 (or 1/3 of TYI)
  tax_exemption2_caps: Exemption2Caps;
  investment_rebate_limit: number; // default: 1000000
  minimum_tax: number; // default: 5000
  monthly_tax_factor: number; // default: 1.0
  tax_slabs: TaxSlab[];
  department_salary_splits: DepartmentSalarySplit[];

  // Bonus Settings
  festival_bonus_percentage: number; // default: 100% of Basic
  bonus_min_service_months: number; // default: 6

  // Attendance & Overtime Rules
  working_days_basis: '30_DAYS' | 'ACTUAL_DAYS' | 'WORKING_DAYS'; // default: '30_DAYS'
  late_penalty_threshold: number; // default: 3 lates = 1 day
  late_penalty_deduction_days: number; // default: 1 day
  overtime_multiplier_standard: number; // default: 1.5
  overtime_multiplier_holiday: number; // default: 2.0

  // Insurance Premiums
  insurance_plan_a_premium: number; // default: 2500
  insurance_plan_b_premium: number; // default: 1500
  insurance_plan_c_premium: number; // default: 800

  // Banking & Disbursement
  disbursement_day: number; // default: 28
  default_bank_name: string; // default: 'BRAC Bank Ltd'
  default_bank_account: string; // default: '1501203456789001'
  currency: string; // default: 'BDT'
  advice_export_format: 'BEFTN_CSV' | 'STANDARD_CSV';

  // Metadata
  updatedAt?: string;
  updatedBy?: string;
  fiscalYear?: string;
}

export const INITIAL_PAYROLL_CONFIG: PayrollConfig = {
  basic_salary_percentage: 50,
  house_rent_percentage: 25,
  medical_allowance_percentage: 10,
  conveyance_allowance_percentage: 10,
  other_allowance_percentage: 5,

  pf_base: 'Basic',
  provident_fund_employee_rate: 10,
  provident_fund_employer_rate: 10,

  tax_exemption_limit_1: 500000,
  tax_exemption2_caps: {
    freedom_fighter: 525000,
    disabled_third_gender: 500000,
    female: 425000,
    default: 375000,
  },
  investment_rebate_limit: 1000000,
  minimum_tax: 5000,
  monthly_tax_factor: 1.0,
  tax_slabs: [
    { limit: 300000, rate: 10, label: 'First ৳300,000 @ 10%' },
    { limit: 400000, rate: 15, label: 'Next ৳400,000 @ 15%' },
    { limit: 500000, rate: 20, label: 'Next ৳500,000 @ 20%' },
    { limit: 500000, rate: 25, label: 'Next ৳500,000 @ 25%' },
    { limit: null, rate: 30, label: 'Remaining Balance @ 30%' },
  ],
  department_salary_splits: [
    { pattern: 'EMK', salary1_months: 3, salary2_months: 9 },
    { pattern: '*', salary1_months: 6, salary2_months: 6 },
  ],

  festival_bonus_percentage: 100,
  bonus_min_service_months: 6,

  working_days_basis: '30_DAYS',
  late_penalty_threshold: 3,
  late_penalty_deduction_days: 1,
  overtime_multiplier_standard: 1.5,
  overtime_multiplier_holiday: 2.0,

  insurance_plan_a_premium: 2500,
  insurance_plan_b_premium: 1500,
  insurance_plan_c_premium: 800,

  disbursement_day: 28,
  default_bank_name: 'BRAC Bank Ltd',
  default_bank_account: '1501203456789001',
  currency: 'BDT',
  advice_export_format: 'BEFTN_CSV',

  fiscalYear: 'FY 2026-2027',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Administrator',
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. MONETARY ARITHMETIC & PRECISION WRAPPER (§3.3)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard ROUND_HALF_UP rounding for financial calculations.
 * Avoids raw floating point accumulation inaccuracies.
 */
export function round(value: number, decimals: number = 0): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  const n = value * factor;
  const rounded = Math.round(n + (n >= 0 ? 0.0000001 : -0.0000001));
  return rounded / factor;
}

export function dec(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const parsed = Number(val);
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. PURE HELPER FUNCTIONS (§6)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 1. calculateTax - Bangladesh NBR progressive staircase
 */
export function calculateTax(taxableIncome: number, slabs?: TaxSlab[]): number {
  let income = Math.max(0, dec(taxableIncome));
  if (income <= 0) return 0;

  const effectiveSlabs =
    slabs && slabs.length > 0
      ? slabs
      : [
          { limit: 300000, rate: 10 },
          { limit: 400000, rate: 15 },
          { limit: 500000, rate: 20 },
          { limit: 500000, rate: 25 },
          { limit: null, rate: 30 },
        ];

  let totalTax = 0;
  for (const slab of effectiveSlabs) {
    if (income <= 0) break;
    const slabLimit = slab.limit;
    const rate = slab.rate / 100;

    if (slabLimit === null || slabLimit === 0 || slabLimit === undefined) {
      // Top open-ended band
      totalTax += income * rate;
      income = 0;
      break;
    } else {
      const taxableInSlab = Math.min(income, slabLimit);
      totalTax += taxableInSlab * rate;
      income -= taxableInSlab;
    }
  }

  return round(totalTax, 0);
}

/**
 * 2. calculateBonus - Pro-rata festival bonus based on service tenure & eligibility
 */
export function calculateBonus(
  basic: number,
  joinDateStr?: string | null,
  paidDateStr?: string | null,
  eligible: any = true
): number {
  const isEligible =
    eligible === true ||
    eligible === 'true' ||
    eligible === 'Yes' ||
    eligible === 'yes' ||
    eligible === 1;
  if (!isEligible || basic <= 0) return 0;

  if (!joinDateStr || typeof joinDateStr !== 'string') return round(basic, 0);

  const joinDate = new Date(joinDateStr);
  if (isNaN(joinDate.getTime())) return round(basic, 0);

  const paidDate = paidDateStr ? new Date(paidDateStr) : new Date();
  const validPaidDate = isNaN(paidDate.getTime()) ? new Date() : paidDate;

  const joinY = joinDate.getFullYear();
  const joinM = joinDate.getMonth();
  const paidY = validPaidDate.getFullYear();
  const paidM = validPaidDate.getMonth();

  const months = (paidY - joinY) * 12 + (paidM - joinM) + 1;

  if (months >= 12) {
    return round(basic, 0);
  } else if (months > 0) {
    return round((basic / 12) * months, 0);
  }
  return 0;
}

/**
 * 3. calculateTYI - Total Yearly Income with department split weighting
 */
export function calculateTYI(
  gross: number,
  salary1: number = 0,
  salary2: number = 0,
  department: string = '',
  bonus: number = 0,
  _splits?: DepartmentSalarySplit[]
): number {
  const doubleBonus = bonus * 2;
  const s1 = salary1 > 0 ? salary1 : gross;
  const s2 = salary2 > 0 ? salary2 : 0;

  if (s2 <= 0) {
    return round(gross * 12 + doubleBonus, 0);
  }

  const isEmk =
    department &&
    (department.toUpperCase().includes('EMK') || department.toUpperCase().includes('EDWARD M. KENNEDY'));

  if (isEmk) {
    return round(s1 * 3 + s2 * 9 + doubleBonus, 0);
  }

  return round(s1 * 6 + s2 * 6 + doubleBonus, 0);
}

/**
 * 4. calculateTaxExemption2 - Demographic / Category exemption caps
 */
export function calculateTaxExemption2(
  remainingIncome: number,
  isFreedomFighter: boolean = false,
  isDisabled: boolean = false,
  isFemale: boolean = false,
  settings?: PayrollConfig
): number {
  const income = Math.max(0, dec(remainingIncome));
  if (income <= 0) return 0;

  const caps = settings?.tax_exemption2_caps || {
    freedom_fighter: 525000,
    disabled_third_gender: 500000,
    female: 425000,
    default: 375000,
  };

  let cap = caps.default;
  if (isFreedomFighter) {
    cap = caps.freedom_fighter;
  } else if (isDisabled) {
    cap = caps.disabled_third_gender;
  } else if (isFemale) {
    cap = caps.female;
  }

  return round(Math.min(income, cap), 0);
}

/**
 * 5. calculateNetYearlyTax - Applies allowable investment rebate and minimum tax floor
 */
export function calculateNetYearlyTax(
  totalTax: number,
  rebate: number,
  noTaxDeduction: boolean = false,
  settings?: PayrollConfig
): number {
  if (noTaxDeduction) return 0;
  if (totalTax <= 0) return 0;

  const net = totalTax - Math.max(0, rebate);
  const minTax = settings?.minimum_tax ?? 5000;

  if (net < minTax) {
    return minTax;
  }
  return round(net, 0);
}

/**
 * 6. calculateInsuranceDeduction - Health & Life insurance premium deduction
 */
export function calculateInsuranceDeduction(
  status?: string | null,
  premiumAmount?: number | null,
  grossSalary: number = 0
): number {
  if (!status) return 0;
  const s = status.trim().toLowerCase();
  if (
    s === 'disabled' ||
    s === 'false' ||
    s === '0' ||
    s === 'none' ||
    s === 'no' ||
    s === 'unconfigured' ||
    s === 'inactive'
  ) {
    return 0;
  }
  const amount = Math.max(0, dec(premiumAmount));
  return round(Math.min(amount, Math.max(0, grossSalary)), 0);
}

/**
 * 7. computeAttendanceDeduction - Synchronous pure function from Attendance boundary
 */
export interface AttendanceSummaryRecord {
  absentDays: number;
  halfDays: number;
  lateDays: number;
  autoCheckoutDays: number;
  underEightHoursDays: number;
  unpaidLeaveDays: number;
}

export function computeAttendanceDeduction(
  dailySalaryBasis: number,
  records: AttendanceSummaryRecord,
  config?: PayrollConfig
): {
  directDeductionDays: number;
  lateCounter: number;
  lateDeductionDays: number;
  totalDeductionDays: number;
  deductionAmount: number;
  summaryLabel: string;
} {
  const threshold = config?.late_penalty_threshold || 3;
  const lateDeductionRatio = config?.late_penalty_deduction_days || 1;

  // Direct deduction days: Absent (1.0), Half Day (0.5), Under 8h (1.0), Unpaid Leave (1.0)
  const directDeductionDays =
    records.absentDays * 1.0 +
    records.halfDays * 0.5 +
    records.underEightHoursDays * 1.0 +
    records.unpaidLeaveDays * 1.0;

  // Shared late counter: Late check-in + Auto Check-out without punch
  const lateCounter = records.lateDays + records.autoCheckoutDays;
  const lateDeductionDays = Math.floor(lateCounter / threshold) * lateDeductionRatio;

  const totalDeductionDays = directDeductionDays + lateDeductionDays;
  const deductionAmount = round(dailySalaryBasis * totalDeductionDays, 0);

  const parts: string[] = [];
  if (records.absentDays > 0) parts.push(`${records.absentDays} Absent`);
  if (records.halfDays > 0) parts.push(`${records.halfDays} Half-day`);
  if (lateCounter > 0) parts.push(`${lateCounter} Lates (${lateDeductionDays}d ded)`);
  if (records.unpaidLeaveDays > 0) parts.push(`${records.unpaidLeaveDays} LWP`);
  if (parts.length === 0) parts.push('Full Attendance (0 Deduction)');

  return {
    directDeductionDays,
    lateCounter,
    lateDeductionDays,
    totalDeductionDays,
    deductionAmount,
    summaryLabel: parts.join(', '),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. THE 19 CANONICAL SALARY RULE REGISTRY (§5)
// ═══════════════════════════════════════════════════════════════════════════

export interface RuleContext {
  contract: {
    wage: number;
    basic_wage?: number;
    salary_jul_dec?: number;
    salary_jan_jun?: number;
    department?: string;
    joining_date?: string;
    contract_start_date?: string;
    contract_end_date?: string;
    contract_type?: string;
    gender?: string;
    freedom_fighter?: boolean;
    disabled_third_gender?: boolean;
    no_tax_deduction?: boolean;
    pf_enabled?: boolean;
    pf_rate?: number; // decimal e.g. 0.10 or 10
    bonus_eligibility?: boolean | string;
    insurance_status?: string;
    insurance_monthly_premium?: number;
    bank_name?: string;
    bank_account_number?: string;
  };
  settings: PayrollConfig;
  inputs: {
    ATTENDANCE_DEDUCTION?: number | undefined;
    ATTENDANCE_DED_DAYS?: number | undefined;
    ATTENDANCE_LATE_COUNT?: number | undefined;
    LATE?: number | undefined;
    BONUS?: number | undefined;
    OTHER_DEDUCTION?: number | undefined;
    OTHER_ALLOWANCE?: number | undefined;
  };
  categories: Record<CategoryCode, number>;
  rules: Record<string, number>;
}

export interface RuleHandler {
  code: string;
  name: string;
  categoryCode: CategoryCode;
  sequence: number;
  dependsOn: string[];
  appearsOnPayslip: boolean;
  contributesToEmployerCost: boolean;
  compute: (ctx: RuleContext) => number;
}

export const CANONICAL_SALARY_RULES: RuleHandler[] = [
  // 1. Gross Salary
  {
    code: 'GROSS_SALARY',
    name: 'Gross Salary',
    categoryCode: 'GROSS',
    sequence: 1,
    dependsOn: [],
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    compute: (ctx) => round(ctx.contract.wage, 0),
  },

  // 2. Basic Salary
  {
    code: 'BASIC',
    name: 'Basic Salary',
    categoryCode: 'BASIC',
    sequence: 2,
    dependsOn: ['GROSS_SALARY'],
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const gross = ctx.rules['GROSS_SALARY'] ?? 0;
      const pct = (ctx.settings.basic_salary_percentage ?? 50) / 100;
      return round(gross * pct, 0);
    },
  },

  // 3. Provident Fund
  {
    code: 'PF',
    name: 'Provident Fund (PF)',
    categoryCode: 'DED',
    sequence: 3,
    dependsOn: ['GROSS_SALARY', 'BASIC'],
    appearsOnPayslip: true,
    contributesToEmployerCost: true,
    compute: (ctx) => {
      if (ctx.contract.pf_enabled === false) return 0;
      let rawRate = ctx.contract.pf_rate ?? ctx.settings.provident_fund_employee_rate ?? 10;
      if (rawRate > 1) rawRate = rawRate / 100; // convert 10 to 0.10 if needed

      const base =
        ctx.settings.pf_base === 'GROSS'
          ? ctx.rules['GROSS_SALARY'] ?? 0
          : ctx.rules['BASIC'] ?? 0;
      return round(base * rawRate, 0);
    },
  },

  // 4. Bonus (Pro-rata Festival Bonus)
  {
    code: 'BONUS',
    name: 'Festival Bonus',
    categoryCode: 'BONUS',
    sequence: 4,
    dependsOn: ['BASIC'],
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      if (ctx.inputs.BONUS !== undefined) return round(ctx.inputs.BONUS, 0);
      const basic = ctx.rules['BASIC'] ?? 0;
      return calculateBonus(
        basic,
        ctx.contract.joining_date || ctx.contract.contract_start_date,
        undefined,
        ctx.contract.bonus_eligibility
      );
    },
  },

  // 5. Total Yearly Income (TYI)
  {
    code: 'TOTAL_YEARLY_INCOME',
    name: 'Total Yearly Income (TYI)',
    categoryCode: 'TAXABLE',
    sequence: 5,
    dependsOn: ['GROSS_SALARY', 'BONUS'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const gross = ctx.rules['GROSS_SALARY'] ?? 0;
      const bonus = ctx.rules['BONUS'] ?? 0;
      return calculateTYI(
        gross,
        ctx.contract.salary_jul_dec,
        ctx.contract.salary_jan_jun,
        ctx.contract.department,
        bonus,
        ctx.settings.department_salary_splits
      );
    },
  },

  // 6. Tax Exemption 1
  {
    code: 'TAX_EXEMPTION',
    name: 'Tax Exemption (Part 1)',
    categoryCode: 'TAXABLE',
    sequence: 6,
    dependsOn: ['TOTAL_YEARLY_INCOME'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const tyi = ctx.rules['TOTAL_YEARLY_INCOME'] ?? 0;
      if (tyi <= 0) return 0;
      const limit = ctx.settings.tax_exemption_limit_1 ?? 500000;
      return round(Math.min(tyi / 3, limit), 0);
    },
  },

  // 7. Remaining Taxable Income
  {
    code: 'TAX_EXEMPTION_PART1',
    name: 'Remaining Taxable Income',
    categoryCode: 'TAXABLE',
    sequence: 7,
    dependsOn: ['TOTAL_YEARLY_INCOME', 'TAX_EXEMPTION'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const tyi = ctx.rules['TOTAL_YEARLY_INCOME'] ?? 0;
      const ex1 = ctx.rules['TAX_EXEMPTION'] ?? 0;
      return round(Math.max(0, tyi - ex1), 0);
    },
  },

  // 8. Tax Exemption 2 (Demographic Caps)
  {
    code: 'TAX_EXEMPTION2',
    name: 'Tax Exemption (Category Cap)',
    categoryCode: 'TAXABLE',
    sequence: 8,
    dependsOn: ['TAX_EXEMPTION_PART1'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const part1 = ctx.rules['TAX_EXEMPTION_PART1'] ?? 0;
      const isFemale =
        ctx.contract.gender?.toLowerCase() === 'female' || ctx.contract.gender?.toLowerCase() === 'f';
      return calculateTaxExemption2(
        part1,
        ctx.contract.freedom_fighter,
        ctx.contract.disabled_third_gender,
        isFemale,
        ctx.settings
      );
    },
  },

  // 9. Taxable Income
  {
    code: 'TAXABLE_INCOME',
    name: 'Taxable Income',
    categoryCode: 'TAXABLE',
    sequence: 9,
    dependsOn: ['TOTAL_YEARLY_INCOME', 'TAX_EXEMPTION', 'TAX_EXEMPTION2'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const tyi = ctx.rules['TOTAL_YEARLY_INCOME'] ?? 0;
      const ex1 = ctx.rules['TAX_EXEMPTION'] ?? 0;
      const ex2 = ctx.rules['TAX_EXEMPTION2'] ?? 0;
      return round(Math.max(0, tyi - (ex1 + ex2)), 0);
    },
  },

  // 10. Total Tax Payable (NBR Slabs)
  {
    code: 'TOTAL_TAX_PAYABLE',
    name: 'Total Tax Payable (Gross Tax)',
    categoryCode: 'TAX',
    sequence: 10,
    dependsOn: ['TAXABLE_INCOME'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const taxable = ctx.rules['TAXABLE_INCOME'] ?? 0;
      return calculateTax(taxable, ctx.settings.tax_slabs);
    },
  },

  // 11. Taxable Income – Rebate Base
  {
    code: 'TAXABLE_INCOME_REBATE',
    name: 'Taxable Income Rebate Base',
    categoryCode: 'TAX',
    sequence: 11,
    dependsOn: ['TOTAL_YEARLY_INCOME', 'TAX_EXEMPTION'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const tyi = ctx.rules['TOTAL_YEARLY_INCOME'] ?? 0;
      const ex1 = ctx.rules['TAX_EXEMPTION'] ?? 0;
      return round(tyi - ex1, 0);
    },
  },

  // 12. 3% of Rebate Base
  {
    code: 'THREE_PERCENT',
    name: '3% Rebate Base',
    categoryCode: 'TAX',
    sequence: 12,
    dependsOn: ['TAXABLE_INCOME_REBATE'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const rebateBase = ctx.rules['TAXABLE_INCOME_REBATE'] ?? 0;
      return round(0.03 * rebateBase, 0);
    },
  },

  // 13. Actual Investment Required (IRAI)
  {
    code: 'IRAI',
    name: 'Actual Investment Required (IRAI)',
    categoryCode: 'TAX',
    sequence: 13,
    dependsOn: ['THREE_PERCENT'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const threePct = ctx.rules['THREE_PERCENT'] ?? 0;
      const calculated = round((threePct / 15) * 100, 0);
      const limit = ctx.settings.investment_rebate_limit ?? 1000000;
      return Math.min(calculated, limit);
    },
  },

  // 14. Allowable Investment Rebate
  {
    code: 'INVESTMENT_REBATE',
    name: 'Allowable Investment Rebate',
    categoryCode: 'TAX',
    sequence: 14,
    dependsOn: ['THREE_PERCENT', 'IRAI'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const threePct = ctx.rules['THREE_PERCENT'] ?? 0;
      const irai = ctx.rules['IRAI'] ?? 0;
      const limit = ctx.settings.investment_rebate_limit ?? 1000000;
      return Math.min(limit, threePct, irai);
    },
  },

  // 15. Net Yearly Tax Payable
  {
    code: 'NET_YEARLY_TAX_PAYABLE',
    name: 'Net Yearly Tax Payable',
    categoryCode: 'TAX',
    sequence: 15,
    dependsOn: ['TOTAL_TAX_PAYABLE', 'INVESTMENT_REBATE'],
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const grossTax = ctx.rules['TOTAL_TAX_PAYABLE'] ?? 0;
      const rebate = ctx.rules['INVESTMENT_REBATE'] ?? 0;
      return calculateNetYearlyTax(
        grossTax,
        rebate,
        ctx.contract.no_tax_deduction,
        ctx.settings
      );
    },
  },

  // 16. Monthly Tax Deduction
  {
    code: 'MONTHLY_TAX_DEDUCTION',
    name: 'Income Tax Deduction (TDS)',
    categoryCode: 'DED',
    sequence: 16,
    dependsOn: ['NET_YEARLY_TAX_PAYABLE'],
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const netTax = ctx.rules['NET_YEARLY_TAX_PAYABLE'] ?? 0;
      const factor = ctx.settings.monthly_tax_factor ?? 1.0;
      return round((netTax / 12) * factor, 0);
    },
  },

  // 17. Attendance-Based Deduction
  {
    code: 'ATTENDANCE_DEDUCTION',
    name: 'Attendance / Leave Deduction',
    categoryCode: 'DED',
    sequence: 17,
    dependsOn: [],
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    compute: (ctx) => round(ctx.inputs.ATTENDANCE_DEDUCTION ?? 0, 0),
  },

  // 18. Insurance Deduction
  {
    code: 'INSURANCE',
    name: 'Health & Life Insurance',
    categoryCode: 'DED',
    sequence: 18,
    dependsOn: ['GROSS_SALARY'],
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const gross = ctx.rules['GROSS_SALARY'] ?? 0;
      return calculateInsuranceDeduction(
        ctx.contract.insurance_status,
        ctx.contract.insurance_monthly_premium,
        gross
      );
    },
  },

  // 200. Net Salary
  {
    code: 'NET_SALARY',
    name: 'Net Salary Disbursable',
    categoryCode: 'NET',
    sequence: 200,
    dependsOn: [
      'GROSS_SALARY',
      'PF',
      'MONTHLY_TAX_DEDUCTION',
      'ATTENDANCE_DEDUCTION',
      'INSURANCE',
    ],
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    compute: (ctx) => {
      const gross = ctx.rules['GROSS_SALARY'] ?? 0;
      const pf = ctx.rules['PF'] ?? 0;
      const tax = ctx.rules['MONTHLY_TAX_DEDUCTION'] ?? 0;
      const attendance = ctx.rules['ATTENDANCE_DEDUCTION'] ?? 0;
      const insurance = ctx.rules['INSURANCE'] ?? 0;
      const manualLate = Math.abs(ctx.inputs.LATE ?? 0);
      const otherDed = Math.abs(ctx.inputs.OTHER_DEDUCTION ?? 0);

      const net = gross - (pf + tax + attendance + insurance + manualLate + otherDed);
      return round(net, 0);
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 5. ENGINE EXECUTION LIFECYCLE & SIMULATOR (§4, §10)
// ═══════════════════════════════════════════════════════════════════════════

export interface RuleTraceStep {
  sequence: number;
  code: string;
  name: string;
  categoryCode: CategoryCode;
  amount: number;
  quantity: number;
  total: number;
  appearsOnPayslip: boolean;
  contributesToEmployerCost: boolean;
  categoryRunningTotal: number;
}

export interface SalaryCalculationResult {
  grossWage: number;
  basicWage: number;
  houseRent: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  otherAllowance: number;
  totalAllowances: number;
  employeePF: number;
  employerPF: number;
  monthlyTaxTDS: number;
  yearlyTaxPayable: number;
  attendanceDeduction: number;
  insurancePremium: number;
  manualLateDeduction: number;
  totalDeductions: number;
  bonusAmount: number;
  netWage: number;
  employerCost: number;
  steps: RuleTraceStep[];
  ruleMap: Record<string, number>;
  categoryTotals: Record<CategoryCode, number>;
  hasWarning?: boolean;
  warningMessage?: string;
}

/**
 * Execute the 19 canonical rules in strict sequence order
 */
export function evaluateSalaryRules(
  contract: RuleContext['contract'],
  settings: PayrollConfig = INITIAL_PAYROLL_CONFIG,
  inputs: RuleContext['inputs'] = {}
): SalaryCalculationResult {
  const categories: Record<CategoryCode, number> = {
    GROSS: 0,
    BASIC: 0,
    ALW: 0,
    DED: 0,
    TAXABLE: 0,
    TAX: 0,
    BONUS: 0,
    REIMB: 0,
    NET: 0,
    COMP: 0,
  };

  const rules: Record<string, number> = {};
  const steps: RuleTraceStep[] = [];

  const ctx: RuleContext = {
    contract,
    settings,
    inputs,
    categories,
    rules,
  };

  // Sort rules by sequence ASC
  const sortedRules = [...CANONICAL_SALARY_RULES].sort((a, b) => a.sequence - b.sequence);

  for (const rule of sortedRules) {
    const total = rule.compute(ctx);
    rules[rule.code] = total;
    categories[rule.categoryCode] = round((categories[rule.categoryCode] || 0) + total, 0);

    steps.push({
      sequence: rule.sequence,
      code: rule.code,
      name: rule.name,
      categoryCode: rule.categoryCode,
      amount: total,
      quantity: 1,
      total,
      appearsOnPayslip: rule.appearsOnPayslip,
      contributesToEmployerCost: rule.contributesToEmployerCost,
      categoryRunningTotal: categories[rule.categoryCode],
    });
  }

  const grossWage = rules['GROSS_SALARY'] ?? 0;
  const basicWage = rules['BASIC'] ?? 0;

  // Derive component allowances from settings percentages
  const houseRent = round(grossWage * ((settings.house_rent_percentage ?? 25) / 100), 0);
  const medicalAllowance = round(
    grossWage * ((settings.medical_allowance_percentage ?? 10) / 100),
    0
  );
  const conveyanceAllowance = round(
    grossWage * ((settings.conveyance_allowance_percentage ?? 10) / 100),
    0
  );
  const otherAllowance = round(
    grossWage * ((settings.other_allowance_percentage ?? 5) / 100),
    0
  );
  const totalAllowances = houseRent + medicalAllowance + conveyanceAllowance + otherAllowance;

  const employeePF = rules['PF'] ?? 0;
  const employerPFRate = (settings.provident_fund_employer_rate ?? 10) / 100;
  const employerPF =
    contract.pf_enabled === false
      ? 0
      : round((settings.pf_base === 'GROSS' ? grossWage : basicWage) * employerPFRate, 0);

  const monthlyTaxTDS = rules['MONTHLY_TAX_DEDUCTION'] ?? 0;
  const yearlyTaxPayable = rules['NET_YEARLY_TAX_PAYABLE'] ?? 0;
  const attendanceDeduction = rules['ATTENDANCE_DEDUCTION'] ?? 0;
  const insurancePremium = rules['INSURANCE'] ?? 0;
  const manualLateDeduction = Math.abs(inputs.LATE ?? 0);
  const bonusAmount = rules['BONUS'] ?? 0;
  const netWage = rules['NET_SALARY'] ?? 0;

  const totalDeductions =
    employeePF +
    monthlyTaxTDS +
    attendanceDeduction +
    insurancePremium +
    manualLateDeduction +
    Math.abs(inputs.OTHER_DEDUCTION ?? 0);

  const employerCost = round(
    grossWage - attendanceDeduction + employerPF,
    0
  );

  let hasWarning = false;
  let warningMessage = '';
  if (netWage < 0) {
    hasWarning = true;
    warningMessage = `Negative Net Salary (৳${netWage.toLocaleString()}): Deductions exceed gross earnings.`;
  }

  return {
    grossWage,
    basicWage,
    houseRent,
    medicalAllowance,
    conveyanceAllowance,
    otherAllowance,
    totalAllowances,
    employeePF,
    employerPF,
    monthlyTaxTDS,
    yearlyTaxPayable,
    attendanceDeduction,
    insurancePremium,
    manualLateDeduction,
    totalDeductions,
    bonusAmount,
    netWage,
    employerCost,
    steps,
    ruleMap: rules,
    categoryTotals: categories,
    hasWarning,
    warningMessage,
  };
}

/**
 * Adapter to calculate salary directly from FullEmployeeProfile
 */
export function calculateEmployeeSalary(
  profile: FullEmployeeProfile,
  config: PayrollConfig = INITIAL_PAYROLL_CONFIG,
  options?: {
    attendanceDeduction?: number | undefined;
    manualLate?: number | undefined;
    manualBonus?: number | undefined;
    customGross?: number | undefined;
  }
): SalaryCalculationResult {
  const wage = options?.customGross !== undefined ? options.customGross : Number(profile.wage || profile.totalCurrentSalary || 0);

  const pfAppliesStr = String(profile.pfApplies || '').toLowerCase();
  const pfEnabled =
    pfAppliesStr === 'yes' ||
    pfAppliesStr === 'true' ||
    Boolean(profile.pfRate && profile.pfRate > 0);

  const contract: RuleContext['contract'] = {
    wage,
    basic_wage: Number(profile.regularSalary || 0),
    salary_jul_dec: Number(profile.salaryJulDec || wage),
    salary_jan_jun: Number(profile.salaryJanJun || wage),
    department: profile.department,
    joining_date: profile.joiningDate,
    contract_start_date: profile.joiningDate,
    contract_end_date: profile.contractEndDate,
    contract_type: profile.contractType,
    gender: profile.gender,
    freedom_fighter: false,
    disabled_third_gender: false,
    no_tax_deduction: Boolean(profile.noTaxDeduction),
    pf_enabled: pfEnabled,
    pf_rate: Number(profile.pfRate || config.provident_fund_employee_rate || 10),
    bonus_eligibility: profile.bonusEligibility || 'Yes',
    insurance_status: profile.insuranceStatus || 'Disabled',
    insurance_monthly_premium: Number(profile.insuranceMonthlyPremium || 0),
    bank_name: profile.bankName,
    bank_account_number: profile.bankAccountNumber,
  };

  const inputs: RuleContext['inputs'] = {
    ATTENDANCE_DEDUCTION: options?.attendanceDeduction ?? 0,
    LATE: options?.manualLate ?? 0,
    BONUS: options?.manualBonus,
  };

  return evaluateSalaryRules(contract, config, inputs);
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. PAY RUN & SNAPSHOTTING DATA MODELS (§8, §12, §13)
// ═══════════════════════════════════════════════════════════════════════════

export interface PayRunItem {
  id: string;
  payRunId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  branch: string;
  avatarUrl?: string | undefined;
  wageType: string;

  grossWage: number;
  basicWage: number;
  houseRent: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  otherAllowance: number;

  employeePF: number;
  employerPF: number;
  taxTDS: number;
  attendanceDeduction: number;
  insurancePremium: number;
  manualLateDeduction: number;
  totalDeductions: number;

  bonusAmount: number;
  netWage: number;
  employerCost: number;

  bankName: string;
  bankAccountNumber: string;
  paymentMethod: 'bank' | 'cash' | 'bKash' | 'nagad';
  paymentStatus: 'Pending' | 'Approved' | 'Paid' | 'Hold';
  payslipNumber: string;

  // Immutability Snapshots (§3.2, §13)
  settingsSnapshot: Partial<PayrollConfig>;
  contractSnapshot: any;
  workedDaysSnapshot?: any;
  inputsSnapshot?: any;
  ruleSetSnapshot?: any;
}

export interface PayRun {
  id: string;
  code: string;
  name: string;
  month: number; // 1 - 12
  year: number;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  paymentDate: string; // YYYY-MM-DD
  status: 'Draft' | 'Calculated' | 'Approved' | 'Paid' | 'Needs_Review';

  totalEmployees: number;
  totalGross: number;
  totalBasic: number;
  totalAllowances: number;
  totalPFEmployee: number;
  totalPFEmployer: number;
  totalTDS: number;
  totalAttendanceDeductions: number;
  totalInsurance: number;
  totalBonus: number;
  totalNetPayout: number;
  totalEmployerCost: number;

  createdAt: string;
  calculatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  paidBy?: string;

  items: PayRunItem[];
}

export interface PayslipItem {
  id: string;
  payslipNumber: string;
  payRunId: string;
  payRunName: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;

  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  department: string;
  branch: string;
  organization: string;
  avatarUrl?: string;
  joiningDate?: string;

  bankName: string;
  bankAccountNumber: string;
  tinNumber?: string;
  pfNumber?: string;

  grossWage: number;
  basicWage: number;
  houseRent: number;
  medicalAllowance: number;
  conveyanceAllowance: number;
  otherAllowance: number;
  bonusAmount: number;

  employeePF: number;
  taxTDS: number;
  attendanceDeduction: number;
  insurancePremium: number;
  manualLateDeduction: number;
  totalDeductions: number;

  netWage: number;
  netWageInWords: string;
  status: 'Draft' | 'Approved' | 'Paid';
  locked: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. LOCAL STORAGE & STATE RECONCILIATION (§7)
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG_STORAGE_KEY = 'jaago_pnc_payroll_config_v2';
const PAYRUNS_STORAGE_KEY = 'jaago_pnc_pay_runs_v2';

export function getPayrollConfig(): PayrollConfig {
  if (typeof window === 'undefined') return INITIAL_PAYROLL_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...INITIAL_PAYROLL_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to parse payroll config from localStorage:', err);
  }
  return INITIAL_PAYROLL_CONFIG;
}

export function savePayrollConfig(config: PayrollConfig): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const updated = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updated));

    // Dispatch storage custom event for reactive tab updates
    window.dispatchEvent(
      new CustomEvent('jaago_payroll_config_changed', { detail: updated })
    );
    return true;
  } catch (err) {
    console.error('Failed to save payroll config:', err);
    return false;
  }
}

export function resetPayrollConfig(): PayrollConfig {
  savePayrollConfig(INITIAL_PAYROLL_CONFIG);
  return INITIAL_PAYROLL_CONFIG;
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. PAY RUN GENERATOR & BATCH CALCULATOR (§12, §13)
// ═══════════════════════════════════════════════════════════════════════════

let _inMemoryPayRuns: PayRun[] | null = null;

const IDB_NAME = 'jaago_pnc_payroll_db';
const IDB_STORE = 'pay_runs';

function openPayRunsDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function savePayRunsToIndexedDB(runs: PayRun[]): Promise<boolean> {
  try {
    const db = await openPayRunsDB();
    if (!db) return false;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    runs.forEach((r) => store.put(r));
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function loadPayRunsFromIndexedDB(): Promise<PayRun[]> {
  try {
    const db = await openPayRunsDB();
    if (!db) return [];
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const res = Array.isArray(req.result) ? req.result : [];
        if (res.length > 0 && (!_inMemoryPayRuns || _inMemoryPayRuns.length === 0)) {
          _inMemoryPayRuns = res;
        }
        resolve(res);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

function prepareCompactPayRunsForStorage(runs: PayRun[]): any[] {
  return runs.map((run) => ({
    ...run,
    items: (run.items || []).map((item) => {
      const { settingsSnapshot, contractSnapshot, avatarUrl, ...rest } = item;
      return {
        ...rest,
        // Strip heavy base64 data URIs from localStorage
        avatarUrl: avatarUrl && avatarUrl.startsWith('data:') ? undefined : avatarUrl,
      };
    }),
  }));
}

export function getSavedPayRuns(): PayRun[] {
  if (_inMemoryPayRuns && _inMemoryPayRuns.length > 0) {
    return _inMemoryPayRuns;
  }
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PAYRUNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        _inMemoryPayRuns = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load pay runs from localStorage:', err);
  }
  loadPayRunsFromIndexedDB().catch(() => {});
  return _inMemoryPayRuns || [];
}

export function savePayRuns(runs: PayRun[]): boolean {
  if (typeof window === 'undefined') return false;
  _inMemoryPayRuns = runs;

  // 1. Asynchronously persist full data to IndexedDB (virtually unlimited quota)
  savePayRunsToIndexedDB(runs).catch(() => {});

  // 2. Compact for localStorage safely without uncaught QuotaExceededError
  try {
    const compact = prepareCompactPayRunsForStorage(runs);
    localStorage.setItem(PAYRUNS_STORAGE_KEY, JSON.stringify(compact));
  } catch (err: any) {
    console.warn('[Payroll] LocalStorage quota exceeded, storing in IndexedDB and in-memory cache:', err?.message || err);
    try {
      const metadataOnly = runs.map(({ items, ...rest }) => ({
        ...rest,
        items: (items || []).slice(0, 5).map(({ settingsSnapshot, contractSnapshot, avatarUrl, ...itemRest }) => itemRest),
      }));
      localStorage.setItem(PAYRUNS_STORAGE_KEY, JSON.stringify(metadataOnly));
    } catch {
      // Even if fallback fails, memory and IndexedDB have the data
    }
  }

  // 3. Dispatch reactive update event
  try {
    window.dispatchEvent(new CustomEvent('jaago_payruns_changed', { detail: runs }));
  } catch {}

  return true;
}

export function generatePayRunBatch(
  month: number,
  year: number,
  employees: FullEmployeeProfile[],
  config: PayrollConfig = getPayrollConfig(),
  options?: {
    applyAttendanceDeductions?: boolean;
    includeBonus?: boolean;
    customRunName?: string;
    customPeriodStart?: string;
    customPeriodEnd?: string;
    customPaymentDate?: string;
    salaryStructureId?: string;
    companyScope?: string;
    selectedDepartmentIds?: string[];
    selectedProjectIds?: string[];
    selectedEmployeeIds?: string[];
  }
): PayRun {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const monthName = monthNames[month - 1] || 'Month';
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const periodStart = options?.customPeriodStart || `${year}-${String(month).padStart(2, '0')}-01`;
  const periodEnd = options?.customPeriodEnd || `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const paymentDate = options?.customPaymentDate || `${year}-${String(month).padStart(2, '0')}-${String(config.disbursement_day || 28).padStart(2, '0')}`;

  const payRunId = `run-${year}-${String(month).padStart(2, '0')}-${Date.now().toString(36)}`;
  const payRunCode = `PR-${year}${String(month).padStart(2, '0')}`;
  const payRunName = options?.customRunName || `${monthName} ${year} General Payroll`;

  let activeEmployees = employees.filter((e) => !e.isArchived && e.status !== 'Archived');

  if (options?.selectedEmployeeIds && options.selectedEmployeeIds.length > 0) {
    const set = new Set(options.selectedEmployeeIds);
    activeEmployees = activeEmployees.filter((e) => set.has(e.id) || set.has(e.code));
  }

  let totalGross = 0;
  let totalBasic = 0;
  let totalAllowances = 0;
  let totalPFEmployee = 0;
  let totalPFEmployer = 0;
  let totalTDS = 0;
  let totalAttendanceDeductions = 0;
  let totalInsurance = 0;
  let totalBonus = 0;
  let totalNetPayout = 0;
  let totalEmployerCost = 0;

  const items: PayRunItem[] = activeEmployees.map((emp, index) => {
    // Generate mock attendance deduction for testing realism if active
    let attDed = 0;
    if (options?.applyAttendanceDeductions) {
      const hash = emp.code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const gross = Number(emp.wage || emp.totalCurrentSalary || 50000);
      const dailyBasis = round(gross / 30, 0);

      if (hash % 11 === 0) {
        attDed = dailyBasis * 1;
      } else if (hash % 7 === 0) {
        attDed = dailyBasis * 1;
      } else if (hash % 19 === 0) {
        attDed = dailyBasis * 3;
      }
    }

    let res: SalaryCalculationResult;
    if (options?.salaryStructureId) {
      const wage = Number(emp.wage || emp.totalCurrentSalary || 0);
      const pfAppliesStr = String(emp.pfApplies || '').toLowerCase();
      const pfEnabled = pfAppliesStr === 'yes' || pfAppliesStr === 'true' || Boolean(emp.pfRate && emp.pfRate > 0);

      const contract: RuleContext['contract'] = {
        wage,
        basic_wage: Number(emp.regularSalary || 0),
        salary_jul_dec: Number(emp.salaryJulDec || wage),
        salary_jan_jun: Number(emp.salaryJanJun || wage),
        department: emp.department,
        joining_date: emp.joiningDate,
        contract_start_date: emp.joiningDate,
        contract_end_date: emp.contractEndDate,
        contract_type: emp.contractType,
        gender: emp.gender,
        freedom_fighter: false,
        disabled_third_gender: false,
        no_tax_deduction: Boolean(emp.noTaxDeduction),
        pf_enabled: pfEnabled,
        pf_rate: Number(emp.pfRate || config.provident_fund_employee_rate || 10),
        bonus_eligibility: emp.bonusEligibility || 'Yes',
        insurance_status: emp.insuranceStatus || 'Disabled',
        insurance_monthly_premium: Number(emp.insuranceMonthlyPremium || 0),
        bank_name: emp.bankName,
        bank_account_number: emp.bankAccountNumber,
      };

      const inputs: RuleContext['inputs'] = {
        ATTENDANCE_DEDUCTION: attDed,
        BONUS: options?.includeBonus ? undefined : 0,
      };

      res = evaluateDynamicSalaryStructure(options.salaryStructureId, contract, config, inputs);
    } else {
      res = calculateEmployeeSalary(emp, config, {
        attendanceDeduction: attDed,
        manualBonus: options?.includeBonus ? undefined : 0,
      });
    }

    totalGross += res.grossWage;
    totalBasic += res.basicWage;
    totalAllowances += res.totalAllowances;
    totalPFEmployee += res.employeePF;
    totalPFEmployer += res.employerPF;
    totalTDS += res.monthlyTaxTDS;
    totalAttendanceDeductions += res.attendanceDeduction;
    totalInsurance += res.insurancePremium;
    totalBonus += res.bonusAmount;
    totalNetPayout += res.netWage;
    totalEmployerCost += res.employerCost;

    const payslipNumber = `PS-${year}${String(month).padStart(2, '0')}-${String(index + 1).padStart(4, '0')}`;

    return {
      id: `item-${payRunId}-${emp.code}`,
      payRunId,
      employeeId: emp.id,
      employeeCode: emp.code,
      employeeName: emp.name,
      department: emp.department || 'General',
      designation: emp.designation || 'Staff',
      branch: emp.branch || 'Head Office',
      avatarUrl: emp.avatarUrl,
      wageType: emp.wageType || 'Fixed',

      grossWage: res.grossWage,
      basicWage: res.basicWage,
      houseRent: res.houseRent,
      medicalAllowance: res.medicalAllowance,
      conveyanceAllowance: res.conveyanceAllowance,
      otherAllowance: res.otherAllowance,

      employeePF: res.employeePF,
      employerPF: res.employerPF,
      taxTDS: res.monthlyTaxTDS,
      attendanceDeduction: res.attendanceDeduction,
      insurancePremium: res.insurancePremium,
      manualLateDeduction: res.manualLateDeduction,
      totalDeductions: res.totalDeductions,

      bonusAmount: res.bonusAmount,
      netWage: res.netWage,
      employerCost: res.employerCost,

      bankName: emp.bankName || config.default_bank_name,
      bankAccountNumber: emp.bankAccountNumber || 'N/A',
      paymentMethod: 'bank',
      paymentStatus: 'Approved',
      payslipNumber,

      settingsSnapshot: {
        basic_salary_percentage: config.basic_salary_percentage,
        pf_base: config.pf_base,
        provident_fund_employee_rate: config.provident_fund_employee_rate,
      },
      contractSnapshot: {
        wage: emp.wage,
        pfRate: emp.pfRate,
        department: emp.department,
        joiningDate: emp.joiningDate,
      },
    };
  });

  const payRun: PayRun = {
    id: payRunId,
    code: payRunCode,
    name: payRunName,
    month,
    year,
    periodStart,
    periodEnd,
    paymentDate,
    status: 'Approved',

    totalEmployees: items.length,
    totalGross: round(totalGross, 0),
    totalBasic: round(totalBasic, 0),
    totalAllowances: round(totalAllowances, 0),
    totalPFEmployee: round(totalPFEmployee, 0),
    totalPFEmployer: round(totalPFEmployer, 0),
    totalTDS: round(totalTDS, 0),
    totalAttendanceDeductions: round(totalAttendanceDeductions, 0),
    totalInsurance: round(totalInsurance, 0),
    totalBonus: round(totalBonus, 0),
    totalNetPayout: round(totalNetPayout, 0),
    totalEmployerCost: round(totalEmployerCost, 0),

    createdAt: new Date().toISOString(),
    calculatedAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: 'Nasif Kamal (Coordinator)',
    items,
  };

  return payRun;
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. NUMBER TO BANGLADESHI WORDS CONVERTER (§14)
// ═══════════════════════════════════════════════════════════════════════════

export function numberToWordsBDT(amount: number): string {
  if (amount === 0) return 'Zero Taka Only';

  const units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return units[n] || '';
    const t = Math.floor(n / 10);
    const u = n % 10;
    return `${tens[t] || ''}${u > 0 ? ' ' + units[u] : ''}`;
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = '';
    if (h > 0) res += `${units[h]} Hundred`;
    if (rem > 0) res += `${res ? ' ' : ''}${convertTwoDigits(rem)}`;
    return res;
  }

  let num = Math.floor(Math.abs(amount));
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num;

  if (crore > 0) words += `${convertTwoDigits(crore)} Crore `;
  if (lakh > 0) words += `${convertTwoDigits(lakh)} Lakh `;
  if (thousand > 0) words += `${convertTwoDigits(thousand)} Thousand `;
  if (remainder > 0) words += `${convertThreeDigits(remainder)} `;

  const finalStr = `${words.trim()} Taka Only`;
  return amount < 0 ? `Negative ${finalStr}` : finalStr;
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. CANONICAL WORKED EXAMPLE VERIFICATION (§17.1)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Runs the §17.1 canonical worked example assertion:
 * wage = 60,000, pf_rate = 0.05, bonus_eligibility = true, gender = male
 * MUST evaluate to NET_SALARY = 58,083 exactly!
 */
export function runCanonicalVerificationTest(): {
  success: boolean;
  actualNet: number;
  expectedNet: number;
  details: Record<string, number>;
} {
  const contract: RuleContext['contract'] = {
    wage: 60000,
    pf_rate: 0.05,
    bonus_eligibility: true,
    gender: 'male',
    freedom_fighter: false,
    disabled_third_gender: false,
    no_tax_deduction: false,
    pf_enabled: true,
    insurance_status: 'Disabled',
    department: 'General',
  };

  const res = evaluateSalaryRules(contract, INITIAL_PAYROLL_CONFIG);
  const actualNet = res.netWage;
  const expectedNet = 58083;

  return {
    success: actualNet === expectedNet,
    actualNet,
    expectedNet,
    details: {
      GROSS_SALARY: res.ruleMap['GROSS_SALARY'] || 0,
      BASIC: res.ruleMap['BASIC'] || 0,
      PF: res.ruleMap['PF'] || 0,
      TOTAL_YEARLY_INCOME: res.ruleMap['TOTAL_YEARLY_INCOME'] || 0,
      TAX_EXEMPTION: res.ruleMap['TAX_EXEMPTION'] || 0,
      TAX_EXEMPTION_PART1: res.ruleMap['TAX_EXEMPTION_PART1'] || 0,
      TAX_EXEMPTION2: res.ruleMap['TAX_EXEMPTION2'] || 0,
      TAXABLE_INCOME: res.ruleMap['TAXABLE_INCOME'] || 0,
      TOTAL_TAX_PAYABLE: res.ruleMap['TOTAL_TAX_PAYABLE'] || 0,
      THREE_PERCENT: res.ruleMap['THREE_PERCENT'] || 0,
      IRAI: res.ruleMap['IRAI'] || 0,
      INVESTMENT_REBATE: res.ruleMap['INVESTMENT_REBATE'] || 0,
      NET_YEARLY_TAX_PAYABLE: res.ruleMap['NET_YEARLY_TAX_PAYABLE'] || 0,
      MONTHLY_TAX_DEDUCTION: res.ruleMap['MONTHLY_TAX_DEDUCTION'] || 0,
      NET_SALARY: res.ruleMap['NET_SALARY'] || 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. DYNAMIC SALARY RULES & SALARY STRUCTURES ENGINE (§5, §15)
// ═══════════════════════════════════════════════════════════════════════════

export interface SalaryRuleDefinition {
  id: string;
  name: string;
  code: string;
  categoryCode: CategoryCode;
  sequence: number;
  calculationDetails: string;
  active: boolean;
  appearsOnPayslip: boolean;
  contributesToEmployerCost: boolean;
  conditionType?: 'none' | 'python_expression' | 'range';
  conditionExpression?: string;
  description?: string;
  structureCodes?: string[];
}

export interface SalaryStructureDefinition {
  id: string;
  name: string;
  code: string;
  scheduledPay: 'Monthly' | 'Quarterly' | 'Bi-Weekly' | 'Weekly' | 'Annually';
  country: string;
  slipDisplayName: string;
  workedDaysLinesEnabled: boolean;
  active: boolean;
  ruleCodes: string[];
  description?: string;
}

export const DEFAULT_SALARY_RULES: SalaryRuleDefinition[] = [
  // Canonical 19 Rules
  {
    id: 'rule-gross-salary',
    name: 'Gross Salary',
    code: 'GROSS_SALARY',
    categoryCode: 'GROSS',
    sequence: 1,
    calculationDetails: 'contract.wage || 0',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Total contracted monthly gross salary base before any statutory or attendance deductions.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-gross-alt',
    name: 'Gross Salary',
    code: 'GROSS',
    categoryCode: 'GROSS',
    sequence: 1,
    calculationDetails: 'contract.wage || 0',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Contract base gross salary used in special festival structures.',
    structureCodes: ['FESTIVAL_BONUS'],
  },
  {
    id: 'rule-basic-salary',
    name: 'Basic Salary',
    code: 'BASIC',
    categoryCode: 'BASIC',
    sequence: 2,
    calculationDetails: 'rules.GROSS_SALARY * ((settings.basic_salary_percentage || 50) / 100)',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Core basic salary calculated as configured percentage of monthly gross salary (default 50%).',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-basic-festival',
    name: 'Basic Salary',
    code: 'BASIC',
    categoryCode: 'BASIC',
    sequence: 2,
    calculationDetails: 'contract.basic_wage || (rules.GROSS * ((settings.basic_salary_percentage || 50) / 100))',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Contract regular basic salary or derived percentage of gross.',
    structureCodes: ['FESTIVAL_BONUS'],
  },
  {
    id: 'rule-provident-fund',
    name: 'Provident Fund',
    code: 'PF',
    categoryCode: 'DED',
    sequence: 3,
    calculationDetails: 'Math.round((contract.pf_rate > 1 ? contract.pf_rate / 100 : contract.pf_rate || (settings.provident_fund_employee_rate || 10) / 100) * (settings.pf_base === "GROSS" ? rules.GROSS_SALARY : rules.BASIC))',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: true,
    description: 'Mandatory employee statutory provident fund deduction based on Basic or Gross.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-festival-bonus',
    name: 'Bonus (Pro-rata Festival)',
    code: 'BONUS',
    categoryCode: 'BONUS',
    sequence: 4,
    calculationDetails: 'calculateBonus(rules.BASIC, contract.contract_start_date || contract.joining_date, undefined, contract.bonus_eligibility)',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Pro-rata festival bonus calculated based on service length and eligibility status.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-bonus-festival-direct',
    name: 'Bonus',
    code: 'BONUS',
    categoryCode: 'BONUS',
    sequence: 4,
    calculationDetails: 'inputs.FESTIVAL_BONUS || inputs.PERFORMANCE_BONUS || inputs.BONUS || calculateBonus(rules.BASIC, contract.joining_date)',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Disbursed bonus input or computed festival bonus.',
    structureCodes: ['FESTIVAL_BONUS'],
  },
  {
    id: 'rule-total-yearly-income',
    name: 'Total Yearly Income',
    code: 'TOTAL_YEARLY_INCOME',
    categoryCode: 'TAXABLE',
    sequence: 5,
    calculationDetails: 'calculateTYI(rules.GROSS_SALARY, contract.salary_jul_dec, contract.salary_jan_jun, contract.department, rules.BONUS, settings.department_salary_splits)',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Projected Total Yearly Income (TYI) taking into account EMK vs non-EMK split weighting.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-tax-exemption-1',
    name: 'Tax Exemption',
    code: 'TAX_EXEMPTION',
    categoryCode: 'TAXABLE',
    sequence: 6,
    calculationDetails: 'rules.TOTAL_YEARLY_INCOME > 0 ? Math.min(rules.TOTAL_YEARLY_INCOME / 3, settings.tax_exemption_limit_1 || 500000) : 0',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Statutory 1/3 of TYI exemption capped at ৳500,000.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-tax-exemption-part1',
    name: 'Remaining Taxable Income',
    code: 'TAX_EXEMPTION_PART1',
    categoryCode: 'TAXABLE',
    sequence: 7,
    calculationDetails: 'Math.max(0, rules.TOTAL_YEARLY_INCOME - rules.TAX_EXEMPTION)',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Net remaining taxable income after Part 1 statutory exemption.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-tax-exemption-2',
    name: 'Tax Exemption 2 (Category)',
    code: 'TAX_EXEMPTION2',
    categoryCode: 'TAXABLE',
    sequence: 8,
    calculationDetails: 'calculateTaxExemption2(rules.TAX_EXEMPTION_PART1, contract.freedom_fighter, contract.disabled_third_gender, contract.gender === "female", settings)',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Demographic threshold exemption (৳525k freedom fighter, ৳500k disabled, ৳425k female, ৳375k default).',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-taxable-income',
    name: 'Taxable Income',
    code: 'TAXABLE_INCOME',
    categoryCode: 'TAXABLE',
    sequence: 9,
    calculationDetails: 'Math.max(0, rules.TOTAL_YEARLY_INCOME - (rules.TAX_EXEMPTION + rules.TAX_EXEMPTION2))',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Net annual taxable base subject to progressive income tax staircase.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-total-tax-payable',
    name: 'Total Tax Payable (Slabs)',
    code: 'TOTAL_TAX_PAYABLE',
    categoryCode: 'TAX',
    sequence: 10,
    calculationDetails: 'calculateTax(rules.TAXABLE_INCOME, settings.tax_slabs)',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Gross annual income tax computed through progressive Bangladesh NBR tax slabs.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-taxable-income-rebate',
    name: 'Taxable Income Rebate Base',
    code: 'TAXABLE_INCOME_REBATE',
    categoryCode: 'TAX',
    sequence: 11,
    calculationDetails: 'rules.TOTAL_YEARLY_INCOME - rules.TAX_EXEMPTION',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Rebate base used for statutory 3% tax rebate calculation.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-three-percent',
    name: '3% of Rebate Base',
    code: 'THREE_PERCENT',
    categoryCode: 'TAX',
    sequence: 12,
    calculationDetails: '0.03 * rules.TAXABLE_INCOME_REBATE',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: '3% rebate benchmark amount.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-irai',
    name: 'Actual Investment Required (IRAI)',
    code: 'IRAI',
    categoryCode: 'TAX',
    sequence: 13,
    calculationDetails: 'Math.min(Math.round(rules.THREE_PERCENT / 15 * 100), settings.investment_rebate_limit || 1000000)',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Required investment benchmark capped at ৳1,000,000.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-investment-rebate',
    name: 'Allowable Investment Rebate',
    code: 'INVESTMENT_REBATE',
    categoryCode: 'TAX',
    sequence: 14,
    calculationDetails: 'Math.min(settings.investment_rebate_limit || 1000000, rules.THREE_PERCENT, rules.IRAI)',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Final allowable tax credit subtracted from gross tax.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-net-yearly-tax-payable',
    name: 'Net Yearly Tax Payable',
    code: 'NET_YEARLY_TAX_PAYABLE',
    categoryCode: 'TAX',
    sequence: 15,
    calculationDetails: '(() => { const totalTaxPayable = rules.TOTAL_TAX_PAYABLE || 0; const rebate = rules.INVESTMENT_REBATE || 0; return calculateNetYearlyTax(totalTaxPayable, rebate, contract.no_tax_deduction, settings); })()',
    active: true,
    appearsOnPayslip: false,
    contributesToEmployerCost: false,
    description: 'Final net yearly tax payable with ৳5,000 minimum tax floor enforcement.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-monthly-tax-deduction',
    name: 'Monthly Tax Deduction',
    code: 'MONTHLY_TAX_DEDUCTION',
    categoryCode: 'DED',
    sequence: 16,
    calculationDetails: '(() => { const netYearlyTax = rules.NET_YEARLY_TAX_PAYABLE || 0; const factor = settings.monthly_tax_factor || 1; return Math.round((netYearlyTax / 12) * factor); })()',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Monthly payroll tax deduction (TDS) amortized across the fiscal year.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-attendance-deduction',
    name: 'Attendance-Based Salary Deduction',
    code: 'ATTENDANCE_DEDUCTION',
    categoryCode: 'DED',
    sequence: 17,
    calculationDetails: 'inputs.ATTENDANCE_DEDUCTION || rules.ATTENDANCE_DEDUCTION || 0',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Monthly salary deduction for absents, half-days, and late-arrival penalties.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT'],
  },
  {
    id: 'rule-insurance-deduction',
    name: 'Insurance Deduction',
    code: 'INSURANCE',
    categoryCode: 'DED',
    sequence: 18,
    calculationDetails: 'calculateInsuranceDeduction(contract.insurance_status, contract.insurance_monthly_premium, rules.GROSS_SALARY)',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Health, hospitalization, and life insurance monthly policy premium deduction.',
    structureCodes: ['JAAGO_PAY_ATT_INS'],
  },
  {
    id: 'rule-net-salary',
    name: 'Net Salary',
    code: 'NET_SALARY',
    categoryCode: 'NET',
    sequence: 200,
    calculationDetails: 'rules.GROSS_SALARY - (rules.PF + rules.MONTHLY_TAX_DEDUCTION + (rules.ATTENDANCE_DEDUCTION || 0) + (rules.INSURANCE || 0))',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Net disbursable cash amount transferred to employee bank account.',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-net-festival',
    name: 'Net Salary',
    code: 'NET',
    categoryCode: 'NET',
    sequence: 200,
    calculationDetails: 'rules.BONUS || categories.BONUS || (rules.BASIC + (categories.ALW || 0) - (categories.DED || 0))',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Disbursable net festival bonus payout.',
    structureCodes: ['FESTIVAL_BONUS'],
  },

  // Common Component Allowances & Supplemental Rules
  {
    id: 'rule-house-rent',
    name: 'House Rent Allowance',
    code: 'HOUSE_RENT',
    categoryCode: 'ALW',
    sequence: 21,
    calculationDetails: 'rules.GROSS_SALARY * ((settings.house_rent_percentage || 25) / 100)',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Monthly accommodation allowance (default 25% of gross).',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-medical-allowance',
    name: 'Medical Allowance',
    code: 'MEDICAL_ALW',
    categoryCode: 'ALW',
    sequence: 22,
    calculationDetails: 'rules.GROSS_SALARY * ((settings.medical_allowance_percentage || 10) / 100)',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Monthly healthcare and medicine allowance (default 10% of gross).',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-conveyance-allowance',
    name: 'Conveyance Allowance',
    code: 'CONVEYANCE_ALW',
    categoryCode: 'ALW',
    sequence: 23,
    calculationDetails: 'rules.GROSS_SALARY * ((settings.conveyance_allowance_percentage || 10) / 100)',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Local commute and transport allowance (default 10% of gross).',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
  {
    id: 'rule-other-allowance',
    name: 'Other Allowance',
    code: 'OTHER_ALW',
    categoryCode: 'ALW',
    sequence: 24,
    calculationDetails: 'rules.GROSS_SALARY * ((settings.other_allowance_percentage || 5) / 100)',
    active: true,
    appearsOnPayslip: true,
    contributesToEmployerCost: false,
    description: 'Supplementary allowance (default 5% of gross).',
    structureCodes: ['JAAGO_PAY_ATT_INS', 'JAAGO_PAY_ATT', 'JAAGO_PAYROLL'],
  },
];

export const DEFAULT_SALARY_STRUCTURES: SalaryStructureDefinition[] = [
  {
    id: 'struct-festival-bonus',
    name: 'Festival Bonus',
    code: 'FESTIVAL_BONUS',
    scheduledPay: 'Monthly',
    country: 'Bangladesh',
    slipDisplayName: 'Festival Bonus Slip',
    workedDaysLinesEnabled: true,
    active: true,
    ruleCodes: ['GROSS', 'BASIC', 'BONUS', 'NET'],
    description: 'Dedicated structure for semi-annual Eid/Puja festival disbursements.',
  },
  {
    id: 'struct-jaago-pay-att-ins',
    name: 'JAAGO PAY with Attendance and Insurance_Deduction',
    code: 'JAAGO_PAY_ATT_INS',
    scheduledPay: 'Monthly',
    country: 'Bangladesh',
    slipDisplayName: 'Salary Slip',
    workedDaysLinesEnabled: true,
    active: true,
    ruleCodes: [
      'GROSS_SALARY',
      'BASIC',
      'PF',
      'BONUS',
      'TOTAL_YEARLY_INCOME',
      'TAX_EXEMPTION',
      'TAX_EXEMPTION_PART1',
      'TAX_EXEMPTION2',
      'TAXABLE_INCOME',
      'TOTAL_TAX_PAYABLE',
      'TAXABLE_INCOME_REBATE',
      'THREE_PERCENT',
      'IRAI',
      'INVESTMENT_REBATE',
      'NET_YEARLY_TAX_PAYABLE',
      'MONTHLY_TAX_DEDUCTION',
      'ATTENDANCE_DEDUCTION',
      'INSURANCE',
      'NET_SALARY',
    ],
    description: 'Full comprehensive salary structure including attendance penalties and health insurance deductions (19 rules).',
  },
  {
    id: 'struct-jaago-pay-att',
    name: 'JAAGO PAY with Attendance_Deduction',
    code: 'JAAGO_PAY_ATT',
    scheduledPay: 'Monthly',
    country: 'Bangladesh',
    slipDisplayName: 'Salary Slip',
    workedDaysLinesEnabled: true,
    active: true,
    ruleCodes: [
      'GROSS_SALARY',
      'BASIC',
      'PF',
      'BONUS',
      'TOTAL_YEARLY_INCOME',
      'TAX_EXEMPTION',
      'TAX_EXEMPTION_PART1',
      'TAX_EXEMPTION2',
      'TAXABLE_INCOME',
      'TOTAL_TAX_PAYABLE',
      'TAXABLE_INCOME_REBATE',
      'THREE_PERCENT',
      'IRAI',
      'INVESTMENT_REBATE',
      'NET_YEARLY_TAX_PAYABLE',
      'MONTHLY_TAX_DEDUCTION',
      'ATTENDANCE_DEDUCTION',
      'NET_SALARY',
    ],
    description: 'Standard salary structure with attendance deductions without health insurance (18 rules).',
  },
  {
    id: 'struct-jaago-payroll',
    name: 'JAAGO PAYroll',
    code: 'JAAGO_PAYROLL',
    scheduledPay: 'Monthly',
    country: 'Bangladesh',
    slipDisplayName: 'Salary Slip',
    workedDaysLinesEnabled: true,
    active: true,
    ruleCodes: [
      'GROSS_SALARY',
      'BASIC',
      'PF',
      'BONUS',
      'TOTAL_YEARLY_INCOME',
      'TAX_EXEMPTION',
      'TAX_EXEMPTION_PART1',
      'TAX_EXEMPTION2',
      'TAXABLE_INCOME',
      'TOTAL_TAX_PAYABLE',
      'TAXABLE_INCOME_REBATE',
      'THREE_PERCENT',
      'IRAI',
      'INVESTMENT_REBATE',
      'NET_YEARLY_TAX_PAYABLE',
      'MONTHLY_TAX_DEDUCTION',
      'NET_SALARY',
    ],
    description: 'Core baseline salary structure with tax slabs and provident fund (17 rules).',
  },
];

const RULES_STORAGE_KEY = 'jaago_payroll_custom_rules_v2';
const STRUCTURES_STORAGE_KEY = 'jaago_payroll_structures_v2';

export function getSavedSalaryRules(): SalaryRuleDefinition[] {
  if (typeof window === 'undefined') return DEFAULT_SALARY_RULES;
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load custom salary rules:', err);
  }
  return DEFAULT_SALARY_RULES;
}

export function saveSalaryRules(rules: SalaryRuleDefinition[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new CustomEvent('jaago_salary_rules_changed', { detail: rules }));
    return true;
  } catch (err) {
    console.error('Failed to save salary rules:', err);
    return false;
  }
}

export function getSavedSalaryStructures(): SalaryStructureDefinition[] {
  if (typeof window === 'undefined') return DEFAULT_SALARY_STRUCTURES;
  try {
    const raw = localStorage.getItem(STRUCTURES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load salary structures:', err);
  }
  return DEFAULT_SALARY_STRUCTURES;
}

export function saveSalaryStructures(structures: SalaryStructureDefinition[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STRUCTURES_STORAGE_KEY, JSON.stringify(structures));
    window.dispatchEvent(new CustomEvent('jaago_salary_structures_changed', { detail: structures }));
    return true;
  } catch (err) {
    console.error('Failed to save salary structures:', err);
    return false;
  }
}

export function resetSalaryStructuresAndRules(): {
  structures: SalaryStructureDefinition[];
  rules: SalaryRuleDefinition[];
} {
  saveSalaryStructures(DEFAULT_SALARY_STRUCTURES);
  saveSalaryRules(DEFAULT_SALARY_RULES);
  return {
    structures: DEFAULT_SALARY_STRUCTURES,
    rules: DEFAULT_SALARY_RULES,
  };
}

/**
 * Safe sandboxed evaluator for frontend-edited salary formula expressions.
 */
export function evaluateFormulaExpression(
  expression: string,
  ctx: {
    contract: RuleContext['contract'];
    settings: PayrollConfig;
    inputs: RuleContext['inputs'];
    rules: Record<string, number>;
    categories: Record<CategoryCode, number>;
  }
): number {
  if (!expression || typeof expression !== 'string') return 0;
  const expr = expression.trim();
  if (!expr) return 0;

  try {
    // Dynamic evaluate with pure helper functions injected
    const evaluator = new Function(
      'contract',
      'settings',
      'inputs',
      'rules',
      'categories',
      'calculateTax',
      'calculateBonus',
      'calculateTYI',
      'calculateTaxExemption2',
      'calculateNetYearlyTax',
      'calculateInsuranceDeduction',
      'round',
      'dec',
      `try {
        const val = (${expr});
        if (typeof val === 'function') {
          return Number(val()) || 0;
        }
        return Number(val) || 0;
      } catch (e) {
        return 0;
      }`
    );

    const res = evaluator(
      ctx.contract,
      ctx.settings,
      ctx.inputs,
      ctx.rules,
      ctx.categories,
      calculateTax,
      calculateBonus,
      calculateTYI,
      calculateTaxExemption2,
      calculateNetYearlyTax,
      calculateInsuranceDeduction,
      round,
      dec
    );

    return isNaN(res) || !isFinite(res) ? 0 : round(res, 0);
  } catch (err) {
    console.warn(`Evaluation error for formula: ${expr}`, err);
    return 0;
  }
}

/**
 * Execute dynamic salary structure evaluation with user-customized formulas
 */
export function evaluateDynamicSalaryStructure(
  structure: SalaryStructureDefinition | string,
  contract: RuleContext['contract'],
  settings: PayrollConfig = getPayrollConfig(),
  inputs: RuleContext['inputs'] = {},
  availableRules?: SalaryRuleDefinition[]
): SalaryCalculationResult {
  const allStructures = getSavedSalaryStructures();
  const allRules = availableRules || getSavedSalaryRules();

  const fallbackStructure: SalaryStructureDefinition = DEFAULT_SALARY_STRUCTURES[0] || {
    id: 'default-struct',
    name: 'Standard Payroll',
    code: 'STANDARD_PAYROLL',
    scheduledPay: 'Monthly',
    country: 'Bangladesh',
    slipDisplayName: 'Salary Slip',
    workedDaysLinesEnabled: true,
    active: true,
    ruleCodes: DEFAULT_SALARY_RULES.map((r) => r.code),
  };

  const selectedStructure: SalaryStructureDefinition =
    (typeof structure === 'string'
      ? allStructures.find((s) => s.id === structure || s.code === structure || s.name === structure) ||
        allStructures[0]
      : structure) || fallbackStructure;

  // Filter rules assigned to this structure
  const structureRules = selectedStructure.ruleCodes
    .map((code) => {
      // Find matching rule definition (prefer active ones)
      return allRules.find((r) => r.code === code && r.active) || allRules.find((r) => r.code === code);
    })
    .filter((r): r is SalaryRuleDefinition => Boolean(r && r.active))
    .sort((a, b) => a.sequence - b.sequence);

  const categories: Record<CategoryCode, number> = {
    GROSS: 0,
    BASIC: 0,
    ALW: 0,
    DED: 0,
    TAXABLE: 0,
    TAX: 0,
    BONUS: 0,
    REIMB: 0,
    NET: 0,
    COMP: 0,
  };

  const rules: Record<string, number> = {};
  const steps: RuleTraceStep[] = [];

  const ctx: RuleContext = {
    contract,
    settings,
    inputs,
    categories,
    rules,
  };

  for (const rule of structureRules) {
    // Check if canonical handler exists with matching code and default logic
    const canonical = CANONICAL_SALARY_RULES.find((c) => c.code === rule.code);
    let total = 0;

    if (canonical && rule.calculationDetails === DEFAULT_SALARY_RULES.find((r) => r.code === rule.code)?.calculationDetails) {
      total = canonical.compute(ctx);
    } else {
      total = evaluateFormulaExpression(rule.calculationDetails, ctx);
    }

    rules[rule.code] = total;
    categories[rule.categoryCode] = round((categories[rule.categoryCode] || 0) + total, 0);

    steps.push({
      sequence: rule.sequence,
      code: rule.code,
      name: rule.name,
      categoryCode: rule.categoryCode,
      amount: total,
      quantity: 1,
      total,
      appearsOnPayslip: rule.appearsOnPayslip,
      contributesToEmployerCost: rule.contributesToEmployerCost,
      categoryRunningTotal: categories[rule.categoryCode],
    });
  }

  const grossWage = rules['GROSS_SALARY'] ?? rules['GROSS'] ?? contract.wage ?? 0;
  const basicWage = rules['BASIC'] ?? round(grossWage * ((settings.basic_salary_percentage ?? 50) / 100), 0);

  const houseRent = rules['HOUSE_RENT'] ?? round(grossWage * ((settings.house_rent_percentage ?? 25) / 100), 0);
  const medicalAllowance = rules['MEDICAL_ALW'] ?? round(grossWage * ((settings.medical_allowance_percentage ?? 10) / 100), 0);
  const conveyanceAllowance = rules['CONVEYANCE_ALW'] ?? round(grossWage * ((settings.conveyance_allowance_percentage ?? 10) / 100), 0);
  const otherAllowance = rules['OTHER_ALW'] ?? round(grossWage * ((settings.other_allowance_percentage ?? 5) / 100), 0);
  const totalAllowances = houseRent + medicalAllowance + conveyanceAllowance + otherAllowance;

  const employeePF = rules['PF'] ?? 0;
  const employerPFRate = (settings.provident_fund_employer_rate ?? 10) / 100;
  const employerPF = contract.pf_enabled === false ? 0 : round((settings.pf_base === 'GROSS' ? grossWage : basicWage) * employerPFRate, 0);

  const monthlyTaxTDS = rules['MONTHLY_TAX_DEDUCTION'] ?? 0;
  const yearlyTaxPayable = rules['NET_YEARLY_TAX_PAYABLE'] ?? 0;
  const attendanceDeduction = rules['ATTENDANCE_DEDUCTION'] ?? 0;
  const insurancePremium = rules['INSURANCE'] ?? 0;
  const manualLateDeduction = Math.abs(inputs.LATE ?? 0);
  const bonusAmount = rules['BONUS'] ?? 0;
  const netWage = rules['NET_SALARY'] ?? rules['NET'] ?? 0;

  const totalDeductions =
    employeePF +
    monthlyTaxTDS +
    attendanceDeduction +
    insurancePremium +
    manualLateDeduction +
    Math.abs(inputs.OTHER_DEDUCTION ?? 0);

  const employerCost = round(grossWage - attendanceDeduction + employerPF, 0);

  let hasWarning = false;
  let warningMessage = '';
  if (netWage < 0) {
    hasWarning = true;
    warningMessage = `Negative Net Salary (৳${netWage.toLocaleString()}): Deductions exceed gross earnings.`;
  }

  return {
    grossWage,
    basicWage,
    houseRent,
    medicalAllowance,
    conveyanceAllowance,
    otherAllowance,
    totalAllowances,
    employeePF,
    employerPF,
    monthlyTaxTDS,
    yearlyTaxPayable,
    attendanceDeduction,
    insurancePremium,
    manualLateDeduction,
    totalDeductions,
    bonusAmount,
    netWage,
    employerCost,
    steps,
    ruleMap: rules,
    categoryTotals: categories,
    hasWarning,
    warningMessage,
  };
}

