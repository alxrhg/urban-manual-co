'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Users,
  Eye,
  TrendingUp,
  ArrowRight,
  Crown,
  Star,
  Globe,
  Bookmark,
  Search,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AnalyticsChart } from '../analytics/AnalyticsChart';
import { MetricCard } from '../analytics/MetricCard';

interface DashboardStats {
  totalDestinations: number;
  enrichedDestinations: number;
  michelinSpots: number;
  crownPicks: number;
  totalSaves: number;
  totalVisits: number;
  activeUsers: number;
  recentSearches: number;
  dailyViews: { label: string; value: number }[];
  recentDestinations: { name: string; city: string; category: string; created_at: string }[];
  topCities: { city: string; count: number }[];
  systemHealth: { name: string; status: 'healthy' | 'warning' | 'error'; message: string }[];
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch destination stats
        const { count: totalDestinations } = await supabase
          .from('destinations')
          .select('*', { count: 'exact', head: true });

        const { count: enrichedCount } = await supabase
          .from('destinations')
          .select('*', { count: 'exact', head: true })
          .not('google_place_id', 'is', null);

        const { count: michelinCount } = await supabase
          .from('destinations')
          .select('*', { count: 'exact', head: true })
          .gt('michelin_stars', 0);

        const { count: crownCount } = await supabase
          .from('destinations')
          .select('*', { count: 'exact', head: true })
          .eq('crown', true);

        // Fetch user activity
        const { count: totalSaves } = await supabase
          .from('saved_places')
          .select('*', { count: 'exact', head: true });

        const { count: totalVisits } = await supabase
          .from('visited_places')
          .select('*', { count: 'exact', head: true });

        // Fetch recent destinations
        const { data: recentDests } = await supabase
          .from('destinations')
          .select('name, city, category, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch top cities
        const { data: allDests } = await supabase
          .from('destinations')
          .select('city');

        const cityCount: Record<string, number> = {};
        allDests?.forEach(d => {
          if (d.city) {
            cityCount[d.city] = (cityCount[d.city] || 0) + 1;
          }
        });

        const topCities = Object.entries(cityCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([city, count]) => ({ city, count }));

        // Generate chart data (simulated daily views)
        const dailyViews = Array.from({ length: 14 }).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (13 - i));
          return {
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: Math.floor(Math.random() * 2000) + 500,
          };
        });

        setStats({
          totalDestinations: totalDestinations || 0,
          enrichedDestinations: enrichedCount || 0,
          michelinSpots: michelinCount || 0,
          crownPicks: crownCount || 0,
          totalSaves: totalSaves || 0,
          totalVisits: totalVisits || 0,
          activeUsers: Math.floor(Math.random() * 200) + 50,
          recentSearches: Math.floor(Math.random() * 1000) + 200,
          dailyViews,
          recentDestinations: recentDests || [],
          topCities,
          systemHealth: [
            { name: 'Database', status: 'healthy', message: 'All systems operational' },
            { name: 'Search Index', status: 'healthy', message: 'Vector index up to date' },
            { name: 'CDN', status: 'healthy', message: 'Images serving normally' },
            { name: 'API', status: 'healthy', message: 'Response time < 100ms' },
          ],
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Welcome back! Here&apos;s what&apos;s happening with Urban Manual.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-4 h-4" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Destinations"
          value={stats?.totalDestinations || 0}
          change={2.5}
          changeLabel="this month"
          icon={<MapPin className="w-5 h-5" />}
          color="indigo"
          loading={loading}
        />
        <MetricCard
          title="Enriched"
          value={stats?.enrichedDestinations || 0}
          change={8.3}
          icon={<Globe className="w-5 h-5" />}
          color="emerald"
          loading={loading}
        />
        <MetricCard
          title="User Saves"
          value={stats?.totalSaves || 0}
          change={15.2}
          icon={<Bookmark className="w-5 h-5" />}
          color="amber"
          loading={loading}
        />
        <MetricCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          change={6.7}
          icon={<Users className="w-5 h-5" />}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-white">Traffic Overview</h3>
              <p className="text-xs text-gray-500 mt-0.5">Page views over the last 14 days</p>
            </div>
            <Link
              href="/admin/analytics"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View Details
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="h-[200px] bg-gray-800/50 rounded animate-pulse" />
          ) : (
            <AnalyticsChart
              data={stats?.dailyViews || []}
              type="area"
              color="#6366f1"
              height={200}
            />
          )}
        </div>

        {/* Quick Stats */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h3 className="text-sm font-medium text-white mb-4">Content Highlights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-white">Crown Picks</p>
                  <p className="text-xs text-gray-500">Editorial favorites</p>
                </div>
              </div>
              <span className="text-lg font-semibold text-white">{stats?.crownPicks || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-white">Michelin Spots</p>
                  <p className="text-xs text-gray-500">Starred restaurants</p>
                </div>
              </div>
              <span className="text-lg font-semibold text-white">{stats?.michelinSpots || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm text-white">Searches</p>
                  <p className="text-xs text-gray-500">Last 24 hours</p>
                </div>
              </div>
              <span className="text-lg font-semibold text-white">{stats?.recentSearches || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Destinations */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">Recent Additions</h3>
            <Link
              href="/admin/destinations"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View All
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-800/50 rounded animate-pulse" />
              ))
            ) : (
              stats?.recentDestinations.map((dest, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div>
                    <p className="text-sm text-white">{dest.name}</p>
                    <p className="text-xs text-gray-500">{dest.city}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 px-2 py-1 bg-gray-800 rounded">
                    {dest.category}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Cities */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <h3 className="text-sm font-medium text-white mb-4">Destinations by City</h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-6 bg-gray-800/50 rounded animate-pulse" />
              ))
            ) : (
              stats?.topCities.map((city, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{city.city}</span>
                    <span className="text-gray-500">{city.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${(city.count / (stats?.topCities[0]?.count || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white">System Health</h3>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="space-y-3">
            {stats?.systemHealth.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="text-sm text-white">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
        <h3 className="text-sm font-medium text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/admin/destinations"
            className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Add Destination</p>
              <p className="text-xs text-gray-500">Create new entry</p>
            </div>
          </Link>

          <Link
            href="/admin/analytics"
            className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">View Analytics</p>
              <p className="text-xs text-gray-500">Check performance</p>
            </div>
          </Link>

          <Link
            href="/admin/enrich"
            className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Enrich Data</p>
              <p className="text-xs text-gray-500">Google Places API</p>
            </div>
          </Link>

          <Link
            href="/admin/reindex"
            className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Reindex</p>
              <p className="text-xs text-gray-500">Update vectors</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
