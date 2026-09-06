# ANTIGRAVITY BUILD PROMPT — JAAGO PAY: Payroll Configuration & Calculation Engine

**Document type:** Constitutional amendment / module build specification
**Module:** `payroll` (JAAGO PAY)
**Status:** Governing prompt — read fully, restate invariants, then build in phases with hard checkpoints
**Depends on:** Master Prompt / Constitution (+ v2 extension pack), `DATABASE-STANDARD.md`, `ANTIGRAVITY-CASL-RBAC-PROMPT.md`, Attendance module spec, On-Duty (Field Work) module build prompt, Email/SMTP module build prompt

---

## §0 — HOW TO USE THIS PROMPT (READ FIRST)

You are the implementing agent (Antigravity AI). You are **not** authorized to start writing migrations, schema, or engine code until you have completed §0.1–§0.3 below.

### §0.1 Read-first set (mandatory)
Before writing a single line, read and hold in context:
1. The Master Prompt / Constitution and its v2 extension pack (three-app topology, deployment assembly, UI design system, performance budgets).
2. `DATABASE-STANDARD.md` in full (multi-tenant RLS, `jaago_app` least-privilege role, per-transaction tenant GUC, migration discipline, audit logging, and the **audit → reconcile → propose → implement → validate → apply → record** workflow).
3. `ANTIGRAVITY-CASL-RBAC-PROMPT.md` (custom NestJS CASL guard, permission subjects anchored to real domain modules).
4. The **Attendance** and **On-Duty** specs — Payroll *consumes* their deterministic outputs and must not re-derive them.

### §0.2 Stop-and-reconcile gate (mandatory)
Audit the actual repository against the locked stack (Next.js 15 App Router · NestJS on Fastify · BullMQ+Redis worker as a separate `apps/worker` service · Drizzle ORM · Supabase Postgres with RLS · Supabase Auth · CASL authorization · Pino/OTel logging · nodemailer via `@/core/mailer` · cPanel/Passenger native Node, no Docker · **mandatory `nest build && tsc-alias`** alias rewriting · Zustand for client-only UI state only).

**If the actual repo diverges from the locked stack in any way that affects this module, HALT and report the divergence before proceeding.** Do not silently adapt.

### §0.3 Restate-before-build (mandatory output)
Before Phase 1, produce the **Invariant Restatement** using the template in the Appendix. Do not proceed until it is complete and self-consistent. If anything in this prompt conflicts with the Constitution or `DATABASE-STANDARD.md`, the Constitution wins — flag the conflict in your restatement and stop.

---

## §1 — NON-NEGOTIABLE INVARIANTS

These bind every phase. Priority order (from the Constitution) governs all trade-offs:

> **Data integrity → Security → Authorization → Correctness → Performance → Maintainability → Convenience.**

1. **No browser-to-database.** All browser traffic routes through the NestJS API. No direct Supabase client calls from the browser for any payroll data. RBAC (CASL) in the API + RLS in Postgres are defense-in-depth; the `jaago_app` role has **no `BYPASSRLS`**.
2. **One source of truth with derived states.** While a payslip is `draft`, all line items and totals are **always recomputed** from source (contract snapshot + settings snapshot + worked-days + inputs) and are **never hand-editable**. See §13 for the finalized-payslip immutability rule (a finalized payslip is an immutable financial *record*, not a live computed column — this is not a violation of the derived-state rule; it is the required opposite of it).
3. **Money is never floating point in flight.** All monetary arithmetic uses a decimal type (see §3.3). No accumulation of JavaScript `number` for money. Rounding happens only at defined points with one declared policy.
4. **No arbitrary code execution.** Canonical rules are native TypeScript handlers (see §3.1). Raw stored strings are **never** passed to `eval`, `new Function(...)`, `vm.runInContext`, or any equivalent in the v1 engine. (Custom admin formulas are a deferred Tier-2 item, §18-D.)
5. **Deterministic & reproducible.** Given the same snapshotted inputs, the engine produces byte-identical output. Every finalized payslip pins the exact settings and rule set used (§3.2). A payslip computed under FY2024 rules must still reproduce FY2024 math after settings change.
6. **No silent zeros.** A rule that references an unevaluated rule code, or a rule whose handler is not registered, is a **hard error** at validation/config time — never a silent `0.0` at runtime (§3.4).
7. **Tenant-scoped everything.** Every table carries `tenant_id`; every query runs under the per-transaction tenant GUC; RLS enforced per `DATABASE-STANDARD.md`.
8. **Audit is mandatory.** Every calculation, status transition, and configuration change writes a structured, immutable audit trace (§8, §12) to the logger project.
9. **Internal capabilities live under `@/core/*` and `@/shared/*` as plain TypeScript source.** No workspace symlinks, no monorepo packages. `tsc-alias` runs on every build.
10. **Payroll owns no attendance logic.** It consumes Attendance/On-Duty derived records across a service boundary and injects the resulting deduction as an *input* (§9).

---

## §2 — MODULE SCOPE & BOUNDARIES

### §2.1 What this module owns
- Salary **structures**, **rule categories**, and the ordered set of **salary rules** (configuration).
- Finance-owned **payroll settings** (tax slabs, exemption caps, PF base, bonus %, minimum tax, etc.).
- **Employee salary profiles** (wage splits, PF, insurance, tax flags, bank details).
- The **calculation engine** (rule registry + pure helpers + execution lifecycle).
- **Pay runs**, **payslips**, **payslip lines**, **payslip inputs**.
- **Payslip PDF** and **bank advice** generation.
- Payroll **audit trace**.

### §2.2 What this module consumes (does not own)
- **Attendance / On-Duty derived records** for the period → to compute the attendance deduction (§9.1).
- **HR / Employee master** → identity, department, joining/contract dates, gender/demographic flags (the salary profile references the employee; it does not duplicate HR identity as the source of truth).
- **Approvals** → pay run and payslip approval workflow (§9.3).
- **`@/core/mailer`** → payslip dispatch (§9.4).

### §2.3 What this module exposes
- A read API for an employee to view **their own** finalized payslip only (§11).
- Aggregate pay-run totals to Finance/Reporting.

