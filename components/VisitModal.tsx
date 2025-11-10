'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';

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

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-blue-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {isCurrentlyVisited ? 'Update Visit' : 'Mark as Visited'}
          </h2>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {isCurrentlyVisited 
            ? `Update your visit details for ${destinationName}`
            : `Add ${destinationName} to your visited places`}
        </p>

        <div className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">Rating (Optional)</label>
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
              <span className="text-sm text-gray-600 dark:text-gray-400 mt-1 block">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </span>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share your experience, tips, or memories..."
              rows={4}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-dark-blue-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-dark-blue-600 rounded-2xl hover:bg-gray-100 dark:hover:bg-dark-blue-700 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium"
          >
            {isCurrentlyVisited ? 'Update' : 'Mark as Visited'}
          </button>
        </div>
      </div>
    </div>
  );
}

