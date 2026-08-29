const https = require('https');

const tables = [
  'employees',
  'users',
  'user_profiles',
  'attendance_records',
  'attendance_events',
  'departments',
  'designations',
  'organizations',
  'organization_branches',
  'projects',
  'teams'
];

async function checkTable(table) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'fnemsvwejymnqpufumhj.supabase.co',
      path: `/rest/v1/${table}?select=*`,
      method: 'HEAD',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI',
        'Prefer': 'count=exact'
      }
    };
    const req = https.request(options, (res) => {
      resolve({ table, status: res.statusCode, countRange: res.headers['content-range'] });
    });
    req.on('error', (e) => resolve({ table, error: e.message }));
    req.end();
  });
}

async function run() {
  for (const t of tables) {
    const res = await checkTable(t);
    console.log(`${res.table}:`, res.countRange || `status ${res.status}`);
  }
}
run();
