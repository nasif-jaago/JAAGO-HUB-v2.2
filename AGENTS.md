# JAAGO-HUB Development Guidelines & Standards

## Zero-Anomaly Reference Standard
All module development in this codebase must strictly adhere to the [Zero-Anomaly Design Standard](file:///d:/JAAGO-HUB-v2.2/.agents/rules/zero-anomaly-design-standard.md), benchmarked against **`People & Culture — Employee Directory (/pnc/employees)`**.

### Core Constraints
1. **Semantic Design Tokens Only:** Never hardcode hex colors (`bg-[#...]`, `text-white`, `border-white/10`). Use Tailwind CSS variables (`bg-background`, `bg-sidebar`, `text-foreground`, `text-sidebar-foreground`, `border-sidebar-border`, `primary`).
2. **Tri-Theme Fidelity:** Components must render with high contrast across Light Mode (`:root`), Dark Mode (`.dark`), and Espresso Mode (`.espresso`).
3. **No Broken Connections or Links:** Always maintain active Supabase PostgREST connections and seamless route forwarders for consolidated paths.
4. **State & Caching Integrity:** Use `fetchWithCache` from `@/lib/data-cache` with cross-tab invalidation. Guard browser APIs with `if (typeof window === 'undefined') return;`.
5. **Zero Type Errors:** Run `npm run typecheck` across the monorepo to guarantee 0 errors.
6. **Mandatory Null & Undefined Prevention & Root-Cause Resolution:**
   - **Fix Root Causes, Never Hide Errors:** Never mask underlying bugs with superficial band-aids or silent catch-all swallows. Always resolve the source of invalid states, broken contracts, or missing data.
   - **Defensive Property Access:** External APIs, PostgREST payloads, route parameters, and store states can return `null` or `undefined`. Always provide explicit null guards and safe fallbacks.
   - **Safe String & Array Chaining:** Never execute `.split()`, `.replace()`, `.trim()`, or `.toUpperCase()` on unguarded strings or element accesses (e.g., `arr[0]`). Use validated helper functions like `getInitials()`.
   - **Safe Number & Date Formatting:** Never call `.toFixed()`, `.toLocaleString()`, or `.getTime()` without validating that the number is finite and the date is valid (`!isNaN(date.getTime())`).
7. **Strict Database Security & Zero-Vulnerability RLS Standard:**
   - **Zero Anonymous Write Access:** Never grant the `anon` role `INSERT`, `UPDATE`, or `DELETE` permissions on any database table.
   - **Sensitive Data Isolation:** Tables storing personal employee information, financials, salaries, attendance records, biometric logs, or system audits must restrict access strictly to `authenticated` and `service_role`.
   - **Views Must Use Security Invoker:** Every Postgres view in public schema must be declared with `WITH (security_invoker = true)` to enforce querying user RLS.
   - **Explicit Two-Tier Policies:** Every table must define clear boundaries for `service_role` (server APIs & background workers) and `authenticated` (logged-in staff/admins).
   - **Zero Data Loss & Connection Safety:** All migrations must be non-destructive and maintain active live connectivity without breaking existing application routes or sessions.
