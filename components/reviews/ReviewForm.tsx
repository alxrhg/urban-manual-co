'use client';

import { useState, useCallback } from 'react';
import { Star, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { CreateReviewInput } from '@/types/features';

interface ReviewFormProps {
  destinationId: number;
  destinationName: string;
  onSubmit: (review: CreateReviewInput) => Promise<void>;
  onCancel?: () => void;
}

export function ReviewForm({ destinationId, destinationName, onSubmit, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [photos, setPhotos] = useState<{ url: string; caption?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (rating === 0) {
        setError('Please select a rating');
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit({
          destination_id: destinationId,
          rating,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          visit_date: visitDate || undefined,
          photos: photos.length > 0 ? photos : undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit review');
      } finally {
        setIsSubmitting(false);
      }
    },
    [destinationId, rating, title, content, visitDate, photos, onSubmit]
  );

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // In a real implementation, you'd upload to storage and get URLs
    // For now, we'll just show a placeholder
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotos((prev) => [...prev, { url: event.target?.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Review {destinationName}</h3>
      </div>

      {/* Rating */}
      <div>
        <Label>Rating *</Label>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        )}
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title">Title (optional)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={255}
          className="mt-1"
        />
      </div>

      {/* Content */}
      <div>
        <Label htmlFor="content">Your Review (optional)</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with others..."
          rows={4}
          maxLength={2000}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">{content.length}/2000 characters</p>
      </div>

      {/* Visit Date */}
      <div>
        <Label htmlFor="visitDate">Visit Date (optional)</Label>
        <Input
          id="visitDate"
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="mt-1"
        />
      </div>

      {/* Photos */}
      <div>
        <Label>Photos (optional)</Label>
        <div className="mt-1 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {photos.map((photo, index) => (
              <div key={index} className="relative">
                <img src={photo.url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          {photos.length < 5 && (
            <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-fit">
              <Upload className="h-4 w-4" />
              <span className="text-sm">Add Photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          )}
          <p className="text-xs text-gray-500">Up to 5 photos</p>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || rating === 0}>
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </form>
  );
}
