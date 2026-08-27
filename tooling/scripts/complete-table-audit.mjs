import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ALL_SYSTEM_AND_BIZ_TABLES = [
  'employees',
  'employee_activity_logs',
  'shifts',
  'gps_locations',
  'organizations',
  'organization_branches',
  'organization_policies',
  'designations',
  'departments',
  'projects',
  'teams',
  'team_members',
  'insurance_categories',
  'attendance_logs',
  'on_duty_logs',
  'leave_requests',
  'users',
  'roles',
  'permissions',
  'user_roles',
];

async function checkAll() {
  console.log('=== COMPLETE SUPABASE TABLE INVENTORY AUDIT ===\n');
  const missing = [];
  const existing = [];

  for (const table of ALL_SYSTEM_AND_BIZ_TABLES) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      missing.push({ table, error: error.message });
    } else {
      existing.push({
        table,
        cols: data && data[0] ? Object.keys(data[0]) : [],
      });
    }
  }

  console.log('--- EXISTING TABLES & COLUMNS ---');
  for (const e of existing) {
    console.log(`✅ [${e.table}] (${e.cols.length > 0 ? e.cols.join(', ') : 'Empty table'})`);
  }

  console.log('\n--- MISSING OR MISCONFIGURED TABLES ---');
  for (const m of missing) {
    console.log(`❌ [${m.table}] -> ${m.error}`);
  }
}

checkAll();
