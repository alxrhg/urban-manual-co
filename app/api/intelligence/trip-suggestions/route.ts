import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { estimateTransit, type TransitEstimate } from '@/lib/intelligence/transit';
import { tasteProfileEvolutionService, type TasteProfile } from '@/services/intelligence/taste-profile-evolution';
import { parseItineraryNotes, type ItineraryItemNotes } from '@/types/trip';

/**
 * Time slot definitions for schedule gap analysis
 */
type TimeSlot = 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';

interface ScheduleGap {
  timeSlot: TimeSlot;
  startTime: string;
  endTime: string;
  description: string;
  suggestedCategory: string[];
  afterItem?: ParsedItem;
}

interface ParsedItem {
  id: string;
  title: string;
  time: string | null;
  endTime?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  parsedNotes?: ItineraryItemNotes;
}

interface TripSuggestion {
  destination: {
    id: number;
    slug: string;
    name: string;
    category: string;
    image?: string;
    image_thumbnail?: string;
    rating?: number;
    price_level?: number;
    latitude?: number;
    longitude?: number;
  };
  reason: string;
  suggestedTime: string;
  timeSlot: TimeSlot;
  travelTime?: TransitEstimate;
  matchScore: number;
}

/**
 * POST /api/intelligence/trip-suggestions
 * Generate "Complete Your Day" suggestions for a trip day
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { tripId, day, existingItems } = await request.json();

  if (!tripId) {
    throw createValidationError('Trip ID is required');
  }

  if (!day || typeof day !== 'number') {
    throw createValidationError('Day number is required');
  }

  // Fetch trip to get destination city
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, destination, user_id')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw createValidationError('Trip not found');
  }

  // Parse city from trip destination (handles both legacy and JSON array formats)
  const city = extractCityFromTrip(trip.destination);

  if (!city) {
    throw createValidationError('Trip has no destination city');
  }

  // Parse existing items
  const parsedItems = parseExistingItems(existingItems || []);

  // Analyze schedule gaps for the day
  const gaps = analyzeScheduleGaps(parsedItems);

  // Get missing categories
  const existingCategories = getMissingCategories(parsedItems);

  // Get user taste profile for personalization
  const userId = user?.id || trip.user_id;
  const tasteProfile = userId ? await getUserTasteProfile(userId) : null;

  // Fetch available destinations in the city
  const { data: destinations, error: destError } = await supabase
    .from('destinations')
    .select('id, slug, name, category, rating, price_level, tags, description, latitude, longitude, image, image_thumbnail, micro_description')
    .ilike('city', `%${city}%`)
    .order('rating', { ascending: false })
    .limit(200);

  if (destError || !destinations || destinations.length === 0) {
    return NextResponse.json({
      suggestions: [],
      gaps,
      message: 'No destinations found for this city',
    });
  }

  // Exclude already added destinations
  const existingSlugs = new Set(
    parsedItems.map(item => item.parsedNotes?.slug).filter(Boolean)
  );
  const availableDestinations = destinations.filter(d => !existingSlugs.has(d.slug));

  if (availableDestinations.length === 0) {
    return NextResponse.json({
      suggestions: [],
      gaps,
      message: 'All available destinations have been added to your trip',
    });
  }

  // Generate suggestions
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  let suggestions: TripSuggestion[];

  if (apiKey && gaps.length > 0) {
    suggestions = await generateAISuggestions(
      apiKey,
      city,
      availableDestinations,
      parsedItems,
      gaps,
      existingCategories.missing,
      tasteProfile
    );
  } else {
    suggestions = generateRuleBasedSuggestions(
      availableDestinations,
      parsedItems,
      gaps,
      existingCategories.missing,
      tasteProfile
    );
  }

  // Calculate travel times from previous items
  suggestions = addTravelTimeToSuggestions(suggestions, parsedItems);

  return NextResponse.json({
    suggestions,
    gaps,
    analysis: {
      existingItemCount: parsedItems.length,
      gapsFound: gaps.length,
      missingCategories: existingCategories.missing,
      presentCategories: existingCategories.present,
    },
    count: suggestions.length,
  });
});

/**
 * Extract city from trip destination field
 */
function extractCityFromTrip(destination: string | null): string | null {
  if (!destination) return null;

  // Try to parse as JSON array first (multi-city format)
  if (destination.startsWith('[')) {
    try {
      const parsed = JSON.parse(destination);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0]; // Return first city
      }
    } catch {
      // Fall through to legacy format
    }
  }

  // Legacy format: single city string
  return destination.trim() || null;
}

/**
 * Parse existing items with their notes
 */
