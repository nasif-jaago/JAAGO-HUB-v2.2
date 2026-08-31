import { getSupabaseAdminClient } from '@jaago/auth';

async function inspect() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error('No Supabase client');
    return;
  }

  const { data: srv } = await supabase.from('email_servers').select('*');
  console.log('--- EMAIL SERVERS IN SUPABASE ---');
  console.log(srv);

  const { data: logs, count } = await supabase.from('email_logs').select('*', { count: 'exact' });
  console.log(`--- EMAIL LOGS IN SUPABASE (Total: ${count}) ---`);
  console.log(logs);
}

inspect();
