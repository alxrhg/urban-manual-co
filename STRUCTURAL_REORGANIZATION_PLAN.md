# Structural Reorganization Plan
**Date:** November 16, 2025  
**Context:** Addressing need to "redo structure from ground up"  
**Approach:** Reorganize without full rewrite

---

## Problem Statement

The project has grown organically with scattered organization:
- Multiple overlapping directories (`components/`, `app/components/`, `src/features/`)
- 100+ documentation files in root directory
- Unclear separation between features, services, and utilities
- Mixed patterns (some features in `app/`, some in `src/`)

**Goal:** Clean, maintainable structure that scales - without rewriting working code.

---

## Current Structure Issues

### 1. Root Directory Clutter
```
/ (root)
├── 100+ .md files (docs, plans, guides)
├── 50+ .js/.ts scripts (various utilities)
├── 10+ config files
├── app/
├── components/
├── lib/
├── src/
└── ... (20+ other directories)
```

**Problem:** Hard to navigate, unclear what goes where

### 2. Component Duplication
```
components/          # Shared components
app/components/      # App-specific components?
src/features/        # Feature components?
```

**Problem:** Where do new components go? Duplication exists.

### 3. Mixed Feature Organization
```
app/destination/     # Destination feature (route-based)
src/features/detail/ # Detail feature (feature-based)
lib/ai/              # AI utilities
services/ai/         # AI services
```

**Problem:** Related code scattered across multiple locations

### 4. Unclear Service/Lib Boundary
```
lib/                 # Utilities? Business logic?
services/            # Services? Also business logic?
server/              # tRPC routers
```

**Problem:** Unclear where business logic belongs

---

## Proposed Structure (Clean Slate)

### Option A: Feature-First Organization (Recommended)

```
urban-manual/
├── docs/                           # ALL documentation
│   ├── README.md
│   ├── setup/
│   ├── architecture/
│   ├── features/
│   └── archive/
│
├── scripts/                        # ALL scripts
│   ├── dev/
│   ├── build/
│   ├── migration/
│   └── enrichment/
│
├── src/                           # ALL application code
│   ├── app/                       # Next.js App Router (routes only)
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (marketing)/
│   │   │   ├── about/
│   │   │   └── contact/
│   │   ├── (destinations)/
│   │   │   ├── destination/[slug]/
│   │   │   ├── city/[slug]/
│   │   │   └── category/[slug]/
│   │   └── api/                   # API routes
│   │
│   ├── features/                  # Feature modules (vertical slices)
│   │   ├── destinations/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── ai-chat/
│   │   ├── search/
│   │   ├── user-account/
│   │   └── maps/
│   │
│   ├── shared/                    # Shared across features
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   └── layout/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── utils/
│   │   └── types/
│   │
│   ├── services/                  # External service integrations
│   │   ├── supabase/
│   │   ├── openai/
│   │   ├── google/
│   │   └── upstash/
│   │
│   └── config/                    # App configuration
│       ├── constants.ts
│       ├── env.ts
│       └── routes.ts
│
├── public/                        # Static assets
├── supabase/                      # Supabase migrations
├── tests/                         # Tests (mirrors src/)
├── config/                        # Tool configs
│   ├── next.config.ts
│   ├── tailwind.config.js
│   ├── eslint.config.mjs
│   └── tsconfig.json
│
└── [package files]
```

**Key Principles:**
1. **Everything has a clear home** - No more guessing
2. **Features are self-contained** - Related code lives together
3. **Shared code is explicit** - No hidden dependencies
4. **Routes are thin** - Just routing, logic in features
5. **Clean root** - Only essential files

---

### Option B: Domain-Driven Organization

