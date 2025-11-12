import { Destination } from './destination';

export interface TripPreferencePayload {
  text?: string;
  city?: string;
  category?: string;
  tags?: string[];
  budget?: string;
  priceLevel?: number;
  averagePrice?: number;
  groupSize?: number;
  days?: number;
}

export interface TripSearchCriteria {
  city?: string;
  category?: string;
  tags: string[];
  keywords: string[];
  mood: string[];
  maxPriceLevel?: number;
  minPriceLevel?: number;
  budgetText?: string;
  groupSize?: number;
  durationDays?: number;
}

export interface SmartTripPlanResponse {
  criteria: TripSearchCriteria;
  destinations: Array<
    Pick<
      Destination,
      | 'slug'
      | 'name'
      | 'city'
      | 'category'
      | 'description'
      | 'image'
      | 'primary_photo_url'
      | 'tags'
      | 'price_level'
      | 'rating'
    >
  >;
  itinerarySummary: string;
}

