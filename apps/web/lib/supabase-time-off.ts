import { getSupabase } from './supabase-auth';
import { fetchEmployeesFromSupabase } from './supabase-employees';
import { fetchWithCache, invalidateCache } from './data-cache';
import { getLocalAttendanceLogs, saveLocalAttendanceLogs } from './supabase-attendance';

// ═══════════════════════════════════════════════════════════════════════════
// 1. DATA TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export type LeaveType =
  | 'Casual Leave'
  | 'Medical Leave'
  | 'Emergency Leave'
  | 'Annual Leave'
  | 'Maternity Leave'
  | 'Paternity Leave'
  | 'Compensatory Leave'
  | 'Bereavement Leave';

export type HalfDayType = 'Full Day' | 'First Half' | 'Second Half';

export const BEREAVEMENT_RELATIONSHIPS = [
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Spouse',
  'Child',
  'Father-in-Law',
  'Mother-in-Law',
  'Brother-in-Law',
  'Sister-in-Law',
] as const;

export type BereavementRelationship = typeof BEREAVEMENT_RELATIONSHIPS[number];

export interface LeaveRequestItem {
  id: string;
  employeeId?: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  designation?: string;
  avatarUrl?: string;
  leaveType: LeaveType;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  totalDays: number;
  halfDayType?: HalfDayType;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  supervisorName?: string;
  supervisorEmail?: string;
  supervisorCode?: string;
  
  // Specific Leave Type Fields
  attachmentUrl?: string;
  attachmentName?: string;
  
  // Maternity Leave Specific Fields
  pregnancyConfirmationDate?: string;
  expectedDeliveryDate?: string;
  intendedMaternityStartDate?: string;
  
  // Bereavement Leave Specific Field
  bereavementRelationship?: BereavementRelationship;
  
  // Compensatory Leave Specific Field
  compOffHoursClaimed?: number;
  
  isArchived?: boolean;
}

export interface LeaveAllocationItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  avatarUrl?: string;
  gender?: string;
  leaveGroup: string;
  casualAllocated: number;
  casualUsed: number;
  medicalAllocated: number;
  medicalUsed: number;
  emergencyAllocated: number;
  emergencyUsed: number;
  annualAllocated: number;
  annualUsed: number;
  maternityAllocated: number;
  maternityUsed: number;
  paternityAllocated: number;
  paternityUsed: number;
  compOffAllocated: number;
  compOffUsed: number;
  bereavementAllocated?: number;
  bereavementUsed: number;
  unpaidUsed: number;
  fiscalYear: string; // e.g. '2026-2027'
}

export type CompensatoryLedgerStatus = 'ACTIVE' | 'EXPIRED' | 'FULLY_UTILIZED';
export type CompensatoryDutyType = 'WEEKEND' | 'PUBLIC_HOLIDAY' | 'BOTH';

export interface CompensatoryLedgerEntry {
  id: string;
  tenantId?: string;
  employeeId?: string;
  employeeCode: string;
  employeeName?: string;
  onDutyRequestId?: string;
  dutyDate: string; // YYYY-MM-DD
  dutyReason?: string;
  dutyType: CompensatoryDutyType;
  holidayName?: string;
  hoursEarned: number;
  hoursUtilized: number;
  remainingBalance: number;
  expiryDate: string; // YYYY-MM-DD (2 months / 60 days after dutyDate)
  status: CompensatoryLedgerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CompensatoryBalanceSummary {
  totalHoursEarned: number;
  totalHoursUtilized: number;
  availableHours: number;
  expiredHours: number;
  accumulatedPendingHours: number; // < 4 hours balance that cannot be redeemed yet
  usableHalfDays: number; // 4 hours = Half Day
  usableFullDays: number; // 8 hours = Full Day
}

export interface PublicHolidayItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  endDate?: string;
  totalDays: number;
  type: 'National' | 'Religious' | 'Executive Order' | 'Institutional';
  description?: string;
  year: number;
  department?: string; // Optional specific department or 'All'
  project?: string; // Optional specific project or 'All'
  isArchived?: boolean;
}

export interface LeaveTypeDetailConfig {
  key: LeaveType;
  name: string;
  code: string;
  description: string;
  entitlementDays: number;
  entitlementUnit: 'Days' | 'Calendar Days' | 'Hours' | 'Per Incident';
  proRated: boolean;
  allowDuringProbation: boolean;
  probationMaxDays: number;
  maxConsecutiveDays: number;
  minConsecutiveDays: number;
  advanceNoticeDays: number;
  allowHalfDay: boolean;
  preventSandwiching: boolean;
  preventAnnualLeaveSandwiching: boolean;
  requireDocumentUpload: boolean;
  documentUploadAfterDays: number;
  requireApproval: boolean;
  maxChildrenLimit: number;
  minServiceRequirementMonths: number;
  carryForwardMaxDays: number;
  carryForwardExpiryMonths: number;
  compOffExpiryMonths: number;
  allowRetrospectiveSubmission: boolean;
  restrictDuringNoticePeriod: boolean;
  coolOffPeriodMonths: number;
  applicableRelationships?: string[];
  isActive: boolean;
}

export interface LeavePolicyConfig {
  id: string;
  name: string;
  code: string;
  description: string;
  applicableGroup: string;
  isActive: boolean;
  leaveTypes: LeaveTypeDetailConfig[];
}

export interface QuickPolicyItem {
  title: string;
  points: string[];
  allowHalfDay: boolean;
  requiresDocument: boolean;
  docThresholdDays: number;
}

export const QUICK_LEAVE_POLICIES: Record<LeaveType, QuickPolicyItem> = {
  'Casual Leave': {
    title: 'CASUAL LEAVE – QUICK POLICY',
    points: [
      'Total 10 days per year.',
      'Apply at least 1 day before the leave date.',
      'Maximum 3 consecutive days at a time.',
      'Not allowed during probation period.',
      'Cannot be combined or sandwiched with Annual Leave.',
      'No other leave except Medical and Emergency Leave can be prefixed or suffixed.',
      'Sandwiched government holidays count as Casual Leave.',
      'Government holidays on outer boundaries are not counted as leave.',
      'Supervisor approval mandatory.',
    ],
    allowHalfDay: true,
    requiresDocument: false,
    docThresholdDays: 0,
  },
  'Medical Leave': {
    title: 'MEDICAL LEAVE – QUICK POLICY',
    points: [
      'Total 10 days per year.',
      'Medical certificate required for 3+ consecutive days.',
      'Available during probation (max 3 days).',
      'Can extend using other leave types if needed.',
      'Supervisor approval required.',
    ],
    allowHalfDay: true,
    requiresDocument: true,
    docThresholdDays: 3,
  },
  'Emergency Leave': {
    title: 'EMERGENCY LEAVE – QUICK POLICY',
    points: [
      'Total 4 days per year.',
      'Can be taken without prior application (apply after return).',
      'Available during probation (max 3 days).',
      'For urgent/unforeseen situations only.',
      'Supervisor approval required.',
    ],
    allowHalfDay: true,
    requiresDocument: false,
    docThresholdDays: 0,
  },
  'Annual Leave': {
    title: 'ANNUAL LEAVE – QUICK POLICY',
    points: [
      'Total 15 days per year.',
      'Minimum 5 consecutive working days required.',
      'Apply at least 10 days in advance.',
      'Available after 6 months of continuous service.',
      'Cannot be taken during notice period.',
      'Cannot be sandwiched with Casual Leave.',
    ],
    allowHalfDay: false,
    requiresDocument: false,
    docThresholdDays: 0,
  },
  'Maternity Leave': {
    title: 'MATERNITY LEAVE – QUICK POLICY',
    points: [
      '120 consecutive calendar days with full pay.',
      'Applicable after 1 year of continuous service (up to 2 children).',
      'Apply at least 12 weeks before Expected Delivery Date (EDD).',
      'Medical documentation mandatory.',
    ],
    allowHalfDay: false,
    requiresDocument: true,
    docThresholdDays: 1,
  },
  'Paternity Leave': {
    title: 'PATERNITY LEAVE – QUICK POLICY',
    points: [
      'Total 15 calendar days with full pay.',
      'Applicable after 1 year of continuous service (up to 2 children).',
      'Apply at least 7 days before start date.',
      'Applicable for up to two (2) children only.',
    ],
    allowHalfDay: false,
    requiresDocument: true,
    docThresholdDays: 1,
  },
  'Compensatory Leave': {
    title: 'COMPENSATORY LEAVE – QUICK POLICY',
    points: [
      'Earned for working on holidays/weekends.',
      'Minimum 4 hours = half-day leave (8 hours = full-day leave).',
      'Must be used within 2 months.',
      'Cannot be carried forward.',
      'Supervisor approval required.',
    ],
    allowHalfDay: true,
    requiresDocument: false,
    docThresholdDays: 0,
  },
  'Bereavement Leave': {
    title: 'BEREAVEMENT LEAVE – QUICK POLICY',
    points: [
      'Up to 5 days per incident for immediate family loss.',
      'Mandatory immediate family relationship selection required.',
      'Can be availed multiple times within a year subject to eligibility.',
      'Supervisor approval required.',
    ],
    allowHalfDay: false,
    requiresDocument: false,
    docThresholdDays: 0,
  },
};

/**
 * Validates whether an employee is eligible for a specific leave category based on gender.
 * Strictly enforces JAAGO Foundation HR Policy:
 * - Male employees: Allocated Paternity Leave (15d); strictly PROHIBITED from Maternity Leave.
 * - Female employees: Allocated Maternity Leave (120d); strictly PROHIBITED from Paternity Leave.
 */
export function validateLeaveGenderEligibility(
  gender: string | undefined,
  leaveType: LeaveType | string
): { valid: boolean; title?: string; reason?: string } {
  const g = (gender || '').toUpperCase().trim();
  const isMale = g === 'MALE' || g === 'M';
  const isFemale = g === 'FEMALE' || g === 'F';

  if (isMale && leaveType === 'Maternity Leave') {
    return {
      valid: false,
      title: 'Maternity Leave Prohibited',
      reason:
        'Under JAAGO Foundation HR Policy (Clause 4.2), Maternity Leave is exclusively available for Female employees. Male employees are not eligible for Maternity Leave allocations or requests. Please select Paternity Leave (15 Days) instead.',
    };
  }

  if (isFemale && leaveType === 'Paternity Leave') {
    return {
      valid: false,
      title: 'Paternity Leave Prohibited',
      reason:
        'Under JAAGO Foundation HR Policy (Clause 4.3), Paternity Leave is exclusively available for Male employees. Female employees are not eligible for Paternity Leave allocations or requests. Please select Maternity Leave (120 Days) instead.',
    };
  }

  return { valid: true };
}

/**
 * Checks if a given date string (YYYY-MM-DD) is an active official public / government holiday.
 */
export function isDateGovernmentHoliday(dateStr: string, holidays: PublicHolidayItem[]): boolean {
  if (!dateStr || !holidays || holidays.length === 0) return false;
  return holidays.some((h) => {
    if (h.isArchived) return false;
    const start = h.date;
    const end = h.endDate || h.date;
    return dateStr >= start && dateStr <= end;
  });
}

/**
 * Finds the specific public holiday covering a given date string.
 */
export function getGovernmentHolidayOnDate(dateStr: string, holidays: PublicHolidayItem[]): PublicHolidayItem | undefined {
  if (!dateStr || !holidays || holidays.length === 0) return undefined;
  return holidays.find((h) => {
    if (h.isArchived) return false;
    const start = h.date;
    const end = h.endDate || h.date;
    return dateStr >= start && dateStr <= end;
  });
}

/**
 * Checks if a given Date object falls on an official weekend in Bangladesh (Friday = 5, Saturday = 6).
 */
export function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 5 || day === 6;
}

/**
 * Determines whether two leave dates are consecutive/adjacent over non-working days (weekends or public holidays).
 * Returns isAdjacent = true if there are NO working days between date1 and date2.
 */
export function areDatesAdjacentOverNonWorkingDays(
  date1Str: string,
  date2Str: string,
  holidays: PublicHolidayItem[]
): { isAdjacent: boolean; holidayDaysCount: number; interveningHolidays: PublicHolidayItem[] } {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 <= d1) {
    return { isAdjacent: false, holidayDaysCount: 0, interveningHolidays: [] };
  }

  const interveningHolidays: PublicHolidayItem[] = [];
  let holidayDaysCount = 0;
  const curr = new Date(d1);
  curr.setDate(curr.getDate() + 1);

  while (curr < d2) {
    const curStr = curr.toISOString().split('T')[0]!;
    const hol = getGovernmentHolidayOnDate(curStr, holidays);
    const isWk = isWeekendDay(curr);

    if (!hol && !isWk) {
      // Found an intervening normal working day, so the leaves are not adjacent
      return { isAdjacent: false, holidayDaysCount: 0, interveningHolidays: [] };
    }

    if (hol) {
      holidayDaysCount++;
      if (!interveningHolidays.some((h) => h.id === hol.id)) {
        interveningHolidays.push(hol);
      }
    }

    curr.setDate(curr.getDate() + 1);
  }

  return { isAdjacent: true, holidayDaysCount, interveningHolidays };
}

/**
 * Calculates Casual Leave duration according to JAAGO Foundation HR policy:
 * 1. "Government holidays on both sides of a leave period should not be counted as leave."
 *    (Outer leading and trailing government holidays are excluded from leave count).
 * 2. "If Casual Leave is taken on both sides of a government holiday, the holiday should also be counted as Casual Leave as per policy."
 *    (Intervening government holidays between Casual Leave days are counted as Casual Leave).
 * 3. Half-day options (0.5 day) supported.
 */
export function calculateCasualLeaveDuration(
  startDate: string,
  endDate: string,
  mode: 'FULL' | 'HALF',
  holidays: PublicHolidayItem[]
): {
  totalDays: number;
  sandwichedHolidaysCount: number;
  boundaryHolidaysCount: number;
  validWorkingDays: number;
  allDaysAreHolidays: boolean;
  sandwichedHolidayNames: string[];
} {
  if (mode === 'HALF') {
    return {
      totalDays: 0.5,
      sandwichedHolidaysCount: 0,
      boundaryHolidaysCount: 0,
      validWorkingDays: 1,
      allDaysAreHolidays: false,
      sandwichedHolidayNames: [],
    };
  }

  const d1 = new Date(startDate);
  const d2 = new Date(endDate);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) {
    return {
      totalDays: 1,
      sandwichedHolidaysCount: 0,
      boundaryHolidaysCount: 0,
      validWorkingDays: 1,
      allDaysAreHolidays: false,
      sandwichedHolidayNames: [],
    };
  }

  // Generate all date strings in the requested range
  const datesInRange: string[] = [];
  const curr = new Date(d1);
  while (curr <= d2) {
    datesInRange.push(curr.toISOString().split('T')[0]!);
    curr.setDate(curr.getDate() + 1);
  }

  // Find first non-holiday date index
  let firstNonHolidayIdx = -1;
  for (let i = 0; i < datesInRange.length; i++) {
    if (!isDateGovernmentHoliday(datesInRange[i]!, holidays)) {
      firstNonHolidayIdx = i;
      break;
    }
  }

  // Find last non-holiday date index
  let lastNonHolidayIdx = -1;
  for (let i = datesInRange.length - 1; i >= 0; i--) {
    if (!isDateGovernmentHoliday(datesInRange[i]!, holidays)) {
      lastNonHolidayIdx = i;
      break;
    }
  }

  // If entire range is government holidays:
  if (firstNonHolidayIdx === -1 || lastNonHolidayIdx === -1) {
    return {
      totalDays: 0,
      sandwichedHolidaysCount: 0,
      boundaryHolidaysCount: datesInRange.length,
      validWorkingDays: 0,
      allDaysAreHolidays: true,
      sandwichedHolidayNames: [],
    };
  }

  const leadingBoundaryHolidays = firstNonHolidayIdx;
  const trailingBoundaryHolidays = datesInRange.length - 1 - lastNonHolidayIdx;
  const boundaryHolidaysCount = leadingBoundaryHolidays + trailingBoundaryHolidays;

  let validWorkingDays = 0;
  let sandwichedHolidaysCount = 0;
  const sandwichedHolidayNames: string[] = [];

  for (let i = firstNonHolidayIdx; i <= lastNonHolidayIdx; i++) {
    const dStr = datesInRange[i]!;
    const hol = getGovernmentHolidayOnDate(dStr, holidays);
    if (hol) {
      sandwichedHolidaysCount++;
      if (!sandwichedHolidayNames.includes(hol.title)) {
        sandwichedHolidayNames.push(hol.title);
      }
    } else {
      validWorkingDays++;
    }
  }

  const totalDays = validWorkingDays + sandwichedHolidaysCount;

  return {
    totalDays,
    sandwichedHolidaysCount,
    boundaryHolidaysCount,
    validWorkingDays,
    allDaysAreHolidays: false,
    sandwichedHolidayNames,
  };
}

