interface Day {
  meals: {
    breakfast?: any;
    lunch?: any;
    dinner?: any;
  };
  activities: any[];
  hotel?: any;
  [key: string]: any;
}

interface Trip {
  days: Day[];
  [key: string]: any;
}

export function analyzeTrip(trip: Trip): string[] {
  const issues: string[] = [];

  trip.days.forEach((d, i) => {
    if (!d.meals.breakfast && !d.meals.lunch && !d.meals.dinner) {
      issues.push(`Day ${i + 1} has no meals.`);
    }
    if (!d.hotel) {
      issues.push(`Day ${i + 1} has no hotel assigned.`);
    }
    if (d.activities.length === 0) {
      issues.push(`Day ${i + 1} has no activities.`);
    }
  });

  return issues;
}

