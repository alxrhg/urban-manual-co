import { generateDayPlan } from './fillDay';

interface Place {
  city: string;
  categories: string[];
  [key: string]: any;
}

interface Day {
  city: string;
  meals: {
    breakfast?: any;
    lunch?: any;
    dinner?: any;
  };
  [key: string]: any;
}

interface Trip {
  days: Day[];
  [key: string]: any;
}

/**
 * Auto-fill meals for all days in a trip using curated and Google places
 * @param trip The trip to auto-fill
 * @param curated Array of curated places
 * @param google Array of Google places
 * @returns Updated trip with meals auto-filled
 */
export function autoFillTrip(trip: Trip, curated: Place[], google: Place[]): Trip {
  const updated = { ...trip };

  updated.days = trip.days.map((d) => {
    const filled = generateDayPlan(d, curated, google);

    return {
      ...d,
      meals: {
        ...d.meals,
        ...filled,
      },
    };
  });

  return updated;
}

