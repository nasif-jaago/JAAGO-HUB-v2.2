const https = require('https');

const options = {
  hostname: 'fnemsvwejymnqpufumhj.supabase.co',
  path: '/rest/v1/employees?select=id,code,name,status,is_archived',
  method: 'GET',
  headers: {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
    'Range': '0-2000',
    'Prefer': 'count=exact'
  }
};

const req = https.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('CONTENT-RANGE:', res.headers['content-range']);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('TOTAL ARRAY LENGTH:', data.length);
      const statusCounts = {};
      data.forEach(d => {
        const st = `${d.status || 'null'} (archived: ${Boolean(d.is_archived)})`;
        statusCounts[st] = (statusCounts[st] || 0) + 1;
      });
      console.log('STATUS DISTRIBUTION:', statusCounts);
    } catch (e) {
      console.log('BODY:', body.slice(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('REQUEST ERROR:', e.message);
});

req.end();
