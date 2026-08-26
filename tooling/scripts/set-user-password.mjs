import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  const email = 'nasif.kamal@jaago.com.bd';
  const newPassword = 'Iphone@014';

  console.log(`Setting password for ${email}...`);

  // Check if user exists in auth.users
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const existingUser = listData.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    console.log(`Found existing user (ID: ${existingUser.id}). Updating password and confirming email...`);
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      {
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: 'Nasif Kamal',
          job_title: 'Coordinator, Tech 4 Development',
          department: "Founder's Office / FC",
          role: 'super_admin',
          employee_code: 'FO032507061190',
        },
      }
    );

    if (updateError) {
      console.error('Failed to update user password:', updateError);
      process.exit(1);
    }
    console.log('SUCCESS: Password updated successfully for existing user:', updateData.user.email);
  } else {
    console.log(`User ${email} does not exist. Creating new user with password...`);
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Nasif Kamal',
        job_title: 'Coordinator, Tech 4 Development',
        department: "Founder's Office / FC",
        role: 'super_admin',
        employee_code: 'FO032507061190',
      },
    });

    if (createError) {
      console.error('Failed to create user:', createError);
      process.exit(1);
    }
    console.log('SUCCESS: Created user and set password:', createData.user.email);
  }

  // Also verify password with signInWithPassword
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMzQ2NTcsImV4cCI6MjEwMjgxMDY1N30.YnZZloLZnLA77mbqnZmkw35dKPLx3XG-lQY89t9NpeQ';
  const supabaseClient = createClient(SUPABASE_URL, anonKey);
  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email,
    password: newPassword,
  });

  if (signInError) {
    console.error('Verification sign-in failed:', signInError);
  } else {
    console.log('VERIFIED: Sign-in test succeeded with new password for:', signInData.user?.email);
  }
}

run();
