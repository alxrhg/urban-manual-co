import { haversineDistance } from './utils';

interface Place {
  lat: number;
  lng: number;
  [key: string]: any;
}

export function getNearbyPlaces(
  place: Place,
  list: Place[],
  maxDistanceKm: number = 2
): Place[] {
  return list.filter((p) => {
    const d = haversineDistance(place.lat, place.lng, p.lat, p.lng);
    return d <= maxDistanceKm;
  });
}

