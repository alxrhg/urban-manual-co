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
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Progress } from '@/ui/progress';
import { Skeleton } from '@/ui/skeleton';
import { Separator } from '@/ui/separator';

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
          .slice(0, 6)
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

  const completenessPercent = stats
    ? Math.round((stats.enrichedDestinations / stats.totalDestinations) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/destinations"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Destination
        </Link>
        <Link
          href="/admin/enrich"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Enrich
        </Link>
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </Link>
        <Link
          href="/admin/reindex"
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reindex
        </Link>
      </div>

      <Separator />

      {/* Primary Stats - Definition List */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
        <StatDefinition
          term="Destinations"
          value={stats?.totalDestinations}
          loading={loading}
          onClick={() => router.push('/admin/destinations')}
          trend={stats?.addedThisWeek ? `+${stats.addedThisWeek} this week` : undefined}
        />
        <StatDefinition
          term="Cities"
          value={stats?.citiesCount}
          loading={loading}
          onClick={() => router.push('/admin/cities')}
        />
        <StatDefinition
          term="Countries"
          value={stats?.countriesCount}
          loading={loading}
          onClick={() => router.push('/admin/countries')}
        />
        <StatDefinition
          term="Enriched"
          value={stats?.enrichedDestinations}
          loading={loading}
          onClick={() => router.push('/admin/enrich')}
          suffix={stats ? `${completenessPercent}%` : undefined}
        />
      </dl>

      <Separator />

      {/* Needs Attention */}
      {!loading && stats && (stats.missingImages > 0 || stats.missingDescriptions > 0 || stats.notEnriched > 0) && (
        <>
          <div>
            <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-3">
              Needs Attention
            </h3>
            <div className="space-y-2">
              {stats.missingImages > 0 && (
                <button
                  onClick={() => router.push('/admin/destinations?filter=no_image')}
                  className="flex items-center justify-between w-full py-2 group text-left"
                >
                  <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                    <ImageOff className="w-4 h-4 text-orange-500" />
                    {stats.missingImages} missing images
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" />
                </button>
              )}
              {stats.missingDescriptions > 0 && (
                <button
                  onClick={() => router.push('/admin/destinations?filter=no_description')}
                  className="flex items-center justify-between w-full py-2 group text-left"
                >
                  <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                    <FileText className="w-4 h-4 text-orange-500" />
                    {stats.missingDescriptions} missing descriptions
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" />
                </button>
              )}
              {stats.notEnriched > 0 && (
                <button
                  onClick={() => router.push('/admin/destinations?filter=not_enriched')}
                  className="flex items-center justify-between w-full py-2 group text-left"
                >
                  <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                    <Sparkles className="w-4 h-4 text-gray-400" />
                    {stats.notEnriched} not enriched
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" />
                </button>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Content Highlights */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
        <StatDefinition
          term="Crown Picks"
          value={stats?.crownPicks}
          loading={loading}
          icon={<Crown className="w-3.5 h-3.5 text-amber-500" />}
        />
        <StatDefinition
          term="Michelin Spots"
          value={stats?.michelinSpots}
          loading={loading}
          icon={<img src="/michelin-star.svg" alt="" className="w-3.5 h-3.5" />}
        />
        <StatDefinition
          term="User Saves"
          value={stats?.totalSaves}
          loading={loading}
          onClick={() => router.push('/admin/analytics')}
        />
        <StatDefinition
          term="Visits Logged"
          value={stats?.totalVisits}
          loading={loading}
          onClick={() => router.push('/admin/analytics')}
        />
      </dl>

      <Separator />

      {/* Two Column: Categories + Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categories */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-3">
            By Category
          </h3>
          <div className="space-y-1">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))
            ) : (
              stats?.topCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{cat.category}</span>
                  <span className="text-sm text-gray-400 tabular-nums">{cat.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Cities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
              Top Cities
            </h3>
            <Link
              href="/admin/cities"
              className="text-xs text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
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
                    className="h-0.5"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Recent Additions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
            Recent Additions
          </h3>
          <Link
            href="/admin/destinations"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            View all
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="py-3">
                <Skeleton className="h-4 w-48" />
              </div>
            ))
          ) : (
            stats?.recentDestinations.map((dest, i) => (
              <Link
                key={i}
                href={`/destinations/${dest.slug}`}
                className="flex items-center justify-between py-3 group"
              >
                <div>
                  <span className="text-sm text-black dark:text-white group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors">
                    {dest.name}
                  </span>
                  <span className="text-sm text-gray-400 ml-2">{dest.city}</span>
                </div>
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                  {dest.category}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatDefinition({
  term,
  value,
  loading,
  onClick,
  trend,
  suffix,
  icon,
}: {
  term: string;
  value?: number;
  loading: boolean;
  onClick?: () => void;
  trend?: string;
  suffix?: string;
  icon?: React.ReactNode;
}) {
  const content = (
    <>
      <dt className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
        {icon}
        {term}
      </dt>
      {loading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <dd className="flex items-baseline gap-2">
          <span className="text-xl font-medium text-black dark:text-white tabular-nums">
            {value?.toLocaleString() ?? '—'}
          </span>
          {suffix && (
            <span className="text-xs text-gray-400">{suffix}</span>
          )}
          {trend && (
            <span className="text-xs text-green-600 dark:text-green-400">{trend}</span>
          )}
        </dd>
      )}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="text-left group">
        <div className="group-hover:opacity-70 transition-opacity">{content}</div>
      </button>
    );
  }

  return <div>{content}</div>;
}
