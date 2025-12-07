/**
 * Creative Intelligence Service
 * Enables "outside the box" thinking for travel discovery
 *
 * Handles:
 * - Mood/emotion-based queries ("I need to escape", "feeling adventurous")
 * - Serendipity mode ("surprise me", "something unexpected")
 * - Experiential narratives ("a perfect Sunday morning", "celebrating love")
 * - Cross-domain connections (architecture → dining, art → hotels)
 * - Hypothetical scenarios ("what if I only had 3 hours")
 */

import { generateJSON } from '@/lib/llm';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Creative intent types that go beyond traditional search
export type CreativeIntentType =
  | 'mood_based'           // "I need to escape", "feeling inspired"
  | 'serendipity'          // "surprise me", "something I'd never think of"
  | 'experiential'         // "a perfect Sunday morning", "celebrating an anniversary"
  | 'hypothetical'         // "what if I only had 3 hours near..."
  | 'cross_domain'         // Architecture lover seeking restaurants
  | 'contrast_seeking'     // "opposite of my usual", "break from routine"
  | 'time_capsule'         // "1920s Paris vibes", "feels like old Tokyo"
  | 'sensory'              // "quiet escape", "vibrant energy"
  | 'narrative'            // Following a story or journey
  | 'standard';            // Regular structured query

export interface CreativeIntent {
  type: CreativeIntentType;
  confidence: number;

  // Mood/emotional signals
  mood?: {
    primary: string;        // "romantic", "adventurous", "contemplative"
    intensity: 'subtle' | 'moderate' | 'intense';
    seeking: string[];      // What the mood is seeking: ["intimacy", "surprise", "calm"]
  };

  // Serendipity parameters
  serendipity?: {
    adventurousness: number;  // 0-1: how far outside comfort zone
    excludeObvious: boolean;  // Skip the "usual suspects"
    crossCategory: boolean;   // Allow suggestions from unexpected categories
  };

  // Experiential narrative
  experience?: {
    scenario: string;         // "perfect Sunday morning", "last night in the city"
    timeContext?: string;     // "morning light", "golden hour", "late night"
    companions?: string;      // "solo", "romantic", "friends", "family"
    narrative: string;        // Generated story/vision
  };

  // Cross-domain connections
  crossDomain?: {
    sourceInterest: string;   // "architecture", "art", "fashion", "music"
    targetCategory?: string;  // What category to map to
    connectionLogic: string;  // Why this connection makes sense
  };

  // Hypothetical scenario
  hypothetical?: {
    constraint: string;       // "only 3 hours", "raining", "budget-conscious"
    scenario: string;         // Full scenario description
    priorities: string[];     // What to optimize for
  };

  // Time/era vibes
  timeCapsule?: {
    era: string;              // "1920s", "mid-century modern", "belle époque"
    location?: string;        // "Paris", "Tokyo", "New York"
    essence: string[];        // Key aesthetic/experiential elements
  };

  // Sensory preferences
  sensory?: {
    seeking: string[];        // "quiet", "vibrant", "intimate", "expansive"
    avoiding: string[];       // "crowded", "loud", "touristy"
  };

  // Standard query elements (always extracted)
  structured?: {
    city?: string;
    category?: string;
    modifiers: string[];
  };

  // Creative suggestions to explore
  explorationVectors: string[];  // Unexpected directions to explore

  // Human-readable interpretation
  interpretation: string;
}

export interface CreativeRecommendation {
  destination_id: string;
  slug: string;
  name: string;
  city: string;
  category: string;

  // Why this is an "outside the box" suggestion
  creativeReason: string;

  // The unexpected connection or insight
  unexpectedAngle: string;

  // How well it matches the creative intent
  creativeScore: number;

  // Story/narrative around this suggestion
  narrative?: string;

  // What makes this suggestion surprising/delightful
  delightFactor?: string;
}

