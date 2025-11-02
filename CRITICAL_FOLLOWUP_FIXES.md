# Critical Follow-Up Fixes Still Missing

## ⚠️ IMPORTANT
These are critical issues from `CODE_REVIEW_REPORT.md` and `REVIEW_GAPS_ANALYSIS.md` that are **NOT covered** in either the main fix prompt or the additional issues prompt. These should be prioritized alongside Phase 1 security fixes.

---

## Priority 0: Security Issues (DO IMMEDIATELY)

### 0.1 Fix XSS Vulnerabilities with dangerouslySetInnerHTML
**Severity:** 🔴 CRITICAL (Security)  
**Count:** 7 instances across 6 files  
**Why Critical:** Direct XSS attack vector

**Files Affected:**
- `app/destination/[slug]/page.tsx`
- `app/layout.tsx` (2 instances)
- `public/index.html`
- Other destination pages

**Tasks:**

1. **Install DOMPurify:**
```bash
npm install dompurify
npm install --save-dev @types/dompurify isomorphic-dompurify
```

2. **Create sanitization utility** `/lib/sanitize-html.ts`:
```typescript
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses DOMPurify with a whitelist of safe tags.
 * 
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML safe for rendering
 * 
 * @example
 * ```ts
 * const safe = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
 * // Returns: '<p>Hello</p>'
 * ```
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'blockquote', 'code', 'pre', 'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload'],
  });
}

/**
 * Sanitizes HTML and strips all tags, returning plain text.
 * Use for search results, previews, or meta descriptions.
 */
export function sanitizeToPlainText(html: string): string {
  if (!html) return '';
  
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  
  return sanitized.trim();
}
```

3. **Find and fix all instances:**
```bash
# Find all dangerouslySetInnerHTML usage
grep -r "dangerouslySetInnerHTML" --include="*.tsx" --include="*.jsx"
```

4. **Replace UNSAFE usage:**

**Before (UNSAFE):**
```typescript
// app/destination/[slug]/page.tsx
<div dangerouslySetInnerHTML={{ __html: destination.content }} />
```

**After (SAFE):**
```typescript
import { sanitizeHtml } from '@/lib/sanitize-html';

<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(destination.content || '') }} />
```

5. **Update all affected files:**
   - `app/destination/[slug]/page.tsx`
   - `app/layout.tsx`
   - Any component rendering user-generated content
   - Any component rendering database content

6. **Add ESLint rule** to prevent future unsafe usage:
```javascript
// eslint.config.mjs
{
  rules: {
    'react/no-danger': 'error', // Flags all dangerouslySetInnerHTML
    'react/no-danger-with-children': 'error',
  }
}
```

7. **Write security tests:**
```typescript
// lib/__tests__/sanitize-html.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeToPlainText } from '../sanitize-html';

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    const dirty = '<p>Hello</p><script>alert("xss")</script>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('script');
    expect(clean).toContain('Hello');
  });
  
  it('removes event handlers', () => {
    const dirty = '<img src="x" onerror="alert(\'xss\')" />';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
  });
  
  it('removes javascript: URLs', () => {
    const dirty = '<a href="javascript:alert(\'xss\')">Click</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('javascript:');
  });
  
  it('allows safe HTML tags', () => {
    const html = '<p><strong>Bold</strong> and <em>italic</em></p>';
    const clean = sanitizeHtml(html);
    expect(clean).toContain('strong');
    expect(clean).toContain('em');
    expect(clean).toContain('p');
  });
  
  it('removes iframe tags', () => {
    const dirty = '<p>Text</p><iframe src="evil.com"></iframe>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('iframe');
  });
});

describe('sanitizeToPlainText', () => {
  it('strips all HTML tags', () => {
    const html = '<p><strong>Bold</strong> text</p>';
    expect(sanitizeToPlainText(html)).toBe('Bold text');
  });
});
```

**⚠️ DO THIS IMMEDIATELY - This is a security vulnerability!**

---

## Priority 1: High-Impact Bug Fixes

