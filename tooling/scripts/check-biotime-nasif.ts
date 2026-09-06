import { fetchLiveBioTimeTransactions } from '../../apps/web/lib/biotime-data';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkBioTimeAndNasif() {
  console.log('Fetching live BioTime transactions...');
  const tx = await fetchLiveBioTimeTransactions(1, 100);
  console.log(`Total live transactions in BioTime: ${tx.total}, fetched: ${tx.logs.length}`);
  
  if (tx.logs.length > 0) {
    console.log('First 5 logs sample:', tx.logs.slice(0, 5).map(l => ({
      employeeCode: l.employeeCode,
      employeeName: l.employeeName,
      punchTime: l.punchTime,
      punchState: l.punchState
    })));
  }

  // Find transactions for Nasif or today
  const nasifTx = tx.logs.filter(l => 
    (l.employeeName && l.employeeName.toLowerCase().includes('nasif')) || 
    (l.employeeCode && (l.employeeCode.includes('1190') || l.employeeCode === '100290' || l.employeeCode === 'FO032507061190'))
  );
  console.log('Nasif transactions in live BioTime:', nasifTx);

  const { data: emps } = await supabase.from('employees').select('id, code, name, rfid').ilike('name', '%nasif%');
  console.log('Nasif in employees table:', emps);

  const { data: bioMaps } = await supabase.from('att_biotime_employee_map').select('*');
  console.log('att_biotime_employee_map count:', bioMaps?.length);

  const { data: bioEvents } = await supabase.from('att_biotime_events').select('*').limit(20);
  console.log('att_biotime_events count:', bioEvents?.length);

  const { data: attRecs } = await supabase.from('attendance_records').select('*').order('business_date', { ascending: false }).limit(5);
  console.log('Recent attendance_records:', attRecs);
}

checkBioTimeAndNasif().catch(console.error);
