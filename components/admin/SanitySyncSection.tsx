'use client';

import { useState } from 'react';
import { createClient } from "@/lib/supabase/client";
import { Loader2, RefreshCw, Database } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export function SanitySyncSection() {
  const toast = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<{
    created: number;
    updated: number;
    errors: number;
  } | null>(null);
  const [limit, setLimit] = useState<string>('');

  const runSync = async (dryRun: boolean = false) => {
    setIsSyncing(true);
    setSyncStats(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/admin/sync-sanity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          limit: limit ? parseInt(limit, 10) : undefined,
          dryRun,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Sync failed');
      }

      const data = await res.json();
      setSyncStats(data.stats);

      if (dryRun) {
        toast.success(`Preview: Would ${data.stats.created > 0 ? 'create' : 'update'} ${data.stats.created + data.stats.updated} document(s)`);
      } else {
        toast.success(`Synced ${data.stats.created + data.stats.updated} document(s) to Sanity`);
      }
    } catch (e: any) {
      console.error('Sync error:', e);
      toast.error(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Sanity Sync</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sync destinations from Supabase to Sanity CMS
          </p>
        </div>
        <Database className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </div>

      <div className="space-y-3 p-4 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Limit (optional)"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
            disabled={isSyncing}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">destinations</span>
        </div>

        {syncStats && (
          <div className="text-xs space-y-1 p-2 bg-white dark:bg-gray-950 rounded border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Created:</span>
              <span className="font-mono text-green-600 dark:text-green-400">{syncStats.created}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Updated:</span>
              <span className="font-mono text-blue-600 dark:text-blue-400">{syncStats.updated}</span>
            </div>
            {syncStats.errors > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Errors:</span>
                <span className="font-mono text-red-600 dark:text-red-400">{syncStats.errors}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => runSync(true)}
            disabled={isSyncing}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
            Preview
          </button>
          <button
            onClick={() => runSync(false)}
            disabled={isSyncing}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Loader2 className={`h-3 w-3 ${isSyncing ? 'animate-spin' : 'hidden'}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        <p className="text-[0.65rem] text-gray-400 dark:text-gray-500">
          Leave limit empty to sync all destinations. Use preview to test first.
        </p>
      </div>
    </div>
  );
}