/**
 * Validates all Casual Leave rules against JAAGO Foundation HR policy:
 * - Minimum 1 day advance submission (startDate > today).
 * - Maximum 3 consecutive days at a time (exceeding restricts request & advises applying for Annual Leave).
 * - Cannot be sandwiched, combined, prefixed, or suffixed with Annual Leave.
 * - No other leave except Medical Leave and Emergency Leave can be prefixed or suffixed with Casual Leave.
 * - Government holidays on both sides of a leave period are not counted as leave.
 * - Sandwiched government holidays count as Casual Leave.
 * - Prohibited during probation.
 */
export function validateCasualLeaveRules(params: {
  startDate: string;
  endDate: string;
  mode: 'FULL' | 'HALF';
  totalCalculatedDays: number;
  holidays: PublicHolidayItem[];
  existingRequests: LeaveRequestItem[];
  employeeCode: string;
  isProbation: boolean;
  availableBalance?: number | undefined;
  currentRequestId?: string | undefined;
}): { valid: boolean; error?: string } {
  // 1. Probation Rule
  if (params.isProbation) {
    return {
      valid: false,
      error: 'Policy Warning: Casual Leave is not available during probation period. Staff on probation are not eligible for Casual Leave under JAAGO HR Policy.',
    };
  }

  // 2. Advance Notice Rule (at least 1 day in advance)
  const todayStr = new Date().toISOString().split('T')[0]!;
  if (params.startDate <= todayStr) {
    return {
      valid: false,
      error: 'Advance Notice Required: Casual Leave application must be submitted at least 1 day before the leave start date.',
    };
  }

  // 3. Check if all days applied are holidays
  if (params.totalCalculatedDays <= 0) {
    return {
      valid: false,
      error: 'The selected date period falls entirely on public holiday(s) or weekend(s). No leave deduction is required.',
    };
  }

  // 4. Maximum 3 Consecutive Days Rule
  if (params.totalCalculatedDays > 3) {
    return {
      valid: false,
      error: 'Casual Leave Limit Exceeded: Maximum 3 consecutive days can be applied at a time. Please apply for Annual Leave or split your leave request as per policy.',
    };
  }

  // 5. Available Quota Balance Rule
  if (params.availableBalance !== undefined && params.totalCalculatedDays > params.availableBalance) {
    return {
      valid: false,
      error: `Insufficient Balance: Requested ${params.totalCalculatedDays} day(s) exceeds your available Casual Leave balance of ${params.availableBalance} day(s).`,
    };
  }

  // 6. Inspect adjacent leave requests for sandwiching and prefix/suffix policy compliance
  const relevantRequests = (params.existingRequests || []).filter(
    (r) =>
      r.employeeCode === params.employeeCode &&
      r.status !== 'Rejected' &&
      r.id !== params.currentRequestId
  );

  for (const existing of relevantRequests) {
    // Check if existing request is immediately preceding this application
    const prevAdj = areDatesAdjacentOverNonWorkingDays(existing.toDate, params.startDate, params.holidays);
    if (prevAdj.isAdjacent) {
      // Rule: Casual Leave cannot be sandwiched with Annual Leave
      if (existing.leaveType === 'Annual Leave') {
        return {
          valid: false,
          error: `Policy Violation: Casual Leave cannot be combined, prefixed, or sandwiched with Annual Leave (${existing.fromDate} to ${existing.toDate}). Under JAAGO HR Policy, Casual Leave and Annual Leave cannot be taken consecutively.`,
        };
      }

      // Rule: No other leave except Medical Leave and Emergency Leave can be prefixed or suffixed
      if (existing.leaveType !== 'Medical Leave' && existing.leaveType !== 'Emergency Leave' && existing.leaveType !== 'Casual Leave') {
        return {
          valid: false,
          error: `Policy Restriction: Casual Leave cannot be prefixed with ${existing.leaveType} (${existing.fromDate} to ${existing.toDate}). Under JAAGO HR Policy, no other leave except Medical Leave and Emergency Leave can be prefixed or suffixed with Casual Leave.`,
        };
      }

      // Rule: Adjacent Casual Leave consecutive days limit (including any sandwiched holiday)
      if (existing.leaveType === 'Casual Leave') {
        const combined = existing.totalDays + prevAdj.holidayDaysCount + params.totalCalculatedDays;
        if (combined > 3) {
          const holNotice = prevAdj.holidayDaysCount > 0
            ? ` (including ${prevAdj.holidayDaysCount} sandwiched public holiday day(s))`
            : '';
          return {
            valid: false,
            error: `Policy Warning: Combining this application (${params.totalCalculatedDays}d) with your adjacent Casual Leave (${existing.totalDays}d from ${existing.fromDate} to ${existing.toDate})${holNotice} totals ${combined} consecutive days, exceeding the 3-day maximum limit. For longer leaves, please apply for Annual Leave.`,
          };
        }
      }
    }

    // Check if existing request is immediately succeeding this application
    const nextAdj = areDatesAdjacentOverNonWorkingDays(params.endDate, existing.fromDate, params.holidays);
    if (nextAdj.isAdjacent) {
      // Rule: Casual Leave cannot be sandwiched with Annual Leave
      if (existing.leaveType === 'Annual Leave') {
        return {
          valid: false,
          error: `Policy Violation: Casual Leave cannot be combined, suffixed, or sandwiched with Annual Leave (${existing.fromDate} to ${existing.toDate}). Under JAAGO HR Policy, Casual Leave and Annual Leave cannot be taken consecutively.`,
        };
      }

      // Rule: No other leave except Medical Leave and Emergency Leave can be prefixed or suffixed
      if (existing.leaveType !== 'Medical Leave' && existing.leaveType !== 'Emergency Leave' && existing.leaveType !== 'Casual Leave') {
        return {
          valid: false,
          error: `Policy Restriction: Casual Leave cannot be suffixed with ${existing.leaveType} (${existing.fromDate} to ${existing.toDate}). Under JAAGO HR Policy, no other leave except Medical Leave and Emergency Leave can be prefixed or suffixed with Casual Leave.`,
        };
      }

      // Rule: Adjacent Casual Leave consecutive days limit (including any sandwiched holiday)
      if (existing.leaveType === 'Casual Leave') {
        const combined = existing.totalDays + nextAdj.holidayDaysCount + params.totalCalculatedDays;
        if (combined > 3) {
          const holNotice = nextAdj.holidayDaysCount > 0
            ? ` (including ${nextAdj.holidayDaysCount} sandwiched public holiday day(s))`
            : '';
          return {
            valid: false,
            error: `Policy Warning: Combining this application (${params.totalCalculatedDays}d) with your adjacent Casual Leave (${existing.totalDays}d from ${existing.fromDate} to ${existing.toDate})${holNotice} totals ${combined} consecutive days, exceeding the 3-day maximum limit. For longer leaves, please apply for Annual Leave.`,
          };
        }
      }
    }
  }

  return { valid: true };
}

export interface AnnualLeaveDurationResult {
  totalDays: number;
  workingDaysCount: number;
  trimmedStartDate: string;
  trimmedEndDate: string;
  leadingBoundaryDaysExcluded: number;
  trailingBoundaryDaysExcluded: number;
  internalWeekendDaysCount: number;
  internalHolidaysCount: number;
  internalHolidayNames: string[];
}

/**
 * Calculates Annual Leave duration according to JAAGO Foundation HR policy:
 * 1. "Weekends immediately before or after the leave period should not count as Annual Leave."
 *    (Outer leading/trailing weekends and government holidays are trimmed from the deduction).
 * 2. "Weekends and government holidays falling within the leave period should count as Annual Leave."
 *    (All calendar days between the first working day and last working day count towards Annual Leave).
 * 3. Returns workingDaysCount to strictly enforce "at least 5 consecutive working days".
 */
export function calculateAnnualLeaveDuration(
  startDate: string,
  endDate: string,
  holidays: PublicHolidayItem[]
): AnnualLeaveDurationResult {
  const d1 = new Date(startDate);
  const d2 = new Date(endDate);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime()) || d2 < d1) {
    return {
      totalDays: 0,
      workingDaysCount: 0,
      trimmedStartDate: startDate,
      trimmedEndDate: endDate,
      leadingBoundaryDaysExcluded: 0,
      trailingBoundaryDaysExcluded: 0,
      internalWeekendDaysCount: 0,
      internalHolidaysCount: 0,
      internalHolidayNames: [],
    };
  }

  // Generate all date strings in the requested range
  const datesInRange: string[] = [];
  const curr = new Date(d1);
  while (curr <= d2) {
    datesInRange.push(curr.toISOString().split('T')[0]!);
    curr.setDate(curr.getDate() + 1);
  }

  const isWorkingDay = (dateStr: string) => {
    const dt = new Date(dateStr);
    return !isWeekendDay(dt) && !isDateGovernmentHoliday(dateStr, holidays);
  };

  // Find first working day (trim outer leading non-working days)
  let firstWorkingIdx = -1;
  for (let i = 0; i < datesInRange.length; i++) {
    if (isWorkingDay(datesInRange[i]!)) {
      firstWorkingIdx = i;
      break;
    }
  }

  // Find last working day (trim outer trailing non-working days)
  let lastWorkingIdx = -1;
  for (let i = datesInRange.length - 1; i >= 0; i--) {
    if (isWorkingDay(datesInRange[i]!)) {
      lastWorkingIdx = i;
      break;
    }
  }

  // If no working days in the range (e.g. only Fri-Sat or only holidays)
  if (firstWorkingIdx === -1 || lastWorkingIdx === -1) {
    return {
      totalDays: 0,
      workingDaysCount: 0,
      trimmedStartDate: startDate,
      trimmedEndDate: endDate,
      leadingBoundaryDaysExcluded: datesInRange.length,
      trailingBoundaryDaysExcluded: 0,
      internalWeekendDaysCount: 0,
      internalHolidaysCount: 0,
      internalHolidayNames: [],
    };
  }

  const leadingBoundaryDaysExcluded = firstWorkingIdx;
  const trailingBoundaryDaysExcluded = datesInRange.length - 1 - lastWorkingIdx;
  const trimmedStartDate = datesInRange[firstWorkingIdx]!;
  const trimmedEndDate = datesInRange[lastWorkingIdx]!;

  let workingDaysCount = 0;
  let internalWeekendDaysCount = 0;
  let internalHolidaysCount = 0;
  const internalHolidayNames: string[] = [];

  for (let i = firstWorkingIdx; i <= lastWorkingIdx; i++) {
    const dStr = datesInRange[i]!;
    const dt = new Date(dStr);
    const hol = getGovernmentHolidayOnDate(dStr, holidays);
    const isWk = isWeekendDay(dt);

    if (hol) {
      internalHolidaysCount++;
      if (!internalHolidayNames.includes(hol.title)) {
        internalHolidayNames.push(hol.title);
      }
    } else if (isWk) {
      internalWeekendDaysCount++;
    } else {
      workingDaysCount++;
    }
  }

  // All days from firstWorkingIdx to lastWorkingIdx count as Annual Leave!
  const totalDays = lastWorkingIdx - firstWorkingIdx + 1;

  return {
    totalDays,
    workingDaysCount,
    trimmedStartDate,
    trimmedEndDate,
    leadingBoundaryDaysExcluded,
    trailingBoundaryDaysExcluded,
    internalWeekendDaysCount,
    internalHolidaysCount,
    internalHolidayNames,
  };
}

/**
 * Validates Annual Leave application against JAAGO Foundation HR policy:
 * 1. Eligibility: Employee must complete 6 months of continuous service (P&C 6-month status field).
 * 2. Restriction: Annual Leave cannot be availed during notice period or after resignation.
 * 3. Advance Notice: Must be submitted at least 10 days before leave start date.
 * 4. Working Days Requirement: Minimum 5 consecutive working days required.
 * 5. Minimum Gap: Cannot be availed within 1 month (30 days) of a previously approved Annual Leave.
 * 6. Prefix / Suffix Restriction: No other leave type except Medical Leave and Emergency Leave can be prefixed or suffixed.
 * 7. Sandwiching: Strict prevention of sandwiching between Annual Leave and Casual Leave.
 * 8. Quota: Cannot exceed available Annual Leave balance.
 */
