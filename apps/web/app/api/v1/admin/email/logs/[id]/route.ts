import { NextResponse } from 'next/server';
import { emailStore } from '@/lib/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/v1/admin/email/logs/[id]
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const log = await emailStore.getLogById(id);
  if (!log) {
    return NextResponse.json({ success: false, error: 'Log entry not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: log });
}
