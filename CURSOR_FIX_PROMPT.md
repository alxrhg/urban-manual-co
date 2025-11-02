# Cursor AI Prompt: Fix Code Review Issues

## Context
A comprehensive code review has been completed (see CODE_REVIEW_REPORT.md). This prompt will guide you through fixing the identified issues systematically.

## Instructions
Fix the issues identified in CODE_REVIEW_REPORT.md, prioritizing critical security issues first, then high-priority issues, then medium-priority improvements. Work through each section methodically.

---

## Phase 1: Critical Security Fixes (MUST DO FIRST)

### 1.1 Fix Admin Authentication Security
**Problem:** Admin endpoints (`/api/upload-image`, `/api/enrich-google`, `/api/is-admin`) rely only on email headers which can be spoofed.

**Tasks:**
1. Update `/app/api/is-admin/route.ts`:
   - Remove email-based header check
   - Use Supabase Auth to verify user identity server-side
   - Check JWT token from Authorization header
   - Verify user email matches admin list AFTER authentication

2. Update `/app/api/upload-image/route.ts`:
   - Replace `x-admin-email` header check with proper Supabase Auth verification
   - Use `createServerClient()` to get authenticated user
   - Verify user is authenticated AND email is in admin list

3. Update `/app/api/enrich-google/route.ts`:
   - Same as above - use Supabase Auth instead of header check
   - Verify authentication before checking admin status

**Implementation Pattern:**
```typescript
// Correct pattern to use:
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check admin status
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    
    if (!adminEmails.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Proceed with admin operation...
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 1.2 Fix Service Role Key Fallback
**Problem:** Multiple API routes fall back to anon key when service role key is missing, potentially bypassing RLS.

**Tasks:**
1. Update `/lib/supabase-server.ts`:
   - In `createServiceRoleClient()`, throw error if key is missing (don't allow fallback)
   - Add validation at module level

2. Find all API routes using service role key fallback pattern:
   ```typescript
   // BAD PATTERN:
   const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key')
   ```

3. Replace with:
   ```typescript
   // GOOD PATTERN:
   const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
   if (!SUPABASE_KEY) {
     throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this operation');
   }
   ```

**Files to fix:**
- `/app/api/ai-chat/route.ts`
- `/app/api/search/route.ts`
- `/app/api/enrich-google/route.ts`
- `/app/api/gemini-place-recommendations/route.ts`
- `/app/api/gemini-recommendations/route.ts`
- `/app/api/regenerate-content/route.ts`

### 1.3 Remove Placeholder Credentials
**Problem:** Placeholder values mask configuration issues.

**Tasks:**
1. Create `/lib/env-validation.ts`:
   ```typescript
   // Validate required environment variables
   export function validateEnv() {
     const required = {
       NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
       NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
     };
     
     const missing = Object.entries(required)
       .filter(([_, value]) => !value)
       .map(([key]) => key);
     
     if (missing.length > 0) {
       throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
     }
   }
   ```

2. Call `validateEnv()` in `/app/layout.tsx` or create a startup check

3. Remove all placeholder fallbacks - fail fast instead:
   ```typescript
   // BAD:
   const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
   
   // GOOD:
   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
   if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
   ```

### 1.4 Secure Google Maps API Key Usage
**Problem:** API keys exposed in client-side components.

**Tasks:**
1. Update `/components/DestinationDrawer.tsx`:
   - Move map embed to server-side or use Next.js Image component
   - Consider using a proxy endpoint for map embeds

2. Update `/components/MapView.tsx`:
   - Ensure API key restrictions are documented
   - Add note about HTTP referrer restrictions needed

3. Create `/app/api/maps-embed/route.ts` proxy endpoint:
   ```typescript
   // Proxy endpoint to hide API key
   export async function GET(request: NextRequest) {
     const { searchParams } = new URL(request.url);
     const place = searchParams.get('place');
     const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Server-side only
     
     if (!apiKey || !place) {
       return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
     }
     
     // Return embed URL with server-side API key
     return NextResponse.redirect(
       `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(place)}&zoom=15`
     );
   }
   ```

---

## Phase 2: High Priority Fixes

### 2.1 Improve Type Safety
**Problem:** 19+ instances of `any` type, missing type definitions.

**Tasks:**
1. Create `/types/api.ts` with shared API types:
   ```typescript
   export interface Destination {
     id: number;
     slug: string;
     name: string;
     city: string;
     category: string;
     description?: string;
     content?: string;
     image?: string;
     michelin_stars?: number;
     crown?: boolean;
     rating?: number;
     price_level?: number;
     // Add all fields from database
   }
   
   export interface SearchResponse {
     results: Destination[];
     searchTier: 'vector-semantic' | 'fulltext' | 'ai-fields' | 'keyword' | 'basic';
     intent?: QueryIntent;
     suggestions?: string[];
   }
   
   export interface QueryIntent {
     keywords: string[];
     city?: string;
     category?: string;
     filters?: {
       openNow?: boolean;
       priceLevel?: number;
       rating?: number;
       michelinStar?: number;
     };
   }
   ```

2. Replace `any` types in:
   - `/app/api/search/route.ts` - Use `Destination[]`, `SearchResponse`
   - `/app/api/ai-chat/route.ts` - Use proper types
   - `/app/api/recommendations/route.ts` - Use proper types
   - All other files with `any` types

3. Generate Supabase types:
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
   ```

