'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rating: number | null, notes: string) => void;
  destinationName: string;
  isCurrentlyVisited: boolean;
}

export default function VisitModal({
  isOpen,
  onClose,
  onConfirm,
  destinationName,
  isCurrentlyVisited,
}: VisitModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onConfirm(rating, notes);
    setRating(null);
    setNotes('');
    onClose();
  };

  const handleCancel = () => {
    setRating(null);
    setNotes('');
    onClose();
  };

  const getRatingLabel = (r: number) => {
    switch (r) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCurrentlyVisited ? 'Update Visit' : 'Mark as Visited'}
          </DialogTitle>
          <DialogDescription>
            {isCurrentlyVisited
              ? `Update your visit details for ${destinationName}`
              : `Add ${destinationName} to your visited places`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating (Optional)</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      rating && star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating && (
              <span className="text-sm text-gray-600 dark:text-gray-400 block">
                {getRatingLabel(rating)}
              </span>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="visit-notes">Notes (Optional)</Label>
            <Textarea
              id="visit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share your experience, tips, or memories..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} className="rounded-full">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="rounded-full">
            {isCurrentlyVisited ? 'Update' : 'Mark as Visited'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
