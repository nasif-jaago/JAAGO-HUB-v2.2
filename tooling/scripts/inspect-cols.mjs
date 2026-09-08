import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function inspectColumns() {
  const tables = ['organizations', 'departments', 'designations', 'projects', 'employees', 'shifts', 'gps_locations'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(`Table [${t}]:`, error ? `Error: ${error.message}` : (data && data[0] ? Object.keys(data[0]) : 'Empty table, trying dummy insert to get schema error'));
    if (!data || data.length === 0) {
      const { error: insErr } = await supabase.from(t).insert({ dummy_nonexistent_col_test: 1 });
      console.log(`Schema hint for [${t}]:`, insErr?.message);
    }
  }
}

inspectColumns();
