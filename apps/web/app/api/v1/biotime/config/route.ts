import { NextResponse } from 'next/server';
import {
  getBioTimeConfig,
  saveBioTimeConfig,
  fetchLiveBioTimePersonnelCount,
  fetchLiveBioTimeTodayPunchCount,
  getBioTimeApiToken,
} from '@/lib/biotime-data';
import { logger } from '@jaago/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function maskApiToken(token?: string): string {
  if (!token) return '';
  return '••••••••••••••••••••••••••••••••••••••••';
}

export async function GET() {
  try {
    // Refresh live stats directly from BioTime hardware
    await Promise.all([
      fetchLiveBioTimePersonnelCount().catch(() => {}),
      fetchLiveBioTimeTodayPunchCount().catch(() => {}),
    ]);

    const config = getBioTimeConfig();
    const effectiveToken = getBioTimeApiToken();
    const safeConfig = {
      ...config,
      apiToken: maskApiToken(effectiveToken),
    };
    return NextResponse.json({ success: true, data: safeConfig });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch BioTime configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const current = getBioTimeConfig();
    const newApiToken =
      body.apiToken && !body.apiToken.includes('••••') && body.apiToken.trim().length > 0
        ? body.apiToken.trim()
        : current.apiToken || getBioTimeApiToken();

    const updated = {
      ...current,
      ...body,
      apiToken: newApiToken,
    };
    saveBioTimeConfig(updated);

    logger.info('AUDIT', 'biotime.config_updated', {
      metadata: { serverUrl: updated.serverUrl, autoSync: updated.autoSyncEnabled },
    });
    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        apiToken: maskApiToken(updated.apiToken),
      },
      message: 'BioTime configuration saved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update BioTime config' },
      { status: 500 }
    );
  }
}

