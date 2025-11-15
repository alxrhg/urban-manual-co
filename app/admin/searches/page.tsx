'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type SearchMetadata = {
  query?: string;
  intent?: {
    city?: string;
    category?: string;
  };
  filters?: {
    city?: string;
    category?: string;
  };
  count?: number;
  source?: string;
};

type SearchLog = {
  id: number;
  created_at: string;
  interaction_type: string;
  user_id: string | null;
  metadata: SearchMetadata | null;
};

export default function AdminSearchesPage() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSearchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setError('Unauthorized');
        setLogs([]);
        return;
      }

      const response = await fetch('/api/admin/searches?limit=200', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await response.text();
      let payload: { logs?: SearchLog[]; error?: string } = {};
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (parseError) {
          console.error('[Admin] Failed to parse search logs response:', parseError);
        }
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load');
      }

      setLogs(Array.isArray(payload.logs) ? payload.logs : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load';
      setError(message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSearchLogs();
  }, [loadSearchLogs]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Recent Searches</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Query</th>
              <th className="py-2 pr-4">City</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Count</th>
              <th className="py-2 pr-4">Source</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const metadata = log.metadata ?? ({} as SearchMetadata);
              const q = metadata.query || '';
              const intent = metadata.intent || {};
              const filters = metadata.filters || {};
              const count = metadata.count ?? '';
              const source = metadata.source || '';
              return (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4">{log.user_id || 'anon'}</td>
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
    </div>
  );
}


