'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Users, Eye, MousePointerClick, Search, TrendingUp, Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalSearches: 0,
    totalSaves: 0,
    totalUsers: 0,
    topSearches: [] as { query: string; count: number }[],
    topDestinations: [] as { slug: string; name: string; views: number }[],
  });

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  async function checkAdminAndLoad() {
    if (!user?.email) {
      router.push('/account');
      return;
    }

    try {
      const res = await fetch('/api/is-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();

      if (!data.isAdmin) {
        router.push('/account');
        return;
      }

      setIsAdmin(true);
      loadAnalytics();
    } catch (error) {
      router.push('/account');
    }
  }

  async function loadAnalytics() {
    try {
      setLoading(true);

      // Get user interactions stats
      const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select('interaction_type');

      if (interactionsError) {
        console.error('Error loading interactions:', interactionsError);
      }

      // Get visit history stats
      const { data: visits, error: visitsError } = await supabase
        .from('visit_history')
        .select('destination_id, search_query');

      if (visitsError) {
        console.error('Error loading visits:', visitsError);
      }

      // Get user count
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Aggregate stats
      const views = interactions?.filter(i => i.interaction_type === 'view').length || 0;
      const searches = visits?.filter(v => v.search_query).length || 0;
      const saves = interactions?.filter(i => i.interaction_type === 'save').length || 0;

      // Top searches
      const searchQueries = visits?.map(v => v.search_query).filter(Boolean) || [];
      const searchCounts: Record<string, number> = {};
      searchQueries.forEach((q: string) => {
        searchCounts[q] = (searchCounts[q] || 0) + 1;
      });
      const topSearches = Object.entries(searchCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalViews: views,
        totalSearches: searches,
        totalSaves: saves,
        totalUsers: userCount || 0,
        topSearches,
        topDestinations: [],
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">User behavior and engagement metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Views</div>
              <Eye className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Searches</div>
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold">{stats.totalSearches.toLocaleString()}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Saves</div>
              <MousePointerClick className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold">{stats.totalSaves.toLocaleString()}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
          </div>
        </div>

        {/* Top Searches */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Search Queries
          </h2>
          {stats.topSearches.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No search data available yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topSearches.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="font-medium">{item.query}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.count} searches</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

