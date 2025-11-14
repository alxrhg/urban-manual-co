/**
 * Topic Modeling Display Component
 *
 * Shows extracted topics for destinations or cities
 */

'use client';

import { useMLTopics } from '@/hooks/useMLTopics';
import { Tag, Loader2 } from 'lucide-react';

interface TopicsDisplayProps {
  city?: string;
  destinationId?: number;
  minTopicSize?: number;
  compact?: boolean;
}

export function TopicsDisplay({ city, destinationId, minTopicSize = 5, compact = false }: TopicsDisplayProps) {
  const { topics, loading, error } = useMLTopics({
    city,
    destinationId,
    minTopicSize,
    enabled: true
  });

  if (loading) {
    return compact ? null : (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Extracting topics...</span>
      </div>
    );
  }

  if (error || !topics || !topics.topics || topics.topics.length === 0) {
    return null; // Silently fail
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {topics.topics.slice(0, 3).map((topic) => (
          <span
            key={topic.topic_id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs"
          >
            <Tag className="h-3 w-3" />
            {topic.topic_name}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Trending Topics
        </h3>
        <span className="text-xs text-gray-500">
          ({topics.total_topics} topics)
        </span>
      </div>

      <div className="space-y-3">
        {topics.topics.slice(0, 5).map((topic) => (
          <div key={topic.topic_id} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {topic.topic_name}
              </span>
              <span className="text-xs text-gray-500">
                {topic.frequency} mentions
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {topic.keywords.slice(0, 5).map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

