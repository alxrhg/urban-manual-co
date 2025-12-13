import { extractLocation } from './extractLocation';
import { expandNearbyLocations } from './expandLocations';
import type { ActionPatch, ActionPatchIcon } from '@/types/action-patch';

interface SuggestionInput {
  query: string;
  results: any[];
  refinements?: string[];
  filters?: {
    openNow?: boolean;
    priceMax?: number;
    city?: string;
    category?: string;
  };
}

/**
 * Legacy suggestion interface for backwards compatibility
 * @deprecated Use ActionPatch instead
 */
interface LegacySuggestion {
  label: string;
  refinement: string;
  type: 'tag' | 'location' | 'price' | 'category' | 'style' | 'michelin' | 'open';
}

/**
 * Internal suggestion structure with full ActionPatch data
 */
interface Suggestion {
  label: string;
  refinement: string;
  type: 'tag' | 'location' | 'price' | 'category' | 'style' | 'michelin' | 'open';
  patch: ActionPatch['patch'];
  icon: ActionPatchIcon;
  priority: number;
}

/**
 * Map suggestion types to ActionPatch icons
 */
const typeToIcon: Record<Suggestion['type'], ActionPatchIcon> = {
  tag: 'default',
  location: 'location',
  price: 'price',
  category: 'category',
  style: 'vibe',
  michelin: 'michelin',
  open: 'time',
};

/**
 * Generate intelligent filter chips based on actual results data
 * Analyzes tags, locations, prices, categories, and styles to suggest meaningful filters
 *
 * Returns ActionPatch objects for deterministic application of refinements.
 */