function parseExistingItems(items: any[]): ParsedItem[] {
  return items.map(item => {
    const parsedNotes = item.notes ? parseItineraryNotes(item.notes) : null;

    return {
      id: item.id,
      title: item.title,
      time: item.time,
      endTime: calculateEndTime(item.time, parsedNotes?.duration),
      category: parsedNotes?.category || item.category,
      latitude: parsedNotes?.latitude || item.latitude,
      longitude: parsedNotes?.longitude || item.longitude,
      parsedNotes: parsedNotes || undefined,
    };
  }).sort((a, b) => {
    // Sort by time
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}

/**
 * Calculate end time from start time and duration
 */
function calculateEndTime(startTime: string | null, durationMinutes?: number): string | undefined {
  if (!startTime || !durationMinutes) return undefined;

  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;

  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Analyze schedule gaps in the day
 */
function analyzeScheduleGaps(items: ParsedItem[]): ScheduleGap[] {
  const gaps: ScheduleGap[] = [];

  // Define time windows for each slot
  const timeWindows: Record<TimeSlot, { start: number; end: number; suggestedCategories: string[] }> = {
    morning: {
      start: 8,
      end: 11,
      suggestedCategories: ['cafe', 'coffee', 'breakfast', 'bakery']
    },
    lunch: {
      start: 12,
      end: 14,
      suggestedCategories: ['restaurant', 'cafe', 'bistro', 'lunch']
    },
    afternoon: {
      start: 14,
      end: 17,
      suggestedCategories: ['museum', 'gallery', 'attraction', 'landmark', 'park', 'shop']
    },
    evening: {
      start: 18,
      end: 21,
      suggestedCategories: ['restaurant', 'dining', 'fine dining', 'bistro']
    },
    night: {
      start: 21,
      end: 24,
      suggestedCategories: ['bar', 'cocktail', 'wine bar', 'lounge', 'pub', 'club']
    },
  };

  // Track which time slots are filled
  const filledSlots = new Set<TimeSlot>();

  for (const item of items) {
    if (!item.time) continue;

    const hour = parseInt(item.time.split(':')[0], 10);

    for (const [slot, window] of Object.entries(timeWindows)) {
      if (hour >= window.start && hour < window.end) {
        filledSlots.add(slot as TimeSlot);
        break;
      }
    }
  }

  // Identify gaps
  for (const [slot, window] of Object.entries(timeWindows)) {
    if (!filledSlots.has(slot as TimeSlot)) {
      // Find the previous item for context
      const slotStartHour = window.start;
      const previousItem = items
        .filter(item => {
          if (!item.time) return false;
          const hour = parseInt(item.time.split(':')[0], 10);
          return hour < slotStartHour;
        })
        .pop();

      gaps.push({
        timeSlot: slot as TimeSlot,
        startTime: `${String(window.start).padStart(2, '0')}:00`,
        endTime: `${String(window.end).padStart(2, '0')}:00`,
        description: getGapDescription(slot as TimeSlot, previousItem),
        suggestedCategory: window.suggestedCategories,
        afterItem: previousItem,
      });
    }
  }

  return gaps;
}

/**
 * Get human-readable description for a gap
 */
function getGapDescription(slot: TimeSlot, previousItem?: ParsedItem): string {
  const baseDescriptions: Record<TimeSlot, string> = {
    morning: 'Morning is free - perfect for breakfast or coffee',
    lunch: 'Lunch time is open - need a place to eat',
    afternoon: 'Afternoon is free - great for sightseeing or activities',
    evening: 'Dinner time is open - looking for a great restaurant',
    night: 'Evening is free - perfect for drinks or nightlife',
  };

  let description = baseDescriptions[slot];

  // Add context from previous item
  if (previousItem) {
    const prevCategory = previousItem.category?.toLowerCase() || '';

    if (prevCategory.includes('museum') || prevCategory.includes('gallery')) {
      if (slot === 'lunch') {
        description = 'After the museum, time for a relaxing lunch';
      } else if (slot === 'afternoon') {
        description = 'After the gallery visit, time for a coffee break';
      }
    } else if (prevCategory.includes('restaurant') || prevCategory.includes('dining')) {
      if (slot === 'night') {
        description = 'After dinner, perfect for drinks at a bar';
      }
    }
  }

  return description;
}

/**
 * Get missing and present categories
 */
function getMissingCategories(items: ParsedItem[]): { missing: string[]; present: string[] } {
  const essentialCategories = [
    { key: 'breakfast', keywords: ['cafe', 'coffee', 'breakfast', 'bakery'] },
    { key: 'lunch', keywords: ['restaurant', 'cafe', 'bistro', 'lunch'] },
    { key: 'dinner', keywords: ['restaurant', 'dining', 'dinner'] },
    { key: 'drinks', keywords: ['bar', 'cocktail', 'wine bar', 'pub'] },
    { key: 'activity', keywords: ['museum', 'gallery', 'attraction', 'landmark', 'park'] },
  ];

  const presentCategories = new Set<string>();
  const allCategories = items
    .map(item => item.category?.toLowerCase())
    .filter(Boolean) as string[];

  const present: string[] = [];
  const missing: string[] = [];

  for (const cat of essentialCategories) {
    const hasCategory = allCategories.some(c =>
      cat.keywords.some(keyword => c.includes(keyword))
    );

    if (hasCategory) {
      present.push(cat.key);
      presentCategories.add(cat.key);
    } else {
      missing.push(cat.key);
    }
  }

  return { missing, present };
}

/**
 * Get user taste profile
 */
async function getUserTasteProfile(userId: string): Promise<TasteProfile | null> {
  try {
    return await tasteProfileEvolutionService.getTasteProfile(userId);
  } catch (error) {
    console.error('Error getting taste profile:', error);
    return null;
  }
}

/**
 * Generate AI-powered suggestions
 */
async function generateAISuggestions(
  apiKey: string,
  city: string,
  availableDestinations: any[],
  existingItems: ParsedItem[],
  gaps: ScheduleGap[],
  missingCategories: string[],
  tasteProfile: TasteProfile | null
): Promise<TripSuggestion[]> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    // Prepare context
    const existingSummary = existingItems.map(item => ({
      time: item.time,
      title: item.title,
      category: item.category,
    }));

    const availableSummary = availableDestinations.slice(0, 80).map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      rating: d.rating,
      priceLevel: d.price_level,
      tags: d.tags?.slice(0, 3),
    }));

    const userPreferences = tasteProfile ? {
      topCategories: tasteProfile.preferences.categories.slice(0, 5).map(c => c.category),
      travelStyle: tasteProfile.preferences.travelStyle,
      priceRange: tasteProfile.preferences.priceRange,
    } : null;

    const prompt = `You are a travel planning assistant. Suggest destinations to fill gaps in this day's itinerary.

CITY: ${city}

CURRENT ITINERARY:
${JSON.stringify(existingSummary, null, 2)}

GAPS TO FILL:
${JSON.stringify(gaps.map(g => ({
  timeSlot: g.timeSlot,
  startTime: g.startTime,
  description: g.description,
  suggestedCategory: g.suggestedCategory,
  afterItem: g.afterItem ? { title: g.afterItem.title, category: g.afterItem.category } : null,
})), null, 2)}

MISSING CATEGORIES: ${missingCategories.join(', ') || 'None'}

${userPreferences ? `USER PREFERENCES:
- Favorite categories: ${userPreferences.topCategories.join(', ')}
- Travel style: ${userPreferences.travelStyle}
- Price range: ${userPreferences.priceRange.min}-${userPreferences.priceRange.max}` : ''}

AVAILABLE DESTINATIONS:
${JSON.stringify(availableSummary, null, 2)}

TASK: Select the best destinations to fill each gap. For each suggestion:
1. Match the time slot (morning→breakfast spots, lunch→restaurants, afternoon→attractions, evening→dinner, night→bars)
2. Consider what comes before (after museum → cafe, after dinner → bar)
3. ${userPreferences ? 'Match user preferences when possible' : 'Choose highly-rated options'}
4. Provide a compelling reason that feels personalized

Return ONLY valid JSON array (1-2 suggestions per gap, max 6 total):
[
  {
    "destinationId": 123,
    "timeSlot": "morning",
    "suggestedTime": "09:30",
    "reason": "Great breakfast spot to start your day, known for amazing pastries",
    "matchScore": 0.9
  }
]

Return only JSON, no other text:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      return parsed.map((suggestion: any) => {
        const dest = availableDestinations.find(d => d.id === suggestion.destinationId);
        if (!dest) return null;

        return {
          destination: {
            id: dest.id,
            slug: dest.slug,
            name: dest.name,
            category: dest.category,
            image: dest.image,
            image_thumbnail: dest.image_thumbnail,
            rating: dest.rating,
            price_level: dest.price_level,
            latitude: dest.latitude,
            longitude: dest.longitude,
          },
          reason: suggestion.reason,
          suggestedTime: suggestion.suggestedTime,
          timeSlot: suggestion.timeSlot,
          matchScore: suggestion.matchScore || 0.7,
        };
      }).filter(Boolean) as TripSuggestion[];
    }
  } catch (error) {
    console.error('AI suggestion generation failed:', error);
  }

  // Fallback to rule-based suggestions
  return generateRuleBasedSuggestions(
    availableDestinations,
    existingItems,
    gaps,
    missingCategories,
    tasteProfile
  );
}

/**
 * Generate rule-based suggestions when AI is unavailable
 */
function generateRuleBasedSuggestions(
  availableDestinations: any[],
  existingItems: ParsedItem[],
  gaps: ScheduleGap[],
  missingCategories: string[],
  tasteProfile: TasteProfile | null
): TripSuggestion[] {
  const suggestions: TripSuggestion[] = [];
  const usedDestinations = new Set<number>();

  // Category mappings for context-aware suggestions
  const afterActivitySuggestions: Record<string, string[]> = {
    restaurant: ['bar', 'cocktail', 'wine bar', 'lounge'],
    dining: ['bar', 'cocktail', 'wine bar', 'lounge'],
    museum: ['cafe', 'coffee', 'restaurant'],
    gallery: ['cafe', 'coffee', 'wine bar'],
    attraction: ['restaurant', 'cafe'],
  };

  for (const gap of gaps) {
    let targetCategories = [...gap.suggestedCategory];

    // If there's a previous item, use context-aware suggestions
    if (gap.afterItem) {
      const afterCategory = (gap.afterItem.category || '').toLowerCase();
      for (const [key, cats] of Object.entries(afterActivitySuggestions)) {
        if (afterCategory.includes(key)) {
          targetCategories = cats;
          break;
        }
      }
    }

    // Score and sort destinations
    const scoredDestinations = availableDestinations
      .filter(d => !usedDestinations.has(d.id))
      .map(dest => {
        const destCategory = (dest.category || '').toLowerCase();
        let score = 0;

        // Category match
        if (targetCategories.some(cat => destCategory.includes(cat))) {
          score += 0.4;
        }

        // Rating boost
        if (dest.rating) {
          score += (dest.rating / 5) * 0.2;
        }

        // User preference match
        if (tasteProfile) {
          const userCategories = tasteProfile.preferences.categories.map(c => c.category.toLowerCase());
          if (userCategories.some(c => destCategory.includes(c))) {
            score += 0.2;
          }

          // Price match
          const priceRange = tasteProfile.preferences.priceRange;
          if (dest.price_level && dest.price_level >= priceRange.min && dest.price_level <= priceRange.max) {
            score += 0.1;
          }
        }

        return { dest, score };
      })
      .filter(d => d.score > 0.3)
      .sort((a, b) => b.score - a.score);

    // Take top match for this gap
    if (scoredDestinations.length > 0) {
      const best = scoredDestinations[0];
      usedDestinations.add(best.dest.id);

      let reason = `Great ${best.dest.category} for ${gap.timeSlot}`;
      if (gap.afterItem) {
        reason = `Perfect to visit after ${gap.afterItem.title}`;
      }
      if (best.dest.rating && best.dest.rating >= 4.5) {
        reason = `Highly-rated ${best.dest.category} - ${reason.toLowerCase()}`;
      }

      suggestions.push({
        destination: {
          id: best.dest.id,
          slug: best.dest.slug,
          name: best.dest.name,
          category: best.dest.category,
          image: best.dest.image,
          image_thumbnail: best.dest.image_thumbnail,
          rating: best.dest.rating,
          price_level: best.dest.price_level,
          latitude: best.dest.latitude,
          longitude: best.dest.longitude,
        },
        reason,
        suggestedTime: getDefaultTimeForSlot(gap.timeSlot),
        timeSlot: gap.timeSlot,
        matchScore: best.score,
      });
    }
  }

  return suggestions;
}

/**
 * Get default time for a time slot
 */
function getDefaultTimeForSlot(slot: TimeSlot): string {
  switch (slot) {
    case 'morning': return '09:00';
    case 'lunch': return '12:30';
    case 'afternoon': return '15:00';
    case 'evening': return '19:30';
    case 'night': return '21:30';
    default: return '12:00';
  }
}

/**
 * Add travel time calculations to suggestions
 */
function addTravelTimeToSuggestions(
  suggestions: TripSuggestion[],
  existingItems: ParsedItem[]
): TripSuggestion[] {
  return suggestions.map(suggestion => {
    // Find the item that would come before this suggestion
    const suggestedHour = parseInt(suggestion.suggestedTime.split(':')[0], 10);
    const previousItem = existingItems
      .filter(item => {
        if (!item.time) return false;
        const hour = parseInt(item.time.split(':')[0], 10);
        return hour < suggestedHour;
      })
      .pop();

    // Calculate travel time if we have coordinates
    if (
      previousItem?.latitude &&
      previousItem?.longitude &&
      suggestion.destination.latitude &&
      suggestion.destination.longitude
    ) {
      const travelTime = estimateTransit(
        { lat: previousItem.latitude, lng: previousItem.longitude },
        { lat: suggestion.destination.latitude, lng: suggestion.destination.longitude }
      );

      return {
        ...suggestion,
        travelTime,
      };
    }

    return suggestion;
  });
}
