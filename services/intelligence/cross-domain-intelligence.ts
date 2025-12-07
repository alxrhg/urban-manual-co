/**
 * Cross-Domain Intelligence Service
 *
 * Makes unexpected, delightful connections between interests and destinations.
 * "If you love X, you might not have thought of Y, but here's why..."
 *
 * Examples:
 * - Architecture lovers → restaurants in notable buildings
 * - Jazz enthusiasts → bars with acoustic design heritage
 * - Fashion followers → cafes frequented by fashion industry
 * - History buffs → hotels with storied pasts
 * - Photography enthusiasts → places with exceptional light
 */

import { generateJSON } from '@/lib/llm';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface DomainConnection {
  sourceDomain: string;           // The user's interest
  targetCategory: string;         // The category we're recommending
  connectionType: ConnectionType;
  connectionStrength: number;     // 0-1
  explanation: string;            // Why this connection makes sense
}

export type ConnectionType =
  | 'designed_by'       // Space designed by notable architect/designer
  | 'aesthetic_affinity' // Shares aesthetic values
  | 'historical_tie'    // Historical connection
  | 'cultural_hub'      // Gathering place for that community
  | 'sensory_parallel'  // Similar sensory experience
  | 'narrative_thread'  // Connected through story/history
  | 'craftsperson'      // Shares craft/maker ethos
  | 'philosophical'     // Shares underlying philosophy
  | 'unexpected_delight'; // Pure serendipity

export interface CrossDomainRecommendation {
  destination_id: string;
  slug: string;
  name: string;
  city: string;
  category: string;
  connection: DomainConnection;
  narrative: string;              // The story of why this connection works
  surpriseFactor: number;         // How unexpected is this? 0-1
  confidenceScore: number;        // How confident are we in this connection?
}

