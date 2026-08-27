import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PHASE1_TABLES = [
  'work_shifts',
  'employee_shift_assignments',
  'geofence_locations',
  'attendance_records',
  'attendance_events',
  'attendance_adjustments',
  'attendance_settings',
];

async function verifyPhase1() {
  console.log('=== VERIFYING PHASE 1 ATTENDANCE TABLES IN SUPABASE ===\n');
  for (const table of PHASE1_TABLES) {
    const { data, count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      console.log(`❌ [${table}]: ERROR -> ${error.message}`);
    } else {
      const cols = data && data[0] ? Object.keys(data[0]) : [];
      console.log(`✅ [${table}]: ACTIVE | Rows: ${count ?? data?.length} | Sample Columns: ${cols.slice(0, 8).join(', ')}...`);
    }
  }
}

verifyPhase1();
