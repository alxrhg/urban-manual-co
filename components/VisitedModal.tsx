'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Star, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ModalBase } from './ModalBase';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const dateInputId = useId();
  const ratingGroupId = useId();
  const notesInputId = useId();

  useBodyScrollLock(isOpen);
  useFocusTrap(dialogRef, isOpen, {
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

  useEffect(() => {
    if (isOpen) {
      loadVisitedData();
    }
  }, [isOpen, destinationSlug]);

  async function loadVisitedData() {
    try {
      if (!user) return;
      const supabaseClient = createClient();

      const { data } = await supabaseClient
        .from('visited_places')
        .select('rating, notes, visited_at')
        .eq('user_id', user.id)
        .eq('destination_slug', destinationSlug)
        .maybeSingle();

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
      if (!user) return;
      const supabaseClient = createClient();

      // Check if visit already exists
      const { data: existing } = await supabaseClient
        .from('visited_places')
        .select('id')
        .eq('user_id', user.id)
        .eq('destination_slug', destinationSlug)
        .maybeSingle();

      if (existing) {
        // Update existing visit
        const { error } = await supabaseClient
          .from('visited_places')
          .update({
            rating: visitRating,
            notes: visitNotes || null,
            visited_at: new Date(visitDate).toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new visit
        const { error } = await supabaseClient
          .from('visited_places')
          .insert({
            user_id: user.id,
            destination_slug: destinationSlug,
            rating: visitRating,
            notes: visitNotes || null,
            visited_at: new Date(visitDate).toISOString(),
          });

        if (error) {
          // Check if error is related to activity_feed RLS policy
          if (error.message && error.message.includes('activity_feed') && error.message.includes('row-level security')) {
            // Visit was created but activity_feed insert failed - this is okay, continue
            console.warn('Visit created but activity_feed insert failed due to RLS policy. Visit status updated successfully.');
          } else {
            throw error;
          }
        }
        
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

  return (
    <ModalBase
      ref={dialogRef}
      isOpen={isOpen}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onBackdropClick={onClose}
      className="max-w-md w-full"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 flex-row-reverse p-4 border-b border-gray-200 dark:border-gray-800">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-dark-blue-700 transition-colors ml-auto"
            aria-label="Close visit details"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 id={titleId} className="text-xl font-semibold text-gray-900 dark:text-white flex-1">
            Visit Details
          </h2>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add details about your visit to <span className="font-medium text-gray-900 dark:text-white">{destinationName}</span>
          </p>

          {/* Visit Date */}
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor={dateInputId}>
              Visit Date
            </label>
            <div className="relative">
              <input
                id={dateInputId}
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
            <span id={ratingGroupId} className="block text-sm font-medium mb-2">
              Rating (Optional)
            </span>
            <div className="flex gap-1" role="group" aria-labelledby={ratingGroupId}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setVisitRating(visitRating === star ? null : star)}
                  className="transition-transform hover:scale-110"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  aria-pressed={visitRating === star}
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
            <label className="block text-sm font-medium mb-2" htmlFor={notesInputId}>
              Notes (Optional)
            </label>
            <textarea
              id={notesInputId}
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
    </ModalBase>
  );
}
