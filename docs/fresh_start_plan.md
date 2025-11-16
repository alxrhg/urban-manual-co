# Fresh Start Implementation Blueprint

## Context Recap
- Current repo is a single Next.js 16 app (`app/` router) backed by Supabase/Postgres with Payload CMS hooks and a large collection of enrichment scripts in `scripts/`.
- UI primitives live in `components/` while API routes (search, AI, enrichment, admin utilities) are colocated under `app/api/*`.
- Data contracts are partially defined in Supabase SQL, `drizzle/schema.ts`, and ad-hoc scripts; there is no central source of truth for entities like `destinations`, `collections`, `trips`, `reviews`, enrichment jobs, or AI prompt templates.
- Tooling relies on npm + ESLint; there is no automated formatting, test matrix, observability baseline, or consolidated CI/CD workflow.

## Guiding Principles
- **Outcome aligned**: tie every artifact back to traveler value (discover, plan, track visits) and internal operator value (content ops, enrichment, analytics).
- **Modular by design**: isolate domain logic, UI primitives, and delivery surfaces so the web app, CMS, and automation jobs can evolve independently.
- **Quality gates first**: tests, type safety, linting, accessibility, and security checks must block merges from day one.
- **Telemetry everywhere**: instrumentation, tracing, and feature flags must land with the features they protect.

## Product North Star & Strategic Pillars
- **Signature polish**: every surface should feel reflective, editorial, and high-end—zero tolerance for jitter, inconsistent typography, or uninstrumented flows.
- **Catalog Graph**: destinations live in a canonical `Country → City → Point of Interest` hierarchy, enriched with architect relationships, brand affiliations, tags, collections, and provenance so we can traverse the graph in any direction.
- **Journey Intelligence**: trips (multi-city, multi-day itineraries) are the primary data product, powering recommendations, personalization, and operator insights—not a secondary feature.
- **Conversational Studio**: the chat assistant remains the flagship interface; it orchestrates catalog exploration, trip planning, enrichment explainability, and operator tools via tool-calling and contextual memory.
- **Groundbreaking UX**: animation, typography, loading states, and content modeling all reinforce an image of smart, thoughtful, futuristic travel craftsmanship.

## Phase 0 – Alignment & Operating Rhythm
1. **Vision + success metrics**: restate “Urban Manual 2.0” goals, core personas (Traveler, Curator, Ops Analyst), and KPIs (activation, retention, enrichment freshness, AI answer quality).
2. **Constraints inventory**: document brand guidelines, licensing limits for map providers, PII boundaries, and infra budgets.
3. **Decision log (ADR)**: stand up `/docs/adr/` with lightweight template; record choices on stack, hosting, auth, data model, AI providers.
4. **Working agreements**: define branching strategy (`main` + feature branches + release tags), code review SLA, deploy cadence, and demo rhythm.

## Phase 1 – Domain Modeling & Data Contracts
1. **Canonical schema**: author `packages/domain/schema/*.ts` (Zod + OpenAPI) describing:
   - `Country`, `City`, `POI` (Point of Interest) with explicit parent-child keys, plus lateral relations for `Architect`, `Brand`, `Tag`, `Collection`, `User`, `Visit`, `Trip`, `ItineraryItem`, `Review`, `TrendSample`, `AIConversation`.
   - Model architect/brand/tag links as many-to-many join entities so we can filter POIs by designer lineage, hospitality group, or editorial tags.
2. **Relationship diagrams**: add `docs/data/` with ER diagrams referencing Supabase tables and Payload collections; reconcile with `drizzle/schema.ts`.
3. **Validation + fixtures**: create hierarchical seed data (country > city > poi) plus graph fixtures (architect, brand, tag edges) + contract tests (Vitest) to ensure serialized data from Supabase matches schema.
4. **Versioned migrations**: replace ad-hoc SQL with `drizzle-kit` or `supabase db diff` pipeline; enforce “migration per PR”.

