import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createValidationError } from '@/lib/errors';
import { withCreditsCheck } from '@/lib/credits';

/**
 * POST /api/intelligence/smart-fill
 * Analyze existing trip items and suggest complementary places
 */
export const POST = withCreditsCheck(
  { operation: 'smart_suggestions' },
  async (request: NextRequest, _context, credits) => {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { city, existingItems, tripDays } = await request.json();

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

    if (apiKey) {
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
  }
);

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

async function generateAISuggestions(
  apiKey: string,
  city: string,
  availableDestinations: any[],
  existingItems: any[],
  analysis: TripAnalysis,
  tripDays: number
): Promise<any[]> {
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

      // Enrich with full destination data
      return parsed.map((suggestion: any) => {
        const dest = availableDestinations.find(d => d.id === suggestion.destinationId);
        if (!dest) return null;

        return {
          destination: dest,
          day: suggestion.day,
          timeSlot: suggestion.timeSlot,
          startTime: suggestion.startTime,
          reason: suggestion.reason,
          order: getOrderFromTimeSlot(suggestion.timeSlot),
        };
      }).filter(Boolean);
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
): any[] {
  const suggestions: any[] = [];
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
      for (const [key, suggestions] of Object.entries(afterActivitySuggestions)) {
        if (afterCategory.includes(key)) {
          targetCategories = suggestions;
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

        suggestions.push({
          destination: dest,
          day: gap.day,
          timeSlot: gap.timeSlot,
          startTime: getDefaultTimeForSlot(gap.timeSlot),
          reason,
          order: getOrderFromTimeSlot(gap.timeSlot),
        });

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
