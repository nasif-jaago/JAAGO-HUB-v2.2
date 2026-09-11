import { NextResponse } from 'next/server';
import {
  getPurchaseOrders,
  savePurchaseOrder,
  updatePOStatus,
} from '@/lib/supabase-procurement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const department = searchParams.get('department');

    let orders = await getPurchaseOrders();
    if (status && status !== 'ALL') {
      orders = orders.filter((o) => o.status.toLowerCase() === status.toLowerCase());
    }
    if (department && department !== 'ALL') {
      orders = orders.filter((o) => o.department.toLowerCase().includes(department.toLowerCase()));
    }

    return NextResponse.json({ success: true, data: orders, total: orders.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.vendorName || !body.department || body.amountBDT === undefined) {
      return NextResponse.json({ success: false, error: 'Vendor, department, and amount are required' }, { status: 400 });
    }

    const saved = await savePurchaseOrder(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, approverName } = body;
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Order ID and status are required' }, { status: 400 });
    }

    const updated = await updatePOStatus(id, status, approverName);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
