import { getSupabaseAdminClient, getSupabaseAnonClient } from '../../packages/auth/src/client';
import { getSupabaseAdmin, getSupabase } from '../../apps/web/lib/supabase-auth';

async function runComprehensiveConnectionAudit() {
  console.log('===============================================================');
  console.log('  JAAGO HUB v2.2 — FULL CONNECTION & SECURITY INTEGRITY AUDIT  ');
  console.log('===============================================================\n');

  let errorsFound = 0;

  // ── TEST 1: @jaago/auth Backend Admin Client ──
  console.log('🔹 [TEST 1] @jaago/auth — getSupabaseAdminClient()');
  try {
    const adminAuthClient = getSupabaseAdminClient();
    const { data: empData, error: empErr } = await adminAuthClient
      .from('employees')
      .select('id, name, code, designation, department')
      .limit(3);

    if (empErr) {
      console.error('   ❌ PostgREST query failed:', empErr.message);
      errorsFound++;
    } else {
      console.log(`   ✅ Query SUCCESS! Found ${empData.length} employee records:`);
      empData.forEach((e) => console.log(`      • [${e.code}] ${e.name} — ${e.designation} (${e.department})`));
    }

    // Test Auth Admin User Listing
    const { data: authUsers, error: authUsersErr } = await adminAuthClient.auth.admin.listUsers({ perPage: 2 });
    if (authUsersErr) {
      console.error('   ❌ Auth Admin listUsers failed:', authUsersErr.message);
      errorsFound++;
    } else {
      console.log(`   ✅ Auth Admin operational! Found ${authUsers.users.length} user(s):`);
      authUsers.users.forEach((u) => console.log(`      • User: ${u.email} (ID: ${u.id})`));
    }
  } catch (err: any) {
    console.error('   ❌ Exception in @jaago/auth getSupabaseAdminClient:', err.message);
    errorsFound++;
  }

  // ── TEST 2: @jaago/auth Frontend Anon Client ──
  console.log('\n🔹 [TEST 2] @jaago/auth — getSupabaseAnonClient()');
  try {
    const anonAuthClient = getSupabaseAnonClient();
    const { data: anonData, error: anonErr } = await anonAuthClient
      .from('employees')
      .select('id, name, code')
      .limit(2);

    if (anonErr) {
      console.error('   ❌ Anon query failed:', anonErr.message);
      errorsFound++;
    } else {
      console.log(`   ✅ Anon query SUCCESS! Found ${anonData.length} records:`);
      anonData.forEach((e) => console.log(`      • [${e.code}] ${e.name}`));
    }
  } catch (err: any) {
    console.error('   ❌ Exception in @jaago/auth getSupabaseAnonClient:', err.message);
    errorsFound++;
  }

  // ── TEST 3: apps/web Backend Admin Client ──
  console.log('\n🔹 [TEST 3] apps/web/lib/supabase-auth — getSupabaseAdmin()');
  try {
    const webAdminClient = getSupabaseAdmin();
    const { data: orgData, error: orgErr } = await webAdminClient
      .from('organizations')
      .select('id, name')
      .limit(3);

    if (orgErr) {
      console.error('   ❌ Organizations query failed:', orgErr.message);
      errorsFound++;
    } else {
      console.log(`   ✅ Organizations query SUCCESS! Found ${orgData.length} organization(s):`);
      orgData.forEach((o) => console.log(`      • ${o.name} (ID: ${o.id})`));
    }

    // Test Storage Bucket Listing
    const { data: buckets, error: storageErr } = await webAdminClient.storage.listBuckets();
    if (storageErr) {
      console.error('   ❌ Storage listBuckets failed:', storageErr.message);
      errorsFound++;
    } else {
      console.log(`   ✅ Storage buckets SUCCESS! Found ${buckets.length} bucket(s):`);
      buckets.forEach((b) => console.log(`      • Bucket: ${b.name} (Public: ${b.public})`));
    }
  } catch (err: any) {
    console.error('   ❌ Exception in apps/web getSupabaseAdmin:', err.message);
    errorsFound++;
  }

  // ── TEST 4: apps/web Frontend Client ──
  console.log('\n🔹 [TEST 4] apps/web/lib/supabase-auth — getSupabase() [Frontend Client]');
  try {
    const webAnonClient = getSupabase();
    const { data: pubData, error: pubErr } = await webAnonClient
      .from('employees')
      .select('id, name, code')
      .limit(2);

    if (pubErr) {
      console.error('   ❌ Frontend client query failed:', pubErr.message);
      errorsFound++;
    } else {
      console.log(`   ✅ Frontend client query SUCCESS! Found ${pubData.length} records:`);
      pubData.forEach((e) => console.log(`      • [${e.code}] ${e.name}`));
    }
  } catch (err: any) {
    console.error('   ❌ Exception in apps/web getSupabase:', err.message);
    errorsFound++;
  }

  // ── TEST 5: Password Recovery / Forgot Password Flow Simulation ──
  console.log('\n🔹 [TEST 5] Password Recovery Flow Validation');
  try {
    const admin = getSupabaseAdminClient();
    // Test link generation with an official organization test email
    const testEmail = 'nasif.kamal@jaago.com.bd';
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: testEmail,
      options: {
        redirectTo: 'https://hub.jaago.com.bd/reset-password',
      },
    });

    if (linkError) {
      console.error('   ❌ generateLink failed:', linkError.message);
      errorsFound++;
    } else {
      console.log('   ✅ Password recovery link generation SUCCESS!');
      console.log(`      • Target Email: ${testEmail}`);
      console.log(`      • Action link generated: ${Boolean(linkData.properties?.action_link)}`);
      console.log(`      • Token hash generated: ${Boolean(linkData.properties?.hashed_token)}`);
    }
  } catch (err: any) {
    console.error('   ❌ Recovery flow test failed:', err.message);
    errorsFound++;
  }

  console.log('\n===============================================================');
  if (errorsFound === 0) {
    console.log('🎉 ALL 5 INTEGRITY TESTS PASSED! CONNECTIONS ARE 100% HEALTHY.');
  } else {
    console.log(`⚠️ AUDIT COMPLETED WITH ${errorsFound} ERROR(S).`);
  }
  console.log('===============================================================\n');

  if (errorsFound > 0) {
    process.exit(1);
  }
}

runComprehensiveConnectionAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
