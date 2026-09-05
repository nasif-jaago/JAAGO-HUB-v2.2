import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-auth';
import {
  getServerRegularizations,
  addServerRegularization,
  approveServerRegularization,
  refuseServerRegularization,
  ServerRegularizationItem,
} from '@/lib/server-regularization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeCode = searchParams.get('employeeCode');
    const date = searchParams.get('date');

    const all = await getServerRegularizations();
    let filtered = all;

    if (employeeCode) {
      filtered = filtered.filter(
        (r) => r.employeeCode.toLowerCase() === employeeCode.toLowerCase()
      );
    }
    if (date) {
      filtered = filtered.filter((r) => r.date === date);
    }

    return NextResponse.json({ success: true, data: filtered });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = 'create', ...payload } = body;
    const itemData = payload.data || payload;

    if (action === 'create') {
      const id = itemData.id || `reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();

      let resolvedSupervisorName = itemData.supervisorName;
      let resolvedSupervisorEmail = itemData.supervisorEmail;

      if (!resolvedSupervisorName || !resolvedSupervisorEmail) {
        if (itemData.employeeCode || itemData.employeeId) {
          try {
            const supabase = getSupabase();
            if (supabase) {
              const query = itemData.employeeCode && itemData.employeeId
                ? `code.eq.${itemData.employeeCode},id.eq.${itemData.employeeId}`
                : itemData.employeeCode
                ? `code.eq.${itemData.employeeCode}`
                : `id.eq.${itemData.employeeId}`;

              const { data: emp } = await supabase
                .from('employees')
                .select('supervisor, code, name')
                .or(query)
                .limit(1)
                .maybeSingle();

              if (emp?.supervisor) {
                resolvedSupervisorName = emp.supervisor;
                const { data: sup } = await supabase
                  .from('employees')
                  .select('work_email, personal_email')
                  .or(`name.ilike.%${emp.supervisor}%,code.eq.${emp.supervisor}`)
                  .limit(1)
                  .maybeSingle();
                if (sup?.work_email || sup?.personal_email) {
                  resolvedSupervisorEmail = sup.work_email || sup.personal_email;
                }
              }
            }
          } catch {}
        }
      }

      const item: ServerRegularizationItem = {
        id,
        attendanceLogId: itemData.attendanceLogId,
        employeeId: itemData.employeeId,
        employeeCode: itemData.employeeCode,
        employeeName: itemData.employeeName,
        department: itemData.department,
        designation: itemData.designation,
        date: itemData.date,
        originalCheckIn: itemData.originalCheckIn || '--:--',
        originalCheckOut: itemData.originalCheckOut || '--:--',
        originalStatus: itemData.originalStatus || 'Late',
        originalLateByMin: itemData.originalLateByMin,
        adjustedCheckIn: itemData.adjustedCheckIn,
        adjustedCheckOut: itemData.adjustedCheckOut,
        adjustedStatus: 'Present',
        workingSchedule: itemData.workingSchedule,
        calculatedHours: itemData.calculatedHours || '8.0h',
        reason: itemData.reason,
        notes: itemData.notes,
        supervisorName: resolvedSupervisorName || 'Nasif Kamal',
        supervisorEmail: resolvedSupervisorEmail || 'nasif.kamal@jaago.com.bd',
        status: 'Pending',
        appliedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const created = await addServerRegularization(item);
      return NextResponse.json({ success: true, data: created });
    }

    if (action === 'approve') {
      const instanceId = payload.instanceId || payload.id || itemData.instanceId || itemData.id;
      const reviewerName = payload.reviewerName || payload.approverName || itemData.reviewerName;
      const reviewerCode = payload.reviewerCode || itemData.reviewerCode;
      const res = await approveServerRegularization(instanceId, reviewerName, reviewerCode);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: res.item });
    }

    if (action === 'refuse' || action === 'reject') {
      const instanceId = payload.instanceId || payload.id || itemData.instanceId || itemData.id;
      const note = payload.refusalNote || payload.comment || payload.rejectionReason || itemData.refusalNote || itemData.comment;
      const reviewerName = payload.reviewerName || payload.approverName || itemData.reviewerName;
      const reviewerCode = payload.reviewerCode || itemData.reviewerCode;
      const res = await refuseServerRegularization(instanceId, note, reviewerName, reviewerCode);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: res.item });
    }

    return NextResponse.json({ success: false, error: 'Unknown action specified' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
