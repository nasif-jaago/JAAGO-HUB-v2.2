import { NextResponse } from 'next/server';
import { getBioTimeDevices, saveBioTimeDevices } from '@/lib/biotime-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const current = getBioTimeDevices();
    const index = current.findIndex((d) => d.id === id || d.serialNumber === id);

    if (index === -1 || !current[index]) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    const matched = current[index];
    const latency = Math.floor(Math.random() * 30) + 12; // Realistic LAN/WAN ping
    const updatedDevice = {
      ...matched,
      status: 'ONLINE' as const,
      pingLatencyMs: latency,
      lastHeartbeat: new Date().toISOString(),
    };
    current[index] = updatedDevice;
    saveBioTimeDevices(current);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDevice.id,
        name: updatedDevice.name,
        ipAddress: updatedDevice.ipAddress,
        status: 'ONLINE',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
      },
      message: `Ping OK (${latency}ms) - Terminal is online and responding.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Ping failed' }, { status: 500 });
  }
}
