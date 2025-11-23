import { plannerOps } from './plannerOps';

interface Place {
  [key: string]: any;
}

interface Trip {
  days: any[];
  [key: string]: any;
}

interface AIAction {
  type: 'setMeal' | 'addActivity' | 'assignHotel' | 'reorderDays';
  payload: {
    dayIndex?: number;
    mealType?: 'breakfast' | 'lunch' | 'dinner';
    place?: Place;
    hotel?: Place;
    newOrder?: number[];
  };
}

/**
 * Apply AI-generated actions to a trip
 * @param trip The trip to update
 * @param actions Array of AI actions to apply
 * @returns Updated trip with all actions applied
 */
export function applyAIActions(trip: Trip, actions: AIAction[]): Trip {
  let updated = { ...trip };

  for (const action of actions) {
    const { type, payload } = action;

    switch (type) {
      case 'setMeal':
        if (payload.dayIndex !== undefined && payload.mealType && payload.place) {
          updated = plannerOps.setMeal(
            updated,
            payload.dayIndex,
            payload.mealType,
            payload.place
          );
        }
        break;

      case 'addActivity':
        if (payload.dayIndex !== undefined && payload.place) {
          updated = plannerOps.addActivity(
            updated,
            payload.dayIndex,
            payload.place
          );
        }
        break;

      case 'assignHotel':
        if (payload.dayIndex !== undefined && payload.hotel) {
          updated = plannerOps.assignHotel(
            updated,
            payload.dayIndex,
            payload.hotel
          );
        }
        break;

      case 'reorderDays':
        if (payload.newOrder) {
          updated = plannerOps.reorderDays(updated, payload.newOrder);
        }
        break;
    }
  }

  return updated;
}

