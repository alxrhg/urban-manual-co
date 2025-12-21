# Chrome Browser Testing Plan for Urban Manual

## Overview

This document outlines a comprehensive plan for Claude to test the Urban Manual website using browser automation (Playwright) and iteratively improve the application based on findings.

**Current State**: No E2E testing infrastructure exists. Only unit tests for APIs.

---

## Phase 1: Setup Playwright Infrastructure

### 1.1 Install Dependencies

```bash
npm install -D @playwright/test
npx playwright install chromium  # Install Chrome browser
```

### 1.2 Create Playwright Configuration

Create `playwright.config.ts`:
- Base URL: `http://localhost:3000` (dev) / `https://www.urbanmanual.co` (prod)
- Browser: Chromium (Chrome)
- Screenshots on failure
- Video recording for debugging
- Retry failed tests once
- Parallel execution for speed

### 1.3 Directory Structure

```
tests/
├── e2e/                        # E2E browser tests
│   ├── auth/                   # Authentication flows
│   ├── search/                 # Search & discovery
│   ├── trips/                  # Trip planning
│   ├── destinations/           # Destination pages
│   ├── account/                # User account
│   ├── collections/            # Collections feature
│   ├── admin/                  # Admin dashboard
│   └── accessibility/          # A11y tests
├── fixtures/                   # Test fixtures & helpers
│   ├── auth.fixture.ts         # Auth helpers
│   └── test-data.ts            # Test data
└── utils/                      # Test utilities
```

---

## Phase 2: Critical User Flows to Test

### Priority 1: Core Functionality (Must Test First)

#### 2.1 Homepage & Navigation
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `homepage-loads` | Homepage renders without errors | No console errors, key elements visible |
| `navigation-links` | All nav links work | Each link navigates to correct page |
| `mobile-responsive` | Mobile menu works | Menu toggles, links clickable |
| `destination-cards` | Destination cards render | Images load, links work |
| `filter-functionality` | City/category filters work | Results update on filter change |

#### 2.2 Search Functionality
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `search-input` | Search input accepts text | Input responds to typing |
| `search-results` | Results display for query | Results appear within 3s |
| `search-no-results` | Empty state for no matches | Friendly message shown |
| `search-autocomplete` | Suggestions appear while typing | Dropdown with suggestions |
| `search-filter-combo` | Search + filters work together | Combined filtering works |

#### 2.3 Authentication Flow
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `login-page-loads` | Login page renders | Form elements visible |
| `oauth-google-redirect` | Google OAuth initiates | Redirects to Google |
| `oauth-apple-redirect` | Apple OAuth initiates | Redirects to Apple |
| `logout-works` | User can log out | Session cleared, redirected |
| `protected-route-redirect` | Unauthenticated redirect | Redirects to login |

### Priority 2: User Features

#### 2.4 Destination Pages
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `destination-detail-loads` | Detail page renders | All sections visible |
| `destination-images` | Images load correctly | No broken images |
| `destination-map` | Map displays location | Map centered on destination |
| `related-destinations` | Related items shown | Cards render with links |
| `save-destination` | Save to collection works | Heart icon toggles state |

#### 2.5 Trip Planning
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `create-trip` | User can create trip | Trip created, redirected |
| `add-destination-to-trip` | Add place to trip | Destination appears in trip |
| `edit-trip-details` | Edit trip name/dates | Changes saved |
| `generate-itinerary` | AI itinerary generation | Itinerary appears |
| `delete-trip` | Delete trip works | Trip removed |

#### 2.6 User Account
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `account-page-loads` | Account page renders | Profile info displayed |
| `edit-profile` | Update profile fields | Changes persist |
| `upload-avatar` | Profile picture upload | Image displayed |
| `privacy-settings` | Toggle privacy options | Settings saved |
| `delete-account` | Account deletion flow | Warning shown, action works |

### Priority 3: Advanced Features

#### 2.7 Collections
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `create-collection` | Create new collection | Collection created |
| `add-to-collection` | Add destination | Destination added |
| `share-collection` | Share via link | Share URL generated |
| `edit-collection` | Edit name/description | Changes saved |

