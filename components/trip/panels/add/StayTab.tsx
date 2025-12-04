"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, Plus } from "lucide-react";
import { StayResultCard } from "./StayResultCard";
import { HotelDetailsForm } from "./HotelDetailsForm";
import type { Trip, HotelBooking } from "@/types/trip";
import type { Destination } from "@/types/destination";

type TypeFilter = "all" | "hotel" | "resort" | "boutique" | "airbnb";

interface StayTabProps {
  trip: Trip;
  tripCity: string | null;
  onAddHotel: (hotel: Partial<HotelBooking>) => void;
}

interface GoogleHotel {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
  priceLevel?: number;
  types?: string[];
}

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "hotel", label: "Hotel" },
  { id: "resort", label: "Resort" },
  { id: "boutique", label: "Boutique" },
  { id: "airbnb", label: "Airbnb" },
];

export function StayTab({ trip, tripCity, onAddHotel }: StayTabProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>("all");
  const [curatedResults, setCuratedResults] = React.useState<Destination[]>([]);
  const [googleResults, setGoogleResults] = React.useState<GoogleHotel[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedHotel, setSelectedHotel] = React.useState<{
    destination?: Destination;
    googleHotel?: GoogleHotel;
    source: "curated" | "google" | "manual";
  } | null>(null);

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Search function
  const performSearch = React.useCallback(
    async (query: string, type: TypeFilter) => {
      if (!tripCity) return;

      setIsSearching(true);

      try {
        // Search for hotels in Urban Manual catalog
        const categoryParam = "hotel";
        const response = await fetch(
          `/api/destinations?q=${encodeURIComponent(query)}&city=${encodeURIComponent(tripCity)}&category=${categoryParam}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          let destinations = data.destinations || [];

          // Filter by type if not "all"
          if (type !== "all") {
            destinations = destinations.filter((d: Destination) => {
              const cat = d.category?.toLowerCase() || "";
              if (type === "hotel") return cat.includes("hotel");
              if (type === "resort") return cat.includes("resort");
              if (type === "boutique") return cat.includes("boutique");
              return true;
            });
          }

          setCuratedResults(destinations);
        }

        // Google results would be fetched here
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
      performSearch(searchQuery, typeFilter);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, typeFilter, performSearch]);

  // Initial load
  React.useEffect(() => {
    performSearch("", typeFilter);
  }, [typeFilter, performSearch]);

  const handleSelectCurated = (destination: Destination) => {
    setSelectedHotel({ destination, source: "curated" });
  };

  const handleSelectGoogle = (googleHotel: GoogleHotel) => {
    setSelectedHotel({ googleHotel, source: "google" });
  };

  const handleManualEntry = () => {
    setSelectedHotel({ source: "manual" });
  };

  const handleAddHotel = (hotel: Partial<HotelBooking>) => {
    onAddHotel(hotel);
    setSelectedHotel(null);
  };

  // Show hotel details form if a hotel is selected
  if (selectedHotel) {
    return (
      <HotelDetailsForm
        hotel={selectedHotel.destination || selectedHotel.googleHotel}
        source={selectedHotel.source}
        destination={selectedHotel.destination}
        trip={trip}
        onAdd={handleAddHotel}
        onBack={() => setSelectedHotel(null)}
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
            placeholder={`Search hotels in ${tripCity || "..."}...`}
            className={cn(
              "w-full pl-10 pr-4 py-2.5 rounded-xl",
              "bg-gray-50 border border-gray-200",
              "text-sm text-gray-900 placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white",
              "transition-all"
            )}
          />
        </div>

        {/* Type filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setTypeFilter(filter.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                "transition-colors",
                typeFilter === filter.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {filter.label}
            </button>
          ))}
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
            {/* Curated results */}
            {curatedResults.length > 0 && (
              <div className="pb-4">
                <div className="px-4 py-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    From Urban Manual
                  </h3>
                </div>
                <div className="space-y-2 px-4">
                  {curatedResults.map((destination) => (
                    <StayResultCard
                      key={destination.slug}
                      destination={destination}
                      source="curated"
                      onSelect={() => handleSelectCurated(destination)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            {curatedResults.length > 0 && googleResults.length > 0 && (
              <div className="border-t border-gray-100" />
            )}

            {/* Google results */}
            {googleResults.length > 0 && (
              <div className="pb-4">
                <div className="px-4 py-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    From Google
                  </h3>
                </div>
                <div className="space-y-2 px-4">
                  {googleResults.map((hotel) => (
                    <StayResultCard
                      key={hotel.placeId}
                      googlePlace={hotel}
                      source="google"
                      onSelect={() => handleSelectGoogle(hotel)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {curatedResults.length === 0 && googleResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mb-1">No hotels found</p>
                <p className="text-xs text-gray-400">
                  Try a different search or enter hotel manually
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual entry button */}
      <div className="p-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleManualEntry}
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
          Enter hotel manually
        </button>
      </div>
    </div>
  );
}
