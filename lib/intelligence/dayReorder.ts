interface Day {
  city: string;
  hotel?: {
    name?: string;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

interface Trip {
  days: Day[];
  [key: string]: any;
}

/**
 * Reorder days by city name (alphabetically)
 * @param trip The trip to reorder
 * @returns Updated trip with days sorted by city
 */
export function reorderDaysByCity(trip: Trip): Trip {
  const sorted = [...trip.days].sort((a, b) => a.city.localeCompare(b.city));
  return { ...trip, days: sorted };
}

/**
 * Reorder days by hotel clusters (group days with the same hotel together)
 * @param trip The trip to reorder
 * @returns Updated trip with days sorted by hotel name
 */
export function reorderByHotelClusters(trip: Trip): Trip {
  const clusters = [...trip.days].sort((a, b) => {
    if (!a.hotel || !b.hotel) {
      // Days without hotels go to the end
      if (!a.hotel && !b.hotel) return 0;
      if (!a.hotel) return 1;
      if (!b.hotel) return -1;
    }

    const hotelA = a.hotel.name || '';
    const hotelB = b.hotel.name || '';

    return hotelA.localeCompare(hotelB);
  });

  return { ...trip, days: clusters };
}

