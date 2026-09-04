import { NextResponse } from 'next/server';
import { emailStore } from '@/lib/email-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const log = await emailStore.getLogById(id);
  if (!log) {
    return NextResponse.json({ success: false, error: 'Log entry not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: log });
}