```
src/
├── domains/                       # Business domains
│   ├── destinations/
│   │   ├── entities/             # Data models
│   │   ├── repositories/         # Data access
│   │   ├── services/             # Business logic
│   │   └── ui/                   # UI components
│   ├── users/
│   ├── travel-intelligence/
│   └── content/
│
├── infrastructure/                # Technical concerns
│   ├── api/                      # API clients
│   ├── database/                 # DB access
│   ├── cache/                    # Caching
│   └── monitoring/               # Logging, metrics
│
└── presentation/                  # UI layer
    ├── app/                      # Next.js routes
    ├── components/               # Shared UI
    └── layouts/                  # Layout components
```

**Better for:** Large teams, complex business logic

---

## Migration Strategy (Without Full Rewrite)

### Phase 1: Reorganize Documentation (1-2 days)
**Goal:** Clean root directory

```bash
# Move all docs
mkdir -p docs/{setup,architecture,features,archive}
mv *_PLAN.md docs/features/
mv *_SETUP.md docs/setup/
mv MIGRATION_*.md docs/archive/
# etc.

# Move all scripts
mkdir -p scripts/{dev,build,migration,enrichment}
mv enrich*.js scripts/enrichment/
mv *_migration.js scripts/migration/
# etc.
```

**Impact:** Immediate clarity, no code changes

---

### Phase 2: Consolidate Components (2-3 days)
**Goal:** Single source for components

**Step 1: Inventory**
```bash
# Find all component locations
find . -name "*.tsx" -type f | grep -E "(component|Component)" | sort
```

**Step 2: Categorize**
- Shared UI → `src/shared/components/ui/`
- Feature-specific → `src/features/[feature]/components/`
- Layout → `src/shared/components/layout/`

**Step 3: Move & Update Imports**
```typescript
// Before
import { Button } from '@/components/ui/button';
import { DestinationCard } from '@/components/DestinationCard';

// After
import { Button } from '@/shared/components/ui/button';
import { DestinationCard } from '@/features/destinations/components/DestinationCard';
```

**Automation:**
```bash
# Use codemod or search/replace
npx jscodeshift -t transform-imports.js src/
```

---

### Phase 3: Extract Features (3-5 days)
**Goal:** Self-contained feature modules

**Example: Destinations Feature**

**Before:**
```
app/destination/[slug]/page.tsx
components/DestinationCard.tsx
lib/destinations/utils.ts
services/destinations.ts
```

**After:**
```
src/features/destinations/
├── components/
│   ├── DestinationCard.tsx
│   ├── DestinationGrid.tsx
│   └── DestinationDrawer.tsx
├── hooks/
│   ├── useDestination.ts
│   └── useDestinations.ts
├── services/
│   └── destinations.service.ts
├── types/
│   └── destination.types.ts
└── utils/
    └── destination-utils.ts
```

**Benefits:**
- Everything related to destinations in one place
- Easy to find, modify, test
- Can extract to separate package later if needed

---

### Phase 4: Clean Up Services Layer (2-3 days)
**Goal:** Clear service boundaries

**Current:**
```
lib/ai/
lib/openai/
services/ai/
```

**Consolidated:**
```
src/services/
├── supabase/
│   ├── client.ts
│   ├── destinations.ts
│   └── users.ts
├── openai/
│   ├── client.ts
│   ├── chat.ts
│   └── embeddings.ts
└── google/
    └── gemini.ts
```

---

