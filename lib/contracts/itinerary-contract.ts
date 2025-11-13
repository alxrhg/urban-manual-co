import Ajv, { ErrorObject } from 'ajv';
import itinerarySchema from '@/contracts/itinerary.schema.json';

export type ItineraryOptimizationRequest = {
  destination_ids: number[];
  max_days?: number;
};

export type ItineraryPlace = {
  id: number;
  name: string;
  category?: string;
  lat?: number | null;
  lng?: number | null;
  score?: number | null;
  distance_km?: number | null;
  weight?: number | null;
  frequency?: number | null;
  reason?: string | null;
};

export type ItineraryDay = {
  day?: number;
  places: ItineraryPlace[];
};

export type ItineraryOptimizationResponse = {
  days: ItineraryDay[];
  total_distance_km: number;
  optimization_method: string;
  generated_at?: string;
};

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errors: string[] };

const ajv = new Ajv({ allErrors: true, useDefaults: true });

const requestSchema = {
  $ref: '#/$defs/ItineraryOptimizationRequest',
  $defs: itinerarySchema.$defs,
};

const responseSchema = {
  $ref: '#/$defs/ItineraryOptimizationResponse',
  $defs: itinerarySchema.$defs,
};

const requestValidator = ajv.compile<ItineraryOptimizationRequest>(requestSchema);
const responseValidator = ajv.compile<ItineraryOptimizationResponse>(responseSchema);

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors) return ['Unknown validation error'];
  return errors.map((error) => {
    const instancePath = error.instancePath || '(root)';
    return `${instancePath} ${error.message ?? 'is invalid'}`.trim();
  });
}

export function validateItineraryOptimizationRequest(
  payload: unknown
): ValidationResult<ItineraryOptimizationRequest> {
  if (requestValidator(payload)) {
    return { valid: true, data: payload };
  }

  return { valid: false, errors: formatErrors(requestValidator.errors) };
}

export function validateItineraryOptimizationResponse(
  payload: unknown
): ValidationResult<ItineraryOptimizationResponse> {
  if (responseValidator(payload)) {
    return { valid: true, data: payload };
  }

  return { valid: false, errors: formatErrors(responseValidator.errors) };
}
