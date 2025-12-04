/**
 * Activity Generator Utilities
 *
 * Auto-generates itinerary items from flights and hotels.
 * Creates associated activities like check-in, breakfast, lounge access, etc.
 */

import type {
  Trip,
  ItineraryItem,
  ItineraryItemNotes,
  InsertItineraryItem,
} from '@/types/trip';
import { stringifyItineraryNotes } from '@/types/trip';
import { createServerClient } from '@/lib/supabase/server';
import { parseDateString } from '@/lib/utils/time-calculations';

// ============================================================================
// Extended Types for Activity Generation
// ============================================================================

/**
 * Extended Flight type with amenity information
 */
export interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  confirmationNumber?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
  notes?: string;
  // Amenity flags for activity generation
  lounge_access?: boolean;
  lounge_name?: string;
}

/**
 * Extended HotelBooking type with amenity information
 */
export interface HotelBooking {
  id: string;
  name: string;
  address?: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  roomType?: string;
  notes?: string;
  // Amenity flags for activity generation
  breakfast_included?: boolean;
  breakfast_time?: string; // Default breakfast time e.g., "07:30"
  has_pool?: boolean;
  pool_hours?: string; // e.g., "06:00-22:00"
  has_lounge?: boolean;
  lounge_name?: string;
  has_spa?: boolean;
  has_gym?: boolean;
}

/**
 * Generated itinerary item (before database insertion)
 */
export interface GeneratedItem extends Omit<InsertItineraryItem, 'trip_id'> {
  /** Reference to source flight/hotel ID */
  sourceId: string;
  /** Type of source: flight or hotel */
  sourceType: 'flight' | 'hotel';
  /** Category for grouping */
  category: 'flight' | 'airport_activity' | 'hotel_checkin' | 'hotel_checkout' | 'breakfast' | 'pool' | 'lounge' | 'overnight';
  /** Subtype for more specific categorization */
  subtype?: string;
}

// ============================================================================
// Flight Activity Generation
// ============================================================================

/**
 * Calculate the day number for a given date within a trip
 */
function calculateDayNumber(trip: Trip, dateStr: string): number {
  if (!trip.start_date) return 1;

  const startDate = parseDateString(trip.start_date);
  const targetDate = parseDateString(dateStr);

  if (!startDate || !targetDate) return 1;

  const diffMs = targetDate.getTime() - startDate.getTime();
  const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(1, daysDiff + 1);
}

/**
 * Generate itinerary items when a flight is added
 *
 * @param flight - Flight data with amenity flags
 * @param trip - Trip to add items to
 * @returns Array of generated itinerary items
 *
 * Generated items:
 * 1. Flight card item (category: 'flight', references flight.id)
 * 2. If lounge_access: Airport lounge activity (category: 'airport_activity', subtype: 'lounge')
 */
export function generateFlightActivities(flight: Flight, trip: Trip): GeneratedItem[] {
  const items: GeneratedItem[] = [];
  const dayNumber = calculateDayNumber(trip, flight.departureDate);

  // 1. Flight card item
  const flightNotes: ItineraryItemNotes = {
    type: 'flight',
    airline: flight.airline,
    flightNumber: flight.flightNumber,
    from: flight.from,
    to: flight.to,
    departureDate: flight.departureDate,
    departureTime: flight.departureTime,
    arrivalDate: flight.arrivalDate,
    arrivalTime: flight.arrivalTime,
    confirmationNumber: flight.confirmationNumber,
    terminal: flight.terminal,
    gate: flight.gate,
    seatNumber: flight.seatNumber,
    raw: flight.notes,
  };

  items.push({
    sourceId: flight.id,
    sourceType: 'flight',
    category: 'flight',
    day: dayNumber,
    order_index: 0, // Will be recalculated when inserting
    time: flight.departureTime,
    title: `${flight.airline} ${flight.flightNumber || 'Flight'}`,
    description: `${flight.from} → ${flight.to}`,
    notes: stringifyItineraryNotes(flightNotes),
  });

  // 2. Lounge access activity (if applicable)
  if (flight.lounge_access) {
    // Schedule lounge 2 hours before departure
    const loungeTime = subtractMinutesFromTime(flight.departureTime, 120);

    const loungeNotes: ItineraryItemNotes = {
      type: 'activity',
      activityType: 'other',
      duration: 90, // 1.5 hours default lounge time
      location: flight.lounge_name || 'Airport Lounge',
      linkedHotelId: flight.id, // Link to flight for reference
    };

    items.push({
      sourceId: flight.id,
      sourceType: 'flight',
      category: 'airport_activity',
      subtype: 'lounge',
      day: dayNumber,
      order_index: 0,
      time: loungeTime,
      title: flight.lounge_name || 'Airport Lounge',
      description: `${flight.from} - Pre-flight lounge access`,
      notes: stringifyItineraryNotes(loungeNotes),
    });
  }

  return items;
}

