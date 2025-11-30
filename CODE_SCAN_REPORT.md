# Code Quality & Bug Scan Report

**Date:** 2025-11-30
**Repository:** Urban Manual
**Total Files Scanned:** ~839 TypeScript/TSX files

---

## Executive Summary

| Category | Severity | Count | Status |
|----------|----------|-------|--------|
| TypeScript `any` usage | Medium | 90+ occurrences | Needs cleanup |
| Missing error handling in APIs | High | ~131 routes | Action required |
| Missing rate limiting | High | ~139 routes | Action required |
| Empty catch blocks | Medium | 2 files | Fix immediately |
| TODO/FIXME comments | Low | 5 items | Review needed |
| Console.log in production | Low | 100+ occurrences | Most in scripts |
| dangerouslySetInnerHTML | Medium | 9 usages | Review for XSS |
| Duplicate components | Medium | 6 files | Consolidate |
| Large files needing refactor | Medium | 10+ files | Consider splitting |

---

## Critical Issues

### 1. Empty Catch Blocks (Swallowing Errors)

**Severity: High**

These files silently swallow errors, making debugging impossible:

| File | Line |
|------|------|
| `scripts/enrich-comprehensive.ts` | 172 |
| `lib/llm.ts` | 55 |

**Fix:** Add proper error logging or re-throw errors.

### 2. API Routes Missing Error Handling

**Severity: High**

Only **15 out of 146 API routes** use the `withErrorHandling` wrapper.

Routes using proper error handling:
- `app/api/account/delete/route.ts`
- `app/api/account/export/route.ts`
- `app/api/account/privacy/route.ts`
- `app/api/account/profile/route.ts`
- `app/api/categories/route.ts`
- `app/api/collections/route.ts`
- `app/api/destinations/nearby/route.ts`
- `app/api/destinations/report-issue/route.ts`
- `app/api/intelligence/itinerary/plan-day/route.ts`
- `app/api/intelligence/local-events/route.ts`
- `app/api/intelligence/natural-language/route.ts`
- `app/api/intelligence/route-optimizer/route.ts`
- `app/api/recommendations/personalized/route.ts`
- `app/api/recommendations/smart/route.ts`
- `app/api/routes/calculate/route.ts`

**Recommendation:** Apply `withErrorHandling` wrapper to all API routes.

### 3. API Routes Missing Rate Limiting

**Severity: High**

Only **7 out of 146 API routes** implement rate limiting:

- `app/api/achievements/check/route.ts`
- `app/api/recommendations/route.ts`
- `app/api/users/[user_id]/follow/route.ts`
- `app/api/users/[user_id]/route.ts`
- `app/api/users/search/route.ts`
- `app/api/visited-countries/[country_code]/route.ts`
- `app/api/visited-countries/route.ts`

**Risk:** Vulnerable to abuse, DoS attacks, and excessive API costs.

**Recommendation:** Add rate limiting to all public-facing endpoints, especially:
- AI endpoints (`/api/ai/*`, `/api/gemini-*`)
- Search endpoints (`/api/search/*`)
- Intelligence endpoints (`/api/intelligence/*`)

---

## Medium Priority Issues

### 4. TypeScript `any` Usage (~90+ occurrences)

**Severity: Medium**

Notable files with excessive `any` usage:

| File | Count | Notes |
|------|-------|-------|
| `scripts/sync-to-vertex-ai.ts` | 11 | Vertex AI SDK types |
| `tests/semantic-search.test.ts` | 12 | Test mocks |
| `scripts/enrich-with-exa.ts` | 15 | External API responses |
| `scripts/migrate-images-to-supabase.ts` | 6 | Dynamic updates |
| `hooks/useTrip.ts` | 6 | Trip item types |
| `app/account/page.tsx` | 13 | Parameters missing types |

**Example fixes needed:**
```typescript
// Bad
.map((r: any) => r.city)

// Good
.map((r: { city: string }) => r.city)
```

### 5. Duplicate Component Files

**Severity: Medium**

Found duplicate implementations that should be consolidated:

| Component | Locations |
|-----------|-----------|
| DestinationForm | `app/admin/components/DestinationForm.tsx` (746 lines)<br>`components/admin/DestinationForm.tsx` (722 lines) |
| SearchFilters | `src/features/search/SearchFilters.tsx` (701 lines)<br>`components/SearchFilters.tsx` |
| ConversationInterface | `app/components/chat/ConversationInterface.tsx`<br>`app/components/chat 2/ConversationInterface.tsx` (duplicate folder!) |

**Note:** The `chat 2/` directory with a space appears to be an accidental duplicate.

### 6. dangerouslySetInnerHTML Usage

**Severity: Medium**

These usages need XSS review:

