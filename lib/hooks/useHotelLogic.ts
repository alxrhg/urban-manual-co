'use client';

import { useMemo, useRef } from 'react';
import type { EnrichedItineraryItem, TripDay } from './useTripEditor';

/**
 * Hotel item data extracted for stable comparison.
 * Only includes fields that affect hotel calculations.
 */
interface HotelSignatureItem {
  id: string;
  day: number;
  checkInDate?: string;
  checkOutDate?: string;
  breakfastIncluded?: boolean;
  hotelItemType?: string;
}

/**
 * Extracts a minimal, stable signature from hotel items.
 * This signature only changes when hotel-relevant data changes,
 * not when other items in the trip are modified.
 */
function createHotelSignature(hotels: EnrichedItineraryItem[]): string {
  const signatureItems: HotelSignatureItem[] = hotels.map(h => ({
    id: h.id,
    day: h.day,
    checkInDate: h.parsedNotes?.checkInDate,
    checkOutDate: h.parsedNotes?.checkOutDate,
    breakfastIncluded: h.parsedNotes?.breakfastIncluded,
    hotelItemType: h.parsedNotes?.hotelItemType,
  }));

  // Sort by check-in date and day for consistent ordering
  signatureItems.sort((a, b) => {
    if (a.checkInDate && b.checkInDate) {
      return a.checkInDate.localeCompare(b.checkInDate);
    }
    if (a.checkInDate) return -1;
    if (b.checkInDate) return 1;
    return a.day - b.day;
  });

  return JSON.stringify(signatureItems);
}

/**
 * Extracts hotel items from days array.
 * Includes new style hotels (no hotelItemType) and old style check_in items.
 */
function extractHotels(days: TripDay[]): EnrichedItineraryItem[] {
  return days.flatMap(d =>
    d.items.filter(item => {
      if (item.parsedNotes?.type !== 'hotel') return false;
      const hotelItemType = item.parsedNotes?.hotelItemType;
      // New style hotel (no hotelItemType) or old style check_in item
      return !hotelItemType || hotelItemType === 'check_in';
    })
  );
}

/**
 * Computes which hotel covers each night based on check-in/check-out dates.
 * For same-day checkout/checkin, the CHECK-IN hotel is the "stay" for that night.
 */
