"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Map, LayoutGrid, Plus, Globe, Loader2, X, MapPin } from "lucide-react";

import { Destination } from "@/types/destination";
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

// Import optimized hooks from home feature
import {
  useHomeDestinations,
  useHomeSearch,
  type HomeFilters,
} from "@/src/features/home";

// Import optimized components
import { HomeDestinationGrid, HomeChatSection, HomeFiltersBar } from "@/src/features/home";

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

// Structured data for SEO
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.urbanmanual.co/#organization",
      name: "The Urban Manual",
      url: "https://www.urbanmanual.co",
      description: "Curated guide to world's best hotels, restaurants & travel destinations",
      logo: { "@type": "ImageObject", url: "https://www.urbanmanual.co/logo.png" },
    },
    {
      "@type": "WebSite",
      "@id": "https://www.urbanmanual.co/#website",
      url: "https://www.urbanmanual.co",
      name: "The Urban Manual",
      publisher: { "@id": "https://www.urbanmanual.co/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.urbanmanual.co/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { openDrawer, isDrawerOpen, closeDrawer } = useDrawer();
  const { openDrawer: openGlobalDrawer } = useDrawerStore();
  const { isEditMode: adminEditMode, toggleEditMode, disableEditMode, canUseEditMode } = useAdminEditMode();
  const { trackAction, predictions } = useSequenceTracker();

  // Use optimized hooks
  const {
    destinations,
    filteredDestinations,
    setFilteredDestinations,
    cities,
    categories,
    visitedSlugs,
    setVisitedSlugs,
    isLoading,
    isDiscoveryLoading,
    fetchDestinations,
    filterDestinations,
    fetchVisitedPlaces,
  } = useHomeDestinations();

  const {
    searchTerm,
    setSearchTerm,
    submittedQuery,
    isSearching,
    chatMessages,
    setChatMessages,
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

  // User context state
  const [userProfile, setUserProfile] = useState<Record<string, unknown> | null>(null);
  const [userContext, setUserContext] = useState<Record<string, unknown> | null>(null);
  const [lastSession, setLastSession] = useState<{
    id: string;
    last_activity: string;
    context_summary?: { city?: string; category?: string; preferences?: string[]; lastQuery?: string };
    message_count?: number;
  } | null>(null);
  const [showSessionResume, setShowSessionResume] = useState(false);
  const [enrichedGreetingContext, setEnrichedGreetingContext] = useState<Record<string, unknown> | null>(null);

  // Near me state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);

  const editModeActive = isAdmin && adminEditMode;

  // Initialize on mount
  useEffect(() => {
    initializeSession();
    trackPageView({ pageType: "home" });
    fetchDestinations();
  }, [fetchDestinations]);

  // Handle user changes
  useEffect(() => {
    if (user) {
      const role = (user.app_metadata as Record<string, unknown> | undefined)?.role;
      setIsAdmin(role === "admin");
      fetchVisitedPlaces();
      fetchLastSession();
      fetchUserProfile();
    } else {
      setIsAdmin(false);
    }
  }, [user, fetchVisitedPlaces]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch("/api/homepage/profile", { credentials: "include" });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload.profile) {
        setUserProfile(payload.profile);
        setUserContext({
          favoriteCities: payload.profile.favorite_cities || [],
          favoriteCategories: payload.profile.favorite_categories || [],
          travelStyle: payload.profile.travel_style,
        });
      }
    } catch {
      // Silently fail
    }
  }, [user]);

  // Fetch last session
  const fetchLastSession = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/conversation/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.session_id && data.messages?.length > 0) {
          setLastSession({
            id: data.session_id,
            last_activity: data.last_activity || new Date().toISOString(),
            context_summary: data.context,
            message_count: data.messages.length,
          });
          const hoursSince = (Date.now() - new Date(data.last_activity || Date.now()).getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) setShowSessionResume(true);
        }
      }
    } catch {
      // Silently fail
    }
  }, [user]);

  // Fetch enriched greeting context
  useEffect(() => {
    if (user && userProfile) {
      const fetchContext = async () => {
        try {
          const favoriteCity = (userProfile as Record<string, unknown>).favorite_cities;
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

  // Apply filters when search is empty
  useEffect(() => {
    if (!searchTerm.trim() && destinations.length > 0) {
      const filtered = filterDestinations(advancedFilters, selectedCity, selectedCategory, sortBy);
      setFilteredDestinations(filtered);
    }
  }, [destinations, selectedCity, selectedCategory, advancedFilters, sortBy, searchTerm, filterDestinations, setFilteredDestinations]);

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
      const filtered = filterDestinations(advancedFilters, selectedCity, selectedCategory, sortBy);
      setFilteredDestinations(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, isSearching, performSearch, clearSearch, filterDestinations, advancedFilters, selectedCity, selectedCategory, sortBy, setFilteredDestinations]);

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
    [activeFilters, submittedQuery, performSearch, trackAction, setActiveFilters, setFilteredDestinations]
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
    [activeFilters, submittedQuery, performSearch, setActiveFilters, setFilteredDestinations]
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <main id="main-content" className="relative min-h-screen dark:text-white" role="main">
        <h1 className="sr-only">Discover the World's Best Hotels, Restaurants & Travel Destinations - The Urban Manual</h1>

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
                        userProfile={userProfile as any}
                        lastSession={lastSession}
                        enrichedContext={enrichedGreetingContext as any}
                        isAIEnabled={true}
                        isSearching={isSearching}
                      />
                    </>
                  )}

                  {submittedQuery && (
                    <HomeChatSection
                      submittedQuery={submittedQuery}
                      isSearching={isSearching}
                      isDiscoveryLoading={isDiscoveryLoading}
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
                          await fetchDestinations();
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
                            await fetchDestinations();
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
                  We couldn't find any destinations within {advancedFilters.nearMeRadius || 5}km of your location.
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
              await fetchDestinations();
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
