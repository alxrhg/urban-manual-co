# Code Review Issues NOT Covered in Fix Prompt

This document lists issues from CODE_REVIEW_REPORT.md that are **NOT** addressed in the provided fix prompt.

---

## High Priority Issues Not Covered

### 7. Promise Chain Anti-Pattern (55 instances)
**Status:** ❌ NOT COVERED  
**Severity:** MEDIUM  
**Count:** 55 instances of .then/.catch mixed with async/await

**Example:**
```typescript:22:27:contexts/AuthContext.tsx
useEffect(() => {
  // Check active sessions and set the user
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });
```

**Recommended Fix:**
```typescript
useEffect(() => {
  const loadSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    setLoading(false);
  };
  loadSession();
}, []);
```

**Action Items:**
1. Search for all `.then(` and `.catch(` patterns
2. Refactor to async/await for consistency
3. Update AuthContext.tsx, account/page.tsx, and other affected files
4. Add ESLint rule to prevent future promise chains: `@typescript-eslint/promise-function-async`

---

## Medium Priority Issues Not Covered

### 8. Large Component File Refactoring
**Status:** ❌ NOT COVERED  
**Severity:** MEDIUM  
**Location:** `app/page.tsx` (763 lines)

**Problems:**
- 15+ state variables in one component
- Multiple complex useEffects with intricate dependencies
- Mixed concerns: search, filtering, UI, tracking, AI chat
- Difficult to test and maintain
- Performance issues from re-renders

**Recommended Refactoring:**

1. **Extract custom hooks:**
```typescript
// hooks/useDestinationSearch.ts
export function useDestinationSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Destination[]>([]);
  
  const performSearch = async (query: string) => {
    // Extract search logic
  };
  
  return { searchTerm, setSearchTerm, searching, results, performSearch };
}

// hooks/useDestinationFilters.ts
export function useDestinationFilters(destinations: Destination[]) {
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({});
  
  const filteredDestinations = useMemo(() => {
    // Extract filter logic
  }, [destinations, selectedCity, selectedCategory, advancedFilters]);
  
  return { /* ... */ };
}

// hooks/useAIChat.ts
export function useAIChat(userId?: string) {
  const [chatResponse, setChatResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);
  
  const performAISearch = async (query: string) => {
    // Extract AI chat logic
  };
  
  return { chatResponse, conversationHistory, performAISearch };
}
```

2. **Extract components:**
```typescript
// components/DestinationGrid.tsx
// components/CityFilter.tsx
// components/SearchResults.tsx
// components/AISearchResponse.tsx
```

3. **Create services:**
```typescript
// lib/services/destination-service.ts
// lib/services/search-service.ts
```

**Action Items:**
1. Create hooks directory structure
2. Extract useDestinationSearch hook
3. Extract useDestinationFilters hook
4. Extract useAIChat hook
5. Extract useVisitedPlaces hook
6. Split into smaller components
7. Move business logic to services
8. Add unit tests for each hook

---

### 13. XSS Risk with dangerouslySetInnerHTML
**Status:** ❌ NOT COVERED  
**Severity:** MEDIUM-HIGH (Security)  
**Count:** 7 instances in 6 files

**Files Affected:**
- `app/destination/[slug]/page.tsx`
- `app/layout.tsx` (2 instances)
- `public/index.html`
- Other destination-related pages

**Current Unsafe Pattern:**
```typescript
<div dangerouslySetInnerHTML={{ __html: destination.content }} />
```

**Recommended Fix:**

1. **Install DOMPurify:**
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

2. **Create sanitization utility:**
```typescript
// lib/sanitize-html.ts
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: use isomorphic-dompurify or skip
    return html;
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}
```

3. **Replace all instances:**
```typescript
// Before (UNSAFE):
<div dangerouslySetInnerHTML={{ __html: destination.content }} />

// After (SAFE):
import { sanitizeHtml } from '@/lib/sanitize-html';

<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(destination.content || '') }} />
```

**Action Items:**
1. Install DOMPurify
2. Create sanitization utility
3. Find all `dangerouslySetInnerHTML` usage: `grep -r "dangerouslySetInnerHTML"`
4. Update app/destination/[slug]/page.tsx
5. Update app/layout.tsx
6. Update any other files
7. Add ESLint rule to flag dangerouslySetInnerHTML

---

