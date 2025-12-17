'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ItineraryItem,
  InsertItineraryItem,
  ItineraryItemNotes,
  stringifyItineraryNotes,
  parseItineraryNotes,
} from '@/types/trip';

/**
 * Hotel booking data with sync-specific fields
 */
export interface HotelBooking {
  id: string;
  tripId: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  roomType?: string;
  breakfastIncluded?: boolean;
  hasLounge?: boolean;
  amenities?: string[];
  notes?: string;
}

/**
 * Input for creating a new hotel booking
 */
export interface CreateHotelBookingInput {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  checkInDate: string;
  checkInTime?: string;
  checkOutDate: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  roomType?: string;
  breakfastIncluded?: boolean;
  hasLounge?: boolean;
  amenities?: string[];
  notes?: string;
}

/**
 * Input for updating a hotel booking
 */
export interface UpdateHotelBookingInput {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  checkInDate?: string;
  checkInTime?: string;
  checkOutDate?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  roomType?: string;
  breakfastIncluded?: boolean;
  hasLounge?: boolean;
  amenities?: string[];
  notes?: string;
}

interface UseSyncHotelItemsReturn {
  hotelBookings: HotelBooking[];
  loading: boolean;
  error: string | null;
  createHotelBooking: (input: CreateHotelBookingInput) => Promise<HotelBooking | null>;
  updateHotelBooking: (hotelId: string, input: UpdateHotelBookingInput) => Promise<boolean>;
  deleteHotelBooking: (hotelId: string) => Promise<boolean>;
  refreshHotelBookings: () => Promise<void>;
}

/**
 * Calculate which day a date falls on relative to trip start date
 */
function calculateDayNumber(tripStartDate: string | null, targetDate: string): number {
  if (!tripStartDate) return 1;

  const start = new Date(tripStartDate);
  const target = new Date(targetDate);

  // Reset to midnight for accurate day calculation
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(1, diffDays + 1); // Day 1 is the start date
}

/**
 * Calculate the number of nights between two dates
 */
