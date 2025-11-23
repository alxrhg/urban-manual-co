'use client';

import { useState, useEffect, useCallback } from 'react';

interface Location {
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  [key: string]: any;
}

interface TravelTimeResult {
  minutes: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to calculate travel time between two locations using Google Distance Matrix API
 */
export function useTravelTime(
  from: Location | null | undefined,
  to: Location | null | undefined,
  mode: 'walking' | 'driving' | 'transit' = 'walking'
): TravelTimeResult {
  const [minutes, setMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTravelTime = useCallback(async () => {
    if (!from || !to) {
      setMinutes(null);
      return;
    }

    const fromLat = from.latitude || from.lat;
    const fromLng = from.longitude || from.lng;
    const toLat = to.latitude || to.lat;
    const toLng = to.longitude || to.lng;

    if (!fromLat || !fromLng || !toLat || !toLng) {
      setMinutes(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/distance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origins: [{ lat: fromLat, lng: fromLng, name: 'Origin' }],
          destinations: [{ lat: toLat, lng: toLng, name: 'Destination' }],
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch travel time');
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Duration is in seconds, convert to minutes
        const durationSeconds = data.results[0].duration;
        const durationMinutes = Math.round(durationSeconds / 60);
        setMinutes(durationMinutes);
      } else {
        setMinutes(null);
      }
    } catch (err: any) {
      console.error('Error fetching travel time:', err);
      setError(err.message || 'Failed to calculate travel time');
      setMinutes(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, mode]);

  useEffect(() => {
    fetchTravelTime();
  }, [fetchTravelTime]);

  return { minutes, loading, error };
}

