'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { VisitHistory } from '@/types/personalization';
import { Destination } from '@/types/destination';
import { Clock, MapPin, Search, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useExperiment } from '@/hooks/useExperiment';
import { trackEvent } from '@/lib/analytics/track';

interface VisitHistoryProps {
  userId: string;
  limit?: number;
}

export function VisitHistoryComponent({ userId, limit = 20 }: VisitHistoryProps) {
  const router = useRouter();
  const [history, setHistory] = useState<(VisitHistory & { destination: Destination })[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    enabled: experimentEnabled,
    loading: experimentLoading,
    assignment: experimentAssignment,
  } = useExperiment('visit_history_personalization', { userId });

  const loadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('visit_history')
        .select(`
          *,
          destination:destinations(*)
        `)
        .eq('user_id', userId)
        .order('visited_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setHistory((data || []) as (VisitHistory & { destination: Destination })[]);
    } catch (error) {
      console.error('Error loading visit history:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    if (experimentLoading) {
      return;
    }

    if (!experimentEnabled) {
      setHistory([]);
      setLoading(false);
      return;
    }

    loadHistory();
  }, [userId, experimentEnabled, experimentLoading, loadHistory]);

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getSourceIcon(source?: string) {
    switch (source) {
      case 'search':
        return <Search className="h-3 w-3" />;
      case 'recommendation':
        return <TrendingUp className="h-3 w-3" />;
      default:
        return <MapPin className="h-3 w-3" />;
    }
  }

  if (loading) {
    if (experimentLoading) {
      return null;
    }
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Loading history...
      </div>
    );
  }

  if (!experimentEnabled) {
    return null;
  }

  if (experimentLoading) {
    return null;
  }

  if (history.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p>No visit history yet</p>
        <p className="text-sm mt-1">Your recently viewed destinations will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => {
        if (!item.destination) return null;
        
        const dest = item.destination;
        return (
          <div
            key={item.id}
            onClick={async () => {
              await trackEvent({
                event_type: 'click',
                destination_id: dest.id,
                destination_slug: dest.slug,
                metadata: {
                  source: item.source || 'visit_history',
                  surface: 'visit_history',
                  experimentKey: experimentAssignment.key,
                  variation: experimentAssignment.variation,
                  dwellTimeMs: item.duration_seconds
                    ? item.duration_seconds * 1000
                    : undefined,
                },
              });

              router.push(`/destination/${dest.slug}`);
            }}
            className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-colors group"
          >
            {dest.image ? (
              <div className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden">
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  sizes="64px"
                  className="object-cover group-hover:scale-105 transition-transform"
                  quality={75}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                <MapPin className="h-6 w-6 text-gray-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{dest.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {dest.city} • {dest.category}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                  {getSourceIcon(item.source)}
                  <Clock className="h-3 w-3 ml-1" />
                  {formatDate(item.visited_at)}
                </div>
                {item.duration_seconds && item.duration_seconds > 60 && (
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {Math.floor(item.duration_seconds / 60)}min view
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

