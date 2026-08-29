const https = require('https');

const options = {
  hostname: 'fnemsvwejymnqpufumhj.supabase.co',
  path: '/rest/v1/employees?select=id,code,name,status,is_archived',
  method: 'GET',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI',
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