### 14. Large Initial Data Fetch (No Pagination)
**Status:** ❌ NOT COVERED  
**Severity:** MEDIUM (Performance)

**Problem:**
```typescript:243:249:app/page.tsx
const fetchDestinations = async () => {
  try {
    // Select only essential columns to avoid issues with missing columns
    const { data, error } = await supabase
      .from('destinations')
      .select('slug, name, city, category, description, content, image, michelin_stars, crown')
      .order('name');
```

Loads ALL destinations at once (no limit).

**Recommended Fix:**

1. **Add pagination to initial query:**
```typescript
const PAGE_SIZE = 24;

const fetchDestinations = async (page: number = 0) => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  
  const { data, error, count } = await supabase
    .from('destinations')
    .select('*', { count: 'exact' })
    .order('name')
    .range(from, to);
  
  return { data, total: count };
};
```

2. **Implement infinite scroll:**
```typescript
// hooks/useInfiniteDestinations.ts
export function useInfiniteDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const { data, total } = await fetchDestinations(page);
    
    setDestinations(prev => [...prev, ...(data || [])]);
    setHasMore(destinations.length + (data?.length || 0) < (total || 0));
    setPage(p => p + 1);
    setLoading(false);
  };
  
  return { destinations, loadMore, hasMore, loading };
}
```

3. **Use Intersection Observer for auto-load:**
```typescript
// hooks/useInfiniteScroll.ts
export function useInfiniteScroll(callback: () => void) {
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        callback();
      }
    });
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [callback]);
  
  return loadMoreRef;
}
```

**Action Items:**
1. Add pagination parameters to fetchDestinations
2. Implement infinite scroll hook
3. Update app/page.tsx to use pagination
4. Add loading states
5. Test with large datasets
6. Consider virtual scrolling for very large lists (react-window)

---

## Code Quality Issues Not Covered

### 16. Inconsistent Code Formatting
**Status:** ❌ NOT COVERED  
**Severity:** LOW-MEDIUM

**Action Items:**

1. **Install Prettier:**
```bash
npm install --save-dev prettier
```

2. **Create `.prettierrc.json`:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

3. **Create `.prettierignore`:**
```
node_modules
.next
out
build
dist
*.min.js
public/assets
```

4. **Add format scripts to package.json:**
```json
{
  "scripts": {
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,css,md}\""
  }
}
```

5. **Set up pre-commit hooks:**
```bash
npm install --save-dev husky lint-staged
npx husky init
```

6. **Configure `.husky/pre-commit`:**
```bash
#!/bin/sh
npx lint-staged
```

7. **Add to package.json:**
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

8. **Run initial format:**
```bash
npm run format
```

---

### 17. Missing API Documentation
**Status:** ❌ NOT COVERED  
**Severity:** MEDIUM

**Action Items:**

1. **Install JSDoc tooling:**
```bash
npm install --save-dev typescript-eslint-plugin
```

2. **Add JSDoc comments to all exported functions:**
```typescript
/**
 * Generates an embedding vector for the given text using Google's text-embedding-004 model.
 * 
 * @param text - The text to generate an embedding for
 * @returns A promise that resolves to the embedding vector, or null if generation fails
 * @throws {Error} If the API key is missing
 * 
 * @example
 * const embedding = await generateEmbedding('best restaurants in Tokyo');
 * if (embedding) {
 *   // Use embedding for vector search
 * }
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  // ...
}

/**
 * Searches destinations using multiple strategies (vector, full-text, AI fields, fallback).
 * 
 * @param request - NextRequest containing search parameters
 * @returns NextResponse with search results and metadata
 * 
 * @remarks
 * Search strategies are attempted in order:
 * 1. Vector similarity search (if embeddings available)
 * 2. Full-text search on indexed columns
 * 3. AI field search (vibe_tags, keywords)
 * 4. Keyword fallback
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // ...
}
```

3. **Document API endpoints:**
```typescript
/**
 * @api {post} /api/search Search destinations
 * @apiName SearchDestinations
 * @apiGroup Search
 * 
 * @apiParam {String} query Search query string (min 2 chars)
 * @apiParam {Number} [pageSize=50] Number of results to return
 * @apiParam {Object} [filters] Optional filters
 * @apiParam {String} [filters.city] Filter by city
 * @apiParam {String} [filters.category] Filter by category
 * @apiParam {Number} [filters.rating] Minimum rating
 * @apiParam {String} [userId] User ID for personalization
 * 
 * @apiSuccess {Object[]} results Array of destinations
 * @apiSuccess {String} searchTier Search strategy used
 * @apiSuccess {Object} [intent] Parsed query intent
 * @apiSuccess {String[]} [suggestions] Search suggestions
 * 
 * @apiError (400) QueryTooShort Query must be at least 2 characters
 * @apiError (500) SearchFailed Internal server error during search
 */
```