export async function generateSuggestions(input: SuggestionInput): Promise<ActionPatch[]> {
  const { query, results, refinements = [], filters } = input;

  if (!results || results.length === 0) {
    return [];
  }

  const suggestions: Suggestion[] = [];
  const appliedRefinements = new Set(refinements.map(r => r.toLowerCase()));
  const lowerQuery = query.toLowerCase();

  // Extract common tags from results
  const tagFrequency = new Map<string, number>();
  const styleKeywords = new Set([
    'design', 'luxury', 'boutique', 'minimalist', 'modern', 'contemporary',
    'vintage', 'cozy', 'upscale', 'casual', 'fine dining', 'artisan', 'craft',
    'specialty', 'award-winning', 'celebrity', 'architectural', 'sustainable'
  ]);

  results.forEach((dest: any) => {
    // Analyze tags array
    if (dest.tags && Array.isArray(dest.tags)) {
      dest.tags.forEach((tag: string) => {
        const lowerTag = tag.toLowerCase();
        tagFrequency.set(lowerTag, (tagFrequency.get(lowerTag) || 0) + 1);
      });
    }

    // Analyze description/content for style keywords
    const text = `${dest.description || ''} ${dest.content || ''}`.toLowerCase();
    styleKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tagFrequency.set(keyword, (tagFrequency.get(keyword) || 0) + 0.5);
      }
    });
  });

  // Priority order: style > tag > location > price > category > michelin > open
  const priority: Record<Suggestion['type'], number> = {
    style: 6,
    tag: 5,
    location: 4,
    price: 3,
    category: 2,
    michelin: 1,
    open: 0,
  };

  // Add tag-based suggestions (most common tags)
  const sortedTags = Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  for (const [tag, frequency] of sortedTags) {
    if (frequency >= 2 && !appliedRefinements.has(tag)) {
      const label = formatTagLabel(tag);
      const type: Suggestion['type'] = styleKeywords.has(tag) ? 'style' : 'tag';
      suggestions.push({
        label,
        refinement: tag,
        type,
        patch: {
          filters: {
            vibes: [tag],
          },
        },
        icon: typeToIcon[type],
        priority: priority[type],
      });
    }
  }

  // Extract locations/neighborhoods from results
  const locationFrequency = new Map<string, number>();
  results.forEach((dest: any) => {
    if (dest.neighborhood) {
      const loc = dest.neighborhood.toLowerCase();
      locationFrequency.set(loc, (locationFrequency.get(loc) || 0) + 1);
    } else if (dest.city) {
      const loc = dest.city.toLowerCase();
      locationFrequency.set(loc, (locationFrequency.get(loc) || 0) + 1);
    }
  });

  // Suggest neighborhoods if multiple results share same location
  const sortedLocations = Array.from(locationFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([loc, count]) => count >= 2 && count < results.length);

  for (const [location] of sortedLocations.slice(0, 2)) {
    const refinement = `in ${location}`;
    if (!appliedRefinements.has(refinement.toLowerCase())) {
      suggestions.push({
        label: capitalizeLocation(location),
        refinement,
        type: 'location',
        patch: {
          filters: {
            neighborhood: capitalizeLocation(location),
          },
        },
        icon: 'location',
        priority: priority.location,
      });
    }
  }

  // Price range analysis
  const prices = results
    .map((r: any) => r.price_level)
    .filter((p: any) => p != null && p > 0);

  if (prices.length > 0) {
    const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);
    const priceRange = analyzePriceRange(prices);

    if (priceRange === 'varied' && uniquePrices.length >= 3) {
      // Suggest budget option if lower prices exist
      const hasBudget = uniquePrices.some(p => p <= 2);
      const hasUpscale = uniquePrices.some(p => p >= 4);

      if (hasBudget && !appliedRefinements.has('budget')) {
        suggestions.push({
          label: formatPriceLabel(uniquePrices[0] <= 1 ? 'Under ¥5K' : 'Under ¥10K'),
          refinement: 'budget',
          type: 'price',
          patch: {
            filters: {
              priceMax: 2,
            },
          },
          icon: 'price',
          priority: priority.price,
        });
      }

      if (hasUpscale && !appliedRefinements.has('upscale')) {
        suggestions.push({
          label: 'Upscale',
          refinement: 'upscale',
          type: 'price',
          patch: {
            filters: {
              priceMin: 3,
            },
          },
          icon: 'price',
          priority: priority.price,
        });
      }
    }
  }

  // Category-based suggestions
  const categoryFrequency = new Map<string, number>();
  results.forEach((dest: any) => {
    if (dest.category) {
      const cat = dest.category.toLowerCase();
      categoryFrequency.set(cat, (categoryFrequency.get(cat) || 0) + 1);
    }
  });

  // If query mentions category but results are mixed, suggest filtering by category
  const dominantCategory = Array.from(categoryFrequency.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (dominantCategory && dominantCategory[1] >= 3 && dominantCategory[1] < results.length) {
    const refinement = dominantCategory[0];
    if (!appliedRefinements.has(refinement)) {
      suggestions.push({
        label: capitalizeCategory(dominantCategory[0]),
        refinement,
        type: 'category',
        patch: {
          filters: {
            category: dominantCategory[0],
          },
        },
        icon: 'category',
        priority: priority.category,
      });
    }
  }

  // Michelin stars
  const michelinCount = results.filter((r: any) => r.michelin_stars && r.michelin_stars > 0).length;
  if (michelinCount >= 2 && !appliedRefinements.has('michelin')) {
    suggestions.push({
      label: 'Michelin-starred',
      refinement: 'michelin',
      type: 'michelin',
      patch: {
        filters: {
          michelin: true,
        },
      },
      icon: 'michelin',
      priority: priority.michelin,
    });
  }

  // Open now (if not already filtered)
  if (!filters?.openNow) {
    const openNowCount = results.filter((r: any) => r.is_open_now === true).length;
    if (openNowCount >= 3) {
      suggestions.push({
        label: 'Open now',
        refinement: 'open now',
        type: 'open',
        patch: {
          filters: {
            openNow: true,
          },
        },
        icon: 'time',
        priority: priority.open,
      });
    }
  }

  // Location-based suggestions (nearby neighborhoods)
  try {
    const queryLocation = await extractLocation(query);
    if (queryLocation) {
      const nearby = await expandNearbyLocations(queryLocation, 3);
      if (nearby.length > 1) {
        const nearbyLoc = nearby[1]; // First nearby location
        const refinement = `in ${nearbyLoc.toLowerCase()}`;
        if (!appliedRefinements.has(refinement)) {
          suggestions.push({
            label: capitalizeLocation(nearbyLoc),
            refinement,
            type: 'location',
            patch: {
              filters: {
                neighborhood: capitalizeLocation(nearbyLoc),
              },
            },
            icon: 'location',
            priority: priority.location,
          });
        }
      }
    }
  } catch (error) {
    // Silently fail location extraction
    console.error('Error extracting location for suggestions:', error);
  }

  // Deduplicate and prioritize
  const seen = new Set<string>();
  const deduped: Suggestion[] = [];

  suggestions
    .sort((a, b) => b.priority - a.priority)
    .forEach(s => {
      const key = s.refinement.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(s);
      }
    });

  // Return top 6 suggestions as ActionPatch objects
  return deduped.slice(0, 6).map(s => ({
    label: s.label,
    patch: s.patch,
    reason: {
      type: 'refine' as const,
      text: `Filter by ${s.type}`,
    },
    icon: s.icon,
    priority: s.priority,
  }));
}

