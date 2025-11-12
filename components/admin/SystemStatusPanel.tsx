'use client';

import { Activity, CloudOff, DatabaseBackup, RefreshCw, ServerCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SystemStatusPanelProps {
  supabaseConfigured?: boolean;
  lastAnalyticsEvent?: string | null;
  lastContentUpdate?: string | null;
  datasetsUnavailable?: string[];
}

function formatDate(value?: string | null) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

export function SystemStatusPanel({
  supabaseConfigured,
  lastAnalyticsEvent,
  lastContentUpdate,
  datasetsUnavailable,
}: SystemStatusPanelProps) {
  const unavailable = datasetsUnavailable && datasetsUnavailable.length > 0;

  return (
    <section aria-labelledby="system-status-heading" className="space-y-4">
      <div>
        <h2 id="system-status-heading" className="text-xl font-semibold">
          System status
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Operational signals across analytics pipelines and content updates.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ServerCog className="h-4 w-4 text-gray-500" /> Supabase configuration
            </CardTitle>
            <CardDescription>Service role and realtime availability.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {supabaseConfigured ? 'Connected' : 'Missing keys'}
            </p>
            {!supabaseConfigured && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                Add SUPABASE_SERVICE_ROLE_KEY to enable admin analytics.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Activity className="h-4 w-4 text-gray-500" /> Latest analytics event
            </CardTitle>
            <CardDescription>Recent activity captured in user_interactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(lastAnalyticsEvent)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <RefreshCw className="h-4 w-4 text-gray-500" /> Last content update
            </CardTitle>
            <CardDescription>Sync time for destinations catalogue.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-900 dark:text-gray-100">{formatDate(lastContentUpdate)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <DatabaseBackup className="h-4 w-4 text-gray-500" /> Dataset health
          </CardTitle>
          <CardDescription>Missing datasets may require migrations or policy updates.</CardDescription>
        </CardHeader>
        <CardContent>
          {unavailable ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-600 dark:text-amber-300">
              {datasetsUnavailable!.map(key => (
                <li key={key}>{key} dataset unavailable</li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-500">
              <CloudOff className="h-4 w-4" /> All monitored datasets available
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
