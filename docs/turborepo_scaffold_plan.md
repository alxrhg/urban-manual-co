# Turborepo Scaffold Plan

> Goal: Land the new monorepo foundation without breaking the current Next.js 16 app, enabling parallel work on catalog, trips, chat, and design system initiatives.

## 1. Target Structure
```
/apps
  /web        # Next.js 16 app router (user-facing)
  /cms        # Payload shell or future custom admin
  /workers    # Job runner (Temporal/BullMQ) + cron utilities
/packages
  /ui               # Component primitives, icons, hooks
  /design-tokens    # TS + CSS var exports synced from Figma
  /domain           # Zod schemas, OpenAPI emit, Drizzle table defs
  /data-access      # Supabase client, TRPC routers, fetchers
  /ai               # Prompt templates, tool registry, evaluators
  /config           # Shared ESLint, tsconfig, Tailwind, Jest/Vitest config
/infra
  /github           # Actions workflows, PR templates
  /terraform        # Supabase, Upstash, Vercel infra as code
```

## 2. Migration Strategy
1. **Preparation**
   - Ensure working tree clean; open branch `turborepo-scaffold`.
   - Snapshot existing `app/`, `components/`, `scripts/`, `drizzle/` for reference.
2. **Bootstrap Turborepo**
   - Install `pnpm` globally (CI, local).
   - `pnpm dlx create-turbo@latest` into temp dir, copy configs (`turbo.json`, `pnpm-workspace.yaml`, `package.json` scripts).
   - Replace root `package-lock` with `pnpm-lock.yaml`.
3. **App relocation (phase 1)**
   - Move current Next app into `apps/web`.
   - Update import aliases to use `@/` via `tsconfig.base.json`.
   - Ensure `next.config.ts`, `public/`, `app/`, `components/`, `contexts/`, etc., follow new relative paths.
4. **Shared packages (phase 1)**
   - Create `packages/config` with ESLint + tsconfig + Tailwind config.
   - Point `apps/web` configs to the shared package (import/export pattern).
5. **CI + scripts**
   - Update GitHub Actions to run `pnpm install` + `pnpm turbo run lint test build`.
   - Add `pre-commit` hook via Husky calling `pnpm lint:fix` + `pnpm test:changed`.
6. **Verification**
   - `pnpm turbo run dev --filter=web` works locally.
   - `pnpm turbo run lint test build` passes.
   - Document migration notes in `docs/turborepo_scaffold_plan.md`.
7. **Follow-up phases**
   - Move `scripts/` into `apps/workers`.
   - Extract shared logic (`components/ui/*`) into `packages/ui`.
   - Introduce `packages/domain` by relocating Drizzle schema + Zod definitions.

## 3. Tooling Details
- **pnpm workspace file**:
  ```
  packages:
    - apps/*
    - packages/*
    - infra/*
  ```
- **Turbo tasks**:
  ```
  {
    "pipeline": {
      "lint": { "outputs": [] },
      "typecheck": { "outputs": [] },
      "test": { "outputs": ["coverage/**"] },
      "build": { "dependsOn": ["^build", "typecheck"], "outputs": ["dist/**", ".next/**"] },
      "dev": { "cache": false }
    }
  }
  ```
- **Shared tsconfig**: `tsconfig.base.json` extends React strict config, referenced by each app/package.

## 4. Risk Mitigation
- **Large Git diff**: perform relocation in stages (app move, config extraction) with CI passing after each stage.
- **Third-party scripts**: keep root-level `scripts/` until worker app ready; create shims if needed.
- **VSCode path caching**: update `.vscode/settings.json` to point to workspace root to avoid lint noise.
- **CI caching**: use pnpm store cache + Turbo remote cache (Vercel) to keep build times down.

## 5. Acceptance Criteria
- `pnpm install` works from repo root; no npm/yarn remnants.
- Apps and packages share lint/tsconfig/tailwind via `packages/config`.
- Turbo pipeline runs in CI with required checks (lint, test, build, storybook).
- Documentation updated (`README`, new plan doc, ADR references).

## 6. Next Steps Checklist
- [x] Create `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`, `tsconfig.base.json`, and shared config package scaffold.
- [ ] Move Next app into `apps/web`.
- [ ] Update import aliases + scripts.
- [ ] Configure GitHub Actions for pnpm + Turbo.
- [ ] Draft ADR-001 for job orchestrator once workers app scaffolded.

Own this plan via `docs/fresh_start_backlog.md` tasks M0–M3. All migrations require before/after verification and sign-off from platform + product.
