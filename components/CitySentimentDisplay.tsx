/**
 * City-Level Sentiment Analysis Display Component
 *
 * Shows sentiment analysis results for cities (aggregated from destinations)
 */

'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2, Heart } from 'lucide-react';

interface CitySentimentDisplayProps {
  city: string;
  days?: number;
}

interface CitySentimentData {
  city: string;
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  destination_count: number;
  generated_at: string;
}

export function CitySentimentDisplay({ city, days = 30 }: CitySentimentDisplayProps) {
  const [sentiment, setSentiment] = useState<CitySentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!city) {
      setLoading(false);
      return;
    }

    const fetchCitySentiment = async () => {
      setLoading(true);
      setError(null);

      try {
        // For now, we'll show a placeholder since city-level sentiment requires aggregation
        // In production, you'd call an endpoint like /api/ml/sentiment/city/{city}
        // For now, we'll show a message
        setSentiment(null);
      } catch (err) {
        console.error('Error fetching city sentiment:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sentiment');
      } finally {
        setLoading(false);
      }
    };

    fetchCitySentiment();
  }, [city, days]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Analyzing sentiment for {city}...</span>
      </div>
    );
  }

  if (error || !sentiment) {
    return (
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
        <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-500 mb-2">
          City-level sentiment analysis
        </p>
        <p className="text-xs text-gray-400">
          This feature aggregates sentiment from all destinations in {city}. 
          Select individual destinations to see detailed sentiment analysis.
        </p>
      </div>
    );
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

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        {getSentimentIcon()}
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Sentiment Analysis - {city}
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

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Destinations analyzed:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {sentiment.destination_count}
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

