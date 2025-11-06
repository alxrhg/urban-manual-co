'use client';

import React, { useState } from 'react';
import { useTrendingSearches, useRealtimeTrends } from '@/hooks/useGoogleTrends';

interface GoogleTrendsSectionProps {
  region?: string;
  showRealtime?: boolean;
}

export default function GoogleTrendsSection({
  region = 'united_states',
  showRealtime = false,
}: GoogleTrendsSectionProps) {
  const [selectedRegion, setSelectedRegion] = useState(region);

  // Fetch trending searches
  const { data: trendingData, loading: trendingLoading, error: trendingError } = useTrendingSearches(
    selectedRegion,
    !showRealtime
  );

  // Fetch realtime trends (US format)
  const realtimeRegion = selectedRegion === 'united_states' ? 'US' : 'GB';
  const { data: realtimeData, loading: realtimeLoading, error: realtimeError } = useRealtimeTrends(
    realtimeRegion,
    'all',
    showRealtime
  );

  const loading = showRealtime ? realtimeLoading : trendingLoading;
  const error = showRealtime ? realtimeError : trendingError;
  const data = showRealtime ? realtimeData : trendingData;

  // Region options
  const regions = [
    { value: 'united_states', label: 'United States', code: 'US' },
    { value: 'united_kingdom', label: 'United Kingdom', code: 'GB' },
    { value: 'japan', label: 'Japan', code: 'JP' },
    { value: 'australia', label: 'Australia', code: 'AU' },
    { value: 'canada', label: 'Canada', code: 'CA' },
    { value: 'germany', label: 'Germany', code: 'DE' },
    { value: 'france', label: 'France', code: 'FR' },
    { value: 'india', label: 'India', code: 'IN' },
  ];

  return (
    <div className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {showRealtime ? 'Real-Time Google Trends' : 'Trending Google Searches'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Discover what people are searching for right now
            </p>
          </div>

          {/* Region Selector */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {regions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">
              Failed to load Google Trends data: {error}
            </p>
          </div>
        )}

        {/* Trending Searches Display */}
        {!loading && !error && !showRealtime && trendingData?.trending_searches && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trendingData.trending_searches.map((search, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {search}
                    </p>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(search)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Search on Google →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Realtime Trends Display */}
        {!loading && !error && showRealtime && realtimeData?.trends && realtimeData.trends.length > 0 && (
          <div className="space-y-4">
            {realtimeData.trends.map((trend, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {trend.title}
                    </h3>
                    {trend.traffic && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        🔥 {trend.traffic} searches
                      </p>
                    )}
                    {trend.entityNames && trend.entityNames.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {trend.entityNames.map((entity, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded-full"
                          >
                            {entity}
                          </span>
                        ))}
                      </div>
                    )}
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(trend.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Search on Google →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && (
          showRealtime
            ? (!realtimeData?.trends || realtimeData.trends.length === 0)
            : (!trendingData?.trending_searches || trendingData.trending_searches.length === 0)
        ) && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No trending data available for this region at the moment.
            </p>
          </div>
        )}

        {/* Timestamp */}
        {!loading && !error && data && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Last updated: {showRealtime && realtimeData
                ? new Date(realtimeData.timestamp).toLocaleString()
                : trendingData
                ? new Date(trendingData.timestamp).toLocaleString()
                : 'Just now'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
