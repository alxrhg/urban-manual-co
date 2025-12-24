/**
 * Portfolio Project Types
 *
 * Data structures for the portfolio filter system
 */

export interface Project {
  id: string;
  title: string;
  year: number;
  image: string;
  category: ProjectCategory;
  location: ProjectLocation;
  industryType: IndustryType;
  slug?: string;
  description?: string;
}

export type ProjectCategory = 'Architecture' | 'Interior' | 'Graphic';

export type ProjectLocation =
  | 'North America'
  | 'Europe'
  | 'Asia'
  | 'Middle East'
  | 'Africa'
  | 'South America'
  | 'Oceania';

export type IndustryType =
  | 'Residential'
  | 'Commercial'
  | 'Hospitality'
  | 'Cultural'
  | 'Retail'
  | 'Healthcare'
  | 'Education';

export interface PortfolioFilters {
  category?: ProjectCategory;
  location?: ProjectLocation;
  industryType?: IndustryType;
}

export interface FilterOption<T> {
  value: T;
  label: string;
}

export const PROJECT_CATEGORIES: FilterOption<ProjectCategory>[] = [
  { value: 'Architecture', label: 'Architecture' },
  { value: 'Interior', label: 'Interior' },
  { value: 'Graphic', label: 'Graphic' },
];

export const PROJECT_LOCATIONS: FilterOption<ProjectLocation>[] = [
  { value: 'North America', label: 'North America' },
  { value: 'Europe', label: 'Europe' },
  { value: 'Asia', label: 'Asia' },
  { value: 'Middle East', label: 'Middle East' },
  { value: 'Africa', label: 'Africa' },
  { value: 'South America', label: 'South America' },
  { value: 'Oceania', label: 'Oceania' },
];

export const INDUSTRY_TYPES: FilterOption<IndustryType>[] = [
  { value: 'Residential', label: 'Residential' },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Hospitality', label: 'Hospitality' },
  { value: 'Cultural', label: 'Cultural' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Education', label: 'Education' },
];

/**
 * Convert URL slug to filter value
 */
export function slugToValue(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert filter value to URL slug
 */
export function valueToSlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Parse URL path segments into filter state
 */
export function parseFiltersFromPath(segments: string[]): PortfolioFilters {
  const filters: PortfolioFilters = {};

  for (let i = 0; i < segments.length; i += 2) {
    const filterType = segments[i];
    const filterValue = segments[i + 1];

    if (!filterValue) continue;

    const value = slugToValue(filterValue);

    switch (filterType) {
      case 'category':
        if (PROJECT_CATEGORIES.some(c => c.value === value)) {
          filters.category = value as ProjectCategory;
        }
        break;
      case 'location':
        if (PROJECT_LOCATIONS.some(l => l.value === value)) {
          filters.location = value as ProjectLocation;
        }
        break;
      case 'industry-type':
        if (INDUSTRY_TYPES.some(i => i.value === value)) {
          filters.industryType = value as IndustryType;
        }
        break;
    }
  }

  return filters;
}

/**
 * Build URL path from filter state
 */
export function buildFilterPath(filters: PortfolioFilters): string {
  const segments: string[] = [];

  if (filters.category) {
    segments.push('category', valueToSlug(filters.category));
  }
  if (filters.location) {
    segments.push('location', valueToSlug(filters.location));
  }
  if (filters.industryType) {
    segments.push('industry-type', valueToSlug(filters.industryType));
  }

  return segments.length > 0 ? `/${segments.join('/')}/` : '';
}
