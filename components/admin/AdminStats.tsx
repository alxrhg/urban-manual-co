'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export function AdminStats() {
  const toast = useToast();
  const [stats, setStats] = useState({
    total: 0,
    enriched: 0,
    michelin: 0,
    crown: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const loadAdminStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const supabase = createClient({ skipValidation: true });

      const totalPromise = supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true });
      const enrichedPromise = supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .not('google_place_id', 'is', null);
      const michelinPromise = supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .gt('michelin_stars', 0);
      const crownPromise = supabase
        .from('destinations')
        .select('id', { count: 'exact', head: true })
        .eq('crown', true);

      const [totalRes, enrichedRes, michelinRes, crownRes] = await Promise.all([
        totalPromise,
        enrichedPromise,
        michelinPromise,
        crownPromise,
      ]);

      const responses = [totalRes, enrichedRes, michelinRes, crownRes];
      for (const res of responses) {
        if (res.error) {
          throw res.error;
        }
      }

      setStats({
        total: totalRes.count ?? 0,
        enriched: enrichedRes.count ?? 0,
        michelin: michelinRes.count ?? 0,
        crown: crownRes.count ?? 0,
      });
    } catch (error) {
      console.error('[Admin] Error loading stats:', error);
      toast.error('Failed to load admin stats');
    } finally {
      setStatsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAdminStats();
  }, [loadAdminStats]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">Stats</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Live counts pulled directly from Supabase.
      </p>
      <dl className="space-y-1">
        <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <dt className="text-gray-500 dark:text-gray-400">Destinations</dt>
          <dd className="font-mono">{statsLoading ? '…' : stats.total.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <dt className="text-gray-500 dark:text-gray-400">Google enriched</dt>
          <dd className="font-mono">{statsLoading ? '…' : stats.enriched.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <dt className="text-gray-500 dark:text-gray-400">Michelin spots</dt>
          <dd className="font-mono">{statsLoading ? '…' : stats.michelin.toLocaleString()}</dd>
        </div>
        <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <dt className="text-gray-500 dark:text-gray-400">Crown picks</dt>
          <dd className="font-mono">{statsLoading ? '…' : stats.crown.toLocaleString()}</dd>
        </div>
      </dl>
      <button
        onClick={() => loadAdminStats()}
        disabled={statsLoading}
        className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 disabled:opacity-50"
      >
        <Loader2 className={`h-3 w-3 ${statsLoading ? 'animate-spin' : 'hidden'}`} />
        Refresh stats
      </button>
    </div>
  );
}
