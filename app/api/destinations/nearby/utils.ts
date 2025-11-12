import { createValidationError } from '@/lib/errors';

type NearbyResult = {
  slug: string;
  distanceMeters: number;
  durationMinutes: number;
};

const LATITUDE_BOUNDS = { min: -90, max: 90 } as const;
const LONGITUDE_BOUNDS = { min: -180, max: 180 } as const;
const MAX_RADIUS_KM = 50;
const DEFAULT_RADIUS_KM = 5;

function parseCoordinate(value: string | null, label: 'Latitude' | 'Longitude', bounds: { min: number; max: number }): number {
  if (value === null || value.trim() === '') {
    throw createValidationError(`${label} is required`);
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw createValidationError(`${label} must be a valid number`);
  }

  if (numericValue < bounds.min || numericValue > bounds.max) {
    throw createValidationError(`${label} must be between ${bounds.min} and ${bounds.max}`);
  }

  return numericValue;
}

export function parseLatitude(value: string | null): number {
  return parseCoordinate(value, 'Latitude', LATITUDE_BOUNDS);
}

export function parseLongitude(value: string | null): number {
  return parseCoordinate(value, 'Longitude', LONGITUDE_BOUNDS);
}

export function parseRadius(value: string | null): number {
  if (value === null || value.trim() === '') {
    return DEFAULT_RADIUS_KM;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw createValidationError('Radius must be a valid number');
  }

  if (numericValue < 0 || numericValue > MAX_RADIUS_KM) {
    throw createValidationError(`Radius must be between 0 and ${MAX_RADIUS_KM} kilometers`);
  }

  return numericValue;
}

export function filterNearbyResultsByRadius(results: NearbyResult[], radiusKm: number): NearbyResult[] {
  if (!Number.isFinite(radiusKm)) {
    return results;
  }

  const radiusMeters = radiusKm * 1000;

  return results.filter(result => result.distanceMeters <= radiusMeters);
}

export { DEFAULT_RADIUS_KM, MAX_RADIUS_KM };
