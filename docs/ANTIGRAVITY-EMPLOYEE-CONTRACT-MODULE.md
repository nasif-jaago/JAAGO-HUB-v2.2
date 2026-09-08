# ANTIGRAVITY BUILD PROMPT — Employment Contract Module (`hr/contracts`)

**Status:** Amendment to the JAAGO HUB Master Constitution. Not a standalone spec.
**Module owner surface:** Human Resources → Employment Contracts (Contract Register + Contract Document).

---

## 0. How to read this prompt (read before writing any code)

You are extending an existing, governed codebase — you are **not** starting a greenfield app.

1. **Read first, in order:** the Master Prompt / Constitution → `DATABASE-STANDARD.md` → `ANTIGRAVITY-CASL-RBAC-PROMPT.md` → this document. If any conflict exists between this document and the Constitution or `DATABASE-STANDARD.md`, **the Constitution wins** and you must **stop and report** the conflict rather than resolving it yourself.
2. **Restate the invariants** (Section 2 below) back in your working notes before writing code, so it is on record that you are building within them.
3. **Audit the integration points** you depend on (employee profile table, assignment/department/project tables, organisation/entity field, the `@/core/authorization` guard, the `@/core/mailer` interface, the documents module). If any of these do not exist yet or diverge from what this prompt assumes, **halt at the stop-and-reconcile gate** and report before proceeding.
4. **Do not implement anything in Section 12 (Open Decisions)** until the operator confirms each decision. These are load-bearing choices that would otherwise be baked silently into migrations and business logic.
5. Stop at every **phase checkpoint** (Section 11) and wait for confirmation.

---

## 1. What we are building

Two connected surfaces inside HR:

- **Contract Register** — an Excel-grade, filterable, groupable **and pivotable** table of every employee’s **currently-effective** employment contract. Columns: Employee Name, Employee ID, Department, Project, Effective Date, Start Date, End Date, Contract Type, Working Schedule, plus a **derived** Status. A pivot (cross-tab) view produces counts of contracts across any two dimensions (e.g. Department × Contract Type).
- **Contract Document** — a legal-document rendering of a single contract on the correct **JAAGO Foundation / JAAGO Foundation Trust** letterhead (chosen from the employee’s organisation field), printable / exportable to PDF.

The presentational React component (`ContractRegister.jsx`) and the document template (`employee-contract-template.html`) have already been delivered. Your job is the **data model, derivation logic, API, authorization, and PDF pipeline** behind them, then wiring the UI to real endpoints.

> **Terminology note for the operator:** this module is “Contract” (employment contract), read from the phrase “employees contact form … effective date, start date, end date, contact Type, working Schedule … legal document … pad pdf print.” If the intent was communication/contact details, stop — this is the wrong module.

---

## 2. Invariants you inherit (restate these before coding)