// ============================================================================
// Hotel Activity Generation
// ============================================================================

/**
 * Generate itinerary items when a hotel is added
 *
 * @param hotel - Hotel booking data with amenity flags
 * @param trip - Trip to add items to
 * @returns Array of generated itinerary items
 *
 * Generated items for each day of stay:
 * 1. Check-in on first day (if check-in day)
 * 2. Breakfast each morning (if breakfast_included)
 * 3. Checkout on last day
 * 4. Optional: Pool time suggestion (if has_pool, afternoon slot free)
 * 5. Lounge access (if has_lounge)
 * 6. Overnight card at end of each night (except checkout day)
 */
export function generateHotelActivities(hotel: HotelBooking, trip: Trip): GeneratedItem[] {
  const items: GeneratedItem[] = [];

  const checkInDay = calculateDayNumber(trip, hotel.checkInDate);
  const checkOutDay = calculateDayNumber(trip, hotel.checkOutDate);
  const totalNights = checkOutDay - checkInDay;

  // 1. Check-in item on first day
  const checkInNotes: ItineraryItemNotes = {
    type: 'hotel',
    name: hotel.name,
    address: hotel.address,
    checkInDate: hotel.checkInDate,
    checkInTime: hotel.checkInTime || '15:00',
    checkOutDate: hotel.checkOutDate,
    checkOutTime: hotel.checkOutTime || '11:00',
    hotelConfirmation: hotel.confirmationNumber,
    roomType: hotel.roomType,
    isHotel: true,
    breakfastIncluded: hotel.breakfast_included,
    raw: hotel.notes,
  };

  items.push({
    sourceId: hotel.id,
    sourceType: 'hotel',
    category: 'hotel_checkin',
    day: checkInDay,
    order_index: 0,
    time: hotel.checkInTime || '15:00',
    title: `Check in: ${hotel.name}`,
    description: hotel.address || '',
    notes: stringifyItineraryNotes(checkInNotes),
  });

  // Loop through each day of stay
  for (let nightIndex = 0; nightIndex < totalNights; nightIndex++) {
    const currentDay = checkInDay + nightIndex;
    const nextDay = currentDay + 1;
    const isLastNight = nightIndex === totalNights - 1;

    // 2. Breakfast each morning (except first morning which is before check-in)
    if (hotel.breakfast_included && nightIndex > 0) {
      const breakfastNotes: ItineraryItemNotes = {
        type: 'activity',
        activityType: 'breakfast-at-hotel',
        duration: 45,
        linkedHotelId: hotel.id,
        location: hotel.name,
      };

      items.push({
        sourceId: hotel.id,
        sourceType: 'hotel',
        category: 'breakfast',
        day: currentDay,
        order_index: 0,
        time: hotel.breakfast_time || '07:30',
        title: 'Breakfast at Hotel',
        description: hotel.name,
        notes: stringifyItineraryNotes(breakfastNotes),
      });
    }

    // Also add breakfast on checkout day morning
    if (hotel.breakfast_included && isLastNight) {
      const breakfastNotes: ItineraryItemNotes = {
        type: 'activity',
        activityType: 'breakfast-at-hotel',
        duration: 45,
        linkedHotelId: hotel.id,
        location: hotel.name,
      };

      items.push({
        sourceId: hotel.id,
        sourceType: 'hotel',
        category: 'breakfast',
        day: nextDay,
        order_index: 0,
        time: hotel.breakfast_time || '07:30',
        title: 'Breakfast at Hotel',
        description: hotel.name,
        notes: stringifyItineraryNotes(breakfastNotes),
      });
    }

    // 4. Pool time suggestion (if has_pool) - afternoon on each full day
    if (hotel.has_pool && !isLastNight) {
      const poolNotes: ItineraryItemNotes = {
        type: 'activity',
        activityType: 'pool',
        duration: 90,
        linkedHotelId: hotel.id,
        location: `${hotel.name} Pool`,
      };

      items.push({
        sourceId: hotel.id,
        sourceType: 'hotel',
        category: 'pool',
        subtype: 'suggestion',
        day: currentDay,
        order_index: 0,
        time: '15:00', // Default afternoon time
        title: 'Pool Time',
        description: `${hotel.name} - suggested`,
        notes: stringifyItineraryNotes(poolNotes),
      });
    }

    // 5. Lounge access (if has_lounge) - evening on each day
    if (hotel.has_lounge) {
      const loungeNotes: ItineraryItemNotes = {
        type: 'activity',
        activityType: 'other',
        duration: 60,
        linkedHotelId: hotel.id,
        location: hotel.lounge_name || `${hotel.name} Lounge`,
      };

      items.push({
        sourceId: hotel.id,
        sourceType: 'hotel',
        category: 'lounge',
        day: currentDay,
        order_index: 0,
        time: '18:00', // Default evening time
        title: hotel.lounge_name || 'Hotel Lounge',
        description: `${hotel.name} - Evening drinks`,
        notes: stringifyItineraryNotes(loungeNotes),
      });
    }

    // 6. Overnight card at end of each night (except checkout day)
    if (!isLastNight) {
      const overnightNotes: ItineraryItemNotes = {
        type: 'hotel',
        name: hotel.name,
        isHotel: true,
        linkedHotelId: hotel.id,
      };

      items.push({
        sourceId: hotel.id,
        sourceType: 'hotel',
        category: 'overnight',
        day: currentDay,
        order_index: 999, // End of day
        time: '23:00',
        title: `Overnight: ${hotel.name}`,
        description: `Night ${nightIndex + 1} of ${totalNights}`,
        notes: stringifyItineraryNotes(overnightNotes),
      });
    }
  }

  // 3. Checkout item on last day
  const checkoutNotes: ItineraryItemNotes = {
    type: 'activity',
    activityType: 'checkout-prep',
    duration: 30,
    linkedHotelId: hotel.id,
    location: hotel.name,
  };

  items.push({
    sourceId: hotel.id,
    sourceType: 'hotel',
    category: 'hotel_checkout',
    day: checkOutDay,
    order_index: 0,
    time: hotel.checkOutTime || '11:00',
    title: `Check out: ${hotel.name}`,
    description: hotel.address || '',
    notes: stringifyItineraryNotes(checkoutNotes),
  });

  return items;
}

