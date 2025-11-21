'use client';

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  RefreshCw,
  Database,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  Eye,
  FileText,
  Play,
  Pause,
  Calendar,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SyncLog {
  id: string;
  timestamp: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  duration?: number;
}

interface SyncHistory {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'partial';
  created: number;
  updated: number;
  errors: number;
  duration: number;
  errorDetails?: Array<{ slug: string; error: string }>;
}

interface SyncConfig {
  direction: 'one-way' | 'bidirectional';
  conflictResolution: 'supabase-wins' | 'sanity-wins' | 'manual';
  autoSync: boolean;
  autoSyncInterval: number; // minutes
  fieldMapping: Record<string, string>;
}

export function SyncOperationsDashboard() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'preview' | 'logs'>('status');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [lastSync, setLastSync] = useState<SyncHistory | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    direction: 'one-way',
    conflictResolution: 'supabase-wins',
    autoSync: false,
    autoSyncInterval: 60,
    fieldMapping: {
      name: 'name',
      city: 'city',
      country: 'country',
      category: 'categories',
      description: 'description',
    },
  });
  const [previewData, setPreviewData] = useState<{
    affected: number;
    toCreate: number;
    toUpdate: number;
    estimatedTime: number;
    diffs?: Array<{ slug: string; changes: string[] }>;
  } | null>(null);
  const [limit, setLimit] = useState<string>('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Load sync history from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sanity-sync-history');
    if (stored) {
      try {
        const history = JSON.parse(stored);
        setSyncHistory(history);
        if (history.length > 0) {
          setLastSync(history[0]);
        }
      } catch (e) {
        console.error('Failed to load sync history:', e);
      }
    }

    const storedLogs = localStorage.getItem('sanity-sync-logs');
    if (storedLogs) {
      try {
        const logs = JSON.parse(storedLogs);
        setSyncLogs(logs.slice(-100)); // Keep last 100 logs
      } catch (e) {
        console.error('Failed to load sync logs:', e);
      }
    }

    const storedConfig = localStorage.getItem('sanity-sync-config');
    if (storedConfig) {
      try {
        setSyncConfig(JSON.parse(storedConfig));
      } catch (e) {
        console.error('Failed to load sync config:', e);
      }
    }
  }, []);

  // Save sync history
  const saveSyncHistory = useCallback((newHistory: SyncHistory) => {
    const updated = [newHistory, ...syncHistory].slice(0, 50); // Keep last 50
    setSyncHistory(updated);
    setLastSync(newHistory);
    localStorage.setItem('sanity-sync-history', JSON.stringify(updated));
  }, [syncHistory]);

  // Add log entry
  const addLog = useCallback((log: Omit<SyncLog, 'id' | 'timestamp'>) => {
    const newLog: SyncLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    setSyncLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 100);
      localStorage.setItem('sanity-sync-logs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Save config
  const saveConfig = useCallback((config: SyncConfig) => {
    setSyncConfig(config);
    localStorage.setItem('sanity-sync-config', JSON.stringify(config));
  }, []);

  // Run preview
  const runPreview = async () => {
    setIsPreviewing(true);
    setPreviewData(null);
    addLog({ type: 'info', message: 'Starting sync preview...' });

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const startTime = Date.now();
      const res = await fetch('/api/admin/sync-sanity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          limit: limit ? parseInt(limit, 10) : undefined,
          slugs: selectedSlugs.length > 0 ? selectedSlugs : undefined,
          dryRun: true,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Preview failed');
      }

      const data = await res.json();
      const duration = Date.now() - startTime;

      // Estimate time for actual sync (usually 2-3x preview time)
      const estimatedTime = Math.ceil(duration * 2.5 / 1000); // seconds

      setPreviewData({
        affected: data.stats.created + data.stats.updated,
        toCreate: data.stats.created,
        toUpdate: data.stats.updated,
        estimatedTime,
        diffs: data.diffs,
      });

      addLog({
        type: 'success',
        message: `Preview complete: ${data.stats.created} to create, ${data.stats.updated} to update`,
        duration: duration / 1000,
      });

      toast.success(`Preview: ${data.stats.created} to create, ${data.stats.updated} to update`);
    } catch (e: any) {
      console.error('Preview error:', e);
      addLog({ type: 'error', message: `Preview failed: ${e.message}` });
      toast.error(`Preview failed: ${e.message}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  // Run sync
  const runSync = async () => {
    setIsSyncing(true);
    addLog({ type: 'info', message: 'Starting sync operation...' });

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const startTime = Date.now();
      const res = await fetch('/api/admin/sync-sanity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          limit: limit ? parseInt(limit, 10) : undefined,
          slugs: selectedSlugs.length > 0 ? selectedSlugs : undefined,
          dryRun: false,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Sync failed');
      }

      const data = await res.json();
      const duration = Date.now() - startTime;

      const historyEntry: SyncHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: data.stats.errors > 0 ? 'partial' : 'success',
        created: data.stats.created,
        updated: data.stats.updated,
        errors: data.stats.errors,
        duration: duration / 1000,
        errorDetails: data.stats.errorDetails,
      };

      saveSyncHistory(historyEntry);

      if (data.stats.errors > 0) {
        addLog({
          type: 'warning',
          message: `Sync completed with ${data.stats.errors} error(s)`,
          duration: duration / 1000,
          details: data.stats.errorDetails,
        });
        toast.warning(`Sync completed with ${data.stats.errors} error(s)`);
      } else {
        addLog({
          type: 'success',
          message: `Sync completed successfully: ${data.stats.created} created, ${data.stats.updated} updated`,
          duration: duration / 1000,
        });
        toast.success(`Synced ${data.stats.created + data.stats.updated} document(s) to Sanity`);
      }
    } catch (e: any) {
      console.error('Sync error:', e);
      const historyEntry: SyncHistory = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: 'error',
        created: 0,
        updated: 0,
        errors: 1,
        duration: 0,
        errorDetails: [{ slug: 'unknown', error: e.message }],
      };
      saveSyncHistory(historyEntry);
      addLog({ type: 'error', message: `Sync failed: ${e.message}` });
      toast.error(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Calculate success rate
  const successRate = syncHistory.length > 0
    ? (syncHistory.filter(h => h.status === 'success').length / syncHistory.length) * 100
    : 0;

  // Calculate average duration
  const avgDuration = syncHistory.length > 0
    ? syncHistory.reduce((sum, h) => sum + h.duration, 0) / syncHistory.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sync Operations</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Manage synchronization between Supabase and Sanity CMS
          </p>
        </div>
        <Database className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Status
          </TabsTrigger>
          <TabsTrigger value="config" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            Config
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Status Dashboard */}
        <TabsContent value="status" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Last Sync */}
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Last Sync</span>
                {lastSync && (
                  <Badge
                    variant={lastSync.status === 'success' ? 'default' : lastSync.status === 'error' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {lastSync.status}
                  </Badge>
                )}
              </div>
              {lastSync ? (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(lastSync.timestamp).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {lastSync.created} created, {lastSync.updated} updated
                    {lastSync.errors > 0 && `, ${lastSync.errors} errors`}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Duration: {lastSync.duration.toFixed(1)}s
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400 dark:text-gray-500">No sync history</div>
              )}
            </div>

            {/* Success Rate */}
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Success Rate</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {successRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {syncHistory.filter(h => h.status === 'success').length} of {syncHistory.length} successful
              </div>
            </div>

            {/* Average Duration */}
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Avg Duration</span>
                <Clock className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {avgDuration.toFixed(1)}s
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Over {syncHistory.length} syncs
              </div>
            </div>
          </div>

          {/* Sync History Timeline */}
          {syncHistory.length > 0 && (
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white mb-3">Recent Sync History</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {syncHistory.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {entry.status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : entry.status === 'error' ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 dark:text-white">
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.created} created, {entry.updated} updated
                          {entry.errors > 0 && ` • ${entry.errors} errors`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.duration.toFixed(1)}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              onClick={runSync}
              disabled={isSyncing}
              className="flex-1"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab('preview')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </TabsContent>

        {/* Configuration */}
        <TabsContent value="config" className="space-y-4 mt-4">
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 space-y-4">
            {/* Sync Direction */}
            <div>
              <label className="text-xs font-semibold text-gray-900 dark:text-white mb-2 block">
                Sync Direction
              </label>
              <Select
                value={syncConfig.direction}
                onValueChange={(value: 'one-way' | 'bidirectional') => {
                  saveConfig({ ...syncConfig, direction: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-way">One-way (Supabase → Sanity)</SelectItem>
                  <SelectItem value="bidirectional">Bidirectional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conflict Resolution */}
            <div>
              <label className="text-xs font-semibold text-gray-900 dark:text-white mb-2 block">
                Conflict Resolution
              </label>
              <Select
                value={syncConfig.conflictResolution}
                onValueChange={(value: 'supabase-wins' | 'sanity-wins' | 'manual') => {
                  saveConfig({ ...syncConfig, conflictResolution: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supabase-wins">Supabase Wins</SelectItem>
                  <SelectItem value="sanity-wins">Sanity Wins</SelectItem>
                  <SelectItem value="manual">Manual Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Auto Sync */}
            <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div>
                <div className="text-xs font-semibold text-gray-900 dark:text-white">Auto Sync</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically sync on schedule
                </div>
              </div>
              <Button
                variant={syncConfig.autoSync ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  saveConfig({ ...syncConfig, autoSync: !syncConfig.autoSync });
                }}
              >
                {syncConfig.autoSync ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Enable
                  </>
                )}
              </Button>
            </div>

            {syncConfig.autoSync && (
              <div>
                <label className="text-xs font-semibold text-gray-900 dark:text-white mb-2 block">
                  Sync Interval (minutes)
                </label>
                <Input
                  type="number"
                  value={syncConfig.autoSyncInterval}
                  onChange={(e) => {
                    saveConfig({ ...syncConfig, autoSyncInterval: parseInt(e.target.value, 10) });
                  }}
                  min={1}
                />
              </div>
            )}

            {/* Field Mapping */}
            <div>
              <label className="text-xs font-semibold text-gray-900 dark:text-white mb-2 block">
                Field Mapping
              </label>
              <div className="space-y-2 p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-800">
                {Object.entries(syncConfig.fieldMapping).map(([supabase, sanity]) => (
                  <div key={supabase} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-gray-600 dark:text-gray-400 w-24">{supabase}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-mono text-gray-900 dark:text-white">{sanity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview" className="space-y-4 mt-4">
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 space-y-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Limit (optional)"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="flex-1"
                disabled={isPreviewing}
              />
              <Button
                onClick={runPreview}
                disabled={isPreviewing}
              >
                {isPreviewing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Previewing...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Run Preview
                  </>
                )}
              </Button>
            </div>

            {previewData && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Affected</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {previewData.affected}
                    </div>
                  </div>
                  <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">To Create</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {previewData.toCreate}
                    </div>
                  </div>
                  <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">To Update</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {previewData.toUpdate}
                    </div>
                  </div>
                </div>

                <div className="p-3 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Time</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    ~{previewData.estimatedTime} seconds
                  </div>
                </div>

                {previewData.diffs && previewData.diffs.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                      Changes Preview
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {previewData.diffs.slice(0, 10).map((diff, idx) => (
                        <div
                          key={idx}
                          className="p-2 border border-gray-200 dark:border-gray-800 rounded text-xs"
                        >
                          <div className="font-medium text-gray-900 dark:text-white mb-1">
                            {diff.slug}
                          </div>
                          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-0.5">
                            {diff.changes.map((change, i) => (
                              <li key={i}>{change}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={runSync}
                  disabled={isSyncing}
                  className="w-full"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Sync Logs</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSyncLogs([]);
                    localStorage.removeItem('sanity-sync-logs');
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const logsStr = JSON.stringify(syncLogs, null, 2);
                    const blob = new Blob([logsStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `sync-logs-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>

            {syncLogs.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                No logs yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      'p-3 border rounded-lg text-xs',
                      log.type === 'success' && 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
                      log.type === 'error' && 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
                      log.type === 'warning' && 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
                      log.type === 'info' && 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {log.type === 'success' && <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />}
                          {log.type === 'error' && <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                          {log.type === 'warning' && <AlertCircle className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                          {log.type === 'info' && <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {log.message}
                          </span>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 ml-5">
                          {new Date(log.timestamp).toLocaleString()}
                          {log.duration && ` • ${log.duration.toFixed(1)}s`}
                        </div>
                        {log.details && (
                          <div className="mt-2">
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedLogs);
                                if (newExpanded.has(log.id)) {
                                  newExpanded.delete(log.id);
                                } else {
                                  newExpanded.add(log.id);
                                }
                                setExpandedLogs(newExpanded);
                              }}
                              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
                            >
                              {expandedLogs.has(log.id) ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Hide Details
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Show Details
                                </>
                              )}
                            </button>
                            {expandedLogs.has(log.id) && (
                              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

