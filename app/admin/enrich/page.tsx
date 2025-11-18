'use client';

import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type EnrichmentOutput =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean;

export default function AdminEnrichPage() {
  const [slug, setSlug] = useState('');
  const [output, setOutput] = useState<EnrichmentOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/enrich-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: slug || undefined }),
      });

      const json = await res.json();
      setOutput(json);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run enrichment';
      setOutput({ error: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Google enrichment</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Fetch fresh metadata and media for a single destination slug. Leave the slug empty to enqueue a small batch.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="destination slug (optional)"
            className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
          />
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black px-6 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run enrichment
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tip: focus on a single slug for faster turnaround. Leaving the field blank will process a small batch in the background.
        </p>
      </div>

      {output !== null && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400 mb-2">Latest run</p>
          <pre className="text-xs whitespace-pre-wrap break-all max-h-[320px] overflow-auto">
{JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
