# Lint Remediation Plan

> Version 0.1 — 2025-11-16  
> Goal: reach a clean `pnpm turbo run lint` on CI without suppressing meaningful rules.

## Current State (Observed via `pnpm lint`)
- **apps/web**: `react/no-unescaped-entities`, `@next/next/no-img-element`, heavy `any` usage in admin/enrich pages, React compiler warnings for TanStack Table.
- **services/**: dozens of `any` and unused-variable violations across intelligence/search/realtime modules.
- **tests/**: contract/unit files depend on loose `any` shapes and untyped fixtures.

## Strategy
1. **Scoping (Week 1)**
   - Keep lint gate on `apps/web` + `packages/**` by default.
   - **Done:** temporary overrides downgrade `services/**` + `tests/**` `@typescript-eslint/no-explicit-any` / `no-unused-vars` to warnings (see `packages/config/eslint/index.mjs`). Documented with expiry (Week 4).
2. **apps/web cleanup (Weeks 1-2)**
   - Replace unescaped apostrophes/quotes with HTML entities or template split.
   - Swap `<img>` for `<Image>` or document exceptions.
   - Introduce typed form helpers for admin pages to eliminate `any`.
3. **Services hardening (Weeks 2-4)**
   - Split `services/` into `packages/data-access` + `packages/ai`.
   - Define shared types (`Destination`, `Recommendation`, `TasteProfile`) in `packages/domain`.
   - Enforce `no-explicit-any` once types are published.
4. **Tests modernization (Weeks 3-4)**
   - Create typed fixtures in `tests/helpers`.
   - Convert `any` laden mocks to typed builders.
5. **Final gate (Week 4)**
   - Remove overrides, require `pnpm lint` green.
   - Add lint badge/status to README + CI summary comment.

## Temporary Overrides
- `services/**`, `tests/**`
  - `@typescript-eslint/no-explicit-any`: `warn`
  - `@typescript-eslint/no-unused-vars`: `warn` (ignores `_`-prefixed args)
  - Location: `packages/config/eslint/index.mjs`
  - Removal target: Week 4 (task L0)

## Tracking
- Each remediation sub-workstream receives a backlog entry (`L1` apps/web, `L2` services, `L3` tests).
- Weekly standup includes lint debt burndown (errors → warnings → zero).

---

This plan should be revisited after Week 4 to either tighten rules further (e.g., enable `react/jsx-no-leaked-children`) or update timelines if new modules are introduced.
