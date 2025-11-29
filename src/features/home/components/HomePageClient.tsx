"use client";

import React, { useEffect, useState, useCallback, useMemo, startTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Map, LayoutGrid, Plus, Globe, Loader2, X, MapPin } from "lucide-react";

import type { Destination } from "@/types/destination";
import { useAuth } from "@/contexts/AuthContext";
import { useDrawer } from "@/contexts/DrawerContext";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { useAdminEditMode } from "@/contexts/AdminEditModeContext";
import { useSequenceTracker } from "@/hooks/useSequenceTracker";
import { createClient } from "@/lib/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  initializeSession,
  trackPageView,
  trackDestinationClick,
  trackFilterChange,
} from "@/lib/tracking";

import { useHomeSearch, type HomeFilters } from "@/src/features/home";
import { HomeDestinationGrid, HomeChatSection, HomeFiltersBar } from "@/src/features/home";
import { isOpenNow } from "@/lib/utils/opening-hours";

// Lazy load heavy components
const DestinationDrawer = dynamic(
  () => import("@/src/features/detail/DestinationDrawer").then((mod) => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => null }
);

const GreetingHero = dynamic(() => import("@/src/features/search/GreetingHero"), { ssr: false });

const SearchFiltersComponent = dynamic(
  () => import("@/src/features/search/SearchFilters").then((mod) => ({ default: mod.SearchFiltersComponent })),
  { ssr: false }
);

const HomeMapSplitView = dynamic(() => import("@/components/HomeMapSplitView"), { ssr: false });
const EditModeToggle = dynamic(() => import("@/components/EditModeToggle").then((mod) => ({ default: mod.EditModeToggle })), { ssr: false });
const AIAssistant = dynamic(() => import("@/components/AIAssistant").then((mod) => ({ default: mod.AIAssistant })), { ssr: false });

const SmartRecommendations = dynamic(
  () => import("@/components/SmartRecommendations").then((mod) => ({ default: mod.SmartRecommendations })),
  { ssr: false }
);

const TrendingSectionML = dynamic(
  () => import("@/components/TrendingSectionML").then((mod) => ({ default: mod.TrendingSectionML })),
  { ssr: false }
);

const SequencePredictionsInline = dynamic(
  () => import("@/components/SequencePredictionsInline").then((mod) => ({ default: mod.SequencePredictionsInline })),
  { ssr: false }
);

const SessionResume = dynamic(
  () => import("@/components/SessionResume").then((mod) => ({ default: mod.SessionResume })),
  { ssr: false }
);

const ContextCards = dynamic(
  () => import("@/components/ContextCards").then((mod) => ({ default: mod.ContextCards })),
  { ssr: false }
);

const MultiplexAd = dynamic(
  () => import("@/components/GoogleAd").then((mod) => ({ default: mod.MultiplexAd })),
  { ssr: false }
);

// Props received from server component
interface HomePageClientProps {
  initialDestinations: Destination[];
  initialFilters: {
    cities: string[];
    categories: string[];
  };
  initialVisitedSlugs: string[];
  initialUserProfile: {
    favorite_cities?: string[];
    favorite_categories?: string[];
    travel_style?: string;
    [key: string]: unknown;
  } | null;
  initialLastSession: {
    id: string;
    session_id: string;
    last_activity: string;
    context_summary?: {
      city?: string;
      category?: string;
      preferences?: string[];
      lastQuery?: string;
    };
    message_count?: number;
  } | null;
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

export function HomePageClient({
  initialDestinations,
  initialFilters,
  initialVisitedSlugs,
  initialUserProfile,
  initialLastSession,
}: HomePageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();
  const { openDrawer: openGlobalDrawer } = useDrawerStore();
  const { isEditMode: adminEditMode, toggleEditMode, disableEditMode, canUseEditMode } = useAdminEditMode();
  const { trackAction, predictions } = useSequenceTracker();

  // Initialize from server-fetched data
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>(initialDestinations);
  const [cities] = useState<string[]>(initialFilters.cities);
  const [categories] = useState<string[]>(initialFilters.categories);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set(initialVisitedSlugs));
  const [userProfile] = useState(initialUserProfile);
  const [lastSession] = useState(initialLastSession);
  const [isLoading, setIsLoading] = useState(false);