### Phase 5: Update Path Aliases (1 day)
**Goal:** Clean imports

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/app/*": ["./src/app/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/services/*": ["./src/services/*"],
      "@/config/*": ["./src/config/*"]
    }
  }
}
```

**Usage:**
```typescript
// Clean, clear imports
import { Button } from '@/shared/components/ui/button';
import { useDestination } from '@/features/destinations/hooks';
import { supabase } from '@/services/supabase';
```

---

## Implementation Timeline

### Quick Reorganization (5-7 days with AI)

**Day 1: Documentation**
- Move all .md files to docs/
- Organize into categories
- Update links

**Day 2: Scripts**
- Move all scripts to scripts/
- Organize by purpose
- Update package.json

**Day 3-4: Components**
- Inventory all components
- Move to feature or shared
- Update imports (use codemod)

**Day 5: Services**
- Consolidate service layer
- Update imports
- Test API endpoints

**Day 6: Path Aliases**
- Update tsconfig.json
- Update imports
- Verify builds

**Day 7: Testing & Validation**
- Test all features
- Fix broken imports
- Deploy to staging

---

## Success Criteria

### Before Reorganization
- ❌ 100+ files in root
- ❌ Duplicate components in 3+ locations
- ❌ Unclear where new code goes
- ❌ Hard to find related code
- ❌ Import paths like `../../../lib/`

### After Reorganization
- ✅ <20 files in root (configs + package.json)
- ✅ Single source for components
- ✅ Clear feature boundaries
- ✅ Related code colocated
- ✅ Clean imports with path aliases

---

## Risk Mitigation

### Risk 1: Broken Imports
**Mitigation:**
- Use TypeScript to catch all import errors
- Run build after each phase
- Use codemod for bulk updates

### Risk 2: Lost Files
**Mitigation:**
- Work in git branch
- Commit after each move
- Can revert anytime

### Risk 3: Developer Confusion
**Mitigation:**
- Document new structure
- Update onboarding docs
- Clear README

---

## Comparison: Reorganize vs Rebuild

| Aspect | Reorganize | Rebuild |
|--------|------------|---------|
| Time | 5-7 days | 5-7 days |
| Risk | Low (can revert) | Medium (new bugs) |
| Working Code | Preserved | Rewritten |
| Tests | Still work | Need rewrite |
| Data | No migration | Migration needed |
| Features | All preserved | May miss some |
| User Impact | Zero | Testing period |

**Winner:** Reorganize (same time, lower risk)

---

## Next Steps

### Option 1: Full Reorganization (Recommended)
Follow all 5 phases above. Clean structure, preserved code.

**Timeline:** 5-7 days  
**Risk:** Low  
**Benefit:** Long-term maintainability

### Option 2: Incremental Reorganization
Start with Phases 1-2 (docs + scripts), do rest later.

**Timeline:** 2-3 days for Phase 1-2  
**Risk:** Very Low  
**Benefit:** Quick wins

### Option 3: Hybrid Approach
Reorganize existing + rebuild problem areas.

**Timeline:** 7-10 days  
**Risk:** Medium  
**Benefit:** Best of both

---

## Recommendation

Given your comment "don't have to completely rewrite, but need to redo structure from ground up":

**Recommended:** Option 1 (Full Reorganization)

**Why:**
1. Same timeline as rebuild (5-7 days with AI)
2. Lower risk (no new bugs from rewrite)
3. All features preserved
4. Can use AI to automate import updates
5. Clean structure for future growth

**With AI assistance, we can:**
- Generate codemod scripts
- Bulk update imports
- Validate all changes
- Complete in 5-7 days

---

## FAQs

### Q: Won't this break everything?
**A:** No - we move files but preserve code. TypeScript catches broken imports. Build validates everything works.

### Q: Can we do this incrementally?
**A:** Yes - start with docs/scripts (Day 1-2), then components (Day 3-4), etc. Each phase is independent.

### Q: What about my current branches?
**A:** Reorganize in new branch. Merge when stable. Team can continue on old structure until ready.

### Q: Will this slow down development?
**A:** Short-term (1 week), yes. Long-term, much faster - easier to find, modify, test code.

---

## Decision Needed

Which approach do you prefer?

1. **Full reorganization** (5-7 days, clean structure, preserved code)
2. **Incremental reorganization** (start with docs/scripts)
3. **Hybrid** (reorganize + rebuild problem areas)
4. **Full rebuild** (fresh start, your original thought)

Let me know and I'll create detailed implementation tasks.

---

**Status:** Awaiting decision  
**Created:** November 16, 2025  
**Next:** Choose approach and begin implementation
