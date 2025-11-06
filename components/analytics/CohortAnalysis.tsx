'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CohortData {
  cohortWeek: string;
  cohortSize: number;
  retention: number[];
}

interface CohortAnalysisData {
  cohorts: CohortData[];
  summary: {
    totalUsers: number;
    totalCohorts: number;
    avgRetentionWeek1: number;
    avgRetentionWeek4: number;
  };
}

export function CohortAnalysis() {
  const [data, setData] = useState<CohortAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCohortData();
  }, []);

  async function loadCohortData() {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/admin/cohort-analysis', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load cohort data');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error loading cohort data:', err);
      setError(err.message || 'Failed to load cohort analysis');
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

  if (!data || data.cohorts.length === 0) {
    return (
      <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
        <p className="text-sm text-gray-500">No cohort data available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-gray-400" />
            <div className="text-xs text-gray-500">Total Users</div>
          </div>
          <div className="text-2xl font-light">{data.summary.totalUsers.toLocaleString()}</div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <div className="text-xs text-gray-500">Cohorts</div>
          </div>
          <div className="text-2xl font-light">{data.summary.totalCohorts}</div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="text-xs text-gray-500 mb-2">Avg Week 1 Retention</div>
          <div className="text-2xl font-light text-green-600 dark:text-green-400">
            {data.summary.avgRetentionWeek1.toFixed(1)}%
          </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="text-xs text-gray-500 mb-2">Avg Week 4 Retention</div>
          <div className="text-2xl font-light text-blue-600 dark:text-blue-400">
            {data.summary.avgRetentionWeek4.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Cohort Heatmap */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-medium">Cohort Retention Heatmap</h3>
          <p className="text-xs text-gray-500 mt-1">
            Shows retention % of each cohort over 12 weeks
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-2 text-left font-medium text-gray-500">
                  Cohort
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Size</th>
                {Array.from({ length: 13 }, (_, i) => (
                  <th key={i} className="px-3 py-2 text-center font-medium text-gray-500">
                    W{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((cohort, idx) => (
                <tr
                  key={cohort.cohortWeek}
                  className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-950 px-4 py-2 font-medium whitespace-nowrap">
                    {cohort.cohortWeek}
                  </td>
                  <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-400">
                    {cohort.cohortSize}
                  </td>
                  {cohort.retention.map((rate, weekIdx) => {
                    const color = getHeatmapColor(rate);
                    return (
                      <td
                        key={weekIdx}
                        className="px-3 py-2 text-center"
                        style={{ backgroundColor: color }}
                        title={`Week ${weekIdx}: ${rate.toFixed(1)}%`}
                      >
                        <span className={rate > 50 ? 'text-white' : 'text-gray-900 dark:text-gray-100'}>
                          {rate > 0 ? `${rate.toFixed(0)}%` : '-'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Retention Rate:</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">0%</span>
              <div className="flex gap-1">
                {[0, 20, 40, 60, 80].map((val) => (
                  <div
                    key={val}
                    className="w-6 h-4 rounded"
                    style={{ backgroundColor: getHeatmapColor(val + 10) }}
                  />
                ))}
              </div>
              <span className="text-gray-500">100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getHeatmapColor(percentage: number): string {
  if (percentage === 0) return 'rgb(243, 244, 246)'; // gray-100
  if (percentage < 20) return 'rgb(254, 202, 202)'; // red-200
  if (percentage < 40) return 'rgb(252, 211, 77)'; // yellow-300
  if (percentage < 60) return 'rgb(134, 239, 172)'; // green-300
  if (percentage < 80) return 'rgb(74, 222, 128)'; // green-400
  return 'rgb(34, 197, 94)'; // green-500
}
