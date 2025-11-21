'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Collection } from '@/types/personalization';
import { CollectionsManager } from './CollectionsManager';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';

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
  const toast = useToast();
  const [currentCollectionId, setCurrentCollectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadCurrentSave();
    } else if (isOpen && !user) {
      setCurrentCollectionId(null);
    }
  }, [isOpen, destinationId, user]);

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
    if (!user) {
      setError('Sign in to save destinations to your lists.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
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
      setError('Failed to save destination. Please try again.');
      toast.error('Failed to save destination. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsave() {
    if (!user) {
      setError('Sign in to manage your saved destinations.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
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
      setError('Failed to unsave destination. Please try again.');
      toast.error('Failed to unsave destination. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold">Save Destination</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-2xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sign in to save destinations</div>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
              Create an account to build collections, save places, and pick up right where you left off.
            </p>
            <Link
              href="/account"
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition-colors"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mx-4 mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <CollectionsManager
                destinationId={destinationId}
                onCollectionSelect={handleSave}
              />
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
              {currentCollectionId && (
                <button
                  onClick={handleUnsave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-2xl disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Removing...' : 'Remove from Saved'}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

