'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Crown,
  ImageOff,
  FileText,
  Sparkles,
  Plus,
  RefreshCw,
  BarChart3,
  Database,
  ChevronRight,
  Utensils,
  Wine,
  Building2,
  Coffee,
  ShoppingBag,
  Landmark,
  Palmtree,
  MoreHorizontal,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/ui/badge';
import { Progress } from '@/ui/progress';
import { Skeleton } from '@/ui/skeleton';

interface DashboardStats {
  totalDestinations: number;
  enrichedDestinations: number;
  michelinSpots: number;
  crownPicks: number;
  totalSaves: number;
  totalVisits: number;
  recentDestinations: { name: string; city: string; category: string; slug: string }[];
  topCities: { city: string; count: number }[];
  topCategories: { category: string; count: number }[];
  missingImages: number;
  missingDescriptions: number;
  notEnriched: number;
  addedThisWeek: number;
  countriesCount: number;
  citiesCount: number;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: totalDestinations },
          { count: enrichedCount },
          { count: michelinCount },
          { count: crownCount },
          { count: totalSaves },
          { count: totalVisits },
          { count: missingImages },
          { count: missingDescriptions },
          { count: notEnriched },
          { count: addedThisWeek },
          { data: recentDests },
          { data: allDests },
        ] = await Promise.all([
          supabase.from('destinations').select('*', { count: 'exact', head: true }),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).gt('michelin_stars', 0),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).eq('crown', true),
          supabase.from('saved_places').select('*', { count: 'exact', head: true }),
          supabase.from('visited_places').select('*', { count: 'exact', head: true }),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).or('image.is.null,image.eq.'),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).or('description.is.null,description.eq.'),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).is('last_enriched_at', null),
          supabase.from('destinations').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('destinations').select('name, city, category, slug').order('created_at', { ascending: false }).limit(6),
          supabase.from('destinations').select('city, country, category'),
        ]);

        // Aggregate city data
        const cityCount: Record<string, number> = {};
        const countrySet = new Set<string>();
        const categoryCount: Record<string, number> = {};

        allDests?.forEach(d => {
          if (d.city) {
            cityCount[d.city] = (cityCount[d.city] || 0) + 1;
          }
          if (d.country) {
            countrySet.add(d.country);
          }
          if (d.category) {
            categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
          }
        });

        const topCities = Object.entries(cityCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([city, count]) => ({ city, count }));

        const topCategories = Object.entries(categoryCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([category, count]) => ({ category, count }));

        setStats({
          totalDestinations: totalDestinations || 0,
          enrichedDestinations: enrichedCount || 0,
          michelinSpots: michelinCount || 0,
          crownPicks: crownCount || 0,
          totalSaves: totalSaves || 0,
          totalVisits: totalVisits || 0,
          recentDestinations: recentDests || [],
          topCities,
          topCategories,
          missingImages: missingImages || 0,
          missingDescriptions: missingDescriptions || 0,
          notEnriched: notEnriched || 0,
          addedThisWeek: addedThisWeek || 0,
          countriesCount: countrySet.size,
          citiesCount: Object.keys(cityCount).length,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Calculate data completeness score
  const completenessScore = stats
    ? Math.round(
        ((stats.totalDestinations - stats.missingImages) / stats.totalDestinations * 30 +
          (stats.totalDestinations - stats.missingDescriptions) / stats.totalDestinations * 30 +
          (stats.enrichedDestinations / stats.totalDestinations) * 40)
      )
    : 0;

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      restaurant: <Utensils className="w-3.5 h-3.5" />,
      bar: <Wine className="w-3.5 h-3.5" />,
      hotel: <Building2 className="w-3.5 h-3.5" />,
      cafe: <Coffee className="w-3.5 h-3.5" />,
      shop: <ShoppingBag className="w-3.5 h-3.5" />,
      landmark: <Landmark className="w-3.5 h-3.5" />,
      attraction: <Palmtree className="w-3.5 h-3.5" />,
    };
    return icons[category.toLowerCase()] || <MoreHorizontal className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-8">
      {/* Quick Actions - Command Bar Style */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/destinations"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Destination
        </Link>
        <Link
          href="/admin/enrich"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Enrich
        </Link>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </Link>
        <Link
          href="/admin/reindex"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reindex
        </Link>
      </div>

      {/* Data Health Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Completeness Score */}
        <div className="lg:col-span-1 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-gray-500" />
            <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
              Data Health
            </h3>
          </div>
          {loading ? (
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-800"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${completenessScore * 2.26} 226`}
                    strokeLinecap="round"
                    className={completenessScore >= 80 ? 'text-green-500' : completenessScore >= 60 ? 'text-amber-500' : 'text-red-500'}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-black dark:text-white">
                  {completenessScore}%
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                Images, descriptions & enrichment
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Destinations"
            value={stats?.totalDestinations || 0}
            loading={loading}
            onClick={() => router.push('/admin/destinations')}
            badge={stats?.addedThisWeek ? `+${stats.addedThisWeek}` : undefined}
          />
          <StatCard
            label="Cities"
            value={stats?.citiesCount || 0}
            loading={loading}
            onClick={() => router.push('/admin/cities')}
          />
          <StatCard
            label="Countries"
            value={stats?.countriesCount || 0}
            loading={loading}
            onClick={() => router.push('/admin/countries')}
          />
          <StatCard
            label="Enriched"
            value={stats?.enrichedDestinations || 0}
            loading={loading}
            onClick={() => router.push('/admin/enrich')}
            badge={stats ? `${Math.round((stats.enrichedDestinations / stats.totalDestinations) * 100)}%` : undefined}
          />
          <StatCard
            label="Crown Picks"
            value={stats?.crownPicks || 0}
            loading={loading}
            icon={<Crown className="w-3.5 h-3.5 text-amber-500" />}
          />
          <StatCard
            label="Michelin"
            value={stats?.michelinSpots || 0}
            loading={loading}
            icon={<img src="/michelin-star.svg" alt="" className="w-3.5 h-3.5" />}
          />
          <StatCard
            label="User Saves"
            value={stats?.totalSaves || 0}
            loading={loading}
            onClick={() => router.push('/admin/analytics')}
          />
          <StatCard
            label="Visits"
            value={stats?.totalVisits || 0}
            loading={loading}
            onClick={() => router.push('/admin/analytics')}
          />
        </div>
      </div>

      {/* Needs Attention */}
      {!loading && stats && (stats.missingImages > 0 || stats.missingDescriptions > 0 || stats.notEnriched > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stats.missingImages > 0 && (
            <button
              onClick={() => router.push('/admin/destinations?filter=no_image')}
              className="flex items-center justify-between p-4 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ImageOff className="w-4 h-4 text-orange-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Missing Images</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats.missingImages} destinations</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </button>
          )}
          {stats.missingDescriptions > 0 && (
            <button
              onClick={() => router.push('/admin/destinations?filter=no_description')}
              className="flex items-center justify-between p-4 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-900/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-orange-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Missing Descriptions</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats.missingDescriptions} destinations</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </button>
          )}
          {stats.notEnriched > 0 && (
            <button
              onClick={() => router.push('/admin/destinations?filter=not_enriched')}
              className="flex items-center justify-between p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Not Enriched</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{stats.notEnriched} destinations</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </button>
          )}
        </div>
      )}

      {/* Two Column: Categories + Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
              By Category
            </h3>
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))
            ) : (
              stats?.topCategories.map((cat, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-400">{getCategoryIcon(cat.category)}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{cat.category}</span>
                  </div>
                  <span className="text-sm text-gray-400 tabular-nums">{cat.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Cities */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
              Top Cities
            </h3>
            <Link
              href="/admin/cities"
              className="text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))
            ) : (
              stats?.topCities.map((city, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{city.city}</span>
                    <span className="text-gray-400 tabular-nums">{city.count}</span>
                  </div>
                  <Progress
                    value={(city.count / (stats?.topCities[0]?.count || 1)) * 100}
                    className="h-1"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Additions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
            Recent Additions
          </h3>
          <Link
            href="/admin/destinations"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
          >
            View all
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))
          ) : (
            stats?.recentDestinations.map((dest, i) => (
              <Link
                key={i}
                href={`/destinations/${dest.slug}`}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-black dark:text-white truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    {dest.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{dest.city}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase ml-2 shrink-0">
                  {dest.category}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Compact stat card
function StatCard({
  label,
  value,
  loading,
  onClick,
  badge,
  icon,
}: {
  label: string;
  value: number;
  loading: boolean;
  onClick?: () => void;
  badge?: string;
  icon?: React.ReactNode;
}) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold text-black dark:text-white tabular-nums">
            {value.toLocaleString()}
          </span>
          {badge && (
            <Badge variant="secondary" className="text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="text-left p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
      {content}
    </div>
  );
}
