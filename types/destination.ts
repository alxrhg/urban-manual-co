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
