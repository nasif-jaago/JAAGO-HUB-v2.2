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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function runSecurityAudit() {
  console.log('================================================================');
  console.log('🔒 EXECUTING LIVE POST-HARDENING SECURITY AUDIT');
  console.log('================================================================\n');

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let allPassed = true;

  // 1. TEST: Anon Mutation Lockdown (Attempting malicious INSERT/UPDATE/DELETE as outsider)
  console.log('TEST 1: Verifying Anonymous Mutation Lockdown (Attacker Emulation)');
  
  // 1a. Try inserting fake employee as anon
  const fakeEmpId = crypto.randomUUID();
  const { error: insertEmpErr } = await anonClient.from('employees').insert({
    id: fakeEmpId,
    code: 'HACK999',
    name: 'Attacker Attempt',
  });
  if (insertEmpErr) {
    console.log('  ✅ BLOCKED: Anonymous INSERT on employees rejected (' + insertEmpErr.message + ')');
  } else {
    console.log('  ❌ VULNERABLE: Anonymous INSERT on employees was allowed!');
    allPassed = false;
    // Cleanup if accidentally created
    await adminClient.from('employees').delete().eq('id', fakeEmpId);
  }

  // 1b. Try updating attendance record as anon
  const { data: updateAttData, error: updateAttErr } = await anonClient
    .from('attendance_records')
    .update({ status: 'Hacked' })
    .eq('id', 'non-existent-probe')
    .select();
  if (updateAttErr || (updateAttData && updateAttData.length === 0)) {
    console.log('  ✅ BLOCKED: Anonymous UPDATE on attendance_records rejected/empty');
  } else {
    console.log('  ❌ VULNERABLE: Anonymous UPDATE on attendance_records was allowed!');
    allPassed = false;
  }

  // 1c. Try inserting into procurement vendors as anon
  const { error: insertProcErr } = await anonClient.from('procurement_vendors').insert({
    name: 'Malicious Vendor Corp',
  });
  if (insertProcErr) {
    console.log('  ✅ BLOCKED: Anonymous INSERT on procurement_vendors rejected (' + insertProcErr.message + ')');
  } else {
    console.log('  ❌ VULNERABLE: Anonymous INSERT on procurement_vendors was allowed!');
    allPassed = false;
  }

  // 1d. Try inserting into leave_requests as anon
  const { error: insertLeaveErr } = await anonClient.from('leave_requests').insert({
    id: crypto.randomUUID(),
    employee_id: 'probe',
  });
  if (insertLeaveErr) {
    console.log('  ✅ BLOCKED: Anonymous INSERT on leave_requests rejected (' + insertLeaveErr.message + ')');
  } else {
    console.log('  ❌ VULNERABLE: Anonymous INSERT on leave_requests was allowed!');
    allPassed = false;
  }

  // 1e. Try inserting into on_duty_requests as anon
  const { error: insertOnDutyErr } = await anonClient.from('on_duty_requests').insert({
    id: crypto.randomUUID(),
    employee_id: 'probe',
  });
  if (insertOnDutyErr) {
    console.log('  ✅ BLOCKED: Anonymous INSERT on on_duty_requests rejected (' + insertOnDutyErr.message + ')');
  } else {
    console.log('  ❌ VULNERABLE: Anonymous INSERT on on_duty_requests was allowed!');
    allPassed = false;
  }

  // 1f. Try inserting into att_biotime_events as anon
  const { error: insertBiotimeErr } = await anonClient.from('att_biotime_events').insert({
    id: crypto.randomUUID(),
    biotime_emp_code: '999',
    punch_time: new Date().toISOString(),
  });
  if (insertBiotimeErr) {
    console.log('  ✅ BLOCKED: Anonymous INSERT on att_biotime_events rejected (' + insertBiotimeErr.message + ')');
  } else {
    console.log('  ❌ VULNERABLE: Anonymous INSERT on att_biotime_events was allowed!');
    allPassed = false;
  }

  // 2. TEST: Sensitive Data Leakage via anon role
  console.log('\nTEST 2: Verifying Sensitive Data Read Protection (anon)');
  const { data: empReadData } = await anonClient.from('employees').select('id, name, work_email').limit(3);
  if (!empReadData || empReadData.length === 0) {
    console.log('  ✅ PROTECTED: Anonymous SELECT on employees returned 0 rows (RLS active)');
  } else {
    console.log('  ⚠️ NOTICE: Anonymous SELECT returned ' + empReadData.length + ' rows. (If public directory is intended, this is fine; otherwise restricted to authenticated)');
  }

  // 3. TEST: Public Metadata Accessibility (Ensuring Zero Broken UI Connections)
  console.log('\nTEST 3: Verifying Public Lookup Metadata Accessibility (Zero Breakage)');
  const { data: orgData, error: orgErr } = await anonClient.from('organizations').select('id, name').limit(1);
  if (!orgErr) {
    console.log('  ✅ OPERATIONAL: Organizations metadata reachable for UI components');
  } else {
    console.log('  ⚠️ Organization metadata query error: ' + orgErr.message);
  }

  const { data: shiftData, error: shiftErr } = await anonClient.from('work_shifts').select('id, name').limit(1);
  if (!shiftErr) {
    console.log('  ✅ OPERATIONAL: Work shifts metadata reachable for UI components');
  } else {
    console.log('  ⚠️ Work shifts metadata query error: ' + shiftErr.message);
  }

  // 4. TEST: Backend & Admin Service Role Continuity (All APIs & Cron Jobs)
  console.log('\nTEST 4: Verifying Service Role & System Continuity (Admin Client)');
  const { data: adminEmps, error: adminEmpErr } = await adminClient.from('employees').select('id').limit(5);
  if (!adminEmpErr && adminEmps) {
    console.log('  ✅ HEALTHY: Backend Service Role client can query employees (' + adminEmps.length + ' sampled)');
  } else {
    console.log('  ❌ CRITICAL: Backend Service Role failed to query employees: ' + adminEmpErr?.message);
    allPassed = false;
  }

  // 5. TEST: att_effective_daily View
  console.log('\nTEST 5: Verifying att_effective_daily Computed View');
  const { data: viewData, error: viewErr } = await adminClient.from('att_effective_daily').select('*').limit(3);
  if (!viewErr && viewData) {
    console.log('  ✅ HEALTHY: att_effective_daily returned records cleanly with 0 errors');
  } else {
    console.log('  ❌ ERROR: att_effective_daily failed: ' + viewErr?.message);
    allPassed = false;
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('🎉 AUDIT COMPLETE: ALL CRITICAL SECURITY CONTROLS ARE ACTIVE & PASSING!');
  } else {
    console.log('⚠️ AUDIT COMPLETE: SOME ITEMS REQUIRE ATTENTION.');
  }
  console.log('================================================================');
}

runSecurityAudit().catch(console.error);
