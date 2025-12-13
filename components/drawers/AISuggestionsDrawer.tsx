"use client";

import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { applyAIActions, applyPatch, applySuggestionPatches } from "@/lib/intelligence/actionRouter";
import type { SuggestionPatch, TripPatch } from "@/lib/intelligence/types";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Undo2 } from "lucide-react";

/**
 * @deprecated Use SuggestionPatch instead
 */
interface LegacySuggestion {
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
  /** New patch-based suggestions */
  suggestionPatches?: SuggestionPatch[];
  /** @deprecated Use suggestionPatches instead */
  suggestions?: LegacySuggestion[];
  onApply?: (updatedTrip: Trip) => void;
  /** Callback for undo support */
  onUndo?: (undoPatches: TripPatch[]) => void;
}

/**
 * AISuggestionsDrawer
 * Used for both:
 * - Trip-level optimization
 * - Day-level optimization
 *
 * v2.0: Now supports SuggestionPatch format with undo capability
 */
export default function AISuggestionsDrawer({
  day,
  trip,
  index,
  suggestionPatches: propPatches,
  suggestions: legacySuggestions,
  onApply,
  onUndo,
}: AISuggestionsDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<TripPatch[]>([]);

  // Convert legacy suggestions to patch format or use provided patches
  const patches: SuggestionPatch[] = propPatches || (legacySuggestions?.map((s, idx) => ({
    id: String(s.id || `legacy_${idx}`),
    label: s.title || s.text || 'Suggestion',
    patch: s.actions?.[0] ? {
      type: s.actions[0].type,
      payload: s.actions[0].payload,
    } as TripPatch : { type: 'addActivity', payload: {} } as TripPatch,
    reason: s.detail || '',
    meta: {
      image: s.image,
    },
  }))) || [];

  // Mock data if nothing provided
  const displayPatches: SuggestionPatch[] = patches.length > 0 ? patches : [
    {
      id: 'mock_1',
      label: 'Add Lunch at Blue Bottle Aoyama',
      patch: { type: 'addActivity', payload: { dayIndex: 0, place: { name: 'Blue Bottle Aoyama' } } },
      reason: 'Highly rated and within 6 minutes walking distance.',
      meta: { image: '/placeholder.jpg' },
    },
    {
      id: 'mock_2',
      label: 'Swap your evening activity',
      patch: { type: 'moveBlock', payload: { fromDayIndex: 0, toDayIndex: 0, blockId: '' } },
      reason: 'teamLab Planets is closer to your dinner stop.',
      meta: { image: '/placeholder2.jpg' },
    },
    {
      id: 'mock_3',
      label: 'Add a cultural stop',
      patch: { type: 'addActivity', payload: { dayIndex: 0, place: { name: 'Mori Art Museum' } } },
      reason: 'Mori Art Museum fits well between morning and lunch.',
      meta: { image: '/placeholder3.jpg' },
    },
  ];

  const handleApplyPatch = (patch: SuggestionPatch) => {
    if (!trip || !onApply) return;

    const { trip: updated, result } = applyPatch(trip, patch.patch);

    if (result.success) {
      onApply(updated);
      setAppliedIds(prev => new Set([...prev, patch.id]));

      // Store undo patch
      if (result.undoPatch) {
        setUndoStack(prev => [...prev, result.undoPatch!]);
        onUndo?.([result.undoPatch]);
      }
    }
  };

  const handleUndoLast = () => {
    if (!trip || !onApply || undoStack.length === 0) return;

    const lastUndo = undoStack[undoStack.length - 1];
    const { trip: updated, result } = applyPatch(trip, lastUndo);

    if (result.success) {
      onApply(updated);
      setUndoStack(prev => prev.slice(0, -1));
      // Remove from applied IDs (we'd need to track which patch each undo corresponds to)
    }
  };

  const applyAllChanges = () => {
    if (!trip || !onApply) {
      closeDrawer();
      return;
    }

    // Filter out already applied patches
    const pendingPatches = displayPatches.filter(p => !appliedIds.has(p.id));

    if (pendingPatches.length === 0) {
      closeDrawer();
      return;
    }

    // Apply all patches and collect undo patches
    const { trip: updated, undoPatches } = applySuggestionPatches(trip, pendingPatches);

    // Mark all as applied
    setAppliedIds(new Set(displayPatches.map(p => p.id)));
    setUndoStack(prev => [...prev, ...undoPatches]);

    onApply(updated);
    onUndo?.(undoPatches);
    closeDrawer();
  };

  // Legacy support: also handle old format
  const handleLegacyApply = (suggestion: LegacySuggestion) => {
    if (suggestion.actions && trip && onApply) {
      const updated = applyAIActions(trip, suggestion.actions);
      onApply(updated);
    }
  };

  const pendingCount = displayPatches.filter(p => !appliedIds.has(p.id)).length;

  return (
    <div className="px-6 py-6 space-y-8">
      {/* TITLE */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-light text-gray-900 dark:text-white">
            Suggestions
          </h1>
          {undoStack.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndoLast}
              className="text-xs"
            >
              <Undo2 className="w-3 h-3 mr-1" />
              Undo
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Based on your itinerary and location flow
        </p>
      </div>

      {/* SUGGESTIONS */}
      {displayPatches.length === 0 ? (
        <div className="text-center py-12 text-xs text-gray-500 dark:text-gray-400">
          No suggestions available at this time.
        </div>
      ) : (
        <section className="space-y-6">
          <UMSectionTitle>Recommended Improvements</UMSectionTitle>

          <div className="space-y-4">
            {displayPatches.map((patch) => {
              const isApplied = appliedIds.has(patch.id);

              return (
                <Card
                  key={patch.id}
                  className={`overflow-hidden transition-opacity ${isApplied ? 'opacity-50' : ''}`}
                >
                  {patch.meta?.image && (
                    <div className="w-full h-40 relative">
                      <Image
                        src={patch.meta.image}
                        alt={patch.label}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {patch.label}
                      </p>
                      {patch.reason && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {patch.reason}
                        </p>
                      )}
                      {patch.meta?.source && (
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
                          {patch.meta.source === 'ai' ? 'AI' : 'Smart'}
                        </span>
                      )}
                    </div>

                    <Button
                      className="w-full rounded-full"
                      onClick={() => handleApplyPatch(patch)}
                      disabled={isApplied}
                      variant={isApplied ? "secondary" : "default"}
                    >
                      {isApplied ? 'Applied' : 'Apply'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* APPLY ALL */}
      {displayPatches.length > 0 && pendingCount > 0 && (
        <>
          <Separator />
          <Button
            className="w-full rounded-full"
            onClick={applyAllChanges}
          >
            Apply All Changes ({pendingCount})
          </Button>
        </>
      )}
    </div>
  );
}

