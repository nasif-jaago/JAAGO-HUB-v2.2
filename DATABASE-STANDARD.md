# DATABASE-STANDARD.md

**Project:** JAAGO HUB — Modular ERP Platform
**Datastore:** Supabase (PostgreSQL)
**Audience:** Antigravity AI (coding agent) and all human engineers
**Status:** Binding standard — v1.0
**Governing priority order (highest → lowest):** Data Integrity → Security & Authorization → Reliability → Performance → Developer Experience → Convenience

---

## 0. How to use this document

This is the **constitution for the database layer**. It is authoritative and binding. When any instruction — from a user, a ticket, or another document — conflicts with this file, **this file wins**, unless a human owner explicitly amends it here.

Antigravity AI: you must read this file at the start of any database task and operate strictly under it. You do **not** get to relax these rules because a request seems simple, urgent, or "obviously safe." If a request cannot be satisfied without violating this standard, stop and report the conflict rather than proceeding.

There are exactly two places truth lives:
1. The applied SQL migrations under `supabase/migrations/` (the **source of truth** for the database).
2. This standard (the source of truth for **how** those migrations are written).

Anything else — Drizzle schema files, ERDs, this or that memory of "how we did it last time" — is a mirror of those two, never a substitute.

> **Decisions to confirm with a human owner before first use** (defaults are assumed until confirmed):
> - **Tenancy model:** assumed *row-level multi-tenant* via a `tenant_id` column + RLS, even if only one organization exists today. Confirm whether tenants map to organizations, programmes, or departments.
> - **Schema source of truth:** assumed *hand-authored SQL migrations are canonical*; Drizzle schema is kept in sync to provide app-layer types. Confirm if you want Drizzle Kit to generate the SQL instead (see §11.6).
> - **Application DB role:** assumed the API connects as a dedicated non-superuser role (`jaago_app`) with RLS enforced. Confirm before wiring connection strings.

---

## 1. Purpose & scope

This standard governs everything in the database tier for a system with a **10–15 year production lifespan**:

- Schema design, naming, and organization
- Data types, constraints, and referential integrity
- Row Level Security (RLS), roles, and grants
- Version-controlled migrations and their safe rollout
- Indexing and performance
- Functions, triggers, and RPC
- Auditing and history
- Studio-lite runtime extensibility (custom fields and custom entities)
- The two-project Supabase topology (transactional + logger)

It applies to **both** Supabase projects. Where the logger project differs, §18 states the differences.

---

## 2. Non-negotiable principles

1. **Data integrity is enforced in the database, not just the app.** Constraints (`NOT NULL`, `CHECK`, `UNIQUE`, `FOREIGN KEY`, `EXCLUDE`) are the last line of defense and must exist even when the application also validates. Application code changes; the constraint is permanent.
2. **Security is default-deny.** RLS is enabled on every tenant-sensitive table. No table is readable or writable by accident.
3. **The `service_role` key (and any superuser credential) never reaches the frontend.** Not in a bundle, not in a client-readable env var, not in a browser network call. See §5.
4. **The browser never talks to the database directly for writes.** All data access is mediated by the API. RLS is a backstop *underneath* the API's RBAC, not a replacement for it.
5. **Every schema change is a version-controlled migration.** No manual clicks in the Supabase dashboard to change schema in staging or production. No ad-hoc `psql` DDL against production.
6. **Migrations are forward-only and immutable once applied.** You fix mistakes with new migrations, never by editing an applied one.
7. **Non-destructive by default.** Destructive changes (drop, truncate, column removal, type change, rename) use the expand/contract pattern (§11.3) and require an approved plan and a confirmed backup.
8. **Audit before you change.** No SQL is generated purely from a request. The current architecture is inspected first, every time (§3).
9. **No duplication.** If a concept already exists, you extend or reuse it. You do not create a second table for the same idea.
10. **Validate before production.** Every migration is proven on a disposable/staging database with tests and drift checks before it touches production (§12).

---

## 3. The Golden Rule — audit before change

**No migration is written from a bare request.** Before proposing or writing any schema change, you must complete a **database architecture audit** and reconcile the request against what already exists.

The mandatory sequence for *every* database task:

1. **AUDIT** — Introspect the live schema: schemas, tables, columns, foreign keys, indexes, RLS status, policies, grants, functions, triggers, enums. Use the toolkit in §22. Produce a written report.
2. **RECONCILE** — Determine whether the concept already exists. If it does, plan to reuse/extend it. Never create a duplicate table, column, or relationship for an existing concept.
3. **PROPOSE** — Present a **non-destructive remediation/change plan**: the migration list, expand/contract steps if needed, RLS/grants/indexes, a lock-and-risk analysis, and a rollback/mitigation plan. **Wait for human approval.**
4. **IMPLEMENT** — Write versioned SQL migration(s) under `supabase/migrations/`; update the Drizzle schema to match (§11.6).
5. **VALIDATE** — Apply to a disposable/staging database; run tests; check for drift; verify RLS with representative roles; confirm no unintended destructive statements (§12).
6. **APPLY** — Roll out to production only after a backup/PITR checkpoint is confirmed, with `lock_timeout` set, in a maintenance window if the change is heavy. Verify post-apply.
7. **RECORD** — Update the data dictionary / schema registry and, for architectural choices, an ADR (§24).

Steps 1–3 always precede any writing of SQL. Step 6 never happens without steps 4 and 5.

