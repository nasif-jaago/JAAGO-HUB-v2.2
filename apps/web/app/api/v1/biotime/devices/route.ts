import { NextResponse } from 'next/server';
import { fetchLiveBioTimeDevices, getBioTimeDevices, saveBioTimeDevices, BioTimeDevice } from '@/lib/biotime-data';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const devices = await fetchLiveBioTimeDevices();
    return NextResponse.json({ success: true, data: devices, total: devices.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch BioTime devices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, serialNumber, ipAddress, port, locationBranch, deviceType, protocol } = body;

    if (!name || !serialNumber || !ipAddress) {
      return NextResponse.json({ success: false, error: 'Device Name, Serial Number, and IP Address are required' }, { status: 400 });
    }

    const currentDevices = getBioTimeDevices();
    const existing = currentDevices.find((d) => d.serialNumber === serialNumber || d.ipAddress === ipAddress);
    if (existing) {
      return NextResponse.json({ success: false, error: 'A device with this Serial Number or IP already exists' }, { status: 409 });
    }

    const newDevice: BioTimeDevice = {
      id: `bio-dev-${Date.now()}`,
      name: name.trim(),
      serialNumber: serialNumber.trim(),
      ipAddress: ipAddress.trim(),
      port: Number(port) || 4370,
      locationBranch: locationBranch?.trim() || 'Banani HQ (Dhaka)',
      deviceType: deviceType || 'Face Recognition',
      protocol: protocol || 'ZKTeco Push SDK',
      status: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
      pingLatencyMs: Math.floor(Math.random() * 25) + 15,
      totalUsers: 0,
      totalPunches: 0,
      firmwareVersion: 'Ver 8.2.4',
      isActive: true,
    };

    const updated = [newDevice, ...currentDevices];
    saveBioTimeDevices(updated);

    logger.info('AUDIT', 'biotime.device_registered', { metadata: { deviceSn: newDevice.serialNumber, name: newDevice.name } });
    return NextResponse.json({ success: true, data: newDevice, message: 'BioTime device registered successfully' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to register device' }, { status: 500 });
  }
}
