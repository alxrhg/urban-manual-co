import { performance } from 'node:perf_hooks';
import { deriveRefinementFilters, createRefinementPredicate, type DestinationRecord } from '@/lib/search/refinementFilters';
import { legacyRefine } from './helpers/legacy-refine';

const BASE_DESTINATIONS: DestinationRecord[] = [
  {
    id: 1,
    category: 'Restaurant',
    price_level: 2,
    description: 'Design-forward cafe with minimalist interiors',
    content: 'Popular daytime spot in Tokyo',
    tags: ['design', 'minimalist'],
    is_open_now: true,
    city: 'Tokyo',
    neighborhood: 'Aoyama',
  },
  {
    id: 2,
    category: 'Hotel',
    price_level: 4,
    description: 'Luxury boutique hotel with fine dining',
    content: 'Michelin-starred tasting menu available',
    tags: ['luxury', 'boutique'],
    michelin_stars: 1,
    is_open_now: true,
    city: 'Tokyo',
    neighborhood: 'Ginza',
  },
  {
    id: 3,
    category: 'Restaurant',
    price_level: 3,
    description: 'Traditional kaiseki house',
    content: 'Fine dining experience in Kyoto',
    tags: ['traditional', 'fine dining'],
    michelin_stars: 2,
    is_open_now: true,
    city: 'Kyoto',
    neighborhood: 'Gion',
  },
];

function buildDataset(multiplier: number): DestinationRecord[] {
  const data: DestinationRecord[] = [];
  for (let i = 0; i < multiplier; i += 1) {
    BASE_DESTINATIONS.forEach(base => {
      data.push({ ...base, id: (base.id || 0) + i * BASE_DESTINATIONS.length });
    });
  }
  return data;
}

function benchmark(fn: () => void, iterations: number): number {
  let total = 0;
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    fn();
    total += performance.now() - start;
  }
  return total / iterations;
}

const DATASET = buildDataset(800);
const refinements = ['design-led', 'open now', 'in tokyo', 'restaurant'];
const { filters } = deriveRefinementFilters(refinements);
const predicate = createRefinementPredicate(filters);

const legacyAvg = benchmark(() => legacyRefine(DATASET, refinements), 50);
const optimizedAvg = benchmark(() => DATASET.filter(predicate), 50);

console.log('Refinement benchmark (ms per run):');
console.log(`Legacy in-memory filtering: ${legacyAvg.toFixed(4)} ms`);
console.log(`Predicate-based filtering: ${optimizedAvg.toFixed(4)} ms`);
console.log(`Speedup: ${(legacyAvg / optimizedAvg).toFixed(2)}x`);
