interface Place {
  [key: string]: any;
}

interface Day {
  meals: {
    breakfast?: Place | null;
    lunch?: Place | null;
    dinner?: Place | null;
  };
  activities: Place[];
  hotel?: Place | null;
  [key: string]: any;
}

interface Trip {
  days: Day[];
  [key: string]: any;
}

export const plannerOps = {
  setMeal(trip: Trip, dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner', place: Place): Trip {
    if (!trip.days[dayIndex]) {
      trip.days[dayIndex] = { meals: {}, activities: [] };
    }
    if (!trip.days[dayIndex].meals) {
      trip.days[dayIndex].meals = {};
    }
    trip.days[dayIndex].meals[mealType] = place;
    return trip;
  },

  addActivity(trip: Trip, dayIndex: number, place: Place): Trip {
    if (!trip.days[dayIndex]) {
      trip.days[dayIndex] = { meals: {}, activities: [] };
    }
    if (!trip.days[dayIndex].activities) {
      trip.days[dayIndex].activities = [];
    }
    trip.days[dayIndex].activities.push(place);
    return trip;
  },

  assignHotel(trip: Trip, dayIndex: number, hotel: Place): Trip {
    if (!trip.days[dayIndex]) {
      trip.days[dayIndex] = { meals: {}, activities: [] };
    }
    trip.days[dayIndex].hotel = hotel;
    return trip;
  },

  reorderDays(trip: Trip, newOrder: number[]): Trip {
    trip.days = newOrder.map((i) => trip.days[i]);
    return trip;
  },
};