4. **Generate API documentation:**
```bash
npm install --save-dev typedoc
npx typedoc --out docs
```

5. **Add README for API routes:**
```markdown
# API Routes Documentation

## Authentication
All authenticated endpoints require a valid JWT token in the Authorization header.

## Rate Limiting
Most endpoints are rate-limited to 10 requests per 10 seconds per IP.

## Endpoints

### POST /api/search
...
```

---

### 18. Test Coverage
**Status:** ❌ NOT COVERED  
**Severity:** HIGH

**Action Items:**

1. **Install testing dependencies:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @types/jest jest-environment-jsdom
```

2. **Create `jest.config.js`:**
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

3. **Create `jest.setup.js`:**
```javascript
import '@testing-library/jest-dom'
```

4. **Create example tests:**

```typescript
// lib/__tests__/sanitize-html.test.ts
import { sanitizeHtml } from '../sanitize-html';

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const dirty = '<p>Hello</p><script>alert("xss")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).toContain('Hello');
  });
  
  it('should allow safe HTML tags', () => {
    const html = '<p><strong>Bold</strong> and <em>italic</em></p>';
    const clean = sanitizeHtml(html);
    expect(clean).toContain('strong');
    expect(clean).toContain('em');
  });
});

// components/__tests__/Header.test.tsx
import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, signOut: jest.fn() })
}));

describe('Header', () => {
  it('renders the logo', () => {
    render(<Header />);
    expect(screen.getByText('The Urban Manual')).toBeInTheDocument();
  });
  
  it('shows sign in button when not authenticated', () => {
    render(<Header />);
    // Open menu
    const menuButton = screen.getByLabelText('Toggle menu');
    menuButton.click();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });
});

// app/api/search/__tests__/route.test.ts
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('/api/search', () => {
  it('returns error for short queries', async () => {
    const request = new NextRequest('http://localhost/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'a' }),
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.error).toBe('Query too short');
  });
});
```

5. **Add test scripts to package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

6. **Add CI test step:**
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

---

## Best Practices Issues Not Covered

### 19. React Hook Dependencies
**Status:** ❌ NOT COVERED  
**Severity:** MEDIUM

**Problem:**
```typescript:208:224:app/page.tsx
useEffect(() => {
  if (searchTerm.trim().length > 0) {
    const timer = setTimeout(() => {
      performAISearch(searchTerm);  // ⚠️ Not in dependencies
    }, 500);
    return () => clearTimeout(timer);
  } else {
    filterDestinations();  // ⚠️ Not in dependencies
    setDisplayedCount(24);
  }
}, [searchTerm]); // Comment says "ONLY depend on searchTerm" but missing deps
```

**Recommended Fix:**

1. **Wrap functions in useCallback:**
```typescript
const performAISearch = useCallback(async (query: string) => {
  if (!query.trim() || searching) return;
  
  setSearching(true);
  // ... rest of function
}, [searching, user, conversationHistory]); // Add all dependencies

const filterDestinations = useCallback(() => {
  let filtered = destinations;
  // ... filter logic
  setFilteredDestinations(filtered);
}, [destinations, selectedCity, selectedCategory, advancedFilters, user, visitedSlugs]);

