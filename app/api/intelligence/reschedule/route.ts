import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError, createNotFoundError } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { ItineraryItem, parseItineraryNotes, ItineraryItemNotes } from '@/types/trip';
import { isOutdoorCategory, isIndoorCategory } from '@/lib/trip-intelligence';
import { Destination } from '@/types/destination';

/**
 * Constraint types supported by the reschedule API
 */
type ConstraintType =
  | 'minimize_walking'
  | 'start_late'
  | 'skip_time'
  | 'weather'
  | 'custom';

interface RescheduleConstraint {
  type: ConstraintType;
  // For start_late: earliest start time (e.g., "10:00")
  earliestStart?: string;
  // For skip_time: which day and period to skip
  skipDay?: number;
  skipPeriod?: 'morning' | 'afternoon' | 'evening';
  // For weather: which day has bad weather
  weatherDay?: number;
  weatherCondition?: 'rain' | 'storm' | 'extreme_heat' | 'cold';
  // Raw text constraint for parsing
  raw?: string;
}

interface EnrichedItineraryItem extends ItineraryItem {
  destination?: Destination | null;
  parsedNotes: ItineraryItemNotes | null;
}

interface ItineraryChange {
  itemId: string;
  itemTitle: string;
  changeType: 'moved' | 'time_changed' | 'swapped';
  from: { day: number; time?: string | null; orderIndex: number };
  to: { day: number; time?: string | null; orderIndex: number };
  reason: string;
}

interface RescheduleResponse {
  original: EnrichedItineraryItem[];
  optimized: EnrichedItineraryItem[];
  changes: ItineraryChange[];
  summary: string;
  totalChangeCount: number;
}

/**
 * Parse time string to minutes from midnight
 */
function timeToMinutes(time: string | null | undefined): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Convert minutes from midnight to time string
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate Haversine distance between two points
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
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
 * Parse natural language constraint into structured format
 */
function parseConstraint(constraint: string | RescheduleConstraint): RescheduleConstraint {
  if (typeof constraint !== 'string') {
    return constraint;
  }

  const lowerConstraint = constraint.toLowerCase();

  // Minimize walking/distance
  if (
    lowerConstraint.includes('minimize walking') ||
    lowerConstraint.includes('less walking') ||
    lowerConstraint.includes('cluster') ||
    lowerConstraint.includes('neighborhood') ||
    lowerConstraint.includes('reduce travel')
  ) {
    return { type: 'minimize_walking', raw: constraint };
  }

  // Start late
  if (
    lowerConstraint.includes('start late') ||
    lowerConstraint.includes('sleep in') ||
    lowerConstraint.includes('late start')
  ) {
    // Extract time if mentioned (e.g., "start at 10am" or "after 11:00")
    const timeMatch = lowerConstraint.match(/(\d{1,2})(?::(\d{2}))?\s*(?:am|pm)?/);
    let earliestStart = '10:00'; // Default
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (lowerConstraint.includes('pm') && hours < 12) hours += 12;
      earliestStart = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return { type: 'start_late', earliestStart, raw: constraint };
  }

  // Skip time period
  const skipMatch = lowerConstraint.match(
    /skip\s+(?:day\s*)?(\d+)?\s*(morning|afternoon|evening)/i
  );
  if (skipMatch) {
    const skipDay = skipMatch[1] ? parseInt(skipMatch[1], 10) : undefined;
    const skipPeriod = skipMatch[2].toLowerCase() as 'morning' | 'afternoon' | 'evening';
    return { type: 'skip_time', skipDay, skipPeriod, raw: constraint };
  }

  // Weather-related
  const weatherDayMatch = lowerConstraint.match(
    /(?:rain|storm|bad weather|cold|hot|heat)\s+(?:on\s+)?(?:day\s*)?(\d+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  );
  if (weatherDayMatch || lowerConstraint.includes('rain') || lowerConstraint.includes('weather')) {
    let weatherDay: number | undefined;
    if (weatherDayMatch) {
      const dayPart = weatherDayMatch[1].toLowerCase();
      const dayNames: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 7,
      };
      weatherDay = dayNames[dayPart] || parseInt(dayPart, 10);
    }
    let weatherCondition: RescheduleConstraint['weatherCondition'] = 'rain';
    if (lowerConstraint.includes('storm')) weatherCondition = 'storm';
    if (lowerConstraint.includes('heat') || lowerConstraint.includes('hot')) weatherCondition = 'extreme_heat';
    if (lowerConstraint.includes('cold')) weatherCondition = 'cold';

    return { type: 'weather', weatherDay, weatherCondition, raw: constraint };
  }

  // Default to custom
  return { type: 'custom', raw: constraint };
}