### 2.2 Improve Error Handling
**Problem:** Silent failures, inconsistent error handling patterns.

**Tasks:**
1. Create `/lib/errors.ts`:
   ```typescript
   export class AppError extends Error {
     constructor(
       message: string,
       public statusCode: number = 500,
       public code?: string
     ) {
       super(message);
       this.name = 'AppError';
     }
   }
   
   export function handleApiError(error: unknown): NextResponse {
     if (error instanceof AppError) {
       return NextResponse.json(
         { error: error.message, code: error.code },
         { status: error.statusCode }
       );
     }
     
     console.error('Unexpected error:', error);
     return NextResponse.json(
       { error: 'Internal server error' },
       { status: 500 }
     );
   }
   ```

2. Create standardized error response format:
   ```typescript
   interface ErrorResponse {
     error: string;
     code?: string;
     details?: unknown;
   }
   ```

3. Update all API routes to use standardized error handling

4. Remove silent error swallowing - return proper error responses

### 2.3 Replace Console Logging with Structured Logging
**Problem:** 135+ console.log statements, no structured logging.

**Tasks:**
1. Install logging library:
   ```bash
   npm install pino pino-pretty
   ```

2. Create `/lib/logger.ts`:
   ```typescript
   import pino from 'pino';
   
   export const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     ...(process.env.NODE_ENV === 'development' && {
       transport: {
         target: 'pino-pretty',
         options: {
           colorize: true,
         },
       },
     }),
   });
   ```

3. Replace all `console.log/error/warn/debug` with logger:
   ```typescript
   // BAD:
   console.log('Search found', results.length, 'results');
   console.error('Error:', error);
   
   // GOOD:
   logger.info({ resultsCount: results.length }, 'Search completed');
   logger.error({ error }, 'Search failed');
   ```

4. Remove debug logs from production code or guard with log level

### 2.4 Extract Code Duplication
**Problem:** Duplicated logic in search/AI routes.

**Tasks:**
1. Create `/lib/embeddings.ts`:
   ```typescript
   // Shared embedding generation
   export async function generateEmbedding(text: string): Promise<number[] | null> {
     // Extract from ai-chat/route.ts and search/route.ts
   }
   ```

2. Create `/lib/query-parser.ts`:
   ```typescript
   // Shared query parsing logic
   export async function understandQuery(query: string): Promise<QueryIntent> {
     // Extract from ai-chat/route.ts and search/route.ts
   }
   ```

3. Create `/lib/category-synonyms.ts`:
   ```typescript
   // Shared category mapping
   export const CATEGORY_SYNONYMS: Record<string, string> = {
     // Extract from multiple files
   };
   ```

4. Update routes to use shared utilities

### 2.5 Add Rate Limiting
**Problem:** No rate limiting on API endpoints.

**Tasks:**
1. Install rate limiting:
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

2. Create `/lib/rate-limit.ts`:
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';
   
   export const rateLimiter = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(10, '10 s'),
     analytics: true,
   });
   ```

3. Add rate limiting to expensive endpoints:
   - `/app/api/ai-chat/route.ts`
   - `/app/api/search/route.ts`
   - `/app/api/enrich-google/route.ts`

### 2.6 Standardize API Response Format
**Problem:** Inconsistent API response formats.

**Tasks:**
1. Create `/lib/api-response.ts`:
   ```typescript
   export interface ApiResponse<T> {
     data?: T;
     error?: string;
     meta?: {
       page?: number;
       limit?: number;
       total?: number;
     };
   }
   ```

2. Update all API routes to use consistent format

---

## Phase 3: Medium Priority Improvements

### 3.1 Add Request Caching
**Tasks:**
1. Implement caching for embeddings (use Redis or in-memory cache)
2. Cache AI-generated responses
3. Add cache headers to API responses

### 3.2 Environment Variable Validation
**Tasks:**
1. Use `zod` for env validation:
   ```bash
   npm install zod
   ```

2. Create `/lib/env.ts`:
   ```typescript
   import { z } from 'zod';
   
   const envSchema = z.object({
     NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
     NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
     SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
     GOOGLE_API_KEY: z.string().optional(),
     // ... all env vars
   });
   
   export const env = envSchema.parse(process.env);
   ```

### 3.3 Optimize Bundle Sizes
**Tasks:**
1. Analyze bundle with `@next/bundle-analyzer`
2. Use dynamic imports for heavy components
3. Lazy load admin routes
4. Remove unused dependencies

---

## Implementation Order

1. **CRITICAL:** Fix all security issues (Phase 1) - DO THIS FIRST
2. **HIGH:** Improve type safety and error handling (Phase 2.1-2.2)
3. **HIGH:** Replace console logging (Phase 2.3)
4. **HIGH:** Extract code duplication (Phase 2.4)
5. **HIGH:** Add rate limiting (Phase 2.5)
6. **HIGH:** Standardize API responses (Phase 2.6)
7. **MEDIUM:** Implement caching and optimizations (Phase 3)

---

## Testing Checklist

After each fix:
- [ ] Verify API endpoints still work
- [ ] Check authentication flows
- [ ] Test error scenarios
- [ ] Verify no console errors
- [ ] Check TypeScript compilation
- [ ] Test in both dev and production builds

---

## Notes

- Always test changes before committing
- Keep security fixes as separate commits
- Document breaking changes
- Update types incrementally
- Preserve existing functionality while improving code quality

---

**Start with Phase 1 (Critical Security Fixes) and work through systematically.**