### 1.1 Fix React Hook Dependency Violations
**Severity:** 🔴 HIGH (Can cause bugs)  
**Why Critical:** Missing dependencies cause stale closures and race conditions

**Tasks:**

1. **Enable ESLint rule:**
```javascript
// eslint.config.mjs
{
  rules: {
    'react-hooks/exhaustive-deps': 'error',
    'react-hooks/rules-of-hooks': 'error',
  }
}
```

2. **Run linter to find violations:**
```bash
npm run lint 2>&1 | grep "exhaustive-deps" > hook-violations.txt
```

3. **Fix main violations in `app/page.tsx`:**

**Problem 1: performAISearch not in dependencies**
```typescript
// BEFORE (WRONG):
useEffect(() => {
  if (searchTerm.trim().length > 0) {
    const timer = setTimeout(() => {
      performAISearch(searchTerm); // ⚠️ Not in deps
    }, 500);
    return () => clearTimeout(timer);
  }
}, [searchTerm]); // Missing performAISearch
```

**Solution:**
```typescript
// AFTER (CORRECT):
const performAISearch = useCallback(async (query: string) => {
  if (!query.trim() || searching) return;
  
  setSearching(true);
  setSearchTier('ai-enhanced');
  
  try {
    const historyForAPI = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        userId: user?.id,
        conversationHistory: historyForAPI,
      }),
    });
    
    const data = await response.json();
    
    const userMessage = { role: 'user' as const, content: query };
    const assistantMessage = { 
      role: 'assistant' as const, 
      content: data.content || '', 
      destinations: data.destinations 
    };
    
    const newHistory = [...conversationHistory, userMessage, assistantMessage];
    setConversationHistory(newHistory.slice(-10));
    setChatResponse(data.content || '');
    setFilteredDestinations(data.destinations || []);
  } catch (error) {
    console.error('AI chat error:', error);
    setChatResponse('Sorry, I encountered an error. Please try again.');
    setFilteredDestinations([]);
  } finally {
    setSearching(false);
  }
}, [searching, user?.id, conversationHistory]); // ✅ All deps

// Now useEffect is correct:
useEffect(() => {
  if (searchTerm.trim().length > 0) {
    const timer = setTimeout(() => {
      performAISearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  } else {
    setFilteredDestinations([]);
    setChatResponse('');
    setConversationHistory([]);
    setSearching(false);
    filterDestinations();
    setDisplayedCount(24);
  }
}, [searchTerm, performAISearch, filterDestinations]); // ✅ Complete
```

**Problem 2: filterDestinations not memoized**
```typescript
// BEFORE (WRONG):
const filterDestinations = () => {
  let filtered = destinations;
  // ... filtering logic
  setFilteredDestinations(filtered);
};

useEffect(() => {
  filterDestinations(); // ⚠️ Creates new function each render
}, [selectedCity, selectedCategory]); // Missing filterDestinations
```

**Solution:**
```typescript
// AFTER (CORRECT):
const filterDestinations = useCallback(() => {
  let filtered = destinations;
  
  const cityFilter = advancedFilters.city || selectedCity;
  if (cityFilter) {
    filtered = filtered.filter(d => d.city === cityFilter);
  }
  
  const categoryFilter = advancedFilters.category || selectedCategory;
  if (categoryFilter) {
    filtered = filtered.filter(d =>
      d.category?.toLowerCase().trim() === categoryFilter.toLowerCase().trim()
    );
  }
  
  // Apply other filters...
  
  setFilteredDestinations(filtered);
}, [
  destinations, 
  advancedFilters, 
  selectedCity, 
  selectedCategory, 
  user, 
  visitedSlugs
]); // ✅ All dependencies

useEffect(() => {
  if (!searchTerm.trim()) {
    filterDestinations();
  }
}, [searchTerm, filterDestinations]); // ✅ Complete
```

4. **Fix other common violations:**

**AuthContext.tsx:**
```typescript
// BEFORE (WRONG):
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });
}, []); // Missing dependency warning
```

