import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fnemsvwejymnqpufumhj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function check() {
  const { data: allocData, error: allocErr } = await supabase.from('leave_allocations').select('*');
  console.log('leave_allocations result:', { count: allocData?.length, error: allocErr });

  const { data: reqData, error: reqErr } = await supabase.from('leave_requests').select('*');
  console.log('leave_requests result:', { count: reqData?.length, error: reqErr });
  if (reqData && reqData.length > 0) {
    console.log('Sample leave request:', reqData[0]);
  }

  // Check employees for Nasif and Nayeem
  const { data: emps, error: empsErr } = await supabase.from('employees').select('id, code, name, work_email, user_id, is_user, casual_leave_allocated, sick_leave_allocated').or('code.eq.FO032507061190,code.eq.FO072408021002');
  console.log('Target employees in DB:', emps);
}

check();
