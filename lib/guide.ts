import { formatCityName, toKebabCase } from './slug';

const CATEGORY_MAP: Record<string, string> = {
  restaurants: 'Restaurant',
  restaurant: 'Restaurant',
  hotels: 'Hotel',
  hotel: 'Hotel',
  cafes: 'Cafe',
  cafe: 'Cafe',
  bars: 'Bar',
  shopping: 'Shopping',
  museums: 'Museum',
  culture: 'Cultural',
  beaches: 'Beach',
  attractions: 'Attraction',
};

export interface GuideSlugMeta {
  citySlug: string;
  cityDisplayName: string;
  categorySlug: string;
  categoryLabel: string;
  focusKeyword: string;
}

export function parseGuideSlug(slug: string): GuideSlugMeta {
  const normalized = toKebabCase(slug);
  const tokens = normalized.split('-').filter(Boolean);

  // Remove generic guide keywords
  const filtered = tokens.filter(token => token !== 'guide' && token !== 'travel' && token !== 'plan');

  // Drop the word "best" if present so it doesn't become part of the category
  if (filtered[0] === 'best') {
    filtered.shift();
  }

  let citySlug = '';
  let categoryTokens: string[] = [];
  const inIndex = filtered.indexOf('in');

  if (inIndex !== -1) {
    categoryTokens = filtered.slice(0, inIndex);
    citySlug = filtered.slice(inIndex + 1).join('-');
  } else {
    citySlug = filtered.pop() || '';
    categoryTokens = filtered;
  }

  if (!citySlug) {
    citySlug = 'global';
  }

  if (categoryTokens.length === 0) {
    categoryTokens = ['destinations'];
  }

  const categorySlug = categoryTokens.join('-') || 'destinations';
  const categoryLabel = categoryTokens
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

  const cityDisplayName = formatCityName(citySlug) || 'Featured Cities';
  const focusKeyword = `best ${categoryTokens.join(' ')} in ${cityDisplayName}`;

  return {
    citySlug,
    cityDisplayName,
    categorySlug,
    categoryLabel,
    focusKeyword,
  };
}

export function resolveCategoryFilter(slug: string): string {
  const normalized = slug.toLowerCase();
  const mapped = CATEGORY_MAP[normalized];
  return mapped || 'Destination';
}
