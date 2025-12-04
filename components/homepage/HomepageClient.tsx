"use client";

/**
 * HomepageClient - Client-side interactive component for the homepage
 *
 * OPTIMIZED:
 * - Receives minimal data from server (50 destinations, essential fields)
 * - Fetches user data client-side (non-blocking SSR)
 * - Uses extracted components for better code organization:
 *   - HeroSection: Layout wrapper for hero area
 *   - CitySelector: City/category filter buttons
 *   - DestinationGrid: Virtualized destination display
 */

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Destination } from "@/types/destination";
import { UserProfile } from "@/types/personalization";
import {
  Map,
  LayoutGrid,
  Plus,
  X,
  Globe,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSequenceTracker } from "@/hooks/useSequenceTracker";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  initializeSession,
  trackPageView,
  trackDestinationClick,
} from "@/lib/tracking";
import GreetingHero from "@/src/features/search/GreetingHero";
import { SearchFiltersComponent } from "@/src/features/search/SearchFilters";
import { type ExtractedIntent } from "@/app/api/intent/schema";
import { isOpenNow } from "@/lib/utils/opening-hours";
import HomeMapSplitView from "@/components/HomeMapSplitView";
import { EditModeToggle } from "@/components/EditModeToggle";
import { getContextAwareLoadingMessage } from "@/src/lib/context/loading-message";
import { useAdminEditMode } from "@/contexts/AdminEditModeContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useDrawer } from "@/contexts/DrawerContext";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@supabase/supabase-js";

// Import extracted components
import { HeroSection } from "@/components/home/HeroSection";
import { DestinationGrid, type MinimalDestination } from "@/components/home/DestinationGrid";

// Lazy load heavy components
const DestinationDrawer = dynamic(
  () =>
    import("@/src/features/detail/DestinationDrawer").then((mod) => ({
      default: mod.DestinationDrawer,
    })),
  { ssr: false, loading: () => null }
);

const SmartRecommendations = dynamic(
  () =>
    import("@/components/SmartRecommendations").then((mod) => ({
      default: mod.SmartRecommendations,
    })),
  { ssr: false }
);

const SequencePredictionsInline = dynamic(
  () =>
    import("@/components/SequencePredictionsInline").then((mod) => ({
      default: mod.SequencePredictionsInline,
    })),
  { ssr: false }
);

const TrendingSectionML = dynamic(
  () =>
    import("@/components/TrendingSectionML").then((mod) => ({
      default: mod.TrendingSectionML,
    })),
  { ssr: false }
);

const MarkdownRenderer = dynamic(
  () =>
    import("@/src/components/MarkdownRenderer").then((mod) => ({
      default: mod.MarkdownRenderer,
    })),
  { ssr: false }
);

const SessionResume = dynamic(
  () =>
    import("@/components/SessionResume").then((mod) => ({
      default: mod.SessionResume,
    })),
  { ssr: false }
);

const ContextCards = dynamic(
  () =>
    import("@/components/ContextCards").then((mod) => ({
      default: mod.ContextCards,
    })),
  { ssr: false }
);

const IntentConfirmationChips = dynamic(
  () =>
    import("@/components/IntentConfirmationChips").then((mod) => ({
      default: mod.IntentConfirmationChips,
    })),
  { ssr: false }
);

const FollowUpSuggestions = dynamic(
  () =>
    import("@/components/FollowUpSuggestions").then((mod) => ({
      default: mod.FollowUpSuggestions,
    })),
  { ssr: false }
);

// Props interface - simplified, user data fetched client-side
export interface HomepageClientProps {
  initialDestinations: MinimalDestination[];
  initialCities: string[];
  initialCategories: string[];
  totalCount: number;
}

