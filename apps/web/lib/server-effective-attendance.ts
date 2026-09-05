import { getSupabaseAdminClient } from '@jaago/auth';
import {
  computeEffectiveAttendanceDay,
  EffectiveAttendanceDay,
  RawPunchEvent,
} from '@jaago/core-domain';
import {
  fetchLiveBioTimeTransactions,
  BioTimePunchLog,
} from '@/lib/biotime-data';
import {
  resolveCanonicalEmployeeId,
} from '@/lib/server-attendance';
import { getServerRegularizations } from '@/lib/server-regularization';

/**
 * Sync and ingest BioTime transactions into Supabase att_biotime_events and att_biotime_employee_map idempotently
 */
export async function syncBioTimePunchesToSupabase(options?: {
  page?: number;
  pageSize?: number;
  startTime?: string;
  endTime?: string;
  forceAll?: boolean;
}): Promise<{
  syncedCount: number;
  unmatchedCount: number;
  totalLive: number;
}> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { syncedCount: 0, unmatchedCount: 0, totalLive: 0 };
  }

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 200;
  const liveResult = await fetchLiveBioTimeTransactions(page, pageSize, options?.startTime, options?.endTime);
  const liveLogs: BioTimePunchLog[] = liveResult.logs || [];

  if (liveLogs.length === 0) {
    return { syncedCount: 0, unmatchedCount: 0, totalLive: liveResult.total || 0 };
  }

  // 1. Fetch all HUB employees and existing mapping table
  const [{ data: emps }, { data: existingMaps }] = await Promise.all([
    supabase.from('employees').select('id, code, name, department, branch, rfid'),
    supabase.from('att_biotime_employee_map').select('*'),
  ]);

  const empList = emps || [];
  const mapByBioCode = new Map<string, any>();
  (existingMaps || []).forEach((m) => {
    if (m.biotime_emp_code) mapByBioCode.set(String(m.biotime_emp_code).trim(), m);
  });

  // Fast lookup indexes for automatic linking
  const empByRfid = new Map<string, any>();
  const empByCode = new Map<string, any>();
  const empByName = new Map<string, any>();

  empList.forEach((e) => {
    if (e.rfid) {
      const cleanRfid = String(e.rfid).replace(/^RFID-/i, '').trim().toLowerCase();
      empByRfid.set(cleanRfid, e);
      empByRfid.set(String(e.rfid).trim().toLowerCase(), e);
    }
    if (e.code) {
      empByCode.set(String(e.code).trim().toLowerCase(), e);
      // Remove prefixes like "JF-", "EMP-"
      const numericCode = String(e.code).replace(/^[A-Z]+-?/i, '').trim().toLowerCase();
      if (numericCode) empByCode.set(numericCode, e);
    }
    if (e.name) {
      empByName.set(String(e.name).trim().toLowerCase(), e);
    }
  });

  // 2. Resolve employee mapping for each distinct BioTime code
  const distinctPunches = new Map<string, BioTimePunchLog>();
  liveLogs.forEach((l) => {
    const code = String(l.employeeCode || '').trim();
    if (code && !distinctPunches.has(code)) {
      distinctPunches.set(code, l);
    }
  });

  let unmatchedCount = 0;
  const mapsToUpsert: any[] = [];

  distinctPunches.forEach((punch, bioCode) => {
    const existing = mapByBioCode.get(bioCode);
    if (existing && existing.hub_employee_id) {
      // Already successfully mapped
      return;
    }

    const cleanBioCode = bioCode.toLowerCase();
    const cleanBioName = (punch.employeeName || '').toLowerCase().trim();

    // Auto-match waterfall: RFID -> Code -> Normalized Name
    let matched = empByRfid.get(cleanBioCode) ||
      empByCode.get(cleanBioCode) ||
      empByName.get(cleanBioName);

    if (!matched && cleanBioName) {
      // Partial name match
      matched = empList.find(
        (e) =>
          e.name &&
          (cleanBioName.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(cleanBioName))
      );
    }

    if (matched) {
      mapsToUpsert.push({
        biotime_emp_code: bioCode,
        biotime_name: punch.employeeName || null,
        biotime_department: punch.department || null,
        hub_employee_id: matched.id,
        hub_employee_code: matched.code,
        unmatched: false,
        notes: `Auto-linked to ${matched.name} (${matched.code})`,
        updated_at: new Date().toISOString(),
      });
      mapByBioCode.set(bioCode, {
        biotime_emp_code: bioCode,
        hub_employee_id: matched.id,
        hub_employee_code: matched.code,
        unmatched: false,
      });
    } else {
      unmatchedCount++;
      // Record quarantined / unmatched mapping without crashing
      mapsToUpsert.push({
        biotime_emp_code: bioCode,
        biotime_name: punch.employeeName || null,
        biotime_department: punch.department || null,
        hub_employee_id: null,
        hub_employee_code: null,
        unmatched: true,
        notes: 'Unmatched BioTime device enroll ID awaiting admin mapping',
        updated_at: new Date().toISOString(),
      });
    }
  });

  if (mapsToUpsert.length > 0) {
    await supabase
      .from('att_biotime_employee_map')
      .upsert(mapsToUpsert, { onConflict: 'biotime_emp_code' });
  }

  // 3. Idempotently insert/upsert normalized BioTime events
  const eventsToUpsert: any[] = [];
  for (const log of liveLogs) {
    const bioCode = String(log.employeeCode || '').trim();
    const mapping = mapByBioCode.get(bioCode);
    const punchDate = new Date(log.punchTime);
    if (isNaN(punchDate.getTime())) continue;

    const punchIso = punchDate.toISOString();
    const eventId = log.id || `zk-${bioCode}-${punchIso.replace(/[:.]/g, '-')}`;

    eventsToUpsert.push({
      id: eventId,
      biotime_emp_code: bioCode,
      hub_employee_id: mapping?.hub_employee_id || null,
      punch_time: punchIso,
      punch_state: log.punchState || (log.punchTime.includes('18:') ? 'CHECK_OUT' : 'CHECK_IN'),
      verify_type: log.verifyType || 'Face',
      terminal_sn: log.deviceSn || 'VGU6251500095',
      terminal_alias: log.deviceName || 'JAAGO Foundation HQ',
      area_alias: log.locationBranch || 'JAAGO Foundation HQ',
      source: 'biotime',
      raw_payload: {
        employeeName: log.employeeName,
        department: log.department,
        syncStatus: log.syncStatus,
      },
    });
  }

  let syncedCount = 0;
  if (eventsToUpsert.length > 0) {
    // Process in batches of 50
    for (let i = 0; i < eventsToUpsert.length; i += 50) {
      const batch = eventsToUpsert.slice(i, i + 50);
      const { error } = await supabase
        .from('att_biotime_events')
        .upsert(batch, { onConflict: 'biotime_emp_code,punch_time,terminal_sn' });
      if (!error) {
        syncedCount += batch.length;
      }
    }
  }

  return {
    syncedCount,
    unmatchedCount,
    totalLive: liveResult.total || liveLogs.length,
  };
}

