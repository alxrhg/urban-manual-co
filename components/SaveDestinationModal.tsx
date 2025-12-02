'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Collection } from '@/types/personalization';
import { CollectionsManager } from './CollectionsManager';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SaveDestinationModalProps {
  destinationId: number;
  destinationSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (collectionId: string | null) => void;
}

export function SaveDestinationModal({
  destinationId,
  destinationSlug,
  isOpen,
  onClose,
  onSave,
}: SaveDestinationModalProps) {
  const { user } = useAuth();
  const [currentCollectionId, setCurrentCollectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCurrentSave();
    }
  }, [isOpen, destinationId]);

  async function loadCurrentSave() {
    try {
      if (!user) return;
      const supabaseClient = createClient();

      const { data } = await supabaseClient
        .from('saved_destinations')
        .select('collection_id')
        .eq('user_id', user.id)
        .eq('destination_id', destinationId)
        .maybeSingle();

      const savedData = data as any;
      if (savedData) {
        setCurrentCollectionId(savedData.collection_id || null);
      }
    } catch (error) {
      // Not saved yet
      setCurrentCollectionId(null);
    }
  }

  async function handleSave(collectionId: string | null) {
    setSaving(true);
    try {
      if (!user) return;
      const supabaseClient = createClient();

      // Check if already saved
      const { data: existing } = await supabaseClient
        .from('saved_destinations')
        .select('id')
        .eq('user_id', user.id)
        .eq('destination_id', destinationId)
        .maybeSingle();

      if (existing) {
        // Update collection
        const { error } = await supabaseClient
          .from('saved_destinations')
          .update({ collection_id: collectionId })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new save
        const { error } = await supabaseClient
          .from('saved_destinations')
          .insert({
            user_id: user.id,
            destination_id: destinationId,
            collection_id: collectionId,
          });

        if (error) throw error;

        // Also save to saved_places for simple save functionality
        const { error: placesError } = await supabaseClient
          .from('saved_places')
          .upsert({
            user_id: user.id,
            destination_slug: destinationSlug,
          });

        if (placesError) {
          console.warn('Error saving to saved_places:', placesError);
          // Don't throw - saved_destinations save succeeded
        }
      }

      setCurrentCollectionId(collectionId);
      
      // Track save event to Discovery Engine
      if (user && collectionId !== null) {
        fetch('/api/discovery/track-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            eventType: 'save',
            documentId: destinationSlug,
          }),
        }).catch((error) => {
          console.warn('Failed to track save event:', error);
        });
      }
      
      if (onSave) onSave(collectionId);
      onClose();
    } catch (error) {
      console.error('Error saving destination:', error);
      alert('Failed to save destination. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsave() {
    setSaving(true);
    try {
      if (!user) return;
      const supabaseClient = createClient();

      // Delete from saved_destinations
      const { error: destError } = await supabaseClient
        .from('saved_destinations')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_id', destinationId);

      if (destError) throw destError;

      // Also delete from saved_places for consistency
      const { error: placesError } = await supabaseClient
        .from('saved_places')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_slug', destinationSlug);

      if (placesError) {
        console.warn('Error removing from saved_places:', placesError);
        // Don't throw - saved_destinations deletion succeeded
      }

      setCurrentCollectionId(null);
      if (onSave) onSave(null);
      onClose();
    } catch (error) {
      console.error('Error unsaving destination:', error);
      alert('Failed to unsave destination. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-800">
          <DialogTitle>Save Destination</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <CollectionsManager
            destinationId={destinationId}
            onCollectionSelect={handleSave}
          />
        </div>

        <DialogFooter className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2 sm:justify-start">
          {currentCollectionId && (
            <Button
              variant="outline"
              onClick={handleUnsave}
              disabled={saving}
              className="flex-1 rounded-full"
            >
              {saving ? 'Removing...' : 'Remove from Saved'}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={onClose}
            className="rounded-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

