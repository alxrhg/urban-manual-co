import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import type { SuggestionPatch, AddActivityPayload, FillGapPayload, Place } from '@/lib/intelligence/types';

/**
 * POST /api/intelligence/smart-fill
 * Analyze existing trip items and suggest complementary places
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { city, existingItems, tripDays, gapContext } = await request.json();

  if (!city) {
    throw createValidationError('City is required');
  }

    // Get available destinations in the city
    const { data: destinations, error: destError } = await supabase
      .from('destinations')
      .select('id, slug, name, category, rating, price_level, tags, description, latitude, longitude, image, image_thumbnail')
      .ilike('city', `%${city}%`)
      .order('rating', { ascending: false })
      .limit(150);

    if (destError || !destinations || destinations.length === 0) {
      return NextResponse.json(
        { error: 'No destinations found for this city' },
        { status: 404 }
      );
    }

    // Exclude already added destinations
    const existingSlugs = new Set(
      (existingItems || []).map((item: any) => item.destination_slug).filter(Boolean)
    );
    const availableDestinations = destinations.filter(d => !existingSlugs.has(d.slug));

    if (availableDestinations.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: 'All available destinations have been added to your trip',
      });
    }

    // Analyze existing items to understand the trip context
    const analysis = analyzeExistingItems(existingItems || [], tripDays || 1);

    // Use AI to generate smart suggestions
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    let suggestions: any[] = [];

    // If gapContext is provided, use targeted gap-filling suggestions
    if (gapContext && apiKey) {
      suggestions = await generateGapSuggestions(
        apiKey,
        city,
        availableDestinations,
        gapContext
      );
    } else if (apiKey) {
      suggestions = await generateAISuggestions(
        apiKey,
        city,
        availableDestinations,
        existingItems || [],
        analysis,
        tripDays || 1
      );
    } else {
      // Fallback to rule-based suggestions
      suggestions = generateRuleBasedSuggestions(
        availableDestinations,
        existingItems || [],
        analysis,
        tripDays || 1
      );
    }

  return NextResponse.json({
    suggestions,
    analysis,
    count: suggestions.length,
  });
});

interface TripAnalysis {
  itemsByDay: Record<number, any[]>;
  categoriesPresent: Set<string>;
  timeSlotsByDay: Record<number, Set<string>>;
  gaps: Array<{
    day: number;
    timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
    suggestion: string;
    afterItem?: any;
  }>;
  missingCategories: string[];
}

function analyzeExistingItems(items: any[], tripDays: number): TripAnalysis {
  const itemsByDay: Record<number, any[]> = {};
  const categoriesPresent = new Set<string>();
  const timeSlotsByDay: Record<number, Set<string>> = {};
  const gaps: TripAnalysis['gaps'] = [];

  // Group items by day
  for (let day = 1; day <= tripDays; day++) {
    itemsByDay[day] = items.filter((item: any) => item.day === day);
    timeSlotsByDay[day] = new Set();
  }

  // Analyze each item
  items.forEach((item: any) => {
    const category = item.parsedNotes?.category || item.category || '';
    if (category) {
      categoriesPresent.add(category.toLowerCase());
    }

    // Determine time slot from time field
    if (item.time) {
      const hour = parseInt(item.time.split(':')[0], 10);
      const timeSlot = getTimeSlot(hour);
      if (item.day && timeSlotsByDay[item.day]) {
        timeSlotsByDay[item.day].add(timeSlot);
      }
    }
  });

  // Find gaps in each day
  const allTimeSlots: Array<'morning' | 'afternoon' | 'evening' | 'night'> = ['morning', 'afternoon', 'evening', 'night'];

  for (let day = 1; day <= tripDays; day++) {
    const dayItems = itemsByDay[day] || [];
    const filledSlots = timeSlotsByDay[day] || new Set();

    for (const slot of allTimeSlots) {
      if (!filledSlots.has(slot)) {
        // Find the previous item to give context
        const prevSlotIndex = allTimeSlots.indexOf(slot) - 1;
        let afterItem = null;

        if (prevSlotIndex >= 0) {
          const prevSlot = allTimeSlots[prevSlotIndex];
          afterItem = dayItems.find((item: any) => {
            if (!item.time) return false;
            const hour = parseInt(item.time.split(':')[0], 10);
            return getTimeSlot(hour) === prevSlot;
          });
        }

        gaps.push({
          day,
          timeSlot: slot,
          suggestion: getSuggestionForSlot(slot, afterItem, categoriesPresent),
          afterItem,
        });
      }
    }
  }

  // Identify missing category types for balanced trip
  const essentialCategories = ['restaurant', 'cafe', 'bar', 'museum', 'attraction'];
  const missingCategories = essentialCategories.filter(cat =>
    !Array.from(categoriesPresent).some(present => present.includes(cat))
  );

  return {
    itemsByDay,
    categoriesPresent,
    timeSlotsByDay,
    gaps,
    missingCategories,
  };
}

function getTimeSlot(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getSuggestionForSlot(
  slot: 'morning' | 'afternoon' | 'evening' | 'night',
  afterItem: any,
  existingCategories: Set<string>
): string {
  const afterCategory = afterItem?.parsedNotes?.category?.toLowerCase() || '';

  // Context-aware suggestions
  if (afterCategory.includes('restaurant') || afterCategory.includes('dining')) {
    if (slot === 'evening' || slot === 'night') {
      return 'bar or drinks spot';
    }
    return 'activity or attraction';
  }

  if (afterCategory.includes('museum') || afterCategory.includes('gallery')) {
    return 'cafe or lunch spot';
  }

  // Time-based defaults
  switch (slot) {
    case 'morning':
      return 'breakfast or cafe';
    case 'afternoon':
      return 'attraction, museum, or activity';
    case 'evening':
      return 'dinner restaurant';
    case 'night':
      return 'bar or nightlife';
    default:
      return 'activity';
  }
}

/**
 * Generate a unique suggestion ID
 */
