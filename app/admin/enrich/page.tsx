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
}

interface MicroDescStats {
  total: number;
  withMicroDesc: number;
  withoutMicroDesc: number;
}

interface EnrichmentResult {
  success?: boolean;
  slug?: string;
  message?: string;
  error?: string;
  timestamp?: string;
}

interface MicroDescResult {
  success?: boolean;
  slug?: string;
  micro_description?: string;
  previous?: string;
  message?: string;
  error?: string;
  timestamp?: string;
  generated?: { slug: string; micro_description: string }[];
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

  // Micro description state
  const [microDescStats, setMicroDescStats] = useState<MicroDescStats | null>(null);
  const [microDescSlug, setMicroDescSlug] = useState('');
  const [microDescOutput, setMicroDescOutput] = useState<MicroDescResult | null>(null);
  const [microDescLoading, setMicroDescLoading] = useState(false);
  const [microDescBatchSize, setMicroDescBatchSize] = useState(10);
  const [microDescMode, setMicroDescMode] = useState<'single' | 'batch'>('single');

  // Fetch enrichment stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient();
      const [
        { count: total },
        { count: enriched },
        { count: withMicroDesc },
      ] = await Promise.all([
        supabase.from('destinations').select('*', { count: 'exact', head: true }),
        supabase.from('destinations').select('*', { count: 'exact', head: true }).not('last_enriched_at', 'is', null),
        supabase.from('destinations').select('*', { count: 'exact', head: true }).not('micro_description', 'is', null).neq('micro_description', ''),
      ]);

      setStats({
        total: total || 0,
        enriched: enriched || 0,
        notEnriched: (total || 0) - (enriched || 0),
      });

      setMicroDescStats({
        total: total || 0,
        withMicroDesc: withMicroDesc || 0,
        withoutMicroDesc: (total || 0) - (withMicroDesc || 0),
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

  // Generate micro description for single destination
  const runSingleMicroDesc = async () => {
    if (!microDescSlug.trim()) return;

    setMicroDescLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/generate-micro-descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: microDescSlug.trim() }),
      });

      const json = await res.json();
      setMicroDescOutput({
        ...json,
        timestamp: new Date().toISOString(),
      });

      if (json.success) {
        fetchStats();
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Failed to generate micro description';
      setMicroDescOutput({ error, slug: microDescSlug.trim(), timestamp: new Date().toISOString() });
    } finally {
      setMicroDescLoading(false);
    }
  };

  // Generate micro descriptions in batch
  const runBatchMicroDesc = async () => {
    setMicroDescLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/admin/generate-micro-descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'missing', batchSize: microDescBatchSize }),
      });

      const json = await res.json();
      setMicroDescOutput({
        ...json,
        success: !json.error,
        timestamp: new Date().toISOString(),
      });

      fetchStats();
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : 'Failed to generate micro descriptions';
      setMicroDescOutput({ error, timestamp: new Date().toISOString() });
    } finally {
      setMicroDescLoading(false);
    }
  };

  const enrichmentProgress = stats ? Math.round((stats.enriched / stats.total) * 100) : 0;
  const microDescProgress = microDescStats ? Math.round((microDescStats.withMicroDesc / microDescStats.total) * 100) : 0;

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Total Destinations</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">
              {stats?.total.toLocaleString()}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Enriched</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">
                {stats?.enriched.toLocaleString()}
              </p>
              <Badge variant="secondary" className="text-xs">{enrichmentProgress}%</Badge>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-700 dark:text-amber-300">Needs Enrichment</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold text-amber-900 dark:text-amber-100 tabular-nums">
              {stats?.notEnriched.toLocaleString()}
            </p>
          )}
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

      <Separator className="my-8" />

      {/* Micro Descriptions Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Micro Descriptions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate AI-powered subtitles for destination cards using luxury travel copywriting.
          </p>
        </div>
      </div>

      {/* Micro Description Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Total Destinations</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">
              {microDescStats?.total.toLocaleString()}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">Has Subtitle</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">
                {microDescStats?.withMicroDesc.toLocaleString()}
              </p>
              <Badge variant="secondary" className="text-xs">{microDescProgress}%</Badge>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-purple-700 dark:text-purple-300">Needs Subtitle</span>
          </div>
          {statsLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold text-purple-900 dark:text-purple-100 tabular-nums">
              {microDescStats?.withoutMicroDesc.toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Micro Description Progress Bar */}
      {!statsLoading && microDescStats && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Subtitle Coverage</span>
            <span>{microDescProgress}% complete</span>
          </div>
          <Progress value={microDescProgress} className="h-2" />
        </div>
      )}

      {/* Micro Description Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMicroDescMode('single')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            microDescMode === 'single'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Single Destination
        </button>
        <button
          onClick={() => setMicroDescMode('batch')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            microDescMode === 'batch'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Batch Generation
        </button>
      </div>

      {/* Micro Description Form */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-4">
        {microDescMode === 'single' ? (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={microDescSlug}
                onChange={(e) => setMicroDescSlug(e.target.value)}
                placeholder="Enter destination slug..."
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
              />
              <Button onClick={runSingleMicroDesc} disabled={microDescLoading || !microDescSlug.trim()}>
                {microDescLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter the exact slug of the destination to generate a new subtitle.
            </p>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Batch Size</label>
                <Select value={String(microDescBatchSize)} onValueChange={(val) => setMicroDescBatchSize(Number(val))}>
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
              <div className="flex items-end">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Generates subtitles for destinations missing micro descriptions.
                </p>
              </div>
            </div>

            <Button onClick={runBatchMicroDesc} disabled={microDescLoading} className="w-full md:w-auto">
              {microDescLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating Batch...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Missing Subtitles
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Micro Description Result */}
      {microDescOutput && (
        <div className={`rounded-xl border p-4 ${
          microDescOutput.error
            ? 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/20'
            : 'border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/20'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {microDescOutput.error ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <span className="text-xs font-medium">
              {microDescOutput.error ? 'Error' : 'Success'}
            </span>
            {microDescOutput.timestamp && (
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(microDescOutput.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          {microDescOutput.error ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">{microDescOutput.error}</p>
          ) : microDescOutput.micro_description ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{microDescOutput.slug}:</span> &quot;{microDescOutput.micro_description}&quot;
              </p>
              {microDescOutput.previous && (
                <p className="text-xs text-gray-500">Previous: &quot;{microDescOutput.previous}&quot;</p>
              )}
            </div>
          ) : microDescOutput.generated && microDescOutput.generated.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">{microDescOutput.message}</p>
              <div className="max-h-[200px] overflow-auto space-y-1">
                {microDescOutput.generated.map((item, i) => (
                  <p key={i} className="text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">{item.slug}:</span> &quot;{item.micro_description}&quot;
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">{microDescOutput.message}</p>
          )}
        </div>
      )}
    </section>
  );
}

export const dynamic = 'force-dynamic';
