interface SuggestionInput {
  query: string;
  results: any[];
  filters?: {
    openNow?: boolean;
    priceMax?: number;
  };
}

export function generateSuggestions(input: SuggestionInput) {
  const { query, results, filters } = input;
  const suggestions: Array<{ label: string; refinement: string }> = [];
  const lower = query.toLowerCase();

  if (lower.includes('hotel')) {
    suggestions.push(
      { label: 'Design-led', refinement: 'design boutique' },
      { label: 'Luxury', refinement: 'luxury' },
      { label: 'Under ¥30K', refinement: 'budget' },
    );
  } else if (lower.includes('restaurant')) {
    const hasMichelin = results.some((r: any) => r.michelin_stars);
    if (hasMichelin) suggestions.push({ label: 'Michelin-starred', refinement: 'michelin' });
    suggestions.push(
      { label: 'Casual', refinement: 'casual' },
      { label: 'Fine dining', refinement: 'fine dining' },
    );
  } else if (lower.includes('cafe') || lower.includes('coffee')) {
    suggestions.push(
      { label: 'Minimalist', refinement: 'minimalist' },
      { label: 'Cozy', refinement: 'cozy vintage' },
      { label: 'Third wave', refinement: 'specialty coffee' },
    );
  }

  const priceRange = analyzePriceRange(results);
  if (priceRange === 'varied') {
    suggestions.push(
      { label: 'Under ¥5K', refinement: 'budget' },
      { label: '¥¥¥', refinement: 'upscale' },
    );
  }

  if (!filters?.openNow) {
    const hasOpenNow = results.some((r: any) => r.is_open_now);
    if (hasOpenNow) suggestions.push({ label: 'Open now', refinement: 'open now' });
  }

  const location = extractLocation(lower);
  if (location) {
    const nearby = getNearbyLocations(location);
    if (nearby.length > 0) {
      suggestions.push({ label: `Nearby (${nearby.slice(0, 2).join(', ')})`, refinement: `include ${nearby.join(' ')}` });
    }
  }

  return suggestions.slice(0, 6);
}

function analyzePriceRange(results: any[]): 'varied' | 'consistent' {
  const prices = results.map((r: any) => r.price_level).filter((p: any) => p != null);
  const unique = new Set(prices);
  return unique.size >= 3 ? 'varied' : 'consistent';
}

function extractLocation(query: string): string | null {
  const locations = ['shibuya', 'shinjuku', 'ginza', 'aoyama'];
  for (const loc of locations) if (query.includes(loc)) return loc;
  return null;
}

function getNearbyLocations(location: string): string[] {
  const nearby: Record<string, string[]> = {
    shibuya: ['Aoyama', 'Omotesando', 'Harajuku'],
    shinjuku: ['Yoyogi', 'Takadanobaba'],
    ginza: ['Marunouchi', 'Nihonbashi'],
  };
  return nearby[location] || [];
}


