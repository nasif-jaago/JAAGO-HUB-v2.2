# AUTHORIZATION-STANDARD.md

**Project:** JAAGO HUB — Enterprise NGO Platform  
**Version:** 2.2.0 (CASL Unified Authorization Architecture)  
**Status:** Canonical & Binding Standard  
**Governing Priority:** Data Integrity → Security & Authorization → Reliability → Performance → Maintainability → Convenience  

---

## 1. Executive Overview & Architecture Layers

Authorization in JAAGO HUB v2.2 is enforced through a strict multi-layer defense-in-depth security model:

```
[ Client / Browser (Presentation Only) ]
                 │
                 ▼
[ 1. Identity Layer: Supabase Auth JWT Token ]
                 │
                 ▼
[ 2. Server-Resolved Context: User, Org, Company, Branch, Department, Roles, Permissions ]
                 │
                 ▼
[ 3. Application Authorization Engine: CASL (AbilityFactory) ]
                 │
                 ▼
[ 4. Data Access Layer: Drizzle ORM & Typed Repositories ]
                 │
                 ▼
[ 5. Database Security Boundary: PostgreSQL Row Level Security (RLS) ]
                 │
                 ▼
[ 6. Tamper-Evident Audit Trail: SHA-256 Block Chained Audit Logs ]
```

> [!IMPORTANT]
> **CASL is the application-layer authorization engine, NOT the sole security boundary.**
> The browser never writes to the database directly. All mutations pass through server API endpoints, where CASL abilities are derived from server-resolved credentials and enforced.

---

## 2. Centralized Typed Actions & Subjects

All authorization logic uses strict, centralized TypeScript types defined under `@jaago/authz`.

### 2.1 Actions (`AppAction`)
- `manage`: Full administrative wildcard capability on subject
- `read`: View/query single records or lists
- `create`: Provision new records
- `update`: Modify existing records
- `delete`: Remove or archive records
- `approve`: Workflow approval authorization (Leave, On-Duty, Budget)
- `reject`: Workflow rejection
- `process`: Batch transaction processing (e.g. Payroll batch)
- `submit`: Self-service request submission
- `cancel`: User cancellation of pending request
- `export`: Data and audit package export
- `import`: Spreadsheet bulk imports
- `assign`: Role and supervisor assignment
- `transfer`: Reallocation of assets or departments
- `adjust`: Balance and quota adjustments

### 2.2 Subjects (`AppSubject`)
- `all`: Root wildcard
- **Governance & System**: `User`, `Role`, `Permission`, `AuditLog`, `ApiKey`, `SystemSetting`, `Integration`, `Module`, `McpTool`
- **Organization**: `Organization`, `Branch`, `Department`, `Designation`, `PolicyDocument`
- **People & Culture**: `Employee`, `Attendance`, `Shift`, `LeaveRequest`, `LeaveBalance`, `Holiday`, `OnDutyRequest`, `InsurancePolicy`
- **Payroll & Accounting**: `Payroll`, `SalaryStructure`, `JournalEntry`, `AccountLedger`, `Budget`
- **Operations & Projects**: `Project`, `Team`, `Task`, `Workflow`, `Report`, `StorageFile`

---

## 3. Canonical Database RBAC Schema

Stored in Supabase PostgreSQL under `DATABASE-STANDARD.md` compliance:

| Table | Primary Key | Description |
|---|---|---|
| `roles` | `id` (UUID) | System and custom roles (`key`, `name`, `description`, `color`, `is_system`) |
| `permissions` | `id` (UUID) | Catalog of 46+ granular permissions (`key`/`slug`, `module`, `action`) |
| `role_permissions` | `(role_id, permission_id)` | Many-to-many role capability matrix with optional scope conditions |
| `user_roles` | `(user_id, role_id)` | User assignments linking Supabase Auth users to roles |

---

## 4. CASL Ability Factory (`@jaago/authz`)

The Ability Factory resolves user identity and generates a pure `AppAbility` instance:

```typescript
import { createAppAbility } from '@jaago/authz';

const ability = createAppAbility({
  userId: 'user-123',
  email: 'employee@jaago.com.bd',
  organizationId: 'org-jaago-dhaka',
  departmentId: 'dept-education',
  roles: ['dept_manager'],
  permissions: ['hr.employees.view_dept', 'leave.approve_dept'],
  isSuperAdmin: false,
});
```

### Scoping Rules:
- **Super Administrator**: Granted explicit `can('manage', 'all')`.
- **Department Scope**: `can('read', 'Employee', { department_id: context.departmentId })`.
- **User Self-Service Scope**: `can('submit', 'LeaveRequest', { user_id: context.userId })`.

---

## 5. Server-Side Guard Enforcement

Every API route handler asserts CASL capability before initiating data operations:

```typescript
import { createCaslApiHandler, assertCan } from '@jaago/authz';

export const POST = createCaslApiHandler({
  action: 'create',
  subject: 'Employee',
  handler: async (request, { session, ability }) => {
    // Ability is pre-verified; session and trace context are injected
    return handleCreateEmployee(request);
  },
});
```

If unauthorized, the server responds with a standardized 403 error envelope:
```json
{
  "success": false,
  "error": {
    "code": "AUTHZ_INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to perform 'create' on 'Employee'."
  },
  "traceId": "tr_1788092044810"
}
```

---

## 6. Web Presentation Layer (`apps/web`)

The Next.js frontend uses `@casl/react` strictly for **UX gating** (hiding/disabling buttons), not as the security boundary:

```tsx
import { Can, useAbility } from '@/lib/casl-ability';

export function EmployeeActions({ employee }) {
  const ability = useAbility();

  return (
    <div>
      <Can I="update" of="Employee">
        <button onClick={handleEdit}>Edit Profile</button>
      </Can>

      <Can I="delete" of="Employee">
        <button onClick={handleDelete} className="text-rose-500">Delete</button>
      </Can>
    </div>
  );
}
```

---

## 7. Dynamic Custom Roles for Super Admin

Super Admins can create and modify custom roles dynamically through the **RBAC Matrix Dashboard** (`/admin/rbac`):
1. **Creation**: Super Admin specifies Role Name, Key, Description, Badge Color, and starting permission template.
2. **Persistence**: The role is inserted into the `roles` table in Supabase and permission associations are written to `role_permissions`.
3. **Activation**: The new role is immediately available for user assignment and instant CASL ability generation.

---

## 8. Governed MCP / AI Agent Authorization

All AI Agents and MCP tools pass through the **same** CASL evaluation:
- Tool execution requires explicit permission (e.g. `get_staff_profile` requires `hr.employees.view_all`).
- Direct, unconstrained SQL execution tools are strictly prohibited.
- All MCP tool executions are logged with user ID, trace ID, and permission checks.

---

## 9. Verification & Testing Standards

All authorization rules must be verified via unit and integration tests:
- `packages/authz/src/casl/__tests__/casl-ability.spec.ts` executes automated tests for:
  1. Super Admin universal access.
  2. HR and Department Manager scoping.
  3. Staff self-service boundaries.
  4. Dynamic custom role evaluations.
  5. JSON ability serialization.
