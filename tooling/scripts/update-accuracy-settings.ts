import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: settings } = await supabase.from('attendance_settings').select('*').eq('id', 'global').single();
  console.log('CURRENT GLOBAL SETTINGS:', settings);

  const { data: updated, error } = await supabase.from('attendance_settings').update({
    gps_accuracy_threshold_m: 350,
  }).eq('id', 'global').select();

  console.log('UPDATED SETTINGS:', error ? error.message : updated);
}

main().catch(console.error);
