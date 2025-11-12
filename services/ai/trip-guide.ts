import OpenAI from 'openai';
import { Destination } from '@/types/destination';
import {
  SmartTripPlanResponse,
  TripPreferencePayload,
  TripSearchCriteria,
} from '@/types/trip-guide';

const OPENAI_MODEL = process.env.OPENAI_SMART_TRIP_MODEL || 'gpt-4.1-mini';

const openaiApiKey =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_KEY ||
  process.env.NEXT_PUBLIC_OPENAI_API_KEY;

const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  restaurant: ['restaurant', 'dinner', 'lunch', 'food', 'eatery', 'bistro'],
  cafe: ['cafe', 'coffee', 'espresso'],
  bar: ['bar', 'cocktail', 'speakeasy', 'wine'],
  museum: ['museum', 'gallery', 'exhibit'],
  park: ['park', 'garden', 'outdoor', 'nature'],
  shopping: ['shopping', 'boutique', 'store'],
  hotel: ['hotel', 'stay', 'lodging', 'resort'],
  spa: ['spa', 'wellness'],
};

const TAG_KEYWORDS: Record<string, string[]> = {
  romantic: ['romantic', 'date night', 'anniversary', 'intimate'],
  cozy: ['cozy', 'warm', 'intimate'],
  upscale: ['fine dining', 'luxury', 'upscale', 'splurge'],
  budget: ['budget', 'cheap', 'affordable', 'wallet-friendly'],
  family: ['family', 'kids', 'child'],
  group: ['group', 'team', 'coworkers'],
  vegan: ['vegan', 'plant-based'],
  vegetarian: ['vegetarian'],
  gluten_free: ['gluten-free'],
  halal: ['halal'],
  nightlife: ['nightlife', 'late-night', 'after dark'],
  brunch: ['brunch'],
  wifi: ['wifi', 'remote work', 'laptop friendly'],
};

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'in',
  'at',
  'for',
  'with',
  'and',
  'to',
  'of',
  'please',
  'me',
  'find',
  'show',
  'looking',
  'need',
  'want',
]);

