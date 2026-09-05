import { NextResponse } from 'next/server';
import {
  getBioTimeConfig,
  saveBioTimeConfig,
  fetchLiveBioTimeDevices,
  fetchLiveBioTimeTransactions,
} from '@/lib/biotime-data';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';
import { syncBioTimePunchesToSupabase } from '@/lib/server-effective-attendance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { forceAll } = body;

    // 1. Fetch live terminals and transactions directly from ZKTeco BioTime server
    const [liveDevices, paginatedLogs, syncStats] = await Promise.all([
      fetchLiveBioTimeDevices(),
      fetchLiveBioTimeTransactions(1, 100),
      syncBioTimePunchesToSupabase({ pageSize: 200, forceAll: Boolean(forceAll) }),
    ]);

    const liveLogs = paginatedLogs.logs;
    const supabaseAdmin = getSupabaseAdminClient();
    let reconciledCount = syncStats.syncedCount || 0;

    if (supabaseAdmin && liveLogs.length > 0) {
      // Pull employees for mapping
      const { data: emps } = await supabaseAdmin
        .from('employees')
        .select('id, employee_id, code, name, department, branch');

      const empMap = new Map<string, any>();
      (emps || []).forEach((e) => {
        if (e.code) empMap.set(String(e.code).trim(), e);
        if (e.employee_id) empMap.set(String(e.employee_id).trim(), e);
      });

      for (const punch of liveLogs) {
        const matchedEmp = empMap.get(punch.employeeCode.trim());
        const punchDateObj = new Date(punch.punchTime);
        const todayDate = punchDateObj.toISOString().split('T')[0];
        const punchHour = punchDateObj.getHours();
        const punchMin = punchDateObj.getMinutes();
        const isLate = punchHour > 10 || (punchHour === 10 && punchMin > 15);

        const logId = `zk-${punch.employeeCode}-${todayDate}-${punchHour < 14 ? 'in' : 'out'}`;

        try {
          await supabaseAdmin.from('attendance_logs').upsert({
            id: logId,
            employee_id: matchedEmp?.id || null,
            date: todayDate,
            check_in_time: punchHour < 14 ? punchDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined,
            check_out_time: punchHour >= 14 ? punchDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : undefined,
            status: isLate ? 'Late' : 'Present',
            device: 'Device Login',
            location_name: punch.locationBranch || 'JAAGO Foundation HQ',
            notes: `Synced from ZKTeco BioTime Terminal (${punch.deviceSn}) via ${punch.verifyType}`,
            created_at: punch.createdAt,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
          reconciledCount++;
        } catch (dbErr) {
          // Continue reconciling next
        }
      }
    }

    const config = getBioTimeConfig();
    const updatedConfig = {
      ...config,
      lastSyncTime: new Date().toISOString(),
      lastSyncStatus: 'SUCCESS' as const,
      totalSyncedToday: paginatedLogs.total,
    };
    saveBioTimeConfig(updatedConfig);

    logger.info('AUDIT', 'biotime.live_sync_completed', {
      metadata: {
        livePunchesPulled: liveLogs.length,
        devicesCount: liveDevices.length,
        reconciledToSupabase: reconciledCount,
        unmatchedEmployees: syncStats.unmatchedCount,
        forceAll: Boolean(forceAll),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        syncedPunchesCount: liveLogs.length,
        devicesProcessed: liveDevices.length,
        reconciledCount,
        unmatchedEmployeesCount: syncStats.unmatchedCount,
        lastSyncTime: updatedConfig.lastSyncTime,
        latestPunches: liveLogs.slice(0, 5),
      },
      message: `✓ Live BioTime Sync Complete! Pulled ${liveLogs.length} real punches across ${liveDevices.length} live terminals (${syncStats.syncedCount} normalized into att_biotime_events).`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'BioTime sync failed' }, { status: 500 });
  }
}
