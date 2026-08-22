import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

// Parse .env if not already loaded into process.env
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

async function checkSupabaseConnection() {
  console.log('====================================================');
  console.log('🔍 Checking Supabase & Database Connection Status...');
  console.log('====================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  console.log('1. Environment Variables Configuration:');
  console.log(`   - NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? supabaseUrl : '❌ Not configured'}`);
  console.log(`   - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? `${anonKey.substring(0, 16)}...` : '❌ Not configured'}`);
  console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${serviceKey ? `${serviceKey.substring(0, 16)}...` : '❌ Not configured'}`);
  console.log(`   - DATABASE_URL: ${databaseUrl ? `${databaseUrl.replace(/:[^:@]+@/, ':****@')}` : '⚠️ Not configured yet (Supabase Auth/Storage REST is active)'}`);
  console.log('');

  // 2. Test Supabase API Client
  if (supabaseUrl && (anonKey || serviceKey)) {
    console.log(`2. Testing Supabase REST / Auth / Storage API (${supabaseUrl})...`);
    try {
      const client = createClient(supabaseUrl, serviceKey || anonKey || '');
      
      // Test Auth Service
      const { data: authData, error: authError } = await client.auth.getSession();
      if (authError) {
        console.log(`   ⚠️ Supabase Auth API: ${authError.message}`);
      } else {
        console.log(`   ✅ Supabase Auth API: Connected and operational!`);
      }

      // Test Storage Service
      const { data: buckets, error: storageError } = await client.storage.listBuckets();
      if (storageError) {
        console.log(`   ⚠️ Supabase Storage API: ${storageError.message}`);
      } else {
        console.log(`   ✅ Supabase Storage API: Connected! Found ${buckets?.length ?? 0} storage bucket(s).`);
      }

      // Test PostgREST REST API
      const restResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: anonKey || serviceKey || '',
          Authorization: `Bearer ${serviceKey || anonKey}`,
        },
      });
      if (restResponse.ok || restResponse.status === 200 || restResponse.status === 404) {
        console.log(`   ✅ Supabase PostgREST API: HTTP ${restResponse.status} (Endpoint reachable)`);
      } else {
        console.log(`   ⚠️ Supabase PostgREST API: HTTP ${restResponse.status}`);
      }

    } catch (err: any) {
      console.log(`   ❌ Supabase API connection failed: ${err.message}`);
    }
  } else {
    console.log('2. Supabase REST API: ⚠️ Skipped (missing credentials)');
  }
  console.log('');

  // 3. Test PostgreSQL / Database Connection
  if (databaseUrl) {
    console.log('3. Testing PostgreSQL / Supabase Direct DB Connection...');
    const sql = postgres(databaseUrl, {
      connect_timeout: 5,
      idle_timeout: 5,
      max: 1,
    });
    try {
      const result = await sql`SELECT version(), current_database(), now() as server_time;`;
      console.log(`   ✅ Database Connection SUCCESSFUL!`);
      console.log(`      - Database: ${result[0].current_database}`);
      console.log(`      - Server Time: ${result[0].server_time}`);
      console.log(`      - Version: ${result[0].version.split(' on ')[0]}`);
      await sql.end();
    } catch (err: any) {
      console.log(`   ❌ Database Connection FAILED: ${err.message}`);
      try {
        await sql.end({ timeout: 1 });
      } catch {}
    }
  } else {
    console.log('3. Database Connection: ⚠️ DATABASE_URL not set in environment.');
  }

  console.log('\n====================================================');
}

checkSupabaseConnection().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
