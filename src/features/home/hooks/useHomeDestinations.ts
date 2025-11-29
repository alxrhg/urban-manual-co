"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Destination } from "@/types/destination";
import { useAuth } from "@/contexts/AuthContext";
import { isOpenNow } from "@/lib/utils/opening-hours";

export interface HomeFilters {
  searchQuery?: string;
  city?: string;
  category?: string;
  michelin?: boolean;
  crown?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
  nearMe?: boolean;
  nearMeRadius?: number;
}

interface UseHomeDestinationsReturn {
  destinations: Destination[];
  filteredDestinations: Destination[];
  cities: string[];
  categories: string[];
  visitedSlugs: Set<string>;
  isLoading: boolean;
  isDiscoveryLoading: boolean;
  error: string | null;
  fetchDestinations: () => Promise<void>;
  filterDestinations: (
    filters: HomeFilters,
    selectedCity: string,
    selectedCategory: string,
    sortBy: "default" | "recent"
  ) => Destination[];
  setFilteredDestinations: React.Dispatch<React.SetStateAction<Destination[]>>;
  setVisitedSlugs: React.Dispatch<React.SetStateAction<Set<string>>>;
  fetchVisitedPlaces: () => Promise<void>;
}

// Helper to check ignorable errors
function isIgnorableError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("hostname") ||
    message.includes("Failed to fetch") ||
    message.includes("invalid.supabase") ||
    message.includes("timeout") ||
    message.includes("Network") ||
    message.includes("connection")
  );
}

// Helper to extract filter options from rows
function extractFilterOptions(
  rows: Array<{ city?: string | null; category?: string | null }>
) {
  const citySet = new Set<string>();
  const categoryLowerSet = new Set<string>();
  const categoryArray: string[] = [];

  rows.forEach((row) => {
    const city = (row.city ?? "").toString().trim();
    const category = (row.category ?? "").toString().trim();

    if (city) citySet.add(city);
    if (category) {
      const categoryLower = category.toLowerCase();
      if (!categoryLowerSet.has(categoryLower)) {
        categoryLowerSet.add(categoryLower);
        categoryArray.push(category);
      }
    }
  });

  return {
    cities: Array.from(citySet).sort(),
    categories: categoryArray.sort(),
  };
}

// Recommendation score for sorting
function getRecommendationScore(dest: Destination, index: number): number {
  let score = 0;
  if (dest.crown) score += 20;
  if (dest.image) score += 10;
  const categoryBonus = (index % 7) * 5;
  score += categoryBonus;
  score += Math.random() * 30;
  return score;
}

