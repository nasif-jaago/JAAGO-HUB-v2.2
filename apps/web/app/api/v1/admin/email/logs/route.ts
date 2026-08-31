import { NextResponse } from 'next/server';
import { emailStore } from '@/lib/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/v1/admin/email/logs — Query filterable and searchable transmission logs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const module = searchParams.get('module') || undefined;
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

    const result = await emailStore.getLogs({
      status: status || undefined,
      module: module || undefined,
      search: search || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit,
        offset,
      },
      metrics: {
        total: result.total,
        sent: result.sentCount,
        failed: result.failedCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