// Domain connection mappings with rich metadata
const DOMAIN_CONNECTIONS: Record<string, {
  categories: string[];
  connectionTypes: ConnectionType[];
  keywords: string[];
  philosophicalBridge: string;
}> = {
  architecture: {
    categories: ['Restaurant', 'Hotel', 'Cafe', 'Bar', 'Shop'],
    connectionTypes: ['designed_by', 'aesthetic_affinity', 'philosophical'],
    keywords: ['architect', 'designed by', 'brutalist', 'modernist', 'art deco', 'minimalist', 'space', 'light'],
    philosophicalBridge: 'Experiencing designed spaces where form meets function in hospitality',
  },
  design: {
    categories: ['Restaurant', 'Hotel', 'Cafe', 'Shop', 'Bar'],
    connectionTypes: ['aesthetic_affinity', 'craftsperson', 'philosophical'],
    keywords: ['design', 'curated', 'interior', 'furniture', 'concept', 'aesthetic', 'thoughtful'],
    philosophicalBridge: 'Appreciating intentional design choices in unexpected contexts',
  },
  art: {
    categories: ['Restaurant', 'Hotel', 'Bar', 'Cafe'],
    connectionTypes: ['cultural_hub', 'aesthetic_affinity', 'historical_tie'],
    keywords: ['gallery', 'collection', 'artist', 'creative', 'exhibition', 'canvas', 'artistic'],
    philosophicalBridge: 'Finding art in everyday hospitality experiences',
  },
  music: {
    categories: ['Bar', 'Restaurant', 'Hotel', 'Cafe'],
    connectionTypes: ['sensory_parallel', 'cultural_hub', 'historical_tie'],
    keywords: ['jazz', 'vinyl', 'acoustic', 'sound', 'performance', 'live music', 'playlist'],
    philosophicalBridge: 'Spaces that understand the importance of sound and atmosphere',
  },
  fashion: {
    categories: ['Restaurant', 'Hotel', 'Bar', 'Cafe', 'Shop'],
    connectionTypes: ['cultural_hub', 'aesthetic_affinity'],
    keywords: ['stylish', 'fashion', 'chic', 'designer', 'industry', 'editorial', 'runway'],
    philosophicalBridge: 'Where the fashion world gathers and aesthetic sensibility is paramount',
  },
  literature: {
    categories: ['Cafe', 'Hotel', 'Bar', 'Restaurant'],
    connectionTypes: ['historical_tie', 'narrative_thread', 'cultural_hub'],
    keywords: ['literary', 'writer', 'book', 'reading', 'intellectual', 'historic', 'haunt'],
    philosophicalBridge: 'Spaces that have inspired writers or invite contemplation',
  },
  film: {
    categories: ['Restaurant', 'Hotel', 'Bar', 'Cafe'],
    connectionTypes: ['historical_tie', 'aesthetic_affinity', 'narrative_thread'],
    keywords: ['cinematic', 'film', 'movie', 'scene', 'dramatic', 'iconic', 'location'],
    philosophicalBridge: 'Locations with cinematic quality or film history',
  },
  photography: {
    categories: ['Cafe', 'Restaurant', 'Hotel', 'Bar'],
    connectionTypes: ['sensory_parallel', 'aesthetic_affinity'],
    keywords: ['light', 'golden hour', 'photogenic', 'views', 'visual', 'composition', 'aesthetic'],
    philosophicalBridge: 'Spaces with exceptional natural light and visual interest',
  },
  food: {
    categories: ['Shop', 'Bar', 'Hotel'],
    connectionTypes: ['craftsperson', 'philosophical', 'unexpected_delight'],
    keywords: ['ingredients', 'producers', 'craft', 'sommelier', 'tasting', 'culinary'],
    philosophicalBridge: 'Extension of the culinary journey beyond restaurants',
  },
  nature: {
    categories: ['Restaurant', 'Hotel', 'Cafe'],
    connectionTypes: ['sensory_parallel', 'philosophical'],
    keywords: ['garden', 'outdoor', 'terrace', 'green', 'natural', 'biophilic', 'plants'],
    philosophicalBridge: 'Urban spaces that honor connection to nature',
  },
  craftsmanship: {
    categories: ['Restaurant', 'Hotel', 'Bar', 'Cafe', 'Shop'],
    connectionTypes: ['craftsperson', 'philosophical'],
    keywords: ['handmade', 'artisan', 'craft', 'bespoke', 'maker', 'traditional', 'technique'],
    philosophicalBridge: 'Appreciation for skilled hands and time-honored methods',
  },
  wellness: {
    categories: ['Hotel', 'Restaurant', 'Cafe'],
    connectionTypes: ['philosophical', 'sensory_parallel'],
    keywords: ['wellness', 'mindful', 'organic', 'holistic', 'calm', 'spa', 'retreat'],
    philosophicalBridge: 'Spaces designed for wellbeing and restoration',
  },
  history: {
    categories: ['Restaurant', 'Hotel', 'Bar', 'Cafe'],
    connectionTypes: ['historical_tie', 'narrative_thread'],
    keywords: ['historic', 'heritage', 'legacy', 'original', 'since', 'traditional', 'classic'],
    philosophicalBridge: 'Places that carry stories and preserve heritage',
  },
};

// Unexpected connection generators
const SERENDIPITOUS_BRIDGES: Array<{
  from: string;
  to: string;
  bridge: string;
  surpriseFactor: number;
}> = [
  {
    from: 'architecture',
    to: 'food',
    bridge: 'The same attention to proportion and balance that makes great buildings makes great plates',
    surpriseFactor: 0.8,
  },
  {
    from: 'music',
    to: 'design',
    bridge: 'Rhythm and spacing in music parallels rhythm and spacing in interior design',
    surpriseFactor: 0.7,
  },
  {
    from: 'fashion',
    to: 'architecture',
    bridge: 'Both fashion and architecture are about how we inhabit and project ourselves',
    surpriseFactor: 0.6,
  },
  {
    from: 'literature',
    to: 'food',
    bridge: 'The narrative arc of a great meal mirrors the structure of a great story',
    surpriseFactor: 0.75,
  },
  {
    from: 'photography',
    to: 'architecture',
    bridge: 'Both are obsessed with light, shadow, and the decisive moment',
    surpriseFactor: 0.5,
  },
  {
    from: 'craftsmanship',
    to: 'music',
    bridge: 'The patience of mastering a craft echoes the dedication of mastering an instrument',
    surpriseFactor: 0.85,
  },
];

