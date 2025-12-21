'use client';

import { useState, useMemo } from 'react';
import { Star, ThumbsUp, MessageSquare, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Review {
  author_name: string;
  rating: number;
  text: string;
  time?: number;
  relative_time_description?: string;
  profile_photo_url?: string;
}

interface EnhancedReviewsProps {
  reviews: Review[];
  overallRating?: number;
  totalRatings?: number;
  destinationName: string;
}

type FilterType = 'all' | '5' | '4' | '3' | '2' | '1';

const KEYWORDS_TO_TRACK = [
  { key: 'service', keywords: ['service', 'staff', 'friendly', 'helpful', 'attentive', 'welcoming'], emoji: '👨‍💼' },
  { key: 'food', keywords: ['food', 'dish', 'meal', 'menu', 'taste', 'delicious', 'chef'], emoji: '🍽️' },
  { key: 'ambiance', keywords: ['ambiance', 'atmosphere', 'vibe', 'decor', 'beautiful', 'stunning', 'interior'], emoji: '✨' },
  { key: 'location', keywords: ['location', 'view', 'views', 'rooftop', 'terrace', 'setting'], emoji: '📍' },
  { key: 'rooms', keywords: ['room', 'suite', 'bed', 'comfortable', 'spacious', 'clean'], emoji: '🛏️' },
  { key: 'value', keywords: ['value', 'worth', 'price', 'affordable', 'reasonable'], emoji: '💰' },
];

export function EnhancedReviews({
  reviews,
  overallRating,
  totalRatings,
  destinationName,
}: EnhancedReviewsProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAll, setShowAll] = useState(false);

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      const rating = Math.round(review.rating);
      if (rating >= 1 && rating <= 5) {
        dist[rating as keyof typeof dist]++;
      }
    });
    return dist;
  }, [reviews]);

  // Calculate most praised aspects
  const praisedAspects = useMemo(() => {
    const counts: Record<string, number> = {};
    const positiveReviews = reviews.filter((r) => r.rating >= 4);

    KEYWORDS_TO_TRACK.forEach(({ key, keywords }) => {
      counts[key] = 0;
      positiveReviews.forEach((review) => {
        const text = (review.text || '').toLowerCase();
        if (keywords.some((kw) => text.includes(kw))) {
          counts[key]++;
        }
      });
    });

    return KEYWORDS_TO_TRACK
      .filter(({ key }) => counts[key] > 0)
      .map(({ key, emoji }) => ({
        key,
        emoji,
        count: counts[key],
        percentage: Math.round((counts[key] / positiveReviews.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [reviews]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    if (filter === 'all') return reviews;
    return reviews.filter((r) => Math.round(r.rating) === parseInt(filter));
  }, [reviews, filter]);

  const displayedReviews = showAll ? filteredReviews : filteredReviews.slice(0, 4);

  // Calculate actual rating from reviews if not provided
  const actualRating =
    overallRating ||
    (reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0);

  const formatLabel = (key: string) => {
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Rating Summary */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        {/* Overall Rating */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {actualRating.toFixed(1)}
            </div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'w-4 h-4',
                    star <= Math.round(actualRating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200 dark:text-gray-700'
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {totalRatings || reviews.length} reviews
            </p>
          </div>

          {/* Rating Bars */}
          <div className="flex-1 space-y-1.5 min-w-[160px]">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating as keyof typeof ratingDistribution];
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <button
                  key={rating}
                  onClick={() => setFilter(filter === String(rating) ? 'all' : (String(rating) as FilterType))}
                  className={cn(
                    'flex items-center gap-2 w-full group transition-opacity',
                    filter !== 'all' && filter !== String(rating) && 'opacity-40'
                  )}
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-3">
                    {rating}
                  </span>
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">
                    {Math.round(percentage)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Most Praised Aspects */}
      {praisedAspects.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Most Praised
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {praisedAspects.map(({ key, emoji, percentage }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-sm border border-gray-200 dark:border-gray-700"
              >
                <span>{emoji}</span>
                <span className="text-gray-700 dark:text-gray-300">{formatLabel(key)}</span>
                <span className="text-xs text-gray-400">({percentage}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
            filter === 'all'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
        >
          All Reviews
        </button>
        {[5, 4, 3].map((rating) => (
          <button
            key={rating}
            onClick={() => setFilter(String(rating) as FilterType)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1',
              filter === String(rating)
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {rating}
            <Star className="w-3 h-3 fill-current" />
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {displayedReviews.map((review, idx) => (
          <div
            key={idx}
            className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                {review.profile_photo_url ? (
                  <img
                    src={review.profile_photo_url}
                    alt={review.author_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {review.author_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Author & Rating */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {review.author_name}
                  </span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'w-3.5 h-3.5',
                          star <= review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200 dark:text-gray-700'
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Time */}
                {review.relative_time_description && (
                  <p className="text-xs text-gray-400 mb-2">
                    {review.relative_time_description}
                  </p>
                )}

                {/* Review Text */}
                {review.text && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {review.text}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {filteredReviews.length > 4 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          {showAll ? (
            <>Show Less</>
          ) : (
            <>
              See all {filteredReviews.length} reviews
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
