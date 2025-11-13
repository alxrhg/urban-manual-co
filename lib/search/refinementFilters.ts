import type { PostgrestFilterBuilder } from '@supabase/supabase-js';

export const CATEGORY_SYNONYMS: Record<string, string> = {
  restaurant: 'Restaurant',
  dining: 'Restaurant',
  food: 'Restaurant',
  eat: 'Restaurant',
  meal: 'Restaurant',
  hotel: 'Hotel',
  stay: 'Hotel',
  accommodation: 'Hotel',
  lodging: 'Hotel',
  cafe: 'Cafe',
  coffee: 'Cafe',
  bar: 'Bar',
  drink: 'Bar',
  cocktail: 'Bar',
  nightlife: 'Bar',
  culture: 'Culture',
  museum: 'Culture',
  art: 'Culture',
  gallery: 'Culture',
};

const CATEGORY_FILTER_MAP: Record<string, string[]> = {
  restaurant: ['Dining', 'Restaurant'],
  hotel: ['Hotel', 'Accommodation'],
  cafe: ['Cafe', 'Coffee'],
  bar: ['Bar', 'Nightlife'],
  museum: ['Culture', 'Museum'],
  gallery: ['Culture', 'Gallery', 'Art'],
  shop: ['Shopping', 'Retail'],
  store: ['Shopping', 'Retail'],
};

export const PRICE_BUCKETS = {
  budget: { label: 'budget-friendly', max: 2 },
  luxury: { label: 'luxury', min: 4 },
  under30k: { label: 'under ¥30k', max: 3 },
  under5k: { label: 'under ¥5k', max: 1 },
};

type Matcher = string | RegExp;

interface PriceFilterDefinition {
  label: string;
  min?: number;
  max?: number;
  matchers: Matcher[];
}

interface StyleFilterDefinition {
  label: string;
  keywords: string[];
  matchers: Matcher[];
}

interface CategoryFilterDefinition {
  label: string;
  values: string[];
  matchers: Matcher[];
}

interface LocationFilterDefinition {
  label: string;
  extract: (value: string) => string | null;
}

export interface DerivedRefinementFilters {
  priceRange?: { min?: number; max?: number };
  styleGroups: Array<{ label: string; keywords: string[] }>;
  category?: CategoryFilterDefinition;
  openNow?: boolean;
  michelin?: boolean;
  locations: Array<{ label: string; term: string }>;
}

export interface DestinationRecord {
  id?: number;
  category?: string | null;
  price_level?: number | null;
  michelin_stars?: number | null;
  description?: string | null;
  content?: string | null;
  tags?: string[] | null;
  is_open_now?: boolean | null;
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
}

const PRICE_FILTERS: PriceFilterDefinition[] = [
  { ...PRICE_BUCKETS.budget, matchers: [/cheap/, /budget/, /under/] },
  { ...PRICE_BUCKETS.luxury, matchers: [/luxury/, /expensive/, /upscale/] },
  { ...PRICE_BUCKETS.under30k, matchers: [/¥30k/, /30000/, /under ¥30k/] },
  { ...PRICE_BUCKETS.under5k, matchers: [/¥5k/, /5000/, /under ¥5k/] },
];

const STYLE_FILTERS: StyleFilterDefinition[] = [
  { label: 'design-led', keywords: ['design', 'minimalist', 'modern'], matchers: [/design/] },
  { label: 'minimalist', keywords: ['minimalist', 'minimal'], matchers: [/minimalist/, /minimal/] },
  { label: 'traditional', keywords: ['traditional', 'classic'], matchers: [/traditional/, /classic/] },
  { label: 'boutique', keywords: ['boutique'], matchers: [/boutique/] },
  { label: 'casual', keywords: ['casual'], matchers: [/casual/] },
  { label: 'fine dining', keywords: ['fine dining', 'upscale'], matchers: [/fine dining/, /fine-dining/] },
];

const CATEGORY_FILTERS: CategoryFilterDefinition[] = Object.entries(CATEGORY_FILTER_MAP).map(
  ([label, values]) => ({
    label,
    values,
    matchers: [new RegExp(label, 'i')],
  })
);

const LOCATION_FILTERS: LocationFilterDefinition[] = [
  {
    label: 'location',
    extract: value => {
      if (value.startsWith('in ')) {
        return value.replace(/^in\s+/, '').trim();
      }
      if (value.startsWith('location:')) {
        return value.replace(/^location:/, '').trim();
      }
      return null;
    },
  },
];

const STATUS_MATCHERS = [/open now/, /currently open/];
const MICHELIN_MATCHERS = [/michelin/];

function matches(lower: string, matcher: Matcher): boolean {
  if (typeof matcher === 'string') {
    return lower.includes(matcher);
  }
  return matcher.test(lower);
}

