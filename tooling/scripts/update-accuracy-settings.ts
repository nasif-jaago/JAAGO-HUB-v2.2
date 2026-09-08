import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
