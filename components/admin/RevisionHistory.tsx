'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { History, ChevronDown, ChevronUp, RefreshCw, User, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface RevisionHistoryProps {
  slug: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  source: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  conflicts: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  publish: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  unpublish: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  schedule: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  conflict: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const SOURCE_LABELS: Record<string, string> = {
  sanity_webhook: 'Sanity CMS',
  admin_dashboard: 'Admin Dashboard',
  api: 'API',
  script: 'Script',
  unknown: 'Unknown',
};

export function RevisionHistory({ slug }: RevisionHistoryProps) {
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('content_audit_log')
        .select('*')
        .eq('slug', slug)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setHistory(data || []);
    } catch (err) {
      console.error('Failed to fetch revision history:', err);
      setError('Failed to load revision history');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
        <Button variant="ghost" size="sm" onClick={fetchHistory}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No revision history available
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Changes will be tracked here once the content is edited
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">Revision History</span>
          <Badge variant="secondary" className="text-xs">
            {history.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchHistory}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {history.map((entry) => {
          const isExpanded = expandedItems.has(entry.id);
          const hasChanges = entry.changes && Object.keys(entry.changes).length > 0;

          return (
            <div
              key={entry.id}
              className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleExpand(entry.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-800'}
                  >
                    {entry.action}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <User className="w-3 h-3" />
                    <span>{SOURCE_LABELS[entry.source] || entry.source}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <span className="text-xs text-gray-400">
                      {Object.keys(entry.changes!).length} field(s)
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                  {hasChanges ? (
                    <div className="space-y-2">
                      {Object.entries(entry.changes!).map(([field, values]) => (
                        <div
                          key={field}
                          className="text-xs bg-gray-50 dark:bg-gray-900/50 rounded p-2"
                        >
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {field}
                          </span>
                          <div className="mt-1 grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-400 block mb-0.5">Before:</span>
                              <pre className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all max-h-20 overflow-y-auto">
                                {formatValue(values.old)}
                              </pre>
                            </div>
                            <div>
                              <span className="text-gray-400 block mb-0.5">After:</span>
                              <pre className="text-green-600 dark:text-green-400 whitespace-pre-wrap break-all max-h-20 overflow-y-auto">
                                {formatValue(values.new)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No detailed changes recorded</p>
                  )}

                  {entry.conflicts && Object.keys(entry.conflicts).length > 0 && (
                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                        Conflicts Detected
                      </span>
                      <pre className="text-xs text-orange-600 dark:text-orange-400 mt-1 whitespace-pre-wrap">
                        {JSON.stringify(entry.conflicts, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
