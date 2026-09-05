import { getSupabaseAdminClient } from '@jaago/auth';
import {
  notifySupervisorOnRegularizationSubmit,
  notifyEmployeeOnRegularizationDecision,
} from './email-service';

export interface ServerRegularizationItem {
  id: string;
  attendanceLogId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  date: string;
  originalCheckIn: string;
  originalCheckOut: string;
  originalStatus: string;
  originalLateByMin?: number | undefined;
  adjustedCheckIn: string;
  adjustedCheckOut: string;
  adjustedStatus: string;
  workingSchedule: string;
  calculatedHours: string;
  reason: string;
  notes?: string | undefined;
  supervisorName: string;
  supervisorEmail: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Refused';
  refusalNote?: string | undefined;
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Global server store to ensure instantaneous synchronization across all Next.js route handlers
const INITIAL_SERVER_REGULARIZATIONS: ServerRegularizationItem[] = [
  {
    id: 'reg-demo-nayeem-3',
    attendanceLogId: 'att-demo-20260830',
    employeeId: 'emp-nayeem',
    employeeCode: 'FO072408021002',
    employeeName: 'S M Nayeem Rahman',
    department: "Founder's Office (JF)",
    designation: 'Team Lead',
    date: '2026-08-30',
    originalCheckIn: '11:06 AM',
    originalCheckOut: '--:--',
    originalStatus: 'Late',
    originalLateByMin: 36,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:00 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 00m',
    reason: 'Late Entry Due to Official Field Work / Traffic',
    supervisorName: 'Nasif Kamal',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Pending',
    appliedAt: '2026-09-05T09:00:00Z',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-05T09:00:00Z',
  },
  {
    id: 'reg-demo-nayeem-2',
    attendanceLogId: 'att-demo-20260831',
    employeeId: 'emp-nayeem',
    employeeCode: 'FO072408021002',
    employeeName: 'S M Nayeem Rahman',
    department: "Founder's Office (JF)",
    designation: 'Team Lead',
    date: '2026-08-31',
    originalCheckIn: '01:33 PM',
    originalCheckOut: '11:22 PM',
    originalStatus: 'Late',
    originalLateByMin: 213,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:00 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 00m',
    reason: 'Official field engagement / delayed biometric terminal sync on August 31.',
    supervisorName: 'Nasif Kamal',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Pending',
    appliedAt: '2026-09-05T09:00:00Z',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-05T09:00:00Z',
  },
  {
    id: 'reg-demo-nayeem-1',
    attendanceLogId: 'att-demo-20260903',
    employeeId: 'emp-nayeem',
    employeeCode: 'FO072408021002',
    employeeName: 'S M Nayeem Rahman',
    department: "Founder's Office (JF)",
    designation: 'Team Lead',
    date: '2026-09-03',
    originalCheckIn: '01:33 PM',
    originalCheckOut: '11:22 PM',
    originalStatus: 'Late',
    originalLateByMin: 213,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:00 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 00m',
    reason: 'Late Entry Due to Official Field Work / Traffic',
    supervisorName: 'Nasif Kamal',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Pending',
    appliedAt: '2026-09-05T09:00:00Z',
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-05T09:00:00Z',
  },
  {
    id: 'reg-demo-kazi-1',
    attendanceLogId: 'att-demo-20260902',
    employeeId: 'emp-kazi',
    employeeCode: 'FO072408021003',
    employeeName: 'Kazi Farhan',
    department: 'Programmes',
    designation: 'Project Officer',
    date: '2026-09-02',
    originalCheckIn: '10:35 AM',
    originalCheckOut: '06:00 PM',
    originalStatus: 'Late',
    originalLateByMin: 35,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:00 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 00m',
    reason: 'Severe monsoon downpour and public transit disruption in Banani area.',
    supervisorName: 'Nasif Kamal',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Pending',
    appliedAt: '2026-09-04T18:00:00Z',
    createdAt: '2026-09-04T18:00:00Z',
    updatedAt: '2026-09-04T18:00:00Z',
  },
  {
    id: 'reg-demo-1',
    attendanceLogId: 'att-demo-20260824',
    employeeId: 'emp-nasif',
    employeeCode: 'FO032507061190',
    employeeName: 'Nasif Kamal',
    department: "Founder's Office / FC",
    designation: 'Coordinator, Tech 4 Development',
    date: '2026-08-24',
    originalCheckIn: '10:22 AM',
    originalCheckOut: '06:05 PM',
    originalStatus: 'Late',
    originalLateByMin: 22,
    adjustedCheckIn: '10:00 AM',
    adjustedCheckOut: '06:05 PM',
    adjustedStatus: 'Present',
    workingSchedule: 'JAAGO HQ (10:00 AM - 06:00 PM)',
    calculatedHours: '8h 05m',
    reason: 'Biometric RFID reader network sync latency during morning check-in.',
    supervisorName: 'Korvi Rakshand (Founder & ED)',
    supervisorEmail: 'nasif.kamal@jaago.com.bd',
    status: 'Approved',
    approvedBy: 'Korvi Rakshand (Founder & ED)',
    approvedAt: '2026-08-25T09:30:00Z',
    appliedAt: '2026-08-24T18:30:00Z',
    createdAt: '2026-08-24T18:30:00Z',
    updatedAt: '2026-08-25T09:30:00Z',
  },
];

function getGlobalRegularizationsStore(): ServerRegularizationItem[] {
  if (!(globalThis as any).__jaago_regularizations__) {
    (globalThis as any).__jaago_regularizations__ = [...INITIAL_SERVER_REGULARIZATIONS];
  }
  return (globalThis as any).__jaago_regularizations__;
}

export async function getServerRegularizations(): Promise<ServerRegularizationItem[]> {
  const store = getGlobalRegularizationsStore();
  return [...store];
}

export async function addServerRegularization(item: ServerRegularizationItem): Promise<ServerRegularizationItem> {
  const store = getGlobalRegularizationsStore();
  const existingIdx = store.findIndex((r) => r.id === item.id);
  const isNew = existingIdx < 0;

  if (existingIdx >= 0) {
    store[existingIdx] = item;
  } else {
    store.unshift(item);
  }

  // Only notify supervisor via email on new submission in background
  if (isNew) {
    notifySupervisorOnRegularizationSubmit({
      supervisorName: item.supervisorName,
      supervisorEmail: item.supervisorEmail,
      employeeName: item.employeeName,
      employeeCode: item.employeeCode,
      department: item.department,
      designation: item.designation,
      date: item.date,
      originalCheckIn: item.originalCheckIn,
      originalCheckOut: item.originalCheckOut,
      originalStatus: item.originalStatus,
      adjustedCheckIn: item.adjustedCheckIn,
      adjustedCheckOut: item.adjustedCheckOut,
      workingSchedule: item.workingSchedule,
      calculatedHours: item.calculatedHours,
      reason: item.reason,
      requestId: item.id,
    }).catch((err) => console.warn('Background supervisor email notification warning:', err));
  }

  return item;
}

export async function approveServerRegularization(
  id: string,
  reviewerName: string,
  _reviewerCode?: string
): Promise<{ success: boolean; item?: ServerRegularizationItem; error?: string }> {
  const store = getGlobalRegularizationsStore();
  const item = store.find((r) => r.id === id);
  if (!item) {
    return { success: false, error: 'Regularization request not found.' };
  }

  const nowIso = new Date().toISOString();
  item.status = 'Approved';
  item.approvedBy = reviewerName || 'Supervisor / Manager';
  item.approvedAt = nowIso;
  item.updatedAt = nowIso;

  // Ubiquitously update Supabase attendance_records
  try {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      // Resolve employee ID
      const { data: emp } = await supabase
        .from('employees')
        .select('id, work_email, personal_email')
        .or(`code.eq.${item.employeeCode},id.eq.${item.employeeId}`)
        .limit(1)
        .maybeSingle();

      const employeeId = emp?.id || item.employeeId || '71a38594-d803-4e6d-b6e9-79767a16c4c6';

      // Parse adjusted times into timestamps
      let checkInAt: string | null = null;
      let checkOutAt: string | null = null;

      if (item.adjustedCheckIn && item.adjustedCheckIn !== '--:--') {
        const inDate = new Date(`${item.date} ${item.adjustedCheckIn}`);
        if (!isNaN(inDate.getTime())) checkInAt = inDate.toISOString();
      }
      if (item.adjustedCheckOut && item.adjustedCheckOut !== '--:--') {
        const outDate = new Date(`${item.date} ${item.adjustedCheckOut}`);
        if (!isNaN(outDate.getTime())) checkOutAt = outDate.toISOString();
      }

      // Ubiquitously update Supabase attendance_records
      const { data: existingRows } = await supabase
        .from('attendance_records')
        .select('id')
        .or(`id.eq.${item.attendanceLogId},and(employee_id.eq.${employeeId},business_date.eq.${item.date})`);

      if (existingRows && existingRows.length > 0) {
        const primaryId = existingRows[0]!.id;
        await supabase
          .from('attendance_records')
          .update({
            check_in_at: checkInAt,
            check_out_at: checkOutAt,
            check_in_source: 'manual',
            check_out_source: 'manual',
            check_in_lat: 23.7937,
            check_in_lng: 90.4066,
            check_out_lat: 23.7937,
            check_out_lng: 90.4066,
            status: 'present',
            is_late: false,
            late_by_minutes: 0,
            is_auto_checkout: false,
            worked_minutes: 480,
            notes: `Regularized (Approved by ${item.approvedBy}): ${item.reason}`,
            updated_at: nowIso,
          })
          .eq('id', primaryId);

        if (existingRows.length > 1) {
          const deleteIds = existingRows.slice(1).map((r) => r.id);
          await supabase.from('attendance_records').delete().in('id', deleteIds);
        }
      } else {
        await supabase.from('attendance_records').insert({
          id: item.attendanceLogId || `att-${employeeId}-${item.date}`,
          employee_id: employeeId,
          business_date: item.date,
          check_in_at: checkInAt,
          check_out_at: checkOutAt,
          check_in_source: 'manual',
          check_out_source: 'manual',
          check_in_lat: 23.7937,
          check_in_lng: 90.4066,
          check_out_lat: 23.7937,
          check_out_lng: 90.4066,
          status: 'present',
          is_late: false,
          late_by_minutes: 0,
          is_auto_checkout: false,
          worked_minutes: 480,
          notes: `Regularized (Approved by ${item.approvedBy}): ${item.reason}`,
          updated_at: nowIso,
        });
      }

      // Notify employee
      const empEmail = emp?.work_email || emp?.personal_email || 'staff@jaago.com.bd';
      notifyEmployeeOnRegularizationDecision({
        employeeName: item.employeeName,
        employeeEmail: empEmail,
        date: item.date,
        decisionStatus: 'Approved',
        reviewedBy: item.approvedBy,
        adjustedCheckIn: item.adjustedCheckIn,
        adjustedCheckOut: item.adjustedCheckOut,
        requestId: item.id,
      }).catch((e) => console.warn('Employee approval notification warning:', e));
    }
  } catch (err) {
    console.warn('Error syncing regularized attendance with Supabase:', err);
  }

