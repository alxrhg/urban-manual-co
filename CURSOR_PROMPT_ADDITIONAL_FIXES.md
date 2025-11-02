# Cursor AI Prompt: Fix Additional Code Review Issues

## Context
This prompt addresses issues from `CODE_REVIEW_REPORT.md` that were NOT covered in the main fix prompt. See `ADDITIONAL_ISSUES_NOT_IN_PROMPT.md` for the full list.

## Instructions
Work through each phase systematically, testing after each major change. These are supplementary fixes that should be done after or alongside the main security fixes.

---

## Phase 1: Quick Wins & Cleanup (Do First)

### 1.1 Remove Duplicate Files
**Problem:** 8 files with " 2" suffix exist in the repository.

**Tasks:**
1. Review each duplicate file to determine which version is correct:
   - `data/cityCountryMap 2.ts` vs `data/cityCountryMap.ts`
   - `contexts/ThemeContext 2.tsx` vs `contexts/ThemeContext.tsx`
   - `hooks/useDebounce 2.ts` vs `hooks/useDebounce.ts` (if exists)
   - `hooks/useInfiniteScroll 2.ts` vs `hooks/useInfiniteScroll.ts` (if exists)
   - `hooks/useComposition 2.ts` vs `hooks/useComposition.ts` (if exists)
   - `lib/utils 2.ts` vs `lib/utils.ts`
   - `lib/analytics 2.ts` vs `lib/analytics.ts`
   - `types/destination 2.ts` vs `types/destination.ts`

2. For each pair:
   - Compare both versions (use `git diff` or read both)
   - Identify which is the correct/current version
   - Update any imports that reference the " 2" version
   - Delete the duplicate " 2" file

3. Update `.gitignore` to prevent future duplicates:
   ```
   # Prevent duplicate files
   * 2.*
   * 2.ts
   * 2.tsx
   *.backup
   ```

**Example:**
```bash
# Check what uses the duplicate
grep -r "destination 2" --include="*.ts" --include="*.tsx"
grep -r "cityCountryMap 2" --include="*.ts" --include="*.tsx"

# After confirming which to keep, delete duplicates
rm "data/cityCountryMap 2.ts"
rm "contexts/ThemeContext 2.tsx"
# ... etc
```

### 1.2 Remove Backup Files
**Problem:** `components/DestinationDrawer.tsx.backup` is in the repository.

**Tasks:**
1. Verify `components/DestinationDrawer.tsx` is the current version
2. Delete `components/DestinationDrawer.tsx.backup`
3. Ensure `.gitignore` includes `*.backup` (from step 1.1)

### 1.3 Consolidate Type Definitions
**Problem:** Two different destination type definitions exist.

**Tasks:**
1. Read both files:
   - `types/destination.ts`
   - `types/destination 2.ts` (if still exists)

2. Determine the correct structure based on:
   - What's actually in the database schema
   - What's used throughout the codebase
   - Which fields are most complete

3. Create a single consolidated type in `types/destination.ts`:
   ```typescript
   export interface Destination {
     // Database fields
     id?: number;
     slug: string;
     name: string;
     city: string;
     country?: string;
     category: string;
     content?: string;
     description?: string;
     image?: string;
     mainImage?: string; // Check which is used
     michelin_stars?: number;
     michelinStars?: number; // Check which is used
     crown?: boolean;
     
     // Enrichment fields
     place_id?: string | null;
     rating?: number | null;
     price_level?: number | null;
     opening_hours?: any; // TODO: Replace with proper type
     phone_number?: string | null;
     website?: string | null;
     google_maps_url?: string | null;
     instagram_handle?: string | null;
     instagram_url?: string | null;
     tags?: string[] | null;
     last_enriched_at?: string | null;
     
     // Computed fields
     save_count?: number;
     lat?: number;
     long?: number;
     myRating?: number;
     reviewed?: boolean;
     subline?: string;
     brand?: string;
     cardTags?: string;
   }
   ```

4. Update all imports to use the consolidated type
5. Remove `types/destination 2.ts`

---

## Phase 2: High Priority Fixes

### 2.1 Add Error Boundaries to All Pages
**Problem:** Not all pages are wrapped in error boundaries.

**Tasks:**
1. Review existing `components/ErrorBoundary.tsx` - it's already implemented ✅

