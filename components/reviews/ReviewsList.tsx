'use client';

import { useState, useCallback, useEffect } from 'react';
import { Star, Plus } from 'lucide-react';
import { Button } from '@/ui/button';
import { ReviewCard } from './ReviewCard';
import { ReviewForm } from './ReviewForm';
import type { Review, CreateReviewInput } from '@/types/features';
import { useAuth } from '@/contexts/AuthContext';

interface ReviewsListProps {
  destinationId: number;
  destinationSlug: string;
  destinationName: string;
  initialReviews?: Review[];
}

export function ReviewsList({
  destinationId,
  destinationSlug,
  destinationName,
  initialReviews = [],
}: ReviewsListProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [isLoading, setIsLoading] = useState(!initialReviews.length);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'helpful' | 'rating_high' | 'rating_low'>('newest');
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchReviews = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const newOffset = reset ? 0 : offset;
      const res = await fetch(
        `/api/reviews?destination_slug=${destinationSlug}&sort=${sortBy}&limit=10&offset=${newOffset}`
      );
      const data = await res.json();

      if (reset) {
        setReviews(data.reviews);
        setOffset(10);
      } else {
        setReviews((prev) => [...prev, ...data.reviews]);
        setOffset((prev) => prev + 10);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setIsLoading(false);
    }
  }, [destinationSlug, sortBy, offset]);

  useEffect(() => {
    if (!initialReviews.length) {
      fetchReviews(true);
    }
  }, [sortBy]);

  const handleSubmitReview = useCallback(
    async (reviewData: CreateReviewInput) => {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to submit review');
      }

      const { review } = await res.json();

      // Add to top of list
      setReviews((prev) => [{ ...review, user: { display_name: user?.email?.split('@')[0] } }, ...prev]);
      setShowForm(false);
    },
    [user]
  );

  const handleVote = useCallback(async (reviewId: string, voteType: 'helpful' | 'not_helpful') => {
    await fetch(`/api/reviews/${reviewId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote_type: voteType }),
    });
  }, []);

  const handleFlag = useCallback((reviewId: string) => {
    // Open flag modal or submit flag
    console.log('Flag review:', reviewId);
  }, []);

  // Calculate rating distribution
  const ratingDistribution = reviews.reduce(
    (acc, review) => {
      acc[review.rating] = (acc[review.rating] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const userHasReviewed = reviews.some((r) => r.user_id === user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Reviews ({reviews.length})</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">
                {averageRating.toFixed(1)} average
              </span>
            </div>
          )}
        </div>

        {user && !userHasReviewed && !showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Write Review
          </Button>
        )}
      </div>

      {/* Rating Distribution */}
      {reviews.length > 0 && (
        <div className="space-y-1">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-2 text-sm">
              <span className="w-12">{rating} stars</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400"
                  style={{
                    width: `${((ratingDistribution[rating] || 0) / reviews.length) * 100}%`,
                  }}
                />
              </div>
              <span className="w-8 text-gray-500">{ratingDistribution[rating] || 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Review Form */}
      {showForm && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <ReviewForm
            destinationId={destinationId}
            destinationName={destinationName}
            onSubmit={handleSubmitReview}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Sort */}
      {reviews.length > 1 && (
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="newest">Newest First</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating_high">Highest Rating</option>
            <option value="rating_low">Lowest Rating</option>
          </select>
        </div>
      )}

      {/* Reviews List */}
      {isLoading && reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No reviews yet</p>
          {user && !showForm && (
            <Button onClick={() => setShowForm(true)} variant="outline" className="mt-2">
              Be the first to review
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onVote={user ? handleVote : undefined}
              onFlag={user ? handleFlag : undefined}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && reviews.length > 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={() => fetchReviews()} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load More Reviews'}
          </Button>
        </div>
      )}
    </div>
  );
}
