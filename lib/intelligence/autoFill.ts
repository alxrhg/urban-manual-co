/**
 * AutoFill Module - Time-aware gap filling for itineraries
 *
 * v2.1.0: Replaces the legacy meal-slot filler (breakfast/lunch/dinner)
 * with dynamic TimeBlock injection based on gaps in the timeline.
 */

import type { TimeBlock, Place } from './types';
import { createTimeBlock, parseTimeToMinutes, formatTimeFromMinutes } from './types';

// Legacy import for backwards compatibility
import { generateDayPlan } from './fillDay';

// =============================================================================
// Meal Time Windows Configuration
// =============================================================================

const MEAL_WINDOWS = {
  breakfast: { start: 7 * 60, end: 10 * 60, label: 'Breakfast' },
  lunch: { start: 11 * 60 + 30, end: 14 * 60, label: 'Lunch' },
  dinner: { start: 18 * 60, end: 21 * 60, label: 'Dinner' },
};

// Minimum gap duration to consider for filling (minutes)
const MIN_GAP_DURATION = 60;

// Default meal duration (minutes)
const DEFAULT_MEAL_DURATION = 75;

// =============================================================================
// Types
// =============================================================================

interface Gap {
  startMinutes: number;
  endMinutes: number;
  duration: number;
  afterBlockIndex: number;
}

export interface FillSuggestion {
  type: 'meal' | 'activity';
  label: string;
  startTime: string;
  durationMinutes: number;
  insertAfterIndex: number;
  suggestedPlace?: Place;
  reason: string;
}

// =============================================================================
// Gap Detection
// =============================================================================

/**
 * Find gaps in the timeline that could be filled
 */
function findGaps(blocks: TimeBlock[]): Gap[] {
  const gaps: Gap[] = [];

  // Filter to non-transit blocks and sort by time
  const scheduled = blocks
    .filter((b) => b.type !== 'transit' && b.startTime)
    .sort((a, b) => parseTimeToMinutes(a.startTime!) - parseTimeToMinutes(b.startTime!));

  if (scheduled.length === 0) return gaps;

  for (let i = 0; i < scheduled.length - 1; i++) {
    const current = scheduled[i];
    const next = scheduled[i + 1];

    const currentEnd = parseTimeToMinutes(current.endTime || current.startTime!) +
      (current.endTime ? 0 : current.durationMinutes);
    const nextStart = parseTimeToMinutes(next.startTime!);

    const gapDuration = nextStart - currentEnd;

    if (gapDuration >= MIN_GAP_DURATION) {
      gaps.push({
        startMinutes: currentEnd,
        endMinutes: nextStart,
        duration: gapDuration,
        afterBlockIndex: blocks.indexOf(current),
      });
    }
  }

  return gaps;
}

/**
 * Check if a gap overlaps with a meal window
 */
function getMealWindowForGap(gap: Gap): { window: typeof MEAL_WINDOWS.lunch; mealType: string } | null {
  for (const [mealType, window] of Object.entries(MEAL_WINDOWS)) {
    // Check if gap overlaps with meal window
    const overlapStart = Math.max(gap.startMinutes, window.start);
    const overlapEnd = Math.min(gap.endMinutes, window.end);

    // Need at least 45 mins overlap to suggest a meal
    if (overlapEnd > overlapStart && (overlapEnd - overlapStart) >= 45) {
      return { window, mealType };
    }
  }
  return null;
}

// =============================================================================
// Core Fill Logic
// =============================================================================

/**
 * Fill gaps in the timeline with meal suggestions
 *
 * DEPRECATES: generateDayPlan (Breakfast/Lunch/Dinner)
 * IMPLEMENTS: fillGapsInTimeline(blocks: TimeBlock[])
 *
 * Logic:
 *   - Find gaps > 60 mins around 12:00 PM or 7:00 PM
 *   - Query nearby dining options
 *   - Insert 'Meal' block into gap
 *
 * @param blocks - Current timeline blocks
 * @param nearbyRestaurants - Optional list of nearby restaurants to suggest
 * @returns Suggestions for filling gaps
 */