2. Create a reusable wrapper component `/app/error-boundary-wrapper.tsx`:
   ```typescript
   'use client';
   
   import { ErrorBoundary } from '@/components/ErrorBoundary';
   
   interface ErrorBoundaryWrapperProps {
     children: React.ReactNode;
     fallback?: React.ReactNode;
   }
   
   export function ErrorBoundaryWrapper({ 
     children, 
     fallback 
   }: ErrorBoundaryWrapperProps) {
     return (
       <ErrorBoundary fallback={fallback}>
         {children}
       </ErrorBoundary>
     );
   }
   ```

3. Wrap all page components. Options:

   **Option A:** Wrap in root layout (simplest):
   ```typescript
   // app/layout.tsx
   import { ErrorBoundaryWrapper } from '@/app/error-boundary-wrapper';
   
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>
           <ErrorBoundaryWrapper>
             <AuthProvider>
               <Header />
               <main>{children}</main>
               <Footer />
             </AuthProvider>
           </ErrorBoundaryWrapper>
         </body>
       </html>
     );
   }
   ```

   **Option B:** Wrap individual pages (more granular):
   - Wrap each page component that does data fetching
   - Better error isolation but more work

4. Test error boundaries:
   - Throw an error in a component to verify it catches
   - Ensure "Try again" button works
   - Verify errors are logged properly

### 2.2 Enhance Input Validation
**Problem:** Specific validation gaps in API routes.

**Tasks:**
1. Install zod (if not already):
   ```bash
   npm install zod
   ```

2. Create validation schemas `/lib/validation.ts`:
   ```typescript
   import { z } from 'zod';
   
   // Search query validation
   export const searchQuerySchema = z.object({
     q: z.string()
       .min(1, 'Query cannot be empty')
       .max(500, 'Query too long')
       .trim(),
     city: z.string().max(100).optional(),
     category: z.string().max(50).optional(),
     limit: z.coerce.number().int().min(1).max(100).optional().default(20),
     offset: z.coerce.number().int().min(0).optional().default(0),
   });
   
   // Upload validation
   export const uploadSchema = z.object({
     slug: z.string()
       .regex(/^[a-z0-9-]+$/i, 'Invalid slug format')
       .min(1)
       .max(100),
     file: z.instanceof(File)
       .refine((f) => f.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
       .refine((f) => f.type.startsWith('image/'), 'File must be an image')
       .refine(
         (f) => ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(f.type),
         'Invalid image format. Use JPEG, PNG, WebP, or AVIF'
       ),
   });
   
   // AI Chat query validation
   export const aiChatQuerySchema = z.object({
     message: z.string()
       .min(1, 'Message cannot be empty')
       .max(2000, 'Message too long')
       .trim(),
     conversationId: z.string().uuid().optional(),
   });
   ```

3. Update API routes to use validation:

   **`app/api/search/route.ts`:**
   ```typescript
   import { searchQuerySchema } from '@/lib/validation';
   
   export async function GET(request: NextRequest) {
     try {
       const { searchParams } = new URL(request.url);
       const query = searchParams.get('q') || '';
       const city = searchParams.get('city') || undefined;
       
       // Validate input
       const validated = searchQuerySchema.parse({
         q: query,
         city,
         limit: searchParams.get('limit'),
         offset: searchParams.get('offset'),
       });
       
       // Use validated.q, validated.city, etc.
       // ...
     } catch (error) {
       if (error instanceof z.ZodError) {
         return NextResponse.json(
           { error: 'Invalid input', details: error.errors },
           { status: 400 }
         );
       }
       throw error;
     }
   }
   ```

   **`app/api/upload-image/route.ts`:**
   ```typescript
   import { uploadSchema } from '@/lib/validation';
   
   export async function POST(request: NextRequest) {
     try {
       // ... auth check ...
       
       const formData = await request.formData();
       const file = formData.get('file') as File;
       const slug = formData.get('slug') as string;
       
       // Validate
       const validated = uploadSchema.parse({ slug, file });
       
       // Use validated.file, validated.slug
       // ...
     } catch (error) {
       if (error instanceof z.ZodError) {
         return NextResponse.json(
           { error: 'Invalid input', details: error.errors },
           { status: 400 }
         );
       }
       throw error;
     }
   }
   ```

   **`app/api/ai-chat/route.ts`:**
   ```typescript
   import { aiChatQuerySchema } from '@/lib/validation';
   
   export async function POST(request: NextRequest) {
     try {
       const body = await request.json();
       
       // Validate
       const validated = aiChatQuerySchema.parse(body);
       
       // Use validated.message
       // ...
     } catch (error) {
       if (error instanceof z.ZodError) {
         return NextResponse.json(
           { error: 'Invalid input', details: error.errors },
           { status: 400 }
         );
       }
       throw error;
     }
   }
   ```