function analyzePriceRange(prices: number[]): 'varied' | 'consistent' {
  if (prices.length < 2) return 'consistent';
  const unique = new Set(prices);
  return unique.size >= 3 ? 'varied' : 'consistent';
}

function formatTagLabel(tag: string): string {
  // Capitalize and format common tags
  const mapping: Record<string, string> = {
    'design': 'Design-led',
    'luxury': 'Luxury',
    'boutique': 'Boutique',
    'minimalist': 'Minimalist',
    'modern': 'Modern',
    'contemporary': 'Contemporary',
    'vintage': 'Vintage',
    'cozy': 'Cozy',
    'upscale': 'Upscale',
    'casual': 'Casual',
    'fine dining': 'Fine dining',
    'artisan': 'Artisan',
    'craft': 'Craft',
    'specialty': 'Specialty',
    'award-winning': 'Award-winning',
    'celebrity': 'Celebrity',
    'architectural': 'Architectural',
    'sustainable': 'Sustainable',
    'specialty coffee': 'Third wave',
    'third wave': 'Third wave',
  };

  return mapping[tag] || tag.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatPriceLabel(label: string): string {
  // Keep price labels as-is
  return label;
}

function capitalizeLocation(location: string): string {
  // Handle common location formats
  const parts = location.split(/[\s-]/);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function capitalizeCategory(category: string): string {
  // Capitalize category names
  return category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Convert ActionPatch suggestions to legacy format
 * @deprecated Use ActionPatch directly in new code
 */
export function actionPatchToLegacySuggestion(patch: ActionPatch): LegacySuggestion {
  // Infer type from patch content
  let type: LegacySuggestion['type'] = 'tag';
  let refinement = patch.label;

  if (patch.patch.filters) {
    const { filters } = patch.patch;
    if (filters.michelin) {
      type = 'michelin';
      refinement = 'michelin';
    } else if (filters.openNow) {
      type = 'open';
      refinement = 'open now';
    } else if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      type = 'price';
      refinement = filters.priceMin && filters.priceMin >= 3 ? 'upscale' : 'budget';
    } else if (filters.category) {
      type = 'category';
      refinement = filters.category;
    } else if (filters.neighborhood || filters.city) {
      type = 'location';
      refinement = filters.neighborhood
        ? `in ${filters.neighborhood.toLowerCase()}`
        : filters.city || refinement;
    } else if (filters.vibes && filters.vibes.length > 0) {
      type = 'style';
      refinement = filters.vibes[0];
    }
  }

  return {
    label: patch.label,
    refinement,
    type,
  };
}

/**
 * Generate suggestions in legacy format for backwards compatibility
 * @deprecated Use generateSuggestions directly and handle ActionPatch objects
 */
export async function generateLegacySuggestions(input: SuggestionInput): Promise<LegacySuggestion[]> {
  const patches = await generateSuggestions(input);
  return patches.map(actionPatchToLegacySuggestion);
}