/**
 * Check if an item should be preserved (not moved)
 */
function shouldPreserve(
  item: EnrichedItineraryItem,
  options: { preserveBookings: boolean; preserveMustDo: boolean }
): boolean {
  const notes = item.parsedNotes;
  if (!notes) return false;

  // Preserve booked reservations
  if (options.preserveBookings && notes.bookingStatus === 'booked') {
    return true;
  }

  // Preserve must-do items
  if (options.preserveMustDo && notes.priority === 'must-do') {
    return true;
  }

  // Preserve flights, trains, and hotels (travel logistics)
  if (notes.type === 'flight' || notes.type === 'train' || notes.type === 'hotel') {
    return true;
  }

  return false;
}

/**
 * Group items by day
 */
function groupByDay(items: EnrichedItineraryItem[]): Map<number, EnrichedItineraryItem[]> {
  const grouped = new Map<number, EnrichedItineraryItem[]>();
  for (const item of items) {
    const dayItems = grouped.get(item.day) || [];
    dayItems.push(item);
    grouped.set(item.day, dayItems);
  }
  return grouped;
}

/**
 * Optimize for minimal walking by clustering nearby items
 */
function optimizeMinimizeWalking(
  items: EnrichedItineraryItem[],
  preserveOptions: { preserveBookings: boolean; preserveMustDo: boolean }
): { optimized: EnrichedItineraryItem[]; changes: ItineraryChange[] } {
  const changes: ItineraryChange[] = [];
  const grouped = groupByDay(items);
  const optimized: EnrichedItineraryItem[] = [];

  for (const [day, dayItems] of grouped) {
    // Separate preserved and movable items
    const preserved = dayItems.filter((item) => shouldPreserve(item, preserveOptions));
    const movable = dayItems.filter((item) => !shouldPreserve(item, preserveOptions));

    // Get items with valid coordinates
    const withCoords = movable.filter(
      (item) =>
        (item.parsedNotes?.latitude && item.parsedNotes?.longitude) ||
        (item.destination?.latitude && item.destination?.longitude)
    );
    const withoutCoords = movable.filter(
      (item) =>
        !(item.parsedNotes?.latitude && item.parsedNotes?.longitude) &&
        !(item.destination?.latitude && item.destination?.longitude)
    );

    // Optimize route for items with coordinates using nearest neighbor
    if (withCoords.length > 1) {
      const visited = new Set<string>();
      const result: EnrichedItineraryItem[] = [];

      // Start with item that has earliest time, or first item
      const sortedByTime = [...withCoords].sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return timeToMinutes(a.time) - timeToMinutes(b.time);
      });

      let current = sortedByTime[0];
      result.push(current);
      visited.add(current.id);

      while (visited.size < withCoords.length) {
        const currentLat = current.parsedNotes?.latitude || current.destination?.latitude;
        const currentLon = current.parsedNotes?.longitude || current.destination?.longitude;

        let nearestDist = Infinity;
        let nearest: EnrichedItineraryItem | null = null;

        for (const item of withCoords) {
          if (visited.has(item.id)) continue;

          const itemLat = item.parsedNotes?.latitude || item.destination?.latitude;
          const itemLon = item.parsedNotes?.longitude || item.destination?.longitude;

          if (currentLat && currentLon && itemLat && itemLon) {
            const dist = haversineDistance(currentLat, currentLon, itemLat, itemLon);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = item;
            }
          }
        }

        if (nearest) {
          result.push(nearest);
          visited.add(nearest.id);
          current = nearest;
        }
      }

      // Track changes
      result.forEach((item, newIndex) => {
        const originalIndex = withCoords.findIndex((i) => i.id === item.id);
        if (originalIndex !== newIndex) {
          changes.push({
            itemId: item.id,
            itemTitle: item.title,
            changeType: 'moved',
            from: { day, time: item.time, orderIndex: originalIndex },
            to: { day, time: item.time, orderIndex: newIndex },
            reason: 'Reordered to minimize walking distance',
          });
        }
      });

      // Merge: preserved items stay at their order, optimized items fill gaps
      const allDayItems = [...preserved, ...result, ...withoutCoords].sort(
        (a, b) => {
          // Preserved items keep original order
          if (shouldPreserve(a, preserveOptions) && shouldPreserve(b, preserveOptions)) {
            return a.order_index - b.order_index;
          }
          // Preserved items come first if they have earlier times
          if (shouldPreserve(a, preserveOptions)) return -1;
          if (shouldPreserve(b, preserveOptions)) return 1;
          return 0;
        }
      );

      // Update order indices
      allDayItems.forEach((item, index) => {
        optimized.push({ ...item, order_index: index });
      });
    } else {
      // Not enough items to optimize, keep original order
      dayItems.forEach((item, index) => {
        optimized.push({ ...item, order_index: index });
      });
    }
  }

  return { optimized: optimized.sort((a, b) => a.day - b.day || a.order_index - b.order_index), changes };
}

