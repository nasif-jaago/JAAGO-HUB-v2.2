import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function testInsert() {
  const { data: dData, error: dErr } = await supabase.from('designations').insert({ id: 'test-desig-1', name: 'Software Engineer' }).select();
  console.log('Designations insert test:', dErr ? dErr.message : dData);
  if (dData) await supabase.from('designations').delete().eq('id', 'test-desig-1');

  const { data: pData, error: pErr } = await supabase.from('projects').insert({ id: 'test-proj-1', name: 'Test Project' }).select();
  console.log('Projects insert test:', pErr ? pErr.message : pData);
  if (pData) await supabase.from('projects').delete().eq('id', 'test-proj-1');
}

testInsert();
