import { z } from 'zod';
import type { AvailabilityRequest } from '@/services/itinerary/timeline';

const availabilityResponseSchema = z.object({
  attractionId: z.string().optional(),
  destinationSlug: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  partySize: z.number().optional(),
  available: z.boolean(),
  supplier: z.string().optional(),
  seatsAvailable: z.number().optional(),
  currency: z.string().optional(),
  price: z.number().optional(),
  notes: z.string().optional(),
  fallback: z.boolean().optional(),
});

export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;

export interface AvailabilityFetchOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
}

function resolveBaseUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl;
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export async function fetchAvailability(
  requests: AvailabilityRequest[],
  options?: AvailabilityFetchOptions,
): Promise<AvailabilityResponse[]> {
  if (requests.length === 0) {
    return [];
  }

  const endpoint = new URL('/api/availability', resolveBaseUrl(options?.baseUrl));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Availability request failed (${response.status}): ${text}`);
    }

    const json = await response.json();
    const parsed = z
      .object({ availability: z.array(availabilityResponseSchema) })
      .safeParse(json);

    if (!parsed.success) {
      throw new Error('Invalid availability payload received from API');
    }

    return parsed.data.availability;
  } catch (error) {
    console.warn('Falling back to optimistic availability because fetch failed', error);
    return requests.map(request => ({
      ...request,
      available: true,
      supplier: 'fallback',
      fallback: true,
    }));
  }
}

export function summarizeAvailability(responses: AvailabilityResponse[]): string {
  if (responses.length === 0) {
    return 'No availability data';
  }
  const available = responses.filter(entry => entry.available);
  if (available.length === responses.length) {
    return 'All slots available';
  }
  if (available.length === 0) {
    return 'No availability';
  }
  return `${available.length} of ${responses.length} slots available`;
}
