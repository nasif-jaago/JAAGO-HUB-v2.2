import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function syncGPS() {
  console.log('--- Syncing Nasif Home (Workstation) to Supabase GPS Tables ---');

  // 1. Update in gps_locations
  const workstationGps = {
    id: 'gps-nasif-desktop-gateway',
    name: 'Nasif Home (Workstation)',
    branch_office: 'Uttara, Dhaka',
    latitude: 23.856426,
    longitude: 90.384569,
    radius_meters: 200,
    status: 'Active',
    updated_at: new Date().toISOString(),
  };

  const { data: up1, error: err1 } = await supabase
    .from('gps_locations')
    .upsert(workstationGps, { onConflict: 'id' })
    .select();

  console.log('gps_locations upsert result:', err1 ? err1.message : 'SUCCESS', up1);

  // 2. Also update in geofence_locations
  const workstationGeo = {
    id: 'geo-nasif-workstation',
    name: 'Nasif Home (Workstation)',
    branch_name: 'Uttara, Dhaka',
    latitude: 23.856426,
    longitude: 90.384569,
    radius_meters: 200,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { data: up2, error: err2 } = await supabase
    .from('geofence_locations')
    .upsert(workstationGeo, { onConflict: 'id' })
    .select();

  console.log('geofence_locations upsert result:', err2 ? err2.message : 'SUCCESS', up2);

  // 3. Verify all active locations
  const { data: allActive } = await supabase.from('gps_locations').select('id, name, latitude, longitude, radius_meters, status');
  console.log('Active GPS locations in Supabase:', allActive);
}

syncGPS().catch(console.error);
