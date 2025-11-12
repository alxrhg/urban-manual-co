import assert from 'node:assert/strict';
import test from 'node:test';

import { tripGuideRouter } from '@/server/routers/trip-guide';

interface MockQueryState {
  ilike: Array<{ column: string; value: string }>;
  contains: Array<{ column: string; values: string[] }>;
  lte: Array<{ column: string; value: number }>;
  gte: Array<{ column: string; value: number }>;
  limit?: number;
}

function createMockSupabase(data: any[]) {
  return {
    from(table: string) {
      if (table !== 'destinations') {
        throw new Error('Unexpected table request');
      }

      const state: MockQueryState = {
        ilike: [],
        contains: [],
        lte: [],
        gte: [],
      };

      const builder: any = {
        select() {
          return builder;
        },
        ilike(column: string, value: string) {
          state.ilike.push({ column, value });
          return builder;
        },
        contains(column: string, values: string[]) {
          state.contains.push({ column, values });
          return builder;
        },
        lte(column: string, value: number) {
          state.lte.push({ column, value });
          return builder;
        },
        gte(column: string, value: number) {
          state.gte.push({ column, value });
          return builder;
        },
        limit(value: number) {
          state.limit = value;
          return builder;
        },
        then(
          onFulfilled: (result: { data: any[]; error: null }) => void,
          onRejected?: (reason: unknown) => void,
        ) {
          const filtered = applyFilters(data, state);
          const limited = typeof state.limit === 'number' ? filtered.slice(0, state.limit) : filtered;
          return Promise.resolve({ data: limited, error: null }).then(onFulfilled, onRejected);
        },
      };

      return builder;
    },
  };
}

function normalizePattern(pattern: string): string {
  return pattern.replace(/%/g, '').toLowerCase();
}

function applyFilters(data: any[], state: MockQueryState) {
  let result = [...data];

  for (const filter of state.ilike) {
    const needle = normalizePattern(filter.value);
    result = result.filter((item) => {
      const raw = (item?.[filter.column] ?? '').toString().toLowerCase();
      return raw.includes(needle);
    });
  }

  for (const filter of state.contains) {
    result = result.filter((item) => {
      const values: string[] = item?.[filter.column] ?? [];
      return filter.values.every((value) => values.includes(value));
    });
  }

  for (const filter of state.lte) {
    result = result.filter((item) => {
      const value = item?.[filter.column];
      if (value === null || value === undefined) return false;
      return value <= filter.value;
    });
  }

  for (const filter of state.gte) {
    result = result.filter((item) => {
      const value = item?.[filter.column];
      if (value === null || value === undefined) return false;
      return value >= filter.value;
    });
  }

  return result;
}

const SAMPLE_DESTINATIONS = [
  {
    slug: 'le-bistro-paris',
    name: 'Le Bistro Parisien',
    city: 'Paris',
    category: 'restaurant',
    description: 'Intimate French dining with a deep wine list.',
    tags: ['romantic', 'wine'],
    price_level: 3,
    rating: 4.8,
    image: null,
    primary_photo_url: null,
  },
  {
    slug: 'midnight-dessert',
    name: 'Midnight Dessert Club',
    city: 'Paris',
    category: 'cafe',
    description: 'Late-night patisserie for night owls.',
    tags: ['dessert', 'nightlife'],
    price_level: 2,
    rating: 4.4,
    image: null,
    primary_photo_url: null,
  },
  {
    slug: 'shibuya-roastery',
    name: 'Shibuya Roastery',
    city: 'Tokyo',
    category: 'cafe',
    description: 'Third-wave cafe with all-day work-friendly vibes.',
    tags: ['wifi', 'cozy'],
    price_level: 1,
    rating: 4.6,
    image: null,
    primary_photo_url: null,
  },
];

test('trip guide endpoint returns filtered destinations and summary', async () => {
  const supabase = createMockSupabase(SAMPLE_DESTINATIONS);
  const caller = tripGuideRouter.createCaller({ supabase, userId: null });

  const response = await caller.plan({
    preferences: {
      text: 'Romantic dinner in Paris with wine under price level 4',
    },
  });

  assert.equal(response.criteria.city, 'Paris');
  assert.equal(response.criteria.category, 'restaurant');
  assert.ok(response.criteria.tags.includes('romantic'));
  assert.equal(response.destinations.length, 1);
  assert.equal(response.destinations[0]?.slug, 'le-bistro-paris');
  assert.ok(response.itinerarySummary.includes('Paris'));
  assert.ok(response.itinerarySummary.includes('Le Bistro Parisien'));
});

