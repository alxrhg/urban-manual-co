/**
 * Gemini Grounding with Google Maps
 *
 * Uses Gemini's grounding capabilities to enrich destination data
 * with real-time information from Google Search and Maps.
 */

import { GoogleGenerativeAI, DynamicRetrievalMode } from '@google/generative-ai';

const GOOGLE_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
  '';

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI | null {
  if (!GOOGLE_API_KEY) {
    return null;
  }
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  }
  return _genAI;
}

export function isGroundingAvailable(): boolean {
  return !!GOOGLE_API_KEY;
}

export interface DestinationEnrichment {
  editorial_description?: string;
  micro_description?: string;
  notable_features?: string[];
  best_for?: string[];
  atmosphere?: string;
  cuisine_type?: string;
  price_insight?: string;
  local_tips?: string[];
  nearby_landmarks?: string[];
  best_time_to_visit?: string;
  reservation_info?: string;
  accessibility_info?: string;
  verification_status?: 'verified' | 'needs_review' | 'not_found';
  confidence_score?: number;
  grounding_sources?: string[];
}

export interface EnrichmentOptions {
  includeNearby?: boolean;
  includeLocalTips?: boolean;
  generateEditorial?: boolean;
  verifyInfo?: boolean;
}

/**
 * Enrich a destination using Gemini with Google Search grounding
 * This provides real-time, verified information about the place
 */
export async function enrichDestinationWithGrounding(
  destination: {
    name: string;
    city: string;
    country?: string;
    category?: string;
    description?: string;
    address?: string;
  },
  options: EnrichmentOptions = {}
): Promise<DestinationEnrichment | null> {
  const genAI = getGenAI();
  if (!genAI) {
    console.warn('[Gemini Grounding] API key not configured');
    return null;
  }

  const {
    includeNearby = true,
    includeLocalTips = true,
    generateEditorial = true,
    verifyInfo = true,
  } = options;

  try {
    // Use Gemini with Google Search grounding for real-time data
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [
        {
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              mode: DynamicRetrievalMode.MODE_DYNAMIC,
              dynamicThreshold: 0.3,
            },
          },
        },
      ],
    });

    const locationContext = destination.country
      ? `${destination.city}, ${destination.country}`
      : destination.city;

    const prompt = `You are a travel editor researching "${destination.name}" in ${locationContext}.

IMPORTANT: Use Google Search to find real, verified information about this specific place. Do NOT make up information.

${destination.category ? `Category: ${destination.category}` : ''}
${destination.address ? `Address: ${destination.address}` : ''}
${destination.description ? `Current description: ${destination.description}` : ''}

Research and provide the following information in JSON format:

{
  ${generateEditorial ? `"editorial_description": "A compelling 2-3 sentence editorial description that captures what makes this place special. Write in a sophisticated, design-conscious travel magazine voice.",
  "micro_description": "A punchy one-line description (max 100 chars) for quick preview.",` : ''}
  "notable_features": ["List 3-5 key features or highlights"],
  "best_for": ["List 2-3 occasions or traveler types this is ideal for"],
  "atmosphere": "Brief description of the vibe/ambiance",
  ${destination.category?.toLowerCase().includes('restaurant') || destination.category?.toLowerCase().includes('cafe') || destination.category?.toLowerCase().includes('bar') ? `"cuisine_type": "Primary cuisine or drink specialty",` : ''}
  "price_insight": "Brief note on pricing/value (e.g., 'High-end splurge' or 'Great value for quality')",
  ${includeLocalTips ? `"local_tips": ["2-3 insider tips for visiting"],` : ''}
  ${includeNearby ? `"nearby_landmarks": ["Notable places within walking distance"],` : ''}
  "best_time_to_visit": "When to go (time of day, season, or day of week)",
  "reservation_info": "Whether reservations are needed and how far in advance",
  ${verifyInfo ? `"verification_status": "verified if you found clear evidence this place exists and is operational, 'needs_review' if information is unclear, 'not_found' if you couldn't verify it exists",
  "confidence_score": 0.0-1.0 based on how confident you are in the information,` : ''}
}

Respond ONLY with valid JSON. If you cannot find information for a field, omit it rather than guessing.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract grounding metadata if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const groundingSources = groundingMetadata?.groundingChunks?.map(
      (chunk: any) => chunk.web?.uri
    ).filter(Boolean) || [];

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[Gemini Grounding] No valid JSON in response');
      return null;
    }

    const enrichment: DestinationEnrichment = JSON.parse(jsonMatch[0]);

    // Add grounding sources
    if (groundingSources.length > 0) {
      enrichment.grounding_sources = groundingSources;
    }

    return enrichment;
  } catch (error: any) {
    console.error('[Gemini Grounding] Enrichment error:', error?.message || error);
    return null;
  }
}

/**
 * Find nearby places using Gemini with grounding
 * This is for the "What's nearby" feature - returns non-curated places
 */
export async function findNearbyPlaces(
  location: {
    name?: string;
    city: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  },
  options: {
    category?: string;
    radius?: string; // e.g., "5 minute walk", "nearby"
    limit?: number;
  } = {}
): Promise<{
  places: Array<{
    name: string;
    type: string;
    distance?: string;
    description: string;
    why_visit?: string;
  }>;
  disclaimer: string;
} | null> {
  const genAI = getGenAI();
  if (!genAI) {
    return null;
  }

  const { category, radius = 'walking distance', limit = 5 } = options;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [
        {
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              mode: DynamicRetrievalMode.MODE_DYNAMIC,
              dynamicThreshold: 0.3,
            },
          },
        },
      ],
    });

    const locationContext = location.name
      ? `near ${location.name} in ${location.city}`
      : `in ${location.city}`;

    const categoryFilter = category ? `Focus on ${category} places.` : '';

    const prompt = `Find ${limit} interesting places ${locationContext} within ${radius}.
