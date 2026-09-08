# Zero-Anomaly Module Design & Architecture Standard

**Reference Benchmark Module:** `People & Culture — Employee Directory (/pnc/employees)`  
**Monorepo:** JAAGO-HUB v2.2  
**Scope:** All new and existing modules in `apps/web`, `apps/worker`, `modules/*`, and `packages/*`

---

## 1. Zero Broken Connections & Link Preservation
* **Canonical Routing:** Never build duplicate, divergent screens for the same business domain. Maintain a single canonical route.
* **Backward Compatibility:** When consolidating legacy routes (e.g. `/hr/employees`), always provide seamless aliases or router forwarders so that existing bookmarks, external links, and deep links never return 404 or drop connection.
* **Database & PostgREST Integrity:** Direct queries must always respect Supabase PostgREST schemas and maintain verified active connections.

---

## 2. Design System & Tri-Theme Contrast Standard
* **No Arbitrary Hex Hardcoding:** Never hardcode arbitrary hex colors (such as `bg-[#090C10]`, `bg-[#23170E]`, `text-white`, or `border-white/10`).
* **Semantic Design Tokens:** All components must strictly use semantic CSS variables mapped in Tailwind:
  * **Surfaces:** `bg-background`, `bg-surface`, `bg-card`, `bg-sidebar`, `bg-header`, `bg-elevated`
  * **Typography:** `text-foreground`, `text-sidebar-foreground`, `text-muted-foreground`, `text-sidebar-muted`, `text-primary`
  * **Borders:** `border-border`, `border-sidebar-border`, `border-header-border`
  * **Brand & Accents:** `primary`, `brand`, `accent`, `warning`, `destructive`, `success`
* **Tri-Theme Fidelity:** Every screen, table, modal, and drawer must look crisp and high-contrast in:
  1. **Light Mode** (`:root` — Warm Parchment)
  2. **Dark Mode** (`.dark` — Matte Black)
  3. **Espresso Mode** (`.espresso` — Rich Coffee)
* **Cross-Shell Synchronization:** All layout components must listen to and dispatch `jaago_theme_changed` so switching themes reflects across all shells and tabs instantly.

---

## 3. State, Caching & SSR Hydration Standard
* **No `localStorage` Split-Brain:** Never store business records in raw `localStorage` as a primary data store. Live API data from Supabase must always take precedence over offline fallbacks.
* **Universal SWR Cache:** Use `fetchWithCache` from `@/lib/data-cache` with in-flight deduplication.
* **SSR Hydration Safety:** Always guard browser APIs with `if (typeof window === 'undefined') return;` at the root of client effects to prevent React hydration mismatch errors.
* **Multi-Tab Invalidation:** Any mutation (create, update, delete, archive, sync) must call `invalidateCache(key)` to purge both memory cache and local storage, and broadcast `jaago_cache_invalidated` across tabs.

---

## 4. Multi-Process Architecture & Background Queue
* **Cross-Process Awareness:** In production, do not assume Next.js API routes share memory with standalone worker processes. Cross-process jobs must be brokered via Redis (`REDIS_URL` or `UPSTASH_REDIS_REST_URL`).
* **Strict Type Safety:** All module changes must pass `npm run typecheck` across all 26 monorepo workspaces with 0 errors before release.
