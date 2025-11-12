import { AdvancedFilters } from '@/types/filters';
import type { EntryPoint, EntryPointContext } from './types';

const entryPointRegistry: Record<EntryPointContext, EntryPoint[]> = {
  homepage: [
    {
      id: 'homepage-map-mode',
      label: 'Explore on the map',
      description: 'Switch to the interactive map to pan, zoom, and open pins.',
      type: 'explore',
      actionId: 'open-map-view',
      analyticsId: 'homepage_map_mode',
    },
    {
      id: 'homepage-trip-planner',
      label: 'Plan with the Trip Planner',
      description: 'Build a personalized multi-day itinerary in minutes.',
      type: 'plan',
      actionId: 'open-trip-planner',
      analyticsId: 'homepage_trip_planner',
    },
    {
      id: 'homepage-trending',
      label: 'See what’s trending',
      description: 'Catch the hottest places locals are buzzing about right now.',
      type: 'explore',
      href: '#trending-destinations',
      analyticsId: 'homepage_trending',
    },
  ],
  categories: [
    {
      id: 'categories-dining',
      label: 'Explore dining hits',
      description: 'Michelin gems, chef counters, and neighborhood favorites.',
      type: 'explore',
      href: '/search?category=dining',
      analyticsId: 'categories_dining',
      filters: { category: 'dining' } satisfies Partial<AdvancedFilters>,
    },
    {
      id: 'categories-weekend',
      label: 'Plan a weekend escape',
      description: 'Snap together a 48-hour itinerary tailored to your vibe.',
      type: 'plan',
      actionId: 'open-weekend-template',
      analyticsId: 'categories_weekend_escape',
      filters: { season: 'spring', budget: 'midrange' },
    },
    {
      id: 'categories-local-gems',
      label: 'Find local gems',
      description: 'Under-the-radar picks loved by tastemakers and locals.',
      type: 'explore',
      analyticsId: 'categories_local_gems',
      filters: { budget: 'budget' },
    },
  ],
};

export function mapEntryPoints(context: EntryPointContext): EntryPoint[] {
  const entries = entryPointRegistry[context] ?? [];
  return entries.map(entry => ({ ...entry, filters: entry.filters ? { ...entry.filters } : undefined }));
}