// Now useEffect is correct:
useEffect(() => {
  if (searchTerm.trim().length > 0) {
    const timer = setTimeout(() => {
      performAISearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  } else {
    filterDestinations();
    setDisplayedCount(24);
  }
}, [searchTerm, performAISearch, filterDestinations]); // ✅ All deps included
```

2. **Enable ESLint rule:**
```json
// eslint.config.mjs
{
  "rules": {
    "react-hooks/exhaustive-deps": "error"
  }
}
```

3. **Fix all dependency warnings:**
```bash
npm run lint -- --fix
```

**Action Items:**
1. Enable exhaustive-deps rule
2. Run lint to find all violations
3. Wrap functions in useCallback
4. Add missing dependencies
5. Test that effects still work correctly
6. Consider using useEvent for stable callbacks (React 19+)

---

### 20. Client-Side Environment Variable Access
**Status:** ❌ NOT COVERED  
**Severity:** LOW-MEDIUM

**Problem:**
```typescript:8:12:lib/supabase.ts
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️  Supabase credentials not found...');
  }
}
```

**Issues:**
- `process.env.NODE_ENV` not available in browser
- Should use Next.js runtime check
- Inconsistent pattern across codebase

**Recommended Fix:**

1. **Use Next.js public runtime config:**
```typescript
// next.config.ts
const nextConfig = {
  env: {
    customKey: 'value',
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
};
```

2. **Or use proper client-side checks:**
```typescript
// lib/supabase.ts
const isDev = process.env.NEXT_PUBLIC_ENV === 'development';

if (typeof window !== 'undefined' && isDev) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase credentials not found');
  }
}
```

3. **Add env validation at build time:**
```typescript
// lib/validate-env.ts
// Only runs during build, not in browser
export function validateBuildEnv() {
  if (typeof window !== 'undefined') return; // Skip in browser
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}
```

4. **Call at app startup:**
```typescript
// app/layout.tsx (server-side only)
import { validateBuildEnv } from '@/lib/validate-env';

validateBuildEnv(); // Runs only on server

export default function RootLayout({ children }) {
  // ...
}
```

---

### 10. Technical Debt Markers
**Status:** ❌ NOT COVERED  
**Severity:** LOW

**Found:** 22 TODO/FIXME comments

**Action Items:**

1. **Audit all TODOs:**
```bash
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" --include="*.js" > tech-debt.txt
```

2. **Create GitHub issues for each:**
```markdown
## TODO in app/page.tsx:70
**Description:** Implement proper error handling for failed searches
**File:** app/page.tsx:70
**Priority:** Medium
**Labels:** tech-debt, error-handling
```

3. **Link issues in code:**
```typescript
// TODO: Implement retry logic
// See: https://github.com/yourrepo/urban-manual/issues/123
```

4. **Schedule debt reduction:**
- Dedicate 20% of sprint to addressing tech debt
- Track debt reduction metrics
- Review TODOs in code review

---

### 11. Missing Return Type Annotations
**Status:** ❌ NOT COVERED  
**Severity:** LOW

**Action Items:**

1. **Enable TypeScript strict mode:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "noImplicitReturns": true,
    "noImplicitAny": true
  }
}
```

2. **Add return types to all exported functions:**
```typescript
// Before:
export async function generateEmbedding(text: string) {
  // ...
}

// After:
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // ...
}
```

3. **Use ESLint rule:**
```json
{
  "rules": {
    "@typescript-eslint/explicit-function-return-type": ["warn", {
      "allowExpressions": true
    }]
  }
}
```

---

## Summary of Missing Items

### Critical/High Priority (Must Address)
- ❌ Promise chain anti-pattern (55 instances)
- ❌ XSS risk with dangerouslySetInnerHTML (7 instances)
- ❌ React hook dependency violations

### Medium Priority (Should Address)
- ❌ Large component refactoring (app/page.tsx - 763 lines)
- ❌ Pagination for initial data fetch
- ❌ Test coverage (0% currently)

### Code Quality (Nice to Have)
- ❌ Code formatting setup (Prettier + Husky)
- ❌ API documentation (JSDoc)
- ❌ Technical debt tracking (22 TODOs)
- ❌ Return type annotations
- ❌ Client-side env variable patterns

---

## Recommended Action Order

1. **Phase 1A: Security** (Add to existing Phase 1)
   - Fix XSS risks (dangerouslySetInnerHTML)
   - Fix React hook dependencies (can cause bugs)

2. **Phase 2A: Code Quality** (Add to existing Phase 2)
   - Refactor promise chains to async/await
   - Extract large component (app/page.tsx)
   - Add pagination to initial fetch

3. **Phase 3A: Testing & Tooling** (New phase)
   - Set up Jest and testing library
   - Add test coverage for critical paths
   - Set up Prettier and pre-commit hooks
   - Add JSDoc documentation

4. **Phase 4: Maintenance** (Ongoing)
   - Track and address TODOs
   - Add return type annotations
   - Improve client-side env handling

---

**Total Additional Issues to Address: 11 major items**
