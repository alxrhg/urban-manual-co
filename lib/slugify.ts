/**
 * Centralized slug generation utilities for Urban Manual
 *
 * IMPORTANT: All slug generation should use these utilities to ensure consistency.
 * Slugs follow the format: {name-slug}-{city-slug} for destinations
 *
 * Examples:
 * - "Le Bernardin" + "New York" → "le-bernardin-new-york"
 * - "11 Howard" + "New York" → "11-howard-new-york"
 * - "Café de Flore" + "Paris" → "cafe-de-flore-paris"
 */

/**
 * Convert any string to a URL-friendly slug
 * Handles Unicode characters, special characters, and edge cases
 */
export function slugify(input: string): string {
  if (!input) return '';

  return input
    // Normalize Unicode characters (é → e, ü → u, etc.)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // Convert to lowercase
    .toLowerCase()
    // Replace common symbols with words
    .replace(/&/g, '-and-')
    .replace(/@/g, '-at-')
    .replace(/\+/g, '-plus-')
    // Remove apostrophes and quotes without leaving gaps
    .replace(/[''"`]/g, '')
    // Replace any non-alphanumeric characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Trim to reasonable length
    .slice(0, 100);
}

/**
 * Generate a destination slug from name and city
 * Format: {name-slug}-{city-slug}
 *
 * This ensures uniqueness even when the same destination name exists in different cities.
 *
 * @param name - Destination name (e.g., "Le Bernardin")
 * @param city - City name (e.g., "New York")
 * @returns Slug like "le-bernardin-new-york"
 */
export function generateDestinationSlug(name: string, city: string): string {
  if (!name) return '';

  const nameSlug = slugify(name);
  const citySlug = city ? slugify(city) : '';

  if (!citySlug) {
    return nameSlug;
  }

  // Check if name already ends with city (avoid "11-howard-new-york-new-york")
  if (nameSlug.endsWith(`-${citySlug}`)) {
    return nameSlug;
  }

  return `${nameSlug}-${citySlug}`;
}

/**
 * Generate a city slug
 * Used for city page URLs like /city/new-york
 */
export function generateCitySlug(city: string): string {
  return slugify(city);
}

/**
 * Generate a category slug
 * Used for category page URLs like /category/restaurant
 */
export function generateCategorySlug(category: string): string {
  return slugify(category);
}

/**
 * Extract the base name from a slug that may have a city suffix
 * Useful for matching slugs when the format might vary
 *
 * @param slug - Full slug like "le-bernardin-new-york"
 * @param city - City to strip (optional)
 * @returns Base slug like "le-bernardin"
 */
export function extractBaseSlug(slug: string, city?: string): string {
  if (!slug) return '';

  const lowerSlug = slug.toLowerCase();

  if (city) {
    const citySuffix = `-${slugify(city)}`;
    if (lowerSlug.endsWith(citySuffix)) {
      return lowerSlug.slice(0, -citySuffix.length);
    }
  }

  // Try common city suffixes
  const commonCities = [
    'new-york', 'london', 'paris', 'tokyo', 'los-angeles', 'san-francisco',
    'chicago', 'miami', 'hong-kong', 'singapore', 'bangkok', 'taipei',
    'sydney', 'melbourne', 'berlin', 'rome', 'milan', 'barcelona',
    'madrid', 'amsterdam', 'dubai', 'seattle', 'boston', 'washington-dc',
    'las-vegas', 'denver', 'austin', 'nashville', 'portland', 'philadelphia',
    'san-diego', 'dallas', 'houston', 'atlanta', 'toronto', 'vancouver',
    'montreal', 'mexico-city', 'sao-paulo', 'buenos-aires', 'shanghai',
    'beijing', 'seoul', 'osaka', 'kyoto', 'mumbai', 'delhi', 'istanbul',
    'cairo', 'cape-town', 'johannesburg', 'lagos', 'nairobi', 'marrakech',
    'lisbon', 'porto', 'florence', 'venice', 'vienna', 'prague', 'budapest',
    'warsaw', 'stockholm', 'copenhagen', 'oslo', 'helsinki', 'dublin',
    'edinburgh', 'manchester', 'birmingham', 'brussels', 'zurich', 'geneva',
    'munich', 'frankfurt', 'hamburg', 'athens', 'santorini', 'mykonos'
  ];

  for (const city of commonCities) {
    const suffix = `-${city}`;
    if (lowerSlug.endsWith(suffix)) {
      return lowerSlug.slice(0, -suffix.length);
    }
  }

  return lowerSlug;
}

/**
 * Validate a slug format
 * Returns true if the slug is valid (lowercase alphanumeric with hyphens)
 */
export function isValidSlug(slug: string): boolean {
  if (!slug) return false;
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Compare two slugs for equivalence
 * Handles case differences and trailing variations
 */
export function slugsMatch(slug1: string, slug2: string): boolean {
  if (!slug1 || !slug2) return false;

  const normalized1 = slug1.toLowerCase().replace(/^-+|-+$/g, '');
  const normalized2 = slug2.toLowerCase().replace(/^-+|-+$/g, '');

  return normalized1 === normalized2;
}
