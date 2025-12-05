'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Destination } from '@/types/destination';
import { stripHtmlTags } from '@/lib/stripHtmlTags';

interface DestinationDescriptionProps {
  destination: Destination;
  enrichedData?: {
    editorial_summary?: string;
  } | null;
  reviewSummary?: string | null;
  loadingReviewSummary?: boolean;
}

export function DestinationDescription({
  destination,
  enrichedData,
  reviewSummary,
  loadingReviewSummary,
}: DestinationDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const description = destination.description || destination.content;
  const editorialSummary = enrichedData?.editorial_summary;

  const hasContent = description || editorialSummary || reviewSummary || loadingReviewSummary;

  if (!hasContent) return null;

  const strippedDescription = description ? stripHtmlTags(description) : '';
  const isLong = strippedDescription.length > 200;
  const displayText = isExpanded || !isLong
    ? strippedDescription
    : strippedDescription.slice(0, 200) + '...';

  return (
    <div className="space-y-4">
      {/* Editorial Summary */}
      {editorialSummary && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
            "{editorialSummary}"
          </p>
        </div>
      )}

      {/* Main Description */}
      {description && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {displayText}
          </p>
          {isLong && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Review Summary */}
      {(reviewSummary || loadingReviewSummary) && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            What reviewers say
          </h4>
          {loadingReviewSummary ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <span>Summarizing reviews...</span>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {reviewSummary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