Namespace all payroll code under `@/core/payroll/*` (engine, registry, helpers, services) and `@/shared/payroll/*` (types shared with the frontend). API controllers live in the standard NestJS module path.

---

## §3 — ARCHITECTURAL HARDENING DECISIONS (BUILD EXACTLY THESE)

The source design (the two JAAGO PAY documents) is faithful on *business logic* but must be hardened on *execution model*. These decisions are binding and take precedence over any "sandboxed eval" wording in the source.

### §3.1 Rule execution = native handler registry (NOT eval)
- Implement a **rule registry** at `@/core/payroll/rules/registry.ts`. Each canonical rule is a registered handler:
  ```ts
  interface RuleHandler {
    code: string;                    // stable, e.g. 'GROSS_SALARY'
    categoryCode: CategoryCode;      // 'GROSS' | 'BASIC' | 'DED' | 'TAXABLE' | 'TAX' | 'BONUS' | 'NET' | ...
    dependsOn: string[];             // rule codes this handler reads from `rules`
    reads: ContextKey[];             // contract/settings/inputs fields it reads (for DAG + audit)
    compute(ctx: RuleContext): Decimal; // pure, deterministic, decimal-based
  }
  ```
- The DB row (`payroll_salary_rules`) stores **configuration only**: `sequence`, `category_id`, `amount_type`, `quantity`, `fixed_amount`, `percentage`, `percentage_based_on`, `appears_on_payslip`, `contributes_to_employer_cost`, `active`, and a `handler_code` (for `amount_type = 'code'`, must match a registered handler).
- `amount_type` resolution:
  - `fixed` → `fixed_amount` (fully data-driven; no code).
  - `percentage` → `(base × percentage) / 100`, base = category total or referenced rule total (data-driven; no code).
  - `code` → dispatch to the registered handler by `handler_code`. **An unregistered `handler_code` is a hard startup/validation error.**
- `formula_expression` **is retained on the row for documentation and future Tier-2 use but is NOT executed** in v1.

**Rationale:** preserves the configurable, ordered, category-driven design intent while removing arbitrary code execution — satisfying Security and Data integrity above Convenience.

### §3.2 Determinism via snapshotting (reproducibility)
At calculation time, the engine **snapshots into the payslip**:
- `settings_snapshot jsonb` — the exact effective settings used.
- `contract_snapshot jsonb` — the salary-profile/contract fields used.
- `worked_days_snapshot jsonb` — worked days/hours per work-entry type.
- `inputs_snapshot jsonb` — all applied inputs (including the computed `ATTENDANCE_DEDUCTION`).
- `rule_set_snapshot jsonb` — the ordered rules with their configuration as evaluated (sequence, code, category, flags).
- `calc_trace_ref` — id of the immutable audit trace (§8/§12).

Recalculating a `draft` re-snapshots. Recalculating a **finalized** (`approved`/`paid`/`locked`) payslip is **forbidden** (§13). This guarantees a payslip reproduces its own math for the full retention period regardless of later settings changes.

### §3.3 Monetary precision & rounding
- Use a single decimal implementation (`decimal.js`) wrapped in a thin `@/core/payroll/money.ts` module. Alternatively compute in integer poisha (1 BDT = 100 poisha). **Decide one and use it everywhere.**
- Storage: `numeric(12,2)` for per-employee amounts, `numeric(14,2)` for run aggregates. Currency is `BDT` (see §18-J for multi-currency).
- **One rounding policy**, applied only at declared rounding points. Recommended default: `ROUND_HALF_UP` at each rule's output and at final totals; document every rounding point. (Bankers' rounding vs half-up is an Open Decision, §18-C.)
- Never rely on `Math.round(x*100)/100` over accumulated floats.

### §3.4 Strict dependency validation (no silent zeros)
- Build the rule dependency DAG from each handler's `dependsOn`. At config-load/seed time, **validate**:
  - every `dependsOn` code exists and is `active`,
  - every dependency has a strictly lower `sequence`,
  - no cycles.
- A rule referencing an unevaluated/unregistered code is a **hard validation error**. The "lookup of an uncalculated rule returns `0.0`" behaviour from the source is retained **only** as a last-resort runtime guard that, if ever hit, emits a loud `ERROR`-level audit entry and marks the payslip `needs_review` — it must never be the normal path.

### §3.5 Failure isolation & idempotency (batch runs)
- One payslip per (`pay_run_id`, `employee_id`) — enforced by a unique constraint and an idempotency key.
- Each employee's payslip computes in its own transaction. One employee's failure **must not** corrupt the run or other payslips; failures are recorded and the run reports partial success with a reconcile step (§12).

---

## §4 — ENGINE EXECUTION LIFECYCLE

For an employee over `period_start … period_end`:

1. **Context initialization** — assemble the immutable `RuleContext`:
   - `contract` — salary-profile/contract fields (§8.5).
   - `settings` — effective global settings (§7), snapshotted.
   - `worked_days` — worked days/hours per work-entry type (from Attendance boundary, §9.1).
   - `inputs` — one-off bonuses, penalties, manual overrides, **and the precomputed `ATTENDANCE_DEDUCTION`** (§9.1). Attendance deduction is computed *before* the run and injected here; the engine does not compute it inline.
   - `categories` — accumulator keyed by category code (`BASIC, ALW, DED, TAXABLE, GROSS, NET, COMP, BONUS, REIMB, TAX`), all starting at decimal `0`.
   - `rules` — evaluated-rule accumulator keyed by rule code. Reads of an un-evaluated code trigger the §3.4 guard, not a silent `0`.
2. **Sequential evaluation** — fetch active rules for the payslip's `salary_structure_id` ordered by `sequence` ASC. For each rule:
   - Evaluate `condition_based_on` (`always_true` | `range` | boolean expression — expression conditions also go through native handlers, never eval).
   - Compute `amount` per `amount_type` (§3.1).
   - `total = amount × quantity`.
   - Store `rules[code] = total`; increment `categories[categoryCode] += total`; push to `computedLines`.
   - Append a step to the calc trace (rule code, inputs read, amount, quantity, total).
