/**
 * Creative Search Modes Service
 *
 * Enables outside-the-box search capabilities including:
 * - Serendipity/Surprise mode
 * - Contrarian/Opposite search
 * - Cross-domain inspiration
 * - Story-based discovery
 * - Mood alchemy
 * - Future trends detection
 */

export interface CreativeMode {
  enabled: boolean;
  type:
    | 'serendipity'
    | 'contrarian'
    | 'cross_domain'
    | 'story_based'
    | 'mood_alchemy'
    | 'future_trends'
    | null;
  intensity: number; // 0.0 - 1.0
}

export interface UserTasteProfile {
  preferredCategories?: string[];
  preferredStyles?: string[];
  preferredCuisines?: string[];
  preferredCities?: string[];
  pricePreference?: 'budget' | 'mid' | 'luxury';
  atmospherePreference?: 'quiet' | 'lively' | 'mixed';
  visitedCount?: number;
  savedCount?: number;
}

export interface CreativeSearchContext {
  query: string;
  creativeMode: CreativeMode;
  userProfile?: UserTasteProfile;
  conversationHistory?: Array<{ role: string; content: string }>;
}

// Trigger phrases that activate creative modes
const CREATIVE_TRIGGERS: Record<string, { mode: CreativeMode['type']; intensity: number }> = {
  // Serendipity triggers
  'surprise me': { mode: 'serendipity', intensity: 0.9 },
  "i'm feeling lucky": { mode: 'serendipity', intensity: 0.9 },
  "dealer's choice": { mode: 'serendipity', intensity: 0.85 },
  'take me somewhere unexpected': { mode: 'serendipity', intensity: 0.95 },
  'something random': { mode: 'serendipity', intensity: 0.8 },
  'wild card': { mode: 'serendipity', intensity: 0.9 },
  'shake things up': { mode: 'serendipity', intensity: 0.85 },

  // Contrarian triggers
  'opposite of what i usually like': { mode: 'contrarian', intensity: 0.85 },
  'challenge my taste': { mode: 'contrarian', intensity: 0.8 },
  'something totally different': { mode: 'contrarian', intensity: 0.75 },
  'outside my comfort zone': { mode: 'contrarian', intensity: 0.8 },
  'expand my horizons': { mode: 'contrarian', intensity: 0.7 },
  'what am i missing': { mode: 'contrarian', intensity: 0.6 },

  // Story-based triggers
  'places with interesting backstories': { mode: 'story_based', intensity: 0.8 },
  'somewhere with history': { mode: 'story_based', intensity: 0.75 },
  'places architects would love': { mode: 'story_based', intensity: 0.7 },
  'legendary spots': { mode: 'story_based', intensity: 0.85 },
  'where something famous happened': { mode: 'story_based', intensity: 0.8 },
  'iconic places': { mode: 'story_based', intensity: 0.75 },

  // Mood alchemy triggers
  "i'm stressed": { mode: 'mood_alchemy', intensity: 0.8 },
  "i'm tired": { mode: 'mood_alchemy', intensity: 0.75 },
  "i'm overwhelmed": { mode: 'mood_alchemy', intensity: 0.85 },
  'bored with the usual': { mode: 'mood_alchemy', intensity: 0.8 },
  'in a rut': { mode: 'mood_alchemy', intensity: 0.8 },
  'need inspiration': { mode: 'mood_alchemy', intensity: 0.7 },
  'feeling adventurous': { mode: 'mood_alchemy', intensity: 0.75 },

  // Future trends triggers
  'what will be hot': { mode: 'future_trends', intensity: 0.8 },
  "before it's cool": { mode: 'future_trends', intensity: 0.9 },
  'emerging spots': { mode: 'future_trends', intensity: 0.75 },
  'rising stars': { mode: 'future_trends', intensity: 0.8 },
  'next big thing': { mode: 'future_trends', intensity: 0.85 },
  'under the radar': { mode: 'future_trends', intensity: 0.8 },
};

