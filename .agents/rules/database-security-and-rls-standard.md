# Database Security & Zero-Vulnerability RLS Standard

**Governing Objective:** Maintain 100% security against external manipulation, data exfiltration, or connection downtime across all Supabase schemas and PostgreSQL migrations.

---

## 1. Golden Rules for Every New SQL Module

### 1.1 Never Grant Anonymous Write Access
* **`anon` must NEVER receive `INSERT`, `UPDATE`, or `DELETE` on ANY table.**
* Under no circumstances should `TO anon, authenticated` be paired with `FOR ALL` or `WITH CHECK (true)`.

### 1.2 Two-Tier Policy Model (Non-Breaking Architecture)
Every new table must immediately enable Row Level Security and establish explicit two-tier policies:

```sql
ALTER TABLE public.your_new_table ENABLE ROW LEVEL SECURITY;

-- 1. Server APIs, Next.js route handlers, and cron sync workers
CREATE POLICY "your_table_service_role" ON public.your_new_table 
FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- 2. Authenticated logged-in staff and admins
CREATE POLICY "your_table_authenticated" ON public.your_new_table 
FOR ALL TO authenticated 
USING (true) WITH CHECK (true);
```

### 1.3 Public Metadata vs. Sensitive Data
* **Public Lookup Tables (e.g., `organizations`, `branches`, `shifts`):** May allow read-only access for anonymous initial page loads:
  ```sql
  CREATE POLICY "your_table_anon_read" ON public.your_new_table 
  FOR SELECT TO anon 
  USING (true);
  ```
* **Sensitive Tables (Employees, Payroll, Attendance, Leaves, System Logs):** Must **NEVER** define an `anon` policy. PostgreSQL will default to `DENY ALL` for anonymous outsiders.

### 1.4 Computed Views Require `security_invoker = true`
Every view created in the `public` schema must enforce caller permissions to satisfy the Supabase Linter and prevent RLS bypasses:

```sql
CREATE OR REPLACE VIEW public.your_view_name
WITH (security_invoker = true) AS
SELECT ... ;

GRANT SELECT ON public.your_view_name TO authenticated, anon;
```

### 1.5 Non-Destructive Migrations
* Never drop columns or tables without safe backward-compatible forward migrations.
* Never break existing PostgREST endpoints, column contracts, or API parameters used by live clients.