3. **Totals**:
   - `basic_wage` = evaluated `BASIC` (fallback: contract basic).
   - `gross_wage` = evaluated `GROSS_SALARY`.
   - `net_wage` = evaluated `NET_SALARY` (or `gross_wage − total_deductions`).
   - `employer_cost` = `(gross_wage − attendance_deduction) + Σ(rules where contributes_to_employer_cost)`.
4. **Persistence & audit** — write `payroll_payslip_lines`, update `payroll_payslips` (totals + snapshots + status `calculated`), write the immutable calc trace to the audit log.

---

## §5 — THE 19 CANONICAL SALARY RULES (REGISTRY HANDLERS)

Structure: **"JAAGO PAY with Attendance and Insurance_Deduction"** · Country: Bangladesh · Frequency: Monthly. This is the authoritative, complete rule set (the plain-language "1–18" note is a simplified staff explainer and is **not** the spec; where they differ, this table wins — in particular, `INSURANCE` and `ATTENDANCE_DEDUCTION` are in scope for v1, and `inputs.LATE` is an additional manual late override *on top of* the computed attendance deduction).

Implement each as a registry handler. The "Formula" column is the handler's decimal logic; reproduce it faithfully.

| Seq | Rule Name | Code | Category | Type | Handler logic (decimal) | On payslip | Employer cost |
|:--:|:--|:--|:--|:--|:--|:--:|:--:|
| 1 | Gross Salary | `GROSS_SALARY` | `GROSS` | code | `contract.wage ?? 0` | Yes | No |
| 2 | Basic Salary | `BASIC` | `BASIC` | code | `rules.GROSS_SALARY × ((settings.basic_salary_percentage ?? 50) / 100)` | Yes | No |
| 3 | Provident Fund | `PF` | `DED` | code | `contract.pf_rate × (settings.pf_base === 'GROSS' ? rules.GROSS_SALARY : rules.BASIC)` → round | Yes | **Yes** |
| 4 | Bonus (pro-rata festival) | `BONUS` | `BONUS` | code | `calculateBonus(rules.BASIC, contract.contract_start_date, payslip.period_end, contract.bonus_eligibility)` | Yes | No |
| 5 | Total Yearly Income | `TOTAL_YEARLY_INCOME` | `TAXABLE` | code | `calculateTYI(rules.GROSS_SALARY, contract.salary_jul_dec, contract.salary_jan_jun, contract.department, rules.BONUS)` | No | No |
| 6 | Tax Exemption 1 | `TAX_EXEMPTION` | `TAXABLE` | code | `TYI > 0 ? min(TYI / 3, settings.tax_exemption_limit_1 ?? 500000) : 0` | No | No |
| 7 | Remaining Taxable Income | `TAX_EXEMPTION_PART1` | `TAXABLE` | code | `max(0, TYI − TAX_EXEMPTION)` | No | No |
| 8 | Tax Exemption 2 (category) | `TAX_EXEMPTION2` | `TAXABLE` | code | `calculateTaxExemption2(TAX_EXEMPTION_PART1, contract.freedom_fighter, contract.disabled_third_gender, contract.gender === 'female', settings)` | No | No |
| 9 | Taxable Income | `TAXABLE_INCOME` | `TAXABLE` | code | `max(0, TYI − (TAX_EXEMPTION + TAX_EXEMPTION2))` | No | No |
| 10 | Total Tax Payable (slabs) | `TOTAL_TAX_PAYABLE` | `TAX` | code | `calculateTax(TAXABLE_INCOME, settings.tax_slabs)` | No | No |
| 11 | Taxable Income – Rebate Base | `TAXABLE_INCOME_REBATE` | `TAX` | code | `TYI − TAX_EXEMPTION` | No | No |
| 12 | 3% of Rebate Base | `THREE_PERCENT` | `TAX` | code | `0.03 × TAXABLE_INCOME_REBATE` | No | No |
| 13 | Actual Investment Required (IRAI) | `IRAI` | `TAX` | code | `min(round(THREE_PERCENT / 15 × 100), 1000000)` | No | No |
| 14 | Allowable Investment Rebate | `INVESTMENT_REBATE` | `TAX` | code | `min(1000000, THREE_PERCENT, IRAI)` | No | No |
| 15 | Net Yearly Tax Payable | `NET_YEARLY_TAX_PAYABLE` | `TAX` | code | `calculateNetYearlyTax(TOTAL_TAX_PAYABLE, INVESTMENT_REBATE, contract.no_tax_deduction, settings)` | No | No |
| 16 | Monthly Tax Deduction | `MONTHLY_TAX_DEDUCTION` | `DED` | code | `round((NET_YEARLY_TAX_PAYABLE / 12) × (settings.monthly_tax_factor ?? 1))` | Yes | No |
| 17 | Attendance-Based Deduction | `ATTENDANCE_DEDUCTION` | `DED` | code | `inputs.ATTENDANCE_DEDUCTION ?? 0` (precomputed at boundary, §9.1) | Yes | No |
| 18 | Insurance Deduction | `INSURANCE` | `DED` | code | `calculateInsuranceDeduction(contract.insurance_status, contract.insurance_monthly_premium, rules.GROSS_SALARY)` | Yes | No |
| 200 | Net Salary | `NET_SALARY` | `NET` | code | `rules.GROSS_SALARY − (rules.PF + rules.MONTHLY_TAX_DEDUCTION + (rules.ATTENDANCE_DEDUCTION ?? 0) + (rules.INSURANCE ?? 0) + abs(inputs.LATE ?? 0))` | Yes | No |

**Dependency note:** the registry's `dependsOn` for each handler must reflect the codes it reads (e.g. `NET_SALARY.dependsOn = ['GROSS_SALARY','PF','MONTHLY_TAX_DEDUCTION','ATTENDANCE_DEDUCTION','INSURANCE']`). The DAG validator (§3.4) enforces ordering.

---

## §6 — PURE HELPER FUNCTIONS (DECIMAL, TYPED, SANDBOX-FREE)

Implement at `@/core/payroll/helpers/*`. Port the source logic **exactly**, but: (a) operate on the decimal type, not raw floats; (b) be pure and side-effect-free; (c) accept the effective `settings` object rather than reaching for globals. The functions and their contracts:

