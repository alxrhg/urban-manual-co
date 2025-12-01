"use client";

import { useState, useCallback } from "react";
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

  // Track applied suggestions and current trip state
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string | number>>(new Set());
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(trip || null);

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

  const handleApplySuggestion = useCallback((suggestion: Suggestion) => {
    const suggestionId = suggestion.id || Math.random();

    // Prevent re-applying already applied suggestions
    if (appliedSuggestions.has(suggestionId)) {
      return;
    }

    // Apply the suggestion's actions to the current trip state
    if (suggestion.actions && suggestion.actions.length > 0 && currentTrip) {
      const updated = applyAIActions(currentTrip, suggestion.actions);
      setCurrentTrip(updated);

      // Notify parent of the update
      if (onApply) {
        onApply(updated);
      }
    }

    // Mark this suggestion as applied
    setAppliedSuggestions(prev => new Set(prev).add(suggestionId));
  }, [appliedSuggestions, currentTrip, onApply]);

  const handleUndoSuggestion = useCallback((suggestion: Suggestion) => {
    const suggestionId = suggestion.id || Math.random();

    // Remove from applied set - the trip would need to be rebuilt
    // For now, we'll just remove the visual state (full undo would require action history)
    setAppliedSuggestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(suggestionId);
      return newSet;
    });

    // Reset to original trip
    if (trip) {
      setCurrentTrip(trip);
      if (onApply) {
        onApply(trip);
      }
    }
  }, [trip, onApply]);

  const applyAllChanges = () => {
    if (!currentTrip || !onApply) {
      closeDrawer();
      return;
    }

    // Get unapplied suggestions only
    const unappliedSuggestions = suggestions.filter(
      (s) => !appliedSuggestions.has(s.id || 0) && s.actions && s.actions.length > 0
    );

    if (unappliedSuggestions.length === 0) {
      // All already applied, just close
      closeDrawer();
      return;
    }

    // Extract all actions from unapplied suggestions
    const allActions = unappliedSuggestions.flatMap((s) => s.actions!);

    // Apply all actions to the current trip state
    const updated = applyAIActions(currentTrip, allActions);

    // Mark all as applied
    const allIds = suggestions
      .filter((s) => s.actions && s.actions.length > 0)
      .map((s) => s.id || 0);
    setAppliedSuggestions(new Set(allIds));

    // Call the onApply callback with the updated trip
    onApply(updated);

    // Close the drawer
    closeDrawer();
  };

  // Count applied and pending suggestions
  const appliedCount = appliedSuggestions.size;
  const totalActionable = suggestions.filter((s) => s.actions && s.actions.length > 0).length;
  const pendingCount = totalActionable - appliedCount;

  return (
    <div className="px-6 py-6 space-y-10">
      {/* TITLE */}
      <div className="space-y-1">
        <h1 className="text-2xl font-light text-gray-900 dark:text-white">
          AI Suggestions
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Based on your itinerary and location flow
        </p>
      </div>

      {/* SUGGESTIONS */}
      {suggestions.length === 0 ? (
        <div className="text-center py-12 text-xs text-gray-500 dark:text-gray-400">
          No suggestions available at this time.
        </div>
      ) : (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <UMSectionTitle>Recommended Improvements</UMSectionTitle>
            {appliedCount > 0 && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                {appliedCount} applied
              </span>
            )}
          </div>

          <div className="space-y-6">
            {suggestions.map((s) => {
              const suggestionId = s.id || 0;
              const isApplied = appliedSuggestions.has(suggestionId);
              const hasActions = s.actions && s.actions.length > 0;

              return (
                <UMCard
                  key={suggestionId}
                  className={`p-4 space-y-3 transition-all duration-300 ${
                    isApplied
                      ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20"
                      : ""
                  }`}
                >
                  {/* Applied badge */}
                  {isApplied && (
                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Applied
                    </div>
                  )}

                  {s.image && (
                    <div className="w-full h-40 relative overflow-hidden rounded-[16px]">
                      <Image
                        src={s.image}
                        alt={s.title || "Suggestion"}
                        fill
                        className={`object-cover transition-opacity ${
                          isApplied ? "opacity-75" : ""
                        }`}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {s.title || s.text || "Suggestion"}
                    </p>
                    {s.detail && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {s.detail}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex gap-2">
                    {isApplied ? (
                      <UMActionPill
                        variant="default"
                        className="w-full justify-center"
                        onClick={() => handleUndoSuggestion(s)}
                      >
                        Undo
                      </UMActionPill>
                    ) : hasActions ? (
                      <UMActionPill
                        variant="primary"
                        className="w-full justify-center"
                        onClick={() => handleApplySuggestion(s)}
                      >
                        Apply
                      </UMActionPill>
                    ) : (
                      <UMActionPill
                        variant="default"
                        className="w-full justify-center opacity-50 cursor-not-allowed"
                        onClick={() => {}}
                      >
                        View Only
                      </UMActionPill>
                    )}
                  </div>
                </UMCard>
              );
            })}
          </div>
        </section>
      )}

      {/* APPLY ALL */}
      {suggestions.length > 0 && (
        <section className="pt-4 border-t border-gray-200 dark:border-gray-800">
          {appliedCount > 0 && appliedCount === totalActionable ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium mb-4">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                All suggestions applied
              </div>
              <UMActionPill
                variant="default"
                className="w-full justify-center"
                onClick={closeDrawer}
              >
                Done
              </UMActionPill>
            </div>
          ) : (
            <UMActionPill
              variant="primary"
              className="w-full justify-center mt-4"
              onClick={applyAllChanges}
            >
              {pendingCount > 0
                ? `Apply ${pendingCount === totalActionable ? "All" : `Remaining ${pendingCount}`} Changes`
                : "Done"}
            </UMActionPill>
          )}
        </section>
      )}
    </div>
  );
}