${categoryFilter}

Use Google Search to find real places that currently exist. Include a mix of:
- Popular spots
- Hidden gems
- Local favorites

Respond with JSON:
{
  "places": [
    {
      "name": "Place Name",
      "type": "restaurant/cafe/bar/museum/shop/park/etc",
      "distance": "approximate distance or walk time",
      "description": "Brief 1-sentence description",
      "why_visit": "What makes it worth visiting"
    }
  ]
}

Only include places you can verify exist. Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
      places: data.places || [],
      disclaimer: 'These recommendations are from Google Search and may not be part of our curated collection.',
    };
  } catch (error: any) {
    console.error('[Gemini Grounding] Nearby search error:', error?.message || error);
    return null;
  }
}

/**
 * Answer general travel questions using Gemini with grounding
 * For questions that don't need curated content
 */
export async function answerTravelQuestion(
  question: string,
  context?: {
    city?: string;
    category?: string;
  }
): Promise<{
  answer: string;
  sources?: string[];
  disclaimer?: string;
} | null> {
  const genAI = getGenAI();
  if (!genAI) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [
        {
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              mode: DynamicRetrievalMode.MODE_DYNAMIC,
              dynamicThreshold: 0.3,
            },
          },
        },
      ],
    });

    const locationContext = context?.city ? ` about ${context.city}` : '';

    const prompt = `You are a knowledgeable travel assistant. Answer this question${locationContext}:

"${question}"

Use Google Search to provide accurate, up-to-date information. Be helpful and concise.
If you cannot find reliable information, say so.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const answer = response.text();

    // Extract sources
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.groundingChunks?.map(
      (chunk: any) => chunk.web?.uri
    ).filter(Boolean) || [];

    return {
      answer,
      sources: sources.length > 0 ? sources : undefined,
      disclaimer: 'This answer is sourced from Google Search and represents general travel information.',
    };
  } catch (error: any) {
    console.error('[Gemini Grounding] Question error:', error?.message || error);
    return null;
  }
}

/**
 * Validate and verify destination information
 */
export async function verifyDestination(
  destination: {
    name: string;
    city: string;
    country?: string;
    address?: string;
    phone?: string;
    website?: string;
  }
): Promise<{
  exists: boolean;
  operational: boolean;
  corrections?: {
    field: string;
    current: string;
    suggested: string;
  }[];
  notes?: string;
} | null> {
  const genAI = getGenAI();
  if (!genAI) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [
        {
          googleSearchRetrieval: {
            dynamicRetrievalConfig: {
              mode: DynamicRetrievalMode.MODE_DYNAMIC,
              dynamicThreshold: 0.3,
            },
          },
        },
      ],
    });

    const prompt = `Verify this place exists and is currently operational:

Name: ${destination.name}
Location: ${destination.city}${destination.country ? `, ${destination.country}` : ''}
${destination.address ? `Address: ${destination.address}` : ''}
${destination.phone ? `Phone: ${destination.phone}` : ''}
${destination.website ? `Website: ${destination.website}` : ''}

Use Google Search to verify. Respond with JSON:
{
  "exists": true/false,
  "operational": true/false (is it currently open for business?),
  "corrections": [
    {"field": "field_name", "current": "current value", "suggested": "correct value"}
  ],
  "notes": "Any relevant notes about the place (e.g., 'permanently closed', 'relocated to new address')"
}

Respond ONLY with valid JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error('[Gemini Grounding] Verification error:', error?.message || error);
    return null;
  }
}
