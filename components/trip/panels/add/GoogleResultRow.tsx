"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Globe, Plus, Check, Eye, Star } from "lucide-react";

export interface GooglePlace {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  types?: string[];
  category?: string;
  distance?: number; // in miles
}

interface GoogleResultRowProps {
  place: GooglePlace;
  isInTrip: boolean;
  tripOccurrence?: { day: number; time: string };
  onQuickAdd: () => void;
  onSelect: () => void;
  onView?: () => void;
}

export function GoogleResultRow({
  place,
  isInTrip,
  tripOccurrence,
  onQuickAdd,
  onSelect,
  onView,
}: GoogleResultRowProps) {
  const formatPriceLevel = (level?: number): string => {
    if (!level) return "";
    return "$".repeat(level);
  };

  const formatCategory = (types?: string[]): string => {
    if (!types || types.length === 0) return "";
    // Map common Google types to readable names
    const typeMap: Record<string, string> = {
      restaurant: "Restaurant",
      cafe: "Cafe",
      bar: "Bar",
      museum: "Museum",
      art_gallery: "Art Gallery",
      tourist_attraction: "Attraction",
      shopping_mall: "Shopping",
      store: "Store",
      spa: "Spa",
      gym: "Gym",
      park: "Park",
      lodging: "Hotel",
    };
    for (const type of types) {
      if (typeMap[type]) return typeMap[type];
    }
    return types[0]
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const formatDistance = (miles?: number): string => {
    if (!miles) return "";
    if (miles < 0.1) return "nearby";
    return `${miles.toFixed(1)} mi`;
  };

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAdd();
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onView?.();
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "py-2.5 px-3 hover:bg-gray-50 transition-colors cursor-pointer",
        "border-b border-gray-100 last:border-b-0",
        "flex items-start gap-2"
      )}
    >
      {/* Globe icon */}
      <Globe className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 truncate">
                {place.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
              {place.category && <span>{place.category}</span>}
              {!place.category && place.types && (
                <span>{formatCategory(place.types)}</span>
              )}
              {formatPriceLevel(place.priceLevel) && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span>{formatPriceLevel(place.priceLevel)}</span>
                </>
              )}
              {place.rating && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span className="flex items-center gap-0.5">
                    {place.rating.toFixed(1)}
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  </span>
                </>
              )}
            </div>
            {(place.address || place.distance !== undefined) && (
              <div className="text-xs text-gray-400 mt-0.5">
                {place.address && (
                  <span className="truncate">{place.address}</span>
                )}
                {place.distance !== undefined && (
                  <>
                    {place.address && (
                      <span className="mx-1">&middot;</span>
                    )}
                    <span>{formatDistance(place.distance)}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action */}
          {isInTrip ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                Day {tripOccurrence?.day}
              </span>
              {onView && (
                <button
                  type="button"
                  onClick={handleViewClick}
                  className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1 rounded hover:bg-gray-100"
                >
                  <Eye className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleQuickAddClick}
              className={cn(
                "w-6 h-6 rounded text-gray-400",
                "hover:text-gray-600 hover:bg-gray-100 transition-colors",
                "flex items-center justify-center flex-shrink-0"
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