function generateSuggestionId(): string {
  return `sug_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Convert a destination to a Place object
 */
function destinationToPlace(dest: any): Place {
  return {
    id: dest.id,
    slug: dest.slug,
    name: dest.name,
    city: dest.city,
    category: dest.category,
    latitude: dest.latitude,
    longitude: dest.longitude,
    image: dest.image,
    imageThumbnail: dest.image_thumbnail,
    rating: dest.rating,
    priceLevel: dest.price_level,
    description: dest.description,
  };
}

/**
 * Create a SuggestionPatch from destination and gap info
 */
function createSuggestionPatch(
  dest: any,
  day: number,
  timeSlot: string,
  startTime: string,
  reason: string,
  source: 'ai' | 'rule' = 'ai'
): SuggestionPatch {
  const place = destinationToPlace(dest);

  return {
    id: generateSuggestionId(),
    label: `Add ${dest.name}`,
    patch: {
      type: 'addActivity',
      payload: {
        dayIndex: day - 1, // Convert 1-indexed day to 0-indexed
        place,
        startTime,
      } as AddActivityPayload,
    },
    reason,
    meta: {
      source,
      destination: place,
      day,
      timeSlot,
      startTime,
      image: dest.image_thumbnail || dest.image,
    },
  };
}

async function generateAISuggestions(
  apiKey: string,
  city: string,
  availableDestinations: any[],
  existingItems: any[],
  analysis: TripAnalysis,
  tripDays: number
): Promise<SuggestionPatch[]> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    // Prepare existing items summary
    const existingSummary = existingItems.map(item => ({
      day: item.day,
      time: item.time,
      title: item.title,
      category: item.parsedNotes?.category || item.category,
    }));

    // Prepare available destinations summary
    const availableSummary = availableDestinations.slice(0, 60).map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      rating: d.rating,
      priceLevel: d.price_level,
    }));

    const prompt = `You are a travel planning assistant. Analyze this trip and suggest places to fill the gaps.

CITY: ${city}
TRIP DURATION: ${tripDays} days

EXISTING ITINERARY:
${JSON.stringify(existingSummary, null, 2)}

IDENTIFIED GAPS:
${JSON.stringify(analysis.gaps.map(g => ({
  day: g.day,
  timeSlot: g.timeSlot,
  suggestion: g.suggestion,
  afterItem: g.afterItem ? { title: g.afterItem.title, category: g.afterItem.parsedNotes?.category } : null,
})), null, 2)}

AVAILABLE DESTINATIONS:
${JSON.stringify(availableSummary, null, 2)}

TASK: Suggest the best destinations to fill each gap. Consider:
1. After dinner → suggest a bar or drinks spot
2. After museum → suggest a cafe or light lunch
3. Morning gaps → breakfast spots or cafes
4. Afternoon gaps → attractions or activities
5. Evening gaps → dinner restaurants
6. Night gaps → bars or nightlife

Return ONLY valid JSON array:
[
  {
    "destinationId": 123,
    "day": 1,
    "timeSlot": "evening",
    "startTime": "19:00",
    "reason": "Great bar to visit after your dinner at Restaurant X"
  }
]

Suggest 3-5 places per day with gaps. Return only JSON, no other text:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Convert to SuggestionPatch format
      return parsed
        .map((suggestion: any) => {
          const dest = availableDestinations.find(d => d.id === suggestion.destinationId);
          if (!dest) return null;

          return createSuggestionPatch(
            dest,
            suggestion.day,
            suggestion.timeSlot,
            suggestion.startTime,
            suggestion.reason,
            'ai'
          );
        })
        .filter(Boolean);
    }
  } catch (error) {
    console.error('AI suggestion generation failed:', error);
  }

  // Fallback to rule-based
  return generateRuleBasedSuggestions(availableDestinations, existingItems, analysis, tripDays);
}

