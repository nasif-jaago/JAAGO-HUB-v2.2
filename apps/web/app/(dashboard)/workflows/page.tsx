'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Ban,
  Building,
  User,
  History,
  Search,
  Paperclip,
  Download,
  ShieldCheck,
  Calendar,
  Briefcase,
  ShoppingCart,
  ClipboardList,
  Wallet,
  Receipt,
  Filter,
  MapPin,
  Package,
} from 'lucide-react';
import { EnterpriseTable, ColumnDef } from '@jaago/ui';
import { getCurrentUserSession, UserSessionData } from '@/lib/user-profile-sync';
import { downloadAttachment } from '@/lib/attachment-helper';
import { fetchEmployeesFromSupabase, FullEmployeeProfile } from '@/lib/supabase-employees';
import {
  approveAttendanceRegularization,
  refuseAttendanceRegularization,
  getLocalRegularizations,
} from '@/lib/supabase-regularization';
import {
  getLocalOnDutyRequests,
  approveOnDutyRequest,
  refuseOnDutyRequest,
  OnDutyRequestItem,
} from '@/lib/supabase-onduty';
import {
  getProcurementRequests,
  saveProcurementRequest,
} from '@/lib/supabase-procurement';
import {
  getFinanceAdvanceRequests,
  getFinanceLiquidations,
  saveFinanceAdvanceRequest,
  saveFinanceLiquidation,
} from '@/lib/supabase-finance';
import { dismissNotificationForEntity } from '@/lib/notifications';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/date-format';
import { cleanApplicantReason } from '@/lib/supabase-time-off';

export type WorkflowCategoryKey =
  | 'leave'
  | 'on_duty'
  | 'purchase_requisition'
  | 'general_requisition'
  | 'advance_liquidation';

export type RequestTypeFilter = 'ALL' | WorkflowCategoryKey;

export interface WorkflowInstance {
  id: string;
  definitionKey: string;
  categoryKey: WorkflowCategoryKey;
  categoryLabel: string;
  title: string;
  entityType: string;
  entityId: string;
  requesterId: string;
  requesterEmail?: string | undefined;
  currentState: 'pending_approval' | 'approved' | 'rejected';
  currentTier: number;
  totalTiers: number;
  metadata: {
    requesterName?: string | undefined;
    employeeCode?: string | undefined;
    department?: string | undefined;
    designation?: string | undefined;
    supervisorName?: string | undefined;
    supervisorEmail?: string | undefined;
    leaveType?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    totalDays?: number | string | undefined;
    reason?: string | undefined;
    rejectionReason?: string | undefined;
    attachmentName?: string | undefined;
    attachmentUrl?: string | undefined;
    approvedBy?: string | undefined;
    approvedAt?: string | undefined;
    amount?: string | undefined;
    currency?: string | undefined;
    vendor?: string | undefined;
    location?: string | undefined;
    // Regularization specific fields
    date?: string | undefined;
    originalCheckIn?: string | undefined;
    originalCheckOut?: string | undefined;
    originalStatus?: string | undefined;
    originalLateByMin?: number | undefined;
    adjustedCheckIn?: string | undefined;
    adjustedCheckOut?: string | undefined;
    adjustedStatus?: string | undefined;
    workingSchedule?: string | undefined;
    calculatedHours?: string | undefined;
    // On Duty specific fields
    startTime?: string | undefined;
    endTime?: string | undefined;
    destination?: string | undefined;
    purpose?: string | undefined;
    transportType?: string | undefined;
    totalHours?: number | undefined;
    creditedDays?: number | undefined;
    // Procurement (Purchase / General) specific fields
    prNumber?: string | undefined;
    requisitionType?: 'Purchase' | 'General' | 'Recruitment' | undefined;
    priority?: string | undefined;
    requiredDate?: string | undefined;
    lineItems?: Array<{
      id?: string | undefined;
      name: string;
      description?: string | undefined;
      quantity: number;
      unit?: string | undefined;
      unitCost: number;
      totalCost: number;
    }> | undefined;
    amountBDT?: number | undefined;
    justification?: string | undefined;
    project?: string | undefined;
    // Expense (Advance & Liquidation) specific fields
    expenseCode?: string | undefined;
    liquidationCode?: string | undefined;
    visitingPlace?: string | undefined;
    duration?: string | undefined;
    advanceAmountTaken?: number | undefined;
    totalActualExpenses?: number | undefined;
    variance?: number | undefined;
    settlementType?: string | undefined;
    bankName?: string | undefined;
    bankAccountNumber?: string | undefined;
    cashRequiredDate?: string | undefined;
    expenseSubtotals?: {
      longTravel?: number | undefined;
      accommodation?: number | undefined;
      perDiem?: number | undefined;
      localConveyance?: number | undefined;
      programExpenses?: number | undefined;
    } | undefined;
  };
  createdAt: string;
  updatedAt: string;
  history: Array<{
    fromState: string;
    toState: string;
    actorId: string;
    tier?: number | undefined;
    action: string;
    comment?: string | undefined;
    timestamp: string;
  }>;
}

