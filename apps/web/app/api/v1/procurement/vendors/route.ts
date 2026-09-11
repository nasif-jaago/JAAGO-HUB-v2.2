import { NextResponse } from 'next/server';
import {
  getProcurementVendors,
  saveProcurementVendor,
  deleteProcurementVendor,
} from '@/lib/supabase-procurement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let vendors = await getProcurementVendors();
    if (category && category !== 'ALL') {
      vendors = vendors.filter((v) => v.category.toLowerCase() === category.toLowerCase());
    }
    if (status && status !== 'ALL') {
      vendors = vendors.filter((v) => v.status.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      vendors = vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.contactPerson.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.phone.includes(q) ||
          v.category.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ success: true, data: vendors, total: vendors.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support batch import
    if (Array.isArray(body)) {
      const results = [];
      for (const item of body) {
        if (item.name && item.category) {
          const v = await saveProcurementVendor(item);
          results.push(v);
        }
      }
      return NextResponse.json({ success: true, data: results, count: results.length });
    }

    if (!body.name || !body.category) {
      return NextResponse.json({ success: false, error: 'Vendor name and category are required' }, { status: 400 });
    }

    const saved = await saveProcurementVendor(body);
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
      return NextResponse.json({ success: false, error: 'Vendor ID is required' }, { status: 400 });
    }

    await deleteProcurementVendor(id);
    return NextResponse.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
