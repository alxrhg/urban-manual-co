'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { Destination } from '@/types/destination';
import { createClient } from '@/lib/supabase/client';
import { useDebouncedValue } from './useDebouncedValue';
import { generateSearchResponseContext } from '@/lib/search/generateSearchContext';

type NullableNumber = number | null | undefined;
type OpeningBoundary = string | { time?: string | null } | null | undefined;
interface OpeningPeriod {
  open?: OpeningBoundary;
  close?: OpeningBoundary;
  start?: string | null;
  end?: string | null;
  opening_time?: string | null;
  closing_time?: string | null;
}

export interface MapFilters {
  categories: string[];
  openNow: boolean;
  minRating?: number;
  searchQuery: string;
  michelin: boolean;
}

interface MapDataResult {
  loading: boolean;
  error?: string;
  destinations: Destination[];
  filteredDestinations: Destination[];
  filters: MapFilters;
  setSearchQuery: (query: string) => void;
  toggleCategory: (category: string) => void;
  toggleOpenNow: () => void;
  toggleMichelin: () => void;
  updateMinRating: (rating?: number) => void;
  resetFilters: () => void;
  geoJson: FeatureCollection<Point>;
  highlightRoutes: FeatureCollection<LineString>;
  popularSpots: FeatureCollection<Point>;
  contextSummary: string;
}

const CACHE_KEY = 'urban-manual-map-cache-v1';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface CachedData {
  timestamp: number;
  destinations: Destination[];
}

function parseSearchParams(searchParams: URLSearchParams): MapFilters {
  const categories = searchParams.get('categories');
  const openNowParam = searchParams.get('open_now');
  const minRatingParam = searchParams.get('min_rating');
  const searchQuery = searchParams.get('q') || '';
  const michelinParam = searchParams.get('michelin');

  return {
    categories: categories ? categories.split(',').filter(Boolean) : [],
    openNow: openNowParam === 'true' || openNowParam === '1',
    minRating: minRatingParam ? Number(minRatingParam) : undefined,
    searchQuery,
    michelin: michelinParam === '1' || michelinParam === 'true',
  };
}

function serializeFilters(filters: MapFilters): string {
  const params = new URLSearchParams();
  if (filters.categories.length) {
    params.set('categories', filters.categories.join(','));
  }
  if (filters.openNow) {
    params.set('open_now', '1');
  }
  if (filters.minRating) {
    params.set('min_rating', String(filters.minRating));
  }
  if (filters.searchQuery) {
    params.set('q', filters.searchQuery);
  }
  if (filters.michelin) {
    params.set('michelin', '1');
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}

function areFiltersEqual(a: MapFilters, b: MapFilters) {
  if (a.openNow !== b.openNow) return false;
  if (a.minRating !== b.minRating) return false;
  if (a.searchQuery !== b.searchQuery) return false;
  if (a.michelin !== b.michelin) return false;
  if (a.categories.length !== b.categories.length) return false;
  const categoriesA = [...a.categories].sort();
  const categoriesB = [...b.categories].sort();
  return categoriesA.every((value, index) => value === categoriesB[index]);
}

function isNumber(value: NullableNumber): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

function resolveTime(boundary: OpeningBoundary): string | undefined {
  if (!boundary) return undefined;
  if (typeof boundary === 'string') return boundary;
  if (typeof boundary.time === 'string') return boundary.time;
  return undefined;
}

function isDestinationOpenNow(destination: Destination) {
  if (!destination.opening_hours_json && !destination.opening_hours) return false;

  const now = new Date();
  const dayIndex = now.getDay(); // 0 (Sunday) - 6 (Saturday)

  try {
    const hours = destination.opening_hours_json || destination.opening_hours;
    if (!hours) return false;

    const periods = (hours.periods || hours?.[dayIndex]) as OpeningPeriod | OpeningPeriod[] | undefined;
    if (!periods) return false;

    const periodsArray = (Array.isArray(periods) ? periods : [periods]) as OpeningPeriod[];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return periodsArray.some((period) => {
      const openCandidate = resolveTime(period.open) || period.start || period.opening_time;
      const closeCandidate = resolveTime(period.close) || period.end || period.closing_time;

      if (!openCandidate || !closeCandidate) return false;

      const openMinutes = convertTimeToMinutes(openCandidate);
      const closeMinutes = convertTimeToMinutes(closeCandidate);

      if (openMinutes <= closeMinutes) {
        return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
      }
      // Overnight case
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    });
  } catch (error) {
    console.warn('[useMapData] Failed to parse opening hours', error);
    return false;
  }
}

function convertTimeToMinutes(time: string | undefined) {
  if (!time) return 0;
  if (typeof time !== 'string') return 0;
  const normalized = time.replace(':', '');
  const hours = Number(normalized.slice(0, 2));
  const minutes = Number(normalized.slice(2));
  return hours * 60 + minutes;
}

function buildGeoJson(destinations: Destination[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: destinations
      .filter((destination) => isNumber(destination.longitude) && isNumber(destination.latitude))
      .map((destination) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [destination.longitude!, destination.latitude!],
        },
        properties: {
          slug: destination.slug,
          name: destination.name,
          category: destination.category,
          rating: destination.rating,
          city: destination.city,
          neighborhood: destination.neighborhood,
          michelin: destination.michelin_stars ?? 0,
          crown: destination.crown ?? false,
          tags: (destination.tags || []).join(','),
        },
      })),
  };
}