/**
 * Fetch unified effective daily attendance records for any employee, date range, or department
 */
export async function getEffectiveDailyAttendance(options?: {
  employeeId?: string | undefined;
  employeeCode?: string | undefined;
  date?: string | undefined; // YYYY-MM-DD
  month?: string | undefined; // YYYY-MM
  startDate?: string | undefined;
  endDate?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
}): Promise<EffectiveAttendanceDay[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const limit = options?.limit || 200;
  let resolvedEmpId = options?.employeeId;

  if (options?.employeeCode && !resolvedEmpId) {
    resolvedEmpId = await resolveCanonicalEmployeeId(options.employeeCode);
  } else if (resolvedEmpId) {
    resolvedEmpId = await resolveCanonicalEmployeeId(resolvedEmpId);
  }

  // 1. First attempt querying from Supabase att_effective_daily view
  try {
    let viewQuery = supabase
      .from('att_effective_daily')
      .select('*')
      .order('business_date', { ascending: false })
      .limit(limit);

    if (resolvedEmpId) viewQuery = viewQuery.eq('employee_id', resolvedEmpId);
    if (options?.date) viewQuery = viewQuery.eq('business_date', options.date);
    else if (options?.startDate && options?.endDate) {
      viewQuery = viewQuery.gte('business_date', options.startDate).lte('business_date', options.endDate);
    } else if (options?.month) {
      viewQuery = viewQuery.gte('business_date', `${options.month}-01`).lte('business_date', `${options.month}-31`);
    }

    const { data: viewData, error: viewErr } = await viewQuery;

    if (!viewErr && Array.isArray(viewData) && viewData.length > 0) {
      return viewData.map((row: any) => ({
        employeeId: row.employee_id,
        employeeCode: row.employee_code || row.employee_id,
        employeeName: row.employee_name || 'Staff Member',
        department: row.department || "Founder's Office",
        designation: row.designation || 'Staff',
        branch: row.branch || 'Head Office (Banani)',
        avatarUrl: row.avatar_url || '',
        businessDate: row.business_date,
        countedCheckInAt: row.counted_check_in,
        countedCheckOutAt: row.counted_check_out,
        countedCheckInTimeLocal: row.counted_check_in
          ? new Date(row.counted_check_in).toLocaleTimeString('en-US', {
              timeZone: 'Asia/Dhaka',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : '--:--',
        countedCheckOutTimeLocal: row.counted_check_out
          ? new Date(row.counted_check_out).toLocaleTimeString('en-US', {
              timeZone: 'Asia/Dhaka',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : '--:--',
        checkInSource: row.check_in_source || 'none',
        checkOutSource: row.check_out_source || 'none',
        primarySource:
          row.check_in_source === 'biotime' && row.check_out_source === 'gps'
            ? 'Merged (GPS + BioTime)'
            : row.check_in_source === 'gps' && row.check_out_source === 'biotime'
            ? 'Merged (GPS + BioTime)'
            : row.check_in_source === 'biotime'
            ? 'BioTime Terminal'
            : 'Web Portal (GPS)',
        workedSeconds: row.worked_seconds || 0,
        workedDisplay: row.worked_display || '0h 00m',
        status: row.status as any,
        isLate: Boolean(row.is_late),
        lateByMinutes: row.late_by_minutes || (row.is_late ? 30 : 0),
        isAutoCheckout: Boolean(row.is_auto_checkout),
        allPunches: [],
        sourceBreakdown: row.source_breakdown || {
          countedCheckInSource: row.check_in_source,
          countedCheckOutSource: row.check_out_source,
          biotimePunchCount: 0,
          gpsPunchCount: 1,
        },
      }));
    }
  } catch {
    // Fall back to pure merging query
  }

  // 2. Pure Merger: Query raw GPS attendance_records + attendance_events + att_biotime_events
  let gpsQuery = supabase
    .from('attendance_records')
    .select('*')
    .order('business_date', { ascending: false })
    .limit(limit);

  let bioEventsQuery = supabase
    .from('att_biotime_events')
    .select('*')
    .order('punch_time', { ascending: true })
    .limit(1000);

  if (resolvedEmpId) {
    gpsQuery = gpsQuery.eq('employee_id', resolvedEmpId);
    bioEventsQuery = bioEventsQuery.eq('hub_employee_id', resolvedEmpId);
  }
  if (options?.date) {
    gpsQuery = gpsQuery.eq('business_date', options.date);
  } else if (options?.startDate && options?.endDate) {
    gpsQuery = gpsQuery.gte('business_date', options.startDate).lte('business_date', options.endDate);
  } else if (options?.month) {
    gpsQuery = gpsQuery.gte('business_date', `${options.month}-01`).lte('business_date', `${options.month}-31`);
  }

  const [
    { data: gpsRecords },
    { data: bioEvents },
    { data: emps },
    { data: approvedLeaves },
    serverRegs,
  ] = await Promise.all([
    gpsQuery,
    bioEventsQuery,
    supabase.from('employees').select('id, code, name, designation, department, branch, avatar_url'),
    supabase.from('leave_requests').select('*').eq('status', 'Approved'),
    getServerRegularizations().catch(() => []),
  ]);

  const empMap = new Map((emps || []).map((e) => [e.id, e]));
  (emps || []).forEach((e) => {
    if (e.code) empMap.set(e.code, e);
  });

  // Group bio events by (hub_employee_id + businessDate in Asia/Dhaka)
  const bioByEmpDate = new Map<string, RawPunchEvent[]>();
  (bioEvents || []).forEach((be) => {
    if (!be.hub_employee_id) return;
    const d = new Date(be.punch_time);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    const key = `${be.hub_employee_id}__${dateStr}`;
    if (!bioByEmpDate.has(key)) bioByEmpDate.set(key, []);
    bioByEmpDate.get(key)!.push({
      id: be.id,
      punchAt: be.punch_time,
      punchType: be.punch_state === 'CHECK_OUT' ? 'check_out' : 'check_in',
      source: 'biotime',
      deviceInfo: be.terminal_alias || be.area_alias || 'BioTime Terminal',
      verifyType: be.verify_type || 'Face',
      terminalSn: be.terminal_sn,
      locationName: be.area_alias || 'JAAGO Foundation HQ',
    });
  });

  // Collect all unique (empId, date) keys
  const dayKeys = new Set<string>();
  (gpsRecords || []).forEach((g) => dayKeys.add(`${g.employee_id}__${g.business_date}`));
  bioByEmpDate.forEach((_, key) => dayKeys.add(key));

  const effectiveDays: EffectiveAttendanceDay[] = [];

  dayKeys.forEach((key) => {
    const [empId, dateStr] = key.split('__');
    if (!empId || !dateStr) return;

    const gpsRec = (gpsRecords || []).find((g) => g.employee_id === empId && g.business_date === dateStr);
    const bioPunches = bioByEmpDate.get(key) || [];
    const emp = empMap.get(empId);

    const eff = computeEffectiveAttendanceDay({
      employeeId: empId,
      employeeCode: emp?.code || empId,
      employeeName: emp?.name || 'Staff Member',
      department: emp?.department || "Founder's Office",
      designation: emp?.designation || 'Staff',
      branch: emp?.branch || 'Head Office (Banani)',
      avatarUrl: emp?.avatar_url || '',
      businessDate: dateStr,
      gpsCheckInAt: gpsRec?.first_check_in_at || gpsRec?.check_in_at || null,
      gpsCheckOutAt: gpsRec?.last_check_out_at || gpsRec?.check_out_at || null,
      biotimePunches: bioPunches,
      shiftStartLocal: gpsRec?.shift_start_local || '10:00',
      shiftBufferMinutes: gpsRec?.shift_buffer_minutes ?? 30,
      isAutoCheckout: Boolean(gpsRec?.is_auto_checkout),
      notes: gpsRec?.notes,
    });

    effectiveDays.push(eff);
  });

  // Apply approved regularizations adjustments
  (serverRegs || []).forEach((reg: any) => {
    if (reg.status !== 'Approved') return;
    const target = effectiveDays.find(
      (d) =>
        d.businessDate === reg.date &&
        (d.employeeId === reg.employeeId ||
          (d.employeeCode && d.employeeCode.toLowerCase() === (reg.employeeCode || '').toLowerCase()))
    );
    if (target) {
      target.status = 'Present';
      target.isLate = false;
      target.lateByMinutes = 0;
      target.isAutoCheckout = false;
      target.countedCheckInTimeLocal = reg.adjustedCheckIn || target.countedCheckInTimeLocal;
      target.countedCheckOutTimeLocal = reg.adjustedCheckOut || target.countedCheckOutTimeLocal;
      target.workedDisplay = '8h 00m';
      target.workedSeconds = 28800;
      target.notes = `Regularized (Approved by ${reg.approvedBy || 'Supervisor'}): ${reg.reason}`;
    }
  });

  // Merge approved leave requests into effective attendance days
  (approvedLeaves || []).forEach((lv: any) => {
    const lvCode = (lv.employee_code || '').trim();
    const lvId = (lv.employee_id || '').trim();
    const emp = empMap.get(lvId) || empMap.get(lvCode);
    if (resolvedEmpId && lvId !== resolvedEmpId && lvCode !== resolvedEmpId && emp?.id !== resolvedEmpId) return;

    const start = new Date(lv.from_date);
    const end = new Date(lv.to_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

    const cur = new Date(start);
    while (cur <= end) {
      const dStr = cur.toISOString().split('T')[0]!;
      cur.setDate(cur.getDate() + 1);

      if (options?.date && dStr !== options.date) continue;
      if (options?.startDate && options?.endDate && (dStr < options.startDate || dStr > options.endDate)) continue;
      if (options?.month && !dStr.startsWith(options.month)) continue;

      const existing = effectiveDays.find(
        (d) => (d.employeeId === lvId || d.employeeCode === lvCode || d.employeeId === emp?.id) && d.businessDate === dStr
      );

      if (existing) {
        existing.status = lv.halfDayType && lv.halfDayType !== 'Full Day' ? 'Half Day' : 'Leave';
        existing.notes = `Approved Leave: ${lv.leave_type} - ${lv.reason || ''}`;
      } else {
        effectiveDays.push({
          employeeId: lvId || emp?.id || `emp-${lvCode}`,
          employeeCode: lvCode || emp?.code || 'EMP',
          employeeName: emp?.name || lv.employee_name || 'Staff Member',
          designation: emp?.designation || 'Staff',
          department: emp?.department || "Founder's Office",
          branch: emp?.branch || 'Head Office (Banani)',
          avatarUrl: emp?.avatar_url || '',
          businessDate: dStr,
          countedCheckInAt: null,
          countedCheckOutAt: null,
          countedCheckInTimeLocal: lv.halfDayType === 'Second Half' ? '02:00 PM' : 'N/A',
          countedCheckOutTimeLocal: lv.halfDayType === 'First Half' ? '02:00 PM' : 'N/A',
          checkInSource: 'none',
          checkOutSource: 'none',
          primarySource: 'None',
          workedSeconds: 0,
          workedDisplay: '0h 00m',
          status: lv.halfDayType && lv.halfDayType !== 'Full Day' ? 'Half Day' : 'Leave',
          isLate: false,
          lateByMinutes: 0,
          isAutoCheckout: false,
          allPunches: [],
          sourceBreakdown: {
            biotimePunchCount: 0,
            gpsPunchCount: 0,
            countedCheckInSource: 'none',
            countedCheckOutSource: 'none',
          },
          notes: `Approved Leave: ${lv.leave_type} - ${lv.reason || ''}`,
        });
      }
    }
  });

  return effectiveDays.sort((a, b) => new Date(b.businessDate).getTime() - new Date(a.businessDate).getTime());
}