#### 2.8 AI Chat
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `chat-interface-loads` | Chat page renders | Input field ready |
| `send-message` | User can send message | Message appears |
| `receive-response` | AI responds | Response within 10s |
| `conversation-history` | History persists | Previous messages shown |

#### 2.9 Map Features
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `map-loads` | Map renders | Mapbox tiles load |
| `map-markers` | Destination markers show | Clickable markers |
| `map-zoom` | Zoom controls work | Map zooms in/out |
| `map-cluster` | Markers cluster at zoom out | Clusters show count |

### Priority 4: Admin Dashboard (Admin Auth Required)

#### 2.10 Admin Operations
| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `admin-access` | Admin can access dashboard | Dashboard loads |
| `destination-crud` | Create/edit destinations | Operations succeed |
| `architect-management` | Manage architects | CRUD works |
| `analytics-view` | Analytics display | Charts render |

---

## Phase 3: Testing Approach & Execution

### 3.1 Test Execution Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   TESTING WORKFLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Start Dev Server (npm run dev)                          │
│                      ↓                                      │
│  2. Run Tests by Category                                   │
│     • Smoke tests first (critical paths)                    │
│     • Feature tests second                                  │
│     • Edge case tests last                                  │
│                      ↓                                      │
│  3. Collect Results                                         │
│     • Screenshots of failures                               │
│     • Console error logs                                    │
│     • Network request failures                              │
│                      ↓                                      │
│  4. Analyze & Prioritize Issues                             │
│     • Critical: Blocking user actions                       │
│     • High: Affects UX significantly                        │
│     • Medium: Minor issues                                  │
│     • Low: Polish/enhancement                               │
│                      ↓                                      │
│  5. Fix Issues Iteratively                                  │
│     • Fix critical issues first                             │
│     • Re-run affected tests                                 │
│     • Commit fixes incrementally                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Testing Categories

| Category | Command | Focus |
|----------|---------|-------|
| Smoke | `npx playwright test --grep @smoke` | Critical paths only |
| Auth | `npx playwright test tests/e2e/auth/` | All auth flows |
| Search | `npx playwright test tests/e2e/search/` | Search features |
| Trips | `npx playwright test tests/e2e/trips/` | Trip planning |
| Full | `npx playwright test` | All tests |

### 3.3 Environment Configurations

| Environment | Use Case | Base URL |
|-------------|----------|----------|
| Local Dev | Development testing | `http://localhost:3000` |
| Preview | PR preview testing | Vercel preview URL |
| Production | Production verification | `https://www.urbanmanual.co` |

---

## Phase 4: Improvement Workflow

### 4.1 Issue Discovery → Fix Cycle

```
┌──────────────────────────────────────────────────────────────────┐
│                    IMPROVEMENT CYCLE                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [TEST]         [ANALYZE]         [FIX]          [VERIFY]       │
│      │               │               │                │          │
│      ▼               ▼               ▼                ▼          │
│  Run browser    Review failed    Implement      Re-run tests     │
│  tests          screenshots      fixes          to confirm       │
│      │               │               │                │          │
│      └───────────────┼───────────────┼────────────────┘          │
│                      │               │                           │
│                      ▼               ▼                           │
│              Categorize by     Prioritize by                     │
│              - Functionality   - User impact                     │
│              - Page/Feature    - Severity                        │
│              - Error type      - Effort                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Issue Categories & Response

| Issue Type | Example | Response Action |
|------------|---------|-----------------|
| **Console Errors** | React hydration mismatch | Fix component rendering |
| **Broken Images** | 404 on image load | Fix image URL/source |
| **Navigation Failure** | Link doesn't work | Fix href/routing |
| **Form Not Submitting** | Button click no effect | Fix event handler |
| **API Errors** | 500 on data fetch | Fix API route |
| **Accessibility** | Missing alt text | Add accessibility attrs |
| **Performance** | Slow page load | Optimize bundle/queries |
| **Layout Issues** | Content overflow | Fix CSS/responsive |

### 4.3 Quality Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Pass Rate | >95% | Tests passing / Total tests |
| Console Errors | 0 | Errors captured during tests |
| Page Load Time | <3s | Time to interactive |
| Lighthouse Score | >90 | Performance score |
| Accessibility | 0 violations | Axe-core violations |

---

## Phase 5: Test Implementation Templates

### 5.1 Basic Page Test

```typescript
// tests/e2e/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load without errors @smoke', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');

    // Wait for content to load
    await expect(page.locator('h1')).toBeVisible();

    // Verify no console errors
    expect(errors).toHaveLength(0);
  });

  test('destination cards render correctly', async ({ page }) => {
    await page.goto('/');

    const cards = page.locator('[data-testid="destination-card"]');
    await expect(cards.first()).toBeVisible();

    // Verify card has required elements
    const firstCard = cards.first();
    await expect(firstCard.locator('img')).toBeVisible();
    await expect(firstCard.locator('a')).toHaveAttribute('href', /\/destination\//);
  });
});
```

### 5.2 Authentication Test

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/trips');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('Google OAuth button initiates flow', async ({ page }) => {
    await page.goto('/auth/login');

    const googleButton = page.locator('[data-testid="google-oauth-btn"]');
    await googleButton.click();

    // Should redirect to Google
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });
});
```

