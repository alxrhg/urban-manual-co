import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface TripRecord {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status?: string | null;
  updated_at: string;
  budget?: number | null;
}

export type TripSummary = TripRecord;

export interface TripDetailResponse {
  trip: TripRecord;
  items: ItineraryItem[];
}

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
}

export interface CreateTripPayload {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string | null;
  status?: string;
  budget?: number | null;
}

export interface UpdateTripPayload extends CreateTripPayload {
  tripId: string;
}

export interface BatchUpdateItineraryPayload {
  tripId: string;
  items: Array<{
    destination_slug?: string | null;
    day: number;
    order_index: number;
    time?: string | null;
    title: string;
    description?: string | null;
    notes?: unknown;
  }>;
}

export interface AddItineraryItemPayload {
  tripId: string;
  title: string;
  description?: string | null;
  destinationSlug?: string | null;
  day?: number;
  orderIndex?: number;
  time?: string | null;
  notes?: unknown;
}

const TRIPS_QUERY_KEY = ['trips'] as const;
const tripKey = (tripId: string) => [...TRIPS_QUERY_KEY, tripId];

async function fetchJson<T>(
  url: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, headers, ...rest } = options ?? {};
  const init: RequestInit = {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: 'same-origin',
  };

  const response = await fetch(url, init);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = (isJson ? await response.json().catch(() => null) : null) as unknown;

  if (!response.ok) {
    const errorPayload = (data ?? {}) as { error?: string; message?: string };
    const message = errorPayload.error ?? errorPayload.message ?? response.statusText;
    throw new Error(message || 'Request failed');
  }

  return (data as T) ?? ({} as T);
}

export function useTripsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: TRIPS_QUERY_KEY,
    queryFn: async () => {
      const data = await fetchJson<{ trips: TripSummary[] }>('/api/trips');
      return data.trips;
    },
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useTripQuery(tripId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tripId ? tripKey(tripId) : [...TRIPS_QUERY_KEY, 'detail'],
    queryFn: async () => {
      if (!tripId) {
        throw new Error('Trip ID is required');
      }
      return fetchJson<TripDetailResponse>(`/api/trips/${tripId}`);
    },
    enabled: (!!tripId && (options?.enabled ?? true)) || false,
  });
}

export function useCreateTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTripPayload) => {
      const { trip } = await fetchJson<{ trip: TripRecord }>('/api/trips', {
        method: 'POST',
        json: payload,
      });
      return trip;
    },
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
      if (trip?.id) {
        queryClient.setQueryData(tripKey(trip.id), { trip, items: [] });
      }
    },
  });
}

export function useUpdateTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, ...payload }: UpdateTripPayload) => {
      const { trip } = await fetchJson<{ trip: TripRecord }>(`/api/trips/${tripId}`, {
        method: 'PUT',
        json: payload,
      });
      return trip;
    },
    onSuccess: (trip) => {
      if (trip?.id) {
        queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: tripKey(trip.id) });
      }
    },
  });
}

export function useBatchUpdateItineraryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tripId, items }: BatchUpdateItineraryPayload) => {
      const { items: updated } = await fetchJson<{ items: ItineraryItem[] }>(
        `/api/trips/${tripId}/items`,
        {
          method: 'PUT',
          json: { items },
        }
      );
      return { tripId, items: updated };
    },
    onSuccess: ({ tripId, items }) => {
      queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
      queryClient.setQueryData(tripKey(tripId), (previous) => {
        if (!previous || typeof previous !== 'object') {
          return previous;
        }
        return { ...(previous as TripDetailResponse), items };
      });
    },
  });
}

export function useAddItineraryItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AddItineraryItemPayload) => {
      const { tripId, ...body } = payload;
      const { item } = await fetchJson<{ item: ItineraryItem }>(
        `/api/trips/${tripId}/items`,
        {
          method: 'POST',
          json: body,
        }
      );
      return { tripId, item };
    },
    onSuccess: ({ tripId }) => {
      queryClient.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: tripKey(tripId) });
    },
  });
}
