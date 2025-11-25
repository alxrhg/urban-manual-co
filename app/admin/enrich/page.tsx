'use client';

import { useState } from 'react';
import { Loader2, Play, Sparkles, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type EnrichmentMode = 'google' | 'ai' | 'verify';

interface EnrichmentResult {
  slug: string;
  ok?: boolean;
  success?: boolean;
  error?: string;
  reason?: string;
  enrichment?: any;
  verification?: any;
  updates?: string[];
}

export default function AdminEnrichPage() {
  const [slug, setSlug] = useState('');
  const [mode, setMode] = useState<EnrichmentMode>('google');
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runEnrichment = async () => {
    setLoading(true);
    setOutput(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      let endpoint = '/api/enrich-google';
      let body: any = { slug: slug || undefined };

      if (mode === 'ai' || mode === 'verify') {
        if (!slug) {
          throw new Error('Slug required for AI enrichment');
        }
        endpoint = '/api/admin/ai-enrich';
        body = { slug, action: mode === 'verify' ? 'verify' : 'enrich' };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      setOutput(json);
    } catch (e: any) {
      setOutput({ error: e?.message || 'Failed to run enrichment' });
    } finally {
      setLoading(false);
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'google':
        return 'Fetch address, phone, hours, ratings from Google Places API';
      case 'ai':
        return 'Generate editorial descriptions, tips, and insights using Gemini AI with Google Search grounding';
      case 'verify':
        return 'Verify the place exists and is currently operational';
    }
  };

  return (
    <section className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Destination Enrichment</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Enhance destination data with Google Places or AI-generated content.
        </p>
      </div>

      {/* Mode Selection */}
      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode('google')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
              mode === 'google'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Google Places
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
              mode === 'ai'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Enrichment
          </button>
          <button
            onClick={() => setMode('verify')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
              mode === 'verify'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            Verify Place
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {getModeDescription()}
        </p>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={mode === 'google' ? 'destination slug (optional for batch)' : 'destination slug (required)'}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
          />
          <button
            onClick={runEnrichment}
            disabled={loading || ((mode === 'ai' || mode === 'verify') && !slug)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black text-white dark:bg-white dark:text-black px-6 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running…
              </>
            ) : (
              <>
                {mode === 'ai' ? <Sparkles className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {mode === 'google' ? 'Run Google Enrichment' : mode === 'ai' ? 'Generate AI Content' : 'Verify Place'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output */}
      {output && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-hidden">
          {/* Status Header */}
          <div className={`px-4 py-3 flex items-center gap-2 ${
            output.error || output.success === false
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          }`}>
            {output.error || output.success === false ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">
              {output.error ? 'Error' : output.success ? 'Success' : 'Results'}
            </span>
            {output.slug && (
              <span className="text-xs opacity-70 ml-auto">{output.slug}</span>
            )}
          </div>

          {/* AI Enrichment Preview */}
          {output.enrichment && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-4">
              {output.enrichment.editorial_description && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Editorial Description</h4>
                  <p className="text-sm text-gray-900 dark:text-white">{output.enrichment.editorial_description}</p>
                </div>
              )}
              {output.enrichment.micro_description && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Micro Description</h4>
                  <p className="text-sm text-gray-900 dark:text-white">{output.enrichment.micro_description}</p>
                </div>
              )}
              {output.enrichment.notable_features && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Notable Features</h4>
                  <div className="flex flex-wrap gap-1">
                    {output.enrichment.notable_features.map((f: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {output.enrichment.best_for && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Best For</h4>
                  <div className="flex flex-wrap gap-1">
                    {output.enrichment.best_for.map((b: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">{b}</span>
                    ))}
                  </div>
                </div>
              )}
              {output.enrichment.local_tips && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Local Tips</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    {output.enrichment.local_tips.map((tip: string, i: number) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
              {output.enrichment.verification_status && (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    output.enrichment.verification_status === 'verified'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : output.enrichment.verification_status === 'needs_review'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {output.enrichment.verification_status}
                  </span>
                  {output.enrichment.confidence_score && (
                    <span className="text-xs text-gray-500">
                      Confidence: {Math.round(output.enrichment.confidence_score * 100)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Verification Result */}
          {output.verification && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  output.verification.exists && output.verification.operational
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {output.verification.exists ? 'Exists' : 'Not Found'}
                </span>
                {output.verification.exists && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    output.verification.operational
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {output.verification.operational ? 'Operational' : 'May be closed'}
                  </span>
                )}
              </div>
              {output.verification.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{output.verification.notes}</p>
              )}
              {output.verification.corrections?.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Suggested Corrections</h4>
                  <div className="space-y-2">
                    {output.verification.corrections.map((c: any, i: number) => (
                      <div key={i} className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                        <span className="font-medium">{c.field}:</span> {c.current} → <span className="text-green-600 dark:text-green-400">{c.suggested}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw JSON */}
          <div className="p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400 mb-2">Raw Response</p>
            <pre className="text-xs whitespace-pre-wrap break-all max-h-[320px] overflow-auto text-gray-700 dark:text-gray-300">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