export function validateAnnualLeaveRules(params: {
  startDate: string;
  endDate: string;
  totalCalculatedDays: number;
  workingDaysCount: number;
  holidays: PublicHolidayItem[];
  existingRequests: LeaveRequestItem[];
  employeeCode: string;
  isProbation: boolean;
  sixMonthsCompletionStatus?: string | undefined;
  joiningDate?: string | undefined;
  employeeStatus?: string | undefined;
  availableBalance?: number | undefined;
  currentRequestId?: string | undefined;
}): { valid: boolean; error?: string } {
  // 1. Notice Period / Resignation Rule
  const empStatus = (params.employeeStatus || '').trim().toLowerCase();
  if (empStatus === 'resigned' || empStatus === 'terminated' || empStatus === 'notice period') {
    return {
      valid: false,
      error: 'Policy Restriction: Annual Leave cannot be availed during notice period or after resignation as per JAAGO HR Policy.',
    };
  }

  // 2. Probation Rule
  if (params.isProbation) {
    return {
      valid: false,
      error: 'Policy Warning: Annual Leave is not available during the probationary period. Staff must complete probation and 6 months of continuous service.',
    };
  }

  // 3. 6 Months of Service Completion Rule
  const sixMonths = (params.sixMonthsCompletionStatus || '').trim().toLowerCase();
  let eligible6Months = true;
  if (sixMonths === 'no') {
    eligible6Months = false;
  } else if (sixMonths !== 'yes' && params.joiningDate) {
    const jDate = new Date(params.joiningDate);
    if (!isNaN(jDate.getTime())) {
      const now = new Date();
      const diffMonths = (now.getFullYear() - jDate.getFullYear()) * 12 + (now.getMonth() - jDate.getMonth());
      if (diffMonths < 6) eligible6Months = false;
    }
  }

  if (!eligible6Months) {
    return {
      valid: false,
      error: "Policy Ineligibility: Employee must complete at least 6 months of continuous service before becoming eligible for Annual Leave (People & Culture Profile: 6 Months Completion Status is 'No').",
    };
  }

  // 4. Advance Notice Rule (at least 10 days before leave start date)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startObj = new Date(params.startDate);
  startObj.setHours(0, 0, 0, 0);
  const diffNoticeDays = Math.round((startObj.getTime() - today.getTime()) / (1000 * 3600 * 24));
  if (diffNoticeDays < 10) {
    return {
      valid: false,
      error: `Advance Notice Required: Annual Leave application must be submitted at least 10 days before the leave start date (Current notice: ${diffNoticeDays < 0 ? 0 : diffNoticeDays} day(s)).`,
    };
  }

  // 5. Check if all selected days are non-working days
  if (params.totalCalculatedDays <= 0 || params.workingDaysCount <= 0) {
    return {
      valid: false,
      error: 'The selected date range contains no active working days (weekends or public holidays only). No Annual Leave deduction is required.',
    };
  }

  // 6. Minimum 5 Consecutive Working Days Rule
  if (params.workingDaysCount < 5) {
    return {
      valid: false,
      error: `Policy Requirement: Minimum 5 consecutive working days must be applied for Annual Leave. Your application contains only ${params.workingDaysCount} working day(s).`,
    };
  }

  // 7. Available Quota Balance Rule
  if (params.availableBalance !== undefined && params.totalCalculatedDays > params.availableBalance) {
    return {
      valid: false,
      error: `Insufficient Balance: Requested ${params.totalCalculatedDays} day(s) exceeds your available Annual Leave balance of ${params.availableBalance} day(s).`,
    };
  }

  // 8. 1-Month Gap from Previously Approved Annual Leave
  const approvedAnnualLeaves = (params.existingRequests || []).filter(
    (r) =>
      r.employeeCode === params.employeeCode &&
      r.leaveType === 'Annual Leave' &&
      r.status === 'Approved' &&
      r.id !== params.currentRequestId
  );

  for (const app of approvedAnnualLeaves) {
    const appStart = new Date(app.fromDate);
    const appEnd = new Date(app.toDate);
    const newStart = new Date(params.startDate);
    const newEnd = new Date(params.endDate);

    if (newStart >= appEnd) {
      const gapDays = Math.round((newStart.getTime() - appEnd.getTime()) / (1000 * 3600 * 24));
      if (gapDays < 30) {
        return {
          valid: false,
          error: `Policy Restriction: Annual Leave cannot be availed within 1 month (30 days) of a previously approved Annual Leave (Previous leave ended on ${app.toDate}, gap is ${gapDays} day(s)).`,
        };
      }
    } else if (newEnd <= appStart) {
      const gapDays = Math.round((appStart.getTime() - newEnd.getTime()) / (1000 * 3600 * 24));
      if (gapDays < 30) {
        return {
          valid: false,
          error: `Policy Restriction: Annual Leave cannot be availed within 1 month (30 days) of a previously approved Annual Leave (Upcoming approved leave starts on ${app.fromDate}, gap is ${gapDays} day(s)).`,
        };
      }
    } else {
      return {
        valid: false,
        error: `Policy Restriction: Annual Leave overlaps with a previously approved Annual Leave (${app.fromDate} to ${app.toDate}).`,
      };
    }
  }

  // 9. Inspect adjacent leave requests for sandwiching and prefix/suffix compliance
  const relevantRequests = (params.existingRequests || []).filter(
    (r) =>
      r.employeeCode === params.employeeCode &&
      r.status !== 'Rejected' &&
      r.id !== params.currentRequestId
  );

  for (const existing of relevantRequests) {
    // Preceding adjacency
    const prevAdj = areDatesAdjacentOverNonWorkingDays(existing.toDate, params.startDate, params.holidays);
    if (prevAdj.isAdjacent) {
      if (existing.leaveType === 'Casual Leave') {
        return {
          valid: false,
          error: `Policy Conflict: Annual Leave cannot be sandwiched, prefixed, or suffixed with Casual Leave (${existing.fromDate} to ${existing.toDate}). Under JAAGO HR Policy, Casual Leave and Annual Leave cannot be taken consecutively.`,
        };
      }
      if (existing.leaveType !== 'Medical Leave' && existing.leaveType !== 'Emergency Leave') {
        return {
          valid: false,
          error: `Policy Conflict: Annual Leave cannot be prefixed with ${existing.leaveType} (${existing.fromDate} to ${existing.toDate}). Only Medical Leave and Emergency Leave can be prefixed or suffixed with Annual Leave.`,
        };
      }
    }

    // Succeeding adjacency
    const nextAdj = areDatesAdjacentOverNonWorkingDays(params.endDate, existing.fromDate, params.holidays);
    if (nextAdj.isAdjacent) {
      if (existing.leaveType === 'Casual Leave') {
        return {
          valid: false,
          error: `Policy Conflict: Annual Leave cannot be sandwiched, prefixed, or suffixed with Casual Leave (${existing.fromDate} to ${existing.toDate}). Under JAAGO HR Policy, Casual Leave and Annual Leave cannot be taken consecutively.`,
        };
      }
      if (existing.leaveType !== 'Medical Leave' && existing.leaveType !== 'Emergency Leave') {
        return {
          valid: false,
          error: `Policy Conflict: Annual Leave cannot be suffixed with ${existing.leaveType} (${existing.fromDate} to ${existing.toDate}). Only Medical Leave and Emergency Leave can be prefixed or suffixed with Annual Leave.`,
        };
      }
    }
  }

  return { valid: true };
}

export function cleanApplicantReason(reason?: string | null): string {
  if (!reason) return '';
  return reason
    .replace(/\[Supervisor:\s*[\s\S]*?\]/gi, '')
    .replace(/\{"?Supervisor:\s*[\s\S]*?\}?/gi, '')
    .replace(/\[Attachment:\s*[\s\S]*?\]/gi, '')
    .replace(/\[Refusal Note:\s*[\s\S]*?\]/gi, '')
    .replace(/\[Half Day:\s*[\s\S]*?\]/gi, '')
    .trim();
}

export function validateMaternityLeaveRules(params: {
  startDate: string;
  endDate: string;
  pregnancyConfirmationDate?: string | undefined;
  expectedDeliveryDate?: string | undefined;
  intendedMaternityStartDate?: string | undefined;
  employeeGender?: string | undefined;
  existingRequests?: LeaveRequestItem[] | undefined;
  employeeCode: string;
  hasAttachedDoc: boolean;
  availableBalance?: number | undefined;
  currentRequestId?: string | undefined;
  totalCalculatedDays?: number | undefined;
}): { valid: boolean; error?: string } {
  // 1. Gender Rule: Exclusively for Female Employees
  const g = (params.employeeGender || '').toUpperCase().trim();
  const isFemale = g === 'FEMALE' || g === 'F';
  if (!isFemale) {
    return {
      valid: false,
      error: 'Policy Restriction: Maternity Leave is strictly reserved for female employees under JAAGO HR Policy.',
    };
  }

  // 2. Mandatory Fields
  if (!params.pregnancyConfirmationDate || !params.pregnancyConfirmationDate.trim()) {
    return {
      valid: false,
      error: 'Mandatory Field Missing: Please provide the Pregnancy Confirmation Date.',
    };
  }
  if (!params.expectedDeliveryDate || !params.expectedDeliveryDate.trim()) {
    return {
      valid: false,
      error: 'Mandatory Field Missing: Please provide the Expected Delivery Date (EDD).',
    };
  }
  if (!params.intendedMaternityStartDate || !params.intendedMaternityStartDate.trim()) {
    return {
      valid: false,
      error: 'Mandatory Field Missing: Please provide the Intended Maternity Leave Start Date.',
    };
  }

  // 3. Advance Notice: At least 12 weeks (84 days) before Expected Delivery Date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const edd = new Date(params.expectedDeliveryDate);
  edd.setHours(0, 0, 0, 0);

  if (isNaN(edd.getTime())) {
    return {
      valid: false,
      error: 'Invalid Date: The Expected Delivery Date provided is invalid.',
    };
  }

  const diffEddDays = Math.round((edd.getTime() - today.getTime()) / (1000 * 3600 * 24));
  if (diffEddDays < 84) {
    return {
      valid: false,
      error: `Advance Notice Required: Maternity Leave application must be submitted at least 12 weeks (84 days / 3 months) before the Expected Delivery Date (EDD). Your Expected Delivery Date is ${
        diffEddDays < 0 ? 'in the past' : `only ${diffEddDays} day(s) from today`
      }.`,
    };
  }

  // 4. Mandatory Document Upload
  if (!params.hasAttachedDoc) {
    return {
      valid: false,
      error: 'Document Required: Supporting medical documentation / pregnancy confirmation certificate must be uploaded before submitting a Maternity Leave application.',
    };
  }

  // 5. Maximum 2 Children Restriction
  const priorMaternityLeaves = (params.existingRequests || []).filter(
    (r) =>
      r.employeeCode === params.employeeCode &&
      (r.leaveType === 'Maternity Leave' || (r as any).leave_type === 'Maternity Leave') &&
      r.status !== 'Rejected' &&
      r.status !== 'Cancelled' &&
      (!params.currentRequestId || r.id !== params.currentRequestId)
  );
  if (priorMaternityLeaves.length >= 2) {
    return {
      valid: false,
      error: 'Policy Restriction: Maternity Leave entitlement is restricted to a maximum of two (2) children under JAAGO HR Policy. Our records indicate you have already availed Maternity Leave for two children.',
    };
  }

  // 6. Available Quota Balance
  if (params.availableBalance !== undefined && params.availableBalance < 120) {
    return {
      valid: false,
      error: `Insufficient Balance: Maternity Leave entitlement is 120 calendar days, but your available balance is ${params.availableBalance} day(s).`,
    };
  }

  // 7. Single Continuous Period of 120 Calendar Days (Weekends & Government Holidays Included)
  const startObj = new Date(params.startDate);
  startObj.setHours(0, 0, 0, 0);
  const endObj = new Date(params.endDate);
  endObj.setHours(0, 0, 0, 0);
  const calendarDays = Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 3600 * 24)) + 1;

  if (calendarDays !== 120 && (params.totalCalculatedDays !== undefined && params.totalCalculatedDays !== 120)) {
    return {
      valid: false,
      error: `Policy Requirement: Maternity Leave must be availed in a single continuous period of exactly 120 calendar days (including weekends and government holidays). It cannot be split, reused, or carried forward. Current selection is ${calendarDays} day(s).`,
    };
  }

  return { valid: true };
}

export function validatePaternityLeaveRules(params: {
  startDate: string;
  endDate: string;
  employeeGender?: string | undefined;
  existingRequests?: LeaveRequestItem[] | undefined;
  employeeCode: string;
  joiningDate?: string | undefined;
  sixMonthsCompletionStatus?: string | undefined;
  availableBalance?: number | undefined;
  currentRequestId?: string | undefined;
  totalCalculatedDays?: number | undefined;
  holidays?: PublicHolidayItem[] | undefined;
}): { valid: boolean; error?: string } {
  // 1. Gender Rule: Exclusively for Male Employees
  const g = (params.employeeGender || '').toUpperCase().trim();
  const isMale = g === 'MALE' || g === 'M';
  if (!isMale) {
    return {
      valid: false,
      error: 'Policy Restriction: Paternity Leave is strictly reserved for male employees under JAAGO HR Policy.',
    };
  }

  // 2. Service Eligibility: Applicable after completion of 1 year of continuous service
  // Data pull from People and Culture employee profile 6-month confirmation status and joining date
  const sixMonths = (params.sixMonthsCompletionStatus || '').trim().toLowerCase();
  if (sixMonths === 'no') {
    return {
      valid: false,
      error: "Policy Ineligibility: Employee must complete at least 1 year of continuous service before becoming eligible for Paternity Leave (People & Culture Profile: 6 Months Completion Status is 'No').",
    };
  }

  if (params.joiningDate) {
    const jDate = new Date(params.joiningDate);
    const startObj = new Date(params.startDate);
    if (!isNaN(jDate.getTime()) && !isNaN(startObj.getTime())) {
      const serviceDiffDays = Math.round((startObj.getTime() - jDate.getTime()) / (1000 * 3600 * 24));
      if (serviceDiffDays < 365) {
        const completedMonths = Math.floor(serviceDiffDays / 30.4375);
        return {
          valid: false,
          error: `Policy Ineligibility: Paternity Leave is applicable only after completion of 1 year (365 days) of continuous service. Current service length is approximately ${completedMonths} month(s) (${serviceDiffDays} days).`,
        };
      }
    }
  }

  // 3. Advance Notice: Application must be submitted at least 7 days before the leave start date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startObj = new Date(params.startDate);
  startObj.setHours(0, 0, 0, 0);

  if (isNaN(startObj.getTime())) {
    return {
      valid: false,
      error: 'Invalid Date: The leave start date provided is invalid.',
    };
  }

  const daysUntilLeave = Math.round((startObj.getTime() - today.getTime()) / (1000 * 3600 * 24));
  if (daysUntilLeave < 7) {
    return {
      valid: false,
      error: `Advance Notice Required: Paternity Leave application must be submitted at least 7 days before the leave start date (Current notice: ${
        daysUntilLeave < 0 ? 'date in past' : `${daysUntilLeave} day(s)`
      }).`,
    };
  }

  // 4. Maximum 2 Children Restriction: Applicable for up to two (2) children only
  const priorPaternityLeaves = (params.existingRequests || []).filter(
    (r) =>
      r.employeeCode === params.employeeCode &&
      (r.leaveType === 'Paternity Leave' || (r as any).leave_type === 'Paternity Leave') &&
      r.status !== 'Rejected' &&
      r.status !== 'Cancelled' &&
      (!params.currentRequestId || r.id !== params.currentRequestId)
  );
  if (priorPaternityLeaves.length >= 2) {
    return {
      valid: false,
      error: 'Policy Restriction: Paternity Leave entitlement is restricted to a maximum of two (2) children under JAAGO HR Policy. Our records indicate you have already availed Paternity Leave for two children.',
    };
  }

  // 5. Maximum Entitlement: 15 days (Weekends and government holidays counted within the period)
  const endObj = new Date(params.endDate);
  endObj.setHours(0, 0, 0, 0);
  const calendarDays = Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 3600 * 24)) + 1;
  const effectiveDays = params.totalCalculatedDays !== undefined ? params.totalCalculatedDays : calendarDays;

  if (effectiveDays > 15 || calendarDays > 15) {
    return {
      valid: false,
      error: `Policy Limit Exceeded: Maximum entitlement for Paternity Leave is 15 calendar days (including weekends and government holidays). Current requested duration is ${effectiveDays} day(s).`,
    };
  }

  // 6. Available Quota Balance
  if (params.availableBalance !== undefined && effectiveDays > params.availableBalance) {
    return {
      valid: false,
      error: `Insufficient Balance: Requested ${effectiveDays} day(s) exceeds your available Paternity Leave balance of ${params.availableBalance} day(s).`,
    };
  }

  return { valid: true };
}

/**
 * Validates Compensatory Leave (Comp Off) Application against JAAGO Policy:
 * 1. Earned exclusively from approved On-Duty holiday/weekend work.
 * 2. 4 hours = Half-Day Compensatory Leave.
 * 3. 8 hours = Full-Day Compensatory Leave.
 * 4. Less than 4 hours remains as accumulated balance and cannot be redeemed.
 * 5. Must expire after 2 months (60 calendar days) from the duty earning date.
 */
export interface ValidateCompensatoryLeaveParams {
  employeeCode: string;
  durationMode: 'HALF' | 'FULL';
  hoursRequested?: number;
  availableBalanceHours: number; // Active, unexpired balance in hours
  accumulatedTotalHours?: number; // Total accumulated hours
}

