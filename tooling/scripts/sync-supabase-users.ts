import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Parse .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnemsvwejymnqpufumhj.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const defaultUsers = [
  {
    email: 'nasif.kamal@jaago.com.bd',
    fullName: 'Nasif Kamal',
    role: 'Super Admin',
    department: "Founder's Office / FC",
    branch: 'Head Office (Banani)',
    jobTitle: 'Coordinator',
    phone: '+880 1711 000101',
    password: '$PasswordKey?',
  },
  {
    email: 'masoor.rahman@jaago.com.bd',
    fullName: 'Masoor Rahman',
    role: 'Manager',
    department: 'Human Resources',
    branch: 'Head Office (Banani)',
    jobTitle: 'HR Manager',
    phone: '+880 1711 000102',
    password: 'Password@123',
  },
  {
    email: 'farhana.islam@jaago.com.bd',
    fullName: 'Farhana Islam',
    role: 'Coordinator',
    department: 'Education & Schools',
    branch: 'Rayer Bazar School',
    jobTitle: 'Education Coordinator',
    phone: '+880 1711 000103',
    password: 'Password@123',
  },
  {
    email: 'habibur.rahman@jaago.com.bd',
    fullName: 'Habibur Rahman',
    role: 'Officer',
    department: 'Admin & Procurement',
    branch: 'Head Office (Banani)',
    jobTitle: 'Senior Procurement Officer',
    phone: '+880 1711 000104',
    password: 'Password@123',
  },
  {
    email: 'tariqul.ahmed@jaago.com.bd',
    fullName: 'Tariqul Ahmed',
    role: 'Officer',
    department: 'Programs & Development',
    branch: 'Chittagong Campus',
    jobTitle: 'Field Officer',
    phone: '+880 1711 000105',
    password: 'Password@123',
  },
];

async function syncUsersToSupabase() {
  console.log('⚡ Starting Supabase Auth User Synchronization...\n');

  const { data: existing, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Failed to list Supabase users:', listError.message);
    return;
  }

  const existingUsers = existing.users || [];
  console.log(`Found ${existingUsers.length} user(s) currently in Supabase Auth.`);

  for (const user of defaultUsers) {
    const existingUser = existingUsers.find((u) => u.email?.toLowerCase() === user.email.toLowerCase());

    if (existingUser) {
      console.log(`ℹ️ User ${user.email} already exists (UID: ${existingUser.id}). Updating password & metadata...`);
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: user.password,
        user_metadata: {
          full_name: user.fullName,
          name: user.fullName,
          role: user.role,
          department: user.department,
          branch: user.branch,
          job_title: user.jobTitle,
          phone: user.phone,
          organization_id: 'org-jaago-dhaka',
        },
      });
      if (updateError) {
        console.error(`   ⚠️ Failed to update ${user.email}: ${updateError.message}`);
      } else {
        console.log(`   ✅ Successfully updated credentials for ${user.email}`);
      }
    } else {
      console.log(`➕ Creating new Supabase Auth user for ${user.email}...`);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          name: user.fullName,
          role: user.role,
          department: user.department,
          branch: user.branch,
          job_title: user.jobTitle,
          phone: user.phone,
          organization_id: 'org-jaago-dhaka',
        },
      });

      if (createError) {
        console.error(`   ❌ Failed to create ${user.email}: ${createError.message}`);
      } else {
        console.log(`   ✅ Successfully created ${user.email} (UID: ${newUser.user.id}) in Supabase Auth!`);
      }
    }
  }

  const { data: finalList } = await supabaseAdmin.auth.admin.listUsers();
  console.log(`\n🎉 Total users now registered in Supabase Auth: ${finalList?.users?.length ?? 0}`);
  finalList?.users?.forEach((u) => {
    console.log(`   - ${u.email} | ${u.user_metadata?.full_name || u.email} | UID: ${u.id}`);
  });
}

syncUsersToSupabase();