1. `calculateTax(taxableIncome, slabs?)` — Bangladesh NBR progressive staircase. Default slabs come from `settings.tax_slabs`; fallback `[{limit:300000,rate:10},{limit:400000,rate:15},{limit:500000,rate:20},{limit:500000,rate:25},{limit:null,rate:30}]`. `limit:null|0|undefined` = top open band. Returns rounded decimal.
2. `calculateBonus(basic, joinDateStr, paidDateStr, eligible)` — eligibility truthiness per source (`true|'true'|'Yes'|1`). Months = `(paidY−joinY)×12 + (paidM−joinM) + 1`. `months ≥ 12` → full `basic`; else `(basic/12) × months`. Robust date parsing; invalid dates → `0`.
3. `calculateTYI(gross, salary1, salary2, department, bonus)` — `doubleBonus = bonus × 2`. If `salary2 ≤ 0` → `gross×12 + doubleBonus`. Else if department contains `EMK` → `salary1×3 + salary2×9 + doubleBonus`; else `salary1×6 + salary2×6 + doubleBonus`.
4. `calculateTaxExemption2(remainingIncome, isFreedomFighter, isDisabled, isFemale, settings?)` — caps from `settings.tax_exemption2_caps` (parse if string); fallback `{freedom_fighter:525000, disabled_third_gender:500000, female:425000, default:375000}`. Priority: freedom fighter → disabled/third gender → female → default. Returns `min(max(remainingIncome,0), cap)`.
5. `calculateNetYearlyTax(totalTax, rebate, noTaxDeduction, settings?)` — if `noTaxDeduction` → `0`; if `totalTax ≤ 0` → `0`; `net = totalTax − rebate`; if `net < settings.minimum_tax (default 5000)` → return `minimum_tax`; else rounded `net`.
6. `calculateInsuranceDeduction(status, amount, gross)` — disabled/unconfigured statuses (`'disabled','false','0','none','no','unconfigured'`) → `0`; else `min(max(0, amount), max(0, gross))`.
7. `computeAttendanceDeduction(dailySalaryBasis, logs[])` — **lives at the Attendance boundary service, not inside the rule loop** (§9.1). Per-day: `absent` → `+1` deduction day; `half_day` → `+0.5`; `leave`/`off_day` → exempt; otherwise count `late`/`isLate` and `auto_checkout`/`isAutoCheckout` into a shared `lateCounter`, and `0 < workedHours < 8` → `+1` deduction day. `lateDeductionDays = floor(lateCounter / 3)`. `totalDeductionDays = directDeductionDays + lateDeductionDays`. `deductionAmount = dailySalaryBasis × totalDeductionDays`. Return the totals + a human `summaryLabel`. **This function is synchronous and pure** (drop the vestigial `async`); it receives already-derived attendance records and returns a number — it performs no I/O.

---

## §7 — GLOBAL PAYROLL SETTINGS (FINANCE-OWNED, SEEDED)

Key-value store `payroll_settings`. Seed these defaults; **Finance owns the values and must confirm them for the active fiscal year before any real run** (§18-B). All are editable via the Settings UI (Finance/admin only).

| Key | Type | Default | Meaning |
|:--|:--|:--|:--|
| `basic_salary_percentage` | number | `50` | Basic = this % of Gross |
| `pf_base` | string | `"Basic"` | PF base: `"Basic"` or `"GROSS"` |
| `provident_fund_employee_rate` | number | `10` | Default employee PF % |
| `provident_fund_employer_rate` | number | `10` | Default employer PF % |
| `festival_bonus_percentage` | number | `100` | Full bonus = 1 month Basic |
| `tax_exemption_limit_1` | number | `500000` | Section-1 exemption ceiling (or ⅓ of TYI) |
| `tax_exemption2_caps` | JSON | `{"freedom_fighter":525000,"disabled_third_gender":500000,"female":425000,"default":375000}` | Exemption-2 caps |
| `investment_rebate_limit` | number | `1000000` | Max statutory rebate |
| `minimum_tax` | number | `5000` | Mandatory annual minimum if tax due |
| `monthly_tax_factor` | number | `1.0` | Monthly deduction multiplier |
| `tax_slabs` | JSON | `[{"limit":300000,"rate":10},{"limit":400000,"rate":15},{"limit":500000,"rate":20},{"limit":500000,"rate":25},{"limit":null,"rate":30}]` | NBR progressive slabs |
| `department_salary_splits` | JSON | `[{"pattern":"EMK","salary1_months":3,"salary2_months":9},{"pattern":"*","salary1_months":6,"salary2_months":6}]` | Fiscal-year weighting for mid-year increments |

---

## §8 — DATA MODEL (DRIZZLE + DATABASE-STANDARD)

Drizzle schema under `@/core/payroll/db/schema/*` is the **source of truth**; migrations follow the `DATABASE-STANDARD.md` workflow (audit → reconcile → propose → implement → validate → apply → record). The DDL below is reference intent. **Every table additionally gets, per `DATABASE-STANDARD.md`:** `tenant_id uuid NOT NULL`, `created_by`/`updated_by`, RLS enabled with tenant-scoped policies, and access only via the `jaago_app` role (no `BYPASSRLS`). Columns marked **[+]** are hardening additions beyond the source.