### 5.3 Search Test

```typescript
// tests/e2e/search/search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Search', () => {
  test('returns results for valid query @smoke', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('restaurant london');
    await searchInput.press('Enter');

    // Wait for results
    const results = page.locator('[data-testid="search-results"]');
    await expect(results).toBeVisible({ timeout: 5000 });

    // Should have at least one result
    const items = results.locator('[data-testid="result-item"]');
    await expect(items).toHaveCount(1, { timeout: 5000 });
  });
});
```

---

## Phase 6: Execution Schedule

### Week 1: Foundation
- [ ] Install Playwright and configure
- [ ] Create test directory structure
- [ ] Write smoke tests for critical paths
- [ ] Run initial tests, document failures

### Week 2: Core Features
- [ ] Authentication flow tests
- [ ] Search functionality tests
- [ ] Destination page tests
- [ ] Fix critical issues discovered

### Week 3: User Features
- [ ] Trip planning tests
- [ ] Account management tests
- [ ] Collections tests
- [ ] Fix medium-priority issues

### Week 4: Polish & Optimization
- [ ] Accessibility tests
- [ ] Performance tests
- [ ] Admin dashboard tests
- [ ] Fix remaining issues

---

## Phase 7: CI/CD Integration

### 7.1 GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run build
      - run: npm run start &
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Phase 8: Manual Testing Checklist

For features that require manual verification:

### Visual Quality
- [ ] Images render at correct aspect ratios
- [ ] Typography is consistent across pages
- [ ] Colors match design system
- [ ] Animations are smooth
- [ ] Dark mode (if applicable) works correctly

### Cross-Browser
- [ ] Chrome (primary)
- [ ] Safari
- [ ] Firefox
- [ ] Mobile Chrome
- [ ] Mobile Safari

### Responsive Breakpoints
- [ ] Mobile (< 640px)
- [ ] Tablet (640px - 1024px)
- [ ] Desktop (1024px - 1280px)
- [ ] Large Desktop (> 1280px)

---

## Implementation Commands

```bash
# Setup
npm install -D @playwright/test
npx playwright install chromium

# Run tests
npx playwright test                          # All tests
npx playwright test --grep @smoke            # Smoke tests only
npx playwright test tests/e2e/auth/          # Auth tests only
npx playwright test --headed                 # Watch in browser
npx playwright test --debug                  # Debug mode
npx playwright test --ui                     # Interactive UI

# Reports
npx playwright show-report                   # View HTML report
```

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| All smoke tests pass | 100% |
| All critical user flows work | 100% |
| No console errors on main pages | 0 errors |
| Page load times acceptable | < 3 seconds |
| Mobile responsive | All breakpoints work |
| Accessibility score | > 90 |

---

## Next Steps

1. **Approve this plan** - Review and confirm approach
2. **Set up Playwright** - Install and configure
3. **Write initial tests** - Start with smoke tests
4. **Run and fix** - Execute tests, fix issues found
5. **Iterate** - Continue testing and improving

---

*Plan created: December 2024*
*Last updated: December 2024*
