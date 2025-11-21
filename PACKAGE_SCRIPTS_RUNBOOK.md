# Package Script Runbook

This runbook centralizes how to run every `package.json` script, what each command does, and the guardrails to use before touching production data. Unless a script is explicitly read-only, assume it writes to Supabase or external services—populate `.env.local` before running anything.

## Environment & Safety Defaults
- **Supabase access**: Scripts marked `service-role` require `SUPABASE_SERVICE_ROLE_KEY` and should only be run by trusted operators. Regular enrichment commands use the anon key but still mutate data.
- **Google keys**: Enrichment and Google Places/Trends utilities need `NEXT_PUBLIC_GOOGLE_API_KEY` (or `GOOGLE_PLACES_API_KEY`). Ensure quotas are available before large runs.
- **Sanity / Discovery Engine / R2**: Only run the relevant sync/export jobs when those credentials are present to avoid partial writes.
- **Dry-runs**: Only the R2 export command supports a documented `--dry-run` flag. For other scripts, use `--limit` flags where provided to validate on a tiny batch first.
- **Data safety**: Prefer running against staging projects first, watch Supabase row counts, and avoid concurrent writers for the same tables when running enrichment or migrations.

## Script Reference

### Development & QA
| Script | Purpose | Required Env | Safety Notes & Dry-Run | Verification / Troubleshooting |
| --- | --- | --- | --- | --- |
| `npm run dev` | Start Next.js dev server. | None beyond app defaults. | Read-only; hot-reloads local code. | Visit `http://localhost:3000` and watch terminal for compilation errors. |
| `npm run build` / `npm start` | Build and start production server. | Production `.env.local`. | Read-only migrations; fails fast on missing env. | Build succeeds and server responds to `/` locally. |
| `npm run lint` | ESLint over the repo. | None. | Safe; no writes. | Lint passes without errors. |
| `npm run test:unit` | Runs Vitest suites in `tests/**/*.test.ts`. | None. | Safe. | All tests green; inspect stack traces on failure. |
| `npm run test:route-contracts` | Contract tests for route calculations. | None. | Safe. | Expect Vitest summary; rerun with `--runInBand` if flakes. |
| `npm run test:intelligence` | Hits intelligence APIs (`/api/trending`, `/api/similar/:id`, etc.). | `NEXT_PUBLIC_SITE_URL` (defaults to localhost). | Read-only HTTP checks. | Look for ✅ lines per endpoint; auth-required routes will log expected failures. |
| `npm run test-nlu` | Runs sample NLU queries. | None. | Safe/read-only. | Console outputs intent parsing results. |