```sql
-- 1. Salary structures
CREATE TABLE payroll_salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                          -- [+]
  name VARCHAR(255) NOT NULL,
  country VARCHAR(100) DEFAULT 'Bangladesh',
  scheduled_pay VARCHAR(50) DEFAULT 'Monthly',
  payslip_name VARCHAR(255) DEFAULT 'Salary Slip',
  use_worked_day_lines BOOLEAN DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,                    -- [+] bump on any rule-set change
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Salary rule categories
CREATE TABLE payroll_salary_rule_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                          -- [+]
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,                         -- unique per tenant
  sequence INT DEFAULT 10,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (tenant_id, code)                           -- [+]
);

-- 3. Salary rules (CONFIGURATION ONLY — no executable code stored/run)
CREATE TABLE payroll_salary_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                          -- [+]
  structure_id UUID NOT NULL REFERENCES payroll_salary_structures(id) ON DELETE CASCADE,
  category_id UUID REFERENCES payroll_salary_rule_categories(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  sequence INT NOT NULL,
  condition_based_on VARCHAR(50) DEFAULT 'always_true',
  amount_type VARCHAR(50) DEFAULT 'code',            -- 'fixed' | 'percentage' | 'code'
  handler_code VARCHAR(100),                         -- [+] required when amount_type='code'; must match registry
  quantity NUMERIC(10,2) DEFAULT 1,
  fixed_amount NUMERIC(12,2) DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  percentage_based_on VARCHAR(50) DEFAULT 'BASIC',
  formula_expression TEXT,                           -- documentation only in v1; NOT executed
  appears_on_payslip BOOLEAN DEFAULT TRUE,
  contributes_to_employer_cost BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, structure_id, code),           -- [+]
  UNIQUE (tenant_id, structure_id, sequence)        -- [+] deterministic ordering
);

-- 4. Payroll settings (Finance-owned)
CREATE TABLE payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                          -- [+]
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, key)                            -- [+]
);

-- 5. Employee salary profiles
CREATE TABLE payroll_employee_salary_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                          -- [+]
  employee_id UUID NOT NULL,                         -- references HR master
  salary_structure_id UUID REFERENCES payroll_salary_structures(id),
  wage NUMERIC(12,2) NOT NULL DEFAULT 0,
  basic_wage NUMERIC(12,2) DEFAULT 0,
  salary_jul_dec NUMERIC(12,2) DEFAULT 0,
  salary_jan_jun NUMERIC(12,2) DEFAULT 0,
  joining_date DATE,
  contract_start_date DATE,
  contract_end_date DATE,
  department VARCHAR(100),                           -- [+] engine reads for EMK weighting
  gender VARCHAR(20) DEFAULT 'male',
  freedom_fighter BOOLEAN DEFAULT FALSE,
  disabled_third_gender BOOLEAN DEFAULT FALSE,
  no_tax_deduction BOOLEAN DEFAULT FALSE,
  pf_enabled BOOLEAN DEFAULT FALSE,
  pf_rate NUMERIC(5,4) DEFAULT 0.00,                 -- decimal, e.g. 0.10 = 10%
  pf_employer_rate NUMERIC(5,4) DEFAULT 0.00,
  pf_number VARCHAR(50),
  bonus_eligibility BOOLEAN DEFAULT FALSE,
  insurance_status VARCHAR(20) DEFAULT 'Disabled',
  insurance_category_name VARCHAR(100),
  insurance_monthly_premium NUMERIC(10,2) DEFAULT 0,
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  payment_method VARCHAR(30) DEFAULT 'bank',
  tin_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id)                    -- [+]
);

-- 6. Pay runs
CREATE TABLE payroll_pay_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                          -- [+]
  name VARCHAR(255) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  salary_structure_id UUID REFERENCES payroll_salary_structures(id),
  status VARCHAR(50) DEFAULT 'draft',               -- draft|calculating|calculated|approved|paid|closed|needs_review
  total_basic NUMERIC(14,2) DEFAULT 0,
  total_gross NUMERIC(14,2) DEFAULT 0,
  total_net NUMERIC(14,2) DEFAULT 0,
  total_employer_cost NUMERIC(14,2) DEFAULT 0,
  approved_by UUID, approved_at TIMESTAMPTZ,        -- [+]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payslips
CREATE TABLE payroll_payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                          -- [+]
  pay_run_id UUID REFERENCES payroll_pay_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  salary_structure_id UUID REFERENCES payroll_salary_structures(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE,
  currency CHAR(3) DEFAULT 'BDT',                    -- [+]
  basic_wage NUMERIC(12,2) DEFAULT 0,
  gross_wage NUMERIC(12,2) DEFAULT 0,
  net_wage NUMERIC(12,2) DEFAULT 0,
  employer_cost NUMERIC(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',               -- draft|calculated|approved|paid|locked|needs_review
  rule_set_version INT,                             -- [+]
  settings_snapshot JSONB,                          -- [+]
  contract_snapshot JSONB,                          -- [+]
  worked_days_snapshot JSONB,                        -- [+]
  inputs_snapshot JSONB,                            -- [+]
  rule_set_snapshot JSONB,                          -- [+]
  calc_trace_ref UUID,                             -- [+] -> audit trace id
  approved_by UUID, approved_at TIMESTAMPTZ,        -- [+]
  locked BOOLEAN DEFAULT FALSE, locked_at TIMESTAMPTZ, -- [+]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, pay_run_id, employee_id)       -- [+] one payslip per employee per run
);

-- 8. Payslip lines
CREATE TABLE payroll_payslip_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                          -- [+]
  payslip_id UUID NOT NULL REFERENCES payroll_payslips(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES payroll_salary_rules(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  category_code VARCHAR(50) NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  rate NUMERIC(10,2) DEFAULT 100,
  amount NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  sequence INT NOT NULL
);

-- 9. Payslip inputs
CREATE TABLE payroll_payslip_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                          -- [+]
  payslip_id UUID NOT NULL REFERENCES payroll_payslips(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- 10. Payroll audit trace (logger project, per DATABASE-STANDARD) — immutable
--     Stores calculation traces and config/status-change events:
--     { actor, action, entity, entity_id, rule_set_version, settings_ref,
--       steps[], inputs, outputs, created_at }. Append-only.
```

### §8.5 The `RuleContext.contract` field map
The engine reads these from the salary profile / HR master (types in `@/shared/payroll`): `wage`, `basic_wage`, `salary_jul_dec`, `salary_jan_jun`, `department`, `joining_date`, `contract_start_date`, `contract_end_date`, `contract_type`, `employee_type`, `probationary_status`, `completion_status_6m`, `gender`, `freedom_fighter`, `disabled_third_gender`, `no_tax_deduction`, `pf_enabled`, `pf_rate`, `pf_employer_rate`, `pf_membership_date`, `pf_number`, `bonus_eligibility`, `insurance_status`, `insurance_category_name`, `insurance_monthly_premium`, `bank_name`, `bank_account_number`, `payment_method`, `tin_number`.