export default function HomepageClient({
  initialDestinations,
  initialCities,
  initialCategories,
  totalCount,
}: HomepageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    isEditMode: adminEditMode,
    toggleEditMode,
    disableEditMode,
    canUseEditMode,
  } = useAdminEditMode();
  const { trackAction, predictions } = useSequenceTracker();
  const { openDrawer, closeDrawer } = useDrawer();

  // Initialize state with server-provided data (minimal)
  const [destinations, setDestinations] = useState<MinimalDestination[]>(initialDestinations);
  const [filteredDestinations, setFilteredDestinations] = useState<MinimalDestination[]>(initialDestinations);
  const [cities, setCities] = useState<string[]>(initialCities);
  const [categories, setCategories] = useState<string[]>(initialCategories);

  // User data - fetched client-side (non-blocking SSR)
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Loading state for initial data fetch
  const [isInitialLoading, setIsInitialLoading] = useState(initialDestinations.length === 0);

  // Loading more destinations
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialDestinations.length < totalCount);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "recent">("default");
  const [searching, setSearching] = useState(false);
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Chat/Search state
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{
      type: "user" | "assistant";
      content: string;
      contextPrompt?: string;
      tripId?: string;
    }>
  >([]);
  const [chatResponse, setChatResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpSuggestions, setFollowUpSuggestions] = useState<
    Array<{
      text: string;
      icon?: "location" | "time" | "price" | "rating" | "default";
      type?: "refine" | "expand" | "related";
    }>
  >([]);
  const [searchIntent, setSearchIntent] = useState<ExtractedIntent | null>(null);
  const [seasonalContext, setSeasonalContext] = useState<any>(null);

  // Session/context state
  const [lastSession, setLastSession] = useState<any>(null);
  const [showSessionResume, setShowSessionResume] = useState(false);
  const [userContext, setUserContext] = useState<{
    favoriteCities: string[];
    favoriteCategories: string[];
    travelStyle?: string;
  } | null>(null);
  const [enrichedGreetingContext, setEnrichedGreetingContext] = useState<any>(null);

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState<{
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
  }>({});

  // Near me state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDestinations, setNearbyDestinations] = useState<Destination[]>([]);

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastSearchedQueryRef = useRef<string>("");

  // Hooks
  const editModeActive = isAdmin && adminEditMode;
  const isDestinationsLoading = searching || loadingMore || isInitialLoading;

  // Loading message
  const currentLoadingText = useMemo(() => {
    const loadingIntent = searchIntent
      ? {
          city: searchIntent.city ?? undefined,
          category: searchIntent.category ?? undefined,
          modifiers: searchIntent.modifiers,
          temporalContext: searchIntent.temporalContext
            ? {
                timeframe: searchIntent.temporalContext.timeframe,
                timeOfDay: searchIntent.constraints?.time?.timeOfDay ?? undefined,
              }
            : undefined,
          primaryIntent: searchIntent.primaryIntent,
        }
      : null;
    return getContextAwareLoadingMessage(
      submittedQuery,
      loadingIntent,
      seasonalContext
    );
  }, [submittedQuery, searchIntent, seasonalContext]);

  // Filter destinations helper
  const filterDestinationsWithData = useCallback(
    (
      sourceDestinations: MinimalDestination[] = destinations,
      filters: typeof advancedFilters = advancedFilters,
      city: string = selectedCity,
      category: string = selectedCategory
    ): MinimalDestination[] => {
      let filtered = [...sourceDestinations];

      // Apply city filter
      if (city || filters.city) {
        const filterCity = city || filters.city;
        filtered = filtered.filter(
          (d) => d.city?.toLowerCase() === filterCity?.toLowerCase()
        );
      }

      // Apply category filter
      if (category || filters.category) {
        const filterCategory = (category || filters.category)?.toLowerCase();
        filtered = filtered.filter((d) => {
          if (d.category?.toLowerCase() === filterCategory) return true;
          return false;
        });
      }

      // Apply michelin filter
      if (filters.michelin) {
        filtered = filtered.filter((d) => d.michelin_stars && d.michelin_stars > 0);
      }

      // Apply crown filter
      if (filters.crown) {
        filtered = filtered.filter((d) => d.crown === true);
      }

      // Apply price filter
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        filtered = filtered.filter((d) => {
          if (!d.price_level) return true;
          if (filters.minPrice !== undefined && d.price_level < filters.minPrice)
            return false;
          if (filters.maxPrice !== undefined && d.price_level > filters.maxPrice)
            return false;
          return true;
        });
      }

      // Apply rating filter
      if (filters.minRating !== undefined) {
        filtered = filtered.filter(
          (d) => d.rating && d.rating >= (filters.minRating || 0)
        );
      }

      // Sort by sortBy preference
      if (sortBy === "recent") {
        filtered.sort((a, b) => {
          const dateA = a.id || 0;
          const dateB = b.id || 0;
          return dateB - dateA;
        });
      }

      return filtered;
    },
    [destinations, advancedFilters, selectedCity, selectedCategory, sortBy]
  );

  // Filter destinations
  const filterDestinations = useCallback(() => {
    const filtered = filterDestinationsWithData(destinations);
    setFilteredDestinations(filtered);
  }, [destinations, filterDestinationsWithData]);

  // Track destination click
  const trackDestinationEngagement = useCallback(
    (
      destination: Destination | MinimalDestination,
      source: "grid" | "map_marker" | "map_list",
      position?: number
    ) => {
      trackDestinationClick({
        destinationSlug: destination.slug,
        position: typeof position === "number" ? position : undefined,
        source,
      });

      if (destination.id && user?.id) {
        fetch("/api/discovery/track-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            eventType: "click",
            documentId: destination.slug,
          }),
        }).catch(() => {});
      }
    },
    [user?.id]
  );

  // Perform AI search
  const performAISearch = useCallback(
    async (query: string) => {
      if (!query.trim() || searching) return;

      setSearching(true);
      setSubmittedQuery(query);
      lastSearchedQueryRef.current = query;

      setChatMessages((prev) => [...prev, { type: "user", content: query }]);

      try {
        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: query,
            conversationHistory,
            userId: user?.id,
          }),
        });

        if (!response.ok) throw new Error("Search failed");

        const data = await response.json();

        setConversationHistory((prev) => [
          ...prev,
          { role: "user", content: query },
          { role: "assistant", content: data.response || "" },
        ]);

        setChatMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: data.response || "Here are some recommendations:",
          },
        ]);

        setChatResponse(data.response || "");

        if (data.destinations && Array.isArray(data.destinations)) {
          setFilteredDestinations(data.destinations);
        }

        if (data.intent) {
          setSearchIntent(data.intent);
        }
        if (data.followUpSuggestions) {
          setFollowUpSuggestions(data.followUpSuggestions);
        }
      } catch (error) {
        console.error("Search error:", error);
        setChatMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      } finally {
        setSearching(false);
      }
    },
    [searching, conversationHistory, user?.id]
  );

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
        .insert({
          user_id: user.id,
          title: "New Trip",
          status: "planning",
        })
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

  // Location change handler for Near Me
  const handleLocationChange = async (
    lat: number | null,
    lng: number | null,
    radius: number
  ) => {
    if (!lat || !lng) {
      setUserLocation(null);
      setNearbyDestinations([]);
      return;
    }

    setUserLocation({ lat, lng });

    try {
      const response = await fetch(
        `/api/nearby?lat=${lat}&lng=${lng}&radius=${radius}&limit=100`
      );
      const data = await response.json();

      if (data.destinations) {
        setNearbyDestinations(data.destinations);
      } else {
        setNearbyDestinations([]);
      }
    } catch (error) {
      console.error("Error fetching nearby destinations:", error);
      setNearbyDestinations([]);
    }
  };

  // Toggle edit mode
  const handleToggleEditMode = useCallback(() => {
    if (!isAdmin || !canUseEditMode) return;
    toggleEditMode();
  }, [canUseEditMode, isAdmin, toggleEditMode]);

  // City/category filter handlers
  const handleCityChange = useCallback((city: string) => {
    setSelectedCity(city);
  }, []);

  const handleCategoryChange = useCallback((category: string, michelin?: boolean) => {
    setSelectedCategory(category);
    setAdvancedFilters((prev) => ({
      ...prev,
      category: category || undefined,
      michelin: michelin ?? undefined,
    }));
  }, []);

  const handleMichelinToggle = useCallback(() => {
    const newValue = !advancedFilters.michelin;
    setSelectedCategory("");
    setAdvancedFilters((prev) => ({
      ...prev,
      category: undefined,
      michelin: newValue || undefined,
    }));
  }, [advancedFilters.michelin]);

  // Handle destination click from grid
  const handleDestinationClick = useCallback(
    (destination: MinimalDestination, index: number) => {
      setSelectedDestination(destination as Destination);
      openDrawer("destination");
      trackDestinationEngagement(destination, "grid", index);
    },
    [openDrawer, trackDestinationEngagement]
  );

  // Effects

  // Initialize tracking on mount
  useEffect(() => {
    initializeSession();
    trackPageView({ pageType: "home" });
  }, []);

  // Fetch initial data client-side (when page is static)
  useEffect(() => {
    if (initialDestinations.length > 0) return;

    const fetchInitialData = async () => {
      try {
        const [destRes, filterRes] = await Promise.all([
          fetch("/api/homepage/destinations?limit=20"),
          fetch("/api/homepage/filters"),
        ]);

        const [destData, filterData] = await Promise.all([
          destRes.json(),
          filterRes.json(),
        ]);

        if (destData.destinations) {
          setDestinations(destData.destinations);
          setFilteredDestinations(destData.destinations);
        }

        if (filterData.rows) {
          const citySet = new Set<string>();
          const categorySet = new Set<string>();
          for (const row of filterData.rows) {
            if (row.city) citySet.add(row.city);
            if (row.category) categorySet.add(row.category);
          }
          setCities(Array.from(citySet).sort());
          setCategories(Array.from(categorySet).sort());
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchInitialData();
  }, [initialDestinations.length]);

  // Handle view mode from URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    if (viewParam === "map") {
      setViewMode("map");
    } else if (viewParam === "grid") {
      setViewMode("grid");
    }
  }, []);

  // Search term effect
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const trimmedSearchTerm = searchTerm.trim();
      if (trimmedSearchTerm === lastSearchedQueryRef.current) return;
      if (searching) return;

      const timer = setTimeout(() => {
        if (!searching && searchTerm.trim() === trimmedSearchTerm) {
          performAISearch(searchTerm);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setFilteredDestinations(destinations);
      setChatResponse("");
      setConversationHistory([]);
      setSearching(false);
      setSubmittedQuery("");
      setChatMessages([]);
      setFollowUpSuggestions([]);
      lastSearchedQueryRef.current = "";
    }
  }, [searchTerm, searching, performAISearch, destinations]);

  // Filter effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      filterDestinations();
    }
  }, [selectedCity, selectedCategory, advancedFilters, sortBy, filterDestinations, searchTerm]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Fetch user-specific data on client (non-blocking SSR)
  useEffect(() => {
    if (!user) return;

    const role = user.app_metadata?.role;
    setIsAdmin(role === "admin");

    fetch("/api/homepage/profile", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          setUserProfile(data.profile);
          setUserContext({
            favoriteCities: data.profile.favorite_cities || [],
            favoriteCategories: data.profile.favorite_categories || [],
            travelStyle: data.profile.travel_style,
          });
        }
      })
      .catch(() => {});

    fetch("/api/homepage/visited", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.slugs) {
          setVisitedSlugs(new Set(data.slugs));
        }
      })
      .catch(() => {});

    fetch(`/api/conversation/${user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.session_id && data?.messages?.length > 0) {
          setLastSession({
            id: data.session_id,
            last_activity: data.last_activity || new Date().toISOString(),
            context_summary: data.context,
          });
          const lastActivity = new Date(data.last_activity || Date.now());
          const hoursSince = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            setShowSessionResume(true);
          }
        }
      })
      .catch(() => {});
  }, [user]);

  // Computed values
  const displayDestinations =
    advancedFilters.nearMe && nearbyDestinations.length > 0
      ? nearbyDestinations
      : filteredDestinations;

  // City selector props
  const citySelectorProps = {
    cities,
    categories,
    selectedCity,
    selectedCategory,
    michelinFilter: !!advancedFilters.michelin,
    onCityChange: handleCityChange,
    onCategoryChange: handleCategoryChange,
    onMichelinToggle: handleMichelinToggle,
  };

  return (
    <ErrorBoundary>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://www.urbanmanual.co/#organization",
                name: "The Urban Manual",
                url: "https://www.urbanmanual.co",
                description:
                  "Curated guide to world's best hotels, restaurants & travel destinations",
              },
              {
                "@type": "WebSite",
                "@id": "https://www.urbanmanual.co/#website",
                url: "https://www.urbanmanual.co",
                name: "The Urban Manual",
                publisher: { "@id": "https://www.urbanmanual.co/#organization" },
              },
            ],
          }),
        }}
      />

      <main id="main-content" className="relative min-h-screen dark:text-white" role="main">
        <h1 className="sr-only">
          Discover the World's Best Hotels, Restaurants & Travel Destinations - The Urban Manual
        </h1>

        {/* Hero Section */}
        <HeroSection
          citySelectorProps={!submittedQuery ? citySelectorProps : undefined}
          showCitySelector={!submittedQuery}
        >
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
                  if (!value.trim()) {
                    setConversationHistory([]);
                    setSearchIntent(null);
                    setSeasonalContext(null);
                    setChatResponse("");
                    setFilteredDestinations(destinations);
                    setSubmittedQuery("");
                  }
                }}
                onSubmit={(query) => {
                  if (query.trim() && !searching) {
                    performAISearch(query);
                  }
                }}
                userName={
                  user?.user_metadata?.name ||
                  user?.email?.split("@")[0]
                }
                userProfile={userProfile}
                lastSession={lastSession}
                enrichedContext={enrichedGreetingContext}
                isAIEnabled={true}
                isSearching={searching}
                availableCities={cities}
                availableCategories={categories}
              />
            </>
          )}

          {/* Chat display when search is active */}
          {submittedQuery && (
            <div className="w-full">
              <div
                ref={chatContainerRef}
                className="max-h-[400px] overflow-y-auto space-y-6 mb-6 scrollbar-thin"
              >
                {chatMessages.map((message, index) => (
                  <div key={index} className="space-y-2">
                    {message.type === "user" ? (
                      <div className="text-left text-xs uppercase tracking-[2px] font-medium text-black dark:text-white">
                        {message.content}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <MarkdownRenderer
                          content={message.content}
                          className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left"
                        />
                        {index === chatMessages.length - 1 &&
                          followUpSuggestions.length > 0 && (
                            <FollowUpSuggestions
                              suggestions={followUpSuggestions}
                              onSuggestionClick={(suggestion) => {
                                setSearchTerm(suggestion);
                                setFollowUpInput("");
                              }}
                              isLoading={searching}
                            />
                          )}
                      </div>
                    )}
                  </div>
                ))}

                {(searching || (submittedQuery && chatMessages.length === 0)) && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-left">
                    <span>{currentLoadingText}</span>
                  </div>
                )}
              </div>

              {!searching && chatMessages.length > 0 && (
                <input
                  placeholder="Refine your search or ask a follow-up..."
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && followUpInput.trim()) {
                      e.preventDefault();
                      setSearchTerm(followUpInput.trim());
                      setFollowUpInput("");
                      performAISearch(followUpInput.trim());
                    }
                  }}
                  className="w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white"
                />
              )}

              {searchIntent && !searching && (
                <div className="mt-4">
                  <IntentConfirmationChips intent={searchIntent} editable={false} />
                </div>
              )}
            </div>
          )}
        </HeroSection>

        {/* Edit Mode Banner */}
        {editModeActive && (
          <div className="sticky top-0 z-40 w-full px-6 md:px-10 mb-4">
            <div className="max-w-[1800px] mx-auto">
              <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-3 py-2 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-gray-100 animate-pulse" />
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    Edit mode
                  </p>
                </div>
                <button
                  onClick={() => disableEditMode()}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Edit Toggle */}
        {isAdmin && (
          <div className="w-full px-6 md:px-10">
            <div className="max-w-[1800px] mx-auto mb-6 flex justify-end">
              <EditModeToggle active={editModeActive} onToggle={handleToggleEditMode} />
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
                    className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 sm:px-5 text-sm font-medium text-gray-900 dark:border-[rgba(255,255,255,0.18)] dark:bg-[rgba(255,255,255,0.08)] dark:text-[rgba(255,255,255,0.92)]"
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

                  <button
                    onClick={handleCreateTrip}
                    disabled={creatingTrip}
                    className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full bg-black px-4 sm:px-5 text-sm font-medium text-white dark:bg-white dark:text-black disabled:opacity-50"
                  >
                    {creatingTrip ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {creatingTrip ? "Creating..." : "Create Trip"}
                    </span>
                  </button>

                  <SearchFiltersComponent
                    filters={advancedFilters}
                    onFiltersChange={(newFilters) => {
                      setAdvancedFilters(newFilters);
                      if (newFilters.city !== undefined) {
                        setSelectedCity(newFilters.city || "");
                      }
                      if (newFilters.category !== undefined) {
                        setSelectedCategory(newFilters.category || "");
                      }
                    }}
                    availableCities={cities}
                    availableCategories={categories}
                    onLocationChange={handleLocationChange}
                    sortBy={sortBy}
                    onSortChange={(newSort) => {
                      setSortBy(newSort);
                    }}
                    isAdmin={isAdmin}
                    fullWidthPanel={true}
                    useFunnelIcon={true}
                  />

                  <Link
                    href="/cities"
                    className="flex h-[44px] flex-shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 sm:px-5 text-sm font-medium text-gray-900 dark:border-[rgba(255,255,255,0.10)] dark:text-[rgba(255,255,255,0.92)]"
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
                    trackDestinationEngagement(destination, "grid", 0);
                  }}
                />
              </div>
            )}

            {/* Sequence Predictions */}
            {user &&
              predictions?.predictions &&
              predictions.predictions.length > 0 &&
              !submittedQuery && (
                <div className="mb-8">
                  <SequencePredictionsInline
                    predictions={predictions.predictions}
                    compact={false}
                  />
                </div>
              )}

            {/* Trending Section */}
            {!submittedQuery && (
              <div className="mb-12 md:mb-16">
                <TrendingSectionML limit={12} forecastDays={7} />
              </div>
            )}

            {/* Grid / Map View */}
            {viewMode === "map" ? (
              <div className="relative w-full h-[calc(100vh-20rem)] min-h-[500px] rounded-2xl border border-gray-200 dark:border-gray-800">
                <HomeMapSplitView
                  destinations={displayDestinations as Destination[]}
                  selectedDestination={selectedDestination}
                  onMarkerSelect={(destination) => {
                    setSelectedDestination(destination);
                    trackDestinationEngagement(destination, "map_marker");
                  }}
                  onListItemSelect={(destination) => {
                    setSelectedDestination(destination);
                    trackDestinationEngagement(destination, "map_list");
                  }}
                  onCloseDetail={() => setSelectedDestination(null)}
                  isLoading={isDestinationsLoading}
                />
              </div>
            ) : (
              <DestinationGrid
                destinations={displayDestinations as MinimalDestination[]}
                visitedSlugs={visitedSlugs}
                isLoading={isInitialLoading}
                onDestinationClick={handleDestinationClick}
                virtualizeThreshold={50}
              />
            )}
          </div>
        </div>

        <ScrollToTop />
      </main>

      {/* Destination Drawer */}
      <DestinationDrawer
        destination={selectedDestination}
        isOpen={!!selectedDestination}
        onClose={() => {
          setSelectedDestination(null);
          closeDrawer();
        }}
      />
    </ErrorBoundary>
  );
}