### Enrichment & Content Updates
| Script | Purpose | Required Env | Safety Notes & Dry-Run | Verification / Troubleshooting |
| --- | --- | --- | --- | --- |
| `npm run enrich` | Enriches destinations via Google Places/Gemini; supports `--limit N` or `--all`. | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Google key. | Mutates `destinations` rows; throttle with `--limit` first. | Check `destinations.last_enriched_at` and spot-check new fields; review console success/error counts. |
| `npm run enrich:google` | Fills Google Places/timezone details (place IDs, address, coords, reviews). | Supabase URL + service/anon key, Google key. | Writes many fields on `destinations`; API rate-limited. | Look for "Enriched <slug>" logs; verify updated addresses/coords in Supabase. |
| `npm run enrich:comprehensive` | Broad enrichment combining Google and internal helpers. | Supabase URL + key, Google key. | Mutates enrichment fields; run in staging first. | Validate recent `last_enriched_at` and enrichment columns. |
| `npm run enrich:all-places-data` | Augments places with Google data for a wider dataset. | Supabase URL + key, Google key. | Writes to `destinations`; can be heavy—use small limits if adding flags. | Confirm targeted rows changed; monitor API quotas. |
| `npm run enrich:exa` | Uses Exa API to enrich/search content. | Supabase URL + key, `EXA_API_KEY`. | Writes enrichment data; Exa usage billed. | Check console counters and Supabase rows touched; inspect error list. |
| `npm run enrich:architects` | Adds architect details from Supabase lookups. | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. | Mutates architecture fields; ensure service role guarded. | Verify `architect`/`design_firm` columns updated; watch logs for missing IDs. |
| `npm run enrich:movements` | Adds architectural movements/styles. | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. | Writes movement/style tags. | Spot-check `architectural_style` fields after run. |
| `npm run enrich:materials` | Adds materials info to destinations. | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. | Writes material metadata. | Verify `materials`-related columns populate; review console warnings. |
| `npm run retry:tate-modern` | Reprocesses the Tate Modern record via Google API. | Supabase URL + key, Google key. | Single-row write; safe but still production touching. | Confirm Tate Modern fields updated; check console output. |
| `npm run generate:micro-descriptions` | Generates micro descriptions with Gemini and writes them back. | Supabase URL + service key, Google key. | Writes content; run small batches first. | Check `micro_description` column and log summary. |
| `npm run backfill-embeddings` | Generates embeddings (OpenAI) and stores them; respects batch/rate envs. | Supabase URL + key, `OPENAI_API_KEY`; optional `EMBEDDING_*` tuning vars. | Writes embedding vectors; costs tokens. | Monitor progress counters; confirm embedding version in Supabase; errors logged per row. |
| `npm run fetch:all-place-data` | Fetches Google Place data for all entries (read-only). | Google key. | Does not write; used for inspection/local files. | Expect JSON output per place; ensure quota available. |
| `npm run test:google-places` | Sample Google Places lookups. | Google key. | Read-only; no DB writes. | Look for place JSON output; ensure key enabled. |
| `npm run fetch:categories` | Pulls categories into Supabase for taxonomy maintenance. | Supabase URL + service key, Google key. | Writes category/type mappings; watch rate limits. | Check category tables for new rows. |
| `npm run update:google-trends` | Updates Google Trends metrics via RPC and recomputes trending scores. | Supabase service-role client and Google Trends credentials. | Writes trend metrics; limit 50 destinations/run to avoid quota issues. | Confirm `google_trends_updated_at` advances; check RPC logs for failures. |
| `npm run update:multi-source-trends` | Updates Reddit/News/Eventbrite metrics. | Supabase service role; optional `NEWS_API_KEY`/`GNEWS_API_KEY`/`EVENTBRITE_API_KEY`. | Writes multiple trend columns; rate limited with sleeps. | Check per-source counters in logs; verify `*_updated_at` fields; review errors list. |
| `npm run aggregate:user-data` | Aggregates user stats into summary tables. | Service-role Supabase key. | Writes aggregates; run off-peak to avoid contention. | Confirm aggregate tables refreshed and logs show completion. |
| `npm run list:columns` / `npm run list:all-columns` | Lists Supabase column metadata for destinations/all tables. | Supabase URL + key. | Read-only. | Output should print columns; useful for debugging migrations. |

### Migration & Sync Workflows
| Script | Purpose | Required Env | Safety Notes & Dry-Run | Verification / Troubleshooting |
| --- | --- | --- | --- | --- |
| `npm run migrate:026` | Applies migration 026 via `run-migration-026.ts`. | Supabase URL + service key. | Writes schema/data; back up before running. | Check migration status tables and logs for success. |
| `npm run discovery:export` | Exports destinations for Google Discovery Engine. | Supabase URL + service key; Google Cloud project/dataset vars. | Read-only export; verify credentials before running. | Expect export file/log; confirm Discovery Engine dataset receives documents. |
| `npm run discovery:import` | Imports destinations into Discovery Engine from file. | Google Cloud project + `DISCOVERY_ENGINE_DATA_STORE_ID`. | Writes to Discovery Engine; no dry-run, so validate inputs first. | Logs per-batch counts; verify documents in Discovery Engine console. |
| `npm run export:r2` | Sends destination markdown to Cloudflare R2 for AutoRAG. | Supabase URL + service key; `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, optional `R2_BUCKET_NAME`. | Supports `--dry-run` and `--limit` to preview; otherwise uploads and charges bandwidth. | Dry-run shows would-be uploads; verify bucket objects and Supabase source counts. |
| `npm run export:r2:dry-run` | Shorthand for `export:r2` with `--dry-run`. | Same as above. | Safe preview; no writes to R2. | Logs planned uploads only. |
| `npm run sanity:sync` | Pushes Supabase content into Sanity. | Supabase URL + key; Sanity project/dataset/version and `SANITY_TOKEN`. | Writes to Sanity; ensure correct dataset. | Check Sanity dashboard for updated documents; review script summary. |
| `npm run sanity:sync:reverse` | Pulls Sanity data back into Supabase. | Supabase URL + service key; Sanity project/dataset/version and read token. | Writes to Supabase—avoid running with production anon keys. | Verify affected tables and timestamps; check console for errors. |