### §8.6 Dynamic inputs (`RuleContext.inputs`)
`ATTENDANCE_DEDUCTION`, `ATTENDANCE_DED_DAYS`, `ATTENDANCE_LATE_COUNT`, `LATE` (manual override), `BONUS`/`FESTIVAL_BONUS` (manual override), `OTHER_DEDUCTION`.

---

## §9 — INTEGRATION CONTRACTS (STRICT BOUNDARIES)

### §9.1 Attendance / On-Duty → Attendance deduction (consume, don't re-derive)
- Payroll calls an **Attendance read-service** for `(employee_id, period_start, period_end)` that returns the module's **deterministic per-day records** (the output of `recomputeAttendanceRecord()`), already reflecting On-Duty credited hours per the On-Duty per-day crediting rules (capped 8h/day, split at calendar-day boundaries, **Asia/Dhaka**).
- Payroll then runs `computeAttendanceDeduction(dailySalaryBasis, records)` and injects the result as `inputs.ATTENDANCE_DEDUCTION` (plus `ATTENDANCE_DED_DAYS`, `ATTENDANCE_LATE_COUNT`).
- `dailySalaryBasis` default = `gross_wage / 30` per the source. **Confirm 30 vs actual-days-in-month** (§18-E). Timezone and calendar-day boundaries **must match** the Attendance module exactly; do not introduce a second definition.
- Payroll performs **no** attendance derivation of its own.

### §9.2 HR / Employee master
- The salary profile references `employee_id`; HR remains the source of truth for identity, department, and dates. Do not duplicate HR identity as an independently editable copy — snapshot only at calculation time (§3.2).

### §9.3 Approvals
- Pay-run and payslip status transitions to `approved`/`paid` route through the Approvals module. Do not build a parallel approval mechanism.

### §9.4 Mailer
- Payslip dispatch uses `@/core/mailer` (multi-server failover, circuit breaker, AES-256-GCM credentials). Delivery is a worker job (§12). Never send mail inline in a request handler.

---

## §10 — API SURFACE (NestJS on Fastify)

All endpoints authenticated; every handler enforces CASL (§11) and runs under the tenant GUC. No endpoint returns another employee's payslip.

**Configuration (Finance/admin):**
- `GET/POST/PATCH/DELETE /payroll/structures`
- `GET/POST/PATCH/DELETE /payroll/rule-categories`
- `GET/POST/PATCH/DELETE /payroll/rules` (validates `handler_code`, sequence uniqueness, DAG)
- `GET/PATCH /payroll/settings`
- `GET/POST/PATCH /payroll/salary-profiles`

**Pay runs & payslips (Finance):**
- `POST /payroll/pay-runs` (create), `POST /payroll/pay-runs/:id/calculate` (enqueue batch job), `POST /payroll/pay-runs/:id/approve`, `POST /payroll/pay-runs/:id/mark-paid`, `GET /payroll/pay-runs/:id` (+ reconcile status).
- `GET /payroll/pay-runs/:id/payslips`, `GET /payroll/payslips/:id`.
- `POST /payroll/payslips/:id/recalculate` (draft only; forbidden once finalized).
- `POST /payroll/payslips/:id/dispatch` (enqueue mailer job).

**Simulation (safe replacement for "live formula testing"):**
- `POST /payroll/simulate` — given a hypothetical contract + settings + inputs, run the engine and return the full ordered rule trace and totals **without persisting**. This is the Rule-Trace Inspector backing the config UI. It exercises the same registry — never eval.

**Exports:**
- `GET /payroll/payslips/:id/pdf`, `GET /payroll/pay-runs/:id/bank-advice`.

---

## §11 — AUTHORIZATION (CASL) + RLS

Anchor subjects to real payroll entities (per the RBAC prompt). Subjects: `PayrollSalaryStructure`, `PayrollSalaryRule`, `PayrollSalaryRuleCategory`, `PayrollSetting`, `PayrollEmployeeSalaryProfile`, `PayrollPayRun`, `PayrollPayslip`. Actions include `configure`, `read`, `create`, `update`, `delete`, `calculate`, `approve`, `pay`, `export`, `read-own`.

Illustrative ability rules (final matrix to be confirmed with the operator, §18-A):
- **Payroll admin / Finance:** `manage` all payroll subjects, plus `calculate`/`approve`/`pay`/`export`.
- **HR:** `read`/`update` `PayrollEmployeeSalaryProfile`; **no** access to run calculation, tax settings, or slabs unless explicitly granted.
- **Employee (self-service):** `read-own` on `PayrollPayslip` **only** where `employee_id === user.employeeId` **AND** `status ∈ {approved, paid, locked}`. No access to draft/calculated payslips, salary profiles of others, structures, rules, or settings.

Enforce the same constraints in **RLS** as defense-in-depth (employee sees only their own finalized payslip rows via tenant + `employee_id` + status policy). CASL and RLS must agree; neither alone is sufficient.

---

## §12 — WORKER JOBS (BullMQ + Redis, `apps/worker`)

- **`payroll.pay-run.calculate`** — fan out one sub-job per employee; each computes its payslip in its own transaction with an idempotency key; failures isolated and recorded; run status → `calculated` (or `needs_review` if any payslip flagged); write a reconcile summary (counts, failures, totals).
- **`payroll.payslip.dispatch`** — render PDF, send via `@/core/mailer`, log delivery; retriable with backoff via the mailer's circuit breaker.
- **`payroll.pay-run.bank-advice`** — assemble the bank advice sheet.
- Every job writes structured audit entries. No calculation or mail is done inside API request handlers.

---

## §13 — PAYSLIP LIFECYCLE & IMMUTABILITY

`draft → calculated → approved → paid → locked` (with `needs_review` as an out-of-band flag).

- In `draft`/`calculated`: totals and lines are **always recomputed from source**; never hand-editable. Changing an input or profile field requires a **recalculate**, which re-snapshots.
- On `approved`/`paid`/`locked`: the payslip is an **immutable financial record**. Its snapshots and lines are frozen. **No edit-in-place, ever.** Corrections are made by issuing a **reversing/adjustment payslip** in a later run — preserving one source of truth and a clean audit chain.
- **Reconcile before finalize:** a pay run cannot be `approved` while any payslip is `needs_review`.