function computeNightlyHotelByDay(
  hotels: EnrichedItineraryItem[],
  tripStartDate: string
): Record<number, EnrichedItineraryItem | null> {
  const hotelMap: Record<number, EnrichedItineraryItem | null> = {};
  const tripStart = new Date(tripStartDate + 'T00:00:00');

  // Sort hotels by check-in date so later check-ins override earlier ones for same night
  const sortedHotels = [...hotels].sort((a, b) => {
    const aCheckIn = a.parsedNotes?.checkInDate;
    const bCheckIn = b.parsedNotes?.checkInDate;
    if (aCheckIn && bCheckIn) {
      return new Date(aCheckIn + 'T00:00:00').getTime() - new Date(bCheckIn + 'T00:00:00').getTime();
    }
    if (aCheckIn) return -1;
    if (bCheckIn) return 1;
    return a.day - b.day;
  });

  sortedHotels.forEach(hotel => {
    const checkInDate = hotel.parsedNotes?.checkInDate;
    const checkOutDate = hotel.parsedNotes?.checkOutDate;

    // Fallback to item's day number if no explicit checkInDate
    let checkInDayNum: number;
    if (checkInDate) {
      const inDate = new Date(checkInDate + 'T00:00:00');
      checkInDayNum = Math.floor((inDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      checkInDayNum = hotel.day;
    }

    let nights = 1;
    if (checkOutDate) {
      try {
        const outDate = new Date(checkOutDate + 'T00:00:00');
        const inDate = checkInDate ? new Date(checkInDate + 'T00:00:00') : tripStart;
        nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
      } catch {
        nights = 1;
      }
    }

    // Mark this hotel for the check-in day and each subsequent night
    for (let i = 0; i < nights; i++) {
      const nightDay = checkInDayNum + i;
      if (nightDay > 0) {
        hotelMap[nightDay] = hotel;
      }
    }
  });

  return hotelMap;
}

/**
 * Computes which hotel is checking out on each day.
 */
function computeCheckoutHotelByDay(
  hotels: EnrichedItineraryItem[],
  tripStartDate: string
): Record<number, EnrichedItineraryItem | null> {
  const checkoutMap: Record<number, EnrichedItineraryItem | null> = {};
  const tripStart = new Date(tripStartDate + 'T00:00:00');

  hotels.forEach(hotel => {
    const checkOutDate = hotel.parsedNotes?.checkOutDate;
    const checkInDate = hotel.parsedNotes?.checkInDate;

    let checkOutDayNum: number;
    if (checkOutDate) {
      const outDate = new Date(checkOutDate + 'T00:00:00');
      checkOutDayNum = Math.floor((outDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      // Fallback: checkout is the day after check-in (or day after hotel's day)
      const checkInDayNum = checkInDate
        ? Math.floor((new Date(checkInDate + 'T00:00:00').getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        : hotel.day;
      checkOutDayNum = checkInDayNum + 1;
    }

    if (checkOutDayNum > 0) {
      checkoutMap[checkOutDayNum] = hotel;
    }
  });

  return checkoutMap;
}

/**
 * Computes which hotel is checking in on each day.
 */
function computeCheckInHotelByDay(
  hotels: EnrichedItineraryItem[],
  tripStartDate: string
): Record<number, EnrichedItineraryItem | null> {
  const checkInMap: Record<number, EnrichedItineraryItem | null> = {};
  const tripStart = new Date(tripStartDate + 'T00:00:00');

  hotels.forEach(hotel => {
    const checkInDate = hotel.parsedNotes?.checkInDate;

    let checkInDayNum: number;
    if (checkInDate) {
      const inDate = new Date(checkInDate + 'T00:00:00');
      checkInDayNum = Math.floor((inDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      checkInDayNum = hotel.day;
    }

    if (checkInDayNum > 0) {
      checkInMap[checkInDayNum] = hotel;
    }
  });

  return checkInMap;
}

/**
 * Computes which hotel provides breakfast on each day.
 * Breakfast is served the morning AFTER staying at the hotel.
 */
function computeBreakfastHotelByDay(
  nightlyHotelByDay: Record<number, EnrichedItineraryItem | null>
): Record<number, EnrichedItineraryItem | null> {
  const breakfastMap: Record<number, EnrichedItineraryItem | null> = {};

  Object.entries(nightlyHotelByDay).forEach(([dayNum, hotel]) => {
    if (hotel && hotel.parsedNotes?.breakfastIncluded) {
      const nextDay = parseInt(dayNum) + 1;
      breakfastMap[nextDay] = hotel;
    }
  });

  return breakfastMap;
}

export interface HotelLogicResult {
  /** All hotel items from the itinerary */
  hotels: EnrichedItineraryItem[];
  /** Map of day number to the hotel for that night's stay */
  nightlyHotelByDay: Record<number, EnrichedItineraryItem | null>;
  /** Map of day number to the hotel checking out that day */
  checkoutHotelByDay: Record<number, EnrichedItineraryItem | null>;
  /** Map of day number to the hotel checking in that day */
  checkInHotelByDay: Record<number, EnrichedItineraryItem | null>;
  /** Map of day number to the hotel providing breakfast that morning */
  breakfastHotelByDay: Record<number, EnrichedItineraryItem | null>;
}

/**
 * useHotelLogic - Optimized memoization for hotel calculations
 *
 * This hook isolates all hotel-related calculations and uses signature-based
 * memoization to prevent unnecessary recalculations when non-hotel items change.
 *
 * Performance optimization:
 * - Only recalculates when hotel-specific data changes
 * - Uses a stable signature string to compare hotel data
 * - Caches intermediate results to avoid cascading recalculations
 *
 * @param days - Array of trip days from useTripEditor
 * @param tripStartDate - Trip start date in YYYY-MM-DD format
 */
export function useHotelLogic(
  days: TripDay[],
  tripStartDate: string | null | undefined
): HotelLogicResult {
  // Cache the previous hotels array for stable reference
  const hotelsCache = useRef<EnrichedItineraryItem[]>([]);
  const signatureCache = useRef<string>('');

  // Extract hotels and create a stable signature
  const hotels = useMemo(() => {
    const extractedHotels = extractHotels(days);
    const newSignature = createHotelSignature(extractedHotels);

    // Only update the reference if the signature changed
    // This prevents downstream memos from recalculating when
    // non-hotel items change in the days array
    if (newSignature !== signatureCache.current) {
      signatureCache.current = newSignature;
      hotelsCache.current = extractedHotels;
    }

    return hotelsCache.current;
  }, [days]);

  // All hotel maps depend on the stable hotels reference and trip start date
  // Since hotels only changes when hotel data changes, these won't recalculate
  // when non-hotel items are added/removed/reordered

  const nightlyHotelByDay = useMemo(() => {
    if (!tripStartDate) return {};
    return computeNightlyHotelByDay(hotels, tripStartDate);
  }, [hotels, tripStartDate]);

  const checkoutHotelByDay = useMemo(() => {
    if (!tripStartDate) return {};
    return computeCheckoutHotelByDay(hotels, tripStartDate);
  }, [hotels, tripStartDate]);

  const checkInHotelByDay = useMemo(() => {
    if (!tripStartDate) return {};
    return computeCheckInHotelByDay(hotels, tripStartDate);
  }, [hotels, tripStartDate]);

  const breakfastHotelByDay = useMemo(() => {
    return computeBreakfastHotelByDay(nightlyHotelByDay);
  }, [nightlyHotelByDay]);

  return {
    hotels,
    nightlyHotelByDay,
    checkoutHotelByDay,
    checkInHotelByDay,
    breakfastHotelByDay,
  };
}
