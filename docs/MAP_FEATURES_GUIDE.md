# Map Experience Architecture

## Overview
The refreshed map experience layers realtime exploration, contextual guidance, and performant data access on top of the Mapbox renderer. The stack is composed of:

- **`hooks/useMapData.ts`** — client-side data pipeline that synchronizes URL state, applies filters, debounces search, and hydrates the map with enriched GeoJSON artifacts.
- **`components/MapView.tsx`** — Mapbox wrapper that renders clustered markers, a density heatmap, popular spot overlays, and animated trip highlight routes with graceful fallbacks to Google Static Maps when Mapbox is unavailable.
- **`app/map/page.tsx`** — UI shell that surfaces filters, contextual summaries, and route previews while coordinating provider switching (Mapbox, Google Maps, Apple Maps).

## Data Flow
1. `useMapData` loads destination records from Supabase (with localStorage caching for offline resilience), then materializes:
   - Filtered `Destination[]`
   - `FeatureCollection<Point>` for clustered markers/heatmap
   - `FeatureCollection<Point>` of popular spots (top crowd-sourced locations)
   - `FeatureCollection<LineString>` describing the trip highlight loop
2. Filters (`categories`, `open now`, `Michelin`, `rating`, `search query`) are stored in URL parameters. The hook listens for param updates and writes them back whenever the user changes a filter, enabling deep-linkable map states.
3. A debounced search string feeds `generateSearchResponseContext`, yielding a narrative summary shown in the UI.

## Map Rendering
`MapView` orchestrates Mapbox sources/layers:

- **Clusters (`map-clusters`)** automatically group dense areas with adaptive styling.
- **Heatmap (`destinations-heat`)** visualizes density, toggled via the UI.
- **Unclustered points (`map-destinations`)** serve as individual pins with hover popups.
- **Popular spots (`popular-spots`/`popular-spots-glow`)** accentuate top rated or frequently reviewed places.
- **Trip highlights (`trip-highlights`)** draws a dashed loop line that previews a suggested route between marquee destinations.
- Contextual popups provide at-a-glance details, while Mapbox `fitBounds` maintains focus on filtered results.
- A Google Maps static embed fallback activates automatically when Mapbox initialization fails or lacks credentials.

## Filters & Context
- UI controls in `app/map/page.tsx` modify `useMapData` filters, delivering immediate visual feedback thanks to debounced filtering and Mapbox source updates.
- “Live context” text derives from the AI-powered summary, keeping users oriented as they experiment with filters.
- Heatmap toggles and “Trip highlight preview” cards tie UI affordances to map overlays for clearer affordances.

## Offline & Performance Considerations
- Destination responses are cached in `localStorage` for one hour to soften repeated loads, especially on mobile connections.
- Map provider preference persists across sessions via `sessionStorage`.
- Filtering and clustering occur client-side on cached data, minimizing round trips while ensuring smooth transitions.

## Extensibility
- Additional overlays (e.g., isochrone polygons or saved trips) can plug into `useMapData` by exporting new `FeatureCollection`s and adding supporting layers in `MapView`.
- URL-driven filters make it straightforward to share filtered map views or hydrate server-rendered previews.

Refer to the source files for implementation details and to extend the pipeline with new datasets or overlay types.