| File | Line | Context |
|------|------|---------|
| `app/layout.tsx` | 116, 140, 151 | Schema/styles (likely safe) |
| `app/city/[city]/page.tsx` | 34 | Review needed |
| `app/page.tsx` | 2423 | Review needed |
| `components/icons/UntitledUIIcon.tsx` | 93 | SVG injection |
| `app/destination/[slug]/page.tsx` | 178, 186, 194 | Multiple usages |

**Recommendation:** Ensure all content is sanitized with `lib/sanitize-html.ts` before rendering.

### 7. Large Files Needing Refactoring

**Severity: Medium**

| File | Lines | Recommendation |
|------|-------|----------------|
| `src/features/detail/DestinationDrawer.tsx` | 3,690 | Split into subcomponents |
| `app/page.tsx` | 3,561 | Extract sections to components |
| `app/api/ai-chat/route.ts` | 1,619 | Split into services |
| `app/destination/[slug]/page-client.tsx` | 962 | Extract UI sections |
| `components/admin/cms/ContentManager.tsx` | 926 | Modularize |
| `app/trips/[id]/page.tsx` | 924 | Split into components |
| `app/account/page.tsx` | 904 | Extract tabs to files |
| `services/intelligence/recommendations-advanced.ts` | 850 | Consider splitting |

---

## Low Priority Issues

### 8. TODO/FIXME Comments (5 items)

| File | Line | Comment |
|------|------|---------|
| `lib/agents/itinerary-builder-agent.ts` | 177 | "TODO: Implement actual route optimization using Google Maps" |
| `lib/agents/tools/index.ts` | 105 | "TODO: Implement actual route optimization using Google Maps" |
| `lib/security/audit-log.ts` | 184 | "TODO: Implement storage to Supabase or external service" |
| `lib/security/account-recovery.ts` | 98 | Format comment (false positive) |
| `components/drawers/AISuggestionsDrawer.tsx` | 81 | "TODO: Implement individual suggestion application" |

### 9. Console Statements

**Severity: Low (mostly in scripts)**

Found 100+ `console.log/warn/error` statements. Most are in:
- `scripts/` directory (appropriate for CLI scripts)
- `contexts/TripContext.tsx` - error logging (acceptable)
- `app/search/page.tsx` - error logging (acceptable)

**Files to clean up (production code):**
- `contexts/ItineraryContext.tsx:46,55` - `console.error` in catch blocks
- `app/admin/components/SanitySync.tsx` - development logging

### 10. ESLint Disable Comments

| File | Reason | Action |
|------|--------|--------|
| `hooks/useDataFetching.ts:232` | Dependency array | Review if needed |
| `components/GoogleAd.tsx` | 6 `@ts-ignore` | AdSense SDK types |
| `src/features/search/SearchFilters.tsx:80` | Deps | Review |
| `components/plasmic/*` | `@ts-nocheck` | Auto-generated, OK |

---

## Security Review

### Authentication Coverage

**51 of 146 routes** check user authentication via `getUser()`.

Routes that may need auth but don't have it:
- Many `/api/discovery/*` routes
- `/api/autocomplete/route.ts`
- `/api/nearby/route.ts`
- `/api/trending/route.ts`

**Review:** Determine which routes should be public vs authenticated.

### No SQL Injection Risk Found

Supabase SDK is used correctly throughout - no raw SQL queries detected.

### No eval() Usage Found

No dangerous `eval()` or `new Function()` patterns found.

---

## Test Coverage Gap

**Current:** 6 test files for 839+ source files

**Test files:**
- `tests/homepage-loaders.test.ts`
- `tests/loading-message.test.ts`
- `tests/semantic-search.test.ts`
- `tests/upstash-integration.test.ts`
- `tests/nlu-test-queries.ts`
- `server/tests/routes-calculate-contract.test.ts`

**Recommendation:** Prioritize tests for:
1. API routes handling money/user data
2. Authentication flows
3. Search/recommendation logic
4. Trip planning functionality

---

## Recommended Priority Actions

### Immediate (This Sprint)
1. Fix empty catch blocks in `scripts/enrich-comprehensive.ts` and `lib/llm.ts`
2. Add rate limiting to AI and search endpoints
3. Remove duplicate `chat 2/` directory

### Short Term (Next 2 Sprints)
4. Apply `withErrorHandling` to all API routes
5. Consolidate duplicate components (DestinationForm, SearchFilters)
6. Review `dangerouslySetInnerHTML` usages for XSS

### Medium Term
7. Refactor large files (especially `DestinationDrawer.tsx`, `page.tsx`)
8. Replace `any` types with proper interfaces
9. Increase test coverage to at least 30%

### Long Term
10. Implement comprehensive E2E testing
11. Add authentication to all sensitive routes
12. Set up automated code quality checks in CI

---

## Files Changed

This report was generated by automated scanning. No code changes were made.

---

*Generated by Claude Code - 2025-11-30*