export function validateCompensatoryLeaveRules(params: ValidateCompensatoryLeaveParams): {
  valid: boolean;
  error?: string;
  requiredHours: number;
} {
  const isHalf = params.durationMode === 'HALF';
  const requiredHours = params.hoursRequested ?? (isHalf ? 4 : 8);

  // 1. Check minimum threshold (at least 4 hours is required for any leave application)
  if (params.availableBalanceHours < 4) {
    if (params.availableBalanceHours > 0) {
      return {
        valid: false,
        requiredHours,
        error: `Insufficient Balance: You have ${params.availableBalanceHours} hour(s) accumulated. Minimum 4 hours is required for a Half-Day Compensatory Leave. (Balances under 4 hours remain safely stored as accumulated balance until reaching 4 hours).`,
      };
    }
    return {
      valid: false,
      requiredHours,
      error: `Insufficient Balance: You have 0 hours of available Compensatory Leave. Compensatory Leave is earned automatically from approved On-Duty work on weekends or public holidays and expires after 2 months.`,
    };
  }

  // 2. Check full day requirement (8 hours)
  if (!isHalf && params.availableBalanceHours < 8) {
    return {
      valid: false,
      requiredHours,
      error: `Insufficient Balance: Requested 8 hours (Full-Day) exceeds your available active Compensatory Leave balance of ${params.availableBalanceHours} hour(s). You can apply for a 4h Half-Day leave instead.`,
    };
  }

  // 3. Exact quota check against requested hours
  if (requiredHours > params.availableBalanceHours) {
    return {
      valid: false,
      requiredHours,
      error: `Insufficient Balance: Requested ${requiredHours} hours exceeds your available active Compensatory Leave balance of ${params.availableBalanceHours} hour(s).`,
    };
  }

  return { valid: true, requiredHours };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. PRODUCTION SEED DATA WITH FULL RULES
// ═══════════════════════════════════════════════════════════════════════════

export const STANDARD_LEAVE_TYPES_CONFIG: LeaveTypeDetailConfig[] = [
  {
    key: 'Casual Leave',
    name: 'Casual Leave (CL)',
    code: 'CL',
    description: '10 days entitlement per fiscal year (July–June). Max 3 consecutive days. Pro-rated for mid-year joiners.',
    entitlementDays: 10,
    entitlementUnit: 'Days',
    proRated: true,
    allowDuringProbation: false,
    probationMaxDays: 0,
    maxConsecutiveDays: 3,
    minConsecutiveDays: 0.5,
    advanceNoticeDays: 1,
    allowHalfDay: true,
    preventSandwiching: true,
    preventAnnualLeaveSandwiching: true,
    requireDocumentUpload: false,
    documentUploadAfterDays: 0,
    requireApproval: true,
    maxChildrenLimit: 0,
    minServiceRequirementMonths: 0,
    carryForwardMaxDays: 0,
    carryForwardExpiryMonths: 0,
    compOffExpiryMonths: 0,
    allowRetrospectiveSubmission: false,
    restrictDuringNoticePeriod: false,
    coolOffPeriodMonths: 0,
    isActive: true,
  },
  {
    key: 'Medical Leave',
    name: 'Medical Leave (ML)',
    code: 'ML',
    description: '10 days entitlement per fiscal year. Max 3 days during probation with unused balance transferred upon confirmation.',
    entitlementDays: 10,
    entitlementUnit: 'Days',
    proRated: true,
    allowDuringProbation: true,
    probationMaxDays: 3,
    maxConsecutiveDays: 10,
    minConsecutiveDays: 1,
    advanceNoticeDays: 0,
    allowHalfDay: true,
    preventSandwiching: false,
    preventAnnualLeaveSandwiching: false,
    requireDocumentUpload: true,
    documentUploadAfterDays: 3,
    requireApproval: true,
    maxChildrenLimit: 0,
    minServiceRequirementMonths: 0,
    carryForwardMaxDays: 0,
    carryForwardExpiryMonths: 0,
    compOffExpiryMonths: 0,
    allowRetrospectiveSubmission: true,
    restrictDuringNoticePeriod: false,
    coolOffPeriodMonths: 0,
    isActive: true,
  },
  {
    key: 'Emergency Leave',
    name: 'Emergency Leave (EL)',
    code: 'EL',
    description: '4 days entitlement per fiscal year. Max 3 days in probation with remaining transferred on confirmation.',
    entitlementDays: 4,
    entitlementUnit: 'Days',
    proRated: true,
    allowDuringProbation: true,
    probationMaxDays: 3,
    maxConsecutiveDays: 4,
    minConsecutiveDays: 1,
    advanceNoticeDays: 0,
    allowHalfDay: true,
    preventSandwiching: false,
    preventAnnualLeaveSandwiching: false,
    requireDocumentUpload: false,
    documentUploadAfterDays: 0,
    requireApproval: true,
    maxChildrenLimit: 0,
    minServiceRequirementMonths: 0,
    carryForwardMaxDays: 0,
    carryForwardExpiryMonths: 0,
    compOffExpiryMonths: 0,
    allowRetrospectiveSubmission: true,
    restrictDuringNoticePeriod: false,
    coolOffPeriodMonths: 0,
    isActive: true,
  },
  {
    key: 'Annual Leave',
    name: 'Annual Leave (AL)',
    code: 'AL',
    description: '15 days entitlement per fiscal year. Eligible after 6 months of service. Min 5 working days required per request.',
    entitlementDays: 15,
    entitlementUnit: 'Days',
    proRated: true,
    allowDuringProbation: false,
    probationMaxDays: 0,
    maxConsecutiveDays: 15,
    minConsecutiveDays: 5,
    advanceNoticeDays: 10,
    allowHalfDay: false,
    preventSandwiching: true,
    preventAnnualLeaveSandwiching: true,
    requireDocumentUpload: false,
    documentUploadAfterDays: 0,
    requireApproval: true,
    maxChildrenLimit: 0,
    minServiceRequirementMonths: 6,
    carryForwardMaxDays: 5,
    carryForwardExpiryMonths: 6,
    compOffExpiryMonths: 0,
    allowRetrospectiveSubmission: false,
    restrictDuringNoticePeriod: true,
    coolOffPeriodMonths: 1,
    isActive: true,
  },
  {
    key: 'Maternity Leave',
    name: 'Maternity Leave',
    code: 'MAT',
    description: '120 consecutive calendar days with full pay. Applicable after 1 year of continuous service for up to 2 children.',
    entitlementDays: 120,
    entitlementUnit: 'Calendar Days',
    proRated: false,
    allowDuringProbation: false,
    probationMaxDays: 0,
    maxConsecutiveDays: 120,
    minConsecutiveDays: 120,
    advanceNoticeDays: 84, // 12 weeks before EDD
    allowHalfDay: false,
    preventSandwiching: false,
    preventAnnualLeaveSandwiching: false,
    requireDocumentUpload: true,
    documentUploadAfterDays: 1,
    requireApproval: true,
    maxChildrenLimit: 2,
    minServiceRequirementMonths: 12,
    carryForwardMaxDays: 0,
    carryForwardExpiryMonths: 0,
    compOffExpiryMonths: 0,
    allowRetrospectiveSubmission: false,
    restrictDuringNoticePeriod: false,
    coolOffPeriodMonths: 0,
    isActive: true,
  },
  {
    key: 'Paternity Leave',
    name: 'Paternity Leave',
    code: 'PAT',
    description: '15 consecutive calendar days with full pay. Applicable after 1 year of continuous service for up to 2 children.',
    entitlementDays: 15,
    entitlementUnit: 'Calendar Days',
    proRated: false,
    allowDuringProbation: false,
    probationMaxDays: 0,
    maxConsecutiveDays: 15,
    minConsecutiveDays: 1,
    advanceNoticeDays: 7,
    allowHalfDay: false,
    preventSandwiching: false,
    preventAnnualLeaveSandwiching: false,
    requireDocumentUpload: true,
    documentUploadAfterDays: 1,
    requireApproval: true,
    maxChildrenLimit: 2,
    minServiceRequirementMonths: 12,
    carryForwardMaxDays: 0,
    carryForwardExpiryMonths: 0,
    compOffExpiryMonths: 0,
    allowRetrospectiveSubmission: false,
    restrictDuringNoticePeriod: false,
    coolOffPeriodMonths: 0,
    isActive: true,
  },
  {
    key: 'Compensatory Leave',
    name: 'Compensatory Leave (Comp Off)',
    code: 'COMP',
    description: 'Earned from approved holiday/weekend duty (4 hrs = Half Day, 8 hrs = Full Day). Expires after 2 months.',
    entitlementDays: 0, // Ledger-based
    entitlementUnit: 'Hours',
    proRated: false,
    allowDuringProbation: true,
    probationMaxDays: 0,
    maxConsecutiveDays: 3,
    minConsecutiveDays: 0.5,
    advanceNoticeDays: 1,
    allowHalfDay: true,
    preventSandwiching: false,
    preventAnnualLeaveSandwiching: false,
    requireDocumentUpload: false,
    documentUploadAfterDays: 0,
    requireApproval: true,
    maxChildrenLimit: 0,
    minServiceRequirementMonths: 0,
    carryForwardMaxDays: 0,
    carryForwardExpiryMonths: 0,
    compOffExpiryMonths: 2,
    allowRetrospectiveSubmission: false,
    restrictDuringNoticePeriod: false,
    coolOffPeriodMonths: 0,
    isActive: true,
  },
  {
    key: 'Bereavement Leave',
    name: 'Bereavement Leave',
    code: 'BER',
    description: 'Up to 5 days per incident for immediate family bereavement (Father, Mother, Spouse, Child, In-Laws, Siblings).',
    entitlementDays: 5,
    entitlementUnit: 'Per Incident',
    proRated: false,
    allowDuringProbation: true,
    probationMaxDays: 5,
    maxConsecutiveDays: 5,
    minConsecutiveDays: 1,
    advanceNoticeDays: 0,
    allowHalfDay: false,
    preventSandwiching: false,
    preventAnnualLeaveSandwiching: false,
    requireDocumentUpload: false,
    documentUploadAfterDays: 0,
    requireApproval: true,
    maxChildrenLimit: 0,
    minServiceRequirementMonths: 0,
    carryForwardMaxDays: 0,
    carryForwardExpiryMonths: 0,
    compOffExpiryMonths: 0,
    allowRetrospectiveSubmission: true,
    restrictDuringNoticePeriod: false,
    coolOffPeriodMonths: 0,
    applicableRelationships: [...BEREAVEMENT_RELATIONSHIPS],
    isActive: true,
  },
];

export const INITIAL_LEAVE_POLICIES: LeavePolicyConfig[] = [
  {
    id: 'pol-std',
    name: 'Standard Full-time Employee Policy',
    code: 'POL-STD-01',
    description: 'Primary comprehensive leave policy for confirmed, full-time staff across all JAAGO branches and initiatives.',
    applicableGroup: 'Standard Full-time',
    isActive: true,
    leaveTypes: STANDARD_LEAVE_TYPES_CONFIG,
  },
  {
    id: 'pol-dsp',
    name: 'DSP Faculty & School Teacher Policy',
    code: 'POL-DSP-02',
    description: 'Customized leave policy aligned with school term calendars, branch managers, and digital school instructors.',
    applicableGroup: 'DSP Faculty Group',
    isActive: true,
    leaveTypes: STANDARD_LEAVE_TYPES_CONFIG.map((t) => {
      if (t.key === 'Casual Leave') return { ...t, entitlementDays: 12 };
      if (t.key === 'Annual Leave') return { ...t, entitlementDays: 10, carryForwardMaxDays: 3 };
      return t;
    }),
  },
  {
    id: 'pol-prob',
    name: 'Probationary & Contractual Policy',
    code: 'POL-PROB-03',
    description: 'Leave policy for newly onboarded staff during the first 6 months of probation before confirmation.',
    applicableGroup: 'Probationary Staff',
    isActive: true,
    leaveTypes: STANDARD_LEAVE_TYPES_CONFIG.map((t) => {
      if (t.key === 'Casual Leave') return { ...t, entitlementDays: 0, allowDuringProbation: false };
      if (t.key === 'Medical Leave') return { ...t, entitlementDays: 3 };
      if (t.key === 'Emergency Leave') return { ...t, entitlementDays: 3 };
      if (t.key === 'Annual Leave') return { ...t, entitlementDays: 0, isActive: false };
      if (t.key === 'Maternity Leave') return { ...t, entitlementDays: 90 };
      if (t.key === 'Paternity Leave') return { ...t, entitlementDays: 7 };
      return t;
    }),
  },
];

export const INITIAL_PUBLIC_HOLIDAYS: PublicHolidayItem[] = [
  {
    id: 'hol-1',
    title: 'International Mother Language Day',
    date: '2026-02-21',
    totalDays: 1,
    type: 'National',
    description: 'Martyrs Day & International Mother Language Day observance.',
    year: 2026,
  },
  {
    id: 'hol-2',
    title: 'Independence Day of Bangladesh',
    date: '2026-03-26',
    totalDays: 1,
    type: 'National',
    description: 'National Independence & National Day celebration.',
    year: 2026,
  },
  {
    id: 'hol-3',
    title: 'Bengali New Year (Pohela Boishakh)',
    date: '2026-04-14',
    totalDays: 1,
    type: 'National',
    description: 'Traditional celebration of the first day of the Bengali calendar.',
    year: 2026,
  },
  {
    id: 'hol-4',
    title: 'Eid-ul-Fitr Holidays',
    date: '2026-03-20',
    endDate: '2026-03-23',
    totalDays: 4,
    type: 'Religious',
    description: 'Islamic festival marking the end of Ramadan.',
    year: 2026,
  },
  {
    id: 'hol-5',
    title: 'Eid-ul-Adha Holidays',
    date: '2026-05-27',
    endDate: '2026-05-30',
    totalDays: 4,
    type: 'Religious',
    description: 'Feast of the Sacrifice official public holiday.',
    year: 2026,
  },
  {
    id: 'hol-6',
    title: 'July Uprising Day',
    date: '2026-08-05',
    totalDays: 1,
    type: 'National',
    description: 'National holiday in honor of the July Student-People Revolution.',
    year: 2026,
  },
  {
    id: 'hol-7',
    title: 'Durga Puja (Bijoya Dashami)',
    date: '2026-10-21',
    totalDays: 1,
    type: 'Religious',
    description: 'Main religious festival of the Hindu community in Bangladesh.',
    year: 2026,
  },
  {
    id: 'hol-8',
    title: 'Victory Day (Bijoy Dibos)',
    date: '2026-12-16',
    totalDays: 1,
    type: 'National',
    description: 'National Victory Day of Bangladesh.',
    year: 2026,
  },
];

export const INITIAL_LEAVE_REQUESTS: LeaveRequestItem[] = [];

export const INITIAL_LEAVE_ALLOCATIONS: LeaveAllocationItem[] = [];

// ═══════════════════════════════════════════════════════════════════════════
// 3. STORAGE & SUPABASE SYNC METHODS
// ═══════════════════════════════════════════════════════════════════════════

// ── LEAVE REQUESTS ────────────────────────────────────────────────────────
export async function fetchLeaveRequests(forceRefresh: boolean = false): Promise<LeaveRequestItem[]> {
  return fetchWithCache(
    'pnc_leave_requests_list',
    async () => {
      try {
        const supabase = getSupabase();
        if (supabase) {
          const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && Array.isArray(data) && data.length > 0) {
            const mapped = data.map((row: any) => {
              let attachmentName = row.attachment_name || '';
              let attachmentUrl = row.attachment_url || '';
              let rawReason = row.reason || '';
              if (/\[Attachment:\s*([\s\S]*?)\]/i.test(rawReason)) {
                const match = rawReason.match(/\[Attachment:\s*([\s\S]*?)\]/i);
                if (match && match[1]) {
                  const parts = match[1].trim().split('|');
                  if (!attachmentName) attachmentName = parts[0]?.trim() || '';
                  if (parts[1]) attachmentUrl = parts[1].trim();
                }
              }
              if (attachmentName && !attachmentUrl) {
                attachmentUrl = `/api/v1/leaves/attachments?name=${encodeURIComponent(attachmentName)}`;
              }

              let rejectionReason = row.rejection_reason || '';
              if (!rejectionReason && /\[Refusal Note:\s*([\s\S]*?)\]/i.test(rawReason)) {
                const match = rawReason.match(/\[Refusal Note:\s*([\s\S]*?)\]/i);
                if (match && match[1]) rejectionReason = match[1].trim();
              }

              let halfDayType: HalfDayType = 'Full Day';
              if (/\[Half Day:\s*([\s\S]*?)\]/i.test(rawReason)) {
                const match = rawReason.match(/\[Half Day:\s*([\s\S]*?)\]/i);
                if (match && match[1]) {
                  const val = match[1].trim();
                  if (val === 'First Half' || val === 'Second Half') {
                    halfDayType = val as HalfDayType;
                  }
                }
              } else if (row.half_day_type) {
                halfDayType = row.half_day_type;
              } else if (Number(row.total_days) === 0.5) {
                halfDayType = 'First Half';
              }

              let supervisorName = row.supervisor_name || '';
              let supervisorEmail = row.supervisor_email || '';
              let supervisorCode = row.supervisor_code || '';
              if (!supervisorName && /\[Supervisor:\s*([\s\S]*?)\]/i.test(rawReason)) {
                const match = rawReason.match(/\[Supervisor:\s*([\s\S]*?)\]/i);
                if (match && match[1]) {
                  const parts = match[1].trim().split('|');
                  supervisorName = parts[0]?.trim() || '';
                  if (parts[1]) supervisorEmail = parts[1].trim();
                  if (parts[2]) supervisorCode = parts[2].trim();
                }
              }

              const cleanReason = rawReason
                .replace(/\[Attachment:\s*[\s\S]*?\]/gi, '')
                .replace(/\[Refusal Note:\s*[\s\S]*?\]/gi, '')
                .replace(/\[Half Day:\s*[\s\S]*?\]/gi, '')
                .replace(/\[Supervisor:\s*[\s\S]*?\]/gi, '')
                .trim();

              return {
                id: row.id,
                employeeId: row.employee_id,
                employeeCode: row.employee_code,
                employeeName: row.employee_name,
                department: row.department || "Founder's Office",
                designation: row.designation || 'Staff',
                leaveType: row.leave_type || 'Casual Leave',
                fromDate: row.from_date,
                toDate: row.to_date,
                totalDays: Number(row.total_days || 1),
                halfDayType: halfDayType,
                reason: cleanReason,
                rejectionReason: rejectionReason || undefined,
                attachmentName: attachmentName || undefined,
                attachmentUrl: attachmentUrl || undefined,
                supervisorName: supervisorName || undefined,
                supervisorEmail: supervisorEmail || undefined,
                supervisorCode: supervisorCode || undefined,
                status: (row.status as LeaveStatus) || 'Pending',
                appliedAt: row.applied_at || row.created_at,
                approvedBy: row.approved_by,
                approvedAt: row.approved_at,
              };
            });
            try {
              localStorage.setItem('jaago_pnc_leave_requests_v3', JSON.stringify(mapped));
            } catch {}
            return mapped;
          }
        }
      } catch (err) {
        console.warn('Error fetching leave requests from Supabase:', err);
      }

      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('jaago_pnc_leave_requests_v3');
          if (cached) {
            const parsed: LeaveRequestItem[] = JSON.parse(cached);
            const clean = parsed
              .filter((r) => !['lv-101', 'lv-102', 'lv-103', 'lv-104'].includes(r.id))
              .map((r) => ({
                ...r,
                reason: cleanApplicantReason(r.reason),
              }));
            return clean;
          }
        } catch {}
      }
      return [];
    },
    20000,
    forceRefresh
  );
}

