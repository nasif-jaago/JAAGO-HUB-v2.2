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

async function setupBuckets() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const client = createClient(supabaseUrl, serviceKey);

  console.log('📦 Setting up default Supabase Storage buckets...');
  const bucketsToCreate = [
    { id: 'jaago-private-docs', public: false },
    { id: 'jaago-public-assets', public: true },
    { id: 'employees', public: true },
  ];

  for (const b of bucketsToCreate) {
    const { data, error } = await client.storage.createBucket(b.id, {
      public: b.public,
      fileSizeLimit: 26214400, // 25MB
    });
    if (error) {
      if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
        console.log(`  ℹ️ Bucket '${b.id}' already exists.`);
      } else {
        console.log(`  ⚠️ Bucket '${b.id}': ${error.message}`);
      }
    } else {
      console.log(`  ✅ Bucket '${b.id}' created successfully! (public: ${b.public})`);
    }
  }

  const { data: list } = await client.storage.listBuckets();
  console.log(`\n🎉 Total Buckets Active: ${list?.length ?? 0}`);
  list?.forEach((bucket) => {
    console.log(`   - ${bucket.name} (public: ${bucket.public})`);
  });
}

setupBuckets().catch(console.error);
