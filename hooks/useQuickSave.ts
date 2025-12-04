'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';

interface UseQuickSaveOptions {
  destinationId?: number;
  destinationSlug: string;
  onSaveChange?: (isSaved: boolean) => void;
  onVisitChange?: (isVisited: boolean) => void;
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
 * Hook for quick one-click save/visited actions with optimistic UI updates
 * Reduces friction by not requiring collection selection
 * Updates UI immediately and reverts on error for better UX
 */
export function useQuickSave({
  destinationId,
  destinationSlug,
  onSaveChange,
  onVisitChange,
}: UseQuickSaveOptions): UseQuickSaveReturn {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkingVisited, setIsMarkingVisited] = useState(false);

  // Track pending operations to prevent race conditions
  const pendingSaveRef = useRef(false);
  const pendingVisitRef = useRef(false);

  // Load initial state
  useEffect(() => {
    if (!user?.id || !destinationSlug) return;

    async function loadState() {
      const supabaseClient = createClient();

      // Run both queries in parallel
      const [savedResult, visitedResult] = await Promise.all([
        supabaseClient
          .from('saved_places')
          .select('id')
          .eq('user_id', user!.id)
          .eq('destination_slug', destinationSlug)
          .maybeSingle(),
        supabaseClient
          .from('visited_places')
          .select('id')
          .eq('user_id', user!.id)
          .eq('destination_slug', destinationSlug)
          .maybeSingle(),
      ]);

      setIsSaved(!!savedResult.data);
      setIsVisited(!!visitedResult.data);
    }

    loadState();
  }, [user?.id, destinationSlug]);

  const toggleSave = useCallback(async () => {
    if (!user?.id) return;
    if (pendingSaveRef.current) return; // Prevent double-clicks

    pendingSaveRef.current = true;
    const previousState = isSaved;

    // Optimistic update - update UI immediately
    setIsSaved(!isSaved);
    setIsSaving(true);
    onSaveChange?.(!isSaved);

    try {
      const supabaseClient = createClient();

      if (previousState) {
        // Unsave
        const { error } = await supabaseClient
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destinationSlug);

        if (error) throw error;

        // Also remove from saved_destinations if exists
        if (destinationId) {
          await supabaseClient
            .from('saved_destinations')
            .delete()
            .eq('user_id', user.id)
            .eq('destination_id', destinationId);
        }

        toast.success('Removed from saved');
      } else {
        // Quick save (no collection required)
        const { error } = await supabaseClient
          .from('saved_places')
          .upsert({
            user_id: user.id,
            destination_slug: destinationSlug,
          });

        if (error) throw error;

        toast.success('Saved');

        // Track save event for recommendations (fire and forget)
        fetch('/api/discovery/track-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            eventType: 'save',
            documentId: destinationSlug,
          }),
        }).catch(() => {});
      }
    } catch (error) {
      // Revert optimistic update on error
      console.error('Error toggling save:', error);
      setIsSaved(previousState);
      onSaveChange?.(previousState);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
      pendingSaveRef.current = false;
    }
  }, [user?.id, destinationId, destinationSlug, isSaved, onSaveChange]);

  const toggleVisited = useCallback(async () => {
    if (!user?.id) return;
    if (pendingVisitRef.current) return; // Prevent double-clicks

    pendingVisitRef.current = true;
    const previousState = isVisited;

    // Optimistic update - update UI immediately
    setIsVisited(!isVisited);
    setIsMarkingVisited(true);
    onVisitChange?.(!isVisited);

    try {
      const supabaseClient = createClient();

      if (previousState) {
        // Unmark visited
        const { error } = await supabaseClient
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destinationSlug);

        if (error) throw error;

        toast.success('Removed from visited');
      } else {
        // Mark as visited
        const { error } = await supabaseClient
          .from('visited_places')
          .upsert({
            user_id: user.id,
            destination_slug: destinationSlug,
            visited_at: new Date().toISOString(),
          });

        if (error) throw error;

        toast.success('Marked as visited');

        // Track visit event (fire and forget)
        fetch('/api/discovery/track-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            eventType: 'visit',
            documentId: destinationSlug,
          }),
        }).catch(() => {});
      }
    } catch (error) {
      // Revert optimistic update on error
      console.error('Error toggling visited:', error);
      setIsVisited(previousState);
      onVisitChange?.(previousState);
      toast.error('Failed to update. Please try again.');
    } finally {
      setIsMarkingVisited(false);
      pendingVisitRef.current = false;
    }
  }, [user?.id, destinationSlug, isVisited, onVisitChange]);

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
