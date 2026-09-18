import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function alterTable() {
  console.log('Altering employees table to add cross_departments column...');

  const statement = `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS cross_departments JSONB DEFAULT '[]'::jsonb;`;

  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: statement });
    if (error) {
      console.log(`RPC exec_sql result: ${error.message}`);
    } else {
      console.log('✓ Successfully executed migration via RPC');
    }
  } catch (err: any) {
    console.warn('RPC attempt warning:', err?.message);
  }

  // Test selecting cross_departments
  const { data, error } = await supabaseAdmin.from('employees').select('id, code, name, cross_departments').limit(1);
  if (error) {
    console.log('Note: Column cross_departments not queryable via REST yet (will use safe fallback in API):', error.message);
  } else {
    console.log('✓ Verified: cross_departments column is accessible via PostgREST! Sample:', data?.[0]);
  }
}

alterTable().catch(console.error);
