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
    const view = searchParams.get('view') || 'reconciled'; // 'reconciled' | 'raw'
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const statusFilter = searchParams.get('status') || 'ALL'; // 'ALL' | 'Present' | 'Absent'

    const startTime = startDate ? `${startDate} 00:00:00` : undefined;
    const endTime = endDate ? `${endDate} 23:59:59` : undefined;

    // Fetch batch of raw live transactions from ZKTeco BioTime
    const fetchSize = view === 'reconciled' ? 200 : pageSize;
    const result = await fetchLiveBioTimeTransactions(view === 'reconciled' ? 1 : page, fetchSize, startTime, endTime);

    if (view === 'raw') {
      return NextResponse.json({
        success: true,
        data: result.logs,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      });
    }

    // ── Reconciled Daily View (RFID, Name, Employee ID, Dept, Branch, Device, Date, Check In, Check Out, Status) ──
    const supabaseAdmin = getSupabaseAdminClient();
    let empsList: any[] = [];
    if (supabaseAdmin) {
      const { data: emps } = await supabaseAdmin
        .from('employees')
        .select('id, code, name, department, branch')
        .limit(1000);
      if (emps) empsList = emps;
    }

    // Create fast lookup map by trimmed lowercase employee name
    const empNameMap = new Map<string, any>();
    empsList.forEach((e) => {
      if (e.name) empNameMap.set(e.name.toLowerCase().trim(), e);
    });

    // Group raw transactions by (emp_code + date)
    const grouped = new Map<string, {
      rfid: string;
      name: string;
      department: string;
      deviceLocation: string;
      date: string;
      punches: Date[];
    }>();

    result.logs.forEach((log) => {
      const punchDate = log.punchTime ? log.punchTime.split('T')[0] : new Date().toISOString().split('T')[0];
      const key = `${log.employeeCode}__${punchDate}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          rfid: log.employeeCode,
          name: log.employeeName,
          department: log.department || 'General Staff',
          deviceLocation: log.deviceName || log.locationBranch || 'JAAGO Foundation HQ',
          date: punchDate || '2026-08-30',
          punches: [],
        });
      }
      grouped.get(key)!.punches.push(new Date(log.punchTime));
    });

    const reconciledRows: BioTimeReconciledRow[] = [];

    grouped.forEach((group, key) => {
      if (group.punches.length === 0) return;
      group.punches.sort((a, b) => a.getTime() - b.getTime());
      const firstPunch = group.punches[0] || new Date();
      const lastPunch = group.punches[group.punches.length - 1] || new Date();

      // STATUS RULE:
      // If only one Check In done but check out empty / same timestamp -> Absent
      // If Check IN / OUT both blank -> Absent
      // If distinct Check IN and Check OUT exist -> Present
      const hasDistinctCheckOut = group.punches.length > 1 && firstPunch.getTime() !== lastPunch.getTime();
      const checkInFormatted = firstPunch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const checkOutFormatted = hasDistinctCheckOut
        ? lastPunch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        : '--';
      const status: 'Present' | 'Absent' = hasDistinctCheckOut ? 'Present' : 'Absent';

      // Match with P&C Employee database
      const matchedEmp = empNameMap.get(group.name.toLowerCase().trim()) ||
        empsList.find((e) => e.name && (group.name.toLowerCase().includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(group.name.toLowerCase())));

      reconciledRows.push({
        id: `rec-${key}`,
        rfid: group.rfid,
        name: group.name,
        employeeId: matchedEmp?.code || `JF-${group.rfid}`,
        department: matchedEmp?.department || group.department || 'General Staff',
        branch: matchedEmp?.branch || 'JAAGO Foundation HQ',
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