export class CrossDomainIntelligenceService {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('CrossDomainIntelligenceService: Supabase client not available');
    }
  }

  /**
   * Detect user's domain interests from query and history
   */
  async detectDomainInterests(
    query: string,
    userId?: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<string[]> {
    const interests: Set<string> = new Set();
    const lowerQuery = query.toLowerCase();

    // Direct domain mentions
    for (const domain of Object.keys(DOMAIN_CONNECTIONS)) {
      if (lowerQuery.includes(domain)) {
        interests.add(domain);
      }
    }

    // Enthusiasm indicators
    const enthusiasmPatterns = [
      { pattern: /(?:love|into|passionate about|obsessed with|fan of|appreciate)\s+(\w+)/gi, extract: 1 },
      { pattern: /(\w+)\s+(?:lover|enthusiast|buff|nerd|aficionado)/gi, extract: 1 },
    ];

    for (const { pattern, extract } of enthusiasmPatterns) {
      let match;
      while ((match = pattern.exec(lowerQuery)) !== null) {
        const interest = match[extract].toLowerCase();
        if (DOMAIN_CONNECTIONS[interest]) {
          interests.add(interest);
        }
      }
    }

    // Check conversation history for interest signals
    if (conversationHistory.length > 0) {
      const historyText = conversationHistory.map(m => m.content).join(' ').toLowerCase();
      for (const domain of Object.keys(DOMAIN_CONNECTIONS)) {
        if (historyText.includes(domain) || historyText.includes(`${domain} lover`)) {
          interests.add(domain);
        }
      }
    }

    // If user is logged in, check their profile/history for interest signals
    if (userId && this.supabase) {
      try {
        const { data: profile } = await this.supabase
          .from('user_preferences')
          .select('interests, favorite_categories')
          .eq('user_id', userId)
          .single();

        if (profile?.interests) {
          for (const interest of profile.interests) {
            if (DOMAIN_CONNECTIONS[interest.toLowerCase()]) {
              interests.add(interest.toLowerCase());
            }
          }
        }
      } catch (error) {
        // Silent fail - user preferences are optional
      }
    }

    return Array.from(interests);
  }

  /**
   * Find cross-domain recommendations
   * "You love architecture? Here's a restaurant you'd never think to visit, but..."
   */
  async getCrossDomainRecommendations(
    sourceDomains: string[],
    targetCategory?: string,
    city?: string,
    limit: number = 10
  ): Promise<CrossDomainRecommendation[]> {
    if (!this.supabase || sourceDomains.length === 0) return [];

    const recommendations: CrossDomainRecommendation[] = [];

    try {
      for (const domain of sourceDomains) {
        const domainConfig = DOMAIN_CONNECTIONS[domain];
        if (!domainConfig) continue;

        // Determine target categories
        const targetCategories = targetCategory
          ? [targetCategory]
          : domainConfig.categories;

        // Build query for destinations matching this domain's keywords
        let query = this.supabase
          .from('destinations')
          .select('id, slug, name, city, country, category, description, micro_description, tags, style_tags, ambience_tags, experience_tags, architect')
          .in('category', targetCategories);

        if (city) {
          query = query.ilike('city', `%${city}%`);
        }

        const { data: destinations, error } = await query.limit(100);

        if (error || !destinations) continue;

        // Score destinations based on domain relevance
        for (const dest of destinations) {
          const score = this.scoreDomainRelevance(dest, domain, domainConfig);

          if (score.relevance > 0.3) {
            recommendations.push({
              destination_id: dest.id,
              slug: dest.slug,
              name: dest.name,
              city: dest.city,
              category: dest.category,
              connection: {
                sourceDomain: domain,
                targetCategory: dest.category,
                connectionType: score.connectionType,
                connectionStrength: score.relevance,
                explanation: score.explanation,
              },
              narrative: this.generateNarrative(dest, domain, score),
              surpriseFactor: this.calculateSurprise(domain, dest.category),
              confidenceScore: score.relevance,
            });
          }
        }
      }

      // Sort by a combination of relevance and surprise
      return recommendations
        .sort((a, b) => {
          const scoreA = a.confidenceScore * 0.6 + a.surpriseFactor * 0.4;
          const scoreB = b.confidenceScore * 0.6 + b.surpriseFactor * 0.4;
          return scoreB - scoreA;
        })
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting cross-domain recommendations:', error);
      return [];
    }
  }

  /**
   * Score how relevant a destination is to a domain
   */
  private scoreDomainRelevance(
    dest: any,
    domain: string,
    config: typeof DOMAIN_CONNECTIONS[string]
  ): { relevance: number; connectionType: ConnectionType; explanation: string } {
    let relevance = 0;
    let connectionType: ConnectionType = 'aesthetic_affinity';
    let explanation = '';

    const allText = [
      dest.description || '',
      dest.micro_description || '',
      ...(dest.tags || []),
      ...(dest.style_tags || []),
      ...(dest.ambience_tags || []),
      ...(dest.experience_tags || []),
    ].join(' ').toLowerCase();

    // Check for keyword matches
    for (const keyword of config.keywords) {
      if (allText.includes(keyword.toLowerCase())) {
        relevance += 0.15;
      }
    }

    // Special cases for strong connections
    if (domain === 'architecture' && dest.architect) {
      relevance += 0.4;
      connectionType = 'designed_by';
      explanation = `Designed by ${dest.architect}`;
    }

    if (domain === 'history' && allText.includes('historic')) {
      relevance += 0.3;
      connectionType = 'historical_tie';
      explanation = 'A place steeped in history';
    }

    if (domain === 'craftsmanship' && (allText.includes('artisan') || allText.includes('handmade'))) {
      relevance += 0.35;
      connectionType = 'craftsperson';
      explanation = 'Celebrates artisanal craft';
    }

    if (domain === 'photography' && (allText.includes('light') || allText.includes('views'))) {
      relevance += 0.3;
      connectionType = 'sensory_parallel';
      explanation = 'Exceptional light and visual composition';
    }

    // Default explanation if none set
    if (!explanation && relevance > 0) {
      explanation = config.philosophicalBridge;
    }

    // Cap at 1.0
    relevance = Math.min(relevance, 1.0);

    return { relevance, connectionType, explanation };
  }

  /**
   * Generate a narrative explaining the cross-domain connection
   */
  private generateNarrative(
    dest: any,
    domain: string,
    score: { relevance: number; connectionType: ConnectionType; explanation: string }
  ): string {
    const templates: Record<ConnectionType, (dest: any, domain: string, explanation: string) => string> = {
      designed_by: (d, dom, exp) =>
        `For those who appreciate ${dom}, ${d.name} offers an exceptional space where ${exp.toLowerCase()}.`,
      aesthetic_affinity: (d, dom, exp) =>
        `${d.name} speaks the same visual language that ${dom} lovers appreciate—${exp.toLowerCase()}.`,
      historical_tie: (d, dom, exp) =>
        `${d.name} carries the weight of history that ${dom} enthusiasts will recognize—${exp.toLowerCase()}.`,
      cultural_hub: (d, dom, exp) =>
        `${d.name} has long been a gathering place for the ${dom} community—${exp.toLowerCase()}.`,
      sensory_parallel: (d, dom, exp) =>
        `The sensory experience at ${d.name} mirrors what draws you to ${dom}—${exp.toLowerCase()}.`,
      narrative_thread: (d, dom, exp) =>
        `${d.name} shares a story with ${dom}—${exp.toLowerCase()}.`,
      craftsperson: (d, dom, exp) =>
        `The same dedication to craft that defines ${dom} is evident at ${d.name}—${exp.toLowerCase()}.`,
      philosophical: (d, dom, exp) =>
        `${d.name} embodies the same philosophy that underlies great ${dom}—${exp.toLowerCase()}.`,
      unexpected_delight: (d, dom, exp) =>
        `You might not expect it, but ${d.name} offers a delightful parallel to your love of ${dom}.`,
    };

    const templateFn = templates[score.connectionType] || templates.aesthetic_affinity;
    return templateFn(dest, domain, score.explanation);
  }

  /**
   * Calculate how surprising this domain→category connection is
   */
  private calculateSurprise(sourceDomain: string, targetCategory: string): number {
    // Some connections are obvious (architecture → hotel), others surprising (music → restaurant)
    const obviousPairs: Record<string, string[]> = {
      food: ['Restaurant', 'Cafe'],
      wellness: ['Hotel', 'Spa'],
      architecture: ['Hotel'],
      design: ['Shop', 'Hotel'],
    };

    const obvious = obviousPairs[sourceDomain] || [];
    if (obvious.includes(targetCategory)) {
      return 0.3; // Less surprising
    }

    // Check for serendipitous bridges
    const bridge = SERENDIPITOUS_BRIDGES.find(b => b.from === sourceDomain);
    if (bridge) {
      return bridge.surpriseFactor;
    }

    return 0.6; // Default moderate surprise
  }

  /**
   * Generate a "you might not have thought of this" insight
   */
  async generateUnexpectedInsight(
    destination: any,
    userInterests: string[]
  ): Promise<string | null> {
    if (userInterests.length === 0) return null;

    try {
      const system = `You are a creative travel intelligence that finds unexpected connections.
Given a destination and a user's interests, generate a brief, surprising insight about why
this place might delight them—something they wouldn't have thought of on their own.

Be specific, not generic. Reference actual qualities of the place.
Keep it to 1-2 sentences. Be conversational and intriguing, not salesy.`;

      const prompt = `
Destination: ${destination.name} (${destination.category} in ${destination.city})
Description: ${destination.description || destination.micro_description || 'A notable destination'}
Tags: ${[...(destination.tags || []), ...(destination.style_tags || [])].join(', ')}
${destination.architect ? `Architect: ${destination.architect}` : ''}

User interests: ${userInterests.join(', ')}

Generate an unexpected connection or insight:`;

      const result = await generateJSON(system, prompt);

      if (result && result.insight) {
        return result.insight;
      }
    } catch (error) {
      console.error('Error generating unexpected insight:', error);
    }

    return null;
  }

  /**
   * Get "proactive" suggestions - things the user didn't ask for but might love
   */
  async getProactiveSuggestions(
    currentResults: any[],
    userInterests: string[],
    city?: string,
    limit: number = 3
  ): Promise<CrossDomainRecommendation[]> {
    if (!this.supabase || userInterests.length === 0) return [];

    // Get categories NOT represented in current results
    const currentCategories = new Set(currentResults.map(r => r.category));

    // Find cross-domain recommendations in different categories
    const suggestions = await this.getCrossDomainRecommendations(
      userInterests,
      undefined, // Don't filter by category
      city,
      limit * 3
    );

    // Filter to categories not in current results (true "outside the box")
    return suggestions
      .filter(s => !currentCategories.has(s.category))
      .slice(0, limit);
  }
}

export const crossDomainIntelligenceService = new CrossDomainIntelligenceService();
