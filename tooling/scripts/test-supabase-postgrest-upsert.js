const https = require('https');

const sampleEmployee = {
  code: 'TEST-001',
  name: 'Test Employee 1',
  status: 'Active',
  organization: 'JAAGO Foundation',
  department: 'Program Implementation',
  designation: 'Program Officer',
  branch: 'Head Office (Banani)',
  is_archived: false,
  updated_at: new Date().toISOString()
};

const payload = JSON.stringify([sampleEmployee]);

const options = {
  hostname: 'fnemsvwejymnqpufumhj.supabase.co',
  path: '/rest/v1/employees?on_conflict=code',
  method: 'POST',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=representation',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('RESPONSE:', body);
  });
});

req.on('error', (e) => {
  console.error('ERROR:', e.message);
});

req.write(payload);
req.end();
