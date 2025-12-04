"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { CuratedResultCard } from "./CuratedResultCard";
import type { Destination } from "@/types/destination";

interface SuggestedSectionProps {
  timeOfDay: string;
  suggestions: Array<{
    destination: Destination;
    reason: string;
    travelTime?: number;
  }>;
  onQuickAdd: (destination: Destination) => void;
  onSelect: (destination: Destination) => void;
}

export function SuggestedSection({
  timeOfDay,
  suggestions,
  onQuickAdd,
  onSelect,
}: SuggestedSectionProps) {
  if (suggestions.length === 0) return null;

  const formatTimeOfDay = (time: string): string => {
    const hour = parseInt(time.split(":")[0], 10);
    if (hour < 11) return "morning";
    if (hour < 14) return "lunch";
    if (hour < 17) return "afternoon";
    if (hour < 20) return "dinner";
    return "evening";
  };

  const period = formatTimeOfDay(timeOfDay);

  return (
    <div className="pb-4">
      <div className="flex items-center gap-2 px-4 py-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Suggested for {period}
        </h3>
      </div>
      <div className="space-y-2 px-4">
        {suggestions.map((suggestion) => (
          <CuratedResultCard
            key={suggestion.destination.slug}
            destination={suggestion.destination}
            travelTime={suggestion.travelTime}
            isInTrip={false}
            suggestionReason={suggestion.reason}
            onQuickAdd={() => onQuickAdd(suggestion.destination)}
            onSelect={() => onSelect(suggestion.destination)}
          />
        ))}
      </div>
    </div>
  );
}
