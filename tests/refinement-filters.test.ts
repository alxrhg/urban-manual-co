import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveRefinementFilters,
  createRefinementPredicate,
  normalizeCategoryTerm,
  PRICE_BUCKETS,
  type DestinationRecord,
} from '@/lib/search/refinementFilters';
import { legacyRefine } from './helpers/legacy-refine';

const SAMPLE_DESTINATIONS: DestinationRecord[] = [
  {
    id: 1,
    category: 'Restaurant',
    price_level: 1,
    description: 'Budget-friendly design cafe in Tokyo',
    content: 'Minimalist interiors and modern coffee program',
    tags: ['design', 'cafe'],
    is_open_now: true,
    city: 'Tokyo',
    neighborhood: 'Shibuya',
    address: 'Shibuya Crossing',
  },
  {
    id: 2,
    category: 'Hotel',
    price_level: 4,
    description: 'Luxury boutique hotel near Ginza',
    content: 'Upscale service and fine dining restaurant',
    tags: ['luxury', 'hotel'],
    is_open_now: false,
    city: 'Tokyo',
    neighborhood: 'Ginza',
  },
  {
    id: 3,
    category: 'Restaurant',
    price_level: 3,
    description: 'Traditional kaiseki with Michelin star',
    content: 'Fine dining experience in Kyoto',
    tags: ['michelin', 'traditional'],
    michelin_stars: 1,
    is_open_now: true,
    city: 'Kyoto',
    neighborhood: 'Gion',
  },
];

test('deriveRefinementFilters maps price refinements to SQL-friendly ranges', () => {
  const { filters, appliedFilters } = deriveRefinementFilters(['Looking for a cheap restaurant']);
  assert.equal(filters.priceRange?.max, PRICE_BUCKETS.budget.max);
  assert.ok(appliedFilters.includes(PRICE_BUCKETS.budget.label));
});

test('deriveRefinementFilters captures style and location refinements', () => {
  const { filters, appliedFilters } = deriveRefinementFilters(['Boutique stay', 'in tokyo']);
  assert.equal(filters.styleGroups[0]?.label, 'boutique');
  assert.equal(filters.locations[0]?.term, 'tokyo');
  assert.ok(appliedFilters.some(label => label.startsWith('in ')));
});

test('normalizeCategoryTerm keeps category normalization consistent across endpoints', () => {
  assert.equal(normalizeCategoryTerm('dining'), 'Restaurant');
  assert.equal(normalizeCategoryTerm('Gallery'), 'Culture');
  assert.equal(normalizeCategoryTerm('Unknown'), 'Unknown');
});

test('derived predicates filter the same destinations as the legacy logic', () => {
  const refinements = ['design-led', 'open now', 'in tokyo', 'restaurant'];
  const { filters } = deriveRefinementFilters(refinements);
  const predicate = createRefinementPredicate(filters);
  const optimized = SAMPLE_DESTINATIONS.filter(predicate).map(d => d.id);
  const legacy = legacyRefine(SAMPLE_DESTINATIONS, refinements).map(d => d.id);
  assert.deepEqual(optimized, legacy);
});