// ============================================================================
// Sync Functions
// ============================================================================

/**
 * Sync activities when a flight is updated
 * Updates existing auto-generated items and creates/removes as needed
 *
 * @param flight - Updated flight data
 * @param existingItems - Current itinerary items for the trip
 * @returns Updated array of itinerary items (for optimistic update)
 */
export function syncFlightActivities(
  flight: Flight,
  existingItems: ItineraryItem[]
): ItineraryItem[] {
  // Find items linked to this flight
  const linkedItems = existingItems.filter((item) => {
    const notes = parseNotesForSync(item.notes);
    return (
      notes?.linkedHotelId === flight.id ||
      (notes?.type === 'flight' && notes?.flightNumber === flight.flightNumber)
    );
  });

  // Items not linked to this flight
  const otherItems = existingItems.filter((item) => !linkedItems.includes(item));

  // Generate new items based on updated flight
  const updatedLinkedItems = linkedItems.map((item) => {
    const notes = parseNotesForSync(item.notes);

    if (notes?.type === 'flight') {
      // Update flight card
      const updatedNotes: ItineraryItemNotes = {
        ...notes,
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        from: flight.from,
        to: flight.to,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime,
        arrivalDate: flight.arrivalDate,
        arrivalTime: flight.arrivalTime,
        confirmationNumber: flight.confirmationNumber,
        terminal: flight.terminal,
        gate: flight.gate,
        seatNumber: flight.seatNumber,
      };

      return {
        ...item,
        time: flight.departureTime,
        title: `${flight.airline} ${flight.flightNumber || 'Flight'}`,
        description: `${flight.from} → ${flight.to}`,
        notes: stringifyItineraryNotes(updatedNotes),
      };
    }

    if (notes?.activityType === 'other' && notes?.location?.includes('Lounge')) {
      // Update lounge activity time
      const loungeTime = subtractMinutesFromTime(flight.departureTime, 120);
      const updatedNotes: ItineraryItemNotes = {
        ...notes,
        location: flight.lounge_name || notes.location,
      };

      return {
        ...item,
        time: loungeTime,
        title: flight.lounge_name || item.title,
        description: `${flight.from} - Pre-flight lounge access`,
        notes: stringifyItineraryNotes(updatedNotes),
      };
    }

    return item;
  });

  // Handle lounge access changes
  const hasExistingLounge = linkedItems.some((item) => {
    const notes = parseNotesForSync(item.notes);
    return notes?.location?.toLowerCase().includes('lounge');
  });

  let finalLinkedItems = updatedLinkedItems;

  // If lounge access was added but no lounge item exists
  if (flight.lounge_access && !hasExistingLounge) {
    const loungeTime = subtractMinutesFromTime(flight.departureTime, 120);
    const loungeNotes: ItineraryItemNotes = {
      type: 'activity',
      activityType: 'other',
      duration: 90,
      location: flight.lounge_name || 'Airport Lounge',
      linkedHotelId: flight.id,
    };

    const newLoungeItem: ItineraryItem = {
      id: `pending-${Date.now()}`, // Temporary ID
      trip_id: existingItems[0]?.trip_id || '',
      destination_slug: null,
      day: linkedItems[0]?.day || 1,
      order_index: 0,
      time: loungeTime,
      title: flight.lounge_name || 'Airport Lounge',
      description: `${flight.from} - Pre-flight lounge access`,
      notes: stringifyItineraryNotes(loungeNotes),
      created_at: new Date().toISOString(),
    };

    finalLinkedItems = [...finalLinkedItems, newLoungeItem];
  }

  // If lounge access was removed, filter out lounge items
  if (!flight.lounge_access && hasExistingLounge) {
    finalLinkedItems = finalLinkedItems.filter((item) => {
      const notes = parseNotesForSync(item.notes);
      return !notes?.location?.toLowerCase().includes('lounge');
    });
  }

  return [...otherItems, ...finalLinkedItems];
}