---

## 4. Supabase project topology

Two independent Supabase (Postgres) projects:

| Project | Purpose | Characteristics |
|---|---|---|
| **Transactional** | All business/ERP data (HR, Finance, Procurement, Donors, Programmes, Grants, Inventory, Assets, Documents, Approvals, Reporting). | OLTP. Full RLS, constraints, strong integrity. This standard applies in full. |
| **Logger** | Structured application logs shipped from the Pino/worker pipeline. | Append-heavy, time-series. Retention/rotation (~1 GB threshold). Redaction applied **upstream** before write. See §18. |

Rules:
- The two projects are **not** cross-joined at the database level. Correlation happens via IDs (e.g., trace IDs) at the application layer.
- Credentials for the two projects are distinct and independently scoped.
- The transactional project **never** holds raw logs; the logger project **never** holds authoritative business records.

---

## 5. Security & access model

### 5.1 Key and credential handling

- **`service_role` key / secret:** server-side only. Used exclusively by trusted backend processes (migrations, privileged maintenance/admin jobs, the worker) and CI. It bypasses RLS (`BYPASSRLS`) and must be treated like a root password. **Never** shipped to, or reachable from, the browser.
- **`anon` key:** in this architecture the browser does not use Supabase directly, so the `anon` key should not appear in the frontend either. If any client-side Supabase usage is ever introduced (e.g., auth only), the `anon` key is the *only* key permitted client-side and it must be paired with strict RLS.
- **Direct database URL / superuser (`postgres`):** migrations and break-glass maintenance only. Never embedded in the runtime application config used to serve requests.
- **All secrets** live in a secrets manager / server-side environment, never in migration files, seed files, or the repository.

### 5.2 Database roles and least privilege

Because the API connects to Postgres directly, the connecting role determines whether RLS applies. Use a **dedicated least-privilege application role** so RLS is real defense-in-depth.

| Role | `BYPASSRLS`? | Used by | Privileges |
|---|---|---|---|
| `postgres` / superuser | yes (superuser) | Migrations, break-glass only | Full DDL. Not used to serve traffic. |
| `service_role` | yes | Backend privileged jobs, worker, CI | Broad DML; **never** frontend. |
| `jaago_app` (create this) | **no** | The NestJS runtime for tenant-scoped requests | `SELECT/INSERT/UPDATE/DELETE` on business tables only. **No DDL.** RLS enforced. |
| `authenticated` / `anon` | no | Supabase Auth/PostgREST plumbing | Minimal; not the primary path here. |

The runtime connects as `jaago_app`. On every request/transaction the API sets session-scoped context so RLS policies can read it:

```sql
-- Set once per transaction by the API, using SET LOCAL / set_config(..., true)
select set_config('app.current_tenant_id', '<tenant-uuid>', true);
select set_config('app.current_user_id',   '<user-uuid>',   true);
select set_config('app.current_roles',     'finance,approver', true); -- optional
```

`SET LOCAL` / the `true` (is_local) flag scopes these to the current transaction, so they never leak across pooled connections.

### 5.3 Browser → API boundary

- The frontend calls the NestJS API. The API enforces **RBAC** (the primary authorization decision).
- The database enforces **RLS** underneath (the backstop that prevents catastrophic tenant leakage if the API has a bug).
- The browser holds no database credentials and issues no DDL/DML directly.

---

## 6. Schema organization & naming conventions

Consistency beats cleverness. If you find an existing convention in the schema that differs from this section, **match the existing schema** and raise the discrepancy — do not introduce a third style.

### 6.1 Schemas

- One schema per bounded domain/module: `core`, `hr`, `finance`, `procurement`, `donor`, `programme`, `grants`, `inventory`, `assets`, `documents`, `approvals`, `reporting`.
- `core` holds cross-cutting entities: `tenants`, `users`, `roles`, `user_roles`, `currencies`, `audit_log`, shared helper functions, and the extensibility metadata registry.
- Supabase-managed schemas (`auth`, `storage`, `extensions`, etc.) are **not** modified. Extensions install into the `extensions` schema, never `public`.
- Naming: lowercase `snake_case`.

### 6.2 Tables

- Lowercase `snake_case`, **plural** noun for entity collections: `employees`, `purchase_orders`, `grant_disbursements`.
- Join tables: both sides, alphabetical-ish and readable: `role_permissions`, `programme_beneficiaries`.
- No reserved words as table names. No prefixes like `tbl_`.

### 6.3 Columns

- Lowercase `snake_case`, **singular**: `full_name`, `hired_on`, `total_amount`.
- Primary key is always `id`.
- Foreign key columns are `<referenced_singular>_id`: `employee_id`, `department_id`, `tenant_id`.
- Booleans read as predicates: `is_active`, `has_dependents`.
- Dates/timestamps: `*_at` for timestamps (`created_at`), `*_on` for dates (`hired_on`).

### 6.4 Constraints (name them explicitly)

Explicit names produce readable errors and stable migrations.

| Constraint | Pattern | Example |
|---|---|---|
| Primary key | `pk_<table>` | `pk_employees` |
| Foreign key | `fk_<table>_<column>` | `fk_employees_department_id` |
| Unique | `uq_<table>_<cols>` | `uq_employees_tenant_code` |
| Check | `chk_<table>_<rule>` | `chk_employees_status` |
| Exclusion | `ex_<table>_<rule>` | `ex_bookings_no_overlap` |

