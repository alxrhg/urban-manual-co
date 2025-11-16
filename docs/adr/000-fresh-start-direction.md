# ADR 000: Fresh Start Direction

- **Date**: 2025-11-16  
- **Status**: Proposed  
- **Owners**: Product + Engineering Leadership  
- **Tags**: catalog, trips, conversational-ai, design-system, architecture, tooling

## Context

Urban Manual has outgrown the single-app repository that evolved organically over prior releases. The current structure makes it hard to:

- Maintain a clear `Country → City → Point of Interest` catalog hierarchy enriched with architects, brands, and editorial tags.
- Position the trip planner (multi-city itineraries, visits, and insights) as the primary intelligence engine that drives recommendations, personalization, and analytics.
- Keep the conversational assistant centered as the flagship, tool-aware interface that differentiates us from other travel products.
- Deliver the polished, reflective, “pixel-perfect” experience expected of a premium travel studio while shipping quickly with confidence.
- Adopt best-in-class tooling (modern monorepo workflows, automated quality gates, observability) without constant friction from legacy decisions.

## Decision

1. **Rebuild on a modern monorepo foundation** (Turborepo + `pnpm`) with dedicated apps (`web`, `cms`, `workers`) and shared packages (`domain`, `ui`, `data-access`, `ai`, `config`, `design-tokens`).
2. **Define the catalog as a first-class knowledge graph**:
   - Canonical tables/models for `Country`, `City`, `POI`, `Architect`, `Brand`, `Tag`, `Collection`, and their joins.
   - Contracts live in `packages/domain` (Zod + OpenAPI) and back Supabase/Drizzle schemas plus Payload (or custom CMS) collections.
3. **Elevate trips into the core domain object**:
   - Every visit, recommendation, and AI insight references a `trip_id` + itinerary context.
   - Trip intelligence services (sequencing, complementary POIs, taste profiles) feed both the UI and the conversational assistant.
4. **Keep the conversational chat as the primary lens**:
   - Chat orchestrates catalog exploration, itinerary building, enrichment explanations, and operator workflows via tool calling.
   - It stores conversational memory tied to trips, saved POIs, architects, and brands for reflective responses.
5. **Mandate pixel-perfect craft**:
   - Central design system with tokens (color, typography, spacing, motion), Radix-based primitives, and Figma ↔ code parity enforced through Storybook/Chromatic checks.
6. **Adopt best-in-class tooling and practices**:
   - Next.js 16 App Router + React Server Components, TRPC, Supabase Postgres + Drizzle ORM, Temporal/BullMQ jobs, OpenAI + Vertex/Gemini for AI, Upstash for caching/queues.
   - Turborepo tasks for lint/test/build/storybook, Vitest + Playwright, ESLint + Biome/Prettier, Sentry + OpenTelemetry + Grafana dashboards, strict CSP + secret management (Doppler/AWS SM).
7. **Gate every merge with automated quality**:
   - Required CI pipeline (lint, type-check, unit, component, e2e, visual regression).
   - Accessibility checks (axe), performance budgets (Lighthouse), and design token diffing to keep the experience flawless.

## Rationale

- A modular monorepo keeps catalog, trips, chat, and enrichment pipelines cohesive while respecting boundaries.
- Centering trips and chat unlocks differentiated “travel intelligence” that combines curated content with AI reasoning.
- A graph-based catalog makes it trivial to pivot by architect, brand, or tag—essential for editorial storytelling and AI context windows.
- Pixel-perfect standards require shared tokens, story-driven components, automated visual regression, and design reviews enforced by tooling—not afterthought QA.
- Best-in-class tooling shortens feedback loops, encourages experimentation, and protects the polish bar via automation.

## Consequences

- Initial investment to scaffold the monorepo, migrate schemas, and codify tokens before feature work can resume.
- Requires coordinated migration of Supabase data (introducing country/city keys, architect/brand join tables) and Payload collections.
- The conversational system must evolve into a tool router with evaluation harnesses, increasing upfront complexity but ensuring differentiation.
- All contributors must follow stricter review + CI expectations; onboarding documentation and scripts become critical.
- Some existing scripts/APIs will be deprecated or rewritten as orchestrated workers/jobs.

## Implementation Plan (High-Level)

1. **Docs & Alignment**
   - Land this ADR plus supporting blueprints (catalog graph, trip intelligence, conversational tools, design system).
   - Publish design principles and pixel-perfect checklists.
2. **Scaffold**
   - Initialize Turborepo structure with apps/packages/infra directories and shared configs.
   - Configure `pnpm`, linting, formatting, testing, Storybook, and CI pipelines.
3. **Domain Modeling**
   - Port `drizzle/schema.ts` into `packages/domain` (Zod) and regenerate DB migrations via Drizzle Kit.
   - Introduce hierarchical catalog + architect/brand/tag joins + trip models.
4. **Design System**
   - Build tokens + primitives + story coverage, enforce Chromatic checks in CI.
5. **Feature Lanes**
   - Catalog discovery (graph navigation), Journey intelligence (trip-centric flows), Conversational studio (tool-enabled chat), Operator lane (CMS/admin).
6. **Data & Automation**
   - Replatform enrichment scripts into orchestrated workers with observability + retries.
7. **Migration & Rollout**
   - Run dual-write strategies, enable feature flags, gradually migrate users, and sunset legacy code.

## Open Questions

- Should we keep Payload CMS or build a bespoke admin leveraging the shared design system?
- Which job orchestrator best fits (Temporal vs. BullMQ + Upstash) given infra budget + team expertise?
- Do we integrate a customer identity platform (e.g., Clerk) alongside Supabase auth for enterprise-grade controls?
- How do we measure “pixel perfect” in CI beyond visual regression (e.g., motion tests, color contrast budgets)?

---

Adopting this direction is prerequisite for every subsequent feature effort. Team leads must sign off before implementation begins. All future ADRs reference this document to ensure alignment with the catalog hierarchy, trip-centric intelligence, conversational focus, and polish mandate.
