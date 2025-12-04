import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { ItineraryItem, ItineraryItemNotes, ActivityType } from '@/types/trip';
import { TasteProfile } from '@/services/intelligence/taste-profile-evolution';
import { Destination } from '@/types/destination';

/**
 * Schedule gap representation
 */
interface ScheduleGap {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'night';
  afterItem?: {
    id: string;
    title: string;
    category?: string;
  };
}

/**
 * Hotel booking with amenity info for suggestions
 */
interface HotelBooking {
  id: string;
  name: string;
  checkInDate: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  amenities?: string[];
  hasPool?: boolean;
  hasSpa?: boolean;
  hasGym?: boolean;
  hasBreakfast?: boolean;
  latitude?: number;
  longitude?: number;
}

/**
 * Hotel activity types for reminders
 */
type HotelActivityType = 'pool' | 'spa' | 'gym' | 'breakfast' | 'checkout';

/**
 * Suggestion with destinations for a gap
 */
interface GapSuggestion {
  gap: ScheduleGap;
  destinations: Destination[];
  reason: string;
}

/**
 * Hotel activity reminder
 */
interface HotelReminder {
  activity: HotelActivityType;
  hotel: HotelBooking;
  suggestedTime: string;
  title: string;
}

/**
 * POST /api/intelligence/trip-suggestions
 * Analyze trip day and provide AI-powered suggestions
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  const body = await request.json();
  const {
    tripId,
    day,
    existingItems,
    hotels,
    userPreferences,
  }: {
    tripId: string;
    day: number;
    existingItems: ItineraryItem[];
    hotels: HotelBooking[];
    userPreferences?: TasteProfile;
  } = body;

  if (!tripId) {
    throw createValidationError('tripId is required');
  }

  if (typeof day !== 'number' || day < 1) {
    throw createValidationError('day must be a positive number');
  }

  // Get trip details for destination/city
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('destination')
    .eq('id', tripId)
    .single();

  if (tripError || !trip) {
    throw createValidationError('Trip not found');
  }

  const city = parseCity(trip.destination);
  if (!city) {
    return NextResponse.json({
      gaps: [],
      suggestions: [],
      hotelReminders: [],
      message: 'No destination set for trip',
    });
  }

  // Parse notes for existing items
  const itemsWithNotes = existingItems.map(item => ({
    ...item,
    parsedNotes: parseNotes(item.notes),
  }));

  // 1. Analyze schedule gaps
  const gaps = analyzeScheduleGaps(itemsWithNotes, day);

  // 2. Get suggestions for each gap
  const suggestions: GapSuggestion[] = [];

  if (gaps.length > 0) {
    // Get existing slugs to exclude
    const existingSlugs = new Set(
      itemsWithNotes.map(i => i.destination_slug).filter(Boolean)
    );

    // Query destinations matching the city
    const { data: destinations } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, description, micro_description, rating, price_level, image, image_thumbnail, latitude, longitude, tags')
      .ilike('city', `%${city}%`)
      .order('rating', { ascending: false })
      .limit(100);

    if (destinations && destinations.length > 0) {
      // Filter out already added destinations
      const availableDestinations = (destinations as Destination[]).filter(
        (d: Destination) => !existingSlugs.has(d.slug)
      );

      for (const gap of gaps) {
        const gapSuggestions = getSuggestionsForGap(
          gap,
          availableDestinations,
          itemsWithNotes,
          userPreferences
        );

        if (gapSuggestions.length > 0) {
          suggestions.push({
            gap,
            destinations: gapSuggestions,
            reason: getReasonForGap(gap),
          });
        }
      }
    }
  }

  // 3. Generate hotel amenity reminders
  const hotelReminders = generateHotelReminders(hotels, itemsWithNotes, day);

  return NextResponse.json({
    gaps,
    suggestions,
    hotelReminders,
  });
});

/**
 * Parse city from destination field (handles JSON array format)
 */
