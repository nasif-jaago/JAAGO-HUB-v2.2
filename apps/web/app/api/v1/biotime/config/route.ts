import { NextResponse } from 'next/server';
import { getBioTimeConfig, saveBioTimeConfig, fetchLiveBioTimePersonnelCount, fetchLiveBioTimeTransactions } from '@/lib/biotime-data';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskApiToken(token?: string): string {
  if (!token) return '';
  if (token.length < 8) return '••••••••';
  return `${token.slice(0, 4)}••••••••••••••••••••••••••••${token.slice(-4)}`;
}

export async function GET() {
  try {
    // Refresh live stats from BioTime
    await Promise.all([
      fetchLiveBioTimePersonnelCount().catch(() => {}),
      fetchLiveBioTimeTransactions(1).catch(() => {}),
    ]);

    const config = getBioTimeConfig();
    const safeConfig = {
      ...config,
      apiToken: maskApiToken(config.apiToken),
    };
    return NextResponse.json({ success: true, data: safeConfig });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to fetch BioTime configuration' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const current = getBioTimeConfig();
    const newApiToken = body.apiToken && !body.apiToken.includes('••••') ? body.apiToken : current.apiToken;
    const updated = {
      ...current,
      ...body,
      apiToken: newApiToken,
    };
    saveBioTimeConfig(updated);

    logger.info('AUDIT', 'biotime.config_updated', { metadata: { serverUrl: updated.serverUrl, autoSync: updated.autoSyncEnabled } });
    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        apiToken: maskApiToken(updated.apiToken),
      },
      message: 'BioTime configuration saved successfully',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Failed to update BioTime config' }, { status: 500 });
  }
}