## Phase 2 – Repository & Architecture Foundation
1. **Monorepo layout** (Turborepo or Bun workspaces):
```
/apps
  /web          # Next.js app router
  /cms          # Payload admin shell or future admin UI
  /workers      # Scheduled jobs / queues
/packages
  /ui           # Headless components + tokens (Tailwind + Radix)
  /domain       # Schemas, validators, service ports
  /data-access  # Supabase/Drizzle clients, TRPC routers
  /ai           # Prompt templates, tool definitions
  /config       # ESLint, Tailwind, tsconfig, env parsing
/infra
  /terraform    # Supabase, Vercel, Upstash, queues
  /github       # Actions workflows
/docs
  /adr /runbooks /decisions
```
2. **Module boundaries**: enforce via `eslint-plugin-boundaries` or `depcheck` so components cannot import server jobs, etc.
3. **Runtime adapters**: isolate external services (Supabase, Upstash, Google APIs, Gemini, Mapbox) behind typed adapters in `packages/data-access`.
4. **API surface**: consolidate disparate `app/api/*` handlers into TRPC routers + REST fallbacks, co-locating handlers with schema + service logic.

## Phase 3 – Tooling, DX, and Quality Gates
1. **Environment management**: adopt `dotenv-vault` or `supabase secrets` templates; script `./scripts/setup-local.ts` to pull `.env.local`.
2. **Package tooling**: switch to `pnpm` or `bun` workspaces, configure `turbo` for tasks (`lint`, `test`, `build`, `storybook`, `check`).
3. **Static analysis**: ESLint + Biome/Prettier, TypeScript strict mode, `ts-prune`, dependency audit (npm audit, osv-scanner).
4. **Testing pyramid**:
   - Unit: Vitest for hooks/utils/domain services.
   - Component: Storybook stories + Chromatic/Playwright visual regression.
   - Integration: Playwright page flows (auth, search, itinerary creation).
   - Contract: Pact or schema snapshot tests for Supabase + AI tool contracts.
5. **Pre-commit hooks**: Husky + lint-staged to run `pnpm lint --fix`, `pnpm test:affected --watch=false`.
6. **CI/CD**: GitHub Actions pipeline with stages (setup, lint, test, build, deploy preview, integration tests, promote to prod).

## Phase 4 – Experience Lanes
1. **Catalog discovery lane**
   - Compose server components for hero, filters, result lists, detail modals using data loaders with caching (React Query Server / RSC caches).
   - Add skeleton states and `@tanstack/react-query` hydration for client interactions.
   - Introduce graph-aware browsing (country > city > poi) plus architect/brand/tag drill-downs and curated collections.
2. **Journey intelligence lane (Trips as Core)**
   - Treat trips as the central record: every visit, recommendation, and AI suggestion references a `trip_id` + `day`.
   - Build TRPC routers for trips + itinerary items, integrate optimistic updates, collaborative editing, and contextual metadata (mood, budget, signature brands).
   - Feed trip data into recommendation services (next-best-city, complementary POIs, packing lists) and analytics dashboards.
3. **Profile & gamification lane**
   - Migrate `visited_places`, `saved_places`, `user_activity` into dedicated service with analytics hooks.
4. **Conversational studio lane**
   - Define tool registry (catalog query, trip composer, architect lookups, brand stories, review summarizer) + evaluation harness using recorded conversations.
   - Persist conversation state as knowledge graph traversals so chat can reference prior trips, saved POIs, and operator annotations.
5. **Operator lane**
   - Replace Payload UI with either custom admin pages or keep Payload but wrap it in dedicated `apps/cms` with auth middleware + CMS health monitors.

