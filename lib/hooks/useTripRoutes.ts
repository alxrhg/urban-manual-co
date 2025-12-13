'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { decodePolyline, LatLng } from '@/lib/utils/polyline';

export type TravelMode = 'walking' | 'transit' | 'driving';

export interface RouteSegment {
  fromId: string;
  toId: string;
  from: LatLng;
  to: LatLng;
  polyline: LatLng[];
  duration: string;
  durationSeconds: number;
  distanceMeters: number;
  mode: TravelMode;
}

export interface RouteMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  index: number;
}

interface UseTripRoutesOptions {
  markers: RouteMarker[];
  enabled?: boolean;
  mode?: TravelMode;
}

interface UseTripRoutesResult {
  segments: RouteSegment[];
  loading: boolean;
  error: string | null;
  totalDuration: string;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  mode: TravelMode;
  setMode: (mode: TravelMode) => void;
  refresh: () => void;
}

/**
 * Hook to fetch routes between consecutive trip markers
 * Uses the /api/routes/calculate endpoint
 */
export function useTripRoutes({
  markers,
  enabled = true,
  mode: initialMode = 'walking',
}: UseTripRoutesOptions): UseTripRoutesResult {
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TravelMode>(initialMode);

  // Track the last fetch to avoid race conditions
  const fetchIdRef = useRef(0);

  const fetchRoutes = useCallback(async () => {
    // Need at least 2 markers to calculate routes
    if (!enabled || markers.length < 2) {
      setSegments([]);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const newSegments: RouteSegment[] = [];

      // Fetch routes for each consecutive pair
      for (let i = 0; i < markers.length - 1; i++) {
        const from = markers[i];
        const to = markers[i + 1];

        // Check if this fetch is still current
        if (fetchIdRef.current !== currentFetchId) {
          return;
        }

        try {
          const response = await fetch('/api/routes/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: { lat: from.lat, lng: from.lng },
              destination: { lat: to.lat, lng: to.lng },
              mode,
            }),
          });

          if (!response.ok) {
            // If route calculation fails, create a straight-line fallback
            newSegments.push({
              fromId: from.id,
              toId: to.id,
              from: { lat: from.lat, lng: from.lng },
              to: { lat: to.lat, lng: to.lng },
              polyline: [
                { lat: from.lat, lng: from.lng },
                { lat: to.lat, lng: to.lng },
              ],
              duration: 'N/A',
              durationSeconds: 0,
              distanceMeters: 0,
              mode,
            });
            continue;
          }

          const data = await response.json();
          const route = data.data;

          if (route?.polyline) {
            newSegments.push({
              fromId: from.id,
              toId: to.id,
              from: { lat: from.lat, lng: from.lng },
              to: { lat: to.lat, lng: to.lng },
              polyline: decodePolyline(route.polyline),
              duration: route.duration || 'N/A',
              durationSeconds: route.durationSeconds || 0,
              distanceMeters: route.distanceMeters || 0,
              mode,
            });
          } else {
            // Fallback to straight line
            newSegments.push({
              fromId: from.id,
              toId: to.id,
              from: { lat: from.lat, lng: from.lng },
              to: { lat: to.lat, lng: to.lng },
              polyline: [
                { lat: from.lat, lng: from.lng },
                { lat: to.lat, lng: to.lng },
              ],
              duration: 'N/A',
              durationSeconds: 0,
              distanceMeters: 0,
              mode,
            });
          }
        } catch (err) {
          console.error(`Error fetching route ${i}:`, err);
          // Add fallback straight line on error
          newSegments.push({
            fromId: from.id,
            toId: to.id,
            from: { lat: from.lat, lng: from.lng },
            to: { lat: to.lat, lng: to.lng },
            polyline: [
              { lat: from.lat, lng: from.lng },
              { lat: to.lat, lng: to.lng },
            ],
            duration: 'N/A',
            durationSeconds: 0,
            distanceMeters: 0,
            mode,
          });
        }
      }

      // Only update if this is still the current fetch
      if (fetchIdRef.current === currentFetchId) {
        setSegments(newSegments);
      }
    } catch (err) {
      if (fetchIdRef.current === currentFetchId) {
        setError(err instanceof Error ? err.message : 'Failed to fetch routes');
      }
    } finally {
      if (fetchIdRef.current === currentFetchId) {
        setLoading(false);
      }
    }
  }, [markers, enabled, mode]);

  // Fetch routes when markers or mode changes
  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Calculate totals
  const totalDurationSeconds = segments.reduce((acc: number, seg: RouteSegment) => acc + seg.durationSeconds, 0);
  const totalDistanceMeters = segments.reduce((acc: number, seg: RouteSegment) => acc + seg.distanceMeters, 0);

  const formatTotalDuration = (seconds: number): string => {
    if (seconds === 0) return 'N/A';
    if (seconds < 60) return `${seconds} secs`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} mins`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  return {
    segments,
    loading,
    error,
    totalDuration: formatTotalDuration(totalDurationSeconds),
    totalDurationSeconds,
    totalDistanceMeters,
    mode,
    setMode,
    refresh: fetchRoutes,
  };
}