function generateRuleBasedSuggestions(
  availableDestinations: any[],
  existingItems: any[],
  analysis: TripAnalysis,
  tripDays: number
): SuggestionPatch[] {
  const suggestions: SuggestionPatch[] = [];
  const usedDestinations = new Set<number>();

  // Category mappings for smart suggestions
  const categoryForSlot: Record<string, string[]> = {
    morning: ['cafe', 'coffee', 'breakfast', 'bakery'],
    afternoon: ['museum', 'gallery', 'attraction', 'landmark', 'park'],
    evening: ['restaurant', 'dining', 'fine dining', 'bistro'],
    night: ['bar', 'cocktail', 'wine bar', 'lounge', 'pub'],
  };

  // After-activity mappings
  const afterActivitySuggestions: Record<string, string[]> = {
    restaurant: ['bar', 'cocktail', 'wine bar', 'lounge'],
    dining: ['bar', 'cocktail', 'wine bar', 'lounge'],
    museum: ['cafe', 'coffee', 'restaurant'],
    gallery: ['cafe', 'coffee', 'wine bar'],
    attraction: ['restaurant', 'cafe'],
  };

  for (const gap of analysis.gaps) {
    let targetCategories: string[] = categoryForSlot[gap.timeSlot] || [];

    // If there's a previous item, use context-aware suggestions
    if (gap.afterItem) {
      const afterCategory = (gap.afterItem.parsedNotes?.category || '').toLowerCase();
      for (const [key, catSuggestions] of Object.entries(afterActivitySuggestions)) {
        if (afterCategory.includes(key)) {
          targetCategories = catSuggestions;
          break;
        }
      }
    }

    // Find matching destinations
    for (const dest of availableDestinations) {
      if (usedDestinations.has(dest.id)) continue;

      const destCategory = (dest.category || '').toLowerCase();
      const matches = targetCategories.some(cat => destCategory.includes(cat));

      if (matches) {
        usedDestinations.add(dest.id);

        let reason = `Great ${dest.category} for ${gap.timeSlot}`;
        if (gap.afterItem) {
          reason = `Perfect to visit after ${gap.afterItem.title}`;
        }

        const suggestion = createSuggestionPatch(
          dest,
          gap.day,
          gap.timeSlot,
          getDefaultTimeForSlot(gap.timeSlot),
          reason,
          'rule'
        );
        suggestions.push(suggestion);

        break; // One suggestion per gap
      }
    }
  }

  return suggestions;
}

function getDefaultTimeForSlot(slot: string): string {
  switch (slot) {
    case 'morning': return '09:00';
    case 'afternoon': return '14:00';
    case 'evening': return '19:00';
    case 'night': return '21:30';
    default: return '12:00';
  }
}

function getOrderFromTimeSlot(slot: string): number {
  switch (slot) {
    case 'morning': return 0;
    case 'afternoon': return 1;
    case 'evening': return 2;
    case 'night': return 3;
    default: return 1;
  }
}

/**
 * Generate intelligent gap-filling suggestions using AI
 */