## Best-in-Class Stack Baseline
- **Frontend**: Next.js 16 App Router with React Server Components, Server Actions, Suspense-first data flows, Tailwind 4 + Radix primitives, Framer Motion for micro-interactions.
- **State & data**: `@tanstack/react-query` (client), RSC caches (server), Zustand for ephemeral UI state, TRPC for typed end-to-end contracts, Zod/OpenAPI schema generation.
- **Backend**: Supabase Postgres + Drizzle ORM, Redis/Upstash for caching + rate limiting, Temporal or BullMQ for orchestrated enrichment jobs, Payload (or custom CMS) riding on the same Postgres instance.
- **AI layer**: OpenAI/Vertex for LLM orchestration (tool calling), Gemini for Google data, in-house embeddings via `text-embedding-3-large`, vector search on Supabase pgvector or Upstash Vector.
- **Tooling**: Turborepo + pnpm workspaces, Biome/ESLint + Prettier, Vitest, Playwright, Storybook + Chromatic, GitHub Actions with required checks, Sentry + OpenTelemetry + Grafana for observability.
- **Security & compliance**: Strict CSP, Auth hardening via Supabase + Clerk (optional), secrets via Doppler/AWS Secrets Manager, automated dependency scanning (Dependabot, osv-scanner), privacy-preserving analytics (PostHog/Supabase).

## Phase 5 – Data, Enrichment, and Automation
1. **Job platform**: refactor scripts in `/scripts` into typed jobs inside `apps/workers` using a shared runner (e.g., `@temporalio`, `bullmq`, or Upstash QStash triggers).
2. **Configuration-driven pipelines**: store enrichment recipes (sources, fields, frequency) as JSON/YAML, executed by the job runner.
3. **Monitoring**: each job publishes metrics (duration, records touched, errors) to OpenTelemetry + Grafana dashboards.
4. **Backfill strategy**: define playbooks for re-running AI enrichment, Place data refresh, and error remediation with feature flags guarding user-facing rollouts.

## Phase 6 – Observability, Security, and Operations
1. **Logging & tracing**: adopt `pino` + OTLP exporter; instrument API routes, AI calls, and Supabase queries.
2. **Metrics**: define SLIs/SLOs (API latency, AI success rate, enrichment lag). Pipe to Vercel monitoring or Grafana Cloud.
3. **Secrets & key rotation**: centralize via Doppler or AWS/GCP Secrets Manager; automate rotation for Supabase, Google, OpenAI, Upstash keys.
4. **Security reviews**: quarterly threat modeling + dependency audit, CSP auto-tests, automated penetration checks (OWASP ZAP in CI).
5. **Runbooks**: add `/docs/runbooks/*.md` for incident response, enrichment failures, AI hallucination triage.

## Phase 7 – Migration & Rollout
1. **Parallel cutover**: deploy new stack behind `beta.urbanmanual.com`, sync Supabase via views/materialized tables to avoid duplicate writes.
2. **Data migration**: create idempotent scripts that read from legacy tables (`destinations`, `visited_places`, `trips`, Payload media) and hydrate new schemas; validate with checksum reports.
3. **Feature flags**: use Upstash or Supabase table to gate traffic by cohort; progressively migrate routes/pages.
4. **Sunset plan**: document removal of deprecated endpoints/scripts, archive legacy docs, and lock old branches.

## Immediate Next Actions
1. Author ADR-000 “Fresh Start Direction” summarizing principles above—call out catalog hierarchy, trip-centric intelligence, and conversational core.
2. Scaffold Turborepo layout with placeholder apps/packages + shared eslint/tailwind configs, including `packages/domain` for the catalog graph.
3. Stand up automated quality pipeline (lint + tests) on GitHub Actions to guard future work, blocking merges until the premium polish bar is met.
4. Start domain modeling spike: migrate current `drizzle/schema.ts` into `packages/domain` with Zod + OpenAPI generation, including `Country → City → POI` relations, architect/brand/tag joins, and trip intelligence schemas.

---

This blueprint should serve as the execution map for rebuilding Urban Manual with stronger foundations, explicit contracts, and production-ready automation from day one. Iterate on each phase via ADRs and track progress through feature lanes so the team can ship vertical slices without regressing on quality.
