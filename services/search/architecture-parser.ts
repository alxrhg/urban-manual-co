/**
 * Architecture Query Parser
 * Understands architecture-focused search queries
 */

export interface ArchitectureQuery {
  query: string;
  architect?: string;
  movement?: string;
  material?: string;
  city?: string;
  category?: string;
  originalQuery: string;
}

/**
 * Parse architecture-focused query
 */
export function parseArchitectureQuery(query: string): ArchitectureQuery {
  const lowerQuery = query.toLowerCase();
  const result: ArchitectureQuery = {
    query: query,
    originalQuery: query,
  };

  // Common architect names (expandable)
  const architectPatterns = [
    /tadao\s+ando/i,
    /zaha\s+hadid/i,
    /frank\s+gehry/i,
    /le\s+corbusier/i,
    /mies\s+van\s+der\s+rohe/i,
    /oscar\s+niemeyer/i,
    /renzo\s+piano/i,
    /norman\s+foster/i,
    /santiago\s+calatrava/i,
    /jean\s+nouvel/i,
  ];

  for (const pattern of architectPatterns) {
    if (pattern.test(query)) {
      const match = query.match(pattern);
      if (match) {
        result.architect = match[0].toLowerCase().replace(/\s+/g, '-');
        break;
      }
    }
  }

  // Design movements
  const movements = [
    'brutalism',
    'brutalist',
    'modernism',
    'modernist',
    'postmodernism',
    'postmodern',
    'contemporary',
    'minimalism',
    'minimalist',
    'art deco',
    'deconstructivism',
    'deconstructivist',
  ];

  for (const movement of movements) {
    if (lowerQuery.includes(movement)) {
      result.movement = movement.replace(/\s+/g, '-');
      break;
    }
  }

  // Materials
  const materials = [
    'concrete',
    'glass',
    'steel',
    'wood',
    'wooden',
    'stone',
    'brick',
    'marble',
    'copper',
  ];

  for (const material of materials) {
    if (lowerQuery.includes(material)) {
      result.material = material;
      break;
    }
  }

  // City extraction (simple - can be enhanced)
  const cityPatterns = [
    /in\s+([a-z\s]+?)(?:\s+restaurant|\s+hotel|\s+bar|\s+by|\s+designed|$)/i,
    /([a-z\s]+?)\s+(?:restaurant|hotel|bar|architecture)/i,
  ];

  for (const pattern of cityPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const potentialCity = match[1].trim().toLowerCase().replace(/\s+/g, '-');
      // Simple validation - not a movement or architect
      if (
        !movements.some(m => potentialCity.includes(m)) &&
        !architectPatterns.some(p => p.test(potentialCity))
      ) {
        result.city = potentialCity;
        break;
      }
    }
  }

  // Category extraction
  const categories = ['restaurant', 'hotel', 'bar', 'cafe', 'museum', 'gallery'];
  for (const category of categories) {
    if (lowerQuery.includes(category)) {
      result.category = category;
      break;
    }
  }

  return result;
}

/**
 * Check if query is architecture-focused
 */
export function isArchitectureQuery(query: string): boolean {
  const parsed = parseArchitectureQuery(query);
  return !!(parsed.architect || parsed.movement || parsed.material);
}