function calculateNights(checkInDate: string, checkOutDate: string): number {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  checkIn.setHours(0, 0, 0, 0);
  checkOut.setHours(0, 0, 0, 0);

  const diffTime = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Generate a unique ID for hotel bookings
 */
function generateHotelBookingId(): string {
  return `hotel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hotel-related itinerary item types
 */
type HotelItemType = 'check_in' | 'checkout' | 'breakfast' | 'overnight' | 'lounge';

/**
 * Hook to sync hotel bookings with itinerary items
 *
 * When a hotel is created:
 * - Creates check_in item on check-in day
 * - Creates breakfast items for each morning (if breakfast_included)
 * - Creates checkout item on checkout day
 * - Creates overnight items for each night
 *
 * When a hotel is updated:
 * - Updates times on check_in/checkout if times changed
 * - Adds/removes breakfast items if breakfast_included toggled
 * - Adds/removes lounge items if has_lounge toggled
 * - Updates amenity details on overnight cards
 *
 * When a hotel is deleted:
 * - Deletes all items with hotelBookingId = hotel.id
 */
export function useSyncHotelItems(tripId: string | null): UseSyncHotelItemsReturn {
  const { user } = useAuth();
  const [hotelBookings, setHotelBookings] = useState<HotelBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all hotel bookings for the trip from itinerary items
   */
  const fetchHotelBookings = useCallback(async () => {
    if (!tripId || !user) {
      setHotelBookings([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Fetch all itinerary items for this trip
      const { data: items, error: fetchError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId);

      if (fetchError) throw fetchError;

      // Find unique hotel bookings from check_in items (primary source)
      const hotelMap = new Map<string, HotelBooking>();

      (items || []).forEach((item: ItineraryItem) => {
        const notes = parseItineraryNotes(item.notes);
        if (notes?.hotelBookingId && notes?.hotelItemType === 'check_in') {
          hotelMap.set(notes.hotelBookingId, {
            id: notes.hotelBookingId,
            tripId,
            name: notes.name || item.title.replace('Check-in: ', ''),
            address: notes.address,
            phone: notes.phone,
            website: notes.website,
            checkInDate: notes.checkInDate || '',
            checkInTime: notes.checkInTime,
            checkOutDate: notes.checkOutDate || '',
            checkOutTime: notes.checkOutTime,
            confirmationNumber: notes.hotelConfirmation,
            roomType: notes.roomType,
            breakfastIncluded: notes.breakfastIncluded,
            hasLounge: notes.hasLounge,
            amenities: notes.amenities as string[] | undefined,
            notes: notes.notes,
          });
        }
      });

      setHotelBookings(Array.from(hotelMap.values()));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch hotel bookings';
      console.error('Error fetching hotel bookings:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tripId, user]);

  /**
   * Get trip start date for day calculation
   */
  const getTripStartDate = useCallback(async (): Promise<string | null> => {
    if (!tripId) return null;

    const supabase = createClient();
    const { data } = await supabase
      .from('trips')
      .select('start_date')
      .eq('id', tripId)
      .single();

    return data?.start_date || null;
  }, [tripId]);

  /**
   * Get next order index for a specific day
   */
  const getNextOrderIndex = useCallback(async (day: number): Promise<number> => {
    if (!tripId) return 0;

    const supabase = createClient();
    const { data } = await supabase
      .from('itinerary_items')
      .select('order_index')
      .eq('trip_id', tripId)
      .eq('day', day)
      .order('order_index', { ascending: false })
      .limit(1);

    return data?.[0]?.order_index != null ? data[0].order_index + 1 : 0;
  }, [tripId]);

  /**
   * Create a hotel-related itinerary item
   */
  const createHotelItem = useCallback(async (
    hotel: HotelBooking,
    itemType: HotelItemType,
    day: number,
    orderIndex: number,
    extraNotes?: Partial<ItineraryItemNotes>
  ): Promise<string | null> => {
    const supabase = createClient();

    let title: string;
    let description: string;
    let time: string | undefined;

    switch (itemType) {
      case 'check_in':
        title = `Check-in: ${hotel.name}`;
        description = hotel.roomType ? `Room: ${hotel.roomType}` : 'Hotel check-in';
        time = hotel.checkInTime || '15:00';
        break;
      case 'checkout':
        title = `Checkout: ${hotel.name}`;
        description = 'Hotel checkout';
        time = hotel.checkOutTime || '11:00';
        break;
      case 'breakfast':
        title = `Breakfast at ${hotel.name}`;
        description = 'Hotel breakfast included';
        time = '08:00';
        break;
      case 'overnight':
        title = `Overnight: ${hotel.name}`;
        description = hotel.amenities?.join(', ') || 'Hotel stay';
        time = undefined;
        break;
      case 'lounge':
        title = `Hotel Lounge: ${hotel.name}`;
        description = 'Access to hotel lounge';
        time = undefined;
        break;
      default:
        title = hotel.name;
        description = '';
    }

    const notes: ItineraryItemNotes = {
      type: 'hotel',
      hotelBookingId: hotel.id,
      hotelItemType: itemType,
      name: hotel.name,
      address: hotel.address,
      phone: hotel.phone,
      website: hotel.website,
      checkInDate: hotel.checkInDate,
      checkInTime: hotel.checkInTime,
      checkOutDate: hotel.checkOutDate,
      checkOutTime: hotel.checkOutTime,
      hotelConfirmation: hotel.confirmationNumber,
      roomType: hotel.roomType,
      breakfastIncluded: hotel.breakfastIncluded,
      hasLounge: hotel.hasLounge,
      amenities: hotel.amenities,
      notes: hotel.notes,
      ...extraNotes,
    };

    const insertData: InsertItineraryItem = {
      trip_id: hotel.tripId,
      day,
      order_index: orderIndex,
      time,
      title,
      description,
      notes: stringifyItineraryNotes(notes),
    };

    const { data, error } = await supabase
      .from('itinerary_items')
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  }, []);

  /**
   * Create all itinerary items for a hotel booking
   */
  const createAllHotelItems = useCallback(async (
    hotel: HotelBooking,
    tripStartDate: string | null
  ): Promise<void> => {
    const checkInDay = calculateDayNumber(tripStartDate, hotel.checkInDate);
    const checkOutDay = calculateDayNumber(tripStartDate, hotel.checkOutDate);
    const nights = calculateNights(hotel.checkInDate, hotel.checkOutDate);

    // Create check-in item
    const checkInOrderIndex = await getNextOrderIndex(checkInDay);
    await createHotelItem(hotel, 'check_in', checkInDay, checkInOrderIndex);

    // Create overnight items for each night
    for (let i = 0; i < nights; i++) {
      const overnightDay = checkInDay + i;
      const overnightOrderIndex = await getNextOrderIndex(overnightDay);
      await createHotelItem(hotel, 'overnight', overnightDay, overnightOrderIndex + 100); // High order to appear at end of day
    }

    // Create breakfast items for each morning (if breakfast included)
    if (hotel.breakfastIncluded) {
      for (let i = 1; i <= nights; i++) {
        const breakfastDay = checkInDay + i;
        // Breakfast should be early in the day
        await createHotelItem(hotel, 'breakfast', breakfastDay, 0);
      }
    }

    // Create lounge items for each day (if has lounge)
    if (hotel.hasLounge) {
      for (let i = 0; i < nights; i++) {
        const loungeDay = checkInDay + i;
        const loungeOrderIndex = await getNextOrderIndex(loungeDay);
        await createHotelItem(hotel, 'lounge', loungeDay, loungeOrderIndex + 50);
      }
    }

    // Create checkout item
    const checkOutOrderIndex = await getNextOrderIndex(checkOutDay);
    await createHotelItem(hotel, 'checkout', checkOutDay, checkOutOrderIndex);
  }, [getNextOrderIndex, createHotelItem]);

  /**
   * Delete all itinerary items for a hotel booking
   */
  const deleteAllHotelItems = useCallback(async (hotelBookingId: string): Promise<void> => {
    if (!tripId) return;

    const supabase = createClient();

    // Find all items linked to this hotel booking
    const { data: items } = await supabase
      .from('itinerary_items')
      .select('id, notes')
      .eq('trip_id', tripId);

    const hotelItems = (items || []).filter((item: { id: string; notes: string | null }) => {
      const notes = parseItineraryNotes(item.notes);
      return notes?.hotelBookingId === hotelBookingId;
    });

    if (hotelItems.length > 0) {
      await supabase
        .from('itinerary_items')
        .delete()
        .in('id', hotelItems.map((item: { id: string }) => item.id));
    }
  }, [tripId]);

  /**
   * Delete items of a specific type for a hotel booking
   */
  const deleteHotelItemsByType = useCallback(async (
    hotelBookingId: string,
    itemType: HotelItemType
  ): Promise<void> => {
    if (!tripId) return;

    const supabase = createClient();

    // Find all items of this type linked to this hotel booking
    const { data: items } = await supabase
      .from('itinerary_items')
      .select('id, notes')
      .eq('trip_id', tripId);

    const matchingItems = (items || []).filter((item: { id: string; notes: string | null }) => {
      const notes = parseItineraryNotes(item.notes);
      return notes?.hotelBookingId === hotelBookingId && notes?.hotelItemType === itemType;
    });

    if (matchingItems.length > 0) {
      await supabase
        .from('itinerary_items')
        .delete()
        .in('id', matchingItems.map((item: { id: string }) => item.id));
    }
  }, [tripId]);

  /**
   * Create a new hotel booking and sync to itinerary
   */
  const createHotelBooking = useCallback(async (
    input: CreateHotelBookingInput
  ): Promise<HotelBooking | null> => {
    if (!tripId || !user) {
      setError('Trip ID and user are required');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const hotelBookingId = generateHotelBookingId();
      const hotelBooking: HotelBooking = {
        id: hotelBookingId,
        tripId,
        ...input,
      };

      const tripStartDate = await getTripStartDate();

      // Create all hotel-related itinerary items
      await createAllHotelItems(hotelBooking, tripStartDate);

      // Refresh the hotel bookings list
      await fetchHotelBookings();

      return hotelBooking;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create hotel booking';
      console.error('Error creating hotel booking:', err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, user, getTripStartDate, createAllHotelItems, fetchHotelBookings]);

  /**
   * Update an existing hotel booking and sync changes to itinerary
   */
  const updateHotelBooking = useCallback(async (
    hotelId: string,
    input: UpdateHotelBookingInput
  ): Promise<boolean> => {
    if (!tripId || !user) {
      setError('Trip ID and user are required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Find the existing hotel check-in item (primary source)
      const { data: items } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId);

      const checkInItem = (items || []).find((item: ItineraryItem) => {
        const notes = parseItineraryNotes(item.notes);
        return notes?.hotelBookingId === hotelId && notes?.hotelItemType === 'check_in';
      });

      if (!checkInItem) {
        throw new Error('Hotel booking not found');
      }

      const existingNotes = parseItineraryNotes(checkInItem.notes) || {};
      const tripStartDate = await getTripStartDate();

      // Check if dates changed significantly
      const datesChanged =
        (input.checkInDate && input.checkInDate !== existingNotes.checkInDate) ||
        (input.checkOutDate && input.checkOutDate !== existingNotes.checkOutDate);

      // Check if breakfast/lounge toggles changed
      const breakfastToggled =
        input.breakfastIncluded !== undefined &&
        input.breakfastIncluded !== existingNotes.breakfastIncluded;
      const loungeToggled =
        input.hasLounge !== undefined &&
        input.hasLounge !== existingNotes.hasLounge;

      // Build updated hotel booking
      const updatedHotel: HotelBooking = {
        id: hotelId,
        tripId,
        name: input.name ?? existingNotes.name ?? '',
        address: input.address ?? existingNotes.address,
        phone: input.phone ?? existingNotes.phone,
        website: input.website ?? existingNotes.website,
        checkInDate: input.checkInDate ?? existingNotes.checkInDate ?? '',
        checkInTime: input.checkInTime ?? existingNotes.checkInTime,
        checkOutDate: input.checkOutDate ?? existingNotes.checkOutDate ?? '',
        checkOutTime: input.checkOutTime ?? existingNotes.checkOutTime,
        confirmationNumber: input.confirmationNumber ?? existingNotes.hotelConfirmation,
        roomType: input.roomType ?? existingNotes.roomType,
        breakfastIncluded: input.breakfastIncluded ?? existingNotes.breakfastIncluded,
        hasLounge: input.hasLounge ?? existingNotes.hasLounge,
        amenities: input.amenities ?? (existingNotes.amenities as string[] | undefined),
        notes: input.notes ?? existingNotes.notes,
      };

      if (datesChanged) {
        // If dates changed significantly, recreate all items
        await deleteAllHotelItems(hotelId);
        await createAllHotelItems(updatedHotel, tripStartDate);
      } else {
        // Update existing items with new info
        const hotelItems = (items || []).filter((item: ItineraryItem) => {
          const notes = parseItineraryNotes(item.notes);
          return notes?.hotelBookingId === hotelId;
        });

        for (const item of hotelItems) {
          const itemNotes = parseItineraryNotes(item.notes) || {};

          const updatedNotes: ItineraryItemNotes = {
            ...itemNotes,
            name: updatedHotel.name,
            address: updatedHotel.address,
            phone: updatedHotel.phone,
            website: updatedHotel.website,
            checkInTime: updatedHotel.checkInTime,
            checkOutTime: updatedHotel.checkOutTime,
            hotelConfirmation: updatedHotel.confirmationNumber,
            roomType: updatedHotel.roomType,
            breakfastIncluded: updatedHotel.breakfastIncluded,
            hasLounge: updatedHotel.hasLounge,
            amenities: updatedHotel.amenities,
            notes: updatedHotel.notes,
          };

          // Update title and time based on item type
          let updateData: Record<string, unknown> = {
            notes: stringifyItineraryNotes(updatedNotes),
          };

          if (itemNotes.hotelItemType === 'check_in') {
            updateData.title = `Check-in: ${updatedHotel.name}`;
            updateData.time = updatedHotel.checkInTime || '15:00';
            updateData.description = updatedHotel.roomType
              ? `Room: ${updatedHotel.roomType}`
              : 'Hotel check-in';
          } else if (itemNotes.hotelItemType === 'checkout') {
            updateData.title = `Checkout: ${updatedHotel.name}`;
            updateData.time = updatedHotel.checkOutTime || '11:00';
          } else if (itemNotes.hotelItemType === 'overnight') {
            updateData.title = `Overnight: ${updatedHotel.name}`;
            updateData.description = updatedHotel.amenities?.join(', ') || 'Hotel stay';
          } else if (itemNotes.hotelItemType === 'breakfast') {
            updateData.title = `Breakfast at ${updatedHotel.name}`;
          } else if (itemNotes.hotelItemType === 'lounge') {
            updateData.title = `Hotel Lounge: ${updatedHotel.name}`;
          }

          await supabase
            .from('itinerary_items')
            .update(updateData)
            .eq('id', item.id);
        }

        // Handle breakfast toggle
        if (breakfastToggled) {
          if (updatedHotel.breakfastIncluded) {
            // Add breakfast items
            const nights = calculateNights(updatedHotel.checkInDate, updatedHotel.checkOutDate);
            const checkInDay = calculateDayNumber(tripStartDate, updatedHotel.checkInDate);

            for (let i = 1; i <= nights; i++) {
              const breakfastDay = checkInDay + i;
              await createHotelItem(updatedHotel, 'breakfast', breakfastDay, 0);
            }
          } else {
            // Remove breakfast items
            await deleteHotelItemsByType(hotelId, 'breakfast');
          }
        }

        // Handle lounge toggle
        if (loungeToggled) {
          if (updatedHotel.hasLounge) {
            // Add lounge items
            const nights = calculateNights(updatedHotel.checkInDate, updatedHotel.checkOutDate);
            const checkInDay = calculateDayNumber(tripStartDate, updatedHotel.checkInDate);

            for (let i = 0; i < nights; i++) {
              const loungeDay = checkInDay + i;
              const loungeOrderIndex = await getNextOrderIndex(loungeDay);
              await createHotelItem(updatedHotel, 'lounge', loungeDay, loungeOrderIndex + 50);
            }
          } else {
            // Remove lounge items
            await deleteHotelItemsByType(hotelId, 'lounge');
          }
        }
      }

      // Refresh the hotel bookings list
      await fetchHotelBookings();

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update hotel booking';
      console.error('Error updating hotel booking:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [tripId, user, getTripStartDate, createAllHotelItems, deleteAllHotelItems, createHotelItem, deleteHotelItemsByType, getNextOrderIndex, fetchHotelBookings]);

  /**
   * Delete a hotel booking and its associated itinerary items
   */
  const deleteHotelBooking = useCallback(async (hotelId: string): Promise<boolean> => {
    if (!tripId || !user) {
      setError('Trip ID and user are required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      // Delete all hotel-related itinerary items
      await deleteAllHotelItems(hotelId);

      // Refresh the hotel bookings list
      await fetchHotelBookings();

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete hotel booking';
      console.error('Error deleting hotel booking:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [tripId, user, deleteAllHotelItems, fetchHotelBookings]);

  // Initial fetch when tripId changes
  useEffect(() => {
    fetchHotelBookings();
  }, [fetchHotelBookings]);

  return {
    hotelBookings,
    loading,
    error,
    createHotelBooking,
    updateHotelBooking,
    deleteHotelBooking,
    refreshHotelBookings: fetchHotelBookings,
  };
}
