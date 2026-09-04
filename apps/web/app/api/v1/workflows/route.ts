import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-auth';
import {
  notifyEmployeeOnLeaveDecision,
} from '@/lib/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WorkflowHistoryItem {
  fromState: string;
  toState: string;
  actorId: string;
  tier?: number;
  action: string;
  comment?: string;
  timestamp: string;
}

export interface UnifiedWorkflowInstance {
  id: string;
  definitionKey: string;
  title: string;
  entityType: string;
  entityId: string;
  requesterId: string;
  requesterEmail?: string;
  organizationId?: string;
  currentState: 'pending_approval' | 'approved' | 'rejected';
  currentTier: number;
  totalTiers: number;
  metadata: {
    requesterName?: string;
    employeeCode?: string;
    department?: string;
    designation?: string;
    supervisorName?: string;
    supervisorEmail?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    totalDays?: number | string;
    reason?: string;
    rejectionReason?: string;
    attachmentName?: string;
    approvedBy?: string;
    approvedAt?: string;
    amount?: string;
    vendor?: string;
    location?: string;
  };
  createdAt: string;
  updatedAt: string;
  history: WorkflowHistoryItem[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const userRole = searchParams.get('role') || '';
    const userEmail = (searchParams.get('userEmail') || '').toLowerCase().trim();
    const userCode = (searchParams.get('userCode') || '').trim();
    const userName = (searchParams.get('userName') || '').trim().toLowerCase();

    const supabase = getSupabase();

    // 1. Fetch live leave requests from Supabase
    const { data: leaveRows, error: leaveErr } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (leaveErr) {
      console.warn('Error fetching leave requests from Supabase in workflows API:', leaveErr);
    }

    // 2. Fetch live employee roster to resolve team hierarchy & emails
    const { data: empRows } = await supabase
      .from('employees')
      .select('id, code, name, designation, department, work_email, personal_email, supervisor, secondary_supervisor');

    const empMap = new Map<string, any>();
    (empRows || []).forEach((e: any) => {
      if (e.code) empMap.set(e.code, e);
      if (e.id) empMap.set(e.id, e);
      if (e.name) empMap.set(e.name.toLowerCase().trim(), e);
    });

    // 3. Build Workflow instances from leave requests
    const instances: UnifiedWorkflowInstance[] = (leaveRows || []).map((row: any) => {
      const emp = empMap.get(row.employee_code) || empMap.get(row.employee_id) || {};
      const empName = row.employee_name || emp.name || 'Employee';
      const supervisorName = emp.supervisor || "Founder's Office";
      const supEmp = empMap.get(supervisorName.toLowerCase().trim());
      const supervisorEmail = supEmp?.work_email || 'nasif.kamal@jaago.com.bd';

      const isApproved = row.status === 'Approved';
      const isRejected = row.status === 'Rejected' || row.status === 'Refused';
      const currentState: UnifiedWorkflowInstance['currentState'] = isApproved
        ? 'approved'
        : isRejected
        ? 'rejected'
        : 'pending_approval';

      // Parse attachment and refusal reason if stored in reason string
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

      const history: WorkflowHistoryItem[] = [
        {
          fromState: 'draft',
          toState: 'pending_approval',
          actorId: `${empName} (${row.employee_code})`,
          action: 'submit',
          timestamp: row.applied_at || row.created_at || new Date().toISOString(),
        },
      ];

      if (isApproved) {
        history.push({
          fromState: 'pending_approval',
          toState: 'approved',
          actorId: row.approved_by || supervisorName || 'Supervisor',
          tier: 1,
          action: 'approve',
          comment: 'Approved by Supervisor / PNC Manager',
          timestamp: row.approved_at || row.updated_at || new Date().toISOString(),
        });
      } else if (isRejected) {
        history.push({
          fromState: 'pending_approval',
          toState: 'rejected',
          actorId: row.approved_by || supervisorName || 'Supervisor',
          tier: 1,
          action: 'reject',
          comment: rejectionReason || 'Refused with mandatory note',
          timestamp: row.approved_at || row.updated_at || new Date().toISOString(),
        });
      }

      return {
        id: row.id,
        definitionKey: 'leave_request',
        title: `${row.leave_type || 'Leave Request'} (${row.total_days || 1} Days) - ${empName}`,
        entityType: 'leave_request',
        entityId: row.id,
        requesterId: row.employee_code,
        requesterEmail: emp.work_email || emp.personal_email || '',
        currentState,
        currentTier: isApproved ? 1 : 1,
        totalTiers: 1,
        metadata: {
          requesterName: empName,
          employeeCode: row.employee_code,
          department: emp.department || row.department || "Founder's Office",
          designation: emp.designation || row.designation || 'Staff',
          supervisorName,
          supervisorEmail,
          leaveType: row.leave_type || 'Casual Leave',
          startDate: row.from_date,
          endDate: row.to_date,
          totalDays: row.total_days || 1,
          reason: cleanReason,
          rejectionReason,
          attachmentName: attachmentName,
          approvedBy: row.approved_by || '',
          approvedAt: row.approved_at || '',
        },
        createdAt: row.applied_at || row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
        history,
      };
    });

    // 4. Role-based & Team-based Scoping
    const isSuperAdmin =
      userRole === 'super_admin' ||
      userEmail.includes('nasif.kamal') ||
      userName.includes('nasif kamal');

    const filtered = instances.filter((item) => {
      // Status filter
      if (status !== 'ALL') {
        if (status === 'PENDING' && item.currentState !== 'pending_approval') return false;
        if (status === 'APPROVED' && item.currentState !== 'approved') return false;
        if ((status === 'REJECTED' || status === 'REFUSED') && item.currentState !== 'rejected') return false;
      }

      const itemSupervisorName = (item.metadata.supervisorName || '').toLowerCase().trim();
      const itemRequesterCode = (item.metadata.employeeCode || '').toLowerCase().trim();
      const itemRequesterName = (item.metadata.requesterName || '').toLowerCase().trim();
      const isRequester = (userCode && itemRequesterCode === userCode.toLowerCase()) || (userName && itemRequesterName === userName);

      // STRICT RULE: Request owner cannot see or approve their own request in the Approvals Engine
      if (isRequester) {
        return false;
      }

      // If Super Admin: access all subordinates & organization requests
      if (isSuperAdmin || !userEmail) return true;

      // If user is the direct supervisor
      const isSupervisor =
        (userName && (itemSupervisorName.includes(userName) || userName.includes(itemSupervisorName))) ||
        (userEmail && item.metadata.supervisorEmail?.toLowerCase() === userEmail);

      return isSupervisor;
    });

    const pendingApprovals = filtered.filter((i) => i.currentState === 'pending_approval').length;
    const approvedCount = filtered.filter((i) => i.currentState === 'approved').length;

    return NextResponse.json({
      success: true,
      data: filtered,
      meta: {
        total: filtered.length,
        pendingApprovals,
        approvedCount,
      },
    });
  } catch (error: any) {
    console.error('API /api/v1/workflows GET error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch workflow requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, instanceId, comment, rejectionReason, reviewerName, reviewerCode, reviewerEmail: _reviewerEmail } = body;

    if (!instanceId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters (instanceId, action)' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !comment?.trim() && !rejectionReason?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mandatory Refusal Note is required when refusing a leave request.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // 1. Fetch current leave request
    const { data: currentReq, error: reqErr } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (reqErr || !currentReq) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found in database' },
        { status: 404 }
      );
    }

    // STRICT CHECK: Self-approval forbidden
    const reqEmpCode = (currentReq.employee_code || '').trim().toLowerCase();
    const reqEmpName = (currentReq.employee_name || '').trim().toLowerCase();
    const revCode = (reviewerCode || '').trim().toLowerCase();
    const revName = (reviewerName || '').trim().toLowerCase();

    if (
      (revCode && reqEmpCode === revCode) ||
      (revName && reqEmpName && (reqEmpName === revName || reqEmpName.includes(revName)))
    ) {
      return NextResponse.json(
        { success: false, error: 'Self-approval is forbidden: You cannot approve or refuse your own leave request.' },
        { status: 403 }
      );
    }

    const isApprove = action === 'approve';
    const finalStatus = isApprove ? 'Approved' : 'Rejected';
    const reviewer = reviewerName || 'Supervisor / Manager';
    const nowIso = new Date().toISOString();
    const refusalNote = isApprove ? '' : (comment || rejectionReason || '').trim();

    // 2. Update Supabase leave_requests table
    let updatedReason = currentReq.reason || '';
    if (!isApprove && refusalNote) {
      updatedReason = `${updatedReason} [Refusal Note: ${refusalNote}]`.trim();
    }

    const { error: updateErr } = await supabase
      .from('leave_requests')
      .update({
        status: finalStatus,
        approved_by: reviewer,
        approved_at: nowIso,
        reason: updatedReason,
        updated_at: nowIso,
      })
      .eq('id', instanceId);

    if (updateErr) {
      console.error('Failed to update leave_requests status in Supabase:', updateErr);
      return NextResponse.json(
        { success: false, error: 'Database update failed: ' + updateErr.message },
        { status: 500 }
      );
    }

    // 3. Look up employee to send email
    const { data: empData } = await supabase
      .from('employees')
      .select('id, code, name, work_email, personal_email')
      .or(`code.eq.${currentReq.employee_code},id.eq.${currentReq.employee_id || 'none'}`)
      .limit(1)
      .maybeSingle();

    const empEmail = empData?.work_email || empData?.personal_email;
    const empName = currentReq.employee_name || empData?.name || 'Employee';

    // 4. Send Email Notification to the requester
    if (empEmail) {
      notifyEmployeeOnLeaveDecision({
        employeeName: empName,
        employeeEmail: empEmail,
        leaveType: currentReq.leave_type || 'Leave Request',
        fromDate: currentReq.from_date,
        toDate: currentReq.to_date,
        totalDays: currentReq.total_days || 1,
        decisionStatus: isApprove ? 'Approved' : 'Refused',
        reviewedBy: reviewer,
        refusalReason: refusalNote || (isApprove ? 'Approved by Supervisor' : 'Request Refused'),
        requestId: currentReq.id,
      }).catch((e) => console.warn('Email dispatch warning:', e));
    }

    return NextResponse.json({
      success: true,
      message: `Leave request marked as ${finalStatus} successfully`,
      data: {
        id: currentReq.id,
        status: finalStatus,
        approvedBy: reviewer,
        approvedAt: nowIso,
        refusalReason: refusalNote,
      },
    });
  } catch (error: any) {
    console.error('API /api/v1/workflows POST error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process workflow action' },
      { status: 500 }
    );
  }
}
