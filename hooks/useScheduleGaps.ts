'use client';

import { useMemo } from 'react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  analyzeScheduleGaps,
  analyzeDayBalance,
  getGapSuggestions,
  type GapAnalysis,
  type ScheduleGap,
  type ScheduleItem,
} from '@/lib/utils/schedule-gaps';

export interface UseScheduleGapsOptions {
  items: EnrichedItineraryItem[];
  dayNumber?: number;
}

export interface UseScheduleGapsResult {
  analysis: GapAnalysis;
  dayBalance: ReturnType<typeof analyzeDayBalance>;
  getGapSuggestions: (gap: ScheduleGap) => string[];
  hasGaps: boolean;
  primaryGap: ScheduleGap | null;
}

/**
 * Hook to analyze schedule gaps in a day's itinerary
 *
 * @example
 * const { analysis, hasGaps, primaryGap } = useScheduleGaps({ items: dayItems });
 *
 * if (hasGaps) {
 *   console.log(`Found ${analysis.gaps.length} gaps totaling ${analysis.totalGapMinutes} minutes`);
 * }
 */
export function useScheduleGaps({ items }: UseScheduleGapsOptions): UseScheduleGapsResult {
  const analysis = useMemo(() => {
    // Convert EnrichedItineraryItem to ScheduleItem format
    const scheduleItems: ScheduleItem[] = items.map(item => ({
      id: item.id,
      title: item.title,
      time: item.time || item.parsedNotes?.departureTime || item.parsedNotes?.checkInTime || null,
      endTime: item.parsedNotes?.arrivalTime || item.parsedNotes?.checkOutTime || null,
      duration: item.parsedNotes?.duration,
    }));

    return analyzeScheduleGaps(scheduleItems);
  }, [items]);

  const dayBalance = useMemo(() => {
    return analyzeDayBalance(analysis, items.length);
  }, [analysis, items.length]);

  const hasGaps = analysis.gaps.length > 0;

  // Get the largest gap as the "primary" gap
  const primaryGap = useMemo(() => {
    if (!hasGaps) return null;
    return analysis.gaps.reduce((largest, gap) =>
      gap.durationMinutes > largest.durationMinutes ? gap : largest
    );
  }, [analysis.gaps, hasGaps]);

  return {
    analysis,
    dayBalance,
    getGapSuggestions,
    hasGaps,
    primaryGap,
  };
}

/**
 * Hook to get gap-aware AI suggestions for a day
 */
export function useGapBasedSuggestions(items: EnrichedItineraryItem[]): {
  suggestions: Array<{
    id: string;
    text: string;
    gapInfo: ScheduleGap | null;
    category: 'gap' | 'morning' | 'evening' | 'optimization';
  }>;
} {
  const { analysis, hasGaps } = useScheduleGaps({ items });

  const suggestions = useMemo(() => {
    const result: Array<{
      id: string;
      text: string;
      gapInfo: ScheduleGap | null;
      category: 'gap' | 'morning' | 'evening' | 'optimization';
    }> = [];

    // Add suggestions for each significant gap
    analysis.gaps.forEach((gap, index) => {
      const gapSuggestions = getGapSuggestions(gap);
      if (gapSuggestions.length > 0) {
        result.push({
          id: `gap-${index}`,
          text: gapSuggestions[0],
          gapInfo: gap,
          category: 'gap',
        });
      }
    });

    // Add morning suggestion if there's a morning gap
    if (analysis.morningGap && analysis.morningGap.durationMinutes >= 60) {
      result.push({
        id: 'morning-gap',
        text: 'Start your day with a local breakfast spot',
        gapInfo: null,
        category: 'morning',
      });
    }

    // Add evening suggestion if there's an evening gap
    if (analysis.eveningGap && analysis.eveningGap.durationMinutes >= 90) {
      result.push({
        id: 'evening-gap',
        text: 'End the day with dinner or evening activity',
        gapInfo: null,
        category: 'evening',
      });
    }

    // Limit to 5 suggestions
    return result.slice(0, 5);
  }, [analysis]);

  return { suggestions };
}
