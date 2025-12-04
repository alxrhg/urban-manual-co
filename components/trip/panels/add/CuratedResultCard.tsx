"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Plus, Check, Eye } from "lucide-react";
import type { Destination } from "@/types/destination";

interface CuratedResultCardProps {
  destination: Destination;
  travelTime?: number;
  isInTrip: boolean;
  tripOccurrence?: { day: number; time: string };
  suggestionReason?: string;
  onQuickAdd: () => void;
  onSelect: () => void;
  onView?: () => void;
}

export function CuratedResultCard({
  destination,
  travelTime,
  isInTrip,
  tripOccurrence,
  suggestionReason,
  onQuickAdd,
  onSelect,
  onView,
}: CuratedResultCardProps) {
  const formatTravelTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatCategory = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getPriceRange = (): string | null => {
    if (destination.price_level) {
      return "$".repeat(destination.price_level);
    }
    return null;
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
        "bg-white rounded-lg border border-gray-200 p-3",
        "hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer",
        "flex gap-3"
      )}
    >
      {/* Image */}
      <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
        {destination.image ? (
          <img
            src={destination.image}
            alt={destination.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-xs">No image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-base font-medium text-gray-900 truncate">
              {destination.name}
            </h4>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-0.5">
              {destination.category && (
                <span>{formatCategory(destination.category)}</span>
              )}
              {destination.city && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span>{destination.city}</span>
                </>
              )}
              {getPriceRange() && (
                <>
                  <span className="text-gray-300">&middot;</span>
                  <span>{getPriceRange()}</span>
                </>
              )}
            </div>
          </div>

          {/* Action button */}
          {isInTrip ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                Day {tripOccurrence?.day}{" "}
                {tripOccurrence?.time && `· ${tripOccurrence.time}`}
              </span>
              {onView && (
                <button
                  type="button"
                  onClick={handleViewClick}
                  className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleQuickAddClick}
              className={cn(
                "w-8 h-8 rounded-full bg-gray-900 text-white",
                "hover:bg-gray-800 transition-colors",
                "flex items-center justify-center flex-shrink-0"
              )}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Travel time */}
        {travelTime !== undefined && !isInTrip && (
          <p className="text-sm text-gray-500 mt-1">
            {formatTravelTime(travelTime)} from hotel
          </p>
        )}

        {/* Tagline / micro description */}
        {destination.micro_description && !suggestionReason && !isInTrip && (
          <p className="text-sm text-gray-500 italic line-clamp-1 mt-1">
            &ldquo;{destination.micro_description}&rdquo;
          </p>
        )}

        {/* Suggestion reason */}
        {suggestionReason && (
          <p className="text-xs text-blue-600 mt-1">Why: {suggestionReason}</p>
        )}
      </div>
    </div>
  );
}