/**
 * Optimize for late starts by pushing morning activities later
 */
function optimizeStartLate(
  items: EnrichedItineraryItem[],
  earliestStart: string,
  preserveOptions: { preserveBookings: boolean; preserveMustDo: boolean }
): { optimized: EnrichedItineraryItem[]; changes: ItineraryChange[] } {
  const changes: ItineraryChange[] = [];
  const earliestMinutes = timeToMinutes(earliestStart);
  const optimized: EnrichedItineraryItem[] = [];

  for (const item of items) {
    if (shouldPreserve(item, preserveOptions)) {
      optimized.push(item);
      continue;
    }

    const itemMinutes = timeToMinutes(item.time);
    if (item.time && itemMinutes < earliestMinutes) {
      // Push the time later
      const newTime = minutesToTime(earliestMinutes + (optimized.filter((i) => i.day === item.day).length * 15));
      changes.push({
        itemId: item.id,
        itemTitle: item.title,
        changeType: 'time_changed',
        from: { day: item.day, time: item.time, orderIndex: item.order_index },
        to: { day: item.day, time: newTime, orderIndex: item.order_index },
        reason: `Moved from ${item.time} to ${newTime} for later start`,
      });
      optimized.push({ ...item, time: newTime });
    } else {
      optimized.push(item);
    }
  }

  return { optimized, changes };
}

/**
 * Optimize by skipping a time period (move items to other days)
 */
function optimizeSkipTime(
  items: EnrichedItineraryItem[],
  skipDay: number | undefined,
  skipPeriod: 'morning' | 'afternoon' | 'evening',
  preserveOptions: { preserveBookings: boolean; preserveMustDo: boolean }
): { optimized: EnrichedItineraryItem[]; changes: ItineraryChange[] } {
  const changes: ItineraryChange[] = [];
  const optimized: EnrichedItineraryItem[] = [];

  // Define time ranges for periods
  const periodRanges: Record<string, { start: number; end: number }> = {
    morning: { start: 0, end: 12 * 60 }, // Before noon
    afternoon: { start: 12 * 60, end: 17 * 60 }, // 12pm - 5pm
    evening: { start: 17 * 60, end: 24 * 60 }, // After 5pm
  };

  const range = periodRanges[skipPeriod];
  const grouped = groupByDay(items);
  const allDays = Array.from(grouped.keys()).sort((a, b) => a - b);

  for (const item of items) {
    // Only process items on the skip day (or all days if not specified)
    const isTargetDay = skipDay === undefined || item.day === skipDay;
    const itemMinutes = timeToMinutes(item.time);
    const isInSkipPeriod = item.time && itemMinutes >= range.start && itemMinutes < range.end;

    if (isTargetDay && isInSkipPeriod && !shouldPreserve(item, preserveOptions)) {
      // Find an alternative day
      const targetDays = allDays.filter((d) => d !== item.day);
      if (targetDays.length > 0) {
        // Move to next available day, or previous if no next
        const nextDay = targetDays.find((d) => d > item.day) || targetDays[targetDays.length - 1];
        const dayItems = grouped.get(nextDay) || [];
        const newOrderIndex = dayItems.length;

        changes.push({
          itemId: item.id,
          itemTitle: item.title,
          changeType: 'moved',
          from: { day: item.day, time: item.time, orderIndex: item.order_index },
          to: { day: nextDay, time: item.time, orderIndex: newOrderIndex },
          reason: `Moved from Day ${item.day} ${skipPeriod} to Day ${nextDay}`,
        });

        optimized.push({ ...item, day: nextDay, order_index: newOrderIndex });
      } else {
        optimized.push(item);
      }
    } else {
      optimized.push(item);
    }
  }

  return { optimized: optimized.sort((a, b) => a.day - b.day || a.order_index - b.order_index), changes };
}