function syncLeaveToAttendanceLogs(request: LeaveRequestItem) {
  if (typeof window === 'undefined') return;
  try {
    let logs: any[] = getLocalAttendanceLogs();

    const start = new Date(request.fromDate);
    const end = new Date(request.toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    const current = new Date(start);

    if (request.status === 'Approved') {
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const logId = `att-leave-${request.employeeCode}-${dateStr}`;
        const isHalf = (request.halfDayType && request.halfDayType !== 'Full Day') || Number(request.totalDays) === 0.5;
        const effectiveHalfType = (request.halfDayType && request.halfDayType !== 'Full Day')
          ? request.halfDayType
          : (Number(request.totalDays) === 0.5 ? 'First Half' : 'Full Day');
        const attStatus = isHalf ? 'Half Day' : 'Leave';

        const existingIdx = logs.findIndex(
          (l) => l.id === logId || (l.employeeCode === request.employeeCode && l.date === dateStr)
        );
        const logEntry = {
          id: logId,
          employeeId: request.employeeId || `emp-${request.employeeCode}`,
          employeeCode: request.employeeCode,
          employeeName: request.employeeName,
          designation: request.designation || 'Staff',
          department: request.department || 'General',
          branch: 'Head Office (Banani)',
          status: attStatus,
          device: 'Web Portal',
          timestamp: `${dateStr} 09:00 am`,
          date: dateStr,
          checkInTime: effectiveHalfType === 'Second Half' ? '02:00 PM' : undefined,
          checkOutTime: effectiveHalfType === 'First Half' ? '02:00 PM' : undefined,
          notes: `Approved Leave: ${request.leaveType}${isHalf ? ` (${effectiveHalfType})` : ''} - ${request.reason}`,
          createdBy: request.approvedBy || `${request.employeeName} (${request.employeeCode})`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          logs[existingIdx] = { ...logs[existingIdx], ...logEntry };
        } else {
          logs.unshift(logEntry);
        }

        current.setDate(current.getDate() + 1);
      }
    } else {
      // If Rejected or Pending, remove any attendance logs generated by this leave request
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const logId = `att-leave-${request.employeeCode}-${dateStr}`;
        logs = logs.filter(
          (l) => !(l.id === logId || (l.employeeCode === request.employeeCode && l.date === dateStr && (l.status === 'Leave' || l.status === 'Half Day')))
        );
        current.setDate(current.getDate() + 1);
      }
    }

    saveLocalAttendanceLogs(logs);
  } catch (err) {
    console.warn('Attendance log sync error:', err);
  }
}

export async function saveLeaveRequest(request: LeaveRequestItem): Promise<boolean> {
  // Validate Gender Policy Restriction: Male cannot take Maternity; Female cannot take Paternity
  if (request.leaveType === 'Maternity Leave' || request.leaveType === 'Paternity Leave') {
    let empGender = '';
    if (typeof window !== 'undefined') {
      try {
        const cachedEmps = localStorage.getItem('jaago_pnc_employees_v2');
        if (cachedEmps) {
          const emps = JSON.parse(cachedEmps);
          const found = emps.find((e: any) => e.code === request.employeeCode || e.id === request.employeeId);
          if (found?.gender) empGender = found.gender;
        }
      } catch {}
    }
    if (!empGender) {
      try {
        const emps = await fetchEmployeesFromSupabase();
        const found = emps?.find((e: any) => e.code === request.employeeCode || e.id === request.employeeId);
        if (found?.gender) empGender = found.gender;
      } catch {}
    }
    if (empGender) {
      const eligibility = validateLeaveGenderEligibility(empGender, request.leaveType);
      if (!eligibility.valid) {
        console.warn(`[Leave Policy Ineligibility] ${eligibility.title}: ${eligibility.reason}`);
        throw new Error(eligibility.reason || 'This leave type is not allowed for this employee gender.');
      }
    }
  }

  // Validate Casual Leave Rules
  if (request.leaveType === 'Casual Leave') {
    try {
      const holidays = await fetchPublicHolidays();
      const allRequests = await fetchLeaveRequests();
      const allocations = await fetchLeaveAllocations();
      const empAlloc = allocations.find((a) => a.employeeCode === request.employeeCode);
      const available = (empAlloc?.casualAllocated ?? 10) - (empAlloc?.casualUsed ?? 0);
      const isProbation = empAlloc?.leaveGroup === 'Probationary Staff';

      const clValidation = validateCasualLeaveRules({
        startDate: request.fromDate,
        endDate: request.toDate,
        mode: request.halfDayType && request.halfDayType !== 'Full Day' ? 'HALF' : 'FULL',
        totalCalculatedDays: request.totalDays,
        holidays,
        existingRequests: allRequests,
        employeeCode: request.employeeCode,
        isProbation,
        availableBalance: available,
        currentRequestId: request.id,
      });

      if (!clValidation.valid) {
        console.warn(`[Casual Leave Policy Ineligibility]: ${clValidation.error}`);
        throw new Error(clValidation.error || 'Casual leave request violates policy rules.');
      }
    } catch (err: any) {
      if (err.message && err.message.startsWith('Policy')) {
        throw err;
      }
    }
  }

  // Enforce Universal Annual Leave Policies in saveLeaveRequest
  if (request.leaveType === 'Annual Leave') {
    try {
      const holidays = await fetchPublicHolidays();
      const allRequests = await fetchLeaveRequests();
      const allocations = await fetchLeaveAllocations();
      const empAlloc = allocations.find((a) => a.employeeCode === request.employeeCode);
      const available = (empAlloc?.annualAllocated ?? 15) - (empAlloc?.annualUsed ?? 0);
      const isProbation = empAlloc?.leaveGroup === 'Probationary Staff';

      let sixMonthsStatus: string | undefined = undefined;
      let employeeStatus: string | undefined = undefined;
      let joiningDate: string | undefined = undefined;

      try {
        const emps = await fetchEmployeesFromSupabase();
        if (emps && Array.isArray(emps)) {
          const foundEmp = emps.find((e: any) => e.code === request.employeeCode);
          if (foundEmp) {
            sixMonthsStatus = (foundEmp as any).sixMonthsCompletionStatus;
            employeeStatus = (foundEmp as any).status;
            joiningDate = (foundEmp as any).joiningDate || (foundEmp as any).joining_date;
          }
        }
      } catch {}

      const calcRes = calculateAnnualLeaveDuration(request.fromDate, request.toDate, holidays);

      const alValidation = validateAnnualLeaveRules({
        startDate: request.fromDate,
        endDate: request.toDate,
        totalCalculatedDays: calcRes.totalDays,
        workingDaysCount: calcRes.workingDaysCount,
        holidays,
        existingRequests: allRequests,
        employeeCode: request.employeeCode,
        isProbation,
        sixMonthsCompletionStatus: sixMonthsStatus,
        joiningDate,
        employeeStatus,
        availableBalance: available,
        currentRequestId: request.id,
      });

      if (!alValidation.valid) {
        console.warn(`[Annual Leave Policy Ineligibility]: ${alValidation.error}`);
        throw new Error(alValidation.error || 'Annual leave request violates policy rules.');
      }
    } catch (err: any) {
      if (err.message && (err.message.startsWith('Policy') || err.message.startsWith('Advance') || err.message.startsWith('Insufficient'))) {
        throw err;
      }
    }
  }

  // Rule Validation for Maternity Leave Requests
  if (request.leaveType === 'Maternity Leave') {
    try {
      const [allRequests, allAllocations] = await Promise.all([
        fetchLeaveRequests(),
        fetchLeaveAllocations(),
      ]);

      const empAlloc = allAllocations.find((a) => a.employeeCode === request.employeeCode);
      const available = empAlloc ? Math.max(0, (empAlloc.maternityAllocated || 120) - (empAlloc.maternityUsed || 0)) : 120;

      let empGender = empAlloc?.gender || '';
      try {
        if (typeof window !== 'undefined') {
          const emps = await fetchEmployeesFromSupabase();
          if (emps && Array.isArray(emps)) {
            const foundEmp = emps.find((e: any) => e.code === request.employeeCode);
            if (foundEmp && foundEmp.gender) {
              empGender = foundEmp.gender;
            }
          }
        }
      } catch {}

      const matValidation = validateMaternityLeaveRules({
        startDate: request.fromDate,
        endDate: request.toDate,
        pregnancyConfirmationDate: request.pregnancyConfirmationDate,
        expectedDeliveryDate: request.expectedDeliveryDate,
        intendedMaternityStartDate: request.intendedMaternityStartDate || request.fromDate,
        employeeGender: empGender,
        existingRequests: allRequests,
        employeeCode: request.employeeCode,
        hasAttachedDoc: Boolean(request.attachmentUrl || request.attachmentName),
        availableBalance: available,
        currentRequestId: request.id,
        totalCalculatedDays: request.totalDays || 120,
      });

      if (!matValidation.valid) {
        console.warn(`[Maternity Leave Policy Ineligibility]: ${matValidation.error}`);
        throw new Error(matValidation.error || 'Maternity leave request violates policy rules.');
      }
    } catch (err: any) {
      if (
        err.message &&
        (err.message.startsWith('Policy') ||
          err.message.startsWith('Advance') ||
          err.message.startsWith('Mandatory') ||
          err.message.startsWith('Document') ||
          err.message.startsWith('Insufficient') ||
          err.message.startsWith('Invalid'))
      ) {
        throw err;
      }
    }
  }

  // Rule Validation for Paternity Leave Requests
  if (request.leaveType === 'Paternity Leave') {
    try {
      const [allRequests, allAllocations] = await Promise.all([
        fetchLeaveRequests(),
        fetchLeaveAllocations(),
      ]);

      const empAlloc = allAllocations.find((a) => a.employeeCode === request.employeeCode);
      const available = empAlloc ? Math.max(0, (empAlloc.paternityAllocated || 15) - (empAlloc.paternityUsed || 0)) : 15;

      let empGender = empAlloc?.gender || '';
      let joiningDate: string | undefined = undefined;
      let sixMonthsStatus: string | undefined = undefined;

      try {
        if (typeof window !== 'undefined') {
          const emps = await fetchEmployeesFromSupabase();
          if (emps && Array.isArray(emps)) {
            const foundEmp = emps.find((e: any) => e.code === request.employeeCode);
            if (foundEmp) {
              if (foundEmp.gender) empGender = foundEmp.gender;
              joiningDate = foundEmp.joiningDate || (foundEmp as any).joining_date;
              sixMonthsStatus = (foundEmp as any).sixMonthsCompletionStatus;
            }
          }
        }
      } catch {}

      const patValidation = validatePaternityLeaveRules({
        startDate: request.fromDate,
        endDate: request.toDate,
        employeeGender: empGender,
        existingRequests: allRequests,
        employeeCode: request.employeeCode,
        joiningDate,
        sixMonthsCompletionStatus: sixMonthsStatus,
        availableBalance: available,
        currentRequestId: request.id,
        totalCalculatedDays: request.totalDays || 15,
      });

      if (!patValidation.valid) {
        console.warn(`[Paternity Leave Policy Ineligibility]: ${patValidation.error}`);
        throw new Error(patValidation.error || 'Paternity leave request violates policy rules.');
      }
    } catch (err: any) {
      if (
        err.message &&
        (err.message.startsWith('Policy') ||
          err.message.startsWith('Advance') ||
          err.message.startsWith('Mandatory') ||
          err.message.startsWith('Insufficient') ||
          err.message.startsWith('Invalid'))
      ) {
        throw err;
      }
    }
  }

  // Rule Validation & FIFO Deduction for Compensatory Leave Requests
  if (request.leaveType === 'Compensatory Leave') {
    try {
      const compLedger = await fetchCompensatoryLedger(request.employeeCode);
      const compSummary = calculateCompensatoryBalanceSummary(compLedger);
      const isHalf = request.halfDayType && request.halfDayType !== 'Full Day';
      const claimedHours = request.compOffHoursClaimed ?? (isHalf ? 4 : 8);

      const compValidation = validateCompensatoryLeaveRules({
        employeeCode: request.employeeCode,
        durationMode: isHalf ? 'HALF' : 'FULL',
        hoursRequested: claimedHours,
        availableBalanceHours: compSummary.availableHours,
        accumulatedTotalHours: compSummary.totalHoursEarned,
      });

      if (!compValidation.valid) {
        console.warn(`[Compensatory Leave Policy Ineligibility]: ${compValidation.error}`);
        throw new Error(compValidation.error || 'Compensatory leave request violates policy rules.');
      }

      // If request is approved, immediately deduct hours from the earliest-expiring active ledger entries (FIFO)
      if (request.status === 'Approved') {
        await redeemCompensatoryHours(request.employeeCode, claimedHours, request.id);
      }
    } catch (err: any) {
      if (
        err.message &&
        (err.message.startsWith('Policy') ||
          err.message.startsWith('Insufficient') ||
          err.message.startsWith('Invalid'))
      ) {
        throw err;
      }
    }
  }

  invalidateCache('pnc_leave_requests_list');
  invalidateCache('pnc_attendance_logs_list');
  if (typeof window !== 'undefined') {
    try {
      const current = await fetchLeaveRequests();
      const idx = current.findIndex((r) => r.id === request.id);
      let updated: LeaveRequestItem[];
      if (idx >= 0) {
        updated = [...current];
        updated[idx] = request;
      } else {
        updated = [request, ...current];
      }
      localStorage.setItem('jaago_pnc_leave_requests_v3', JSON.stringify(updated));

      // Sync with attendance logs
      syncLeaveToAttendanceLogs(request);

      window.dispatchEvent(new CustomEvent('jaago_leave_request_updated', { detail: { request, all: updated } }));
      window.dispatchEvent(new CustomEvent('jaago_leave_allocation_updated'));
    } catch {}
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      let finalReason = request.reason || '';
      if (request.halfDayType && request.halfDayType !== 'Full Day' && !finalReason.includes('[Half Day:')) {
        finalReason = `[Half Day: ${request.halfDayType}] ${finalReason}`.trim();
      }
      if (request.attachmentName && !finalReason.includes('[Attachment:')) {
        const attachStr = request.attachmentUrl
          ? `${request.attachmentName}|${request.attachmentUrl}`
          : request.attachmentName;
        finalReason = `[Attachment: ${attachStr}] ${finalReason}`.trim();
      }
      if (request.supervisorName && !finalReason.includes('[Supervisor:')) {
        const supStr = `${request.supervisorName}${request.supervisorEmail ? `|${request.supervisorEmail}` : ''}${request.supervisorCode ? `|${request.supervisorCode}` : ''}`;
        finalReason = `[Supervisor: ${supStr}] ${finalReason}`.trim();
      }
      if (request.rejectionReason && !finalReason.includes('[Refusal Note:')) {
        finalReason = `${finalReason} [Refusal Note: ${request.rejectionReason}]`.trim();
      }

      await supabase.from('leave_requests').upsert({
        id: request.id,
        employee_id: request.employeeId || null,
        employee_code: request.employeeCode,
        employee_name: request.employeeName,
        leave_type: request.leaveType,
        from_date: request.fromDate,
        to_date: request.toDate,
        total_days: request.totalDays,
        reason: finalReason,
        status: request.status,
        applied_at: request.appliedAt,
        approved_by: request.approvedBy || null,
        approved_at: request.approvedAt || null,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Supabase save leave request error:', err);
  }
  return true;
}

export async function deleteLeaveRequest(id: string): Promise<boolean> {
  invalidateCache('pnc_leave_requests_list');
  invalidateCache('pnc_attendance_logs_list');
  if (typeof window !== 'undefined') {
    try {
      const current = await fetchLeaveRequests();
      const target = current.find((r) => r.id === id);
      const filtered = current.filter((r) => r.id !== id);
      localStorage.setItem('jaago_pnc_leave_requests_v3', JSON.stringify(filtered));

      if (target) {
        syncLeaveToAttendanceLogs({ ...target, status: 'Rejected' });
      }

      window.dispatchEvent(new CustomEvent('jaago_leave_request_updated', { detail: { deletedId: id, all: filtered } }));
      window.dispatchEvent(new CustomEvent('jaago_leave_allocation_updated'));
    } catch {}
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('leave_requests').delete().eq('id', id);
    }
  } catch {}
  return true;
}

export const STORAGE_KEY_DELETED_ALLOCATIONS = 'jaago_pnc_deleted_leave_allocations';

export function getDeletedAllocationKeys(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_ALLOCATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDeletedAllocationKeys(keys: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_DELETED_ALLOCATIONS, JSON.stringify(keys));
  } catch {}
}