async function generateGapSuggestions(
  apiKey: string,
  city: string,
  availableDestinations: any[],
  gapContext: {
    afterActivity?: string;
    afterCategory?: string;
    beforeActivity?: string;
    beforeCategory?: string;
    gapMinutes: number;
    timeOfDay: string;
    suggestedTime: string;
    dayIndex?: number;
  }
): Promise<SuggestionPatch[]> {
  const dayIndex = gapContext.dayIndex ?? 0;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    // Filter destinations by relevant categories based on context
    const relevantDestinations = availableDestinations.slice(0, 40).map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      rating: d.rating,
      description: d.description?.slice(0, 100),
      tags: d.tags,
    }));

    const gapHours = Math.round(gapContext.gapMinutes / 60 * 10) / 10;

    const prompt = `You are a smart travel assistant helping fill a ${gapHours} hour gap in someone's ${city} itinerary.

CONTEXT:
- Previous activity: ${gapContext.afterActivity || 'None'} (${gapContext.afterCategory || 'unknown'})
- Next activity: ${gapContext.beforeActivity || 'None'} (${gapContext.beforeCategory || 'unknown'})
- Time slot: ${gapContext.timeOfDay} (around ${gapContext.suggestedTime})
- Available time: ${gapHours} hours

AVAILABLE PLACES IN ${city.toUpperCase()}:
${JSON.stringify(relevantDestinations, null, 2)}

TASK: Select 3-4 places that would PERFECTLY fit this gap. Consider:
1. What activity flows naturally after ${gapContext.afterActivity || 'the previous activity'}
2. What prepares them well for ${gapContext.beforeActivity || 'the next activity'}
3. The time of day (${gapContext.timeOfDay}) and typical activities
4. Time needed - places should be doable in ${gapHours} hours

For each suggestion, provide a SHORT reason (max 8 words) explaining why it's perfect for THIS specific gap.

Return ONLY valid JSON array:
[
  {"destinationId": 123, "reason": "Perfect coffee break after museum visit"},
  {"destinationId": 456, "reason": "Great pre-dinner cocktails spot"}
]

Return only JSON, no other text:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Convert to SuggestionPatch format with fillGap action
      return parsed
        .map((suggestion: any) => {
          const dest = availableDestinations.find(d => d.id === suggestion.destinationId);
          if (!dest) return null;

          const place = destinationToPlace(dest);

          const patch: SuggestionPatch = {
            id: generateSuggestionId(),
            label: `Add ${dest.name}`,
            patch: {
              type: 'fillGap',
              payload: {
                dayIndex,
                startTime: gapContext.suggestedTime,
                durationMinutes: Math.min(gapContext.gapMinutes, 90),
                place,
                blockType: dest.category?.toLowerCase().includes('restaurant') ? 'meal' : 'activity',
              } as FillGapPayload,
            },
            reason: suggestion.reason,
            meta: {
              source: 'ai',
              destination: place,
              day: dayIndex + 1,
              timeSlot: gapContext.timeOfDay,
              startTime: gapContext.suggestedTime,
              image: dest.image_thumbnail || dest.image,
            },
          };
          return patch;
        })
        .filter(Boolean);
    }
  } catch (error) {
    console.error('Gap suggestion generation failed:', error);
  }

  // Fallback: return top-rated places matching the time of day
  const categoryMap: Record<string, string[]> = {
    'Cafe': ['cafe', 'coffee', 'bakery'],
    'Restaurant': ['restaurant', 'dining', 'bistro'],
    'Bar': ['bar', 'cocktail', 'wine'],
    'Culture': ['museum', 'gallery', 'attraction'],
  };

  const targetCategories = categoryMap[gapContext.timeOfDay] || [];
  const fallbackSuggestions: SuggestionPatch[] = availableDestinations
    .filter(d => targetCategories.some(cat => d.category?.toLowerCase().includes(cat)))
    .slice(0, 4)
    .map(dest => {
      const place = destinationToPlace(dest);
      return {
        id: generateSuggestionId(),
        label: `Add ${dest.name}`,
        patch: {
          type: 'fillGap',
          payload: {
            dayIndex,
            startTime: gapContext.suggestedTime,
            durationMinutes: Math.min(gapContext.gapMinutes, 90),
            place,
            blockType: dest.category?.toLowerCase().includes('restaurant') ? 'meal' : 'activity',
          } as FillGapPayload,
        },
        reason: `Great ${dest.category?.toLowerCase()} for ${gapContext.timeOfDay.toLowerCase()}`,
        meta: {
          source: 'rule' as const,
          destination: place,
          day: dayIndex + 1,
          timeSlot: gapContext.timeOfDay,
          startTime: gapContext.suggestedTime,
          image: dest.image_thumbnail || dest.image,
        },
      };
    });

  return fallbackSuggestions;
}
