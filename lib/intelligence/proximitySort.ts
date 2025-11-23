import { haversineDistance } from './utils';

interface Place {
  lat: number;
  lng: number;
  [key: string]: any;
}

interface Day {
  activities: Place[];
  hotel?: Place | null;
  [key: string]: any;
}

/**
 * Sort activities by proximity to the hotel
 * Activities closer to the hotel appear first
 * @param day The day with activities and hotel
 * @param hotel Optional hotel override (uses day.hotel if not provided)
 * @returns Sorted array of activities
 */
export function sortActivitiesByProximity(day: Day, hotel?: Place | null): Place[] {
  const hotelRef = hotel || day.hotel;

  if (!hotelRef || !hotelRef.lat || !hotelRef.lng) {
    return day.activities;
  }

  return [...day.activities].sort((a, b) => {
    // Skip activities without coordinates
    if (!a.lat || !a.lng) return 1;
    if (!b.lat || !b.lng) return -1;

    const da = haversineDistance(hotelRef.lat, hotelRef.lng, a.lat, a.lng);
    const db = haversineDistance(hotelRef.lat, hotelRef.lng, b.lat, b.lng);
    return da - db;
  });
}

