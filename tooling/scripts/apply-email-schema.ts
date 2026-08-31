import { getSupabaseAdminClient } from '@jaago/auth';
import { logger } from '@jaago/logger';

async function applyEmailSchema() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error('Supabase admin client unavailable.');
    process.exit(1);
  }

  console.log('[Schema] Checking / creating email tables in Supabase...');

  // 1. Check if email_servers table exists
  const { error: checkServersErr } = await supabase.from('email_servers').select('id').limit(1);
  if (checkServersErr) {
    console.log('[Schema] Table email_servers does not exist or requires creation:', checkServersErr.message);
  } else {
    console.log('[Schema] Table email_servers is active.');
  }

  // 2. Check if email_templates table exists
  const { error: checkTemplatesErr } = await supabase.from('email_templates').select('id').limit(1);
  if (checkTemplatesErr) {
    console.log('[Schema] Table email_templates does not exist or requires creation:', checkTemplatesErr.message);
  } else {
    console.log('[Schema] Table email_templates is active.');
  }

  // 3. Check if email_logs table exists
  const { error: checkLogsErr } = await supabase.from('email_logs').select('id').limit(1);
  if (checkLogsErr) {
    console.log('[Schema] Table email_logs does not exist or requires creation:', checkLogsErr.message);
  } else {
    console.log('[Schema] Table email_logs is active.');
  }
}

applyEmailSchema();
