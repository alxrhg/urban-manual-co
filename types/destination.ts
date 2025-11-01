export interface Destination {
  slug: string;
  name: string;
  city: string;
  country?: string;
  category: string;
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
}
