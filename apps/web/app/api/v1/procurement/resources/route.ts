import { NextResponse } from 'next/server';
import {
  getProcurementRFQs,
  saveProcurementRFQ,
  getGoodsReceipts,
  saveGoodsReceipt,
  getInventoryItems,
  saveInventoryItem,
  getProcurementAssets,
  saveProcurementAsset,
  getProcurementCategories,
  saveProcurementCategory,
  getProcurementUnits,
  saveProcurementUnit,
  getProcurementWarehouses,
  saveProcurementWarehouse,
  getProcurementContracts,
  saveProcurementContract,
  getProcurementBudgets,
  saveProcurementBudget,
} from '@/lib/supabase-procurement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity') || 'rfqs';

    switch (entity) {
      case 'rfqs':
        return NextResponse.json({ success: true, data: await getProcurementRFQs() });
      case 'goods_receipts':
        return NextResponse.json({ success: true, data: await getGoodsReceipts() });
      case 'inventory':
        return NextResponse.json({ success: true, data: await getInventoryItems() });
      case 'assets':
        return NextResponse.json({ success: true, data: await getProcurementAssets() });
      case 'categories':
        return NextResponse.json({ success: true, data: await getProcurementCategories() });
      case 'units':
        return NextResponse.json({ success: true, data: await getProcurementUnits() });
      case 'warehouses':
        return NextResponse.json({ success: true, data: await getProcurementWarehouses() });
      case 'contracts':
        return NextResponse.json({ success: true, data: await getProcurementContracts() });
      case 'budgets':
        return NextResponse.json({ success: true, data: await getProcurementBudgets() });
      default:
        return NextResponse.json({ success: false, error: `Unknown entity: ${entity}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const body = await request.json();

    switch (entity) {
      case 'rfqs':
        return NextResponse.json({ success: true, data: await saveProcurementRFQ(body) });
      case 'goods_receipts':
        return NextResponse.json({ success: true, data: await saveGoodsReceipt(body) });
      case 'inventory':
        return NextResponse.json({ success: true, data: await saveInventoryItem(body) });
      case 'assets':
        return NextResponse.json({ success: true, data: await saveProcurementAsset(body) });
      case 'categories':
        return NextResponse.json({ success: true, data: await saveProcurementCategory(body) });
      case 'units':
        return NextResponse.json({ success: true, data: await saveProcurementUnit(body) });
      case 'warehouses':
        return NextResponse.json({ success: true, data: await saveProcurementWarehouse(body) });
      case 'contracts':
        return NextResponse.json({ success: true, data: await saveProcurementContract(body) });
      case 'budgets':
        return NextResponse.json({ success: true, data: await saveProcurementBudget(body) });
      default:
        return NextResponse.json({ success: false, error: `Invalid entity: ${entity}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
