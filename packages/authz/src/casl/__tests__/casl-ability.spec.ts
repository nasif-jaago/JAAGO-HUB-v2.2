import { createAppAbility, serializeUserAbility } from '../ability-factory';
import { assertCan, canUser } from '../authorize';
import { UserAuthzContext } from '../types';

export function runCaslAuthzTests() {
  console.log('── Running JAAGO HUB CASL Authorization Unit & Security Tests ──');
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ FAIL: ${name} ->`, err.message);
    }
  }

  // 1. Super Admin Tests
  test('Super Admin has universal manage all capability', () => {
    const context: UserAuthzContext = {
      userId: 'u-admin',
      email: 'admin@jaago.com.bd',
      organizationId: 'org-jaago-dhaka',
      roles: ['super_admin'],
      permissions: ['*'],
      isSuperAdmin: true,
    };

    const ability = createAppAbility(context);
    if (!ability.can('manage', 'all')) throw new Error('Super admin must have manage all');
    if (!ability.can('create', 'Employee')) throw new Error('Super admin must create Employee');
    if (!ability.can('delete', 'User')) throw new Error('Super admin must delete User');
    if (!ability.can('process', 'Payroll')) throw new Error('Super admin must process Payroll');
    assertCan(ability, 'manage', 'all');
  });

  // 2. People & Culture (HR) Officer Tests
  test('P&C Officer can create and edit employees, but cannot process payroll', () => {
    const context: UserAuthzContext = {
      userId: 'u-hr',
      email: 'hr@jaago.com.bd',
      organizationId: 'org-jaago-dhaka',
      roles: ['pnc_officer'],
      permissions: ['hr.employees.view_all', 'hr.employees.create', 'hr.employees.edit', 'attendance.view_all'],
      isSuperAdmin: false,
    };

    const ability = createAppAbility(context);
    if (!canUser(ability, 'read', 'Employee')) throw new Error('HR must be able to read Employee');
    if (!canUser(ability, 'create', 'Employee')) throw new Error('HR must be able to create Employee');
    if (!canUser(ability, 'update', 'Employee')) throw new Error('HR must be able to update Employee');
    if (canUser(ability, 'delete', 'User')) throw new Error('HR Officer must NOT delete User accounts');
    if (canUser(ability, 'process', 'Payroll')) throw new Error('HR Officer must NOT process Payroll');
  });

  // 3. Department Scoped Employee View Test
  test('Department Manager only views employees within assigned department', () => {
    const context: UserAuthzContext = {
      userId: 'u-manager',
      email: 'manager@jaago.com.bd',
      organizationId: 'org-jaago-dhaka',
      departmentId: 'dept-education',
      roles: ['dept_manager'],
      permissions: ['hr.employees.view_dept', 'leave.approve_dept'],
      isSuperAdmin: false,
    };

    const ability = createAppAbility(context);
    // Exact department matching
    const sameDeptEmp = { __typename: 'Employee', department_id: 'dept-education', name: 'Teacher A' };
    const otherDeptEmp = { __typename: 'Employee', department_id: 'dept-finance', name: 'Accountant B' };

    if (!ability.can('read', sameDeptEmp as any)) throw new Error('Manager should read same dept employee');
    if (ability.can('read', otherDeptEmp as any)) throw new Error('Manager should NOT read other dept employee');
  });

  // 4. General Staff Self-Service Test
  test('General Staff can apply for own leave, but cannot approve others', () => {
    const context: UserAuthzContext = {
      userId: 'u-staff-123',
      email: 'teacher@jaago.com.bd',
      organizationId: 'org-jaago-dhaka',
      roles: ['general_staff'],
      permissions: ['leave.apply_own', 'onduty.apply_own', 'attendance.view_own'],
      isSuperAdmin: false,
    };

    const ability = createAppAbility(context);
    if (!canUser(ability, 'submit', 'LeaveRequest')) throw new Error('Staff must be able to submit leave');
    if (canUser(ability, 'approve', 'LeaveRequest')) throw new Error('Staff must NOT approve leave');
    if (canUser(ability, 'delete', 'Employee')) throw new Error('Staff must NOT delete Employee');
  });

  // 5. Custom Dynamic Role Test
  test('Custom Role with specific permissions evaluates accurately', () => {
    const context: UserAuthzContext = {
      userId: 'u-custom-supervisor',
      email: 'supervisor@jaago.com.bd',
      organizationId: 'org-jaago-dhaka',
      roles: ['regional_school_supervisor'],
      permissions: ['attendance.manage_shifts', 'attendance.manual_entry', 'onduty.approve_all'],
      isSuperAdmin: false,
    };

    const ability = createAppAbility(context);
    if (!canUser(ability, 'manage', 'Shift')) throw new Error('Custom role must manage shift');
    if (!canUser(ability, 'approve', 'OnDutyRequest')) throw new Error('Custom role must approve On-Duty');
    if (canUser(ability, 'process', 'Payroll')) throw new Error('Custom role must NOT process Payroll');
  });

  // 6. Ability Serialization Test
  test('serializeUserAbility produces valid transportable payload', () => {
    const context: UserAuthzContext = {
      userId: 'u-test',
      email: 'test@jaago.com.bd',
      organizationId: 'org-jaago-dhaka',
      roles: ['finance_lead'],
      permissions: ['finance.journals.view', 'finance.journals.post'],
      isSuperAdmin: false,
    };

    const serialized = serializeUserAbility(context);
    if (serialized.userId !== 'u-test') throw new Error('Invalid userId in serialization');
    if (!Array.isArray(serialized.rules) || serialized.rules.length === 0) {
      throw new Error('Rules must be a non-empty array');
    }
  });

  console.log(`\n── Result: ${passed}/${total} CASL authorization tests passed successfully. ──`);
  return passed === total;
}

runCaslAuthzTests();