function buildHighlightRoutes(destinations: Destination[]): FeatureCollection<LineString> {
  const highlighted = destinations
    .filter((destination) =>
      (destination.crown || (destination.michelin_stars ?? 0) > 0 || (destination.rating ?? 0) >= 4.5) &&
      isNumber(destination.latitude) &&
      isNumber(destination.longitude)
    )
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 8);

  if (highlighted.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }

  const line = {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: highlighted.map((destination) => [destination.longitude!, destination.latitude!]),
    },
    properties: {
      name: `${highlighted[0].city || 'Trip'} highlights`,
    },
  };

  return {
    type: 'FeatureCollection',
    features: [line],
  };
}

function buildPopularSpots(destinations: Destination[]): FeatureCollection<Point> {
  const popular = [...destinations]
    .filter((destination) => isNumber(destination.latitude) && isNumber(destination.longitude))
    .sort((a, b) => (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0))
    .slice(0, 25);

  return {
    type: 'FeatureCollection',
    features: popular.map((destination) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [destination.longitude!, destination.latitude!],
      },
      properties: {
        slug: destination.slug,
        name: destination.name,
        category: destination.category,
        rating: destination.rating,
        city: destination.city,
        crowd: destination.user_ratings_total ?? 0,
      },
    })),
  };
}

