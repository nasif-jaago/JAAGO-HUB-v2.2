# ADR 0001: Technology Stack Selection

## Status
Accepted

## Context
JAAGO HUB requires an enterprise-grade, modular ERP architecture designed for long-term maintainability (10–15 years) across diverse NGO operations in Bangladesh, including schools, branches, youth development projects, and centralized finance.

## Decision
We select and pin the following core technology stack:
- **Language**: TypeScript 5.7+ (strict mode enabled with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- **Runtime**: Node.js 22 LTS exclusively across all backend environments (no Edge runtime for DB/logger/secrets).
- **Monorepo**: pnpm + Turborepo for efficient task pipelines and caching.
- **Application Framework**: Next.js 15 (App Router) for full-stack UI and BFF route handlers under `/api/v1`.
- **Database & Auth**: Supabase (PostgreSQL + Auth + Storage + RLS) with a separate dedicated Supabase project for logging.
- **ORM**: Drizzle ORM for type-safe SQL with zero runtime binary overhead.
- **Cache & Async Queue**: Redis 7 self-hosted + BullMQ for background jobs.
- **Observability**: Pino for structured JSON logging; OpenTelemetry for metrics/traces; separate tamper-evident audit log.
- **Reverse Proxy**: Nginx with same-origin routing, TLS termination, and hardened security headers.

## Consequences
- Clean separation between framework adapters (`apps/*`) and headless domain/application packages (`packages/*`).
- High performance, zero vendor lock-in, and reliable long-term developer maintainability.
