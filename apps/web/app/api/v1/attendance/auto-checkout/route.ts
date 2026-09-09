import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';
import { formatWorkingHours, calculateWorkedSeconds } from '@jaago/core-domain';
import { getCurrentBusinessDate, resolveCanonicalEmployeeId } from '@/lib/server-attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AutoCheckoutResult {
  businessDate: string;
  totalFound: number;
  autoClosedCount: number;
  absentMarkedCount: number;
  skippedOffDayCount: number;
  failedCount: number;
  updatedRecords: any[];
}

/**
 * Executes auto-checkout for all unclosed sessions on or before the target business date.
 * Also evaluates unpunched employees (both check-in & check-out blank):
 * - If today is their weekend or scheduled off-day, preserves as Off Day (does not mark absent).
 * - If today is a scheduled workday, marks as absent.
 */
async function processAutoCheckout(options?: {
  targetDate?: string | undefined;
  employeeId?: string | undefined;
  cutoffTimeLocal?: string | undefined; // default '23:30'
  evaluateAbsences?: boolean | undefined;
}): Promise<AutoCheckoutResult> {
  const supabase = getSupabaseAdminClient();
  const cutoffTime = options?.cutoffTimeLocal || '23:30';
  const businessDate = options?.targetDate || getCurrentBusinessDate('Asia/Dhaka', cutoffTime);

  // 1. Fetch unclosed attendance records across ALL employees
  let query = supabase
    .from('attendance_records')
    .select('*')
    .not('check_in_at', 'is', null)
    .is('check_out_at', null);

  if (options?.targetDate) {
    query = query.eq('business_date', options.targetDate);
  } else {
    // Catch open sessions for today and any previous unclosed days
    query = query.lte('business_date', businessDate);
  }

  if (options?.employeeId) {
    const canonicalId = await resolveCanonicalEmployeeId(options.employeeId);
    query = query.eq('employee_id', canonicalId);
  }

  const { data: openRecords, error: fetchErr } = await query;

  if (fetchErr) {
    console.error('Error fetching unclosed attendance records for auto-checkout:', fetchErr);
    return {
      businessDate,
      totalFound: 0,
      autoClosedCount: 0,
      absentMarkedCount: 0,
      skippedOffDayCount: 0,
      failedCount: 1,
      updatedRecords: [],
    };
  }

  const recordsToClose = openRecords || [];
  let autoClosedCount = 0;
  let failedCount = 0;
  const updatedRecords: any[] = [];

  for (const rec of recordsToClose) {
    try {
      const recDate = rec.business_date || businessDate;
      const firstIn = rec.first_check_in_at || rec.check_in_at;

      // Check if employee has a legitimate BioTime check-out on this date
      const { data: bioPunches } = await supabase
        .from('att_biotime_events')
        .select('*')
        .eq('hub_employee_id', rec.employee_id)
        .gte('punch_time', `${recDate}T00:00:00+06:00`)
        .lte('punch_time', `${recDate}T23:59:59+06:00`)
        .order('punch_time', { ascending: true });

      let physicalOutUtc: string | null = null;
      if (bioPunches && bioPunches.length > 0) {
        const checkOutBio = bioPunches.filter(
          (bp) => bp.punch_state === 'CHECK_OUT' || (firstIn && new Date(bp.punch_time).getTime() > new Date(firstIn).getTime() + 5 * 60 * 1000)
        );
        if (checkOutBio.length > 0) {
          physicalOutUtc = checkOutBio[checkOutBio.length - 1]!.punch_time;
        }
      }

      if (physicalOutUtc) {
        // Legitimate BioTime checkout exists: close attendance_records with BioTime punch without inserting synthetic auto-checkout
        const facts = {
          employeeId: rec.employee_id,
          businessDate: recDate,
          firstCheckInAt: firstIn,
          lastCheckOutAt: physicalOutUtc,
          checkInAt: rec.check_in_at,
          checkOutAt: physicalOutUtc,
          calcMethod: (rec.calc_method as 'span' | 'sessions') || 'span',
        };

        const workedSeconds = calculateWorkedSeconds(facts, facts.calcMethod, physicalOutUtc);
        const workedMinutes = Math.floor(workedSeconds / 60);
        const workedDisplay = formatWorkingHours(workedSeconds);

        const { data: updatedBio } = await supabase
          .from('attendance_records')
          .update({
            check_out_at: physicalOutUtc,
            last_check_out_at: physicalOutUtc,
            check_out_source: 'biotime',
            is_auto_checkout: false,
            needs_review: false,
            worked_seconds: workedSeconds,
            worked_minutes: workedMinutes,
            worked_display: workedDisplay,
            status: rec.status === 'absent' ? 'present' : (rec.status || 'present'),
            updated_at: new Date().toISOString(),
          })
          .eq('id', rec.id)
          .select()
          .single();

        autoClosedCount++;
        if (updatedBio) updatedRecords.push(updatedBio);
        continue;
      }

      const recCutoffIso = new Date(`${recDate}T${cutoffTime}:00+06:00`).toISOString();
      const cutoffTimeMs = new Date(recCutoffIso).getTime();

      // Guard: Never auto-checkout if real time has not yet passed cutoff for this record's date
      if (Date.now() < cutoffTimeMs) {
        continue;
      }

      const lastOut = recCutoffIso;

      const facts = {
        employeeId: rec.employee_id,
        businessDate: recDate,
        firstCheckInAt: firstIn,
        lastCheckOutAt: lastOut,
        checkInAt: rec.check_in_at,
        checkOutAt: lastOut,
        calcMethod: (rec.calc_method as 'span' | 'sessions') || 'span',
      };

      const workedSeconds = calculateWorkedSeconds(facts, facts.calcMethod, lastOut);
      const workedMinutes = Math.floor(workedSeconds / 60);
      const workedDisplay = formatWorkingHours(workedSeconds);

      // 1. Insert auto-checkout punch into attendance_events
      await supabase.from('attendance_events').insert({
        employee_id: rec.employee_id,
        event_type: 'check_out',
        punch_type: 'check_out',
        source: 'auto',
        attempted_at: recCutoffIso,
        captured_at: recCutoffIso,
        device_info: 'System Auto-Checkout Worker (11:30 PM)',
        result: 'accepted',
        is_within_geofence: true,
      });

      // 2. Update attendance_records
      const { data: updated, error: updateErr } = await supabase
        .from('attendance_records')
        .update({
          check_out_at: lastOut,
          last_check_out_at: lastOut,
          check_out_source: 'auto',
          is_auto_checkout: true,
          needs_review: true,
          worked_seconds: workedSeconds,
          worked_minutes: workedMinutes,
          worked_display: workedDisplay,
          status: rec.status === 'absent' ? 'present' : (rec.status || 'present'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', rec.id)
        .select()
        .single();

      if (updateErr) {
        failedCount++;
        console.error(`Failed to update auto-checkout for record ${rec.id}:`, updateErr);
      } else {
        autoClosedCount++;
        updatedRecords.push(updated);
      }
    } catch (err: any) {
      failedCount++;
      console.error(`Exception during auto-checkout for record ${rec.id}:`, err);
    }
  }

  // 2. Absence Evaluation for Unpunched Employees (Check-in & Check-out both blank)
  let absentMarkedCount = 0;
  let skippedOffDayCount = 0;

  const shouldEvaluateAbsence = options?.evaluateAbsences !== false;
  if (shouldEvaluateAbsence) {
    try {
      // Determine day of week for target businessDate (0=Sun, 1=Mon, ..., 5=Fri, 6=Sat)
      const targetDow = new Date(businessDate).getUTCDay();

      // Fetch active employees
      let empQuery = supabase
        .from('employees')
        .select('id, name, code, working_schedule')
        .eq('is_archived', false);

      if (options?.employeeId) {
        const canonicalId = await resolveCanonicalEmployeeId(options.employeeId);
        empQuery = empQuery.eq('id', canonicalId);
      }

      const { data: activeEmps } = await empQuery;

      // Fetch existing records for this business date
      const { data: existingRecords } = await supabase
        .from('attendance_records')
        .select('employee_id, status')
        .eq('business_date', businessDate);

      const existingEmpSet = new Set((existingRecords || []).map((r) => r.employee_id));

      for (const emp of activeEmps || []) {
        if (existingEmpSet.has(emp.id)) {
          continue; // Already has an attendance record
        }

        // Determine if this day is employee's weekend / off-day
        const weekendRule = (emp as any).weekend_days || (emp as any).weekendDays || 'Friday & Saturday';
        let isOffDay = false;
        if (weekendRule.includes('Friday Only')) {
          isOffDay = targetDow === 5;
        } else if (weekendRule.includes('Saturday Only')) {
          isOffDay = targetDow === 6;
        } else if (weekendRule.includes('Sunday to Thursday')) {
          isOffDay = targetDow === 5 || targetDow === 6;
        } else {
          isOffDay = targetDow === 5 || targetDow === 6; // Default Fri & Sat
        }

        if (isOffDay) {
          skippedOffDayCount++;
          continue; // Off day: do NOT mark absent
        }

        // Mark Absent on scheduled workday with 0 worked time
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

        const { error: insErr } = await supabase
          .from('attendance_records')
          .upsert(recordPayload, { onConflict: 'employee_id,business_date' });

        if (!insErr) {
          absentMarkedCount++;
        }
      }
    } catch (err: any) {
      console.error('Error during absence evaluation in auto-checkout handler:', err);
    }
  }

  return {
    businessDate,
    totalFound: recordsToClose.length,
    autoClosedCount,
    absentMarkedCount,
    skippedOffDayCount,
    failedCount,
    updatedRecords,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get('date') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const evaluateAbsences = searchParams.get('evaluateAbsences') !== 'false';

    const result = await processAutoCheckout({
      targetDate,
      employeeId,
      evaluateAbsences,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Auto-checkout execution failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const targetDate = body.date || body.targetDate || undefined;
    const employeeId = body.employeeId || undefined;
    const cutoffTimeLocal = body.cutoffTimeLocal || '23:30';
    const evaluateAbsences = body.evaluateAbsences !== false;

    const result = await processAutoCheckout({
      targetDate,
      employeeId,
      cutoffTimeLocal,
      evaluateAbsences,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Auto-checkout execution failed' },
      { status: 500 }
    );
  }
}