function escapeLike(value: string): string {
  return value.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function encodeArrayValue(value: string): string {
  const normalized = value.replace(/"/g, '\\"');
  return `"${normalized}"`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeCategoryTerm(term?: string | null): string | undefined {
  if (!term) return undefined;
  const normalized = CATEGORY_SYNONYMS[term.toLowerCase()];
  return normalized || term;
}

export function deriveRefinementFilters(refinements: string[]): {
  filters: DerivedRefinementFilters;
  appliedFilters: string[];
} {
  const filters: DerivedRefinementFilters = {
    styleGroups: [],
    locations: [],
  };
  const appliedFilters: string[] = [];

  for (const refinement of refinements) {
    if (!refinement) continue;
    const lower = normalizeWhitespace(refinement.toLowerCase());

    const priceMatch = PRICE_FILTERS.find(def => def.matchers.some(m => matches(lower, m)));
    if (priceMatch) {
      filters.priceRange = filters.priceRange || {};
      if (typeof priceMatch.min === 'number') {
        filters.priceRange.min = filters.priceRange.min != null
          ? Math.max(filters.priceRange.min, priceMatch.min)
          : priceMatch.min;
      }
      if (typeof priceMatch.max === 'number') {
        filters.priceRange.max = filters.priceRange.max != null
          ? Math.min(filters.priceRange.max, priceMatch.max)
          : priceMatch.max;
      }
      appliedFilters.push(priceMatch.label);
      continue;
    }

    const styleMatch = STYLE_FILTERS.find(def => def.matchers.some(m => matches(lower, m)));
    if (styleMatch) {
      filters.styleGroups.push({ label: styleMatch.label, keywords: styleMatch.keywords });
      appliedFilters.push(styleMatch.label);
      continue;
    }

    if (STATUS_MATCHERS.some(m => matches(lower, m))) {
      filters.openNow = true;
      appliedFilters.push('open now');
      continue;
    }

    if (MICHELIN_MATCHERS.some(m => matches(lower, m))) {
      filters.michelin = true;
      appliedFilters.push('Michelin-starred');
      continue;
    }

    const locationMatch = LOCATION_FILTERS
      .map(def => ({ label: def.label, term: def.extract(lower) }))
      .find(result => !!result.term);
    if (locationMatch) {
      filters.locations.push({ label: locationMatch.label, term: locationMatch.term! });
      appliedFilters.push(`in ${locationMatch.term}`);
      continue;
    }

    const categoryMatch = CATEGORY_FILTERS.find(def => def.matchers.some(m => matches(lower, m)));
    if (categoryMatch) {
      filters.category = categoryMatch;
      appliedFilters.push(categoryMatch.label);
      continue;
    }
  }

  return { filters, appliedFilters };
}

export function applyRefinementFilters<T extends DestinationRecord>(
  query: PostgrestFilterBuilder<any, T, unknown>,
  filters: DerivedRefinementFilters,
): PostgrestFilterBuilder<any, T, unknown> {
  if (filters.priceRange) {
    if (filters.priceRange.min != null) {
      query = query.gte('price_level', filters.priceRange.min);
    }
    if (filters.priceRange.max != null) {
      query = query.lte('price_level', filters.priceRange.max);
    }
  }

  if (filters.category) {
    const clause = filters.category.values
      .map(value => `category.ilike.%${escapeLike(value)}%`)
      .join(',');
    if (clause) {
      query = query.or(clause);
    }
  }

  for (const style of filters.styleGroups) {
    const clause = style.keywords
      .map(keyword => {
        const escaped = escapeLike(keyword.toLowerCase());
        const tagValue = encodeArrayValue(keyword.toLowerCase());
        return [
          `description.ilike.%${escaped}%`,
          `content.ilike.%${escaped}%`,
          `tags.cs.{${tagValue}}`,
        ].join(',');
      })
      .join(',');
    if (clause) {
      query = query.or(clause);
    }
  }

  for (const location of filters.locations) {
    const escaped = escapeLike(location.term.toLowerCase());
    const clause = [
      `city.ilike.%${escaped}%`,
      `neighborhood.ilike.%${escaped}%`,
      `address.ilike.%${escaped}%`,
    ].join(',');
    query = query.or(clause);
  }

  if (filters.openNow) {
    query = query.eq('is_open_now', true);
  }

  if (filters.michelin) {
    query = query.gt('michelin_stars', 0);
  }

  return query;
}

function stringIncludes(value: string | null | undefined, term: string): boolean {
  if (!value) return false;
  return value.toLowerCase().includes(term);
}

function tagsInclude(tags: string[] | null | undefined, term: string): boolean {
  if (!Array.isArray(tags)) return false;
  return tags.some(tag => tag?.toLowerCase().includes(term));
}

function matchesStyleGroup(destination: DestinationRecord, keywords: string[]): boolean {
  return keywords.some(keyword =>
    stringIncludes(destination.description, keyword) ||
    stringIncludes(destination.content, keyword) ||
    tagsInclude(destination.tags, keyword)
  );
}

function matchesCategory(destination: DestinationRecord, category?: CategoryFilterDefinition): boolean {
  if (!category) return true;
  const value = destination.category?.toLowerCase();
  if (!value) return false;
  return category.values.some(cat => value.includes(cat.toLowerCase()));
}

function matchesLocation(destination: DestinationRecord, locations: Array<{ term: string }>): boolean {
  return locations.every(({ term }) => {
    const lower = term.toLowerCase();
    return (
      stringIncludes(destination.city, lower) ||
      stringIncludes(destination.neighborhood, lower) ||
      stringIncludes(destination.address, lower)
    );
  });
}

export function createRefinementPredicate(filters: DerivedRefinementFilters) {
  return (destination: DestinationRecord) => {
    if (filters.priceRange) {
      const level = destination.price_level ?? 0;
      if (filters.priceRange.min != null && level < filters.priceRange.min) return false;
      if (filters.priceRange.max != null && level > filters.priceRange.max) return false;
    }

    if (filters.openNow && destination.is_open_now !== true) {
      return false;
    }

    if (filters.michelin && (destination.michelin_stars ?? 0) <= 0) {
      return false;
    }

    if (!matchesCategory(destination, filters.category)) {
      return false;
    }

    if (filters.locations.length && !matchesLocation(destination, filters.locations)) {
      return false;
    }

    for (const style of filters.styleGroups) {
      if (!matchesStyleGroup(destination, style.keywords)) {
        return false;
      }
    }

    return true;
  };
}
