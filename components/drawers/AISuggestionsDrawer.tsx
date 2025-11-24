"use client";

import UMCard from "@/components/ui/UMCard";
import UMActionPill from "@/components/ui/UMActionPill";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { applyAIActions } from "@/lib/intelligence/actionRouter";
import Image from "next/image";

interface Suggestion {
  id?: string | number;
  text?: string;
  title?: string;
  detail?: string;
  image?: string;
  actions?: Array<{
    type: 'setMeal' | 'addActivity' | 'assignHotel' | 'reorderDays';
    payload: any;
  }>;
  [key: string]: any;
}

interface Day {
  date: string;
  city: string;
  [key: string]: any;
}

interface Trip {
  days: any[];
  [key: string]: any;
}

interface AISuggestionsDrawerProps {
  day?: Day | null;
  trip?: Trip | null;
  index?: number;
  suggestions?: Suggestion[];
  onApply?: (updatedTrip: Trip) => void;
}

/**
 * AISuggestionsDrawer
 * Used for both:
 * - Trip-level optimization
 * - Day-level optimization
 */
export default function AISuggestionsDrawer({
  day,
  trip,
  index,
  suggestions: propsSuggestions,
  onApply,
}: AISuggestionsDrawerProps) {
  const { closeDrawer } = useDrawerStore();

  // Use provided suggestions or mock data for now
  const suggestions: Suggestion[] = propsSuggestions || [
    {
      id: 1,
      title: "Add Lunch at Blue Bottle Aoyama",
      detail: "Highly rated and within 6 minutes walking distance.",
      image: "/placeholder.jpg",
    },
    {
      id: 2,
      title: "Swap your evening activity",
      detail: "teamLab Planets is closer to your dinner stop.",
      image: "/placeholder2.jpg",
    },
    {
      id: 3,
      title: "Add a cultural stop",
      detail: "Mori Art Museum fits well between morning and lunch.",
      image: "/placeholder3.jpg",
    },
  ];

  const handleApplySuggestion = (suggestion: Suggestion) => {
    console.log("Apply suggestion:", suggestion);
    // TODO: Implement individual suggestion application
    if (suggestion.actions && trip && onApply) {
      const updated = applyAIActions(trip, suggestion.actions);
      onApply(updated);
    }
  };

  const applyAllChanges = () => {
    if (!trip || !onApply) {
      console.log("AI suggestions applied.");
      closeDrawer();
      return;
    }

    // Extract all actions from suggestions
    const allActions = suggestions
      .filter((s) => s.actions && s.actions.length > 0)
      .flatMap((s) => s.actions!);

    if (allActions.length === 0) {
      closeDrawer();
      return;
    }

    // Apply all actions to the trip
    const updated = applyAIActions(trip, allActions);

    // Call the onApply callback with the updated trip
    onApply(updated);

    // Close the drawer
    closeDrawer();
  };

  return (
    <div className="px-6 py-6 space-y-10">
      {/* TITLE */}
      <div className="space-y-1">
        <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white">
          AI Suggestions
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Based on your itinerary and location flow
        </p>
      </div>

      {/* SUGGESTIONS */}
      {suggestions.length === 0 ? (
        <div className="text-center py-12 text-sm text-neutral-500">
          No suggestions available at this time.
        </div>
      ) : (
        <section className="space-y-6">
          <UMSectionTitle>Recommended Improvements</UMSectionTitle>

          <div className="space-y-6">
            {suggestions.map((s) => (
              <UMCard key={s.id || Math.random()} className="p-4 space-y-3">
                {s.image && (
                  <div className="w-full h-40 relative overflow-hidden rounded-[16px]">
                    <Image
                      src={s.image}
                      alt={s.title || "Suggestion"}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-[17px] font-semibold text-gray-900 dark:text-white">
                    {s.title || s.text || "Suggestion"}
                  </p>
                  {s.detail && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {s.detail}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <UMActionPill
                    variant="primary"
                    className="w-full justify-center"
                    onClick={() => handleApplySuggestion(s)}
                  >
                    Apply
                  </UMActionPill>
                </div>
              </UMCard>
            ))}
          </div>
        </section>
      )}

      {/* APPLY ALL */}
      {suggestions.length > 0 && (
        <section className="pt-4 border-t border-neutral-200 dark:border-white/10">
          <UMActionPill
            variant="primary"
            className="w-full justify-center mt-4"
            onClick={applyAllChanges}
          >
            Apply All Changes
          </UMActionPill>
        </section>
      )}
    </div>
  );
}

