'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Collection } from '@/types/personalization';
import { CollectionsManager } from './CollectionsManager';
import { X } from 'lucide-react';

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
  const [currentCollectionId, setCurrentCollectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCurrentSave();
    }
  }, [isOpen, destinationId]);

  async function loadCurrentSave() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('saved_destinations')
        .select('collection_id')
        .eq('user_id', user.id)
        .eq('destination_id', destinationId)
        .single();

      if (data) {
        setCurrentCollectionId(data.collection_id || null);
      }
    } catch (error) {
      // Not saved yet
      setCurrentCollectionId(null);
    }
  }

  async function handleSave(collectionId: string | null) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already saved
      const { data: existing } = await supabase
        .from('saved_destinations')
        .select('id')
        .eq('user_id', user.id)
        .eq('destination_id', destinationId)
        .single();

      if (existing) {
        // Update collection
        const { error } = await supabase
          .from('saved_destinations')
          .update({ collection_id: collectionId })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new save
        const { error } = await supabase
          .from('saved_destinations')
          .insert({
            user_id: user.id,
            destination_id: destinationId,
            collection_id: collectionId,
          });

        if (error) throw error;
      }

      setCurrentCollectionId(collectionId);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('saved_destinations')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_id', destinationId);

      if (error) throw error;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Save to Collection</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <CollectionsManager
            destinationId={destinationId}
            onCollectionSelect={handleSave}
          />
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          {currentCollectionId && (
            <button
              onClick={handleUnsave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Removing...' : 'Remove from Saved'}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

