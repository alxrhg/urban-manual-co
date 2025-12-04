'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Image as ImageIcon,
  FileText,
  Globe,
  AlertCircle,
  CheckCircle,
  Play,
  Loader2,
  ChevronRight,
  Database,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PipelineStats {
  total: number;
  enriched: number;
  pendingEnrichment: number;
  withoutImage: number;
  withoutDescription: number;
  withoutCoordinates: number;
  recentlyEnriched: number;
}

interface PendingDestination {
  id: number;
  name: string;
  slug: string;
  city: string;
  category: string;
  image: string | null;
  description: string | null;
  last_enriched_at: string | null;
}

export function ContentPipeline() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDestinations, setPendingDestinations] = useState<PendingDestination[]>([]);
  const [enrichingSlug, setEnrichingSlug] = useState<string | null>(null);
  const [batchEnriching, setBatchEnriching] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { count: total },
        { count: enriched },
        { count: withoutImage },
        { count: withoutDescription },
        { count: withoutCoordinates },
      ] = await Promise.all([
        supabase.from('destinations').select('*', { count: 'exact', head: true }),
        supabase.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
        supabase.from('destinations').select('*', { count: 'exact', head: true }).is('image', null),
        supabase.from('destinations').select('*', { count: 'exact', head: true }).is('description', null),
        supabase.from('destinations').select('*', { count: 'exact', head: true }).or('latitude.is.null,longitude.is.null'),
      ]);

      // Fetch recently enriched (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: recentlyEnriched } = await supabase
        .from('destinations')
        .select('*', { count: 'exact', head: true })
        .gte('last_enriched_at', weekAgo.toISOString());

      // Fetch pending destinations for the list
      const { data: pending } = await supabase
        .from('destinations')
        .select('id, name, slug, city, category, image, description, last_enriched_at')
        .is('last_enriched_at', null)
        .order('name')
        .limit(20);

      setStats({
        total: total || 0,
        enriched: enriched || 0,
        pendingEnrichment: (total || 0) - (enriched || 0),
        withoutImage: withoutImage || 0,
        withoutDescription: withoutDescription || 0,
        withoutCoordinates: withoutCoordinates || 0,
        recentlyEnriched: recentlyEnriched || 0,
      });

      setPendingDestinations(pending || []);
    } catch (error) {
      console.error('Failed to fetch pipeline stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const enrichDestination = async (slug: string) => {
    setEnrichingSlug(slug);
    try {
      const client = createClient();
      const { data: { session } } = await client.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/enrich-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ slug }),
      });

      if (!res.ok) throw new Error('Enrichment failed');

      // Refresh stats
      await fetchStats();
    } catch (error) {
      console.error('Enrichment failed:', error);
      alert('Failed to enrich destination');
    } finally {
      setEnrichingSlug(null);
    }
  };

  const runBatchEnrichment = async () => {
    setBatchEnriching(true);
    try {
      const client = createClient();
      const { data: { session } } = await client.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/enrich-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error('Batch enrichment failed');

      // Refresh stats after a delay
      setTimeout(fetchStats, 2000);
    } catch (error) {
      console.error('Batch enrichment failed:', error);
      alert('Failed to run batch enrichment');
    } finally {
      setBatchEnriching(false);
    }
  };

  const enrichmentProgress = stats ? Math.round((stats.enriched / stats.total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-black dark:text-white">Content Pipeline</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track enrichment progress and content quality
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={runBatchEnrichment} disabled={batchEnriching}>
            {batchEnriching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Batch
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-medium text-black dark:text-white">Enrichment Progress</h3>
              <p className="text-sm text-gray-500">
                {loading ? '...' : `${stats?.enriched.toLocaleString()} of ${stats?.total.toLocaleString()} destinations enriched`}
              </p>
            </div>
          </div>
          <div className="text-right">
            {loading ? (
              <div className="h-8 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <span className="text-2xl font-light">{enrichmentProgress}%</span>
            )}
          </div>
        </div>
        <Progress value={enrichmentProgress} className="h-2" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<AlertCircle className="w-4 h-4 text-orange-500" />}
          label="Pending Enrichment"
          value={stats?.pendingEnrichment || 0}
          loading={loading}
          variant="warning"
        />
        <StatCard
          icon={<ImageIcon className="w-4 h-4 text-gray-400" />}
          label="Missing Images"
          value={stats?.withoutImage || 0}
          loading={loading}
        />
        <StatCard
          icon={<FileText className="w-4 h-4 text-gray-400" />}
          label="Missing Descriptions"
          value={stats?.withoutDescription || 0}
          loading={loading}
        />
        <StatCard
          icon={<Sparkles className="w-4 h-4 text-green-500" />}
          label="Enriched This Week"
          value={stats?.recentlyEnriched || 0}
          loading={loading}
          variant="success"
        />
      </div>

      {/* Content Quality Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Enrichment List */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-black dark:text-white">Pending Enrichment</h3>
              <Link
                href="/admin/enrich"
                className="text-xs text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : pendingDestinations.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                All destinations enriched!
              </div>
            ) : (
              pendingDestinations.slice(0, 8).map((dest) => (
                <div key={dest.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-black dark:text-white truncate">
                      {dest.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {dest.city} · {dest.category}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => enrichDestination(dest.slug)}
                    disabled={enrichingSlug === dest.slug}
                    className="ml-2 flex-shrink-0"
                  >
                    {enrichingSlug === dest.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Content Quality Summary */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-sm font-medium text-black dark:text-white">Content Quality</h3>
          </div>
          <div className="p-4 space-y-4">
            <QualityMetric
              label="Has Image"
              current={stats ? stats.total - stats.withoutImage : 0}
              total={stats?.total || 0}
              loading={loading}
            />
            <QualityMetric
              label="Has Description"
              current={stats ? stats.total - stats.withoutDescription : 0}
              total={stats?.total || 0}
              loading={loading}
            />
            <QualityMetric
              label="Has Coordinates"
              current={stats ? stats.total - stats.withoutCoordinates : 0}
              total={stats?.total || 0}
              loading={loading}
            />
            <QualityMetric
              label="Enriched"
              current={stats?.enriched || 0}
              total={stats?.total || 0}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/enrich">
          <Button variant="outline">
            <Globe className="w-4 h-4 mr-2" />
            Google Enrichment
          </Button>
        </Link>
        <Link href="/admin/reindex">
          <Button variant="outline">
            <Database className="w-4 h-4 mr-2" />
            Reindex Vectors
          </Button>
        </Link>
        <Link href="/admin/destinations">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Manage Content
          </Button>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  variant?: 'warning' | 'success';
}) {
  return (
    <div className={`p-4 border rounded-2xl ${
      variant === 'warning'
        ? 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10'
        : variant === 'success'
        ? 'border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/10'
        : 'border-gray-200 dark:border-gray-800'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      {loading ? (
        <div className="h-7 w-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-light">{value.toLocaleString()}</p>
      )}
    </div>
  );
}

function QualityMetric({
  label,
  current,
  total,
  loading,
}: {
  label: string;
  current: number;
  total: number;
  loading: boolean;
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        {loading ? (
          <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        ) : (
          <span className="text-gray-900 dark:text-white tabular-nums">
            {current.toLocaleString()} / {total.toLocaleString()} ({percentage}%)
          </span>
        )}
      </div>
      <Progress value={percentage} className="h-1.5" />
    </div>
  );
}