/**
 * Resolves the 4 Core Leave Type Quotas (Casual, Medical, Emergency, Annual)
 * based on the active Leave Policy Configuration matching the employee's group/department.
 * Paternity, Maternity, Bereavement, Compensatory, and other leaves are NOT included here,
 * as they must be allocated manually per individual employee.
 */
export function getCoreLeaveQuotaFromPolicies(
  emp: { department?: string; leaveGroup?: string; probationaryStatus?: string; joiningDate?: string; [key: string]: any },
  policies: LeavePolicyConfig[]
): { casual: number; medical: number; emergency: number; annual: number; totalDays: number; policyName: string } {
  const isDsp = emp?.department === 'Digital School Program' || emp?.leaveGroup === 'DSP Faculty Group';
  const isProbation = Boolean(
    emp?.probationaryStatus === 'On Probation' ||
    emp?.probationaryStatus === 'Probationary' ||
    emp?.probationaryStatus === 'Probation' ||
    emp?.leaveGroup === 'Probationary Staff'
  );

  const matchedPolicy = policies?.find((p) => {
    if (!p.isActive) return false;
    if (emp?.leaveGroup && (p.applicableGroup === emp.leaveGroup || p.name === emp.leaveGroup)) {
      return true;
    }
    if (isDsp && (p.applicableGroup === 'DSP Faculty Group' || p.name.includes('DSP'))) {
      return true;
    }
    if (isProbation && (p.applicableGroup === 'Probationary Staff' || p.name.includes('Probationary'))) {
      return true;
    }
    return false;
  }) || policies?.find((p) => p.applicableGroup === 'Standard Full-time') || (policies && policies[0]);

  const cl = matchedPolicy?.leaveTypes?.find((t) => t.key === 'Casual Leave')?.entitlementDays ?? (isProbation ? 0 : isDsp ? 12 : 10);
  const el = matchedPolicy?.leaveTypes?.find((t) => t.key === 'Emergency Leave')?.entitlementDays ?? (isProbation ? 3 : 4);
  const al = matchedPolicy?.leaveTypes?.find((t) => t.key === 'Annual Leave')?.entitlementDays ?? (isProbation ? 0 : isDsp ? 10 : 15);

  // ── MEDICAL LEAVE RULES ──
  // Rule 1: Employees in probation can avail max 3 days in total
  // Rule 2: Allocation is based on joining date (pro-rated if joining in current year)
  let ml = 10;
  if (isProbation) {
    ml = 3;
  } else {
    const rawPolicyMl = matchedPolicy?.leaveTypes?.find((t) => t.key === 'Medical Leave')?.entitlementDays ?? 10;
    const joiningDateStr = emp?.joiningDate || emp?.joining_date;
    if (joiningDateStr) {
      try {
        const joinDate = new Date(joiningDateStr);
        if (!isNaN(joinDate.getTime())) {
          const currentYear = new Date().getFullYear();
          const joinYear = joinDate.getFullYear();
          if (joinYear === currentYear) {
            const joinMonth = joinDate.getMonth() + 1; // 1 to 12
            const remainingMonths = Math.max(1, 12 - joinMonth + 1);
            const proRated = Math.round((remainingMonths / 12) * rawPolicyMl);
            ml = Math.max(1, Math.min(rawPolicyMl, proRated));
          } else if (joinYear > currentYear) {
            ml = 1;
          } else {
            ml = rawPolicyMl;
          }
        } else {
          ml = rawPolicyMl;
        }
      } catch {
        ml = rawPolicyMl;
      }
    } else {
      ml = rawPolicyMl;
    }
  }

  return {
    casual: cl,
    medical: ml,
    emergency: el,
    annual: al,
    totalDays: cl + ml + el + al,
    policyName: matchedPolicy?.name || 'Standard Full-time Employee Policy',
  };
}

// ── LEAVE ALLOCATIONS ─────────────────────────────────────────────────────
export async function fetchLeaveAllocations(): Promise<LeaveAllocationItem[]> {
  const deletedKeysSet = new Set(getDeletedAllocationKeys());

  // 1. Fetch live employees from Supabase / API
  let employees: any[] = [];
  try {
    const emps = await fetchEmployeesFromSupabase();
    if (emps && emps.length > 0) {
      employees = emps;
    }
  } catch (err) {
    console.warn('Error fetching employees for leave allocation:', err);
  }

  // Fallback to cached employees if network unavailable
  if (employees.length === 0 && typeof window !== 'undefined') {
    try {
      const cachedEmps = localStorage.getItem('jaago_pnc_employees_v2');
      if (cachedEmps) {
        employees = JSON.parse(cachedEmps);
      }
    } catch {}
  }

  // 2. Fetch approved requests to calculate used balances and policies to resolve configurations
  const [requests, policies] = await Promise.all([
    fetchLeaveRequests(),
    fetchLeavePolicies(),
  ]);
  const approvedReqs = requests.filter((r) => r.status === 'Approved');

  // 3. Load any custom cached allocations
  let cachedAllocations: LeaveAllocationItem[] = [];
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('jaago_pnc_leave_allocations_v3');
      if (cached !== null) {
        cachedAllocations = JSON.parse(cached);
      }
    } catch {}
  }

  const cachedMap = new Map<string, LeaveAllocationItem>();
  cachedAllocations.forEach((item) => {
    if (item.employeeCode && !deletedKeysSet.has(item.id) && !deletedKeysSet.has(item.employeeCode)) {
      cachedMap.set(item.employeeCode, item);
    }
  });

  // 4. Load Compensatory Leave Ledger to calculate dynamic earned and utilized hours
  const allCompLedger = await fetchCompensatoryLedger();
  const compLedgerMap = new Map<string, CompensatoryLedgerEntry[]>();
  for (const entry of allCompLedger) {
    const list = compLedgerMap.get(entry.employeeCode) || [];
    list.push(entry);
    compLedgerMap.set(entry.employeeCode, list);
  }

  // 5. Construct comprehensive list of allocations for all active employees
  const resultMap = new Map<string, LeaveAllocationItem>();

  for (const emp of employees) {
    if (deletedKeysSet.has(emp.code) || deletedKeysSet.has(emp.id)) {
      continue;
    }

    const existing = cachedMap.get(emp.code);

    // Calculate usage dynamically from approved requests
    const empApproved = approvedReqs.filter((r) => r.employeeCode === emp.code);
    let clUsed = 0;
    let mlUsed = 0;
    let elUsed = 0;
    let alUsed = 0;
    let matUsed = 0;
    let plUsed = 0;
    let coUsed = 0;
    let blUsed = 0;
    let unpaidUsed = 0;

    empApproved.forEach((r) => {
      const days = Number(r.totalDays) || 0;
      if (r.leaveType === 'Casual Leave') clUsed += days;
      else if (r.leaveType === 'Medical Leave') mlUsed += days;
      else if (r.leaveType === 'Emergency Leave') elUsed += days;
      else if (r.leaveType === 'Annual Leave') alUsed += days;
      else if (r.leaveType === 'Maternity Leave') matUsed += days;
      else if (r.leaveType === 'Paternity Leave') plUsed += days;
      else if (r.leaveType === 'Compensatory Leave') coUsed += (r.compOffHoursClaimed || days * 8);
      else if (r.leaveType === 'Bereavement Leave') blUsed += days;
    });

    const isDsp = emp.department === 'Digital School Program' || emp.leaveGroup === 'DSP Faculty Group';
    const isProbation = Boolean(
      emp.probationaryStatus === 'On Probation' ||
      emp.probationaryStatus === 'Probationary' ||
      emp.probationaryStatus === 'Probation' ||
      emp.leaveGroup === 'Probationary Staff'
    );

    const g = (emp.gender || existing?.gender || '').toUpperCase().trim();
    const isMale = g === 'MALE' || g === 'M';
    const isFemale = g === 'FEMALE' || g === 'F';

    // Base allocations: core leaves (CL, ML, EL, AL) dynamically determined from Leave Policy Configuration & Joining Date
    const coreQuotas = getCoreLeaveQuotaFromPolicies(emp, policies);

    const casualAlloc = existing?.casualAllocated ?? (emp.casualLeaveAllocated ? Number(emp.casualLeaveAllocated) : coreQuotas.casual);
    const medicalAlloc = isProbation
      ? 3
      : (emp.joiningDate || emp.joining_date)
        ? coreQuotas.medical
        : (existing?.medicalAllocated !== undefined ? existing.medicalAllocated : coreQuotas.medical);
    const emergencyAlloc = existing?.emergencyAllocated ?? (emp.specialLeaveAllocated ? Number(emp.specialLeaveAllocated) : coreQuotas.emergency);
    const annualAlloc = existing?.annualAllocated ?? (emp.earnedLeaveAllocated ? Number(emp.earnedLeaveAllocated) : coreQuotas.annual);

    // Parental, Bereavement, Compensatory and Other leaves
    let maternityAlloc = 0;
    let paternityAlloc = 0;
    let compOffAlloc = 0;
    let bereavementAlloc = 0;

    if (isMale) {
      paternityAlloc = existing?.paternityAllocated && existing.paternityAllocated > 0 ? existing.paternityAllocated : 15;
      maternityAlloc = 0; // Strictly prohibited for Male
    } else if (isFemale) {
      maternityAlloc = existing?.maternityAllocated && existing.maternityAllocated > 0 ? existing.maternityAllocated : 120;
      paternityAlloc = 0; // Strictly prohibited for Female
    } else {
      maternityAlloc = existing?.maternityAllocated || 0;
      paternityAlloc = existing?.paternityAllocated || 0;
    }

    // Dynamic Compensatory Leave hours from Supabase Ledger
    const empCompEntries = compLedgerMap.get(emp.code) || [];
    const compSummary = calculateCompensatoryBalanceSummary(empCompEntries);
    compOffAlloc = compSummary.totalHoursEarned > 0 ? compSummary.totalHoursEarned : (existing?.compOffAllocated || 0);
    const finalCoUsed = Math.max(coUsed, compSummary.totalHoursUtilized);

    bereavementAlloc = existing?.bereavementAllocated || 0;

    const allocationItem: LeaveAllocationItem = {
      id: existing?.id || `alloc-${emp.code}`,
      employeeId: emp.id || existing?.employeeId || `emp-${emp.code}`,
      employeeCode: emp.code,
      employeeName: emp.name || existing?.employeeName || 'Staff Member',
      department: emp.department || existing?.department || "Founder's Office",
      designation: emp.designation || existing?.designation || 'Staff',
      avatarUrl: emp.avatarUrl || existing?.avatarUrl || '',
      gender: emp.gender || existing?.gender || '',
      leaveGroup: existing?.leaveGroup || emp.leaveGroup || (isDsp ? 'DSP Faculty Group' : isProbation ? 'Probationary Staff' : 'Standard Full-time'),
      casualAllocated: casualAlloc,
      casualUsed: clUsed,
      medicalAllocated: medicalAlloc,
      medicalUsed: mlUsed,
      emergencyAllocated: emergencyAlloc,
      emergencyUsed: elUsed,
      annualAllocated: annualAlloc,
      annualUsed: alUsed,
      maternityAllocated: maternityAlloc,
      maternityUsed: matUsed,
      paternityAllocated: paternityAlloc,
      paternityUsed: plUsed,
      compOffAllocated: compOffAlloc,
      compOffUsed: finalCoUsed,
      bereavementAllocated: bereavementAlloc,
      bereavementUsed: blUsed,
      unpaidUsed: unpaidUsed,
      fiscalYear: existing?.fiscalYear || '2026-2027',
    };

    resultMap.set(emp.code, allocationItem);
  }

  // Include any extra cached items that weren't in employees list (as long as not deleted)
  for (const [code, item] of cachedMap.entries()) {
    if (!resultMap.has(code) && !deletedKeysSet.has(item.id) && !deletedKeysSet.has(code)) {
      const g = (item.gender || '').toUpperCase().trim();
      const isMale = g === 'MALE' || g === 'M';
      const isFemale = g === 'FEMALE' || g === 'F';
      const itemCompEntries = compLedgerMap.get(code) || [];
      const itemSummary = calculateCompensatoryBalanceSummary(itemCompEntries);

      resultMap.set(code, {
        ...item,
        maternityAllocated: isFemale ? (item.maternityAllocated && item.maternityAllocated > 0 ? item.maternityAllocated : 120) : 0,
        paternityAllocated: isMale ? (item.paternityAllocated && item.paternityAllocated > 0 ? item.paternityAllocated : 15) : 0,
        compOffAllocated: itemSummary.totalHoursEarned > 0 ? itemSummary.totalHoursEarned : (item.compOffAllocated || 0),
        compOffUsed: Math.max(item.compOffUsed || 0, itemSummary.totalHoursUtilized),
        bereavementAllocated: item.bereavementAllocated || 0,
      });
    }
  }

  const finalAllocations = Array.from(resultMap.values());

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('jaago_pnc_leave_allocations_v3', JSON.stringify(finalAllocations));
    } catch {}
  }

  return finalAllocations;
}

