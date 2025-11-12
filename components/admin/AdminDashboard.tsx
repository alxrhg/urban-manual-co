'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';
import { DatasetAudit } from './DatasetAudit';
import { ModerationBoard } from './ModerationBoard';
import { SupportBoard } from './SupportBoard';
import { SystemStatusPanel } from './SystemStatusPanel';
import { Button } from '@/components/ui/button';

export function AdminDashboard() {
  const {
    datasetSummary,
    moderationItems,
    supportAllItems,
    moderationFilter,
    setModerationFilter,
    supportFilter,
    setSupportFilter,
    bulkModerationAction,
    bulkSupportAction,
    moderationUnavailable,
    supportUnavailable,
    systemStatus,
    refetch,
    isLoading,
    isFetching,
    error,
  } = useAdminData();

  return (
    <div className="space-y-10 pb-16">
      <header className="space-y-4">
        <h1 className="text-3xl font-bold">Admin control center</h1>
        <p className="max-w-3xl text-sm text-gray-500 dark:text-gray-400">
          Audit datasets, moderate new destinations, manage support escalations, and monitor system health
          from a single dashboard.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          {isFetching && (
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs dark:border-gray-800">
              <Loader2 className="h-3 w-3 animate-spin" /> Syncing latest data
            </span>
          )}
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isLoading}>
            Refresh dashboard
          </Button>
          {error && (
            <span className="inline-flex items-center gap-2 text-xs text-amber-600 dark:text-amber-300">
              <AlertCircle className="h-3 w-3" /> {error.message}
            </span>
          )}
        </div>
      </header>

      <DatasetAudit datasets={datasetSummary} onRefresh={() => refetch()} isRefreshing={isLoading} />

      <ModerationBoard
        items={moderationItems}
        filter={moderationFilter}
        onFilterChange={setModerationFilter}
        onBulkAction={bulkModerationAction}
        unavailable={moderationUnavailable}
        isLoading={isLoading}
      />

      <SupportBoard
        allItems={supportAllItems}
        filter={supportFilter}
        onFilterChange={setSupportFilter}
        onBulkAction={bulkSupportAction}
        unavailable={supportUnavailable}
        isLoading={isLoading}
      />

      <SystemStatusPanel
        supabaseConfigured={systemStatus?.supabaseConfigured}
        lastAnalyticsEvent={systemStatus?.lastAnalyticsEvent ?? null}
        lastContentUpdate={systemStatus?.lastContentUpdate ?? null}
        datasetsUnavailable={systemStatus?.datasetsUnavailable}
      />
    </div>
  );
}
