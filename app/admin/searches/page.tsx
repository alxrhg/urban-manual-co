'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type SearchMetadata = {
  query?: string;
  intent?: {
    city?: string;
    category?: string;
    [key: string]: unknown;
  };
  filters?: {
    city?: string;
    category?: string;
    [key: string]: unknown;
  };
  count?: number;
  source?: string;
  [key: string]: unknown;
} | null;

type SearchLog = {
  id: number;
  created_at: string;
  user_id: string | null;
  metadata: SearchMetadata;
};

export default function AdminSearchesPage() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_interactions')
        .select('id, created_at, user_id, metadata')
        .eq('interaction_type', 'search')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setLogs(data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load search logs';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Search insights</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Latest 200 search interactions across the product.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mb-3 text-gray-400" />
            Loading search logs…
          </div>
        ) : error ? (
          <div className="py-6 text-sm text-red-500 dark:text-red-400">{error}</div>
        ) : logs.length === 0 ? (
          <div className="py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            No search activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2 pr-4 font-medium text-gray-500">Time</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">User</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Query</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">City</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Category</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Count</th>
                  <th className="py-2 pr-4 font-medium text-gray-500">Source</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const metadata = log.metadata ?? {};
                  const q = metadata.query ?? '';
                  const intent = metadata.intent ?? {};
                  const filters = metadata.filters ?? {};
                  const count = metadata.count ?? '';
                  const source = metadata.source ?? '';
                  return (
                    <tr key={log.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-4">{log.user_id ? log.user_id.substring(0, 8) : 'anon'}</td>
                      <td className="py-2 pr-4 max-w-[360px] truncate" title={q}>{q}</td>
                      <td className="py-2 pr-4">{intent.city || filters.city || ''}</td>
                      <td className="py-2 pr-4">{intent.category || filters.category || ''}</td>
                      <td className="py-2 pr-4">{count}</td>
                      <td className="py-2 pr-4">{source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