// Mood keyword patterns for detection
const MOOD_PATTERNS: Record<string, { mood: string; seeking: string[]; intensity: 'subtle' | 'moderate' | 'intense' }> = {
  'escape': { mood: 'escapist', seeking: ['peace', 'distance', 'reset'], intensity: 'intense' },
  'need to escape': { mood: 'escapist', seeking: ['peace', 'distance', 'reset'], intensity: 'intense' },
  'get away': { mood: 'escapist', seeking: ['peace', 'distance', 'reset'], intensity: 'moderate' },
  'inspiring': { mood: 'inspired', seeking: ['beauty', 'creativity', 'wonder'], intensity: 'moderate' },
  'inspired': { mood: 'inspired', seeking: ['beauty', 'creativity', 'wonder'], intensity: 'moderate' },
  'romantic': { mood: 'romantic', seeking: ['intimacy', 'beauty', 'connection'], intensity: 'moderate' },
  'celebrate': { mood: 'celebratory', seeking: ['joy', 'special', 'memorable'], intensity: 'intense' },
  'celebrating': { mood: 'celebratory', seeking: ['joy', 'special', 'memorable'], intensity: 'intense' },
  'adventurous': { mood: 'adventurous', seeking: ['novelty', 'excitement', 'discovery'], intensity: 'moderate' },
  'feeling adventurous': { mood: 'adventurous', seeking: ['novelty', 'excitement', 'discovery'], intensity: 'intense' },
  'contemplative': { mood: 'contemplative', seeking: ['solitude', 'beauty', 'meaning'], intensity: 'subtle' },
  'think': { mood: 'contemplative', seeking: ['solitude', 'quiet', 'clarity'], intensity: 'subtle' },
  'unwind': { mood: 'relaxed', seeking: ['calm', 'comfort', 'ease'], intensity: 'moderate' },
  'relax': { mood: 'relaxed', seeking: ['calm', 'comfort', 'ease'], intensity: 'moderate' },
  'energize': { mood: 'energetic', seeking: ['vibrancy', 'activity', 'stimulation'], intensity: 'moderate' },
  'discover': { mood: 'curious', seeking: ['novelty', 'learning', 'exploration'], intensity: 'moderate' },
  'wander': { mood: 'exploratory', seeking: ['serendipity', 'discovery', 'freedom'], intensity: 'subtle' },
  'lose myself': { mood: 'immersive', seeking: ['absorption', 'escape', 'flow'], intensity: 'intense' },
  'treat myself': { mood: 'indulgent', seeking: ['luxury', 'pleasure', 'reward'], intensity: 'moderate' },
  'impress': { mood: 'ambitious', seeking: ['quality', 'status', 'excellence'], intensity: 'moderate' },
};

// Serendipity trigger phrases
const SERENDIPITY_TRIGGERS = [
  'surprise me',
  'something unexpected',
  'something different',
  "wouldn't think of",
  "wouldn't expect",
  'off the beaten path',
  'hidden gem',
  'local secret',
  'unconventional',
  'outside the box',
  'random',
  'adventurous pick',
  'wildcard',
  "dealer's choice",
  'what would you suggest',
  'unexpected',
];

// Cross-domain connection patterns
const CROSS_DOMAIN_CONNECTIONS: Record<string, { relatedCategories: string[]; connectionLogic: string }> = {
  'architecture': {
    relatedCategories: ['Restaurant', 'Hotel', 'Cafe', 'Bar'],
    connectionLogic: 'Spaces designed by notable architects or with exceptional architectural merit'
  },
  'design': {
    relatedCategories: ['Restaurant', 'Hotel', 'Cafe', 'Shop'],
    connectionLogic: 'Venues known for interior design, product curation, or design philosophy'
  },
  'art': {
    relatedCategories: ['Restaurant', 'Hotel', 'Bar', 'Cafe'],
    connectionLogic: 'Spaces with significant art collections, gallery-like atmospheres, or artistic communities'
  },
  'music': {
    relatedCategories: ['Bar', 'Restaurant', 'Hotel'],
    connectionLogic: 'Venues with notable sound design, music history, or acoustic excellence'
  },
  'fashion': {
    relatedCategories: ['Restaurant', 'Hotel', 'Bar', 'Cafe'],
    connectionLogic: 'Stylish venues frequented by fashion industry or with fashion-forward aesthetics'
  },
  'literature': {
    relatedCategories: ['Cafe', 'Hotel', 'Bar'],
    connectionLogic: 'Historic literary haunts, bookish atmospheres, or spaces for contemplation'
  },
  'film': {
    relatedCategories: ['Restaurant', 'Hotel', 'Bar'],
    connectionLogic: 'Cinematic locations, venues with film history, or dramatic atmospheres'
  },
  'history': {
    relatedCategories: ['Restaurant', 'Hotel', 'Bar', 'Cafe'],
    connectionLogic: 'Historic establishments preserving heritage or telling stories of the past'
  },
};

