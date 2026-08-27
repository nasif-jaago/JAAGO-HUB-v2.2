import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function syncGeofences() {
  const { data: gpsLocs, error } = await supabase.from('gps_locations').select('*');
  if (error) {
    console.log('Error reading gps_locations:', error.message);
    return;
  }

  if (gpsLocs && gpsLocs.length > 0) {
    const payloads = gpsLocs.map((g) => ({
      id: g.id,
      name: g.name,
      branch_office: g.branch_office || '',
      latitude: g.latitude,
      longitude: g.longitude,
      radius_meters: g.radius_meters || 100,
      is_active: g.status === 'Active',
      notes: g.notes || '',
    }));

    const { error: insErr } = await supabase.from('geofence_locations').upsert(payloads, { onConflict: 'id' });
    if (insErr) {
      console.log('Error syncing to geofence_locations:', insErr.message);
    } else {
      console.log(`Synced ${payloads.length} geofences from gps_locations to geofence_locations!`);
    }
  }
}

syncGeofences();
