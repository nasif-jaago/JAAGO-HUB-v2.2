import { getSupabase } from './supabase-auth';
import { fetchEmployeesFromSupabase } from './supabase-employees';

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
  bereavementUsed: number;
  unpaidUsed: number;
  fiscalYear: string; // e.g. '2026-2027'
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
      'Apply at least 1 day before.',
      'Maximum 3 consecutive days at a time.',
      'Not allowed during probation period.',
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
export async function fetchLeaveRequests(): Promise<LeaveRequestItem[]> {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => {
          let attachmentName = row.attachment_name || '';
          let rawReason = row.reason || '';
          if (!attachmentName && /\[Attachment:\s*([\s\S]*?)\]/i.test(rawReason)) {
            const match = rawReason.match(/\[Attachment:\s*([\s\S]*?)\]/i);
            if (match && match[1]) attachmentName = match[1].trim();
          }
          let rejectionReason = row.rejection_reason || '';
          if (!rejectionReason && /\[Refusal Note:\s*([\s\S]*?)\]/i.test(rawReason)) {
            const match = rawReason.match(/\[Refusal Note:\s*([\s\S]*?)\]/i);
            if (match && match[1]) rejectionReason = match[1].trim();
          }
          const cleanReason = rawReason
            .replace(/\[Attachment:\s*[\s\S]*?\]/gi, '')
            .replace(/\[Refusal Note:\s*[\s\S]*?\]/gi, '')
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
            reason: cleanReason,
            rejectionReason: rejectionReason || undefined,
            attachmentName: attachmentName || undefined,
            status: (row.status as LeaveStatus) || 'Pending',
            appliedAt: row.applied_at || row.created_at,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
          };
        });
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
        // Filter out any legacy mock entries
        const clean = parsed.filter(
          (r) => !['lv-101', 'lv-102', 'lv-103', 'lv-104'].includes(r.id)
        );
        return clean;
      }
    } catch {}
  }
  return [];
}

function syncLeaveToAttendanceLogs(request: LeaveRequestItem) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('jaago_pnc_attendance_logs_v2');
    let logs: any[] = raw ? JSON.parse(raw) : [];

    const start = new Date(request.fromDate);
    const end = new Date(request.toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    const current = new Date(start);

    if (request.status === 'Approved') {
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const logId = `att-leave-${request.employeeCode}-${dateStr}`;
        const isHalf = request.halfDayType && request.halfDayType !== 'Full Day';
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
          checkInTime: request.halfDayType === 'Second Half' ? '02:00 PM' : undefined,
          checkOutTime: request.halfDayType === 'First Half' ? '02:00 PM' : undefined,
          notes: `Approved Leave: ${request.leaveType}${isHalf ? ` (${request.halfDayType})` : ''} - ${request.reason}`,
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

    localStorage.setItem('jaago_pnc_attendance_logs_v2', JSON.stringify(logs));
  } catch (err) {
    console.warn('Attendance log sync error:', err);
  }
}

export async function saveLeaveRequest(request: LeaveRequestItem): Promise<boolean> {
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
      if (request.attachmentName && !finalReason.includes('[Attachment:')) {
        finalReason = `[Attachment: ${request.attachmentName}] ${finalReason}`.trim();
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

  // 2. Fetch approved requests to calculate used balances
  const requests = await fetchLeaveRequests();
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

  // 4. Construct comprehensive list of allocations for all active employees
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
    const isProbation = emp.probationaryStatus === 'Probationary' || emp.leaveGroup === 'Probationary Staff';

    // Base allocations (from custom cache, or employee profile fields, or standard defaults)
    const casualAlloc = existing?.casualAllocated ?? (emp.casualLeaveAllocated ? Number(emp.casualLeaveAllocated) : isProbation ? 0 : isDsp ? 12 : 10);
    const medicalAlloc = existing?.medicalAllocated ?? (emp.sickLeaveAllocated ? Number(emp.sickLeaveAllocated) : isProbation ? 3 : 10);
    const emergencyAlloc = existing?.emergencyAllocated ?? (emp.specialLeaveAllocated ? Number(emp.specialLeaveAllocated) : isProbation ? 3 : 4);
    const annualAlloc = existing?.annualAllocated ?? (emp.earnedLeaveAllocated ? Number(emp.earnedLeaveAllocated) : isProbation ? 0 : 15);
    const maternityAlloc = existing?.maternityAllocated ?? (isProbation ? 90 : 120);
    const paternityAlloc = existing?.paternityAllocated ?? (isProbation ? 7 : 15);
    const compOffAlloc = existing?.compOffAllocated ?? 16;

    const allocationItem: LeaveAllocationItem = {
      id: existing?.id || `alloc-${emp.code}`,
      employeeId: emp.id || existing?.employeeId || `emp-${emp.code}`,
      employeeCode: emp.code,
      employeeName: emp.name || existing?.employeeName || 'Staff Member',
      department: emp.department || existing?.department || "Founder's Office",
      designation: emp.designation || existing?.designation || 'Staff',
      avatarUrl: emp.avatarUrl || existing?.avatarUrl || '',
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
      compOffUsed: coUsed,
      bereavementUsed: blUsed,
      unpaidUsed: unpaidUsed,
      fiscalYear: existing?.fiscalYear || '2026-2027',
    };

    resultMap.set(emp.code, allocationItem);
  }

  // Include any extra cached items that weren't in employees list (as long as not deleted)
  for (const [code, item] of cachedMap.entries()) {
    if (!resultMap.has(code) && !deletedKeysSet.has(item.id) && !deletedKeysSet.has(code)) {
      resultMap.set(code, item);
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
  if (typeof window !== 'undefined') {
    try {
      const current = await fetchLeaveAllocations();
      const updated = [...current];
      const itemsToUnDelete = new Set<string>();

      for (const item of items) {
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

      window.dispatchEvent(new CustomEvent('jaago_leave_allocation_updated', { detail: { items, all: updated } }));
      window.dispatchEvent(new CustomEvent('jaago_employees_updated'));
    } catch {}
  }

  // Sync to Supabase employees table
  try {
    const supabase = getSupabase();
    if (supabase) {
      for (const item of items) {
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
