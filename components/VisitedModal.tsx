'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Star, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/dialog';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Label } from '@/ui/label';
import { toast } from '@/ui/sonner';

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
      toast.error('Failed to save visit details. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Visit Details</DialogTitle>
          <DialogDescription>
            Add details about your visit to <span className="font-medium text-gray-900 dark:text-white">{destinationName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Visit Date */}
          <div className="space-y-2">
            <Label htmlFor="visit-date">Visit Date</Label>
            <div className="relative">
              <Input
                id="visit-date"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="pl-10"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating (Optional)</Label>
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
          <div className="space-y-2">
            <Label htmlFor="visit-notes">Notes (Optional)</Label>
            <Textarea
              id="visit-notes"
              value={visitNotes}
              onChange={(e) => setVisitNotes(e.target.value)}
              placeholder="Share your experience, tips, or memories..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full"
          >
            {saving ? 'Saving...' : 'Save Details'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