  return { success: true, item };
}

export async function refuseServerRegularization(
  id: string,
  refusalNote?: string,
  reviewerName?: string,
  _reviewerCode?: string
): Promise<{ success: boolean; item?: ServerRegularizationItem; error?: string }> {
  if (!refusalNote || !refusalNote.trim()) {
    return { success: false, error: 'Mandatory refusal note is required.' };
  }

  const store = getGlobalRegularizationsStore();
  const item = store.find((r) => r.id === id);
  if (!item) {
    return { success: false, error: 'Regularization request not found.' };
  }

  const nowIso = new Date().toISOString();
  item.status = 'Refused';
  item.refusalNote = refusalNote.trim();
  item.approvedBy = reviewerName || 'Supervisor / Manager';
  item.approvedAt = nowIso;
  item.updatedAt = nowIso;

  try {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id, work_email, personal_email')
        .or(`code.eq.${item.employeeCode},id.eq.${item.employeeId}`)
        .limit(1)
        .maybeSingle();

      const empEmail = emp?.work_email || emp?.personal_email || 'staff@jaago.com.bd';
      notifyEmployeeOnRegularizationDecision({
        employeeName: item.employeeName,
        employeeEmail: empEmail,
        date: item.date,
        decisionStatus: 'Refused',
        reviewedBy: item.approvedBy,
        refusalNote: refusalNote.trim(),
        requestId: item.id,
      }).catch((e) => console.warn('Employee refusal notification warning:', e));
    }
  } catch (err) {
    console.warn('Error sending refusal notification:', err);
  }

  return { success: true, item };
}
