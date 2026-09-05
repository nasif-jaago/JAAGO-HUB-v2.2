import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnemsvwejymnqpufumhj.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('=== Checking BioTime and Effective Attendance Schema in Supabase ===');

  // 1. Check att_biotime_employee_map
  const { data: mapSample, error: mapErr } = await supabase
    .from('att_biotime_employee_map')
    .select('*')
    .limit(1);

  if (mapErr) {
    console.log('att_biotime_employee_map check notice:', mapErr.message);
  } else {
    console.log('✅ att_biotime_employee_map table is available.');
  }

  // 2. Check att_biotime_events
  const { data: eventsSample, error: eventsErr } = await supabase
    .from('att_biotime_events')
    .select('*')
    .limit(1);

  if (eventsErr) {
    console.log('att_biotime_events check notice:', eventsErr.message);
  } else {
    console.log('✅ att_biotime_events table is available.');
  }

  // 3. Auto-populate initial mappings from employees RFID / code
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, code, name, department, rfid');

  if (emps && emps.length > 0) {
    console.log(`Found ${emps.length} employees to verify for BioTime mapping.`);
    const seedMappings: any[] = [];

    for (const e of emps) {
      if (e.rfid) {
        const cleanRfid = String(e.rfid).replace(/^RFID-/i, '').trim();
        if (cleanRfid) {
          seedMappings.push({
            biotime_emp_code: cleanRfid,
            biotime_name: e.name,
            biotime_department: e.department,
            hub_employee_id: e.id,
            hub_employee_code: e.code,
            unmatched: false,
            notes: `Auto-mapped from employee RFID (${e.rfid})`,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    if (seedMappings.length > 0) {
      const { error: seedErr } = await supabase
        .from('att_biotime_employee_map')
        .upsert(seedMappings, { onConflict: 'biotime_emp_code' });
      if (!seedErr) {
        console.log(`✅ Seeded ${seedMappings.length} employee mappings from active RFID profiles.`);
      }
    }
  }

  console.log('=== Schema verification complete ===');
}

main().catch(console.error);
