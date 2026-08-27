import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@jaago/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('gps_locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch GPS locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('gps_locations')
      .upsert(body, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Mirror to geofence_locations for unified canonical schema
    try {
      await supabase.from('geofence_locations').upsert(
        {
          id: body.id,
          name: body.name,
          branch_office: body.branch_office || body.branchOffice,
          latitude: body.latitude,
          longitude: body.longitude,
          radius_meters: body.radius_meters || 100,
          is_active: body.status !== 'Inactive',
          notes: body.notes || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch {
      // Non-blocking mirror
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save GPS location' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from('gps_locations').delete().eq('id', id);

    // Also delete from geofence_locations
    try {
      await supabase.from('geofence_locations').delete().eq('id', id);
    } catch {
      // Ignore
    }

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete GPS location' },
      { status: 500 }
    );
  }
}