// Cross-domain patterns
const CROSS_DOMAIN_PATTERNS: Array<{
  pattern: RegExp;
  category: string;
  inspiration: string;
}> = [
  { pattern: /restaurant.*(?:feel|like|vibe).*art gallery/i, category: 'Restaurant', inspiration: 'gallery' },
  { pattern: /restaurant.*(?:feel|like|vibe).*museum/i, category: 'Restaurant', inspiration: 'museum' },
  { pattern: /hotel.*(?:feel|like|vibe).*bookstore/i, category: 'Hotel', inspiration: 'bookstore' },
  { pattern: /hotel.*(?:feel|like|vibe).*library/i, category: 'Hotel', inspiration: 'bookstore' },
  { pattern: /cafe.*(?:feel|like|vibe).*living room/i, category: 'Cafe', inspiration: 'home' },
  { pattern: /cafe.*(?:feel|like|vibe).*home/i, category: 'Cafe', inspiration: 'home' },
  { pattern: /bar.*(?:feel|like|vibe).*museum/i, category: 'Bar', inspiration: 'museum' },
  { pattern: /bar.*(?:feel|like|vibe).*speakeasy/i, category: 'Bar', inspiration: 'theater' },
  { pattern: /(?:feel|like|vibe).*art gallery/i, category: null, inspiration: 'gallery' },
  { pattern: /(?:feel|like|vibe).*bookstore/i, category: null, inspiration: 'bookstore' },
  { pattern: /(?:feel|like|vibe).*(?:living room|home)/i, category: null, inspiration: 'home' },
  { pattern: /(?:feel|like|vibe).*museum/i, category: null, inspiration: 'museum' },
  { pattern: /(?:feel|like|vibe).*garden/i, category: null, inspiration: 'garden' },
  { pattern: /(?:feel|like|vibe).*theater/i, category: null, inspiration: 'theater' },
];

// Cultural reference mappings
const CULTURAL_REFERENCES: Record<string, { tags: string[]; atmosphere: string[]; style: string }> = {
  'wes anderson': {
    tags: ['symmetry', 'pastel', 'quirky', 'vintage', 'whimsical', 'meticulous'],
    atmosphere: ['curated', 'theatrical', 'colorful', 'retro'],
    style: 'whimsical-vintage',
  },
  'james bond': {
    tags: ['sophisticated', 'classic', 'luxury', 'elegant', 'martini'],
    atmosphere: ['glamorous', 'refined', 'exclusive', 'grand'],
    style: 'sophisticated-luxury',
  },
  'anthony bourdain': {
    tags: ['authentic', 'street-food', 'local', 'dive', 'no-frills', 'real'],
    atmosphere: ['casual', 'gritty', 'genuine', 'unpretentious'],
    style: 'authentic-casual',
  },
  'marie kondo': {
    tags: ['minimalist', 'clean', 'organized', 'zen', 'simple'],
    atmosphere: ['serene', 'uncluttered', 'peaceful', 'intentional'],
    style: 'minimalist-zen',
  },
  'sofia coppola': {
    tags: ['dreamy', 'aesthetic', 'romantic', 'melancholic', 'beautiful'],
    atmosphere: ['soft', 'intimate', 'atmospheric', 'moody'],
    style: 'dreamy-romantic',
  },
};

/**
 * Detect creative mode from query
 */
export function detectCreativeMode(query: string): CreativeMode {
  const queryLower = query.toLowerCase();

  // Check for exact trigger matches
  for (const [trigger, config] of Object.entries(CREATIVE_TRIGGERS)) {
    if (queryLower.includes(trigger)) {
      return {
        enabled: true,
        type: config.mode,
        intensity: config.intensity,
      };
    }
  }

  // Check for cross-domain patterns
  for (const pattern of CROSS_DOMAIN_PATTERNS) {
    if (pattern.pattern.test(query)) {
      return {
        enabled: true,
        type: 'cross_domain',
        intensity: 0.8,
      };
    }
  }

  // Check for cultural references
  for (const reference of Object.keys(CULTURAL_REFERENCES)) {
    if (queryLower.includes(reference)) {
      return {
        enabled: true,
        type: 'cross_domain',
        intensity: 0.75,
      };
    }
  }

  // Default: no creative mode
  return {
    enabled: false,
    type: null,
    intensity: 0,
  };
}

/**
 * Detect cross-domain inspiration from query
 */
export function detectCrossDomainInspiration(
  query: string
): { category: string | null; inspiration: string } | null {
  for (const pattern of CROSS_DOMAIN_PATTERNS) {
    if (pattern.pattern.test(query)) {
      return {
        category: pattern.category,
        inspiration: pattern.inspiration,
      };
    }
  }
  return null;
}

/**
 * Detect cultural reference and map to search attributes
 */
export function detectCulturalReference(
  query: string
): { reference: string; attributes: (typeof CULTURAL_REFERENCES)[string] } | null {
  const queryLower = query.toLowerCase();
  for (const [reference, attributes] of Object.entries(CULTURAL_REFERENCES)) {
    if (queryLower.includes(reference)) {
      return { reference, attributes };
    }
  }
  return null;
}

/**
 * Detect emotional undertone from query
 */
