import { buildUserSessionPayload } from '../../apps/web/lib/supabase-auth';

async function runTests() {
  console.log('--- TEST 1: RBAC Session Payload Evaluation ---');

  // 1. User with USER role (e.g. S M Nayeem Rahman)
  const nayeemUser = {
    id: 'user-nayeem-123',
    email: 'hub.jaago@jaago.com.bd',
    user_metadata: {
      full_name: 'S M Nayeem Rahman',
      role: 'USER',
      job_title: 'Team Lead',
      department: "Founder's Office (JF)",
      employee_code: 'FO072408021002',
    },
  };

  const nayeemSession = buildUserSessionPayload(nayeemUser);
  console.log('Nayeem Session:', {
    fullName: nayeemSession.fullName,
    role: nayeemSession.role,
    roles: nayeemSession.roles,
    isSuperAdmin: nayeemSession.isSuperAdmin,
    jobTitle: nayeemSession.jobTitle,
  });

  if (nayeemSession.isSuperAdmin === true || nayeemSession.roles.includes('super_admin')) {
    throw new Error('FAIL: Standard USER was granted super_admin role!');
  }
  console.log('✓ Nayeem is correctly identified as regular USER.');

  // 2. User with SUPER_ADMIN role (e.g. Nasif Kamal)
  const nasifUser = {
    id: 'user-nasif-123',
    email: 'nasif.kamal@jaago.com.bd',
    user_metadata: {
      full_name: 'Nasif Kamal',
      role: 'SUPER_ADMIN',
      is_super_admin: true,
      job_title: 'Coordinator, Technology',
      employee_code: 'FO032507061190',
    },
  };

  const nasifSession = buildUserSessionPayload(nasifUser);
  console.log('Nasif Session:', {
    fullName: nasifSession.fullName,
    role: nasifSession.role,
    roles: nasifSession.roles,
    isSuperAdmin: nasifSession.isSuperAdmin,
    jobTitle: nasifSession.jobTitle,
  });

  if (!nasifSession.isSuperAdmin || !nasifSession.roles.includes('super_admin')) {
    throw new Error('FAIL: Super admin was not granted super_admin role!');
  }
  console.log('✓ Nasif is correctly identified as SUPER_ADMIN.');

  console.log('\n SUCCESS: RBAC session tests passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
