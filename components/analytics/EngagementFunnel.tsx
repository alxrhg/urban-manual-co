'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  dropoff?: number;
}

export function EngagementFunnel() {
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFunnelData();
  }, []);

  async function loadFunnelData() {
    try {
      setLoading(true);
      setError(null);

      // Get total user count
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get users who viewed at least one destination
      const { data: viewedUsers } = await supabase
        .from('user_interactions')
        .select('user_id')
        .eq('interaction_type', 'view');

      const uniqueViewedUsers = new Set(viewedUsers?.map((u) => u.user_id) || []);

      // Get users who saved at least one destination
      const { data: savedUsers } = await supabase
        .from('user_interactions')
        .select('user_id')
        .eq('interaction_type', 'save');

      const uniqueSavedUsers = new Set(savedUsers?.map((u) => u.user_id) || []);

      // Get users who searched
      const { data: searchedUsers } = await supabase
        .from('visit_history')
        .select('user_id')
        .not('search_query', 'is', null);

      const uniqueSearchedUsers = new Set(searchedUsers?.map((u) => u.user_id) || []);

      // Get users who clicked external links (if tracked)
      const { data: clickedUsers } = await supabase
        .from('user_interactions')
        .select('user_id')
        .in('interaction_type', ['click', 'click_website', 'click_maps']);

      const uniqueClickedUsers = new Set(clickedUsers?.map((u) => u.user_id) || []);

      // Build funnel
      const funnelData: FunnelStage[] = [
        {
          stage: 'Signed Up',
          count: totalUsers || 0,
          percentage: 100,
        },
        {
          stage: 'Viewed Destinations',
          count: uniqueViewedUsers.size,
          percentage: totalUsers ? (uniqueViewedUsers.size / totalUsers) * 100 : 0,
        },
        {
          stage: 'Used Search',
          count: uniqueSearchedUsers.size,
          percentage: totalUsers ? (uniqueSearchedUsers.size / totalUsers) * 100 : 0,
        },
        {
          stage: 'Saved Destinations',
          count: uniqueSavedUsers.size,
          percentage: totalUsers ? (uniqueSavedUsers.size / totalUsers) * 100 : 0,
        },
        {
          stage: 'Clicked External Links',
          count: uniqueClickedUsers.size,
          percentage: totalUsers ? (uniqueClickedUsers.size / totalUsers) * 100 : 0,
        },
      ];

      // Calculate dropoff between stages
      for (let i = 1; i < funnelData.length; i++) {
        const prevStage = funnelData[i - 1];
        const currStage = funnelData[i];
        if (prevStage.count > 0) {
          currStage.dropoff = ((prevStage.count - currStage.count) / prevStage.count) * 100;
        }
      }

      setFunnel(funnelData);
    } catch (err: any) {
      console.error('Error loading funnel data:', err);
      setError(err.message || 'Failed to load engagement funnel');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 dark:border-red-800 rounded-2xl bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (funnel.length === 0) {
    return (
      <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
        <p className="text-sm text-gray-500">No funnel data available yet</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-sm font-medium">User Engagement Funnel</h3>
        <p className="text-xs text-gray-500 mt-1">
          Conversion rates through key user actions
        </p>
      </div>

      <div className="space-y-4">
        {funnel.map((stage, idx) => {
          const width = stage.percentage;
          const isFirst = idx === 0;

          return (
            <div key={stage.stage} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{stage.stage}</span>
                <span className="text-gray-500">
                  {stage.count.toLocaleString()} users ({stage.percentage.toFixed(1)}%)
                </span>
              </div>

              {/* Funnel bar */}
              <div className="relative h-12 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                <div
                  className={`h-full flex items-center justify-center text-white text-xs font-medium transition-all duration-500 ${
                    isFirst
                      ? 'bg-black dark:bg-white dark:text-black'
                      : stage.percentage > 50
                      ? 'bg-green-500'
                      : stage.percentage > 25
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(width, 5)}%` }}
                >
                  {width > 15 && `${stage.count.toLocaleString()}`}
                </div>
              </div>

              {/* Dropoff indicator */}
              {!isFirst && stage.dropoff !== undefined && (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <TrendingDown className="h-3 w-3" />
                  <span>{stage.dropoff.toFixed(1)}% drop-off from previous stage</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-gray-500 mb-1">Overall Conversion</div>
            <div className="text-2xl font-light">
              {funnel.length > 0 &&
                funnel[0].count > 0 &&
                ((funnel[funnel.length - 1].count / funnel[0].count) * 100).toFixed(1)}
              %
            </div>
          </div>
          <div>
            <div className="text-gray-500 mb-1">Avg Drop-off per Stage</div>
            <div className="text-2xl font-light">
              {funnel.length > 1
                ? (
                    funnel
                      .slice(1)
                      .reduce((sum, stage) => sum + (stage.dropoff || 0), 0) /
                    (funnel.length - 1)
                  ).toFixed(1)
                : 0}
              %
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
