# API Architecture Review & Refactoring Recommendations

**Date:** December 2024
**Scope:** 202 API endpoints in `/app/api/`

---

## Executive Summary

After reviewing all 202 API routes in the Urban Manual codebase, I've identified several areas for improvement across consistency, security, performance, and maintainability. The codebase has a solid foundation with good error handling utilities, but inconsistent adoption across APIs creates technical debt.

### Key Findings

| Area | Current State | Recommendation |
|------|---------------|----------------|
| Error Handling | 66% use `withErrorHandling` | Standardize to 100% |
| Rate Limiting | 68% have rate limits | Add to remaining public endpoints |
| Response Format | Multiple formats in use | Standardize with `createSuccessResponse` |
| Authentication | 2 different patterns | Unify into single pattern |
| Input Validation | Inconsistent timing | Validate early, fail fast |

---

## 1. Error Handling Inconsistencies

### Current State

The codebase has well-designed error utilities in `/lib/errors/`:
- `withErrorHandling` - wrapper for automatic error catching
- `createSuccessResponse` - standardized success responses
- `createErrorResponse` - standardized error responses
- `createValidationError`, `createUnauthorizedError`, etc. - error factories

**Problem:** Only ~66% of APIs use these utilities consistently.

### APIs Needing Refactoring

#### High Priority (Public-facing, no `withErrorHandling`):

1. **`/api/google-places-search/route.ts`** (Line 29-113)
   - Uses manual try-catch
   - Inconsistent error format: `{ error: 'message' }`
   - Missing rate limiting
   - API key check inside try block (should be early validation)

2. **`/api/cities/route.ts`** (Line 7-50)
   - Uses edge runtime (acceptable)
   - Manual error handling (acceptable for edge)
   - But response format inconsistent: `{ error: 'message' }` vs standard

3. **`/api/google-places-autocomplete/route.ts`**
   - Similar issues to google-places-search

4. **`/api/google-place-photo/route.ts`**
   - Similar issues

### Recommended Refactoring Pattern

**Before:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... business logic
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**After:**
```typescript
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  if (!body.query) {
    throw createValidationError('Query is required');
  }

  // ... business logic

  return createSuccessResponse({ data }, null, 200);
});
```

---

## 2. Response Format Standardization

### Current Inconsistencies

APIs return responses in multiple formats:

| Format | Examples | Count |
|--------|----------|-------|
| `{ success: true, data: ... }` | Error utilities | ~10% |
| `{ data: ... }` | Some APIs | ~30% |
| `{ trips: [...] }` | `/api/trips` | ~5% |
| `{ results: [...] }` | `/api/search` | ~10% |
| `{ places: [...] }` | `/api/google-places-search` | ~5% |
| `{ recommendations: [...] }` | `/api/recommendations` | ~5% |
| Direct array `[...]` | Some endpoints | ~5% |

### Recommended Standard Response Format

```typescript
// Success Response
{
  success: true,
  data: {
    // Primary data (use domain-specific key inside)
    trips: [...],     // or results, places, etc.
  },
  meta: {
    count: 10,
    page: 1,
    cached: false,
    // etc.
  },
  errors: []
}

// Error Response
{
  success: false,
  data: null,
  meta: null,
  errors: [{
    message: "Validation failed",
    code: "VALIDATION_ERROR",
    details: { field: ["error message"] }
  }]
}
```

### Migration Strategy

Create a wrapper function that maintains backward compatibility:

```typescript
// lib/errors/response.ts
export function createApiResponse<T>(
  data: T,
  options?: {
    meta?: Record<string, any>;
    status?: number;
    // Legacy key for backward compatibility
    legacyKey?: string;
  }
) {
  const response = {
    success: true,
    data,
    meta: options?.meta || null,
    errors: [],
  };

  // Backward compatibility: also include legacy key at root
  if (options?.legacyKey) {
    (response as any)[options.legacyKey] = data;
  }

  return NextResponse.json(response, { status: options?.status || 200 });
}
```

---

## 3. Rate Limiting Gaps

### Endpoints Missing Rate Limiting

These public endpoints lack rate limiting and are vulnerable to abuse:

| Endpoint | Risk Level | Recommended Limiter |
|----------|------------|---------------------|
| `/api/google-places-search` | HIGH | `proxyRatelimit` (external API) |
| `/api/google-places-autocomplete` | HIGH | `proxyRatelimit` |
| `/api/google-place-photo` | HIGH | `proxyRatelimit` |
| `/api/categories` | LOW | `apiRatelimit` |
| `/api/brands/[brand]` | LOW | `apiRatelimit` |
| `/api/weather` | MEDIUM | `proxyRatelimit` |
| `/api/nearby` | MEDIUM | `apiRatelimit` |
| `/api/related-destinations` | LOW | `apiRatelimit` |

### Recommended Implementation

Use the existing `enforceRateLimit` helper:

```typescript
import { enforceRateLimit, proxyRatelimit, memoryProxyRatelimit } from '@/lib/rate-limit';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limit check
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many requests to external API',
    limiter: proxyRatelimit,
    memoryLimiter: memoryProxyRatelimit,
  });

  if (rateLimitResponse) return rateLimitResponse;

  // ... rest of handler
});
```

---

## 4. Authentication Pattern Unification

### Current State

Two separate authentication patterns exist:

**Pattern 1: Server Client (Most APIs)**
```typescript
// lib/supabase/server.ts
const supabase = await createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw createUnauthorizedError();
```

**Pattern 2: Admin Auth (Admin APIs)**
```typescript
// lib/adminAuth.ts
const { user, serviceClient } = await requireAdmin(request);
```

### Inconsistencies

1. `AuthError` in `/lib/adminAuth.ts` is separate from `CustomError` in `/lib/errors/types.ts`
2. Admin routes don't use `withErrorHandling`, handling `AuthError` manually
3. Different error response formats between the two systems

### Recommended Unification

**Option A: Extend Error System**

Add admin-specific errors to the existing error system:

```typescript
// lib/errors/types.ts
export enum ErrorCode {
  // ... existing codes
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',
}

// lib/errors/auth.ts
export async function requireAuth(request: NextRequest): Promise<User> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw createUnauthorizedError();
  }

  return user;
}

export async function requireAdmin(request: NextRequest): Promise<{
  user: User;
  serviceClient: SupabaseClient;
}> {
  const user = await requireAuth(request);

  const role = (user.app_metadata as Record<string, any> | null)?.role;
  if (role !== 'admin') {
    throw new CustomError(ErrorCode.ADMIN_REQUIRED, 'Admin access required', 403);
  }

  const serviceClient = createServiceRoleClient();
  return { user, serviceClient };
}
```

**Option B: Create Middleware Wrappers**

```typescript
// lib/errors/api-handler.ts
export function withAuth(
  handler: (req: NextRequest, user: User) => Promise<NextResponse>
) {
  return withErrorHandling(async (req: NextRequest) => {
    const user = await requireAuth(req);
    return handler(req, user);
  });
}

export function withAdminAuth(
  handler: (req: NextRequest, ctx: { user: User; serviceClient: SupabaseClient }) => Promise<NextResponse>
) {
  return withErrorHandling(async (req: NextRequest) => {
    const ctx = await requireAdmin(req);
    return handler(req, ctx);
  });
}
```

**Usage:**
```typescript
export const POST = withAdminAuth(async (request, { user, serviceClient }) => {
  // Admin-only logic
  return createSuccessResponse({ data });
});
```

---

## 5. Input Validation Improvements

### Current Issues

1. **Late validation** - Some APIs validate inside try blocks after parsing JSON
2. **Inconsistent error messages** - Different formats for validation errors
3. **No schema validation** - Manual field checking instead of schema validation

### Recommendation: Add Zod Schema Validation

```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

export const searchQuerySchema = z.object({
  query: z.string().min(2, 'Query must be at least 2 characters'),
  filters: z.object({
    city: z.string().optional(),
    category: z.string().optional(),
    rating: z.number().min(0).max(5).optional(),
    priceLevel: z.number().min(0).max(4).optional(),
  }).optional(),
  userId: z.string().uuid().optional(),
  session_token: z.string().optional(),
});

export const tripCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  destination: z.string().min(1, 'Destination is required'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  items: z.array(z.object({
    destination_slug: z.string(),
    day: z.number(),
    order_index: z.number(),
    time: z.string().optional(),
    title: z.string(),
    notes: z.string().optional(),
  })).optional(),
});

// lib/validation/validate.ts
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw createValidationError(
      'Validation failed',
      formatZodErrors(result.error)
    );
  }
  return result.data;
}
```

**Usage:**
```typescript
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { query, filters } = validateBody(searchQuerySchema, body);

  // Body is now typed and validated
});
```

---

## 6. Duplicate Code Patterns

### Identified Duplications

1. **Rate limiting setup** - Repeated in every API that uses it
2. **User authentication check** - Same 5 lines in ~70 APIs
3. **Supabase client creation** - Repeated pattern
4. **Error logging format** - Inconsistent `console.error` calls

### Recommendation: Create Higher-Order Functions

```typescript
// lib/api/middleware.ts
import { compose } from './utils';

type Middleware = (handler: ApiHandler) => ApiHandler;

export const withRateLimit = (
  limiter: RateLimiter,
  memoryLimiter: RateLimiter,
  message: string
): Middleware => (handler) => async (req, ctx) => {
  const response = await enforceRateLimit({
    request: req,
    userId: ctx?.user?.id,
    message,
    limiter,
    memoryLimiter,
  });
  if (response) return response;
  return handler(req, ctx);
};

export const withLogging = (apiName: string): Middleware => (handler) => async (req, ctx) => {
  const start = Date.now();
  try {
    const response = await handler(req, ctx);
    console.log(`[${apiName}] ${req.method} completed in ${Date.now() - start}ms`);
    return response;
  } catch (error) {
    console.error(`[${apiName}] Error:`, error);
    throw error;
  }
};

// Usage: Compose middleware
export const POST = compose(
  withErrorHandling,
  withAuth,
  withRateLimit(searchRatelimit, memorySearchRatelimit, 'Too many search requests'),
  withLogging('search')
)(async (request, { user }) => {
  // Handler logic
});
```

