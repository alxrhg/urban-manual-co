'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, TrendingUp, Loader2 } from 'lucide-react';

interface InsightsDashboardProps {
  userId: string;
  className?: string;
}

export default function InsightsDashboard({ userId, className = '' }: InsightsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    fetchInsights();
  }, [userId]);

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/account/insights');
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upcoming Peak Windows */}
      {insights.upcomingPeakWindows && insights.upcomingPeakWindows.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Peak Windows
          </h3>
          <div className="space-y-2">
            {insights.upcomingPeakWindows.map((window: any, index: number) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{window.city}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {window.event} — {window.text}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Categories Explored
        </h3>
        <div className="space-y-3">
          {Object.entries(insights.visitedByCategory || {}).map(([category, count]: [string, any]) => {
            const savedCount = insights.savedByCategory[category] || 0;
            const total = count + savedCount;
            const visitedPercent = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize">{category}</span>
                  <span className="text-gray-500">{count} visited, {savedCount} saved</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black dark:bg-white transition-all duration-500"
                    style={{ width: `${visitedPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Taste Alignment */}
      {insights.tasteAlignment && insights.tasteAlignment.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Taste Alignment</h3>
          <div className="space-y-2">
            {insights.tasteAlignment.map((item: any, index: number) => (
              <div key={index}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="capitalize">{item.interest}</span>
                  <span className="text-gray-500">{item.percentage}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black dark:bg-white transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div>
          <div className="text-2xl font-semibold">{insights.stats?.totalVisited || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Places Visited</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">{insights.stats?.citiesExplored || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Cities Explored</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">{insights.stats?.totalSaved || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Saved Places</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">{insights.stats?.citiesSaved || 0}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Cities Saved</div>
        </div>
      </div>
    </div>
  );
}

