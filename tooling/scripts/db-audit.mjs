import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const CANDIDATE_TABLES = [
  'employees',
  'employee_activity_logs',
  'organizations',
  'organization_branches',
  'organization_policies',
  'designations',
  'departments',
  'projects',
  'teams',
  'team_members',
  'insurance_categories',
  'shifts',
  'attendance_logs',
  'on_duty_logs',
  'leave_requests',
  'gps_locations',
  'users',
  'user_roles',
  'roles',
  'permissions',
];

async function runAudit() {
  console.log('========================================================================');
  console.log('JAAGO HUB DATABASE AUDIT REPORT (DATABASE-STANDARD.md §22)');
  console.log('Project: Supabase (fnemsvwejymnqpufumhj.supabase.co)');
  console.log('========================================================================\n');

  const tableAuditResults = [];

  for (const table of CANDIDATE_TABLES) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(5);

      if (error) {
        tableAuditResults.push({
          table,
          exists: false,
          error: error.message,
          code: error.code,
        });
      } else {
        const sampleRow = data && data[0] ? data[0] : null;
        const columns = sampleRow ? Object.keys(sampleRow) : [];
        tableAuditResults.push({
          table,
          exists: true,
          rowCount: count ?? data?.length ?? 0,
          sampleCount: data?.length ?? 0,
          columns,
          sampleRow,
        });
      }
    } catch (e) {
      tableAuditResults.push({
        table,
        exists: false,
        error: e.message,
      });
    }
  }

  console.log('--- TABLE EXISTENCE & ROW COUNTS ---');
  for (const res of tableAuditResults) {
    if (res.exists) {
      console.log(`✅ Table [${res.table}]: EXISTS | Rows: ${res.rowCount} | Columns: ${res.columns.length}`);
      console.log(`   Columns: ${res.columns.join(', ')}`);
    } else {
      console.log(`❌ Table [${res.table}]: NOT FOUND / ERROR -> ${res.error}`);
    }
  }

  // Check Auth Users
  console.log('\n--- SUPABASE AUTH USERS ---');
  try {
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) {
      console.log('Error listing auth users:', usersErr.message);
    } else {
      console.log(`Total Auth Users: ${usersData.users.length}`);
      for (const u of usersData.users) {
        console.log(`- User: ${u.email} | ID: ${u.id} | Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'} | Metadata:`, u.user_metadata);
      }
    }
  } catch (err) {
    console.log('Auth check error:', err.message);
  }

  // Check Storage Buckets
  console.log('\n--- STORAGE BUCKETS ---');
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) {
      console.log('Error listing buckets:', bErr.message);
    } else {
      console.log(`Total Buckets: ${buckets.length}`);
      for (const b of buckets) {
        console.log(`- Bucket: ${b.name} (ID: ${b.id}) | Public: ${b.public}`);
      }
    }
  } catch (err) {
    console.log('Bucket check error:', err.message);
  }
}

runAudit();
