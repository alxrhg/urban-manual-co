'use client';

import { useState } from 'react';
import { Star, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useMLSentiment } from '@/hooks/useMLSentiment';

interface Review {
  author_name?: string;
  rating?: number;
  text?: string;
  relative_time_description?: string;
  time?: number;
  profile_photo_url?: string;
}

interface ReviewsSummaryProps {
  reviews?: Review[];
  rating?: number | null;
  userRatingsTotal?: number | null;
  destinationId?: number;
}

export function ReviewsSummary({
  reviews = [],
  rating,
  userRatingsTotal,
  destinationId,
}: ReviewsSummaryProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const { sentiment } = useMLSentiment({
    destinationId: destinationId || 0,
    days: 90,
    enabled: !!destinationId,
  });

  if (!reviews.length && !rating) {
    return null;
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  // Calculate rating distribution
  const ratingCounts = [0, 0, 0, 0, 0]; // 1-5 stars
  reviews.forEach((review) => {
    if (review.rating && review.rating >= 1 && review.rating <= 5) {
      ratingCounts[review.rating - 1]++;
    }
  });
  const maxCount = Math.max(...ratingCounts, 1);

  const getSentimentIcon = () => {
    if (!sentiment) return null;
    switch (sentiment.overall_sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSentimentText = () => {
    if (!sentiment) return null;
    const score = Math.round(sentiment.sentiment_score * 100);
    switch (sentiment.overall_sentiment) {
      case 'positive':
        return `${score}% positive sentiment`;
      case 'negative':
        return `${score}% negative sentiment`;
      default:
        return 'Mixed sentiment';
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Reviews
        </h2>
        {sentiment && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {getSentimentIcon()}
            <span>{getSentimentText()}</span>
          </div>
        )}
      </div>

      {/* Rating Overview Card */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Main Rating */}
          {rating && (
            <div className="flex items-center gap-4">
              <div className="text-5xl font-bold text-gray-900 dark:text-white">
                {rating.toFixed(1)}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
                      }`}
                    />
                  ))}
                </div>
                {userRatingsTotal && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Based on {userRatingsTotal.toLocaleString()} reviews
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Rating Distribution */}
          {reviews.length > 0 && (
            <div className="flex-1 space-y-1.5">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-3">{stars}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{
                        width: `${(ratingCounts[stars - 1] / maxCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">
                    {ratingCounts[stars - 1]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sentiment Breakdown */}
        {sentiment && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {sentiment.positive_count}
                </div>
                <div className="text-xs text-gray-500">Positive</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-gray-400">
                  {sentiment.neutral_count}
                </div>
                <div className="text-xs text-gray-500">Neutral</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-red-600 dark:text-red-400">
                  {sentiment.negative_count}
                </div>
                <div className="text-xs text-gray-500">Negative</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Individual Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          {displayedReviews.map((review, idx) => (
            <article
              key={idx}
              className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {review.profile_photo_url ? (
                    <img
                      src={review.profile_photo_url}
                      alt={review.author_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {review.author_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {review.author_name || 'Anonymous'}
                    </span>
                    {review.relative_time_description && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {review.relative_time_description}
                      </span>
                    )}
                  </div>

                  {/* Rating stars */}
                  {review.rating && (
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating!
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Review text */}
                  {review.text && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {review.text}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}

          {/* Show more/less button */}
          {reviews.length > 3 && (
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {showAllReviews ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show all {reviews.length} reviews
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
