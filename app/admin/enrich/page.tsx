'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Play,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Progress } from '@/ui/progress';
import { Separator } from '@/ui/separator';
import { Skeleton } from '@/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';

interface EnrichmentStats {
  total: number;
  enriched: number;
  notEnriched: number;
  lastEnrichedAt?: string;
  lastEnrichedSlug?: string;
}

interface EnrichmentResult {
  success?: boolean;
  slug?: string;
  message?: string;
  error?: string;
  timestamp?: string;
}

export default function AdminEnrichPage() {
  const [slug, setSlug] = useState('');
  const [output, setOutput] = useState<EnrichmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<EnrichmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [batchMode, setBatchMode] = useState<'single' | 'batch'>('single');
  const [batchSize, setBatchSize] = useState(10);
  const [batchFilter, setBatchFilter] = useState<'not_enriched' | 'all' | 'city'>('not_enriched');
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [enrichmentHistory, setEnrichmentHistory] = useState<EnrichmentResult[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Fetch enrichment stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient();
      const [
        { count: total },
        { count: enriched },
        { data: lastEnriched },
      ] = await Promise.all([
        supabase.from('destinations').select('*', { count: 'exact', head: true }),
        supabase.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
        supabase.from('destinations')
          .select('slug, last_enriched_at')
          .not('last_enriched_at', 'is', null)
          .order('last_enriched_at', { ascending: false })
          .limit(1)
          .single(),
      ]);

      setStats({
        total: total || 0,
        enriched: enriched || 0,
        notEnriched: (total || 0) - (enriched || 0),
        lastEnrichedAt: lastEnriched?.last_enriched_at,
        lastEnrichedSlug: lastEnriched?.slug,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch cities for filter
  const fetchCities = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('destinations')
        .select('city')
        .not('city', 'is', null)
        .order('city');

      if (data) {
        const uniqueCities = [...new Set(data.map(d => d.city).filter(Boolean))] as string[];
        setCities(uniqueCities);
      }
    } catch (error) {
      console.error('Failed to fetch cities:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCities();
  }, [fetchStats, fetchCities]);

  const runSingleEnrichment = async () => {
    if (!slug.trim()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/enrich-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: slug.trim() }),
      });

      const json = await res.json();
      const result = {
        ...json,
        slug: slug.trim(),
        timestamp: new Date().toISOString(),
      };
      setOutput(result);
      setEnrichmentHistory(prev => [result, ...prev.slice(0, 19)]);

      if (json.success) {
        fetchStats();
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Failed to run enrichment';
      setOutput({ error, slug: slug.trim(), timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  };

  const runBatchEnrichment = async () => {
    setLoading(true);
    setBatchProgress({ current: 0, total: batchSize });

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Fetch destinations to enrich
      let query = supabase.from('destinations').select('slug');

      if (batchFilter === 'not_enriched') {
        query = query.is('last_enriched_at', null);
      } else if (batchFilter === 'city' && selectedCity) {
        query = query.eq('city', selectedCity);
      }

      query = query.limit(batchSize);

      const { data: destinations, error } = await query;

      if (error) throw error;
      if (!destinations || destinations.length === 0) {
        setOutput({ error: 'No destinations found matching criteria', timestamp: new Date().toISOString() });
        setLoading(false);
        setBatchProgress(null);
        return;
      }

      setBatchProgress({ current: 0, total: destinations.length });

      // Process each destination
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < destinations.length; i++) {
        const dest = destinations[i];
        setBatchProgress({ current: i + 1, total: destinations.length });

        try {
          const res = await fetch('/api/enrich-google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ slug: dest.slug }),
          });

          const json = await res.json();
          if (json.success || json.enriched) {
            successCount++;
          } else {
            errorCount++;
          }

          // Add to history
          setEnrichmentHistory(prev => [{
            ...json,
            slug: dest.slug,
            timestamp: new Date().toISOString(),
          }, ...prev.slice(0, 29)]);

          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch {
          errorCount++;
        }
      }

      setOutput({
        success: true,
        message: `Batch complete: ${successCount} enriched, ${errorCount} errors`,
        timestamp: new Date().toISOString(),
      });

      fetchStats();
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Failed to run batch enrichment';
      setOutput({ error, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
      setBatchProgress(null);
    }
  };

  const enrichmentProgress = stats ? Math.round((stats.enriched / stats.total) * 100) : 0;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Google Enrichment</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fetch metadata, images, and reviews from Google Places API.
          </p>
        </div>
        <Button variant="outline" onClick={fetchStats} disabled={statsLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </Button>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              enrichmentProgress === 100
                ? 'bg-green-100 dark:bg-green-900/30'
                : enrichmentProgress > 50
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
            }`}>
              {enrichmentProgress === 100 ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Sparkles className={`w-5 h-5 ${enrichmentProgress > 50 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Enrichment Status: {enrichmentProgress === 100 ? 'Complete' : enrichmentProgress > 50 ? 'In Progress' : 'Needs Attention'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stats?.lastEnrichedAt ? (
                  <>Last enriched: {new Date(stats.lastEnrichedAt).toLocaleDateString()} ({stats.lastEnrichedSlug})</>
                ) : (
                  'No enrichment history'
                )}
              </p>
            </div>
          </div>
          {loading && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Processing
            </Badge>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">
                {stats?.total.toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              Enriched
            </p>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-xl font-semibold text-green-600 dark:text-green-400 tabular-nums">
                {stats?.enriched.toLocaleString()}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Pending
            </p>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <p className="text-xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {stats?.notEnriched.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {!statsLoading && stats && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Enrichment Progress</span>
            <span>{enrichmentProgress}% complete</span>
          </div>
          <Progress value={enrichmentProgress} className="h-2" />
        </div>
      )}

      <Separator />

      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setBatchMode('single')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            batchMode === 'single'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Single Destination
        </button>
        <button
          onClick={() => setBatchMode('batch')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            batchMode === 'batch'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Batch Enrichment
        </button>
      </div>

      {/* Enrichment Form */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-4">
        {batchMode === 'single' ? (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Enter destination slug..."
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
              />
              <Button onClick={runSingleEnrichment} disabled={loading || !slug.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enriching...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Enrich
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter the exact slug of the destination you want to enrich.
            </p>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Filter</label>
                <Select value={batchFilter} onValueChange={(val) => setBatchFilter(val as typeof batchFilter)}>
                  <SelectTrigger>
                    <Filter className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_enriched">Not Enriched</SelectItem>
                    <SelectItem value="all">All Destinations</SelectItem>
                    <SelectItem value="city">By City</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {batchFilter === 'city' && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">City</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select city..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Batch Size</label>
                <Select value={String(batchSize)} onValueChange={(val) => setBatchSize(Number(val))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 destinations</SelectItem>
                    <SelectItem value="10">10 destinations</SelectItem>
                    <SelectItem value="25">25 destinations</SelectItem>
                    <SelectItem value="50">50 destinations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={runBatchEnrichment} disabled={loading || (batchFilter === 'city' && !selectedCity)} className="w-full md:w-auto">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing Batch...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Batch Enrichment
                </>
              )}
            </Button>

            {batchProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Processing batch...</span>
                  <span>{batchProgress.current} / {batchProgress.total}</span>
                </div>
                <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-2" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Latest Result */}
      {output && (
        <div className={`rounded-xl border p-4 ${
          output.error
            ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/20'
            : 'border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {output.error ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <span className="text-xs font-medium">
              {output.error ? 'Error' : 'Success'}
            </span>
            {output.timestamp && (
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(output.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {output.error || output.message || `Enriched: ${output.slug}`}
          </p>
        </div>
      )}

      {/* Enrichment History */}
      {enrichmentHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Recent Enrichments
          </h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800 max-h-[300px] overflow-auto">
            {enrichmentHistory.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {item.error ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  <span className="text-gray-700 dark:text-gray-300 truncate">{item.slug || 'Batch'}</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {item.timestamp && new Date(item.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export const dynamic = 'force-dynamic';
