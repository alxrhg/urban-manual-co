import { useItinerary } from '@/contexts/ItineraryContext';

export function useTripsShell() {
  return useItinerary();
}
