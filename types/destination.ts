export interface Destination {
  id?: number; // Database primary key
  slug: string;
  name: string;
  city: string;
  country?: string;
  category: string;
  description?: string;
  content?: string;
  image?: string;
  michelin_stars?: number;
  crown?: boolean;
  // Enrichment fields
  place_id?: string | null;
  rating?: number | null;
  price_level?: number | null;
  opening_hours?: any | null;
  phone_number?: string | null;
  website?: string | null;
  google_maps_url?: string | null;
  instagram_handle?: string | null;
  instagram_url?: string | null;
  tags?: string[] | null;
  last_enriched_at?: string | null;
  save_count?: number;
  // Advanced enrichment fields (added by AI Chat API)
  photos?: any[] | null;
  currentWeather?: {
    temperature: number;
    weatherDescription: string;
    weatherCode: number;
    humidity?: number;
  } | null;
  weatherForecast?: any[] | null;
  nearbyEvents?: Array<{
    name: string;
    date?: string;
    venue?: string;
  }> | null;
  routeFromCityCenter?: any | null;
  walkingTimeFromCenter?: number | null;
  staticMapUrl?: string | null;
  currencyCode?: string | null;
  exchangeRateToUSD?: number | null;
}
