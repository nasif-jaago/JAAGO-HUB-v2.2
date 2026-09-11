import { NextResponse } from 'next/server';
import {
  getProcurementRequests,
  saveProcurementRequest,
  deleteProcurementRequest,
} from '@/lib/supabase-procurement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let requests = await getProcurementRequests();
    if (type && type !== 'ALL') {
      requests = requests.filter((r) => r.requisitionType.toLowerCase() === type.toLowerCase());
    }
    if (status && status !== 'ALL') {
      requests = requests.filter((r) => r.status.toLowerCase() === status.toLowerCase());
    }

    return NextResponse.json({ success: true, data: requests, total: requests.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.title || !body.department) {
      return NextResponse.json({ success: false, error: 'Title and department are required' }, { status: 400 });
    }

    const saved = await saveProcurementRequest(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Requisition ID is required' }, { status: 400 });
    }

    await deleteProcurementRequest(id);
    return NextResponse.json({ success: true, message: 'Requisition deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
