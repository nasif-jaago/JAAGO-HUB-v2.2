import { NextRequest, NextResponse } from 'next/server';
import {
  notifySupervisorOnRegularizationSubmit,
  notifyEmployeeOnRegularizationDecision,
} from '@/lib/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...payload } = body;

    if (type === 'supervisor_submit') {
      const result = await notifySupervisorOnRegularizationSubmit({
        supervisorName: payload.supervisorName || 'Supervisor',
        supervisorEmail: payload.supervisorEmail || 'nasif.kamal@jaago.com.bd',
        employeeName: payload.employeeName,
        employeeCode: payload.employeeCode,
        department: payload.department,
        designation: payload.designation,
        date: payload.date,
        originalCheckIn: payload.originalCheckIn,
        originalCheckOut: payload.originalCheckOut,
        originalStatus: payload.originalStatus,
        adjustedCheckIn: payload.adjustedCheckIn,
        adjustedCheckOut: payload.adjustedCheckOut,
        workingSchedule: payload.workingSchedule,
        calculatedHours: payload.calculatedHours,
        reason: payload.reason,
        requestId: payload.requestId,
      });

      return NextResponse.json({
        success: result.success,
        logId: result.logId,
        error: result.error,
      });
    }

    if (type === 'employee_decision') {
      const result = await notifyEmployeeOnRegularizationDecision({
        employeeName: payload.employeeName,
        employeeEmail: payload.employeeEmail || 'staff@jaago.com.bd',
        date: payload.date,
        decisionStatus: payload.decisionStatus,
        reviewedBy: payload.reviewedBy,
        adjustedCheckIn: payload.adjustedCheckIn,
        adjustedCheckOut: payload.adjustedCheckOut,
        refusalNote: payload.refusalNote,
        requestId: payload.requestId,
      });

      return NextResponse.json({
        success: result.success,
        logId: result.logId,
        error: result.error,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid notification type specified' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('API /api/v1/emails/regularization-notification error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