export function fillGapsInTimeline(
  blocks: TimeBlock[],
  nearbyRestaurants?: Place[]
): FillSuggestion[] {
  const suggestions: FillSuggestion[] = [];
  const gaps = findGaps(blocks);

  // Track which meals have been suggested to avoid duplicates
  const suggestedMeals = new Set<string>();

  for (const gap of gaps) {
    const mealMatch = getMealWindowForGap(gap);

    if (mealMatch && !suggestedMeals.has(mealMatch.mealType)) {
      // Suggest a meal for this gap
      const { window, mealType } = mealMatch;

      // Find the optimal start time within both the gap and meal window
      const optimalStart = Math.max(gap.startMinutes, window.start);

      // Try to find a matching restaurant from nearby options
      const matchingRestaurant = nearbyRestaurants?.find((r) => {
        const cat = r.category?.toLowerCase() || '';
        if (mealType === 'breakfast') {
          return cat.includes('cafe') || cat.includes('breakfast') || cat.includes('bakery');
        }
        return cat.includes('restaurant') || cat.includes('dining');
      });

      suggestions.push({
        type: 'meal',
        label: window.label,
        startTime: formatTimeFromMinutes(optimalStart),
        durationMinutes: DEFAULT_MEAL_DURATION,
        insertAfterIndex: gap.afterBlockIndex,
        suggestedPlace: matchingRestaurant,
        reason: `Gap around ${mealType} time (${formatTimeFromMinutes(window.start)} - ${formatTimeFromMinutes(window.end)})`,
      });

      suggestedMeals.add(mealType);
    } else if (gap.duration >= 120) {
      // Large gap without meal window - suggest free time or activity
      suggestions.push({
        type: 'activity',
        label: 'Free Time',
        startTime: formatTimeFromMinutes(gap.startMinutes),
        durationMinutes: gap.duration,
        insertAfterIndex: gap.afterBlockIndex,
        reason: `${Math.floor(gap.duration / 60)}h gap in schedule`,
      });
    }
  }

  return suggestions;
}

/**
 * Apply fill suggestions to the timeline
 * Creates new TimeBlocks from suggestions and inserts them
 */
export function applyFillSuggestions(
  blocks: TimeBlock[],
  suggestions: FillSuggestion[]
): TimeBlock[] {
  // Sort suggestions by insert index (descending) to maintain correct positions
  const sortedSuggestions = [...suggestions].sort(
    (a, b) => b.insertAfterIndex - a.insertAfterIndex
  );

  const result = [...blocks];

  for (const suggestion of sortedSuggestions) {
    const newBlock = createTimeBlock(
      suggestion.type,
      suggestion.suggestedPlace?.name || suggestion.label,
      suggestion.durationMinutes,
      {
        startTime: suggestion.startTime,
        place: suggestion.suggestedPlace,
        category: suggestion.type === 'meal' ? 'restaurant' : undefined,
      }
    );

    // Insert after the specified index
    result.splice(suggestion.insertAfterIndex + 1, 0, newBlock);
  }

  return result;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if the timeline has gaps that need filling
 */
export function hasUnfilledGaps(blocks: TimeBlock[]): boolean {
  const gaps = findGaps(blocks);
  return gaps.some((gap) => {
    const mealMatch = getMealWindowForGap(gap);
    return mealMatch !== null || gap.duration >= 120;
  });
}

/**
 * Get a summary of timeline coverage
 */
export function getTimelineCoverage(blocks: TimeBlock[]): {
  totalPlannedMinutes: number;
  totalGapMinutes: number;
  coveragePercent: number;
  missingMeals: string[];
} {
  const gaps = findGaps(blocks);
  const totalGapMinutes = gaps.reduce((sum, g) => sum + g.duration, 0);

  const scheduled = blocks.filter((b) => b.type !== 'transit');
  const totalPlannedMinutes = scheduled.reduce((sum, b) => sum + b.durationMinutes, 0);

  // Assume 10-hour active day
  const totalDayMinutes = 10 * 60;
  const coveragePercent = Math.round((totalPlannedMinutes / totalDayMinutes) * 100);

  // Check which meals are missing
  const missingMeals: string[] = [];
  const mealBlocks = blocks.filter((b) => b.type === 'meal');

  for (const [mealType, window] of Object.entries(MEAL_WINDOWS)) {
    const hasMeal = mealBlocks.some((b) => {
      if (!b.startTime) return false;
      const startMins = parseTimeToMinutes(b.startTime);
      return startMins >= window.start && startMins <= window.end;
    });

    if (!hasMeal) {
      missingMeals.push(mealType);
    }
  }

  return {
    totalPlannedMinutes,
    totalGapMinutes,
    coveragePercent,
    missingMeals,
  };
}

// =============================================================================
// Legacy Support (DEPRECATED)
// =============================================================================

interface LegacyPlace {
  city: string;
  categories: string[];
  [key: string]: unknown;
}

interface LegacyDay {
  city: string;
  meals: {
    breakfast?: unknown;
    lunch?: unknown;
    dinner?: unknown;
  };
  [key: string]: unknown;
}

interface LegacyTrip {
  days: LegacyDay[];
  [key: string]: unknown;
}

/**
 * @deprecated Use fillGapsInTimeline with TimeBlock arrays instead
 * Auto-fill meals for all days in a trip using curated and Google places
 */
export function autoFillTrip(trip: LegacyTrip, curated: LegacyPlace[], google: LegacyPlace[]): LegacyTrip {
  console.warn('autoFillTrip is deprecated. Use fillGapsInTimeline with TimeBlock arrays.');

  const updated = { ...trip };

  updated.days = trip.days.map((d) => {
    const filled = generateDayPlan(d, curated, google);

    return {
      ...d,
      meals: {
        ...d.meals,
        ...filled,
      },
    };
  });

  return updated;
}
