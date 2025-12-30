'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star, ThumbsUp, ThumbsDown, Flag, MoreHorizontal, CheckCircle } from 'lucide-react';
import { Button } from '@/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import type { Review } from '@/types/features';

interface ReviewCardProps {
  review: Review;
  onVote?: (reviewId: string, voteType: 'helpful' | 'not_helpful') => Promise<void>;
  onFlag?: (reviewId: string) => void;
  currentUserId?: string;
}

export function ReviewCard({ review, onVote, onFlag, currentUserId }: ReviewCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [localVote, setLocalVote] = useState(review.user_vote);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [notHelpfulCount, setNotHelpfulCount] = useState(review.not_helpful_count);

  const handleVote = async (voteType: 'helpful' | 'not_helpful') => {
    if (!onVote || isVoting) return;

    setIsVoting(true);
    try {
      await onVote(review.id, voteType);

      // Optimistic update
      if (localVote === voteType) {
        // Remove vote
        setLocalVote(null);
        if (voteType === 'helpful') setHelpfulCount((c) => c - 1);
        else setNotHelpfulCount((c) => c - 1);
      } else {
        // Change or add vote
        if (localVote === 'helpful') setHelpfulCount((c) => c - 1);
        else if (localVote === 'not_helpful') setNotHelpfulCount((c) => c - 1);

        setLocalVote(voteType);
        if (voteType === 'helpful') setHelpfulCount((c) => c + 1);
        else setNotHelpfulCount((c) => c + 1);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOwnReview = currentUserId === review.user_id;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-4 last:border-b-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {review.user?.avatar_url ? (
            <Image
              src={review.user.avatar_url}
              alt={review.user.display_name || 'User'}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-medium">
                {(review.user?.display_name || 'U')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {review.user?.display_name || review.user?.username || 'Anonymous'}
              </span>
              {review.is_verified && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" /> Verified Visit
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {renderStars(review.rating)}
              <span>•</span>
              <span>{formatDate(review.created_at)}</span>
              {review.visit_date && (
                <>
                  <span>•</span>
                  <span>Visited {formatDate(review.visit_date)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!isOwnReview && onFlag && (
              <DropdownMenuItem onClick={() => onFlag(review.id)}>
                <Flag className="h-4 w-4 mr-2" /> Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      {review.title && <h4 className="font-medium mb-2">{review.title}</h4>}

      {/* Content */}
      {review.content && (
        <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">{review.content}</p>
      )}

      {/* Photos */}
      {review.photos && review.photos.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {review.photos.map((photo) => (
            <Image
              key={photo.id}
              src={photo.url}
              alt={photo.caption || 'Review photo'}
              width={120}
              height={120}
              className="rounded-lg object-cover flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* Actions */}
      {!isOwnReview && onVote && (
        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={() => handleVote('helpful')}
            disabled={isVoting}
            className={`flex items-center gap-1 text-sm transition-colors ${
              localVote === 'helpful'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Helpful ({helpfulCount})</span>
          </button>
          <button
            onClick={() => handleVote('not_helpful')}
            disabled={isVoting}
            className={`flex items-center gap-1 text-sm transition-colors ${
              localVote === 'not_helpful'
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ThumbsDown className="h-4 w-4" />
            <span>Not Helpful ({notHelpfulCount})</span>
          </button>
        </div>
      )}
    </div>
  );
}
