import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TABLES = [
  'organizations',
  'organization_branches',
  'organization_policies',
  'designations',
  'departments',
  'projects',
  'teams',
  'team_members',
  'insurance_categories',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('entity');

    if (!table || !VALID_TABLES.includes(table)) {
      return NextResponse.json(
        { success: false, error: `Invalid entity table: ${table}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch organization entity' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('entity');

    if (!table || !VALID_TABLES.includes(table)) {
      return NextResponse.json(
        { success: false, error: `Invalid entity table: ${table}` },
        { status: 400 }
      );
    }

    const payload = await request.json();
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save organization entity' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('entity');
    const id = searchParams.get('id');

    if (!table || !VALID_TABLES.includes(table) || !id) {
      return NextResponse.json(
        { success: false, error: 'Missing table or id parameter' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete organization entity' },
      { status: 500 }
    );
  }
}