/**
 * Sync activities when a hotel is updated
 * Updates existing auto-generated items and creates/removes as needed
 *
 * @param hotel - Updated hotel booking data
 * @param existingItems - Current itinerary items for the trip
 * @returns Updated array of itinerary items (for optimistic update)
 */
export function syncHotelActivities(
  hotel: HotelBooking,
  existingItems: ItineraryItem[]
): ItineraryItem[] {
  // Find items linked to this hotel
  const linkedItems = existingItems.filter((item) => {
    const notes = parseNotesForSync(item.notes);
    return notes?.linkedHotelId === hotel.id || notes?.name === hotel.name;
  });

  // Items not linked to this hotel
  const otherItems = existingItems.filter((item) => !linkedItems.includes(item));

  // Update linked items with new hotel data
  const updatedLinkedItems = linkedItems.map((item) => {
    const notes = parseNotesForSync(item.notes);

    // Update check-in item
    if (item.title.startsWith('Check in:')) {
      const updatedNotes: ItineraryItemNotes = {
        ...notes,
        name: hotel.name,
        address: hotel.address,
        checkInDate: hotel.checkInDate,
        checkInTime: hotel.checkInTime || '15:00',
        checkOutDate: hotel.checkOutDate,
        checkOutTime: hotel.checkOutTime || '11:00',
        hotelConfirmation: hotel.confirmationNumber,
        roomType: hotel.roomType,
        breakfastIncluded: hotel.breakfast_included,
      };

      return {
        ...item,
        time: hotel.checkInTime || '15:00',
        title: `Check in: ${hotel.name}`,
        description: hotel.address || '',
        notes: stringifyItineraryNotes(updatedNotes),
      };
    }

    // Update checkout item
    if (item.title.startsWith('Check out:')) {
      const updatedNotes: ItineraryItemNotes = {
        ...notes,
        location: hotel.name,
      };

      return {
        ...item,
        time: hotel.checkOutTime || '11:00',
        title: `Check out: ${hotel.name}`,
        description: hotel.address || '',
        notes: stringifyItineraryNotes(updatedNotes),
      };
    }

    // Update breakfast items
    if (notes?.activityType === 'breakfast-at-hotel') {
      const updatedNotes: ItineraryItemNotes = {
        ...notes,
        location: hotel.name,
      };

      return {
        ...item,
        time: hotel.breakfast_time || '07:30',
        description: hotel.name,
        notes: stringifyItineraryNotes(updatedNotes),
      };
    }

    // Update pool items
    if (notes?.activityType === 'pool') {
      const updatedNotes: ItineraryItemNotes = {
        ...notes,
        location: `${hotel.name} Pool`,
      };

      return {
        ...item,
        description: `${hotel.name} - suggested`,
        notes: stringifyItineraryNotes(updatedNotes),
      };
    }

    // Update overnight items
    if (item.title.startsWith('Overnight:')) {
      const updatedNotes: ItineraryItemNotes = {
        ...notes,
        name: hotel.name,
      };

      return {
        ...item,
        title: `Overnight: ${hotel.name}`,
        notes: stringifyItineraryNotes(updatedNotes),
      };
    }

    return item;
  });

  // Handle amenity changes (breakfast, pool, lounge)
  let finalItems = updatedLinkedItems;

  // Check for breakfast changes
  const hasExistingBreakfast = linkedItems.some((item) => {
    const notes = parseNotesForSync(item.notes);
    return notes?.activityType === 'breakfast-at-hotel';
  });

  if (hotel.breakfast_included && !hasExistingBreakfast) {
    // Add breakfast items - this would need trip context for proper day calculation
    // For sync, we'll flag that new items need to be created via database
  }

  if (!hotel.breakfast_included && hasExistingBreakfast) {
    // Remove breakfast items
    finalItems = finalItems.filter((item) => {
      const notes = parseNotesForSync(item.notes);
      return notes?.activityType !== 'breakfast-at-hotel';
    });
  }

  // Handle pool changes
  const hasExistingPool = linkedItems.some((item) => {
    const notes = parseNotesForSync(item.notes);
    return notes?.activityType === 'pool';
  });

  if (!hotel.has_pool && hasExistingPool) {
    finalItems = finalItems.filter((item) => {
      const notes = parseNotesForSync(item.notes);
      return notes?.activityType !== 'pool';
    });
  }

  // Handle lounge changes
  const hasExistingLounge = linkedItems.some((item) => {
    const notes = parseNotesForSync(item.notes);
    return notes?.location?.toLowerCase().includes('lounge') && notes?.linkedHotelId === hotel.id;
  });

  if (!hotel.has_lounge && hasExistingLounge) {
    finalItems = finalItems.filter((item) => {
      const notes = parseNotesForSync(item.notes);
      return !(notes?.location?.toLowerCase().includes('lounge') && notes?.linkedHotelId === hotel.id);
    });
  }

  return [...otherItems, ...finalItems];
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Remove orphaned activities when flight/hotel is deleted
 * Cleans up auto-generated items that reference non-existent flights/hotels
 *
 * @param tripId - Trip ID to clean up
 */
export async function cleanupOrphanedActivities(tripId: string): Promise<void> {
  const supabase = await createServerClient();

  // Fetch all itinerary items for the trip
  const { data: items, error: fetchError } = await supabase
    .from('itinerary_items')
    .select('id, notes')
    .eq('trip_id', tripId);

  if (fetchError) {
    throw new Error(`Failed to fetch itinerary items: ${fetchError.message}`);
  }

  if (!items || items.length === 0) {
    return;
  }

  // Collect all referenced flight/hotel IDs
  const referencedIds = new Set<string>();
  const itemsWithReferences: { id: string; linkedId: string }[] = [];

  for (const item of items) {
    const notes = parseNotesForSync(item.notes);
    if (notes?.linkedHotelId) {
      referencedIds.add(notes.linkedHotelId);
      itemsWithReferences.push({ id: item.id, linkedId: notes.linkedHotelId });
    }
  }

  if (referencedIds.size === 0) {
    return; // No linked items to check
  }

  // Check which referenced IDs still exist as itinerary items (flights/hotels)
  // Flights and hotels are stored as itinerary_items with type 'flight' or 'hotel'
  const { data: existingSourceItems, error: sourceError } = await supabase
    .from('itinerary_items')
    .select('id')
    .eq('trip_id', tripId)
    .in('id', Array.from(referencedIds));

  if (sourceError) {
    throw new Error(`Failed to check source items: ${sourceError.message}`);
  }

  const existingIds = new Set((existingSourceItems || []).map((item: { id: string }) => item.id));

  // Find orphaned items (references that no longer exist)
  const orphanedItemIds = itemsWithReferences
    .filter(({ linkedId }) => !existingIds.has(linkedId))
    .map(({ id }) => id);

  if (orphanedItemIds.length === 0) {
    return;
  }

  // Delete orphaned items
  const { error: deleteError } = await supabase
    .from('itinerary_items')
    .delete()
    .in('id', orphanedItemIds);

  if (deleteError) {
    throw new Error(`Failed to delete orphaned items: ${deleteError.message}`);
  }
}

/**
 * Get all auto-generated items for a specific flight
 *
 * @param flightId - Flight ID to get items for
 * @param items - All itinerary items
 * @returns Items generated from this flight
 */
export function getFlightGeneratedItems(
  flightId: string,
  items: ItineraryItem[]
): ItineraryItem[] {
  return items.filter((item) => {
    const notes = parseNotesForSync(item.notes);
    return notes?.linkedHotelId === flightId || item.id === flightId;
  });
}

/**
 * Get all auto-generated items for a specific hotel
 *
 * @param hotelId - Hotel booking ID to get items for
 * @param items - All itinerary items
 * @returns Items generated from this hotel
 */
export function getHotelGeneratedItems(
  hotelId: string,
  items: ItineraryItem[]
): ItineraryItem[] {
  return items.filter((item) => {
    const notes = parseNotesForSync(item.notes);
    return notes?.linkedHotelId === hotelId || notes?.name === hotelId || item.id === hotelId;
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse notes JSON for sync operations
 */
function parseNotesForSync(notes: string | null): ItineraryItemNotes | null {
  if (!notes) return null;
  try {
    return JSON.parse(notes);
  } catch {
    return null;
  }
}

/**
 * Subtract minutes from a time string
 * @param time - Time in HH:MM format
 * @param minutes - Minutes to subtract
 * @returns New time in HH:MM format
 */
function subtractMinutesFromTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins - minutes;

  // Handle day rollover (shouldn't happen for typical cases)
  const adjustedMinutes = totalMinutes < 0 ? totalMinutes + 24 * 60 : totalMinutes;

  const newHours = Math.floor(adjustedMinutes / 60) % 24;
  const newMins = adjustedMinutes % 60;

  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

/**
 * Add minutes to a time string
 * @param time - Time in HH:MM format
 * @param minutes - Minutes to add
 * @returns New time in HH:MM format
 */
function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;

  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;

  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}
