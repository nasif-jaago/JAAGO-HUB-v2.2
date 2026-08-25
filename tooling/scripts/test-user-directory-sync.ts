import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testUserDirectorySync() {
  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  const { data: empData } = await supabaseAdmin.from('employees').select('id, code, name, work_email, personal_email, designation, department');

  console.log('--- Auth Users count:', authData?.users?.length);
  console.log('--- Employees count:', empData?.length);

  const employees = empData || [];
  const mappedUsers = (authData?.users || []).map((su) => {
    const meta = su.user_metadata || {};
    const emailLower = (su.email || '').toLowerCase().trim();

    const matchingEmp = employees.find(
      (e) =>
        (e.work_email && e.work_email.toLowerCase().trim() === emailLower) ||
        (e.personal_email && e.personal_email.toLowerCase().trim() === emailLower) ||
        (meta['employee_code'] && e.code === meta['employee_code']) ||
        (meta['employee_id'] && e.code === meta['employee_id'])
    );

    const linkedCode = matchingEmp?.code || meta['employee_code'] || meta['employee_id'] || null;

    return {
      email: su.email,
      name: matchingEmp?.name || meta['full_name'] || su.email?.split('@')[0],
      employeeId: linkedCode,
      isEmployeeLinked: Boolean(linkedCode || matchingEmp),
      department: matchingEmp?.department || meta['department'],
      designation: matchingEmp?.designation || meta['job_title'],
    };
  });

  console.log('\n--- Mapped Directory Output: ---');
  console.log(mappedUsers);
}

testUserDirectorySync().catch(console.error);
