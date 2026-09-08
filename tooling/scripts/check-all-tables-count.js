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
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
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