**Solution:**
```typescript
// AFTER (CORRECT):
useEffect(() => {
  let mounted = true;
  
  async function loadSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setUser(session?.user ?? null);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  }
  
  loadSession();
  
  return () => {
    mounted = false;
  };
}, []); // ✅ Correct - no external dependencies
```

5. **Fix all violations found by linter:**
```bash
npm run lint -- --fix
```

6. **Test thoroughly:**
   - Verify search still works
   - Check filters apply correctly
   - Ensure no infinite loops
   - Test component unmounting

---

### 1.2 Refactor Promise Chains to Async/Await
**Severity:** 🟡 MEDIUM (Code consistency)  
**Count:** 55 instances across 29 files

**Tasks:**

1. **Add ESLint rule to enforce async/await:**
```javascript
// eslint.config.mjs
{
  rules: {
    '@typescript-eslint/promise-function-async': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
  }
}
```

2. **Find all promise chains:**
```bash
grep -r "\.then(" --include="*.ts" --include="*.tsx" | grep -v node_modules > promise-chains.txt
```

3. **Refactor key files:**

**`contexts/AuthContext.tsx`:**
```typescript
// BEFORE:
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null);
    }
  );
  
  return () => subscription.unsubscribe();
}, []);

// AFTER:
useEffect(() => {
  let mounted = true;
  
  const loadSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (mounted) {
      setUser(session?.user ?? null);
      setLoading(false);
    }
  };
  
  loadSession();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    }
  );
  
  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);
```

**`app/account/page.tsx`:**
```typescript
// BEFORE:
useEffect(() => {
  if (!user) {
    router.push('/auth/login');
    return;
  }
  
  supabase
    .from('saved_places')
    .select('*')
    .eq('user_id', user.id)
    .then(({ data }) => {
      setSavedPlaces(data || []);
    })
    .catch(error => {
      console.error('Error fetching saved places:', error);
    });
}, [user, router]);

// AFTER:
useEffect(() => {
  if (!user) {
    router.push('/auth/login');
    return;
  }
  
  let mounted = true;
  
  const fetchSavedPlaces = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_places')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (mounted) {
        setSavedPlaces(data || []);
      }
    } catch (error) {
      console.error('Error fetching saved places:', error);
      if (mounted) {
        setSavedPlaces([]);
      }
    }
  };
  
  fetchSavedPlaces();
  
  return () => {
    mounted = false;
  };
}, [user, router]);
```

4. **Create utility for promise conversion:**
```typescript
// lib/async-utils.ts

/**
 * Wraps an async function to prevent state updates after unmount.
 * 
 * @example
 * ```ts
 * const fetchData = useCancellableAsync(async () => {
 *   const data = await api.fetch();
 *   setState(data); // Safe - won't update if unmounted
 * });
 * ```
 */
export function useCancellableAsync<T>(
  asyncFn: () => Promise<T>
): [() => Promise<T>, () => void] {
  const mountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  const wrappedFn = async () => {
    if (!mountedRef.current) return;
    return await asyncFn();
  };
  
  const cancel = () => {
    mountedRef.current = false;
  };
  
  return [wrappedFn, cancel];
}
```

5. **Update all files with promise chains**
6. **Test each refactored component**

---

## Priority 2: Performance Issues

### 2.1 Implement Pagination for Initial Data Fetch
**Severity:** 🟡 MEDIUM (Performance)  
**Why Important:** Currently loads ALL destinations on page load

**Tasks:**

1. **Update fetchDestinations in `app/page.tsx`:**

```typescript
// BEFORE (loads everything):
const fetchDestinations = async () => {
  const { data, error } = await supabase
    .from('destinations')
    .select('slug, name, city, category, description, content, image, michelin_stars, crown')
    .order('name');
  
  setDestinations(data || []);
};

// AFTER (with pagination):
const PAGE_SIZE = 24;

const fetchDestinations = async (page: number = 0) => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  
  try {
    const { data, error, count } = await supabase
      .from('destinations')
      .select(
        'slug, name, city, category, description, content, image, michelin_stars, crown',
        { count: 'exact' }
      )
      .order('name')
      .range(from, to);
    
    if (error) throw error;
    
    return { 
      destinations: data || [], 
      total: count || 0,
      hasMore: (count || 0) > to + 1
    };
  } catch (error) {
    console.error('Error fetching destinations:', error);
    return { destinations: [], total: 0, hasMore: false };
  }
};
```