### 2.3 Add Loading States
**Problem:** Some components don't show loading states during async operations.

**Tasks:**
1. Create a loading component `/components/LoadingSpinner.tsx`:
   ```typescript
   import { Loader2 } from 'lucide-react';
   
   interface LoadingSpinnerProps {
     size?: 'sm' | 'md' | 'lg';
     text?: string;
   }
   
   export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
     const sizes = {
       sm: 'w-4 h-4',
       md: 'w-6 h-6',
       lg: 'w-8 h-8',
     };
     
     return (
       <div className="flex items-center justify-center gap-2 p-4">
         <Loader2 className={`${sizes[size]} animate-spin text-gray-600 dark:text-gray-400`} />
         {text && <span className="text-sm text-gray-600 dark:text-gray-400">{text}</span>}
       </div>
     );
   }
   ```

2. Create skeleton components for common patterns:
   ```typescript
   // components/DestinationCardSkeleton.tsx
   export function DestinationCardSkeleton() {
     return (
       <div className="animate-pulse">
         <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48 mb-4" />
         <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 w-3/4 mb-2" />
         <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 w-1/2" />
       </div>
     );
   }
   ```

3. Add loading states to key components:

   **`app/page.tsx`:**
   ```typescript
   const [loading, setLoading] = useState(true);
   
   useEffect(() => {
     async function fetchDestinations() {
       setLoading(true);
       try {
         // ... fetch logic ...
       } finally {
         setLoading(false);
       }
     }
     fetchDestinations();
   }, []);
   
   if (loading) {
     return <LoadingSpinner text="Loading destinations..." />;
   }
   ```

   **`app/destination/[slug]/page-client.tsx`:**
   ```typescript
   // Use React Suspense or loading state
   if (isLoading) {
     return (
       <div className="container mx-auto p-6">
         <LoadingSpinner text="Loading destination..." />
       </div>
     );
   }
   ```

   **`components/MorphicSearch.tsx`:**
   ```typescript
   const [isSearching, setIsSearching] = useState(false);
   
   // When search starts
   setIsSearching(true);
   
   // Show loading indicator
   {isSearching && <LoadingSpinner size="sm" text="Searching..." />}
   ```

### 2.4 Set Up Test Infrastructure
**Problem:** No test infrastructure despite Vitest config existing.

**Tasks:**
1. Install testing dependencies:
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
   ```

2. Update `vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   import path from 'path';
   
   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: ['./vitest.setup.ts'],
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './'),
       },
     },
   });
   ```

3. Create `vitest.setup.ts`:
   ```typescript
   import '@testing-library/jest-dom';
   ```

4. Add test scripts to `package.json`:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:watch": "vitest --watch",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```

5. Write initial tests for utilities:

   **`lib/utils.test.ts`:**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { cn } from './utils';
   
   describe('cn utility', () => {
     it('merges class names correctly', () => {
       expect(cn('foo', 'bar')).toBe('foo bar');
     });
     
     it('handles conditional classes', () => {
       expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
     });
   });
   ```

   **`lib/stripHtmlTags.test.ts`:**
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { stripHtmlTags } from './stripHtmlTags';
   
   describe('stripHtmlTags', () => {
     it('removes HTML tags', () => {
       expect(stripHtmlTags('<p>Hello</p>')).toBe('Hello');
     });
     
     it('handles nested tags', () => {
       expect(stripHtmlTags('<div><span>Test</span></div>')).toBe('Test');
     });
     
     it('returns empty string for empty input', () => {
       expect(stripHtmlTags('')).toBe('');
     });
   });
   ```

6. Write API route tests:
   ```typescript
   // app/api/health/route.test.ts
   import { describe, it, expect } from 'vitest';
   import { GET } from './route';
   import { NextRequest } from 'next/server';
   
   describe('/api/health', () => {
     it('returns health status', async () => {
       const request = new NextRequest('http://localhost/api/health');
       const response = await GET(request);
       const data = await response.json();
       
       expect(response.status).toBe(200);
       expect(data).toHaveProperty('status', 'ok');
     });
   });
   ```

