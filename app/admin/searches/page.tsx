'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { Loader2, RefreshCcw, Search, TrendingUp, Users, BarChart3, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Progress } from '@/components/ui/progress';

type SearchLog = {
  id: number;
  created_at: string;
  user_id: string | null;
  metadata: Record<string, unknown>;
};

type DateRange = '24h' | '7d' | '30d';

export default function AdminSearchesPage() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // Calculate date filter
      const now = new Date();
      const startDate = new Date();
      if (dateRange === '24h') {
        startDate.setHours(now.getHours() - 24);
      } else if (dateRange === '7d') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setDate(now.getDate() - 30);
      }

      const { data, error } = await supabase
        .from('user_interactions')
        .select('id, created_at, user_id, metadata')
        .eq('interaction_type', 'search')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setLogs(data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load search logs');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Compute aggregated stats
  const stats = useMemo(() => {
    if (logs.length === 0) return null;

    // Top queries
    const queryCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    let zeroResultCount = 0;
    const uniqueUsers = new Set<string>();

    logs.forEach((log) => {
      const metadata = log.metadata ?? {};
      const query = (metadata.query as string) || '';
      const intent = (metadata.intent as Record<string, unknown>) || {};
      const filters = (metadata.filters as Record<string, unknown>) || {};
      const count = metadata.count as number;
      const city = (intent.city as string) || (filters.city as string) || '';
      const category = (intent.category as string) || (filters.category as string) || '';

      if (query) {
        const normalizedQuery = query.toLowerCase().trim();
        queryCounts[normalizedQuery] = (queryCounts[normalizedQuery] || 0) + 1;
      }

      if (city) {
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      }

      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }

      if (count === 0) {
        zeroResultCount++;
      }

      if (log.user_id) {
        uniqueUsers.add(log.user_id);
      }

      const hour = new Date(log.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const topQueries = Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Peak hours
    const peakHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      totalSearches: logs.length,
      uniqueUsers: uniqueUsers.size,
      zeroResultCount,
      zeroResultRate: Math.round((zeroResultCount / logs.length) * 100),
      topQueries,
      topCities,
      topCategories,
      peakHour: peakHour ? { hour: parseInt(peakHour[0]), count: peakHour[1] } : null,
    };
  }, [logs]);

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}${ampm}`;
  };

  return (
    <section className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-medium text-black dark:text-white">Search Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analyze search patterns and popular queries
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex gap-1 text-xs">
            {(['24h', '7d', '30d'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  dateRange === range
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-gray-500 hover:text-black dark:hover:text-white'
                }`}
              >
                {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-full text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Total Searches</span>
          </div>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-light">{stats?.totalSearches.toLocaleString() || 0}</p>
          )}
        </div>
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Unique Users</span>
          </div>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-light">{stats?.uniqueUsers.toLocaleString() || 0}</p>
          )}
        </div>
        <div className="p-4 border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">Zero Results</span>
          </div>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-light">
              {stats?.zeroResultCount || 0}
              <span className="text-sm text-gray-400 ml-1">({stats?.zeroResultRate || 0}%)</span>
            </p>
          )}
        </div>
        <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Peak Hour</span>
          </div>
          {loading ? (
            <div className="h-7 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-light">
              {stats?.peakHour ? formatHour(stats.peakHour.hour) : '-'}
            </p>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Queries */}
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Top Queries
          </h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-4 w-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              ))
            ) : stats?.topQueries.length === 0 ? (
              <p className="text-sm text-gray-500">No queries recorded</p>
            ) : (
              stats?.topQueries.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[80%]">
                      {item.query}
                    </span>
                    <span className="text-gray-400 tabular-nums">{item.count}</span>
                  </div>
                  <Progress
                    value={(item.count / (stats?.topQueries[0]?.count || 1)) * 100}
                    className="h-1"
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Cities & Categories */}
        <div className="space-y-8">
          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Popular Cities
            </h3>
            <div className="flex flex-wrap gap-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                ))
              ) : stats?.topCities.length === 0 ? (
                <p className="text-sm text-gray-500">No city filters used</p>
              ) : (
                stats?.topCities.map((item, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-sm"
                  >
                    {item.city} <span className="text-gray-400">({item.count})</span>
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Popular Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                ))
              ) : stats?.topCategories.length === 0 ? (
                <p className="text-sm text-gray-500">No category filters used</p>
              ) : (
                stats?.topCategories.map((item, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-full text-sm capitalize"
                  >
                    {item.category} <span className="text-gray-400">({item.count})</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Searches Table */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Recent Searches
        </h3>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mb-3 text-gray-400" />
              Loading search logs...
            </div>
          ) : error ? (
            <div className="py-6 px-4 text-sm text-red-500 dark:text-red-400">{error}</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-sm text-gray-500 dark:text-gray-400 text-center">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              No search activity recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr className="text-left border-b border-gray-200 dark:border-gray-800">
                    <th className="px-4 py-3 font-medium text-gray-500">Time</th>
                    <th className="px-4 py-3 font-medium text-gray-500">User</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Query</th>
                    <th className="px-4 py-3 font-medium text-gray-500">City</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Category</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Results</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.slice(0, 50).map((log) => {
                    const metadata = log.metadata ?? {};
                    const q = (metadata.query as string) || '';
                    const intent = (metadata.intent as Record<string, unknown>) || {};
                    const filters = (metadata.filters as Record<string, unknown>) || {};
                    const count = metadata.count as number;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {new Date(log.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {log.user_id ? (
                            <span className="font-mono text-gray-600 dark:text-gray-400">
                              {log.user_id.substring(0, 8)}
                            </span>
                          ) : (
                            <span className="text-gray-400">anon</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[300px] truncate font-medium" title={q}>
                          {q || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {(intent.city as string) || (filters.city as string) || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">
                          {(intent.category as string) || (filters.category as string) || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`tabular-nums ${count === 0 ? 'text-orange-500' : 'text-gray-600 dark:text-gray-400'}`}>
                            {count ?? '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