/**
 * Optimize for weather by swapping indoor/outdoor activities
 */
function optimizeForWeather(
  items: EnrichedItineraryItem[],
  weatherDay: number | undefined,
  preserveOptions: { preserveBookings: boolean; preserveMustDo: boolean }
): { optimized: EnrichedItineraryItem[]; changes: ItineraryChange[] } {
  const changes: ItineraryChange[] = [];
  const grouped = groupByDay(items);
  const allDays = Array.from(grouped.keys()).sort((a, b) => a - b);

  // If no specific day, assume all days might have weather issues
  const targetDays = weatherDay ? [weatherDay] : allDays;
  const safeDays = weatherDay ? allDays.filter((d) => d !== weatherDay) : [];

  const optimized = [...items];

  for (const badDay of targetDays) {
    const badDayItems = grouped.get(badDay) || [];

    for (const item of badDayItems) {
      if (shouldPreserve(item, preserveOptions)) continue;

      const category = item.parsedNotes?.category || item.destination?.category;
      const isOutdoor = isOutdoorCategory(category);

      if (isOutdoor && safeDays.length > 0) {
        // Find an indoor activity on a good day to swap with
        for (const goodDay of safeDays) {
          const goodDayItems = grouped.get(goodDay) || [];

          for (const swapCandidate of goodDayItems) {
            if (shouldPreserve(swapCandidate, preserveOptions)) continue;

            const swapCategory = swapCandidate.parsedNotes?.category || swapCandidate.destination?.category;
            const isIndoor = isIndoorCategory(swapCategory);

            if (isIndoor) {
              // Swap the items
              const itemIndex = optimized.findIndex((i) => i.id === item.id);
              const swapIndex = optimized.findIndex((i) => i.id === swapCandidate.id);

              if (itemIndex !== -1 && swapIndex !== -1) {
                // Swap days
                optimized[itemIndex] = { ...optimized[itemIndex], day: goodDay };
                optimized[swapIndex] = { ...optimized[swapIndex], day: badDay };

                changes.push({
                  itemId: item.id,
                  itemTitle: item.title,
                  changeType: 'swapped',
                  from: { day: badDay, time: item.time, orderIndex: item.order_index },
                  to: { day: goodDay, time: item.time, orderIndex: swapCandidate.order_index },
                  reason: `Outdoor activity moved to Day ${goodDay} (better weather)`,
                });

                changes.push({
                  itemId: swapCandidate.id,
                  itemTitle: swapCandidate.title,
                  changeType: 'swapped',
                  from: { day: goodDay, time: swapCandidate.time, orderIndex: swapCandidate.order_index },
                  to: { day: badDay, time: swapCandidate.time, orderIndex: item.order_index },
                  reason: `Indoor activity moved to Day ${badDay} (rain day)`,
                });

                // Update grouped data
                grouped.set(badDay, grouped.get(badDay)?.filter((i) => i.id !== item.id) || []);
                grouped.set(goodDay, grouped.get(goodDay)?.filter((i) => i.id !== swapCandidate.id) || []);
              }
              break; // Only swap one pair per outdoor item
            }
          }
        }
      }
    }
  }

  return { optimized: optimized.sort((a, b) => a.day - b.day || a.order_index - b.order_index), changes };
}

/**
 * Generate diff between original and optimized itineraries
 */
function diffItineraries(
  original: EnrichedItineraryItem[],
  optimized: EnrichedItineraryItem[]
): ItineraryChange[] {
  const changes: ItineraryChange[] = [];

  for (const optItem of optimized) {
    const origItem = original.find((o) => o.id === optItem.id);
    if (!origItem) continue;

    if (origItem.day !== optItem.day || origItem.order_index !== optItem.order_index) {
      changes.push({
        itemId: optItem.id,
        itemTitle: optItem.title,
        changeType: 'moved',
        from: { day: origItem.day, time: origItem.time, orderIndex: origItem.order_index },
        to: { day: optItem.day, time: optItem.time, orderIndex: optItem.order_index },
        reason: 'Optimized position',
      });
    } else if (origItem.time !== optItem.time) {
      changes.push({
        itemId: optItem.id,
        itemTitle: optItem.title,
        changeType: 'time_changed',
        from: { day: origItem.day, time: origItem.time, orderIndex: origItem.order_index },
        to: { day: optItem.day, time: optItem.time, orderIndex: optItem.order_index },
        reason: 'Time adjusted',
      });
    }
  }

  return changes;
}

