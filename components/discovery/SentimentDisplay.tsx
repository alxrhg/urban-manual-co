/**
 * Sentiment Analysis Display Component
 *
 * Shows sentiment analysis results for destinations
 */

'use client';

import { useMLSentiment } from '@/hooks/useMLSentiment';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

interface SentimentDisplayProps {
  destinationId: number;
  days?: number;
  compact?: boolean;
}

export function SentimentDisplay({ destinationId, days = 30, compact = false }: SentimentDisplayProps) {
  const { sentiment, loading, error } = useMLSentiment({
    destinationId,
    days,
    enabled: true
  });

  if (loading) {
    return compact ? null : (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Analyzing sentiment...</span>
      </div>
    );
  }

  if (error || !sentiment) {
    return null; // Silently fail
  }

  const getSentimentIcon = () => {
    switch (sentiment.overall_sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSentimentColor = () => {
    switch (sentiment.overall_sentiment) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        {getSentimentIcon()}
        <span className={getSentimentColor()}>
          {sentiment.overall_sentiment}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        {getSentimentIcon()}
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Sentiment Analysis
        </h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Overall sentiment:</span>
          <span className={`font-medium ${getSentimentColor()}`}>
            {sentiment.overall_sentiment}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Sentiment score:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {(sentiment.sentiment_score * 100).toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {sentiment.positive_count}
            </div>
            <div className="text-xs text-gray-500">Positive</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-400">
              {sentiment.neutral_count}
            </div>
            <div className="text-xs text-gray-500">Neutral</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600 dark:text-red-400">
              {sentiment.negative_count}
            </div>
            <div className="text-xs text-gray-500">Negative</div>
          </div>
        </div>
      </div>
    </div>
  );
}

