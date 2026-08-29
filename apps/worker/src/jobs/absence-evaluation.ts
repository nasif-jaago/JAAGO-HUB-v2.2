import { createClient } from '@supabase/supabase-js';
import { logger } from '@jaago/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

export interface AbsenceEvaluationResult {
  businessDate: string;
  totalActiveEmployees: number;
  markedAbsentCount: number;
  skippedWeeklyOffCount: number;
  skippedLeaveCount: number;
}

/**
 * Scheduled Absence Evaluation Worker Job.
 * Evaluates expected-to-work employees for closed attendance days.
 * Marks un-checked-in employees as 'absent' (worked_seconds = 0, worked_display = '0h 00m').
 */
export async function runAbsenceEvaluationJob(targetDate?: string): Promise<AbsenceEvaluationResult> {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const nowUtc = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const businessDate = targetDate || formatter.format(nowUtc);

  logger.info('SYSTEM', 'attendance.absence_eval.started', {
    service: 'worker',
    metadata: { businessDate },
  });

  // 1. Fetch all active employees
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, name, code, working_schedule')
    .eq('is_archived', false);

  if (empErr) {
    logger.error('SYSTEM', 'attendance.absence_eval.emp_fetch_error', {
      service: 'worker',
      error: empErr.message,
      metadata: { businessDate },
    });
    return {
      businessDate,
      totalActiveEmployees: 0,
      markedAbsentCount: 0,
      skippedWeeklyOffCount: 0,
      skippedLeaveCount: 0,
    };
  }

  // 2. Fetch existing attendance records for the date
  const { data: existingRecords } = await supabase
    .from('attendance_records')
    .select('employee_id, status')
    .eq('business_date', businessDate);

  const existingEmpIds = new Set((existingRecords || []).map((r) => r.employee_id));

  // 3. Check day of week for weekend rule (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
  const dayOfWeek = new Date(businessDate).getUTCDay();
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday & Saturday

  let markedAbsentCount = 0;
  let skippedWeeklyOffCount = 0;
  let skippedLeaveCount = 0;

  for (const emp of (employees || [])) {
    if (existingEmpIds.has(emp.id)) {
      continue; // Already has an attendance record today
    }

    if (isWeekend) {
      skippedWeeklyOffCount++;
      continue; // Skip weekend days
    }

    // Insert Absent record per §3.7
    const recordPayload = {
      id: `att-${emp.id}-${businessDate}`,
      employee_id: emp.id,
      business_date: businessDate,
      check_in_at: null,
      check_out_at: null,
      first_check_in_at: null,
      last_check_out_at: null,
      status: 'absent',
      is_late: false,
      late_by_minutes: 0,
      is_auto_checkout: false,
      needs_review: false,
      worked_minutes: 0,
      worked_seconds: 0,
      worked_display: '0h 00m',
      calc_method: 'span',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase
      .from('attendance_records')
      .upsert(recordPayload, { onConflict: 'employee_id,business_date' });

    if (!insertErr) {
      markedAbsentCount++;
    }
  }

  logger.info('SYSTEM', 'attendance.absence_eval.completed', {
    service: 'worker',
    metadata: {
      businessDate,
      totalActiveEmployees: employees?.length || 0,
      markedAbsentCount,
      skippedWeeklyOffCount,
      skippedLeaveCount,
    },
  });

  return {
    businessDate,
    totalActiveEmployees: employees?.length || 0,
    markedAbsentCount,
    skippedWeeklyOffCount,
    skippedLeaveCount,
  };
}