2. **Create infinite scroll hook:**

```typescript
// hooks/useInfiniteDestinations.ts
import { useState, useCallback } from 'react';

interface UseInfiniteDestinationsOptions {
  pageSize?: number;
  initialData?: Destination[];
}

export function useInfiniteDestinations({
  pageSize = 24,
  initialData = []
}: UseInfiniteDestinationsOptions = {}) {
  const [destinations, setDestinations] = useState<Destination[]>(initialData);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const result = await fetchDestinations(page);
      
      setDestinations(prev => [...prev, ...result.destinations]);
      setHasMore(result.hasMore);
      setTotal(result.total);
      setPage(p => p + 1);
    } catch (error) {
      console.error('Error loading more destinations:', error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);
  
  const reset = useCallback(() => {
    setDestinations([]);
    setPage(0);
    setHasMore(true);
    setTotal(0);
  }, []);
  
  return { 
    destinations, 
    loadMore, 
    hasMore, 
    loading, 
    total,
    reset
  };
}
```

3. **Use Intersection Observer for auto-loading:**

```typescript
// hooks/useIntersectionObserver.ts
import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
}

export function useIntersectionObserver(
  callback: () => void,
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0.1, rootMargin = '100px' } = options;
  const targetRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold, rootMargin }
    );
    
    observer.observe(target);
    
    return () => {
      observer.disconnect();
    };
  }, [callback, threshold, rootMargin]);
  
  return { targetRef, isIntersecting };
}
```

4. **Update `app/page.tsx` to use infinite scroll:**

```typescript
export default function Home() {
  const { 
    destinations, 
    loadMore, 
    hasMore, 
    loading,
    reset 
  } = useInfiniteDestinations({ pageSize: 24 });
  
  const { targetRef } = useIntersectionObserver(loadMore, {
    threshold: 0.1,
    rootMargin: '200px',
  });
  
  // When filters change, reset and reload
  useEffect(() => {
    reset();
    loadMore();
  }, [selectedCity, selectedCategory, advancedFilters]);
  
  return (
    <>
      {/* ... existing grid ... */}
      
      {/* Load more trigger */}
      {hasMore && (
        <div ref={targetRef} className="h-20 flex items-center justify-center">
          {loading && <LoadingSpinner text="Loading more..." />}
        </div>
      )}
      
      {!hasMore && destinations.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          No more destinations
        </div>
      )}
    </>
  );
}
```

5. **Add manual "Load More" button as fallback:**

```typescript
{hasMore && !loading && (
  <div className="text-center mt-8">
    <button
      onClick={loadMore}
      className="px-6 py-3 bg-black text-white rounded-lg hover:opacity-80"
    >
      Load More
    </button>
  </div>
)}
```

6. **Test performance:**
   - Test with 1000+ destinations
   - Verify smooth scrolling
   - Check network tab for efficient loading
   - Test on mobile devices

---

## Priority 3: Developer Experience

### 3.1 Set Up Prettier and Git Hooks
**Severity:** 🟡 LOW-MEDIUM (Code quality)  
**Why Important:** Consistent formatting prevents merge conflicts

**Tasks:**

1. **Install Prettier:**
```bash
npm install --save-dev prettier eslint-config-prettier
```

2. **Create `.prettierrc.json`:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

3. **Create `.prettierignore`:**
```
node_modules
.next
out
build
dist
coverage
*.min.js
*.min.css
public/assets
.git
*.lock
package-lock.json
```

4. **Add Prettier to ESLint:**
```javascript
// eslint.config.mjs
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
  // ... existing config
  prettierConfig, // Disables conflicting ESLint rules
]);
```