export async function saveLeaveAllocation(item: LeaveAllocationItem): Promise<boolean> {
  return saveBulkLeaveAllocations([item]);
}

export async function saveBulkLeaveAllocations(items: LeaveAllocationItem[]): Promise<boolean> {
  const normalizedItems = items.map((item) => {
    const g = (item.gender || '').toUpperCase().trim();
    const isMale = g === 'MALE' || g === 'M';
    const isFemale = g === 'FEMALE' || g === 'F';
    return {
      ...item,
      maternityAllocated: isFemale ? (item.maternityAllocated && item.maternityAllocated > 0 ? item.maternityAllocated : 120) : 0,
      paternityAllocated: isMale ? (item.paternityAllocated && item.paternityAllocated > 0 ? item.paternityAllocated : 15) : 0,
    };
  });

  if (typeof window !== 'undefined') {
    try {
      const current = await fetchLeaveAllocations();
      const updated = [...current];
      const itemsToUnDelete = new Set<string>();

      for (const item of normalizedItems) {
        itemsToUnDelete.add(item.id);
        itemsToUnDelete.add(item.employeeCode);
        const idx = updated.findIndex((a) => a.id === item.id || a.employeeCode === item.employeeCode);
        if (idx >= 0) {
          updated[idx] = item;
        } else {
          updated.push(item);
        }
      }
      localStorage.setItem('jaago_pnc_leave_allocations_v3', JSON.stringify(updated));

      // Remove from deleted tracker
      const deleted = getDeletedAllocationKeys().filter((k) => !itemsToUnDelete.has(k));
      saveDeletedAllocationKeys(deleted);

      window.dispatchEvent(new CustomEvent('jaago_leave_allocation_updated', { detail: { items: normalizedItems, all: updated } }));
      window.dispatchEvent(new CustomEvent('jaago_employees_updated'));
    } catch {}
  }

  // Sync to Supabase employees table
  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const item of normalizedItems) {
        await supabase
          .from('employees')
          .update({
            casual_leave_allocated: item.casualAllocated,
            sick_leave_allocated: item.medicalAllocated,
            special_leave_allocated: item.emergencyAllocated,
            earned_leave_allocated: item.annualAllocated,
            leave_group: item.leaveGroup,
            leave_policy: item.leaveGroup,
            updated_at: new Date().toISOString(),
          })
          .eq('code', item.employeeCode);
      }
    }
  } catch (err) {
    console.warn('Error syncing leave allocations to Supabase employees table:', err);
  }

  return true;
}

export async function deleteLeaveAllocation(id: string): Promise<boolean> {
  const deletedKeys = getDeletedAllocationKeys();
  let targetCode = '';

  if (typeof window !== 'undefined') {
    try {
      const current = await fetchLeaveAllocations();
      const target = current.find((a) => a.id === id || a.employeeCode === id);
      if (target) {
        targetCode = target.employeeCode;
        deletedKeys.push(target.id);
        deletedKeys.push(target.employeeCode);
      } else {
        deletedKeys.push(id);
      }
      saveDeletedAllocationKeys(Array.from(new Set(deletedKeys)));

      const filtered = current.filter(
        (a) => a.id !== id && a.employeeCode !== id && a.employeeCode !== targetCode
      );
      localStorage.setItem('jaago_pnc_leave_allocations_v3', JSON.stringify(filtered));

      window.dispatchEvent(new CustomEvent('jaago_leave_allocation_updated', { detail: { deletedId: id, all: filtered } }));
    } catch {}
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('leave_allocations').delete().or(`id.eq.${id},employee_code.eq.${targetCode || id}`);
    }
  } catch {}
  return true;
}

export async function deleteBulkLeaveAllocations(ids: string[]): Promise<boolean> {
  const deletedKeys = getDeletedAllocationKeys();
  const idSet = new Set(ids);

  if (typeof window !== 'undefined') {
    try {
      const current = await fetchLeaveAllocations();
      const codeSet = new Set<string>();

      current.forEach((a) => {
        if (idSet.has(a.id) || idSet.has(a.employeeCode)) {
          deletedKeys.push(a.id);
          deletedKeys.push(a.employeeCode);
          codeSet.add(a.employeeCode);
        }
      });
      ids.forEach((id) => deletedKeys.push(id));
      saveDeletedAllocationKeys(Array.from(new Set(deletedKeys)));

      const filtered = current.filter(
        (a) => !idSet.has(a.id) && !idSet.has(a.employeeCode) && !codeSet.has(a.employeeCode)
      );
      localStorage.setItem('jaago_pnc_leave_allocations_v3', JSON.stringify(filtered));

      window.dispatchEvent(new CustomEvent('jaago_leave_allocation_updated', { detail: { deletedIds: ids, all: filtered } }));
    } catch {}
  }

  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const id of ids) {
        await supabase.from('leave_allocations').delete().or(`id.eq.${id},employee_code.eq.${id}`);
      }
    }
  } catch {}
  return true;
}

// ── PUBLIC HOLIDAYS ───────────────────────────────────────────────────────
export async function fetchPublicHolidays(): Promise<PublicHolidayItem[]> {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('jaago_pnc_public_holidays_v3');
      if (cached) return JSON.parse(cached);
    } catch {}
  }
  return INITIAL_PUBLIC_HOLIDAYS;
}

export async function savePublicHoliday(holiday: PublicHolidayItem): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const current = await fetchPublicHolidays();
      const idx = current.findIndex((h) => h.id === holiday.id);
      let updated: PublicHolidayItem[];
      if (idx >= 0) {
        updated = [...current];
        updated[idx] = holiday;
      } else {
        updated = [holiday, ...current];
      }
      localStorage.setItem('jaago_pnc_public_holidays_v3', JSON.stringify(updated));

      window.dispatchEvent(new CustomEvent('jaago_public_holidays_updated', { detail: { holiday, all: updated } }));
    } catch {}
  }
  return true;
}

export async function deletePublicHoliday(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const current = await fetchPublicHolidays();
      const filtered = current.filter((h) => h.id !== id);
      localStorage.setItem('jaago_pnc_public_holidays_v3', JSON.stringify(filtered));

      window.dispatchEvent(new CustomEvent('jaago_public_holidays_updated', { detail: { deletedId: id, all: filtered } }));
    } catch {}
  }
  return true;
}

// ── LEAVE POLICIES / CONFIG ───────────────────────────────────────────────
export async function fetchLeavePolicies(): Promise<LeavePolicyConfig[]> {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('jaago_pnc_leave_policies_v3');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.leaveTypes) {
          return parsed;
        }
      }
    } catch {}
  }
  return INITIAL_LEAVE_POLICIES;
}

export async function saveLeavePolicy(policy: LeavePolicyConfig): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const current = await fetchLeavePolicies();
      const idx = current.findIndex((p) => p.id === policy.id);
      let updated: LeavePolicyConfig[];
      if (idx >= 0) {
        updated = [...current];
        updated[idx] = policy;
      } else {
        updated = [policy, ...current];
      }
      localStorage.setItem('jaago_pnc_leave_policies_v3', JSON.stringify(updated));
    } catch {}
  }
  return true;
}

export async function deleteLeavePolicy(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const current = await fetchLeavePolicies();
      const filtered = current.filter((p) => p.id !== id);
      localStorage.setItem('jaago_pnc_leave_policies_v3', JSON.stringify(filtered));
    } catch {}
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. COMPENSATORY LEAVE (COMP OFF) ENGINE & SUPABASE LEDGER SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export const STORAGE_KEY_COMP_LEDGER_V2 = 'jaago_pnc_compensatory_ledger_v2';

/**
 * Calculates official Compensatory Leave Expiry Date:
 * Strictly 2 months (60 calendar days) from the duty date.
 */
export function calculateCompOffExpiryDate(dutyDateStr: string): string {
  const dt = new Date(dutyDateStr);
  if (isNaN(dt.getTime())) return '';
  const expiry = new Date(dt);
  expiry.setMonth(expiry.getMonth() + 2);
  return expiry.toISOString().split('T')[0]!;
}

/**
 * Checks if a given Compensatory Leave ledger entry is expired based on current local time.
 */
export function isCompOffEntryExpired(expiryDateStr: string): boolean {
  if (!expiryDateStr) return false;
  const todayStr = new Date().toISOString().split('T')[0]!;
  return expiryDateStr < todayStr;
}

/**
 * Validates whether a specific Date is a weekend for a given employee based on their
 * workingSchedule or weekendDays config (defaulting to Friday & Saturday in Bangladesh).
 */
export function isDateEmployeeWeekend(
  date: Date | string,
  weekendDaysStr: string = 'Friday & Saturday',
  workingScheduleStr?: string
): boolean {
  const dt = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dt.getTime())) return false;

  const dayIndex = dt.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[dayIndex]!;

  if (workingScheduleStr) {
    const wsLower = workingScheduleStr.toLowerCase();
    if (wsLower.includes('sun-thu') || wsLower.includes('sunday to thursday')) {
      return dayIndex === 5 || dayIndex === 6;
    }
  }

  if (weekendDaysStr) {
    const wkLower = weekendDaysStr.toLowerCase();
    if (wkLower.includes(dayName.toLowerCase())) return true;
    if (wkLower.includes('friday') && dayIndex === 5) return true;
    if (wkLower.includes('saturday') && dayIndex === 6) return true;
    if (wkLower.includes('sunday') && dayIndex === 0) return true;
    if (wkLower.includes('thursday') && dayIndex === 4) return true;
  }

  // Bangladesh NGO / JAAGO standard weekend: Friday & Saturday
  return dayIndex === 5 || dayIndex === 6;
}

/**
 * Helper to parse time strings like '10:00 AM' or '18:00' to minutes from midnight.
 */
export function parseDutyTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 600; // 10:00 AM
  const clean = timeStr.trim().toUpperCase();
  let hours = 0;
  let minutes = 0;

  if (clean.includes('AM') || clean.includes('PM')) {
    const isPM = clean.includes('PM');
    const timePart = clean.replace('AM', '').replace('PM', '').trim();
    const [hStr, mStr] = timePart.split(':');
    let rawH = Number(hStr) || 0;
    minutes = Number(mStr) || 0;
    if (isPM && rawH < 12) rawH += 12;
    if (!isPM && rawH === 12) rawH = 0;
    hours = rawH;
  } else {
    const [hStr, mStr] = clean.split(':');
    hours = Number(hStr) || 0;
    minutes = Number(mStr) || 0;
  }
  return hours * 60 + minutes;
}

/**
 * Calculates a comprehensive summary of Compensatory Leave balance from ledger entries:
 * - totalHoursEarned: all earned hours
 * - totalHoursUtilized: all redeemed hours
 * - availableHours: non-expired active remaining balance
 * - expiredHours: unutilized balance from expired entries
 * - accumulatedPendingHours: balance under 4 hours (safely stored, but cannot be redeemed yet)
 * - usableHalfDays: 4 hours = Half Day
 * - usableFullDays: 8 hours = Full Day
 */
export function calculateCompensatoryBalanceSummary(entries: CompensatoryLedgerEntry[]): CompensatoryBalanceSummary {
  const todayStr = new Date().toISOString().split('T')[0]!;
  let totalHoursEarned = 0;
  let totalHoursUtilized = 0;
  let availableHours = 0;
  let expiredHours = 0;

  for (const entry of entries) {
    const isExpired = entry.expiryDate < todayStr;
    totalHoursEarned += Number(entry.hoursEarned) || 0;
    totalHoursUtilized += Number(entry.hoursUtilized) || 0;

    if (isExpired) {
      if (entry.remainingBalance > 0) {
        expiredHours += Number(entry.remainingBalance) || 0;
      }
    } else if (entry.status !== 'FULLY_UTILIZED') {
      availableHours += Math.max(0, Number(entry.remainingBalance) || 0);
    }
  }

  totalHoursEarned = Math.round(totalHoursEarned * 100) / 100;
  totalHoursUtilized = Math.round(totalHoursUtilized * 100) / 100;
  availableHours = Math.round(availableHours * 100) / 100;
  expiredHours = Math.round(expiredHours * 100) / 100;

  const usableFullDays = Math.floor(availableHours / 8);
  const usableHalfDays = Math.floor(availableHours / 4);
  const accumulatedPendingHours = availableHours < 4 ? availableHours : Math.round((availableHours % 4) * 100) / 100;

  return {
    totalHoursEarned,
    totalHoursUtilized,
    availableHours,
    expiredHours,
    accumulatedPendingHours,
    usableHalfDays,
    usableFullDays,
  };
}

/**
 * Canonical Initial Compensatory Leave Seed Data for Nasif Kamal (FO032507061190)
 * Demonstrates:
 * - 8h full day earned on weekend (active)
 * - 4h half day earned on weekend (active)
 * - 3h partial day (< 4h accumulated balance, stored in Supabase)
 * - 8h expired duty (> 2 months ago, automatically expired)
 */
export const INITIAL_COMPENSATORY_LEDGER: CompensatoryLedgerEntry[] = [
  {
    id: 'cpl-seed-001',
    tenantId: 'jaago-main',
    employeeId: 'emp-FO032507061190',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    onDutyRequestId: 'od-seed-wknd1',
    dutyDate: '2026-08-21',
    dutyReason: 'Critical cloud infrastructure server migration over weekend',
    dutyType: 'WEEKEND',
    hoursEarned: 8.0,
    hoursUtilized: 0.0,
    remainingBalance: 8.0,
    expiryDate: '2026-10-21',
    status: 'ACTIVE',
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-21T10:00:00Z',
  },
  {
    id: 'cpl-seed-002',
    tenantId: 'jaago-main',
    employeeId: 'emp-FO032507061190',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    onDutyRequestId: 'od-seed-wknd2',
    dutyDate: '2026-08-28',
    dutyReason: 'Emergency network failover drill on weekend',
    dutyType: 'WEEKEND',
    hoursEarned: 4.0,
    hoursUtilized: 0.0,
    remainingBalance: 4.0,
    expiryDate: '2026-10-28',
    status: 'ACTIVE',
    createdAt: '2026-08-28T10:00:00Z',
    updatedAt: '2026-08-28T10:00:00Z',
  },
  {
    id: 'cpl-seed-003',
    tenantId: 'jaago-main',
    employeeId: 'emp-FO032507061190',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    onDutyRequestId: 'od-seed-wknd3',
    dutyDate: '2026-09-04',
    dutyReason: 'Field backup testing (3 hours partial weekend duty)',
    dutyType: 'WEEKEND',
    hoursEarned: 3.0,
    hoursUtilized: 0.0,
    remainingBalance: 3.0,
    expiryDate: '2026-11-04',
    status: 'ACTIVE',
    createdAt: '2026-09-04T10:00:00Z',
    updatedAt: '2026-09-04T10:00:00Z',
  },
  {
    id: 'cpl-seed-004',
    tenantId: 'jaago-main',
    employeeId: 'emp-FO032507061190',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    onDutyRequestId: 'od-seed-exp1',
    dutyDate: '2026-06-15',
    dutyReason: 'Q2 Fiscal Close system deployment support',
    dutyType: 'WEEKEND',
    hoursEarned: 8.0,
    hoursUtilized: 0.0,
    remainingBalance: 8.0,
    expiryDate: '2026-08-15',
    status: 'EXPIRED',
    createdAt: '2026-06-15T10:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
  },
];

