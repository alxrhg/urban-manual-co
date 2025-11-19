# Urban Manual - Travel Intelligence Platform

## 🎯 Vision

Transform Urban Manual from a content discovery site into a comprehensive **Travel Intelligence** platform that helps users plan, discover, and experience travel with AI-powered insights.

## 📁 Project Structure (After Rebuild)

```
urban-manual-1/
├── app/
│   ├── destinations/
│   │   └── cities/          # City browsing and individual city pages
│   ├── planning/
│   │   ├── page.tsx         # Itinerary builder (formerly /itinerary)
│   │   └── trips/           # Trip management (formerly /trips)
│   ├── collections/         # User collections
│   ├── destination/[slug]/  # Individual destination pages
│   └── page.tsx             # Homepage (to be refactored)
│
├── components/
│   ├── homepage/            # NEW: Homepage-specific components
│   │   ├── IntelligenceSearch.tsx
│   │   ├── MapInterface.tsx
│   │   └── ContextWidgets.tsx
│   └── ...
│
├── services/
│   ├── intelligence/        # NEW: Core intelligence services
│   │   ├── itinerary-generator.ts
│   │   ├── context-engine.ts
│   │   └── user-profile.ts
│   └── ...
│
├── docs/                    # NEW: All documentation moved here
│   ├── images/              # Screenshots and diagrams
│   └── sql/                 # SQL migration files
│
├── data/                    # NEW: Static data files
│   ├── BRAND_LANGUAGE.json
│   └── destinations_import.csv
│
└── scripts/
    └── legacy_root/         # OLD: Legacy scripts from root
```

## 🔄 Route Changes

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `/city/[city]` | `/destinations/cities/[city]` | ✅ Migrated |
| `/cities` | `/destinations/cities` | ✅ Migrated |
| `/itinerary` | `/planning` | ✅ Migrated |
| `/trips` | `/planning/trips` | ✅ Migrated |
| `/collection/[id]` | `/collections/[id]` | ✅ Migrated |
| `/itineraries` | Removed (redirected to `/planning/trips`) | ✅ Cleaned |

## 🏗️ Intelligence Architecture

### Core Services

#### 1. **Itinerary Generator** (`services/intelligence/itinerary-generator.ts`)
- AI-powered trip planning
- Route optimization
- Budget-aware suggestions
- **Status**: Skeleton created, needs implementation

#### 2. **Context Engine** (`services/intelligence/context-engine.ts`)
- Real-time weather data
- Crowd levels
- Event detection
- **Status**: Skeleton created, needs API integration

#### 3. **User Profile Service** (`services/intelligence/user-profile.ts`)
- Preference management
- Travel history
- Personalization
- **Status**: Skeleton created, needs Supabase integration

## 🎨 Homepage Redesign (Planned)

The current `app/page.tsx` (114KB, 3086 lines) will be refactored into:

1. **IntelligenceSearch** - Natural language query interface
2. **MapInterface** - Interactive map view (Mapbox/Google Maps)
3. **ContextWidgets** - Weather, trending, "near me" cards
4. **DestinationGrid** - Existing grid component (reused)

### New Homepage Layout
```
┌─────────────────────────────────────┐
│  IntelligenceSearch                 │
│  "Ask me anything about travel..."  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  ContextWidgets (Weather/Trending)  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  MapInterface (Split-screen)        │
│  ┌──────────┬──────────────────┐    │
│  │   Map    │  Destination     │    │
│  │          │  Grid            │    │
│  └──────────┴──────────────────┘    │
└─────────────────────────────────────┘
```

## 🧹 Cleanup Summary

### Files Moved
- ✅ 180+ `.md` documentation files → `docs/`
- ✅ Images (`.png`, `.jpg`) → `docs/images/`
- ✅ SQL files → `docs/sql/`
- ✅ Legacy scripts → `scripts/legacy_root/`
- ✅ Data files → `data/`

### Routes Consolidated
- ✅ `city` + `cities` → `destinations/cities`
- ✅ `collection` + `collections` → `collections`
- ✅ `itinerary` + `itineraries` + `trips` → `planning/*`

### Code References Updated
- ✅ `app/explore/page.tsx`
- ✅ `app/destination/[slug]/page-client.tsx`
- ✅ `app/sitemap.ts`
- ✅ `app/api/jobs/generate-sitemap/route.ts`

## 📋 Next Steps

### Phase 1: Cleanup & Restructuring ✅
- [x] Move documentation to `docs/`
- [x] Consolidate redundant routes
- [x] Create `services/intelligence` module
- [x] Create homepage component skeletons

### Phase 2: Core Intelligence (In Progress)
- [ ] Implement `ItineraryGenerator` with Gemini/OpenAI
- [ ] Integrate Weather API into `ContextEngine`
- [ ] Connect `UserProfileService` to Supabase
- [ ] Create `/api/intelligence/*` endpoints

### Phase 3: UI/UX Reimagining
- [ ] Refactor `app/page.tsx` to use new components
- [ ] Implement `MapInterface` with Mapbox
- [ ] Add real-time data to `ContextWidgets`
- [ ] Create "Intelligence Dashboard" layout

### Phase 4: Data & Integration
- [ ] Verify Supabase schema for new features
- [ ] Add `conversation_sessions` table
- [ ] Add `itinerary_templates` table
- [ ] Integrate Google Places API

## 🔧 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini, OpenAI
- **Maps**: Mapbox / Google Maps (TBD)
- **Styling**: Tailwind CSS
- **State**: React Context + Hooks

## 📚 Key Documentation

- [Travel Intelligence Audit](docs/TRAVEL_INTELLIGENCE_AUDIT.md)
- [Travel Intelligence Improvement Plan](docs/TRAVEL_INTELLIGENCE_IMPROVEMENT_PLAN.md)
- [Implementation Plan](/.gemini/antigravity/brain/.../implementation_plan.md)
- [Discovery Engine Setup](DISCOVERY_ENGINE_SETUP.md)

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📝 Notes

- The original `app/page.tsx` is preserved but should be refactored incrementally
- All route changes are backward-compatible via redirects where needed
- Intelligence services are currently skeletons - implementation required
- Map interface is a placeholder - needs Mapbox/Google Maps integration

---

**Last Updated**: 2025-11-18
**Status**: Phase 1 Complete, Phase 2 In Progress
