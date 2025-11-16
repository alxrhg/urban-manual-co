# Shared Packages

Packages under this directory provide reusable libraries for all apps:

- `config`: ESLint, TypeScript, Tailwind, and other tooling presets.
- `design-tokens`: source of truth for color/typography/motion variables.
- `ui`: headless components and Radix wrappers.
- `domain`: Zod schemas, OpenAPI emitters, and Drizzle table defs.
- `data-access`: Supabase/HTTP clients, TRPC routers, caching utilities.
- `ai`: prompt templates, tool definitions, evaluation harness helpers.

Each package will be versioned via `package.json` and consumed through pnpm workspace aliases.