This is the deliberate counterpart to invariant #2: derived *live* state is never stored as editable; finalized *records* are stored precisely because they must never change.

---

## §14 — UI (follow the v2 design system)

Build with Next.js 15 App Router · Tailwind · Radix · shadcn/ui. Use the established JAAGO design language from the v2 extension pack — **do not invent a new one**: Inter typeface; **JAAGO gold reserved strictly for brand chrome** (never data viz); semantic colors emerald (positive/paid/healthy), amber (warning/needs-review), rose (negative/failed/over-deduction), sky (informational/queued); dark = `slate-950`, light = warm cream; five responsive breakpoints. Present components as presentational React with explicit wire-up notes (endpoints, lifecycle hooks, routing targets) exactly as in prior modules.

Screens:
1. **Salary Structures** — list/create/edit; version indicator.
2. **Salary Rules** — ordered table (drag-to-reorder writes `sequence`), category, amount type, flags; shows `handler_code` and read-only `formula_expression` documentation; DAG-validation errors surfaced inline.
3. **Rule Categories** — CRUD.
4. **Payroll Settings** — Finance-only editor for slabs, caps, PF base, factors; validates JSON; shows "effective FY" banner.
5. **Salary Profiles** — per-employee; sensitive-field guards.
6. **Rule-Trace Inspector / Simulator** — the safe replacement for "live formula testing": enter a hypothetical profile + settings + inputs, hit `/payroll/simulate`, and render the full per-rule trace (amount, quantity, running category totals) and final Gross/Basic/Net/Employer-cost. No persistence.
7. **Pay Runs** — create run, calculate (progress + reconcile summary), review payslips, approve, mark paid, export.
8. **Payslip view** — line items grouped by category (only `appears_on_payslip` lines), totals, and PDF action. Employee self-service view shows **own finalized payslip only**.

---

## §15 — EXPORTS

- **Payslip PDF** — branded (gold chrome only), grouped line items, employer-cost section for Finance copies, generated in the worker.
- **Bank advice sheet** — per pay run: beneficiary name, bank, account number, net amount, payment method; only `payment_method = 'bank'` rows; totals row; export for Finance.

---

## §16 — PHASED BUILD PLAN (HARD CHECKPOINTS — STOP AT EACH)

Do not cross a checkpoint without operator confirmation.

- **Phase 0 — Recon & restatement.** Complete §0 (read-first, reconcile gate, Invariant Restatement). Confirm Attendance/On-Duty read-service contracts exist or specify the exact interface needed. **STOP.**
- **Phase 1 — Schema & migrations.** Drizzle schema + migrations per `DATABASE-STANDARD.md` (tenant_id, RLS, `jaago_app`, uniqueness/DAG constraints, snapshot columns). Seed settings + the "JAAGO PAY with Attendance and Insurance_Deduction" structure with all 19 rules as configuration rows. **STOP.**
- **Phase 2 — Engine, registry, helpers (test-first).** `@/core/payroll` money module, rule registry with all 19 handlers, pure helpers, DAG validator, execution lifecycle. Unit tests including the §17 worked example and edge cases. **STOP.**
- **Phase 3 — Config API + CASL + RLS.** Structure/rule/category/settings/profile endpoints with validation, CASL guard, matching RLS. `/payroll/simulate`. **STOP.**
- **Phase 4 — Pay runs + worker.** Run lifecycle, BullMQ batch calculation with failure isolation + reconcile, idempotency. **STOP.**
- **Phase 5 — Payslip PDF + bank advice.** Worker-generated exports. **STOP.**
- **Phase 6 — Attendance integration.** Wire the Attendance read-service, compute + inject `ATTENDANCE_DEDUCTION`; verify Asia/Dhaka alignment and daily-basis definition. **STOP.**
- **Phase 7 — UI.** All §14 screens. **STOP.**
- **Phase 8 — Audit, hardening, deploy assembly.** Full audit coverage, `deploy_ready/` regeneration, `nest build && tsc-alias` verified, smoke scripts. **STOP.**

---

## §17 — ACCEPTANCE CRITERIA & REQUIRED TEST SUITE

The engine test asserts **faithful execution of the specified formulas** (the formulas themselves are separately subject to Finance sign-off, §18-B).

### §17.1 Canonical worked example (required, must pass exactly)
Input: `wage = 60,000`; `pf_rate = 0.05`; `bonus_eligibility = true`; `gender = male`; no freedom-fighter/disabled/no-tax flags; `insurance_status = Disabled`; no attendance deductions; no manual `LATE`; normal (no mid-year split).

Expected chain:
- `GROSS_SALARY = 60,000`
- `BASIC = 30,000`
- `PF = 1,500`
- `TOTAL_YEARLY_INCOME = 60,000×12 + 2×30,000 = 780,000`
- `TAX_EXEMPTION = min(260,000, 500,000) = 260,000`
- `TAX_EXEMPTION_PART1 = 520,000`
- `TAX_EXEMPTION2 (male default) = min(520,000, 375,000) = 375,000`
- `TAXABLE_INCOME = 780,000 − 635,000 = 145,000`
- `TOTAL_TAX_PAYABLE = 145,000 × 10% = 14,500`
- `TAXABLE_INCOME_REBATE = 520,000`; `THREE_PERCENT = 15,600`
- `IRAI = min(round(15,600/15×100), 1,000,000) = 104,000`
- `INVESTMENT_REBATE = min(1,000,000, 15,600, 104,000) = 15,600`
- `NET_YEARLY_TAX_PAYABLE`: `14,500 − 15,600 = −1,100 < 5,000` → **`5,000`** (minimum-tax floor)
- `MONTHLY_TAX_DEDUCTION = round(5,000/12 × 1) = 417`
- `INSURANCE = 0`; `ATTENDANCE_DEDUCTION = 0`
- **`NET_SALARY = 60,000 − 1,500 − 417 − 0 − 0 − 0 = 58,083`**

(This example specifically exercises the rebate-exceeds-tax → minimum-tax path.)

