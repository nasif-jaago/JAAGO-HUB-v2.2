import { NextResponse } from 'next/server';
import { getBioTimeConfig, saveBioTimeConfig, fetchLiveBioTimePersonnelCount, fetchLiveBioTimeTransactions } from '@/lib/biotime-data';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Refresh live stats from BioTime
    await Promise.all([
      fetchLiveBioTimePersonnelCount().catch(() => {}),
      fetchLiveBioTimeTransactions(1).catch(() => {}),
    ]);

    const config = getBioTimeConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch BioTime configuration' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const current = getBioTimeConfig();
    const updated = {
      ...current,
      ...body,
    };
    saveBioTimeConfig(updated);

    logger.info('AUDIT', 'biotime.config_updated', { metadata: { serverUrl: updated.serverUrl, autoSync: updated.autoSyncEnabled } });
    return NextResponse.json({ success: true, data: updated, message: 'BioTime configuration saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to update BioTime config' }, { status: 500 });
  }
}