1. **Engineering priority order:** Data integrity → Security → Authorization → Correctness → Performance → Maintainability → Convenience. When two pulls conflict, resolve in this order.
2. **One source of truth, derived states.** Employee Name, Employee ID, Department, Project, and organisation/**entity** are **owned by the employee profile / assignment tables**. The contract table must **not** store editable copies of them. The register resolves them by JOIN at read time. (See Open Decision 1 for the point-in-time exception.)
3. **Never store computed values as independent editable records.** Contract **Status** (Active / Expiring / Ended / Upcoming) is produced by **one deterministic function** — `deriveContractStatus()` — server-side, at read time. It is never a column.
4. **All browser traffic routes through the NestJS API.** No direct Supabase client calls from the browser. The React register calls `/api/v1/contracts…`, never PostgREST.
5. **RBAC (CASL) + RLS as defense-in-depth.** Every endpoint is gated by the custom `@/core/authorization` guard. RLS on the contract tables is enforced by the least-privilege `jaago_app` role (no `BYPASSRLS`), per `DATABASE-STANDARD.md`.
6. **Plain TypeScript under `@/core/*` and `@/shared/*`.** No workspace symlinks, no monorepo packages. `nest build && tsc-alias` rewrites all path aliases before deploy — non-negotiable.
7. **Migration discipline + audit logging** per `DATABASE-STANDARD.md`: audit → reconcile → propose → implement → validate → apply → record. Every contract create/amend/terminate writes to the audit log.

---

## 3. Domain model

### 3.1 Contracts are versioned (this is the core modelling decision)

An employee’s employment relationship changes over time — renewals, extensions, promotions, transfers, schedule changes. Each such change is a **new contract version**, distinguished by its **Effective Date**. We therefore model contracts as an **append-oriented version history**, not a single mutable row.

- `hr_contract` — one row **per contract version** per employee.
- The **currently-effective** version for an employee, as of a date `D`, is the version with the greatest `effective_date <= D` that has not been superseded and whose window covers `D`.
- The Register shows **current-effective per employee** by default (`scope=current`), with a toggle to show **full history** (`scope=history`).

This directly satisfies invariant 3 (Effective Date is a real, owned field; “which contract is current” is **derived**, never stored as a flag that can drift).

### 3.2 `hr_contract` — owned fields only

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `tenant_id` | uuid | RLS scoping (per `DATABASE-STANDARD.md`) |
| `employee_id` | uuid fk → `hr_employee` | the person |
| `contract_no` | text | human ref, e.g. `JF/HR/CON/2026/0142` (see Open Decision 4) |
| `contract_type` | enum | `permanent \| fixed_term \| probationary \| consultant \| intern \| project_based` |
| `working_schedule` | enum | `full_time \| part_time \| shift_based \| flexible` |
| `effective_date` | date | when THIS version takes effect (drives versioning) |
| `start_date` | date | employment start |
| `end_date` | date null | null ⇒ open-ended (permanent). Fixed/project ⇒ required |
| `project_assignment_id` | uuid fk null | link to assignment IF project is a point-in-time fact (see Open Decision 1) |
| `supersedes_id` | uuid fk null | previous version this one replaces |
| `superseded_at` | timestamptz null | set when a newer version is created |
| `document_id` | uuid fk null | link to generated PDF in the documents module |
| `status_lifecycle` | enum | **NOT the derived Status.** Governance state: `draft \| issued \| active \| terminated \| expired \| cancelled`. See 3.4 |
| standard audit cols | | `created_at/by`, `updated_at/by` per Constitution |

> **Do NOT add** columns for employee name, employee ID display, department, or project text. Those are resolved from the profile. (Exception: Open Decision 1.)

### 3.3 Derived, never stored

`deriveContractStatus(contract, asOf)` — single deterministic function in `@/core/hr/contracts` (mirror it in the UI byte-for-byte):

```
start > asOf                          → "Upcoming"
end == null                           → "Active"
end < asOf                            → "Ended"
0 < (end - asOf) <= EXPIRY_WINDOW_DAYS → "Expiring"   // EXPIRY_WINDOW_DAYS = 60 (config)
else                                  → "Active"
```

`resolveCurrentContract(employeeId, asOf)` — returns the current-effective version by the rule in 3.1. Also deterministic; unit-test it against the worked examples in Section 10.

### 3.4 Two different “status” concepts — keep them separate

- **`status_lifecycle`** (stored) = *governance/workflow* state a human sets: is this version a draft, formally issued, terminated early, cancelled? This is legitimate owned state.
- **Derived Status** (computed) = *time-based* state shown in the Register (Active/Expiring/Ended/Upcoming), a pure function of dates + `asOf`.

Never collapse these into one column. An early **termination** (`status_lifecycle = terminated`) overrides the time-derived status in the Register (a terminated contract reads “Ended” regardless of `end_date`); encode that precedence in `deriveContractStatus`.

---

## 4. Enumerations (confirm with operator — Open Decision 3)

- **Contract Type:** Permanent, Fixed-Term, Probationary, Consultant, Intern, Project-Based.
- **Working Schedule:** Full-Time, Part-Time, Shift-Based, Flexible.

Seed as reference/lookup rows (not hard-coded strings scattered in logic). If JAAGO uses different categories (e.g. “Daily-wage / Casual”, “Secondment”), stop and confirm before migrating.

---

## 5. API surface (NestJS on Fastify, all CASL-gated)

All under `/api/v1/contracts`. All responses resolve profile-owned fields by JOIN.

| Method | Path | Purpose | CASL action |
|---|---|---|---|
| GET | `/contracts?asOf&scope=current\|history&group&filters…` | Register list; server does the join + derivation | `read` Contract |
| GET | `/contracts/pivot?rowDim&colDim&asOf&filters…` | Cross-tab counts (see §6.2) | `read` Contract |
| GET | `/contracts/:id` | Single contract (+ resolved profile fields) | `read` Contract |
| GET | `/contracts/:id/document?format=html\|pdf` | Render legal document (see §9) | `read:document` Contract |
| GET | `/contracts/export.xlsx?…` | Server-generated Excel of the current filter/group | `export` Contract |
| POST | `/contracts` | Create a new contract **version** (sets supersedes/superseded) | `create` Contract |
| PATCH | `/contracts/:id/lifecycle` | Change `status_lifecycle` (issue / terminate / cancel) | `manage:lifecycle` Contract |

Rules:
- **Server computes derived Status and current-effective resolution.** The client never decides these; it only renders.
- **Creating a version is transactional:** insert new row + set `supersedes_id`/`superseded_at` on the prior current version + write audit log, in one DB transaction under the tenant GUC context.
- **No hard deletes** of contract versions (legal record). “Remove” = `status_lifecycle = cancelled`.
- Filtering/grouping params are validated against an allow-list (no free-form column injection into SQL).

---

## 6. Register + Pivot behaviour (matches the delivered UI)

### 6.1 Register (detailed grid)
- Default `scope=current`, `asOf=today`. Group-by dimension is one of: None, Department, Project, Contract Type, Working Schedule, Status, Entity.
- Server returns rows already carrying the **resolved** name/ID/department/project/entity + the **derived** status, so the client does no business logic.
- KPI strip: total, Active, **Expiring ≤ 60 days** (the triaged “needs attention” metric), Ended, and Foundation/Trust split — all derived server-side and returned in a `summary` block so the numbers can never disagree with the rows.

### 6.2 Pivot (cross-tab)
- `GET /contracts/pivot?rowDim=Department&colDim=Contract%20Type` returns `{ rows[], cols[], cells[rowKey][colKey]=count, rowTotals, colTotals, grand }`.
- Dimensions allowed: Department, Project, Contract Type, Working Schedule, Entity, Status. Both dims validated against the allow-list.
- This is the “Excel pivot table view”: counts of contracts across two chosen dimensions, with row/column totals. (A full drag-and-drop pivot with measures beyond count is **out of scope for v1** — see Open Decision 6.)

---

## 7. Authorization matrix (CASL) — contracts are sensitive

Anchor to real JAAGO domain roles (per the CASL prompt — do not invent generic roles). Baseline:

| Capability | HR Admin / People Ops | Line Manager | Finance (read) | Employee (self) |
|---|---|---|---|---|
| Read register (all) | ✅ | scoped to their reports | ✅ (no remuneration) | ❌ |
| Read own contract | — | — | — | ✅ (own only) |
| Read contract document (PDF) | ✅ | reports only | ❌ | own only |
| Create / amend version | ✅ | ❌ | ❌ | ❌ |
| Change lifecycle (issue/terminate) | ✅ (may need second approver) | ❌ | ❌ | ❌ |
| Export | ✅ | ❌ | ❌ | ❌ |

- Remuneration (Annexure A) is a **separate authorization scope** from the contract body. Finance/managers may read a contract without seeing salary. Enforce at the field/endpoint level, not just the row level.
- RLS mirrors this as defense-in-depth: `jaago_app` role, tenant GUC, self-access predicate for the employee-self case.
- **Confirm the exact role names** against the CASL module before writing abilities (Open Decision 3).

---

## 8. UI wiring (from mock → live)

`ContractRegister.jsx` is presentational with mock data. To wire it:
1. Replace `EMPLOYEES` with `GET /contracts?asOf&scope&…`; feed the server `summary` block into the KPI strip instead of recomputing.
2. Replace the client `deriveStatus` **only as a display mirror** — the authoritative value comes from the server; keep the client function identical for optimistic render and test parity.
3. Pivot view → `GET /contracts/pivot`.
4. Row actions “View / Print” → open `/contracts/:id/document` (the HTML template) → its Print button, or request `?format=pdf`.
5. “New Contract” → form → `POST /contracts`. “Export” → `GET /contracts/export.xlsx`.
6. Port plain-Tailwind classes to shadcn/ui primitives; JAAGO design tokens already map (gold = brand chrome only; emerald/amber/rose/sky = data semantics).

---

## 9. Contract Document → PDF pipeline

The delivered `employee-contract-template.html` is the **single source of truth for the layout**. The letterhead switches on the employee’s organisation field (`foundation` → JAAGO FOUNDATION, `trust` → JAAGO FOUNDATION TRUST), including legal name, registration lines, address, reference prefix, and signature block.

**Rendering approaches (pick per Open Decision 2):**
- **v1 (client print):** serve the template populated with real data; user prints / saves PDF via the browser. Simplest, zero server dependency. Weakness: not an archived, tamper-evident record.
- **v2 (server render, recommended for a legal record):** render the same HTML to PDF **server-side** and store the artifact in the documents module, linked via `hr_contract.document_id`, with a hash for integrity. Client “Print” becomes a convenience.

> **Deployment constraint (flag, do not ignore):** the stack deploys to **cPanel/Passenger, native Node, no Docker**. Headless-Chromium (Puppeteer/Playwright) needs a Chromium binary and system libs that are often unavailable/locked on shared cPanel hosting. Before committing to server-side render, **confirm the host can run a headless browser**; if not, choose a pure-Node HTML-to-PDF library or keep v1 client-print for launch and schedule v2. Report the finding at the checkpoint.

TODO fields in the template (`{{ORG_REG_NO}}`, address, phone, logo asset, probation months, NID, employee address) must be supplied by JAAGO before go-live.

---

## 10. Worked examples (required unit tests)

Use `asOf = 2026-09-07`, `EXPIRY_WINDOW_DAYS = 60`.

1. Permanent, start 2016-09-01, end null → **Active**.
2. Fixed-Term, start 2025-01-01, end 2026-10-15 → **Expiring** (38 days).
3. Fixed-Term, start 2025-06-01, end 2026-05-31 → **Ended**.
4. Project-Based, start 2026-10-01, end 2027-09-30 → **Upcoming** (starts in future).
5. Intern, start 2026-08-01, end 2026-10-31 → **Expiring** (54 days).
6. Fixed-Term with `status_lifecycle = terminated`, end_date 2027-02-28 → **Ended** (lifecycle overrides time).
7. `resolveCurrentContract`: employee has versions eff 2024-01-01 (superseded) and eff 2025-01-01 → current = the 2025 version for any `asOf ≥ 2025-01-01`.

---

## 11. Phase plan — STOP at every checkpoint

- **Phase 0 — Reconcile.** Read all governing docs; confirm the employee/assignment/organisation tables, CASL guard, documents module, mailer, and audit log exist and match assumptions. **CHECKPOINT: report the audit + any divergence. Do not migrate yet.**
- **Phase 1 — Data model + migrations.** `hr_contract`, enums/lookups, indexes (`employee_id`, `effective_date`, `end_date`, `tenant_id`), RLS policies via `jaago_app`. Migration follows `DATABASE-STANDARD.md` workflow. **CHECKPOINT.**
- **Phase 2 — Core logic.** `deriveContractStatus`, `resolveCurrentContract`, versioning/supersede transaction; full unit tests incl. Section 10. **CHECKPOINT.**
- **Phase 3 — Read API.** GET list (join + derive + summary), GET pivot, GET one; CASL read gates; remuneration scope separation. **CHECKPOINT.**
- **Phase 4 — Write API.** POST version (transactional), PATCH lifecycle, audit logging, no-hard-delete. **CHECKPOINT.**
- **Phase 5 — Document + PDF.** Populate template server-side; implement chosen PDF approach (Open Decision 2) after confirming host capability. **CHECKPOINT.**
- **Phase 6 — UI wiring + export.** Wire `ContractRegister.jsx`, pivot, document open; server `export.xlsx`. **CHECKPOINT.**
- **Phase 7 — Hardening.** Acceptance suite (Section 13), RLS negative tests, authz negative tests, `nest build && tsc-alias` clean, deploy_ready refresh. **FINAL CHECKPOINT.**

---

## 12. Open Decisions — DO NOT implement until the operator confirms each

1. **Point-in-time vs live-derived Department/Project.** The operator’s instruction is “all data from the Employee profile” → derive live. But a signed legal contract is a point-in-time record: if the employee later transfers department, should the historical contract document still show the department **as at signing**? If yes, we must snapshot Department/Project onto the version at issue time (a deliberate, justified exception to invariant 2, scoped to the legal document only) while the Register still shows live values. **Confirm: live everywhere, or snapshot-on-issue for the document?**
2. **PDF pipeline:** v1 client-print for launch, or v2 server-render + archive now? Gated on whether cPanel can run a headless browser (see §9).
3. **Enums + role names:** confirm the Contract Type / Working Schedule lists (§4) and the exact CASL role names + who may amend/terminate (§7). Is a **second approver** required to issue or terminate a contract?
4. **Contract numbering scheme:** format, per-entity prefix (JF / JFT), reset cadence (per year?), and whether it’s system-generated or entered by HR. Sample used: `JF/HR/CON/2026/0142`.
5. **Remuneration in-scope?** Does the contract module own/display salary (Annexure A), or is it a pure reference to the Payroll/Compensation module with field-level authorization?
6. **True pivot vs cross-tab.** v1 delivers count-based cross-tab (row × col). Is drag-and-drop multi-dimension pivot with measures beyond count required later?
7. **Retention & e-signature.** Retention period for terminated/expired contracts, and whether digital signature / approval workflow is a future phase (affects `status_lifecycle` and document integrity design).

---

## 13. Acceptance criteria (Phase 7 gate)

- [ ] No contract column stores a copy of employee name/ID/department/project (unless Open Decision 1 approves a scoped snapshot).
- [ ] Derived Status and current-effective resolution are computed **only** by the single functions; UI mirror matches server on all Section 10 cases.
- [ ] Creating a version is atomic (new row + supersede prior + audit) and never hard-deletes.
- [ ] All endpoints pass through the CASL guard; a manager cannot read a non-report’s contract; an employee can read only their own; remuneration scope is separately gated. RLS blocks the same access at the DB layer under `jaago_app`.
- [ ] The document renders the correct entity letterhead from the profile organisation field for both Foundation and Trust.
- [ ] Register KPIs are served from the same query as the rows (numbers cannot disagree).
- [ ] `nest build && tsc-alias` succeeds; `deploy_ready/` regenerated; smoke + migration scripts pass.
- [ ] Every Open Decision is either implemented as confirmed or explicitly deferred in writing.
