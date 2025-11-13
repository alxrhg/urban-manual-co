import type { DestinationRecord } from '@/lib/search/refinementFilters';

const CATEGORY_MAP: Record<string, string[]> = {
  restaurant: ['Dining', 'Restaurant'],
  hotel: ['Hotel', 'Accommodation'],
  cafe: ['Cafe', 'Coffee'],
  bar: ['Bar', 'Nightlife'],
  museum: ['Culture', 'Museum'],
  gallery: ['Culture', 'Gallery', 'Art'],
  shop: ['Shopping', 'Retail'],
  store: ['Shopping', 'Retail'],
};

function includesLower(value: string | null | undefined, term: string): boolean {
  return value?.toLowerCase().includes(term) ?? false;
}

export function legacyRefine(destinations: DestinationRecord[], refinements: string[]): DestinationRecord[] {
  let filtered = [...destinations];

  for (const refinement of refinements) {
    const lower = String(refinement).toLowerCase().trim();

    if (lower.includes('cheap') || lower.includes('budget') || lower.includes('under')) {
      filtered = filtered.filter(d => (d.price_level ?? 0) <= 2);
      continue;
    }
    if (lower.includes('luxury') || lower.includes('expensive') || lower.includes('upscale')) {
      filtered = filtered.filter(d => (d.price_level ?? 0) >= 4);
      continue;
    }
    if (lower.includes('¥30k') || lower.includes('30000') || lower.includes('under ¥30k')) {
      filtered = filtered.filter(d => (d.price_level ?? 0) <= 3);
      continue;
    }
    if (lower.includes('¥5k') || lower.includes('5000') || lower.includes('under ¥5k')) {
      filtered = filtered.filter(d => (d.price_level ?? 0) <= 1);
      continue;
    }

    if (lower.includes('design')) {
      filtered = filtered.filter(d =>
        includesLower(d.description, 'design') ||
        includesLower(d.content, 'design') ||
        includesLower(d.description, 'minimalist') ||
        includesLower(d.content, 'minimalist') ||
        (Array.isArray(d.tags) && d.tags.some(tag => tag?.toLowerCase().includes('design') || tag?.toLowerCase().includes('minimalist') || tag?.toLowerCase().includes('modern')))
      );
      continue;
    }
    if (lower.includes('minimalist') || lower.includes('minimal')) {
      filtered = filtered.filter(d =>
        includesLower(d.description, 'minimalist') ||
        includesLower(d.content, 'minimalist') ||
        (Array.isArray(d.tags) && d.tags.some(tag => tag?.toLowerCase().includes('minimalist')))
      );
      continue;
    }
    if (lower.includes('traditional') || lower.includes('classic')) {
      filtered = filtered.filter(d =>
        includesLower(d.description, 'traditional') ||
        includesLower(d.content, 'traditional') ||
        includesLower(d.description, 'classic') ||
        includesLower(d.content, 'classic')
      );
      continue;
    }
    if (lower.includes('boutique')) {
      filtered = filtered.filter(d =>
        includesLower(d.description, 'boutique') ||
        includesLower(d.content, 'boutique') ||
        (Array.isArray(d.tags) && d.tags.some(tag => tag?.toLowerCase().includes('boutique')))
      );
      continue;
    }
    if (lower.includes('casual')) {
      filtered = filtered.filter(d =>
        includesLower(d.description, 'casual') ||
        includesLower(d.content, 'casual') ||
        (Array.isArray(d.tags) && d.tags.some(tag => tag?.toLowerCase().includes('casual')))
      );
      continue;
    }
    if (lower.includes('fine dining') || lower.includes('fine-dining')) {
      filtered = filtered.filter(d =>
        includesLower(d.description, 'fine dining') ||
        includesLower(d.content, 'fine dining') ||
        includesLower(d.description, 'upscale') ||
        includesLower(d.content, 'upscale')
      );
      continue;
    }

    if (lower.includes('open now') || lower.includes('currently open')) {
      filtered = filtered.filter(d => d.is_open_now === true);
      continue;
    }

    if (lower.includes('michelin')) {
      filtered = filtered.filter(d => (d.michelin_stars ?? 0) > 0);
      continue;
    }

    if (lower.startsWith('in ') || lower.includes('location:')) {
      const location = lower.replace(/^(in |location:)/, '').trim();
      filtered = filtered.filter(d =>
        includesLower(d.city, location) ||
        includesLower(d.neighborhood, location) ||
        includesLower(d.address, location)
      );
      continue;
    }

    for (const [key, categories] of Object.entries(CATEGORY_MAP)) {
      if (lower.includes(key)) {
        filtered = filtered.filter(d =>
          categories.some(cat => includesLower(d.category, cat.toLowerCase()))
        );
        break;
      }
    }
  }

  return filtered;
}
