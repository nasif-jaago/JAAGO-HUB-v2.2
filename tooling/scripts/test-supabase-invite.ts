import { getSupabaseAdminClient } from '@jaago/auth';

async function testInvite() {
  const supabaseAdmin = getSupabaseAdminClient();
  const testEmail = 'nayeem.anonno@gmail.com'; // user's test email
  const loginUrl = 'http://localhost:3000/login';

  console.log('Testing inviteUserByEmail for:', testEmail);
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(testEmail, {
    redirectTo: loginUrl,
    data: {
      full_name: 'S M Nayeem Rahman',
      department: 'People & Culture',
      job_title: 'Team Lead',
      employee_code: 'FO072408021002',
    },
  });

  if (error) {
    console.error('Invite Error:', error);
    // If user already exists, let's see why:
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const existing = users?.users?.find(u => u.email === testEmail);
    console.log('Existing user in Supabase:', existing ? { id: existing.id, email: existing.email, confirmed: existing.email_confirmed_at } : 'Not found');
  } else {
    console.log('Invite Success! User created and Invite Email triggered via Supabase:', data);
  }
}

testInvite();