export function detectEmotionalUndertone(query: string): string | null {
  const queryLower = query.toLowerCase();

  const emotionalPatterns: Record<string, string[]> = {
    'seeking relief': ['stressed', 'tired', 'overwhelmed', 'need to relax', 'escape', 'decompress'],
    'seeking novelty': ['bored', 'in a rut', 'same old', 'something new', 'different', 'fresh'],
    'seeking warmth': ['lonely', 'cozy', 'comfort', 'hug', 'homey', 'welcoming'],
    'quiet celebration': ['celebrating but', 'special but quiet', 'milestone', 'anniversary'],
    'seeking adventure': ['adventurous', 'daring', 'bold', 'exciting', 'thrill'],
    'seeking inspiration': ['inspired', 'creative', 'artistic', 'imagination'],
  };

  for (const [undertone, triggers] of Object.entries(emotionalPatterns)) {
    if (triggers.some((t) => queryLower.includes(t))) {
      return undertone;
    }
  }

  return null;
}

/**
 * Generate imaginative query transformations
 */
export function generateImaginativeLeaps(query: string): string[] {
  const leaps: string[] = [];
  const queryLower = query.toLowerCase();

  // Abstract concept translations
  if (queryLower.includes('edible art')) {
    leaps.push('Reinterpreting as visually stunning culinary experiences');
  }
  if (queryLower.includes('architecture') && queryLower.includes('sleep')) {
    leaps.push('Finding hotels with notable architectural significance');
  }
  if (queryLower.includes('feels like a hug')) {
    leaps.push('Translating emotional need to cozy, welcoming atmospheres');
  }

  // Cultural reference interpretations
  const culturalRef = detectCulturalReference(query);
  if (culturalRef) {
    leaps.push(`Interpreting through ${culturalRef.reference}'s aesthetic sensibility`);
  }

  // Cross-domain translations
  const crossDomain = detectCrossDomainInspiration(query);
  if (crossDomain) {
    leaps.push(`Blending ${crossDomain.inspiration} vibes with destination category`);
  }

  // Mood alchemy
  const mood = detectEmotionalUndertone(query);
  if (mood) {
    leaps.push(`Transforming emotional state into discovery opportunity`);
  }

  return leaps;
}

/**
 * Generate contrarian suggestions based on user profile
 */
export function generateContrarianFilters(profile: UserTasteProfile): {
  suggestedCategories: string[];
  suggestedStyles: string[];
  priceDirection: 'up' | 'down' | 'same';
  atmosphereDirection: 'quieter' | 'livelier' | 'same';
  reasoning: string;
} {
  const result = {
    suggestedCategories: [] as string[],
    suggestedStyles: [] as string[],
    priceDirection: 'same' as 'up' | 'down' | 'same',
    atmosphereDirection: 'same' as 'quieter' | 'livelier' | 'same',
    reasoning: '',
  };

  const allCategories = [
    'Restaurant',
    'Hotel',
    'Cafe',
    'Bar',
    'Shop',
    'Museum',
    'Gallery',
    'Park',
    'Temple',
    'Market',
  ];
  const allStyles = [
    'modern',
    'traditional',
    'minimalist',
    'eclectic',
    'industrial',
    'vintage',
    'rustic',
    'futuristic',
  ];

  // Suggest unexplored categories
  if (profile.preferredCategories?.length) {
    result.suggestedCategories = allCategories.filter(
      (c) => !profile.preferredCategories?.includes(c)
    );
  }

  // Suggest opposite styles
  if (profile.preferredStyles?.includes('modern')) {
    result.suggestedStyles.push('traditional', 'vintage', 'rustic');
  } else if (profile.preferredStyles?.includes('traditional')) {
    result.suggestedStyles.push('modern', 'futuristic', 'industrial');
  }

  // Suggest opposite price direction
  if (profile.pricePreference === 'luxury') {
    result.priceDirection = 'down';
    result.reasoning += 'Try budget-friendly local spots for authentic experiences. ';
  } else if (profile.pricePreference === 'budget') {
    result.priceDirection = 'up';
    result.reasoning += 'Consider a splurge-worthy experience for a change. ';
  }

  // Suggest opposite atmosphere
  if (profile.atmospherePreference === 'quiet') {
    result.atmosphereDirection = 'livelier';
    result.reasoning += 'Step into something more energetic and social. ';
  } else if (profile.atmospherePreference === 'lively') {
    result.atmosphereDirection = 'quieter';
    result.reasoning += 'Try a peaceful, contemplative space for a change. ';
  }

  return result;
}

/**
 * Generate surprise-worthy query modifications
 */
export function generateSerendipitousModifiers(): string[] {
  return [
    'hidden gem',
    'local secret',
    'off the beaten path',
    'unexpected find',
    'undiscovered',
    'cult following',
    'word of mouth only',
    'neighborhood favorite',
    'one of a kind',
    'unusual concept',
  ];
}

/**
 * Create enhanced search context with creative elements
 */
