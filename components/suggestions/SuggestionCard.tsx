'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ThumbsUp, ThumbsDown, MapPin, ExternalLink, Clock } from 'lucide-react';
import { Badge } from '@/ui/badge';
import type { DestinationSuggestion } from '@/types/features';

interface SuggestionCardProps {
  suggestion: DestinationSuggestion;
  onVote?: (suggestionId: string, voteType: 'up' | 'down') => Promise<void>;
  currentUserId?: string;
}

export function SuggestionCard({ suggestion, onVote, currentUserId }: SuggestionCardProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [localVote, setLocalVote] = useState(suggestion.user_vote);
  const [upvotes, setUpvotes] = useState(suggestion.upvotes);
  const [downvotes, setDownvotes] = useState(suggestion.downvotes);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!onVote || isVoting || suggestion.user_id === currentUserId) return;

    setIsVoting(true);
    try {
      await onVote(suggestion.id, voteType);

      // Optimistic update
      if (localVote === voteType) {
        // Remove vote
        setLocalVote(null);
        if (voteType === 'up') setUpvotes((c) => c - 1);
        else setDownvotes((c) => c - 1);
      } else {
        // Change or add vote
        if (localVote === 'up') setUpvotes((c) => c - 1);
        else if (localVote === 'down') setDownvotes((c) => c - 1);

        setLocalVote(voteType);
        if (voteType === 'up') setUpvotes((c) => c + 1);
        else setDownvotes((c) => c + 1);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    reviewing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    duplicate: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };

  const isOwnSuggestion = currentUserId === suggestion.user_id;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex">
        {/* Voting */}
        <div className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => handleVote('up')}
            disabled={isVoting || isOwnSuggestion}
            className={`p-1 rounded transition-colors ${
              localVote === 'up'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            } ${isOwnSuggestion ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <ThumbsUp className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">{upvotes - downvotes}</span>
          <button
            onClick={() => handleVote('down')}
            disabled={isVoting || isOwnSuggestion}
            className={`p-1 rounded transition-colors ${
              localVote === 'down'
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            } ${isOwnSuggestion ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <ThumbsDown className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{suggestion.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <MapPin className="h-4 w-4" />
                <span>
                  {suggestion.city}
                  {suggestion.country && `, ${suggestion.country}`}
                </span>
                <span>•</span>
                <span>{suggestion.category}</span>
              </div>
            </div>

            {suggestion.photo_url && (
              <Image
                src={suggestion.photo_url}
                alt={suggestion.name}
                width={80}
                height={80}
                className="rounded-lg object-cover"
              />
            )}
          </div>

          {/* Why add */}
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {suggestion.why_add}
          </p>

          {/* Links */}
          <div className="flex gap-3 mt-3 text-sm">
            {suggestion.website && (
              <a
                href={suggestion.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Website
              </a>
            )}
            {suggestion.instagram_handle && (
              <a
                href={`https://instagram.com/${suggestion.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 dark:text-pink-400 hover:underline"
              >
                @{suggestion.instagram_handle}
              </a>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {suggestion.user && (
                <span>
                  Suggested by {suggestion.user.display_name || suggestion.user.username}
                </span>
              )}
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDate(suggestion.created_at)}
              </span>
            </div>
            <Badge className={statusColors[suggestion.status]}>{suggestion.status}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
