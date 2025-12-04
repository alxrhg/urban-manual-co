"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, Plus, Filter } from "lucide-react";
import { CuratedResultCard } from "./CuratedResultCard";
import { GoogleResultRow, type GooglePlace } from "./GoogleResultRow";
import { SuggestedSection } from "./SuggestedSection";
import { AddDetailSheet } from "./AddDetailSheet";
import { CustomActivityForm } from "./CustomActivityForm";
import type { Trip, ItineraryItem, HotelBooking } from "@/types/trip";
import type { Destination } from "@/types/destination";

type CategoryFilter =
  | "all"
  | "dining"
  | "cafe"
  | "bar"
  | "culture"
  | "shopping"
  | "wellness";
type SourceFilter = "all" | "curated" | "google";

interface PlacesTabProps {
  trip: Trip;
  tripCity: string | null;
  selectedDay: number;
  selectedTime: string | null;
  existingItems: ItineraryItem[];
  hotels: HotelBooking[];
  onAdd: (
    destination: Destination | null,
    options: {
      time?: string;
      duration?: number;
      partySize?: number;
      note?: string;
      source: "curated" | "google" | "manual";
      googlePlaceData?: {
        name: string;
        address?: string;
        rating?: number;
        placeId?: string;
        category?: string;
      };
    }
  ) => void;
}

const CATEGORY_FILTERS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "dining", label: "Dining" },
  { id: "cafe", label: "Cafe" },
  { id: "bar", label: "Bar" },
  { id: "culture", label: "Culture" },
  { id: "shopping", label: "Shopping" },
  { id: "wellness", label: "Wellness" },
];

