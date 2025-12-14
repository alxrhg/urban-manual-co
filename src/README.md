# Reorganized Codebase Structure

This directory contains the reorganized codebase following a feature-based architecture.

## Directory Structure

```
src/
├── ui/                    # Base UI components (buttons, inputs, cards, etc.)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── Drawer.tsx         # Drawer primitives
│   ├── ...                # 55+ UI components
│   └── index.ts           # Barrel export
│
├── features/              # Feature-based modules
│   ├── trip/              # Trip planning (consolidated from trip/ + trips/)
│   │   ├── components/    # 136 components
│   │   │   ├── TripCard.tsx
│   │   │   ├── FlightCard.tsx
│   │   │   ├── HotelCard.tsx
│   │   │   ├── canvas/    # Canvas-based components
│   │   │   ├── cards/     # Card components
│   │   │   ├── builder/   # TripBuilder components
│   │   │   ├── editor/    # Editor components
│   │   │   ├── itinerary/ # Itinerary components
│   │   │   └── timeline/  # Timeline components
│   │   └── index.ts
│   │
│   ├── planner/           # Planner feature (timeline, canvas)
│   │   └── components/    # 13 components
│   │
│   ├── account/           # User account & auth
│   │   └── components/    # AccountDrawer, SettingsDrawer, etc.
│   │
│   ├── admin/             # Admin dashboard
│   │   └── components/
│   │
│   ├── search/            # Search functionality
│   ├── detail/            # Destination detail views
│   ├── lists/             # Saved/visited places
│   ├── chat/              # Chat interface
│   ├── homepage/          # Homepage components
│   ├── maps/              # Map components
│   ├── navigation/        # Navigation components
│   └── shared/            # Shared drawer infrastructure
│
├── domain/                # Core business logic
│   ├── types/             # TypeScript type definitions
│   │   ├── destination.ts
│   │   ├── trip.ts
│   │   └── index.ts
│   │
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── DrawerContext.tsx
│   │   ├── TripBuilderContext.tsx
│   │   └── index.ts
│   │
│   ├── hooks/             # Custom React hooks (42 hooks)
│   │   ├── useTrip.ts
│   │   ├── useGeolocation.ts
│   │   └── ...
│   │
│   └── services/          # External service integrations
│       ├── intelligence/  # Travel intelligence
│       ├── search/        # Search services
│       ├── recommendations/
│       └── gemini.ts
│
├── lib/                   # Feature-agnostic helpers
└── components/            # Legacy components (being migrated)
```

## Imports

Use the new path aliases in tsconfig.json:

```typescript
// UI components
import { Button, Card, Dialog } from "@/ui";

// Features
import { TripCard, FlightCard } from "@/features/trip";
import { TimelineCanvas } from "@/features/planner";

// Domain
import type { Destination, Trip } from "@/domain/types";
import { AuthProvider } from "@/domain/contexts";
```

## Migration Notes

- `components/trip/` and `components/trips/` have been consolidated into `src/features/trip/`
- Duplicate components have been resolved (kept the more complete versions)
- `components/drawers/` has been distributed to feature-specific directories
- `components/ui/` moved to `src/ui/`
- `types/` moved to `src/domain/types/`
- `contexts/` moved to `src/domain/contexts/`
- `hooks/` moved to `src/domain/hooks/`
- `services/` moved to `src/domain/services/`

## Key Consolidations

| Old Location | New Location | Notes |
|--------------|--------------|-------|
| components/trip/ | src/features/trip/components/ | ~50 components |
| components/trips/ | src/features/trip/components/ | ~30 components merged |
| components/drawers/ | Distributed to features | Feature-specific drawers |
| components/planner/ | src/features/planner/components/ | 13 components |
| components/ui/ | src/ui/ | 55 UI primitives |
| types/ | src/domain/types/ | 10 type files |
| contexts/ | src/domain/contexts/ | 5 context providers |
| hooks/ | src/domain/hooks/ | 42 custom hooks |
| services/ | src/domain/services/ | All service integrations |

## Duplicates Removed

The following duplicate components were consolidated:

- **ItineraryCard**: 3 versions → kept canvas version (most complete)
- **TimelineCanvas**: 2 versions → kept planner version (472 lines)
- **TimeBlockCard**: 2 versions → kept planner version (340 lines)
- **TripBucketList**: 2 versions → kept trips version (407 lines)
- **TripItemCard**: 2 versions → kept trip version (325 lines)
- **AccountDrawer**: 2 versions → kept root version (23.5KB)
