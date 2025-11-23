import { recommendFromCurated, blendRecommendations } from './recommend';
import type { Recommendation } from './recommend';

interface Place {
  city: string;
  categories: string[];
  mealType?: string;
  [key: string]: any;
}

interface Day {
  city: string;
  [key: string]: any;
}

interface DayPlan {
  breakfast: Place | null;
  lunch: Place | null;
  dinner: Place | null;
}

export function generateDayPlan(
  day: Day,
  curated: Place[],
  google: Place[]
): DayPlan {
  const meals = ['breakfast', 'lunch', 'dinner'];
  const output: DayPlan = {
    breakfast: null,
    lunch: null,
    dinner: null,
  };

  for (const meal of meals) {
    const curatedMeal = recommendFromCurated(day.city, meal, curated);
    const googleMeal: Recommendation[] = google
      .filter((p) => p.mealType === meal)
      .map((p) => ({ ...p, source: 'google' as const, score: 0.65 }));

    const suggestions = blendRecommendations(curatedMeal, googleMeal);
    output[meal as keyof DayPlan] = suggestions[0] || null;
  }

  return output;
}