5. **Add format scripts to `package.json`:**
```json
{
  "scripts": {
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "lint": "next lint && prettier --check \"**/*.{ts,tsx,js,jsx}\""
  }
}
```

6. **Install Husky for git hooks:**
```bash
npm install --save-dev husky lint-staged
npx husky init
```

7. **Configure lint-staged in `package.json`:**
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

8. **Create `.husky/pre-commit`:**
```bash
#!/bin/sh
npx lint-staged
```

9. **Format entire codebase initially:**
```bash
npm run format
```

10. **Commit hooks:**
```bash
git add .husky
git commit -m "chore: add prettier and git hooks"
```

### 3.2 Add Return Type Annotations
**Severity:** 🟡 LOW (Type safety)

**Tasks:**

1. **Enable TypeScript rule:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "noImplicitReturns": true
  }
}
```

2. **Add ESLint rule:**
```javascript
{
  rules: {
    '@typescript-eslint/explicit-function-return-type': ['warn', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
  }
}
```

3. **Add return types to key functions:**

```typescript
// BEFORE:
export async function generateEmbedding(text: string) {
  // ...
}

// AFTER:
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // ...
}
```

4. **Fix incrementally:**
```bash
npm run lint -- --fix
```

### 3.3 Track Technical Debt
**Severity:** 🟡 LOW (Maintenance)  
**Count:** 22 TODO/FIXME comments

**Tasks:**

1. **Extract all TODOs:**
```bash
grep -r "TODO\|FIXME\|HACK\|XXX" \
  --include="*.ts" --include="*.tsx" --include="*.js" \
  --exclude-dir=node_modules \
  > tech-debt-audit.txt
```

2. **Create GitHub issues for each:**
```markdown
## TODO: app/page.tsx:70
**Type:** Technical Debt
**Priority:** Medium
**Description:** Implement proper error handling for failed searches

**Location:** app/page.tsx:70

**Code:**
```typescript
// TODO: Add proper error handling
performAISearch(searchTerm);
```

**Acceptance Criteria:**
- [ ] Add try-catch block
- [ ] Show user-friendly error message
- [ ] Log error for debugging
```

3. **Link issues in code:**
```typescript
// TODO: Implement retry logic
// See: https://github.com/yourrepo/urban-manual/issues/123
async function performSearch() {
  // ...
}
```

4. **Set up GitHub project board:**
   - Column: Backlog (new TODOs)
   - Column: Prioritized (ready to work on)
   - Column: In Progress
   - Column: Done

5. **Schedule debt reduction:**
   - Allocate 20% of each sprint to tech debt
   - Review and prioritize quarterly
   - Track debt reduction metrics

---

## Implementation Priority

**Do in this order:**

1. **🔴 IMMEDIATE (Today):**
   - 0.1: Fix XSS vulnerabilities (CRITICAL SECURITY)
   
2. **🔴 THIS WEEK:**
   - 1.1: Fix React hook dependencies (HIGH PRIORITY BUGS)
   - 1.2: Refactor promise chains (consistency)
   
3. **🟡 THIS SPRINT:**
   - 2.1: Implement pagination (performance)
   - 3.1: Set up Prettier/Husky (developer experience)
   
4. **🟢 NEXT SPRINT:**
   - 3.2: Add return type annotations (type safety)
   - 3.3: Track technical debt (maintenance)

---

## Testing Requirements

After each fix:
- [ ] Run `npm run lint -- --fix`
- [ ] Run `npm run format`
- [ ] Run `npm run build`
- [ ] Test affected functionality manually
- [ ] Write tests for bug fixes
- [ ] Verify no console errors
- [ ] Check for infinite loops in useEffect
- [ ] Test on mobile devices

---

## Notes

- **XSS fix is CRITICAL** - do immediately
- Hook dependencies can cause subtle bugs - test thoroughly
- Pagination improves UX significantly
- Prettier reduces review friction
- Track debt to prevent accumulation

**Start with 0.1 (XSS) immediately - it's a security vulnerability!**
