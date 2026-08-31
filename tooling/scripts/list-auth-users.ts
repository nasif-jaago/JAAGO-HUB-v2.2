import { getSupabaseAdminClient } from '@jaago/auth';

async function listUsers() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing auth users:', error);
    return;
  }

  console.log('=== SUPABASE AUTH USERS ===');
  data.users.forEach((u) => {
    console.log({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      user_metadata: u.user_metadata,
      last_sign_in_at: u.last_sign_in_at,
    });
  });
}

listUsers();