### 6.5 Indexes

- `idx_<table>_<cols>` for standard indexes; `uq_<table>_<cols>` for unique indexes (including partial unique indexes).
- GIN indexes on JSONB/full-text/array columns: `idx_<table>_<col>_gin`.

### 6.6 Functions and triggers

- Functions: `fn_<verb>_<noun>` in the owning schema: `core.fn_set_updated_at`.
- Trigger objects: `trg_<table>_<action>`: `trg_employees_set_updated_at`.
- RPCs intended for controlled invocation: `rpc_<action>`.

### 6.7 Enumerated values — reference tables over native enums

Prefer **reference (lookup) tables** for any domain values that may change over the system's life (statuses, categories, types). Reasons:
- Native `enum` values are hard to remove and awkward to reorder.
- `ALTER TYPE ... ADD VALUE` interacts badly with transactional migrations (a newly added value can't be used until the transaction commits).
- Reference tables carry descriptions, ordering, active flags, and translations.

Use a native `enum` only for a **truly stable, small, closed set** that will not change (rare). For everything else, use a reference table plus a `FOREIGN KEY`, or a `CHECK (col in (...))` for tiny fixed sets guarded at the app layer.

---

## 7. Standard table template

Every business table follows this template. Deviations require justification.

**Standard columns (in this order):**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, default `gen_random_uuid()` | Never expose sequential integer PKs. See §8 on UUID choice. |
| `tenant_id` | `uuid NOT NULL` → `core.tenants(id)` | On all tenant-scoped tables. Drives RLS. |
| …business columns… | | |
| `ext` | `jsonb NOT NULL DEFAULT '{}'` | Governed Studio-lite custom fields (§17). |
| `row_version` | `integer NOT NULL DEFAULT 1` | Optimistic concurrency for high-contention entities. |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | UTC. |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | Maintained by trigger. |
| `created_by` | `uuid` → `core.users(id)` | Nullable (system actions). |
| `updated_by` | `uuid` → `core.users(id)` | Nullable. |
| `deleted_at` | `timestamptz` | Soft delete for business entities. |
| `deleted_by` | `uuid` → `core.users(id)` | |

**Reference implementation** (illustrative — audit first; reuse `core.*` if it already exists):

```sql
-- core helper (create once, in core)
create or replace function core.fn_set_updated_at()
returns trigger
language plpgsql
set search_path = ''          -- pinned; see §15
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table hr.employees (
    id            uuid        primary key default gen_random_uuid(),
    tenant_id     uuid        not null references core.tenants(id) on delete restrict,

    employee_code text        not null,
    full_name     text        not null,
    email         citext,                                   -- case-insensitive
    status        text        not null default 'active',
    hired_on      date        not null,
    base_salary   numeric(20,4),
    salary_ccy    char(3)     references core.currencies(code),

    ext           jsonb       not null default '{}'::jsonb, -- Studio-lite (governed)
    row_version   integer     not null default 1,

    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    created_by    uuid        references core.users(id) on delete set null,
    updated_by    uuid        references core.users(id) on delete set null,

    deleted_at    timestamptz,
    deleted_by    uuid        references core.users(id) on delete set null,

    constraint chk_employees_status
      check (status in ('active','on_leave','terminated'))
);

-- Tenant-scoped uniqueness that survives soft delete (reuse codes after delete)
create unique index uq_employees_tenant_code
  on hr.employees (tenant_id, employee_code)
  where deleted_at is null;

-- Tenant filter index (also used by RLS)
create index idx_employees_tenant_id on hr.employees (tenant_id);

-- Index EVERY foreign key column (Postgres does NOT do this for you) — §13
create index idx_employees_created_by on hr.employees (created_by);
create index idx_employees_updated_by on hr.employees (updated_by);

-- JSONB extension index (only if ext is queried by containment)
create index idx_employees_ext_gin on hr.employees using gin (ext jsonb_path_ops);

-- updated_at maintenance
create trigger trg_employees_set_updated_at
  before update on hr.employees
  for each row execute function core.fn_set_updated_at();
```

RLS for this table is shown in §9.3.

---

## 8. Data type standards

| Concern | Rule |
|---|---|
| **Identifiers** | `uuid`. Default `gen_random_uuid()` (UUIDv4). If your Postgres provides a native UUIDv7 generator (or `pg_uuidv7` extension), prefer it for high-insert tables — time-ordered UUIDs improve index locality. Never expose bigserial PKs to clients. |
| **Money / amounts** | `numeric(20,4)`. **Never** `float`/`double precision` for money. Store the ISO-4217 currency separately as `char(3)`. Define rounding rules at the app layer explicitly. |
| **Timestamps** | Always `timestamptz`, stored in UTC. **Never** `timestamp` (without time zone). |
| **Dates** | `date` for calendar dates with no time component. |
| **Text** | `text` (not `varchar(n)` — no performance benefit). Enforce length limits with `CHECK` where the domain requires them. |
| **Case-insensitive text** | `citext` (email, code) when case-insensitive uniqueness/matching is required. Install `citext` in the `extensions` schema. |
| **Booleans** | `boolean NOT NULL DEFAULT false/true`. Avoid nullable booleans (three-valued logic bugs). |
| **Enumerated domains** | Reference tables (preferred) or `CHECK` for tiny fixed sets. Native `enum` only for stable closed sets (§6.7). |
| **Semi-structured** | `jsonb` (not `json`). Index with GIN when queried. Reserve for genuinely dynamic data (`ext`), not to avoid modeling real columns. |
| **Large binaries** | Do **not** store files in the database. Use object storage; keep a metadata row with a reference. |
| **Precision numbers** | `numeric` with explicit precision/scale for anything requiring exactness; `bigint`/`integer` for counts. |

---

## 9. Row Level Security (RLS)

### 9.1 When RLS is mandatory

- **Every** table containing tenant-sensitive data has RLS **enabled** with a default-deny posture (no policy = no access).
- Reference/lookup tables that are global (e.g., `core.currencies`) may be readable to the app role without tenant scoping, but still have RLS enabled with an explicit read policy — never left open by omission.
- New tables ship with RLS in the **same migration** that creates them. A table is never live without its policies.

### 9.2 Helper functions (write once, in `core`)

```sql
create or replace function core.current_tenant_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.current_tenant_id', true), '')::uuid
$$;

create or replace function core.current_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;
```

`current_setting(name, true)` returns `NULL` if the GUC is unset rather than erroring, so a missing context fails closed (no tenant → no rows).

### 9.3 Policy patterns (per command, tenant isolation)

Write **one policy per command** and always target the app role explicitly with `TO`. Wrap helper calls in `(select …)` so the planner evaluates them once per statement (major performance difference at scale).

```sql
alter table hr.employees enable row level security;
-- Optional hardening: subject the table owner to RLS too.
-- (Superusers / BYPASSRLS roles still bypass — migrations run as those.)
alter table hr.employees force row level security;

create policy p_employees_select on hr.employees
  for select to jaago_app
  using (tenant_id = (select core.current_tenant_id()));

create policy p_employees_insert on hr.employees
  for insert to jaago_app
  with check (tenant_id = (select core.current_tenant_id()));

create policy p_employees_update on hr.employees
  for update to jaago_app
  using      (tenant_id = (select core.current_tenant_id()))
  with check (tenant_id = (select core.current_tenant_id()));

create policy p_employees_delete on hr.employees
  for delete to jaago_app
  using (tenant_id = (select core.current_tenant_id()));
```

Conventions:
- **`USING`** filters which existing rows are visible/affected; **`WITH CHECK`** validates new/changed row values. `INSERT` needs `WITH CHECK`; `UPDATE` needs both.
- **Soft-delete visibility** (`deleted_at IS NULL`) is handled at the **query/view layer** by convention, *not* in the tenant-isolation policy — so admins and cleanup jobs can still reach soft-deleted rows. Add a standard filtered view per entity if you want a default "live rows only" surface.
- **Finer authorization** (which roles may do what) is the API's RBAC job. RLS enforces tenant isolation (and ownership scoping where a table is per-user). Do not try to encode the full permission matrix in RLS.

### 9.4 RLS performance rules

- **Index every column referenced in a policy** (`tenant_id` is already indexed per §7).
- **Wrap function calls** in `(select fn())` to cache per statement.
- **Always specify `TO <role>`** so policies don't run for irrelevant roles.
- **Minimize joins in policies.** If a policy needs a lookup, prefer a `STABLE` `SECURITY DEFINER` helper that resolves it once over an inline join.

### 9.5 Testing RLS

Every RLS change is verified before merge by:
1. Connecting as `jaago_app` with tenant A context and confirming only tenant-A rows are visible.
2. Confirming tenant-A context **cannot** read, insert, update, or delete tenant-B rows (including via `WITH CHECK`).
3. Confirming that with **no** tenant context set, the table returns zero rows (fails closed).

---

## 10. Grants & privileges

- **Least privilege.** Grant only what a role needs. No `GRANT ALL`. No grants to `PUBLIC`. No table grants to `anon`.
- `jaago_app` receives `SELECT, INSERT, UPDATE, DELETE` on business tables and `USAGE` on the owning schemas — **never** DDL, never `TRUNCATE` on production data tables.
- Default privileges: set `ALTER DEFAULT PRIVILEGES` in migrations so new tables in a schema automatically grant correctly to `jaago_app`, preventing "forgot to grant" gaps.
- Function `EXECUTE` grants are explicit and minimal. `SECURITY DEFINER` functions are granted to the narrowest role possible.
- Sequence usage is granted only where the role must generate values.

```sql
grant usage on schema hr to jaago_app;
grant select, insert, update, delete on all tables in schema hr to jaago_app;
alter default privileges in schema hr
  grant select, insert, update, delete on tables to jaago_app;
```

---

## 11. Migrations

### 11.1 Location & naming

- All migrations live in `supabase/migrations/`.
- Filenames follow the Supabase CLI convention: `<UTC timestamp>_<snake_case_description>.sql`, e.g. `20260315091200_add_hr_employees.sql`. Generate with `supabase migration new <description>`.
- One cohesive logical change per migration. A migration that adds a table also adds its constraints, indexes, RLS, grants, and triggers — the table is never left partially governed.

### 11.2 Forward-only & immutable

- Migrations are **forward-only**. Once a migration has been applied to any shared environment (staging/production), it is **frozen** — never edit it. Correct mistakes with a **new** migration.
- No "down"/rollback migrations are relied upon in production. Recovery is via a **new forward migration** plus, if data was lost, restore from backup/PITR. (You may keep down scripts for local convenience, but they are not the production recovery mechanism.)

### 11.3 Non-destructive by default — expand / contract

Destructive or blocking changes use the **expand → migrate → contract** (parallel change) pattern so running application instances never break:

1. **Expand** — Add the new structure (new nullable column, new table, new index built safely). Deploy code that writes to both old and new.
2. **Migrate/backfill** — Copy/convert data in **batches** (bounded by PK ranges), never one giant `UPDATE`.
3. **Contract** — After reads are switched over and a full release cycle confirms the old structure is unused, drop it in a **later** migration.

Apply this to:
- **Renames** (never rename a live column/table in place — add new, dual-write, backfill, cut over, drop old).
- **Type changes** (add new column of the new type, backfill, swap).
- **Column drops** (stop using it in one release; drop it in a later "contract" migration).
- **`NOT NULL` additions** on populated tables (§11.4).

### 11.4 Safe DDL techniques

- **Fail fast on locks.** Start migrations that touch existing large tables with:
  ```sql
  set lock_timeout = '5s';
  set statement_timeout = '0'; -- or a bounded value for backfills run separately
  ```
  Better to abort and retry than to block the application behind an `ACCESS EXCLUSIVE` lock.
- **Adding a column:** adding with a **constant** default is metadata-only and fast (PG 11+). A **volatile** default rewrites the whole table — avoid on large tables; add nullable, then backfill.
- **Adding `NOT NULL` to a populated column:** don't set `NOT NULL` directly (it scans the table under a strong lock). Instead:
  ```sql
  alter table t add constraint chk_t_col_not_null check (col is not null) not valid;
  alter table t validate constraint chk_t_col_not_null;   -- weaker lock, allows reads/writes
  -- optionally, later:
  alter table t alter column col set not null;             -- can skip the scan using the validated check
  ```
- **Adding a foreign key** on a large table: add `NOT VALID`, then `VALIDATE CONSTRAINT` separately to avoid a long lock.
  ```sql
  alter table child add constraint fk_child_parent_id
    foreign key (parent_id) references parent(id) not valid;
  alter table child validate constraint fk_child_parent_id;
  ```
- **Backfills** run in bounded batches with a `WHERE` on a key range and a short sleep between batches; they are **never** a single unbounded `UPDATE`/`DELETE`. Every `UPDATE`/`DELETE` in a migration has a `WHERE` clause. A `DELETE`/`UPDATE` without `WHERE` is prohibited (§20).

### 11.5 Transactions & the `CONCURRENTLY` caveat

- Migration files run inside a transaction by the tooling. This is what you want for atomicity — but a few statements **cannot** run in a transaction:
  - `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY`
  - `ALTER TYPE ... ADD VALUE` (and using it in the same transaction)
- For **large, populated tables in production**, indexes must be built with `CREATE INDEX CONCURRENTLY` to avoid a write-blocking lock. Because that can't run in the wrapped transaction, treat it as a **separate, explicitly non-transactional step**: put it in its own migration flagged in the PR description as "runs outside a transaction / apply out-of-band," and coordinate the apply. For **new or small tables**, a plain `CREATE INDEX` inside the migration is fine (the brief lock is acceptable).

### 11.6 Drizzle ↔ SQL source of truth

- **The applied SQL under `supabase/migrations/` is canonical.** Drizzle schema files exist to give the application compile-time types and query ergonomics; they mirror the database.
- RLS policies, grants, triggers, functions, partial/GIN indexes, `CHECK`/`EXCLUDE` constraints, and safe-DDL techniques are **hand-authored SQL** — do not expect an ORM generator to produce them correctly.
- Permitted workflow if using Drizzle Kit to draft table DDL: generate the SQL, **review it against this standard**, move/merge it into a properly named migration file, then **add the RLS/grants/indexes/triggers by hand** in the same migration. Never let generated output reach production unreviewed.
- After any migration, the Drizzle schema is updated so the two never drift. Drift is checked in CI (`supabase db diff` — §12).

---

## 12. Migration validation & release (before production)

No migration reaches production until all of the following pass:

1. **Local apply from clean state:** `supabase db reset` applies the full migration history to a fresh database with no errors. This proves the migrations are self-consistent and ordered.
2. **Drift check:** `supabase db diff` shows **no** unexpected difference between the migration-defined schema and the working database. Any drift is resolved (usually a missing migration).
3. **Automated tests:** the application's integration tests run against the migrated schema and pass, including RLS tests (§9.5).
4. **Lint / review gate:** run available linting (e.g., `supabase db lint`) and a human/agent review against the §23 checklists. Scan explicitly for destructive statements (`DROP`, `TRUNCATE`, `ALTER ... DROP COLUMN`, unqualified `DELETE`/`UPDATE`).
5. **Staging apply:** migrations applied to a staging Supabase project that mirrors production, followed by a smoke test.
6. **Backup confirmed:** a recent backup / PITR checkpoint for the production project is confirmed to exist **before** the production apply.
7. **Production apply:** `supabase db push` (or the CI equivalent) with `lock_timeout` set; in a maintenance window if the change is heavy. Post-apply, verify: expected objects exist, row counts are sane, RLS behaves, and a smoke test passes.

If any step fails, the release stops and the plan is revised. Production is never the place a migration is first proven.

---

## 13. Indexing strategy

- **Index every foreign key column.** Postgres creates an index on the *referenced* key, **not** on the referencing column. Missing FK indexes cause slow joins and slow parent deletes/updates. This is mandatory, not optional.
- Index columns used in RLS policies, `WHERE`, `JOIN`, and frequent `ORDER BY`.
- **Composite index column order:** equality-filtered columns first, then range/sort columns. `tenant_id` typically leads composite indexes on tenant-scoped tables.
- **Partial indexes** for soft delete (`WHERE deleted_at IS NULL`) and other selective filters — smaller and faster.
- **Unique constraints** enforce business keys; use **partial unique indexes** when uniqueness should ignore soft-deleted rows (§7).
- **GIN** for `jsonb` (`jsonb_path_ops` when only containment `@>` is needed), full-text, and array columns.
- **BRIN** for very large, naturally time-ordered append-only tables (see logger, §18).
- **Do not over-index.** Every index adds write cost. Periodically review `pg_stat_user_indexes` for unused indexes and remove them via migration.
- Build indexes on populated production tables with `CREATE INDEX CONCURRENTLY` (§11.5).

---

## 14. Constraints & referential integrity

- Model integrity in the database first: `NOT NULL`, `CHECK`, `UNIQUE`, `FOREIGN KEY`, and `EXCLUDE` (with `btree_gist`, e.g., no-overlap date ranges).
- **Tenant-scoped uniqueness** includes `tenant_id`: `unique (tenant_id, code)` (as a partial unique index when soft delete applies).
- **`ON DELETE` behavior — default to `RESTRICT`/`NO ACTION`.** This prevents accidental mass deletes and preserves integrity. Use `CASCADE` **only** for true ownership (a child that has no meaning without its parent, e.g., order lines under an order). Use `SET NULL` for optional references (e.g., `created_by`). Every FK states its `ON DELETE` behavior explicitly — never leave it implicit.
- **Prefer soft delete + explicit cleanup jobs** over hard `CASCADE` for business entities, so deletions are auditable and reversible.
- `CHECK` constraints encode invariants that must always hold (non-negative amounts, valid status values, date orderings like `end_at >= start_at`).

---

## 15. Functions, triggers, RPC

- **`SECURITY DEFINER` functions MUST pin `search_path`.** Set `set search_path = ''` and fully-qualify every object reference (or set an explicit, minimal path). An unpinned `search_path` on a definer function is a privilege-escalation vector and will be flagged by Supabase's linter. This is non-negotiable.
- Default to `SECURITY INVOKER` (the caller's privileges and RLS apply). Use `SECURITY DEFINER` only when elevation is genuinely required, and keep those functions small, reviewed, and narrowly granted.
- Mark function volatility correctly (`IMMUTABLE` / `STABLE` / `VOLATILE`) so the planner can optimize and so functions are safe in index expressions and RLS.
- **Triggers** are for invariants and bookkeeping that must always happen regardless of the writing path: `updated_at` maintenance, audit capture, denormalized counters. Keep meaningful business logic in the application; do not hide surprising behavior in triggers. Every trigger is documented in the data dictionary.
- **Dynamic SQL:** any function that builds SQL from variable identifiers must validate those identifiers against a known registry and quote them with `quote_ident` / `format(%I)`. **Never** interpolate user-supplied text into SQL. No runtime `EXECUTE` of DDL derived from user input (§17, §20).
- **RPCs** validate all inputs, respect RLS, and are `SECURITY INVOKER` unless elevation is required and reviewed.

---

## 16. Audit & history

- Maintain an append-only `core.audit_log` capturing: `id`, `tenant_id`, `table_name`, `row_id`, `action` (`insert`/`update`/`delete`), `changed_by`, `changed_at`, and `old_data`/`new_data` as `jsonb`. Populate it via triggers on sensitive tables (finance, grants, procurement, approvals, user/role changes).
- The audit log is **append-only**: no updates or deletes to audit rows in normal operation. Grant `jaago_app` `INSERT`/`SELECT` only.
- **Do not store secrets in the audit log.** PII redaction in audit data follows the same discipline as the log pipeline: redaction is scoped and structural, applied to free-text fields only, and **never** mangles identifier fields (e.g., UUIDs must pass through intact). Identifier columns are excluded from any pattern-based redaction.
- For financial/grant records where immutability matters, model posted entries as an **append-only ledger** (no in-place updates to posted lines; corrections are new reversing entries). This gives a defensible audit trail for a compliance-sensitive NGO context.

---

## 17. Studio-lite extensibility

Two mechanisms, both **governed** — neither ever issues raw DDL from the browser.

### 17.1 Custom fields (the `ext jsonb` column)

- Custom fields live in the host table's `ext jsonb` column.
- A **metadata registry** in `core` (e.g., `core.custom_field_defs`) declares, per tenant and entity, the allowed keys, their types, and validation rules.
- The **application validates `ext` against the registry** on write. Optionally enforce a database `CHECK` using a JSON-schema validation function for critical entities.
- Index `ext` with GIN only when it is actually queried by containment.

### 17.2 Custom entities (governed table generation)

- When a tenant needs a genuinely new entity, the custom-entity generator emits **real migration SQL** into `supabase/migrations/` and routes it through the **same review → validate → approve → apply** pipeline as any other change (§3, §12).
- Generated tables receive the **full standard treatment automatically**: standard columns (§7), RLS (§9), grants (§10), FK indexes (§13), `updated_at` trigger (§15).
- **All identifiers are validated** against the registry and safely quoted. There is **no** runtime dynamic DDL, no `EXECUTE` of user-derived schema statements, and no path by which a browser request mutates the schema directly.

---

## 18. Logger project standards

The logger project follows this standard with these deltas:

- **Append-optimized.** Log tables are write-mostly. Partition by time (e.g., monthly range partitions) so retention is dropped by detaching/dropping old partitions cheaply.
- **BRIN index on `created_at`** (and other monotonic columns) rather than large B-trees — ideal for append-only time-series.
- **Retention/rotation** enforced (~1 GB threshold and/or age-based), implemented as a scheduled job that drops old partitions. Retention policy is documented and version-controlled.
- **Redaction is upstream.** Sensitive data is redacted by the log pipeline before it is written; the database does not receive raw secrets. Redaction is structural and scoped to free-text fields, never identifier fields.
- **Access is backend-only.** RLS is still enabled (default-deny), but the logger is not a tenant-facing surface; only backend/admin roles read it.
- **No cross-project joins.** Correlation to transactional data is by ID at the application layer.

---

## 19. Performance & connection management

- **Connection pooling:** the runtime uses the Supabase pooler (Supavisor) in **transaction mode** for many short-lived connections. In transaction mode, **disable prepared statements** in the client (e.g., Drizzle/postgres.js `prepare: false`) or you will hit errors; use a **direct/session-mode** connection for migrations and for workloads that need prepared statements.
- **Migrations connect directly** (session mode / direct port), not through the transaction-mode pooler.
- **Set bounded `statement_timeout`** for the runtime role so a pathological query can't pin a connection indefinitely; backfills that need longer run as separate, controlled jobs.
- **Performance targets (context):** align with the platform SLOs — cached read paths are expected to be fast; keep hot queries index-covered and avoid N+1 access patterns at the application layer.
- Review slow queries with `pg_stat_statements`; add/adjust indexes via migration, not ad hoc.

---

## 20. Prohibited actions (hard "no")

Antigravity AI must **never** do any of the following:

1. Expose the `service_role` key (or any superuser credential) to the frontend, embed it in a client bundle, or return it in a browser-reachable response.
2. Have the browser connect to Supabase/Postgres directly for writes, or move any write path outside the API.
3. Generate SQL from a bare user request **without** first running the architecture audit and reconciliation (§3).
4. Create a duplicate table, column, or relationship for a concept that already exists.
5. Edit a migration that has already been applied to any shared environment.
6. Perform a destructive change (drop table/column, `TRUNCATE`, type change, rename in place) without an approved expand/contract plan **and** a confirmed backup.
7. Disable RLS on a tenant-sensitive table, or create a tenant-sensitive table without policies in the same migration.
8. Write a `SECURITY DEFINER` function without a pinned `search_path`.
9. Store money as `float`/`double precision`, or store timestamps as `timestamp` without time zone.
10. Run `DELETE` or `UPDATE` without a `WHERE` clause, or an unbounded single-statement backfill on a large table.
11. Hardcode secrets or credentials in migration files, seed files, or the repository.
12. Grant `ALL`, grant to `PUBLIC`, or grant table privileges to `anon`.
13. Build or execute dynamic DDL from user input, or issue schema changes from a runtime request path.
14. Install extensions into `public`, or modify Supabase-managed schemas (`auth`, `storage`, etc.).
15. Apply a migration to production that has not passed the §12 validation gate.

---

## 21. Change management workflow (agent operating procedure)

For any database task, follow this loop and **stop at the approval gate**:

```
1. AUDIT
   - Run the §22 toolkit against the target project.
   - Produce a report: schemas, tables (+ sizes/rows), columns, FKs, indexes,
     RLS status, policies, grants, functions (+ security/search_path), triggers, enums.

2. RECONCILE
   - Map the request onto existing structures.
   - State clearly whether the concept already exists.
   - If it exists: plan to REUSE/EXTEND. If not: justify the new structure.
   - Explicitly confirm: "No duplicate of an existing concept is being created."

3. PROPOSE  ← APPROVAL GATE (do not write/apply SQL before human approval)
   - Migration list (filenames + intent).
   - Expand/contract steps for any destructive/blocking change.
   - RLS policies, grants, indexes to be added.
   - Lock & risk analysis (which locks, on which tables, expected duration).
   - Rollback/mitigation plan and backup requirement.

4. IMPLEMENT
   - Write versioned SQL under supabase/migrations/ per §6, §7, §9–§15.
   - Update the Drizzle schema to match (§11.6).

5. VALIDATE (§12)
   - supabase db reset (clean apply) → supabase db diff (no drift) → tests
     (incl. RLS §9.5) → lint/review (§23) → staging apply + smoke.

6. APPLY (§12)
   - Confirm backup/PITR. Set lock_timeout. Apply to production
     (maintenance window if heavy). Verify post-apply.

7. RECORD
   - Update data dictionary / schema registry and ADR (§24).
```

---

## 22. Database audit toolkit (ready-to-run introspection)

Run these against the target project during **AUDIT**. They read catalog/`information_schema` only and change nothing.

```sql
-- 22.1 Schemas (excluding system)
select schema_name
from information_schema.schemata
where schema_name not in ('pg_catalog','information_schema','pg_toast')
order by 1;

-- 22.2 Tables with row estimates and size
select n.nspname as schema, c.relname as table,
       c.reltuples::bigint as est_rows,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname not in ('pg_catalog','information_schema')
order by pg_total_relation_size(c.oid) desc;

-- 22.3 Columns
select table_schema, table_name, ordinal_position,
       column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema not in ('pg_catalog','information_schema')
order by table_schema, table_name, ordinal_position;

-- 22.4 Foreign keys (with on delete/update rules)
select tc.table_schema, tc.table_name, kcu.column_name,
       ccu.table_schema as ref_schema, ccu.table_name as ref_table,
       ccu.column_name as ref_column,
       rc.delete_rule, rc.update_rule, tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema   = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema    = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
order by 1, 2, 3;

-- 22.5 Indexes
select schemaname as schema, tablename as table,
       indexname, indexdef
from pg_indexes
where schemaname not in ('pg_catalog','information_schema')
order by 1, 2, 3;

-- 22.6 RLS enabled/forced status per table
select n.nspname as schema, c.relname as table,
       c.relrowsecurity  as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname not in ('pg_catalog','information_schema')
order by 1, 2;

-- 22.7 RLS policies
select schemaname as schema, tablename as table, policyname,
       roles, cmd, qual as using_expr, with_check
from pg_policies
order by 1, 2, 3;

-- 22.8 Table grants
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema not in ('pg_catalog','information_schema')
order by 1, 2, 3, 4;

-- 22.9 Functions with security type and pinned search_path
select n.nspname as schema, p.proname as function,
       pg_get_function_identity_arguments(p.oid) as args,
       case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security,
       (select option_value
          from pg_options_to_table(p.proconfig)
         where option_name = 'search_path') as search_path
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog','information_schema')
order by 1, 2;

-- 22.10 Triggers
select event_object_schema as schema, event_object_table as table,
       trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
order by 1, 2, 3;

-- 22.11 Enums (native)
select n.nspname as schema, t.typname as enum_type,
       string_agg(e.enumlabel, ', ' order by e.enumsortorder) as values
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
group by 1, 2
order by 1, 2;

-- 22.12 Tables MISSING RLS (tenant-sensitive candidates to review)
select n.nspname as schema, c.relname as table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname not in ('pg_catalog','information_schema','auth','storage','extensions')
  and c.relrowsecurity = false
order by 1, 2;

-- 22.13 Foreign key columns MISSING an index (performance/lock risk)
select c.conrelid::regclass as table, a.attname as fk_column
from pg_constraint c
join lateral unnest(c.conkey) as k(attnum) on true
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
where c.contype = 'f'
  and not exists (
    select 1 from pg_index i
    where i.indrelid = c.conrelid
      and k.attnum = any (i.indkey)
  )
order by 1, 2;
```

---

## 23. Review checklists

### 23.1 Pre-migration checklist
- [ ] Architecture audit run; report produced (§22).
- [ ] Reconciliation done; **no duplicate** of an existing concept.
- [ ] Change plan approved by a human owner.
- [ ] Migration filename correct (`<timestamp>_<desc>.sql` under `supabase/migrations/`).
- [ ] One cohesive change; table ships with constraints + indexes + RLS + grants + triggers.
- [ ] Destructive/blocking changes use expand/contract; nothing renamed/dropped in place.
- [ ] `lock_timeout` set for changes to existing large tables.
- [ ] FK columns indexed; RLS-referenced columns indexed.
- [ ] Large-table indexes planned as `CONCURRENTLY` (non-transactional, flagged).
- [ ] No `DELETE`/`UPDATE` without `WHERE`; backfills batched.
- [ ] Drizzle schema updated to match.

### 23.2 RLS checklist
- [ ] RLS **enabled** on every tenant-sensitive table (default-deny).
- [ ] One policy per command; `TO <role>` specified.
- [ ] Helper calls wrapped in `(select …)`.
- [ ] `WITH CHECK` present on `INSERT`/`UPDATE` to block cross-tenant writes.
- [ ] Verified: tenant A cannot read/write tenant B; no context → zero rows.

### 23.3 Security checklist
- [ ] `service_role`/superuser not exposed to frontend anywhere.
- [ ] Runtime connects as `jaago_app` (no `BYPASSRLS`, no DDL).
- [ ] `SECURITY DEFINER` functions pin `search_path`.
- [ ] No secrets in migrations/seeds/repo.
- [ ] No grants to `PUBLIC`/`anon`; least privilege only.
- [ ] Extensions in `extensions` schema; Supabase-managed schemas untouched.
- [ ] Backup/PITR confirmed before production apply.

---

## 24. Data dictionary & governance

- Maintain a **data dictionary** (per table: purpose, columns, meanings, constraints, RLS intent, triggers, owning module) alongside this file, updated with every migration.
- Keep an **ERD** for each domain schema, regenerated when the schema changes.
- Record **architectural decisions as ADRs** (e.g., "tenancy is row-level via `tenant_id` + RLS," "amounts stored as `numeric(20,4)` with separate currency," "reference tables over native enums"). ADRs are versioned with the code.
- This standard is a **living constitution**: changes to the rules themselves are proposed, reviewed, and versioned here, with the change noted in the changelog below.

---

## Changelog

| Version | Date | Change |
|---|---|---|
| 1.0 | (set on adoption) | Initial standard. |

---

*End of DATABASE-STANDARD.md*
