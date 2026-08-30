import { NextResponse } from 'next/server';
import { getBioTimeDevices, saveBioTimeDevices } from '@/lib/biotime-data';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const current = getBioTimeDevices();
    const index = current.findIndex((d) => d.id === id || d.serialNumber === id);

    if (index === -1 || !current[index]) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    const matched = current[index];
    const updatedDevice = {
      ...matched,
      ...body,
      id: matched.id, // Prevent overriding PK
    };

    current[index] = updatedDevice;
    saveBioTimeDevices(current);

    logger.info('AUDIT', 'biotime.device_updated', { metadata: { deviceId: id, name: updatedDevice.name } });
    return NextResponse.json({ success: true, data: updatedDevice, message: 'Device updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to update device' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const current = getBioTimeDevices();
    const filtered = current.filter((d) => d.id !== id && d.serialNumber !== id);

    if (filtered.length === current.length) {
      return NextResponse.json({ success: false, error: 'Device not found' }, { status: 404 });
    }

    saveBioTimeDevices(filtered);
    logger.info('AUDIT', 'biotime.device_deleted', { metadata: { deviceId: id } });
    return NextResponse.json({ success: true, message: 'Device deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to delete device' }, { status: 500 });
  }
}
