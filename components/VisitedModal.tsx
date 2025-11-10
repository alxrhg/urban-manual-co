'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Star, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface VisitedModalProps {
  destinationSlug: string;
  destinationName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function VisitedModal({
  destinationSlug,
  destinationName,
  isOpen,
  onClose,
  onUpdate,
}: VisitedModalProps) {
  const { user } = useAuth();
  const [visitRating, setVisitRating] = useState<number | null>(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVisitedData();
    }
  }, [isOpen, destinationSlug]);

  async function loadVisitedData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('visited_places')
        .select('rating, notes, visited_at')
        .eq('user_id', user.id)
        .eq('destination_slug', destinationSlug)
        .single();

      const visitData = data as any;
      if (visitData) {
        setVisitRating(visitData.rating || null);
        setVisitNotes(visitData.notes || '');
        if (visitData.visited_at) {
          setVisitDate(new Date(visitData.visited_at).toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      // Visit doesn't exist yet or error loading
      console.error('Error loading visit data:', error);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if visit already exists
      const { data: existing } = await supabase
        .from('visited_places')
        .select('id')
        .eq('user_id', user.id)
        .eq('destination_slug', destinationSlug)
        .single();

      if (existing) {
        // Update existing visit
        const { error } = await (supabase
          .from('visited_places')
          .update as any)({
            rating: visitRating,
            notes: visitNotes || null,
            visited_at: new Date(visitDate).toISOString(),
          })
          .eq('id', (existing as any).id);

        if (error) throw error;
      } else {
        // Create new visit
        const { error } = await (supabase
          .from('visited_places')
          .insert as any)({
            user_id: user.id,
            destination_slug: destinationSlug,
            rating: visitRating,
            notes: visitNotes || null,
            visited_at: new Date(visitDate).toISOString(),
          });

        if (error) throw error;
        
        // Track visit event to Discovery Engine (only for new visits)
        if (user) {
          fetch('/api/discovery/track-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              eventType: 'visit',
              documentId: destinationSlug,
            }),
          }).catch((error) => {
            console.warn('Failed to track visit event:', error);
          });
        }
      }

      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving visit details:', error);
      alert('Failed to save visit details. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold">Visit Details</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-2xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add details about your visit to <span className="font-medium text-gray-900 dark:text-white">{destinationName}</span>
          </p>

          {/* Visit Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Visit Date</label>
            <div className="relative">
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-sm"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

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
                    className={`h-7 w-7 ${
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
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 resize-none text-sm"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-2xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black hover:opacity-80 rounded-2xl font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>
    </div>
  );
}
