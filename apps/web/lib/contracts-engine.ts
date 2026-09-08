/**
 * JAAGO HUB — Employment Contracts Engine & Governance Core
 * 100% Connected with Real Employee Profiles
 * Adheres to ANTIGRAVITY-EMPLOYEE-CONTRACT-MODULE.md & Master Constitution
 */

import { FullEmployeeProfile } from './supabase-employees';

export type ContractType =
  | 'Permanent'
  | 'Fixed-Term'
  | 'Probationary'
  | 'Consultant'
  | 'Intern'
  | 'Project-Based';

export type WorkingSchedule =
  | 'Full-Time'
  | 'Part-Time'
  | 'Shift-Based'
  | 'Flexible';

export type ContractStatus = 'Active' | 'Expiring' | 'Ended' | 'Upcoming';

export type ContractLifecycleStatus =
  | 'draft'
  | 'issued'
  | 'active'
  | 'terminated'
  | 'expired'
  | 'cancelled';

export interface EmploymentContractVersion {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeAvatar?: string;
  department: string;
  project: string;
  organization: 'JAAGO Foundation' | 'JAAGO Foundation Trust';
  branch?: string;
  designation: string;
  contractNo: string;
  contractType: ContractType;
  workingSchedule: WorkingSchedule;
  effectiveDate: string; // YYYY-MM-DD (drives versioning)
  startDate: string;     // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null for permanent
  probationMonths?: number;
  placeOfPosting?: string;
  reportingTo?: string;
  remunerationAmount?: number;
  statusLifecycle: ContractLifecycleStatus;
  supersedesId?: string | null;
  supersededAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const EXPIRY_WINDOW_DAYS = 60;

/**
 * Normalizes raw contract type string from employee profile to official ContractType enum
 */
export function normalizeContractType(
  rawType?: string,
  endDate?: string | null,
  employeeType?: string,
  probationStatus?: string
): ContractType {
  const typeStr = (rawType || '').toLowerCase();
  const empTypeStr = (employeeType || '').toLowerCase();

  if (typeStr.includes('intern') || empTypeStr.includes('intern')) {
    return 'Intern';
  }
  if (typeStr.includes('consultant') || empTypeStr.includes('consultant')) {
    return 'Consultant';
  }
  if (typeStr.includes('project') || empTypeStr.includes('project')) {
    return 'Project-Based';
  }
  if (
    typeStr.includes('probation') ||
    empTypeStr.includes('probation') ||
    (probationStatus && probationStatus.includes('Probation'))
  ) {
    return 'Probationary';
  }
  if (typeStr.includes('fixed') || (endDate && endDate.trim() !== '' && endDate !== '-')) {
    return 'Fixed-Term';
  }
  if (typeStr.includes('part-time') || typeStr.includes('part time')) {
    return 'Fixed-Term';
  }
  return 'Permanent';
}

/**
 * Normalizes raw working schedule string to official WorkingSchedule enum
 */
export function normalizeWorkingSchedule(rawSchedule?: string): WorkingSchedule {
  const sched = (rawSchedule || '').toLowerCase();
  if (sched.includes('part-time') || sched.includes('part time')) {
    return 'Part-Time';
  }
  if (sched.includes('shift')) {
    return 'Shift-Based';
  }
  if (sched.includes('flex')) {
    return 'Flexible';
  }
  return 'Full-Time';
}

/**
 * Converts a live FullEmployeeProfile record into an EmploymentContractVersion
 */
export function convertEmployeeToContract(emp: FullEmployeeProfile): EmploymentContractVersion {
  const isTrust = emp.organization?.toLowerCase().includes('trust');
  const org: 'JAAGO Foundation' | 'JAAGO Foundation Trust' = isTrust
    ? 'JAAGO Foundation Trust'
    : 'JAAGO Foundation';

  const startDate = emp.joiningDate && emp.joiningDate.length >= 10
    ? emp.joiningDate.slice(0, 10)
    : '2024-01-01';

  const endDate = emp.contractEndDate && emp.contractEndDate.length >= 10 && emp.contractEndDate !== '-'
    ? emp.contractEndDate.slice(0, 10)
    : null;

  const contractType = normalizeContractType(
    emp.contractType,
    endDate,
    emp.employeeType,
    emp.probationaryStatus
  );

  const workingSchedule = normalizeWorkingSchedule(emp.workingSchedule);

  // Generate standardized contract reference number
  const prefix = isTrust ? 'JFT' : 'JF';
  const startYear = startDate.slice(0, 4) || '2024';
  const codeDigits = emp.code.replace(/[^0-9]/g, '').slice(-4) || '0101';
  const contractNo = `${prefix}/HR/CON/${startYear}/${codeDigits}`;

  const isTerminated =
    emp.status === 'Archived' ||
    emp.status === 'Terminated' ||
    emp.status === 'Resigned' ||
    emp.isArchived;

  return {
    id: `con-${emp.id || emp.code}`,
    tenantId: 'tenant-jaago-main',
    employeeId: emp.id || emp.code,
    employeeCode: emp.code,
    employeeName: emp.name,
    employeeAvatar: emp.avatarUrl || '',
    department: emp.department?.trim() || 'General Operations',
    project: emp.project?.trim() || 'Core / Org-wide',
    organization: org,
    branch: emp.branch?.trim() || 'Head Office (Banani)',
    designation: emp.designation?.trim() || 'Staff Member',
    contractNo,
    contractType,
    workingSchedule,
    effectiveDate: startDate,
    startDate,
    endDate,
    probationMonths: emp.probationaryStatus === 'On Probation' ? 6 : 3,
    placeOfPosting: emp.workLocation || emp.branch || 'Head Office (Banani), Dhaka',
    reportingTo: emp.supervisor || 'Head of Department',
    remunerationAmount: emp.wage || emp.regularSalary || emp.totalCurrentSalary || 0,
    statusLifecycle: isTerminated ? 'terminated' : 'active',
    notes: emp.remark || emp.payrollRemark || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Single deterministic contract status calculation.
 * Status is NEVER a stored column in the database.
 */
export function deriveContractStatus(
  contract: {
    startDate: string;
    endDate?: string | null;
    statusLifecycle?: string;
  },
  asOfStr: string = '2026-09-07'
): ContractStatus {
  if (contract.statusLifecycle === 'terminated' || contract.statusLifecycle === 'cancelled') {
    return 'Ended';
  }

  const asOf = new Date(asOfStr);
  const start = new Date(contract.startDate);

  if (start > asOf) {
    return 'Upcoming';
  }

  if (!contract.endDate) {
    return 'Active';
  }

  const end = new Date(contract.endDate);
  if (end < asOf) {
    return 'Ended';
  }

  const diffTime = end.getTime() - asOf.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0 && diffDays <= EXPIRY_WINDOW_DAYS) {
    return 'Expiring';
  }

  return 'Active';
}

/**
 * Calculates remaining days until contract expiry as of a given date.
 */
export function getDaysRemaining(
  endDate: string | null,
  asOfStr: string = '2026-09-07'
): number | null {
  if (!endDate) return null;
  const asOf = new Date(asOfStr);
  const end = new Date(endDate);
  const diffTime = end.getTime() - asOf.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Resolves the currently-effective contract version for an employee as of `asOfDate`.
 */
export function resolveCurrentContract(
  allVersions: EmploymentContractVersion[],
  employeeId: string,
  asOfStr: string = '2026-09-07'
): EmploymentContractVersion | null {
  const empVersions = allVersions.filter(
    (v) => v.employeeId === employeeId || v.employeeCode === employeeId
  );
  if (empVersions.length === 0) return null;

  const validVersions = empVersions.filter((v) => {
    if (v.effectiveDate > asOfStr) return false;
    if (v.supersededAt && v.supersededAt.slice(0, 10) <= asOfStr) return false;
    return true;
  });

  if (validVersions.length === 0) {
    return empVersions.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null;
  }

  return validVersions.sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0] ?? null;
}

/**
 * Resolves all currently-effective contracts across all employees.
 */
export function resolveAllCurrentContracts(
  allVersions: EmploymentContractVersion[],
  asOfStr: string = '2026-09-07'
): EmploymentContractVersion[] {
  const employeeIds = Array.from(new Set(allVersions.map((v) => v.employeeId || v.employeeCode)));
  const results: EmploymentContractVersion[] = [];

  for (const empId of employeeIds) {
    const curr = resolveCurrentContract(allVersions, empId, asOfStr);
    if (curr) results.push(curr);
  }

  return results;
}

export interface ContractsSummary {
  total: number;
  foundationCount: number;
  trustCount: number;
  activeCount: number;
  expiringCount: number;
  endedCount: number;
  upcomingCount: number;
}

/**
 * Derives aggregate summary metrics from currently-effective contracts.
 */
export function calculateContractsSummary(
  contracts: EmploymentContractVersion[],
  asOfStr: string = '2026-09-07'
): ContractsSummary {
  let foundationCount = 0;
  let trustCount = 0;
  let activeCount = 0;
  let expiringCount = 0;
  let endedCount = 0;
  let upcomingCount = 0;

  contracts.forEach((c) => {
    if (c.organization === 'JAAGO Foundation Trust') {
      trustCount++;
    } else {
      foundationCount++;
    }

    const status = deriveContractStatus(c, asOfStr);
    if (status === 'Active') activeCount++;
    else if (status === 'Expiring') expiringCount++;
    else if (status === 'Ended') endedCount++;
    else if (status === 'Upcoming') upcomingCount++;
  });

  return {
    total: contracts.length,
    foundationCount,
    trustCount,
    activeCount,
    expiringCount,
    endedCount,
    upcomingCount,
  };
}

export type PivotDimension =
  | 'Department'
  | 'Project'
  | 'Contract Type'
  | 'Working Schedule'
  | 'Status'
  | 'Entity';

export interface PivotMatrixResult {
  rowDimension: PivotDimension;
  colDimension: PivotDimension;
  rowKeys: string[];
  colKeys: string[];
  matrix: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

function getDimensionValue(
  contract: EmploymentContractVersion,
  dim: PivotDimension,
  asOfStr: string
): string {
  switch (dim) {
    case 'Department':
      return contract.department || 'Unassigned Department';
    case 'Project':
      return contract.project || 'General Operations';
    case 'Contract Type':
      return contract.contractType || 'Permanent';
    case 'Working Schedule':
      return contract.workingSchedule || 'Full-Time';
    case 'Status':
      return deriveContractStatus(contract, asOfStr);
    case 'Entity':
      return contract.organization === 'JAAGO Foundation Trust'
        ? 'Foundation Trust'
        : 'Foundation';
    default:
      return 'Other';
  }
}

/**
 * Computes 2D Cross-Tab Pivot Table Counts across any two dimensions.
 */
export function calculatePivotMatrix(
  contracts: EmploymentContractVersion[],
  rowDimension: PivotDimension = 'Department',
  colDimension: PivotDimension = 'Contract Type',
  asOfStr: string = '2026-09-07'
): PivotMatrixResult {
  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const matrix: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  contracts.forEach((c) => {
    const rowVal = getDimensionValue(c, rowDimension, asOfStr);
    const colVal = getDimensionValue(c, colDimension, asOfStr);

    rowSet.add(rowVal);
    colSet.add(colVal);

    if (!matrix[rowVal]) matrix[rowVal] = {};
    matrix[rowVal][colVal] = (matrix[rowVal][colVal] || 0) + 1;

    rowTotals[rowVal] = (rowTotals[rowVal] || 0) + 1;
    colTotals[colVal] = (colTotals[colVal] || 0) + 1;
    grandTotal++;
  });

  const rowKeys = Array.from(rowSet).sort();
  const colKeys = Array.from(colSet).sort();

  // Ensure full matrix is initialized with 0s
  rowKeys.forEach((r) => {
    if (!matrix[r]) matrix[r] = {};
    const rowRecord = matrix[r]!;
    colKeys.forEach((c) => {
      if (rowRecord[c] === undefined) {
        rowRecord[c] = 0;
      }
    });
  });

  return {
    rowDimension,
    colDimension,
    rowKeys,
    colKeys,
    matrix,
    rowTotals,
    colTotals,
    grandTotal,
  };
}

const LOCAL_STORAGE_CUSTOM_CONTRACTS_KEY = 'jaago_hr_contracts_custom_v2';

/**
 * Builds the complete list of Employment Contracts dynamically from live Employee Profiles,
 * merging any user-created custom contract revisions/amendments.
 */
export function buildContractsFromEmployees(
  employees: FullEmployeeProfile[]
): EmploymentContractVersion[] {
  if (!employees || employees.length === 0) return [];

  // 1. Convert all real employee profiles into their standard contracts
  const standardContracts = employees.map(convertEmployeeToContract);

  // 2. Load any custom amended contract versions created via the UI
  let customContracts: EmploymentContractVersion[] = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CONTRACTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          customContracts = parsed;
        }
      }
    } catch {}
  }

  // 3. Merge custom versions: if custom version exists for employee, use it or prepend it
  const customEmployeeIds = new Set(customContracts.map((c) => c.employeeId));
  const merged: EmploymentContractVersion[] = [...customContracts];

  standardContracts.forEach((std) => {
    if (!customEmployeeIds.has(std.employeeId)) {
      merged.push(std);
    }
  });

  return merged;
}

export function getStoredCustomContracts(): EmploymentContractVersion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_CONTRACTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredCustomContracts(customs: EmploymentContractVersion[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_CONTRACTS_KEY, JSON.stringify(customs));
    window.dispatchEvent(new CustomEvent('jaago_contracts_updated', { detail: customs }));
  } catch {}
}