function parseCity(destination: string | null): string | null {
  if (!destination) return null;

  if (destination.startsWith('[')) {
    try {
      const parsed = JSON.parse(destination);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch {
      return destination;
    }
  }

  return destination;
}

/**
 * Safely parse item notes
 */
function parseNotes(notes: string | null): ItineraryItemNotes | null {
  if (!notes) return null;
  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
}

/**
 * Convert time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Convert minutes since midnight to time string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Get gap type based on time of day
 */
function getGapType(startMinutes: number, endMinutes: number): ScheduleGap['type'] {
  const midpoint = (startMinutes + endMinutes) / 2;

  if (midpoint < 11 * 60) return 'morning';
  if (midpoint >= 11 * 60 && midpoint < 14 * 60) return 'lunch';
  if (midpoint >= 14 * 60 && midpoint < 17 * 60) return 'afternoon';
  if (midpoint >= 17 * 60 && midpoint < 20 * 60) return 'dinner';
  if (midpoint >= 20 * 60 && midpoint < 22 * 60) return 'evening';
  return 'night';
}

/**
 * Analyze schedule to find gaps
 */
function analyzeScheduleGaps(
  items: Array<ItineraryItem & { parsedNotes: ItineraryItemNotes | null }>,
  day: number
): ScheduleGap[] {
  const gaps: ScheduleGap[] = [];

  // Filter items for the specific day and sort by time
  const dayItems = items
    .filter(item => item.day === day && item.time)
    .sort((a, b) => {
      const timeA = timeToMinutes(a.time!);
      const timeB = timeToMinutes(b.time!);
      return timeA - timeB;
    });

  if (dayItems.length === 0) {
    // Empty day - suggest filling the whole day
    gaps.push({
      startTime: '09:00',
      endTime: '21:00',
      durationMinutes: 720,
      type: 'morning',
    });
    return gaps;
  }

  // Check gap before first item (if after 10am)
  const firstItem = dayItems[0];
  const firstItemMinutes = timeToMinutes(firstItem.time!);
  if (firstItemMinutes > 10 * 60) {
    gaps.push({
      startTime: '09:00',
      endTime: firstItem.time!,
      durationMinutes: firstItemMinutes - 9 * 60,
      type: 'morning',
    });
  }

  // Check gaps between items
  for (let i = 0; i < dayItems.length - 1; i++) {
    const currentItem = dayItems[i];
    const nextItem = dayItems[i + 1];

    const currentTime = timeToMinutes(currentItem.time!);
    const currentDuration = currentItem.parsedNotes?.duration || 60; // Default 1 hour
    const currentEndTime = currentTime + currentDuration;

    const nextTime = timeToMinutes(nextItem.time!);
    const gapDuration = nextTime - currentEndTime;

    // Only consider gaps of 2+ hours as meaningful
    if (gapDuration >= 120) {
      const gapType = getGapType(currentEndTime, nextTime);
      gaps.push({
        startTime: minutesToTime(currentEndTime),
        endTime: nextItem.time!,
        durationMinutes: gapDuration,
        type: gapType,
        afterItem: {
          id: currentItem.id,
          title: currentItem.title,
          category: currentItem.parsedNotes?.category,
        },
      });
    }
  }

  // Check gap after last item (if before 9pm)
  const lastItem = dayItems[dayItems.length - 1];
  const lastItemMinutes = timeToMinutes(lastItem.time!);
  const lastItemDuration = lastItem.parsedNotes?.duration || 60;
  const lastItemEndMinutes = lastItemMinutes + lastItemDuration;

  if (lastItemEndMinutes < 21 * 60) {
    const gapType = getGapType(lastItemEndMinutes, 21 * 60);
    gaps.push({
      startTime: minutesToTime(lastItemEndMinutes),
      endTime: '21:00',
      durationMinutes: 21 * 60 - lastItemEndMinutes,
      type: gapType,
      afterItem: {
        id: lastItem.id,
        title: lastItem.title,
        category: lastItem.parsedNotes?.category,
      },
    });
  }

  return gaps;
}

/**
 * Get category mappings for gap types
 */
function getCategoriesForGapType(type: ScheduleGap['type']): string[] {
  switch (type) {
    case 'morning':
      return ['cafe', 'coffee', 'breakfast', 'bakery'];
    case 'lunch':
      return ['restaurant', 'cafe', 'bistro', 'lunch'];
    case 'afternoon':
      return ['museum', 'gallery', 'attraction', 'landmark', 'park', 'shopping'];
    case 'dinner':
      return ['restaurant', 'fine dining', 'bistro', 'dining'];
    case 'evening':
      return ['bar', 'cocktail', 'wine bar', 'lounge', 'restaurant'];
    case 'night':
      return ['bar', 'cocktail', 'nightlife', 'club', 'lounge'];
    default:
      return [];
  }
}

/**
 * Get suggestions for a specific gap
 */
function getSuggestionsForGap(
  gap: ScheduleGap,
  destinations: Destination[],
  existingItems: Array<ItineraryItem & { parsedNotes: ItineraryItemNotes | null }>,
  userPreferences?: TasteProfile
): Destination[] {
  const targetCategories = getCategoriesForGapType(gap.type);

  // Score and filter destinations
  const scored = destinations
    .map(dest => {
      let score = 0;
      const category = (dest.category || '').toLowerCase();

      // Category match
      const categoryMatch = targetCategories.some(cat => category.includes(cat));
      if (categoryMatch) score += 50;

      // Rating boost
      if (dest.rating) {
        score += dest.rating * 5;
      }

      // User preference boost
      if (userPreferences?.preferences?.categories) {
        const prefMatch = userPreferences.preferences.categories.find(
          c => category.includes(c.category.toLowerCase())
        );
        if (prefMatch) {
          score += prefMatch.weight * 20;
        }
      }

      // Proximity boost (if we have coordinates)
      if (gap.afterItem && dest.latitude && dest.longitude) {
        const prevItem = existingItems.find(i => i.id === gap.afterItem?.id);
        if (prevItem?.parsedNotes?.latitude && prevItem?.parsedNotes?.longitude) {
          const distance = calculateDistance(
            prevItem.parsedNotes.latitude,
            prevItem.parsedNotes.longitude,
            dest.latitude,
            dest.longitude
          );
          // Boost nearby places (within 2km)
          if (distance < 2) {
            score += 20 * (1 - distance / 2);
          }
        }
      }

      return { destination: dest, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Return top 3 suggestions
  return scored.slice(0, 3).map(item => item.destination);
}

/**
 * Calculate distance between two coordinates in km
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get human-readable reason for gap suggestion
 */
function getReasonForGap(gap: ScheduleGap): string {
  const hours = Math.floor(gap.durationMinutes / 60);
  const minutes = gap.durationMinutes % 60;
  const duration = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

  switch (gap.type) {
    case 'morning':
      return `You have ${duration} free in the morning`;
    case 'lunch':
      return `${duration} free around lunchtime`;
    case 'afternoon':
      return `${duration} free in the afternoon`;
    case 'dinner':
      return `${duration} free for dinner`;
    case 'evening':
      return `${duration} free in the evening`;
    case 'night':
      return `${duration} free at night`;
    default:
      return `${duration} free`;
  }
}

/**
 * Generate hotel amenity reminders
 */
function generateHotelReminders(
  hotels: HotelBooking[],
  items: Array<ItineraryItem & { parsedNotes: ItineraryItemNotes | null }>,
  day: number
): HotelReminder[] {
  const reminders: HotelReminder[] = [];

  // Find active hotel for this day (staying at hotel)
  const activeHotel = hotels.find(hotel => {
    if (!hotel.checkInDate) return false;
    // Simple date comparison - hotel is active if day is within stay
    return true; // For now, include all hotels; proper date logic can be added
  });

  if (!activeHotel) return reminders;

  // Check what activities are already scheduled
  const scheduledActivityTypes = new Set(
    items
      .filter(i => i.day === day && i.parsedNotes?.activityType)
      .map(i => i.parsedNotes!.activityType)
  );

  // Suggest pool time if hotel has pool and not scheduled
  if (activeHotel.hasPool && !scheduledActivityTypes.has('pool')) {
    reminders.push({
      activity: 'pool',
      hotel: activeHotel,
      suggestedTime: '15:00',
      title: `Pool time at ${activeHotel.name}`,
    });
  }

  // Suggest spa if hotel has spa and not scheduled
  if (activeHotel.hasSpa && !scheduledActivityTypes.has('spa')) {
    reminders.push({
      activity: 'spa',
      hotel: activeHotel,
      suggestedTime: '11:00',
      title: `Spa session at ${activeHotel.name}`,
    });
  }

  // Suggest gym if hotel has gym and not scheduled
  if (activeHotel.hasGym && !scheduledActivityTypes.has('gym')) {
    reminders.push({
      activity: 'gym',
      hotel: activeHotel,
      suggestedTime: '07:00',
      title: `Workout at ${activeHotel.name}`,
    });
  }

  // Suggest breakfast if included and not scheduled
  if (activeHotel.hasBreakfast && !scheduledActivityTypes.has('breakfast-at-hotel')) {
    const hasBreakfast = items.some(
      i =>
        i.day === day &&
        (i.parsedNotes?.type === 'breakfast' ||
          i.parsedNotes?.activityType === 'breakfast-at-hotel')
    );

    if (!hasBreakfast) {
      reminders.push({
        activity: 'breakfast',
        hotel: activeHotel,
        suggestedTime: '08:00',
        title: `Breakfast at ${activeHotel.name}`,
      });
    }
  }

  return reminders;
}