---

## Phase 3: Medium Priority Improvements

### 3.1 Add JSDoc Comments
**Problem:** Utility functions lack documentation.

**Tasks:**
1. Add JSDoc to key utilities:

   **`lib/utils.ts`:**
   ```typescript
   /**
    * Merges Tailwind CSS classes, handling conditional classes and conflicts.
    * Uses clsx and tailwind-merge for optimal class merging.
    * 
    * @param inputs - Class names to merge (strings, objects, arrays, or undefined)
    * @returns Merged class string
    * 
    * @example
    * ```ts
    * cn('foo', 'bar') // 'foo bar'
    * cn('foo', condition && 'bar') // 'foo' or 'foo bar'
    * cn('px-2', 'px-4') // 'px-4' (later wins)
    * ```
    */
   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   ```

   **`lib/metadata.ts`:**
   ```typescript
   /**
    * Generates metadata for a destination page.
    * 
    * @param destination - Destination data including name, description, image, etc.
    * @returns Next.js Metadata object for SEO
    * 
    * @example
    * ```ts
    * const metadata = await generateDestinationMetadata(destination);
    * ```
    */
   export async function generateDestinationMetadata(destination: Destination): Promise<Metadata> {
     // ...
   }
   ```

2. Document all public functions in:
   - `lib/utils.ts`
   - `lib/enrichment.ts`
   - `lib/metadata.ts`
   - `lib/ai-recommendations/*.ts`

### 3.2 Standardize Error Messages
**Problem:** Error messages are inconsistent.

**Tasks:**
1. Create `lib/error-messages.ts`:
   ```typescript
   /**
    * Standard error messages for the application.
    * Use these constants for consistent error messaging.
    */
   export const ERROR_MESSAGES = {
     // Authentication
     UNAUTHORIZED: 'You must be logged in to perform this action',
     FORBIDDEN: 'You do not have permission to perform this action',
     SESSION_EXPIRED: 'Your session has expired. Please log in again',
     
     // Resources
     NOT_FOUND: 'The requested resource was not found',
     ALREADY_EXISTS: 'This resource already exists',
     
     // Validation
     VALIDATION_ERROR: 'Please check your input and try again',
     INVALID_INPUT: 'The provided input is invalid',
     
     // Server
     SERVER_ERROR: 'Something went wrong. Please try again later',
     SERVICE_UNAVAILABLE: 'This service is temporarily unavailable',
     
     // Rate limiting
     RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
     
     // Generic
     UNKNOWN_ERROR: 'An unexpected error occurred',
   } as const;
   
   export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
   ```

2. Update API routes to use constants:
   ```typescript
   import { ERROR_MESSAGES } from '@/lib/error-messages';
   
   return NextResponse.json(
     { error: ERROR_MESSAGES.UNAUTHORIZED },
     { status: 401 }
   );
   ```

### 3.3 Refactor Large Components
**Problem:** Some components exceed 500+ lines.

**Tasks:**
1. **`app/admin/page.tsx`** - Break into:
   - `components/admin/AdminDashboard.tsx` - Main layout
   - `components/admin/AdminStats.tsx` - Statistics display
   - `components/admin/DestinationManager.tsx` - Destination CRUD
   - `components/admin/BulkActions.tsx` - Bulk operations
   - `hooks/useAdminStats.ts` - Stats fetching logic
   - `hooks/useDestinationManagement.ts` - CRUD operations

2. **`app/account/page.tsx`** - Break into:
   - `components/account/ProfileSection.tsx`
   - `components/account/CollectionsSection.tsx`
   - `components/account/PreferencesSection.tsx`
   - `hooks/useUserProfile.ts`

3. Extract shared logic into custom hooks
4. Use composition to combine smaller components

### 3.4 Improve Accessibility
**Problem:** Missing ARIA labels and keyboard navigation.

**Tasks:**
1. Install accessibility tools:
   ```bash
   npm install -D @axe-core/react eslint-plugin-jsx-a11y
   ```

2. Add to `eslint.config.mjs`:
   ```javascript
   import jsxA11y from 'eslint-plugin-jsx-a11y';
   
   export default defineConfig([
     // ... existing config
     jsxA11y.configs.recommended,
   ]);
   ```

