/**
 * Slug Redirect Utilities
 *
 * Handles redirects from old slugs (without city) to new slugs (with city).
 * This is used after the migration to ensure old URLs still work.
 */

import { createServerClient } from './supabase-server';

interface RedirectResult {
  found: boolean;
  newSlug?: string;
}

/**
 * Check if an old slug needs to be redirected to a new slug
 * This queries the database to find if a destination exists with a matching base name
 */
export async function findSlugRedirect(oldSlug: string): Promise<RedirectResult> {
  try {
    const supabase = await createServerClient();

    // First, check if this exact slug exists (no redirect needed)
    const { data: exactMatch } = await supabase
      .from('destinations')
      .select('slug')
      .eq('slug', oldSlug)
      .maybeSingle();

    if (exactMatch) {
      return { found: false }; // Exact match exists, no redirect needed
    }

    // Try to find a destination where the slug starts with the old slug
    // and ends with a city suffix
    const { data: potentialMatches } = await supabase
      .from('destinations')
      .select('slug, name, city')
      .ilike('slug', `${oldSlug}-%`)
      .limit(5);

    if (potentialMatches && potentialMatches.length > 0) {
      // Find the best match - prefer exact name match
      for (const match of potentialMatches) {
        const expectedSlug = match.slug;
        const basePart = expectedSlug.split('-').slice(0, -1).join('-');

        // Check if removing the city suffix gives us the old slug
        if (basePart === oldSlug || expectedSlug.startsWith(`${oldSlug}-`)) {
          return { found: true, newSlug: match.slug };
        }
      }
    }

    return { found: false };
  } catch (error) {
    console.error('Error finding slug redirect:', error);
    return { found: false };
  }
}

/**
 * Build a slug lookup map from the database
 * This is useful for batch operations or caching
 */
export async function buildSlugLookupMap(): Promise<Map<string, string>> {
  const supabase = await createServerClient();
  const map = new Map<string, string>();

  const { data: destinations } = await supabase
    .from('destinations')
    .select('slug, name, city');

  if (destinations) {
    for (const dest of destinations) {
      // Create lookup from potential old slug (name only) to new slug (name-city)
      const nameSlug = dest.name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Only add if different from current slug
      if (nameSlug !== dest.slug) {
        map.set(nameSlug, dest.slug);
      }
    }
  }

  return map;
}