export class CreativeIntelligenceService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('CreativeIntelligenceService: Supabase client not available');
    }
  }

  /**
   * Analyze a query for creative/outside-the-box intent
   */
  async analyzeCreativeIntent(
    query: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    userId?: string
  ): Promise<CreativeIntent> {
    const lowerQuery = query.toLowerCase();

    // Detect creative intent type
    const intentType = this.detectCreativeIntentType(lowerQuery);

    // Build creative intent based on type
    const creativeIntent: CreativeIntent = {
      type: intentType,
      confidence: 0.7,
      explorationVectors: [],
      interpretation: '',
    };

    // Extract structured elements (city, category, modifiers) regardless of creative type
    creativeIntent.structured = await this.extractStructuredElements(query);

    // Build type-specific intent data
    switch (intentType) {
      case 'mood_based':
        creativeIntent.mood = this.extractMood(lowerQuery);
        creativeIntent.interpretation = `Seeking places that evoke a ${creativeIntent.mood?.primary} feeling`;
        creativeIntent.explorationVectors = this.generateMoodVectors(creativeIntent.mood);
        break;

      case 'serendipity':
        creativeIntent.serendipity = this.extractSerendipityParams(lowerQuery);
        creativeIntent.interpretation = 'Looking for unexpected discoveries and pleasant surprises';
        creativeIntent.explorationVectors = ['hidden gems', 'unconventional picks', 'local favorites', 'unexpected categories'];
        break;

      case 'experiential':
        creativeIntent.experience = await this.extractExperience(query, conversationHistory);
        creativeIntent.interpretation = `Crafting: ${creativeIntent.experience?.scenario}`;
        creativeIntent.explorationVectors = this.generateExperienceVectors(creativeIntent.experience);
        break;

      case 'cross_domain':
        creativeIntent.crossDomain = this.extractCrossDomain(lowerQuery);
        creativeIntent.interpretation = `Finding ${creativeIntent.crossDomain?.targetCategory || 'places'} through a ${creativeIntent.crossDomain?.sourceInterest} lens`;
        creativeIntent.explorationVectors = [`${creativeIntent.crossDomain?.sourceInterest}-influenced venues`];
        break;

      case 'hypothetical':
        creativeIntent.hypothetical = await this.extractHypothetical(query);
        creativeIntent.interpretation = `Optimizing for: ${creativeIntent.hypothetical?.constraint}`;
        creativeIntent.explorationVectors = creativeIntent.hypothetical?.priorities || [];
        break;

      case 'time_capsule':
        creativeIntent.timeCapsule = this.extractTimeCapsule(lowerQuery);
        creativeIntent.interpretation = `Seeking ${creativeIntent.timeCapsule?.era} atmosphere`;
        creativeIntent.explorationVectors = creativeIntent.timeCapsule?.essence || [];
        break;

      case 'sensory':
        creativeIntent.sensory = this.extractSensory(lowerQuery);
        creativeIntent.interpretation = `Looking for ${creativeIntent.sensory?.seeking.join(', ')} experiences`;
        creativeIntent.explorationVectors = creativeIntent.sensory?.seeking || [];
        break;

      case 'contrast_seeking':
        creativeIntent.interpretation = 'Seeking something different from the usual';
        creativeIntent.explorationVectors = ['unexpected choices', 'new categories', 'different neighborhoods'];
        break;

      default:
        creativeIntent.interpretation = 'Standard discovery query';
    }

    // Use AI for richer interpretation if available
    if (intentType !== 'standard') {
      try {
        const enrichedIntent = await this.enrichWithAI(query, creativeIntent, conversationHistory);
        return enrichedIntent;
      } catch (error) {
        console.error('Error enriching creative intent with AI:', error);
      }
    }

    return creativeIntent;
  }

  /**
   * Detect the primary creative intent type
   */
  private detectCreativeIntentType(query: string): CreativeIntentType {
    // Check for serendipity triggers first (explicit requests for surprise)
    for (const trigger of SERENDIPITY_TRIGGERS) {
      if (query.includes(trigger)) {
        return 'serendipity';
      }
    }

    // Check for mood-based patterns
    for (const pattern of Object.keys(MOOD_PATTERNS)) {
      if (query.includes(pattern)) {
        return 'mood_based';
      }
    }

    // Check for experiential narratives
    const experientialPatterns = [
      'perfect', 'ideal', 'dream', 'last night', 'first date',
      'anniversary', 'birthday', 'special occasion', 'celebration',
      'sunday morning', 'lazy afternoon', 'night out', 'day trip',
    ];
    for (const pattern of experientialPatterns) {
      if (query.includes(pattern)) {
        return 'experiential';
      }
    }

    // Check for hypothetical scenarios
    const hypotheticalPatterns = ['what if', 'if i only had', 'with only', 'limited time', 'quick', 'in a hurry'];
    for (const pattern of hypotheticalPatterns) {
      if (query.includes(pattern)) {
        return 'hypothetical';
      }
    }

    // Check for cross-domain interests
    for (const domain of Object.keys(CROSS_DOMAIN_CONNECTIONS)) {
      if (query.includes(domain) && (query.includes('lover') || query.includes('enthusiast') || query.includes('fan') || query.includes('into'))) {
        return 'cross_domain';
      }
    }

    // Check for time capsule/era vibes
    const eraPatterns = ['1920s', '1930s', '1950s', '1960s', 'vintage', 'retro', 'old school', 'classic', 'belle époque', 'art deco', 'mid-century'];
    for (const pattern of eraPatterns) {
      if (query.includes(pattern)) {
        return 'time_capsule';
      }
    }

    // Check for sensory preferences
    const sensoryPatterns = ['quiet', 'peaceful', 'vibrant', 'lively', 'intimate', 'cozy', 'airy', 'spacious'];
    let sensoryCount = 0;
    for (const pattern of sensoryPatterns) {
      if (query.includes(pattern)) sensoryCount++;
    }
    if (sensoryCount >= 2) {
      return 'sensory';
    }

    // Check for contrast seeking
    const contrastPatterns = ['different', 'change', 'opposite', 'break from', 'not the usual', 'something new'];
    for (const pattern of contrastPatterns) {
      if (query.includes(pattern)) {
        return 'contrast_seeking';
      }
    }

    return 'standard';
  }

  /**
   * Extract mood information from query
   */
  private extractMood(query: string): CreativeIntent['mood'] {
    for (const [pattern, moodData] of Object.entries(MOOD_PATTERNS)) {
      if (query.includes(pattern)) {
        return {
          primary: moodData.mood,
          intensity: moodData.intensity,
          seeking: moodData.seeking,
        };
      }
    }

    return {
      primary: 'curious',
      intensity: 'moderate',
      seeking: ['discovery', 'interest'],
    };
  }

  /**
   * Generate exploration vectors based on mood
   */
  private generateMoodVectors(mood?: CreativeIntent['mood']): string[] {
    if (!mood) return [];

    const moodVectorMap: Record<string, string[]> = {
      'escapist': ['secluded spots', 'nature-adjacent', 'transport to another world'],
      'romantic': ['candlelit venues', 'intimate spaces', 'beautiful settings'],
      'inspired': ['architecturally notable', 'artistic atmosphere', 'creative energy'],
      'celebratory': ['special occasions', 'memorable experiences', 'champagne-worthy'],
      'adventurous': ['off-menu experiences', 'local secrets', 'unexpected finds'],
      'contemplative': ['quiet corners', 'beautiful views', 'spaces for thinking'],
      'relaxed': ['comfortable seating', 'no-rush atmosphere', 'calming environments'],
      'curious': ['unique concepts', 'interesting stories', 'conversation starters'],
    };

    return moodVectorMap[mood.primary] || ['interesting places'];
  }

  /**
   * Extract serendipity parameters
   */
  private extractSerendipityParams(query: string): CreativeIntent['serendipity'] {
    const highAdventure = query.includes('wildcard') || query.includes('random') || query.includes("wouldn't think");
    const excludeObvious = query.includes('hidden') || query.includes('secret') || query.includes('off the beaten');

    return {
      adventurousness: highAdventure ? 0.9 : 0.6,
      excludeObvious: excludeObvious,
      crossCategory: true,
    };
  }

  /**
   * Extract experiential narrative using AI
   */
  private async extractExperience(
    query: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<CreativeIntent['experience']> {
    const conversationContext = conversationHistory.length > 0
      ? conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';

    try {
      const system = `You are analyzing a travel query for its experiential narrative. Extract:
1. scenario: The experience being described (e.g., "perfect Sunday morning", "romantic evening")
2. timeContext: When this experience happens (morning, afternoon, evening, night, golden hour, etc.)
3. companions: Who is involved (solo, couple, friends, family, business)
4. narrative: A brief evocative description of what this experience looks and feels like

Return JSON only: {"scenario": "", "timeContext": "", "companions": "", "narrative": ""}`;

      const result = await generateJSON(system, `Query: "${query}"\n${conversationContext ? `Context: ${conversationContext}` : ''}`);

      if (result) {
        return {
          scenario: result.scenario || query,
          timeContext: result.timeContext,
          companions: result.companions,
          narrative: result.narrative || '',
        };
      }
    } catch (error) {
      console.error('Error extracting experience:', error);
    }

    return {
      scenario: query,
      narrative: 'A memorable travel moment',
    };
  }

  /**
   * Generate experience-based exploration vectors
   */
  private generateExperienceVectors(experience?: CreativeIntent['experience']): string[] {
    if (!experience) return [];

    const vectors: string[] = [];

    if (experience.timeContext) {
      const timeVectors: Record<string, string[]> = {
        'morning': ['great coffee', 'natural light', 'peaceful start'],
        'afternoon': ['lingering lunch', 'comfortable seating', 'relaxed pace'],
        'evening': ['atmospheric lighting', 'cocktails', 'transition space'],
        'night': ['late hours', 'nightlife energy', 'memorable finale'],
        'golden hour': ['beautiful light', 'outdoor seating', 'scenic views'],
      };
      vectors.push(...(timeVectors[experience.timeContext] || []));
    }

    if (experience.companions) {
      const companionVectors: Record<string, string[]> = {
        'solo': ['counter seating', 'good for reading', 'people watching'],
        'couple': ['intimate tables', 'romantic atmosphere', 'shareable dishes'],
        'friends': ['group-friendly', 'social atmosphere', 'good for conversation'],
        'family': ['welcoming to all ages', 'comfortable', 'varied menu'],
      };
      vectors.push(...(companionVectors[experience.companions] || []));
    }

    return vectors;
  }

  /**
   * Extract cross-domain connection details
   */
  private extractCrossDomain(query: string): CreativeIntent['crossDomain'] {
    for (const [domain, info] of Object.entries(CROSS_DOMAIN_CONNECTIONS)) {
      if (query.includes(domain)) {
        // Try to detect target category from query
        let targetCategory: string | undefined;
        const categories = ['restaurant', 'hotel', 'bar', 'cafe', 'shop'];
        for (const cat of categories) {
          if (query.includes(cat)) {
            targetCategory = cat.charAt(0).toUpperCase() + cat.slice(1);
            break;
          }
        }

        return {
          sourceInterest: domain,
          targetCategory,
          connectionLogic: info.connectionLogic,
        };
      }
    }

    return {
      sourceInterest: 'design',
      connectionLogic: 'Places with notable design or aesthetic merit',
    };
  }

  /**
   * Extract hypothetical scenario
   */
  private async extractHypothetical(query: string): Promise<CreativeIntent['hypothetical']> {
    try {
      const system = `Analyze this hypothetical travel scenario query and extract:
1. constraint: The main limitation (time, budget, weather, etc.)
2. scenario: Full description of the scenario
3. priorities: What to optimize for given the constraint (array of 3-5 priorities)

Return JSON only: {"constraint": "", "scenario": "", "priorities": []}`;

      const result = await generateJSON(system, `Query: "${query}"`);

      if (result) {
        return {
          constraint: result.constraint || 'limited time',
          scenario: result.scenario || query,
          priorities: result.priorities || ['efficiency', 'quality', 'accessibility'],
        };
      }
    } catch (error) {
      console.error('Error extracting hypothetical:', error);
    }

    return {
      constraint: 'limited time',
      scenario: query,
      priorities: ['efficiency', 'memorable', 'walkable'],
    };
  }

  /**
   * Extract time capsule/era vibes
   */
  private extractTimeCapsule(query: string): CreativeIntent['timeCapsule'] {
    const eraEssence: Record<string, string[]> = {
      '1920s': ['jazz age glamour', 'art deco', 'speakeasy vibes', 'golden era cocktails'],
      '1930s': ['old hollywood', 'elegant simplicity', 'timeless classics'],
      '1950s': ['mid-century modern', 'optimistic design', 'americana'],
      '1960s': ['mod style', 'space age', 'bold colors', 'revolutionary spirit'],
      'vintage': ['timeless', 'patina', 'character', 'authenticity'],
      'retro': ['nostalgic', 'playful', 'throwback'],
      'art deco': ['geometric', 'glamorous', 'ornate', 'golden age'],
      'mid-century': ['clean lines', 'organic forms', 'timeless design'],
      'belle époque': ['ornate beauty', 'european elegance', 'gilded age'],
    };

    for (const [era, essence] of Object.entries(eraEssence)) {
      if (query.includes(era)) {
        return {
          era,
          essence,
        };
      }
    }

    return {
      era: 'classic',
      essence: ['timeless', 'character', 'heritage'],
    };
  }

  /**
   * Extract sensory preferences
   */
  private extractSensory(query: string): CreativeIntent['sensory'] {
    const seekingPatterns: Record<string, string> = {
      'quiet': 'quiet',
      'peaceful': 'peaceful',
      'calm': 'calm',
      'serene': 'serene',
      'vibrant': 'vibrant',
      'lively': 'lively',
      'buzzy': 'energetic',
      'intimate': 'intimate',
      'cozy': 'cozy',
      'airy': 'airy',
      'spacious': 'spacious',
      'bright': 'bright',
      'moody': 'moody',
      'dark': 'dimly lit',
    };

    const avoidingPatterns: Record<string, string> = {
      'not crowded': 'crowded',
      'not touristy': 'touristy',
      'not loud': 'loud',
      'no tourists': 'touristy',
      'avoid crowds': 'crowded',
    };

    const seeking: string[] = [];
    const avoiding: string[] = [];

    for (const [pattern, value] of Object.entries(seekingPatterns)) {
      if (query.includes(pattern)) {
        seeking.push(value);
      }
    }

    for (const [pattern, value] of Object.entries(avoidingPatterns)) {
      if (query.includes(pattern)) {
        avoiding.push(value);
      }
    }

    return {
      seeking: seeking.length > 0 ? seeking : ['pleasant'],
      avoiding,
    };
  }

  /**
   * Extract structured elements (city, category, modifiers)
   */
  private async extractStructuredElements(query: string): Promise<CreativeIntent['structured']> {
    const lowerQuery = query.toLowerCase();

    const cities = [
      'tokyo', 'kyoto', 'osaka', 'paris', 'london', 'new york', 'rome',
      'barcelona', 'berlin', 'amsterdam', 'sydney', 'dubai', 'copenhagen',
      'lisbon', 'stockholm', 'vienna', 'prague', 'istanbul', 'seoul',
      'hong kong', 'singapore', 'bangkok', 'mexico city', 'buenos aires',
      'los angeles', 'san francisco', 'chicago', 'miami', 'portland',
      'milan', 'florence', 'venice', 'naples', 'munich', 'zurich',
    ];

    const categories = ['restaurant', 'hotel', 'cafe', 'bar', 'museum', 'shop', 'park'];

    let city: string | undefined;
    let category: string | undefined;

    for (const c of cities) {
      if (lowerQuery.includes(c)) {
        city = c;
        break;
      }
    }

    for (const cat of categories) {
      if (lowerQuery.includes(cat)) {
        category = cat;
        break;
      }
    }

    return {
      city,
      category,
      modifiers: [],
    };
  }

  /**
   * Enrich creative intent with AI interpretation
   */
  private async enrichWithAI(
    query: string,
    baseIntent: CreativeIntent,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<CreativeIntent> {
    try {
      const system = `You are a creative travel intelligence system. Given this query and detected intent,
provide richer interpretation and exploration vectors. Think OUTSIDE THE BOX.

Current intent type: ${baseIntent.type}
Current interpretation: ${baseIntent.interpretation}

Generate:
1. A richer, more evocative interpretation of what the user is truly seeking
2. 3-5 unexpected exploration vectors - directions that might delight the user but they haven't explicitly asked for
3. A "delight factor" - what unexpected element could make this search result truly memorable

Return JSON: {
  "richInterpretation": "...",
  "explorationVectors": ["...", "..."],
  "delightFactor": "..."
}`;

      const result = await generateJSON(system, `Query: "${query}"`);

      if (result) {
        baseIntent.interpretation = result.richInterpretation || baseIntent.interpretation;
        baseIntent.explorationVectors = [
          ...baseIntent.explorationVectors,
          ...(result.explorationVectors || []),
        ];
      }

      return baseIntent;
    } catch (error) {
      console.error('Error enriching with AI:', error);
      return baseIntent;
    }
  }

  /**
   * Get creative recommendations based on intent
   * This is where the "outside the box" magic happens
   */
  async getCreativeRecommendations(
    intent: CreativeIntent,
    limit: number = 10,
    userId?: string
  ): Promise<CreativeRecommendation[]> {
    if (!this.supabase) return [];

    try {
      // Build query based on intent type
      let query = this.supabase
        .from('destinations')
        .select('id, slug, name, city, country, category, description, micro_description, tags, style_tags, ambience_tags, experience_tags, architect, michelin_stars, rating, crown');

      // Apply city filter if specified
      if (intent.structured?.city) {
        query = query.ilike('city', `%${intent.structured.city}%`);
      }

      // For serendipity mode, we might skip category filter to allow cross-category discovery
      if (intent.type !== 'serendipity' && intent.structured?.category) {
        query = query.ilike('category', `%${intent.structured.category}%`);
      }

      // Limit base results
      const { data: destinations, error } = await query.limit(200);

      if (error || !destinations) {
        console.error('Error fetching destinations for creative recs:', error);
        return [];
      }

      // Score and filter based on creative intent
      const scored = await this.scoreCreatively(destinations, intent);

      // Generate creative reasons for top picks
      const topPicks = scored.slice(0, limit);

      return this.generateCreativeReasons(topPicks, intent);
    } catch (error) {
      console.error('Error getting creative recommendations:', error);
      return [];
    }
  }

  /**
   * Score destinations based on creative intent
   */
  private async scoreCreatively(
    destinations: any[],
    intent: CreativeIntent
  ): Promise<Array<{ destination: any; score: number; matchReasons: string[] }>> {
    const scored: Array<{ destination: any; score: number; matchReasons: string[] }> = [];

    for (const dest of destinations) {
      let score = 0;
      const matchReasons: string[] = [];

      const allTags = [
        ...(dest.tags || []),
        ...(dest.style_tags || []),
        ...(dest.ambience_tags || []),
        ...(dest.experience_tags || []),
      ].map(t => t.toLowerCase());

      const description = (dest.description || '').toLowerCase();
      const microDesc = (dest.micro_description || '').toLowerCase();

      // Score based on intent type
      switch (intent.type) {
        case 'mood_based':
          if (intent.mood) {
            // Check if tags/description match mood
            for (const seeking of intent.mood.seeking) {
              if (allTags.some(t => t.includes(seeking)) || description.includes(seeking)) {
                score += 10;
                matchReasons.push(`Matches "${seeking}" mood`);
              }
            }
            // Mood-specific boosts
            if (intent.mood.primary === 'romantic' && allTags.includes('romantic')) {
              score += 20;
            }
            if (intent.mood.primary === 'inspired' && dest.architect) {
              score += 15;
              matchReasons.push('Architecturally notable');
            }
          }
          break;

        case 'serendipity':
          // For serendipity, boost hidden gems and unique places
          if (allTags.includes('hidden gem') || allTags.includes('local favorite')) {
            score += 20;
            matchReasons.push('Hidden gem');
          }
          if (dest.crown) {
            score += 10;
            matchReasons.push('Editor\'s pick');
          }
          // Slightly randomize to create serendipity
          score += Math.random() * 10;
          break;

        case 'experiential':
          if (intent.experience) {
            // Match time context
            if (intent.experience.timeContext === 'morning' &&
                (allTags.includes('breakfast') || allTags.includes('brunch') || allTags.includes('coffee'))) {
              score += 15;
              matchReasons.push('Perfect for mornings');
            }
            if (intent.experience.timeContext === 'evening' &&
                (allTags.includes('dinner') || allTags.includes('cocktails') || allTags.includes('romantic'))) {
              score += 15;
              matchReasons.push('Great for evenings');
            }
            // Match companions
            if (intent.experience.companions === 'couple' && allTags.includes('romantic')) {
              score += 20;
              matchReasons.push('Romantic setting');
            }
          }
          break;

        case 'cross_domain':
          if (intent.crossDomain) {
            // Boost places with notable design/architecture/art
            if (intent.crossDomain.sourceInterest === 'architecture' && dest.architect) {
              score += 25;
              matchReasons.push(`Designed by ${dest.architect}`);
            }
            if (allTags.some(t => t.includes(intent.crossDomain!.sourceInterest))) {
              score += 15;
              matchReasons.push(`Notable ${intent.crossDomain.sourceInterest}`);
            }
          }
          break;

        case 'time_capsule':
          if (intent.timeCapsule) {
            // Match era vibes
            for (const essence of intent.timeCapsule.essence) {
              if (allTags.some(t => t.includes(essence.toLowerCase())) ||
                  description.includes(essence.toLowerCase())) {
                score += 10;
                matchReasons.push(`${essence} vibes`);
              }
            }
          }
          break;

        case 'sensory':
          if (intent.sensory) {
            // Match seeking preferences
            for (const seek of intent.sensory.seeking) {
              if (allTags.includes(seek) || description.includes(seek)) {
                score += 12;
                matchReasons.push(`${seek} atmosphere`);
              }
            }
            // Penalize avoiding preferences
            for (const avoid of intent.sensory.avoiding) {
              if (allTags.includes(avoid) || description.includes(avoid)) {
                score -= 20;
              }
            }
          }
          break;
      }

      // Universal quality signals
      if (dest.michelin_stars && dest.michelin_stars > 0) {
        score += dest.michelin_stars * 5;
      }
      if (dest.rating && dest.rating >= 4.5) {
        score += 5;
      }

      // Exploration vector matching
      for (const vector of intent.explorationVectors) {
        if (allTags.some(t => t.includes(vector.toLowerCase())) ||
            description.includes(vector.toLowerCase()) ||
            microDesc.includes(vector.toLowerCase())) {
          score += 8;
          matchReasons.push(`Matches "${vector}"`);
        }
      }

      if (score > 0 || intent.type === 'serendipity') {
        scored.push({ destination: dest, score, matchReasons });
      }
    }

    // Sort by score
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Generate creative reasons for recommendations
   */
  private async generateCreativeReasons(
    scored: Array<{ destination: any; score: number; matchReasons: string[] }>,
    intent: CreativeIntent
  ): Promise<CreativeRecommendation[]> {
    const recommendations: CreativeRecommendation[] = [];

    for (const item of scored) {
      const dest = item.destination;

      // Generate creative reason based on intent type
      let creativeReason = item.matchReasons.join(' • ') || 'Curated pick';
      let unexpectedAngle = '';

      switch (intent.type) {
        case 'mood_based':
          unexpectedAngle = `This space embodies the ${intent.mood?.primary} energy you're seeking`;
          break;
        case 'serendipity':
          unexpectedAngle = 'A delightful discovery you might not have found on your own';
          break;
        case 'experiential':
          unexpectedAngle = `Perfect setting for: ${intent.experience?.scenario}`;
          break;
        case 'cross_domain':
          unexpectedAngle = `For ${intent.crossDomain?.sourceInterest} enthusiasts who appreciate exceptional spaces`;
          break;
        case 'time_capsule':
          unexpectedAngle = `Transports you to the ${intent.timeCapsule?.era} era`;
          break;
        case 'sensory':
          unexpectedAngle = `Delivers the ${intent.sensory?.seeking.slice(0, 2).join(' and ')} you're craving`;
          break;
        default:
          unexpectedAngle = 'A carefully considered recommendation';
      }

      recommendations.push({
        destination_id: dest.id,
        slug: dest.slug,
        name: dest.name,
        city: dest.city,
        category: dest.category,
        creativeReason,
        unexpectedAngle,
        creativeScore: item.score,
        narrative: dest.micro_description || dest.description?.slice(0, 150),
      });
    }

    return recommendations;
  }
}

export const creativeIntelligenceService = new CreativeIntelligenceService();