3. Add ARIA labels to interactive elements:
   ```typescript
   // components/MorphicSearch.tsx
   <input
     type="search"
     aria-label="Search destinations"
     aria-describedby="search-description"
     // ...
   />
   <button
     type="button"
     aria-label="Clear search"
     // ...
   >
     <X aria-hidden="true" />
   </button>
   ```

4. Ensure keyboard navigation:
   - Tab order is logical
   - Focus indicators are visible
   - Escape key closes modals
   - Enter/Space activate buttons

5. Run accessibility audit:
   ```bash
   npm run build
   npx lighthouse http://localhost:3000 --only-categories=accessibility
   ```

### 3.5 Add API Documentation
**Problem:** No API documentation.

**Tasks:**
1. Install Swagger:
   ```bash
   npm install swagger-jsdoc swagger-ui-react
   ```

2. Create `lib/swagger.ts`:
   ```typescript
   import swaggerJsdoc from 'swagger-jsdoc';
   
   const options: swaggerJsdoc.Options = {
     definition: {
       openapi: '3.0.0',
       info: {
         title: 'Urban Manual API',
         version: '1.0.0',
         description: 'API documentation for Urban Manual',
       },
       servers: [
         {
           url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
           description: 'Production server',
         },
       ],
     },
     apis: ['./app/api/**/route.ts'],
   };
   
   export const swaggerSpec = swaggerJsdoc(options);
   ```

3. Add JSDoc to API routes:
   ```typescript
   /**
    * @swagger
    * /api/search:
    *   get:
    *     summary: Search destinations
    *     tags: [Search]
    *     parameters:
    *       - in: query
    *         name: q
    *         required: true
    *         schema:
    *           type: string
    *         description: Search query
    *     responses:
    *       200:
    *         description: Search results
    */
   export async function GET(request: NextRequest) {
     // ...
   }
   ```

4. Create API docs page `/app/api-docs/page.tsx`:
   ```typescript
   import SwaggerUI from 'swagger-ui-react';
   import { swaggerSpec } from '@/lib/swagger';
   import 'swagger-ui-react/swagger-ui.css';
   
   export default function ApiDocsPage() {
     return (
       <div className="container mx-auto p-6">
         <SwaggerUI spec={swaggerSpec} />
       </div>
     );
   }
   ```

### 3.6 Set Up Monitoring
**Problem:** Limited error tracking and performance monitoring.

**Tasks:**
1. Install Sentry:
   ```bash
   npm install @sentry/nextjs
   ```

2. Initialize Sentry `sentry.client.config.ts`:
   ```typescript
   import * as Sentry from '@sentry/nextjs';
   
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     tracesSampleRate: 1.0,
     environment: process.env.NODE_ENV,
   });
   ```

3. Update `next.config.ts`:
   ```typescript
   import { withSentryConfig } from '@sentry/nextjs';
   
   const nextConfig = { /* ... */ };
   
   export default withSentryConfig(nextConfig, {
     silent: true,
   });
   ```

4. Add performance tracking to API routes:
   ```typescript
   import * as Sentry from '@sentry/nextjs';
   
   export async function GET(request: NextRequest) {
     const transaction = Sentry.startTransaction({
       op: 'api.search',
       name: 'Search Destinations',
     });
     
     try {
       // ... logic ...
     } finally {
       transaction.finish();
     }
   }
   ```

---

## Implementation Order

1. **Phase 1 (Quick Wins):** Remove duplicates, backups, consolidate types
2. **Phase 2.1:** Add error boundaries (high impact)
3. **Phase 2.2:** Enhance input validation (security)
4. **Phase 2.3:** Add loading states (UX)
5. **Phase 2.4:** Set up tests (start small, expand)
6. **Phase 3:** Medium priority improvements as time allows

---

## Testing Checklist

After each phase:
- [ ] Verify no TypeScript errors
- [ ] Test affected functionality
- [ ] Check console for errors
- [ ] Run linter
- [ ] Verify build succeeds

---

## Notes

- These fixes complement the main security fixes
- Prioritize based on impact and effort
- Test thoroughly before committing
- Document breaking changes
- Keep commits focused and atomic

**Start with Phase 1 (quick wins) to clean up the codebase first.**
