import { getSupabaseAdminClient } from '@jaago/auth';

async function cleanupTestUser() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { data: userList } = await supabase.auth.admin.listUsers();
  const tanvirUser = userList?.users?.find((u) => u.email?.toLowerCase().includes('tanvir.ahmed'));

  if (tanvirUser) {
    console.log(`Deleting test user ${tanvirUser.email} (ID: ${tanvirUser.id}) from Supabase Auth...`);
    const { error } = await supabase.auth.admin.deleteUser(tanvirUser.id);
    if (error) {
      console.error('Delete error:', error);
    } else {
      console.log('Successfully deleted Tanvir Ahmed from Supabase Auth.');
    }
  } else {
    console.log('Tanvir Ahmed not found in Supabase Auth.');
  }

  // Also clear from employees table if exists
  const { data: emps } = await supabase.from('employees').select('id, name, work_email').ilike('name', '%Tanvir%');
  console.log('Employees matching Tanvir in Supabase:', emps);
  if (emps && emps.length > 0) {
    for (const e of emps) {
      await supabase.from('employees').delete().eq('id', e.id);
      console.log(`Deleted employee record for ${e.name} (${e.id})`);
    }
  }
}

cleanupTestUser();
