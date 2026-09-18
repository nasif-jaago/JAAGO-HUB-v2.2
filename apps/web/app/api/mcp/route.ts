import { NextRequest, NextResponse } from 'next/server';
import { handleMcpGet, handleMcpPost, CORS_HEADERS } from '@/lib/mcp/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return handleMcpGet();
}

export async function POST(req: NextRequest) {
  return handleMcpPost(req);
}
