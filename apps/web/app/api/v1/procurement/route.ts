import { NextResponse } from 'next/server';
import { getProcurementDashboardKPIs, getPurchaseOrders } from '@/lib/supabase-procurement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [kpis, orders] = await Promise.all([
      getProcurementDashboardKPIs(),
      getPurchaseOrders(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        kpis,
        recentOrders: orders.slice(0, 10),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