function capitalizeWords(input: string): string {
  return input
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractCityFromText(text: string): string | undefined {
  const cityMatch = text.match(/\bin\s+([A-Za-z][A-Za-z\s'-]{1,60})/i);
  if (cityMatch) {
    const raw = cityMatch[1].trim();
    const city = raw.split(/\s+(?:for|with|at|under|over|around|price|level|during|on|by|near)\b/i)[0]?.trim();
    if (city) {
      return capitalizeWords(city);
    }
  }
  return undefined;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

interface ParsedLLMResponse {
  city?: string;
  category?: string;
  tags?: string[];
  keywords?: string[];
  mood?: string[];
  maxPriceLevel?: number;
  minPriceLevel?: number;
  budgetText?: string;
  groupSize?: number;
  durationDays?: number;
}

export class SmartTripGuideAIService {
  private client: OpenAI | null;

  constructor(client: OpenAI | null = openaiClient) {
    this.client = client;
  }

  async parsePreferences(payload: TripPreferencePayload): Promise<TripSearchCriteria> {
    const base = this.ruleBasedParse(payload);

    if (!this.client) {
      return base;
    }

    try {
      const response = await this.client.responses.create({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content:
              'You are a travel planning assistant. Extract structured filters as concise JSON. Always respond with JSON only.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              request: payload.text,
              city: payload.city,
              category: payload.category,
              tags: payload.tags,
              budget: payload.budget,
              priceLevel: payload.priceLevel,
              groupSize: payload.groupSize,
              days: payload.days,
            }),
          },
        ],
        response_format: { type: 'json_schema', json_schema: {
          name: 'trip_filters',
          schema: {
            type: 'object',
            properties: {
              city: { type: 'string', nullable: true },
              category: { type: 'string', nullable: true },
              tags: {
                type: 'array',
                items: { type: 'string' },
                nullable: true,
              },
              keywords: {
                type: 'array',
                items: { type: 'string' },
                nullable: true,
              },
              mood: {
                type: 'array',
                items: { type: 'string' },
                nullable: true,
              },
              maxPriceLevel: { type: 'integer', nullable: true },
              minPriceLevel: { type: 'integer', nullable: true },
              budgetText: { type: 'string', nullable: true },
              groupSize: { type: 'integer', nullable: true },
              durationDays: { type: 'integer', nullable: true },
            },
          },
        } },
      });

      const content = response.output?.[0]?.content?.[0];
      const value = (content && 'text' in content) ? content.text : undefined;
      if (value) {
        const parsed = JSON.parse(value) as ParsedLLMResponse;
        return this.mergeCriteria(base, parsed);
      }
    } catch (error) {
      console.warn('[SmartTripGuideAIService] LLM parsing failed, using heuristic parser', error);
    }

    return base;
  }

  async summarizeItinerary(
    destinations: SmartTripPlanResponse['destinations'],
    criteria: TripSearchCriteria,
  ): Promise<string> {
    if (!this.client || destinations.length === 0) {
      return this.generateFallbackSummary(destinations, criteria);
    }

    try {
      const response = await this.client.responses.create({
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content:
              'You are an editorial travel writer. Summarize itineraries in two sentences, highlighting tone and diversity without inventing places.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              criteria,
              destinations: destinations.slice(0, 6).map((destination) => ({
                name: destination.name,
                city: destination.city,
                category: destination.category,
                tags: destination.tags,
                description: destination.description,
              })),
            }),
          },
        ],
      });

      const text = response.output_text?.trim();
      if (text) {
        return text;
      }
    } catch (error) {
      console.warn('[SmartTripGuideAIService] LLM summary failed, using fallback', error);
    }

    return this.generateFallbackSummary(destinations, criteria);
  }

  private mergeCriteria(
    base: TripSearchCriteria,
    parsed: ParsedLLMResponse,
  ): TripSearchCriteria {
    return {
      city: parsed.city || base.city,
      category: parsed.category || base.category,
      tags: unique([...(base.tags || []), ...(parsed.tags || [])]),
      keywords: unique([...(base.keywords || []), ...(parsed.keywords || [])]),
      mood: unique([...(base.mood || []), ...(parsed.mood || [])]),
      maxPriceLevel: parsed.maxPriceLevel ?? base.maxPriceLevel,
      minPriceLevel: parsed.minPriceLevel ?? base.minPriceLevel,
      budgetText: parsed.budgetText || base.budgetText,
      groupSize: parsed.groupSize ?? base.groupSize,
      durationDays: parsed.durationDays ?? base.durationDays,
    };
  }

  private ruleBasedParse(payload: TripPreferencePayload): TripSearchCriteria {
    const text = payload.text || '';
    const lower = text.toLowerCase();

    let city = payload.city;
    if (!city && text) {
      city = extractCityFromText(text);
    }

    let category = payload.category;
    for (const [candidate, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (!category && keywords.some((keyword) => lower.includes(keyword))) {
        category = candidate;
        break;
      }
    }

    const tags = new Set(payload.tags || []);
    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
      if (keywords.some((keyword) => lower.includes(keyword))) {
        tags.add(tag);
      }
    }

    const keywords = lower
      .split(/[^a-z0-9]+/i)
      .map((word) => word.trim())
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
      .slice(0, 8);

    let maxPriceLevel = payload.priceLevel;
    let minPriceLevel: number | undefined;

    const priceLevelMatch = lower.match(/price\s*level\s*(\d)/);
    const hasExplicitPriceLevel = Boolean(priceLevelMatch) || payload.priceLevel !== undefined;

    if (priceLevelMatch) {
      maxPriceLevel = Number(priceLevelMatch[1]);
    }

    if (!hasExplicitPriceLevel && (lower.includes('under') || lower.includes('budget') || lower.includes('cheap'))) {
      maxPriceLevel = Math.min(maxPriceLevel ?? 2, 2);
    }

    if (lower.includes('luxury') || lower.includes('upscale') || lower.includes('fine dining') || lower.includes('splurge')) {
      minPriceLevel = Math.max(minPriceLevel ?? 3, 3);
    }

    const groupSize = payload.groupSize ?? (() => {
      const match = lower.match(/(\d{1,2})\s+(?:people|friends|guests|person|travellers|travelers|group)/);
      return match ? Number(match[1]) : undefined;
    })();

    const durationDays = payload.days ?? (() => {
      const match = lower.match(/(\d{1,2})\s*-?\s*day/);
      return match ? Number(match[1]) : undefined;
    })();

    let budgetText = payload.budget;
    const budgetMatch = text.match(/under\s+\$?(\d+[,.]?\d*)/i);
    if (!budgetText && budgetMatch) {
      budgetText = `Under ${budgetMatch[1]}`;
    }

    return {
      city,
      category,
      tags: unique(Array.from(tags)),
      keywords,
      mood: [],
      maxPriceLevel,
      minPriceLevel,
      budgetText,
      groupSize,
      durationDays,
    };
  }

  private generateFallbackSummary(
    destinations: SmartTripPlanResponse['destinations'],
    criteria: TripSearchCriteria,
  ): string {
    if (!destinations.length) {
      return 'We could not find matching destinations. Try adjusting the city, vibe, or price range.';
    }

    const leadCategory = criteria.category || destinations[0]?.category || 'experiences';
    const cityText = criteria.city ? ` in ${criteria.city}` : '';
    const highlights = destinations
      .slice(0, 3)
      .map((destination) => destination.name)
      .join(', ');

    let sentence = `Discovered ${destinations.length} ${leadCategory}${destinations.length === 1 ? '' : 's'}${cityText} tailored for your request.`;

    if (highlights) {
      sentence += ` Highlights include ${highlights}.`;
    }

    if (criteria.groupSize) {
      sentence += ` Ideal for a group of ${criteria.groupSize}.`;
    }

    if (criteria.durationDays) {
      sentence += ` Plan for roughly ${criteria.durationDays} day${criteria.durationDays === 1 ? '' : 's'} on this itinerary.`;
    }

    return sentence;
  }

  prepareDestinations(
    destinations: Destination[] | SmartTripPlanResponse['destinations'],
  ): SmartTripPlanResponse['destinations'] {
    return destinations.map((destination) => ({
      slug: destination.slug,
      name: destination.name,
      city: destination.city,
      category: destination.category,
      description: destination.description ?? undefined,
      image: (destination as Destination).image || (destination as Destination).primary_photo_url || destination.image,
      primary_photo_url: (destination as Destination).primary_photo_url,
      tags: destination.tags ?? [],
      price_level: destination.price_level,
      rating: destination.rating,
    }));
  }

  async planTrip(
    payload: TripPreferencePayload,
    destinations: Destination[],
  ): Promise<SmartTripPlanResponse> {
    const prepared = this.prepareDestinations(destinations);
    const criteria = await this.parsePreferences(payload);
    const summary = await this.summarizeItinerary(prepared, criteria);
    return {
      criteria,
      destinations: prepared,
      itinerarySummary: summary,
    };
  }
}