---

## 7. API Endpoint Consolidation Opportunities

### Redundant/Overlapping APIs

| APIs | Overlap | Recommendation |
|------|---------|----------------|
| `/api/search/*` (10 endpoints) | Multiple search strategies | Consolidate into single `/api/search` with `strategy` param |
| `/api/recommendations/*` (5 endpoints) | Different recommendation types | Consolidate with `type` param |
| `/api/discovery/*` (12 endpoints) | Discovery features | Consider GraphQL or single REST endpoint |
| `/api/intelligence/*` (28 endpoints) | AI features | Group by function, reduce count |

### Example Consolidation

**Before:** 5 separate search endpoints
```
/api/search
/api/search/ai
/api/search/semantic
/api/search/instant
/api/search/intelligent
```

**After:** Single endpoint with options
```typescript
// POST /api/search
{
  "query": "best restaurants tokyo",
  "strategy": "auto", // auto, semantic, instant, ai
  "options": {
    "limit": 20,
    "includeAiInsights": true
  }
}
```

---

## 8. Performance Improvements

### Edge Runtime Candidates

These read-only APIs could benefit from edge runtime:

| Endpoint | Current | Benefit |
|----------|---------|---------|
| `/api/categories` | Node.js | ~100ms cold start reduction |
| `/api/brands/[brand]` | Node.js | ~100ms cold start reduction |
| `/api/autocomplete` | Node.js | Latency-sensitive, good candidate |
| `/api/health` | Node.js | Already lightweight |

### Caching Improvements

Add cache headers to more endpoints:

```typescript
// High cache (rarely changes)
const response = NextResponse.json(data);
response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');

// Medium cache (changes occasionally)
response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

// Low cache (user-specific, but can cache briefly)
response.headers.set('Cache-Control', 'private, max-age=60');
```

---

## 9. Security Enhancements

### Missing Security Measures

1. **No input sanitization** on some endpoints
2. **SQL injection potential** with dynamic `.or()` queries
3. **No request size limits** on some POST endpoints

### Recommendations

```typescript
// lib/security/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

export function escapeForLike(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// Usage in search
const safeQuery = escapeForLike(sanitizeInput(query));
fullTextQuery = fullTextQuery.or(`name.ilike.%${safeQuery}%`);
```

---

## 10. Implementation Priority

### Phase 1: Critical (Immediate)
1. Add rate limiting to Google Places APIs
2. Standardize error handling on public endpoints
3. Add input sanitization to search endpoints

### Phase 2: Important (2-4 weeks)
4. Unify authentication patterns
5. Add Zod validation to all endpoints
6. Standardize response formats

### Phase 3: Enhancement (1-2 months)
7. Consolidate redundant APIs
8. Add edge runtime to suitable endpoints
9. Implement caching strategy
10. Create middleware composition system

---

## Files to Refactor (Priority Order)

### Critical (Security/Stability)
1. `app/api/google-places-search/route.ts`
2. `app/api/google-places-autocomplete/route.ts`
3. `app/api/google-place-photo/route.ts`
4. `app/api/search/route.ts` (input sanitization)

### Important (Consistency)
5. `app/api/trips/route.ts` (response format)
6. `app/api/recommendations/route.ts` (duplicate rate limiting)
7. `app/api/cities/route.ts` (response format)
8. `app/api/admin/reindex-destinations/route.ts` (use unified auth)

### Enhancement (Clean Code)
9. All `/api/intelligence/*` routes (consolidation)
10. All `/api/search/*` routes (consolidation)
11. All `/api/discovery/*` routes (consolidation)

---

## Appendix: Quick Reference

### Standard API Template

```typescript
import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  withErrorHandling,
  createSuccessResponse,
  createValidationError,
  createUnauthorizedError
} from '@/lib/errors';
import {
  apiRatelimit,
  memoryApiRatelimit,
  enforceRateLimit
} from '@/lib/rate-limit';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Rate limiting
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many requests',
    limiter: apiRatelimit,
    memoryLimiter: memoryApiRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // 2. Parse and validate input
  const body = await request.json();
  if (!body.requiredField) {
    throw createValidationError('requiredField is required');
  }

  // 3. Authentication (if needed)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw createUnauthorizedError();
  }

  // 4. Business logic
  const result = await doSomething(body);

  // 5. Return standardized response
  return createSuccessResponse(result, { count: result.length });
});
```

### Error Codes Reference

```typescript
enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}
```