export function useMapData(): MapDataResult {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<MapFilters>(() => parseSearchParams(searchParams));
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [contextSummary, setContextSummary] = useState('');
  const debouncedQuery = useDebouncedValue(filters.searchQuery, 350);
  const initializedFromUrl = useRef(false);

  useEffect(() => {
    const nextFilters = parseSearchParams(searchParams);
    if (!initializedFromUrl.current || !areFiltersEqual(filters, nextFilters)) {
      initializedFromUrl.current = true;
      setFilters(nextFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function fetchDestinationsFromSupabase() {
      setLoading(true);
      try {
        const cached = readFromCache();
        if (cached && active) {
          setDestinations(cached.destinations);
        }

        const client = createClient();
        if (!client) {
          setError('Supabase client is not available in this environment.');
          setLoading(false);
          return;
        }

        const { data, error: supabaseError } = await client
          .from('destinations')
          .select(
            'id, slug, name, city, country, neighborhood, category, micro_description, description, content, image, michelin_stars, crown, tags, latitude, longitude, place_id, parent_destination_id, rating, user_ratings_total, opening_hours, opening_hours_json, price_level'
          )
          .is('parent_destination_id', null)
          .or('latitude.not.is.null,longitude.not.is.null,place_id.not.is.null')
          .limit(1200);

        if (supabaseError) {
          console.error('[useMapData] Supabase error', supabaseError);
          if (!cached) {
            setError('Failed to load destinations.');
          }
          return;
        }

        if (active) {
          const payload = (data || []) as Destination[];
          setDestinations(payload);
          writeToCache(payload);
          setError(undefined);
        }
      } catch (fetchError) {
        console.warn('[useMapData] Failed to fetch destinations', fetchError);
        if (!readFromCache() && active) {
          setError('Unable to load map data.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDestinationsFromSupabase();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!initializedFromUrl.current) return;
    const search = serializeFilters(filters);
    router.replace(`${pathname}${search}`, { scroll: false });
  }, [filters, pathname, router]);

  const filteredDestinations = useMemo(() => {
    let filtered = [...destinations];

    if (filters.categories.length) {
      const normalizedCategories = filters.categories.map(normalizeCategory);
      filtered = filtered.filter((destination) =>
        destination.category && normalizedCategories.includes(normalizeCategory(destination.category))
      );
    }

    if (filters.openNow) {
      filtered = filtered.filter((destination) => isDestinationOpenNow(destination));
    }

    if (filters.michelin) {
      filtered = filtered.filter((destination) => (destination.michelin_stars ?? 0) > 0);
    }

    if (filters.minRating) {
      filtered = filtered.filter((destination) => (destination.rating ?? 0) >= filters.minRating!);
    }

    if (debouncedQuery.trim()) {
      const normalizedQuery = debouncedQuery.toLowerCase();
      filtered = filtered.filter((destination) => {
        const fields = [
          destination.name,
          destination.city,
          destination.neighborhood || undefined,
          destination.category,
          ...(destination.tags || []),
        ].filter(Boolean) as string[];
        return fields.some((field) => field.toLowerCase().includes(normalizedQuery));
      });
    }

    return filtered;
  }, [destinations, filters, debouncedQuery]);

  useEffect(() => {
    let cancelled = false;

    async function generateContext() {
      if (!filteredDestinations.length) {
        setContextSummary('No destinations match the current filters yet. Try adjusting filters.');
        return;
      }

      try {
        const summary = await generateSearchResponseContext({
          query: debouncedQuery || 'map exploration',
          results: filteredDestinations.slice(0, 12),
          filters: {
            openNow: filters.openNow,
            priceMin: filters.minRating,
          },
        });
        if (!cancelled) {
          setContextSummary(summary);
        }
      } catch (contextError) {
        console.warn('[useMapData] Failed to generate context summary', contextError);
        if (!cancelled) {
          setContextSummary('Exploring curated places around the map.');
        }
      }
    }

    generateContext();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, filteredDestinations, filters.openNow, filters.minRating, filters.michelin]);

  const geoJson = useMemo(() => buildGeoJson(filteredDestinations), [filteredDestinations]);
  const highlightRoutes = useMemo(() => buildHighlightRoutes(filteredDestinations), [filteredDestinations]);
  const popularSpots = useMemo(() => buildPopularSpots(filteredDestinations), [filteredDestinations]);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setFilters((prev) => {
      const normalized = normalizeCategory(category);
      const hasCategory = prev.categories.some((value) => normalizeCategory(value) === normalized);
      return {
        ...prev,
        categories: hasCategory
          ? prev.categories.filter((value) => normalizeCategory(value) !== normalized)
          : [...prev.categories, category],
      };
    });
  }, []);

  const toggleOpenNow = useCallback(() => {
    setFilters((prev) => ({ ...prev, openNow: !prev.openNow }));
  }, []);

  const toggleMichelin = useCallback(() => {
    setFilters((prev) => ({ ...prev, michelin: !prev.michelin }));
  }, []);

  const updateMinRating = useCallback((rating?: number) => {
    setFilters((prev) => ({ ...prev, minRating: rating }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ categories: [], openNow: false, minRating: undefined, searchQuery: '', michelin: false });
  }, []);

  return {
    loading,
    error,
    destinations,
    filteredDestinations,
    filters,
    setSearchQuery,
    toggleCategory,
    toggleOpenNow,
    toggleMichelin,
    updateMinRating,
    resetFilters,
    geoJson,
    highlightRoutes,
    popularSpots,
    contextSummary,
  };
}

function readFromCache(): CachedData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedData;
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      window.localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[useMapData] Failed to read cache', error);
    return null;
  }
}

function writeToCache(destinations: Destination[]) {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedData = { destinations, timestamp: Date.now() };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[useMapData] Failed to write cache', error);
  }
}
