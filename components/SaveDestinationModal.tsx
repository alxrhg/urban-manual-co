'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Collection } from '@/types/personalization';
import { CollectionsManager } from './CollectionsManager';
import { X, ChevronDown, Check, Star } from 'lucide-react';

interface SaveDestinationModalProps {
  destinationId: number;
  destinationSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (collectionId: string | null) => void;
  onVisit?: (visited: boolean) => void;
}

export function SaveDestinationModal({
  destinationId,
  destinationSlug,
  isOpen,
  onClose,
  onSave,
  onVisit,
}: SaveDestinationModalProps) {
  const [currentCollectionId, setCurrentCollectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showVisitedOptions, setShowVisitedOptions] = useState(false);
  const [isVisited, setIsVisited] = useState(false);
  const [visitRating, setVisitRating] = useState<number | null>(null);
  const [visitNotes, setVisitNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCurrentSave();
      loadVisitedStatus();
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

  async function loadVisitedStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('visited_places')
        .select('rating, notes')
        .eq('user_id', user.id)
        .eq('destination_slug', destinationSlug)
        .single();

      if (data) {
        setIsVisited(true);
        setVisitRating(data.rating || null);
        setVisitNotes(data.notes || '');
      } else {
        setIsVisited(false);
        setVisitRating(null);
        setVisitNotes('');
      }
    } catch (error) {
      // Not visited yet
      setIsVisited(false);
      setVisitRating(null);
      setVisitNotes('');
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

  async function handleVisitToggle() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isVisited) {
        // Remove visit
        const { error } = await supabase
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destinationSlug);

        if (error) throw error;

        setIsVisited(false);
        setVisitRating(null);
        setVisitNotes('');
        setShowVisitedOptions(false);
        if (onVisit) onVisit(false);
      } else {
        // Add visit
        const { error } = await supabase
          .from('visited_places')
          .insert({
            user_id: user.id,
            destination_slug: destinationSlug,
            visited_at: new Date().toISOString(),
            rating: visitRating,
            notes: visitNotes || null,
          });

        if (error) throw error;

        setIsVisited(true);
        if (onVisit) onVisit(true);
      }
    } catch (error) {
      console.error('Error toggling visit:', error);
      alert('Failed to update visit status. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Save Destination</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <CollectionsManager
            destinationId={destinationId}
            onCollectionSelect={handleSave}
          />

          {/* Visited Section */}
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowVisitedOptions(!showVisitedOptions)}
              className="w-full flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Check className={`h-5 w-5 ${isVisited ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} />
                <span className="font-medium">{isVisited ? 'Visited' : 'Mark as Visited'}</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${
                  showVisitedOptions ? 'transform rotate-180' : ''
                }`}
              />
            </button>

            {showVisitedOptions && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl space-y-4">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium mb-2">Rating (Optional)</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setVisitRating(visitRating === star ? null : star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            visitRating && star <= visitRating
                              ? 'fill-gray-900 dark:fill-white text-gray-900 dark:text-white'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    value={visitNotes}
                    onChange={(e) => setVisitNotes(e.target.value)}
                    placeholder="Share your experience, tips, or memories..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none text-sm"
                  />
                </div>

                {/* Visit Action Button */}
                <button
                  onClick={handleVisitToggle}
                  disabled={saving}
                  className={`w-full px-4 py-2 rounded-2xl font-medium transition-colors disabled:opacity-50 ${
                    isVisited
                      ? 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                      : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'
                  }`}
                >
                  {saving ? 'Updating...' : isVisited ? 'Remove Visit' : 'Mark as Visited'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          {currentCollectionId && (
            <button
              onClick={handleUnsave}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl disabled:opacity-50 transition-colors"
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
      </div>
    </div>
  );
}