### §17.2 Additional required tests
- **Attendance:** 2 absent + 3 late + 1 auto-checkout + 1 `<8h` day, `dailyBasis = gross/30` → `directDeductionDays = 3` (2 absent + 1 `<8h`), `lateCounter = 4` → `lateDeductionDays = floor(4/3)=1`, `totalDeductionDays = 4`; assert `ATTENDANCE_DEDUCTION = dailyBasis × 4` and correct `summaryLabel`. Confirm `leave`/`off_day` are exempt and `half_day` adds 0.5.
- **Insurance:** enabled with premium 960 on gross 60,000 → deduct 960; premium > gross → clamp to gross; disabled/unconfigured → 0.
- **Bonus proration:** join Oct, paid Feb, eligible → 5/12 of Basic; ≥12 months → full Basic; ineligible → 0.
- **Mid-year TYI:** EMK department with both splits set → `s1×3 + s2×9 + 2 bonuses`; non-EMK → `s1×6 + s2×6 + 2 bonuses`; no `salary2` → `gross×12 + 2 bonuses`.
- **Exemption-2 priority:** freedom fighter (525k) > disabled/third-gender (500k) > female (425k) > default (375k).
- **`no_tax_deduction = true`** → `NET_YEARLY_TAX_PAYABLE = 0` regardless of income.
- **Slab boundary:** taxable income spanning multiple bands taxes each portion at its own rate (staircase).
- **Determinism:** recalculating a draft with identical inputs yields identical output; a finalized payslip refuses recalculation.
- **Reproducibility:** change `tax_slabs`, recalc a *new* run → new math; re-open an *old* finalized payslip → old math from its snapshot.
- **Isolation:** in a batch, one employee with corrupt data is flagged `needs_review` without affecting others; run reports partial success.
- **Authorization:** an employee cannot fetch another employee's payslip (CASL denies *and* RLS returns no row); cannot fetch own draft; cannot read settings/rules.
- **No silent zeros:** a rule referencing an unevaluated code fails validation at config/seed time.

---

## §18 — OPEN DECISIONS (DO NOT IMPLEMENT WITHOUT OPERATOR CONFIRMATION)

Surface these and **stop** where they block a phase. Do not bake assumptions into migrations or business logic.

- **A. Final CASL matrix** — exact roles and whether HR may edit salary profiles / view any payslips; whether department heads see team pay-run summaries.
- **B. Tax slabs & exemption caps for the active fiscal year** — Finance must confirm `tax_slabs`, `tax_exemption2_caps`, `tax_exemption_limit_1`, `minimum_tax`, and the **rebate formula** (the specified `INVESTMENT_REBATE`/`IRAI` logic) against the current NBR Finance Act before any real run. The engine is configurable; the seed values are placeholders.
- **C. Rounding policy** — `ROUND_HALF_UP` vs bankers' rounding, and confirm the per-rule vs final rounding points.
- **D. Custom admin formulas (Tier-2 Studio-lite)** — do we ever allow admin-authored formulas? If yes, they must use a hardened AST expression evaluator (allowlisted variables + pure helpers, no Node globals, no prototype access, execution timeout) — **never** raw-string `eval`/`new Function`. Default for v1: **not built**; confirm.
- **E. Daily salary basis** — `gross / 30` (fixed) vs actual days in month vs working-days-in-month for the attendance deduction.
- **F. Negative / floored net** — if Net < 0 after deductions: flag `needs_review` (recommended) vs clamp to 0 vs carry-forward. Confirm.
- **G. Festival bonus mechanics** — is `BONUS` a regular monthly line (as in the rule set) or paid via a separate festival pay run? Confirm payslip semantics and how the "2 bonuses" in TYI relate to actual bonus disbursement.
- **H. Period definition** — calendar month vs a fixed cutoff; must align with the Attendance module's Asia/Dhaka calendar-day boundaries.
- **I. Corrections after `paid`** — confirm the reversing-adjustment-payslip approach (recommended) vs any other correction mechanism.
- **J. Multi-currency** — BDT-only for v1 (recommended) or must the model support other currencies now?
- **K. Retro / off-cycle** — are mid-cycle joiners/leavers prorated, and are off-cycle/ad-hoc payments in v1 scope?
- **L. PF employer cost accounting** — confirm that `contributes_to_employer_cost` handling for PF (and any employer-side contributions) matches Finance's cost model.

---

## §19 — DEFINITION OF DONE

- Invariant Restatement produced and consistent; reconcile gate passed.
- All §17 tests pass, including the canonical worked example (`NET_SALARY = 58,083`).
- No `eval`/`new Function`/`vm` on stored strings anywhere in the engine.
- All money math decimal-based; single documented rounding policy.
- Every finalized payslip reproduces its own math from its snapshots after settings change.
- CASL + RLS agree; employees see only their own finalized payslips.
- Batch runs are idempotent with isolated failures and a reconcile summary.
- Full audit coverage; `tenant_id` + RLS on every table; `jaago_app` without `BYPASSRLS`.
- `deploy_ready/` regenerated; `nest build && tsc-alias` verified green.
- Every §18 open decision is either confirmed by the operator or explicitly deferred with a checkpoint — none silently assumed.

---

## APPENDIX — INVARIANT RESTATEMENT TEMPLATE (produce before Phase 1)

> **Module:** payroll (JAAGO PAY)
> **Locked stack confirmed against repo:** [yes/no — list any divergence and HALT if material]
> **Priority order I will optimize for:** Data integrity → Security → Authorization → Correctness → Performance → Maintainability → Convenience
> **Invariants I will uphold:** [restate §1 in your own words]
> **Execution model:** native rule registry; no eval of stored strings; DAG-validated; decimal money; snapshotted for reproducibility.
> **Boundaries I will not cross:** payroll consumes Attendance/On-Duty derived records and injects the deduction as an input; it re-derives no attendance; approvals via Approvals module; mail via `@/core/mailer`; no browser-to-DB.
> **Integration contracts I need:** [Attendance read-service signature; HR employee reference; Approvals hooks; mailer interface]
> **Open decisions blocking me now:** [list from §18 relevant to Phase 1]
> **Checkpoints I will stop at:** Phases 0–8 per §16.