export function useHomeDestinations(): UseHomeDestinationsReturn {
  const { user } = useAuth();

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackDestinationsRef = useRef<Destination[] | null>(null);
  const discoveryBootstrapRef = useRef<Destination[] | null>(null);
  const discoveryBootstrapPromiseRef = useRef<Promise<Destination[]> | null>(null);

  // Load fallback destinations from static JSON
  const loadFallbackDestinations = useCallback(async () => {
    if (fallbackDestinationsRef.current) {
      return fallbackDestinationsRef.current;
    }

    try {
      const response = await fetch("/destinations.json");
      if (!response.ok) {
        throw new Error(`Failed to load fallback: ${response.status}`);
      }

      const raw = await response.json();
      const normalized: Destination[] = (Array.isArray(raw) ? raw : [])
        .map((item: Record<string, unknown>) => ({
          slug: String(item.slug || item.name || "").toLowerCase().replace(/\s+/g, "-"),
          name: String(item.name || "Unknown"),
          city: String(item.city || "").trim(),
          category: String(item.category || "").trim(),
          description: item.description as string | undefined,
          image: item.image as string | undefined,
          michelin_stars: item.michelin_stars as number | undefined,
          crown: item.crown as boolean | undefined,
          tags: Array.isArray(item.tags) ? item.tags : undefined,
        }))
        .filter((d: Destination) => Boolean(d.slug && d.city && d.category));

      fallbackDestinationsRef.current = normalized;
      return normalized;
    } catch {
      fallbackDestinationsRef.current = [];
      return [];
    }
  }, []);

  // Fetch from Discovery Engine (cached)
  const fetchDiscoveryBootstrap = useCallback(async (): Promise<Destination[]> => {
    if (discoveryBootstrapRef.current !== null) {
      return discoveryBootstrapRef.current;
    }

    if (discoveryBootstrapPromiseRef.current) {
      return discoveryBootstrapPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const response = await fetch("/api/search/discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "top destinations",
            pageSize: 200,
            userId: user?.id,
            filters: {},
          }),
        });

        if (!response.ok) {
          discoveryBootstrapRef.current = null;
          return [];
        }

        const payload = await response.json();
        const normalized = Array.isArray(payload.results)
          ? payload.results
              .map((item: Record<string, unknown>) => ({
                slug: String(item.slug || item.name || "").toLowerCase().replace(/\s+/g, "-"),
                name: String(item.name || "Unknown"),
                city: String(item.city || "").trim(),
                category: String(item.category || "").trim(),
                description: item.description as string | undefined,
                image: item.image as string | undefined,
                latitude: item.latitude as number | undefined,
                longitude: item.longitude as number | undefined,
              }))
              .filter((d: Destination) => Boolean(d.slug && d.city && d.category))
          : [];

        discoveryBootstrapRef.current = normalized;
        return normalized;
      } catch {
        discoveryBootstrapRef.current = null;
        return [];
      } finally {
        discoveryBootstrapPromiseRef.current = null;
      }
    })();

    discoveryBootstrapPromiseRef.current = promise;
    return promise;
  }, [user?.id]);

  // Main destination fetch function
  const fetchDestinations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`/api/homepage/destinations?t=${Date.now()}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = await response.json();
      const destinationsData = payload.destinations || [];

      if (!Array.isArray(destinationsData) || destinationsData.length === 0) {
        // Try discovery bootstrap fallback
        const discoveryBaseline = await fetchDiscoveryBootstrap();
        if (discoveryBaseline.length) {
          setDestinations(discoveryBaseline);
          const { cities, categories } = extractFilterOptions(discoveryBaseline);
          setCities(cities);
          setCategories(categories);
        } else {
          const fallback = await loadFallbackDestinations();
          if (fallback.length) {
            setDestinations(fallback);
            const { cities, categories } = extractFilterOptions(fallback);
            setCities(cities);
            setCategories(categories);
          }
        }
        return;
      }

      setDestinations(destinationsData);
      const { cities, categories } = extractFilterOptions(destinationsData);
      setCities(cities);
      setCategories(categories);

      // Enhance with Discovery Engine in background
      setIsDiscoveryLoading(true);
      fetchDiscoveryBootstrap()
        .then((discoveryBaseline) => {
          if (discoveryBaseline.length > 0) {
            const merged = [...destinationsData, ...discoveryBaseline];
            const uniqueMerged = merged.filter(
              (dest, index, self) =>
                index === self.findIndex((d) => d.slug === dest.slug)
            );

            if (uniqueMerged.length > destinationsData.length) {
              setDestinations(uniqueMerged);
              const { cities: discCities, categories: discCategories } =
                extractFilterOptions(discoveryBaseline);
              if (discCities.length > cities.length) setCities(discCities);
              if (discCategories.length > categories.length) setCategories(discCategories);
            }
          }
        })
        .catch(() => {
          // Discovery Engine failed - that's fine, we have initial data
        })
        .finally(() => {
          setIsDiscoveryLoading(false);
        });
    } catch (err) {
      if (!isIgnorableError(err)) {
        setError(err instanceof Error ? err.message : "Failed to fetch destinations");
      }

      // Try fallbacks
      const discoveryBaseline = await fetchDiscoveryBootstrap().catch(() => []);
      if (discoveryBaseline.length) {
        setDestinations(discoveryBaseline);
        const { cities, categories } = extractFilterOptions(discoveryBaseline);
        setCities(cities);
        setCategories(categories);
      } else {
        const fallback = await loadFallbackDestinations();
        if (fallback.length) {
          setDestinations(fallback);
          const { cities, categories } = extractFilterOptions(fallback);
          setCities(cities);
          setCategories(categories);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchDiscoveryBootstrap, loadFallbackDestinations]);

  // Fetch visited places
  const fetchVisitedPlaces = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/homepage/visited", {
        credentials: "include",
      });

      if (!response.ok) return;

      const payload = await response.json();
      const slugs = new Set((payload.slugs as string[] | undefined) || []);
      setVisitedSlugs(slugs);
    } catch {
      // Silently fail
    }
  }, [user]);

  // Filter destinations based on current state
  const filterDestinations = useCallback(
    (
      filters: HomeFilters,
      selectedCity: string,
      selectedCategory: string,
      sortBy: "default" | "recent"
    ): Destination[] => {
      let filtered = destinations;

      // City filter
      const cityFilter = filters.city || selectedCity;
      if (cityFilter) {
        filtered = filtered.filter((d) => d.city === cityFilter);
      }

      // Category filter
      const categoryFilter = filters.category || selectedCategory;
      if (categoryFilter) {
        filtered = filtered.filter((d) => {
          const categoryMatch =
            d.category?.toLowerCase().trim() === categoryFilter.toLowerCase().trim();
          if (categoryMatch) return true;

          // Also check tags
          const tags = d.tags || [];
          const categoryTagMap: Record<string, string[]> = {
            dining: ["restaurant", "dining", "fine-dining", "food"],
            cafe: ["cafe", "coffee_shop", "coffee", "bakery"],
            bar: ["bar", "pub", "cocktail_bar", "wine_bar", "nightclub"],
            hotel: ["hotel", "lodging", "resort", "inn"],
            shopping: ["store", "shopping", "mall", "market"],
            attraction: ["tourist_attraction", "museum", "park", "landmark"],
          };

          const relevantTags = categoryTagMap[categoryFilter.toLowerCase()] || [];
          return tags.some((tag) =>
            relevantTags.some(
              (rt) => tag.toLowerCase().includes(rt) || rt.includes(tag.toLowerCase())
            )
          );
        });
      }

      // Michelin filter
      if (filters.michelin) {
        filtered = filtered.filter((d) => d.michelin_stars && d.michelin_stars > 0);
      }

      // Crown filter
      if (filters.crown) {
        filtered = filtered.filter((d) => d.crown === true);
      }

      // Price filters
      if (filters.minPrice !== undefined) {
        filtered = filtered.filter(
          (d) => d.price_level != null && d.price_level >= filters.minPrice!
        );
      }
      if (filters.maxPrice !== undefined) {
        filtered = filtered.filter(
          (d) => d.price_level != null && d.price_level <= filters.maxPrice!
        );
      }

      // Rating filter
      if (filters.minRating !== undefined) {
        filtered = filtered.filter(
          (d) => d.rating != null && d.rating >= filters.minRating!
        );
      }

      // Open Now filter
      if (filters.openNow) {
        filtered = filtered.filter((d) => {
          const destAny = d as unknown as Record<string, unknown>;
          const hours = destAny.opening_hours_json;
          if (!hours) return false;
          return isOpenNow(
            hours as Record<string, unknown>,
            d.city,
            destAny.timezone_id as string | undefined,
            destAny.utc_offset as number | undefined
          );
        });
      }

      // Text search within filters
      if (filters.searchQuery?.trim()) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.name?.toLowerCase().includes(query) ||
            d.city?.toLowerCase().includes(query) ||
            d.category?.toLowerCase().includes(query) ||
            d.neighborhood?.toLowerCase().includes(query) ||
            d.tags?.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      // Sorting
      if (sortBy === "recent") {
        filtered = filtered.sort((a, b) => {
          const aAny = a as unknown as Record<string, unknown>;
          const bAny = b as unknown as Record<string, unknown>;
          const aDate = aAny.created_at ? new Date(aAny.created_at as string).getTime() : 0;
          const bDate = bAny.created_at ? new Date(bAny.created_at as string).getTime() : 0;
          return bDate - aDate;
        });
      } else {
        const scored = filtered.map((dest, index) => ({
          dest,
          score: getRecommendationScore(dest, index),
        }));
        scored.sort((a, b) => b.score - a.score);
        filtered = scored.map((item) => item.dest);
      }

      // Move visited to bottom
      if (user && visitedSlugs.size > 0 && sortBy !== "recent") {
        const unvisited = filtered.filter((d) => !visitedSlugs.has(d.slug));
        const visited = filtered.filter((d) => visitedSlugs.has(d.slug));
        filtered = [...unvisited, ...visited];
      }

      return filtered;
    },
    [destinations, user, visitedSlugs]
  );

  return {
    destinations,
    filteredDestinations,
    cities,
    categories,
    visitedSlugs,
    isLoading,
    isDiscoveryLoading,
    error,
    fetchDestinations,
    filterDestinations,
    setFilteredDestinations,
    setVisitedSlugs,
    fetchVisitedPlaces,
  };
}
