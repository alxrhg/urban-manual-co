export type SeasonFilterValue = 'spring' | 'summer' | 'fall' | 'winter';

export type BudgetFilterValue = 'budget' | 'midrange' | 'premium';

export interface AdvancedFilters {
  city?: string;
  category?: string;
  michelin?: boolean;
  crown?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
  nearMe?: boolean;
  nearMeRadius?: number;
  season?: SeasonFilterValue;
  budget?: BudgetFilterValue;
}
