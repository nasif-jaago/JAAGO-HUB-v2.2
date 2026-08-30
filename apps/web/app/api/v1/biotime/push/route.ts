import { NextResponse } from 'next/server';
import { addBioTimePunchLog, BioTimePunchLog, getBioTimeDevices } from '@/lib/biotime-data';
import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { device_sn, pin, punch_time, punch_state, verify_type } = body;

    const devices = getBioTimeDevices();
    const matchedDevice = devices.find((d) => d.serialNumber === device_sn) || {
      name: 'External BioTime Ingestion Terminal',
      locationBranch: 'Banani HQ (Dhaka)',
      serialNumber: device_sn || 'ZKT-WEBHOOK-01',
    };

    const punchDate = punch_time ? new Date(punch_time) : new Date();
    const punchLog: BioTimePunchLog = {
      id: `zk-push-${Date.now()}`,
      deviceSn: matchedDevice.serialNumber,
      deviceName: matchedDevice.name,
      locationBranch: matchedDevice.locationBranch,
      employeeCode: pin || 'EMP_UNKNOWN',
      employeeName: body.employee_name || `Staff (${pin || 'Biometric ID'})`,
      department: body.department || 'Banani HQ',
      punchTime: punchDate.toISOString(),
      punchState: punch_state || 'CHECK_IN',
      verifyType: verify_type || 'Fingerprint',
      syncStatus: 'PROCESSED',
      createdAt: new Date().toISOString(),
    };

    addBioTimePunchLog(punchLog);

    // Reconcile with Supabase Attendance Logs if available
    const supabaseAdmin = getSupabaseAdminClient();
    if (supabaseAdmin && pin) {
      try {
        const todayDate = punchDate.toISOString().split('T')[0];
        const { data: emp } = await supabaseAdmin
          .from('employees')
          .select('id, full_name, designation, department')
          .eq('employee_id', pin)
          .single();

        if (emp) {
          const punchHour = punchDate.getHours();
          const punchMin = punchDate.getMinutes();
          const isLate = punchHour > 10 || (punchHour === 10 && punchMin > 15);

          await supabaseAdmin.from('attendance_logs').upsert({
            id: `bio-push-${pin}-${todayDate}`,
            employee_id: emp.id,
            date: todayDate,
            check_in_time: punchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            status: isLate ? 'Late' : 'Present',
            device: 'Device Login',
            location_name: matchedDevice.locationBranch,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        }
      } catch (err: any) {
        // Non-blocking log persistence notice
      }
    }

    logger.info('AUDIT', 'biotime.push_webhook_received', { metadata: { deviceSn: device_sn, pin, punchTime: punchDate.toISOString() } });
    return NextResponse.json({ success: true, status: 200, message: 'Punch record processed successfully' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Webhook ingestion failed' }, { status: 500 });
  }
}
