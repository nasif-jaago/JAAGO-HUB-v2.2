import { getSupabaseAdminClient } from '@jaago/auth';
import { encryptCredential } from '../../apps/web/lib/crypto';

async function updateServerSeed() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const enc = encryptCredential('default_smtp_password_key_2026');
  const { error } = await supabase.from('email_servers').update({
    password_ciphertext: enc.ciphertext,
    password_iv: enc.iv,
    password_tag: enc.tag,
    password_key_id: enc.keyId,
    health_state: 'healthy',
    consecutive_failures: 0,
    last_error_message: null,
  }).eq('id', 'b0000000-0000-0000-0000-000000000001');

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('Server password ciphertext updated in Supabase successfully.');
  }
}

updateServerSeed();
