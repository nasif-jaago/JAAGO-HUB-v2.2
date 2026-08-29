import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZW1zdndlanltbnFwdWZ1bWhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzIzNDY1NywiZXhwIjoyMTAyODEwNjU3fQ.WsvG5oRwqp7U04JnfiKmxIbnEnan1a0TqaY97vlhLVI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log('--- Applying Attendance Rebuild Schema Changes & Backfills ---');

  // 1. Check & backfill attendance_records
  const { data: records, error: recErr } = await supabase.from('attendance_records').select('*');
  if (recErr) {
    console.error('Error fetching records:', recErr.message);
  } else {
    console.log(`Found ${records?.length || 0} existing attendance records to verify and backfill.`);
    for (const r of (records || [])) {
      const firstIn = r.first_check_in_at || r.check_in_at;
      const lastOut = r.last_check_out_at || r.check_out_at;
      const workedSecs = r.worked_seconds !== undefined && r.worked_seconds !== null
        ? r.worked_seconds
        : (r.worked_minutes ? r.worked_minutes * 60 : 0);
      
      const hours = Math.floor(workedSecs / 3600);
      const mins = Math.floor((workedSecs % 3600) / 60);
      const workedDisp = `${hours}h ${String(mins).padStart(2, '0')}m`;

      await supabase.from('attendance_records').update({
        first_check_in_at: firstIn,
        last_check_out_at: lastOut,
        worked_seconds: workedSecs,
        worked_display: workedDisp,
        calc_method: r.calc_method || 'span',
        needs_review: r.needs_review ?? r.is_auto_checkout ?? false,
      }).eq('id', r.id);
    }
    console.log('✅ Backfill for attendance_records completed.');
  }

  // 2. Check & backfill attendance_settings
  const { data: settings } = await supabase.from('attendance_settings').select('*').eq('id', 'global').maybeSingle();
  if (settings) {
    await supabase.from('attendance_settings').update({
      working_hours_calc_method: settings.working_hours_calc_method || 'span',
      absent_on_missing_checkout: settings.absent_on_missing_checkout ?? false,
      daily_cutoff_local: settings.daily_cutoff_local || '23:30',
    }).eq('id', 'global');
    console.log('✅ attendance_settings updated.');
  }

  console.log('--- Migration & Backfill successfully verified ---');
}

run().catch(console.error);
