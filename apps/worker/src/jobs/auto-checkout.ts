import { createClient } from '@supabase/supabase-js';
import { logger } from '@jaago/logger';
import { formatWorkingHours, calculateWorkedSeconds } from '@jaago/core-domain';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

export interface AutoCheckoutJobResult {
  businessDate: string;
  totalProcessed: number;
  autoClosedCount: number;
  failedCount: number;
}

/**
 * Auto-checkout safety net worker job.
 * Executes at the daily cutoff C (default 23:30 Asia/Dhaka) for all employees with unclosed sessions.
 * Idempotent & safe to re-run.
 */
export async function runAutoCheckoutJob(targetDate?: string): Promise<AutoCheckoutJobResult> {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const nowUtc = new Date();
  
  // Format business date in Asia/Dhaka (or use provided targetDate)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const businessDate = targetDate || formatter.format(nowUtc);

  // Determine cutoff timestamp in UTC for that date (23:30 Asia/Dhaka = 17:30 UTC)
  const cutoffUtc = new Date(`${businessDate}T23:30:00+06:00`).toISOString();

  logger.info('SYSTEM', 'attendance.auto_checkout.started', {
    service: 'worker',
    metadata: { businessDate, cutoffUtc },
  });

  // Query all records for this business date with open sessions (check_in present, check_out missing)
  const { data: openRecords, error: fetchErr } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('business_date', businessDate)
    .not('check_in_at', 'is', null)
    .is('check_out_at', null);

  if (fetchErr) {
    logger.error('SYSTEM', 'attendance.auto_checkout.fetch_error', {
      service: 'worker',
      error: fetchErr.message,
      metadata: { businessDate },
    });
    return { businessDate, totalProcessed: 0, autoClosedCount: 0, failedCount: 1 };
  }

  const recordsToClose = openRecords || [];
  let autoClosedCount = 0;
  let failedCount = 0;

  for (const record of recordsToClose) {
    try {
      const firstIn = record.first_check_in_at || record.check_in_at;
      const lastOut = cutoffUtc;

      const facts = {
        employeeId: record.employee_id,
        businessDate,
        firstCheckInAt: firstIn,
        lastCheckOutAt: lastOut,
        checkInAt: record.check_in_at,
        checkOutAt: lastOut,
        calcMethod: (record.calc_method as 'span' | 'sessions') || 'span',
      };

      const workedSeconds = calculateWorkedSeconds(facts, facts.calcMethod, lastOut);
      const workedMinutes = Math.floor(workedSeconds / 60);
      const workedDisplay = formatWorkingHours(workedSeconds);

      // 1. Insert auto-checkout physical punch in attendance_events
      await supabase.from('attendance_events').insert({
        employee_id: record.employee_id,
        event_type: 'check_out',
        punch_type: 'check_out',
        source: 'auto',
        attempted_at: cutoffUtc,
        captured_at: cutoffUtc,
        device_info: 'System Auto-Checkout Worker',
        result: 'accepted',
        is_within_geofence: true,
      });

      // 2. Update attendance_records
      const { error: updateErr } = await supabase
        .from('attendance_records')
        .update({
          check_out_at: lastOut,
          check_out_source: 'auto',
          is_auto_checkout: true,
          worked_seconds: workedSeconds,
          worked_minutes: workedMinutes,
          worked_display: workedDisplay,
          status: 'present',
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (updateErr) {
        failedCount++;
        logger.error('SYSTEM', 'attendance.auto_checkout.record_update_failed', {
          service: 'worker',
          error: updateErr.message,
          metadata: { recordId: record.id, employeeId: record.employee_id },
        });
      } else {
        autoClosedCount++;
      }
    } catch (err: any) {
      failedCount++;
      logger.error('SYSTEM', 'attendance.auto_checkout.process_error', {
        service: 'worker',
        error: err.message,
        metadata: { recordId: record.id },
      });
    }
  }

  logger.info('SYSTEM', 'attendance.auto_checkout.completed', {
    service: 'worker',
    metadata: {
      businessDate,
      totalProcessed: recordsToClose.length,
      autoClosedCount,
      failedCount,
    },
  });

  return {
    businessDate,
    totalProcessed: recordsToClose.length,
    autoClosedCount,
    failedCount,
  };
}
