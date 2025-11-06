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
  brand?: string | null;
  architect?: string | null;
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
  // Google Places API enriched data (JSON fields from database)
  formatted_address?: string | null;
  international_phone_number?: string | null;
  user_ratings_total?: number | null;
  opening_hours_json?: any | null;
  reviews_json?: any | null;
  photos_json?: any | null;
  editorial_summary?: string | null;
  google_name?: string | null;
  place_types_json?: any | null;
  utc_offset?: number | null;
  vicinity?: string | null;
  timezone_id?: string | null;
  primary_photo_url?: string | null;
  photo_count?: number | null;
  // Geolocation fields
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number; // Added by nearby query
  distance_miles?: number; // Added by nearby query
  // Engagement fields
  views_count?: number;
  saves_count?: number;
  visits_count?: number;
  // Booking fields
  opentable_url?: string | null;
  resy_url?: string | null;
  booking_url?: string | null;
  reservation_phone?: string | null;
}
