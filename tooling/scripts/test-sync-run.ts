import { syncBioTimePunchesToSupabase, getEffectiveDailyAttendance } from '../../apps/web/lib/server-effective-attendance';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testSyncAndEffective() {
  console.log('1. Running syncBioTimePunchesToSupabase...');
  const syncRes = await syncBioTimePunchesToSupabase({ pageSize: 100 });
  console.log('Sync result:', syncRes);

  console.log('2. Running getEffectiveDailyAttendance for Nasif on 2026-09-06...');
  const eff = await getEffectiveDailyAttendance({
    employeeCode: 'FO032507061190',
    date: '2026-09-06'
  });
  console.log('Effective record for today:', JSON.stringify(eff, null, 2));
}

testSyncAndEffective().catch(console.error);
