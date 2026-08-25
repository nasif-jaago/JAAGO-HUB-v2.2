import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testStorage() {
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const anonClient = createClient(supabaseUrl, anonKey);

  console.log('--- 1. Checking Storage Buckets ---');
  const { data: buckets, error: bErr } = await adminClient.storage.listBuckets();
  if (bErr) {
    console.error('List buckets error:', bErr);
  } else {
    console.log('Buckets in Supabase:', buckets?.map((b) => ({ id: b.id, name: b.name, public: b.public })));
  }

  // Ensure employees bucket exists and is public
  const hasEmployeesBucket = buckets?.some((b) => b.id === 'employees');
  if (!hasEmployeesBucket) {
    console.log('Creating "employees" public bucket...');
    const { data: createB, error: cbErr } = await adminClient.storage.createBucket('employees', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
    if (cbErr) console.error('Create bucket error:', cbErr);
    else console.log('Created employees bucket:', createB);
  } else {
    console.log('Updating "employees" bucket to public...');
    await adminClient.storage.updateBucket('employees', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
  }

  console.log('\n--- 2. Checking current employees in DB ---');
  const { data: emps, error: empErr } = await adminClient.from('employees').select('*');
  if (empErr) {
    console.error('Fetch employees error:', empErr);
  } else {
    console.log('Employees found in Supabase:', emps?.length);
    console.log('First employee:', emps?.[0]);
  }
}

testStorage().catch(console.error);