export function getLocalCompensatoryLedger(): CompensatoryLedgerEntry[] {
  if (typeof window === 'undefined') return INITIAL_COMPENSATORY_LEDGER;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COMP_LEDGER_V2);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_COMP_LEDGER_V2, JSON.stringify(INITIAL_COMPENSATORY_LEDGER));
      return INITIAL_COMPENSATORY_LEDGER;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_COMPENSATORY_LEDGER;
  } catch {
    return INITIAL_COMPENSATORY_LEDGER;
  }
}

export function saveLocalCompensatoryLedger(entries: CompensatoryLedgerEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_COMP_LEDGER_V2, JSON.stringify(entries));
  } catch (err) {
    console.error('Error saving compensatory leave ledger to localStorage:', err);
  }
}

export function mapRowToCompensatoryLedger(row: any): CompensatoryLedgerEntry {
  const hoursEarned = Number(row.hours_earned ?? 0);
  const hoursUtilized = Number(row.hours_utilized ?? 0);
  const remainingBalance = Number(row.remaining_balance ?? Math.max(0, hoursEarned - hoursUtilized));
  const expiryDate = row.expiry_date || calculateCompOffExpiryDate(row.duty_date);
  const isExpired = isCompOffEntryExpired(expiryDate);

  let status: CompensatoryLedgerStatus = (row.status || 'ACTIVE') as CompensatoryLedgerStatus;
  if (remainingBalance <= 0) {
    status = 'FULLY_UTILIZED';
  } else if (isExpired) {
    status = 'EXPIRED';
  }

  return {
    id: String(row.id || `cpl-${Date.now()}`),
    tenantId: row.tenant_id || 'jaago-main',
    employeeId: row.employee_id || '',
    employeeCode: row.employee_code || '',
    employeeName: row.employee_name || '',
    onDutyRequestId: row.on_duty_request_id || undefined,
    dutyDate: row.duty_date,
    dutyReason: row.duty_reason || '',
    dutyType: (row.duty_type || 'WEEKEND') as CompensatoryDutyType,
    holidayName: row.holiday_name || undefined,
    hoursEarned,
    hoursUtilized,
    remainingBalance,
    expiryDate,
    status,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Fetches Compensatory Leave Ledger entries from Supabase (with fallback to local storage).
 * Automatically evaluates 2-month expiry for every entry.
 */
export async function fetchCompensatoryLedger(employeeCode?: string): Promise<CompensatoryLedgerEntry[]> {
  const localList = getLocalCompensatoryLedger();
  const supabase = getSupabase();
  const todayStr = new Date().toISOString().split('T')[0]!;

  let entries = localList;

  if (supabase) {
    try {
      let query = supabase
        .from('compensatory_leave_ledger')
        .select('*')
        .order('duty_date', { ascending: false });

      if (employeeCode) {
        query = query.eq('employee_code', employeeCode);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        entries = data.map(mapRowToCompensatoryLedger);
        if (!employeeCode) {
          saveLocalCompensatoryLedger(entries);
        }
      }
    } catch (err) {
      console.warn('Exception querying compensatory_leave_ledger from Supabase:', err);
    }
  }

  // Normalize and enforce 2-month expiry
  const normalized = entries.map((entry) => {
    const isExpired = entry.expiryDate < todayStr;
    if (isExpired && entry.status === 'ACTIVE') {
      return { ...entry, status: 'EXPIRED' as const };
    }
    return entry;
  });

  if (employeeCode) {
    return normalized.filter((e) => e.employeeCode === employeeCode);
  }

  return normalized;
}

/**
 * Persists a Compensatory Leave Ledger entry to Supabase & localStorage.
 */
export async function saveCompensatoryLedgerEntry(entry: CompensatoryLedgerEntry): Promise<boolean> {
  const current = getLocalCompensatoryLedger();
  const idx = current.findIndex((e) => e.id === entry.id);
  const updated = idx >= 0 ? current.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...current];
  saveLocalCompensatoryLedger(updated);

  const supabase = getSupabase();
  if (supabase) {
    (async () => {
      try {
        await supabase.from('compensatory_leave_ledger').upsert({
          id: entry.id,
          tenant_id: entry.tenantId || 'jaago-main',
          employee_id: entry.employeeId || '',
          employee_code: entry.employeeCode,
          employee_name: entry.employeeName || '',
          on_duty_request_id: entry.onDutyRequestId,
          duty_date: entry.dutyDate,
          duty_reason: entry.dutyReason,
          duty_type: entry.dutyType,
          holiday_name: entry.holidayName,
          hours_earned: entry.hoursEarned,
          hours_utilized: entry.hoursUtilized,
          remaining_balance: entry.remainingBalance,
          expiry_date: entry.expiryDate,
          status: entry.status,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Supabase compensatory_leave_ledger insert error:', err);
      }
    })();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jaago_compensatory_updated', { detail: { entry, all: updated } }));
  }

  return true;
}

/**
 * Automatically synchronizes approved On-Duty work into the Compensatory Leave Ledger:
 * 1. Scans approved On Duty requests.
 * 2. Checks each duty day against official People & Culture Public Holidays and Employee Weekends.
 * 3. Hours worked accumulate automatically.
 * 4. Less than 4 hours remains as accumulated balance stored in Supabase.
 * 5. Automatically assigns 2-month expiry date.
 */
export async function syncOnDutyToCompensatoryLedger(targetEmployeeCode?: string): Promise<{ syncedCount: number }> {
  const holidays = await fetchPublicHolidays();

  let emps: any[] = [];
  try {
    emps = (await fetchEmployeesFromSupabase()) || [];
  } catch {}
  if (!emps || emps.length === 0) {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('jaago_pnc_employees_v2');
        if (cached) emps = JSON.parse(cached);
      } catch {}
    }
  }
  const empMap = new Map<string, any>();
  for (const e of emps) {
    if (e.code) empMap.set(e.code, e);
    if (e.id) empMap.set(e.id, e);
  }

  let onDutyRequests: any[] = [];
  const supabase = getSupabase();
  if (supabase) {
    try {
      let q = supabase.from('on_duty_requests').select('*').eq('status', 'APPROVED');
      if (targetEmployeeCode) {
        q = q.eq('employee_code', targetEmployeeCode);
      }
      const { data } = await q;
      if (data && Array.isArray(data)) onDutyRequests = data;
    } catch {}
  }
  if (onDutyRequests.length === 0 && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('jaago_pnc_onduty_requests_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          onDutyRequests = parsed.filter((r: any) => r.status === 'APPROVED');
          if (targetEmployeeCode) {
            onDutyRequests = onDutyRequests.filter(
              (r: any) => r.employeeCode === targetEmployeeCode || r.employee_code === targetEmployeeCode
            );
          }
        }
      }
    } catch {}
  }

  const currentLedger = await fetchCompensatoryLedger();
  const ledgerMap = new Map<string, CompensatoryLedgerEntry>();
  for (const entry of currentLedger) {
    ledgerMap.set(entry.id, entry);
  }

  let syncedCount = 0;
  const todayStr = new Date().toISOString().split('T')[0]!;

  for (const od of onDutyRequests) {
    const empCode = od.employee_code || od.employeeCode;
    const empName = od.employee_name || od.employeeName || 'Staff Member';
    const empId = od.employee_id || od.employeeId;
    const odId = od.id;
    const reason = od.reason || 'Approved On Duty Field Work';
    const startDateStr = od.start_date || (od.start_at ? od.start_at.slice(0, 10) : od.startDate);
    const endDateStr = od.end_date || (od.end_at ? od.end_at.slice(0, 10) : od.endDate) || startDateStr;
    const startTimeStr = od.start_time || od.startTime || '10:00 AM';
    const endTimeStr = od.end_time || od.endTime || '06:00 PM';

    if (!empCode || !startDateStr) continue;

    const empInfo = empMap.get(empCode) || empMap.get(empId);
    const weekendDaysStr = empInfo?.weekendDays || empInfo?.weekend_days || 'Friday & Saturday';
    const workingScheduleStr = empInfo?.workingSchedule || empInfo?.working_schedule;

    const sDate = new Date(startDateStr);
    const eDate = new Date(endDateStr);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) continue;

    const curr = new Date(sDate);
    while (curr <= eDate) {
      const dateIso = curr.toISOString().split('T')[0]!;
      const isWeekend = isDateEmployeeWeekend(curr, weekendDaysStr, workingScheduleStr);
      const holiday = getGovernmentHolidayOnDate(dateIso, holidays);
      const isPublicHoliday = Boolean(holiday);

      // Only count holiday (People & Culture public holiday) / weekend (employee working schedule)
      if (isWeekend || isPublicHoliday) {
        const entryId = `cpl-od-${odId}-${dateIso}`;
        const existingEntry = ledgerMap.get(entryId);

        let hoursWorked = 8.0;
        if (startDateStr === endDateStr) {
          const startMin = parseDutyTimeToMinutes(startTimeStr);
          const endMin = parseDutyTimeToMinutes(endTimeStr);
          const diffHours = Math.max(0, endMin - startMin) / 60;
          hoursWorked = Math.min(8.0, Math.round(diffHours * 100) / 100);
          if (hoursWorked <= 0) hoursWorked = Number(od.total_hours || od.totalHours || 8.0);
        } else {
          hoursWorked = 8.0;
        }

        const expiryDate = calculateCompOffExpiryDate(dateIso);
        const isExpired = expiryDate < todayStr;
        const utilized = existingEntry ? Number(existingEntry.hoursUtilized) || 0 : 0;
        const remaining = Math.max(0, hoursWorked - utilized);

        let status: CompensatoryLedgerStatus = 'ACTIVE';
        if (remaining <= 0) {
          status = 'FULLY_UTILIZED';
        } else if (isExpired) {
          status = 'EXPIRED';
        }

        let dutyType: CompensatoryDutyType = 'WEEKEND';
        if (isWeekend && isPublicHoliday) dutyType = 'BOTH';
        else if (isPublicHoliday) dutyType = 'PUBLIC_HOLIDAY';

        const newOrUpdatedEntry: CompensatoryLedgerEntry = {
          id: entryId,
          tenantId: 'jaago-main',
          employeeId: empId,
          employeeCode: empCode,
          employeeName: empName,
          onDutyRequestId: odId,
          dutyDate: dateIso,
          dutyReason: reason,
          dutyType,
          holidayName: holiday?.title || undefined,
          hoursEarned: hoursWorked,
          hoursUtilized: utilized,
          remainingBalance: remaining,
          expiryDate,
          status,
          createdAt: existingEntry ? existingEntry.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        ledgerMap.set(entryId, newOrUpdatedEntry);
        syncedCount++;
      }

      curr.setDate(curr.getDate() + 1);
    }
  }

  const fullLedger = Array.from(ledgerMap.values());
  saveLocalCompensatoryLedger(fullLedger);

  if (supabase) {
    (async () => {
      try {
        for (const item of fullLedger) {
          await supabase.from('compensatory_leave_ledger').upsert({
            id: item.id,
            tenant_id: item.tenantId || 'jaago-main',
            employee_id: item.employeeId || '',
            employee_code: item.employeeCode,
            employee_name: item.employeeName || '',
            on_duty_request_id: item.onDutyRequestId,
            duty_date: item.dutyDate,
            duty_reason: item.dutyReason,
            duty_type: item.dutyType,
            holiday_name: item.holidayName,
            hours_earned: item.hoursEarned,
            hours_utilized: item.hoursUtilized,
            remaining_balance: item.remainingBalance,
            expiry_date: item.expiryDate,
            status: item.status,
            updated_at: item.updatedAt,
          });
        }
      } catch (err) {
        console.warn('Supabase compensatory_leave_ledger sync error:', err);
      }
    })();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jaago_compensatory_updated', { detail: { count: syncedCount } }));
  }

  return { syncedCount };
}

/**
 * Deducts Compensatory Leave hours from the employee's ledger using First-In, First-Out (FIFO)
 * on active, non-expired ledger entries.
 */
export async function redeemCompensatoryHours(
  employeeCode: string,
  hoursToRedeem: number,
  _leaveRequestId?: string
): Promise<{ success: boolean; redeemedHours: number; error?: string }> {
  if (hoursToRedeem <= 0) return { success: true, redeemedHours: 0 };

  const allLedger = await fetchCompensatoryLedger();
  const todayStr = new Date().toISOString().split('T')[0]!;

  // Select active unexpired entries for this employee, sorted by expiryDate ascending (FIFO)
  const empEntries = allLedger
    .filter(
      (e) =>
        e.employeeCode === employeeCode &&
        e.status === 'ACTIVE' &&
        Number(e.remainingBalance) > 0 &&
        e.expiryDate >= todayStr
    )
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  const totalAvailable = empEntries.reduce((acc, curr) => acc + (Number(curr.remainingBalance) || 0), 0);
  if (totalAvailable < hoursToRedeem) {
    return {
      success: false,
      redeemedHours: 0,
      error: `Insufficient active Compensatory Leave balance. Available: ${totalAvailable}h, requested: ${hoursToRedeem}h`,
    };
  }

  let remainingToRedeem = hoursToRedeem;
  const updatedLedgerMap = new Map<string, CompensatoryLedgerEntry>(allLedger.map((e) => [e.id, { ...e }]));

  for (const entry of empEntries) {
    if (remainingToRedeem <= 0) break;
    const target = updatedLedgerMap.get(entry.id);
    if (!target) continue;

    const currentRem = Number(target.remainingBalance) || 0;
    const deduct = Math.min(currentRem, remainingToRedeem);
    target.hoursUtilized = Math.round(((Number(target.hoursUtilized) || 0) + deduct) * 100) / 100;
    target.remainingBalance = Math.round((currentRem - deduct) * 100) / 100;
    remainingToRedeem = Math.round((remainingToRedeem - deduct) * 100) / 100;

    if (target.remainingBalance <= 0) {
      target.status = 'FULLY_UTILIZED';
    }
    target.updatedAt = new Date().toISOString();
  }

  const updatedList = Array.from(updatedLedgerMap.values());
  saveLocalCompensatoryLedger(updatedList);

  const supabase = getSupabase();
  if (supabase) {
    (async () => {
      try {
        for (const item of updatedList.filter((e) => e.employeeCode === employeeCode)) {
          await supabase.from('compensatory_leave_ledger').upsert({
            id: item.id,
            hours_utilized: item.hoursUtilized,
            remaining_balance: item.remainingBalance,
            status: item.status,
            updated_at: item.updatedAt,
          });
        }
      } catch (err) {
        console.warn('Supabase compensatory_leave_ledger redeem error:', err);
      }
    })();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jaago_compensatory_updated', { detail: { redeemed: hoursToRedeem } }));
  }

  return { success: true, redeemedHours: hoursToRedeem };
}

