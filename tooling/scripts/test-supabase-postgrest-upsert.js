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
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
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