/**
 * POST /api/intelligence/reschedule
 * Smart rescheduling of trip itinerary based on constraints
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw createValidationError('Authentication required');
  }

  const body = await request.json();
  const { tripId, constraint, preserveBookings = true, preserveMustDo = true } = body;

  if (!tripId) {
    throw createValidationError('tripId is required');
  }

  if (!constraint) {
    throw createValidationError('constraint is required');
  }

  // Fetch trip to verify ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    throw createNotFoundError('Trip');
  }

  // Fetch itinerary items
  const { data: items, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('day', { ascending: true })
    .order('order_index', { ascending: true });

  if (itemsError) {
    throw createValidationError('Failed to fetch itinerary items');
  }

  if (!items || items.length === 0) {
    return NextResponse.json({
      original: [],
      optimized: [],
      changes: [],
      summary: 'No items to reschedule',
      totalChangeCount: 0,
    });
  }

  // Fetch destination details for items with destination_slug
  const slugs = items
    .map((item) => item.destination_slug)
    .filter((slug): slug is string => Boolean(slug));

  const destinationsMap = new Map<string, Destination>();
  if (slugs.length > 0) {
    const { data: destinations } = await supabase
      .from('destinations')
      .select('slug, name, city, neighborhood, category, latitude, longitude, image, rating, price_level')
      .in('slug', slugs);

    destinations?.forEach((dest) => {
      destinationsMap.set(dest.slug, dest as Destination);
    });
  }

  // Enrich items with destination data and parse notes
  const enrichedItems: EnrichedItineraryItem[] = items.map((item) => ({
    ...item,
    destination: item.destination_slug ? destinationsMap.get(item.destination_slug) || null : null,
    parsedNotes: parseItineraryNotes(item.notes),
  }));

  // Parse the constraint
  const parsedConstraint = parseConstraint(constraint);
  const preserveOptions = { preserveBookings, preserveMustDo };

  // Apply optimization based on constraint type
  let result: { optimized: EnrichedItineraryItem[]; changes: ItineraryChange[] };
  let summary: string;

  switch (parsedConstraint.type) {
    case 'minimize_walking':
      result = optimizeMinimizeWalking(enrichedItems, preserveOptions);
      summary = `Reordered items to minimize walking distance. ${result.changes.length} items reordered.`;
      break;

    case 'start_late':
      result = optimizeStartLate(
        enrichedItems,
        parsedConstraint.earliestStart || '10:00',
        preserveOptions
      );
      summary = `Pushed morning activities to start after ${parsedConstraint.earliestStart || '10:00'}. ${result.changes.length} items adjusted.`;
      break;

    case 'skip_time':
      result = optimizeSkipTime(
        enrichedItems,
        parsedConstraint.skipDay,
        parsedConstraint.skipPeriod || 'afternoon',
        preserveOptions
      );
      summary = `Moved ${parsedConstraint.skipPeriod || 'afternoon'} activities${parsedConstraint.skipDay ? ` from Day ${parsedConstraint.skipDay}` : ''} to other days. ${result.changes.length} items moved.`;
      break;

    case 'weather':
      result = optimizeForWeather(enrichedItems, parsedConstraint.weatherDay, preserveOptions);
      summary = `Swapped outdoor activities to days with better weather. ${result.changes.length} items adjusted.`;
      break;

    default:
      // For custom constraints, try to intelligently apply multiple optimizations
      result = { optimized: enrichedItems, changes: [] };
      summary = 'No optimization applied for this constraint type.';
  }

  // Generate final diff (in case optimization functions missed any changes)
  const finalChanges = result.changes.length > 0 ? result.changes : diffItineraries(enrichedItems, result.optimized);

  const response: RescheduleResponse = {
    original: enrichedItems,
    optimized: result.optimized,
    changes: finalChanges,
    summary,
    totalChangeCount: finalChanges.length,
  };

  return NextResponse.json(response);
});
