# JAAGO-HUB Development Guidelines & Standards

## Zero-Anomaly Reference Standard
All module development in this codebase must strictly adhere to the [Zero-Anomaly Design Standard](file:///d:/JAAGO-HUB-v2.2/.agents/rules/zero-anomaly-design-standard.md), benchmarked against **`People & Culture — Employee Directory (/pnc/employees)`**.

### Core Constraints
1. **Semantic Design Tokens Only:** Never hardcode hex colors (`bg-[#...]`, `text-white`, `border-white/10`). Use Tailwind CSS variables (`bg-background`, `bg-sidebar`, `text-foreground`, `text-sidebar-foreground`, `border-sidebar-border`, `primary`).
2. **Tri-Theme Fidelity:** Components must render with high contrast across Light Mode (`:root`), Dark Mode (`.dark`), and Espresso Mode (`.espresso`).
3. **No Broken Connections or Links:** Always maintain active Supabase PostgREST connections and seamless route forwarders for consolidated paths.
4. **State & Caching Integrity:** Use `fetchWithCache` from `@/lib/data-cache` with cross-tab invalidation. Guard browser APIs with `if (typeof window === 'undefined') return;`.
5. **Zero Type Errors:** Run `npm run typecheck` across the monorepo to guarantee 0 errors.
