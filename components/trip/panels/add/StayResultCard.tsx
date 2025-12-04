"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Globe, Star } from "lucide-react";
import type { Destination } from "@/types/destination";

interface StayResultCardProps {
  destination?: Destination;
  googlePlace?: {
    placeId: string;
    name: string;
    address?: string;
    rating?: number;
    priceLevel?: number;
    types?: string[];
  };
  source: "curated" | "google";
  onSelect: () => void;
}

export function StayResultCard({
  destination,
  googlePlace,
  source,
  onSelect,
}: StayResultCardProps) {
  const name = destination?.name || googlePlace?.name || "";
  const address = destination?.formatted_address || googlePlace?.address || "";
  const rating = destination?.rating || googlePlace?.rating;
  const image = destination?.image;

  // Determine hotel class from category or rating
  const getHotelClass = (): string => {
    if (destination?.category) {
      const category = destination.category.toLowerCase();
      if (category.includes("luxury")) return "Luxury";
      if (category.includes("boutique")) return "Boutique";
      if (category.includes("resort")) return "Resort";
    }
    return "Hotel";
  };

  // Generate star rating display
  const renderStars = (count: number) => {
    return (
      <div className="flex items-center">
        {Array.from({ length: count }).map((_, i) => (
          <Star
            key={i}
            className="w-3 h-3 fill-amber-400 text-amber-400"
          />
        ))}
      </div>
    );
  };

  // Curated card
  if (source === "curated" && destination) {
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
        <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
              <span className="text-purple-400 text-2xl">🏨</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-base font-medium text-gray-900 truncate">
                {name}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                {renderStars(5)}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {destination.city} · {getHotelClass()}
              </p>
              {destination.amenities && destination.amenities.length > 0 && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {destination.amenities.slice(0, 3).join(", ")}
                </p>
              )}
            </div>

            <button
              type="button"
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium",
                "border border-gray-200",
                "text-gray-700 hover:bg-gray-50",
                "transition-colors flex-shrink-0"
              )}
            >
              Select
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Google row
  return (
    <div
      onClick={onSelect}
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-3",
        "hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer",
        "flex items-center gap-3"
      )}
    >
      {/* Globe icon */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
        <Globe className="w-5 h-5 text-blue-500" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">{name}</h4>
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
          {address && <span className="truncate">{address}</span>}
          {rating && (
            <>
              {address && <span className="text-gray-300">·</span>}
              <span className="flex items-center gap-0.5">
                {rating.toFixed(1)}
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              </span>
            </>
          )}
        </div>
      </div>

      {/* Select button */}
      <button
        type="button"
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium",
          "border border-gray-200",
          "text-gray-700 hover:bg-gray-50",
          "transition-colors flex-shrink-0"
        )}
      >
        Select
      </button>
    </div>
  );
}