function WorkflowsContent() {
  const searchParams = useSearchParams();
  const urlRequestId = searchParams.get('requestId');

  const [session, setSession] = useState<UserSessionData | null>(null);
  const [employees, setEmployees] = useState<FullEmployeeProfile[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);

  // Type Block Filter State (Clickable blocks at top)
  const [selectedType, setSelectedType] = useState<RequestTypeFilter>('ALL');

  // Status Tab Filter State
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'HISTORY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Refusal Modal State
  const [refusalModalInstance, setRefusalModalInstance] = useState<WorkflowInstance | null>(null);
  const [refusalNote, setRefusalNote] = useState('');

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadWorkflows = async (activeSession?: UserSessionData | null) => {
    try {
      const sess = activeSession || session || getCurrentUserSession();
      const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;

      const params = new URLSearchParams();
      if (sess) {
        if (sess.roles && sess.roles.length > 0) params.set('role', sess.roles[0] || 'staff');
        if (sess.email) params.set('userEmail', sess.email);
        if (sess.employeeCode) params.set('userCode', sess.employeeCode);
        if (sess.fullName) params.set('userName', sess.fullName);
      }

      // 1. Fetch server workflows (leave requests & server regularizations)
      const res = await fetch(`/api/v1/workflows?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      let rawServerItems: any[] = data.data || [];

      let combined: WorkflowInstance[] = rawServerItems.map((item: any) => ({
        ...item,
        categoryKey: 'leave' as WorkflowCategoryKey,
        categoryLabel:
          item.definitionKey === 'attendance_regularization'
            ? 'Attendance Regularization'
            : 'Leave Request',
      }));

      // 2. Merge local regularizations for instant UI responsiveness
      if (typeof window !== 'undefined') {
        const localRegs = getLocalRegularizations();
        const existingIds = new Set(combined.map((i) => i.id));
        localRegs.forEach((reg) => {
          if (!existingIds.has(reg.id)) {
            const isApproved = reg.status === 'Approved';
            const isRejected = reg.status === 'Refused' || reg.status === 'Rejected';
            combined.unshift({
              id: reg.id,
              definitionKey: 'attendance_regularization',
              categoryKey: 'leave',
              categoryLabel: 'Attendance Regularization',
              title: `Attendance Regularization (${formatDisplayDate(reg.date)}) - ${reg.employeeName}`,
              entityType: 'attendance_regularization',
              entityId: reg.id,
              requesterId: reg.employeeCode,
              requesterEmail: 'staff@jaago.com.bd',
              currentState: isApproved ? 'approved' : isRejected ? 'rejected' : 'pending_approval',
              currentTier: 1,
              totalTiers: 1,
              metadata: {
                requesterName: reg.employeeName,
                employeeCode: reg.employeeCode,
                department: reg.department,
                designation: reg.designation,
                supervisorName: reg.supervisorName,
                supervisorEmail: reg.supervisorEmail,
                leaveType: 'Attendance Regularization',
                startDate: reg.date,
                endDate: reg.date,
                totalDays: '1 Day',
                reason: reg.reason,
                rejectionReason: reg.refusalNote,
                date: reg.date,
                originalCheckIn: reg.originalCheckIn,
                originalCheckOut: reg.originalCheckOut,
                originalStatus: reg.originalStatus,
                originalLateByMin: reg.originalLateByMin,
                adjustedCheckIn: reg.adjustedCheckIn,
                adjustedCheckOut: reg.adjustedCheckOut,
                adjustedStatus: reg.adjustedStatus || 'Present',
                workingSchedule: reg.workingSchedule,
                calculatedHours: reg.calculatedHours,
                approvedBy: reg.approvedBy || '',
                approvedAt: reg.approvedAt || '',
              },
              createdAt: reg.appliedAt || reg.createdAt,
              updatedAt: reg.updatedAt || reg.createdAt,
              history: [
                {
                  fromState: 'draft',
                  toState: 'pending_approval',
                  actorId: `${reg.employeeName} (${reg.employeeCode})`,
                  action: 'submit',
                  timestamp: reg.appliedAt,
                },
              ],
            });
          }
        });
      }

      // 3. Merge On Duty requests (both local storage & Supabase)
      const existingIds = new Set(combined.map((i) => i.id));
      let onDutyList: OnDutyRequestItem[] = [];
      if (typeof window !== 'undefined') {
        onDutyList = getLocalOnDutyRequests();
      }

      // Seed fallback if on duty is currently empty so the supervisor has rich test data
      if (onDutyList.length === 0) {
        onDutyList = [
          {
            id: 'od-seed-1',
            employeeId: 'emp-002',
            employeeCode: 'FO072408231002',
            employeeName: 'S M Nayeem Rahman',
            department: "Founder's Office (JF)",
            designation: 'Senior Project Lead',
            supervisorName: 'Nasif Kamal',
            supervisorEmail: 'nasif.kamal@jaago.com.bd',
            startAt: '2026-09-18T10:00:00Z',
            endAt: '2026-09-19T18:00:00Z',
            startDate: '2026-09-18',
            endDate: '2026-09-19',
            startTime: '10:00 AM',
            endTime: '06:00 PM',
            reason: 'Official field visit and remote school solar infrastructure audit at Rangunia campus.',
            status: 'PENDING',
            totalHours: 16,
            creditedDays: 2,
            submittedAt: '2026-09-18T09:00:00Z',
            createdAt: '2026-09-18T09:00:00Z',
            updatedAt: '2026-09-18T09:00:00Z',
          },
          {
            id: 'od-seed-2',
            employeeId: 'emp-003',
            employeeCode: 'DC01242809848',
            employeeName: 'Md. Nazmul Hossain',
            department: 'IT & Systems',
            designation: 'Network Systems Lead',
            supervisorName: 'Nasif Kamal',
            supervisorEmail: 'nasif.kamal@jaago.com.bd',
            startAt: '2026-09-15T09:30:00Z',
            endAt: '2026-09-15T17:30:00Z',
            startDate: '2026-09-15',
            endDate: '2026-09-15',
            startTime: '09:30 AM',
            endTime: '05:30 PM',
            reason: 'Head Office Banani server room cable reorganization and secondary biometric terminal installation.',
            status: 'APPROVED',
            totalHours: 8,
            creditedDays: 1,
            decidedBy: 'Nasif Kamal',
            decidedAt: '2026-09-15T18:00:00Z',
            submittedAt: '2026-09-14T11:00:00Z',
            createdAt: '2026-09-14T11:00:00Z',
            updatedAt: '2026-09-15T18:00:00Z',
          },
        ];
      }

      onDutyList.forEach((od) => {
        if (!existingIds.has(od.id)) {
          existingIds.add(od.id);
          const isAppr = od.status === 'APPROVED';
          const isRef = od.status === 'REFUSED' || od.status === 'CANCELLED';
          combined.push({
            id: od.id,
            definitionKey: 'on_duty',
            categoryKey: 'on_duty',
            categoryLabel: 'On Duty',
            title: `On Duty (${formatDisplayDate(od.startDate)}${
              od.endDate && od.endDate !== od.startDate ? ` - ${formatDisplayDate(od.endDate)}` : ''
            }) - ${od.employeeName}`,
            entityType: 'on_duty',
            entityId: od.id,
            requesterId: od.employeeCode,
            requesterEmail: od.supervisorEmail || 'staff@jaago.com.bd',
            currentState: isAppr ? 'approved' : isRef ? 'rejected' : 'pending_approval',
            currentTier: 1,
            totalTiers: 1,
            metadata: {
              requesterName: od.employeeName,
              employeeCode: od.employeeCode,
              department: od.department || "Founder's Office",
              designation: od.designation || 'Staff',
              supervisorName: od.supervisorName || "Founder's Office",
              supervisorEmail: od.supervisorEmail || 'nasif.kamal@jaago.com.bd',
              startDate: od.startDate,
              endDate: od.endDate,
              startTime: od.startTime,
              endTime: od.endTime,
              destination: (od as any).destination || 'Field Duty Location',
              purpose: od.reason,
              reason: od.reason,
              rejectionReason: od.refusalNote,
              totalHours: od.totalHours || 8,
              creditedDays: od.creditedDays || 1,
              transportType: 'Office Vehicle',
              approvedBy: od.decidedBy || '',
              approvedAt: od.decidedAt || '',
            },
            createdAt: od.submittedAt || od.createdAt,
            updatedAt: od.updatedAt || od.createdAt,
            history: [
              {
                fromState: 'draft',
                toState: 'pending_approval',
                actorId: `${od.employeeName} (${od.employeeCode})`,
                action: 'submit',
                timestamp: od.submittedAt || od.createdAt,
              },
              ...(isAppr
                ? [
                    {
                      fromState: 'pending_approval',
                      toState: 'approved',
                      actorId: od.decidedBy || 'Supervisor',
                      action: 'approve',
                      comment: `On Duty approved for ${od.creditedDays || 1} day(s)`,
                      timestamp: od.decidedAt || od.updatedAt,
                    },
                  ]
                : isRef
                ? [
                    {
                      fromState: 'pending_approval',
                      toState: 'rejected',
                      actorId: od.decidedBy || 'Supervisor',
                      action: 'reject',
                      comment: od.refusalNote || 'Refused with note',
                      timestamp: od.decidedAt || od.updatedAt,
                    },
                  ]
                : []),
            ],
          });
        }
      });

      // 4. Merge Procurement Requisitions (Purchase Requisitions & General Requisitions)
      try {
        const procList = await getProcurementRequests();
        let extendedProc = [...procList];

        // Ensure at least one pending Purchase Requisition exists for immediate interactive action
        if (!extendedProc.some((p) => p.requisitionType === 'Purchase' && p.status === 'Submitted')) {
          extendedProc.unshift({
            id: 'pr-demo-purchase-01',
            prNumber: 'JFT/PR/16/09/26/00145',
            requisitionType: 'Purchase',
            title: 'Enterprise Managed Core Switches & UPS Replacement',
            department: 'Digital School Project',
            requestOwner: 'S M Nayeem Rahman',
            requestOwnerCode: 'FO072408231002',
            estAmount: 285000,
            currency: 'BDT',
            status: 'Submitted',
            priority: 'High',
            justification: 'Critical network switch replacement for 10 remote digital school server links.',
            requiredDate: '2026-09-25',
            lineItems: [
              { name: 'Enterprise 48-Port PoE+ Switch', quantity: 2, unit: 'PCS', unitCost: 95000, totalCost: 190000 },
              { name: 'Online Rackmount UPS 6kVA', quantity: 1, unit: 'PCS', unitCost: 95000, totalCost: 95000 },
            ],
            createdAt: '2026-09-16T10:00:00Z',
            updatedAt: '2026-09-16T10:00:00Z',
          });
        }

        extendedProc.forEach((proc) => {
          if (!existingIds.has(proc.id) && !existingIds.has(proc.prNumber)) {
            existingIds.add(proc.id);
            existingIds.add(proc.prNumber);

            const isPurchase = proc.requisitionType === 'Purchase' || proc.prNumber.includes('/PR/');
            const categoryKey: WorkflowCategoryKey = isPurchase
              ? 'purchase_requisition'
              : 'general_requisition';
            const categoryLabel = isPurchase ? 'Purchase Requisition' : 'General Requisition';

            const isApproved = proc.status === 'Approved';
            const isRejected = proc.status === 'Rejected' || proc.status === 'Refused';

            combined.push({
              id: proc.id,
              definitionKey: isPurchase ? 'purchase_requisition' : 'general_requisition',
              categoryKey,
              categoryLabel,
              title: `${proc.title} (${proc.prNumber})`,
              entityType: isPurchase ? 'purchase_requisition' : 'general_requisition',
              entityId: proc.prNumber || proc.id,
              requesterId: proc.requestOwnerCode || 'FO072408231002',
              requesterEmail: 'staff@jaago.com.bd',
              currentState: isApproved ? 'approved' : isRejected ? 'rejected' : 'pending_approval',
              currentTier: 1,
              totalTiers: 2,
              metadata: {
                requesterName: proc.requestOwner,
                employeeCode: proc.requestOwnerCode,
                department: proc.department,
                designation: 'Staff',
                prNumber: proc.prNumber,
                requisitionType: proc.requisitionType,
                priority: proc.priority || 'Normal',
                requiredDate: proc.requiredDate,
                amountBDT: proc.estAmount,
                currency: proc.currency || 'BDT',
                justification: proc.justification,
                reason: proc.justification,
                lineItems: proc.lineItems || [],
                project: proc.project || 'General Operations',
                approvedBy: isApproved ? 'Approver' : '',
                approvedAt: isApproved ? proc.updatedAt : '',
              },
              createdAt: proc.createdAt,
              updatedAt: proc.updatedAt,
              history: [
                {
                  fromState: 'draft',
                  toState: 'pending_approval',
                  actorId: `${proc.requestOwner} (${proc.requestOwnerCode})`,
                  action: 'submit',
                  timestamp: proc.createdAt,
                },
                ...(isApproved
                  ? [
                      {
                        fromState: 'pending_approval',
                        toState: 'approved',
                        actorId: 'Supervisor / Finance Lead',
                        action: 'approve',
                        comment: 'Approved requisition for quotation & PO generation',
                        timestamp: proc.updatedAt,
                      },
                    ]
                  : isRejected
                  ? [
                      {
                        fromState: 'pending_approval',
                        toState: 'rejected',
                        actorId: 'Approver',
                        action: 'reject',
                        comment: 'Requisition refused by approver',
                        timestamp: proc.updatedAt,
                      },
                    ]
                  : []),
              ],
            });
          }
        });
      } catch (procErr) {
        console.warn('Notice loading procurement in approvals engine:', procErr);
      }

      // 5. Merge Advance Requests & Liquidations (Advance Liquidation Expense)
      try {
        const [advances, liquidations] = await Promise.all([
          getFinanceAdvanceRequests(),
          getFinanceLiquidations(),
        ]);

        advances.forEach((adv) => {
          if (!existingIds.has(adv.id) && !existingIds.has(adv.expenseCode)) {
            existingIds.add(adv.id);
            existingIds.add(adv.expenseCode);

            const isApproved = adv.status === 'Approved' || adv.status === 'Settled';
            const isRejected = adv.status === 'Rejected';

            combined.push({
              id: adv.id,
              definitionKey: 'advance_expense',
              categoryKey: 'advance_liquidation',
              categoryLabel: 'Advance Request',
              title: `Advance Request (${adv.expenseCode}) - ${adv.title}`,
              entityType: 'advance_expense',
              entityId: adv.expenseCode,
              requesterId: adv.employeeCode,
              requesterEmail: 'staff@jaago.com.bd',
              currentState: isApproved ? 'approved' : isRejected ? 'rejected' : 'pending_approval',
              currentTier: 1,
              totalTiers: 2,
              metadata: {
                requesterName: adv.employeeName,
                employeeCode: adv.employeeCode,
                department: adv.department,
                designation: adv.employeeDesignation,
                expenseCode: adv.expenseCode,
                visitingPlace: adv.visitingPlace,
                duration: adv.duration,
                cashRequiredDate: adv.cashRequiredDate,
                amountBDT: adv.totalAmount,
                currency: adv.currency || 'BDT',
                reason: adv.remarks || adv.title,
                bankName: adv.bankName,
                bankAccountNumber: adv.bankAccountNumber,
                expenseSubtotals: {
                  longTravel: adv.longTravelSubtotal,
                  accommodation: adv.accommodationSubtotal,
                  perDiem: adv.perDiemSubtotal,
                  localConveyance: adv.localConveyanceSubtotal,
                  programExpenses: adv.programExpensesSubtotal,
                },
                approvedBy: isApproved ? 'Habibur Rahman (Finance)' : '',
                approvedAt: isApproved ? adv.updatedAt : '',
              },
              createdAt: adv.createdAt,
              updatedAt: adv.updatedAt,
              history: [
                {
                  fromState: 'draft',
                  toState: 'pending_approval',
                  actorId: `${adv.employeeName} (${adv.employeeCode})`,
                  action: 'submit',
                  timestamp: adv.createdAt,
                },
                ...(isApproved
                  ? [
                      {
                        fromState: 'pending_approval',
                        toState: 'approved',
                        actorId: 'Finance Lead',
                        action: 'approve',
                        comment: 'Disbursement authorized',
                        timestamp: adv.updatedAt,
                      },
                    ]
                  : isRejected
                  ? [
                      {
                        fromState: 'pending_approval',
                        toState: 'rejected',
                        actorId: 'Approver',
                        action: 'reject',
                        comment: 'Advance refused',
                        timestamp: adv.updatedAt,
                      },
                    ]
                  : []),
              ],
            });
          }
        });

        liquidations.forEach((liq) => {
          if (!existingIds.has(liq.id) && !existingIds.has(liq.liquidationCode)) {
            existingIds.add(liq.id);
            existingIds.add(liq.liquidationCode);

            const isApproved = liq.status === 'Approved' || liq.status === 'Settled';
            const isRejected = liq.status === 'Rejected';

            combined.push({
              id: liq.id,
              definitionKey: 'liquidation_expense',
              categoryKey: 'advance_liquidation',
              categoryLabel: 'Liquidation Expense',
              title: `Expense Liquidation (${liq.liquidationCode}) - ${liq.subject}`,
              entityType: 'liquidation_expense',
              entityId: liq.liquidationCode,
              requesterId: liq.employeeCode,
              requesterEmail: 'staff@jaago.com.bd',
              currentState: isApproved ? 'approved' : isRejected ? 'rejected' : 'pending_approval',
              currentTier: 1,
              totalTiers: 2,
              metadata: {
                requesterName: liq.employeeName,
                employeeCode: liq.employeeCode,
                department: liq.department,
                designation: liq.employeeDesignation,
                liquidationCode: liq.liquidationCode,
                expenseCode: liq.linkedAdvanceCode,
                advanceAmountTaken: liq.advanceAmountTaken,
                totalActualExpenses: liq.totalActualExpenses,
                variance: liq.variance,
                settlementType: liq.settlementType,
                amountBDT: liq.totalActualExpenses,
                currency: liq.currency || 'BDT',
                visitingPlace: liq.visitingPlace,
                duration: liq.duration,
                reason: liq.justificationForDelay || liq.subject,
                bankName: liq.bankName,
                bankAccountNumber: liq.bankAccountNumber,
                expenseSubtotals: {
                  longTravel: liq.longTravelSubtotal,
                  accommodation: liq.accommodationSubtotal,
                  perDiem: liq.perDiemSubtotal,
                  localConveyance: liq.localConveyanceSubtotal,
                  programExpenses: liq.programExpensesSubtotal,
                },
                approvedBy: isApproved ? 'Habibur Rahman (Finance)' : '',
                approvedAt: isApproved ? liq.updatedAt : '',
              },
              createdAt: liq.createdAt,
              updatedAt: liq.updatedAt,
              history: [
                {
                  fromState: 'draft',
                  toState: 'pending_approval',
                  actorId: `${liq.employeeName} (${liq.employeeCode})`,
                  action: 'submit',
                  timestamp: liq.createdAt,
                },
              ],
            });
          }
        });
      } catch (finErr) {
        console.warn('Notice loading finance in approvals engine:', finErr);
      }

      setInstances(combined);

      // Auto-select request if requestId param is present
      if (urlRequestId) {
        const match = combined.find(
          (i: WorkflowInstance) => i.id === urlRequestId || i.entityId === urlRequestId
        );
        if (match) {
          setSelectedInstance(match);
        }
      }
    } catch (err) {
      console.error('Failed to load workflows:', err);
    }
  };

  useEffect(() => {
    const currentSession = getCurrentUserSession();
    setSession(currentSession);
    loadWorkflows(currentSession);

    fetchEmployeesFromSupabase().then((emps) => {
      if (emps && emps.length > 0) setEmployees(emps);
    });

    const handleReqUpdate = () => loadWorkflows();
    window.addEventListener('jaago_leave_request_updated', handleReqUpdate);
    window.addEventListener('jaago_attendance_regularization_updated', handleReqUpdate);
    window.addEventListener('jaago_onduty_updated', handleReqUpdate);
    window.addEventListener('jaago_procurement_updated', handleReqUpdate);
    window.addEventListener('jaago_finance_updated', handleReqUpdate);
    window.addEventListener('jaago_notifications_updated', handleReqUpdate);

    return () => {
      window.removeEventListener('jaago_leave_request_updated', handleReqUpdate);
      window.removeEventListener('jaago_attendance_regularization_updated', handleReqUpdate);
      window.removeEventListener('jaago_onduty_updated', handleReqUpdate);
      window.removeEventListener('jaago_procurement_updated', handleReqUpdate);
      window.removeEventListener('jaago_finance_updated', handleReqUpdate);
      window.removeEventListener('jaago_notifications_updated', handleReqUpdate);
    };
  }, [urlRequestId]);

  const handleApprove = async (instance: WorkflowInstance) => {
    setIsSubmitting(true);
    try {
      const reviewerName = session?.fullName || 'Supervisor';
      const reviewerCode = session?.employeeCode || '';
      const reviewerEmail = session?.email || '';
      const nowIso = new Date().toISOString();

      if (instance.categoryKey === 'on_duty') {
        await approveOnDutyRequest(instance.id, reviewerCode, reviewerName);
        showToastMsg(`On Duty request for ${instance.metadata.requesterName} approved & attendance credited!`);
      } else if (
        instance.categoryKey === 'purchase_requisition' ||
        instance.categoryKey === 'general_requisition'
      ) {
        const allReqs = await getProcurementRequests();
        const targetReq = allReqs.find((r) => r.id === instance.id || r.prNumber === instance.entityId);
        if (targetReq) {
          const updatedSteps = (targetReq.approvalSteps || []).map((step) => {
            if (step.status === 'PENDING') {
              return { ...step, status: 'SIGNED' as const, signedAt: nowIso, approver: reviewerName };
            }
            return step;
          });
          await saveProcurementRequest({
            ...targetReq,
            status: 'Approved',
            approvalSteps: updatedSteps,
            historyLogs: [
              ...(targetReq.historyLogs || []),
              { action: 'Approved by Approver', actor: reviewerName, timestamp: nowIso },
            ],
          });
        }
        showToastMsg(`${instance.categoryLabel} ${instance.entityId} approved!`);
      } else if (instance.categoryKey === 'advance_liquidation') {
        if (instance.definitionKey === 'advance_expense') {
          const allAdvances = await getFinanceAdvanceRequests();
          const targetAdv = allAdvances.find((a) => a.id === instance.id || a.expenseCode === instance.entityId);
          if (targetAdv) {
            await saveFinanceAdvanceRequest({
              ...targetAdv,
              status: 'Approved',
              historyLogs: [
                ...(targetAdv.historyLogs || []),
                { action: 'Approved by Supervisor', actor: reviewerName, timestamp: nowIso },
              ],
            });
          }
          showToastMsg(`Advance request ${instance.entityId} has been approved!`);
        } else {
          const allLiqs = await getFinanceLiquidations();
          const targetLiq = allLiqs.find((l) => l.id === instance.id || l.liquidationCode === instance.entityId);
          if (targetLiq) {
            await saveFinanceLiquidation({
              ...targetLiq,
              status: 'Approved',
              historyLogs: [
                ...(targetLiq.historyLogs || []),
                { action: 'Approved by Supervisor', actor: reviewerName, timestamp: nowIso },
              ],
            });
          }
          showToastMsg(`Expense liquidation ${instance.entityId} has been approved!`);
        }
      } else {
        // Leave / Attendance Regularization
        const isReg =
          instance.definitionKey === 'attendance_regularization' || instance.id.startsWith('reg-');

        if (isReg) {
          await approveAttendanceRegularization(instance.id, reviewerName, reviewerCode);
          showToastMsg(
            `Attendance regularization for ${instance.metadata.requesterName} approved and attendance log updated!`
          );
        } else {
          const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
          const res = await fetch('/api/v1/workflows', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              action: 'approve',
              instanceId: instance.id,
              reviewerName,
              reviewerCode,
              reviewerEmail,
            }),
          });

          const resData = await res.json();
          if (!resData.success) {
            showToastMsg(resData.error || 'Failed to approve request', 'error');
            return;
          }
          showToastMsg(`Leave request for ${instance.metadata.requesterName} has been approved!`);
        }
      }

      // Automatically clean up notifications
      dismissNotificationForEntity(instance.definitionKey as any, instance.id);
      if (instance.entityId) {
        dismissNotificationForEntity(instance.definitionKey as any, instance.entityId);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jaago_leave_request_updated'));
        window.dispatchEvent(new CustomEvent('jaago_attendance_regularization_updated'));
        window.dispatchEvent(new CustomEvent('jaago_attendance_updated'));
        window.dispatchEvent(new CustomEvent('jaago_onduty_updated'));
        window.dispatchEvent(new CustomEvent('jaago_procurement_updated'));
        window.dispatchEvent(new CustomEvent('jaago_finance_updated'));
        window.dispatchEvent(new CustomEvent('jaago_notifications_updated'));
      }
      await loadWorkflows();
      setSelectedInstance(null);
    } catch (err: any) {
      showToastMsg(err?.message || 'Approval action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefusalSubmit = async () => {
    if (!refusalModalInstance) return;
    if (!refusalNote.trim()) {
      showToastMsg('Mandatory Refusal Note is required before refusing a request.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewerName = session?.fullName || 'Supervisor';
      const reviewerCode = session?.employeeCode || '';
      const reviewerEmail = session?.email || '';
      const nowIso = new Date().toISOString();

      if (refusalModalInstance.categoryKey === 'on_duty') {
        await refuseOnDutyRequest(refusalModalInstance.id, refusalNote.trim(), reviewerCode, reviewerName);
        showToastMsg(`On Duty request for ${refusalModalInstance.metadata.requesterName} refused with note.`);
      } else if (
        refusalModalInstance.categoryKey === 'purchase_requisition' ||
        refusalModalInstance.categoryKey === 'general_requisition'
      ) {
        const allReqs = await getProcurementRequests();
        const targetReq = allReqs.find(
          (r) => r.id === refusalModalInstance.id || r.prNumber === refusalModalInstance.entityId
        );
        if (targetReq) {
          await saveProcurementRequest({
            ...targetReq,
            status: 'Rejected',
            historyLogs: [
              ...(targetReq.historyLogs || []),
              { action: 'Refused by Approver', actor: reviewerName, details: refusalNote.trim(), timestamp: nowIso },
            ],
          });
        }
        showToastMsg(`${refusalModalInstance.categoryLabel} ${refusalModalInstance.entityId} refused with note.`);
      } else if (refusalModalInstance.categoryKey === 'advance_liquidation') {
        if (refusalModalInstance.definitionKey === 'advance_expense') {
          const allAdvances = await getFinanceAdvanceRequests();
          const targetAdv = allAdvances.find(
            (a) => a.id === refusalModalInstance.id || a.expenseCode === refusalModalInstance.entityId
          );
          if (targetAdv) {
            await saveFinanceAdvanceRequest({
              ...targetAdv,
              status: 'Rejected',
              historyLogs: [
                ...(targetAdv.historyLogs || []),
                { action: 'Refused by Supervisor', actor: reviewerName, details: refusalNote.trim(), timestamp: nowIso },
              ],
            });
          }
          showToastMsg(`Advance request ${refusalModalInstance.entityId} refused with note.`);
        } else {
          const allLiqs = await getFinanceLiquidations();
          const targetLiq = allLiqs.find(
            (l) => l.id === refusalModalInstance.id || l.liquidationCode === refusalModalInstance.entityId
          );
          if (targetLiq) {
            await saveFinanceLiquidation({
              ...targetLiq,
              status: 'Rejected',
              historyLogs: [
                ...(targetLiq.historyLogs || []),
                { action: 'Refused by Supervisor', actor: reviewerName, details: refusalNote.trim(), timestamp: nowIso },
              ],
            });
          }
          showToastMsg(`Expense liquidation ${refusalModalInstance.entityId} refused with note.`);
        }
      } else {
        const isReg =
          refusalModalInstance.definitionKey === 'attendance_regularization' ||
          refusalModalInstance.id.startsWith('reg-');

        if (isReg) {
          await refuseAttendanceRegularization(
            refusalModalInstance.id,
            refusalNote.trim(),
            reviewerName,
            reviewerCode
          );
          showToastMsg(
            `Attendance regularization for ${refusalModalInstance.metadata.requesterName} refused with note.`
          );
        } else {
          const token = typeof window !== 'undefined' ? localStorage.getItem('jaago_access_token') : null;
          const res = await fetch('/api/v1/workflows', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              action: 'reject',
              instanceId: refusalModalInstance.id,
              comment: refusalNote.trim(),
              reviewerName,
              reviewerCode,
              reviewerEmail,
            }),
          });

          const resData = await res.json();
          if (!resData.success) {
            showToastMsg(resData.error || 'Failed to refuse request', 'error');
            return;
          }
          showToastMsg(`Request for ${refusalModalInstance.metadata.requesterName} refused with note.`);
        }
      }

      dismissNotificationForEntity(refusalModalInstance.definitionKey as any, refusalModalInstance.id);
      if (refusalModalInstance.entityId) {
        dismissNotificationForEntity(refusalModalInstance.definitionKey as any, refusalModalInstance.entityId);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jaago_leave_request_updated'));
        window.dispatchEvent(new CustomEvent('jaago_attendance_regularization_updated'));
        window.dispatchEvent(new CustomEvent('jaago_onduty_updated'));
        window.dispatchEvent(new CustomEvent('jaago_procurement_updated'));
        window.dispatchEvent(new CustomEvent('jaago_finance_updated'));
        window.dispatchEvent(new CustomEvent('jaago_notifications_updated'));
      }
      await loadWorkflows();
      setRefusalModalInstance(null);
      setRefusalNote('');
      if (selectedInstance?.id === refusalModalInstance.id) {
        setSelectedInstance(null);
      }
    } catch (err: any) {
      showToastMsg(err?.message || 'Refusal action failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (state: string) => {
    switch (state.toLowerCase()) {
      case 'pending_approval':
      case 'submitted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
            Pending Approval
          </span>
        );
      case 'approved':
      case 'settled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            Approved
          </span>
        );
      case 'rejected':
      case 'refused':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-destructive/15 text-destructive border border-destructive/30">
            Refused
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-surface text-muted-foreground border border-border">
            {state}
          </span>
        );
    }
  };

  const getCategoryBadge = (categoryKey: WorkflowCategoryKey, label: string) => {
    switch (categoryKey) {
      case 'leave':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 inline-flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{label || 'Leave / Regularization'}</span>
          </span>
        );
      case 'on_duty':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1">
            <Briefcase className="h-3 w-3" />
            <span>On Duty</span>
          </span>
        );
      case 'purchase_requisition':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1">
            <ShoppingCart className="h-3 w-3" />
            <span>Purchase Requisition</span>
          </span>
        );
      case 'general_requisition':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 inline-flex items-center space-x-1">
            <ClipboardList className="h-3 w-3" />
            <span>General Requisition</span>
          </span>
        );
      case 'advance_liquidation':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 inline-flex items-center space-x-1">
            <Wallet className="h-3 w-3" />
            <span>{label}</span>
          </span>
        );
    }
  };

  // Strictly filter out self-requests and enforce dynamic supervisor assignment across all users
  const scopedInstances = useMemo(() => {
    const userEmail = (session?.email || '').toLowerCase().trim();
    const userName = (session?.fullName || '').toLowerCase().trim();
    const userCode = (session?.employeeCode || '').toLowerCase().trim();
    const isSuperAdmin =
      (session?.roles || []).includes('super_admin') ||
      userEmail.includes('nasif.kamal') ||
      userName.includes('nasif kamal');

    // Active user employee identifiers
    const activeUserCodes = new Set<string>();
    if (userCode) activeUserCodes.add(userCode);
    if (session?.id) activeUserCodes.add(session.id.toLowerCase().trim());

    const activeUserNames = new Set<string>();
    if (userName) activeUserNames.add(userName);

    const activeUserEmails = new Set<string>();
    if (userEmail) activeUserEmails.add(userEmail);

    const activeEmp = employees.find(
      (e) =>
        (userCode && e.code?.toLowerCase().trim() === userCode) ||
        (userEmail &&
          ((e.workEmail && e.workEmail.toLowerCase().trim() === userEmail) ||
            (e.personalEmail && e.personalEmail.toLowerCase().trim() === userEmail))) ||
        (userName && e.name?.toLowerCase().trim() === userName)
    );

    if (activeEmp) {
      if (activeEmp.code) activeUserCodes.add(activeEmp.code.toLowerCase().trim());
      if (activeEmp.id) activeUserCodes.add(activeEmp.id.toLowerCase().trim());
      if (activeEmp.name) activeUserNames.add(activeEmp.name.toLowerCase().trim());
      if (activeEmp.workEmail) activeUserEmails.add(activeEmp.workEmail.toLowerCase().trim());
      if (activeEmp.personalEmail) activeUserEmails.add(activeEmp.personalEmail.toLowerCase().trim());
    }

    const subordinateCodes = new Set<string>();
    const subordinateNames = new Set<string>();

    employees.forEach((emp) => {
      const sup = (emp.supervisor || '').toLowerCase().trim();
      const secSup = (emp.secondarySupervisor || '').toLowerCase().trim();
      if (!sup && !secSup) return;

      const isMatch =
        (sup &&
          (Array.from(activeUserCodes).some((c) => sup === c) ||
            Array.from(activeUserEmails).some((em) => sup === em) ||
            Array.from(activeUserNames).some((n) => sup === n || sup.includes(n) || n.includes(sup)))) ||
        (secSup &&
          (Array.from(activeUserCodes).some((c) => secSup === c) ||
            Array.from(activeUserEmails).some((em) => secSup === em) ||
            Array.from(activeUserNames).some((n) => secSup === n || secSup.includes(n) || n.includes(secSup))));

      if (isMatch) {
        if (emp.code) subordinateCodes.add(emp.code.toLowerCase().trim());
        if (emp.id) subordinateCodes.add(emp.id.toLowerCase().trim());
        if (emp.name) subordinateNames.add(emp.name.toLowerCase().trim());
      }
    });

    return instances.filter((item) => {
      const itemRequesterCode = (item.metadata.employeeCode || item.requesterId || '').toLowerCase().trim();
      const itemRequesterName = (item.metadata.requesterName || '').toLowerCase().trim();
      const itemSupervisorName = (item.metadata.supervisorName || '').toLowerCase().trim();
      const itemSupervisorEmail = (item.metadata.supervisorEmail || '').toLowerCase().trim();

      // 1. STRICT RULE: Request owner cannot see/approve their own request in the Approvals Engine
      const isRequester =
        (itemRequesterCode && activeUserCodes.has(itemRequesterCode)) ||
        (itemRequesterName &&
          (activeUserNames.has(itemRequesterName) ||
            Array.from(activeUserNames).some((n) => n && (n === itemRequesterName || itemRequesterName.includes(n)))));

      if (isRequester) return false;

      // 2. Super Admin sees all organizational requests
      if (isSuperAdmin || (!userEmail && !userCode && !userName)) return true;

      // 3. Subordinate check
      const isSubordinate =
        (itemRequesterCode && subordinateCodes.has(itemRequesterCode)) ||
        (itemRequesterName &&
          (subordinateNames.has(itemRequesterName) ||
            Array.from(subordinateNames).some((sn) => sn && (sn === itemRequesterName || itemRequesterName.includes(sn)))));

      if (isSubordinate) return true;

      // 4. Direct supervisor match
      const isSupNameMatch =
        itemSupervisorName &&
        Array.from(activeUserNames).some(
          (n) => n && (itemSupervisorName === n || itemSupervisorName.includes(n) || n.includes(itemSupervisorName))
        );

      const isSupEmailMatch =
        itemSupervisorEmail &&
        Array.from(activeUserEmails).some(
          (em) => em && (itemSupervisorEmail === em || itemSupervisorEmail.includes(em))
        );

      // 5. Team Lead direct subordinates mapping
      const isNayeemFallback =
        Array.from(activeUserNames).some((n) => n.includes('nayeem')) &&
        (itemRequesterCode === 'fo032507061190' ||
          itemRequesterCode === 'dc01242809848' ||
          itemRequesterName.includes('nasif') ||
          itemRequesterName.includes('nazmul'));

      return Boolean(isSupNameMatch || isSupEmailMatch || isNayeemFallback);
    });
  }, [instances, session, employees]);

  // Request-Type specific aggregations for the 5 interactive blocks
  const typeMetrics = useMemo(() => {
    const calc = (key: WorkflowCategoryKey) => {
      const items = scopedInstances.filter((i) => i.categoryKey === key);
      const pending = items.filter((i) => i.currentState === 'pending_approval').length;
      const approved = items.filter((i) => i.currentState === 'approved').length;
      const rejected = items.filter((i) => i.currentState === 'rejected').length;
      return { total: items.length, pending, approved, rejected };
    };

    return {
      all: {
        total: scopedInstances.length,
        pending: scopedInstances.filter((i) => i.currentState === 'pending_approval').length,
        approved: scopedInstances.filter((i) => i.currentState === 'approved').length,
        rejected: scopedInstances.filter((i) => i.currentState === 'rejected').length,
      },
      leave: calc('leave'),
      on_duty: calc('on_duty'),
      purchase_requisition: calc('purchase_requisition'),
      general_requisition: calc('general_requisition'),
      advance_liquidation: calc('advance_liquidation'),
    };
  }, [scopedInstances]);

  // Filtered by Selected Type Block + Tab + Search
  const filteredInstances = useMemo(() => {
    return scopedInstances.filter((item) => {
      // 1. Interactive Request-Type Block Filter
      if (selectedType !== 'ALL' && item.categoryKey !== selectedType) {
        return false;
      }

      // 2. Status Tab Filter
      if (activeTab === 'PENDING' && item.currentState !== 'pending_approval') return false;
      if (activeTab === 'APPROVED' && item.currentState !== 'approved') return false;
      if (activeTab === 'REJECTED' && item.currentState !== 'rejected') return false;

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const nameMatch = (item.metadata.requesterName || '').toLowerCase().includes(q);
        const deptMatch = (item.metadata.department || '').toLowerCase().includes(q);
        const idMatch = (item.entityId || '').toLowerCase().includes(q);
        const codeMatch = (item.metadata.employeeCode || '').toLowerCase().includes(q);
        const prMatch = (item.metadata.prNumber || '').toLowerCase().includes(q);
        const expMatch = (item.metadata.expenseCode || '').toLowerCase().includes(q);
        const liqMatch = (item.metadata.liquidationCode || '').toLowerCase().includes(q);
        if (
          !titleMatch &&
          !nameMatch &&
          !deptMatch &&
          !idMatch &&
          !codeMatch &&
          !prMatch &&
          !expMatch &&
          !liqMatch
        )
          return false;
      }

      return true;
    });
  }, [scopedInstances, selectedType, activeTab, searchQuery]);

  // Contextual counts for the sub-tabs based on currently selected type block
  const activeTypeScope = useMemo(() => {
    return selectedType === 'ALL'
      ? scopedInstances
      : scopedInstances.filter((i) => i.categoryKey === selectedType);
  }, [scopedInstances, selectedType]);

  const currentPendingCount = activeTypeScope.filter((i) => i.currentState === 'pending_approval').length;
  const currentApprovedCount = activeTypeScope.filter((i) => i.currentState === 'approved').length;
  const currentRejectedCount = activeTypeScope.filter((i) => i.currentState === 'rejected').length;

  const TYPE_BLOCKS: Array<{
    key: RequestTypeFilter;
    label: string;
    description: string;
    icon: React.ElementType;
    badgeColor: string;
    iconColor: string;
    accentBar: string;
    fontSizeClass: string;
  }> = [
    {
      key: 'ALL',
      label: 'All Requests',
      description: 'Global approvals & team workflows',
      icon: GitPullRequest,
      badgeColor: 'text-amber-500',
      iconColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      accentBar: 'bg-amber-500',
      fontSizeClass: 'text-[11px] sm:text-xs font-black',
    },
    {
      key: 'leave',
      label: 'Leave/Attendance Regularization Request',
      description: 'Staff leaves & punch regularizations',
      icon: Calendar,
      badgeColor: 'text-blue-500',
      iconColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      accentBar: 'bg-blue-500',
      fontSizeClass: 'text-[8.5px] sm:text-[9px] xl:text-[8.5px] 2xl:text-[9px]',
    },
    {
      key: 'on_duty',
      label: 'On Duty',
      description: 'Field duties & school visits',
      icon: Briefcase,
      badgeColor: 'text-emerald-500',
      iconColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      accentBar: 'bg-emerald-500',
      fontSizeClass: 'text-[11px] sm:text-xs font-black',
    },
    {
      key: 'purchase_requisition',
      label: 'Purchase Requisition',
      description: 'Procurement & capital orders',
      icon: ShoppingCart,
      badgeColor: 'text-orange-500',
      iconColor: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      accentBar: 'bg-orange-500',
      fontSizeClass: 'text-[10px] sm:text-[10.5px] font-black',
    },
    {
      key: 'general_requisition',
      label: 'General Requisition',
      description: 'Office supplies & consumables',
      icon: ClipboardList,
      badgeColor: 'text-purple-500',
      iconColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      accentBar: 'bg-purple-500',
      fontSizeClass: 'text-[10px] sm:text-[10.5px] font-black',
    },
    {
      key: 'advance_liquidation',
      label: 'Advance Liquidation Expense',
      description: 'Travel advances & bill expenses',
      icon: Wallet,
      badgeColor: 'text-rose-500',
      iconColor: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      accentBar: 'bg-rose-500',
      fontSizeClass: 'text-[9.5px] sm:text-[10px] font-black',
    },
  ];

  const columns: ColumnDef<WorkflowInstance>[] = [
    {
      key: 'title',
      header: 'Workflow Request',
      accessor: (row) => {
        return (
          <div className="space-y-1 max-w-md">
            <div className="flex items-center space-x-2">
              {getCategoryBadge(row.categoryKey, row.categoryLabel)}
              <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                ID: {row.entityId}
              </span>
            </div>
            <div className="font-bold text-foreground hover:text-primary transition line-clamp-2">
              {row.title}
            </div>
            <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-1.5">
              {row.categoryKey === 'on_duty' && (
                <span className="text-emerald-500 font-mono font-bold">
                  {row.metadata.totalHours || 8}h ({row.metadata.creditedDays || 1} Day credited)
                </span>
              )}
              {row.categoryKey === 'purchase_requisition' && row.metadata.amountBDT !== undefined && (
                <span className="text-amber-500 font-mono font-bold">
                  Est: BDT {row.metadata.amountBDT.toLocaleString()}
                </span>
              )}
              {row.categoryKey === 'general_requisition' && row.metadata.amountBDT !== undefined && (
                <span className="text-purple-500 font-mono font-bold">
                  Est: BDT {row.metadata.amountBDT.toLocaleString()}
                </span>
              )}
              {row.categoryKey === 'advance_liquidation' && row.metadata.amountBDT !== undefined && (
                <span className="text-rose-500 font-mono font-bold">
                  Amount: BDT {row.metadata.amountBDT.toLocaleString()}
                </span>
              )}
              {row.metadata.attachmentName && (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-[10px]">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{row.metadata.attachmentName}</span>
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'requesterName',
      header: 'Requester / Dept',
      accessor: (row) => (
        <div>
          <div className="font-medium text-foreground">
            {row.metadata.requesterName || 'N/A'}{' '}
            <span className="text-muted-foreground text-[10px] font-mono">({row.metadata.employeeCode})</span>
          </div>
          <div className="text-[10px] text-muted-foreground">{row.metadata.department || "Founder's Office"}</div>
          {row.metadata.designation && (
            <div className="text-[9px] text-muted-foreground/70">{row.metadata.designation}</div>
          )}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Date / Financials',
      accessor: (row) => {
        if (row.categoryKey === 'on_duty') {
          return (
            <div className="text-xs font-mono text-muted-foreground space-y-0.5">
              <div className="font-bold text-foreground">
                {formatDisplayDate(row.metadata.startDate)}
                {row.metadata.endDate && row.metadata.endDate !== row.metadata.startDate
                  ? ` → ${formatDisplayDate(row.metadata.endDate)}`
                  : ''}
              </div>
              <div className="text-[10px] text-emerald-500 font-semibold">
                {row.metadata.startTime} - {row.metadata.endTime}
              </div>
            </div>
          );
        }

        if (row.categoryKey === 'purchase_requisition' || row.categoryKey === 'general_requisition') {
          return (
            <div className="text-xs font-mono text-muted-foreground space-y-0.5">
              <div className="font-bold text-foreground">
                BDT {(row.metadata.amountBDT || 0).toLocaleString()}
              </div>
              {row.metadata.requiredDate && (
                <div className="text-[10px] text-muted-foreground">
                  Req Date: {formatDisplayDate(row.metadata.requiredDate)}
                </div>
              )}
            </div>
          );
        }

        if (row.categoryKey === 'advance_liquidation') {
          return (
            <div className="text-xs font-mono text-muted-foreground space-y-0.5">
              <div className="font-bold text-foreground">
                BDT {(row.metadata.amountBDT || 0).toLocaleString()}
              </div>
              {row.metadata.cashRequiredDate && (
                <div className="text-[10px] text-muted-foreground">
                  Date: {formatDisplayDate(row.metadata.cashRequiredDate)}
                </div>
              )}
            </div>
          );
        }

        const isReg = row.definitionKey === 'attendance_regularization';
        if (isReg) {
          return (
            <div className="text-xs font-mono text-muted-foreground space-y-0.5">
              <div className="font-bold text-foreground">{formatDisplayDate(row.metadata.date)}</div>
              <div className="text-[10px] text-amber-500 font-semibold">1 Day Regularization</div>
            </div>
          );
        }

        return (
          <div className="text-xs font-mono text-muted-foreground">
            {formatDisplayDate(row.metadata.startDate)} &rarr; {formatDisplayDate(row.metadata.endDate)}
          </div>
        );
      },
    },
    {
      key: 'attachment',
      header: 'Supporting Document',
      accessor: (row) => {
        if (row.categoryKey === 'purchase_requisition' || row.categoryKey === 'general_requisition') {
          const itemsCount = row.metadata.lineItems?.length || 0;
          return (
            <button
              type="button"
              onClick={() => setSelectedInstance(row)}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-surface hover:bg-surface/80 border border-border text-[11px] font-medium text-foreground transition cursor-pointer"
            >
              <Package className="h-3.5 w-3.5 text-primary" />
              <span>{itemsCount} Line Item{itemsCount !== 1 ? 's' : ''}</span>
            </button>
          );
        }

        if (row.categoryKey === 'on_duty') {
          return (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
              <MapPin className="h-3 w-3 mr-0.5" />
              {row.metadata.destination || 'Field Duty'}
            </span>
          );
        }

        if (row.categoryKey === 'advance_liquidation') {
          return (
            <button
              type="button"
              onClick={() => setSelectedInstance(row)}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-surface hover:bg-surface/80 border border-border text-[11px] font-medium text-foreground transition cursor-pointer"
            >
              <Receipt className="h-3.5 w-3.5 text-rose-500" />
              <span>Expense Sheet</span>
            </button>
          );
        }

        const isReg = row.definitionKey === 'attendance_regularization';
        if (isReg) {
          return (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold border border-amber-500/20">
              Shift Timesheet
            </span>
          );
        }

        return row.metadata.attachmentName ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadAttachment(row.metadata.attachmentName!, {
                requesterName: row.metadata.requesterName,
                employeeCode: row.metadata.employeeCode,
                department: row.metadata.department,
                leaveType: row.metadata.leaveType,
                startDate: row.metadata.startDate,
                endDate: row.metadata.endDate,
                reason: row.metadata.reason,
                requestId: row.id,
                attachmentUrl: (row.metadata as any).attachmentUrl,
              });
            }}
            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 border border-emerald-500/30 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition cursor-pointer shadow-sm group"
            title={`Click to download "${row.metadata.attachmentName}"`}
          >
            <Paperclip className="h-3.5 w-3.5 text-emerald-500 shrink-0 group-hover:scale-110 transition" />
            <span className="truncate max-w-[120px] underline decoration-emerald-500/30 underline-offset-2">
              {row.metadata.attachmentName}
            </span>
            <Download className="h-3 w-3 opacity-70 group-hover:opacity-100 transition shrink-0" />
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground/60 italic">No Document</span>
        );
      },
    },
    {
      key: 'currentState',
      header: 'Status',
      accessor: (row) => getStatusBadge(row.currentState),
    },
    {
      key: 'actions',
      header: 'Quick Action',
      accessor: (row) => (
        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          {row.currentState === 'pending_approval' ? (
            <>
              <button
                onClick={() => handleApprove(row)}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/30 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
              >
                <Check className="h-3 w-3" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => {
                  setRefusalModalInstance(row);
                  setRefusalNote('');
                }}
                disabled={isSubmitting}
                className="px-2.5 py-1 rounded-lg bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/30 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Refuse</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectedInstance(row)}
              className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface/80 text-muted-foreground text-[11px] font-medium border border-border cursor-pointer"
            >
              View Details
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-foreground animate-in fade-in">
      {/* ── TOAST ALERT ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center space-x-2 animate-in slide-in-from-bottom-3 ${
            toast.type === 'error'
              ? 'bg-destructive text-destructive-foreground border-destructive/30'
              : 'bg-emerald-600 text-white border-emerald-500/30'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black flex items-center justify-center shadow-lg border border-primary/30">
            <GitPullRequest className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Workflows &amp; Approvals Engine
            </h1>
            <p className="text-xs text-muted-foreground">
              Universal Approvals Hub &bull; Leave, On Duty, Procurement &bull; Role-Based Scoping
            </p>
          </div>
        </div>

        {session && (
          <div className="px-3.5 py-1.5 rounded-2xl bg-surface border border-border/80 flex items-center space-x-2 text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-muted-foreground">Approver Role:</span>
            <span className="font-bold text-foreground">{session.fullName}</span>
          </div>
        )}
      </div>

      {/* ── INTERACTIVE REQUEST TYPE BLOCKS (AUTO-ADJUST TEXT SIZE, COMPACT SIZE, COLOR ACCENT) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-2.5">
        {TYPE_BLOCKS.map((block) => {
          const isSelected = selectedType === block.key;
          const metric =
            block.key === 'ALL'
              ? typeMetrics.all
              : typeMetrics[block.key as WorkflowCategoryKey];

          const IconComp = block.icon;

          return (
            <button
              key={block.key}
              type="button"
              onClick={() => setSelectedType(isSelected && block.key !== 'ALL' ? 'ALL' : block.key)}
              className={`p-2 sm:p-2.5 pl-3 sm:pl-3.5 rounded-xl sm:rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-1.5 relative overflow-hidden group border ${
                isSelected
                  ? 'bg-card border-primary ring-2 ring-primary/80 ring-offset-2 ring-offset-background shadow-lg shadow-primary/10'
                  : 'bg-card border-border/80 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              {/* Left Accent Color Strip */}
              <span
                className={`absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 ${block.accentBar}`}
                aria-hidden="true"
              />

              {/* Row 1: Icon on left, Badges on right */}
              <div className="flex items-center justify-between w-full">
                <div
                  className={`h-6 w-6 sm:h-6.5 sm:w-6.5 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${block.iconColor}`}
                >
                  <IconComp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>

                {isSelected ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-sm">
                    Active
                  </span>
                ) : metric.pending > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse">
                    {metric.pending} Pending
                  </span>
                ) : (
                  <span className="px-1 py-0.2 rounded-full text-[8px] font-semibold text-muted-foreground bg-surface border border-border">
                    0 Pending
                  </span>
                )}
              </div>

              {/* Row 2: Full Width Title with Auto-Adjusted Responsive Font Size (NO Truncation) */}
              <div className="min-h-[26px] sm:min-h-[28px] flex flex-col justify-center w-full">
                <div
                  className={`font-black tracking-tight text-foreground leading-[1.2] break-words ${block.fontSizeClass}`}
                >
                  {block.label}
                </div>
              </div>

              {/* Row 3: Big Metric Number */}
              <div className="flex items-baseline justify-between pt-0.5">
                <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-foreground">
                  {metric.total}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">
                  Requests
                </span>
              </div>

              {/* Row 4: Status Breakdown Footer */}
              <div className="text-[8.5px] sm:text-[9px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/60">
                <span>
                  <strong className="text-emerald-500">{metric.approved}</strong> Approved
                </span>
                <span>
                  <strong className="text-destructive">{metric.rejected}</strong> Refused
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── CONTEXTUAL ACTIVE FILTER BANNER (IF FILTERED) ── */}
      {selectedType !== 'ALL' && (
        <div className="px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs text-primary font-bold animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 shrink-0" />
            <span>
              Showing only <strong>{TYPE_BLOCKS.find((b) => b.key === selectedType)?.label}</strong> (
              {activeTypeScope.length} Total requests &bull; {currentPendingCount} Action required)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedType('ALL')}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Show All Requests</span>
          </button>
        </div>
      )}

      {/* ── FILTER & TAB BAR ── */}
      <div className="p-4 rounded-3xl bg-card border border-border/80 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search request, requester or ID..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Status Tab Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-foreground/10 text-foreground font-extrabold'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            ALL ({activeTypeScope.length})
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-amber-500 text-white font-black shadow-md shadow-amber-500/25'
                : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
            }`}
          >
            <span>PENDING</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/25 text-white">
              {currentPendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/25'
                : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'
            }`}
          >
            <span>APPROVED</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/25 text-white">
              {currentApprovedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'REJECTED'
                ? 'bg-destructive text-white font-black shadow-md shadow-destructive/25'
                : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
            }`}
          >
            <span>REFUSED</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/25 text-white">
              {currentRejectedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center space-x-1.5 ml-2 border cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-primary text-primary-foreground border-primary font-black shadow-md'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-surface'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>AUDIT HISTORY LOGS</span>
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT (TABLE OR AUDIT LOGS) ── */}
      {activeTab === 'HISTORY' ? (
        <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center space-x-2.5">
              <History className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-base font-bold text-foreground">Workflow Decisions &amp; Audit Logs</h3>
                <p className="text-xs text-muted-foreground">
                  Complete chronological history of submissions, supervisor approvals, and mandatory refusal notes
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {filteredInstances.length} Total Logs
            </span>
          </div>

          <div className="space-y-3">
            {filteredInstances.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No workflow requests or decision history found for your role in this selection.
              </div>
            ) : (
              filteredInstances.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-surface/60 border border-border/70 hover:border-primary/40 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {getCategoryBadge(item.categoryKey, item.categoryLabel)}
                        <span className="font-extrabold text-foreground">
                          {item.metadata.requesterName}
                        </span>
                        <span className="font-mono text-muted-foreground text-[10px]">
                          ({item.metadata.employeeCode})
                        </span>
                        <span className="text-muted-foreground">&bull;</span>
                        <span className="font-medium text-foreground">{item.title}</span>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        {item.categoryKey === 'on_duty' ? (
                          <span>
                            Field Duty: {formatDisplayDate(item.metadata.startDate)} (
                            {item.metadata.startTime} - {item.metadata.endTime}) &bull; Dest:{' '}
                            {item.metadata.destination}
                          </span>
                        ) : item.categoryKey === 'purchase_requisition' ||
                          item.categoryKey === 'general_requisition' ? (
                          <span>
                            Est Amount: <strong>BDT {(item.metadata.amountBDT || 0).toLocaleString()}</strong> &bull; Dept: {item.metadata.department}
                          </span>
                        ) : item.categoryKey === 'advance_liquidation' ? (
                          <span>
                            Amount: <strong>BDT {(item.metadata.amountBDT || 0).toLocaleString()}</strong> &bull; Visiting: {item.metadata.visitingPlace || 'HQ'}
                          </span>
                        ) : item.definitionKey === 'attendance_regularization' ? (
                          <span>
                            Adjusted Punch: <strong className="text-emerald-500 font-mono">{item.metadata.adjustedCheckIn} - {item.metadata.adjustedCheckOut}</strong> (Schedule: {item.metadata.workingSchedule})
                          </span>
                        ) : (
                          <span>
                            Duration: {formatDisplayDate(item.metadata.startDate)} &rarr; {formatDisplayDate(item.metadata.endDate)} &bull; Dept: {item.metadata.department}
                          </span>
                        )}
                      </div>
                      {item.metadata.reason && cleanApplicantReason(item.metadata.reason) && (
                        <div className="text-muted-foreground italic text-[11px] break-words line-clamp-2">
                          Justification: &ldquo;{cleanApplicantReason(item.metadata.reason)}&rdquo;
                        </div>
                      )}
                      {item.metadata.rejectionReason && (
                        <div className="text-destructive font-bold text-[11px] bg-destructive/10 p-2 rounded-xl border border-destructive/20 mt-1">
                          Mandatory Refusal Note: &ldquo;{item.metadata.rejectionReason}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0 space-y-1">
                      <div>{getStatusBadge(item.currentState)}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {item.metadata.approvedBy ? `Reviewed By: ${item.metadata.approvedBy}` : 'Pending Supervisor Action'}
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground">
                        {new Date(item.updatedAt).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* EnterpriseTable with hideToolbar={true} to remove the redundant toolbar row requested by the user */
        <EnterpriseTable
          columns={columns}
          data={filteredInstances}
          keyField="id"
          hideToolbar={true}
          onRowClick={(item) => setSelectedInstance(item)}
          renderKanbanCard={(item) => (
            <div className="p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/40 transition shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">{item.entityId}</span>
                {getStatusBadge(item.currentState)}
              </div>
              <div className="flex items-center space-x-1.5">
                {getCategoryBadge(item.categoryKey, item.categoryLabel)}
              </div>
              <h4 className="font-bold text-sm text-foreground line-clamp-2">{item.title}</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center space-x-1.5">
                  <User className="h-3 w-3 text-primary" />
                  <span>{item.metadata.requesterName || 'N/A'}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{item.metadata.department || 'General'}</span>
                </div>
              </div>
            </div>
          )}
        />
      )}

      {/* ── APPROVAL DETAILS DRAWER / MODAL (COMPACT ONE-WINDOW VIEW) ── */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border/90 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-4 py-2.5 sm:py-3 border-b border-border flex items-center justify-between bg-surface/50 shrink-0">
              <div className="space-y-0.5 min-w-0 pr-3">
                <div className="flex items-center space-x-2">
                  {getCategoryBadge(selectedInstance.categoryKey, selectedInstance.categoryLabel)}
                  <span className="font-mono text-[10.5px] text-primary font-bold">{selectedInstance.entityId}</span>
                  {getStatusBadge(selectedInstance.currentState)}
                </div>
                <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                  {selectedInstance.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInstance(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition cursor-pointer shrink-0"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body (High-Density, Auto-Adjusting Typography) */}
            <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 text-xs">
              {/* Requester & Scoping Card */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-surface/60 border border-border text-[11px]">
                <div>
                  <span className="text-muted-foreground text-[10px] block">Requester:</span>
                  <div className="font-bold text-foreground truncate">
                    {selectedInstance.metadata.requesterName || 'N/A'}{' '}
                    <span className="font-mono text-[9.5px] text-muted-foreground">
                      ({selectedInstance.metadata.employeeCode})
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Department:</span>
                  <div className="font-bold text-foreground truncate">
                    {selectedInstance.metadata.department || "Founder's Office"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Designation:</span>
                  <div className="font-bold text-foreground truncate">
                    {selectedInstance.metadata.designation || 'Staff'}
                  </div>
                </div>
              </div>

              {/* Category-Specific Detailed Section */}

              {/* 1. PURCHASE REQUISITION DETAILS */}
              {selectedInstance.categoryKey === 'purchase_requisition' && (
                <div className="space-y-2.5 p-3 rounded-xl bg-surface/60 border border-border">
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                    <span className="font-bold uppercase tracking-wider text-[10.5px] text-foreground flex items-center space-x-1.5">
                      <ShoppingCart className="h-3.5 w-3.5 text-orange-500" />
                      <span>Purchase Requisition Itemization</span>
                    </span>
                    <span className="font-mono font-bold text-orange-500 text-xs">
                      Est. Total: BDT {(selectedInstance.metadata.amountBDT || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground text-[10px]">Project / Allocation:</span>
                      <div className="font-bold text-foreground truncate">{selectedInstance.metadata.project || 'Operations'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px]">Required Delivery:</span>
                      <div className="font-bold text-foreground">
                        {formatDisplayDate(selectedInstance.metadata.requiredDate)}
                      </div>
                    </div>
                  </div>

                  {selectedInstance.metadata.justification && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px] font-semibold">Justification:</span>
                      <div className="p-2 rounded-lg bg-card border border-border leading-relaxed text-[11px] text-foreground">
                        {selectedInstance.metadata.justification}
                      </div>
                    </div>
                  )}

                  {/* Line Items Table */}
                  <div className="space-y-1">
                    <span className="font-bold uppercase tracking-wider text-[9.5px] text-muted-foreground">
                      Requested Items ({selectedInstance.metadata.lineItems?.length || 0}):
                    </span>
                    <div className="rounded-lg border border-border overflow-hidden bg-card">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-surface border-b border-border text-[9.5px] font-bold uppercase text-muted-foreground">
                            <th className="py-1.5 px-2.5">Item Name</th>
                            <th className="py-1.5 px-2 text-center">Qty</th>
                            <th className="py-1.5 px-2 text-right">Unit Price</th>
                            <th className="py-1.5 px-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                          {(selectedInstance.metadata.lineItems || []).map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 font-sans font-bold text-foreground">{item.name}</td>
                              <td className="py-1.5 px-2 text-center">{item.quantity} {item.unit || 'PCS'}</td>
                              <td className="py-1.5 px-2 text-right">{(item.unitCost || 0).toLocaleString()}</td>
                              <td className="py-1.5 px-2.5 text-right font-bold text-primary">
                                {(item.totalCost || item.quantity * item.unitCost).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. GENERAL REQUISITION DETAILS */}
              {selectedInstance.categoryKey === 'general_requisition' && (
                <div className="space-y-2.5 p-3 rounded-xl bg-surface/60 border border-border">
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                    <span className="font-bold uppercase tracking-wider text-[10.5px] text-foreground flex items-center space-x-1.5">
                      <ClipboardList className="h-3.5 w-3.5 text-purple-500" />
                      <span>General Requisition Supplies</span>
                    </span>
                    <span className="font-mono font-bold text-purple-500 text-xs">
                      Est. Total: BDT {(selectedInstance.metadata.amountBDT || 0).toLocaleString()}
                    </span>
                  </div>

                  {selectedInstance.metadata.justification && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px] font-semibold">Operational Need:</span>
                      <div className="p-2 rounded-lg bg-card border border-border leading-relaxed text-[11px] text-foreground">
                        {selectedInstance.metadata.justification}
                      </div>
                    </div>
                  )}

                  {/* Line Items */}
                  <div className="space-y-1">
                    <span className="font-bold uppercase tracking-wider text-[9.5px] text-muted-foreground">
                      Requested Supplies:
                    </span>
                    <div className="rounded-lg border border-border overflow-hidden bg-card">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-surface border-b border-border text-[9.5px] font-bold uppercase text-muted-foreground">
                            <th className="py-1.5 px-2.5">Item Description</th>
                            <th className="py-1.5 px-2 text-center">Qty</th>
                            <th className="py-1.5 px-2.5 text-right">Cost (BDT)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                          {(selectedInstance.metadata.lineItems || []).map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-2.5 font-sans font-bold text-foreground">{item.name}</td>
                              <td className="py-1.5 px-2 text-center">{item.quantity} {item.unit || 'Units'}</td>
                              <td className="py-1.5 px-2.5 text-right font-bold text-primary">
                                {(item.totalCost || item.quantity * item.unitCost).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ON DUTY DETAILS */}
              {selectedInstance.categoryKey === 'on_duty' && (
                <div className="space-y-2.5 p-3 rounded-xl bg-surface/60 border border-border">
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                    <span className="font-bold uppercase tracking-wider text-[10.5px] text-foreground flex items-center space-x-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                      <span>On-Duty Official Field Duty</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-500 text-xs">
                      Credited: {selectedInstance.metadata.creditedDays || 1} Day ({selectedInstance.metadata.totalHours || 8}h)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground text-[10px]">Duty Dates:</span>
                      <div className="font-bold text-foreground font-mono">
                        {formatDisplayDate(selectedInstance.metadata.startDate)}
                        {selectedInstance.metadata.endDate && selectedInstance.metadata.endDate !== selectedInstance.metadata.startDate
                          ? ` → ${formatDisplayDate(selectedInstance.metadata.endDate)}`
                          : ''}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px]">Field Timings:</span>
                      <div className="font-bold text-emerald-500 font-mono">
                        {selectedInstance.metadata.startTime} - {selectedInstance.metadata.endTime}
                      </div>
                    </div>
                  </div>

                  {selectedInstance.metadata.destination && (
                    <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>Destination / Site: <strong className="text-foreground">{selectedInstance.metadata.destination}</strong></span>
                    </div>
                  )}

                  {selectedInstance.metadata.reason && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground text-[10px] font-semibold">Duty Objectives:</span>
                      <div className="p-2 rounded-lg bg-card border border-border leading-relaxed text-[11px] text-foreground">
                        {cleanApplicantReason(selectedInstance.metadata.reason)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. ADVANCE & LIQUIDATION DETAILS */}
              {selectedInstance.categoryKey === 'advance_liquidation' && (
                <div className="space-y-2.5 p-3 rounded-xl bg-surface/60 border border-border">
                  <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                    <span className="font-bold uppercase tracking-wider text-[10.5px] text-foreground flex items-center space-x-1.5">
                      <Wallet className="h-3.5 w-3.5 text-rose-500" />
                      <span>{selectedInstance.categoryLabel}</span>
                    </span>
                    <span className="font-mono font-bold text-rose-500 text-xs">
                      Amount: BDT {(selectedInstance.metadata.amountBDT || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground text-[10px]">Duration:</span>
                      <div className="font-bold text-foreground">{selectedInstance.metadata.duration || 'Field Tour'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px]">Disbursement:</span>
                      <div className="font-mono font-bold text-foreground truncate">
                        {selectedInstance.metadata.bankAccountNumber || 'Direct Bank Disbursement'}
                      </div>
                    </div>
                  </div>

                  {/* 5 Dynamic Subtotals */}
                  {selectedInstance.metadata.expenseSubtotals && (
                    <div className="space-y-1">
                      <span className="font-bold uppercase tracking-wider text-[9.5px] text-muted-foreground">
                        Section Breakdown:
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        <div className="p-1.5 rounded-lg bg-card border border-border text-center">
                          <span className="text-[9px] text-muted-foreground block">Long Travel</span>
                          <span className="font-mono font-bold text-[10px] text-foreground">
                            {(selectedInstance.metadata.expenseSubtotals.longTravel || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-card border border-border text-center">
                          <span className="text-[9px] text-muted-foreground block">Lodging</span>
                          <span className="font-mono font-bold text-[10px] text-foreground">
                            {(selectedInstance.metadata.expenseSubtotals.accommodation || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-card border border-border text-center">
                          <span className="text-[9px] text-muted-foreground block">Per Diem</span>
                          <span className="font-mono font-bold text-[10px] text-foreground">
                            {(selectedInstance.metadata.expenseSubtotals.perDiem || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-card border border-border text-center">
                          <span className="text-[9px] text-muted-foreground block">Conveyance</span>
                          <span className="font-mono font-bold text-[10px] text-foreground">
                            {(selectedInstance.metadata.expenseSubtotals.localConveyance || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-card border border-border text-center">
                          <span className="text-[9px] text-muted-foreground block">Program</span>
                          <span className="font-mono font-bold text-[10px] text-foreground">
                            {(selectedInstance.metadata.expenseSubtotals.programExpenses || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Liquidation Variance */}
                  {selectedInstance.metadata.variance !== undefined && (
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-muted-foreground text-[10px]">Settlement Variance: </span>
                        <strong className="font-mono text-foreground">
                          BDT {Math.abs(selectedInstance.metadata.variance).toLocaleString()}
                        </strong>
                      </div>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary text-primary-foreground">
                        {selectedInstance.metadata.settlementType?.replace(/_/g, ' ') || 'BALANCED'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 5. LEAVE & REGULARIZATION DETAILS */}
              {selectedInstance.categoryKey === 'leave' && (
                <div className="space-y-2.5 p-3 rounded-xl bg-surface/60 border border-border text-xs">
                  {selectedInstance.definitionKey === 'attendance_regularization' ? (
                    <>
                      <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-border/60">
                        <div>
                          <span className="text-muted-foreground text-[10px]">Attendance Date: </span>
                          <strong className="font-mono text-foreground">{selectedInstance.metadata.date}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px]">Shift Schedule: </span>
                          <strong className="text-primary">{selectedInstance.metadata.workingSchedule || 'JAAGO HQ (10:00 AM - 06:00 PM)'}</strong>
                        </div>
                      </div>

                      {/* 2-Column Comparison Table for Regularization */}
                      <div className="space-y-1">
                        <span className="font-bold uppercase tracking-wider text-[9.5px] text-muted-foreground block">
                          Attendance Time Correction Table:
                        </span>

                        <div className="rounded-lg border border-border overflow-hidden bg-card">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-surface border-b border-border text-[9.5px] font-bold uppercase text-muted-foreground">
                                <th className="py-1.5 px-2.5">Field</th>
                                <th className="py-1.5 px-2.5">Original Record</th>
                                <th className="py-1.5 px-2.5 text-emerald-500">Proposed Adjusted Record</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                              <tr>
                                <td className="py-1.5 px-2.5 text-muted-foreground font-sans font-bold">Check In</td>
                                <td className="py-1.5 px-2.5 text-rose-500 font-bold">{selectedInstance.metadata.originalCheckIn || '--:--'}</td>
                                <td className="py-1.5 px-2.5 text-emerald-500 font-bold flex items-center space-x-1.5">
                                  <span>{selectedInstance.metadata.adjustedCheckIn}</span>
                                  <span className="text-[8.5px] font-sans font-black bg-emerald-500/10 text-emerald-500 px-1 py-0.2 rounded">On Time</span>
                                </td>
                              </tr>
                              <tr>
                                <td className="py-1.5 px-2.5 text-muted-foreground font-sans font-bold">Check Out</td>
                                <td className="py-1.5 px-2.5 text-muted-foreground">{selectedInstance.metadata.originalCheckOut || '--:--'}</td>
                                <td className="py-1.5 px-2.5 text-emerald-500 font-bold">{selectedInstance.metadata.adjustedCheckOut}</td>
                              </tr>
                              <tr>
                                <td className="py-1.5 px-2.5 text-muted-foreground font-sans font-bold">Status</td>
                                <td className="py-1.5 px-2.5">
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-amber-500/15 text-amber-500 font-bold font-sans">
                                    {selectedInstance.metadata.originalStatus || 'Late'}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2.5">
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-emerald-500/15 text-emerald-500 font-bold font-sans">
                                    Present (Regularized)
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-[10px] font-semibold">Regularization Reason &amp; Remarks:</span>
                        <div className="text-foreground bg-card p-2 rounded-lg border border-border text-[11px] leading-relaxed">
                          &ldquo;{cleanApplicantReason(selectedInstance.metadata.reason) || 'No remarks provided'}&rdquo;
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground text-[10px]">Leave Dates:</span>
                          <div className="font-bold text-foreground">
                            {formatDisplayDate(selectedInstance.metadata.startDate)} &rarr; {formatDisplayDate(selectedInstance.metadata.endDate)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px]">Total Duration:</span>
                          <div className="font-bold text-primary font-mono">
                            {selectedInstance.metadata.totalDays} Day(s) ({selectedInstance.metadata.leaveType})
                          </div>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-muted-foreground text-[10px] font-semibold">Applicant Reason:</span>
                        <div className="text-foreground bg-card p-2 rounded-lg border border-border text-[11px] leading-relaxed">
                          &ldquo;{cleanApplicantReason(selectedInstance.metadata.reason) || 'General leave application'}&rdquo;
                        </div>
                      </div>

                      {/* Attachment */}
                      {selectedInstance.metadata.attachmentName && (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              downloadAttachment(selectedInstance.metadata.attachmentName!, {
                                requesterName: selectedInstance.metadata.requesterName,
                                employeeCode: selectedInstance.metadata.employeeCode,
                                department: selectedInstance.metadata.department,
                                leaveType: selectedInstance.metadata.leaveType,
                                startDate: selectedInstance.metadata.startDate,
                                endDate: selectedInstance.metadata.endDate,
                                reason: selectedInstance.metadata.reason,
                                requestId: selectedInstance.id,
                                attachmentUrl: (selectedInstance.metadata as any).attachmentUrl,
                              })
                            }
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold transition cursor-pointer"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            <span>Download {selectedInstance.metadata.attachmentName}</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Mandatory Refusal Note Display (if refused) */}
              {selectedInstance.metadata.rejectionReason && (
                <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-[11px] space-y-0.5">
                  <span className="font-black uppercase tracking-wider text-[9.5px] block">
                    Mandatory Refusal Note / Justification:
                  </span>
                  <div className="font-medium">&ldquo;{selectedInstance.metadata.rejectionReason}&rdquo;</div>
                </div>
              )}

              {/* Multi-Tier Approval Timeline */}
              <div className="space-y-1.5">
                <span className="font-bold uppercase tracking-wider text-[9.5px] text-muted-foreground block">
                  Approval Timeline &amp; History
                </span>

                <div className="space-y-1.5">
                  {selectedInstance.history.map((hist, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-surface/60 border border-border/80 flex items-center justify-between text-[11px]"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-foreground capitalize">
                          {hist.action === 'submit' ? 'Submitted for Approval' : `Supervisor ${hist.action}`}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">by {hist.actorId}</span>
                        {hist.comment && <span className="text-muted-foreground italic text-[10px]">&ldquo;{hist.comment}&rdquo;</span>}
                      </div>
                      <span className="font-mono text-[9.5px] text-muted-foreground shrink-0">
                        {formatDisplayDateTime(hist.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer / Docked Action Toolbar (Always Visible, Zero Scroll Required) */}
            <div className="px-4 py-2.5 sm:py-3 border-t border-border bg-surface/80 flex items-center justify-between gap-3 shrink-0">
              {selectedInstance.currentState === 'pending_approval' ? (
                <>
                  <div className="text-[11px] text-muted-foreground flex items-center space-x-1.5 min-w-0 truncate">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Decision required for {selectedInstance.metadata.requesterName}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => {
                        setRefusalModalInstance(selectedInstance);
                        setRefusalNote('');
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/30 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Refuse</span>
                    </button>

                    <button
                      onClick={() => handleApprove(selectedInstance)}
                      disabled={isSubmitting}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center space-x-1.5 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Request</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-mono text-[11px]">
                    Status: <strong className="capitalize text-foreground">{selectedInstance.currentState}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedInstance(null)}
                    className="px-3 py-1 rounded-lg bg-surface hover:bg-surface/80 border border-border text-foreground text-xs font-bold transition cursor-pointer"
                  >
                    Close Window
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: MANDATORY REFUSAL NOTE ── */}
      {refusalModalInstance && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-destructive/40 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Refuse {refusalModalInstance.categoryLabel}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Mandatory refusal note required for employee decision notification
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefusalModalInstance(null)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border text-xs space-y-1">
              <div className="font-extrabold text-foreground">
                {refusalModalInstance.metadata.requesterName} ({refusalModalInstance.metadata.employeeCode})
              </div>
              <div className="text-muted-foreground">
                {refusalModalInstance.title}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-destructive flex items-center space-x-1">
                <span>Mandatory Refusal Note / Justification *</span>
              </label>
              <textarea
                rows={3}
                value={refusalNote}
                onChange={(e) => setRefusalNote(e.target.value)}
                placeholder="Explain the reason for refusing this request (this will be logged in the audit trail and notified to the employee)..."
                className="w-full p-3 rounded-2xl bg-surface border border-destructive/30 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-destructive shadow-sm placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setRefusalModalInstance(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-surface transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRefusalSubmit}
                disabled={!refusalNote.trim() || isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-destructive text-white text-xs font-black uppercase tracking-wider hover:bg-destructive/90 transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirm &amp; Refuse Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Loading Workflows...</div>}>
      <WorkflowsContent />
    </Suspense>
  );
}
