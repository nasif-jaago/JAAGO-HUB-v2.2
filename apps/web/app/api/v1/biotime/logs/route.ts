import { NextResponse } from 'next/server';
import { fetchLiveBioTimeTransactions } from '@/lib/biotime-data';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface BioTimeReconciledRow {
  id: string;
  rfid: string; // BioTime Employee ID
  name: string; // BioTime Full Name
  employeeId: string; // P&C Employee ID (from Supabase employees code)
  department: string;
  branch: string;
  deviceLocation: string;
  date: string;
  checkIn: string; // First Check IN
  checkOut: string; // Last Check OUT or '--'
  status: 'Present' | 'Absent';
  punchesCount: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(5, Math.min(100, parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20', 10)));
    // Default to 'raw' if not specified (for /pnc/settings/biotime), or 'reconciled' when explicitly requested
    const view = searchParams.get('view') || 'raw';
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const statusFilter = searchParams.get('status') || 'ALL'; // 'ALL' | 'Present' | 'Absent'

    const startTime = startDate ? `${startDate} 00:00:00` : undefined;
    const endTime = endDate ? `${endDate} 23:59:59` : undefined;

    // ── Raw Punch View (e.g. for /pnc/settings/biotime Terminal Management) ──
    if (view === 'raw') {
      const result = await fetchLiveBioTimeTransactions(page, pageSize, startTime, endTime);
      let logs = result.logs;
      if (query) {
        logs = logs.filter(
          (l) =>
            l.employeeName?.toLowerCase().includes(query) ||
            l.employeeCode?.toLowerCase().includes(query) ||
            l.deviceSn?.toLowerCase().includes(query) ||
            l.deviceName?.toLowerCase().includes(query) ||
            l.department?.toLowerCase().includes(query)
        );
      }
      return NextResponse.json({
        success: true,
        data: logs,
        total: query ? logs.length : result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: query ? Math.max(1, Math.ceil(logs.length / pageSize)) : result.totalPages,
      });
    }

    // ── Reconciled Daily View (RFID, Name, Employee ID, Dept, Branch, Device, Date, Check In, Check Out, Status) ──
    // Fetch all raw transactions for the requested date range to group into daily summaries
    const result = await fetchLiveBioTimeTransactions(1, 5000, startTime, endTime);

    const supabaseAdmin = getSupabaseAdminClient();
    let empsList: any[] = [];
    const mapByBioCode = new Map<string, any>();

    if (supabaseAdmin) {
      const [{ data: emps }, { data: maps }] = await Promise.all([
        supabaseAdmin.from('employees').select('id, code, name, department, branch, rfid').limit(2000),
        supabaseAdmin.from('att_biotime_employee_map').select('*').limit(2000),
      ]);
      if (emps) empsList = emps;
      if (maps) {
        maps.forEach((m) => {
          if (m.biotime_emp_code) mapByBioCode.set(String(m.biotime_emp_code).trim(), m);
        });
      }
    }

    // Create fast lookup maps by rfid, code, and trimmed lowercase employee name
    const empNameMap = new Map<string, any>();
    const empRfidMap = new Map<string, any>();
    const empCodeMap = new Map<string, any>();

    empsList.forEach((e) => {
      if (e.name) empNameMap.set(e.name.toLowerCase().trim(), e);
      if (e.rfid) {
        empRfidMap.set(String(e.rfid).trim(), e);
        empRfidMap.set(String(e.rfid).replace(/^RFID-/i, '').trim(), e);
      }
      if (e.code) {
        empCodeMap.set(String(e.code).trim(), e);
        empCodeMap.set(String(e.code).replace(/^[A-Z]+-?/i, '').trim(), e);
      }
    });

    // Group raw transactions by (emp_code + Asia/Dhaka date)
    const grouped = new Map<string, {
      rfid: string;
      name: string;
      department: string;
      deviceLocation: string;
      date: string;
      punches: Date[];
    }>();

    result.logs.forEach((log) => {
      const d = new Date(log.punchTime);
      const punchDate = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
        : (log.punchTime ? log.punchTime.split('T')[0] : new Date().toISOString().split('T')[0]);
      const key = `${log.employeeCode}__${punchDate}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          rfid: log.employeeCode,
          name: log.employeeName,
          department: log.department || 'General Staff',
          deviceLocation: log.deviceName || log.locationBranch || 'JAAGO Foundation HQ',
          date: punchDate || new Date().toISOString().split('T')[0] || '2026-09-17',
          punches: [],
        });
      }
      if (!isNaN(d.getTime())) {
        grouped.get(key)!.punches.push(d);
      }
    });

    const reconciledRows: BioTimeReconciledRow[] = [];

    grouped.forEach((group, key) => {
      if (group.punches.length === 0) return;
      group.punches.sort((a, b) => a.getTime() - b.getTime());
      const firstPunch = group.punches[0] || new Date();
      const lastPunch = group.punches[group.punches.length - 1] || new Date();

      // Check-out distinction rule:
      // Require at least 5 minutes difference between first and last punch to count as Check-Out
      // (Double scans < 5 min apart are treated as duplicate check-in taps)
      const diffMinutes = (lastPunch.getTime() - firstPunch.getTime()) / (1000 * 60);
      const hasDistinctCheckOut = group.punches.length > 1 && diffMinutes >= 5;

      const checkInFormatted = firstPunch.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const checkOutFormatted = hasDistinctCheckOut
        ? lastPunch.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Dhaka',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        : '--';

      // If an employee punched their biometric scan today, they are Present
      const status: 'Present' | 'Absent' = group.punches.length > 0 ? 'Present' : 'Absent';

      // Match with P&C Employee database by RFID, Code, Mapping, or Name
      const cleanRfid = group.rfid.trim();
      const mappedRecord = mapByBioCode.get(cleanRfid);
      const matchedEmp =
        (mappedRecord?.hub_employee_code ? empCodeMap.get(mappedRecord.hub_employee_code) : null) ||
        empRfidMap.get(cleanRfid) ||
        empCodeMap.get(cleanRfid) ||
        empNameMap.get(group.name.toLowerCase().trim()) ||
        empsList.find(
          (e) =>
            e.name &&
            (group.name.toLowerCase().includes(e.name.toLowerCase()) ||
              e.name.toLowerCase().includes(group.name.toLowerCase()))
        );

      const resolvedName = matchedEmp?.name || mappedRecord?.biotime_name || group.name;
      const resolvedCode = matchedEmp?.code || mappedRecord?.hub_employee_code || `JF-${group.rfid}`;
      const resolvedDept = matchedEmp?.department || mappedRecord?.biotime_department || group.department || 'General Staff';
      const resolvedBranch = matchedEmp?.branch || 'JAAGO Foundation HQ';

      reconciledRows.push({
        id: `rec-${key}`,
        rfid: group.rfid,
        name: resolvedName,
        employeeId: resolvedCode,
        department: resolvedDept,
        branch: resolvedBranch,
        deviceLocation: group.deviceLocation,
        date: group.date,
        checkIn: checkInFormatted,
        checkOut: checkOutFormatted,
        status,
        punchesCount: group.punches.length,
      });
    });

    // Apply optional search query & status filter
    let filtered = reconciledRows;
    if (query) {
      filtered = filtered.filter((r) =>
        r.name.toLowerCase().includes(query) ||
        r.rfid.toLowerCase().includes(query) ||
        r.employeeId.toLowerCase().includes(query) ||
        r.department.toLowerCase().includes(query) ||
        r.deviceLocation.toLowerCase().includes(query)
      );
    }
    if (startDate) {
      filtered = filtered.filter((r) => r.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((r) => r.date <= endDate);
    }
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Server-side page slicing
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const offset = (page - 1) * pageSize;
    const paginatedData = filtered.slice(offset, offset + pageSize);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch BioTime logs' }, { status: 500 });
  }
}