export function enhanceSearchWithCreativity(context: CreativeSearchContext): {
  enhancedQuery: string;
  additionalTags: string[];
  atmosphereModifiers: string[];
  excludeTags: string[];
  boostFactors: Record<string, number>;
  explanation: string;
} {
  const result = {
    enhancedQuery: context.query,
    additionalTags: [] as string[],
    atmosphereModifiers: [] as string[],
    excludeTags: [] as string[],
    boostFactors: {} as Record<string, number>,
    explanation: '',
  };

  if (!context.creativeMode.enabled) {
    return result;
  }

  switch (context.creativeMode.type) {
    case 'serendipity':
      result.additionalTags.push('hidden-gem', 'local-favorite', 'unique', 'unusual');
      result.excludeTags.push('chain', 'tourist-trap', 'crowded');
      result.boostFactors['undiscovered'] = 0.3;
      result.boostFactors['unique_concept'] = 0.25;
      result.explanation = 'Looking for unexpected quality discoveries';
      break;

    case 'contrarian':
      if (context.userProfile) {
        const contrarian = generateContrarianFilters(context.userProfile);
        result.explanation = contrarian.reasoning;
        if (contrarian.priceDirection === 'down') {
          result.additionalTags.push('budget-friendly', 'value', 'casual');
        } else if (contrarian.priceDirection === 'up') {
          result.additionalTags.push('splurge-worthy', 'special-occasion');
        }
      }
      break;

    case 'cross_domain':
      const crossDomain = detectCrossDomainInspiration(context.query);
      if (crossDomain) {
        const inspirationMap: Record<string, string[]> = {
          gallery: ['minimalist', 'artistic', 'curated', 'exhibition-like'],
          bookstore: ['literary', 'cozy', 'intellectual', 'eclectic'],
          home: ['homey', 'intimate', 'comfortable', 'welcoming'],
          museum: ['curated', 'contemplative', 'historic', 'collection'],
          garden: ['natural', 'peaceful', 'green', 'botanical'],
          theater: ['dramatic', 'theatrical', 'performance', 'atmospheric'],
        };
        result.additionalTags.push(...(inspirationMap[crossDomain.inspiration] || []));
        result.explanation = `Finding places with ${crossDomain.inspiration} vibes`;
      }
      break;

    case 'story_based':
      result.additionalTags.push('historic', 'legendary', 'storied', 'heritage', 'iconic');
      result.boostFactors['has_history'] = 0.25;
      result.boostFactors['rich_description'] = 0.2;
      result.explanation = 'Seeking places with fascinating backstories';
      break;

    case 'mood_alchemy':
      const mood = detectEmotionalUndertone(context.query);
      if (mood) {
        const moodToAtmosphere: Record<string, string[]> = {
          'seeking relief': ['serene', 'calming', 'zen', 'peaceful', 'quiet'],
          'seeking novelty': ['experimental', 'innovative', 'avant-garde', 'new'],
          'seeking warmth': ['cozy', 'homey', 'welcoming', 'intimate'],
          'quiet celebration': ['elegant', 'refined', 'special-occasion'],
          'seeking adventure': ['unusual', 'exotic', 'adventurous', 'unique'],
        };
        result.atmosphereModifiers.push(...(moodToAtmosphere[mood] || []));
        result.explanation = `Transforming your mood into the perfect discovery`;
      }
      break;

    case 'future_trends':
      result.additionalTags.push('emerging', 'rising-star', 'new-opening', 'trending');
      result.boostFactors['recently_opened'] = 0.3;
      result.boostFactors['high_rating_low_saves'] = 0.25;
      result.explanation = 'Finding the next big thing before everyone else';
      break;
  }

  return result;
}

/**
 * Format creative mode explanation for user
 */
export function formatCreativeExplanation(mode: CreativeMode, query: string): string {
  if (!mode.enabled) return '';

  const explanations: Record<NonNullable<CreativeMode['type']>, string> = {
    serendipity: "I'm looking beyond the obvious to find you something unexpected but wonderful.",
    contrarian:
      "I'm deliberately suggesting places outside your usual preferences—sometimes the best discoveries come from stepping outside our comfort zones.",
    cross_domain:
      "I'm finding places that blur the lines between categories, matching the unique vibe you're looking for.",
    story_based:
      "I'm prioritizing places with fascinating histories and stories—the kind of spots that give you something to talk about.",
    mood_alchemy:
      "I'm translating your current mood into the perfect type of place—sometimes we need an experience to match how we feel.",
    future_trends:
      "I'm searching for rising stars and new discoveries—places that will be buzzing soon but aren't crowded yet.",
  };

  return mode.type ? explanations[mode.type] : '';
}
