
export interface Trip {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'planning' | 'upcoming' | 'ongoing' | 'completed';
  is_public: boolean;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  itinerary: ItineraryItem[];
}

export interface TripSummary extends Omit<Trip, 'itinerary'> {}

export interface ItineraryItem {
  id: string;
  trip_id: string;
  destination_slug: string | null;
  day: number;
  order_index: number;
  time: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  created_at: string;
  destination?: {
    name: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}
