'use client';

import { useState, useCallback, useEffect } from 'react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { useScheduleGaps, useGapBasedSuggestions } from './useScheduleGaps';
import { formatGapDuration } from '@/lib/utils/schedule-gaps';

export interface AISuggestion {
  id: string;
  text: string;
  label?: string;
  category?: string;
  dayNumber?: number;
  destination?: {
    slug: string;
    name: string;
    image?: string;
    rating?: number;
  };
  gapContext?: {
    afterItemTitle: string;
    startTime: string;
    durationMinutes: number;
  };
}

export interface UseTravelAISuggestionsOptions {
  city?: string;
  tripDays?: number;
  dayNumber?: number;
  existingItems?: EnrichedItineraryItem[];
  enabled?: boolean;
}

export interface UseTravelAISuggestionsResult {
  suggestions: AISuggestion[];
  isLoading: boolean;
  error: string | null;
  aiMessage: string;
  refetch: () => Promise<void>;
  askQuestion: (question: string) => Promise<string>;
}

/**
 * Hook to fetch AI-powered travel suggestions based on trip context and schedule gaps
 */
export function useTravelAISuggestions({
  city,
  tripDays = 1,
  dayNumber,
  existingItems = [],
  enabled = true,
}: UseTravelAISuggestionsOptions): UseTravelAISuggestionsResult {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState('Let me analyze your itinerary and suggest activities...');

  // Get gap analysis for context-aware suggestions
  const { analysis, hasGaps, primaryGap } = useScheduleGaps({ items: existingItems });
  const { suggestions: gapSuggestions } = useGapBasedSuggestions(existingItems);

  /**
   * Fetch AI suggestions from the smart-fill endpoint
   */
  const fetchSuggestions = useCallback(async () => {
    if (!city || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/intelligence/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          existingItems: existingItems.map(item => ({
            destination_slug: item.destination_slug,
            title: item.title,
            time: item.time,
            category: item.destination?.category || item.parsedNotes?.category,
          })),
          tripDays,
          dayNumber,
          gapInfo: hasGaps ? {
            totalGapMinutes: analysis.totalGapMinutes,
            primaryGap: primaryGap ? {
              startTime: primaryGap.startTime,
              endTime: primaryGap.endTime,
              durationMinutes: primaryGap.durationMinutes,
            } : null,
          } : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();

      // Transform API response to AISuggestion format
      const apiSuggestions: AISuggestion[] = (data.suggestions || []).map((s: any, index: number) => ({
        id: `ai-${index}`,
        text: s.reason || `Add ${s.name}`,
        label: s.category ? `${s.category} • ${s.rating ? `${s.rating}★` : 'Recommended'}` : 'Recommended',
        category: s.category,
        dayNumber,
        destination: s.slug ? {
          slug: s.slug,
          name: s.name,
          image: s.image,
          rating: s.rating,
        } : undefined,
      }));

      // Combine with gap-based suggestions
      const combinedSuggestions: AISuggestion[] = [];

      // Add primary gap suggestion first if we have a significant gap
      if (primaryGap && primaryGap.durationMinutes >= 60) {
        combinedSuggestions.push({
          id: 'gap-primary',
          text: `Fill ${formatGapDuration(primaryGap.durationMinutes)} gap after ${primaryGap.afterItemTitle}`,
          label: `${primaryGap.startTime} - ${primaryGap.endTime}`,
          category: 'gap',
          dayNumber,
          gapContext: {
            afterItemTitle: primaryGap.afterItemTitle,
            startTime: primaryGap.startTime,
            durationMinutes: primaryGap.durationMinutes,
          },
        });
      }

      // Add API suggestions
      combinedSuggestions.push(...apiSuggestions.slice(0, 4));

      // Add gap-based suggestions if we don't have enough
      if (combinedSuggestions.length < 3) {
        gapSuggestions.forEach(gs => {
          if (combinedSuggestions.length < 5) {
            combinedSuggestions.push({
              id: gs.id,
              text: gs.text,
              label: gs.category === 'morning' ? 'Morning activity' : gs.category === 'evening' ? 'Evening activity' : 'Fills schedule gap',
              category: gs.category,
              dayNumber,
            });
          }
        });
      }

      setSuggestions(combinedSuggestions);

      // Generate contextual AI message
      if (hasGaps) {
        setAiMessage(
          `I found ${analysis.gaps.length} gap${analysis.gaps.length > 1 ? 's' : ''} in your schedule (${formatGapDuration(analysis.totalGapMinutes)} total). Here are some suggestions to fill your time.`
        );
      } else if (existingItems.length === 0) {
        setAiMessage(`Ready to explore ${city}? Here are some top recommendations to start your itinerary.`);
      } else {
        setAiMessage(`Your day is looking great! Here are some complementary activities you might enjoy.`);
      }
    } catch (err) {
      console.error('Error fetching AI suggestions:', err);
      setError('Failed to load suggestions');
      setAiMessage('I had trouble loading suggestions. Try refreshing or ask me a question!');

      // Fallback to gap-based suggestions only
      setSuggestions(
        gapSuggestions.map(gs => ({
          id: gs.id,
          text: gs.text,
          label: 'Based on your schedule',
          category: gs.category,
          dayNumber,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [city, enabled, existingItems, tripDays, dayNumber, hasGaps, analysis, primaryGap, gapSuggestions]);

  /**
   * Ask a natural language question
   */
  const askQuestion = useCallback(async (question: string): Promise<string> => {
    if (!city) return 'Please select a destination first.';

    try {
      const response = await fetch('/api/intelligence/natural-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question,
          city,
          context: {
            existingItems: existingItems.slice(0, 5).map(i => i.title),
            dayNumber,
            tripDays,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process question');
      }

      const data = await response.json();
      return data.response || data.answer || 'I couldn\'t find an answer. Try asking differently!';
    } catch (err) {
      console.error('Error asking question:', err);
      return 'Sorry, I had trouble processing your question. Please try again.';
    }
  }, [city, existingItems, dayNumber, tripDays]);

  // Fetch suggestions when city or items change
  useEffect(() => {
    if (enabled && city) {
      fetchSuggestions();
    }
  }, [enabled, city, existingItems.length, dayNumber]);

  return {
    suggestions,
    isLoading,
    error,
    aiMessage,
    refetch: fetchSuggestions,
    askQuestion,
  };
}
