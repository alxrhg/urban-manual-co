'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseQuickSaveOptions {
  destinationId?: number;
  destinationSlug: string;
}

interface UseQuickSaveReturn {
  isSaved: boolean;
  isVisited: boolean;
  isSaving: boolean;
  isMarkingVisited: boolean;
  toggleSave: () => Promise<void>;
  toggleVisited: () => Promise<void>;
  requiresAuth: boolean;
}

/**
 * Hook for quick one-click save/visited actions
 * Reduces friction by not requiring collection selection
 */
export function useQuickSave({ destinationId, destinationSlug }: UseQuickSaveOptions): UseQuickSaveReturn {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingVisited, setIsMarkingVisited] = useState(false);

  // Load initial state
  useEffect(() => {
    if (!user?.id || !destinationSlug) return;

    async function loadState() {
      const supabaseClient = createClient();

      // Check if saved
      const { data: savedData } = await supabaseClient
        .from('saved_places')
        .select('id')
        .eq('user_id', user!.id)
        .eq('destination_slug', destinationSlug)
        .maybeSingle();

      setIsSaved(!!savedData);

      // Check if visited
      const { data: visitedData } = await supabaseClient
        .from('visited_places')
        .select('id')
        .eq('user_id', user!.id)
        .eq('destination_slug', destinationSlug)
        .maybeSingle();

      setIsVisited(!!visitedData);
    }

    loadState();
  }, [user?.id, destinationSlug]);

  const toggleSave = useCallback(async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const supabaseClient = createClient();

      if (isSaved) {
        // Unsave
        await supabaseClient
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destinationSlug);

        // Also remove from saved_destinations if exists
        if (destinationId) {
          await supabaseClient
            .from('saved_destinations')
            .delete()
            .eq('user_id', user.id)
            .eq('destination_id', destinationId);
        }

        setIsSaved(false);
      } else {
        // Quick save (no collection required)
        await supabaseClient
          .from('saved_places')
          .upsert({
            user_id: user.id,
            destination_slug: destinationSlug,
          });

        // Track save event for recommendations
        fetch('/api/discovery/track-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            eventType: 'save',
            documentId: destinationSlug,
          }),
        }).catch(() => {});

        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, destinationId, destinationSlug, isSaved]);

  const toggleVisited = useCallback(async () => {
    if (!user?.id) return;

    setIsMarkingVisited(true);
    try {
      const supabaseClient = createClient();

      if (isVisited) {
        // Unmark visited
        await supabaseClient
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destinationSlug);

        setIsVisited(false);
      } else {
        // Mark as visited
        await supabaseClient
          .from('visited_places')
          .upsert({
            user_id: user.id,
            destination_slug: destinationSlug,
            visited_at: new Date().toISOString(),
          });

        // Track visit event
        fetch('/api/discovery/track-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            eventType: 'visit',
            documentId: destinationSlug,
          }),
        }).catch(() => {});

        setIsVisited(true);
      }
    } catch (error) {
      console.error('Error toggling visited:', error);
    } finally {
      setIsMarkingVisited(false);
    }
  }, [user?.id, destinationSlug, isVisited]);

  return {
    isSaved,
    isVisited,
    isSaving,
    isMarkingVisited,
    toggleSave,
    toggleVisited,
    requiresAuth: !user,
  };
}