export function PlacesTab({
  trip,
  tripCity,
  selectedDay,
  selectedTime,
  existingItems,
  hotels,
  onAdd,
}: PlacesTabProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] =
    React.useState<CategoryFilter>("all");
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>("all");
  const [curatedResults, setCuratedResults] = React.useState<Destination[]>([]);
  const [googleResults, setGoogleResults] = React.useState<GooglePlace[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showGoogleExpanded, setShowGoogleExpanded] = React.useState(false);
  const [selectedPlace, setSelectedPlace] = React.useState<{
    destination?: Destination;
    googlePlace?: GooglePlace;
    source: "curated" | "google";
  } | null>(null);
  const [showCustomForm, setShowCustomForm] = React.useState(false);
  const [sourceDropdownOpen, setSourceDropdownOpen] = React.useState(false);

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Check if a destination is already in the trip
  const getItemInTrip = (
    slug?: string,
    placeId?: string
  ): { day: number; time: string } | null => {
    for (const item of existingItems) {
      if (slug && item.destination_slug === slug) {
        return { day: item.day, time: item.time || "" };
      }
      if (placeId && item.notes) {
        try {
          const notes = JSON.parse(item.notes);
          if (notes.googlePlaceId === placeId) {
            return { day: item.day, time: item.time || "" };
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    return null;
  };

  // Search function
  const performSearch = React.useCallback(
    async (query: string, category: CategoryFilter) => {
      if (!tripCity) return;

      setIsSearching(true);

      try {
        // Search curated destinations
        const categoryParam =
          category === "all"
            ? ""
            : `&category=${encodeURIComponent(getCategoryMapping(category))}`;
        const curatedResponse = await fetch(
          `/api/destinations?q=${encodeURIComponent(query)}&city=${encodeURIComponent(tripCity)}${categoryParam}&limit=10`
        );
        if (curatedResponse.ok) {
          const data = await curatedResponse.json();
          setCuratedResults(data.destinations || []);
        }

        // For now, we'll simulate Google results
        // In production, this would call the Google Places API
        // This is a placeholder that would be replaced with actual Google API integration
        setGoogleResults([]);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [tripCity]
  );

  // Debounced search
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery, categoryFilter);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, categoryFilter, performSearch]);

  // Initial load
  React.useEffect(() => {
    performSearch("", categoryFilter);
  }, [categoryFilter, performSearch]);

  const getCategoryMapping = (filter: CategoryFilter): string => {
    const mapping: Record<CategoryFilter, string> = {
      all: "",
      dining: "restaurant",
      cafe: "cafe",
      bar: "bar",
      culture: "museum",
      shopping: "shopping",
      wellness: "spa",
    };
    return mapping[filter];
  };

  // Generate suggestions based on time of day
  const suggestions = React.useMemo(() => {
    if (!selectedTime || curatedResults.length === 0) return [];

    const hour = parseInt(selectedTime.split(":")[0], 10);
    let preferredCategories: string[] = [];
    let reasons: Record<string, string> = {};

    if (hour < 11) {
      preferredCategories = ["cafe", "breakfast"];
      reasons = { cafe: "Perfect for morning coffee", breakfast: "Start your day right" };
    } else if (hour < 14) {
      preferredCategories = ["restaurant", "cafe"];
      reasons = { restaurant: "Great lunch spot", cafe: "Light lunch option" };
    } else if (hour < 17) {
      preferredCategories = ["museum", "attraction", "shopping"];
      reasons = {
        museum: "Ideal afternoon activity",
        attraction: "Top-rated experience",
        shopping: "Explore local shops",
      };
    } else if (hour < 20) {
      preferredCategories = ["restaurant", "bar"];
      reasons = { restaurant: "Dinner reservation", bar: "Pre-dinner drinks" };
    } else {
      preferredCategories = ["bar", "restaurant"];
      reasons = { bar: "Evening drinks", restaurant: "Late dinner" };
    }

    return curatedResults
      .filter((d) => preferredCategories.includes(d.category || ""))
      .slice(0, 3)
      .map((d) => ({
        destination: d,
        reason: reasons[d.category || ""] || "Recommended",
        travelTime: undefined, // Would calculate from hotel
      }));
  }, [selectedTime, curatedResults]);

  const handleQuickAdd = (
    destination?: Destination,
    googlePlace?: GooglePlace
  ) => {
    if (destination) {
      onAdd(destination, {
        time: selectedTime || undefined,
        source: "curated",
      });
    } else if (googlePlace) {
      onAdd(null, {
        time: selectedTime || undefined,
        source: "google",
        googlePlaceData: {
          name: googlePlace.name,
          address: googlePlace.address,
          rating: googlePlace.rating,
          placeId: googlePlace.placeId,
          category: googlePlace.category,
        },
      });
    }
  };

  const handleSelectPlace = (
    destination?: Destination,
    googlePlace?: GooglePlace
  ) => {
    if (destination) {
      setSelectedPlace({ destination, source: "curated" });
    } else if (googlePlace) {
      setSelectedPlace({ googlePlace, source: "google" });
    }
  };

  const handleDetailAdd = (options: {
    time?: string;
    duration?: number;
    partySize?: number;
    note?: string;
  }) => {
    if (selectedPlace?.destination) {
      onAdd(selectedPlace.destination, {
        ...options,
        source: "curated",
      });
    } else if (selectedPlace?.googlePlace) {
      onAdd(null, {
        ...options,
        source: "google",
        googlePlaceData: {
          name: selectedPlace.googlePlace.name,
          address: selectedPlace.googlePlace.address,
          rating: selectedPlace.googlePlace.rating,
          placeId: selectedPlace.googlePlace.placeId,
          category: selectedPlace.googlePlace.category,
        },
      });
    }
    setSelectedPlace(null);
  };

  const handleCustomAdd = (data: {
    name: string;
    category: string;
    address?: string;
    time?: string;
    duration?: number;
    note?: string;
  }) => {
    onAdd(null, {
      time: data.time || selectedTime || undefined,
      duration: data.duration,
      note: data.note,
      source: "manual",
      googlePlaceData: {
        name: data.name,
        address: data.address,
        category: data.category,
      },
    });
    setShowCustomForm(false);
  };

  // Filter results based on source filter
  const filteredCurated =
    sourceFilter === "google" ? [] : curatedResults;
  const filteredGoogle =
    sourceFilter === "curated" ? [] : googleResults;

  const showGoogleSection =
    filteredGoogle.length > 0 && sourceFilter !== "curated";
  const googleCollapsed =
    !showGoogleExpanded && filteredCurated.length >= 5;

  if (selectedPlace) {
    return (
      <AddDetailSheet
        place={
          selectedPlace.destination
            ? {
                name: selectedPlace.destination.name,
                address: selectedPlace.destination.formatted_address,
                category: selectedPlace.destination.category,
                rating: selectedPlace.destination.rating,
                imageUrl: selectedPlace.destination.image,
                phone: selectedPlace.destination.phone_number,
                website: selectedPlace.destination.website,
              }
            : {
                name: selectedPlace.googlePlace!.name,
                address: selectedPlace.googlePlace!.address,
                category: selectedPlace.googlePlace!.category,
                rating: selectedPlace.googlePlace!.rating,
              }
        }
        source={selectedPlace.source}
        destination={selectedPlace.destination}
        selectedDay={selectedDay}
        suggestedTime={selectedTime || "12:00"}
        trip={trip}
        onAdd={handleDetailAdd}
        onBack={() => setSelectedPlace(null)}
      />
    );
  }

  if (showCustomForm) {
    return (
      <CustomActivityForm
        selectedDay={selectedDay}
        selectedTime={selectedTime}
        trip={trip}
        onAdd={handleCustomAdd}
        onBack={() => setShowCustomForm(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search restaurants, attractions in ${tripCity || "..."}...`}
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-xl",
              "bg-gray-50 border border-gray-200",
              "text-sm text-gray-900 placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white",
              "transition-all"
            )}
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setCategoryFilter(filter.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                "transition-colors",
                categoryFilter === filter.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Source filter */}
        <div className="relative mt-3">
          <button
            type="button"
            onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
            className={cn(
              "flex items-center gap-2 text-sm text-gray-600",
              "hover:text-gray-900 transition-colors"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>
              Source:{" "}
              {sourceFilter === "all"
                ? "All"
                : sourceFilter === "curated"
                  ? "Urban Manual"
                  : "Google"}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                sourceDropdownOpen && "rotate-180"
              )}
            />
          </button>
          {sourceDropdownOpen && (
            <div className="absolute z-10 mt-1 w-40 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
              {(["all", "curated", "google"] as SourceFilter[]).map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => {
                    setSourceFilter(source);
                    setSourceDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                    sourceFilter === source && "bg-gray-50 font-medium"
                  )}
                >
                  {source === "all"
                    ? "All"
                    : source === "curated"
                      ? "Urban Manual"
                      : "Google"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        )}

        {!isSearching && (
          <>
            {/* Suggested section */}
            {selectedTime && suggestions.length > 0 && (
              <SuggestedSection
                timeOfDay={selectedTime}
                suggestions={suggestions}
                onQuickAdd={(d) => handleQuickAdd(d)}
                onSelect={(d) => handleSelectPlace(d)}
              />
            )}

            {/* Curated results */}
            {filteredCurated.length > 0 && (
              <div className="pb-4">
                <div className="px-4 py-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    From Urban Manual
                  </h3>
                </div>
                <div className="space-y-2 px-4">
                  {filteredCurated.map((destination) => {
                    const inTrip = getItemInTrip(destination.slug);
                    return (
                      <CuratedResultCard
                        key={destination.slug}
                        destination={destination}
                        isInTrip={!!inTrip}
                        tripOccurrence={inTrip || undefined}
                        onQuickAdd={() => handleQuickAdd(destination)}
                        onSelect={() => handleSelectPlace(destination)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            {filteredCurated.length > 0 && showGoogleSection && (
              <div className="border-t border-gray-100" />
            )}

            {/* Google results */}
            {showGoogleSection && (
              <div className="pb-4">
                <div className="px-4 py-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    More from Google
                  </h3>
                </div>
                <div>
                  {(googleCollapsed
                    ? filteredGoogle.slice(0, 3)
                    : filteredGoogle
                  ).map((place) => {
                    const inTrip = getItemInTrip(undefined, place.placeId);
                    return (
                      <GoogleResultRow
                        key={place.placeId}
                        place={place}
                        isInTrip={!!inTrip}
                        tripOccurrence={inTrip || undefined}
                        onQuickAdd={() => handleQuickAdd(undefined, place)}
                        onSelect={() => handleSelectPlace(undefined, place)}
                      />
                    );
                  })}
                </div>
                {googleCollapsed && filteredGoogle.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowGoogleExpanded(true)}
                    className={cn(
                      "w-full px-4 py-2 text-sm text-gray-600",
                      "hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    )}
                  >
                    Show more from Google ({filteredGoogle.length - 3})
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {filteredCurated.length === 0 &&
              filteredGoogle.length === 0 &&
              !isSearching && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Search className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">No places found</p>
                  <p className="text-xs text-gray-400">
                    Try a different search or add a custom activity
                  </p>
                </div>
              )}
          </>
        )}
      </div>

      {/* Custom activity button */}
      <div className="p-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowCustomForm(true)}
          className={cn(
            "w-full flex items-center justify-center gap-2",
            "px-4 py-2.5 rounded-lg",
            "border border-dashed border-gray-300",
            "text-sm text-gray-600 hover:text-gray-900",
            "hover:border-gray-400 hover:bg-gray-50",
            "transition-colors"
          )}
        >
          <Plus className="w-4 h-4" />
          Add custom activity
        </button>
      </div>
    </div>
  );
}
