# ADR 0003: Responsive Progressive Web App (PWA) over Separate Native Apps

## Status
Accepted

## Context
JAAGO Foundation staff and field officers operate across rural and urban locations in Bangladesh. Many users access the system using mid-range Android devices on low-bandwidth, intermittent cellular connections. Maintaining three separate codebases (Web, iOS, Android) would significantly increase operational overhead and slow feature iteration.

## Decision
We implement a single, highly responsive full-stack web application packaged as an installable **Progressive Web App (PWA)** with offline-tolerant caching, adaptive touch/pointer/keyboard UI, and strict bundle size budgets.

## Rationale & Consequences
- **Unified Codebase**: All business logic, UI components, and validation schemas are maintained in one TypeScript monorepo.
- **Instant Deployments**: Bug fixes and security patches deploy instantly without waiting for mobile app store review cycles.
- **Low Hardware Footprint**: PWA architecture runs efficiently on resource-constrained devices with minimal memory consumption.
