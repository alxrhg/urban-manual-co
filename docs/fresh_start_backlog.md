# Fresh Start Backlog (Pixel-Perfect Edition)

> Updated: 2025-11-16  
> This backlog captures the first execution wave needed to realize ADR-000. Items are organized by lane, include explicit “definition of done,” and assume a zero-compromise polish bar.

**Latest progress (2025-11-16 evening):**
- pnpm workspace + Turbo config staged (`pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `tsconfig.base.json`).
- `packages/config` established as the shared tooling preset (ESLint + Tailwind stubs) and wired into the root config.
- Infrastructure directories (`apps/`, `packages/`, `infra/github`) created with documentation to guide upcoming moves.
- Next.js 16 experience relocated into `apps/web` (app/components/lib/etc., config files, middleware) with scripts, tsconfigs, and documentation updated to point to the new path.
- Created `@urban/web` workspace package plus Turbo-powered commands documented in `README.md`.
- Added pnpm/Turbo CI workflow (`infra/github/workflows/ci.yml`) covering lint, typecheck, tests, and `@urban/web` builds on PRs.

## 0. Alignment & Guardrails
| ID | Task | Owner | Definition of Done | Status |
| --- | --- | --- | --- | --- |
| A0 | Ratify ADR-000 + blueprint with stakeholders | Product + Eng Leads | Sign-off recorded, questions answered, ADR linked in project hub | 🔄 |
| A1 | Publish “Pixel-Perfect Principles” doc (color, typography, motion, tone) | Design | Shared in Figma & repo, referenced by Storybook | ⏳ |
| A2 | Instrument decision log workflow (ADR template, PR checklist) | Eng Productivity | Git template + CI check ensures ADR link for major changes | ⏳ |

## 1. Monorepo & Toolchain Scaffold
| ID | Task | Owner | Definition of Done | Status |
| --- | --- | --- | --- | --- |
| M0 | Initialize Turborepo (`apps/{web,cms,workers}`, `packages/{domain,ui,data-access,ai,config,design-tokens}`, `infra/`) | Platform | Repo refactor complete, lint/test pass, docs updated | 🔄 |
| M1 | Adopt `pnpm` workspaces + scripts (`lint`, `typecheck`, `test`, `storybook`, `build`) | Platform | `pnpm install` + `pnpm dev` commands documented, CI green | 🔄 |
| M2 | Configure shared ESLint + Biome/Prettier + commit hooks (Husky) | Platform | Pre-commit enforces lint/format, CI gate uses same configs | 🔄 |
| M3 | GitHub Actions pipeline (lint → test → build → storybook → deploy preview) | Platform | Required status checks enforced on `main` | 🔄 |

## 2. Catalog Graph & Data Contracts
| ID | Task | Owner | Definition of Done | Status |
| --- | --- | --- | --- | --- |
| C0 | Port current Drizzle schema into `packages/domain` (Zod, OpenAPI emit) | Data | Contracts published, tests verifying Supabase parity | ⏳ |
| C1 | Add `Country`, `City`, `POI` tables + joins for `Architect`, `Brand`, `Tag`, `Collection` | Data | Migrations merged, seed fixtures available, API responses updated | ⏳ |
| C2 | Diagram catalog graph (`docs/data/catalog-graph.drawio`) | Data + Design | ERD + narrative explaining traversal patterns | ⏳ |
| C3 | Implement validation suite (Vitest contract checks + schema snapshots) | Data Platform | `pnpm test:contracts` gate passes pre-merge | ⏳ |

## 3. Journey Intelligence (Trips as Core)
| ID | Task | Owner | Definition of Done | Status |
| --- | --- | --- | --- | --- |
| J0 | Model `Trip`, `ItineraryDay`, `ItineraryItem`, `Visit`, `TasteProfile` in domain + DB | Data | Migrations, seeds, and Zod schemas complete | ⏳ |
| J1 | TRPC routers + service layer for trips (CRUD, day planner, collaboration) | Backend | Tests + mocked stories in Storybook verifying flows | ⏳ |
| J2 | Recommendation engine MVP (next-city, complementary POIs) fed from trips | Data Science | Deterministic tests + evaluation metrics baseline | ⏳ |

## 4. Conversational Studio
| ID | Task | Owner | Definition of Done | Status |
| --- | --- | --- | --- | --- |
| CH0 | Tool registry spec (catalog query, trip composer, architect insights, brand stories) | AI Platform | Documented JSON schema, stored in `packages/ai/tooling` | ⏳ |
| CH1 | Conversation memory service linking trips, POIs, architects/brands | Backend | Postgres tables, API, and tests verifying retrieval | ⏳ |
| CH2 | Chat UI v2 (pixel-perfect, motion guidelines, streaming) | Frontend | Storybook + Chromatic approval, Lighthouse ≥ 95 | ⏳ |
| CH3 | Evaluation harness (transcripts, assertions, hallucination triage) | AI/QA | CI job running nightly with score dashboard | ⏳ |

## 5. Design System & Pixel-Perfect Delivery
| ID | Task | Owner | Definition of Done | Status |
| --- | --- | --- | --- | --- |
| D0 | Design tokens (`packages/design-tokens`): color, typography, spacing, motion, shadows | Design Systems | Tokens synced from Figma via plugin, exposed as TS + CSS vars | ⏳ |
| D1 | UI primitive library (Radix wrappers, layout primitives, data viz scaffolds) | Frontend | Storybook coverage ≥ 90%, Chromatic baseline set | ⏳ |
| D2 | Accessibility + performance checklist automation (axe, Lighthouse budgets) | QA | CI step fails if contrast/motion/perf regress | ⏳ |
| D3 | “Polish Patrol” regression suite (visual diff + motion assertions) | Frontend QA | Playwright traces verifying transitions, Chromatic diff gating | ⏳ |

## 6. Data & Automation Platform
| ID | Task | Owner | Definition of Done | Status |
| --- | --- | --- | --- | --- |
| DA0 | Choose job orchestrator (Temporal vs BullMQ) + scaffold worker app | Platform | ADR-001 + running hello-world workflow in CI | ⏳ |
| DA1 | Port enrichment scripts into typed jobs with retries + metrics | Data Ops | All existing scripts deprecated, pipeline dashboards live | ⏳ |
| DA2 | Observability baseline (Pino → OTLP, Grafana dashboards) | SRE | Dashboard links documented, alerts configured | ⏳ |

## 7. Migration & Rollout
| ID | Task | Owner | Definition of Done | Status |
| --- | --- | --- | --- | --- |
| R0 | Data migration plan (dual-write, backfills, verification reports) | Data Ops | Runbook + scripts committed, dry run complete | ⏳ |
| R1 | Feature flag framework (Upstash/ConfigCat) for catalog/chat/trips cutover | Backend | Admin UI to flip flags, auditing enabled | ⏳ |
| R2 | Sunset checklist for legacy app (routes, scripts, docs) | Program Mgmt | Checklist tracked, all items signed off | ⏳ |

## Dependencies & Sequencing Notes
1. **ADR ratification** precedes all execution (A0).
2. **Monorepo scaffold (M0-M3)** unlocks parallel work across catalog, chat, and design system.
3. **Catalog graph tasks (C0-C3)** must complete before journey intelligence or chat improvements to ensure consistent data contracts.
4. **Design tokens (D0)** are required before shipping any new UI; no component leaves Storybook without token alignment.
5. **Conversational tooling (CH0-CH3)** depends on catalog + trip schemas plus AI evaluation harness.
6. **Automation platform (DA0-DA2)** should be in place before large-scale enrichment or migration tasks.

## Pixel-Perfect Definition of Done (applies to every UI task)
- Figma spec link included in PR + variance ≤ 2px in Chromatic diff.
- Color contrast ≥ WCAG 2.1 AA, motion reduces for `prefers-reduced-motion`.
- Renders at 60fps on reference hardware; GPU cost monitored via DevTools trace attached to PR.
- Copy reviewed for tone (“reflective, smart, grounded”).
- Telemetry events documented and verified in preview.

---

Use this backlog as the single source of truth for upcoming sprints. Update statuses via PRs and keep the table synchronized with Jira/Linear.