  // Use the search hook
  const {
    searchTerm,
    setSearchTerm,
    submittedQuery,
    isSearching,
    chatMessages,
    followUpSuggestions,
    searchIntent,
    inferredTags,
    activeFilters,
    setActiveFilters,
    currentLoadingText,
    performSearch,
    clearSearch,
  } = useHomeSearch();

  // Local UI state
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAllCities, setShowAllCities] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "recent">("default");
  const [advancedFilters, setAdvancedFilters] = useState<HomeFilters>({});
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [showSessionResume, setShowSessionResume] = useState(false);
  const [enrichedGreetingContext, setEnrichedGreetingContext] = useState<Record<string, unknown> | null>(null);

  // Near me state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);

  const editModeActive = isAdmin && adminEditMode;

  // Derive user context from profile
  const userContext = useMemo(() => {
    if (!userProfile) return null;
    return {
      favoriteCities: userProfile.favorite_cities || [],
      favoriteCategories: userProfile.favorite_categories || [],
      travelStyle: userProfile.travel_style,
    };
  }, [userProfile]);

  // Initialize on mount
  useEffect(() => {
    initializeSession();
    trackPageView({ pageType: "home" });

    // Show session resume if recent session exists
    if (lastSession && lastSession.message_count && lastSession.message_count > 0) {
      const hoursSince = (Date.now() - new Date(lastSession.last_activity).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        setShowSessionResume(true);
      }
    }
  }, [lastSession]);

  // Handle user changes - check admin status
  useEffect(() => {
    if (user) {
      const role = (user.app_metadata as Record<string, unknown> | undefined)?.role;
      setIsAdmin(role === "admin");
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Fetch enriched greeting context
  useEffect(() => {
    if (user && userProfile) {
      const fetchContext = async () => {
        try {
          const favoriteCity = userProfile.favorite_cities;
          const city = Array.isArray(favoriteCity) ? favoriteCity[0] : undefined;
          const params = new URLSearchParams({ userId: user.id });
          if (city) params.append("favoriteCity", city);

          const response = await fetch(`/api/greeting/context?${params.toString()}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.context) setEnrichedGreetingContext(data.context);
          }
        } catch {
          // Silently fail
        }
      };
      fetchContext();
    }
  }, [user, userProfile]);

  // Filter destinations function
  const filterDestinations = useCallback(
    (filters: HomeFilters, city: string, category: string, sort: "default" | "recent"): Destination[] => {
      let filtered = destinations;

      // City filter
      const cityFilter = filters.city || city;
      if (cityFilter) {
        filtered = filtered.filter((d) => d.city === cityFilter);
      }

      // Category filter
      const categoryFilter = filters.category || category;
      if (categoryFilter) {
        filtered = filtered.filter((d) => {
          const categoryMatch = d.category?.toLowerCase().trim() === categoryFilter.toLowerCase().trim();
          if (categoryMatch) return true;

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
        filtered = filtered.filter((d) => d.price_level != null && d.price_level >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined) {
        filtered = filtered.filter((d) => d.price_level != null && d.price_level <= filters.maxPrice!);
      }

      // Rating filter
      if (filters.minRating !== undefined) {
        filtered = filtered.filter((d) => d.rating != null && d.rating >= filters.minRating!);
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
      if (sort === "recent") {
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
      if (user && visitedSlugs.size > 0 && sort !== "recent") {
        const unvisited = filtered.filter((d) => !visitedSlugs.has(d.slug));
        const visited = filtered.filter((d) => visitedSlugs.has(d.slug));
        filtered = [...unvisited, ...visited];
      }

      return filtered;
    },
    [destinations, user, visitedSlugs]
  );

  // Apply filters when search is empty
  useEffect(() => {
    if (!searchTerm.trim() && destinations.length > 0) {
      startTransition(() => {
        const filtered = filterDestinations(advancedFilters, selectedCity, selectedCategory, sortBy);
        setFilteredDestinations(filtered);
      });
    }
  }, [destinations, selectedCity, selectedCategory, advancedFilters, sortBy, searchTerm, filterDestinations]);

  // Handle search term changes with debounce
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const timer = setTimeout(() => {
        if (!isSearching) {
          performSearch(searchTerm).then((results) => {
            if (results.length > 0) {
              setFilteredDestinations(results);
              setCurrentPage(1);
            }
          });
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (!searchTerm.trim()) {
      clearSearch();
      startTransition(() => {
        const filtered = filterDestinations(advancedFilters, selectedCity, selectedCategory, sortBy);
        setFilteredDestinations(filtered);
        setCurrentPage(1);
      });
    }
  }, [searchTerm, isSearching, performSearch, clearSearch, filterDestinations, advancedFilters, selectedCity, selectedCategory, sortBy]);

  // Handle URL view param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyViewFromQuery = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      if (viewParam === "map") setViewMode("map");
      else if (viewParam === "grid") setViewMode("grid");
    };
    applyViewFromQuery();
    window.addEventListener("popstate", applyViewFromQuery);
    return () => window.removeEventListener("popstate", applyViewFromQuery);
  }, []);

  // Arrow key navigation for pagination
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const displayDestinations = advancedFilters.nearMe && nearbyDestinations.length > 0
        ? nearbyDestinations
        : filteredDestinations;
      const totalPages = Math.ceil(displayDestinations.length / 24);
      if (totalPages <= 1 || viewMode !== "grid") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, advancedFilters.nearMe, nearbyDestinations, filteredDestinations]);

  // Refetch destinations (for admin edits)
  const refetchDestinations = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/homepage/destinations?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload.destinations) {
          setDestinations(payload.destinations);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create trip handler
  const handleCreateTrip = useCallback(async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    try {
      setCreatingTrip(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from("trips")
        .insert({ user_id: user.id, title: "New Trip", status: "planning" })
        .select()
        .single();

      if (error) throw error;
      if (data) router.push(`/trips/${data.id}`);
    } catch (err) {
      console.error("Error creating trip:", err);
    } finally {
      setCreatingTrip(false);
    }
  }, [user, router]);

  // Handle destination click
  const handleDestinationClick = useCallback(
    (destination: Destination, index: number) => {
      setSelectedDestination(destination);
      openDrawer("destination");
      trackDestinationClick({ destinationSlug: destination.slug, position: index, source: "grid" });
      trackAction({ type: "click", destination_id: destination.id, destination_slug: destination.slug });
    },
    [openDrawer, trackAction]
  );

  // Handle location change for Near Me
  const handleLocationChange = useCallback(async (lat: number | null, lng: number | null, radius: number) => {
    if (!lat || !lng) {
      setUserLocation(null);
      setNearbyDestinations([]);
      return;
    }

    setUserLocation({ lat, lng });
    try {
      const response = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`);
      const data = await response.json();
      if (data.destinations) setNearbyDestinations(data.destinations);
      else setNearbyDestinations([]);
    } catch {
      setNearbyDestinations([]);
    }
  }, []);

  // Handle chip interactions
  const handleChipClick = useCallback(
    (tag: { type: string; value: string }) => {
      const key = `${tag.type}-${tag.value}`;
      const newActiveFilters = new Set(activeFilters);
      if (newActiveFilters.has(key)) {
        newActiveFilters.delete(key);
      } else {
        newActiveFilters.add(key);
        trackAction({ type: "filter" });
      }
      setActiveFilters(newActiveFilters);

      if (submittedQuery) {
        const filterParts: string[] = [];
        newActiveFilters.forEach((filterKey) => {
          const [, value] = filterKey.split("-", 2);
          filterParts.push(value);
        });
        const enhancedQuery = filterParts.length > 0 ? `${submittedQuery} ${filterParts.join(" ")}` : submittedQuery;
        performSearch(enhancedQuery).then((results) => {
          if (results.length > 0) setFilteredDestinations(results);
        });
      }
    },
    [activeFilters, submittedQuery, performSearch, trackAction, setActiveFilters]
  );

  const handleChipRemove = useCallback(
    (tag: { type: string; value: string }) => {
      const key = `${tag.type}-${tag.value}`;
      const newActiveFilters = new Set(activeFilters);
      newActiveFilters.delete(key);
      setActiveFilters(newActiveFilters);

      if (submittedQuery) {
        const filterParts: string[] = [];
        newActiveFilters.forEach((filterKey) => {
          const [, value] = filterKey.split("-", 2);
          filterParts.push(value);
        });
        const enhancedQuery = filterParts.length > 0 ? `${submittedQuery} ${filterParts.join(" ")}` : submittedQuery;
        performSearch(enhancedQuery).then((results) => {
          if (results.length > 0) setFilteredDestinations(results);
        });
      }
    },
    [activeFilters, submittedQuery, performSearch, setActiveFilters]
  );

  // Determine which destinations to display
  const displayDestinations = useMemo(() => {
    if (advancedFilters.nearMe && nearbyDestinations.length > 0) {
      return nearbyDestinations;
    }
    return filteredDestinations;
  }, [advancedFilters.nearMe, nearbyDestinations, filteredDestinations]);

  // Get user display name
  const userName = useMemo(() => {
    const raw = ((user?.user_metadata as Record<string, unknown> | undefined)?.name ||
      (user?.email ? user.email.split("@")[0] : undefined)) as string | undefined;
    if (!raw) return undefined;
    return raw.split(/[\s._-]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }, [user]);

  return (
    <ErrorBoundary>
      <main id="main-content" className="relative min-h-screen dark:text-white" role="main">
        <h1 className="sr-only">Discover the World&apos;s Best Hotels, Restaurants & Travel Destinations - The Urban Manual</h1>

        {/* Hero Section */}
        <section className="min-h-[65vh] flex flex-col px-6 md:px-10 py-12 pb-8 md:pb-12">
          <div className="w-full flex md:justify-start flex-1 items-center">
            <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
              <div className="flex-1 flex items-center">
                <div className="w-full">
                  {!submittedQuery && (
                    <>
                      {showSessionResume && lastSession && (
                        <div className="mb-6">
                          <SessionResume
                            session={lastSession}
                            onResume={() => setShowSessionResume(false)}
                            onDismiss={() => setShowSessionResume(false)}
                          />
                        </div>
                      )}

                      {userContext && user && !searchTerm && (
                        <div className="mb-6">
                          <ContextCards context={userContext} />
                        </div>
                      )}

                      {/* @ts-expect-error - userProfile and enrichedContext have compatible runtime types */}
                      <GreetingHero
                        searchQuery={searchTerm}
                        onSearchChange={(value) => {
                          setSearchTerm(value);
                          if (!value.trim()) clearSearch();
                        }}
                        onSubmit={(query) => {
                          if (query.trim() && !isSearching) {
                            performSearch(query).then((results) => {
                              if (results.length > 0) {
                                setFilteredDestinations(results);
                                setCurrentPage(1);
                              }
                            });
                          }
                        }}
                        userName={userName}
                        userProfile={userProfile}
                        lastSession={lastSession}
                        enrichedContext={enrichedGreetingContext}
                        isAIEnabled={true}
                        isSearching={isSearching}
                      />
                    </>
                  )}

                  {submittedQuery && (
                    <HomeChatSection
                      submittedQuery={submittedQuery}
                      isSearching={isSearching}
                      isDiscoveryLoading={false}
                      chatMessages={chatMessages}
                      currentLoadingText={currentLoadingText}
                      followUpSuggestions={followUpSuggestions}
                      searchIntent={searchIntent}
                      inferredTags={inferredTags}
                      activeFilters={activeFilters}
                      onFollowUpClick={(suggestion) => {
                        setSearchTerm(suggestion);
                        performSearch(suggestion).then((results) => {
                          if (results.length > 0) setFilteredDestinations(results);
                        });
                      }}
                      onChipClick={handleChipClick}
                      onChipRemove={handleChipRemove}
                      onFollowUpSubmit={(query) => {
                        setSearchTerm(query);
                        performSearch(query).then((results) => {
                          if (results.length > 0) setFilteredDestinations(results);
                        });
                      }}
                    />
                  )}

                  {submittedQuery && !isSearching && filteredDestinations.length === 0 && (
                    <div className="mt-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left">
                      <span>No results found. Try refining your search.</span>
                    </div>
                  )}
                </div>
              </div>

              {!submittedQuery && (
                <HomeFiltersBar
                  cities={cities}
                  categories={categories}
                  selectedCity={selectedCity}
                  selectedCategory={selectedCategory}
                  showAllCities={showAllCities}
                  michelinFilter={advancedFilters.michelin || false}
                  onCityChange={(city) => {
                    setSelectedCity(city);
                    setCurrentPage(1);
                    trackFilterChange({ filterType: "city", value: city || "all" });
                  }}
                  onCategoryChange={(category) => {
                    setSelectedCategory(category);
                    setAdvancedFilters((prev) => ({ ...prev, category: category || undefined }));
                    setCurrentPage(1);
                    trackFilterChange({ filterType: "category", value: category || "all" });
                  }}
                  onMichelinChange={(value) => {
                    setAdvancedFilters((prev) => ({ ...prev, michelin: value || undefined }));
                    setCurrentPage(1);
                    trackFilterChange({ filterType: "michelin", value });
                  }}
                  onShowAllCitiesChange={setShowAllCities}
                />
              )}
            </div>
          </div>
        </section>

        {/* Edit Mode Banner */}
        {editModeActive && (
          <div className="sticky top-0 z-40 w-full px-6 md:px-10 mb-4">
            <div className="max-w-[1800px] mx-auto">
              <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-3 py-2 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-gray-100 animate-pulse" />
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">Edit mode</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      openGlobalDrawer("poi-editor", {
                        destination: null,
                        onSave: async () => {
                          await new Promise((resolve) => setTimeout(resolve, 200));
                          await refetchDestinations();
                          setCurrentPage(1);
                        },
                      });
                    }}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-50 dark:bg-gray-800/30 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                  <button
                    onClick={() => disableEditMode()}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Exit</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Toggle */}
        {isAdmin && (
          <div className="w-full px-6 md:px-10">
            <div className="max-w-[1800px] mx-auto mb-6 flex justify-end">
              <EditModeToggle active={editModeActive} onToggle={() => canUseEditMode && toggleEditMode()} />
            </div>
          </div>
        )}

        {/* Content Section */}
        <div className="w-full px-6 md:px-10 mt-8">
          <div className="max-w-[1800px] mx-auto">
            {/* Navigation Row */}
            <div className="mb-6">
              <div className="flex justify-start sm:justify-end">
                <div className="flex w-full items-center gap-3 overflow-x-auto pb-2 no-scrollbar sm:justify-end sm:overflow-visible">
                  <button
                    onClick={() => setViewMode(viewMode === "grid" ? "map" : "grid")}
                    className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 sm:px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.15)]"
                    style={{ borderRadius: "9999px" }}
                    aria-label={viewMode === "grid" ? "Switch to map view" : "Switch to grid view"}
                  >
                    {viewMode === "grid" ? (
                      <>
                        <Map className="h-4 w-4" />
                        <span className="hidden sm:inline">Map</span>
                      </>
                    ) : (
                      <>
                        <LayoutGrid className="h-4 w-4" />
                        <span className="hidden sm:inline">Grid</span>
                      </>
                    )}
                  </button>

                  {isAdmin ? (
                    <button
                      onClick={() => {
                        openGlobalDrawer("poi-editor", {
                          destination: null,
                          onSave: async () => {
                            await new Promise((resolve) => setTimeout(resolve, 200));
                            await refetchDestinations();
                            setCurrentPage(1);
                          },
                        });
                      }}
                      className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full bg-black px-4 sm:px-5 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:opacity-90 dark:bg-white dark:text-black"
                      style={{ borderRadius: "9999px" }}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Add New POI</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateTrip}
                      disabled={creatingTrip}
                      className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full bg-black px-4 sm:px-5 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
                      style={{ borderRadius: "9999px" }}
                    >
                      {creatingTrip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      <span className="hidden sm:inline">{creatingTrip ? "Creating..." : "Create Trip"}</span>
                    </button>
                  )}

                  <div className="relative flex-shrink-0">
                    <SearchFiltersComponent
                      filters={advancedFilters}
                      onFiltersChange={(newFilters) => {
                        setAdvancedFilters(newFilters);
                        if (newFilters.city !== undefined) setSelectedCity(newFilters.city || "");
                        if (newFilters.category !== undefined) setSelectedCategory(newFilters.category || "");
                      }}
                      availableCities={cities}
                      availableCategories={categories}
                      onLocationChange={handleLocationChange}
                      sortBy={sortBy}
                      onSortChange={(newSort) => {
                        setSortBy(newSort);
                        setCurrentPage(1);
                      }}
                      isAdmin={isAdmin}
                      fullWidthPanel={true}
                      useFunnelIcon={true}
                    />
                  </div>

                  <Link
                    href="/cities"
                    className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 sm:px-5 text-sm font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 dark:border-[rgba(255,255,255,0.10)] dark:text-[rgba(255,255,255,0.92)] dark:hover:bg-[rgba(255,255,255,0.12)]"
                    style={{ borderRadius: "9999px" }}
                  >
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">Discover by Cities</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Smart Recommendations */}
            {user && !submittedQuery && !selectedCity && !selectedCategory && (
              <div className="mb-12 md:mb-16">
                <SmartRecommendations
                  onCardClick={(destination) => {
                    setSelectedDestination(destination);
                    openDrawer("destination");
                    trackDestinationClick({ destinationSlug: destination.slug, position: 0, source: "smart_recommendations" });
                  }}
                />
              </div>
            )}

            {/* Sequence Predictions */}
            {user && predictions?.predictions && predictions.predictions.length > 0 && !submittedQuery && (
              <div className="mb-8">
                <SequencePredictionsInline predictions={predictions.predictions} compact={false} />
              </div>
            )}

            {/* Trending Section */}
            {!submittedQuery && (
              <div className="mb-12 md:mb-16">
                <TrendingSectionML limit={12} forecastDays={7} />
              </div>
            )}

            {/* Near Me No Results */}
            {advancedFilters.nearMe && userLocation && nearbyDestinations.length === 0 && (
              <div className="text-center py-12 px-4">
                <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">No destinations found nearby</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  We couldn&apos;t find any destinations within {advancedFilters.nearMeRadius || 5}km of your location.
                </p>
              </div>
            )}

            {/* Main Content - Grid or Map */}
            {viewMode === "map" ? (
              <div className="relative w-full h-[calc(100vh-20rem)] min-h-[500px] rounded-2xl border border-gray-200 dark:border-gray-800">
                <HomeMapSplitView
                  destinations={displayDestinations}
                  selectedDestination={selectedDestination}
                  onMarkerSelect={(destination) => {
                    setSelectedDestination(destination);
                    trackDestinationClick({ destinationSlug: destination.slug, source: "map_marker" });
                  }}
                  onListItemSelect={(destination) => {
                    setSelectedDestination(destination);
                    trackDestinationClick({ destinationSlug: destination.slug, source: "map_list" });
                  }}
                  onCloseDetail={() => setSelectedDestination(null)}
                  isLoading={isSearching || isLoading}
                />
              </div>
            ) : (
              <>
                <HomeDestinationGrid
                  destinations={displayDestinations}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  visitedSlugs={visitedSlugs}
                  isLoading={isSearching || isLoading}
                  loadingText={currentLoadingText}
                  onDestinationClick={handleDestinationClick}
                  user={user}
                />

                {displayDestinations.length > 0 && (
                  <div className="mt-8 w-full">
                    <MultiplexAd slot="3271683710" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Destination Drawer */}
        {isDrawerOpen("destination") && selectedDestination && viewMode !== "map" && (
          <DestinationDrawer
            destination={selectedDestination}
            isOpen={true}
            onClose={() => {
              closeDrawer();
              setTimeout(() => setSelectedDestination(null), 300);
            }}
            onVisitToggle={(slug, visited) => {
              setVisitedSlugs((prev) => {
                const newSet = new Set(prev);
                if (visited) newSet.add(slug);
                else newSet.delete(slug);
                return newSet;
              });
            }}
            onDestinationUpdate={async () => {
              await new Promise((resolve) => setTimeout(resolve, 200));
              await refetchDestinations();
              setCurrentPage(1);
            }}
            onDestinationClick={async (slug: string) => {
              try {
                const supabaseClient = createClient();
                if (!supabaseClient) return;

                const { data: destination, error } = await supabaseClient
                  .from("destinations")
                  .select("*")
                  .eq("slug", slug)
                  .single();

                if (error || !destination) return;

                setSelectedDestination(destination as Destination);
                openDrawer("destination");
              } catch {
                // Silently fail
              }
            }}
          />
        )}

        <AIAssistant />
      </main>
    </ErrorBoundary>
  );
}

export default HomePageClient;
