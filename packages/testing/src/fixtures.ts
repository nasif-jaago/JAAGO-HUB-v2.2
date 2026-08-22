export interface TestTenant {
  id: string;
  key: string;
  name: string;
  code: string;
}

export interface TestUser {
  id: string;
  userId: string;
  organizationId: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

export const TEST_FIXTURES = {
  tenants: {
    tenantA: {
      id: '11111111-1111-4111-a111-111111111111',
      key: 'jaago-dhaka',
      name: 'JAAGO Foundation (Dhaka Central)',
      code: 'JFG-DHK',
    } satisfies TestTenant,
    tenantB: {
      id: '22222222-2222-4222-a222-222222222222',
      key: 'jaago-chittagong',
      name: 'JAAGO Foundation (Chittagong Branch)',
      code: 'JFG-CTG',
    } satisfies TestTenant,
  },

  users: {
    employeeA: {
      id: 'aaaa1111-aaaa-4aaa-aaaa-111111111111',
      userId: 'aaaa1111-aaaa-4aaa-aaaa-111111111111',
      organizationId: '11111111-1111-4111-a111-111111111111',
      email: 'officer.dhaka@jaago.com.bd',
      fullName: 'Dhaka Field Officer',
      roles: ['employee'],
      permissions: ['hr.employees.view'],
      isSuperAdmin: false,
    } satisfies TestUser,

    adminA: {
      id: 'aaaa2222-aaaa-4aaa-aaaa-222222222222',
      userId: 'aaaa2222-aaaa-4aaa-aaaa-222222222222',
      organizationId: '11111111-1111-4111-a111-111111111111',
      email: 'admin.dhaka@jaago.com.bd',
      fullName: 'Dhaka Admin',
      roles: ['admin'],
      permissions: ['system.*', 'hr.*'],
      isSuperAdmin: false,
    } satisfies TestUser,

    employeeB: {
      id: 'bbbb1111-bbbb-4bbb-bbbb-111111111111',
      userId: 'bbbb1111-bbbb-4bbb-bbbb-111111111111',
      organizationId: '22222222-2222-4222-a222-222222222222',
      email: 'officer.ctg@jaago.com.bd',
      fullName: 'Chittagong Field Officer',
      roles: ['employee'],
      permissions: ['hr.employees.view'],
      isSuperAdmin: false,
    } satisfies TestUser,

    superAdmin: {
      id: '99999999-9999-4999-a999-999999999999',
      userId: '99999999-9999-4999-a999-999999999999',
      organizationId: '11111111-1111-4111-a111-111111111111',
      email: 'superadmin@jaago.com.bd',
      fullName: 'Global Platform SuperAdmin',
      roles: ['super_admin'],
      permissions: ['*'],
      isSuperAdmin: true,
    } satisfies TestUser,
  },
};
