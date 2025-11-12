'use client';

import { Database, LineChart, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DatasetSummary } from '@/hooks/useAdminData';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  content: Database,
  analytics: LineChart,
};

interface DatasetAuditProps {
  datasets: DatasetSummary[];
  onRefresh: () => void;
  isRefreshing?: boolean;
}

function formatNumber(value?: number) {
  if (typeof value !== 'number') return '—';
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toLocaleString();
}

export function DatasetAudit({ datasets, onRefresh, isRefreshing }: DatasetAuditProps) {
  return (
    <section aria-labelledby="dataset-audit-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="dataset-audit-heading" className="text-xl font-semibold">
            Dataset availability
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Audit of Supabase tables powering the admin experience.
          </p>
        </div>
        <Button onClick={onRefresh} disabled={isRefreshing} variant="outline" className="w-full sm:w-auto">
          {isRefreshing ? 'Refreshing…' : 'Refresh insights'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {datasets.map(dataset => {
          const Icon = ICONS[dataset.key] ?? Database;
          const available = dataset.available;
          return (
            <Card
              key={dataset.key}
              className={cn(
                'border transition-colors',
                available
                  ? 'border-emerald-200 dark:border-emerald-700/40'
                  : 'border-amber-200 dark:border-amber-500/60'
              )}
            >
              <CardHeader className="flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border',
                      available
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base font-semibold">{dataset.label}</CardTitle>
                    <CardDescription>{dataset.description}</CardDescription>
                  </div>
                </div>
                {available ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-label="Dataset available" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" aria-label="Dataset unavailable" />
                )}
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {'total' in dataset && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total records</span>
                    <span className="font-medium">{formatNumber(dataset.total)}</span>
                  </div>
                )}
                {'newThisWeek' in dataset && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">New this week</span>
                    <span>{formatNumber(dataset.newThisWeek)}</span>
                  </div>
                )}
                {'active30d' in dataset && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Active 30d</span>
                    <span>{formatNumber(dataset.active30d)}</span>
                  </div>
                )}
                {'pending' in dataset && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Pending moderation</span>
                    <span>{formatNumber(dataset.pending)}</span>
                  </div>
                )}
                {'totalEvents' in dataset && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Total events</span>
                    <span>{formatNumber(dataset.totalEvents)}</span>
                  </div>
                )}
                {'searches' in dataset && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Searches</span>
                    <span>{formatNumber(dataset.searches)}</span>
                  </div>
                )}
                {'searchesLastWeek' in dataset && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Searches last week</span>
                    <span>{formatNumber(dataset.searchesLastWeek)}</span>
                  </div>
                )}
                {'discoveryEngineEnabled' in dataset && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Discovery Engine</span>
                    <span className={dataset.discoveryEngineEnabled ? 'text-emerald-500' : 'text-amber-500'}>
                      {dataset.discoveryEngineEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
